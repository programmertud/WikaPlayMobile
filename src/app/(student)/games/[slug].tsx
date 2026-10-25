/**
 * Game router — dynamically renders the correct mini-game component
 * based on the URL [slug] parameter.
 */
import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GuLongLetra from './gulong-letra';
import HulaanSalita from './hulaan-salita';
import MemoryMatch from './memory-match';
import PaghahanapLarawan from './paghahanap-larawan';
import PopBalloon from './pop-balloon';

import { stopCurrentSound, useBgmDuck } from '../../../services/audio/sound-service';
import { Colors, Typography } from '../../../theme';
import { PrimaryButton } from '../../../components/PrimaryButton';

import { hydrateCategoryOverrides } from '../../../data/categories';

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
  const { slug, category } = useLocalSearchParams<{ slug: string; category?: string }>();
  
  React.useEffect(() => {
    return () => {
      stopCurrentSound();
    };
  }, []);

  React.useEffect(() => {
    if (category) {
      hydrateCategoryOverrides(category);
    }
  }, [category]);

  const GameComponent = GAME_MAP[slug as GameSlug];

  if (!GameComponent) {
    return (
      <View style={styles.notFound}>
        <Ionicons name="help-circle-outline" size={64} color={Colors.textMuted} style={{ marginBottom: 12 }} />
        <Text style={styles.notFoundTitle}>Hindi Nahanap ang Laro</Text>
        <Text style={styles.notFoundSub}>Slug: {slug}</Text>
        <PrimaryButton
          title="Bumalik"
          variant="primary"
          icon="arrow-back"
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(student)/(tabs)/minigames');
            }
          }}
          style={{ marginTop: 12 }}
        />
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
    backgroundColor: Colors.background,
    padding: 24,
  },
  notFoundTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  notFoundSub: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginBottom: 16,
  },
});
