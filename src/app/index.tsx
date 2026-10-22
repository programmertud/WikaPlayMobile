import { Redirect, router } from 'expo-router';
import { USE_NATIVE_DRIVER } from '../utils/platform';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { PressableScale } from '../components/PressableScale';
import { useAuth } from '../hooks/use-auth';
import { Colors, Gradients, Shadows, Typography, Radius } from '../theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── Animated splash shown while session is being restored ────────────────────
function SplashScreen() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 900, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: USE_NATIVE_DRIVER }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={splash.container}>
      <LinearGradient
        colors={Gradients.sky}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[splash.logoCircle, Shadows.card, { transform: [{ scale: pulse }] }]}>
        <Ionicons name="sparkles" size={54} color={Colors.sunYellowDark} />
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 20,
  },
  brandTitle: {
    fontSize: Typography.sizes.hero,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
    letterSpacing: 0.8,
  },
  tagline: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: 'rgba(255, 255, 255, 0.92)',
    marginTop: 6,
    textAlign: 'center',
  },
  spinner: { marginTop: 36 },
});

// ── Floating decoration ───────────────────────────────────────────────────────
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
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
        Animated.timing(floatY, {
          toValue: amplitude,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: USE_NATIVE_DRIVER,
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

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: USE_NATIVE_DRIVER }),
        Animated.timing(logoSlide, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: USE_NATIVE_DRIVER,
        }),
      ]),
      Animated.timing(titleOpacity, { toValue: 1, duration: 500, delay: 80, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(descOpacity, { toValue: 1, duration: 500, delay: 80, useNativeDriver: USE_NATIVE_DRIVER }),
      Animated.timing(btnOpacity, { toValue: 1, duration: 400, useNativeDriver: USE_NATIVE_DRIVER }),
    ]).start();
  }, [logoOpacity, logoSlide, titleOpacity, descOpacity, btnOpacity]);

  const handleMagsimula = useCallback(() => {
    if (navigating) return;
    setNavigating(true);
    router.push('/login');
  }, [navigating]);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#38BDF8', '#0284C7', '#0369A1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Floating clouds, stars, elements */}
      <FloatingDecor emoji="☁️" size={42} x={-10} y={SCREEN_H * 0.08} duration={3200} delay={0} amplitude={10} />
      <FloatingDecor emoji="☁️" size={28} x={SCREEN_W * 0.62} y={SCREEN_H * 0.05} duration={2800} delay={400} amplitude={8} />
      <FloatingDecor emoji="☁️" size={36} x={SCREEN_W * 0.3} y={SCREEN_H * 0.14} duration={3600} delay={200} amplitude={12} />
      <FloatingDecor emoji="⭐" size={22} x={SCREEN_W * 0.08} y={SCREEN_H * 0.22} duration={2200} delay={100} amplitude={9} />
      <FloatingDecor emoji="✨" size={20} x={SCREEN_W * 0.82} y={SCREEN_H * 0.18} duration={2600} delay={300} amplitude={7} />
      <FloatingDecor emoji="⭐" size={18} x={SCREEN_W * 0.55} y={SCREEN_H * 0.25} duration={3000} delay={600} amplitude={10} />

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
          <Ionicons name="sparkles" size={54} color={Colors.sunYellowDark} />
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

        {/* Feature pill */}
        <Animated.View style={[styles.bookPill, { opacity: descOpacity }]}>
          <Ionicons name="book" size={18} color={Colors.white} />
          <Text style={styles.bookPillLabel}>Flashcards · Quizzes · Mini-Games</Text>
        </Animated.View>

        {/* Magsimula button */}
        <Animated.View style={{ opacity: btnOpacity, width: '100%', maxWidth: 320 }}>
          <PressableScale
            onPress={handleMagsimula}
            disabled={navigating}
            style={[styles.magsimulaBtn, Shadows.card]}
            accessibilityRole="button"
            accessibilityLabel="Magsimula — Pumunta sa login"
          >
            <LinearGradient
              colors={Gradients.sun}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.magsimulaGradient}
            >
              <Text style={styles.magsimulaBtnText}>Magsimula</Text>
              <Ionicons name="arrow-forward" size={22} color="#78350F" />
            </LinearGradient>
          </PressableScale>
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
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  floatDecor: {
    position: 'absolute',
    zIndex: 1,
  },
  contentWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    zIndex: 10,
  },
  logoBadge: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 16,
  },
  appName: {
    fontSize: 40,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
    letterSpacing: 1,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: Typography.sizes.xxl,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 34,
    marginBottom: 8,
  },
  heroDesc: {
    fontSize: Typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.92)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  bookPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: Radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    gap: 8,
  },
  bookPillLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  magsimulaBtn: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginBottom: 16,
  },
  magsimulaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 10,
  },
  magsimulaBtnText: {
    fontSize: 20,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: '#78350F',
    letterSpacing: 0.5,
  },
  footerTagline: {
    fontSize: Typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
  },
});
