import { useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/utils/haptics';

import { AudioButton } from '../../../components/AudioButton';
import { ItemVisual } from '../../../components/ItemVisual';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { PressableScale } from '../../../components/PressableScale';
import { getCategoryBySlug } from '../../../data/categories';
import { usePresence } from '../../../hooks/use-presence';
import { playVocabularyItem, useBgmDuck } from '../../../services/audio/sound-service';
import { Colors, Gradients, Shadows, Typography, Radius } from '../../../theme';

const { width } = Dimensions.get('window');
const CARD_SIZE = Math.min(width - 48, 340);

export default function FlashcardsViewerScreen() {
  useBgmDuck();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const category = getCategoryBySlug(slug);
  const items = category.items;
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentItem = items[currentIndex] || items[0];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === items.length - 1;

  usePresence(`Nagbabasa ng Flashcards sa ${category.name}`, 'flashcards_view');

  // Animation values for card slide/flip transition
  const cardOpacity = useSharedValue(1);
  const cardTranslateX = useSharedValue(0);

  const transitionTo = (newIndex: number, direction: 'left' | 'right') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const exitX = direction === 'left' ? -60 : 60;
    const enterX = direction === 'left' ? 60 : -60;

    cardTranslateX.value = withTiming(exitX, { duration: 150 });
    cardOpacity.value = withTiming(0, { duration: 150 }, () => {
      runOnJS(setCurrentIndex)(newIndex);
      cardTranslateX.value = enterX;
      cardTranslateX.value = withTiming(0, { duration: 180 });
      cardOpacity.value = withTiming(1, { duration: 180 });
    });
  };

  const handlePrev = () => {
    if (!isFirst) {
      transitionTo(currentIndex - 1, 'right');
    }
  };

  const handleNext = () => {
    if (!isLast) {
      transitionTo(currentIndex + 1, 'left');
    }
  };

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateX: cardTranslateX.value }],
  }));

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={category.name.toUpperCase()}
        bgColor={category.color}
      />

      <View style={styles.content}>
        {/* Main Flashcard with Slide/Flip Animation */}
        <Animated.View style={[styles.flashcard, Shadows.card, cardAnimatedStyle]}>
          {/* Card Visual / Illustration */}
          <ItemVisual item={currentItem} size={CARD_SIZE * 0.7} style={styles.visualContainer} />

          {/* Filipino Name */}
          <Text style={[styles.filipinoName, { color: category.color || Colors.skyBlueDark }]}>
            {currentItem.filipino}
          </Text>

          {/* English Translation */}
          <Text style={styles.englishName}>
            {currentItem.english}
          </Text>

          {/* Audio Play Button */}
          {currentItem.audioUri ? (
            <View style={styles.audioContainer}>
              <AudioButton audioUrl={currentItem.audioUri} size={54} />
            </View>
          ) : (
            <PressableScale
              onPress={() => playVocabularyItem(currentItem)}
              style={[styles.audioPill, { backgroundColor: (category.color || Colors.skyBlue) + '18' }]}
            >
              <Ionicons name="volume-high" size={18} color={category.color || Colors.skyBlueDark} />
              <Text style={[styles.audioPillText, { color: category.color || Colors.skyBlueDark }]}>
                Pakinggan
              </Text>
            </PressableScale>
          )}

          {/* Counter Badge */}
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>
              {currentIndex + 1} / {items.length}
            </Text>
          </View>
        </Animated.View>

        {/* Progress Dots (showing a window of 7 dots centered around current) */}
        <View style={styles.dotsRow}>
          {items.slice(0, 15).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex
                  ? [styles.activeDot, { backgroundColor: category.color || Colors.skyBlueDark }]
                  : styles.inactiveDot,
              ]}
            />
          ))}
          {items.length > 15 && <Text style={styles.moreDotsText}>•••</Text>}
        </View>

        {/* Navigation Controls: Previous & Next with Icon Buttons */}
        <View style={styles.controlsRow}>
          <PressableScale
            onPress={handlePrev}
            disabled={isFirst}
            style={[
              styles.navButton,
              styles.prevButton,
              isFirst && styles.disabledButton,
              Shadows.subtle,
            ]}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={isFirst ? Colors.textMuted : Colors.text}
            />
            <Text style={[styles.navButtonText, isFirst && styles.disabledText]}>
              Nakaraan
            </Text>
          </PressableScale>

          <PressableScale
            onPress={handleNext}
            disabled={isLast}
            style={[
              styles.navButton,
              styles.nextButton,
              isLast && styles.disabledButton,
              Shadows.colored(Colors.skyBlueDark, 0.2),
            ]}
          >
            <LinearGradient
              colors={isLast ? ['#CBD5E1', '#94A3B8'] : Gradients.sky}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={[styles.nextButtonText, isLast && styles.disabledText]}>
              Susunod
            </Text>
            <Ionicons
              name="chevron-forward"
              size={22}
              color={Colors.white}
            />
          </PressableScale>
        </View>
      </View>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  flashcard: {
    width: CARD_SIZE,
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    padding: 24,
    alignItems: 'center',
    position: 'relative',
  },
  visualContainer: {
    marginBottom: 16,
  },
  filipinoName: {
    fontSize: 32,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    textAlign: 'center',
    textTransform: 'lowercase',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  englishName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 16,
  },
  audioContainer: {
    marginBottom: 16,
  },
  audioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    marginBottom: 16,
    gap: 6,
  },
  audioPillText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  counterBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  counterText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.textLight,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    marginBottom: 8,
    gap: 5,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  activeDot: {
    width: 20,
  },
  inactiveDot: {
    width: 7,
    backgroundColor: '#CBD5E1',
  },
  moreDotsText: {
    color: Colors.textMuted,
    fontSize: 10,
    marginLeft: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: CARD_SIZE,
    marginTop: 16,
    gap: 14,
  },
  navButton: {
    flex: 1,
    height: 52,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: 6,
  },
  prevButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  nextButton: {
    position: 'relative',
  },
  disabledButton: {
    opacity: 0.45,
  },
  navButtonText: {
    color: Colors.text,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  nextButtonText: {
    color: Colors.white,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  disabledText: {
    color: Colors.textMuted,
  },
});
