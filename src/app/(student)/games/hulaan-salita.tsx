/**
 * Hulaan ang Salita Mini-Game
 * Category-based: Displays visual clue from the selected category,
 * student spells out or guesses the Filipino word using letter tiles.
 */
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
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

const EXTRA_ALPHABET = 'AEIOUBKDGLMNPRSTW';

function buildChoices(word: string): string[] {
  const letters = word.toUpperCase().replace(/[^A-Z]/g, '').split('');
  const unique = Array.from(new Set(letters));
  const extras: string[] = [];
  for (const ch of EXTRA_ALPHABET) {
    if (extras.length >= 4) break;
    if (!unique.includes(ch)) extras.push(ch);
  }
  return [...letters, ...extras].sort(() => 0.5 - Math.random());
}

export default function HulaanSalita() {
  useBgmDuck();
  const { category: categorySlug } = useLocalSearchParams<{ category?: string }>();
  const category = getCategoryBySlug(categorySlug);
  const items = getCategoryVocabulary(category.slug);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [inputLetters, setInputLetters] = useState<string[]>([]);
  const [correct, setCorrect] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [starsAwarded, setStarsAwarded] = useState(10);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [wrongStreak, setWrongStreak] = useState(0);
  const [locked, setLocked] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<'correct' | 'wrong' | null>(null);

  const totalRounds = Math.min(items.length, 8);
  const currentItem: VocabularyItem = items[currentIdx % items.length];
  const targetLetters = currentItem.filipino.toUpperCase().replace(/[^A-Z]/g, '');
  const [choices, setChoices] = useState<string[]>(() => buildChoices(targetLetters));

  usePresence(`Hulaan ang Salita (${category.name})`, 'minigame_hulaan');

  const handleLetterPress = (ch: string) => {
    if (locked || inputLetters.length >= targetLetters.length) return;
    const nextInput = [...inputLetters, ch];
    setInputLetters(nextInput);

    // If fully filled, auto-verify
    if (nextInput.length === targetLetters.length) {
      verifyAnswer(nextInput.join(''));
    }
  };

  const handleDelete = () => {
    if (locked || inputLetters.length === 0) return;
    setInputLetters((prev) => prev.slice(0, -1));
  };

  const verifyAnswer = (guess: string) => {
    setLocked(true);
    const isCorrect = guess === targetLetters;

    if (isCorrect) {
      setFeedbackStatus('correct');
      const newStreak = correctStreak + 1;
      setCorrectStreak(newStreak);
      setWrongStreak(0);
      setCorrect((c) => c + 1);
      playVocabularyItem(currentItem);
    } else {
      setFeedbackStatus('wrong');
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
        const nextIdx = currentIdx + 1;
        setCurrentIdx(nextIdx);
        const nextTarget = items[nextIdx % items.length].filipino.toUpperCase().replace(/[^A-Z]/g, '');
        setChoices(buildChoices(nextTarget));
        setInputLetters([]);
        setFeedbackStatus(null);
        setLocked(false);
      }
    }, 1200);
  };

  const submitFinalScore = async (finalScore: number) => {
    try {
      const percent = Math.round((finalScore / totalRounds) * 100);
      const res = await minigameService.submitResult({
        game_type: 'hulaan_salita',
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
    setInputLetters([]);
    setCorrect(0);
    setCorrectStreak(0);
    setWrongStreak(0);
    setGameOver(false);
    setLocked(false);
    setFeedbackStatus(null);
    const firstTarget = items[0].filipino.toUpperCase().replace(/[^A-Z]/g, '');
    setChoices(buildChoices(firstTarget));
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={`Hulaan ang Salita — ${category.name}`}
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

        {/* Visual Card */}
        <View style={[styles.visualCard, Shadows.card]}>
          <ItemVisual item={currentItem} size={150} />
          <Text style={styles.englishHint}>English: {currentItem.english}</Text>
        </View>

        {/* Word Slot Blanks */}
        <View style={styles.slotsRow}>
          {Array.from({ length: targetLetters.length }).map((_, i) => {
            const letter = inputLetters[i];
            const isFilled = !!letter;

            let slotBorder = '#CBD5E1';
            let slotBg = '#FFFFFF';

            if (feedbackStatus === 'correct') {
              slotBorder = Colors.grassGreen;
              slotBg = '#F0FDF4';
            } else if (feedbackStatus === 'wrong') {
              slotBorder = Colors.coralPink;
              slotBg = '#FFF1F2';
            }

            return (
              <View
                key={i}
                style={[
                  styles.slot,
                  { borderColor: slotBorder, backgroundColor: slotBg },
                  isFilled && Shadows.soft,
                ]}
              >
                <Text style={styles.slotText}>{letter || ''}</Text>
              </View>
            );
          })}
        </View>

        {/* Letter Choices Bank */}
        <View style={styles.choicesGrid}>
          {choices.map((ch, idx) => (
            <TouchableOpacity
              key={`${ch}-${idx}`}
              activeOpacity={0.8}
              disabled={locked}
              onPress={() => handleLetterPress(ch)}
              style={[styles.letterBtn, Shadows.soft]}
            >
              <Text style={styles.letterBtnText}>{ch}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Action Controls */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={locked || inputLetters.length === 0}
            onPress={handleDelete}
            style={[styles.actionBtn, styles.deleteBtn, Shadows.soft]}
          >
            <Text style={styles.actionBtnText}>⌫ Burahin</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* GAME OVER MODAL */}
      {gameOver && (
        <View style={styles.overlay}>
          <View style={[styles.victoryCard, Shadows.card]}>
            <Text style={styles.victoryEmoji}>💡🎉</Text>
            <Text style={styles.victoryTitle}>Ang Galing Mo!</Text>
            <Text style={styles.victoryDesc}>
              Nahulaan mo ang mga salita sa {category.name} ({correct} / {totalRounds} tama)!
            </Text>

            <View style={styles.starsEarnedRow}>
              <Text style={styles.starBig}>⭐</Text>
              <Text style={styles.starsEarnedText}>+{starsAwarded} Bituin!</Text>
            </View>

            <View style={styles.modalButtons}>
              <PrimaryButton
                title="Maglaro Muli 🔄"
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
    padding: 16,
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  englishHint: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 10,
  },
  slotsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
    width: '100%',
  },
  slot: {
    width: 44,
    height: 52,
    borderRadius: 14,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slotText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
  },
  choicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    marginBottom: 16,
  },
  letterBtn: {
    width: 48,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  letterBtnText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0284C7',
  },
  actionsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 2,
  },
  deleteBtn: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC2626',
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
