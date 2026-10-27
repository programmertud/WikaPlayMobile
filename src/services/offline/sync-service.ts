/**
 * WikaPlay Sync Service
 *
 * Synchronizes pending game sessions from local SQLite to the Laravel backend.
 *
 * Features:
 * - Processes pending sessions one at a time (ordered oldest-first)
 * - Idempotent — uses existing session_id unique constraint on both sides
 * - Exponential backoff on repeated failures (max 5 attempts before giving up)
 * - Prevents duplicate simultaneous sync jobs
 * - Notifies listeners when sync state changes
 * - Never discards a pending result just because a network request failed
 */
import { ApiClient } from '../api/client';
import { authService, rewardService } from '../api';
import {
  getPendingSessions,
  getPendingSessionCount,
  markSessionSynced,
  markSessionRejected,
  markSessionPendingAfterFailure,
  recordSyncAttempt,
  getLatestCachedUser,
  updateCachedUserStars,
  saveOfflineCollectible,
  reassignPendingSessionsToStudent,
  getPendingBadgesToSync,
  markBadgeSynced,
  PendingSession,
} from './offline-session-store';
import { checkApiReachability } from './connectivity-service';

const MAX_SYNC_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 2000;

export type SyncState = 'idle' | 'syncing' | 'complete' | 'failed';

let _isSyncing = false;
let _syncState: SyncState = 'idle';
let _pendingCount = 0;
let _lastSyncTime: Date | null = null;
let _listeners: Array<(state: SyncState, pendingCount: number) => void> = [];

/**
 * Subscribe to sync state changes.
 * Returns an unsubscribe function.
 */
export function onSyncStateChange(
  listener: (state: SyncState, pendingCount: number) => void
): () => void {
  _listeners.push(listener);
  return () => {
    _listeners = _listeners.filter((l) => l !== listener);
  };
}

function notify(state: SyncState) {
  _syncState = state;
  _listeners.forEach((fn) => {
    try { fn(state, _pendingCount); } catch {}
  });
}

export function getSyncState(): SyncState { return _syncState; }
export function getPendingCount(): number { return _pendingCount; }
export function getLastSyncTime(): Date | null { return _lastSyncTime; }

/**
 * Trigger synchronization of all pending sessions for a student.
 * Safe to call multiple times — prevents concurrent runs.
 */
export async function syncPendingSessions(studentId?: number | null): Promise<void> {
  if (_isSyncing) return;

  const reachable = await checkApiReachability();
  if (!reachable) return;

  let token = ApiClient.getToken();
  let effectiveStudentId = studentId;

  if (!token) {
    // If we don't have an auth token yet (e.g. student logged in while offline),
    // authenticate automatically with their cached name now that internet is available
    const cached = await getLatestCachedUser();
    if (cached?.name) {
      try {
        const authRes = await authService.studentLogin(cached.name);
        if (authRes?.token) {
          await ApiClient.setToken(authRes.token);
          token = authRes.token;
          if (authRes.user?.id) {
            effectiveStudentId = authRes.user.id;
            await reassignPendingSessionsToStudent(authRes.user.id);
          }
        }
      } catch {
        return; // Still cannot authenticate with server
      }
    } else {
      return; // Cannot sync without a student identity
    }
  }

  _isSyncing = true;
  notify('syncing');

  try {
    const sessions = await getPendingSessions(effectiveStudentId || undefined);
    _pendingCount = sessions.length;

    if (sessions.length === 0) {
      _lastSyncTime = new Date();
      notify('complete');
      return;
    }

    // Attempt batch sync first for fast single-trip processing
    try {
      const eligibleSessions = sessions.filter((s) => s.sync_attempts < MAX_SYNC_ATTEMPTS);
      if (eligibleSessions.length > 0) {
        const batchPayload = eligibleSessions.map((s) => ({
          session_id: s.session_id,
          game_type: s.game_type,
          score: s.score,
          duration_seconds: s.duration_seconds,
          metadata: s.metadata,
          started_at: s.started_at,
          completed_at: s.completed_at,
        }));

        const batchRes = await ApiClient.post<{
          message: string;
          synced_count: number;
          duplicate_count: number;
          results: Array<{
            session_id: string;
            status: 'synced' | 'failed';
            is_duplicate?: boolean;
            stars_awarded?: number;
            [key: string]: any;
          }>;
          stars_balance?: number;
        }>('sync/batch', { sessions: batchPayload });

        if (batchRes && Array.isArray(batchRes.results)) {
          for (const resItem of batchRes.results) {
            if (resItem.status === 'synced') {
              await markSessionSynced(resItem.session_id, resItem);
            } else {
              await markSessionPendingAfterFailure(resItem.session_id);
            }
          }

          if (batchRes.stars_balance !== undefined && effectiveStudentId) {
            await updateCachedUserStars(effectiveStudentId, batchRes.stars_balance);
          }

          _pendingCount = await getPendingSessionCount(effectiveStudentId || undefined);
          _lastSyncTime = new Date();
          notify(_pendingCount === 0 ? 'complete' : 'idle');
          return;
        }
      }
    } catch (batchErr) {
      console.warn('[SyncService] Batch sync failed, falling back to sequential sync:', batchErr);
    }

    // Sequential fallback
    let anySucceeded = false;
    let allFailed = true;

    for (const session of sessions) {
      if (session.sync_attempts >= MAX_SYNC_ATTEMPTS) {
        // Too many failed attempts — mark as rejected to stop retrying
        await markSessionRejected(session.session_id, 'Max sync attempts exceeded');
        _pendingCount = Math.max(0, _pendingCount - 1);
        continue;
      }

      const success = await syncSession(session);
      if (success) {
        anySucceeded = true;
        allFailed = false;
        _pendingCount = Math.max(0, _pendingCount - 1);
      } else {
        allFailed = _pendingCount > 0;
      }

      // Small delay between submissions to avoid hammering the server
      await sleep(300);
    }

    // Sync pending offline badge claims
    try {
      const pendingBadges = await getPendingBadgesToSync();
      for (const pb of pendingBadges) {
        try {
          await rewardService.claimBadge(pb.badge_key);
          await markBadgeSynced(pb.badge_key);
          anySucceeded = true;
        } catch (err: any) {
          const msg = err?.message || '';
          if (msg.includes('Na-claim mo na') || err?.status === 409) {
            await markBadgeSynced(pb.badge_key);
          }
        }
      }
    } catch {}

    if (anySucceeded || _pendingCount === 0) {
      _lastSyncTime = new Date();
      notify('complete');
    } else if (allFailed) {
      notify('failed');
    } else {
      notify('idle');
    }
  } catch (err) {
    console.warn('[SyncService] Sync error:', err);
    notify('failed');
  } finally {
    _isSyncing = false;
  }
}

