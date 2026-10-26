/**
 * Hulaan ang Salita Mini-Game — Improved
 *
 * Improvements:
 * - Each letter tile has a stable unique ID so repeated letters are tracked independently
 * - Tapping a placed slot removes just that tile back to the pool (not the whole word)
 * - Auto-submit when all slots are filled
 * - Manual "Suriin" button also works
 * - Reset clears all placements
 * - Correct answer shown on wrong guess
 */
import { useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
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

interface LetterTile {
  id: string;      // unique per tile (letter + index)
  char: string;
  used: boolean;   // placed in a slot
}

function buildTiles(word: string): LetterTile[] {
  const clean = word.toUpperCase().replace(/[^A-Z]/g, '');
  const wordLetters = clean.split('');

  // Shuffle until it's not identical to the expected word (if word length > 1)
  let shuffled = [...wordLetters];
  if (shuffled.length > 1) {
    let attempts = 0;
    while (shuffled.join('') === clean && attempts < 10) {
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      attempts++;
    }
    // If still identical after 10 tries, swap first two letters
    if (shuffled.join('') === clean) {
      [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
    }
  }

  return shuffled.map((char, idx) => ({
    id: `${char}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    char,
    used: false,
  }));
}

function shuffleItems<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export default function HulaanSalita() {
  useBgmDuck();
  const { user, updateUserStars } = useAuth();
  const { category: categorySlug } = useLocalSearchParams<{ category?: string }>();
  const category = getCategoryBySlug(categorySlug);
  const rawItems = getCategoryVocabulary(category.slug);
  const [items, setItems] = useState<VocabularyItem[]>(() => shuffleItems(rawItems));

  // Stable session ID — regenerated only on restart
  const sessionIdRef = useRef<string>(generateSessionId('hulaan'));

  const [currentIdx, setCurrentIdx] = useState(0);
  const [correct, setCorrect] = useState(0);

  React.useEffect(() => {
    return () => {
      stopCurrentSound();
    };
  }, []);
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

  // Tile pool + placed slots (null = empty)
  const [tiles, setTiles] = useState<LetterTile[]>(() => buildTiles(targetWord));
  const [slots, setSlots] = useState<(LetterTile | null)[]>(() => new Array(targetWord.length).fill(null));

  usePresence(`Hulaan ang Salita (${category.name})`, 'minigame_hulaan');

  // Reset for a new question
  const resetForQuestion = (idx: number, activeItems: VocabularyItem[] = items) => {
    const item = activeItems[idx % activeItems.length];
    const word = item.filipino.toUpperCase().replace(/[^A-Z]/g, '');
    setTiles(buildTiles(word));
    setSlots(new Array(word.length).fill(null));
    setFeedbackStatus(null);
    setLocked(false);
  };

  // Place a tile into the first empty slot
  const handleTilePress = (tile: LetterTile) => {
    if (locked || tile.used) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    setTiles((prev) => prev.map((t) => t.id === tile.id ? { ...t, used: true } : t));
    setSlots((prev) => {
      const next = [...prev];
      const emptyIdx = next.findIndex((s) => s === null);
      if (emptyIdx === -1) return prev;
      next[emptyIdx] = tile;
      // Auto-submit when last slot is filled
      const filled = next.filter(Boolean).length;
      if (filled === targetWord.length) {
        setTimeout(() => verifyAnswer(next as LetterTile[]), 100);
      }
      return next;
    });
  };

  // Remove tile from a slot (tap slot to return it)
  const handleSlotPress = (slotIdx: number) => {
    if (locked) return;
    const tile = slots[slotIdx];
    if (!tile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSlots((prev) => {
      const next = [...prev];
      next[slotIdx] = null;
      return next;
    });
    setTiles((prev) => prev.map((t) => t.id === tile.id ? { ...t, used: false } : t));
  };

  const handleReset = () => {
    if (locked) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setTiles((prev) => prev.map((t) => ({ ...t, used: false })));
    setSlots(new Array(targetWord.length).fill(null));
  };

  const verifyAnswer = async (filledSlots: LetterTile[]) => {
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
    const filled = slots.filter(Boolean) as LetterTile[];
    if (filled.length < targetWord.length) return;
    verifyAnswer(slots as LetterTile[]);
  };

  const submitFinalScore = async (finalScore: number) => {
    try {
      const res = await submitMinigameReward({
        gameType: 'hulaan_salita',
        score: finalScore,
        sessionId: sessionIdRef.current,
        metadata: { category: category.slug, correct: finalScore, total: TOTAL_ROUNDS },
        currentStarsBalance: user?.stars_balance ?? 0,
        updateUserStars,
        studentId: user?.id,
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
    sessionIdRef.current = generateSessionId('hulaan');
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
        title={`Hulaan — ${category.name}`}
        bgColor={category.color}
        logoImage={require('../../../../assets/images/minigames/cover-hulaan-salita.jpg')}
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
          <ItemVisual item={currentItem} size={140} />
          <Text style={styles.englishHint}>{currentItem.english}</Text>
          <View style={styles.instructionBadge}>
            <Ionicons name="bulb" size={14} color={Colors.sunYellowDark} />
            <Text style={styles.instructionText}>Ano ang pangalan nito?</Text>
          </View>
        </View>

        {/* Answer slots — tap to return a tile */}
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
                onPress={() => handleSlotPress(i)}
                activeScale={0.9}
                style={[styles.slot, { borderColor, backgroundColor: bgColor }, slot && Shadows.subtle]}
              >
                <Text style={styles.slotText}>{slot?.char ?? ''}</Text>
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

        {/* Letter tile pool */}
        <View style={styles.tilePool}>
          <Text style={styles.tilePoolLabel}>MGA LETRA</Text>
          <View style={styles.tilesRow}>
            {tiles.map((tile) => (
              <PressableScale
                key={tile.id}
                disabled={locked || tile.used}
                onPress={() => handleTilePress(tile)}
                activeScale={0.88}
                style={[
                  styles.tileBtn,
                  tile.used && styles.tileBtnUsed,
                  !tile.used && Shadows.soft,
                ]}
              >
                <Text style={[styles.tileText, tile.used && styles.tileTextUsed]}>
                  {tile.char}
                </Text>
              </PressableScale>
            ))}
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <PressableScale
            disabled={locked || slots.every((s) => s === null)}
            onPress={handleReset}
            style={[styles.resetBtn, slots.every((s) => s === null) && styles.btnDisabled]}
          >
            <Ionicons name="refresh" size={18} color={Colors.textMuted} />
            <Text style={styles.resetText}>I-reset</Text>
          </PressableScale>

          <PressableScale
            disabled={locked || !allFilled}
            onPress={handleSubmit}
            style={[styles.submitBtn, (!allFilled || locked) && styles.btnDisabled]}
          >
            <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
            <Text style={styles.submitText}>Suriin</Text>
          </PressableScale>
        </View>
      </ScrollView>

      <CelebrationOverlay
        visible={gameOver}
        subtitle={`Nabuo mo ang ${correct} sa ${TOTAL_ROUNDS} mga salita!`}
        scoreText={`+${starsAwarded} Bituin! ⭐`}
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
    padding: 20,
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
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
    backgroundColor: '#FEF9C3',
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FDE047',
  },
  instructionText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: '#92400E',
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
    width: 48,
    height: 56,
    borderRadius: Radius.md,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  slotText: {
    fontSize: 22,
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
    marginBottom: 12,
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
  tilePool: { width: '100%', alignItems: 'center', marginBottom: 16 },
  tilePoolLabel: {
    fontSize: 10,
    fontWeight: Typography.weights.bold,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: 10,
  },
  tilesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  tileBtn: {
    width: 50,
    height: 50,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileBtnUsed: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    opacity: 0.35,
  },
  tileText: {
    fontSize: 20,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  tileTextUsed: { color: Colors.textMuted },
  controls: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
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
    backgroundColor: Colors.grassGreen,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: Radius.pill,
    flex: 1,
    justifyContent: 'center',
    ...Shadows.colored(Colors.grassGreen, 0.3),
  },
  submitText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  btnDisabled: { opacity: 0.4 },
});
