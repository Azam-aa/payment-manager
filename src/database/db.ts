import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from '@capacitor-community/sqlite';
import { defineCustomElements } from 'jeep-sqlite/loader';
import { runMigrations } from './migrations';

export const DB_NAME = 'payment_manager_db';

let sqliteConnection: SQLiteConnection | null = null;
let dbInstance: SQLiteDBConnection | null = null;
let isInitializing: Promise<SQLiteDBConnection> | null = null;

/**
 * Initializes the SQLite database connection, applies foreign keys,
 * and runs schema migrations. Handles jeep-sqlite web component for desktop browser dev.
 */
export async function initDatabase(): Promise<SQLiteDBConnection> {
  if (dbInstance) {
    return dbInstance;
  }
  if (isInitializing) {
    return isInitializing;
  }

  isInitializing = (async () => {
    try {
      const platform = Capacitor.getPlatform();

      if (!sqliteConnection) {
        sqliteConnection = new SQLiteConnection(CapacitorSQLite);
      }

      if (platform === 'web') {
        // Setup jeep-sqlite web component
        if (!customElements.get('jeep-sqlite')) {
          defineCustomElements(window);
        }

        let jeepElement = document.querySelector('jeep-sqlite');
        if (!jeepElement) {
          jeepElement = document.createElement('jeep-sqlite');
          jeepElement.setAttribute('autoSave', 'true');
          jeepElement.setAttribute('wasmPath', '/assets');
          document.body.appendChild(jeepElement);
        } else {
          jeepElement.setAttribute('autoSave', 'true');
          jeepElement.setAttribute('wasmPath', '/assets');
        }

        await customElements.whenDefined('jeep-sqlite');
        await sqliteConnection.initWebStore();
      }

      // Check if connection already exists
      const checkConn = await sqliteConnection.isConnection(DB_NAME, false);
      if (checkConn.result) {
        dbInstance = await sqliteConnection.retrieveConnection(DB_NAME, false);
      } else {
        dbInstance = await sqliteConnection.createConnection(
          DB_NAME,
          false,
          'no-encryption',
          1,
          false
        );
      }

      const isOpen = await dbInstance.isDBOpen();
      if (!isOpen.result) {
        await dbInstance.open();
      }

      // Enforce foreign keys immediately upon opening
      await dbInstance.execute('PRAGMA foreign_keys = ON;', false);

      // Run schema initialization and migrations
      await runMigrations(dbInstance);

      // Persist to web store if in browser
      if (platform === 'web') {
        await sqliteConnection.saveToStore(DB_NAME);
      }

      return dbInstance;
    } catch (err) {
      console.error('[DB] Failed to initialize database:', err);
      throw err;
    } finally {
      isInitializing = null;
    }
  })();

  return isInitializing;
}

/**
 * Returns active database connection. Auto-initializes if needed.
 */
export async function getDb(): Promise<SQLiteDBConnection> {
  if (dbInstance) {
    const isOpen = await dbInstance.isDBOpen();
    if (isOpen.result) {
      return dbInstance;
    }
  }
  return initDatabase();
}

/**
 * Save in-memory database to IndexedDB web store when running in browser.
 */
export async function persistWebStore(): Promise<void> {
  if (Capacitor.getPlatform() === 'web' && sqliteConnection) {
    try {
      await sqliteConnection.saveToStore(DB_NAME);
    } catch (e) {
      console.warn('[DB] Could not save to web store:', e);
    }
  }
}

/**
 * Executes a SELECT query and returns rows as array.
 */
export async function runQuery<T = any>(statement: string, values: any[] = []): Promise<T[]> {
  const db = await getDb();
  const res = await db.query(statement, values);
  return (res.values || []) as T[];
}

/**
 * Executes a single mutating statement (INSERT, UPDATE, DELETE)
 * and automatically persists to web store if on web.
 */
export async function runStatement(
  statement: string,
  values: any[] = []
): Promise<{ changes?: number; lastId?: number }> {
  const db = await getDb();
  const res = await db.run(statement, values, false);
  await persistWebStore();
  return {
    changes: res.changes?.changes,
    lastId: res.changes?.lastId,
  };
}

/**
 * Executes multiple SQL statements and automatically persists to web store if on web.
 */
export async function executeStatements(statements: string): Promise<void> {
  const db = await getDb();
  await db.execute(statements, false);
  await persistWebStore();
}

/**
 * Runs a set of operations inside a single SQL transaction.
 * Automatically rolls back on failure, commits on success,
 * and persists to web store if on web.
 */
export async function runInTransaction<T>(action: () => Promise<T>): Promise<T> {
  const db = await getDb();
  await db.beginTransaction();
  try {
    const result = await action();
    await db.commitTransaction();
    await persistWebStore();
    return result;
  } catch (err) {
    try {
      await db.rollbackTransaction();
    } catch (rbErr) {
      console.error('[DB] Rollback failed:', rbErr);
    }
    throw err;
  }
}
