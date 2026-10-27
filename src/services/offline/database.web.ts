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
  cached_collectibles?: any[];
  cached_badges?: any[];
}

const STORAGE_KEY = 'wikaplay_offline_web_db';

function loadStorage(): WebStorageData {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { schema_version: 1, pending_sessions: [], cached_users: [], cached_collectibles: [], cached_badges: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { schema_version: 1, pending_sessions: [], cached_users: [], cached_collectibles: [], cached_badges: [] };
    const parsed = JSON.parse(raw);
    if (!parsed.cached_collectibles) parsed.cached_collectibles = [];
    if (!parsed.cached_badges) parsed.cached_badges = [];
    return parsed;
  } catch {
    return { schema_version: 1, pending_sessions: [], cached_users: [], cached_collectibles: [], cached_badges: [] };
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

    if (cleanSql.startsWith('INSERT OR REPLACE INTO CACHED_COLLECTIBLES')) {
      const slug = params[0];
      const collectibleData = params[1];
      const unlockedAt = params[2] || new Date().toISOString();
      if (!data.cached_collectibles) data.cached_collectibles = [];
      const existingIdx = data.cached_collectibles.findIndex((c) => c.slug === slug);
      const row = { slug, data: collectibleData, unlocked_at: unlockedAt };
      if (existingIdx >= 0) {
        data.cached_collectibles[existingIdx] = row;
      } else {
        data.cached_collectibles.push(row);
      }
      saveStorage(data);
      return { lastInsertRowId: 1, changes: 1 };
    }

    if (cleanSql.startsWith('INSERT OR REPLACE INTO CACHED_BADGES')) {
      const badgeKey = params[0];
      const studentId = params[1] || 0;
      const cost = params[2] || 0;
      const claimedAt = params[3] || new Date().toISOString();
      const syncStatus = params[4] || 'pending';
      if (!data.cached_badges) data.cached_badges = [];
      const existingIdx = data.cached_badges.findIndex((b) => b.badge_key === badgeKey);
      const row = { badge_key: badgeKey, student_id: studentId, cost, claimed_at: claimedAt, sync_status: syncStatus };
      if (existingIdx >= 0) {
        data.cached_badges[existingIdx] = row;
      } else {
        data.cached_badges.push(row);
      }
      saveStorage(data);
      return { lastInsertRowId: 1, changes: 1 };
    }

    if (cleanSql.startsWith('UPDATE PENDING_SESSIONS')) {
      if (cleanSql.includes('STUDENT_ID = ?') && params.length > 0) {
        const targetStudentId = params[0];
        data.pending_sessions.forEach((s) => {
          if (s.sync_status === 'pending' || s.sync_status === 'syncing') {
            s.student_id = targetStudentId;
          }
        });
      } else if (cleanSql.includes("SYNC_STATUS = 'SYNCED'")) {
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

    if (cleanSql.startsWith('UPDATE CACHED_USER')) {
      const newStars = params[0];
      const studentId = params[1];
      const u = data.cached_users.find((user) => user.student_id === studentId);
      if (u) {
        u.stars_balance_last_known = newStars;
        u.cached_at = new Date().toISOString();
      } else if (data.cached_users.length > 0) {
        data.cached_users[0].stars_balance_last_known = newStars;
        data.cached_users[0].cached_at = new Date().toISOString();
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
      // Check for COUNT(*) query
      if (cleanSql.includes('COUNT(*)')) {
        const pending = data.pending_sessions.filter(
          (s) => s.sync_status === 'pending' || s.sync_status === 'syncing'
        );
        return [{ count: pending.length }] as unknown as T[];
      }

      // Check for pending/syncing sessions
      if (cleanSql.includes('SYNC_STATUS')) {
        let results = data.pending_sessions.filter(
          (s) => s.sync_status === 'pending' || s.sync_status === 'syncing'
        );
        if (params.length > 0 && typeof params[0] === 'number') {
          // If student ID is given, match student ID or any unassigned/temporary ID
          const sid = params[0];
          results = results.filter((s) => s.student_id === sid || !s.student_id);
          // If no specific match, still return pending sessions so they sync
          if (results.length === 0) {
            results = data.pending_sessions.filter(
              (s) => s.sync_status === 'pending' || s.sync_status === 'syncing'
            );
          }
        }
        return results as unknown as T[];
      }

      return data.pending_sessions as unknown as T[];
    }

    if (cleanSql.includes('FROM CACHED_USER')) {
      return data.cached_users as unknown as T[];
    }

    if (cleanSql.includes('FROM CACHED_COLLECTIBLES')) {
      return (data.cached_collectibles || []) as unknown as T[];
    }

    if (cleanSql.includes('FROM CACHED_BADGES')) {
      return (data.cached_badges || []) as unknown as T[];
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
