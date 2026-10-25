/**
 * AnimatedBackground
 * ──────────────────
 * Full-screen background using bg.png with many animated floating
 * emoji elements: clouds, stars, books, fruits, and numbers.
 *
 * Usage:
 *   <AnimatedBackground>
 *     {your screen content here}
 *   </AnimatedBackground>
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  StyleSheet,
  View,
  type ViewStyle,
  type StyleProp,
} from 'react-native';

const BG_IMAGE = require('../../assets/images/bg.png');

const { width: W, height: H } = Dimensions.get('window');

// ─── Floating element definitions ────────────────────────────────────────────

interface FloatConfig {
  emoji: string;
  size: number;
  x: number;        // 0-1 fraction of screen width
  y: number;        // 0-1 fraction of screen height
  duration: number;
  delay: number;
  amplitude: number; // vertical float distance in px
  opacity: number;
}

const FLOAT_ITEMS: FloatConfig[] = [
  // Clouds
  { emoji: '☁️', size: 40, x: 0.05, y: 0.04,  duration: 4200, delay: 0,    amplitude: 10, opacity: 0.70 },
  { emoji: '☁️', size: 32, x: 0.70, y: 0.07,  duration: 5000, delay: 600,  amplitude: 8,  opacity: 0.60 },
  { emoji: '🌤️', size: 28, x: 0.45, y: 0.02,  duration: 4600, delay: 1200, amplitude: 9,  opacity: 0.55 },
  { emoji: '☁️', size: 36, x: 0.15, y: 0.20,  duration: 5400, delay: 800,  amplitude: 12, opacity: 0.45 },
  { emoji: '☁️', size: 24, x: 0.80, y: 0.28,  duration: 3800, delay: 1600, amplitude: 7,  opacity: 0.40 },
  { emoji: '⛅', size: 30, x: 0.55, y: 0.15,  duration: 4800, delay: 400,  amplitude: 10, opacity: 0.50 },

  // Stars
  { emoji: '⭐', size: 22, x: 0.88, y: 0.05,  duration: 2800, delay: 200,  amplitude: 14, opacity: 0.85 },
  { emoji: '⭐', size: 18, x: 0.32, y: 0.10,  duration: 3200, delay: 900,  amplitude: 12, opacity: 0.80 },
  { emoji: '✨', size: 16, x: 0.60, y: 0.23,  duration: 2400, delay: 1400, amplitude: 10, opacity: 0.70 },
  { emoji: '🌟', size: 20, x: 0.10, y: 0.35,  duration: 3600, delay: 300,  amplitude: 13, opacity: 0.65 },
  { emoji: '⭐', size: 14, x: 0.75, y: 0.42,  duration: 2600, delay: 1800, amplitude: 9,  opacity: 0.60 },
  { emoji: '✨', size: 18, x: 0.40, y: 0.50,  duration: 3000, delay: 700,  amplitude: 11, opacity: 0.55 },
  { emoji: '⭐', size: 16, x: 0.92, y: 0.55,  duration: 2900, delay: 1100, amplitude: 8,  opacity: 0.50 },

  // Books
  { emoji: '📚', size: 24, x: 0.85, y: 0.35,  duration: 4000, delay: 500,  amplitude: 12, opacity: 0.75 },
  { emoji: '📖', size: 20, x: 0.20, y: 0.45,  duration: 4400, delay: 1300, amplitude: 10, opacity: 0.65 },
  { emoji: '📝', size: 18, x: 0.65, y: 0.52,  duration: 3700, delay: 1000, amplitude: 9,  opacity: 0.60 },
  { emoji: '📚', size: 22, x: 0.05, y: 0.60,  duration: 4200, delay: 200,  amplitude: 11, opacity: 0.55 },

  // Fruits
  { emoji: '🍎', size: 22, x: 0.78, y: 0.60,  duration: 3900, delay: 600,  amplitude: 13, opacity: 0.75 },
  { emoji: '🍊', size: 20, x: 0.35, y: 0.65,  duration: 4300, delay: 1500, amplitude: 11, opacity: 0.70 },
  { emoji: '🍇', size: 24, x: 0.55, y: 0.70,  duration: 3600, delay: 800,  amplitude: 10, opacity: 0.65 },
  { emoji: '🍌', size: 22, x: 0.12, y: 0.72,  duration: 4100, delay: 1200, amplitude: 12, opacity: 0.60 },
  { emoji: '🍓', size: 18, x: 0.90, y: 0.68,  duration: 3500, delay: 400,  amplitude: 9,  opacity: 0.65 },
  { emoji: '🍑', size: 20, x: 0.48, y: 0.38,  duration: 4500, delay: 1700, amplitude: 10, opacity: 0.55 },

  // Numbers
  { emoji: '1️⃣',  size: 22, x: 0.25, y: 0.30,  duration: 3800, delay: 300,  amplitude: 12, opacity: 0.65 },
  { emoji: '2️⃣',  size: 20, x: 0.70, y: 0.48,  duration: 4200, delay: 1000, amplitude: 10, opacity: 0.60 },
  { emoji: '3️⃣',  size: 22, x: 0.42, y: 0.58,  duration: 3400, delay: 700,  amplitude: 11, opacity: 0.55 },
  { emoji: '4️⃣',  size: 18, x: 0.82, y: 0.75,  duration: 4600, delay: 1400, amplitude: 9,  opacity: 0.50 },
  { emoji: '5️⃣',  size: 20, x: 0.15, y: 0.82,  duration: 4000, delay: 200,  amplitude: 13, opacity: 0.55 },
];

// ─── Single floating item ────────────────────────────────────────────────────

function FloatingEmoji({ cfg }: { cfg: FloatConfig }) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -cfg.amplitude,
          duration: cfg.duration,
          delay: cfg.delay,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: cfg.amplitude,
          duration: cfg.duration,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [translateY, cfg.duration, cfg.delay, cfg.amplitude]);

  return (
    <Animated.Text
      style={[
        styles.floatingEmoji,
        {
          fontSize: cfg.size,
          left: cfg.x * W,
          top: cfg.y * H,
          opacity: cfg.opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {cfg.emoji}
    </Animated.Text>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface AnimatedBackgroundProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Overlay opacity on top of bg image so content remains readable (0-1, default 0.30) */
  overlayOpacity?: number;
  /** Overlay color (default white) */
  overlayColor?: string;
}

export function AnimatedBackground({
  children,
  style,
  overlayOpacity = 0.30,
  overlayColor = '#FFFFFF',
}: AnimatedBackgroundProps) {
  return (
    <View style={[styles.root, style]}>
      {/* Background image */}
      <Image
        source={BG_IMAGE}
        style={styles.bgImage}
        resizeMode="cover"
        pointerEvents="none"
      />

      {/* Semi-transparent overlay so text/cards stay readable */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: overlayColor, opacity: overlayOpacity },
        ]}
      />

      {/* Floating animated emoji elements */}
      {FLOAT_ITEMS.map((cfg, idx) => (
        <FloatingEmoji key={idx} cfg={cfg} />
      ))}

      {/* Screen content */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  floatingEmoji: {
    position: 'absolute',
    zIndex: 1,
    ...Platform.select({
      web: { userSelect: 'none' } as any,
    }),
  },
  content: {
    flex: 1,
    zIndex: 10,
  },
});
