import { Redirect, router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/utils/haptics';

import { PressableScale } from '../components/PressableScale';
import { useAuth } from '../hooks/use-auth';
import { Colors, Gradients, Radius, Shadows, Typography } from '../theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── Rotating Friendly Greetings (Section 4.B) ─────────────────────────────────
const FRIENDLY_GREETINGS = [
  "Halina't matuto, maglaro, at mangolekta ng mga bituin!",
  'Handa ka na bang matuto at maglaro?',
  'Tara na! Sama-sama tayong matuto!',
  'Bawat laro, bagong kaalaman!',
  'Tuklasin ang saya ng pagkatuto!',
];

// ── Floating Decorative Elements (Section 4.C) ────────────────────────────────
interface FloatingItemProps {
  emoji: string;
  size: number;
  x: number;
  y: number;
  duration?: number;
  delay?: number;
  amplitude?: number;
}

function FloatingItem({
  emoji,
  size,
  x,
  y,
  duration = 3200,
  delay = 0,
  amplitude = 10,
}: FloatingItemProps) {
  const floatY = useSharedValue(0);

  useEffect(() => {
    floatY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-amplitude, {
            duration,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(amplitude, {
            duration,
            easing: Easing.inOut(Easing.sin),
          })
        ),
        -1,
        true
      )
    );
  }, [floatY, duration, delay, amplitude]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.floatingItem, { left: x, top: y }, animStyle]}
    >
      <Text style={{ fontSize: size }}>{emoji}</Text>
    </Animated.View>
  );
}

// ── Sparkle Star Orbiting the Logo (Section 4.A.4) ─────────────────────────────
interface TwinklingSparkleProps {
  size: number;
  top: number;
  left: number;
  delay: number;
}

function TwinklingSparkle({ size, top, left, delay }: TwinklingSparkleProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.2, { duration: 900, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.7, { duration: 900, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );

    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 900 }),
          withTiming(0.4, { duration: 900 })
        ),
        -1,
        true
      )
    );
  }, [delay, scale, opacity]);

  const sparkleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.sparkleItem, { top, left }, sparkleStyle]}
    >
      <Ionicons name="sparkles" size={size} color={Colors.sunYellow} />
    </Animated.View>
  );
}

