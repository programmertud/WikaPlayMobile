/**
 * Memory Match Mini-Game
 * Category-based: Uses vocabulary from the selected category (Hayop, Prutas, Gulay, Kulay, Hugis, Bilang, etc.)
 */
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ItemVisual } from '../../../components/ItemVisual';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { getCategoryBySlug, getCategoryVocabulary } from '../../../data/categories';
import { usePresence } from '../../../hooks/use-presence';
import { minigameService } from '../../../services/api';
import { playLocalSound, playVocabularyItem, useBgmDuck } from '../../../services/audio/sound-service';
import { Colors, Shadows, Typography } from '../../../theme';
import { VocabularyItem } from '../../../types';

const { width } = Dimensions.get('window');
const CARD_SIZE = Math.min((width - 56) / 3, 110);

interface CardItem {
  uid: string;
  item: VocabularyItem;
  isFlipped: boolean;
  isMatched: boolean;
}

function makeCards(items: VocabularyItem[]): CardItem[] {
  // Take 6 items from the selected category for a 12-card (3x4) grid
  const selected = [...items].sort(() => 0.5 - Math.random()).slice(0, 6);
  const pairs = selected.flatMap((item, idx) => [
    { uid: `${item.id}-a-${idx}`, item, isFlipped: false, isMatched: false },
    { uid: `${item.id}-b-${idx}`, item, isFlipped: false, isMatched: false },
  ]);

  // Shuffle
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

  const [cards, setCards] = useState<CardItem[]>(() => makeCards(vocabulary));
  const [flippedUids, setFlippedUids] = useState<string[]>([]);
  const [matches, setMatches] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [starsAwarded, setStarsAwarded] = useState(10);
  const [startTime] = useState(() => Date.now());
  const lockRef = useRef(false);

  usePresence(`Memory Match (${category.name})`, 'minigame_memory_match');

  const submitScore = useCallback(
    async (finalMatches: number) => {
      try {
        const duration = Math.round((Date.now() - startTime) / 1000);
        const score = Math.max(0, 100 - attempts * 5);
        const res = await minigameService.submitResult({
          game_type: 'memory_match',
          score,
          duration_seconds: duration,
          metadata: { category: category.slug, matches: finalMatches, attempts },
        });
        if (res?.session?.stars_awarded) {
          setStarsAwarded(res.session.stars_awarded);
        }
      } catch {
        // offline fallback non-critical
      }
    },
    [startTime, attempts, category.slug]
  );

  const handleFlip = useCallback(
    (uid: string) => {
      if (lockRef.current) return;

      const target = cards.find((c) => c.uid === uid);
      if (!target || target.isFlipped || target.isMatched) return;

      // Flip the clicked card
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
            playVocabularyItem(firstCard.item);
            setCards((prev) =>
              prev.map((c) =>
                c.uid === firstUid || c.uid === secondUid
                  ? { ...c, isFlipped: true, isMatched: true }
                  : c
              )
            );
            setMatches((m) => {
              const newMatches = m + 1;
              if (newMatches >= 6) {
                setTimeout(() => {
                  playLocalSound('magaling');
                  setGameOver(true);
                  submitScore(newMatches);
                }, 600);
              }
              return newMatches;
            });
            lockRef.current = false;
          } else {
            playLocalSound('mali');
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
    [cards, submitScore]
  );

  const handleRestart = () => {
    setCards(makeCards(vocabulary));
    setFlippedUids([]);
    setMatches(0);
    setAttempts(0);
    setGameOver(false);
    lockRef.current = false;
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={`Memory Match — ${category.name}`}
        bgColor={category.color}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Scoreboard Bar */}
        <View style={[styles.scoreboard, Shadows.soft]}>
          <View style={styles.scorePill}>
            <Text style={styles.scoreLabel}>Magkapares:</Text>
            <Text style={[styles.scoreValue, { color: Colors.grassGreen }]}>
              {matches} / 6
            </Text>
          </View>
          <View style={styles.scorePill}>
            <Text style={styles.scoreLabel}>Tangka:</Text>
            <Text style={[styles.scoreValue, { color: Colors.skyBlueDark }]}>
              {attempts}
            </Text>
          </View>
        </View>

        {/* 3-Column Card Grid */}
        <View style={styles.grid}>
          {cards.map((card) => {
            const isRevealed = card.isFlipped || card.isMatched;

            return (
              <TouchableOpacity
                key={card.uid}
                activeOpacity={0.82}
                onPress={() => handleFlip(card.uid)}
                disabled={card.isMatched || card.isFlipped}
                style={[
                  styles.card,
                  isRevealed ? styles.cardFaceUp : styles.cardFaceDown,
                  card.isMatched && styles.cardMatched,
                  Shadows.card,
                ]}
              >
                {isRevealed ? (
                  <View style={styles.cardContent}>
                    <ItemVisual item={card.item} size={CARD_SIZE - 24} />
                    <Text style={styles.cardWord} numberOfLines={1}>
                      {card.item.filipino}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.cardBack}>
                    <Text style={styles.questionMark}>❓</Text>
                    <Text style={styles.cardBackCategory} numberOfLines={1}>
                      {category.name}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* GAME OVER MODAL */}
      {gameOver && (
        <View style={styles.overlay}>
          <View style={[styles.victoryCard, Shadows.card]}>
            <Text style={styles.victoryEmoji}>🏆🎉</Text>
            <Text style={styles.victoryTitle}>Napakagaling!</Text>
            <Text style={styles.victoryDesc}>
              Nahanap mo ang lahat ng magkapares na salita sa {category.name}!
            </Text>

            <View style={styles.starsEarnedRow}>
              <Text style={styles.starBig}>⭐</Text>
              <Text style={styles.starsEarnedText}>+{starsAwarded} Bituin!</Text>
            </View>

            <Text style={styles.statsSummary}>Kabuuang Tangka: {attempts}</Text>

            <View style={styles.modalButtons}>
              <PrimaryButton
                title="Maglaro Ulit 🔄"
                variant="success"
                size="md"
                onPress={handleRestart}
                style={styles.btnAction}
              />
              <PrimaryButton
                title="Bumalik sa Aralin 🏠"
                variant="secondary"
                size="md"
                onPress={() => router.back()}
                style={styles.btnAction}
              />
            </View>
          </View>
        </View>
      )}
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
  scoreboard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    padding: 12,
    marginBottom: 20,
  },
  scorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
  },
  scoreLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '900',
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
    borderRadius: 18,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardFaceDown: {
    backgroundColor: '#0284C7',
  },
  cardFaceUp: {
    backgroundColor: '#FFFFFF',
  },
  cardMatched: {
    borderColor: '#4ADE80',
    backgroundColor: '#F0FDF4',
  },
  cardBack: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  questionMark: {
    fontSize: 32,
    marginBottom: 4,
  },
  cardBackCategory: {
    fontSize: 10,
    fontWeight: '800',
    color: '#BAE6FD',
    textAlign: 'center',
  },
  cardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  cardWord: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 4,
    textAlign: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  victoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  victoryEmoji: {
    fontSize: 56,
    marginBottom: 10,
  },
  victoryTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 6,
  },
  victoryDesc: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  starsEarnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 12,
    gap: 8,
  },
  starBig: {
    fontSize: 28,
  },
  starsEarnedText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#854D0E',
  },
  statsSummary: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 20,
  },
  modalButtons: {
    width: '100%',
    gap: 10,
  },
  btnAction: {
    width: '100%',
  },
});
