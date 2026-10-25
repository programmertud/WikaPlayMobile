import { Link, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/utils/haptics';

import { PrimaryButton } from '../components/PrimaryButton';
import { InputField } from '../components/InputField';
import { PressableScale } from '../components/PressableScale';
import { GradientBackground } from '../components/GradientBackground';
import { useAuth } from '../hooks/use-auth';
import { ApiClient } from '../services/api';
import { bgm } from '../services/audio/bgm-service';
import { playFeedbackSound, playWelcomeSound } from '../services/audio/sound-service';
import { Colors, Gradients, Shadows, Typography, Radius } from '../theme';

export default function LoginScreen() {
  const { login, studentLogin } = useAuth();
  const [studentName, setStudentName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Server IP config modal
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState(ApiClient.getBaseUrl());

  // Gentle float animation for the logo
  const floatY = useSharedValue(0);
  // Role toggle indicator slide
  const roleToggleAnim = useSharedValue(0);

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1800 }),
        withTiming(0, { duration: 1800 })
      ),
      -1,
      true
    );
  }, []);

  const handleRoleChange = (newRole: 'student' | 'teacher') => {
    Haptics.selectionAsync().catch(() => {});
    setRole(newRole);
    setErrorMessage(null);
    roleToggleAnim.value = withSpring(newRole === 'student' ? 0 : 1, {
      damping: 18,
      stiffness: 220,
    });
  };

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  const handleLogin = async (overrideName?: string, overrideEmail?: string, overridePass?: string) => {
    if (loading) return; // Prevent duplicate submissions

    setErrorMessage(null);
    setLoading(true);

    try {
      if (role === 'student') {
        const nameToUse = (overrideName || studentName).trim();
        if (!nameToUse) {
          setErrorMessage('Pakilagay ang iyong buong pangalan.');
          setLoading(false);
          return;
        }

        await studentLogin(nameToUse);

        // Tasteful celebration: success haptics & cheerful audio welcome
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        if (!bgm.getMuted()) {
          playWelcomeSound().catch(() => {});
        }

        // Navigate to dedicated animated loading screen before opening student dashboard
        router.replace('/loading');
      } else {
        const loginEmail = (overrideEmail || email).trim();
        const loginPass = overridePass || password;

        if (!loginEmail || !loginPass) {
          setErrorMessage('Pakilagay ang iyong email at password.');
          setLoading(false);
          return;
        }

        const loggedUser = await login(loginEmail, loginPass, 'teacher');
        if (loggedUser.role === 'teacher' || loggedUser.role === 'admin') {
          router.replace('/(teacher)');
        } else {
          router.replace('/loading');
        }
      }
    } catch (err: any) {
      if (role === 'student' && (err.status === 404 || err.message?.includes('Hindi namin makita'))) {
        setErrorMessage('Hindi namin makita ang pangalang ito. Pakisuri ang iyong pangalan o magpatulong sa iyong guro.');
      } else {
        setErrorMessage(err.message || 'Nabigong mag-login. Pakisubukang muli.');
      }
    } finally {
      setLoading(false);
    }
  };

  const saveCustomApiUrl = async () => {
    await ApiClient.setBaseUrl(customApiUrl);
    setIsConfigModalOpen(false);
    Alert.alert('Tagumpay', `Naitakda ang API URL sa: ${ApiClient.getBaseUrl()}`);
  };

  return (
    <GradientBackground variant={role === 'teacher' ? 'teacher' : 'sky'}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand Header with Floating Logo */}
          <View style={styles.brandHeader}>
            <Animated.View style={[styles.logoBadge, Shadows.card, logoAnimatedStyle]}>
              <LinearGradient
                colors={role === 'teacher' ? Gradients.teacher : Gradients.sky}
                style={styles.logoGradient}
              >
                <Ionicons
                  name={role === 'teacher' ? 'school' : 'sparkles'}
                  size={36}
                  color={Colors.white}
                />
              </LinearGradient>
            </Animated.View>
            <Text style={styles.brandTitle}>WikaPlay</Text>
            <Text style={styles.brandSubtitle}>Masayang Pagkatuto ng Wikang Filipino</Text>
          </View>

          {/* Segmented Role Toggle */}
          <View style={[styles.roleToggleContainer, Shadows.subtle]}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleRoleChange('student')}
              style={[
                styles.roleTab,
                role === 'student' && styles.roleTabActive,
              ]}
            >
              <Ionicons
                name="happy"
                size={18}
                color={role === 'student' ? Colors.skyBlueDark : Colors.textMuted}
                style={styles.roleIcon}
              />
              <Text
                style={[
                  styles.roleText,
                  role === 'student' && styles.roleTextActiveStudent,
                ]}
              >
                Mag-aaral
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleRoleChange('teacher')}
              style={[
                styles.roleTab,
                role === 'teacher' && styles.roleTabActive,
              ]}
            >
              <Ionicons
                name="school"
                size={18}
                color={role === 'teacher' ? Colors.teacherPurple : Colors.textMuted}
                style={styles.roleIcon}
              />
              <Text
                style={[
                  styles.roleText,
                  role === 'teacher' && styles.roleTextActiveTeacher,
                ]}
              >
                Guro
              </Text>
            </TouchableOpacity>
          </View>

          {/* Login Form Card */}
          <View style={[styles.card, Shadows.card]}>
            <Text style={styles.cardHeader}>
              {role === 'student' ? 'Kamusta, Mag-aaral! 👋' : 'Pumasok sa Teacher Portal'}
            </Text>
            {role === 'student' && (
              <Text style={styles.studentPromptText}>
                I-type ang iyong buong pangalan para makapasok at magsimulang maglaro!
              </Text>
            )}

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={Colors.error} style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {role === 'student' ? (
              <InputField
                label="Buong Pangalan (Full Name)"
                icon="person-outline"
                placeholder="Halimbawa: Juan Dela Cruz"
                value={studentName}
                onChangeText={setStudentName}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={() => handleLogin()}
              />
            ) : (
              <>
                <InputField
                  label="Email Address"
                  icon="mail-outline"
                  placeholder="Halimbawa: juan@wikaplay.ph"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />

                <InputField
                  label="Password"
                  icon="lock-closed-outline"
                  placeholder="Ilagay ang iyong password"
                  value={password}
                  onChangeText={setPassword}
                  isPassword
                />
              </>
            )}

            <PrimaryButton
              title={loading ? 'Pumapasok...' : (role === 'student' ? 'Mag-login' : 'Pumasok (Log In)')}
              variant={role === 'student' ? 'primary' : 'teacher'}
              size="lg"
              loading={loading}
              icon="log-in"
              onPress={() => handleLogin()}
              style={styles.loginBtn}
            />

            {/* Registration link */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Wala ka pang account? </Text>
              <Link href="/register" asChild>
                <TouchableOpacity>
                  <Text style={[styles.registerLink, { color: role === 'teacher' ? Colors.teacherPurple : Colors.skyBlueDark }]}>
                    Magrehistro rito
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>

          {/* Server IP Config Footer Button */}
          <PressableScale
            onPress={() => setIsConfigModalOpen(true)}
            style={styles.serverConfigBtn}
          >
            <Ionicons name="settings-outline" size={14} color={Colors.textLight} />
            <Text style={styles.serverConfigText}>
              Server URL: {ApiClient.getBaseUrl()}
            </Text>
          </PressableScale>
        </ScrollView>

        {/* Server URL Config Modal */}
        <Modal visible={isConfigModalOpen} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, Shadows.card]}>
              <Text style={styles.modalTitle}>Ayusin ang Backend Server URL</Text>
              <Text style={styles.modalSubtitle}>
                Kung gumagamit ng pisikal na Android phone, ilagay ang IP ng computer (hal. http://192.168.1.5:8000/api).
              </Text>

              <TextInput
                style={styles.modalInput}
                value={customApiUrl}
                onChangeText={setCustomApiUrl}
                placeholder="http://192.168.1.x:8000/api"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.modalActions}>
                <PrimaryButton
                  title="Kanselahin"
                  variant="secondary"
                  size="md"
                  onPress={() => setIsConfigModalOpen(false)}
                  style={{ flex: 1 }}
                />
                <PrimaryButton
                  title="I-save"
                  variant="primary"
                  size="md"
                  onPress={saveCustomApiUrl}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 40,
    alignItems: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    marginBottom: 12,
  },
  logoGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: Typography.sizes.xxl,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: 2,
    textAlign: 'center',
  },
  roleToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: Radius.pill,
    padding: 4,
    marginBottom: 18,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: Radius.pill,
  },
  roleTabActive: {
    backgroundColor: Colors.white,
    ...Shadows.subtle,
  },
  roleIcon: {
    marginRight: 6,
  },
  roleText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.textMuted,
  },
  roleTextActiveStudent: {
    color: Colors.skyBlueDark,
  },
  roleTextActiveTeacher: {
    color: Colors.teacherPurple,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 24,
    marginBottom: 16,
  },
  cardHeader: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  studentPromptText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
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
  loginBtn: {
    marginTop: 8,
    marginBottom: 16,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
  },
  registerLink: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.heavy,
  },
  serverConfigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  serverConfigText: {
    fontSize: 11,
    color: Colors.textLight,
    fontWeight: Typography.weights.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  modalTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    lineHeight: 18,
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
});
