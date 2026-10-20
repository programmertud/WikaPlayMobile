import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../theme';

interface ProgressIndicatorProps {
  current: number;
  total: number;
  color?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  current,
  total,
  color = Colors.grassGreen,
}) => {
  const percentage = total > 0 ? Math.min(100, Math.max(0, (current / total) * 100)) : 0;

  return (
    <View style={styles.track}>
      <View style={[styles.bar, { width: `${percentage}%`, backgroundColor: color }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    height: 14,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.white,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 8,
  },
});
