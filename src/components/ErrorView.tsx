import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, Fonts, Shadows, Typography } from '../theme';
import { PrimaryButton } from './PrimaryButton';

interface ErrorViewProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorView: React.FC<ErrorViewProps> = ({ message, onRetry }) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name="alert-circle" size={48} color={Colors.coralRed} />
      </View>
      <Text style={styles.title}>Paumanhin!</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <PrimaryButton
          title="Subukan Muli"
          variant="primary"
          onPress={onRetry}
          style={styles.button}
        />
      )}
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
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...Shadows.sm,
  },
  title: {
    fontSize: Typography.sizes.xl,
    fontFamily: Fonts.bold,
    color: Colors.text,
    marginBottom: 8,
  },
  message: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    fontFamily: Fonts.regular,
    maxWidth: 280,
  },
  button: {
    minWidth: 160,
  },
});

