/**
 * Paghahanap ng Larawan Mini-Game
 * Student hears a Filipino word audio and picks the correct picture from 4 choices.
 * Reuses the same audio-first picture-selection logic used in Katamtaman quizzes.
 */
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LoadingView } from '../../../components/LoadingView';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ProgressIndicator } from '../../../components/ProgressIndicator';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { usePresence } from '../../../hooks/use-presence';
import { getFeedbackAudio, playSound, stopCurrentSound } from '../../../services/audio/sound-service';
import { minigameService } from '../../../services/api';
import { Colors, Shadows, Typography } from '../../../theme';
import type { Flashcard } from '../../../types';

const { width } = Dimensions.get('window');
const CHOICE_SIZE = (width - 56) / 2;

const EMOJI_FALLBACKS = ['🐶','🐱','🐄','🐷','🍎','🍌','🥕','🌽','🔴','🔵','⭕','🔷'];

function buildRound(flashcards: Flashcard[], idx: number): {
  target: Flashcard;
  choices: Flashcard[];
} {
  const target = flashcards[idx];
  const others = flashcards.filter((_, i) => i !== idx);
  const shuffled = [...others].sort(() => Math.random() - 0.5).slice(0, 3);
  const choices = [...shuffled, target].sort(() => Math.random() - 0.5);
  return { target, choices };
}

