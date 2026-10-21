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
  const icon = category.icon || '📚';

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[styles.card, Shadows.card]}
      accessibilityRole="button"
      accessibilityLabel={`Buksan ang kategoryang ${category.name}`}
    >
      {/* Colored header with large icon */}
      <View style={[styles.iconArea, { backgroundColor: category.color || Colors.skyBlue }]}>
        {/* Decorative circles */}
        <View style={[styles.decorCircle, styles.decorCircle1]} />
        <View style={[styles.decorCircle, styles.decorCircle2]} />
        {/* Main icon */}
        <Text style={styles.icon}>{icon}</Text>
      </View>

      {/* Footer with name and badge */}
      <View style={[styles.footer, { backgroundColor: category.color || Colors.skyBlue }]}>
        <Text style={styles.title} numberOfLines={1}>
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
    backgroundColor: Colors.white,
  },
  iconArea: {
    width: '100%',
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  decorCircle1: {
    width: 80,
    height: 80,
    top: -20,
    right: -20,
  },
  decorCircle2: {
    width: 55,
    height: 55,
    bottom: -15,
    left: -10,
  },
  icon: {
    fontSize: 56,
  },
  footer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.3)',
  },
  title: {
    color: Colors.white,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.heavy,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginBottom: 5,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.92)',
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
