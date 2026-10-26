/**
 * WikaPlay Star Reward Service — Offline-First Edition
 *
 * Handles score submission for both mini-games and quizzes.
 *
 * Offline-first changes:
 * 1. Session is saved to SQLite BEFORE the network request
 * 2. On success → session marked synced, server balance applied
 * 3. On failure → session stays pending, returned result is provisional
 *    (star balance is NOT modified locally — server is authoritative)
 * 4. Sync service will retry pending sessions when connectivity returns
 *
 * Unchanged behaviors preserved:
 * - In-flight request locking (prevents rapid double-tap submissions)
 * - Client-side duplicate prevention (completedSessionCache)
 * - Star balance is NEVER set to the raw score on network error
 * - Collectibles are only shown after server confirmation
 */
import { minigameService, quizService } from '../api';
import { Collectible, QuizDifficulty, QuizResultSession } from '../../types';
import {
  savePendingSession,
  markSessionSynced,
  getLatestCachedUser,
} from '../offline/offline-session-store';

// In-flight locking map to prevent duplicate network calls on rapid taps or re-renders
const inFlightRequests = new Map<string, Promise<any>>();

// Completed session cache for idempotency (in-memory — clears on app restart)
const completedSessionCache = new Map<string, any>();

/**
 * Generate a unique, stable activity session ID.
 * Call this when an activity starts or restarts — NOT inside the finish callback.
 */
