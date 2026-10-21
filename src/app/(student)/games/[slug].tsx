/**
 * Game router — dynamically renders the correct mini-game component
 * based on the URL [slug] parameter.
 *
 * Supported slugs:
 *   memory-match       → MemoryMatch
 *   paghahanap-larawan → PaghahanapLarawan
 *   hulaan-salita      → HulaanSalita
 *   gulong-letra       → GuLongLetra
 *   pop-balloon        → PopBalloon
 */
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import GuLongLetra from './gulong-letra';
import HulaanSalita from './hulaan-salita';
import MemoryMatch from './memory-match';
import PaghahanapLarawan from './paghahanap-larawan';
import PopBalloon from './pop-balloon';

import { useBgmDuck } from '../../../services/audio/sound-service';

type GameSlug =
  | 'memory-match'
  | 'paghahanap-larawan'
  | 'hulaan-salita'
  | 'gulong-letra'
  | 'pop-balloon';

const GAME_MAP: Record<GameSlug, React.ComponentType> = {
  'memory-match': MemoryMatch,
  'paghahanap-larawan': PaghahanapLarawan,
  'hulaan-salita': HulaanSalita,
  'gulong-letra': GuLongLetra,
  'pop-balloon': PopBalloon,
};

export default function GameRouter() {
  useBgmDuck();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const GameComponent = GAME_MAP[slug as GameSlug];

  if (!GameComponent) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundEmoji}>❓</Text>
        <Text style={styles.notFoundTitle}>Hindi Nahanap ang Laro</Text>
        <Text style={styles.notFoundSub}>Slug: {slug}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Bumalik</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <GameComponent />;
}

const styles = StyleSheet.create({
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    padding: 24,
  },
  notFoundEmoji: { fontSize: 64, marginBottom: 12 },
  notFoundTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 6 },
  notFoundSub: { fontSize: 14, color: '#64748B', marginBottom: 20 },
  backBtn: {
    backgroundColor: '#38BDF8',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  backBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
});
