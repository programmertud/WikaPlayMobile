/**
 * Memory Match Mini-Game — 20-Level Progression
 *
 * Level progression (pairCount = Math.floor((level - 1) / 5) + 2):
 *   Levels  1–5  → 2 pairs / 4 cards
 *   Levels  6–10 → 3 pairs / 6 cards
 *   Levels 11–15 → 4 pairs / 8 cards
 *   Levels 16–20 → 5 pairs / 10 cards
 *
 * Each level starts with a 5-second face-up preview. Cards are locked
 * during the preview. After the preview, cards flip face-down and play begins.
 */
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/utils/haptics';

import { AnimatedBackground } from '../../../components/AnimatedBackground';
import { ItemVisual } from '../../../components/ItemVisual';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { PressableScale } from '../../../components/PressableScale';
import { CelebrationOverlay } from '../../../components/CelebrationOverlay';
import { CorrectAnswerConfetti } from '../../../components/CorrectAnswerConfetti';
import { MysteryBoxModal } from '../../../components/MysteryBoxModal';
import { ProgressIndicator } from '../../../components/ProgressIndicator';
import { getCategoryBySlug, getCategoryVocabulary } from '../../../data/categories';
import { useAuth } from '../../../hooks/use-auth';
import { usePresence } from '../../../hooks/use-presence';
import { useAnswerFeedback } from '../../../hooks/use-answer-feedback';
import { generateSessionId, submitMinigameReward } from '../../../services/rewards/star-reward-service';
import { stopCurrentSound, useBgmDuck } from '../../../services/audio/sound-service';
import { Colors, Gradients, Shadows, Typography, Radius } from '../../../theme';
import { Collectible, VocabularyItem } from '../../../types';

const { width } = Dimensions.get('window');

const TOTAL_LEVELS = 20;
const PREVIEW_SECONDS = 5;

/** Returns pair count for a given level (1-indexed) */
function pairsForLevel(level: number): number {
  return Math.floor((level - 1) / 5) + 2; // 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, ...
}

interface MemoryCard {
  uid: string;
  pairId: string;  // item.id — shared by both cards of a pair
  item: VocabularyItem;
  isFlipped: boolean;
  isMatched: boolean;
}

