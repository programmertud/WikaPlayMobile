import { router } from 'expo-router';
import React from 'react';
import {
  Image,
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
  logoImage?: any;
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
  logoImage,
  style,
}) => {
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(student)/(tabs)' as any);
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
          <View style={styles.titleRow}>
            {logoImage ? (
              <View style={styles.logoBadge}>
                <Image source={logoImage} style={styles.headerLogo} resizeMode="cover" />
              </View>
            ) : null}
            <View style={styles.titleTextCol}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {subtitle ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          </View>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  headerLogo: {
    width: '100%',
    height: '100%',
  },
  titleTextCol: {
    alignItems: 'center',
  },
  title: {
    color: Colors.white,
    fontSize: Typography.sizes.lg,
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