// ── Animated Welcome Screen (Section 4) ───────────────────────────────────────
function WelcomeScreen() {
  const [navigating, setNavigating] = useState(false);

  // Rotate greeting gracefully across visits
  const greetingText = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * FRIENDLY_GREETINGS.length);
    return FRIENDLY_GREETINGS[randomIndex];
  }, []);

  // Shared Animation Values
  const logoScale = useSharedValue(0.85);
  const logoOpacity = useSharedValue(0);
  const logoFloatY = useSharedValue(0);

  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);

  const btnScale = useSharedValue(0.9);
  const btnOpacity = useSharedValue(0);
  const btnPulse = useSharedValue(1);

  const starPulse = useSharedValue(1);

  // Entrance animations executed only once on mount
  useEffect(() => {
    // 1. Logo entrance: Fade in, scale from 85% to 100% with spring
    logoOpacity.value = withTiming(1, { duration: 550 });
    logoScale.value = withSpring(1, { damping: 11, stiffness: 180 });

    // Idle logo float after settling
    logoFloatY.value = withDelay(
      600,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );

    // 2. Greeting & text entrance: Staggered fade and slide
    textOpacity.value = withDelay(
      350,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
    textTranslateY.value = withDelay(
      350,
      withSpring(0, { damping: 14, stiffness: 180 })
    );

    // 3. Buttons entrance
    btnOpacity.value = withDelay(600, withTiming(1, { duration: 450 }));
    btnScale.value = withDelay(
      600,
      withSpring(1, { damping: 12, stiffness: 190 })
    );

    // 4. Idle pulse for primary button with long, gentle interval (Section 4.D)
    btnPulse.value = withDelay(
      1200,
      withRepeat(
        withSequence(
          withTiming(1.03, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );

    // 5. Smiling star gentle pulse beside caption (Section 4.F)
    starPulse.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0.95, { duration: 1000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, []);

  const handleMagsimula = useCallback(() => {
    if (navigating) return;
    setNavigating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push('/login');
  }, [navigating]);

  const handleMagLogin = useCallback(() => {
    if (navigating) return;
    setNavigating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push('/login');
  }, [navigating]);

  // Animated Styles
  const logoAnimStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { scale: logoScale.value },
      { translateY: logoFloatY.value },
    ],
  }));

  const textAnimStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const btnContainerStyle = useAnimatedStyle(() => ({
    opacity: btnOpacity.value,
    transform: [{ scale: btnScale.value * btnPulse.value }],
  }));

  const starCaptionStyle = useAnimatedStyle(() => ({
    transform: [{ scale: starPulse.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Sky Blue Environment Background */}
      <LinearGradient
        colors={['#38BDF8', '#0284C7', '#0369A1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative Subtle Rainbow Arc Backdrop (Section 4.C) */}
      <View style={styles.rainbowArc} />
      <View style={styles.glowDisc} />

      {/* Slowly Drifting Clouds & Learning Objects (Section 4.C) */}
      <FloatingItem emoji="☁️" size={48} x={-8} y={SCREEN_H * 0.07} duration={3800} delay={0} amplitude={8} />
      <FloatingItem emoji="☁️" size={34} x={SCREEN_W * 0.68} y={SCREEN_H * 0.05} duration={3200} delay={400} amplitude={10} />
      <FloatingItem emoji="☁️" size={40} x={SCREEN_W * 0.28} y={SCREEN_H * 0.15} duration={4200} delay={200} amplitude={12} />
      <FloatingItem emoji="🎈" size={38} x={SCREEN_W * 0.78} y={SCREEN_H * 0.22} duration={3000} delay={300} amplitude={14} />
      <FloatingItem emoji="📚" size={32} x={SCREEN_W * 0.08} y={SCREEN_H * 0.24} duration={2800} delay={600} amplitude={9} />
      <FloatingItem emoji="🔤" size={26} x={SCREEN_W * 0.84} y={SCREEN_H * 0.42} duration={2600} delay={150} amplitude={7} />
      <FloatingItem emoji="⭐" size={24} x={SCREEN_W * 0.09} y={SCREEN_H * 0.45} duration={2400} delay={350} amplitude={8} />

      {/* Content Wrapper */}
      <View style={styles.contentWrapper}>
        {/* Animated Logo Container with Surrounding Twinkling Sparkles (Section 4.A) */}
        <View style={styles.logoContainer}>
          <TwinklingSparkle size={22} top={-6} left={-6} delay={100} />
          <TwinklingSparkle size={18} top={-4} left={96} delay={500} />
          <TwinklingSparkle size={20} top={92} left={-2} delay={800} />
          <TwinklingSparkle size={24} top={88} left={94} delay={300} />

          <Animated.View style={[styles.logoBadge, Shadows.card, logoAnimStyle]}>
            <LinearGradient
              colors={Gradients.sun}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoGradient}
            >
              <Ionicons name="sparkles" size={56} color="#78350F" />
            </LinearGradient>
          </Animated.View>
        </View>

        {/* Brand Title (Section 4.B) */}
        <Animated.View style={[styles.textBlock, textAnimStyle]}>
          <Text style={styles.appName}>WikaPlay</Text>
          <Text style={styles.appTagline}>Masayang pagkatuto, araw-araw!</Text>

          {/* Friendly Greeting Tagline */}
          <Text style={styles.greetingQuote}>
            &ldquo;{greetingText}&rdquo;
          </Text>

          {/* Feature Badge Pill */}
          <View style={styles.featuresPill}>
            <Ionicons name="sparkles" size={14} color={Colors.sunYellow} />
            <Text style={styles.featuresText}>
              Flashcards · Pagsusulit · Mini-Games 🎮
            </Text>
          </View>
        </Animated.View>

        {/* Buttons Section (Section 4.D & 4.E) */}
        <Animated.View style={[styles.buttonsWrapper, btnContainerStyle]}>
          {/* Exciting Primary Button: Magsimula! */}
          <PressableScale
            onPress={handleMagsimula}
            disabled={navigating}
            activeScale={0.96}
            style={[styles.primaryBtnWrapper, Shadows.colored(Colors.sunYellowDark, 0.4)]}
            accessibilityRole="button"
            accessibilityLabel="Magsimula — Pumunta sa laro"
          >
            <LinearGradient
              colors={Gradients.sun}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGradient}
            >
              <Text style={styles.primaryBtnText}>Magsimula!</Text>
              <Ionicons name="arrow-forward-circle" size={26} color="#78350F" />
            </LinearGradient>
          </PressableScale>

          {/* Secondary Action: Mag-login */}
          <PressableScale
            onPress={handleMagLogin}
            disabled={navigating}
            activeScale={0.97}
            style={[styles.secondaryBtn, Shadows.subtle]}
            accessibilityRole="button"
            accessibilityLabel="Mag-login — Pumasok sa iyong account"
          >
            <Ionicons name="log-in-outline" size={18} color={Colors.skyBlueDark} />
            <Text style={styles.secondaryBtnText}>
              May account na? <Text style={styles.secondaryBtnHighlight}>Mag-login</Text>
            </Text>
          </PressableScale>
        </Animated.View>

        {/* Small Motivational Caption & Smiling Star (Section 4.F) */}
        <Animated.View style={[styles.motivationalRow, textAnimStyle]}>
          <Animated.View style={starCaptionStyle}>
            <Text style={styles.starEmoji}>⭐</Text>
          </Animated.View>
          <Text style={styles.motivationalCaption}>
            Ang bawat bituin ay hakbang sa bagong kaalaman!
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

// ── App Startup Session Restore Splash ────────────────────────────────────────
function SplashScreenView() {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 800, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <View style={splashStyles.container}>
      <LinearGradient
        colors={['#38BDF8', '#0284C7', '#0369A1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[splashStyles.logoCircle, Shadows.card, pulseStyle]}>
        <Ionicons name="sparkles" size={54} color={Colors.sunYellowDark} />
      </Animated.View>
      <Text style={splashStyles.brandTitle}>WikaPlay</Text>
      <Text style={splashStyles.tagline}>Masayang Pagkatuto ng Wikang Filipino</Text>
      <ActivityIndicator size="large" color={Colors.white} style={splashStyles.spinner} />
    </View>
  );
}

const splashStyles = StyleSheet.create({
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
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.6)',
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
    color: 'rgba(255, 255, 255, 0.94)',
    marginTop: 6,
    textAlign: 'center',
  },
  spinner: { marginTop: 36 },
});

// ── Root Gateway ──────────────────────────────────────────────────────────────
export default function IndexGateway() {
  const { user, isLoading, isAuthenticated, isTeacher } = useAuth();

  if (isLoading) return <SplashScreenView />;

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
  rainbowArc: {
    position: 'absolute',
    top: -120,
    left: -80,
    width: SCREEN_W + 160,
    height: 280,
    borderRadius: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 8,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  glowDisc: {
    position: 'absolute',
    top: SCREEN_H * 0.18,
    alignSelf: 'center',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  floatingItem: {
    position: 'absolute',
    zIndex: 1,
  },
  contentWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 10,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 14,
  },
  sparkleItem: {
    position: 'absolute',
    zIndex: 2,
  },
  logoBadge: {
    width: 114,
    height: 114,
    borderRadius: 57,
    overflow: 'hidden',
    borderWidth: 3.5,
    borderColor: 'rgba(255, 255, 255, 0.85)',
  },
  logoGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textBlock: {
    alignItems: 'center',
    marginBottom: 26,
  },
  appName: {
    fontSize: 44,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
    letterSpacing: 1.2,
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  appTagline: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: '#FEF08A',
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  greetingQuote: {
    fontSize: Typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.94)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  featuresPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  featuresText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  buttonsWrapper: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    marginBottom: 22,
  },
  primaryBtnWrapper: {
    width: '100%',
    borderRadius: Radius.xxl,
    overflow: 'hidden',
    marginBottom: 12,
  },
  primaryBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 28,
    gap: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: Radius.xxl,
  },
  primaryBtnText: {
    fontSize: 22,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: '#78350F',
    letterSpacing: 0.6,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    minHeight: 48,
  },
  secondaryBtnText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    color: Colors.text,
    fontWeight: Typography.weights.medium,
  },
  secondaryBtnHighlight: {
    color: Colors.skyBlueDark,
    fontWeight: Typography.weights.bold,
  },
  motivationalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
  },
  starEmoji: {
    fontSize: 16,
  },
  motivationalCaption: {
    fontSize: Typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.92)',
    fontWeight: Typography.weights.medium,
    textAlign: 'center',
  },
});
