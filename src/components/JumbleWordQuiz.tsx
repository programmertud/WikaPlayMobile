import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/utils/haptics';
import { ItemVisual } from './ItemVisual';
import { PressableScale } from './PressableScale';
import { PrimaryButton } from './PrimaryButton';
import { Colors, Radius, Shadows, Typography } from '../theme';
import { VocabularyItem } from '../types';

const { width } = Dimensions.get('window');

interface LetterTile {
  id: string;
  char: string;
}

interface JumbleWordQuizProps {
  targetWord: string;
  targetImageUri?: string;
  targetItem?: VocabularyItem;
  instruction?: string;
  isLocked: boolean;
  feedbackState: 'idle' | 'correct' | 'wrong';
  onSubmit: (word: string) => void;
  disabled?: boolean;
}

/**
 * Shuffles an array of letter tiles and ensures it does not match
 * the original solved word if length > 1.
 */
function createShuffledTiles(word: string): LetterTile[] {
  const letters = word
    .toUpperCase()
    .trim()
    .split('')
    .map((char, index) => ({
      id: `tile-${index}-${char}`,
      char,
    }));

  if (letters.length <= 1) return letters;

  let shuffled = [...letters];
  let attempts = 0;
  while (attempts < 8) {
    shuffled.sort(() => Math.random() - 0.5);
    const formed = shuffled.map((t) => t.char).join('');
    if (formed !== word.toUpperCase().trim()) {
      break;
    }
    attempts++;
  }
  return shuffled;
}