export function generateSessionId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}_${timestamp}_${random}`;
}

export interface MinigameRewardResult {
  success: boolean;
  isDuplicate: boolean;
  starsAwarded: number;
  newBalance: number;
  isPending?: boolean; // True when result is saved locally but not yet synced
  session?: {
    id?: number;
    session_id?: string;
    score: number;
    total_levels: number;
    stars_awarded: number;
    stars_balance: number;
    qualifies_for_collectible?: boolean;
    collectible?: Collectible & { is_duplicate?: boolean };
  };
  error?: any;
}

/**
 * Authoritative submission handler for mini-games.
 * Guarantees in-flight locking, duplicate prevention, and never overwrites
 * the user's permanent balance with raw score on offline errors.
 *
 * Now with offline persistence: saves session to SQLite before any network call.
 */
export async function submitMinigameReward(options: {
  gameType: string;
  score: number;
  sessionId: string;
  durationSeconds?: number;
  metadata?: any;
  currentStarsBalance: number;
  updateUserStars: (newBalance: number) => void;
  studentId?: number; // Needed for offline persistence
  startedAt?: string; // ISO string; defaults to now - duration
}): Promise<MinigameRewardResult> {
  const {
    gameType,
    score,
    sessionId,
    durationSeconds = 0,
    metadata,
    currentStarsBalance,
    updateUserStars,
    studentId,
    startedAt,
  } = options;

  // 1. If already completed in this client session, return cached authoritative result
  if (completedSessionCache.has(sessionId)) {
    return completedSessionCache.get(sessionId)!;
  }

  // 2. If already in flight, reuse existing promise (prevents double-tap submissions)
  if (inFlightRequests.has(sessionId)) {
    return inFlightRequests.get(sessionId)!;
  }

  const executionPromise = (async (): Promise<MinigameRewardResult> => {
    const now = new Date().toISOString();
    const started = startedAt ?? new Date(Date.now() - durationSeconds * 1000).toISOString();

    // 3. Resolve student ID (fallback to cached user if not explicitly passed)
    const effectiveStudentId =
      studentId ?? (await getLatestCachedUser().catch(() => null))?.student_id;

    // 4. Save pending session to SQLite BEFORE the network request
    //    This ensures the session survives app crashes, backgrounding, and connectivity loss.
    if (effectiveStudentId) {
      try {
        await savePendingSession({
          session_id: sessionId,
          student_id: effectiveStudentId,
          game_type: gameType,
          score,
          duration_seconds: durationSeconds,
          metadata: metadata ?? {},
          started_at: started,
          completed_at: now,
          sync_status: 'pending',
          sync_attempts: 0,
          content_version: '1.0',
        });
      } catch (dbErr) {
        console.warn('[StarRewardService] Failed to save pending session to SQLite:', dbErr);
        // Non-fatal — proceed with network attempt
      }
    }

    try {
      const res = await minigameService.submitResult({
        game_type: gameType,
        score,
        session_id: sessionId,
        duration_seconds: durationSeconds,
        metadata,
      });

      const authoritativeBalance =
        res?.session?.stars_balance !== undefined
          ? res.session.stars_balance
          : currentStarsBalance;

      // Update auth context state with server authoritative balance
      updateUserStars(authoritativeBalance);

      // Mark as synced in SQLite
      if (effectiveStudentId) {
        try {
          await markSessionSynced(sessionId, res);
        } catch (dbErr) {
          console.warn('[StarRewardService] Failed to mark session synced:', dbErr);
        }
      }

      const result: MinigameRewardResult = {
        success: true,
        isDuplicate: !!(res as any)?.is_duplicate_submission,
        isPending: false,
        starsAwarded: res?.session?.stars_awarded ?? score,
        newBalance: authoritativeBalance,
        session: res.session,
      };

      completedSessionCache.set(sessionId, result);
      return result;
    } catch (err) {
      console.warn('[StarRewardService] Mini-game submit failed (offline fallback):', err);

      // Critical: In offline mode, do NOT replace the user's balance with the game score!
      // The session is already saved in SQLite — sync service will retry.
      const fallbackResult: MinigameRewardResult = {
        success: false,
        isDuplicate: false,
        isPending: true, // Saved locally, will sync later
        starsAwarded: score, // Shown as provisional in UI
        newBalance: currentStarsBalance, // Preserved — NOT score
        session: {
          score,
          total_levels: 20,
          stars_awarded: score,
          stars_balance: currentStarsBalance,
          qualifies_for_collectible: score >= 15,
          // No collectible — only awarded after server sync
        },
        error: err,
      };
      return fallbackResult;
    } finally {
      inFlightRequests.delete(sessionId);
    }
  })();

  inFlightRequests.set(sessionId, executionPromise);
  return executionPromise;
}

export interface QuizRewardResult {
  success: boolean;
  isDuplicate: boolean;
  starsAwarded: number;
  newBalance: number;
  isPending?: boolean;
  session?: QuizResultSession;
  error?: any;
}

/**
 * Authoritative submission handler for quizzes.
 * Same offline-first pattern as submitMinigameReward.
 */
export async function submitQuizReward(options: {
  categoryId: number;
  difficulty: QuizDifficulty;
  sessionId: string;
  answers: { question_id: any; selected_answer: string; is_correct?: boolean }[];
  currentStarsBalance: number;
  updateUserStars: (newBalance: number) => void;
  studentId?: number;
}): Promise<QuizRewardResult> {
  const {
    categoryId,
    difficulty,
    sessionId,
    answers,
    currentStarsBalance,
    updateUserStars,
    studentId,
  } = options;

  if (completedSessionCache.has(sessionId)) {
    return completedSessionCache.get(sessionId)!;
  }

  if (inFlightRequests.has(sessionId)) {
    return inFlightRequests.get(sessionId)!;
  }

  const executionPromise = (async (): Promise<QuizRewardResult> => {
    const correctCount = answers.filter((a) => a.is_correct).length;
    const now = new Date().toISOString();

    // Resolve student ID (fallback to cached user if not explicitly passed)
    const effectiveStudentId =
      studentId ?? (await getLatestCachedUser().catch(() => null))?.student_id;

    // Save pending session to SQLite before network attempt
    if (effectiveStudentId) {
      try {
        await savePendingSession({
          session_id: sessionId,
          student_id: effectiveStudentId,
          game_type: `quiz_${difficulty}`,
          score: correctCount,
          duration_seconds: 0,
          metadata: {
            category_id: categoryId,
            difficulty,
            answers: answers.map((a) => ({
              question_id: a.question_id,
              selected_answer: String(a.selected_answer),
              is_correct: a.is_correct,
            })),
          },
          started_at: now,
          completed_at: now,
          sync_status: 'pending',
          sync_attempts: 0,
          content_version: '1.0',
        });
      } catch (dbErr) {
        console.warn('[StarRewardService] Failed to save quiz session to SQLite:', dbErr);
      }
    }

    try {
      const res = await quizService.submitQuiz({
        category_id: categoryId,
        difficulty,
        session_id: sessionId,
        answers: answers.map((a) => ({
          question_id: a.question_id,
          selected_answer: String(a.selected_answer),
          is_correct: a.is_correct,
        })),
      });

      const authoritativeBalance =
        res?.session?.stars_balance !== undefined
          ? res.session.stars_balance
          : currentStarsBalance;

      updateUserStars(authoritativeBalance);

      if (effectiveStudentId) {
        try {
          await markSessionSynced(sessionId, res);
        } catch {}
      }

      const result: QuizRewardResult = {
        success: true,
        isDuplicate: !!(res as any)?.is_duplicate_submission,
        isPending: false,
        starsAwarded: res?.session?.stars_awarded ?? 0,
        newBalance: authoritativeBalance,
        session: res.session,
      };

      completedSessionCache.set(sessionId, result);
      return result;
    } catch (err) {
      console.warn('[StarRewardService] Quiz submit failed (offline fallback):', err);

      const total = answers.length;
      const fallbackResult: QuizRewardResult = {
        success: false,
        isDuplicate: false,
        isPending: true,
        starsAwarded: correctCount,
        newBalance: currentStarsBalance,
        session: {
          id: Date.now(),
          score: correctCount,
          total_questions: total,
          correct_count: correctCount,
          wrong_count: total - correctCount,
          passed: total > 0 ? correctCount / total >= 0.6 : false,
          stars_awarded: correctCount,
          stars_balance: currentStarsBalance,
        },
        error: err,
      };
      return fallbackResult;
    } finally {
      inFlightRequests.delete(sessionId);
    }
  })();

  inFlightRequests.set(sessionId, executionPromise);
  return executionPromise;
}