export default function PaghahanapLarawan() {
  const [items, setItems] = useState<Flashcard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [choicesDisabled, setChoicesDisabled] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [starsAwarded, setStarsAwarded] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [wrongStreak, setWrongStreak] = useState(0);
  const roundRef = useRef(0);

  usePresence('Naglalaro ng Paghahanap ng Larawan', 'minigame_paghahanap');

  useEffect(() => {
    minigameService.getContent('paghahanap_larawan')
      .then((res) => setItems(res.items.slice(0, 8)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    const thisRound = currentIdx;
    roundRef.current = thisRound;
    setChoicesDisabled(true);
    setSelected(null);
    setIsPlayingAudio(false);
    stopCurrentSound();

    const t = setTimeout(async () => {
      if (roundRef.current !== thisRound) return;
      const { target } = buildRound(items, currentIdx);
      const audioUrl = target.audio_url ?? '';
      if (!audioUrl) {
        setChoicesDisabled(false);
        return;
      }
      setIsPlayingAudio(true);
      await playSound(audioUrl, () => {
        if (roundRef.current === thisRound) {
          setIsPlayingAudio(false);
          setChoicesDisabled(false);
        }
      });
    }, 1500);

    return () => {
      clearTimeout(t);
      stopCurrentSound();
    };
  }, [currentIdx, items]);

  const { target, choices } = items.length > 0
    ? buildRound(items, currentIdx)
    : { target: null, choices: [] };

  const handleSelect = async (choice: Flashcard) => {
    if (choicesDisabled || selected !== null || !target) return;
    setSelected(choice.id);
    setChoicesDisabled(true);

    const isCorrect = choice.id === target.id;
    let newCorrectStreak = correctStreak;
    let newWrongStreak = wrongStreak;

    if (isCorrect) {
      newCorrectStreak++;
      newWrongStreak = 0;
      setCorrect((c) => c + 1);
    } else {
      newWrongStreak++;
      newCorrectStreak = 0;
      setWrong((w) => w + 1);
    }
    setCorrectStreak(newCorrectStreak);
    setWrongStreak(newWrongStreak);

    const feedback = getFeedbackAudio(isCorrect, isCorrect ? newCorrectStreak : newWrongStreak);
    await playSound(feedback, () => {
      const next = currentIdx + 1;
      if (next < items.length) {
        setCurrentIdx(next);
      } else {
        setGameOver(true);
      }
    });
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const total = correct + wrong;
      const score = total > 0 ? Math.round((correct / total) * 100) : 0;
      const res = await minigameService.submitResult({
        game_type: 'paghahanap_larawan',
        score,
        metadata: { correct, wrong },
      });
      setStarsAwarded(res.session.stars_awarded);
    } catch { /* non-critical */ }
    finally { setSubmitting(false); }
  };

  useEffect(() => {
    if (gameOver) handleSubmit();
  }, [gameOver]);

  if (loading) return <LoadingView message="Inihahanda ang laro..." />;

  if (gameOver || items.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Paghahanap ng Larawan" bgColor="#0EA5E9" />
        <View style={styles.result}>
          <Text style={styles.resultEmoji}>🎉</Text>
          <Text style={styles.resultTitle}>{correct >= wrong ? 'Napakagaling!' : 'Subukan Muli!'}</Text>
          <Text style={styles.resultSub}>{correct} Tama | {wrong} Mali</Text>
          {starsAwarded > 0 && (
            <View style={[styles.starsPill, Shadows.button]}>
              <Text style={styles.starsText}>+ {starsAwarded} Bituin! ⭐</Text>
            </View>
          )}
          <PrimaryButton title="Bumalik" variant="primary" size="lg" onPress={() => router.back()} style={{ width: '100%', marginTop: 16 }} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Paghahanap ng Larawan"
        subtitle={`Tanong ${currentIdx + 1} ng ${items.length}`}
        bgColor="#0EA5E9"
      />
      <View style={styles.content}>
        <ProgressIndicator current={currentIdx + 1} total={items.length} color="#0EA5E9" />

        {/* Audio Prompt */}
        <View style={[styles.promptCard, Shadows.card]}>
          <TouchableOpacity
            style={[styles.speakerBtn, isPlayingAudio && styles.speakerBtnActive, Shadows.button]}
            onPress={() => {/* replay handled by useEffect */}}
            disabled={isPlayingAudio || choicesDisabled}
          >
            {isPlayingAudio
              ? <ActivityIndicator color={Colors.white} size="large" />
              : <Text style={styles.speakerEmoji}>🔊</Text>
            }
          </TouchableOpacity>
          <Text style={styles.promptHint}>
            {isPlayingAudio ? 'Makinig nang mabuti...' : choicesDisabled ? '⏳ Inihahanda...' : 'Piliin ang larawan!'}
          </Text>
        </View>

        {/* Picture Choices */}
        <View style={styles.choicesGrid}>
          {choices.map((choice, i) => (
            <TouchableOpacity
              key={`${choice.id}-${i}`}
              activeOpacity={0.85}
              onPress={() => handleSelect(choice)}
              disabled={choicesDisabled}
              style={[
                styles.choiceCard,
                selected === choice.id && styles.choiceSelected,
                choicesDisabled && styles.choiceDisabled,
                Shadows.card,
              ]}
            >
              <Text style={styles.choiceEmoji}>{EMOJI_FALLBACKS[choice.id % EMOJI_FALLBACKS.length]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF' },
  content: { flex: 1, padding: 16, justifyContent: 'space-between' },
  promptCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: Colors.white,
    padding: 20,
    alignItems: 'center',
    marginVertical: 12,
  },
  speakerBtn: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#0EA5E9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: Colors.white,
    marginBottom: 10,
  },
  speakerBtnActive: { backgroundColor: Colors.grassGreen },
  speakerEmoji: { fontSize: 40 },
  promptHint: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  choicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  choiceCard: {
    width: CHOICE_SIZE,
    height: CHOICE_SIZE,
    backgroundColor: Colors.white,
    borderRadius: 22,
    borderWidth: 4,
    borderColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  choiceSelected: { borderColor: Colors.grassGreen, borderWidth: 5 },
  choiceDisabled: { opacity: 0.75 },
  choiceEmoji: { fontSize: 64 },
  result: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  resultEmoji: { fontSize: 72, marginBottom: 12 },
  resultTitle: { fontSize: Typography.sizes.hero, fontWeight: Typography.weights.heavy, color: Colors.text, marginBottom: 8 },
  resultSub: { fontSize: Typography.sizes.md, color: Colors.textLight, marginBottom: 16 },
  starsPill: {
    backgroundColor: '#FEF3C7', paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 20, borderWidth: 2, borderColor: '#F59E0B', marginBottom: 8,
  },
  starsText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.heavy, color: '#B45309' },
});
