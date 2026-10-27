/**
 * WikaPlay Offline Session Store
 *
 * Stores and manages pending game sessions in SQLite.
 * Sessions are saved BEFORE network submission so they survive app crashes,
 * backgrounding, and connectivity loss.
 *
 * Sync flow:
 *   1. Game completes → savePendingSession() called
 *   2. submitMinigameReward() tries to POST to server
 *   3a. SUCCESS → markSessionSynced() with server response
 *   3b. FAILURE → session stays 'pending', sync-service retries later
 */
import { getDatabase } from './database';
import { Collectible } from '../../types';
import { LEARNING_CATEGORIES } from '../../data/categories';
import { getCollectibleDescription } from '../../utils/collectible-assets';

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'rejected';

export interface PendingSession {
  id?: number;
  session_id: string;
  student_id: number;
  game_type: string;
  score: number;
  duration_seconds: number;
  metadata?: Record<string, any>;
  started_at: string;
  completed_at: string;
  sync_status: SyncStatus;
  sync_attempts: number;
  last_sync_attempt?: string | null;
  server_response?: string | null;
  content_version: string;
  created_at?: string;
}

export interface CachedUser {
  student_id: number;
  name: string;
  role: string;
  avatar?: string | null;
  section?: string | null;
  stars_balance_last_known: number;
  cached_at: string;
}

/**
 * Save a new pending session. Uses INSERT OR IGNORE to prevent duplicates on retry.
 * This must be called BEFORE the network request so the session survives a crash.
 */
export async function savePendingSession(session: Omit<PendingSession, 'id' | 'created_at'>): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR IGNORE INTO pending_sessions
      (session_id, student_id, game_type, score, duration_seconds,
       metadata, started_at, completed_at, sync_status, sync_attempts,
       last_sync_attempt, server_response, content_version)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      session.session_id,
      session.student_id,
      session.game_type,
      session.score,
      session.duration_seconds,
      session.metadata ? JSON.stringify(session.metadata) : null,
      session.started_at,
      session.completed_at,
      session.sync_status,
      session.sync_attempts,
      session.last_sync_attempt ?? null,
      session.server_response ?? null,
      session.content_version,
    ]
  );
}

/**
 * Mark a session as successfully synced with server response.
 * Transaction-safe — updates status and stores server response atomically.
 */
export async function markSessionSynced(
  sessionId: string,
  serverResponse: Record<string, any>
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE pending_sessions
     SET sync_status = 'synced',
         server_response = ?,
         last_sync_attempt = datetime('now')
     WHERE session_id = ?`,
    [JSON.stringify(serverResponse), sessionId]
  );
}

/**
 * Mark a session as rejected (permanent server rejection — do not retry).
 */
export async function markSessionRejected(
  sessionId: string,
  reason: string
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE pending_sessions
     SET sync_status = 'rejected',
         server_response = ?,
         last_sync_attempt = datetime('now')
     WHERE session_id = ?`,
    [JSON.stringify({ rejected: true, reason }), sessionId]
  );
}

/**
 * Increment sync attempts and update timestamp. Does NOT change sync_status.
 * Called before each sync attempt so we can track retry history.
 */
export async function recordSyncAttempt(sessionId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE pending_sessions
     SET sync_attempts = sync_attempts + 1,
         last_sync_attempt = datetime('now'),
         sync_status = 'syncing'
     WHERE session_id = ? AND sync_status IN ('pending', 'syncing')`,
    [sessionId]
  );
}

/**
 * Mark a syncing session back to pending after a failed attempt.
 */
export async function markSessionPendingAfterFailure(sessionId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE pending_sessions
     SET sync_status = 'pending'
     WHERE session_id = ? AND sync_status = 'syncing'`,
    [sessionId]
  );
}

/**
 * Get all sessions that need to be synced for a given student.
 * Excludes already synced or permanently rejected sessions.
 * Ordered by creation time (oldest first).
 */
export async function getPendingSessions(studentId?: number): Promise<PendingSession[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    studentId
      ? `SELECT * FROM pending_sessions
         WHERE (student_id = ? OR sync_status IN ('pending', 'syncing'))
         ORDER BY created_at ASC`
      : `SELECT * FROM pending_sessions
         WHERE sync_status IN ('pending', 'syncing')
         ORDER BY created_at ASC`,
    studentId ? [studentId] : []
  );
  return rows.map(deserializeSession);
}

/**
 * Get the count of pending (unsynced) sessions on this device.
 */
export async function getPendingSessionCount(studentId?: number): Promise<number> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    studentId
      ? `SELECT COUNT(*) as count FROM pending_sessions
         WHERE (student_id = ? OR sync_status IN ('pending', 'syncing'))`
      : `SELECT COUNT(*) as count FROM pending_sessions
         WHERE sync_status IN ('pending', 'syncing')`,
    studentId ? [studentId] : []
  );
  return row?.count ?? 0;
}

