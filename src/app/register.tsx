import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { PrimaryButton } from '../components/PrimaryButton';
import { InputField } from '../components/InputField';
import { GradientBackground } from '../components/GradientBackground';
import { useAuth } from '../hooks/use-auth';
import { Colors, Gradients, Shadows, Typography, Radius } from '../theme';

export default function RegisterScreen() {
  const { studentRegister } = useAuth();
  const [name, setName] = useState('');
  const [section, setSection] = useState('Kinder - Masayahin');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    const trimmedName = name.replace(/\s+/g, ' ').trim();
    if (!trimmedName) {
      setErrorMessage('Pakilagay ang buong pangalan ng mag-aaral.');
      return;
    }

    if (trimmedName.length < 2) {
      setErrorMessage('Masyadong maikli ang pangalan.');
      return;
    }

    if (trimmedName.length > 80) {
      setErrorMessage('Masyadong mahaba ang pangalan.');
      return;
    }

    if (loading) return;

    setErrorMessage(null);
    setLoading(true);

    try {
      await studentRegister(trimmedName, section.trim() || undefined);
      router.replace('/loading');
    } catch (err: any) {
      setErrorMessage(err.message || 'Nabigong magrehistro. Pakisubukang muli.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground variant="sky">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar with Back to Login Button */}
          <View style={styles.topBar}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/login');
                }
              }}
              style={[styles.backBtn, Shadows.subtle]}
              accessibilityRole="button"
              accessibilityLabel="Bumalik sa Login"
            >
              <Ionicons name="arrow-back" size={20} color={Colors.skyBlueDark} />
              <Text style={styles.backBtnText}>Bumalik sa Login</Text>
            </TouchableOpacity>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.logoBadge, Shadows.card]}>
              <LinearGradient
                colors={Gradients.sky}
                style={styles.logoGradient}
              >
                <Ionicons name="sparkles" size={32} color={Colors.white} />
              </LinearGradient>
            </View>
            <Text style={styles.title}>Sumali sa WikaPlay! 🎒</Text>
            <Text style={styles.subtitle}>Ipasok ang pangalan para makapagsimula</Text>
          </View>

          {/* Form Card */}
          <View style={[styles.card, Shadows.card]}>
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={Colors.error} style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            <InputField
              label="Buong Pangalan ng Mag-aaral"
              icon="person-outline"
              placeholder="Halimbawa: Juan Dela Cruz"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
            />

            <InputField
              label="Seksiyon / Klase (Opsyonal)"
              icon="school-outline"
              placeholder="Halimbawa: Kinder - Masayahin"
              value={section}
              onChangeText={setSection}
            />

            <Text style={styles.securityNote}>
              💡 Paunawa: Walang kailangang password. Gamitin lamang ang buong pangalan para mag-login sa susunod.
            </Text>

            <PrimaryButton
              title={loading ? 'Nirerehistro...' : 'Magrehistro at Maglaro 🚀'}
              variant="primary"
              size="lg"
              loading={loading}
              icon="arrow-forward"
              iconPosition="right"
              onPress={handleRegister}
              style={{ marginTop: 8 }}
            />

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>May account ka na? </Text>
              <Link href="/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.loginLink}>Pumasok dito</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 40,
    alignItems: 'center',
  },
  topBar: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  backBtnText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.skyBlueDark,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: 10,
  },
  logoGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: Typography.sizes.xxl,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  subtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 24,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: Radius.md,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  footerText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
  },
  loginLink: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.heavy,
    color: Colors.skyBlueDark,
  },
  securityNote: {
    fontSize: 11,
    color: Colors.textMuted,
    backgroundColor: '#F0F9FF',
    padding: 10,
    borderRadius: Radius.md,
    lineHeight: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
});
