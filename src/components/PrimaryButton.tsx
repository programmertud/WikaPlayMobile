import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Gradients, Shadows, Typography, Radius } from '@/theme';
import { PressableScale } from './PressableScale';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'success'
  | 'danger'
  | 'warning'
  | 'teacher'
  | 'disabled';

export interface PrimaryButtonProps {
  title: string;
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap | React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  gradient?: readonly [string, string, ...string[]];
  onPress?: () => void;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  disabled,
  gradient,
  onPress,
}) => {
  const isDisabled = disabled || variant === 'disabled' || loading;

  const getGradientColors = (): readonly [string, string, ...string[]] | null => {
    if (gradient) return gradient;
    if (isDisabled) return ['#94A3B8', '#64748B'] as const;

    switch (variant) {
      case 'primary':
        return Gradients.sky;
      case 'success':
        return Gradients.grass;
      case 'danger':
        return Gradients.candy;
      case 'warning':
        return Gradients.sun;
      case 'teacher':
        return Gradients.teacher;
      case 'secondary':
      case 'outline':
      default:
        return null;
    }
  };

  const getTextColor = () => {
    if (isDisabled) return '#FFFFFF';
    if (variant === 'secondary' || variant === 'outline') return Colors.skyBlueDark;
    if (variant === 'warning') return '#78350F';
    return Colors.white;
  };

  const getShadowStyle = () => {
    if (isDisabled) return Shadows.subtle;
    if (variant === 'secondary' || variant === 'outline') return Shadows.subtle;
    switch (variant) {
      case 'success':
        return Shadows.colored(Colors.grassGreen, 0.28);
      case 'danger':
        return Shadows.colored(Colors.coralPink, 0.28);
      case 'warning':
        return Shadows.colored(Colors.sunYellowDark, 0.28);
      case 'teacher':
        return Shadows.colored(Colors.teacherPurple, 0.28);
      case 'primary':
      default:
        return Shadows.colored(Colors.skyBlueDark, 0.28);
    }
  };

  const gradientColors = getGradientColors();
  const textColor = getTextColor();

  const renderIcon = () => {
    if (!icon) return null;
    if (typeof icon === 'string') {
      const iconSize = size === 'sm' ? 18 : size === 'lg' ? 24 : 20;
      return (
        <Ionicons
          name={icon as keyof typeof Ionicons.glyphMap}
          size={iconSize}
          color={textColor}
          style={iconPosition === 'left' ? styles.iconLeft : styles.iconRight}
        />
      );
    }
    return <View style={iconPosition === 'left' ? styles.iconLeft : styles.iconRight}>{icon}</View>;
  };

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      activeScale={0.97}
      haptic={isDisabled ? false : 'light'}
      style={[
        styles.buttonWrapper,
        getShadowStyle(),
        style,
      ]}
    >
      {gradientColors ? (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.inner, styles[size]]}
        >
          {loading ? (
            <ActivityIndicator color={textColor} />
          ) : (
            <>
              {iconPosition === 'left' && renderIcon()}
              <Text
                style={[
                  styles.text,
                  styles[`text_${size}`],
                  { color: textColor },
                  textStyle,
                ]}
              >
                {title}
              </Text>
              {iconPosition === 'right' && renderIcon()}
            </>
          )}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.inner,
            styles[size],
            styles.secondaryBg,
            variant === 'outline' && styles.outlineBorder,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={textColor} />
          ) : (
            <>
              {iconPosition === 'left' && renderIcon()}
              <Text
                style={[
                  styles.text,
                  styles[`text_${size}`],
                  { color: textColor },
                  textStyle,
                ]}
              >
                {title}
              </Text>
              {iconPosition === 'right' && renderIcon()}
            </>
          )}
        </View>
      )}
    </PressableScale>
  );
};

const styles = StyleSheet.create({
  buttonWrapper: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  secondaryBg: {
    backgroundColor: Colors.white,
    borderColor: Colors.border,
  },
  outlineBorder: {
    borderColor: Colors.skyBlue,
    borderWidth: 1.5,
  },
  sm: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 40,
  },
  md: {
    paddingVertical: 13,
    paddingHorizontal: 22,
    minHeight: 52,
  },
  lg: {
    paddingVertical: 16,
    paddingHorizontal: 28,
    minHeight: 60,
  },
  text: {
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.3,
  },
  text_sm: {
    fontSize: Typography.sizes.sm,
  },
  text_md: {
    fontSize: Typography.sizes.md,
  },
  text_lg: {
    fontSize: Typography.sizes.lg,
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
});
