import { runQuery, runStatement, runInTransaction } from './db';
import type { Employee, EmployeeStatus, EmployeeWithBalance } from '../types';
import { getCurrentISO } from '../utils/date';
import { generateId } from '../utils/id';
import { backupService } from '../services/backupService';

export const employeeRepo = {
  async getById(id: string): Promise<Employee | null> {
    const rows = await runQuery<Employee>(
      'SELECT * FROM employees WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  async create(data: {
    name: string;
    phone?: string | null;
    photo_path?: string | null;
  }): Promise<Employee> {
    const id = generateId();
    const now = getCurrentISO();
    const trimmedName = data.name.trim();

    await runStatement(
      `INSERT INTO employees (id, name, phone, photo_path, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)`,
      [
        id,
        trimmedName,
        data.phone?.trim() || null,
        data.photo_path || null,
        now,
        now,
      ]
    );

    backupService.triggerAutoBackup();

    return {
      id,
      name: trimmedName,
      phone: data.phone?.trim() || null,
      photo_path: data.photo_path || null,
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
    };
  },

  async update(
    id: string,
    data: {
      name?: string;
      phone?: string | null;
      photo_path?: string | null;
    }
  ): Promise<Employee> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Employee ${id} not found`);
    }

    const now = getCurrentISO();
    const name = data.name !== undefined ? data.name.trim() : existing.name;
    const phone = data.phone !== undefined ? (data.phone ? data.phone.trim() : null) : existing.phone;
    const photo_path = data.photo_path !== undefined ? data.photo_path : existing.photo_path;

    await runStatement(
      `UPDATE employees 
       SET name = ?, phone = ?, photo_path = ?, updated_at = ?
       WHERE id = ?`,
      [name, phone, photo_path, now, id]
    );

    backupService.triggerAutoBackup();

    return {
      ...existing,
      name,
      phone,
      photo_path,
      updated_at: now,
    };
  },

  async setStatus(id: string, status: EmployeeStatus): Promise<void> {
    const now = getCurrentISO();
    await runStatement(
      'UPDATE employees SET status = ?, updated_at = ? WHERE id = ?',
      [status, now, id]
    );
    backupService.triggerAutoBackup();
  },

  async archive(id: string): Promise<void> {
    await this.setStatus(id, 'ARCHIVED');
  },

  async restore(id: string): Promise<void> {
    await this.setStatus(id, 'ACTIVE');
  },

  /**
   * Permanently deletes an employee and their transactions.
   * STRICT FOREIGN KEY RULE: Deletes transactions first, then deletes employee.
   * Commits SQL transaction first before any photo file cleanup.
   */
  async permanentDelete(id: string): Promise<string | null> {
    const emp = await this.getById(id);
    if (!emp) return null;

    const photoPath = emp.photo_path;

    // Run inside SQL transaction: delete transactions first, then employee
    await runInTransaction(async () => {
      await runStatement('DELETE FROM transactions WHERE employee_id = ?', [id]);
      await runStatement('DELETE FROM employees WHERE id = ?', [id]);
    });

    backupService.triggerAutoBackup();

    return photoPath;
  },

  /**
   * Returns employees with real calculated balances from SQLite aggregate JOIN.
   */
  async getEmployeesWithBalance(
    status: EmployeeStatus = 'ACTIVE',
    sortBy: 'recent' | 'name' = 'recent',
    searchQuery = ''
  ): Promise<EmployeeWithBalance[]> {
    let sql = `
      SELECT 
        e.*,
        COALESCE(SUM(CASE WHEN t.type = 'ADVANCE' THEN t.amount ELSE 0 END), 0) AS total_advance,
        COALESCE(SUM(CASE WHEN t.type = 'GIVEN' THEN t.amount ELSE 0 END), 0) AS total_given,
        (COALESCE(SUM(CASE WHEN t.type = 'ADVANCE' THEN t.amount ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN t.type = 'GIVEN' THEN t.amount ELSE 0 END), 0)) AS balance,
        COUNT(t.id) AS transaction_count
      FROM employees e
      LEFT JOIN transactions t ON e.id = t.employee_id
      WHERE e.status = ?
    `;

    const params: any[] = [status];

    if (searchQuery.trim()) {
      sql += ' AND e.name LIKE ?';
      params.push(`%${searchQuery.trim()}%`);
    }

    sql += ' GROUP BY e.id';

    if (sortBy === 'name') {
      sql += ' ORDER BY e.name COLLATE NOCASE ASC';
    } else {
      sql += ' ORDER BY e.updated_at DESC';
    }

    interface AggEmployeeRow extends Employee {
      total_advance: number;
      total_given: number;
      balance: number;
      transaction_count: number;
    }

    const rows = await runQuery<AggEmployeeRow>(sql, params);

    return rows.map((r) => {
      const adv = Number(r.total_advance) || 0;
      const giv = Number(r.total_given) || 0;
      return {
        ...r,
        total_advance: adv,
        total_given: giv,
        total_handled: adv + giv,
        balance: Number(r.balance) || 0,
        transaction_count: Number(r.transaction_count) || 0,
      };
    });
  },

  async existsByName(name: string, excludeId?: string): Promise<boolean> {
    let sql = 'SELECT id FROM employees WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))';
    const params: any[] = [name];
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    const rows = await runQuery<{ id: string }>(sql, params);
    return rows.length > 0;
  },

  async getAll(): Promise<Employee[]> {
    return runQuery<Employee>('SELECT * FROM employees ORDER BY created_at ASC');
  },
};
