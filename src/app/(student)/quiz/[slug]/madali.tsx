/**
 * WikaPlay — Madali Quiz Screen
 *
 * Route: /(student)/quiz/[slug]/madali
 *
 * Loads 20 Madali questions for the selected category from the local question
 * bank (quiz-bank-madali.ts). No network request is required.
 *
 * Question types handled:
 *  - multiple-choice / situational : four large text-label buttons (A–D)
 *  - picture-id                    : four ItemVisual cards (one per vocab item)
 */

import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/utils/haptics';

import { CelebrationOverlay } from '../../../../components/CelebrationOverlay';
import { ItemVisual } from '../../../../components/ItemVisual';
import { PrimaryButton } from '../../../../components/PrimaryButton';
import { ProgressIndicator } from '../../../../components/ProgressIndicator';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { getCategoryBySlug, LEARNING_CATEGORIES } from '../../../../data/categories';
import {
  getMadaliQuestionsBySlug,
  MadaliQuestion,
  MadaliTextChoice,
} from '../../../../data/quiz-bank-madali';
import { useAuth } from '../../../../hooks/use-auth';
import { usePresence } from '../../../../hooks/use-presence';
import { useAnswerFeedback } from '../../../../hooks/use-answer-feedback';
import {
  playSound,
  stopCurrentSound,
} from '../../../../services/audio/sound-service';
import { ALL_MADALI_WEB_PATHS, getMadaliQuestionAudio } from '../../../../utils/quiz-madali-audio';
import { useBgmDuck } from '../../../../services/audio/bgm-service';
import { generateSessionId, submitQuizReward } from '../../../../services/rewards/star-reward-service';
import { Colors, Gradients, Radius, Shadows, Typography } from '../../../../theme';
import { VocabularyItem } from '../../../../types';

const { width } = Dimensions.get('window');
const CHOICE_WIDTH = (width - 48) / 2;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AnswerId = 'A' | 'B' | 'C' | 'D';