/**
 * Calculate total unsynced stars from pending sessions on this device.
 */
export async function getPendingStarsTotal(): Promise<number> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ score: number }>(
    `SELECT score FROM pending_sessions WHERE sync_status IN ('pending', 'syncing')`
  );
  return rows.reduce((sum, r) => sum + (Number(r.score) || 0), 0);
}

/**
 * Reassign pending sessions to the official server student ID.
 */
export async function reassignPendingSessionsToStudent(targetStudentId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE pending_sessions
     SET student_id = ?
     WHERE sync_status IN ('pending', 'syncing')`,
    [targetStudentId]
  );
}

/**
 * Get a single session by its session_id.
 */
export async function getSessionById(sessionId: string): Promise<PendingSession | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<any>(
    `SELECT * FROM pending_sessions WHERE session_id = ?`,
    [sessionId]
  );
  return row ? deserializeSession(row) : null;
}

/**
 * Get all synced sessions for a student (for history display).
 */
export async function getSyncedSessions(studentId: number, limit = 50): Promise<PendingSession[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM pending_sessions
     WHERE student_id = ? AND sync_status = 'synced'
     ORDER BY completed_at DESC
     LIMIT ?`,
    [studentId, limit]
  );
  return rows.map(deserializeSession);
}

/**
 * Delete synced sessions older than N days (housekeeping).
 * Never deletes pending or rejected sessions.
 */
export async function cleanupSyncedSessions(olderThanDays = 30): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `DELETE FROM pending_sessions
     WHERE sync_status = 'synced'
     AND datetime(created_at) < datetime('now', '-${olderThanDays} days')`
  );
}

// ── Cached User ────────────────────────────────────────────────────────────

/**
 * Cache user info for offline identity display. No password is stored.
 */
export async function cacheUser(user: CachedUser): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO cached_user
       (student_id, name, role, avatar, section, stars_balance_last_known, cached_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(student_id) DO UPDATE SET
       name = excluded.name,
       role = excluded.role,
       avatar = excluded.avatar,
       section = excluded.section,
       stars_balance_last_known = excluded.stars_balance_last_known,
       cached_at = excluded.cached_at`,
    [
      user.student_id,
      user.name,
      user.role,
      user.avatar ?? null,
      user.section ?? null,
      user.stars_balance_last_known,
      user.cached_at,
    ]
  );
}

/**
 * Find a cached user by student name (case-insensitive).
 */
export async function getCachedUserByName(name: string): Promise<CachedUser | null> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<CachedUser>(
    `SELECT * FROM cached_user`
  );
  const target = name.trim().toLowerCase();
  return rows.find((u) => u.name.trim().toLowerCase() === target) || null;
}

/**
 * Get cached user by student ID.
 */
export async function getCachedUser(studentId: number): Promise<CachedUser | null> {
  const db = await getDatabase();
  return db.getFirstAsync<CachedUser>(
    `SELECT * FROM cached_user WHERE student_id = ?`,
    [studentId]
  );
}

/**
 * Update the star balance of a cached user in SQLite.
 * Ensures that stars earned offline are immediately visible and preserved.
 */
export async function updateCachedUserStars(
  studentId: number,
  newBalance: number
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE cached_user
     SET stars_balance_last_known = ?,
         cached_at = datetime('now')
     WHERE student_id = ?`,
    [newBalance, studentId]
  );
}

/**
 * Get the most recently cached user (for offline cold boot restoration).
 */
export async function getLatestCachedUser(): Promise<CachedUser | null> {
  const db = await getDatabase();
  return db.getFirstAsync<CachedUser>(
    `SELECT * FROM cached_user ORDER BY cached_at DESC LIMIT 1`
  );
}

/**
 * Clear cached user data (on logout / account switch).
 * Does NOT delete pending_sessions — those are account-scoped and preserved until synced.
 */
export async function clearCachedUser(studentId: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `DELETE FROM cached_user WHERE student_id = ?`,
    [studentId]
  );
}

// ── Cached Collectibles ───────────────────────────────────────────────────

/**
 * Save or update an unlocked collectible in local SQLite storage.
 */
export async function saveOfflineCollectible(collectible: Collectible): Promise<void> {
  const db = await getDatabase();
  const now = collectible.unlocked_at || new Date().toISOString();
  await db.runAsync(
    `INSERT OR REPLACE INTO cached_collectibles (slug, data, unlocked_at)
     VALUES (?, ?, ?)`,
    [collectible.slug, JSON.stringify(collectible), now]
  );
}

/**
 * Retrieve all cached unlocked collectibles.
 */
