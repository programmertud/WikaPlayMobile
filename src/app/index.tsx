import { Redirect, router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../hooks/use-auth';
import { Colors, Shadows, Typography } from '../theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── Animated splash shown while session is being restored ────────────────────
function SplashScreen() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={splash.container}>
      <Animated.View style={[splash.logoCircle, Shadows.card, { transform: [{ scale: pulse }] }]}>
        <Text style={splash.sunEmoji}>☀️</Text>
        <Text style={splash.bookEmoji}>📖</Text>
      </Animated.View>
      <Text style={splash.brandTitle}>WikaPlay</Text>
      <Text style={splash.tagline}>Masayang Pagkatuto ng Wikang Filipino</Text>
      <ActivityIndicator size="large" color={Colors.white} style={splash.spinner} />
    </View>
  );
}

const splash = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.skyBlue,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: 'rgba(255,255,255,0.8)',
    marginBottom: 20,
    flexDirection: 'row',
  },
  sunEmoji: { fontSize: 48, marginRight: -10 },
  bookEmoji: { fontSize: 44 },
  brandTitle: {
    fontSize: Typography.sizes.hero,
    fontWeight: Typography.weights.heavy,
    color: Colors.white,
    letterSpacing: 1.2,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  tagline: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: 'rgba(255,255,255,0.95)',
    marginTop: 8,
    textAlign: 'center',
  },
  spinner: { marginTop: 36 },
});

// ── Floating decoration (cloud / star / animal) ───────────────────────────────
interface FloatingDecorProps {
  emoji: string;
  size: number;
  x: number;
  y: number;
  duration: number;
  delay: number;
  amplitude: number;
}

function FloatingDecor({ emoji, size, x, y, duration, delay, amplitude }: FloatingDecorProps) {
  const floatY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {
          toValue: -amplitude,
          duration,
          delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatY, {
          toValue: amplitude,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [floatY, duration, delay, amplitude]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.floatDecor, { left: x, top: y, transform: [{ translateY: floatY }] }]}
    >
      <Text style={{ fontSize: size }}>{emoji}</Text>
    </Animated.View>
  );
}

