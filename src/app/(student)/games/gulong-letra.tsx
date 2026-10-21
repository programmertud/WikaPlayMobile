/**
 * Gulong ng mga Letra Mini-Game
 * Category-based: Letters of the vocabulary word from the selected category are scrambled;
 * the student taps the letter tiles to form the correct word.
 */
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ItemVisual } from '../../../components/ItemVisual';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ProgressIndicator } from '../../../components/ProgressIndicator';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { getCategoryBySlug, getCategoryVocabulary } from '../../../data/categories';
import { usePresence } from '../../../hooks/use-presence';
import { minigameService } from '../../../services/api';
import {
  getFeedbackAudio,
  playLocalSound,
  playVocabularyItem,
  useBgmDuck,
} from '../../../services/audio/sound-service';
import { Colors, Shadows, Typography } from '../../../theme';
import { VocabularyItem } from '../../../types';

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

  // Shuffle until different from original if length > 1
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return tiles;
}

export default function GuLongLetra() {
  useBgmDuck();
  const { category: categorySlug } = useLocalSearchParams<{ category?: string }>();
  const category = getCategoryBySlug(categorySlug);
  const items = getCategoryVocabulary(category.slug);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [tiles, setTiles] = useState<ShuffleTile[]>([]);
  const [placedTiles, setPlacedTiles] = useState<ShuffleTile[]>([]);
  const [correct, setCorrect] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [starsAwarded, setStarsAwarded] = useState(10);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [wrongStreak, setWrongStreak] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [locked, setLocked] = useState(false);

  const totalRounds = Math.min(items.length, 8);
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

    // Mark tile as used
    setTiles((prev) => prev.map((t) => (t.id === tile.id ? { ...t, used: true } : t)));
    const nextPlaced = [...placedTiles, tile];
    setPlacedTiles(nextPlaced);

    // If all tiles placed, check word
    if (nextPlaced.length === targetLetters.length) {
      checkWord(nextPlaced);
    }
  };

  const handleRemovePlaced = (tile: ShuffleTile) => {
    if (locked) return;
    setPlacedTiles((prev) => prev.filter((t) => t.id !== tile.id));
    setTiles((prev) => prev.map((t) => (t.id === tile.id ? { ...t, used: false } : t)));
  };

  const handleResetTiles = () => {
    if (locked) return;
    setTiles(scrambleWord(targetLetters));
    setPlacedTiles([]);
  };

  const checkWord = (currentPlaced: ShuffleTile[]) => {
    setLocked(true);
    const formed = currentPlaced.map((t) => t.letter).join('');
    const isCorrect = formed === targetLetters;

    if (isCorrect) {
      setFeedback('correct');
      const newStreak = correctStreak + 1;
      setCorrectStreak(newStreak);
      setWrongStreak(0);
      setCorrect((c) => c + 1);
      playVocabularyItem(currentItem);
    } else {
      setFeedback('wrong');
      const newStreak = wrongStreak + 1;
      setWrongStreak(newStreak);
      setCorrectStreak(0);
      const soundKey = getFeedbackAudio(false, newStreak);
      playLocalSound(soundKey);
    }

    setTimeout(() => {
      if (currentIdx + 1 >= totalRounds) {
        setGameOver(true);
        submitFinalScore(correct + (isCorrect ? 1 : 0));
      } else {
        setCurrentIdx((i) => i + 1);
      }
    }, 1300);
  };

  const submitFinalScore = async (finalScore: number) => {
    try {
      const percent = Math.round((finalScore / totalRounds) * 100);
      const res = await minigameService.submitResult({
        game_type: 'gulong_letra',
        score: percent,
        metadata: { category: category.slug, correct: finalScore, total: totalRounds },
      });
      if (res?.session?.stars_awarded) {
        setStarsAwarded(res.session.stars_awarded);
      }
    } catch {
      // offline fallback
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setCorrect(0);
    setCorrectStreak(0);
    setWrongStreak(0);
    setGameOver(false);
    setLocked(false);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={`Gulong ng Letra — ${category.name}`}
        bgColor={category.color}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Progress Indicator */}
        <View style={styles.progressRow}>
          <ProgressIndicator
            current={currentIdx + 1}
            total={totalRounds}
            color={category.color}
          />
        </View>

        {/* Visual Clue Card */}
        <View style={[styles.visualCard, Shadows.card]}>
          <ItemVisual item={currentItem} size={140} />
          <Text style={styles.clueText}>English: {currentItem.english}</Text>
        </View>

        {/* Formed Word Drop Area */}
        <View style={styles.dropZone}>
          <Text style={styles.dropZoneLabel}>Ayusin ang mga titik:</Text>
          <View style={styles.slotsRow}>
            {Array.from({ length: targetLetters.length }).map((_, i) => {
              const placed = placedTiles[i];
              let slotBorder = '#CBD5E1';
              let slotBg = '#FFFFFF';

              if (feedback === 'correct') {
                slotBorder = Colors.grassGreen;
                slotBg = '#F0FDF4';
              } else if (feedback === 'wrong') {
                slotBorder = Colors.coralPink;
                slotBg = '#FFF1F2';
              }

              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.8}
                  disabled={!placed || locked}
                  onPress={() => placed && handleRemovePlaced(placed)}
                  style={[
                    styles.slot,
                    { borderColor: slotBorder, backgroundColor: slotBg },
                    placed && Shadows.soft,
                  ]}
                >
                  <Text style={styles.slotLetter}>{placed ? placed.letter : ''}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Scrambled Available Tiles */}
        <View style={styles.scrambledBox}>
          <Text style={styles.scrambledLabel}>Pindutin ang titik:</Text>
          <View style={styles.tilesGrid}>
            {tiles.map((tile) => (
              <TouchableOpacity
                key={tile.id}
                activeOpacity={0.82}
                disabled={tile.used || locked}
                onPress={() => handleTilePress(tile)}
                style={[
                  styles.tile,
                  tile.used ? styles.tileUsed : styles.tileActive,
                  Shadows.soft,
                ]}
              >
                <Text style={[styles.tileText, tile.used && styles.tileTextUsed]}>
                  {tile.letter}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Shuffle / Reset Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={locked}
          onPress={handleResetTiles}
          style={[styles.resetButton, Shadows.soft]}
        >
          <Text style={styles.resetButtonText}>🔄 I-shuffle Muli ang mga Titik</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* GAME OVER MODAL */}
      {gameOver && (
        <View style={styles.overlay}>
          <View style={[styles.victoryCard, Shadows.card]}>
            <Text style={styles.victoryEmoji}>🎡🎉</Text>
            <Text style={styles.victoryTitle}>Napakagaling!</Text>
            <Text style={styles.victoryDesc}>
              Nabuo mo ang mga salita sa {category.name} ({correct} / {totalRounds} tama)!
            </Text>

            <View style={styles.starsEarnedRow}>
              <Text style={styles.starBig}>⭐</Text>
              <Text style={styles.starsEarnedText}>+{starsAwarded} Bituin!</Text>
            </View>

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
    alignItems: 'center',
    paddingBottom: 40,
  },
  progressRow: {
    width: '100%',
    marginBottom: 16,
  },
  visualCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    padding: 14,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  clueText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 8,
  },
  dropZone: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  dropZoneLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
  },
  slotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  slot: {
    width: 44,
    height: 52,
    borderRadius: 14,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotLetter: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },
  scrambledBox: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  scrambledLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
  },
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  tile: {
    width: 50,
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  tileActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FB923C',
  },
  tileUsed: {
    backgroundColor: '#E2E8F0',
    borderColor: '#CBD5E1',
    opacity: 0.4,
  },
  tileText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#EA580C',
  },
  tileTextUsed: {
    color: '#94A3B8',
  },
  resetButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#CBD5E1',
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#475569',
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
    marginBottom: 20,
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
  modalButtons: {
    width: '100%',
    gap: 10,
  },
  btnAction: {
    width: '100%',
  },
});
