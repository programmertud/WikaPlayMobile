/**
 * Pop Balloon Mini-Game
 * Category-based: Displays selectable balloons labeled with vocabulary items
 * from the selected category. The student pops the balloon matching the target prompt.
 */
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/utils/haptics';

import { ProgressIndicator } from '../../../components/ProgressIndicator';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { PressableScale } from '../../../components/PressableScale';
import { CelebrationOverlay } from '../../../components/CelebrationOverlay';
import { MysteryBoxModal } from '../../../components/MysteryBoxModal';
import { getCategoryBySlug, getCategoryVocabulary } from '../../../data/categories';
import { useAuth } from '../../../hooks/use-auth';
import { usePresence } from '../../../hooks/use-presence';
import { useAnswerFeedback } from '../../../hooks/use-answer-feedback';
import { minigameService } from '../../../services/api';
import {
  playVocabularyItem,
  useBgmDuck,
} from '../../../services/audio/sound-service';
import { Colors, Gradients, Shadows, Typography, Radius } from '../../../theme';
import { Collectible, VocabularyItem } from '../../../types';

const { width } = Dimensions.get('window');
const BALLOON_SIZE = Math.min((width - 64) / 2, 140);
const BALLOON_GRADIENTS = [
  ['#F43F5E', '#BE123C'],
  ['#F59E0B', '#D97706'],
  ['#10B981', '#059669'],
  ['#3B82F6', '#1D4ED8'],
  ['#8B5CF6', '#6D28D9'],
  ['#EC4899', '#DB2777'],
] as const;

interface BalloonOption {
  item: VocabularyItem;
  gradientIndex: number;
  popped: boolean;
}

function buildRound(items: VocabularyItem[], targetIdx: number): {
  target: VocabularyItem;
  options: BalloonOption[];
} {
  const target = items[targetIdx % items.length];
  const others = items.filter((_, i) => (i % items.length) !== (targetIdx % items.length));
  const shuffled = [...others].sort(() => 0.5 - Math.random()).slice(0, 3);
  const selectedItems = [target, ...shuffled].sort(() => 0.5 - Math.random());

  const options: BalloonOption[] = selectedItems.map((item, idx) => ({
    item,
    gradientIndex: idx % BALLOON_GRADIENTS.length,
    popped: false,
  }));

  return { target, options };
}

