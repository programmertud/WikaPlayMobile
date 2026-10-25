import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
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

import { useAuth } from '../hooks/use-auth';
import { ApiClient, authService, studentService } from '../services/api';
import { bgm } from '../services/audio/bgm-service';
import { playWelcomeSound } from '../services/audio/sound-service';
import { Colors, Gradients, Radius, Shadows, Typography } from '../theme';
import { PrimaryButton } from '../components/PrimaryButton';
import { PressableScale } from '../components/PressableScale';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ── Floating Decorative Cloud / Sparkle Item ──────────────────────────────────
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
  duration = 3000,
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

// ── Bouncing Star Component ───────────────────────────────────────────────────
interface SmilingStarProps {
  delay: number;
  size: number;
  label?: string;
}

function SmilingStar({ delay, size }: SmilingStarProps) {
  const scale = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    // Pop entrance with spring
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 10, stiffness: 200 })
    );

    // Subtle gentle floating loop after entrance
    translateY.value = withDelay(
      delay + 500,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1200, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
  }, [delay, scale, translateY]);

  const starStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[styles.starWrapper, starStyle]}>
      <LinearGradient
        colors={Gradients.sun}
        style={[
          styles.starCircle,
          { width: size, height: size, borderRadius: size / 2 },
          Shadows.colored(Colors.sunYellowDark, 0.35),
        ]}
      >
        <Ionicons name="star" size={size * 0.6} color="#78350F" />
      </LinearGradient>
    </Animated.View>
  );
}

// ── Contextual Filipino Loading Messages ──────────────────────────────────────
const LOADING_PHRASES = [
  { text: 'Yehey! Nakapasok ka na! 🎉', progress: 0.25 },
  { text: 'Inihahanda ang iyong mundo ng pagkatuto... 🌈', progress: 0.55 },
  { text: 'Kinukuha ang iyong mga bituin at progreso... ⭐', progress: 0.8 },
  { text: 'Kaunting sandali na lang, simula na ang saya! 🚀', progress: 0.95 },
];

