import React, { useEffect, useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Colors } from '@/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = [
  Colors.sunYellow,
  Colors.sunYellowDark,
  Colors.skyBlue,
  Colors.skyBlueDark,
  Colors.coralPink,
  Colors.coralPinkDark,
  Colors.grassGreen,
  Colors.grassGreenDark,
  Colors.vibrantPurple,
  Colors.vibrantOrange,
  '#F59E0B', // Bright Amber
  '#10B981', // Emerald
  '#EC4899', // Hot Pink
  '#06B6D4', // Cyan
  '#8B5CF6', // Purple
  '#EF4444', // Red
];

interface ParticleConfig {
  id: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  peakY: number;
  size: number;
  isCircle: boolean;
  color: string;
  rotation: number;
  delay: number;
  duration: number;
}

function ConfettiPiece({ config }: { config: ParticleConfig }) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    progress.value = withDelay(
      config.delay,
      withTiming(1, {
        duration: config.duration,
        easing: Easing.bezier(0.2, 0.8, 0.25, 1),
      })
    );

    opacity.value = withDelay(
      config.delay + config.duration * 0.65,
      withTiming(0, {
        duration: config.duration * 0.35,
        easing: Easing.linear,
      })
    );
  }, [config]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;

    // Upward launch arc then downward drift
    // In first half (0 to 0.4), move from startY up to peakY
    // In second half (0.4 to 1), fall from peakY down to targetY
    let currentY: number;
    if (p < 0.4) {
      const upwardProgress = p / 0.4;
      currentY = config.startY + (config.peakY - config.startY) * Math.sin(upwardProgress * (Math.PI / 2));
    } else {
      const downwardProgress = (p - 0.4) / 0.6;
      currentY = config.peakY + (config.targetY - config.peakY) * (downwardProgress * downwardProgress);
    }

    const currentX = config.startX + (config.targetX - config.startX) * p;
    const currentRot = config.rotation * p;

    return {
      transform: [
        { translateX: currentX },
        { translateY: currentY },
        { rotate: `${currentRot}deg` },
        { scale: 1 - p * 0.2 },
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          width: config.size,
          height: config.isCircle ? config.size : config.size * 1.6,
          borderRadius: config.isCircle ? config.size / 2 : 2,
          backgroundColor: config.color,
        },
        animatedStyle,
      ]}
    />
  );
}

interface CorrectAnswerConfettiProps {
  /**
   * Counter that increments on every correct answer.
   * When this value changes (and > 0), a new burst is triggered.
   */
  trigger: number;
  /**
   * Optional custom particle count (default: 32)
   */
  count?: number;
}

export function CorrectAnswerConfetti({ trigger, count = 32 }: CorrectAnswerConfettiProps) {
  // Generate random particle parameters for this burst instance
  const particles = useMemo<ParticleConfig[]>(() => {
    if (trigger <= 0) return [];

    const originX = SCREEN_WIDTH * 0.5;
    const originY = SCREEN_HEIGHT * 0.42;

    return Array.from({ length: count }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
      // Spread outwards with bias upwards
      const distance = 80 + Math.random() * 180;
      const targetX = originX + Math.cos(angle) * distance + (Math.random() - 0.5) * 50;
      const upwardBoost = 100 + Math.random() * 140;
      const peakY = originY - upwardBoost;
      const targetY = originY + 120 + Math.random() * 180;

      return {
        id: i,
        startX: originX + (Math.random() - 0.5) * 40,
        startY: originY + (Math.random() - 0.5) * 20,
        targetX,
        targetY,
        peakY,
        size: 7 + (i % 5) * 2,
        isCircle: i % 3 === 0,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotation: (Math.random() - 0.5) * 720,
        delay: Math.random() * 80,
        duration: 900 + Math.random() * 400,
      };
    });
  }, [trigger, count]);

  if (trigger <= 0 || particles.length === 0) {
    return null;
  }

  return (
    <View key={`confetti-burst-${trigger}`} style={styles.container} pointerEvents="none">
      {particles.map((p) => (
        <ConfettiPiece key={p.id} config={p} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    elevation: 9999,
  },
  piece: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
