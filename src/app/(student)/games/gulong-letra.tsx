/**
 * Gulong ng mga Letra Mini-Game — Improved with Circular Letter Wheel
 *
 * Distinct from Hulaan ang Salita:
 * - Letters are arranged in a circular wheel layout
 * - Tapping a letter in the wheel places it; tapping a placed slot returns it
 * - Visual wheel-like ring with colored letter segments
 * - Auto-submit when all slots filled; manual Suriin also works
 * - Shows correct answer on wrong guess
 */
import { useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/utils/haptics';

import { AnimatedBackground } from '../../../components/AnimatedBackground';
import { ItemVisual } from '../../../components/ItemVisual';
import { ProgressIndicator } from '../../../components/ProgressIndicator';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { PressableScale } from '../../../components/PressableScale';
import { CelebrationOverlay } from '../../../components/CelebrationOverlay';
import { CorrectAnswerConfetti } from '../../../components/CorrectAnswerConfetti';
import { MysteryBoxModal } from '../../../components/MysteryBoxModal';
import { getCategoryBySlug, getCategoryVocabulary } from '../../../data/categories';
import { useAuth } from '../../../hooks/use-auth';
import { usePresence } from '../../../hooks/use-presence';
import { useAnswerFeedback } from '../../../hooks/use-answer-feedback';
import { generateSessionId, submitMinigameReward } from '../../../services/rewards/star-reward-service';
import { stopCurrentSound, useBgmDuck } from '../../../services/audio/sound-service';
import { Colors, Gradients, Shadows, Typography, Radius } from '../../../theme';
import { Collectible, VocabularyItem } from '../../../types';

const { width } = Dimensions.get('window');
const WHEEL_DIAM = Math.min(width - 48, 300);
const TILE_SIZE = 52;

// Wheel segment colors cycling
const SEGMENT_COLORS = [
  '#F43F5E', '#F59E0B', '#10B981', '#3B82F6',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
];

interface WheelTile {
  id: string;
  char: string;
  used: boolean;
  color: string;
}

function buildWheelTiles(word: string): WheelTile[] {
  const clean = word.toUpperCase().replace(/[^A-Z]/g, '');
  const wordLetters = clean.split('');

  // For Gulong ng Letra we only use the exact word letters (no extra distractors)
  // — this keeps the wheel focused and distinct from Hulaan which adds extras
  const shuffled = [...wordLetters];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Ensure not identical to original (if possible)
  if (shuffled.join('') === wordLetters.join('') && shuffled.length > 1) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }

  return shuffled.map((char, idx) => ({
    id: `${char}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    char,
    used: false,
    color: SEGMENT_COLORS[idx % SEGMENT_COLORS.length],
  }));
}

/** Renders letter tiles in a circular wheel arrangement */
function LetterWheel({
  tiles,
  disabled,
  onTileTap,
}: {
  tiles: WheelTile[];
  disabled: boolean;
  onTileTap: (tile: WheelTile) => void;
}) {
  const n = tiles.length;
  const radius = (WHEEL_DIAM / 2) - TILE_SIZE / 2 - 4;
  const centerX = WHEEL_DIAM / 2;
  const centerY = WHEEL_DIAM / 2;

  return (
    <View
      style={[
        styles.wheelContainer,
        { width: WHEEL_DIAM, height: WHEEL_DIAM },
      ]}
    >
      {/* Decorative ring */}
      <View style={styles.wheelRingOuter} />
      <View style={styles.wheelRingInner} />
      <View style={styles.wheelHub}>
        <Ionicons name="star" size={22} color={Colors.sunYellow} />
      </View>

      {/* Letter tiles positioned around the circle */}
      {tiles.map((tile, idx) => {
        const angle = (2 * Math.PI * idx) / n - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle) - TILE_SIZE / 2;
        const y = centerY + radius * Math.sin(angle) - TILE_SIZE / 2;

        return (
          <TouchableOpacity
            key={tile.id}
            disabled={disabled || tile.used}
            activeOpacity={0.7}
            onPress={() => onTileTap(tile)}
            style={[
              styles.wheelTile,
              {
                position: 'absolute',
                left: x,
                top: y,
                width: TILE_SIZE,
                height: TILE_SIZE,
                backgroundColor: tile.used ? '#E2E8F0' : tile.color,
                opacity: tile.used ? 0.35 : 1,
              },
              !tile.used && Shadows.soft,
            ]}
          >
            <Text style={[styles.wheelTileText, tile.used && styles.wheelTileTextUsed]}>
              {tile.char}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
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

export default function GuLongLetra() {
  useBgmDuck();
  const { user, updateUserStars } = useAuth();
  const { category: categorySlug } = useLocalSearchParams<{ category?: string }>();
  const category = getCategoryBySlug(categorySlug);

  React.useEffect(() => {
    return () => {
      stopCurrentSound();
    };
  }, []);
  const rawItems = getCategoryVocabulary(category.slug);
  const [items, setItems] = useState<VocabularyItem[]>(() => shuffleItems(rawItems));

  // Stable session ID — regenerated only on restart
  const sessionIdRef = useRef<string>(generateSessionId('gulong'));

  const [currentIdx, setCurrentIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [starsAwarded, setStarsAwarded] = useState(0);
  const [locked, setLocked] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<'correct' | 'wrong' | null>(null);
  const [showMysteryBox, setShowMysteryBox] = useState(false);
  const [awardedCollectible, setAwardedCollectible] = useState<Collectible | null>(null);

  const { triggerFeedback, resetStreaks, confettiTrigger } = useAnswerFeedback();

  const TOTAL_ROUNDS = 20;
  const currentItem: VocabularyItem = items[currentIdx % items.length];
  const targetWord = currentItem.filipino.toUpperCase().replace(/[^A-Z]/g, '');

  const [tiles, setTiles] = useState<WheelTile[]>(() => buildWheelTiles(targetWord));
  const [slots, setSlots] = useState<(WheelTile | null)[]>(() => new Array(targetWord.length).fill(null));

  usePresence(`Gulong ng mga Letra (${category.name})`, 'minigame_gulong');

  const resetForQuestion = (idx: number, activeItems: VocabularyItem[] = items) => {
    const item = activeItems[idx % activeItems.length];
    const word = item.filipino.toUpperCase().replace(/[^A-Z]/g, '');
    setTiles(buildWheelTiles(word));
    setSlots(new Array(word.length).fill(null));
    setFeedbackStatus(null);
    setLocked(false);
  };

  const handleTileTap = (tile: WheelTile) => {
    if (locked || tile.used) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setTiles((prev) => prev.map((t) => t.id === tile.id ? { ...t, used: true } : t));
    setSlots((prev) => {
      const next = [...prev];
      const emptyIdx = next.findIndex((s) => s === null);
      if (emptyIdx === -1) return prev;
      next[emptyIdx] = tile;
      if (next.filter(Boolean).length === targetWord.length) {
        setTimeout(() => verifyAnswer(next as WheelTile[]), 100);
      }
      return next;
    });
  };

  const handleSlotTap = (slotIdx: number) => {
    if (locked) return;
    const tile = slots[slotIdx];
    if (!tile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSlots((prev) => { const n = [...prev]; n[slotIdx] = null; return n; });
    setTiles((prev) => prev.map((t) => t.id === tile.id ? { ...t, used: false } : t));
  };

  const handleReset = () => {
    if (locked) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setTiles((prev) => prev.map((t) => ({ ...t, used: false })));
    setSlots(new Array(targetWord.length).fill(null));
  };

  const verifyAnswer = async (filledSlots: WheelTile[]) => {
    setLocked(true);
    const guess = filledSlots.map((t) => t.char).join('');
    const isCorrect = guess === targetWord;

    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setFeedbackStatus('correct');
      setCorrect((c) => c + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setFeedbackStatus('wrong');
    }

    await triggerFeedback(isCorrect, () => {
      const finalCorrect = correct + (isCorrect ? 1 : 0);
      if (currentIdx + 1 >= TOTAL_ROUNDS) {
        submitFinalScore(finalCorrect);
      } else {
        const nextIdx = currentIdx + 1;
        setCurrentIdx(nextIdx);
        resetForQuestion(nextIdx);
      }
    });
  };

  const handleSubmit = () => {
    if (locked) return;
    const filled = slots.filter(Boolean) as WheelTile[];
    if (filled.length < targetWord.length) return;
    verifyAnswer(slots as WheelTile[]);
  };

  const submitFinalScore = async (finalScore: number) => {
    try {
      const res = await submitMinigameReward({
        gameType: 'gulong_letra',
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
    sessionIdRef.current = generateSessionId('gulong');
    resetStreaks();
    const newShuffled = shuffleItems(rawItems);
    setItems(newShuffled);
    setCurrentIdx(0);
    setCorrect(0);
    setGameOver(false);
    setShowMysteryBox(false);
    setAwardedCollectible(null);
    resetForQuestion(0, newShuffled);
  };

  const allFilled = slots.every((s) => s !== null);

  return (
    <AnimatedBackground>
      <CorrectAnswerConfetti trigger={confettiTrigger} />
      <ScreenHeader
        title={`Gulong ng Letra — ${category.name}`}
        bgColor={category.color}
        logoImage={require('../../../../assets/images/minigames/cover-gulong-letra.jpg')}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Progress */}
        <View style={styles.progressRow}>
          <ProgressIndicator
            current={currentIdx + 1}
            total={TOTAL_ROUNDS}
            gradient={Gradients.grass}
            height={10}
          />
          <Text style={styles.progressLabel}>
            Tanong {currentIdx + 1}/{TOTAL_ROUNDS} • ✓ {correct}
          </Text>
        </View>

        {/* Picture card */}
        <View style={[styles.visualCard, Shadows.card]}>
          <ItemVisual item={currentItem} size={120} />
          <Text style={styles.englishHint}>{currentItem.english}</Text>
          <View style={styles.instructionBadge}>
            <Ionicons name="sync-circle" size={14} color={Colors.vibrantPurple} />
            <Text style={styles.instructionText}>Buuin ang salita gamit ang gulong!</Text>
          </View>
        </View>

        {/* Answer slots */}
        <View style={styles.slotsRow}>
          {slots.map((slot, i) => {
            let borderColor: string = 'rgba(0,0,0,0.1)';
            let bgColor: string = Colors.white;
            if (feedbackStatus === 'correct') { borderColor = Colors.grassGreen; bgColor = '#F0FDF4'; }
            if (feedbackStatus === 'wrong') { borderColor = Colors.coralPink; bgColor = '#FFF1F2'; }

            return (
              <PressableScale
                key={i}
                disabled={locked || !slot}
                onPress={() => handleSlotTap(i)}
                activeScale={0.9}
                style={[
                  styles.slot,
                  { borderColor, backgroundColor: slot ? (slot.color + '22') : bgColor },
                  slot && { borderColor: slot.color, borderWidth: 2.5 },
                  slot && Shadows.subtle,
                ]}
              >
                <Text style={[styles.slotText, slot && { color: slot.color }]}>
                  {slot?.char ?? ''}
                </Text>
              </PressableScale>
            );
          })}
        </View>

        {/* Wrong answer hint */}
        {feedbackStatus === 'wrong' && (
          <View style={styles.correctHint}>
            <Text style={styles.correctHintLabel}>Tamang sagot: </Text>
            <Text style={styles.correctHintWord}>{targetWord}</Text>
          </View>
        )}

        {/* Circular Wheel */}
        <LetterWheel
          tiles={tiles}
          disabled={locked}
          onTileTap={handleTileTap}
        />

        {/* Controls */}
        <View style={styles.controls}>
          <PressableScale
            disabled={locked || slots.every((s) => s === null)}
            onPress={handleReset}
            style={[styles.resetBtn, slots.every((s) => s === null) && styles.btnDisabled]}
          >
            <Ionicons name="refresh-circle" size={20} color={Colors.textMuted} />
            <Text style={styles.resetText}>I-reset</Text>
          </PressableScale>

          <PressableScale
            disabled={locked || !allFilled}
            onPress={handleSubmit}
            style={[styles.submitBtn, (!allFilled || locked) && styles.btnDisabled]}
          >
            <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
            <Text style={styles.submitText}>Suriin</Text>
          </PressableScale>
        </View>
      </ScrollView>

      <CelebrationOverlay
        visible={gameOver}
        title="Napakahusay!"
        subtitle={`Nabuong muli ang ${correct} sa ${TOTAL_ROUNDS} mga salita!`}
        scoreText={`+${starsAwarded} Bituin! ⭐`}
        stars={correct >= 15 ? 3 : correct >= 10 ? 2 : 1}
        score={correct}
        showFireworks={correct >= 15 && correct <= 20}
        continueText="Maglaro Ulit"
        onContinue={handleRestart}
      />

      <MysteryBoxModal
        visible={showMysteryBox}
        score={correct}
        totalQuestions={TOTAL_ROUNDS}
        starsAwarded={starsAwarded}
        collectible={awardedCollectible}
        onClose={() => { setShowMysteryBox(false); setGameOver(true); }}
      />
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40, alignItems: 'center' },
  progressRow: { width: '100%', marginBottom: 4 },
  progressLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    fontWeight: Typography.weights.semibold,
    marginTop: 4,
    textAlign: 'right',
  },
  visualCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    padding: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    marginTop: 8,
  },
  englishHint: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.textLight,
    marginTop: 8,
    marginBottom: 6,
  },
  instructionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#EDE9FE',
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  instructionText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.vibrantPurple,
  },
  slotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 8,
    width: '100%',
  },
  slot: {
    width: 50,
    height: 58,
    borderRadius: Radius.md,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  slotText: {
    fontSize: 24,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  correctHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.coralPink,
  },
  correctHintLabel: { fontSize: 12, color: Colors.coralPinkDark },
  correctHintWord: {
    fontSize: 14,
    fontWeight: Typography.weights.heavy,
    color: Colors.coralPinkDark,
    letterSpacing: 2,
  },
  // ── Wheel ────────────────────────────────────────────────────────────
  wheelContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  wheelRingOuter: {
    position: 'absolute',
    width: WHEEL_DIAM - 8,
    height: WHEEL_DIAM - 8,
    borderRadius: (WHEEL_DIAM - 8) / 2,
    borderWidth: 3,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    backgroundColor: 'rgba(139, 92, 246, 0.04)',
  },
  wheelRingInner: {
    position: 'absolute',
    width: WHEEL_DIAM * 0.44,
    height: WHEEL_DIAM * 0.44,
    borderRadius: WHEEL_DIAM * 0.22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.15)',
  },
  wheelHub: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.soft,
  },
  wheelTile: {
    borderRadius: TILE_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  wheelTileText: {
    fontSize: 20,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  wheelTileTextUsed: { color: Colors.textMuted },
  // ── Controls ─────────────────────────────────────────────────────────
  controls: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
    marginTop: 16,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: Radius.pill,
  },
  resetText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.textMuted,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.vibrantPurple,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: Radius.pill,
    flex: 1,
    justifyContent: 'center',
    ...Shadows.colored('#8B5CF6', 0.35),
  },
  submitText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  btnDisabled: { opacity: 0.4 },
});
