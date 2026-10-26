/**
 * Paghahanap ng Larawan Mini-Game
 * Category-based: Displays prompt for a vocabulary item from the selected category,
 * student picks the matching picture from 4 choices.
 */
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/utils/haptics';

import { AnimatedBackground } from '../../../components/AnimatedBackground';
import { ItemVisual } from '../../../components/ItemVisual';
import { ProgressIndicator } from '../../../components/ProgressIndicator';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { PressableScale } from '../../../components/PressableScale';
import { CelebrationOverlay } from '../../../components/CelebrationOverlay';
import { CorrectAnswerConfetti } from '../../../components/CorrectAnswerConfetti';
import { MysteryBoxModal } from '../../../components/MysteryBoxModal';
import { getCategoryBySlug, getCategoryVocabulary } from '../../../data/categories';
import { useAuth } from '../../../hooks/use-auth';
import { usePresence } from '../../../hooks/use-presence';
import { useAnswerFeedback } from '../../../hooks/use-answer-feedback';
import { generateSessionId, submitMinigameReward } from '../../../services/rewards/star-reward-service';
import {
  playVocabularyItem,
  stopCurrentSound,
  useBgmDuck,
} from '../../../services/audio/sound-service';
import { Colors, Gradients, Shadows, Typography, Radius } from '../../../theme';
import { Collectible, VocabularyItem } from '../../../types';

const { width } = Dimensions.get('window');
const CHOICE_SIZE = (width - 56) / 2;

function shuffleItems<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildRound(items: VocabularyItem[], targetIndex: number) {
  const target = items[targetIndex % items.length];
  const others = items.filter((it) => it.id !== target.id);
  const shuffled = [...others].sort(() => 0.5 - Math.random()).slice(0, 3);
  const choices = [target, ...shuffled].sort(() => 0.5 - Math.random());
  return { target, choices };
}

