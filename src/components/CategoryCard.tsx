import React from 'react';
import {
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Shadows, Typography, Radius } from '@/theme';
import { Category } from '../types';
import { PressableScale } from './PressableScale';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

const CATEGORY_COVERS: Record<string, any> = {
  'mga-hayop': require('../../assets/images/mga hayop.png'),
  'mga-prutas': require('../../assets/images/mga prutas.png'),
  'mga-gulay': require('../../assets/images/mga gulay.png'),
  'mga-hugis': require('../../assets/images/hugis.png'),
  'mga-kulay': require('../../assets/images/kulay.png'),
  'mga-numero': require('../../assets/images/numero.png'),
  'mga-bilang': require('../../assets/images/numero.png'),
  'mga-pagbati': require('../../assets/images/pagbati.png'),
  'mga-pagbati-at-parirala': require('../../assets/images/pagbati.png'),
  'bahagi-ng-katawan': require('../../assets/images/bahagi ng katawan.png'),
  'mga-bahagi-ng-katawan': require('../../assets/images/bahagi ng katawan.png'),
};

interface CategoryCardProps {
  category: Category;
  index?: number;
  progress?: number; // 0 to 1
  onPress: () => void;
}

// Generate gradient pair from base color
function getGradientPair(color?: string): readonly [string, string] {
  if (!color) return ['#38BDF8', '#0284C7'];
  // Provide harmonious deep end for known colors
  switch (color.toUpperCase()) {
    case '#38BDF8':
      return ['#38BDF8', '#0284C7'];
    case '#FBBF24':
      return ['#FBBF24', '#D97706'];
    case '#22C55E':
      return ['#22C55E', '#15803D'];
    case '#F43F5E':
      return ['#FB7185', '#E11D48'];
    case '#8B5CF6':
      return ['#A78BFA', '#7C3AED'];
    case '#7C3AED':
      return ['#8B5CF6', '#6D28D9'];
    case '#F97316':
      return ['#FB923C', '#EA580C'];
    default:
      return [color, color];
  }
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  index = 0,
  progress,
  onPress,
}) => {
  const icon = category.icon || '📚';
  const gradient = getGradientPair(category.color);
  const coverSource = (category as any).logoImage || CATEGORY_COVERS[category.slug] || (category.cover_image ? { uri: category.cover_image } : null);

  const handlePress = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined' && document.activeElement) {
      (document.activeElement as HTMLElement).blur?.();
    }
    onPress();
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 70, 500)).springify().damping(16)}
      style={styles.wrapper}
    >
      <PressableScale
        onPress={handlePress}
        style={[styles.card, Shadows.card]}
        accessibilityRole="button"
        accessibilityLabel={`Buksan ang kategoryang ${category.name}`}
      >
        {/* Header with Cover Image or LinearGradient */}
        <View style={styles.iconArea}>
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.decorCircle, styles.decorCircle1]} />
          <View style={[styles.decorCircle, styles.decorCircle2]} />

          {coverSource ? (
            <Image
              source={coverSource}
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.icon}>{icon}</Text>
          )}
        </View>

        {/* Card Footer with clean white card body */}
        <View style={styles.footer}>
          <Text style={styles.title} numberOfLines={1}>
            {category.name}
          </Text>



          {/* Progress bar at bottom if visited */}
          {typeof progress === 'number' && progress > 0 && (
            <View style={styles.progressContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${Math.min(Math.max(progress * 100, 5), 100)}%`,
                    backgroundColor: category.color || Colors.skyBlueDark,
                  },
                ]}
              />
            </View>
          )}
        </View>
      </PressableScale>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: CARD_WIDTH,
    marginBottom: 16,
  },
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
    backgroundColor: Colors.white,
  },
  iconArea: {
    width: '100%',
    height: 104,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  decorCircle1: {
    width: 80,
    height: 80,
    top: -20,
    right: -20,
  },
  decorCircle2: {
    width: 50,
    height: 50,
    bottom: -15,
    left: -10,
  },
  icon: {
    fontSize: 52,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  footer: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 12,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  title: {
    color: Colors.text,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
    marginBottom: 6,
  },
  badge: {
    backgroundColor: Colors.skyBlue50,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.skyBlue100,
  },
  badgeText: {
    color: Colors.skyBlueDark,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  progressContainer: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});
