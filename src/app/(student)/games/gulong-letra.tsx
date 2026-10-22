/**
 * Gulong ng mga Letra Mini-Game
 * Category-based: Letters of the vocabulary word from the selected category are scrambled;
 * the student taps the letter tiles to form the correct word.
 */
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from '@/utils/haptics';

import { ItemVisual } from '../../../components/ItemVisual';
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
  useBgmDuck,
} from '../../../services/audio/sound-service';
import { Colors, Gradients, Shadows, Typography, Radius } from '../../../theme';
import { Collectible, VocabularyItem } from '../../../types';

interface ShuffleTile {
  id: string;
  letter: string;
  used: boolean;
}

function scrambleWord(word: string): ShuffleTile[] {
  const letters = word.toUpperCase().replace(/[^A-Z]/g, '').split('');
  const tiles: ShuffleTile[] = letters.map((l, i) => ({
    id: `${l}-${i}-${Math.random()}`,
    letter: l,
    used: false,
  }));

  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return tiles;
}

export default function GuLongLetra() {
  useBgmDuck();
  const { updateUserStars } = useAuth();
  const { category: categorySlug } = useLocalSearchParams<{ category?: string }>();
  const category = getCategoryBySlug(categorySlug);
  const items = getCategoryVocabulary(category.slug);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [tiles, setTiles] = useState<ShuffleTile[]>([]);
  const [placedTiles, setPlacedTiles] = useState<ShuffleTile[]>([]);
  const [correct, setCorrect] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [starsAwarded, setStarsAwarded] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [locked, setLocked] = useState(false);

  // Mystery Box & Collectible state
  const [showMysteryBox, setShowMysteryBox] = useState(false);
  const [awardedCollectible, setAwardedCollectible] = useState<Collectible | null>(null);

  // Centralized voice-over streak manager
  const { triggerFeedback, resetStreaks } = useAnswerFeedback();

  // Exactly 20 questions / levels
  const totalRounds = 20;
  const currentItem: VocabularyItem = items[currentIdx % items.length];
  const targetLetters = currentItem.filipino.toUpperCase().replace(/[^A-Z]/g, '');

  usePresence(`Gulong ng mga Letra (${category.name})`, 'minigame_gulong');

  useEffect(() => {
    setTiles(scrambleWord(targetLetters));
    setPlacedTiles([]);
    setFeedback(null);
    setLocked(false);
  }, [currentIdx]);

  const handleTilePress = (tile: ShuffleTile) => {
    if (tile.used || locked) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    setTiles((prev) => prev.map((t) => (t.id === tile.id ? { ...t, used: true } : t)));
    const nextPlaced = [...placedTiles, tile];
    setPlacedTiles(nextPlaced);

    if (nextPlaced.length === targetLetters.length) {
      checkWord(nextPlaced);
    }
  };

  const handleRemovePlaced = (tile: ShuffleTile) => {
    if (locked) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPlacedTiles((prev) => prev.filter((t) => t.id !== tile.id));
    setTiles((prev) => prev.map((t) => (t.id === tile.id ? { ...t, used: false } : t)));
  };

  const checkWord = async (placed: ShuffleTile[]) => {
    setLocked(true);
    const formed = placed.map((t) => t.letter).join('');
    const isCorrect = formed === targetLetters;

    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setFeedback('correct');
      setCorrect((c) => c + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setFeedback('wrong');
    }

    await triggerFeedback(isCorrect, () => {
      const finalCorrect = correct + (isCorrect ? 1 : 0);
      if (currentIdx + 1 >= totalRounds) {
        submitFinalScore(finalCorrect);
      } else {
        setCurrentIdx((i) => i + 1);
      }
    });
  };

  const submitFinalScore = async (finalScore: number) => {
    const sessionId = `gulong_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    try {
      const res = await minigameService.submitResult({
        game_type: 'gulong_letra',
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
    setFeedback(null);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={`Gulong ng Letra — ${category.name}`}
        bgColor={category.color}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Animated Progress Bar */}
        <View style={styles.progressRow}>
          <ProgressIndicator
            current={currentIdx + 1}
            total={totalRounds}
            gradient={Gradients.grass}
            height={10}
          />
        </View>

        {/* Visual Card Clue */}
        <View style={[styles.visualCard, Shadows.card]}>
          <ItemVisual item={currentItem} size={150} />
          <Text style={styles.clueEnglish}>({currentItem.english})</Text>
        </View>

        {/* Target Formed Slots */}
        <View style={styles.slotsRow}>
          {Array.from({ length: targetLetters.length }).map((_, i) => {
            const placed = placedTiles[i];
            const isFilled = !!placed;

            let borderCol: string = 'rgba(0, 0, 0, 0.08)';
            let bgCol: string = Colors.white;

            if (feedback === 'correct') {
              borderCol = Colors.grassGreen;
              bgCol = '#F0FDF4';
            } else if (feedback === 'wrong') {
              borderCol = Colors.coralPink;
              bgCol = '#FFF1F2';
            }


            return (
              <PressableScale
                key={i}
                disabled={!isFilled || locked}
                onPress={() => placed && handleRemovePlaced(placed)}
                activeScale={0.92}
                style={[
                  styles.slot,
                  { borderColor: borderCol, backgroundColor: bgCol },
                  isFilled && Shadows.soft,
                ]}
              >
                <Text style={styles.slotText}>{placed ? placed.letter : ''}</Text>
              </PressableScale>
            );
          })}
        </View>

        {/* Scrambled Available Letter Pool */}
        <View style={styles.tilesPool}>
          <Text style={styles.poolTitle}>Pindutin ang mga letra upang buuin:</Text>
          <View style={styles.tilesRow}>
            {tiles.map((tile) => (
              <PressableScale
                key={tile.id}
                disabled={tile.used || locked}
                onPress={() => handleTilePress(tile)}
                activeScale={0.9}
                style={[
                  styles.tile,
                  tile.used && styles.tileUsed,
                  !tile.used && Shadows.soft,
                ]}
              >
                <Text style={[styles.tileText, tile.used && styles.tileTextUsed]}>
                  {tile.letter}
                </Text>
              </PressableScale>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* WIN CELEBRATION OVERLAY */}
      <CelebrationOverlay
        visible={gameOver}
        title="Napakahusay!"
        subtitle={`Nabuong muli ang ${correct} sa ${totalRounds} mga salita!`}
        scoreText={`+${starsAwarded} Bituin! ⭐`}
        stars={3}
        continueText="Maglaro Ulit"
        onContinue={handleRestart}
      />

      {/* MYSTERY BOX COLLECTIBLE MODAL (Score 15-20/20) */}
      <MysteryBoxModal
        visible={showMysteryBox}
        score={correct}
        totalQuestions={totalRounds}
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
    marginBottom: 16,
  },
  visualCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 20,
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  clueEnglish: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    fontWeight: Typography.weights.semibold,
    marginTop: 8,
  },
  slotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
    width: '100%',
  },
  slot: {
    width: 44,
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotText: {
    fontSize: 24,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  tilesPool: {
    width: '100%',
    alignItems: 'center',
  },
  poolTitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    fontWeight: Typography.weights.semibold,
    marginBottom: 12,
  },
  tilesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  tile: {
    width: 50,
    height: 50,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileUsed: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    opacity: 0.35,
  },
  tileText: {
    fontSize: 22,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  tileTextUsed: {
    color: Colors.textMuted,
  },
});
