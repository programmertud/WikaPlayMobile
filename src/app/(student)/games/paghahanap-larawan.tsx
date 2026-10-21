/**
 * Paghahanap ng Larawan Mini-Game
 * Category-based: Displays prompt for a vocabulary item from the selected category,
 * student picks the matching picture from 4 choices.
 */
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
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
import { Colors, Shadows } from '../../../theme';
import { VocabularyItem } from '../../../types';

const { width } = Dimensions.get('window');
const CHOICE_SIZE = (width - 56) / 2;

function buildRound(items: VocabularyItem[], targetIndex: number) {
  const target = items[targetIndex];
  const others = items.filter((_, i) => i !== targetIndex);
  const shuffled = [...others].sort(() => 0.5 - Math.random()).slice(0, 3);
  const choices = [target, ...shuffled].sort(() => 0.5 - Math.random());
  return { target, choices };
}

export default function PaghahanapLarawan() {
  useBgmDuck();
  const { category: categorySlug } = useLocalSearchParams<{ category?: string }>();
  const category = getCategoryBySlug(categorySlug);
  const items = getCategoryVocabulary(category.slug);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [starsAwarded, setStarsAwarded] = useState(10);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [wrongStreak, setWrongStreak] = useState(0);
  const [locked, setLocked] = useState(false);
  const totalRounds = Math.min(items.length, 8);

  const { target, choices } = buildRound(items, currentIdx % items.length);

  useEffect(() => {
    if (target && !gameOver) {
      playVocabularyItem(target);
    }
  }, [currentIdx, gameOver]);

  usePresence(`Paghahanap ng Larawan (${category.name})`, 'minigame_paghahanap');

  const handleSelect = (choice: VocabularyItem) => {
    if (locked) return;
    setLocked(true);
    setSelectedId(choice.id);

    const isCorrect = choice.id === target.id;

    if (isCorrect) {
      const newStreak = correctStreak + 1;
      setCorrectStreak(newStreak);
      setWrongStreak(0);
      setCorrect((c) => c + 1);
      const soundKey = getFeedbackAudio(true, newStreak);
      playLocalSound(soundKey);
    } else {
      const newStreak = wrongStreak + 1;
      setWrongStreak(newStreak);
      setCorrectStreak(0);
      setWrong((w) => w + 1);
      const soundKey = getFeedbackAudio(false, newStreak);
      playLocalSound(soundKey);
    }

    setTimeout(() => {
      if (currentIdx + 1 >= totalRounds) {
        setGameOver(true);
        submitFinalScore(correct + (isCorrect ? 1 : 0));
      } else {
        setCurrentIdx((i) => i + 1);
        setSelectedId(null);
        setLocked(false);
      }
    }, 1200);
  };

  const submitFinalScore = async (finalScore: number) => {
    try {
      const percent = Math.round((finalScore / totalRounds) * 100);
      const res = await minigameService.submitResult({
        game_type: 'paghahanap_larawan',
        score: percent,
        metadata: { category: category.slug, correct: finalScore, total: totalRounds },
      });
      if (res?.session?.stars_awarded) {
        setStarsAwarded(res.session.stars_awarded);
      }
    } catch {
      // offline fallback non-critical
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedId(null);
    setCorrect(0);
    setWrong(0);
    setCorrectStreak(0);
    setWrongStreak(0);
    setGameOver(false);
    setLocked(false);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={`Paghahanap — ${category.name}`}
        bgColor={category.color}
      />

      <View style={styles.content}>
        {/* Progress Bar */}
        <View style={styles.progressRow}>
          <ProgressIndicator
            current={currentIdx + 1}
            total={totalRounds}
            color={category.color}
          />
        </View>

        {/* Prompt Card with Audio Replay */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => playVocabularyItem(target)}
          style={[styles.promptCard, Shadows.card]}
        >
          <Text style={styles.promptSub}>Hanapin ang larawan ng:</Text>
          <Text style={[styles.promptTarget, { color: category.color }]}>
            {`"${target.filipino}"`} 🔊
          </Text>
          <Text style={styles.promptEnglish}>({target.english})</Text>
        </TouchableOpacity>

        {/* 4 Picture Choices Grid */}
        <View style={styles.choicesGrid}>
          {choices.map((choice) => {
            const isSelected = selectedId === choice.id;
            const isCorrectChoice = choice.id === target.id;

            let cardBorderColor = '#FFFFFF';
            let cardBgColor = '#FFFFFF';

            if (selectedId) {
              if (isCorrectChoice) {
                cardBorderColor = Colors.grassGreen;
                cardBgColor = '#F0FDF4';
              } else if (isSelected) {
                cardBorderColor = Colors.coralPink;
                cardBgColor = '#FFF1F2';
              }
            }

            return (
              <TouchableOpacity
                key={choice.id}
                activeOpacity={0.85}
                disabled={locked}
                onPress={() => handleSelect(choice)}
                style={[
                  styles.choiceCard,
                  { borderColor: cardBorderColor, backgroundColor: cardBgColor },
                  Shadows.card,
                ]}
              >
                <ItemVisual item={choice} size={CHOICE_SIZE * 0.75} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* GAME OVER MODAL */}
      {gameOver && (
        <View style={styles.overlay}>
          <View style={[styles.victoryCard, Shadows.card]}>
            <Text style={styles.victoryEmoji}>🎯🎉</Text>
            <Text style={styles.victoryTitle}>Mahusay!</Text>
            <Text style={styles.victoryDesc}>
              Nakatapos ka ng {correct} sa {totalRounds} tamang sagot ({wrong} mali) sa {category.name}!
            </Text>

            <View style={styles.starsEarnedRow}>
              <Text style={styles.starBig}>⭐</Text>
              <Text style={styles.starsEarnedText}>+{starsAwarded} Bituin!</Text>
            </View>

            <View style={styles.modalButtons}>
              <PrimaryButton
                title="Subukan Muli 🔄"
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
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  progressRow: {
    width: '100%',
    marginBottom: 16,
  },
  promptCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  promptSub: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  promptTarget: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
    textTransform: 'lowercase',
  },
  promptEnglish: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 2,
  },
  choicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 14,
    width: '100%',
  },
  choiceCard: {
    width: CHOICE_SIZE,
    height: CHOICE_SIZE,
    borderRadius: 22,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
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
