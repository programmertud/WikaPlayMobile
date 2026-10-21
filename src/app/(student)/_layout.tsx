import { Stack, router } from 'expo-router';
import React, { useEffect } from 'react';
import { useAuth } from '../../hooks/use-auth';
import { usePresence } from '../../hooks/use-presence';

export default function StudentLayout() {
  const { isStudent, isAuthenticated } = useAuth();

  // Send background student heartbeat to update teacher's live dashboard
  usePresence('Nag-aaral sa Dashboard', 'student_main');

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    } else if (!isStudent) {
      router.replace('/(teacher)');
    }
  }, [isAuthenticated, isStudent]);

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
      <Stack.Screen name="quiz/[slug]/[difficulty]" options={{ headerShown: false }} />
      <Stack.Screen name="games/[slug]" options={{ headerShown: false }} />
    </Stack>
  );
}
