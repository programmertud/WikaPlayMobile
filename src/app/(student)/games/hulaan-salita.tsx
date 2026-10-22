/**
 * Hulaan ang Salita Mini-Game
 * Category-based: Displays visual clue from the selected category,
 * student spells out or guesses the Filipino word using letter tiles.
 */
import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const { updateUserStars } = useAuth();
  const { category: categorySlug } = useLocalSearchParams<{ category?: string }>();
  const category = getCategoryBySlug(categorySlug);
  const items = getCategoryVocabulary(category.slug);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [inputLetters, setInputLetters] = useState<string[]>([]);
  const [correct, setCorrect] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [starsAwarded, setStarsAwarded] = useState(0);
  const [locked, setLocked] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState<'correct' | 'wrong' | null>(null);

  // Mystery Box & Collectible state
  const [showMysteryBox, setShowMysteryBox] = useState(false);
  const [awardedCollectible, setAwardedCollectible] = useState<Collectible | null>(null);

  // Centralized voice-over streak manager
  const { triggerFeedback, resetStreaks } = useAnswerFeedback();

  // Exactly 20 questions / levels
  const totalRounds = 20;
  const currentItem: VocabularyItem = items[currentIdx % items.length];
  const targetLetters = currentItem.filipino.toUpperCase().replace(/[^A-Z]/g, '');
  const [choices, setChoices] = useState<string[]>(() => buildChoices(targetLetters));

  usePresence(`Hulaan ang Salita (${category.name})`, 'minigame_hulaan');

  const handleLetterPress = (ch: string) => {
    if (locked || inputLetters.length >= targetLetters.length) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const nextInput = [...inputLetters, ch];
    setInputLetters(nextInput);

    if (nextInput.length === targetLetters.length) {
      verifyAnswer(nextInput.join(''));
    }
  };

  const handleDelete = () => {
    if (locked || inputLetters.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setInputLetters((prev) => prev.slice(0, -1));
  };

  const verifyAnswer = async (guess: string) => {
    setLocked(true);
    const isCorrect = guess === targetLetters;

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
      if (currentIdx + 1 >= totalRounds) {
        submitFinalScore(finalCorrect);
      } else {
        const nextIdx = currentIdx + 1;
        setCurrentIdx(nextIdx);
        const nextTarget = items[nextIdx % items.length].filipino.toUpperCase().replace(/[^A-Z]/g, '');
        setChoices(buildChoices(nextTarget));
        setInputLetters([]);
        setFeedbackStatus(null);
        setLocked(false);
      }
    });
  };

  const submitFinalScore = async (finalScore: number) => {
    const sessionId = `hulaan_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    try {
      const res = await minigameService.submitResult({
        game_type: 'hulaan_salita',
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
      // offline fallback: 1:1 stars
      setStarsAwarded(finalScore);
      updateUserStars(finalScore);
      setGameOver(true);
    }
  };

  const handleRestart = () => {
    resetStreaks();
    setCurrentIdx(0);
    setInputLetters([]);
    setCorrect(0);
    setGameOver(false);
    setShowMysteryBox(false);
    setAwardedCollectible(null);
    setLocked(false);
    setFeedbackStatus(null);
    const firstTarget = items[0].filipino.toUpperCase().replace(/[^A-Z]/g, '');
    setChoices(buildChoices(firstTarget));
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={`Hulaan — ${category.name}`}
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

            let slotBorder: string = 'rgba(0, 0, 0, 0.08)';
            let slotBg: string = Colors.white;

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

        {/* Letter Choices Keyboard */}
        <View style={styles.keyboardContainer}>
          <View style={styles.choicesRow}>
            {choices.map((ch, idx) => (
              <PressableScale
                key={`${ch}-${idx}`}
                disabled={locked}
                onPress={() => handleLetterPress(ch)}
                activeScale={0.9}
                style={[styles.tileBtn, Shadows.soft]}
              >
                <Text style={styles.tileText}>{ch}</Text>
              </PressableScale>
            ))}
          </View>

          {/* Delete Action Button */}
          <PressableScale
            disabled={locked || inputLetters.length === 0}
            onPress={handleDelete}
            style={[
              styles.deleteBtn,
              inputLetters.length === 0 && styles.deleteBtnDisabled,
              Shadows.subtle,
            ]}
          >
            <Ionicons name="backspace" size={20} color={Colors.text} />
            <Text style={styles.deleteText}>Burahin</Text>
          </PressableScale>
        </View>
      </ScrollView>

      {/* WIN CELEBRATION OVERLAY */}
      <CelebrationOverlay
        visible={gameOver}
        title="Ang Galing Mo!"
        subtitle={`Nabuo mo ang ${correct} sa ${totalRounds} mga salita!`}
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
  englishHint: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.textLight,
    marginTop: 10,
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
  keyboardContainer: {
    width: '100%',
    alignItems: 'center',
  },
  choicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  tileBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileText: {
    fontSize: 20,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.pill,
  },
  deleteBtnDisabled: {
    opacity: 0.45,
  },
  deleteText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
});
