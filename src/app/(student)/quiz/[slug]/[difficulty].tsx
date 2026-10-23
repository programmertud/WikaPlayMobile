import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/utils/haptics';

import { CelebrationOverlay } from '../../../../components/CelebrationOverlay';
import { ErrorView } from '../../../../components/ErrorView';
import { ItemVisual } from '../../../../components/ItemVisual';
import { JumbleWordQuiz } from '../../../../components/JumbleWordQuiz';
import { LoadingView } from '../../../../components/LoadingView';
import { PressableScale } from '../../../../components/PressableScale';
import { PrimaryButton } from '../../../../components/PrimaryButton';
import { ProgressIndicator } from '../../../../components/ProgressIndicator';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { getCategoryBySlug, getRandomVocabularyChoices } from '../../../../data/categories';
import { useAuth } from '../../../../hooks/use-auth';
import { usePresence } from '../../../../hooks/use-presence';
import { useQuiz } from '../../../../hooks/use-quiz';
import { categoryService } from '../../../../services/api';
import { generateSessionId, submitQuizReward } from '../../../../services/rewards/star-reward-service';
import { Colors, Gradients, Shadows, Typography, Radius } from '../../../../theme';
import { useBgmDuck } from '../../../../services/audio/sound-service';
import { ChoiceItem, QuizDifficulty, QuizQuestion, QuizResultSession, VocabularyItem } from '../../../../types';

const { width } = Dimensions.get('window');
const CHOICE_WIDTH = (width - 48) / 2;

