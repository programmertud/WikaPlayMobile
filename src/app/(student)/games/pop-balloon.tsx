/**
 * Pop Balloon Mini-Game — Improved
 *
 * Floating balloons each showing a vocabulary picture + Filipino label.
 * Student pops the balloon matching the target instruction.
 * Smooth floating animation, large tap targets, 20 rounds.
 */
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/utils/haptics';
import { USE_NATIVE_DRIVER } from '@/utils/platform';

import { AnimatedBackground } from '../../../components/AnimatedBackground';
import { ItemVisual } from '../../../components/ItemVisual';
import { ProgressIndicator } from '../../../components/ProgressIndicator';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { CelebrationOverlay } from '../../../components/CelebrationOverlay';
import { MysteryBoxModal } from '../../../components/MysteryBoxModal';
import { getCategoryBySlug, getCategoryVocabulary } from '../../../data/categories';
import { useAuth } from '../../../hooks/use-auth';
import { usePresence } from '../../../hooks/use-presence';
import { useAnswerFeedback } from '../../../hooks/use-answer-feedback';
import { generateSessionId, submitMinigameReward } from '../../../services/rewards/star-reward-service';
import { playVocabularyItem, stopCurrentSound, useBgmDuck } from '../../../services/audio/sound-service';
import { Colors, Gradients, Shadows, Typography, Radius } from '../../../theme';
import { Collectible, VocabularyItem } from '../../../types';

const { width } = Dimensions.get('window');
const BALLOON_SIZE = Math.min((width - 56) / 2, 148);

const BALLOON_GRADIENTS: [string, string][] = [
  ['#F472B6', '#EC4899'],
  ['#FB923C', '#EA580C'],
  ['#34D399', '#059669'],
  ['#60A5FA', '#2563EB'],
  ['#A78BFA', '#7C3AED'],
  ['#FBBF24', '#D97706'],
];

interface BalloonItem {
  key: string;
  item: VocabularyItem;
  gradientIndex: number;
  popped: boolean;
  floatAnim: Animated.Value;
}

function buildRound(
  items: VocabularyItem[],
  targetIdx: number
): { target: VocabularyItem; balloons: Omit<BalloonItem, 'floatAnim'>[] } {
  const target = items[targetIdx % items.length];
  const others = items.filter((it) => it.id !== target.id);
  const shuffled = [...others].sort(() => 0.5 - Math.random()).slice(0, 3);
  const selected = [target, ...shuffled].sort(() => 0.5 - Math.random());

  const balloons: Omit<BalloonItem, 'floatAnim'>[] = selected.map((item, idx) => ({
    key: `${item.id}-${targetIdx}-${idx}`,
    item,
    gradientIndex: (targetIdx + idx) % BALLOON_GRADIENTS.length,
    popped: false,
  }));

  return { target, balloons };
}

