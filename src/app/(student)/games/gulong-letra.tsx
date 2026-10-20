/**
 * Gulong ng mga Letra Mini-Game
 * Letters of the target word are shuffled; student taps them in the correct order.
 */
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

interface ShuffleTile { id: string; letter: string; used: boolean }

function shuffleWord(word: string): ShuffleTile[] {
  const letters = word.toUpperCase().replace(/\s/g, '').split('');
  const tiles: ShuffleTile[] = letters.map((l, i) => ({ id: `${l}-${i}`, letter: l, used: false }));
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  return tiles;
}

export default function GuLongLetra() {
  const [items, setItems] = useState<Flashcard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tiles, setTiles] = useState<ShuffleTile[]>([]);
  const [selected, setSelected] = useState<ShuffleTile[]>([]);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [starsAwarded, setStarsAwarded] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [wrongStreak, setWrongStreak] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  usePresence('Naglalaro ng Gulong ng mga Letra', 'minigame_gulong');

  useEffect(() => {
    minigameService.getContent('gulong_letra')
      .then((res) => setItems(res.items.slice(0, 8)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!items[currentIdx]) return;
    const word = (items[currentIdx].filipino_name || items[currentIdx].name).replace(/\s/g, '');
    setTiles(shuffleWord(word));
    setSelected([]);
    setFeedback(null);
  }, [currentIdx, items]);

  const currentItem = items[currentIdx] ?? null;
  const targetWord = currentItem
    ? (currentItem.filipino_name || currentItem.name).toUpperCase().replace(/\s/g, '')
    : '';

  const handleTileTap = (tile: ShuffleTile) => {
    if (tile.used || feedback) return;
    setTiles((prev) => prev.map((t) => t.id === tile.id ? { ...t, used: true } : t));
    setSelected((prev) => [...prev, tile]);
  };

  const handleBack = () => {
    if (selected.length === 0 || feedback) return;
    const last = selected[selected.length - 1];
    setSelected((prev) => prev.slice(0, -1));
    setTiles((prev) => prev.map((t) => t.id === last.id ? { ...t, used: false } : t));
  };

  const handleCheck = async () => {
    if (!currentItem || feedback || selected.length < targetWord.length) return;
    const guess = selected.map((t) => t.letter).join('');
    const isCorrect = guess === targetWord;
    setFeedback(isCorrect ? 'correct' : 'wrong');

    let newCs = correctStreak, newWs = wrongStreak;
    if (isCorrect) { newCs++; newWs = 0; setCorrect((c) => c + 1); }
    else { newWs++; newCs = 0; setWrong((w) => w + 1); }
    setCorrectStreak(newCs); setWrongStreak(newWs);

    const sound = getFeedbackAudio(isCorrect, isCorrect ? newCs : newWs);
    await playSound(sound, () => {
      setFeedback(null);
      setSelected([]);
      const next = currentIdx + 1;
      if (next < items.length) setCurrentIdx(next);
      else setGameOver(true);
    });
  };

  const handleShuffle = () => {
    if (feedback) return;
    const word = (currentItem?.filipino_name || currentItem?.name || '').replace(/\s/g, '');
    setTiles(shuffleWord(word));
    setSelected([]);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const total = correct + wrong;
      const score = total > 0 ? Math.round((correct / total) * 100) : 0;
      const res = await minigameService.submitResult({ game_type: 'gulong_letra', score, metadata: { correct, wrong } });
      setStarsAwarded(res.session.stars_awarded);
    } catch { } finally { setSubmitting(false); }
  };

  useEffect(() => { if (gameOver) handleSubmit(); }, [gameOver]);

  if (loading) return <LoadingView message="Inihahanda ang laro..." />;

  if (gameOver || items.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Gulong ng mga Letra" bgColor="#F59E0B" />
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
      <ScreenHeader title="Gulong ng mga Letra" subtitle={`${currentIdx + 1} ng ${items.length}`} bgColor="#F59E0B" />
      <ScrollView contentContainerStyle={styles.content}>
        <ProgressIndicator current={currentIdx + 1} total={items.length} color="#F59E0B" />

        {/* Picture clue */}
        <View style={[styles.clueCard, Shadows.card]}>
          <Text style={styles.clueEmoji}>{EMOJI_FALLBACKS[currentItem!.id % EMOJI_FALLBACKS.length]}</Text>
          <Text style={styles.clueHint}>Ayusin ang mga letra!</Text>
        </View>

        {/* Selected letters display */}
        <View style={styles.inputRow}>
          {Array.from({ length: targetWord.length }).map((_, i) => (
            <View key={i} style={[
              styles.inputBox,
              feedback === 'correct' && styles.inputBoxCorrect,
              feedback === 'wrong' && styles.inputBoxWrong,
            ]}>
              <Text style={styles.inputBoxText}>{selected[i]?.letter ?? ''}</Text>
            </View>
          ))}
        </View>

        {feedback && (
          <Text style={[styles.feedbackText, { color: feedback === 'correct' ? '#10B981' : '#EF4444' }]}>
            {feedback === 'correct' ? '✅ Tama!' : `❌ Mali! Sagot: ${targetWord}`}
          </Text>
        )}

        {/* Shuffled tiles */}
        <View style={styles.tilesRow}>
          {tiles.map((tile) => (
            <TouchableOpacity
              key={tile.id}
              style={[styles.tile, tile.used && styles.tileUsed, Shadows.soft]}
              onPress={() => handleTileTap(tile)}
              disabled={tile.used || !!feedback}
            >
              <Text style={[styles.tileLetter, tile.used && styles.tileLetterUsed]}>{tile.letter}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <PrimaryButton title="⌫" variant="outline" size="md" onPress={handleBack} style={{ flex: 1, marginRight: 6 }} />
          <PrimaryButton title="🔀 Haluin" variant="outline" size="md" onPress={handleShuffle} style={{ flex: 1, marginRight: 6 }} />
          <PrimaryButton
            title="✓ Suriin"
            variant="primary"
            size="md"
            onPress={handleCheck}
            disabled={selected.length < targetWord.length || !!feedback}
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
    backgroundColor: Colors.white, borderRadius: 24, borderWidth: 4,
    borderColor: Colors.white, padding: 20, alignItems: 'center', marginVertical: 16,
  },
  clueEmoji: { fontSize: 72, marginBottom: 8 },
  clueHint: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.textLight },
  inputRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  inputBox: {
    width: 40, height: 48, borderRadius: 12, borderWidth: 3,
    borderColor: '#CBD5E1', backgroundColor: Colors.white,
    justifyContent: 'center', alignItems: 'center',
  },
  inputBoxCorrect: { borderColor: '#10B981', backgroundColor: '#D1FAE5' },
  inputBoxWrong: { borderColor: '#EF4444', backgroundColor: '#FEE2E2' },
  inputBoxText: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.heavy, color: Colors.text },
  feedbackText: { textAlign: 'center', fontSize: Typography.sizes.md, fontWeight: Typography.weights.heavy, marginBottom: 12 },
  tilesRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 12, marginBottom: 16 },
  tile: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: '#F59E0B',
    justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: Colors.white,
  },
  tileUsed: { backgroundColor: '#E2E8F0', borderColor: '#CBD5E1' },
  tileLetter: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.heavy, color: Colors.white },
  tileLetterUsed: { color: '#94A3B8' },
  controls: { flexDirection: 'row', marginTop: 4 },
  result: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  resultEmoji: { fontSize: 72, marginBottom: 12 },
  resultTitle: { fontSize: Typography.sizes.hero, fontWeight: Typography.weights.heavy, color: Colors.text, marginBottom: 8 },
  resultSub: { fontSize: Typography.sizes.md, color: Colors.textLight, marginBottom: 16 },
  starsPill: { backgroundColor: '#FEF3C7', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 2, borderColor: '#F59E0B', marginBottom: 8 },
  starsText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.heavy, color: '#B45309' },
});
