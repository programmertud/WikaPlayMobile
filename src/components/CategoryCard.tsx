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
import { Category } from '../types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

interface CategoryCardProps {
  category: Category;
  onPress: () => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, onPress }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: category.color || Colors.skyBlue },
        Shadows.card,
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Buksan ang kategoryang ${category.name}`}
    >
      <View style={styles.imageContainer}>
        {category.cover_image ? (
          <Image
            source={{ uri: category.cover_image }}
            style={styles.image}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Text style={styles.placeholderEmoji}>🎨</Text>
          </View>
        )}
      </View>

      <View style={styles.contentContainer}>
        <Text style={styles.title} numberOfLines={2}>
          {category.name}
        </Text>

        {category.flashcards_count !== undefined && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {category.flashcards_count} Salita
            </Text>
          </View>
        )}
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
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderEmoji: {
    fontSize: 42,
  },
  contentContainer: {
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
