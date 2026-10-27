/**
 * WikaPlay Offline Database
 *
 * Manages the local SQLite database for offline gameplay support.
 * - Pending game sessions (waiting to sync with server)
 * - Cached user metadata (for offline identity display, no passwords)
 *
 * Safe to call multiple times — uses CREATE TABLE IF NOT EXISTS.
 * Database file lives in the app's persistent document directory (survives app restarts).
 */
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'wikaplay_offline.db';
const SCHEMA_VERSION = 1;

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  await initSchema(_db);
  return _db;
}

async function initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`PRAGMA journal_mode = WAL;`);
  await db.execAsync(`PRAGMA foreign_keys = ON;`);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pending_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT UNIQUE NOT NULL,
      student_id INTEGER NOT NULL,
      game_type TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      metadata TEXT,
      started_at TEXT NOT NULL,
      completed_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      sync_attempts INTEGER NOT NULL DEFAULT 0,
      last_sync_attempt TEXT,
      server_response TEXT,
      content_version TEXT NOT NULL DEFAULT '1.0',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS cached_user (
      id INTEGER PRIMARY KEY,
      student_id INTEGER UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student',
      avatar TEXT,
      section TEXT,
      stars_balance_last_known INTEGER NOT NULL DEFAULT 0,
      cached_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cached_collectibles (
      slug TEXT PRIMARY KEY NOT NULL,
      data TEXT NOT NULL,
      unlocked_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cached_badges (
      badge_key TEXT PRIMARY KEY NOT NULL,
      student_id INTEGER NOT NULL,
      cost INTEGER NOT NULL DEFAULT 0,
      claimed_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending'
    );
  `);

  // Insert or verify schema version
  const versionRow = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM schema_version LIMIT 1'
  );
  if (!versionRow) {
    await db.runAsync('INSERT INTO schema_version (version) VALUES (?)', [SCHEMA_VERSION]);
  }
}

/** Close DB connection — call only when the app is fully shutting down. */
export async function closeDatabase(): Promise<void> {
  if (_db) {
    await _db.closeAsync();
    _db = null;
  }
}

/** Reset — only for testing. Drops and recreates all tables. */
export async function resetDatabase(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    DROP TABLE IF EXISTS pending_sessions;
    DROP TABLE IF EXISTS cached_user;
    DROP TABLE IF EXISTS schema_version;
  `);
  _db = null;
  await getDatabase();
}
