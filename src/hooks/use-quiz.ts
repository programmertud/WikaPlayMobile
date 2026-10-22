import { useCallback, useEffect, useRef, useState } from 'react';
import { playSound, stopCurrentSound } from '../services/audio/sound-service';
import { useAnswerFeedback } from './use-answer-feedback';
import { QuizDifficulty, QuizQuestion } from '../types';

interface UseQuizOptions {
  categoryId: number;
  difficulty: QuizDifficulty;
  questions: QuizQuestion[];
  onComplete: (answers: { question_id: number; selected_answer: string }[]) => void;
}

export function useQuiz({ categoryId, difficulty, questions, onComplete }: UseQuizOptions) {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [choicesDisabled, setChoicesDisabled] = useState<boolean>(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerLocked, setIsAnswerLocked] = useState<boolean>(false);

  // Centralized voice-over streak manager
  const {
    correctStreak,
    wrongStreak,
    isEvaluating,
    triggerFeedback,
  } = useAnswerFeedback();

  // Score & results
  const [score, setScore] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [wrongCount, setWrongCount] = useState<number>(0);

  // Submitted answers list
  const submittedAnswers = useRef<{ question_id: number; selected_answer: string }[]>([]);

  // Unique question instance identifier to discard stale callbacks
  const currentQuestionIdRef = useRef<number | null>(null);
  const playbackCleanupRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<any>(null);

  const currentQuestion = questions[currentIndex] || null;

  // Question initialization and timing sequence
  useEffect(() => {
    if (!currentQuestion) return;

    const questionId = currentQuestion.id;
    currentQuestionIdRef.current = questionId;

    // 1. Disable answer choices immediately
    setChoicesDisabled(true);
    setIsPlayingAudio(false);
    setSelectedAnswer(null);
    setIsAnswerLocked(false);

    // Cancel any previous playback or scheduled timer
    if (playbackCleanupRef.current) {
      playbackCleanupRef.current();
      playbackCleanupRef.current = null;
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    stopCurrentSound();

    // 2. Wait 2 seconds after the question is ready
    timerRef.current = setTimeout(async () => {
      // Check if question changed while waiting
      if (currentQuestionIdRef.current !== questionId) return;

      // 3. Play question audio
      setIsPlayingAudio(true);
      const audioToPlay = currentQuestion.audio_url || currentQuestion.target_item_name || '';

      playbackCleanupRef.current = await playSound(audioToPlay, () => {
        // Callback after audio finishes playing
        if (currentQuestionIdRef.current === questionId) {
          setIsPlayingAudio(false);
          // 4. Unlock choices only after actual playback completion
          setChoicesDisabled(false);
        }
      });
    }, 2000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (playbackCleanupRef.current) playbackCleanupRef.current();
      stopCurrentSound();
    };
  }, [currentIndex, currentQuestion]);

  // Handle single answer selection
  const handleSelectAnswer = useCallback(
    async (choiceId: string) => {
      if (choicesDisabled || isAnswerLocked || isEvaluating || !currentQuestion) return;

      const questionId = currentQuestion.id;

      // Immediately lock answers against repeated taps
      setIsAnswerLocked(true);
      setChoicesDisabled(true);
      setSelectedAnswer(choiceId);

      // Validate answer (supports both choice IDs and case-insensitive Mahirap jumble words)
      const normalizedChoice = choiceId.toUpperCase().trim();
      const normalizedExpected = String(currentQuestion.correct_answer).toUpperCase().trim();
      const normalizedTarget = String(currentQuestion.target_item_name || '').toUpperCase().trim();
      const isCorrect =
        normalizedChoice === normalizedExpected ||
        (normalizedTarget.length > 0 && normalizedChoice === normalizedTarget);

      if (isCorrect) {
        setScore((prev) => prev + currentQuestion.points);
        setCorrectCount((prev) => prev + 1);
      } else {
        setWrongCount((prev) => prev + 1);
      }

      // Record answer
      submittedAnswers.current.push({
        question_id: currentQuestion.id,
        selected_answer: choiceId,
      });

      // Play streak feedback voice-over immediately without 2-second delay
      await triggerFeedback(isCorrect, () => {
        // Automatic progression after feedback voice-over finishes
        if (currentQuestionIdRef.current === questionId) {
          if (currentIndex + 1 < questions.length) {
            setCurrentIndex((prev) => prev + 1);
          } else {
            // Completed all questions
            onComplete(submittedAnswers.current);
          }
        }
      });
    },
    [
      choicesDisabled,
      isAnswerLocked,
      isEvaluating,
      currentQuestion,
      currentIndex,
      questions.length,
      onComplete,
      triggerFeedback,
    ]
  );

  const replayAudio = useCallback(async () => {
    if (!currentQuestion || isPlayingAudio || isAnswerLocked || isEvaluating) return;
    setIsPlayingAudio(true);
    setChoicesDisabled(true);

    const audioToPlay = currentQuestion.audio_url || currentQuestion.target_item_name || '';
    playbackCleanupRef.current = await playSound(audioToPlay, () => {
      setIsPlayingAudio(false);
      if (!isAnswerLocked) {
        setChoicesDisabled(false);
      }
    });
  }, [currentQuestion, isPlayingAudio, isAnswerLocked, isEvaluating]);

  return {
    currentIndex,
    totalQuestions: questions.length,
    currentQuestion,
    choicesDisabled,
    isPlayingAudio,
    selectedAnswer,
    isAnswerLocked,
    correctStreak,
    wrongStreak,
    score,
    correctCount,
    wrongCount,
    handleSelectAnswer,
    replayAudio,
  };
}
