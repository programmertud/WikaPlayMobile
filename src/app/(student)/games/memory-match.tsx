/**
 * Memory Match Mini-Game
 * Students flip face-down cards to find matching pairs.
 * Content is loaded from the backend (published flashcard images).
 */
import { router } from 'expo-router';
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
import { LoadingView } from '../../../components/LoadingView';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { usePresence } from '../../../hooks/use-presence';
import { minigameService } from '../../../services/api';
import { Colors, Shadows, Typography } from '../../../theme';
import type { Flashcard } from '../../../types';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 64) / 4;

interface CardItem {
  uid: string;      // unique per card on grid
  flashcardId: number;
  imageEmoji: string;
  name: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const EMOJI_FALLBACKS = ['🐶','🐱','🐮','🐷','🐔','🐭','🦊','🐻','🐼','🐨','🦁','🐯'];

function makeCards(flashcards: Flashcard[]): CardItem[] {
  const pairs = flashcards.slice(0, 6).map((fc, i) => ({
    flashcardId: fc.id,
    imageEmoji: EMOJI_FALLBACKS[i % EMOJI_FALLBACKS.length],
    name: fc.filipino_name || fc.name,
  }));

  const doubled = [...pairs, ...pairs].map((item, idx) => ({
    ...item,
    uid: `${item.flashcardId}-${idx}`,
    isFlipped: false,
    isMatched: false,
  }));

  // Shuffle
  for (let i = doubled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [doubled[i], doubled[j]] = [doubled[j], doubled[i]];
  }
  return doubled;
}

export default function MemoryMatch() {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matches, setMatches] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [starsAwarded, setStarsAwarded] = useState(0);
  const [startTime] = useState(() => Date.now());
  const lockRef = useRef(false);

  usePresence('Naglalaro ng Memory Match', 'minigame_memory_match');

  useEffect(() => {
    minigameService.getContent('memory_match')
      .then((res) => {
        setCards(makeCards(res.items));
      })
      .catch(() => {
        // Fallback cards
        const fakes = Array.from({ length: 6 }, (_, i) => ({
          id: i + 1, category_id: 1, name: EMOJI_FALLBACKS[i],
          filipino_name: EMOJI_FALLBACKS[i], image_url: '', audio_url: null,
          is_published: true, sort_order: i,
        } as Flashcard));
        setCards(makeCards(fakes));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleFlip = useCallback((uid: string) => {
    if (lockRef.current) return;

    setCards((prev) => {
      const card = prev.find((c) => c.uid === uid);
      if (!card || card.isFlipped || card.isMatched) return prev;
      return prev.map((c) => c.uid === uid ? { ...c, isFlipped: true } : c);
    });

    setFlipped((prev) => {
      const next = [...prev, uid];

      if (next.length === 2) {
        lockRef.current = true;
        setAttempts((a) => a + 1);

        setCards((prevCards) => {
          const [a, b] = next.map((id) => prevCards.find((c) => c.uid === id)!);
          const isMatch = a.flashcardId === b.flashcardId;

          if (isMatch) {
            const updated = prevCards.map((c) =>
              c.uid === a.uid || c.uid === b.uid ? { ...c, isMatched: true } : c
            );
            const newMatches = updated.filter((c) => c.isMatched).length / 2;
            setMatches(newMatches);
            if (newMatches === updated.length / 2) setGameOver(true);
            lockRef.current = false;
            return updated;
          } else {
            setTimeout(() => {
              setCards((c) =>
                c.map((card) =>
                  card.uid === a.uid || card.uid === b.uid
                    ? { ...card, isFlipped: false }
                    : card
                )
              );
              lockRef.current = false;
            }, 1000);
            return prevCards;
          }
        });

        return [];
      }
      return next;
    });
  }, []);

  const handleSubmitResult = async () => {
    setSubmitting(true);
    try {
      const duration = Math.round((Date.now() - startTime) / 1000);
      const scorePercent = Math.max(0, 100 - attempts * 5);
      const res = await minigameService.submitResult({
        game_type: 'memory_match',
        score: scorePercent,
        duration_seconds: duration,
        metadata: { matches, attempts },
      });
      setStarsAwarded(res.session.stars_awarded);
    } catch {
      // non-critical
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (gameOver) handleSubmitResult();
  }, [gameOver]);

  if (loading) return <LoadingView message="Inihahanda ang Memory Match..." />;

  if (gameOver) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Memory Match" bgColor="#8B5CF6" />
        <View style={styles.result}>
          <Text style={styles.resultEmoji}>🎉</Text>
          <Text style={styles.resultTitle}>Natapos!</Text>
          <Text style={styles.resultSub}>
            {matches} pares sa {attempts} pagsubok!
          </Text>
          {starsAwarded > 0 && (
            <View style={[styles.starsPill, Shadows.button]}>
              <Text style={styles.starsText}>+ {starsAwarded} Bituin! ⭐</Text>
            </View>
          )}
          <PrimaryButton title="Maglaro Ulit" variant="primary" size="lg" onPress={() => {
            setGameOver(false); setMatches(0); setAttempts(0); setFlipped([]);
            setCards(makeCards(cards.slice(0, cards.length / 2).map((c, i) => ({
              id: c.flashcardId, category_id: 1, name: c.name, filipino_name: c.name,
              image_url: '', audio_url: null, is_published: true, sort_order: i,
            } as Flashcard))));
          }} style={{ width: '100%', marginTop: 16 }} />
          <PrimaryButton title="Bumalik" variant="outline" size="md" onPress={() => router.back()} style={{ width: '100%', marginTop: 8 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Memory Match" subtitle={`Pares: ${matches} | Pagsubok: ${attempts}`} bgColor="#8B5CF6" />
      <ScrollView contentContainerStyle={styles.board}>
        <View style={styles.grid}>
          {cards.map((card) => (
            <TouchableOpacity
              key={card.uid}
              activeOpacity={0.85}
              onPress={() => handleFlip(card.uid)}
              disabled={card.isFlipped || card.isMatched}
              style={[
                styles.card,
                card.isMatched && styles.cardMatched,
                Shadows.soft,
              ]}
            >
              {card.isFlipped || card.isMatched ? (
                <Text style={styles.cardEmoji}>{card.imageEmoji}</Text>
              ) : (
                <Text style={styles.cardBack}>?</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF' },
  board: { padding: 20, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10 },
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    borderWidth: 3,
    borderColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardMatched: { backgroundColor: '#10B981', opacity: 0.7 },
  cardEmoji: { fontSize: 28 },
  cardBack: {
    fontSize: 28,
    fontWeight: Typography.weights.heavy,
    color: Colors.white,
  },
  result: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  resultEmoji: { fontSize: 72, marginBottom: 12 },
  resultTitle: {
    fontSize: Typography.sizes.hero,
    fontWeight: Typography.weights.heavy,
    color: Colors.text,
    marginBottom: 8,
  },
  resultSub: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    marginBottom: 16,
  },
  starsPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#F59E0B',
    marginBottom: 8,
  },
  starsText: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.heavy,
    color: '#B45309',
  },
});