function makeCards(items: VocabularyItem[], level: number): MemoryCard[] {
  const numPairs = pairsForLevel(level);
  // Shuffle available items so pairs are randomly picked every level & game
  const shuffledItems = [...items].sort(() => 0.5 - Math.random());
  const selected: VocabularyItem[] = [];
  for (let i = 0; i < numPairs; i++) {
    selected.push(shuffledItems[i % shuffledItems.length]);
  }

  const cards: MemoryCard[] = selected.flatMap((item, idx) => [
    { uid: `${item.id}-a-${level}-${idx}`, pairId: item.id, item, isFlipped: true, isMatched: false },
    { uid: `${item.id}-b-${level}-${idx}`, pairId: item.id, item, isFlipped: true, isMatched: false },
  ]);

  // Fisher-Yates shuffle
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

/** Dynamic card size based on max pairs in current game */
function cardSizeForPairs(numPairs: number): number {
  const cols = numPairs <= 3 ? 2 : 3;
  return Math.min((width - 56) / cols - 4, 108);
}

export default function MemoryMatch() {
  useBgmDuck();
  const { category: categorySlug } = useLocalSearchParams<{ category?: string }>();
  const category = getCategoryBySlug(categorySlug);
  const vocabulary = getCategoryVocabulary(category.slug);
  const { user, updateUserStars } = useAuth();

  // Stable session ID — regenerated only on restart
  const sessionIdRef = useRef<string>(generateSessionId('memory'));

  // ── Level / round state ──────────────────────────────────────────────
  const [level, setLevel] = useState(1);
  const [cards, setCards] = useState<MemoryCard[]>(() => makeCards(vocabulary, 1));
  const [, setFlippedUids] = useState<string[]>([]);
  const [levelMatches, setLevelMatches] = useState(0); // matches in current level
  const [, setTotalMatches] = useState(0); // across all levels
  const [moves, setMoves] = useState(0);
  const [levelsDone, setLevelsDone] = useState(0); // completed levels (for final score)

  // ── Preview state ────────────────────────────────────────────────────
  const [isPreview, setIsPreview] = useState(true);
  const [previewCountdown, setPreviewCountdown] = useState(PREVIEW_SECONDS);

  // ── Endgame state ────────────────────────────────────────────────────
  const [gameOver, setGameOver] = useState(false);
  const [starsAwarded, setStarsAwarded] = useState(0);
  const [showMysteryBox, setShowMysteryBox] = useState(false);
  const [awardedCollectible, setAwardedCollectible] = useState<Collectible | null>(null);
  const [startTime] = useState(() => Date.now());

  // ── Refs ─────────────────────────────────────────────────────────────
  const lockRef = useRef(false);
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { triggerFeedback, resetStreaks, confettiTrigger } = useAnswerFeedback();
  usePresence(`Memory Match L${level} (${category.name})`, 'minigame_memory_match');

  useEffect(() => {
    return () => {
      stopCurrentSound();
    };
  }, []);

  // ── Preview countdown ────────────────────────────────────────────────
  const startPreview = useCallback((lvl: number, vocab: VocabularyItem[]) => {
    // Clear any stale timers
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    const newCards = makeCards(vocab, lvl);
    setCards(newCards);
    setFlippedUids([]);
    setLevelMatches(0);
    setPreviewCountdown(PREVIEW_SECONDS);
    setIsPreview(true);
    lockRef.current = true;

    // Countdown every second
    let remaining = PREVIEW_SECONDS;
    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1;
      setPreviewCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(countdownIntervalRef.current!);
        countdownIntervalRef.current = null;
      }
    }, 1000);

    // After PREVIEW_SECONDS, flip all cards face-down and enable play
    previewTimerRef.current = setTimeout(() => {
      setCards((prev) => prev.map((c) => ({ ...c, isFlipped: false })));
      setIsPreview(false);
      lockRef.current = false;
      previewTimerRef.current = null;
    }, PREVIEW_SECONDS * 1000);
  }, []);

  // Cleanup timers on unmount / screen leave
  useEffect(() => {
    startPreview(1, vocabulary);
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Score submission ─────────────────────────────────────────────────
  const submitScore = useCallback(async (finalScore: number) => {
    try {
      const duration = Math.round((Date.now() - startTime) / 1000);
      const res = await submitMinigameReward({
        gameType: 'memory_match',
        score: finalScore,
        sessionId: sessionIdRef.current,
        durationSeconds: duration,
        metadata: { category: category.slug, levels_completed: finalScore, total_levels: TOTAL_LEVELS },
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
  }, [startTime, category.slug, user, updateUserStars]);

  // ── Card flip handler ────────────────────────────────────────────────
  const handleFlip = useCallback((uid: string) => {
    if (lockRef.current || isPreview) return;

    setCards((prevCards) => {
      const target = prevCards.find((c) => c.uid === uid);
      if (!target || target.isFlipped || target.isMatched) return prevCards;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      const nowFlipped = prevCards.map((c) => c.uid === uid ? { ...c, isFlipped: true } : c);

      setFlippedUids((prevFlipped) => {
        const next = [...prevFlipped, uid];

        if (next.length === 2) {
          lockRef.current = true;
          setMoves((m) => m + 1);

          const [firstUid, secondUid] = next;
          const firstCard = nowFlipped.find((c) => c.uid === firstUid)!;
          const secondCard = nowFlipped.find((c) => c.uid === secondUid)!;
          const isMatch = firstCard.pairId === secondCard.pairId;

          if (isMatch) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            // Mark matched immediately
            setCards((prev) =>
              prev.map((c) =>
                c.uid === firstUid || c.uid === secondUid
                  ? { ...c, isFlipped: true, isMatched: true }
                  : c
              )
            );

            // Only play feedback audio (tama.mp3, magaling.mp3, etc.), no word audio
            triggerFeedback(true);

            const nextLevelMatches = levelMatches + 1;
            const numPairs = pairsForLevel(level);
            setLevelMatches(nextLevelMatches);
            setTotalMatches((t) => t + 1);

            if (nextLevelMatches >= numPairs) {
              // Level complete
              const nextLevelsDone = levelsDone + 1;
              setLevelsDone(nextLevelsDone);

              if (level >= TOTAL_LEVELS) {
                setTimeout(() => submitScore(nextLevelsDone), 800);
              } else {
                const nextLevel = level + 1;
                setTimeout(() => {
                  setLevel(nextLevel);
                  startPreview(nextLevel, vocabulary);
                  lockRef.current = false;
                }, 900);
              }
            } else {
              lockRef.current = false;
            }
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
            triggerFeedback(false);
            setTimeout(() => {
              setCards((prev) =>
                prev.map((c) =>
                  c.uid === firstUid || c.uid === secondUid
                    ? { ...c, isFlipped: false }
                    : c
                )
              );
              lockRef.current = false;
            }, 900);
          }

          return [];
        }

        return next;
      });

      return nowFlipped;
    });
  }, [isPreview, level, levelMatches, levelsDone, vocabulary, submitScore, triggerFeedback, startPreview]);

  // ── Restart ──────────────────────────────────────────────────────────
  const handleRestart = () => {
    sessionIdRef.current = generateSessionId('memory');
    resetStreaks();
    setLevel(1);
    setLevelMatches(0);
    setTotalMatches(0);
    setLevelsDone(0);
    setMoves(0);
    setFlippedUids([]);
    setGameOver(false);
    setShowMysteryBox(false);
    setAwardedCollectible(null);
    lockRef.current = false;
    startPreview(1, vocabulary);
  };

  // ── Derived ──────────────────────────────────────────────────────────
  const numPairs = pairsForLevel(level);
  const CARD_SIZE = cardSizeForPairs(numPairs);

  return (
    <AnimatedBackground>
      <CorrectAnswerConfetti trigger={confettiTrigger} />
      <ScreenHeader
        title={`Memory Match — ${category.name}`}
        bgColor={category.color}
        logoImage={require('../../../../assets/images/minigames/cover-memory-match.jpg')}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Overall progress across all 20 levels */}
        <View style={styles.progressRow}>
          <ProgressIndicator
            current={levelsDone}
            total={TOTAL_LEVELS}
            gradient={Gradients.grass}
            height={10}
          />
        </View>

        {/* Info bar */}
        <View style={[styles.scoreboard, Shadows.soft]}>
          <View style={styles.scorePill}>
            <Ionicons name="layers-outline" size={16} color={Colors.vibrantPurple} />
            <Text style={styles.scoreLabel}>Antas:</Text>
            <Text style={[styles.scoreValue, { color: Colors.vibrantPurple }]}>
              {level}/{TOTAL_LEVELS}
            </Text>
          </View>
          <View style={styles.scorePill}>
            <Ionicons name="sparkles" size={16} color={Colors.grassGreenDark} />
            <Text style={styles.scoreLabel}>Pares:</Text>
            <Text style={[styles.scoreValue, { color: Colors.grassGreenDark }]}>
              {levelMatches}/{numPairs}
            </Text>
          </View>
          <View style={styles.scorePill}>
            <Ionicons name="repeat" size={16} color={Colors.skyBlueDark} />
            <Text style={styles.scoreLabel}>Tangka:</Text>
            <Text style={[styles.scoreValue, { color: Colors.skyBlueDark }]}>{moves}</Text>
          </View>
        </View>

        {/* Preview countdown banner */}
        {isPreview && (
          <View style={[styles.previewBanner, Shadows.soft]}>
            <Ionicons name="eye" size={20} color={Colors.sunYellowDark} />
            <Text style={styles.previewText}>
              Tingnan ang mga kard! Magsisimula sa{' '}
              <Text style={styles.previewCountdown}>{previewCountdown}</Text>s
            </Text>
          </View>
        )}

        {/* Card Grid */}
        <View style={styles.grid}>
          {cards.map((card) => {
            const isRevealed = card.isFlipped || card.isMatched;

            return (
              <PressableScale
                key={card.uid}
                onPress={() => handleFlip(card.uid)}
                disabled={isPreview || card.isMatched || card.isFlipped}
                activeScale={0.94}
                style={[
                  styles.card,
                  { width: CARD_SIZE, height: CARD_SIZE * 1.25 },
                  isRevealed ? styles.cardFaceUp : styles.cardFaceDown,
                  card.isMatched && styles.cardMatched,
                  Shadows.soft,
                ]}
              >
                {isRevealed ? (
                  <View style={styles.cardContent}>
                    <ItemVisual item={card.item} size={CARD_SIZE - 30} />
                    <Text style={styles.cardWord} numberOfLines={1}>
                      {card.item.filipino}
                    </Text>
                  </View>
                ) : (
                  <LinearGradient
                    colors={Gradients.sky}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  >
                    <View style={styles.cardBackContent}>
                      <Ionicons name="help-circle" size={36} color="rgba(255, 255, 255, 0.85)" />
                      <Text style={styles.cardBackLabel} numberOfLines={1}>
                        {category.name}
                      </Text>
                    </View>
                  </LinearGradient>
                )}
              </PressableScale>
            );
          })}
        </View>

        {/* Pair legend */}
        <View style={styles.pairLegend}>
          <Text style={styles.pairLegendText}>
            {numPairs} pares • {numPairs * 2} kard sa antas na ito
          </Text>
        </View>
      </ScrollView>

      {/* Game Over Celebration */}
      <CelebrationOverlay
        visible={gameOver}
        title="Napakagaling!"
        subtitle={`Natapos mo ang ${levelsDone} sa ${TOTAL_LEVELS} na antas ng Memory Match!`}
        scoreText={`+${starsAwarded} Bituin! ⭐`}
        stars={levelsDone >= 15 ? 3 : levelsDone >= 10 ? 2 : 1}
        score={levelsDone}
        showFireworks={levelsDone >= 15 && levelsDone <= 20}
        continueText="Maglaro Ulit"
        onContinue={handleRestart}
      />

      <MysteryBoxModal
        visible={showMysteryBox}
        score={levelsDone}
        totalQuestions={TOTAL_LEVELS}
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
    padding: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  progressRow: {
    width: '100%',
    marginBottom: 12,
  },
  scoreboard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 12,
    marginBottom: 12,
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 6,
  },
  scoreLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.textLight,
  },
  scoreValue: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE047',
    borderRadius: Radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
    width: '100%',
  },
  previewText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: '#92400E',
    flex: 1,
  },
  previewCountdown: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.coralPink,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  card: {
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  cardFaceDown: {
    borderColor: 'transparent',
  },
  cardFaceUp: {
    backgroundColor: Colors.white,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  cardMatched: {
    borderColor: Colors.grassGreen,
    borderWidth: 2.5,
    backgroundColor: '#F0FDF4',
  },
  cardBackContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  cardBackLabel: {
    fontSize: 9,
    fontWeight: Typography.weights.bold,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginTop: 2,
  },
  cardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  cardWord: {
    fontSize: 10,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginTop: 3,
    textAlign: 'center',
  },
  pairLegend: {
    marginTop: 16,
    alignItems: 'center',
  },
  pairLegendText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    fontWeight: Typography.weights.medium,
  },
});
