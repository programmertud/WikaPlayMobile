import { Image } from 'expo-image';
import React from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Shadows, Typography, Radius } from '@/theme';
import { MiniGame } from '../types';
import { PressableScale } from './PressableScale';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface MiniGameCardProps {
  game: MiniGame;
  onPress: () => void;
  emoji?: string;
}

export const MiniGameCard: React.FC<MiniGameCardProps> = ({ game, onPress, emoji }) => {
  const bgColor = game.bg_color || Colors.vibrantPurple;

  return (
    <PressableScale
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: bgColor },
        Shadows.card,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Laruin ang ${game.title}`}
    >
      <View style={styles.imageContainer}>
        {game.cover_image ? (
          <Image
            source={{ uri: game.cover_image }}
            style={styles.image}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderEmoji}>{emoji ?? '🎮'}</Text>
          </View>
        )}
        {/* Subtle gradient overlay on cover */}
        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.35)']}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {game.title}
        </Text>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>{game.tag || 'Laro'}</Text>
        </View>
      </View>
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    overflow: 'hidden',
    marginBottom: 16,
  },
  imageContainer: {
    width: '100%',
    height: 110,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 42,
  },
  content: {
    padding: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
  },
  title: {
    color: Colors.white,
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  badgeText: {
    color: Colors.text,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.heavy,
  },
});
