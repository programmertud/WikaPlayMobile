import { router, useLocalSearchParams } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadows, Typography } from '../../theme';

import { AnimatedBackground } from '../../components/AnimatedBackground';

export default function QuizLockedScreen() {
  const { category, difficulty } = useLocalSearchParams<{ category: string; difficulty: string }>();
  const level = difficulty === 'madali' ? 'Madali' : difficulty === 'mahirap' ? 'Mahirap' : 'Katamtaman';
  return (
    <AnimatedBackground>
      <View style={styles.overlay}>
        <View style={[styles.card, Shadows.card]}>
          <View style={styles.icon}><Ionicons name="lock-closed" size={30} color="#A855F7" /></View>
          <Text style={styles.title}>Naka-lock ang pagsusulit</Text>
          <Text style={styles.message}>{category} · {level} ay kasalukuyang naka-lock ng guro. Subukan muli sa ibang pagkakataon.</Text>
          <TouchableOpacity style={styles.button} onPress={() => router.back()}><Text style={styles.buttonText}>Bumalik</Text></TouchableOpacity>
        </View>
      </View>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: 'rgba(15, 23, 42, 0.48)' },
  card: { width: '100%', maxWidth: 360, alignItems: 'center', padding: 24, borderRadius: Radius.xl, backgroundColor: Colors.white },
  icon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontFamily: Typography.family.display, fontWeight: Typography.weights.bold, fontSize: 22, color: Colors.text, textAlign: 'center' },
  message: { fontSize: 15, color: Colors.textLight, textAlign: 'center', lineHeight: 22, marginTop: 8, marginBottom: 20 },
  button: { backgroundColor: Colors.vibrantPurple, borderRadius: Radius.pill, paddingHorizontal: 28, paddingVertical: 12 },
  buttonText: { color: Colors.white, fontFamily: Typography.family.display, fontWeight: Typography.weights.bold },
});