export default function QuizGameplayScreen() {
  useBgmDuck();
  const { slug, difficulty } = useLocalSearchParams<{ slug: string; difficulty: QuizDifficulty }>();
  const { user, updateUserStars } = useAuth();

  // Stable session ID for quiz
  const sessionIdRef = useRef<string>(generateSessionId(`quiz_${difficulty ?? 'quiz'}`));

  const [categoryName, setCategoryName] = useState<string>('Pagsusulit');
  const [categoryId, setCategoryId] = useState<number>(1);
  const [categoryColor, setCategoryColor] = useState<string>(Colors.skyBlue);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Completed results state
  const [resultSession, setResultSession] = useState<QuizResultSession | null>(null);

  usePresence(`Nagsusulit sa ${categoryName} (${difficulty})`, 'quiz_gameplay');

  const diffLabel = difficulty === 'madali' ? 'Madali' : difficulty === 'katamtaman' ? 'Katamtaman' : 'Mahirap';
  const isKatamtaman = difficulty === 'katamtaman';

  const loadQuiz = async () => {
    if (!slug || !difficulty) return;
    try {
      setLoading(true);
      setError(null);
      const res = await categoryService.getQuizQuestions(slug, difficulty);
      setCategoryName(res.category.name);
      setCategoryId(res.category.id);
      setCategoryColor(res.category.color || Colors.skyBlue);
      let fetchedQuestions = res.questions || [];
      const targetCount = (difficulty === 'katamtaman' || difficulty === 'mahirap') ? 20 : 10;
      if (fetchedQuestions.length < targetCount) {
        const cat = getCategoryBySlug(slug);
        const items = cat?.items || [];
        if (items.length > 0) {
          const needed = targetCount - fetchedQuestions.length;
          const additional: QuizQuestion[] = [];
          for (let i = 0; i < needed; i++) {
            const target = items[i % items.length];
            const choices = getRandomVocabularyChoices(cat.slug, target, 4);
            const mappedChoices: ChoiceItem[] = choices.map((c) => ({
              id: c.id,
              image_url: c.imageUri || '',
              text: difficulty === 'katamtaman' ? '' : c.filipino,
              vocabularyItem: c,
            }));
            const qText = difficulty === 'katamtaman'
              ? `Nasaan ang ${target.filipino}?`
              : 'Ayusin ang mga letra.';
            const correctAnswer = difficulty === 'katamtaman'
              ? target.id
              : target.filipino.toUpperCase();

            additional.push({
              id: 20000 + i,
              target_image_url: target.imageUri || '',
              target_item_name: target.filipino.toUpperCase(),
              targetItem: target,
              audio_url: target.audioUri || `${target.id}.mp3`,
              choices: mappedChoices,
              correct_answer: correctAnswer,
              points: 1,
              difficulty,
              question_text: qText,
            });
          }
          fetchedQuestions = [...fetchedQuestions, ...additional];
        }
      }
      // For katamtaman and mahirap: ALWAYS rebuild questions from local bundled data.
      // The API returns numeric DB IDs for choices (e.g. "1","2") which never match
      // local string IDs (e.g. "hayop_aso"), so API images (stock photos) would show.
      // Instead we use the shuffled local vocabulary items which carry require()'d images.
      if (difficulty === 'katamtaman' || difficulty === 'mahirap') {
        const cat = getCategoryBySlug(slug);
        const localVocab = cat?.items || [];
        if (localVocab.length > 0) {
          const targetCount = 20;
          const shuffled = [...localVocab].sort(() => 0.5 - Math.random());
          fetchedQuestions = Array.from({ length: targetCount }, (_, i) => {
            const target = shuffled[i % shuffled.length];
            const choices = getRandomVocabularyChoices(cat.slug, target, 4);
            const mappedChoices: ChoiceItem[] = choices.map((c) => ({
              id: c.id,
              image_url: c.imageUri || '',
              text: difficulty === 'katamtaman' ? '' : c.filipino,
              vocabularyItem: c,
            }));
            const qText = difficulty === 'katamtaman'
              ? `Nasaan ang ${target.filipino}?`
              : 'Ayusin ang mga letra.';
            const correctAnswer = difficulty === 'katamtaman'
              ? target.id
              : target.filipino.toUpperCase();
            return {
              id: 30000 + i,
              target_image_url: target.imageUri || '',
              target_item_name: target.filipino.toUpperCase(),
              targetItem: target,
              audio_url: target.audioUri || `${target.id}.mp3`,
              choices: mappedChoices,
              correct_answer: correctAnswer,
              points: 1,
              difficulty,
              question_text: qText,
            };
          });
        }
      }
      setQuestions(fetchedQuestions);
    } catch (err: any) {
      const cat = getCategoryBySlug(slug);
      if (cat && cat.items && cat.items.length > 0) {
        setCategoryName(cat.name);
        setCategoryId(Number(cat.id.replace(/\D/g, '')) || 1);
        setCategoryColor(cat.color || Colors.skyBlue);

        const targetCount = (difficulty === 'katamtaman' || difficulty === 'mahirap') ? 20 : 10;
        const selectedTargets: VocabularyItem[] = [];
        const shuffled = [...cat.items].sort(() => 0.5 - Math.random());
        for (let i = 0; i < targetCount; i++) {
          selectedTargets.push(shuffled[i % shuffled.length]);
        }

        const offlineQuestions: QuizQuestion[] = selectedTargets.map((target, idx) => {
          const choices = getRandomVocabularyChoices(cat.slug, target, 4);
          const mappedChoices: ChoiceItem[] = choices.map((c) => ({
            id: c.id,
            image_url: c.imageUri || '',
            text: difficulty === 'katamtaman' ? '' : c.filipino, // Katamtaman: no names beneath pictures
            vocabularyItem: c,
          }));

          let qText = 'Ano ang tawag sa larawang ito?';
          let correctAnswer: string = target.id;

          if (difficulty === 'katamtaman') {
            qText = `Nasaan ang ${target.filipino}?`;
            correctAnswer = target.id;
          } else if (difficulty === 'mahirap') {
            qText = 'Ayusin ang mga letra.';
            correctAnswer = target.filipino.toUpperCase();
          }

          return {
            id: idx + 1,
            target_image_url: target.imageUri || '',
            target_item_name: target.filipino.toUpperCase(),
            targetItem: target,
            audio_url: target.audioUri || `${target.id}.mp3`,
            choices: mappedChoices,
            correct_answer: correctAnswer,
            points: 1,
            difficulty,
            question_text: qText,
          };
        });

        setQuestions(offlineQuestions);
      } else {
        setError(err.message || 'Nabigong kunin ang mga tanong para sa pagsusulit.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (difficulty === 'madali') {
      router.replace(`/(student)/quiz/${slug}/madali` as any);
      return;
    }
    loadQuiz();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, difficulty]);

  const handleQuizComplete = async (answers: { question_id: number; selected_answer: string }[]) => {
    setSubmitting(true);
    try {
      const res = await submitQuizReward({
        categoryId,
        difficulty: difficulty || 'katamtaman',
        sessionId: sessionIdRef.current,
        answers: answers.map((a) => {
          const q = questions.find((item) => item.id === a.question_id);
          const isCorrect = q ? String(q.correct_answer) === String(a.selected_answer) : undefined;
          return {
            question_id: a.question_id,
            selected_answer: a.selected_answer,
            is_correct: isCorrect,
          };
        }),
        currentStarsBalance: user?.stars_balance ?? 0,
        updateUserStars,
      });

      if (res.session) {
        setResultSession(res.session);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const {
    currentIndex,
    totalQuestions,
    currentQuestion,
    choicesDisabled,
    isPlayingAudio,
    selectedAnswer,
    isAnswerLocked,
    handleSelectAnswer,
    replayAudio,
  } = useQuiz({
    categoryId,
    difficulty: difficulty || 'madali',
    questions,
    onComplete: handleQuizComplete,
  });

  const onChoicePress = (choiceId: string) => {
    if (choicesDisabled || isAnswerLocked || !currentQuestion) return;
    const isCorrect = String(choiceId) === String(currentQuestion.correct_answer);
    try {
      if (isCorrect) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      }
    } catch {}
    handleSelectAnswer(choiceId);
  };

  if (loading) {
    return <LoadingView message="Inihahanda ang pagsusulit..." />;
  }

  if (error || questions.length === 0) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenHeader title={`${diffLabel} Pagsusulit`} bgColor={categoryColor} />
        <ErrorView
          message={error || 'Walang magagamit na tanong para sa antas na ito.'}
          onRetry={loadQuiz}
        />
      </View>
    );
  }

  // Final Results Screen
  if (resultSession) {
    const isPassed = resultSession.passed;

    return (
      <View style={styles.container}>
        <ScreenHeader title="Resulta ng Pagsusulit" showBack={false} bgColor={categoryColor} />
        <View style={styles.resultContainer}>
          <View style={[styles.resultCard, Shadows.card]}>
            <LinearGradient
              colors={isPassed ? Gradients.sunLight : Gradients.candyLight}
              style={styles.resultIconCircle}
            >
              <Ionicons
                name={isPassed ? 'trophy' : 'refresh-circle'}
                size={54}
                color={isPassed ? Colors.sunYellowDark : Colors.coralPinkDark}
              />
            </LinearGradient>

            <Text style={styles.resultTitle}>
              {isPassed ? 'Binabati Kita!' : 'Subukang Muli!'}
            </Text>
            <Text style={styles.resultSubtitle}>
              {isPassed
                ? 'Napakagaling! Matagumpay mong naipasa ang pagsusulit!'
                : 'Huwag manghinayang, magsanay muli upang makakuha ng bituin!'}
            </Text>

            {/* Stars Awarded Pill with gradient */}
            {resultSession.stars_awarded > 0 && (
              <LinearGradient
                colors={Gradients.sun}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.earnedStarsPill, Shadows.colored(Colors.sunYellowDark, 0.3)]}
              >
                <Ionicons name="star" size={20} color={Colors.white} />
                <Text style={styles.earnedStarsText}>
                  +{resultSession.stars_awarded} Bituin!
                </Text>
              </LinearGradient>
            )}

            {/* Score Breakdown Cards */}
            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="checkmark-circle" size={24} color={Colors.grassGreen} />
                <Text style={[styles.statNumber, { color: Colors.grassGreenDark }]}>
                  {resultSession.correct_count}
                </Text>
                <Text style={styles.statLabel}>Tama</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: '#FFF1F2' }]}>
                <Ionicons name="close-circle" size={24} color={Colors.coralPink} />
                <Text style={[styles.statNumber, { color: Colors.coralPinkDark }]}>
                  {resultSession.wrong_count}
                </Text>
                <Text style={styles.statLabel}>Mali</Text>
              </View>
            </View>

            <PrimaryButton
              title="Bumalik sa Kategorya"
              variant="primary"
              size="lg"
              icon="arrow-back"
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace(`/(student)/category/${slug}` as any);
                }
              }}
              style={{ width: '100%', marginTop: 24 }}
            />
          </View>
        </View>

        {/* Confetti celebration for passing */}
        <CelebrationOverlay
          visible={isPassed}
          title="Binabati Kita!"
          subtitle={`Nakakuha ka ng ${resultSession.correct_count} tamang sagot!`}
          stars={Math.min(3, Math.max(1, resultSession.stars_awarded))}
          onContinue={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace(`/(student)/category/${slug}` as any);
            }
          }}
          continueText="Tapusin"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={`${categoryName} (${diffLabel})`}
        subtitle={`Tanong ${currentIndex + 1} ng ${totalQuestions}`}
        bgColor={categoryColor}
      />

      <View style={styles.content}>
        {/* Animated Progress Bar */}
        <View style={styles.progressRow}>
          <ProgressIndicator
            current={currentIndex + 1}
            total={totalQuestions}
            gradient={Gradients.grass}
            height={10}
          />
        </View>

        {/* Mahirap Level: Jumble Word Game Mode */}
        {difficulty === 'mahirap' && currentQuestion ? (
          <JumbleWordQuiz
            targetWord={currentQuestion.target_item_name || currentQuestion.correct_answer}
            targetImageUri={currentQuestion.target_image_url}
            targetItem={currentQuestion.targetItem}
            instruction={currentQuestion.question_text || 'Ayusin ang mga letra.'}
            isLocked={isAnswerLocked}
            feedbackState={
              isAnswerLocked
                ? selectedAnswer &&
                  (selectedAnswer.toUpperCase().trim() === String(currentQuestion.correct_answer).toUpperCase().trim() ||
                    selectedAnswer.toUpperCase().trim() === String(currentQuestion.target_item_name || '').toUpperCase().trim())
                  ? 'correct'
                  : 'wrong'
                : 'idle'
            }
            onSubmit={(word) => {
              handleSelectAnswer(word);
            }}
            disabled={isAnswerLocked}
          />
        ) : (
          <>
            {/* Katamtaman Level: Question prominently at the top & Audio Speaker */}
            <View style={[styles.promptCard, Shadows.card]}>
              {/* Prominent Question Heading */}
              <View style={styles.katamtamanQuestionHeader}>
                <Ionicons name="help-circle" size={24} color={Colors.skyBlueDark} />
                <Text style={styles.katamtamanQuestionTitle}>
                  {currentQuestion?.question_text || `Nasaan ang ${currentQuestion?.target_item_name || ''}?`}
                </Text>
              </View>

              <View style={styles.audioPrompt}>
                <PressableScale
                  onPress={replayAudio}
                  disabled={isPlayingAudio}
                  style={[
                    styles.audioSpeakerBtn,
                    isPlayingAudio && styles.audioSpeakerBtnActive,
                    Shadows.colored(Colors.sunYellowDark, 0.25),
                  ]}
                >
                  {isPlayingAudio ? (
                    <ActivityIndicator color={Colors.white} size="large" />
                  ) : (
                    <Ionicons name="volume-high" size={38} color={Colors.white} />
                  )}
                </PressableScale>
                <Text style={styles.audioPromptInstruction}>
                  {isPlayingAudio ? 'Makinig nang mabuti sa binibigkas...' : 'Pindutin upang marinig muli ang salita'}
                </Text>
              </View>

              {/* Timing / Locking Status Notice */}
              {choicesDisabled && !isAnswerLocked && (
                <View style={styles.lockNotice}>
                  <Text style={styles.lockNoticeText}>
                    {isPlayingAudio ? '🎶 Nakikinig... Mangyaring maghintay' : '⏳ Inihahanda ang mga larawan...'}
                  </Text>
                </View>
              )}
            </View>

            {/* Katamtaman: 2x2 Clean Picture Choice Grid (No names beneath) */}
            <View style={styles.choicesGrid}>
              {currentQuestion?.choices.map((choice: ChoiceItem, idx: number) => {
                const isSelected = selectedAnswer === choice.id;
                const isCorrectAnswer = String(choice.id) === String(currentQuestion.correct_answer);

                let cardBorderStyle = styles.choiceNormalBorder;
                if (isAnswerLocked) {
                  if (isSelected && isCorrectAnswer) {
                    cardBorderStyle = styles.choiceCorrectBorder;
                  } else if (isSelected && !isCorrectAnswer) {
                    cardBorderStyle = styles.choiceWrongBorder;
                  } else if (isCorrectAnswer) {
                    cardBorderStyle = styles.choiceCorrectBorder;
                  }
                }

                return (
                  <PressableScale
                    key={`${choice.id}-${idx}`}
                    onPress={() => onChoicePress(choice.id)}
                    disabled={choicesDisabled}
                    activeScale={0.95}
                    style={[
                      styles.choiceCard,
                      styles.katamtamanChoiceCard,
                      cardBorderStyle,
                      choicesDisabled && !isAnswerLocked && styles.choiceCardDisabled,
                      Shadows.soft,
                    ]}
                  >
                    {/* Picture only: ItemVisual or Image */}
                    {choice.vocabularyItem ? (
                      <ItemVisual
                        item={choice.vocabularyItem}
                        size={CHOICE_WIDTH - 28}
                        style={{ flex: 1 }}
                      />
                    ) : choice.image_url ? (
                      <Image
                        source={{ uri: choice.image_url }}
                        style={styles.choiceImage}
                        contentFit="contain"
                      />
                    ) : (
                      <Text style={styles.choiceEmoji}>🖼️</Text>
                    )}

                    {/* Feedback badge icon on selection */}
                    {isAnswerLocked && isSelected && (
                      <View
                        style={[
                          styles.feedbackBadge,
                          { backgroundColor: isCorrectAnswer ? Colors.grassGreen : Colors.coralPink },
                        ]}
                      >
                        <Ionicons
                          name={isCorrectAnswer ? 'checkmark' : 'close'}
                          size={20}
                          color={Colors.white}
                        />
                      </View>
                    )}

                    {/* Also highlight the correct answer if student got it wrong */}
                    {isAnswerLocked && !isSelected && isCorrectAnswer && (
                      <View
                        style={[
                          styles.feedbackBadge,
                          { backgroundColor: Colors.grassGreen },
                        ]}
                      >
                        <Ionicons
                          name="checkmark"
                          size={20}
                          color={Colors.white}
                        />
                      </View>
                    )}
                  </PressableScale>
                );
              })}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  progressRow: {
    width: '100%',
    marginBottom: 12,
  },
  promptCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  katamtamanQuestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  katamtamanQuestionTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.skyBlueDark,
    textAlign: 'center',
  },
  audioPrompt: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  audioSpeakerBtn: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: Colors.sunYellowDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  audioSpeakerBtnActive: {
    backgroundColor: Colors.grassGreen,
  },
  audioPromptInstruction: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginTop: 10,
  },
  standardPrompt: {
    alignItems: 'center',
    width: '100%',
  },
  promptImage: {
    width: '100%',
    height: 140,
    borderRadius: Radius.lg,
    marginBottom: 10,
  },
  questionText: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  lockNotice: {
    marginTop: 10,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  lockNoticeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: '#92400E',
  },
  choicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  choiceCard: {
    width: CHOICE_WIDTH,
    borderRadius: Radius.xl,
    backgroundColor: Colors.white,
    overflow: 'hidden',
    marginBottom: 14,
    alignItems: 'center',
    position: 'relative',
  },
  choiceNormalBorder: {
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  choiceCorrectBorder: {
    borderWidth: 3,
    borderColor: Colors.grassGreen,
    backgroundColor: '#F0FDF4',
  },
  choiceWrongBorder: {
    borderWidth: 3,
    borderColor: Colors.coralPink,
    backgroundColor: '#FFF1F2',
  },
  katamtamanChoiceCard: {
    height: 130,
  },
  standardChoiceCard: {
    height: 150,
  },
  choiceCardDisabled: {
    opacity: 0.8,
  },
  choiceImage: {
    width: '100%',
    height: '100%',
  },
  choiceEmoji: {
    fontSize: 44,
  },
  choiceLabelContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    paddingVertical: 6,
    alignItems: 'center',
  },
  choiceLabel: {
    color: Colors.white,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  feedbackBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  resultCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    padding: 26,
    alignItems: 'center',
  },
  resultIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: Colors.white,
  },
  resultTitle: {
    fontSize: Typography.sizes.xxl,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 6,
  },
  resultSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  earnedStarsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    marginBottom: 20,
    gap: 6,
  },
  earnedStarsText: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    gap: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    borderRadius: Radius.lg,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    gap: 4,
  },
  statNumber: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  statLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    fontWeight: Typography.weights.bold,
  },
});
