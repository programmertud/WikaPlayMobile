import { Image } from 'expo-image';
import React from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors, Shadows, Typography } from '../theme';
import { MiniGame } from '../types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface MiniGameCardProps {
  game: MiniGame;
  onPress: () => void;
  emoji?: string;
}

export const MiniGameCard: React.FC<MiniGameCardProps> = ({ game, onPress, emoji }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: game.bg_color || Colors.vibrantPurple },
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
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {game.title}
        </Text>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>{game.tag || 'Laro'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: Colors.white,
    overflow: 'hidden',
    marginBottom: 16,
  },
  imageContainer: {
    width: '100%',
    height: 110,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  title: {
    color: Colors.white,
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.heavy,
    textAlign: 'center',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    color: Colors.text,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
});