export default function PopBalloon() {
  useBgmDuck();
  const { updateUserStars } = useAuth();
  const { category: categorySlug } = useLocalSearchParams<{ category?: string }>();
  const category = getCategoryBySlug(categorySlug);
  const items = getCategoryVocabulary(category.slug);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [starsAwarded, setStarsAwarded] = useState(0);
  const [locked, setLocked] = useState(false);

  // Mystery Box & Collectible state
  const [showMysteryBox, setShowMysteryBox] = useState(false);
  const [awardedCollectible, setAwardedCollectible] = useState<Collectible | null>(null);

  // Centralized voice-over streak manager
  const { triggerFeedback, resetStreaks } = useAnswerFeedback();

  // Exactly 20 questions / levels
  const totalRounds = 20;
  const [roundData, setRoundData] = useState(() => buildRound(items, 0));

  usePresence(`Pop Balloon (${category.name})`, 'minigame_pop_balloon');

  const target = roundData.target;
  const balloonOptions = roundData.options;

  useEffect(() => {
    if (target && !gameOver) {
      playVocabularyItem(target);
    }
  }, [currentIdx, gameOver]);

  const handlePop = async (option: BalloonOption) => {
    if (locked || option.popped) return;
    setLocked(true);

    const isCorrect = option.item.id === target.id;

    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setCorrect((c) => c + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }

    setRoundData((prev) => ({
      ...prev,
      options: prev.options.map((b) => (b.item.id === option.item.id ? { ...b, popped: true } : b)),
    }));

    await triggerFeedback(isCorrect, () => {
      const finalCorrect = correct + (isCorrect ? 1 : 0);
      if (currentIdx + 1 >= totalRounds) {
        submitFinalScore(finalCorrect);
      } else {
        const nextIdx = currentIdx + 1;
        setCurrentIdx(nextIdx);
        setRoundData(buildRound(items, nextIdx));
        setLocked(false);
      }
    });
  };

  const submitFinalScore = async (finalScore: number) => {
    const sessionId = `pop_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    try {
      const res = await minigameService.submitResult({
        game_type: 'pop_balloon',
        score: finalScore,
        session_id: sessionId,
        metadata: { category: category.slug, correct: finalScore, total: totalRounds },
      });

      const awarded = res?.session?.stars_awarded ?? finalScore;
      setStarsAwarded(awarded);

      if (res?.session?.stars_balance !== undefined) {
        updateUserStars(res.session.stars_balance);
      }

      // Check if student qualifies for collectible (15-20/20)
      if (res?.session?.qualifies_for_collectible && res?.session?.collectible) {
        setAwardedCollectible(res.session.collectible);
        setShowMysteryBox(true);
      } else {
        setGameOver(true);
      }
    } catch {
      // offline fallback
      setStarsAwarded(finalScore);
      updateUserStars(finalScore);
      setGameOver(true);
    }
  };

  const handleRestart = () => {
    resetStreaks();
    setCurrentIdx(0);
    setCorrect(0);
    setGameOver(false);
    setShowMysteryBox(false);
    setAwardedCollectible(null);
    setLocked(false);
    setRoundData(buildRound(items, 0));
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={`Pop Balloon — ${category.name}`}
        bgColor={category.color}
      />

      <View style={styles.content}>
        {/* Animated Progress Bar */}
        <View style={styles.progressRow}>
          <ProgressIndicator
            current={currentIdx + 1}
            total={totalRounds}
            gradient={Gradients.grass}
            height={10}
          />
        </View>

        {/* Prompt Card with Audio Replay */}
        <PressableScale
          onPress={() => playVocabularyItem(target)}
          style={[styles.promptCard, Shadows.card]}
        >
          <Text style={styles.promptLabel}>Pumutok ng lobo na may:</Text>
          <View style={styles.promptTargetRow}>
            <Text style={[styles.targetWord, { color: category.color || Colors.skyBlueDark }]}>
              {`"${target.filipino}"`}
            </Text>
            <Ionicons name="volume-high" size={24} color={category.color || Colors.skyBlueDark} />
          </View>
          <Text style={styles.targetEnglish}>({target.english})</Text>
        </PressableScale>

        {/* Floating Balloons Grid */}
        <View style={styles.balloonsGrid}>
          {balloonOptions.map((balloon) => {
            if (balloon.popped) {
              return (
                <View key={balloon.item.id} style={styles.poppedPlaceholder}>
                  <Text style={styles.popSplash}>💥</Text>
                  <Text style={styles.popWord}>{balloon.item.filipino}</Text>
                </View>
              );
            }

            const gradient = BALLOON_GRADIENTS[balloon.gradientIndex];

            return (
              <PressableScale
                key={balloon.item.id}
                disabled={locked}
                onPress={() => handlePop(balloon)}
                activeScale={0.92}
                style={[styles.balloonWrapper, Shadows.soft]}
              >
                <LinearGradient
                  colors={gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.balloon}
                >
                  <View style={styles.balloonShine} />
                  <Text style={styles.balloonText} numberOfLines={2}>
                    {balloon.item.filipino}
                  </Text>
                  <View style={styles.balloonKnot} />
                </LinearGradient>
              </PressableScale>
            );
          })}
        </View>
      </View>

      {/* WIN CELEBRATION OVERLAY */}
      <CelebrationOverlay
        visible={gameOver}
        title="Magaling!"
        subtitle={`Napasabog mo ang tamang mga lobo para sa ${category.name}!`}
        scoreText={`+${starsAwarded} Bituin! ⭐`}
        stars={3}
        continueText="Maglaro Ulit"
        onContinue={handleRestart}
      />

      {/* MYSTERY BOX REWARD MODAL */}
      <MysteryBoxModal
        visible={showMysteryBox}
        score={correct}
        starsAwarded={starsAwarded}
        collectible={awardedCollectible}
        onClose={() => {
          setShowMysteryBox(false);
          setGameOver(true);
        }}
      />
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
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  promptLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    fontWeight: Typography.weights.semibold,
    marginBottom: 4,
  },
  promptTargetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  targetWord: {
    fontSize: 28,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  targetEnglish: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    fontWeight: Typography.weights.medium,
  },
  balloonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 16,
  },
  balloonWrapper: {
    width: BALLOON_SIZE,
    height: BALLOON_SIZE * 1.25,
    alignItems: 'center',
  },
  balloon: {
    width: BALLOON_SIZE,
    height: BALLOON_SIZE * 1.15,
    borderRadius: BALLOON_SIZE * 0.55,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
    position: 'relative',
  },
  balloonShine: {
    position: 'absolute',
    top: 14,
    left: 18,
    width: 20,
    height: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    transform: [{ rotate: '-30deg' }],
  },
  balloonText: {
    fontSize: 16,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
    textAlign: 'center',
  },
  balloonKnot: {
    position: 'absolute',
    bottom: -6,
    width: 12,
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 3,
  },
  poppedPlaceholder: {
    width: BALLOON_SIZE,
    height: BALLOON_SIZE * 1.25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  popSplash: {
    fontSize: 48,
  },
  popWord: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.textMuted,
    marginTop: 4,
  },
});
