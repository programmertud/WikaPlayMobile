import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/utils/haptics';
import { Colors, Shadows, Typography, Radius } from '@/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Glowing vibrant fireworks color palettes
const FIREWORK_PALETTES = [
  ['#FFD700', '#FFA500', '#FFF8DC', '#F59E0B'], // Gold / Sun burst
  ['#00F0FF', '#3B82F6', '#60A5FA', '#E0F2FE'], // Electric Blue / Cyan
  ['#FF1493', '#EC4899', '#F43F5E', '#FFE4E6'], // Neon Pink / Rose
  ['#10B981', '#34D399', '#A7F3D0', '#059669'], // Emerald / Mint
  ['#A855F7', '#C084FC', '#E9D5FF', '#7C3AED'], // Royal Purple / Violet
  ['#FF4500', '#FB923C', '#FED7AA', '#EA580C'], // Radiant Sunset / Coral
];

interface SparkProps {
  angle: number;
  distance: number;
  color: string;
  size: number;
  isStar?: boolean;
  delay: number;
}

function FireworkSpark({ angle, distance, color, size, isStar, delay }: SparkProps) {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    opacity.value = 0;

    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 80 }),
        withDelay(450, withTiming(0, { duration: 400 }))
      )
    );

    progress.value = withDelay(
      delay,
      withTiming(1, {
        duration: 850,
        easing: Easing.bezier(0.15, 0.85, 0.35, 1),
      })
    );
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const currentDist = distance * p;
    // Radial explosion with downward gravity curve
    const x = Math.cos(angle) * currentDist;
    const y = Math.sin(angle) * currentDist + 35 * (p * p);

    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { scale: isStar ? (1 - p * 0.4) : (1 - p * 0.5) },
      ],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View style={[styles.sparkWrap, animatedStyle]}>
      {isStar ? (
        <Ionicons name="sparkles" size={size * 1.8} color={color} />
      ) : (
        <View
          style={[
            styles.sparkCircle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color,
              shadowColor: color,
            },
          ]}
        />
      )}
    </Animated.View>
  );
}

interface BurstConfig {
  x: number;
  y: number;
  palette: string[];
  delay: number;
  sparksCount: number;
}

function FireworkBurst({ x, y, palette, delay, sparksCount }: BurstConfig) {
  const flashScale = useSharedValue(0);
  const flashOpacity = useSharedValue(0);
  const rocketY = useSharedValue(SCREEN_HEIGHT * 0.8);
  const rocketOpacity = useSharedValue(1);

  useEffect(() => {
    // Rocket ascent animation
    rocketY.value = SCREEN_HEIGHT * 0.8;
    rocketOpacity.value = 1;

    rocketY.value = withDelay(
      Math.max(0, delay - 300),
      withTiming(y, { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
    );

    rocketOpacity.value = withDelay(
      Math.max(0, delay - 60),
      withTiming(0, { duration: 80 })
    );

    // Flash ring explosion
    flashScale.value = 0;
    flashOpacity.value = 0;

    flashOpacity.value = withDelay(
      delay,
      withSequence(
        withTiming(0.9, { duration: 60 }),
        withTiming(0, { duration: 250 })
      )
    );

    flashScale.value = withDelay(
      delay,
      withTiming(2.2, { duration: 320, easing: Easing.out(Easing.quad) })
    );
  }, [delay, y]);

  const flashAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flashScale.value }],
    opacity: flashOpacity.value,
  }));

  const rocketAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: rocketY.value }],
    opacity: rocketOpacity.value,
  }));

  const sparks = Array.from({ length: sparksCount }).map((_, i) => {
    const angle = (Math.PI * 2 * i) / sparksCount + (Math.random() - 0.5) * 0.25;
    const distance = 45 + Math.random() * 75;
    const color = palette[i % palette.length];
    const size = 5 + (i % 3) * 2;
    const isStar = i % 4 === 0;

    return (
      <FireworkSpark
        key={i}
        angle={angle}
        distance={distance}
        color={color}
        size={size}
        isStar={isStar}
        delay={delay}
      />
    );
  });

  return (
    <View style={[styles.burstContainer, { left: x, top: y }]} pointerEvents="none">
      {/* Rocket trail shooting up */}
      <Animated.View style={[styles.rocketTrail, rocketAnimatedStyle]} />

      {/* Center explosion flash ring */}
      <Animated.View
        style={[
          styles.flashRing,
          { borderColor: palette[0], shadowColor: palette[0] },
          flashAnimatedStyle,
        ]}
      />

      {/* Radiating sparks */}
      {sparks}
    </View>
  );
}

