import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ErrorView } from '../../../../components/ErrorView';
import { ItemVisual } from '../../../../components/ItemVisual';
import { LoadingView } from '../../../../components/LoadingView';
import { PrimaryButton } from '../../../../components/PrimaryButton';
import { ProgressIndicator } from '../../../../components/ProgressIndicator';
import { ScreenHeader } from '../../../../components/ScreenHeader';
import { getCategoryBySlug, getRandomVocabularyChoices } from '../../../../data/categories';
import { useAuth } from '../../../../hooks/use-auth';
import { usePresence } from '../../../../hooks/use-presence';
import { useQuiz } from '../../../../hooks/use-quiz';
import { categoryService, quizService } from '../../../../services/api';
import { Colors, Shadows, Typography } from '../../../../theme';
import { ChoiceItem, QuizDifficulty, QuizQuestion, QuizResultSession } from '../../../../types';

const { width } = Dimensions.get('window');
const CHOICE_WIDTH = (width - 48) / 2;

export default function QuizGameplayScreen() {
  const { slug, difficulty } = useLocalSearchParams<{ slug: string; difficulty: QuizDifficulty }>();
  const { updateUserStars } = useAuth();

  const [categoryName, setCategoryName] = useState<string>('Pagsusulit');
  const [categoryId, setCategoryId] = useState<number>(1);
  const [categoryColor, setCategoryColor] = useState<string>(Colors.skyBlue);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
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
      setQuestions(res.questions);
    } catch (err: any) {
      // Fallback to local category data if offline or network failure
      const cat = getCategoryBySlug(slug);
      if (cat && cat.items && cat.items.length > 0) {
        setCategoryName(cat.name);
        setCategoryId(Number(cat.id.replace(/\D/g, '')) || 1);
        setCategoryColor(cat.color || Colors.skyBlue);

        // Build 5 dynamic offline quiz questions
        const shuffledItems = [...cat.items].sort(() => 0.5 - Math.random());
        const selectedTargets = shuffledItems.slice(0, Math.min(5, shuffledItems.length));
        const offlineQuestions: QuizQuestion[] = selectedTargets.map((target, idx) => {
          const choices = getRandomVocabularyChoices(cat.slug, target, 4);
          const mappedChoices: ChoiceItem[] = choices.map((c) => ({
            id: c.id,
            image_url: c.imageUri || '',
            text: c.filipino,
            vocabularyItem: c,
          }));

          let qText = 'Ano ang tawag sa larawang ito?';
          if (difficulty === 'katamtaman') {
            qText = 'Pakinggan at piliin ang tamang larawan:';
          } else if (difficulty === 'mahirap') {
            qText = `Ano ang salitang Filipino para sa "${target.english}"?`;
          }

          return {
            id: idx + 1,
            target_image_url: target.imageUri || '',
            target_item_name: target.filipino,
            targetItem: target,
            audio_url: target.audioUri || `${target.id}.mp3`,
            choices: mappedChoices,
            correct_answer: target.id,
            points: difficulty === 'madali' ? 10 : difficulty === 'katamtaman' ? 15 : 20,
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
    loadQuiz();
  }, [slug, difficulty]);

  // Submission handler when all questions completed
  const handleQuizComplete = async (answers: { question_id: number; selected_answer: string }[]) => {
    setSubmitting(true);
    try {
      const res = await quizService.submitQuiz({
        category_id: categoryId,
        difficulty: difficulty || 'madali',
        answers,
      });

      setResultSession(res.session);
      updateUserStars(res.session.stars_balance);
    } catch (err: any) {
      // Local scoring fallback when offline
      let correct = 0;
      answers.forEach((ans) => {
        const q = questions.find((item) => item.id === ans.question_id);
        if (q && String(q.correct_answer) === String(ans.selected_answer)) {
          correct += 1;
        }
      });
      const total = questions.length;
      const wrong = total - correct;
      const pointsPerQ = difficulty === 'madali' ? 10 : difficulty === 'katamtaman' ? 15 : 20;
      const totalScore = correct * pointsPerQ;
      const passed = correct >= Math.ceil(total * 0.6);
      const starsAwarded = passed ? (difficulty === 'madali' ? 1 : difficulty === 'katamtaman' ? 2 : 3) : 0;

      const fallbackSession: QuizResultSession = {
        id: Date.now(),
        score: totalScore,
        total_questions: total,
        correct_count: correct,
        wrong_count: wrong,
        passed,
        stars_awarded: starsAwarded,
        stars_balance: starsAwarded,
      };

      setResultSession(fallbackSession);
      updateUserStars(starsAwarded);
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
    score,
    correctCount,
    wrongCount,
    handleSelectAnswer,
    replayAudio,
  } = useQuiz({
    categoryId,
    difficulty: difficulty || 'madali',
    questions,
    onComplete: handleQuizComplete,
  });

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
            <Text style={styles.resultEmoji}>{isPassed ? '🎉🏆' : '💪🌱'}</Text>
            <Text style={styles.resultTitle}>
              {isPassed ? 'Binabati Kita!' : 'Subukang Muli!'}
            </Text>
            <Text style={styles.resultSubtitle}>
              {isPassed
                ? 'Napakagaling! Matagumpay mong naipasa ang pagsusulit!'
                : 'Huwag panghinaan ng loob, magsanay muli upang makakuha ng bituin!'}
            </Text>

            {/* Stars Awarded Pill */}
            {resultSession.stars_awarded > 0 && (
              <View style={[styles.earnedStarsPill, Shadows.button]}>
                <Text style={styles.earnedStarsText}>
                  + {resultSession.stars_awarded} Bituin! ⭐
                </Text>
              </View>
            )}

            {/* Score Breakdown */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{resultSession.correct_count}</Text>
                <Text style={styles.statLabel}>Tamang Sagot ✅</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{resultSession.wrong_count}</Text>
                <Text style={styles.statLabel}>Maling Sagot ❌</Text>
              </View>
            </View>

            <PrimaryButton
              title="Bumalik sa Kategorya"
              variant="primary"
              size="lg"
              onPress={() => router.back()}
              style={{ width: '100%', marginTop: 20 }}
            />
          </View>
        </View>
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
        {/* Progress Bar */}
        <View style={styles.progressRow}>
          <ProgressIndicator current={currentIndex + 1} total={totalQuestions} color={categoryColor} />
        </View>

        {/* Audio / Prompt Section */}
        <View style={[styles.promptCard, Shadows.card]}>
          {isKatamtaman ? (
            // Special Katamtaman Rules:
            // 1. Audio-based picture-selection format
            // 2. Do not show target item name or written questions revealing target item!
            <View style={styles.audioPrompt}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={replayAudio}
                disabled={isPlayingAudio}
                style={[
                  styles.audioSpeakerBtn,
                  isPlayingAudio && styles.audioSpeakerBtnActive,
                  Shadows.button,
                ]}
              >
                {isPlayingAudio ? (
                  <ActivityIndicator color={Colors.white} size="large" />
                ) : (
                  <Text style={styles.speakerEmoji}>🔊</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.audioPromptInstruction}>
                {isPlayingAudio ? 'Makinig nang mabuti...' : 'Pindutin upang marinig muli'}
              </Text>
            </View>
          ) : (
            // Madali or Mahirap format:
            <View style={styles.standardPrompt}>
              {currentQuestion?.targetItem ? (
                <ItemVisual
                  item={currentQuestion.targetItem}
                  size={130}
                  style={{ marginBottom: 12 }}
                />
              ) : currentQuestion?.target_image_url ? (
                <Image
                  source={{ uri: currentQuestion.target_image_url }}
                  style={styles.promptImage}
                  contentFit="contain"
                />
              ) : null}
              <Text style={styles.questionText}>
                {currentQuestion?.question_text || 'Piliin ang wastong sagot:'}
              </Text>
            </View>
          )}

          {/* Timing / Locking Status Banner */}
          {choicesDisabled && !isAnswerLocked && (
            <View style={styles.lockNotice}>
              <Text style={styles.lockNoticeText}>
                {isPlayingAudio ? '🎶 Nakikinig... Mangyaring maghintay' : '⏳ Inihahanda ang mga pagpipilian...'}
              </Text>
            </View>
          )}
        </View>

        {/* Answer Choices Grid */}
        <View style={styles.choicesGrid}>
          {currentQuestion?.choices.map((choice: ChoiceItem, idx: number) => {
            const isSelected = selectedAnswer === choice.id;

            return (
              <TouchableOpacity
                key={`${choice.id}-${idx}`}
                activeOpacity={0.85}
                onPress={() => handleSelectAnswer(choice.id)}
                disabled={choicesDisabled}
                style={[
                  styles.choiceCard,
                  isKatamtaman ? styles.katamtamanChoiceCard : styles.standardChoiceCard,
                  isSelected && styles.choiceCardSelected,
                  choicesDisabled && styles.choiceCardDisabled,
                  Shadows.card,
                ]}
              >
                {/* Visual choice: ItemVisual if available, else Image or Emoji */}
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
                    contentFit="cover"
                  />
                ) : (
                  <Text style={styles.choiceEmoji}>🖼️</Text>
                )}

                {/* For Katamtaman: UI Rule explicitly states:
                    "Do not show the target item name beneath or inside the pictures" */}
                {!isKatamtaman && choice.text ? (
                  <View style={styles.choiceLabelContainer}>
                    <Text style={styles.choiceLabel} numberOfLines={1}>
                      {choice.text}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
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
    borderRadius: 24,
    borderWidth: 4,
    borderColor: Colors.white,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  audioPrompt: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  audioSpeakerBtn: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.sunYellowDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: Colors.white,
  },
  audioSpeakerBtnActive: {
    backgroundColor: Colors.grassGreen,
  },
  speakerEmoji: {
    fontSize: 42,
  },
  audioPromptInstruction: {
    fontSize: Typography.sizes.sm,
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
    borderRadius: 16,
    marginBottom: 10,
  },
  questionText: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.heavy,
    color: Colors.text,
    textAlign: 'center',
  },
  lockNotice: {
    marginTop: 10,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
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
    borderRadius: 22,
    borderWidth: 4,
    borderColor: Colors.white,
    backgroundColor: Colors.white,
    overflow: 'hidden',
    marginBottom: 14,
    alignItems: 'center',
  },
  katamtamanChoiceCard: {
    height: 130, // Picture-only full height for Katamtaman
  },
  standardChoiceCard: {
    height: 150,
  },
  choiceCardSelected: {
    borderColor: Colors.grassGreen,
    borderWidth: 5,
  },
  choiceCardDisabled: {
    opacity: 0.75,
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 6,
    alignItems: 'center',
  },
  choiceLabel: {
    color: Colors.white,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.heavy,
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
    borderRadius: 32,
    borderWidth: 5,
    borderColor: Colors.white,
    padding: 24,
    alignItems: 'center',
  },
  resultEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: Typography.sizes.hero,
    fontWeight: Typography.weights.heavy,
    color: '#0369A1',
    marginBottom: 8,
  },
  resultSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  earnedStarsPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.sunYellowDark,
    marginBottom: 20,
  },
  earnedStarsText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.heavy,
    color: '#B45309',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    paddingVertical: 14,
  },
  statBox: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.heavy,
    color: Colors.text,
  },
  statLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    fontWeight: Typography.weights.semibold,
    marginTop: 2,
  },
});
