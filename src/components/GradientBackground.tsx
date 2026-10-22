import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '@/theme';

interface GradientBackgroundProps {
  children?: React.ReactNode;
  variant?: 'sky' | 'teacher' | 'sun' | 'coral' | 'plain';
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  showBlobs?: boolean;
}

export function GradientBackground({
  children,
  variant = 'sky',
  style,
  contentStyle,
  showBlobs = true,
}: GradientBackgroundProps) {
  let colors: readonly [string, string, ...string[]];

  switch (variant) {
    case 'teacher':
      colors = Gradients.teacherSoft;
      break;
    case 'sun':
      colors = Gradients.sunLight;
      break;
    case 'coral':
      colors = Gradients.candyLight;
      break;
    case 'plain':
      colors = ['#FFFFFF', '#F8FAFC'] as const;
      break;
    case 'sky':
    default:
      colors = Gradients.skySoft;
      break;
  }

  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {showBlobs && (
        <>
          <View
            style={[
              styles.blob,
              variant === 'teacher' ? styles.blobPurple1 : styles.blobSky1,
            ]}
          />
          <View
            style={[
              styles.blob,
              variant === 'teacher' ? styles.blobPurple2 : styles.blobSun2,
            ]}
          />
        </>
      )}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
  blob: {
    position: 'absolute',
    borderRadius: 9999,
  },
  blobSky1: {
    width: 260,
    height: 260,
    top: -80,
    right: -60,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  blobSun2: {
    width: 220,
    height: 220,
    bottom: -60,
    left: -60,
    backgroundColor: 'rgba(251, 191, 36, 0.10)',
  },
  blobPurple1: {
    width: 280,
    height: 280,
    top: -90,
    right: -70,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
  },
  blobPurple2: {
    width: 220,
    height: 220,
    bottom: -60,
    left: -60,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },
});
