import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
} from 'react-native';
import { Colors, Shadows, Typography } from '../theme';

interface PrimaryButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'success' | 'danger' | 'warning' | 'disabled';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  style,
  disabled,
  ...props
}) => {
  const getBgColor = () => {
    if (disabled) return Colors.textMuted;
    switch (variant) {
      case 'secondary':
      case 'outline':
        return Colors.white;
      case 'success':
        return Colors.grassGreen;
      case 'danger':
        return Colors.coralPink;
      case 'warning':
        return Colors.sunYellow;
      case 'disabled':
        return Colors.textMuted;
      case 'primary':
      default:
        return Colors.skyBlue;
    }
  };

  const getTextColor = () => {
    if (variant === 'secondary' || variant === 'outline') return Colors.skyBlueDark;
    if (variant === 'warning') return '#78350F';
    if (variant === 'disabled' || disabled) return Colors.white;
    return Colors.white;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      disabled={disabled || loading}
      style={[
        styles.button,
        styles[size],
        { backgroundColor: getBgColor() },
        (variant === 'secondary' || variant === 'outline') && styles.outlineBorder,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, { color: getTextColor() }, icon ? { marginLeft: 8 } : null]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 3,
    borderColor: Colors.white,
    ...Shadows.button,
  },
  sm: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 40,
  },
  md: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 52,
  },
  lg: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    minHeight: 64,
  },
  secondaryBorder: {
    borderColor: Colors.skyBlue,
  },
  outlineBorder: {
    borderColor: Colors.skyBlue,
    borderWidth: 3,
  },
  text: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.heavy,
    letterSpacing: 0.4,
  },
});
