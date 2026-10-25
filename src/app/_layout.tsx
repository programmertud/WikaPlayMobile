import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../hooks/use-auth';

import { bgm } from '../services/audio/bgm-service';

import {
  useFonts,
  Baloo2_600SemiBold,
  Baloo2_700Bold,
  Baloo2_800ExtraBold,
} from '@expo-google-fonts/baloo-2';

import { Platform } from 'react-native';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Baloo2_600SemiBold,
    Baloo2_700Bold,
    Baloo2_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
      bgm.init();
    }
  }, [fontsLoaded, fontError]);

  // Silence web aria-hidden warning when switching screens or tabs
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleBlurFocus = () => {
        if (document.activeElement && document.activeElement !== document.body) {
          (document.activeElement as HTMLElement)?.blur?.();
        }
      };
      window.addEventListener('popstate', handleBlurFocus);
      return () => window.removeEventListener('popstate', handleBlurFocus);
    }
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: '#F0F9FF' },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="loading" />
        <Stack.Screen name="(student)" />
        <Stack.Screen name="(teacher)" />
      </Stack>
    </AuthProvider>
  );
}
