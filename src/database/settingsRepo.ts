import { runQuery, runStatement } from './db';
import type { SettingItem } from '../types';

export const settingsRepo = {
  async get(key: string, defaultValue = ''): Promise<string> {
    const rows = await runQuery<SettingItem>(
      'SELECT key, value FROM settings WHERE key = ?',
      [key]
    );
    if (rows.length > 0) {
      return rows[0].value;
    }
    return defaultValue;
  },

  async set(key: string, value: string): Promise<void> {
    await runStatement(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [key, value]
    );
  },

  async getAll(): Promise<Record<string, string>> {
    const rows = await runQuery<SettingItem>('SELECT key, value FROM settings');
    const result: Record<string, string> = {};
    for (const r of rows) {
      result[r.key] = r.value;
    }
    return result;
  },

  async delete(key: string): Promise<void> {
    await runStatement('DELETE FROM settings WHERE key = ?', [key]);
  },
};