export default function LoadingScreen() {
  const { user, refreshProfile, logout } = useAuth();

  const [phraseIndex, setPhraseIndex] = useState(0);
  const [initFailed, setInitFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Logo entrance
  const logoScale = useSharedValue(0.7);
  const logoOpacity = useSharedValue(0);

  // Progress Bar
  const progressAnim = useSharedValue(0.15);

  // Text message opacity for gentle cross-fade
  const textOpacity = useSharedValue(1);

  // Keep track of navigation execution to avoid duplicates
  const hasNavigatedRef = useRef(false);

  const initializeStudentSession = useCallback(async () => {
    setInitFailed(false);
    setErrorMessage(null);
    hasNavigatedRef.current = false;

    const startTime = Date.now();
    const MINIMUM_DISPLAY_MS = 1600; // Brief sweet duration so animations & messages are enjoyed

    try {
      // 1. Verify token exists
      const token = ApiClient.getToken();
      if (!token) {
        // Not authenticated, redirect to login
        router.replace('/login');
        return;
      }

      // 2. Fetch authenticated profile & fresh stats
      const meRes = await authService.getMe();
      if (!meRes || !meRes.user) {
        throw new Error('Walang nakitang profile data.');
      }

      // 3. For students, pre-load profile statistics to warm up dashboard/rewards caches
      if (meRes.user.role === 'student') {
        try {
          await studentService.getProfileStats();
        } catch {
          // Non-fatal, profile stats can fall back to dashboard load
        }
      }

      // Synchronize context state
      await refreshProfile();

      // Complete progress bar animation
      progressAnim.value = withTiming(1, { duration: 300 });

      // Ensure minimum duration has elapsed for smooth visual pacing
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, MINIMUM_DISPLAY_MS - elapsed);

      setTimeout(() => {
        if (hasNavigatedRef.current) return;
        hasNavigatedRef.current = true;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

        // Navigate to the correct portal
        if (meRes.user.role === 'teacher' || meRes.user.role === 'admin') {
          router.replace('/(teacher)');
        } else {
          router.replace('/(student)/(tabs)');
        }
      }, remainingTime);
    } catch (err: any) {
      console.warn('[LoadingScreen] Initialization failed:', err);

      // Check if session token expired or unauthorized
      if (err.status === 401 || err.message?.includes('Unauthenticated')) {
        await logout();
        router.replace('/login');
        return;
      }

      setInitFailed(true);
      setErrorMessage(
        err.message || 'Hindi namin makuha ang iyong impormasyon. Pakisuri ang iyong internet.'
      );
    } finally {
      setIsRetrying(false);
    }
  }, [logout, refreshProfile]);

  useEffect(() => {
    // Logo entrance animation
    logoOpacity.value = withTiming(1, { duration: 400 });
    logoScale.value = withSpring(1, { damping: 12, stiffness: 220 });

    // Play warm Filipino welcome greeting audio if unmuted
    if (!bgm.getMuted()) {
      playWelcomeSound().catch(() => {});
    }

    // Execute real session initialization and data loading
    initializeStudentSession();

    // Clean up on unmount
    return () => {
      hasNavigatedRef.current = true;
    };
  }, [initializeStudentSession]);

  // Cycle through contextual phrases smoothly while loading
  useEffect(() => {
    if (initFailed) return;

    const interval = setInterval(() => {
      setPhraseIndex((prev) => {
        const next = (prev + 1) % LOADING_PHRASES.length;
        // Smoothly advance progress bar with phrase change
        progressAnim.value = withTiming(LOADING_PHRASES[next].progress, {
          duration: 450,
          easing: Easing.out(Easing.cubic),
        });

        // Text fade transition
        textOpacity.value = withSequence(
          withTiming(0, { duration: 150 }),
          withTiming(1, { duration: 250 })
        );

        return next;
      });
    }, 900);

    return () => clearInterval(interval);
  }, [initFailed]);

  const handleRetry = () => {
    setIsRetrying(true);
    setPhraseIndex(0);
    // eslint-disable-next-line react-hooks/immutability
    progressAnim.value = 0.2;
    initializeStudentSession();
  };

  const handleBackToLogin = async () => {
    await logout();
    router.replace('/login');
  };

  // Reanimated Styles
  const logoAnimStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${Math.min(100, Math.max(10, progressAnim.value * 100))}%`,
  }));

  const textAnimStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#38BDF8', '#0284C7', '#0369A1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Subtle Floating Educational Decorations */}
      <FloatingItem emoji="☁️" size={46} x={SCREEN_W * 0.05} y={SCREEN_H * 0.08} duration={3200} delay={0} amplitude={8} />
      <FloatingItem emoji="☁️" size={32} x={SCREEN_W * 0.72} y={SCREEN_H * 0.06} duration={2800} delay={400} amplitude={10} />
      <FloatingItem emoji="🎈" size={38} x={SCREEN_W * 0.8} y={SCREEN_H * 0.24} duration={3400} delay={200} amplitude={12} />
      <FloatingItem emoji="📚" size={30} x={SCREEN_W * 0.08} y={SCREEN_H * 0.26} duration={2600} delay={500} amplitude={8} />
      <FloatingItem emoji="✨" size={24} x={SCREEN_W * 0.85} y={SCREEN_H * 0.42} duration={2200} delay={100} amplitude={6} />
      <FloatingItem emoji="🎨" size={28} x={SCREEN_W * 0.06} y={SCREEN_H * 0.46} duration={3000} delay={300} amplitude={9} />

      {/* Main Content Area */}
      <View style={styles.contentContainer}>
        {!initFailed ? (
          <>
            {/* Logo Badge Entrance */}
            <Animated.View style={[styles.logoBadge, Shadows.card, logoAnimStyle]}>
              <LinearGradient
                colors={Gradients.sun}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoGradient}
              >
                <Ionicons name="sparkles" size={54} color="#78350F" />
              </LinearGradient>
            </Animated.View>

            {/* App Name */}
            <Text style={styles.brandTitle}>WikaPlay</Text>
            <Text style={styles.brandSubtitle}>
              Masayang Pagkatuto ng Wikang Filipino
            </Text>

            {/* Cheerful Popping Stars Row */}
            <View style={styles.starsRow}>
              <SmilingStar delay={150} size={44} />
              <SmilingStar delay={300} size={54} />
              <SmilingStar delay={450} size={44} />
            </View>

            {/* Progress Bar Container */}
            <View style={styles.progressSection}>
              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressBarFill, progressBarStyle]}>
                  <LinearGradient
                    colors={Gradients.sun}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
              </View>
            </View>

            {/* Dynamic Contextual Filipino Phrase */}
            <Animated.View style={[styles.phraseBox, textAnimStyle]}>
              <Text style={styles.phraseText}>
                {LOADING_PHRASES[phraseIndex].text}
              </Text>
            </Animated.View>

            {/* Personalized greeting if user name is present */}
            {user?.name ? (
              <Text style={styles.personalizedText}>
                Papasok na si {user.name.split(' ')[0]}! 🌟
              </Text>
            ) : null}
          </>
        ) : (
          /* Friendly Error Recovery State */
          <View style={[styles.errorCard, Shadows.card]}>
            <View style={styles.errorIconCircle}>
              <Ionicons name="cloud-offline" size={52} color={Colors.sunYellowDark} />
            </View>

            <Text style={styles.errorTitle}>
              Oops! Hindi namin makuha ang iyong impormasyon.
            </Text>
            <Text style={styles.errorSubtitle}>
              {errorMessage || 'Pakisuri ang iyong koneksyon sa internet at subukang muli.'}
            </Text>

            <View style={styles.errorActions}>
              <PrimaryButton
                title={isRetrying ? 'Sumusubok muli...' : 'Subukang Muli 🔄'}
                variant="primary"
                size="lg"
                loading={isRetrying}
                onPress={handleRetry}
                style={{ width: '100%', marginBottom: 12 }}
              />

              <PressableScale
                onPress={handleBackToLogin}
                style={styles.backLoginBtn}
                accessibilityRole="button"
                accessibilityLabel="Bumalik sa login"
              >
                <Ionicons name="arrow-back" size={16} color={Colors.skyBlueDark} />
                <Text style={styles.backLoginText}>Bumalik sa Login</Text>
              </PressableScale>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  floatingItem: {
    position: 'absolute',
    zIndex: 1,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 10,
  },
  logoBadge: {
    width: 110,
    height: 110,
    borderRadius: 55,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  logoGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 40,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
    letterSpacing: 1,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  brandSubtitle: {
    fontSize: Typography.sizes.sm,
    color: 'rgba(255, 255, 255, 0.94)',
    fontWeight: Typography.weights.semibold,
    textAlign: 'center',
    marginBottom: 24,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 32,
    height: 60,
  },
  starWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  starCircle: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  progressSection: {
    width: '100%',
    maxWidth: 280,
    marginBottom: 20,
  },
  progressTrack: {
    height: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: Radius.pill,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  phraseBox: {
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    marginBottom: 12,
  },
  phraseText: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  personalizedText: {
    fontSize: Typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: Typography.weights.bold,
    marginTop: 4,
  },
  errorCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    padding: 24,
    alignItems: 'center',
  },
  errorIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  errorTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 24,
  },
  errorSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  errorActions: {
    width: '100%',
    alignItems: 'center',
  },
  backLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: Radius.pill,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  backLoginText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.skyBlueDark,
  },
});
