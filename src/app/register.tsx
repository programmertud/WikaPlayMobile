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
import { AnimatedBackground } from '../components/AnimatedBackground';
import { useAuth } from '../hooks/use-auth';
import { playWelcomeSound } from '../services/audio/sound-service';
import { Colors, Gradients, Shadows, Typography, Radius } from '../theme';

export default function RegisterScreen() {
  const { studentRegister, register } = useAuth();
  const [role, setRole] = useState<'student' | 'teacher'>('student');

  // Student fields
  const [name, setName] = useState('');
  const [enrollmentCode, setEnrollmentCode] = useState('');

  // Teacher fields
  const [teacherName, setTeacherName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sectionName, setSectionName] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async () => {
    if (loading) return;
    setErrorMessage(null);
    setLoading(true);

    try {
      if (role === 'student') {
        const trimmedName = name.replace(/\s+/g, ' ').trim();
        if (!trimmedName || trimmedName.length < 2) {
          setErrorMessage('Pakilagay ang buong pangalan ng mag-aaral (hindi bababa sa 2 titik).');
          return;
        }
        const code = enrollmentCode.trim().toUpperCase() || undefined;
        await studentRegister(trimmedName, code);
        playWelcomeSound().catch(() => {});
        router.replace('/loading');
      } else {
        const trimmedName = teacherName.replace(/\s+/g, ' ').trim();
        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedName) {
          setErrorMessage('Pakilagay ang iyong buong pangalan.');
          return;
        }
        if (!trimmedEmail || !trimmedEmail.includes('@')) {
          setErrorMessage('Pakilagay ang isang valid na email address.');
          return;
        }
        if (!password || password.length < 6) {
          setErrorMessage('Ang password ay dapat hindi bababa sa 6 na character.');
          return;
        }
        const user = await register(
          trimmedName,
          trimmedEmail,
          password,
          'teacher',
          sectionName.trim() || undefined
        );
        if (user.role === 'teacher' || user.role === 'admin') {
          router.replace('/(teacher)');
        } else {
          router.replace('/loading');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Nabigong magrehistro. Pakisubukang muli.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedBackground overlayOpacity={0.25}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (router.canGoBack()) router.back();
                else router.replace('/login');
              }}
              style={[styles.backBtn, Shadows.subtle]}
              accessibilityRole="button"
              accessibilityLabel="Bumalik sa Login"
            >
              <Ionicons name="arrow-back" size={20} color={role === 'teacher' ? Colors.teacherPurple : Colors.skyBlueDark} />
              <Text style={[styles.backBtnText, { color: role === 'teacher' ? Colors.teacherPurple : Colors.skyBlueDark }]}>Bumalik sa Login</Text>
            </TouchableOpacity>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.logoBadge, Shadows.card]}>
              <LinearGradient
                colors={role === 'teacher' ? Gradients.teacher : Gradients.sky}
                style={styles.logoGradient}
              >
                <Ionicons name={role === 'teacher' ? 'school' : 'sparkles'} size={32} color={Colors.white} />
              </LinearGradient>
            </View>
            <Text style={styles.title}>
              {role === 'student' ? 'Sumali sa WikaPlay! 🎒' : 'Magparehistro Bilang Guro 👩‍🏫'}
            </Text>
            <Text style={styles.subtitle}>
              {role === 'student'
                ? 'Ipasok ang pangalan para makapagsimula'
                : 'Gumawa ng teacher account at pangasiwaan ang iyong seksiyon'}
            </Text>
          </View>

          {/* Role Toggle */}
          <View style={[styles.roleToggle, Shadows.subtle]}>
            <TouchableOpacity
              style={[styles.roleTab, role === 'student' && styles.roleTabActive]}
              onPress={() => { setRole('student'); setErrorMessage(null); }}
              activeOpacity={0.8}
            >
              <Ionicons name="happy" size={16} color={role === 'student' ? Colors.skyBlueDark : Colors.textMuted} />
              <Text style={[styles.roleTabText, role === 'student' && { color: Colors.skyBlueDark }]}>
                Mag-aaral
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleTab, role === 'teacher' && styles.roleTabActive]}
              onPress={() => { setRole('teacher'); setErrorMessage(null); }}
              activeOpacity={0.8}
            >
              <Ionicons name="school" size={16} color={role === 'teacher' ? Colors.teacherPurple : Colors.textMuted} />
              <Text style={[styles.roleTabText, role === 'teacher' && { color: Colors.teacherPurple }]}>
                Guro
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form Card */}
          <View style={[styles.card, Shadows.card]}>
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={Colors.error} style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {role === 'student' ? (
              <>
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
                  label="Enrollment Code ng Seksyon (Opsyonal)"
                  icon="key-outline"
                  placeholder="Makuha sa iyong guro — hal. KX7F2M9QPR"
                  value={enrollmentCode}
                  onChangeText={setEnrollmentCode}
                  autoCapitalize="characters"
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                />

                <Text style={styles.securityNote}>
                  💡 Walang kailangang password — gamitin ang buong pangalan para mag-login.{'\n'}
                  🔑 Ang enrollment code ay makukuha sa iyong guro para masali sa tamang klase.
                </Text>
              </>
            ) : (
              <>
                <InputField
                  label="Buong Pangalan ng Guro"
                  icon="person-outline"
                  placeholder="Halimbawa: Gng. Santos"
                  value={teacherName}
                  onChangeText={setTeacherName}
                  autoCapitalize="words"
                  returnKeyType="next"
                />

                <InputField
                  label="Email Address"
                  icon="mail-outline"
                  placeholder="Halimbawa: teacher@school.ph"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  returnKeyType="next"
                />

                <InputField
                  label="Password"
                  icon="lock-closed-outline"
                  placeholder="Hindi bababa sa 6 na character"
                  value={password}
                  onChangeText={setPassword}
                  isPassword
                  returnKeyType="next"
                />

                <InputField
                  label="Pangalan ng Iyong Seksiyon (Opsyonal)"
                  icon="school-outline"
                  placeholder="Halimbawa: Kinder - Masayahin"
                  value={sectionName}
                  onChangeText={setSectionName}
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                />

                <Text style={styles.securityNote}>
                  🏫 Kapag nagparehistro ka, awtomatiko kang magiging teacher ng seksyong ito.{'\n'}
                  📋 Makikita ng mga mag-aaral ang iyong enrollment code para makapasok sa iyong klase.
                </Text>
              </>
            )}

            <PrimaryButton
              title={loading ? 'Nirerehistro...' : (role === 'student' ? 'Magrehistro at Maglaro 🚀' : 'Gumawa ng Teacher Account')}
              variant={role === 'teacher' ? 'teacher' : 'primary'}
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
                  <Text style={[styles.loginLink, { color: role === 'teacher' ? Colors.teacherPurple : Colors.skyBlueDark }]}>
                    Pumasok dito
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
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
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
  },
  roleToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: Radius.pill,
    padding: 4,
    marginBottom: 16,
    width: '100%',
    maxWidth: 300,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: Radius.pill,
  },
  roleTabActive: {
    backgroundColor: Colors.white,
    ...Shadows.subtle,
  },
  roleTabText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.textMuted,
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
  securityNote: {
    fontSize: 11,
    color: Colors.textMuted,
    backgroundColor: '#F0F9FF',
    padding: 10,
    borderRadius: Radius.md,
    lineHeight: 17,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
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
  },
});
