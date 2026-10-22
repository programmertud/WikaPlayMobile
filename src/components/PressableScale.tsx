/* eslint-disable react-hooks/immutability */
import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
  GestureResponderEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from '@/utils/haptics';



const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  activeScale?: number;
  haptic?: boolean | 'light' | 'medium' | 'heavy' | 'selection';
  children: React.ReactNode;
}

export function PressableScale({
  children,
  style,
  activeScale = 0.96,
  haptic = 'light',
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  ...props
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const triggerHaptic = () => {
    if (!haptic || disabled) return;
    try {
      if (haptic === 'medium') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      } else if (haptic === 'heavy') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
      } else if (haptic === 'selection') {
        Haptics.selectionAsync().catch(() => {});
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    } catch {
      // safe fallback on unsupported environments
    }
  };

  const handlePressIn = (e: GestureResponderEvent) => {
    if (!disabled) {
      scale.value = withSpring(activeScale, { damping: 15, stiffness: 350 });
      triggerHaptic();
    }
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    if (!disabled) {
      scale.value = withSpring(1, { damping: 15, stiffness: 350 });
    }
    onPressOut?.(e);
  };

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      style={[style, animatedStyle]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}
