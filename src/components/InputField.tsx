import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Radius, Shadows } from '@/theme';

interface InputFieldProps extends TextInputProps {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  isPassword?: boolean;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  icon,
  error,
  containerStyle,
  isPassword,
  secureTextEntry,
  onFocus,
  onBlur,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const focusAnim = useSharedValue(0);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    focusAnim.value = withTiming(1, { duration: 200 });
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    focusAnim.value = withTiming(0, { duration: 200 });
    onBlur?.(e);
  };

  const animatedBorderStyle = useAnimatedStyle(() => ({
    borderColor: error
      ? Colors.error
      : focusAnim.value > 0.5
      ? Colors.skyBlue
      : 'rgba(0, 0, 0, 0.08)',
    borderWidth: focusAnim.value > 0.5 ? 1.5 : 1,
  }));

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Animated.View
        style={[
          styles.inputContainer,
          Shadows.subtle,
          animatedBorderStyle,
          isFocused && styles.focusedGlow,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={isFocused ? Colors.skyBlueDark : Colors.textMuted}
            style={styles.icon}
          />
        )}
        <TextInput
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={isPassword ? !showPassword : secureTextEntry}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={styles.input}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </Animated.View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    height: 52,
  },
  focusedGlow: {
    backgroundColor: '#FFFFFF',
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    color: Colors.text,
    fontSize: Typography.sizes.md,
  },
  eyeBtn: {
    padding: 4,
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.sizes.xs,
    marginTop: 4,
    marginLeft: 4,
    fontWeight: Typography.weights.medium,
  },
});
