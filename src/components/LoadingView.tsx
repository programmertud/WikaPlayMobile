import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Colors, Typography } from '../theme';

interface LoadingViewProps {
  message?: string;
}

export const LoadingView: React.FC<LoadingViewProps> = ({ message = 'Ikinakarga ang WikaPlay...' }) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.skyBlueDark} />
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
    fontWeight: Typography.weights.semibold,
  },
});
