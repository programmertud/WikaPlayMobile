/**
 * Hulaan ang Salita Mini-Game
 * Student sees a picture/emoji and types or picks letters to guess the Filipino word.
 * Uses multiple-choice letter options for kindergarten accessibility.
 */
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
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

const EMOJI_FALLBACKS = ['🐶','🐱','🐄','🐷','🍎','🍌','🥕','🌽','🔴','🔵','⭕','🔷'];
const EXTRA_LETTERS = 'ABCDEFGHIJKLMNOPRSTUVWXYZ';

function buildChoices(word: string): string[] {
  const upper = word.toUpperCase().replace(/\s/g, '');
  const unique = [...new Set(upper)];
  const extras: string[] = [];
  for (const ch of EXTRA_LETTERS) {
    if (extras.length >= 4) break;
    if (!unique.includes(ch)) extras.push(ch);
  }
  return [...unique, ...extras].sort(() => Math.random() - 0.5);
}

export default function HulaanSalita() {
  const [items, setItems] = useState<Flashcard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [inputLetters, setInputLetters] = useState<string[]>([]);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [starsAwarded, setStarsAwarded] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [wrongStreak, setWrongStreak] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  usePresence('Naglalaro ng Hulaan ang Salita', 'minigame_hulaan');

  useEffect(() => {
    minigameService.getContent('hulaan_salita')
      .then((res) => setItems(res.items.slice(0, 8)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const currentItem = items[currentIdx] ?? null;
  const targetWord = currentItem ? (currentItem.filipino_name || currentItem.name).toUpperCase().replace(/\s/g, '') : '';
  const letterChoices = currentItem ? buildChoices(targetWord) : [];

  const handleLetterPress = (letter: string) => {
    if (feedback) return;
    if (inputLetters.length >= targetWord.length) return;
    setInputLetters((prev) => [...prev, letter]);
  };

  const handleDelete = () => {
    if (feedback) return;
    setInputLetters((prev) => prev.slice(0, -1));
  };

  const handleCheck = async () => {
    if (!currentItem || feedback) return;
    const guess = inputLetters.join('');
    const isCorrect = guess === targetWord;
    setFeedback(isCorrect ? 'correct' : 'wrong');

    let newCs = correctStreak, newWs = wrongStreak;
    if (isCorrect) { newCs++; newWs = 0; setCorrect((c) => c + 1); }
    else { newWs++; newCs = 0; setWrong((w) => w + 1); }
    setCorrectStreak(newCs); setWrongStreak(newWs);

    const sound = getFeedbackAudio(isCorrect, isCorrect ? newCs : newWs);
    await playSound(sound, () => {
      setFeedback(null);
      setInputLetters([]);
      const next = currentIdx + 1;
      if (next < items.length) setCurrentIdx(next);
      else setGameOver(true);
    });
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const total = correct + wrong;
      const score = total > 0 ? Math.round((correct / total) * 100) : 0;
      const res = await minigameService.submitResult({ game_type: 'hulaan_salita', score, metadata: { correct, wrong } });
      setStarsAwarded(res.session.stars_awarded);
    } catch { } finally { setSubmitting(false); }
  };

  useEffect(() => { if (gameOver) handleSubmit(); }, [gameOver]);

  if (loading) return <LoadingView message="Inihahanda ang laro..." />;

  if (gameOver || items.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Hulaan ang Salita" bgColor="#10B981" />
        <View style={styles.result}>
          <Text style={styles.resultEmoji}>🎉</Text>
          <Text style={styles.resultTitle}>{correct >= wrong ? 'Magaling!' : 'Subukan Muli!'}</Text>
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
      <ScreenHeader title="Hulaan ang Salita" subtitle={`${currentIdx + 1} ng ${items.length}`} bgColor="#10B981" />
      <ScrollView contentContainerStyle={styles.content}>
        <ProgressIndicator current={currentIdx + 1} total={items.length} color="#10B981" />

        {/* Picture clue */}
        <View style={[styles.clueCard, Shadows.card]}>
          <Text style={styles.clueEmoji}>{EMOJI_FALLBACKS[currentItem!.id % EMOJI_FALLBACKS.length]}</Text>
          <Text style={styles.clueHint}>Ano ito?</Text>
        </View>

        {/* Input display */}
        <View style={styles.inputRow}>
          {Array.from({ length: targetWord.length }).map((_, i) => (
            <View key={i} style={[styles.letterBox, feedback === 'correct' && styles.letterBoxCorrect, feedback === 'wrong' && styles.letterBoxWrong]}>
              <Text style={styles.letterBoxText}>{inputLetters[i] ?? ''}</Text>
            </View>
          ))}
        </View>

        {feedback && (
          <Text style={[styles.feedbackText, { color: feedback === 'correct' ? '#10B981' : '#EF4444' }]}>
            {feedback === 'correct' ? '✅ Tama!' : `❌ Mali! (${targetWord})`}
          </Text>
        )}

        {/* Letter choices */}
        <View style={styles.letterGrid}>
          {letterChoices.map((letter) => (
            <TouchableOpacity
              key={letter}
              style={[styles.letterBtn, Shadows.soft]}
              onPress={() => handleLetterPress(letter)}
              disabled={!!feedback}
            >
              <Text style={styles.letterBtnText}>{letter}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <PrimaryButton title="⌫ Burahin" variant="outline" size="md" onPress={handleDelete} style={{ flex: 1, marginRight: 8 }} />
          <PrimaryButton
            title="Suriin ✓"
            variant="primary"
            size="md"
            onPress={handleCheck}
            disabled={inputLetters.length < targetWord.length || !!feedback}
            style={{ flex: 1 }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF' },
  content: { padding: 16, paddingBottom: 32 },
  clueCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: Colors.white,
    padding: 20,
    alignItems: 'center',
    marginVertical: 16,
  },
  clueEmoji: { fontSize: 80, marginBottom: 8 },
  clueHint: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.textLight },
  inputRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  letterBox: {
    width: 42, height: 50, borderRadius: 12, borderWidth: 3,
    borderColor: '#CBD5E1', backgroundColor: Colors.white,
    justifyContent: 'center', alignItems: 'center',
  },
  letterBoxCorrect: { borderColor: '#10B981', backgroundColor: '#D1FAE5' },
  letterBoxWrong: { borderColor: '#EF4444', backgroundColor: '#FEE2E2' },
  letterBoxText: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.heavy, color: Colors.text },
  feedbackText: {
    textAlign: 'center',
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.heavy,
    marginBottom: 12,
  },
  letterGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 8, marginBottom: 16 },
  letterBtn: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#8B5CF6',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Colors.white,
  },
  letterBtnText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.heavy, color: Colors.white },
  controls: { flexDirection: 'row', marginTop: 8 },
  result: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  resultEmoji: { fontSize: 72, marginBottom: 12 },
  resultTitle: { fontSize: Typography.sizes.hero, fontWeight: Typography.weights.heavy, color: Colors.text, marginBottom: 8 },
  resultSub: { fontSize: Typography.sizes.md, color: Colors.textLight, marginBottom: 16 },
  starsPill: { backgroundColor: '#FEF3C7', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 2, borderColor: '#F59E0B', marginBottom: 8 },
  starsText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.heavy, color: '#B45309' },
});
