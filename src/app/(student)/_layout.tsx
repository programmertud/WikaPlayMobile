import { Redirect, Stack } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../../hooks/use-auth';
import { usePresence } from '../../hooks/use-presence';

export default function StudentLayout() {
  const { isStudent, isAuthenticated, isLoading } = useAuth();

  // Send background student heartbeat to update teacher's live dashboard
  usePresence('Nag-aaral sa Dashboard', 'student_main');

  // While auth is resolving, render a spinner — avoids premature redirect
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F9FF' }}>
        <ActivityIndicator size="large" color="#0EA5E9" />
      </View>
    );
  }

  // Use declarative <Redirect> instead of router.replace() in useEffect.
  // Calling router.replace() inside a layout effect triggers expo-router's
  // useNavigationTreeReducer on every render → infinite "Maximum update depth" loop on web.
  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (!isStudent) {
    return <Redirect href="/(teacher)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#F0F9FF' },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="category/[slug]" options={{ headerShown: false }} />
      <Stack.Screen name="flashcards/[slug]" options={{ headerShown: false }} />
      <Stack.Screen name="quiz/[slug]/madali" options={{ headerShown: false }} />
      <Stack.Screen name="quiz/[slug]/[difficulty]" options={{ headerShown: false }} />
      <Stack.Screen name="quiz-locked" options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="games/[slug]" options={{ headerShown: false }} />
    </Stack>
  );
}
