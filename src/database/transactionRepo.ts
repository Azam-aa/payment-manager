import { runQuery, runStatement } from './db';
import type { Transaction, TransactionType } from '../types';
import { getCurrentISO } from '../utils/date';
import { generateId } from '../utils/id';
import { backupService } from '../services/backupService';

export const transactionRepo = {
  async getById(id: string): Promise<Transaction | null> {
    const rows = await runQuery<Transaction>(
      'SELECT * FROM transactions WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  async create(data: {
    employee_id: string;
    type: TransactionType;
    amount: number;
    date: string;
    note?: string | null;
  }): Promise<Transaction> {
    const id = generateId();
    const now = getCurrentISO();
    const wholeAmount = Math.round(data.amount);

    await runStatement(
      `INSERT INTO transactions (id, employee_id, type, amount, date, note, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.employee_id,
        data.type,
        wholeAmount,
        data.date,
        data.note || null,
        now,
        now,
      ]
    );

    // Also update employee's updated_at timestamp
    await runStatement(
      'UPDATE employees SET updated_at = ? WHERE id = ?',
      [now, data.employee_id]
    );

    backupService.triggerAutoBackup();

    return {
      id,
      employee_id: data.employee_id,
      type: data.type,
      amount: wholeAmount,
      date: data.date,
      note: data.note || null,
      created_at: now,
      updated_at: now,
    };
  },

  async update(
    id: string,
    data: {
      type?: TransactionType;
      amount?: number;
      date?: string;
      note?: string | null;
    }
  ): Promise<Transaction> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Transaction ${id} not found`);
    }

    const now = getCurrentISO();
    const type = data.type ?? existing.type;
    const amount = data.amount !== undefined ? Math.round(data.amount) : existing.amount;
    const date = data.date ?? existing.date;
    const note = data.note !== undefined ? data.note : existing.note;

    await runStatement(
      `UPDATE transactions 
       SET type = ?, amount = ?, date = ?, note = ?, updated_at = ?
       WHERE id = ?`,
      [type, amount, date, note, now, id]
    );

    // Also update employee's updated_at timestamp
    await runStatement(
      'UPDATE employees SET updated_at = ? WHERE id = ?',
      [now, existing.employee_id]
    );

    backupService.triggerAutoBackup();

    return {
      ...existing,
      type,
      amount,
      date,
      note,
      updated_at: now,
    };
  },

  async delete(id: string): Promise<void> {
    const existing = await this.getById(id);
    if (!existing) return;

    await runStatement('DELETE FROM transactions WHERE id = ?', [id]);

    // Update employee's updated_at timestamp
    const now = getCurrentISO();
    await runStatement(
      'UPDATE employees SET updated_at = ? WHERE id = ?',
      [now, existing.employee_id]
    );

    backupService.triggerAutoBackup();
  },

  async getByEmployee(
    employeeId: string,
    limit = 50,
    offset = 0
  ): Promise<Transaction[]> {
    return runQuery<Transaction>(
      `SELECT * FROM transactions 
       WHERE employee_id = ? 
       ORDER BY date DESC, created_at DESC 
       LIMIT ? OFFSET ?`,
      [employeeId, limit, offset]
    );
  },

  async countByEmployee(employeeId: string): Promise<number> {
    interface CountRow {
      total: number;
    }
    const rows = await runQuery<CountRow>(
      'SELECT COUNT(id) AS total FROM transactions WHERE employee_id = ?',
      [employeeId]
    );
    return Number(rows[0]?.total) || 0;
  },

  async getAll(): Promise<Transaction[]> {
    return runQuery<Transaction>(
      'SELECT * FROM transactions ORDER BY date DESC, created_at DESC'
    );
  },

  async deleteByEmployee(employeeId: string): Promise<void> {
    await runStatement('DELETE FROM transactions WHERE employee_id = ?', [employeeId]);
  },
};
