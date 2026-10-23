import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FeedbackAudioKey,
  getFeedbackAudio,
  playFeedbackSound,
  stopCurrentSound,
} from '../services/audio/sound-service';

export interface UseAnswerFeedbackOptions {
  /** Optional callback fired when feedback playback completes or times out */
  onFeedbackComplete?: (isCorrect: boolean, sound: FeedbackAudioKey) => void;
  /** Fallback timeout in milliseconds (default: 1500ms) */
  fallbackTimeoutMs?: number;
}

export interface AnswerFeedbackResult {
  isCorrect: boolean;
  sound: FeedbackAudioKey;
  correctStreak: number;
  wrongStreak: number;
}

/**
 * Reusable Voice-Over Feedback Hook for WikaPlay Quizzes and Mini-Games.
 *
 * Rules:
 * - 1st correct answer: "Tama!" (tama.mp3)
 * - 2nd consecutive correct answer: "Magaling!" (magaling.mp3)
 * - 3rd+ consecutive correct answer: "Ang Galing Mo!" (anggalingmo.mp3)
 * - 1st wrong answer: "Mali!" (mali.mp3)
 * - 2nd+ consecutive wrong answer: "Oops, Mali!" (oopsmali.mp3)
 *
 * Automatically manages:
 * - Safe single-evaluation guards against double-taps/race conditions
 * - Instant feedback audio without question delays
 * - Cancelling existing question narration before playing feedback
 * - Waiting for feedback completion before advancing, with fallback timeout
 * - Cleanup on unmount or screen departure
 */
export function useAnswerFeedback(options?: UseAnswerFeedbackOptions) {
  const [correctStreak, setCorrectStreak] = useState<number>(0);
  const [wrongStreak, setWrongStreak] = useState<number>(0);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [lastFeedbackSound, setLastFeedbackSound] = useState<FeedbackAudioKey | null>(null);

  // Synchronous refs to prevent race conditions and double evaluation
  const isEvaluatingRef = useRef<boolean>(false);
  const correctStreakRef = useRef<number>(0);
  const wrongStreakRef = useRef<number>(0);
  const activeCleanupRef = useRef<(() => void) | null>(null);
  const fallbackTimerRef = useRef<any>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
      if (activeCleanupRef.current) {
        activeCleanupRef.current();
        activeCleanupRef.current = null;
      }
      stopCurrentSound();
    };
  }, []);

  /**
   * Evaluates an answer, updates streak counters, and plays the appropriate Filipino voice-over.
   *
   * @param isCorrect Whether the answer or match is correct
   * @param onComplete Optional callback called after audio finishes or safely times out
   * @returns AnswerFeedbackResult or null if locked/already evaluating
   */
  const triggerFeedback = useCallback(
    async (
      isCorrect: boolean,
      onComplete?: (result: AnswerFeedbackResult) => void
    ): Promise<AnswerFeedbackResult | null> => {
      // 1. Immediately guard against duplicate submissions or rapid repeated taps
      if (isEvaluatingRef.current) {
        return null;
      }
      isEvaluatingRef.current = true;
      setIsEvaluating(true);

      // 2. Stop any existing voice narration immediately (e.g. question audio)
      stopCurrentSound();
      if (activeCleanupRef.current) {
        activeCleanupRef.current();
        activeCleanupRef.current = null;
      }
      if (fallbackTimerRef.current) {
        clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }

      // 3. Update streak counters
      let nextCorrect = 0;
      let nextWrong = 0;

      if (isCorrect) {
        nextCorrect = correctStreakRef.current + 1;
        nextWrong = 0;
      } else {
        nextWrong = wrongStreakRef.current + 1;
        nextCorrect = 0;
      }

      correctStreakRef.current = nextCorrect;
      wrongStreakRef.current = nextWrong;
      setCorrectStreak(nextCorrect);
      setWrongStreak(nextWrong);

      // 4. Select the matching voice-over audio
      const soundKey = getFeedbackAudio(isCorrect, isCorrect ? nextCorrect : nextWrong);
      setLastFeedbackSound(soundKey);

      const result: AnswerFeedbackResult = {
        isCorrect,
        sound: soundKey,
        correctStreak: nextCorrect,
        wrongStreak: nextWrong,
      };

      // 5. Play voice-over audio and wait for completion
      let hasCompleted = false;
      const finishFeedback = () => {
        if (hasCompleted) return;
        hasCompleted = true;

        if (fallbackTimerRef.current) {
          clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = null;
        }

        isEvaluatingRef.current = false;
        setIsEvaluating(false);

        onComplete?.(result);
        options?.onFeedbackComplete?.(isCorrect, soundKey);
      };

      // Safe fallback timeout: never leave student stuck if audio file or device audio fails
      const timeoutDuration = options?.fallbackTimeoutMs ?? 5000;
      fallbackTimerRef.current = setTimeout(finishFeedback, timeoutDuration);

      try {
        const cancelAudio = await playFeedbackSound(soundKey, () => {
          finishFeedback();
        });
        activeCleanupRef.current = cancelAudio;
      } catch {
        // If audio playback fails, execute fallback finish safely
        finishFeedback();
      }

      return result;
    },
    [options]
  );

  /**
   * Reset streaks to zero (e.g., when a new game or quiz session starts)
   */
  const resetStreaks = useCallback(() => {
    correctStreakRef.current = 0;
    wrongStreakRef.current = 0;
    isEvaluatingRef.current = false;
    setCorrectStreak(0);
    setWrongStreak(0);
    setIsEvaluating(false);
    setLastFeedbackSound(null);

    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    if (activeCleanupRef.current) {
      activeCleanupRef.current();
      activeCleanupRef.current = null;
    }
    stopCurrentSound();
  }, []);

  return {
    correctStreak,
    wrongStreak,
    isEvaluating,
    lastFeedbackSound,
    triggerFeedback,
    resetStreaks,
  };
}
