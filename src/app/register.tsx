import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../hooks/use-auth';
import { Colors, Shadows, Typography } from '../theme';

export default function RegisterScreen() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [section, setSection] = useState('Kinder - Masayahin');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setErrorMessage('Pakipunan ang lahat ng impormasyon.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Ang password ay dapat mayroong hindi bababa sa 6 na karakter.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      await register(name.trim(), email.trim(), password, 'student', section);
      router.replace('/(student)');
    } catch (err: any) {
      setErrorMessage(err.message || 'Nabigong magrehistro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>Sumali sa WikaPlay! 🎒</Text>
          <Text style={styles.subtitle}>Gumawa ng account para sa mag-aaral</Text>
        </View>

        <View style={[styles.card, Shadows.card]}>
          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pangalan ng Mag-aaral</Text>
            <TextInput
              style={styles.input}
              placeholder="Halimbawa: Juan Dela Cruz"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Halimbawa: juan@wikaplay.ph"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Seksiyon / Klase</Text>
            <TextInput
              style={styles.input}
              placeholder="Halimbawa: Kinder - Masayahin"
              placeholderTextColor={Colors.textMuted}
              value={section}
              onChangeText={setSection}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Hindi bababa sa 6 na karakter"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <PrimaryButton
            title={loading ? 'Nirerehistro...' : 'Magrehistro'}
            variant="primary"
            size="lg"
            loading={loading}
            onPress={handleRegister}
            style={styles.submitBtn}
          />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Mayroon ka nang account? </Text>
            <Link href="/login" asChild>
              <TouchableOpacity>
                <Text style={styles.loginLink}>Pumasok dito</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0F2FE',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 48,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: Typography.sizes.hero,
    fontWeight: Typography.weights.heavy,
    color: '#0369A1',
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    fontWeight: Typography.weights.semibold,
    marginTop: 4,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.white,
    borderRadius: 28,
    padding: 24,
    borderWidth: 4,
    borderColor: Colors.white,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  errorText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    color: '#991B1B',
    fontWeight: Typography.weights.bold,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: Typography.sizes.md,
    color: Colors.text,
  },
  submitBtn: {
    marginTop: 10,
    marginBottom: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
  },
  loginLink: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.heavy,
    color: Colors.skyBlueDark,
  },
});