export async function getCachedCollectibles(): Promise<Collectible[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ slug: string; data: string; unlocked_at: string }>(
    `SELECT * FROM cached_collectibles`
  );
  return rows
    .map((r) => {
      try {
        const parsed = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
        return {
          ...parsed,
          is_unlocked: true,
          unlocked_at: r.unlocked_at,
        };
      } catch {
        return null;
      }
    })
    .filter((c): c is Collectible => c !== null);
}

/**
 * Cache server unlocked collectibles locally so the student album is always available offline.
 */
export async function cacheServerCollectibles(collectibles: Collectible[]): Promise<void> {
  const unlocked = collectibles.filter((c) => c.is_unlocked);
  for (const c of unlocked) {
    await saveOfflineCollectible(c);
  }
}

/**
 * Generates the full 151-card collectible album from local offline resources,
 * merging all unlocked cards from previous server sessions and offline gameplay.
 */
export async function getOfflineCollectiblesCatalog(starsBalance = 0): Promise<{
  collectibles: Collectible[];
  stars_balance: number;
  total_unlocked: number;
  total_available: number;
}> {
  const cachedUnlocked = await getCachedCollectibles().catch(() => []);
  const unlockedMap = new Map<string, Collectible>();
  for (const c of cachedUnlocked) {
    if (c.slug) {
      unlockedMap.set(c.slug.toLowerCase().trim(), c);
    }
  }

  const latestUser = await getLatestCachedUser().catch(() => null);
  const effectiveStars = starsBalance || latestUser?.stars_balance_last_known || 0;

  const catalog: Collectible[] = [];
  let syntheticId = 1;

  for (const category of LEARNING_CATEGORIES) {
    for (const item of category.items) {
      const slug = item.id.toLowerCase().trim();
      const unlockedItem = unlockedMap.get(slug);

      const desc = getCollectibleDescription({
        filipino_name: item.filipino,
        name: item.english,
        slug: item.id,
      });

      catalog.push({
        id: unlockedItem?.id || syntheticId++,
        slug: item.id,
        name: item.english,
        filipino_name: item.filipino,
        category: category.name,
        description: desc,
        rarity: unlockedItem?.rarity || 'common',
        required_stars: 0,
        is_unlocked: !!unlockedItem,
        unlocked_at: unlockedItem?.unlocked_at || null,
        is_duplicate: false,
      });
    }
  }

  const totalUnlocked = catalog.filter((c) => c.is_unlocked).length;

  return {
    collectibles: catalog,
    stars_balance: effectiveStars,
    total_unlocked: totalUnlocked,
    total_available: catalog.length,
  };
}

// ── Cached Badges (Offline Badge Claims) ───────────────────────────────────

/**
 * Record an offline claimed badge in local storage and deduct spendable stars immediately.
 */
export async function saveOfflineClaimedBadge(
  badgeKey: string,
  cost: number,
  studentId?: number
): Promise<{ newBalance: number; spentStars: number }> {
  const db = await getDatabase();
  const latestUser = await getLatestCachedUser().catch(() => null);
  const effectiveId = studentId || latestUser?.student_id || 1;
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT OR REPLACE INTO cached_badges (badge_key, student_id, cost, claimed_at, sync_status)
     VALUES (?, ?, ?, ?, ?)`,
    [badgeKey, effectiveId, cost, now, 'pending']
  );

  // Deduct stars from cached user
  const currentBalance = latestUser?.stars_balance_last_known || 0;
  const newBalance = Math.max(0, currentBalance - cost);
  await updateCachedUserStars(effectiveId, newBalance);

  // Calculate total spent from cached badges
  const allBadges = await getCachedClaimedBadges(effectiveId);
  const totalSpent = allBadges.reduce((sum, b) => sum + (b.cost || 0), 0);

  return { newBalance, spentStars: totalSpent };
}

/**
 * Retrieve all locally cached badges for a student.
 */
export async function getCachedClaimedBadges(
  studentId?: number
): Promise<{ badge_key: string; cost: number; claimed_at: string; sync_status: string }[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ badge_key: string; cost: number; claimed_at: string; sync_status: string }>(
    studentId
      ? `SELECT * FROM cached_badges WHERE student_id = ?`
      : `SELECT * FROM cached_badges`,
    studentId ? [studentId] : []
  );
  return rows || [];
}

/**
 * Get pending badge claims that need to be synchronized with the backend.
 */
export async function getPendingBadgesToSync(): Promise<{ badge_key: string; student_id: number; cost: number }[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ badge_key: string; student_id: number; cost: number }>(
    `SELECT badge_key, student_id, cost FROM cached_badges WHERE sync_status = 'pending'`
  );
  return rows || [];
}

/**
 * Mark a badge as successfully synced to the server.
 */
export async function markBadgeSynced(badgeKey: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE cached_badges SET sync_status = 'synced' WHERE badge_key = ?`,
    [badgeKey]
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function deserializeSession(row: any): PendingSession {
  return {
    ...row,
    metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
  };
}

