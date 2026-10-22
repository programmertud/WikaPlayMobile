import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts, Typography } from '../theme';

interface LoadingViewProps {
  message?: string;
  variant?: 'student' | 'teacher';
}

export const LoadingView: React.FC<LoadingViewProps> = ({
  message = 'Ikinakarga ang WikaPlay...',
  variant = 'student',
}) => {
  const accentColor = variant === 'teacher' ? Colors.teacherPurple : Colors.skyBlueDark;

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={accentColor} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.background,
  },
  text: {
    marginTop: 16,
    color: Colors.textLight,
    fontSize: Typography.sizes.md,
    fontFamily: Fonts.medium,
  },
});

