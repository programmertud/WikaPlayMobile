import { Link, router } from 'expo-router';
import React, { useState } from 'react';
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
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../hooks/use-auth';
import { ApiClient } from '../services/api';
import { Colors, Shadows, Typography } from '../theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Server IP config modal
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState(ApiClient.getBaseUrl());

  const handleLogin = async (overrideEmail?: string, overridePass?: string, overrideRole?: 'student' | 'teacher') => {
    const loginEmail = (overrideEmail || email).trim();
    const loginPass = overridePass || password;
    const loginRole = overrideRole || role;

    if (!loginEmail || !loginPass) {
      setErrorMessage('Pakilagay ang iyong email at password.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      const loggedUser = await login(loginEmail, loginPass, loginRole);
      if (loggedUser.role === 'teacher' || loggedUser.role === 'admin') {
        router.replace('/(teacher)');
      } else {
        router.replace('/(student)');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Nabigong mag-login. Pakisubukang muli.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStudentLogin = () => {
    setEmail('student@wikaplay.ph');
    setPassword('password123');
    setRole('student');
    handleLogin('student@wikaplay.ph', 'password123', 'student');
  };

  const handleQuickTeacherLogin = () => {
    setEmail('teacher@wikaplay.ph');
    setPassword('password123');
    setRole('teacher');
    handleLogin('teacher@wikaplay.ph', 'password123', 'teacher');
  };

  const saveCustomApiUrl = async () => {
    await ApiClient.setBaseUrl(customApiUrl);
    setIsConfigModalOpen(false);
    Alert.alert('Tagumpay', `Naitakda ang API URL sa: ${ApiClient.getBaseUrl()}`);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardContainer}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <View style={[styles.logoBadge, Shadows.card]}>
            <Text style={styles.sunIcon}>☀️</Text>
            <Text style={styles.bookIcon}>📖</Text>
          </View>
          <Text style={styles.brandTitle}>WikaPlay</Text>
          <Text style={styles.brandSubtitle}>Masayang Pagkatuto ng Wikang Filipino</Text>
        </View>

        {/* Role Toggle Selector */}
        <View style={styles.roleToggleContainer}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setRole('student')}
            style={[
              styles.roleTab,
              role === 'student' && styles.roleTabActive,
              role === 'student' && { backgroundColor: Colors.skyBlue },
            ]}
          >
            <Text style={styles.roleEmoji}>🎒</Text>
            <Text style={[styles.roleText, role === 'student' && styles.roleTextActive]}>
              Mag-aaral
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setRole('teacher')}
            style={[
              styles.roleTab,
              role === 'teacher' && styles.roleTabActive,
              role === 'teacher' && { backgroundColor: Colors.sunYellowDark },
            ]}
          >
            <Text style={styles.roleEmoji}>👩‍🏫</Text>
            <Text style={[styles.roleText, role === 'teacher' && styles.roleTextActive]}>
              Guro
            </Text>
          </TouchableOpacity>
        </View>

        {/* Login Form Card */}
        <View style={[styles.card, Shadows.card]}>
          <Text style={styles.cardHeader}>
            {role === 'student' ? 'Maligayang Pagbabalik, Mag-aaral!' : 'Pumasok sa Teacher Portal'}
          </Text>

          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

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
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Ilagay ang iyong password"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <PrimaryButton
            title={loading ? 'Pumapasok...' : 'Pumasok (Log In)'}
            variant={role === 'student' ? 'primary' : 'warning'}
            size="lg"
            loading={loading}
            onPress={() => handleLogin()}
            style={styles.loginBtn}
          />

          {/* Quick Demo Login Helpers */}
          <View style={styles.demoSection}>
            <Text style={styles.demoLabel}>Mabilisang Pagsubok (One-Tap Test Accounts):</Text>
            <View style={styles.demoButtonsRow}>
              <TouchableOpacity
                style={[styles.demoBtn, { borderColor: Colors.skyBlue }]}
                onPress={handleQuickStudentLogin}
              >
                <Text style={styles.demoBtnText}>🎒 Mag-aaral (Juan)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.demoBtn, { borderColor: Colors.sunYellowDark }]}
                onPress={handleQuickTeacherLogin}
              >
                <Text style={styles.demoBtnText}>👩‍🏫 Guro (Maria)</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Registration link */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Wala ka pang account? </Text>
            <Link href="/register" asChild>
              <TouchableOpacity>
                <Text style={styles.registerLink}>Magrehistro rito</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        {/* Server IP Config Footer Button */}
        <TouchableOpacity
          onPress={() => setIsConfigModalOpen(true)}
          style={styles.serverConfigBtn}
        >
          <Text style={styles.serverConfigText}>
            ⚙️ Server URL: {ApiClient.getBaseUrl()}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Server URL Config Modal */}
      <Modal visible={isConfigModalOpen} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, Shadows.card]}>
            <Text style={styles.modalTitle}>Ayusin ang Backend Server URL</Text>
            <Text style={styles.modalSubtitle}>
              Kung gumagamit ng pisikal na Android phone, ilagay ang IP ng iyong computer (hal. http://192.168.1.5:8000/api).
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
                style={{ flex: 1, marginRight: 8 }}
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
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#E0F2FE',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 48,
    alignItems: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    flexDirection: 'row',
    marginBottom: 12,
  },
  sunIcon: {
    fontSize: 34,
    marginRight: -6,
  },
  bookIcon: {
    fontSize: 30,
  },
  brandTitle: {
    fontSize: Typography.sizes.hero,
    fontWeight: Typography.weights.heavy,
    color: '#0369A1',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    fontWeight: Typography.weights.semibold,
    marginTop: 4,
  },
  roleToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 22,
    padding: 4,
    marginBottom: 18,
    width: '100%',
    maxWidth: 380,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 18,
  },
  roleTabActive: {
    ...Shadows.button,
  },
  roleEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  roleText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.textLight,
  },
  roleTextActive: {
    color: Colors.white,
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
  cardHeader: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.heavy,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 16,
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
  loginBtn: {
    marginTop: 10,
    marginBottom: 16,
  },
  demoSection: {
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    paddingTop: 16,
    marginBottom: 16,
  },
  demoLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    fontWeight: Typography.weights.bold,
    marginBottom: 10,
    textAlign: 'center',
  },
  demoButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  demoBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 2,
    backgroundColor: '#F8FAFC',
    marginHorizontal: 4,
    alignItems: 'center',
  },
  demoBtnText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  footerText: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
  },
  registerLink: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.heavy,
    color: Colors.skyBlueDark,
  },
  serverConfigBtn: {
    marginTop: 24,
    padding: 8,
  },
  serverConfigText: {
    fontSize: Typography.sizes.xs,
    color: '#0284C7',
    fontWeight: Typography.weights.semibold,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
  },
  modalTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.heavy,
    color: Colors.text,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    lineHeight: 18,
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 2,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    padding: 12,
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    backgroundColor: '#F8FAFC',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
  },
});