export const JumbleWordQuiz: React.FC<JumbleWordQuizProps> = ({
  targetWord,
  targetImageUri,
  targetItem,
  instruction = 'Ayusin ang mga letra.',
  isLocked,
  feedbackState,
  onSubmit,
  disabled = false,
}) => {
  const cleanWord = (targetWord || '').toUpperCase().trim();
  const wordLength = cleanWord.length;

  const [availableTiles, setAvailableTiles] = useState<LetterTile[]>([]);
  const [placedSlots, setPlacedSlots] = useState<(LetterTile | null)[]>([]);

  // Reset tiles whenever target word changes
  useEffect(() => {
    if (!cleanWord) return;
    const initialTiles = createShuffledTiles(cleanWord);
    setAvailableTiles(initialTiles);
    setPlacedSlots(new Array(wordLength).fill(null));
  }, [cleanWord, wordLength]);

  // Tap an available letter -> Place it in the first empty slot
  const handleSelectTile = (tile: LetterTile) => {
    if (isLocked || disabled) return;
    Haptics.selectionAsync().catch(() => {});

    const firstEmptyIndex = placedSlots.findIndex((slot) => slot === null);
    if (firstEmptyIndex === -1) return; // All slots full

    setAvailableTiles((prev) => prev.filter((t) => t.id !== tile.id));
    setPlacedSlots((prev) => {
      const next = [...prev];
      next[firstEmptyIndex] = tile;
      return next;
    });
  };

  // Tap a placed slot -> Return that tile back to available tiles
  const handleRemoveFromSlot = (index: number) => {
    if (isLocked || disabled) return;
    const tile = placedSlots[index];
    if (!tile) return;

    Haptics.selectionAsync().catch(() => {});
    setPlacedSlots((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
    setAvailableTiles((prev) => [...prev, tile]);
  };

  // Clear / Reset all slots
  const handleReset = () => {
    if (isLocked || disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const allTiles = createShuffledTiles(cleanWord);
    setAvailableTiles(allTiles);
    setPlacedSlots(new Array(wordLength).fill(null));
  };

  // Submit current answer
  const handleSubmit = () => {
    if (isLocked || disabled) return;
    const formedWord = placedSlots
      .map((slot) => (slot ? slot.char : ''))
      .join('');

    if (formedWord.length === 0) return;
    onSubmit(formedWord);
  };

  const isComplete = placedSlots.every((slot) => slot !== null);

  // Dynamic slot sizing based on word length to fit nicely on any screen
  const maxTileWidth = Math.min(56, Math.floor((width - 48 - (wordLength - 1) * 8) / wordLength));
  const tileSize = Math.max(38, maxTileWidth);

  return (
    <View style={styles.container}>
      {/* Target Picture Card */}
      <View style={[styles.visualCard, Shadows.card]}>
        {targetItem ? (
          <ItemVisual item={targetItem} size={150} style={{ alignSelf: 'center' }} />
        ) : targetImageUri ? (
          <Image
            source={{ uri: targetImageUri }}
            style={styles.image}
            contentFit="contain"
          />
        ) : (
          <View style={styles.emojiFallback}>
            <Text style={styles.fallbackEmoji}>🖼️</Text>
          </View>
        )}

        {/* Instruction Banner */}
        <View style={styles.instructionBanner}>
          <Ionicons name="sparkles" size={16} color={Colors.sunYellowDark} />
          <Text style={styles.instructionText}>{instruction}</Text>
        </View>
      </View>

      {/* Answer Slots Row */}
      <View style={styles.slotsSection}>
        <Text style={styles.slotsLabel}>Iyong Sagot:</Text>
        <View style={styles.slotsRow}>
          {placedSlots.map((slot, idx) => {
            let slotStyle: any = styles.slotEmpty;
            if (slot) {
              slotStyle = styles.slotFilled;
            }
            if (feedbackState === 'correct') {
              slotStyle = styles.slotCorrect;
            } else if (feedbackState === 'wrong') {
              slotStyle = styles.slotWrong;
            }

            return (
              <TouchableOpacity
                key={`slot-${idx}`}
                onPress={() => handleRemoveFromSlot(idx)}
                disabled={isLocked || disabled || !slot}
                activeOpacity={0.75}
                style={[
                  styles.slotBox,
                  slotStyle,
                  { width: tileSize, height: tileSize + 8 },
                ]}
              >
                <Text
                  style={[
                    styles.slotLetterText,
                    feedbackState === 'correct' && styles.textCorrect,
                    feedbackState === 'wrong' && styles.textWrong,
                  ]}
                >
                  {slot ? slot.char : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* If wrong and locked, show correct word hint */}
        {feedbackState === 'wrong' && (
          <View style={styles.correctWordHint}>
            <Text style={styles.hintLabel}>Tamang baybay: </Text>
            <Text style={styles.hintWord}>{cleanWord}</Text>
          </View>
        )}
      </View>

      {/* Available Letter Tiles Pool */}
      <View style={styles.poolSection}>
        <Text style={styles.poolLabel}>Mga Letra (Pindutin upang ilagay):</Text>
        <View style={styles.tilesRow}>
          {availableTiles.length === 0 && !isLocked ? (
            <Text style={styles.emptyPoolNote}>
              {'Nailagay na ang lahat ng letra! Pindutin ang "Suriin" sa ibaba.'}
            </Text>
          ) : (
            availableTiles.map((tile) => (
              <PressableScale
                key={tile.id}
                onPress={() => handleSelectTile(tile)}
                disabled={isLocked || disabled}
                style={[
                  styles.letterTile,
                  Shadows.soft,
                  { width: tileSize, height: tileSize + 4 },
                ]}
              >
                <Text style={styles.tileChar}>{tile.char}</Text>
              </PressableScale>
            ))
          )}
        </View>
      </View>

      {/* Action Controls: Reset & Suriin */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          onPress={handleReset}
          disabled={isLocked || disabled || availableTiles.length === wordLength}
          style={[
            styles.resetBtn,
            (isLocked || disabled || availableTiles.length === wordLength) && styles.btnDisabled,
          ]}
        >
          <Ionicons name="refresh" size={18} color={Colors.textMuted} />
          <Text style={styles.resetBtnText}>I-reset</Text>
        </TouchableOpacity>

        <PrimaryButton
          title={isLocked ? 'Sinusuri...' : 'Suriin (Sagot)'}
          variant="primary"
          size="md"
          icon="checkmark-circle"
          disabled={!isComplete || isLocked || disabled}
          onPress={handleSubmit}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  visualCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  image: {
    width: 140,
    height: 140,
  },
  emojiFallback: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackEmoji: {
    fontSize: 72,
  },
  instructionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FDE047',
  },
  instructionText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: '#854D0E',
  },
  slotsSection: {
    marginBottom: 16,
    alignItems: 'center',
  },
  slotsLabel: {
    fontSize: 11,
    fontWeight: Typography.weights.bold,
    color: Colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  slotsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  slotBox: {
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotEmpty: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 2,
    borderColor: '#94A3B8',
    borderStyle: 'dashed',
  },
  slotFilled: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.skyBlueDark,
    ...Shadows.subtle,
  },
  slotCorrect: {
    backgroundColor: '#DCFCE7',
    borderWidth: 2,
    borderColor: Colors.grassGreen,
  },
  slotWrong: {
    backgroundColor: '#FFE4E6',
    borderWidth: 2,
    borderColor: Colors.coralPink,
  },
  slotLetterText: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  textCorrect: {
    color: Colors.grassGreenDark,
  },
  textWrong: {
    color: Colors.coralPinkDark,
  },
  correctWordHint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  hintLabel: {
    fontSize: 12,
    color: Colors.coralPinkDark,
  },
  hintWord: {
    fontSize: 13,
    fontWeight: Typography.weights.heavy,
    color: Colors.coralPinkDark,
  },
  poolSection: {
    marginBottom: 20,
    alignItems: 'center',
  },
  poolLabel: {
    fontSize: 11,
    fontWeight: Typography.weights.bold,
    color: Colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tilesRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    flexWrap: 'wrap',
    minHeight: 52,
    alignItems: 'center',
  },
  emptyPoolNote: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  letterTile: {
    backgroundColor: '#E0F2FE',
    borderWidth: 2,
    borderColor: '#38BDF8',
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileChar: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: '#0369A1',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  resetBtnText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.textMuted,
  },
  btnDisabled: {
    opacity: 0.45,
  },
});
