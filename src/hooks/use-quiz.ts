import { useCallback, useEffect, useRef, useState } from 'react';
import { getFeedbackAudio, playSound, stopCurrentSound } from '../services/audio/sound-service';
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

  // Separate streak counters per quiz session
  const [correctStreak, setCorrectStreak] = useState<number>(0);
  const [wrongStreak, setWrongStreak] = useState<number>(0);

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
      if (choicesDisabled || isAnswerLocked || !currentQuestion) return;

      const questionId = currentQuestion.id;

      // Immediately lock answers against repeated taps
      setIsAnswerLocked(true);
      setChoicesDisabled(true);
      setSelectedAnswer(choiceId);

      // Validate answer
      const isCorrect = String(choiceId) === String(currentQuestion.correct_answer);

      // Calculate streak updates
      let newCorrectStreak = 0;
      let newWrongStreak = 0;

      if (isCorrect) {
        newCorrectStreak = correctStreak + 1;
        newWrongStreak = 0;
        setCorrectStreak(newCorrectStreak);
        setWrongStreak(0);
        setScore((prev) => prev + currentQuestion.points);
        setCorrectCount((prev) => prev + 1);
      } else {
        newWrongStreak = wrongStreak + 1;
        newCorrectStreak = 0;
        setWrongStreak(newWrongStreak);
        setCorrectStreak(0);
        setWrongCount((prev) => prev + 1);
      }

      // Record answer
      submittedAnswers.current.push({
        question_id: currentQuestion.id,
        selected_answer: choiceId,
      });

      // Play streak feedback audio
      const feedbackSound = getFeedbackAudio(
        isCorrect,
        isCorrect ? newCorrectStreak : newWrongStreak
      );

      await playSound(feedbackSound, () => {
        // Automatic progression after feedback finishes
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
      currentQuestion,
      correctStreak,
      wrongStreak,
      currentIndex,
      questions.length,
      onComplete,
    ]
  );

  const replayAudio = useCallback(async () => {
    if (!currentQuestion || isPlayingAudio) return;
    setIsPlayingAudio(true);
    setChoicesDisabled(true);

    const audioToPlay = currentQuestion.audio_url || currentQuestion.target_item_name || '';
    playbackCleanupRef.current = await playSound(audioToPlay, () => {
      setIsPlayingAudio(false);
      if (!isAnswerLocked) {
        setChoicesDisabled(false);
      }
    });
  }, [currentQuestion, isPlayingAudio, isAnswerLocked]);

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