// ── Animated Welcome Intro Screen ─────────────────────────────────────────────
function WelcomeScreen() {
  const [navigating, setNavigating] = useState(false);

  // Entrance animation values
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoSlide = useRef(new Animated.Value(40)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const descOpacity = useRef(new Animated.Value(0)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(0.88)).current;

  // Button press feedback
  const pressAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(logoSlide, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(titleOpacity, { toValue: 1, duration: 500, delay: 80, useNativeDriver: true }),
      Animated.timing(descOpacity, { toValue: 1, duration: 500, delay: 80, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(btnOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(btnScale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
      ]),
    ]).start();
  }, [logoOpacity, logoSlide, titleOpacity, descOpacity, btnOpacity, btnScale]);

  const onPressIn = () =>
    Animated.spring(pressAnim, { toValue: 0.94, useNativeDriver: true, friction: 8 }).start();
  const onPressOut = () =>
    Animated.spring(pressAnim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();

  const handleMagsimula = useCallback(() => {
    if (navigating) return;
    setNavigating(true);
    router.push('/login');
  }, [navigating]);

  return (
    <View style={styles.container}>
      {/* Layered sky background */}
      <View style={styles.skyTop} />
      <View style={styles.skyBottom} />

      {/* Grass strip */}
      <View style={styles.grassStrip}>
        <View style={styles.grassWave1} />
        <View style={styles.grassWave2} />
      </View>

      {/* Floating clouds, stars, animals */}
      <FloatingDecor emoji="☁️" size={42} x={-10} y={SCREEN_H * 0.08} duration={3200} delay={0} amplitude={10} />
      <FloatingDecor emoji="☁️" size={28} x={SCREEN_W * 0.62} y={SCREEN_H * 0.05} duration={2800} delay={400} amplitude={8} />
      <FloatingDecor emoji="☁️" size={36} x={SCREEN_W * 0.3} y={SCREEN_H * 0.15} duration={3600} delay={200} amplitude={12} />
      <FloatingDecor emoji="⭐" size={22} x={SCREEN_W * 0.07} y={SCREEN_H * 0.22} duration={2200} delay={100} amplitude={9} />
      <FloatingDecor emoji="✨" size={18} x={SCREEN_W * 0.8} y={SCREEN_H * 0.18} duration={2600} delay={300} amplitude={7} />
      <FloatingDecor emoji="⭐" size={16} x={SCREEN_W * 0.55} y={SCREEN_H * 0.26} duration={3000} delay={600} amplitude={10} />
      <FloatingDecor emoji="🐤" size={30} x={SCREEN_W * 0.05} y={SCREEN_H * 0.67} duration={2900} delay={150} amplitude={8} />
      <FloatingDecor emoji="🦋" size={26} x={SCREEN_W * 0.76} y={SCREEN_H * 0.64} duration={3300} delay={250} amplitude={11} />
      <FloatingDecor emoji="🌻" size={28} x={SCREEN_W * 0.83} y={SCREEN_H * 0.72} duration={2700} delay={500} amplitude={6} />

      {/* Sunshine */}
      <View style={styles.sunContainer} pointerEvents="none">
        <Text style={styles.sunEmoji}>☀️</Text>
      </View>

      {/* Main content */}
      <View style={styles.contentWrapper}>
        {/* Logo badge */}
        <Animated.View
          style={[
            styles.logoBadge,
            Shadows.card,
            { opacity: logoOpacity, transform: [{ translateY: logoSlide }] },
          ]}
        >
          <Text style={styles.logoSun}>☀️</Text>
          <Text style={styles.logoBook}>📖</Text>
        </Animated.View>

        {/* App name */}
        <Animated.Text style={[styles.appName, { opacity: logoOpacity }]}>
          WikaPlay
        </Animated.Text>

        {/* Hero headline */}
        <Animated.Text style={[styles.heroTitle, { opacity: titleOpacity }]}>
          Tara, Matuto at Maglaro!
        </Animated.Text>

        {/* Description */}
        <Animated.Text style={[styles.heroDesc, { opacity: descOpacity }]}>
          Tuklasin ang mga salita, larawan, at masasayang laro sa wikang Filipino.
        </Animated.Text>

        {/* Open-book pill */}
        <Animated.View style={[styles.bookPill, { opacity: descOpacity }]}>
          <Text style={styles.bookPillEmoji}>📚</Text>
          <Text style={styles.bookPillLabel}>Aralin · Laruan · Laro</Text>
        </Animated.View>

        {/* Magsimula button */}
        <Animated.View
          style={{
            opacity: btnOpacity,
            transform: [{ scale: Animated.multiply(btnScale, pressAnim) }],
            width: '100%',
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={handleMagsimula}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            disabled={navigating}
            style={[styles.magsimulaBtnOuter, Shadows.card]}
            accessibilityRole="button"
            accessibilityLabel="Magsimula — Pumunta sa login"
          >
            <View style={styles.magsimulaBtnInner}>
              <Text style={styles.magsimulaBtnEmoji}>🚀</Text>
              <Text style={styles.magsimulaBtnText}>Magsimula</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        <Animated.Text style={[styles.footerTagline, { opacity: btnOpacity }]}>
          Para sa mga bata sa Kindergarten 🌟
        </Animated.Text>
      </View>
    </View>
  );
}

// ── Root Gateway ──────────────────────────────────────────────────────────────
export default function IndexGateway() {
  const { user, isLoading, isAuthenticated, isTeacher } = useAuth();

  if (isLoading) return <SplashScreen />;

  if (isAuthenticated && user) {
    if (isTeacher) return <Redirect href="/(teacher)" />;
    return <Redirect href="/(student)/(tabs)" />;
  }

  return <WelcomeScreen />;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#56B8F5', overflow: 'hidden' },

  skyTop: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: SCREEN_H * 0.65, backgroundColor: '#56B8F5',
  },
  skyBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: SCREEN_H * 0.38, backgroundColor: '#AEE6FF',
    borderTopLeftRadius: 60, borderTopRightRadius: 60,
  },

  grassStrip: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 72, backgroundColor: '#68CC91',
    borderTopLeftRadius: 50, borderTopRightRadius: 50,
  },
  grassWave1: {
    position: 'absolute', top: -18, left: -20,
    width: SCREEN_W * 0.55, height: 40,
    backgroundColor: '#7DD8A0', borderRadius: 99,
  },
  grassWave2: {
    position: 'absolute', top: -14, right: -10,
    width: SCREEN_W * 0.45, height: 36,
    backgroundColor: '#56C278', borderRadius: 99,
  },

  floatDecor: { position: 'absolute', zIndex: 1 },

  sunContainer: { position: 'absolute', top: SCREEN_H * 0.03, right: 24, zIndex: 2 },
  sunEmoji: { fontSize: 52 },

  contentWrapper: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 28, paddingBottom: 80, zIndex: 10,
  },

  logoBadge: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: Colors.white,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 6, borderColor: 'rgba(255,255,255,0.9)',
    flexDirection: 'row', marginBottom: 12,
  },
  logoSun: { fontSize: 46, marginRight: -8 },
  logoBook: { fontSize: 42 },

  appName: {
    fontSize: 38, fontWeight: '900', color: Colors.white,
    letterSpacing: 1.5, marginBottom: 12,
    textShadowColor: 'rgba(0,70,130,0.3)',
    textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6,
  },

  heroTitle: {
    fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.heavy,
    color: Colors.white, textAlign: 'center', lineHeight: 36,
    marginBottom: 8,
    textShadowColor: 'rgba(0,60,120,0.25)',
    textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },

  heroDesc: {
    fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold,
    color: 'rgba(255,255,255,0.95)', textAlign: 'center',
    lineHeight: 22, marginBottom: 20, paddingHorizontal: 8,
  },

  bookPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 24, paddingVertical: 12, paddingHorizontal: 20,
    marginBottom: 28, borderWidth: 2, borderColor: 'rgba(255,255,255,0.45)',
    gap: 10,
  },
  bookPillEmoji: { fontSize: 32 },
  bookPillLabel: {
    fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold,
    color: 'rgba(255,255,255,0.95)', letterSpacing: 0.4,
  },

  magsimulaBtnOuter: {
    borderRadius: 28, overflow: 'hidden',
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.9)',
    marginBottom: 16,
  },
  magsimulaBtnInner: {
    backgroundColor: '#FFD166',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 18, paddingHorizontal: 32, gap: 10,
  },
  magsimulaBtnEmoji: { fontSize: 24 },
  magsimulaBtnText: {
    fontSize: 22, fontWeight: '900', color: '#78350F', letterSpacing: 0.6,
  },

  footerTagline: {
    fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold,
    color: 'rgba(255,255,255,0.85)', textAlign: 'center',
  },
});
