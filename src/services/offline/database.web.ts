/**
 * WikaPlay Offline Database (Web Shim)
 *
 * Provides a lightweight localStorage-backed implementation of the SQLite database
 * interface for Web browsers.
 * This avoids bundling node_modules/expo-sqlite/web/worker.ts (which requires wa-sqlite.wasm)
 * on the web, while native Android and iOS continue to use native SQLite via database.ts.
 */

interface WebStorageData {
  schema_version: number;
  pending_sessions: any[];
  cached_users: any[];
}

const STORAGE_KEY = 'wikaplay_offline_web_db';

function loadStorage(): WebStorageData {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { schema_version: 1, pending_sessions: [], cached_users: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { schema_version: 1, pending_sessions: [], cached_users: [] };
    return JSON.parse(raw);
  } catch {
    return { schema_version: 1, pending_sessions: [], cached_users: [] };
  }
}

function saveStorage(data: WebStorageData): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

class WebSQLiteShim {
  async execAsync(_sql: string): Promise<void> {
    // Schema creation is handled in memory/localStorage
  }

  async runAsync(sql: string, params: any[] = []): Promise<{ lastInsertRowId: number; changes: number }> {
    const data = loadStorage();
    const cleanSql = sql.trim().toUpperCase();

    if (cleanSql.startsWith('INSERT INTO PENDING_SESSIONS')) {
      const newSession = {
        id: Date.now(),
        session_id: params[0],
        student_id: params[1],
        game_type: params[2],
        score: params[3],
        duration_seconds: params[4],
        metadata: params[5],
        started_at: params[6],
        completed_at: params[7],
        sync_status: params[8] || 'pending',
        sync_attempts: params[9] || 0,
        content_version: params[10] || '1.0',
        created_at: new Date().toISOString(),
      };
      data.pending_sessions.push(newSession);
      saveStorage(data);
      return { lastInsertRowId: newSession.id, changes: 1 };
    }

    if (cleanSql.startsWith('INSERT OR REPLACE INTO CACHED_USER')) {
      const studentId = params[0];
      const existingIdx = data.cached_users.findIndex((u) => u.student_id === studentId);
      const userObj = {
        student_id: studentId,
        name: params[1],
        role: params[2] || 'student',
        avatar: params[3],
        section: params[4],
        stars_balance_last_known: params[5] || 0,
        cached_at: params[6] || new Date().toISOString(),
      };
      if (existingIdx >= 0) {
        data.cached_users[existingIdx] = userObj;
      } else {
        data.cached_users.push(userObj);
      }
      saveStorage(data);
      return { lastInsertRowId: studentId, changes: 1 };
    }

    if (cleanSql.startsWith('UPDATE PENDING_SESSIONS')) {
      // Handle status / attempts updates
      if (cleanSql.includes("SYNC_STATUS = 'SYNCED'")) {
        const sessionId = params[params.length - 1];
        const s = data.pending_sessions.find((item) => item.session_id === sessionId);
        if (s) {
          s.sync_status = 'synced';
          s.server_response = params[0];
        }
      } else if (cleanSql.includes('SYNC_ATTEMPTS')) {
        const sessionId = params[params.length - 1];
        const s = data.pending_sessions.find((item) => item.session_id === sessionId);
        if (s) {
          s.sync_attempts = (s.sync_attempts || 0) + 1;
          s.last_sync_attempt = new Date().toISOString();
        }
      }
      saveStorage(data);
      return { lastInsertRowId: 0, changes: 1 };
    }

    if (cleanSql.startsWith('DELETE FROM CACHED_USER')) {
      if (params.length > 0) {
        data.cached_users = data.cached_users.filter((u) => u.student_id !== params[0]);
      } else {
        data.cached_users = [];
      }
      saveStorage(data);
      return { lastInsertRowId: 0, changes: 1 };
    }

    return { lastInsertRowId: 0, changes: 0 };
  }

  async getAllAsync<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const data = loadStorage();
    const cleanSql = sql.trim().toUpperCase();

    if (cleanSql.includes('FROM PENDING_SESSIONS')) {
      if (cleanSql.includes("SYNC_STATUS = 'PENDING'")) {
        const results = data.pending_sessions.filter((s) => s.sync_status === 'pending');
        return results as unknown as T[];
      }
      return data.pending_sessions as unknown as T[];
    }

    if (cleanSql.includes('FROM CACHED_USER')) {
      return data.cached_users as unknown as T[];
    }

    return [];
  }

  async getFirstAsync<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.getAllAsync<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async closeAsync(): Promise<void> {}
}

const _webDb = new WebSQLiteShim();

export async function getDatabase(): Promise<any> {
  return _webDb;
}

export async function closeDatabase(): Promise<void> {}

export async function resetDatabase(): Promise<void> {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(STORAGE_KEY);
  }
}