/** Individual floating balloon component */
function FloatingBalloon({
  balloon,
  disabled,
  onPop,
  size,
}: {
  balloon: BalloonItem;
  disabled: boolean;
  onPop: (balloon: BalloonItem) => void;
  size: number;
}) {
  const floatAnim = balloon.floatAnim;

  useEffect(() => {
    if (balloon.popped) return;
    const offset = Math.random() * 1000;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -14,
          duration: 1600 + offset,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1600 + offset,
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [balloon.popped, floatAnim]);

  if (balloon.popped) {
    return (
      <View style={[styles.balloonSlot, { width: size, height: size * 1.3 }]}>
        <Text style={styles.popBurst}>💥</Text>
        <Text style={styles.poppedWord}>{balloon.item.filipino}</Text>
      </View>
    );
  }

  const gradient = BALLOON_GRADIENTS[balloon.gradientIndex];

  return (
    <Animated.View
      style={[
        styles.balloonSlot,
        { width: size, height: size * 1.3 },
        { transform: [{ translateY: floatAnim }] },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.8}
        disabled={disabled}
        onPress={() => onPop(balloon)}
        style={{ width: size, height: size * 1.2, alignItems: 'center' }}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={[styles.balloon, { width: size, height: size * 1.1, borderRadius: size * 0.55 }]}
        >
          {/* Shine */}
          <View style={[styles.balloonShine, { width: size * 0.18, height: size * 0.1 }]} />
          {/* Picture */}
          <View style={styles.balloonImageWrap}>
            <ItemVisual item={balloon.item} size={size * 0.46} />
          </View>
          {/* Word label */}
          <View style={styles.balloonLabelWrap}>
            <Text style={styles.balloonLabel} numberOfLines={1}>
              {balloon.item.filipino}
            </Text>
          </View>
        </LinearGradient>
        {/* Knot */}
        <View style={[styles.balloonKnot, { backgroundColor: gradient[1] }]} />
        {/* String */}
        <View style={styles.balloonString} />
      </TouchableOpacity>
    </Animated.View>
  );
}

function shuffleItems<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function PopBalloon() {
  useBgmDuck();
  const { user, updateUserStars } = useAuth();
  const { category: categorySlug } = useLocalSearchParams<{ category?: string }>();
  const category = getCategoryBySlug(categorySlug);
  const rawItems = getCategoryVocabulary(category.slug);
  const [items, setItems] = useState<VocabularyItem[]>(() => shuffleItems(rawItems));

  // Stable session ID — regenerated only on restart
  const sessionIdRef = useRef<string>(generateSessionId('pop'));

  const [currentIdx, setCurrentIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [starsAwarded, setStarsAwarded] = useState(0);
  const [locked, setLocked] = useState(false);
  const [showMysteryBox, setShowMysteryBox] = useState(false);
  const [awardedCollectible, setAwardedCollectible] = useState<Collectible | null>(null);
  const { triggerFeedback, resetStreaks } = useAnswerFeedback();

  const TOTAL_ROUNDS = 20;

  // Build round with animated floats
  const buildAnimatedRound = (idx: number, activeItems: VocabularyItem[] = items) => {
    const { target, balloons } = buildRound(activeItems, idx);
    const animated: BalloonItem[] = balloons.map((b) => ({
      ...b,
      floatAnim: new Animated.Value(0),
    }));
    return { target, balloons: animated };
  };

  const [roundData, setRoundData] = useState(() => buildAnimatedRound(0, shuffleItems(rawItems)));
  const { target, balloons } = roundData;

  usePresence(`Pop Balloon (${category.name})`, 'minigame_pop_balloon');

  useEffect(() => {
    return () => {
      stopCurrentSound();
    };
  }, []);

  useEffect(() => {
    if (target && !gameOver) {
      stopCurrentSound();
      playVocabularyItem(target);
    }
    return () => {
      stopCurrentSound();
    };
  }, [currentIdx, gameOver]);

  const handlePop = async (balloon: BalloonItem) => {
    if (locked || balloon.popped) return;
    setLocked(true);

    const isCorrect = balloon.item.id === target.id;

    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setCorrect((c) => c + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }

    // Mark balloon as popped
    setRoundData((prev) => ({
      ...prev,
      balloons: prev.balloons.map((b) =>
        b.key === balloon.key ? { ...b, popped: true } : b
      ),
    }));

    await triggerFeedback(isCorrect, () => {
      const finalCorrect = correct + (isCorrect ? 1 : 0);
      if (currentIdx + 1 >= TOTAL_ROUNDS) {
        submitFinalScore(finalCorrect);
      } else {
        const nextIdx = currentIdx + 1;
        setCurrentIdx(nextIdx);
        setRoundData(buildAnimatedRound(nextIdx));
        setLocked(false);
      }
    });
  };

  const submitFinalScore = async (finalScore: number) => {
    try {
      const res = await submitMinigameReward({
        gameType: 'pop_balloon',
        score: finalScore,
        sessionId: sessionIdRef.current,
        metadata: { category: category.slug, correct: finalScore, total: TOTAL_ROUNDS },
        currentStarsBalance: user?.stars_balance ?? 0,
        updateUserStars,
      });
      setStarsAwarded(res.starsAwarded);
      if (res.session?.qualifies_for_collectible && res.session?.collectible) {
        setAwardedCollectible(res.session.collectible);
        setShowMysteryBox(true);
      } else {
        setGameOver(true);
      }
    } catch {
      setStarsAwarded(finalScore);
      setGameOver(true);
    }
  };

  const handleRestart = () => {
    sessionIdRef.current = generateSessionId('pop');
    resetStreaks();
    const newShuffled = shuffleItems(rawItems);
    setItems(newShuffled);
    setCurrentIdx(0);
    setCorrect(0);
    setGameOver(false);
    setShowMysteryBox(false);
    setAwardedCollectible(null);
    setLocked(false);
    setRoundData(buildAnimatedRound(0, newShuffled));
  };

  const handleExitGame = () => {
    stopCurrentSound();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(student)/(tabs)/minigames');
    }
  };

  return (
    <AnimatedBackground>
      <ScreenHeader
        title={`Pop Balloon — ${category.name}`}
        bgColor={category.color}
        logoImage={require('../../../../assets/images/minigames/cover-pop-balloon.jpg')}
        showBack={true}
        onBack={handleExitGame}
      />

      <View style={styles.content}>
        {/* Progress with In-game Back Button */}
        <View style={styles.progressRow}>
          <ProgressIndicator
            current={currentIdx + 1}
            total={TOTAL_ROUNDS}
            gradient={Gradients.grass}
            height={10}
          />
          <View style={styles.topControlRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleExitGame}
              style={[styles.exitBtn, Shadows.subtle]}
              accessibilityRole="button"
              accessibilityLabel="Bumalik sa Mga Laro"
            >
              <Ionicons name="arrow-back" size={16} color={Colors.text} />
              <Text style={styles.exitBtnText}>Bumalik</Text>
            </TouchableOpacity>
            <Text style={styles.progressLabel}>
              Tanong {currentIdx + 1} sa {TOTAL_ROUNDS} • ✓ {correct}
            </Text>
          </View>
        </View>

        {/* Instruction card */}
        <View style={[styles.promptCard, Shadows.card]}>
          <Text style={styles.promptInstruction}>🎈 Pumutok ng tamang lobo!</Text>
          <View style={styles.promptTargetRow}>
            <Text style={[styles.targetWord, { color: category.color || Colors.skyBlueDark }]}>
              {`"${target.filipino}"`}
            </Text>
            <TouchableOpacity
              onPress={() => playVocabularyItem(target)}
              style={styles.audioBtn}
            >
              <Ionicons name="volume-high" size={22} color={category.color || Colors.skyBlueDark} />
            </TouchableOpacity>
          </View>
          <Text style={styles.targetEnglish}>({target.english})</Text>
        </View>

        {/* Balloons */}
        <View style={styles.balloonsGrid}>
          {balloons.map((balloon) => (
            <FloatingBalloon
              key={balloon.key}
              balloon={balloon}
              disabled={locked}
              onPop={handlePop}
              size={BALLOON_SIZE}
            />
          ))}
        </View>
      </View>

      <CelebrationOverlay
        visible={gameOver}
        title="Magaling!"
        subtitle={`Napasabog mo ang ${correct} sa ${TOTAL_ROUNDS} tamang lobo sa ${category.name}!`}
        scoreText={`+${starsAwarded} Bituin! ⭐`}
        stars={correct >= 15 ? 3 : correct >= 10 ? 2 : 1}
        continueText="Maglaro Ulit"
        onContinue={handleRestart}
        onExit={handleExitGame}
        exitText="Bumalik sa Mga Laro"
      />

      <MysteryBoxModal
        visible={showMysteryBox}
        score={correct}
        totalQuestions={TOTAL_ROUNDS}
        starsAwarded={starsAwarded}
        collectible={awardedCollectible}
        onClose={() => {
          setShowMysteryBox(false);
          setGameOver(true);
        }}
      />
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  progressRow: {
    width: '100%',
    marginBottom: 4,
  },
  topControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  exitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  exitBtnText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  progressLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    fontWeight: Typography.weights.semibold,
  },
  promptCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  promptInstruction: {
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
    fontSize: 26,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  audioBtn: {
    padding: 4,
  },
  targetEnglish: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    fontWeight: Typography.weights.medium,
  },
  balloonsGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-evenly',
    alignContent: 'center',
    gap: 12,
  },
  balloonSlot: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  balloon: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  balloonShine: {
    position: 'absolute',
    top: 12,
    left: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    transform: [{ rotate: '-30deg' }],
  },
  balloonImageWrap: {
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balloonLabelWrap: {
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 2,
    maxWidth: '90%',
  },
  balloonLabel: {
    fontSize: 13,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
    textAlign: 'center',
  },
  balloonKnot: {
    width: 10,
    height: 7,
    borderRadius: 3,
    marginTop: 1,
  },
  balloonString: {
    width: 1.5,
    height: 22,
    backgroundColor: 'rgba(100, 100, 100, 0.4)',
  },
  popBurst: {
    fontSize: 52,
    marginTop: 8,
  },
  poppedWord: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.textMuted,
    marginTop: 4,
  },
});
