import { router } from 'expo-router';
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients, Shadows, Typography, Radius } from '@/theme';
import { PressableScale } from './PressableScale';

interface ScreenHeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  subtitle?: string;
  bgColor?: string;
  gradient?: readonly [string, string, ...string[]];
  blur?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  showBack = true,
  onBack,
  rightElement,
  subtitle,
  bgColor,
  gradient,
  blur = false,
  style,
}) => {
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const gradientColors = gradient || (bgColor ? [bgColor, bgColor] : Gradients.sky);

  return (
    <View style={[styles.container, Shadows.card, style]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {blur && (
        <BlurView
          intensity={40}
          tint="light"
          style={StyleSheet.absoluteFill}
        />
      )}

      <View style={[styles.topRow, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        {showBack ? (
          <PressableScale
            onPress={handleBack}
            style={[styles.backButton, Shadows.subtle]}
            accessibilityRole="button"
            accessibilityLabel="Bumalik"
          >
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </PressableScale>
        ) : (
          <View style={styles.placeholder} />
        )}

        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {rightElement ? (
          <View style={styles.rightContainer}>{rightElement}</View>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomLeftRadius: Radius.xxl,
    borderBottomRightRadius: Radius.xxl,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  placeholder: {
    width: 42,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  title: {
    color: Colors.white,
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.92)',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    marginTop: 2,
  },
  rightContainer: {
    minWidth: 42,
    alignItems: 'flex-end',
  },
});