interface AnswerRecord {
  questionId: string;
  selected: AnswerId;
  correct: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Look up a VocabularyItem by its id across all categories. */
function findVocabItem(vocabId: string): VocabularyItem | undefined {
  for (const cat of LEARNING_CATEGORIES) {
    const item = cat.items.find((i) => i.id === vocabId);
    if (item) return item;
  }
  return undefined;
}

const CATEGORY_SLUG_TO_ID: Record<string, number> = {
  'mga-hayop': 1,
  'mga-prutas': 2,
  'mga-gulay': 3,
  'mga-bilang': 4,
  'mga-hugis': 5,
  'mga-kulay': 6,
  'bahagi-ng-katawan': 7,
  'mga-pagbati': 8,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MadaliQuizScreen() {
  useBgmDuck();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user, updateUserStars } = useAuth();

  const category = getCategoryBySlug(slug);
  usePresence(`Nagsusulit sa ${category.name} (Madali)`, 'quiz_madali');

  // Stable session ID generated at quiz mount/restart
  const sessionIdRef = useRef<string>(generateSessionId('quiz_madali'));

  // ------------------------------------------------------------------
  // State
  // ------------------------------------------------------------------
  const [questions] = useState<MadaliQuestion[]>(() => getMadaliQuestionsBySlug(slug));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<AnswerId | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);   // choices disabled until brief delay
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [quizDone, setQuizDone] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [starsAwarded, setStarsAwarded] = useState<number>(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextQuestionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockRef = useRef(false);   // prevent double-tap race

  // Centralized voice-over streak manager
  const { triggerFeedback, resetStreaks } = useAnswerFeedback();

  const currentQuestion = questions[currentIndex] ?? null;
  const totalQuestions = questions.length;

  const playQuestionAudio = useCallback(() => {
    if (!currentQuestion) return;

    // On web, native require() assets are numbers that cannot be resolved to a URI
    // without downloading them first. Prefer the pre-mapped static web path instead.
    let audioSource: any;
    if (Platform.OS === 'web' && currentQuestion.id && ALL_MADALI_WEB_PATHS[currentQuestion.id]) {
      audioSource = ALL_MADALI_WEB_PATHS[currentQuestion.id];
    } else {
      audioSource = currentQuestion.audio || getMadaliQuestionAudio(currentQuestion);
    }

    if (audioSource) {
      setIsPlayingAudio(true);
      playSound(audioSource, () => {
        setIsPlayingAudio(false);
      });
    }
  }, [currentQuestion]);

  const correctCount = answers.filter((a) => a.correct).length;
  const wrongCount = answers.filter((a) => !a.correct).length;
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const passed = percentage >= 60;

  // ------------------------------------------------------------------
  // Animate question in & play question voice audio
  // ------------------------------------------------------------------
  useEffect(() => {
    if (quizDone) return;
    setSelectedId(null);
    setIsLocked(false);
    setIsEnabled(false);
    lockRef.current = false;

    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 9,
      }),
    ]).start();

    // Auto-play voice audio for the question
    const audioTimer = setTimeout(() => {
      playQuestionAudio();
    }, 400);

    // Enable choices after a short delay (gives child time to read/listen)
    timerRef.current = setTimeout(() => {
      setIsEnabled(true);
    }, 1200);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (nextQuestionTimerRef.current) clearTimeout(nextQuestionTimerRef.current);
      clearTimeout(audioTimer);
      stopCurrentSound();
      setIsPlayingAudio(false);
    };
  }, [currentIndex, quizDone, fadeAnim, slideAnim, playQuestionAudio]);

  // ------------------------------------------------------------------
  // Answer selection
  // ------------------------------------------------------------------
  const handleSelect = useCallback(
    async (choiceId: AnswerId) => {
      if (!isEnabled || isLocked || lockRef.current || !currentQuestion) return;
      lockRef.current = true;
      setIsLocked(true);
      setIsEnabled(false);
      setSelectedId(choiceId);

      const correctId =
        currentQuestion.correctTextId ||
        (currentQuestion.type === 'picture-id'
          ? currentQuestion.picChoices?.find((c) => c.vocabId === currentQuestion.correctVocabId)?.id
          : currentQuestion.correctTextId);

      const isCorrect = choiceId === correctId;

      try {
        if (isCorrect) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        } else {
          // Shake animation for wrong answer
          Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
          ]).start();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        }
      } catch {}

      const record: AnswerRecord = {
        questionId: currentQuestion.id,
        selected: choiceId,
        correct: isCorrect,
      };

      setAnswers((prev) => [...prev, record]);

      // Play voice-over via centralized hook then advance with a 1-second delay
      await triggerFeedback(isCorrect, () => {
        nextQuestionTimerRef.current = setTimeout(() => {
          const nextIdx = currentIndex + 1;
          if (nextIdx < totalQuestions) {
            setCurrentIndex(nextIdx);
          } else {
            // Quiz complete
            const finalAnswers = [...answers, record];
            const finalCorrect = finalAnswers.filter((a) => a.correct).length;
            const finalPassed = (finalCorrect / totalQuestions) * 100 >= 60;
            setStarsAwarded(finalCorrect);
            setQuizDone(true);
            if (finalPassed) setShowCelebration(true);

            const catId = CATEGORY_SLUG_TO_ID[slug ?? ''] ?? 1;
            submitQuizReward({
              categoryId: catId,
              difficulty: 'madali',
              sessionId: sessionIdRef.current,
              answers: finalAnswers.map((a) => ({
                question_id: a.questionId,
                selected_answer: a.selected,
                is_correct: a.correct,
              })),
              currentStarsBalance: user?.stars_balance ?? 0,
              updateUserStars,
            });
          }
        }, 1000);
      });
    },
    [isEnabled, isLocked, currentQuestion, currentIndex, totalQuestions, answers, slug, user?.stars_balance, updateUserStars, shakeAnim, triggerFeedback]
  );

  // ------------------------------------------------------------------
  // Retry
  // ------------------------------------------------------------------
  const handleRetry = () => {
    sessionIdRef.current = generateSessionId('quiz_madali');
    setStarsAwarded(0);
    resetStreaks();
    setCurrentIndex(0);
    setSelectedId(null);
    setIsLocked(false);
    setIsEnabled(false);
    setAnswers([]);
    setQuizDone(false);
    setShowCelebration(false);
    lockRef.current = false;
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
  };

  // ------------------------------------------------------------------
  // Guard: no questions
  // ------------------------------------------------------------------
  if (questions.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="Madali — Quiz"
          bgColor={category.color}
        />
        <View style={styles.centeredMsg}>
          <Text style={styles.centeredMsgText}>
            Walang magagamit na tanong para sa kategoryang ito.
          </Text>
          <PrimaryButton
            title="Bumalik"
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace(`/(student)/category/${slug}` as any);
              }
            }}
            variant="primary"
            size="md"
            style={{ marginTop: 20 }}
          />
        </View>
      </View>
    );
  }

  // ------------------------------------------------------------------
  // Results Screen
  // ------------------------------------------------------------------
  if (quizDone) {
    return (
      <View style={styles.container}>
        <ScreenHeader
          title="Resulta ng Pagsusulit"
          showBack={false}
          bgColor={category.color}
        />

        <ScrollView
          contentContainerStyle={styles.resultScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.resultCard, Shadows.card]}>
            {/* Trophy / retry icon */}
            <LinearGradient
              colors={passed ? Gradients.sunLight : Gradients.candyLight}
              style={styles.resultIconCircle}
            >
              <Ionicons
                name={passed ? 'trophy' : 'refresh-circle'}
                size={54}
                color={passed ? Colors.sunYellowDark : Colors.coralPinkDark}
              />
            </LinearGradient>

            <Text style={styles.resultTitle}>
              {passed ? 'Binabati Kita! 🎉' : 'Subukang Muli! 💪'}
            </Text>
            <Text style={styles.resultSubtitle}>
              {passed
                ? 'Napakagaling! Matagumpay mong natapos ang Madali na pagsusulit!'
                : 'Huwag manghinayang. Magsanay pa at subukan muli!'}
            </Text>

            {/* Stars pill */}
            {starsAwarded > 0 && (
              <LinearGradient
                colors={Gradients.sun}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.starsPill, Shadows.colored(Colors.sunYellowDark, 0.3)]}
              >
                <Ionicons name="star" size={20} color={Colors.white} />
                <Text style={styles.starsPillText}>+{starsAwarded} Bituin!</Text>
              </LinearGradient>
            )}

            {/* Score stats */}
            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="checkmark-circle" size={24} color={Colors.grassGreen} />
                <Text style={[styles.statNumber, { color: Colors.grassGreenDark }]}>
                  {correctCount}
                </Text>
                <Text style={styles.statLabel}>Tama</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: '#FFF1F2' }]}>
                <Ionicons name="close-circle" size={24} color={Colors.coralPink} />
                <Text style={[styles.statNumber, { color: Colors.coralPinkDark }]}>
                  {wrongCount}
                </Text>
                <Text style={styles.statLabel}>Mali</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="stats-chart" size={24} color={Colors.skyBlueDark} />
                <Text style={[styles.statNumber, { color: Colors.skyBlueDark }]}>
                  {percentage}%
                </Text>
                <Text style={styles.statLabel}>Marka</Text>
              </View>
            </View>

            <Text style={styles.scoreText}>
              {correctCount} sa {totalQuestions} ang tama
            </Text>

            {/* Replay & Endless Learning Actions (Part C) */}
            <View style={{ width: '100%', marginTop: 16 }}>
              <PrimaryButton
                title="Maglaro Muli"
                variant="primary"
                size="md"
                icon="refresh"
                onPress={handleRetry}
                style={{ width: '100%' }}
              />
              <PrimaryButton
                title="Subukan ang Mini-Games 🎮"
                variant="secondary"
                size="md"
                icon="game-controller"
                onPress={() => router.push('/(student)/(tabs)/minigames' as any)}
                style={{ width: '100%', marginTop: 10 }}
              />
              <PrimaryButton
                title="Tingnan ang Gantimpala ⭐"
                variant="outline"
                size="md"
                icon="gift-outline"
                onPress={() => router.push('/(student)/(tabs)/gantimpala' as any)}
                style={{ width: '100%', marginTop: 10 }}
              />
              <PrimaryButton
                title="Bumalik sa Pagsusulit"
                variant="outline"
                size="sm"
                icon="arrow-back"
                onPress={() => {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    router.replace(`/(student)/category/${slug}` as any);
                  }
                }}
                style={{ width: '100%', marginTop: 8 }}
              />
            </View>
          </View>
        </ScrollView>

        <CelebrationOverlay
          visible={showCelebration}
          title="Binabati Kita!"
          subtitle={`Nakakuha ka ng ${correctCount} tamang sagot!`}
          stars={1}
          onContinue={() => setShowCelebration(false)}
          continueText="Tingnan ang Resulta"
        />
      </View>
    );
  }

  // ------------------------------------------------------------------
  // Derive correct choice ID for rendering feedback
  // ------------------------------------------------------------------
  const correctChoiceId: AnswerId | undefined =
    (currentQuestion?.correctTextId as AnswerId | undefined) ||
    (currentQuestion?.picChoices?.find(
      (c) => c.vocabId === currentQuestion.correctVocabId
    )?.id as AnswerId | undefined);

  // ------------------------------------------------------------------
  // Gameplay Screen
  // ------------------------------------------------------------------
  return (
    <View style={styles.container}>
      <ScreenHeader
        title={`${category.name} — Madali`}
        subtitle={`Tanong ${currentIndex + 1} sa ${totalQuestions}`}
        bgColor={category.color}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Progress bar */}
        <View style={styles.progressRow}>
          <ProgressIndicator
            current={currentIndex + 1}
            total={totalQuestions}
            gradient={Gradients.grass}
            height={10}
          />
        </View>

        {/* Question card */}
        <Animated.View
          style={[
            styles.promptCard,
            Shadows.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { translateX: shakeAnim }],
            },
          ]}
        >
          {/* Question type badge */}
          <View
            style={[
              styles.typeBadge,
              {
                backgroundColor:
                  currentQuestion?.type === 'picture-id' ? '#EDE9FE' : '#DCFCE7',
              },
            ]}
          >
            <Text
              style={[
                styles.typeBadgeText,
                {
                  color:
                    currentQuestion?.type === 'picture-id'
                      ? Colors.vibrantPurpleDark ?? '#6D28D9'
                      : Colors.grassGreenDark,
                },
              ]}
            >
              {currentQuestion?.type === 'picture-id'
                ? '🖼️ Pagkilala ng Larawan'
                : '🔤 Bokabularyo'}
            </Text>
          </View>

          {/* Question counter */}
          <Text style={styles.questionCounter}>
            Tanong {currentIndex + 1} sa {totalQuestions}
          </Text>

          {/* Question text with interactive voice audio speaker */}
          <View style={styles.questionPromptRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.questionText}>{currentQuestion?.questionFil}</Text>
              <Text style={styles.questionTextEn}>{currentQuestion?.questionEn}</Text>
            </View>
            <TouchableOpacity
              style={[styles.audioSpeakerBtn, isPlayingAudio && styles.audioSpeakerBtnActive]}
              onPress={playQuestionAudio}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Pakinggan ang tanong"
            >
              <Ionicons
                name={isPlayingAudio ? 'volume-high' : 'volume-medium'}
                size={24}
                color={isPlayingAudio ? Colors.white : Colors.vibrantPurple}
              />
            </TouchableOpacity>
          </View>

          {/* Large clear picture of the correct answer for Picture-ID questions */}
          {currentQuestion?.type === 'picture-id' && currentQuestion?.correctVocabId && (
            <View style={styles.picturePromptContainer}>
              {findVocabItem(currentQuestion.correctVocabId) ? (
                <ItemVisual
                  item={findVocabItem(currentQuestion.correctVocabId)!}
                  size={150}
                />
              ) : null}
            </View>
          )}

          {/* Waiting indicator */}
          {!isEnabled && !isLocked && (
            <View style={styles.waitBadge}>
              <Text style={styles.waitBadgeText}>⏳ Maghintay...</Text>
            </View>
          )}
        </Animated.View>

        {/* Choices: 4 large tappable buttons labeled A, B, C, D */}
        <View style={styles.textChoicesCol}>
          {(currentQuestion?.textChoices ?? []).map((choice: MadaliTextChoice) => {
            const isSelected = selectedId === choice.id;
            const isCorrect = choice.id === correctChoiceId;
            return (
              <TextChoiceButton
                key={choice.id}
                choice={choice}
                isSelected={isSelected}
                isCorrect={isCorrect}
                isLocked={isLocked}
                isEnabled={isEnabled}
                onPress={() => handleSelect(choice.id)}
              />
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface TextChoiceButtonProps {
  choice: MadaliTextChoice;
  isSelected: boolean;
  isCorrect: boolean;
  isLocked: boolean;
  isEnabled: boolean;
  onPress: () => void;
}

function TextChoiceButton({
  choice,
  isSelected,
  isCorrect,
  isLocked,
  isEnabled,
  onPress,
}: TextChoiceButtonProps) {
  let bg: string = Colors.white;
  let borderColor: string = 'rgba(0,0,0,0.08)';
  let textColor: string = Colors.text;
  let badgeColor: string | undefined;

  if (isLocked) {
    if (isSelected && isCorrect) {
      bg = '#F0FDF4';
      borderColor = Colors.grassGreen;
      textColor = Colors.grassGreenDark;
      badgeColor = Colors.grassGreen;
    } else if (isSelected && !isCorrect) {
      bg = '#FFF1F2';
      borderColor = Colors.coralPink;
      textColor = Colors.coralPinkDark;
      badgeColor = Colors.coralPink;
    } else if (isCorrect) {
      bg = '#F0FDF4';
      borderColor = Colors.grassGreen;
      textColor = Colors.grassGreenDark;
    }
  }

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      disabled={!isEnabled || isLocked}
      style={[
        styles.textChoiceBtn,
        { backgroundColor: bg, borderColor },
        (!isEnabled || isLocked) && !isLocked && styles.choiceDisabled,
        Shadows.soft,
      ]}
    >
      {/* Label pill (A/B/C/D) */}
      <View
        style={[
          styles.choicePill,
          {
            backgroundColor: isLocked && (isSelected || isCorrect) ? borderColor : '#E2E8F0',
          },
        ]}
      >
        <Text
          style={[
            styles.choicePillText,
            {
              color:
                isLocked && (isSelected || isCorrect) ? Colors.white : Colors.textLight,
            },
          ]}
        >
          {choice.id}
        </Text>
      </View>

      <Text style={[styles.textChoiceText, { color: textColor }]}>{choice.text}</Text>

      {/* Badge */}
      {isLocked && isSelected && (
        <View style={[styles.textFeedbackIcon, { backgroundColor: badgeColor }]}>
          <Ionicons
            name={isCorrect ? 'checkmark' : 'close'}
            size={16}
            color={Colors.white}
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centeredMsg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  centeredMsgText: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
  progressRow: {
    width: '100%',
    marginBottom: 14,
  },
  // Prompt card
  promptCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    padding: 20,
    alignItems: 'center',
    marginBottom: 18,
  },
  typeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    marginBottom: 10,
  },
  typeBadgeText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  questionCounter: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    fontWeight: Typography.weights.semibold,
    marginBottom: 8,
  },
  questionText: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 4,
  },
  questionTextEn: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
  },
  picturePromptContainer: {
    marginVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    minWidth: 170,
    minHeight: 155,
  },
  waitBadge: {
    marginTop: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  waitBadgeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: '#92400E',
  },
  // Picture choices grid
  choicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  picCard: {
    width: CHOICE_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginBottom: 14,
    alignItems: 'center',
    position: 'relative',
    paddingBottom: 8,
  },
  missingVisual: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  missingVisualText: {
    fontSize: 44,
  },
  missingVisualLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: 4,
  },
  picLabel: {
    width: '100%',
    paddingHorizontal: 8,
    paddingTop: 6,
    alignItems: 'center',
  },
  picLabelText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  // Text choices
  textChoicesCol: {
    gap: 12,
  },
  textChoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 60,
  },
  choicePill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  choicePillText: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  textChoiceText: {
    flex: 1,
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    lineHeight: 22,
  },
  textFeedbackIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  // Shared border styles
  choiceNormalBorder: {
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.07)',
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
  choiceDisabled: {
    opacity: 0.75,
  },
  feedbackBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Results
  resultScrollContent: {
    padding: 20,
    paddingBottom: 50,
  },
  resultCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    padding: 28,
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
    textAlign: 'center',
  },
  resultSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  starsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    marginBottom: 20,
    gap: 6,
  },
  starsPillText: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    gap: 10,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    borderRadius: Radius.lg,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
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
  scoreText: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    fontWeight: Typography.weights.semibold,
    marginBottom: 4,
  },
  questionPromptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  audioSpeakerBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
  },
  audioSpeakerBtnActive: {
    backgroundColor: Colors.vibrantPurple,
    borderColor: Colors.vibrantPurpleDark,
  },
});