export default function PaghahanapLarawan() {
  useBgmDuck();
  const { category: categorySlug } = useLocalSearchParams<{ category?: string }>();
  const category = getCategoryBySlug(categorySlug);
  const rawItems = getCategoryVocabulary(category.slug);
  const { user, updateUserStars } = useAuth();

  // Stable session ID — regenerated only on restart
  const sessionIdRef = useRef<string>(generateSessionId('paghahanap'));

  const [items, setItems] = useState<VocabularyItem[]>(() => shuffleItems(rawItems));
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [, setWrong] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [starsAwarded, setStarsAwarded] = useState(0);
  const [locked, setLocked] = useState(false);
  const [showMysteryBox, setShowMysteryBox] = useState(false);
  const [awardedCollectible, setAwardedCollectible] = useState<Collectible | null>(null);

  // Exactly 20 questions / levels
  const totalRounds = 20;

  // Centralized voice-over streak manager
  const { triggerFeedback, resetStreaks, confettiTrigger } = useAnswerFeedback();

  const [roundData, setRoundData] = useState(() => buildRound(shuffleItems(rawItems), 0));
  const target = roundData.target;
  const choices = roundData.choices;

  useEffect(() => {
    return () => {
      stopCurrentSound();
    };
  }, []);

  useEffect(() => {
    if (target && !gameOver) {
      stopCurrentSound();
      playVocabularyItem(target);
    }
    return () => {
      stopCurrentSound();
    };
  }, [currentIdx, gameOver, target]);

  usePresence(`Paghahanap ng Litrato (${category.name})`, 'minigame_paghahanap');

  const handleSelect = async (choice: VocabularyItem) => {
    if (locked) return;
    setLocked(true);
    setSelectedId(choice.id);

    const isCorrect = choice.id === target.id;

    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setCorrect((c) => c + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      setWrong((w) => w + 1);
    }

    await triggerFeedback(isCorrect, () => {
      const finalCorrect = correct + (isCorrect ? 1 : 0);
      if (currentIdx + 1 >= totalRounds) {
        submitFinalScore(finalCorrect);
      } else {
        const nextIdx = currentIdx + 1;
        setCurrentIdx(nextIdx);
        setSelectedId(null);
        setRoundData(buildRound(items, nextIdx));
        setLocked(false);
      }
    });
  };

  const submitFinalScore = async (finalScore: number) => {
    try {
      const res = await submitMinigameReward({
        gameType: 'paghahanap_larawan',
        score: finalScore,
        sessionId: sessionIdRef.current,
        metadata: { category: category.slug, correct: finalScore, total: totalRounds },
        currentStarsBalance: user?.stars_balance ?? 0,
        updateUserStars,
        studentId: user?.id,
      });

      setStarsAwarded(res.starsAwarded);

      // Check if student qualifies for collectible (15-20/20)
      if (res.session?.qualifies_for_collectible && res.session?.collectible) {
        setAwardedCollectible(res.session.collectible);
        setShowMysteryBox(true);
      } else {
        setGameOver(true);
      }
    } catch {
      // offline fallback
      setStarsAwarded(finalScore);
      setGameOver(true);
    }
  };

  const handleRestart = () => {
    sessionIdRef.current = generateSessionId('paghahanap');
    resetStreaks();
    const newShuffled = shuffleItems(rawItems);
    setItems(newShuffled);
    setCurrentIdx(0);
    setSelectedId(null);
    setCorrect(0);
    setWrong(0);
    setGameOver(false);
    setShowMysteryBox(false);
    setAwardedCollectible(null);
    setLocked(false);
    setRoundData(buildRound(newShuffled, 0));
  };

  return (
    <AnimatedBackground>
      <CorrectAnswerConfetti trigger={confettiTrigger} />
      <ScreenHeader
        title={`Paghahanap — ${category.name}`}
        bgColor={category.color}
        logoImage={require('../../../../assets/images/minigames/cover-paghahanap-larawan.jpg')}
      />

      <View style={styles.content}>
        {/* Animated Progress Bar */}
        <View style={styles.progressRow}>
          <ProgressIndicator
            current={currentIdx + 1}
            total={totalRounds}
            gradient={Gradients.grass}
            height={10}
          />
        </View>

        {/* Prompt Card with Audio Replay */}
        <PressableScale
          onPress={() => playVocabularyItem(target)}
          style={[styles.promptCard, Shadows.card]}
        >
          <Text style={styles.promptSub}>Panuto (Pindutin para pakinggan):</Text>
          <View style={styles.promptTargetRow}>
            <Text style={[styles.promptTarget, { color: category.color || Colors.skyBlueDark }]}>
              {`Hanapin ang ${target.filipino}!`}
            </Text>
            <Ionicons name="volume-high" size={26} color={category.color || Colors.skyBlueDark} />
          </View>
          <Text style={styles.promptEnglish}>({target.english})</Text>
        </PressableScale>

        {/* 4 Picture Choices Grid */}
        <View style={styles.choicesGrid}>
          {choices.map((choice) => {
            const isSelected = selectedId === choice.id;
            const isCorrectChoice = choice.id === target.id;

            let cardBorderColor: string = 'rgba(0, 0, 0, 0.06)';
            let cardBgColor: string = Colors.white;

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
              <PressableScale
                key={choice.id}
                disabled={locked}
                onPress={() => handleSelect(choice)}
                activeScale={0.95}
                style={[
                  styles.choiceCard,
                  { borderColor: cardBorderColor, backgroundColor: cardBgColor },
                  Shadows.soft,
                ]}
              >
                <ItemVisual item={choice} size={CHOICE_SIZE * 0.72} />
              </PressableScale>
            );
          })}
        </View>
      </View>

      {/* WIN CELEBRATION OVERLAY */}
      <CelebrationOverlay
        visible={gameOver}
        subtitle={`Nakuha mo ang ${correct} sa ${totalRounds} tamang litrato!`}
        scoreText={`+${starsAwarded} Bituin! ⭐`}
        score={correct}
        showFireworks={correct >= 15 && correct <= 20}
        continueText="Maglaro Ulit"
        onContinue={handleRestart}
      />

      {/* MYSTERY BOX REWARD MODAL */}
      <MysteryBoxModal
        visible={showMysteryBox}
        score={correct}
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
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  progressRow: {
    width: '100%',
    marginBottom: 12,
  },
  promptCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  promptSub: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    fontWeight: Typography.weights.semibold,
    marginBottom: 4,
  },
  promptTargetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  promptTarget: {
    fontSize: 28,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
  },
  promptEnglish: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    fontWeight: Typography.weights.medium,
  },
  choicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  choiceCard: {
    width: CHOICE_SIZE,
    height: CHOICE_SIZE,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
