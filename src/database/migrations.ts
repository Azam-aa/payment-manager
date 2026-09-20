import { SQLiteDBConnection } from '@capacitor-community/sqlite';
import { CURRENT_SCHEMA_VERSION, CREATE_TABLES_SQL } from './schema';

export async function runMigrations(db: SQLiteDBConnection): Promise<void> {
  // First, ensure all initial tables and indexes exist
  await db.execute(CREATE_TABLES_SQL, false);

  // Check current schema version
  const res = await db.query("SELECT value FROM settings WHERE key = 'schema_version'");
  let currentVersion = 0;
  if (res.values && res.values.length > 0) {
    currentVersion = parseInt(res.values[0].value, 10) || 0;
  }

  if (currentVersion === 0) {
    // Fresh install: save schema version 1
    await db.run(
      "INSERT OR REPLACE INTO settings (key, value) VALUES ('schema_version', ?)",
      [CURRENT_SCHEMA_VERSION.toString()]
    );
  } else if (currentVersion < CURRENT_SCHEMA_VERSION) {
    // Future migrations can run here sequentially:
    // if (currentVersion < 2) { ... upgrade to 2 ... }
    await db.run(
      "UPDATE settings SET value = ? WHERE key = 'schema_version'",
      [CURRENT_SCHEMA_VERSION.toString()]
    );
  }
}
