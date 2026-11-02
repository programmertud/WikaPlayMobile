import { useCallback, useEffect, useRef, useState } from 'react';
import { playSound, stopCurrentSound } from '../services/audio/sound-service';
import { useAnswerFeedback } from './use-answer-feedback';
import { QuizDifficulty, QuizQuestion } from '../types';

/**
 * Determines the single correct choice index (0 to 3) for a question using strict priority.
 * Guaranteed to return exactly ONE index so multiple choices are never marked correct.
 */
export function getQuestionCorrectChoiceIndex(q: any): number {
  if (!q || !q.choices || !Array.isArray(q.choices) || q.choices.length === 0) return -1;

  const choicesList = q.choices;
  const targetWord = String(q.target_item_name || '').toLowerCase().trim();
  const answerWord = String(q.correct_answer || '').toLowerCase().trim();
  const targetImg = String(q.target_image_url || q.targetItem?.imageUri || '').trim();

  // Priority 1: Explicit correct_choice_index if specified
  if (q.correct_choice_index !== undefined && q.correct_choice_index !== null) {
    const idx = Number(q.correct_choice_index);
    if (!isNaN(idx) && idx >= 0 && idx < choicesList.length) {
      return idx;
    }
  }

  // Priority 2: Match by Filipino word if choice text or vocab equals targetWord or answerWord
  let foundIdx = choicesList.findIndex((ch: any) => {
    const chText = String(typeof ch === 'string' ? ch : (ch?.text || ch?.filipino_name || '')).toLowerCase().trim();
    const vocabText = String(ch?.vocabularyItem?.filipino || '').toLowerCase().trim();
    const isGenericChoice = /^choice\s*#?\d+$/i.test(chText);
    return (
      (!isGenericChoice && targetWord && (chText === targetWord || vocabText === targetWord)) ||
      (!isGenericChoice && answerWord && isNaN(Number(answerWord)) && (chText === answerWord || vocabText === answerWord))
    );
  });

  // Priority 3: Match by target image URL (for custom teacher questions where target image was uploaded)
  if (foundIdx === -1 && targetImg.length > 10 && !targetImg.includes('wikaplay.app')) {
    foundIdx = choicesList.findIndex((ch: any) => {
      const chImg = String(ch?.image_url || ch?.vocabularyItem?.imageUri || '').trim();
      return chImg.length > 10 && chImg === targetImg;
    });
  }

  // Priority 4: Positional 1-based index if answerWord is strictly '1', '2', '3', '4'
  if (foundIdx === -1 && answerWord && /^[1-4]$/.test(answerWord)) {
    const num = Number(answerWord) - 1;
    if (num >= 0 && num < choicesList.length) {
      foundIdx = num;
    }
  }

  // Priority 5: Choice ID equals answerWord (e.g. choice.id === answerWord)
  if (foundIdx === -1 && answerWord) {
    foundIdx = choicesList.findIndex((ch: any) => {
      const chId = String(ch && typeof ch === 'object' ? (ch.id ?? '') : '').toLowerCase().trim();
      return chId && chId === answerWord;
    });
  }

  return foundIdx >= 0 ? foundIdx : 0;
}

/**
 * Reliably validates whether a given choice is the single correct answer for a quiz question.
 */
export function checkIsChoiceCorrect(choice: any, q: any, choiceIdx?: number): boolean {
  if (!q) return false;
  const correctIdx = getQuestionCorrectChoiceIndex(q);
  if (choiceIdx !== undefined) {
    return choiceIdx === correctIdx;
  }
  if (!choice || !q.choices || !Array.isArray(q.choices)) return false;
  const foundIdx = q.choices.findIndex((c: any) => c === choice || String(c?.id ?? '') === String(choice?.id ?? ''));
  return foundIdx === correctIdx;
}

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
    confettiTrigger,
    triggerConfetti,
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
  const nextQuestionTimerRef = useRef<any>(null);

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
    if (nextQuestionTimerRef.current) {
      clearTimeout(nextQuestionTimerRef.current);
      nextQuestionTimerRef.current = null;
    }
    stopCurrentSound();

    // In mahirap difficulty, DO NOT play the word audio (e.g. aso.mp3).
    // The student solves from the picture alone, and only feedback audio (tama.mp3, etc.) plays on answer.
    if (difficulty === 'mahirap') {
      setChoicesDisabled(false);
      setIsPlayingAudio(false);
      return;
    }

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
      if (nextQuestionTimerRef.current) clearTimeout(nextQuestionTimerRef.current);
      if (playbackCleanupRef.current) playbackCleanupRef.current();
      stopCurrentSound();
    };
  }, [currentIndex, currentQuestion, difficulty]);

  // Handle single answer selection
  const handleSelectAnswer = useCallback(
    async (choiceId: string) => {
      if (choicesDisabled || isAnswerLocked || isEvaluating || !currentQuestion) return;

      const questionId = currentQuestion.id;

      // Immediately lock answers against repeated taps
      setIsAnswerLocked(true);
      setChoicesDisabled(true);
      setSelectedAnswer(choiceId);

      let isCorrect = false;
      if (difficulty === 'mahirap') {
        const normalizedChoice = choiceId.toUpperCase().trim();
        const normalizedExpected = String(currentQuestion.correct_answer).toUpperCase().trim();
        const normalizedTarget = String(currentQuestion.target_item_name || '').toUpperCase().trim();
        isCorrect =
          normalizedChoice === normalizedExpected ||
          (normalizedTarget.length > 0 && normalizedChoice === normalizedTarget);
      } else {
        const choiceIdx = (currentQuestion.choices as any[])?.findIndex((c: any) => String(c?.id ?? '') === choiceId);
        const choiceObj = choiceIdx !== undefined && choiceIdx >= 0 ? (currentQuestion.choices as any[])[choiceIdx] : { id: choiceId };
        isCorrect = checkIsChoiceCorrect(choiceObj, currentQuestion, choiceIdx);
      }

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

      // Play streak feedback voice-over then advance with a 1-second delay
      await triggerFeedback(isCorrect, () => {
        nextQuestionTimerRef.current = setTimeout(() => {
          if (currentQuestionIdRef.current === questionId) {
            if (currentIndex + 1 < questions.length) {
              setCurrentIndex((prev) => prev + 1);
            } else {
              // Completed all questions
              onComplete(submittedAnswers.current);
            }
          }
        }, 1000);
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
    if (difficulty === 'mahirap' || !currentQuestion || isPlayingAudio || isAnswerLocked || isEvaluating) return;
    setIsPlayingAudio(true);
    setChoicesDisabled(true);

    const audioToPlay = currentQuestion.audio_url || currentQuestion.target_item_name || '';
    playbackCleanupRef.current = await playSound(audioToPlay, () => {
      setIsPlayingAudio(false);
      if (!isAnswerLocked) {
        setChoicesDisabled(false);
      }
    });
  }, [difficulty, currentQuestion, isPlayingAudio, isAnswerLocked, isEvaluating]);

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
    confettiTrigger,
    triggerConfetti,
    score,
    correctCount,
    wrongCount,
    handleSelectAnswer,
    replayAudio,
  };
}