/**
 * Sync a single session to the server.
 * Returns true on success (including duplicate), false on transient failure.
 */
async function syncSession(session: PendingSession): Promise<boolean> {
  await recordSyncAttempt(session.session_id);

  try {
    let response: any;

    if (session.game_type.startsWith('quiz_') && session.metadata?.category_id) {
      response = await ApiClient.post('quizzes/submit', {
        category_id: session.metadata.category_id,
        difficulty: session.metadata.difficulty || 'madali',
        session_id: session.session_id,
        answers: session.metadata.answers || [],
      });
    } else {
      response = await ApiClient.post<{
        message: string;
        is_duplicate_submission?: boolean;
        session: {
          id: number;
          session_id?: string;
          score: number;
          total_levels: number;
          stars_awarded: number;
          stars_balance: number;
          qualifies_for_collectible?: boolean;
          collectible?: any;
        };
      }>('minigames/submit', {
        game_type: session.game_type,
        score: session.score,
        session_id: session.session_id,
        duration_seconds: session.duration_seconds,
        metadata: session.metadata,
      });
    }

    await markSessionSynced(session.session_id, response);

    if (response?.session?.stars_balance !== undefined && session.student_id) {
      await updateCachedUserStars(session.student_id, response.session.stars_balance).catch(() => {});
    }
    if (response?.session?.collectible) {
      await saveOfflineCollectible(response.session.collectible).catch(() => {});
    }

    return true;
  } catch (err: any) {
    const status = err?.status || err?.response?.status;

    // 422 = validation failure (bad data) — permanent rejection
    // 403 = forbidden — permanent rejection
    // 409 = conflict/duplicate — treat as synced
    if (status === 422 || status === 403) {
      await markSessionRejected(session.session_id, err.message || 'Server rejected');
      return true; // Stop retrying
    }

    if (status === 409) {
      // Duplicate — already on server
      await markSessionSynced(session.session_id, { is_duplicate_submission: true });
      return true;
    }

    // Network error or 5xx — transient, retry later
    await markSessionPendingAfterFailure(session.session_id);
    return false;
  }
}

/**
 * Update the local pending count for a student.
 * Call this after login to update the badge.
 */
export async function refreshPendingCount(studentId: number): Promise<number> {
  _pendingCount = await getPendingSessionCount(studentId);
  notify(_syncState);
  return _pendingCount;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
