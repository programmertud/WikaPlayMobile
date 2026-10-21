/**
 * Pop Balloon Mini-Game
 * Category-based: Displays selectable balloons labeled with vocabulary items
 * from the selected category. The student pops the balloon matching the target prompt.
 */
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ProgressIndicator } from '../../../components/ProgressIndicator';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { getCategoryBySlug, getCategoryVocabulary } from '../../../data/categories';
import { usePresence } from '../../../hooks/use-presence';
import { minigameService } from '../../../services/api';
import { getFeedbackAudio, playLocalSound } from '../../../services/audio/sound-service';
import { Shadows } from '../../../theme';
import { VocabularyItem } from '../../../types';

const { width } = Dimensions.get('window');
const BALLOON_SIZE = Math.min((width - 64) / 2, 140);
const BALLOON_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

interface BalloonOption {
  item: VocabularyItem;
  color: string;
  popped: boolean;
}

function buildRound(items: VocabularyItem[], targetIdx: number): {
  target: VocabularyItem;
  options: BalloonOption[];
} {
  const target = items[targetIdx];
  const others = items.filter((_, i) => i !== targetIdx);
  const shuffled = [...others].sort(() => 0.5 - Math.random()).slice(0, 3);
  const selectedItems = [target, ...shuffled].sort(() => 0.5 - Math.random());

  const options: BalloonOption[] = selectedItems.map((item, idx) => ({
    item,
    color: BALLOON_COLORS[idx % BALLOON_COLORS.length],
    popped: false,
  }));

  return { target, options };
}

export default function PopBalloon() {
  const { category: categorySlug } = useLocalSearchParams<{ category?: string }>();
  const category = getCategoryBySlug(categorySlug);
  const items = getCategoryVocabulary(category.slug);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [starsAwarded, setStarsAwarded] = useState(10);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [wrongStreak, setWrongStreak] = useState(0);
  const [locked, setLocked] = useState(false);

  const totalRounds = Math.min(items.length, 8);
  const [roundData, setRoundData] = useState(() => buildRound(items, 0));

  usePresence(`Pop Balloon (${category.name})`, 'minigame_pop_balloon');

  const target = roundData.target;
  const balloonOptions = roundData.options;

  const handlePop = (option: BalloonOption) => {
    if (locked || option.popped) return;
    setLocked(true);

    const isCorrect = option.item.id === target.id;

    // Pop the tapped balloon
    setRoundData((prev) => ({
      ...prev,
      options: prev.options.map((b) => (b.item.id === option.item.id ? { ...b, popped: true } : b)),
    }));

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
        setRoundData(buildRound(items, nextIdx % items.length));
        setLocked(false);
      }
    }, 1100);
  };

  const submitFinalScore = async (finalScore: number) => {
    try {
      const percent = Math.round((finalScore / totalRounds) * 100);
      const res = await minigameService.submitResult({
        game_type: 'pop_balloon',
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
    setRoundData(buildRound(items, 0));
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={`Pop Balloon — ${category.name}`}
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

        {/* Prompt Card */}
        <View style={[styles.promptCard, Shadows.card]}>
          <Text style={styles.promptLabel}>Pumutok ng lobo na may:</Text>
          <Text style={[styles.targetWord, { color: category.color }]}>
            {`"${target.filipino}"`}
          </Text>
          <Text style={styles.targetEnglish}>({target.english})</Text>
        </View>

        {/* Floating Balloons Grid */}
        <View style={styles.balloonsGrid}>
          {balloonOptions.map((balloon) => {
            if (balloon.popped) {
              return (
                <View key={balloon.item.id} style={styles.poppedPlaceholder}>
                  <Text style={styles.popSplash}>💥</Text>
                  <Text style={styles.popWord}>{balloon.item.filipino}</Text>
                </View>
              );
            }

            return (
              <TouchableOpacity
                key={balloon.item.id}
                activeOpacity={0.8}
                disabled={locked}
                onPress={() => handlePop(balloon)}
                style={[
                  styles.balloon,
                  { backgroundColor: balloon.color },
                  Shadows.card,
                ]}
              >
                {/* Glossy Balloon Highlight */}
                <View style={styles.balloonGloss} />

                {/* Balloon Content (Emoji & Label) */}
                <Text style={styles.balloonEmoji}>{balloon.item.emoji || '🎈'}</Text>
                <Text style={styles.balloonLabel} numberOfLines={1}>
                  {balloon.item.filipino}
                </Text>

                {/* Balloon Knot */}
                <View style={[styles.balloonKnot, { borderBottomColor: balloon.color }]} />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* GAME OVER MODAL */}
      {gameOver && (
        <View style={styles.overlay}>
          <View style={[styles.victoryCard, Shadows.card]}>
            <Text style={styles.victoryEmoji}>🎈🎉</Text>
            <Text style={styles.victoryTitle}>Napakagaling!</Text>
            <Text style={styles.victoryDesc}>
              Naputok mo ang mga lobo sa {category.name} ({correct} / {totalRounds} tama)!
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
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  promptLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  targetWord: {
    fontSize: 28,
    fontWeight: '900',
    marginTop: 4,
    textTransform: 'lowercase',
  },
  targetEnglish: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
    marginTop: 2,
  },
  balloonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
  },
  balloon: {
    width: BALLOON_SIZE,
    height: BALLOON_SIZE * 1.25,
    borderRadius: BALLOON_SIZE * 0.5,
    borderBottomLeftRadius: BALLOON_SIZE * 0.6,
    borderBottomRightRadius: BALLOON_SIZE * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  balloonGloss: {
    position: 'absolute',
    top: 14,
    left: 18,
    width: BALLOON_SIZE * 0.22,
    height: BALLOON_SIZE * 0.35,
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 999,
    transform: [{ rotate: '-30deg' }],
  },
  balloonEmoji: {
    fontSize: 36,
    marginBottom: 6,
  },
  balloonLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    paddingHorizontal: 8,
    textAlign: 'center',
  },
  balloonKnot: {
    position: 'absolute',
    bottom: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  poppedPlaceholder: {
    width: BALLOON_SIZE,
    height: BALLOON_SIZE * 1.25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  popSplash: {
    fontSize: 48,
  },
  popWord: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    marginTop: 4,
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
