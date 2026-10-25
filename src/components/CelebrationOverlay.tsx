import React, { useEffect } from 'react';
import { StyleSheet, View, Text, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients, Typography, Radius, Shadows } from '@/theme';
import { PrimaryButton } from './PrimaryButton';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ConfettiPieceProps {
  index: number;
}

const CONFETTI_COLORS = [
  Colors.sunYellow,
  Colors.skyBlue,
  Colors.coralPink,
  Colors.grassGreen,
  Colors.vibrantPurple,
  Colors.vibrantOrange,
];

function ConfettiPiece({ index }: ConfettiPieceProps) {
  const startX = Math.random() * SCREEN_WIDTH;
  const endX = startX + (Math.random() - 0.5) * 120;
  const rotation = Math.random() * 360;
  const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
  const size = 8 + (index % 6) * 2;
  const isCircle = index % 3 === 0;

  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(startX);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const delay = Math.random() * 400;
    const duration = 2200 + Math.random() * 800;

    translateY.value = withDelay(
      delay,
      withTiming(SCREEN_HEIGHT + 100, {
        duration,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      })
    );
    translateX.value = withDelay(
      delay,
      withTiming(endX, { duration, easing: Easing.linear })
    );
    rotate.value = withDelay(
      delay,
      withTiming(rotation + 720, { duration, easing: Easing.linear })
    );
    opacity.value = withDelay(
      delay + duration - 500,
      withTiming(0, { duration: 500 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.confetti,
        {
          width: size,
          height: isCircle ? size : size * 1.5,
          borderRadius: isCircle ? size / 2 : 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

interface CelebrationOverlayProps {
  visible: boolean;
  title?: string;
  subtitle?: string;
  scoreText?: string;
  stars?: number;
  onContinue?: () => void;
  continueText?: string;
  onExit?: () => void;
  exitText?: string;
}

export function CelebrationOverlay({
  visible,
  title = 'Maligayang Tagumpay!',
  subtitle = 'Napakagaling ng iyong ipinakita!',
  scoreText,
  stars = 3,
  onContinue,
  continueText = 'Magpatuloy',
  onExit,
  exitText = 'Bumalik sa Mga Laro',
}: CelebrationOverlayProps) {
  const cardScale = useSharedValue(0.6);
  const cardOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {}
      );
      cardScale.value = withSpring(1, { damping: 14, stiffness: 220 });
      cardOpacity.value = withTiming(1, { duration: 300 });
    } else {
      cardScale.value = 0.6;
      cardOpacity.value = 0;
    }
  }, [visible]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View style={styles.backdrop} />

      {/* Confetti Particles */}
      {Array.from({ length: 40 }).map((_, i) => (
        <ConfettiPiece key={i} index={i} />
      ))}

      {/* Celebration Dialog Card */}
      <View style={styles.centerContainer}>
        <Animated.View style={[styles.card, Shadows.card, animatedCardStyle]}>
          <LinearGradient
            colors={Gradients.sunLight}
            style={styles.iconCircle}
          >
            <Ionicons name="trophy" size={54} color={Colors.sunYellowDark} />
          </LinearGradient>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {/* Stars display */}
          <View style={styles.starsRow}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Ionicons
                key={i}
                name={i < stars ? 'star' : 'star-outline'}
                size={34}
                color={i < stars ? Colors.sunYellow : Colors.textMuted}
                style={styles.starIcon}
              />
            ))}
          </View>

          {scoreText ? <Text style={styles.scoreText}>{scoreText}</Text> : null}

          {onContinue ? (
            <View style={styles.btnContainer}>
              <PrimaryButton
                title={continueText}
                onPress={onContinue}
                gradient={Gradients.grass}
                icon="arrow-forward-circle"
              />
            </View>
          ) : null}

          {onExit ? (
            <View style={[styles.btnContainer, { marginTop: 10 }]}>
              <PrimaryButton
                title={exitText}
                onPress={onExit}
                variant="outline"
                icon="arrow-back"
              />
            </View>
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  confetti: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: Colors.white,
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontFamily: Typography.family.display,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: Typography.sizes.md,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  starIcon: {
    marginHorizontal: 4,
  },
  scoreText: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.skyBlueDark,
    marginBottom: 20,
  },
  btnContainer: {
    width: '100%',
    marginTop: 8,
  },
});
