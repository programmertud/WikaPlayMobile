/**
 * Pop Balloon Mini-Game
 * Multiple balloons float on screen. A word/audio prompt is given and student must
 * pop only the balloon with the matching picture/label.
 */
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
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

const { width, height } = Dimensions.get('window');
const BALLOON_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
const EMOJI_FALLBACKS = ['🐶','🐱','🐄','🐷','🍎','🍌','🥕','🌽','🔴','🔵','⭕','🔷'];

interface Balloon {
  id: number;
  flashcard: Flashcard;
  color: string;
  x: Animated.Value;
  y: Animated.Value;
  popped: boolean;
  emoji: string;
}

function buildBalloons(flashcards: Flashcard[], targetIdx: number): Balloon[] {
  const targets = flashcards.slice(0, 5);
  return targets.map((fc, i) => ({
    id: fc.id,
    flashcard: fc,
    color: BALLOON_COLORS[i % BALLOON_COLORS.length],
    x: new Animated.Value(30 + (i % 3) * ((width - 100) / 2)),
    y: new Animated.Value(height * 0.45 - i * 90),
    popped: false,
    emoji: EMOJI_FALLBACKS[fc.id % EMOJI_FALLBACKS.length],
  }));
}

export default function PopBalloon() {
  const [items, setItems] = useState<Flashcard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [loading, setLoading] = useState(true);
  const [choicesDisabled, setChoicesDisabled] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [starsAwarded, setStarsAwarded] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [wrongStreak, setWrongStreak] = useState(0);
  const roundRef = useRef(0);
  const popAnims = useRef<Record<number, Animated.Value>>({});

  usePresence('Naglalaro ng Pop Balloon', 'minigame_pop_balloon');

  useEffect(() => {
    minigameService.getContent('pop_balloon')
      .then((res) => {
        const all = res.items;
        setItems(all);
        const bl = buildBalloons(all, 0);
        bl.forEach((b) => { popAnims.current[b.id] = new Animated.Value(1); });
        setBalloons(bl);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  // On new round: play audio for current target
  useEffect(() => {
    if (items.length === 0 || balloons.length === 0) return;
    const thisRound = currentIdx;
    roundRef.current = thisRound;
    setChoicesDisabled(true);
    stopCurrentSound();

    const t = setTimeout(async () => {
      if (roundRef.current !== thisRound) return;
      const targetItem = items[currentIdx];
      if (!targetItem) return;
      const audio = targetItem.audio_url ?? '';
      if (!audio) { setChoicesDisabled(false); return; }
      setIsPlayingAudio(true);
      await playSound(audio, () => {
        if (roundRef.current === thisRound) {
          setIsPlayingAudio(false);
          setChoicesDisabled(false);
        }
      });
    }, 1500);
    return () => { clearTimeout(t); stopCurrentSound(); };
  }, [currentIdx, items, balloons.length]);

  const handlePopBalloon = async (balloon: Balloon) => {
    if (choicesDisabled || balloon.popped) return;
    setChoicesDisabled(true);

    const targetItem = items[currentIdx];
    const isCorrect = balloon.id === targetItem?.id;

    // Pop animation
    Animated.sequence([
      Animated.timing(popAnims.current[balloon.id], { toValue: 1.5, duration: 100, useNativeDriver: true }),
      Animated.timing(popAnims.current[balloon.id], { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start();
    setBalloons((prev) => prev.map((b) => b.id === balloon.id ? { ...b, popped: true } : b));

    let newCs = correctStreak, newWs = wrongStreak;
    if (isCorrect) { newCs++; newWs = 0; setCorrect((c) => c + 1); }
    else { newWs++; newCs = 0; setWrong((w) => w + 1); }
    setCorrectStreak(newCs); setWrongStreak(newWs);

    const sound = getFeedbackAudio(isCorrect, isCorrect ? newCs : newWs);
    await playSound(sound, () => {
      const next = currentIdx + 1;
      if (next < items.length) {
        setCurrentIdx(next);
        const bl = buildBalloons(items, next);
        bl.forEach((b) => { popAnims.current[b.id] = new Animated.Value(1); });
        setBalloons(bl);
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
      const res = await minigameService.submitResult({ game_type: 'pop_balloon', score, metadata: { correct, wrong } });
      setStarsAwarded(res.session.stars_awarded);
    } catch { } finally { setSubmitting(false); }
  };

  useEffect(() => { if (gameOver) handleSubmit(); }, [gameOver]);

  if (loading) return <LoadingView message="Inihahanda ang Pop Balloon..." />;

  if (gameOver || items.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Pop Balloon" bgColor="#EF4444" />
        <View style={styles.result}>
          <Text style={styles.resultEmoji}>🎈</Text>
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

  const targetItem = items[currentIdx];

  return (
    <View style={styles.container}>
      <ScreenHeader title="Pop Balloon" subtitle={`${currentIdx + 1} ng ${items.length}`} bgColor="#EF4444" />
      <View style={styles.game}>
        <ProgressIndicator current={currentIdx + 1} total={items.length} color="#EF4444" />

        {/* Prompt */}
        <View style={[styles.promptCard, Shadows.card]}>
          <Text style={styles.promptEmoji}>{isPlayingAudio ? '🎶' : '🔊'}</Text>
          <Text style={styles.promptText}>
            {isPlayingAudio ? 'Makinig nang mabuti...' : choicesDisabled ? '⏳ Maghintay...' : 'I-pop ang tamang balloon!'}
          </Text>
        </View>

        {/* Balloons */}
        <View style={styles.balloonsArea}>
          {balloons.map((balloon) => (
            <Animated.View
              key={balloon.id}
              style={{
                transform: [{ scale: popAnims.current[balloon.id] ?? new Animated.Value(1) }],
                opacity: balloon.popped ? 0 : 1,
              }}
            >
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handlePopBalloon(balloon)}
                disabled={choicesDisabled || balloon.popped}
                style={[styles.balloon, { backgroundColor: balloon.color }, Shadows.card]}
              >
                <Text style={styles.balloonString}>|</Text>
                <Text style={styles.balloonEmoji}>{balloon.emoji}</Text>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF1F2' },
  game: { flex: 1, padding: 16 },
  promptCard: {
    backgroundColor: Colors.white, borderRadius: 20, borderWidth: 4,
    borderColor: Colors.white, padding: 14, flexDirection: 'row',
    alignItems: 'center', gap: 12, marginVertical: 12,
  },
  promptEmoji: { fontSize: 32 },
  promptText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.heavy,
    color: Colors.text,
    flex: 1,
  },
  balloonsArea: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignContent: 'flex-start',
    paddingTop: 20,
  },
  balloon: {
    width: 100,
    height: 130,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 10,
    borderWidth: 4,
    borderColor: Colors.white,
  },
  balloonString: { position: 'absolute', bottom: -14, fontSize: 20, color: '#94A3B8' },
  balloonEmoji: { fontSize: 48 },
  result: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  resultEmoji: { fontSize: 72, marginBottom: 12 },
  resultTitle: { fontSize: Typography.sizes.hero, fontWeight: Typography.weights.heavy, color: Colors.text, marginBottom: 8 },
  resultSub: { fontSize: Typography.sizes.md, color: Colors.textLight, marginBottom: 16 },
  starsPill: { backgroundColor: '#FEF3C7', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 2, borderColor: '#F59E0B', marginBottom: 8 },
  starsText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.heavy, color: '#B45309' },
});
