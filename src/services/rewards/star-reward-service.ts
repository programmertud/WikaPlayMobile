import { minigameService, quizService } from '../api';
import { Collectible, QuizDifficulty, QuizResultSession } from '../../types';

// In-flight locking map to prevent duplicate network calls on rapid taps or re-renders
const inFlightRequests = new Map<string, Promise<any>>();

// Completed session cache for idempotency
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
 */
export async function submitMinigameReward(options: {
  gameType: string;
  score: number;
  sessionId: string;
  durationSeconds?: number;
  metadata?: any;
  currentStarsBalance: number;
  updateUserStars: (newBalance: number) => void;
}): Promise<MinigameRewardResult> {
  const {
    gameType,
    score,
    sessionId,
    durationSeconds = 0,
    metadata,
    currentStarsBalance,
    updateUserStars,
  } = options;

  // 1. If already completed in this client session, return cached authoritative result
  if (completedSessionCache.has(sessionId)) {
    return completedSessionCache.get(sessionId)!;
  }

  // 2. If already in flight, reuse existing promise (Test D: In-Flight Request Locking)
  if (inFlightRequests.has(sessionId)) {
    return inFlightRequests.get(sessionId)!;
  }

  const executionPromise = (async (): Promise<MinigameRewardResult> => {
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

      const result: MinigameRewardResult = {
        success: true,
        isDuplicate: !!(res as any)?.is_duplicate_submission,
        starsAwarded: res?.session?.stars_awarded ?? score,
        newBalance: authoritativeBalance,
        session: res.session,
      };

      completedSessionCache.set(sessionId, result);
      return result;
    } catch (err) {
      console.warn('[StarRewardService] Mini-game submit failed (offline fallback):', err);
      // Critical: In offline mode, do NOT replace the user's balance with the game score!
      // Preserve currentStarsBalance.
      const fallbackResult: MinigameRewardResult = {
        success: false,
        isDuplicate: false,
        starsAwarded: score,
        newBalance: currentStarsBalance,
        session: {
          score,
          total_levels: 20,
          stars_awarded: score,
          stars_balance: currentStarsBalance,
          qualifies_for_collectible: score >= 15,
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
  session?: QuizResultSession;
  error?: any;
}

/**
 * Authoritative submission handler for quizzes.
 * Guarantees in-flight locking, duplicate prevention, and never overwrites
 * the user's permanent balance with raw score on offline errors.
 */
export async function submitQuizReward(options: {
  categoryId: number;
  difficulty: QuizDifficulty;
  sessionId: string;
  answers: { question_id: any; selected_answer: string; is_correct?: boolean }[];
  currentStarsBalance: number;
  updateUserStars: (newBalance: number) => void;
}): Promise<QuizRewardResult> {
  const {
    categoryId,
    difficulty,
    sessionId,
    answers,
    currentStarsBalance,
    updateUserStars,
  } = options;

  if (completedSessionCache.has(sessionId)) {
    return completedSessionCache.get(sessionId)!;
  }

  if (inFlightRequests.has(sessionId)) {
    return inFlightRequests.get(sessionId)!;
  }

  const executionPromise = (async (): Promise<QuizRewardResult> => {
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

      // Update auth context state with server authoritative balance
      updateUserStars(authoritativeBalance);

      const result: QuizRewardResult = {
        success: true,
        isDuplicate: !!(res as any)?.is_duplicate_submission,
        starsAwarded: res?.session?.stars_awarded ?? 0,
        newBalance: authoritativeBalance,
        session: res.session,
      };

      completedSessionCache.set(sessionId, result);
      return result;
    } catch (err) {
      console.warn('[StarRewardService] Quiz submit failed (offline fallback):', err);
      const correctCount = answers.filter((a) => a.is_correct).length;
      const total = answers.length;
      const fallbackResult: QuizRewardResult = {
        success: false,
        isDuplicate: false,
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
