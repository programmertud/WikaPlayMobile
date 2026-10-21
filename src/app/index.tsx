import { Redirect } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../hooks/use-auth';
import { Colors, Shadows, Typography } from '../theme';

export default function IndexGateway() {
  const { user, isLoading, isAuthenticated, isTeacher } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={[styles.logoCircle, Shadows.card]}>
          <Text style={styles.sunEmoji}>☀️</Text>
          <Text style={styles.bookEmoji}>📖</Text>
        </View>
        <Text style={styles.brandTitle}>WikaPlay</Text>
        <Text style={styles.tagline}>Masayang Pagkatuto ng Wikang Filipino</Text>
        <ActivityIndicator size="large" color={Colors.white} style={styles.spinner} />
      </View>
    );
  }

  if (isAuthenticated && user) {
    if (isTeacher) {
      return <Redirect href="/(teacher)" />;
    }
    return <Redirect href="/" />;
  }

  return <Redirect href="/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.skyBlue,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 6,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 20,
    flexDirection: 'row',
  },
  sunEmoji: {
    fontSize: 48,
    marginRight: -10,
  },
  bookEmoji: {
    fontSize: 44,
  },
  brandTitle: {
    fontSize: Typography.sizes.hero,
    fontWeight: Typography.weights.heavy,
    color: Colors.white,
    letterSpacing: 1.2,
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  tagline: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.semibold,
    color: 'rgba(255, 255, 255, 0.95)',
    marginTop: 8,
    textAlign: 'center',
  },
  spinner: {
    marginTop: 36,
  },
});
