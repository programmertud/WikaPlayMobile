/**
 * Memory Match Mini-Game
 * Category-based: Uses vocabulary from the selected category
 */
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState, useRef } from 'react';
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

import { ItemVisual } from '../../../components/ItemVisual';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { PressableScale } from '../../../components/PressableScale';
import { CelebrationOverlay } from '../../../components/CelebrationOverlay';
import { MysteryBoxModal } from '../../../components/MysteryBoxModal';
import { ProgressIndicator } from '../../../components/ProgressIndicator';
import { getCategoryBySlug, getCategoryVocabulary } from '../../../data/categories';
import { useAuth } from '../../../hooks/use-auth';
import { usePresence } from '../../../hooks/use-presence';
import { useAnswerFeedback } from '../../../hooks/use-answer-feedback';
import { minigameService } from '../../../services/api';
import { playVocabularyItem, useBgmDuck } from '../../../services/audio/sound-service';
import { Colors, Gradients, Shadows, Typography, Radius } from '../../../theme';
import { Collectible, VocabularyItem } from '../../../types';

const { width } = Dimensions.get('window');
const CARD_SIZE = Math.min((width - 56) / 3, 110);

interface CardItem {
  uid: string;
  item: VocabularyItem;
  isFlipped: boolean;
  isMatched: boolean;
}

const PAIRS_PER_ROUND = 5;
const TOTAL_ROUNDS = 4;
const TOTAL_PAIRS = PAIRS_PER_ROUND * TOTAL_ROUNDS; // 20 pairs = 20 stars

function makeCards(items: VocabularyItem[], roundIndex: number): CardItem[] {
  const startIdx = (roundIndex * PAIRS_PER_ROUND) % items.length;
  const selected: VocabularyItem[] = [];
  for (let i = 0; i < PAIRS_PER_ROUND; i++) {
    selected.push(items[(startIdx + i) % items.length]);
  }

  const pairs = selected.flatMap((item, idx) => [
    { uid: `${item.id}-a-${roundIndex}-${idx}`, item, isFlipped: false, isMatched: false },
    { uid: `${item.id}-b-${roundIndex}-${idx}`, item, isFlipped: false, isMatched: false },
  ]);

  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs;
}

