import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts, Shadows, Typography } from '../theme';

interface EmptyStateProps {
  emoji?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  message?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  emoji = '🌟',
  icon,
  title,
  subtitle,
  message,
}) => {
  const displayText = subtitle || message;
  return (
    <View style={styles.container}>
      {icon ? (
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={36} color={Colors.sunYellowDark} />
        </View>
      ) : (
        <Text style={styles.emoji}>{emoji}</Text>
      )}
      <Text style={styles.title}>{title}</Text>
      {displayText && <Text style={styles.subtitle}>{displayText}</Text>}
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...Shadows.sm,
  },
  emoji: {
    fontSize: 52,
    marginBottom: 12,
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontFamily: Fonts.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    fontFamily: Fonts.regular,
    textAlign: 'center',
    maxWidth: 260,
  },
});

