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
  stopCurrentSound,
} from '../../../../services/audio/sound-service';
import { useBgmDuck } from '../../../../services/audio/bgm-service';
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MadaliQuizScreen() {
  useBgmDuck();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { updateUserStars } = useAuth();

  const category = getCategoryBySlug(slug);
  usePresence(`Nagsusulit sa ${category.name} (Madali)`, 'quiz_madali');

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

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockRef = useRef(false);   // prevent double-tap race

  // Centralized voice-over streak manager
  const { triggerFeedback, resetStreaks } = useAnswerFeedback();

  const currentQuestion = questions[currentIndex] ?? null;
  const totalQuestions = questions.length;

  const correctCount = answers.filter((a) => a.correct).length;
  const wrongCount = answers.filter((a) => !a.correct).length;
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const passed = percentage >= 60;

  // ------------------------------------------------------------------
  // Animate question in
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

    // Enable choices after a short delay (gives child time to read)
    timerRef.current = setTimeout(() => {
      setIsEnabled(true);
    }, 1200);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      stopCurrentSound();
    };
  }, [currentIndex, quizDone, fadeAnim, slideAnim]);

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

      // Play voice-over via centralized hook then advance
      await triggerFeedback(isCorrect, () => {
        const nextIdx = currentIndex + 1;
        if (nextIdx < totalQuestions) {
          setCurrentIndex(nextIdx);
        } else {
          // Quiz complete
          const finalCorrect = [...answers, record].filter((a) => a.correct).length;
          const finalPassed = (finalCorrect / totalQuestions) * 100 >= 60;
          const starsAwarded = finalPassed ? 1 : 0;
          updateUserStars(starsAwarded);
          setQuizDone(true);
          if (finalPassed) setShowCelebration(true);
        }
      });
    },
    [isEnabled, isLocked, currentQuestion, currentIndex, totalQuestions, answers, updateUserStars, shakeAnim, triggerFeedback]
  );

  // ------------------------------------------------------------------
  // Retry
  // ------------------------------------------------------------------
  const handleRetry = () => {
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
            onPress={() => router.back()}
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
            {passed && (
              <LinearGradient
                colors={Gradients.sun}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.starsPill, Shadows.colored(Colors.sunYellowDark, 0.3)]}
              >
                <Ionicons name="star" size={20} color={Colors.white} />
                <Text style={styles.starsPillText}>+1 Bituin!</Text>
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

            {/* Buttons */}
            <PrimaryButton
              title="Subukan Muli"
              variant="secondary"
              size="lg"
              icon="refresh"
              onPress={handleRetry}
              style={{ width: '100%', marginTop: 20 }}
            />
            <PrimaryButton
              title="Bumalik sa Kategorya"
              variant="primary"
              size="lg"
              icon="arrow-back"
              onPress={() => router.back()}
              style={{ width: '100%', marginTop: 12 }}
            />
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

          {/* Question text */}
          <Text style={styles.questionText}>{currentQuestion?.questionFil}</Text>
          <Text style={styles.questionTextEn}>{currentQuestion?.questionEn}</Text>

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
});