export default function MemoryMatch() {
  useBgmDuck();
  const { category: categorySlug } = useLocalSearchParams<{ category?: string }>();
  const category = getCategoryBySlug(categorySlug);
  const vocabulary = getCategoryVocabulary(category.slug);
  const { updateUserStars } = useAuth();

  const [currentRound, setCurrentRound] = useState(0); // 0 to 3
  const [cards, setCards] = useState<CardItem[]>(() => makeCards(vocabulary, 0));
  const [, setFlippedUids] = useState<string[]>([]);
  const [roundMatches, setRoundMatches] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [starsAwarded, setStarsAwarded] = useState(0);
  const [showMysteryBox, setShowMysteryBox] = useState(false);
  const [awardedCollectible, setAwardedCollectible] = useState<Collectible | null>(null);
  const [startTime] = useState(() => Date.now());
  const lockRef = useRef(false);

  // Centralized voice-over streak manager
  const { triggerFeedback, resetStreaks } = useAnswerFeedback();

  usePresence(`Memory Match (${category.name})`, 'minigame_memory_match');

  const submitScore = useCallback(
    async (finalScore: number) => {
      const sessionId = `memory_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      try {
        const duration = Math.round((Date.now() - startTime) / 1000);
        const res = await minigameService.submitResult({
          game_type: 'memory_match',
          score: finalScore,
          duration_seconds: duration,
          session_id: sessionId,
          metadata: { category: category.slug, matches: finalScore, attempts, total: TOTAL_PAIRS },
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
    },
    [startTime, attempts, category.slug, updateUserStars]
  );

  const handleFlip = useCallback(
    (uid: string) => {
      if (lockRef.current) return;

      const target = cards.find((c) => c.uid === uid);
      if (!target || target.isFlipped || target.isMatched) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      setCards((prev) => prev.map((c) => (c.uid === uid ? { ...c, isFlipped: true } : c)));

      setFlippedUids((prevFlipped) => {
        const next = [...prevFlipped, uid];

        if (next.length === 2) {
          lockRef.current = true;
          setAttempts((a) => a + 1);

          const [firstUid, secondUid] = next;
          const firstCard = cards.find((c) => c.uid === firstUid)!;
          const secondCard = cards.find((c) => c.uid === secondUid) || target;

          const isMatch = firstCard.item.id === secondCard.item.id;

          if (isMatch) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            setCards((prev) =>
              prev.map((c) =>
                c.uid === firstUid || c.uid === secondUid
                  ? { ...c, isFlipped: true, isMatched: true }
                  : c
              )
            );
            triggerFeedback(true, () => {
              playVocabularyItem(firstCard.item);
            });

            const nextRoundMatches = roundMatches + 1;
            const nextTotalMatches = totalMatches + 1;
            setRoundMatches(nextRoundMatches);
            setTotalMatches(nextTotalMatches);

            if (nextRoundMatches >= PAIRS_PER_ROUND) {
              // Check if all 4 rounds are finished
              if (currentRound + 1 >= TOTAL_ROUNDS) {
                setTimeout(() => {
                  submitScore(nextTotalMatches);
                }, 800);
              } else {
                // Advance to next round
                setTimeout(() => {
                  const nextR = currentRound + 1;
                  setCurrentRound(nextR);
                  setRoundMatches(0);
                  setCards(makeCards(vocabulary, nextR));
                  setFlippedUids([]);
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
    },
    [cards, currentRound, roundMatches, totalMatches, vocabulary, submitScore, triggerFeedback]
  );

  const handleRestart = () => {
    resetStreaks();
    setCurrentRound(0);
    setCards(makeCards(vocabulary, 0));
    setFlippedUids([]);
    setRoundMatches(0);
    setTotalMatches(0);
    setAttempts(0);
    setGameOver(false);
    setShowMysteryBox(false);
    setAwardedCollectible(null);
    lockRef.current = false;
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={`Memory Match — ${category.name}`}
        bgColor={category.color}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Progress bar across 20 matches */}
        <View style={styles.progressRow}>
          <ProgressIndicator
            current={totalMatches}
            total={TOTAL_PAIRS}
            gradient={Gradients.grass}
            height={10}
          />
        </View>

        {/* Scoreboard Bar with LinearGradient */}
        <View style={[styles.scoreboard, Shadows.soft]}>
          <View style={styles.scorePill}>
            <Ionicons name="sparkles" size={18} color={Colors.grassGreenDark} />
            <Text style={styles.scoreLabel}>Magkapares:</Text>
            <Text style={[styles.scoreValue, { color: Colors.grassGreenDark }]}>
              {totalMatches} / {TOTAL_PAIRS}
            </Text>
          </View>
          <View style={styles.scorePill}>
            <Ionicons name="layers-outline" size={18} color={Colors.coralPink} />
            <Text style={styles.scoreLabel}>Antas:</Text>
            <Text style={[styles.scoreValue, { color: Colors.coralPink }]}>
              {currentRound + 1} / {TOTAL_ROUNDS}
            </Text>
          </View>
          <View style={styles.scorePill}>
            <Ionicons name="repeat" size={18} color={Colors.skyBlueDark} />
            <Text style={styles.scoreLabel}>Tangka:</Text>
            <Text style={[styles.scoreValue, { color: Colors.skyBlueDark }]}>
              {attempts}
            </Text>
          </View>
        </View>

        {/* Card Grid */}
        <View style={styles.grid}>
          {cards.map((card) => {
            const isRevealed = card.isFlipped || card.isMatched;

            return (
              <PressableScale
                key={card.uid}
                onPress={() => handleFlip(card.uid)}
                disabled={card.isMatched || card.isFlipped}
                activeScale={0.94}
                style={[
                  styles.card,
                  isRevealed ? styles.cardFaceUp : styles.cardFaceDown,
                  card.isMatched && styles.cardMatched,
                  Shadows.soft,
                ]}
              >
                {isRevealed ? (
                  <View style={styles.cardContent}>
                    <ItemVisual item={card.item} size={CARD_SIZE - 28} />
                    <Text style={styles.cardWord} numberOfLines={1}>
                      {card.item.filipino}
                    </Text>
                  </View>
                ) : (
                  <LinearGradient
                    colors={Gradients.sky}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardBack}
                  >
                    <Ionicons name="help-circle" size={36} color="rgba(255, 255, 255, 0.85)" />
                    <Text style={styles.cardBackCategory} numberOfLines={1}>
                      {category.name}
                    </Text>
                  </LinearGradient>
                )}
              </PressableScale>
            );
          })}
        </View>
      </ScrollView>

      {/* GAME OVER CELEBRATION OVERLAY */}
      <CelebrationOverlay
        visible={gameOver}
        title="Napakagaling!"
        subtitle={`Nahanap mo ang ${totalMatches} sa ${TOTAL_PAIRS} na magkapares sa ${category.name}!`}
        scoreText={`+${starsAwarded} Bituin! ⭐`}
        stars={totalMatches >= 15 ? 3 : totalMatches >= 10 ? 2 : 1}
        continueText="Maglaro Ulit"
        onContinue={handleRestart}
      />

      {/* MYSTERY BOX REWARD MODAL */}
      <MysteryBoxModal
        visible={showMysteryBox}
        score={totalMatches}
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
    marginBottom: 20,
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE * 1.25,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
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
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
  },
  cardBack: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  cardBackCategory: {
    fontSize: 10,
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
    fontSize: 11,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginTop: 4,
    textAlign: 'center',
  },
});