// Ambient floating shimmer sparkles
function AmbientStar({ index }: { index: number }) {
  const startX = Math.random() * SCREEN_WIDTH;
  const startY = Math.random() * (SCREEN_HEIGHT * 0.6);
  const opacity = useSharedValue(0.2);
  const translateY = useSharedValue(startY);

  useEffect(() => {
    opacity.value = withDelay(
      index * 120,
      withRepeat(
        withSequence(
          withTiming(0.9, { duration: 700 }),
          withTiming(0.15, { duration: 700 })
        ),
        -1,
        true
      )
    );

    translateY.value = withDelay(
      index * 100,
      withRepeat(
        withSequence(
          withTiming(startY + 40, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
          withTiming(startY, { duration: 1800, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    );
  }, [index, startY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const size = 10 + (index % 3) * 4;
  const color = FIREWORK_PALETTES[index % FIREWORK_PALETTES.length][0];

  return (
    <Animated.View
      style={[
        styles.ambientStar,
        { left: startX },
        animatedStyle,
      ]}
    >
      <Ionicons name="sparkles" size={size} color={color} />
    </Animated.View>
  );
}

export interface FireworksOverlayProps {
  /**
   * Whether the fireworks overlay is actively displaying.
   */
  visible: boolean;
  /**
   * Optional score display (e.g. 15–20)
   */
  score?: number;
  /**
   * Optional title banner (e.g. "Pambihirang Tagumpay!")
   */
  bannerText?: string;
}

export function FireworksOverlay({
  visible,
  score,
  bannerText,
}: FireworksOverlayProps) {
  const [cycleKey, setCycleKey] = useState(0);

  useEffect(() => {
    if (!visible) return;

    // Trigger subtle success haptics for the fireworks show
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    // Loop fireworks burst wave every 3.2 seconds
    const interval = setInterval(() => {
      setCycleKey((k) => k + 1);
    }, 3200);

    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  // Staggered firework locations covering top and mid areas
  const bursts: BurstConfig[] = [
    {
      x: SCREEN_WIDTH * 0.22,
      y: SCREEN_HEIGHT * 0.22,
      palette: FIREWORK_PALETTES[0], // Gold
      delay: 50,
      sparksCount: 20,
    },
    {
      x: SCREEN_WIDTH * 0.78,
      y: SCREEN_HEIGHT * 0.28,
      palette: FIREWORK_PALETTES[1], // Cyan
      delay: 450,
      sparksCount: 22,
    },
    {
      x: SCREEN_WIDTH * 0.5,
      y: SCREEN_HEIGHT * 0.16,
      palette: FIREWORK_PALETTES[2], // Neon Pink
      delay: 950,
      sparksCount: 24,
    },
    {
      x: SCREEN_WIDTH * 0.28,
      y: SCREEN_HEIGHT * 0.38,
      palette: FIREWORK_PALETTES[3], // Emerald
      delay: 1450,
      sparksCount: 18,
    },
    {
      x: SCREEN_WIDTH * 0.72,
      y: SCREEN_HEIGHT * 0.36,
      palette: FIREWORK_PALETTES[4], // Royal Purple
      delay: 1950,
      sparksCount: 20,
    },
    {
      x: SCREEN_WIDTH * 0.5,
      y: SCREEN_HEIGHT * 0.26,
      palette: FIREWORK_PALETTES[5], // Coral Sunset
      delay: 2450,
      sparksCount: 26,
    },
  ];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Ambient twinkling stars */}
      {Array.from({ length: 16 }).map((_, i) => (
        <AmbientStar key={`star-${i}`} index={i} />
      ))}

      {/* Timed firework bursts */}
      <View key={`fireworks-cycle-${cycleKey}`} style={StyleSheet.absoluteFill} pointerEvents="none">
        {bursts.map((burst, idx) => (
          <FireworkBurst
            key={`burst-${idx}`}
            x={burst.x}
            y={burst.y}
            palette={burst.palette}
            delay={burst.delay}
            sparksCount={burst.sparksCount}
          />
        ))}
      </View>

      {/* Optional Top Floating Fireworks Banner */}
      {bannerText || (score !== undefined && score >= 15 && score <= 20) ? (
        <View style={styles.bannerWrapper}>
          <View style={[styles.bannerPill, Shadows.button]}>
            <Text style={styles.bannerEmoji}>🎆</Text>
            <Text style={styles.bannerText}>
              {bannerText ?? `Pambihirang Puntos! ${score}/20 ⭐`}
            </Text>
            <Text style={styles.bannerEmoji}>🎇</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  burstContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 0,
    height: 0,
  },
  rocketTrail: {
    position: 'absolute',
    width: 3,
    height: 18,
    borderRadius: 2,
    backgroundColor: '#FFF59D',
    shadowColor: '#F59E0B',
    shadowRadius: 8,
    shadowOpacity: 0.9,
    elevation: 4,
  },
  flashRing: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 16,
    elevation: 6,
  },
  sparkWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkCircle: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  ambientStar: {
    position: 'absolute',
    top: 0,
  },
  bannerWrapper: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  bannerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: Radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  bannerEmoji: {
    fontSize: 18,
  },
  bannerText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: '#FEF3C7',
    letterSpacing: 0.5,
  },
});
