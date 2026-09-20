import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { employeeRepo } from '../database/employeeRepo';
import { transactionRepo } from '../database/transactionRepo';
import { settingsRepo } from '../database/settingsRepo';
import { runInTransaction, runStatement } from '../database/db';
import { photoService } from './photoService';
import type { BackupData } from '../types';
import { CURRENT_SCHEMA_VERSION } from '../database/schema';
import { getBackupTimestamp, getCurrentISO } from '../utils/date';

let autoBackupTimer: any = null;

export const backupService = {
  /**
   * Debounced auto-backup: triggers whenever employees or transactions are mutated.
   * Silently writes to Directory.Documents/payment-manager-auto-backup.json and localStorage.
   */
  triggerAutoBackup(): void {
    if (autoBackupTimer) clearTimeout(autoBackupTimer);
    autoBackupTimer = setTimeout(async () => {
      try {
        await backupService.performAutoBackup();
      } catch (err) {
        console.warn('[BackupService] Auto backup error:', err);
      }
    }, 600);
  },

  async performAutoBackup(): Promise<string> {
    const filename = 'payment-manager-auto-backup.json';
    const employees = await employeeRepo.getAll();
    const transactions = await transactionRepo.getAll();
    const allSettings = await settingsRepo.getAll();

    delete allSettings['user_pin_hash'];
    delete allSettings['pin_failed_attempts'];
    delete allSettings['pin_lockout_until'];

    const photos: Record<string, string> = {};
    for (const emp of employees) {
      if (emp.photo_path) {
        const base64 = await photoService.readPhotoAsBase64(emp.photo_path);
        if (base64) {
          photos[emp.photo_path] = base64;
        }
      }
    }

    const payload: BackupData = {
      schema_version: CURRENT_SCHEMA_VERSION,
      exported_at: getCurrentISO(),
      employees,
      transactions,
      settings: allSettings,
      photos,
    };

    const json = JSON.stringify(payload);

    // 1. Instant crash-proof storage in browser localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('payment_manager_auto_backup', json);
        localStorage.setItem('payment_manager_auto_backup_ts', Date.now().toString());
      } catch {
        // storage quota full
      }
    }

    // 2. Safe file storage in Directory.Documents
    try {
      await Filesystem.writeFile({
        path: filename,
        data: json,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      });
      await settingsRepo.set('last_auto_backup_timestamp', Date.now().toString());
    } catch (e) {
      console.warn('[BackupService] Could not write auto-backup to Documents:', e);
    }

    return filename;
  },

  /**
   * Generates a complete offline backup JSON file and saves to Directory.Documents.
   * Prompts native share sheet to allow sending file to WhatsApp or Drive.
   */
  async createBackup(): Promise<{ filename: string; uri: string }> {
    const filename = `payment-manager-backup-${getBackupTimestamp()}.json`;

    const employees = await employeeRepo.getAll();
    const transactions = await transactionRepo.getAll();
    const allSettings = await settingsRepo.getAll();

    // Exclude security sensitive keys from backup
    delete allSettings['user_pin_hash'];
    delete allSettings['pin_failed_attempts'];
    delete allSettings['pin_lockout_until'];

    // Read all photos into base64 mapping
    const photos: Record<string, string> = {};
    for (const emp of employees) {
      if (emp.photo_path) {
        const base64 = await photoService.readPhotoAsBase64(emp.photo_path);
        if (base64) {
          photos[emp.photo_path] = base64;
        }
      }
    }

    const backupPayload: BackupData = {
      schema_version: CURRENT_SCHEMA_VERSION,
      exported_at: getCurrentISO(),
      employees,
      transactions,
      settings: allSettings,
      photos,
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);

    // Write file to Directory.Documents
    await Filesystem.writeFile({
      path: filename,
      data: jsonString,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      recursive: true,
    });

    const uriResult = await Filesystem.getUri({
      path: filename,
      directory: Directory.Documents,
    });

    // Update last backup timestamp
    await settingsRepo.set('last_backup_timestamp', Date.now().toString());

    // Trigger share sheet if available
    try {
      const canShare = await Share.canShare();
      if (canShare.value) {
        await Share.share({
          title: 'Payment Manager Backup',
          text: `Offline backup from ${new Date().toLocaleDateString()}`,
          url: uriResult.uri,
          dialogTitle: 'Save / Share Backup File',
        });
      }
    } catch (shareErr) {
      console.log('[BackupService] Share sheet not opened or dismissed:', shareErr);
    }

    return {
      filename,
      uri: uriResult.uri,
    };
  },

  /**
   * Validates a parsed backup object
   */
  validateBackupData(data: any): { valid: boolean; error?: string; backup?: BackupData } {
    if (!data || typeof data !== 'object') {
      return { valid: false, error: 'INVALID_FORMAT' };
    }

    if (data.schema_version !== CURRENT_SCHEMA_VERSION) {
      return { valid: false, error: 'SCHEMA_VERSION_MISMATCH' };
    }

    if (!Array.isArray(data.employees) || !Array.isArray(data.transactions)) {
      return { valid: false, error: 'MISSING_TABLES' };
    }

    return { valid: true, backup: data as BackupData };
  },

  /**
   * Restores database and photo files from a validated BackupData object.
   * STRICT FOREIGN KEY ENFORCEMENT:
   * 1. Delete transactions first
   * 2. Delete employees second
   * 3. Insert employees third
   * 4. Insert transactions fourth
   * After SQL transaction commits, rewrites all photo files.
   */
  async restoreFromData(backup: BackupData): Promise<{
    workersCount: number;
    txCount: number;
  }> {
    // 1. Rebuild database inside SQL transaction with strict order
    await runInTransaction(async () => {
      // Step A: Clear transactions first
      await runStatement('DELETE FROM transactions');

      // Step B: Clear employees second
      await runStatement('DELETE FROM employees');

      // Step C: Insert employees first
      for (const emp of backup.employees) {
        await runStatement(
          `INSERT INTO employees (id, name, phone, photo_path, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            emp.id,
            emp.name,
            emp.phone,
            emp.photo_path,
            emp.status || 'ACTIVE',
            emp.created_at,
            emp.updated_at,
          ]
        );
      }

      // Step D: Insert transactions second
      for (const tx of backup.transactions) {
        await runStatement(
          `INSERT INTO transactions (id, employee_id, type, amount, date, note, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tx.id,
            tx.employee_id,
            tx.type,
            Math.round(tx.amount),
            tx.date,
            tx.note,
            tx.created_at,
            tx.updated_at,
          ]
        );
      }

      // Step E: Restore settings (skip PIN keys)
      if (backup.settings) {
        for (const [k, v] of Object.entries(backup.settings)) {
          if (!k.includes('pin')) {
            await runStatement(
              'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
              [k, v]
            );
          }
        }
      }
    });

    // 2. Rewrite photo files after SQL transaction commits
    if (backup.photos) {
      for (const [relPath, base64] of Object.entries(backup.photos)) {
        try {
          await photoService.writePhotoFromBase64(relPath, base64);
        } catch (photoErr) {
          console.warn('[BackupService] Failed to rewrite photo:', relPath, photoErr);
        }
      }
    }

    return {
      workersCount: backup.employees.length,
      txCount: backup.transactions.length,
    };
  },
};
