import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { LoadingView } from '../../components/LoadingView';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../hooks/use-auth';
import { authService, teacherService } from '../../services/api';
import { Colors, Gradients, Shadows, Typography, Radius } from '../../theme';

export default function TeacherProfileScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    authService.getMe()
      .catch(() => { /* non-critical */ })
      .finally(() => setLoading(false));
  }, []);


  const confirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch {}
    finally {
      setLoggingOut(false);
      setShowLogoutModal(false);
      router.replace('/login');
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  if (loading) return <LoadingView message="Kinukuha ang profile..." />;

  const displayName = user?.name ?? 'Guro';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <View style={{ flex: 1, backgroundColor: '#F0F9FF' }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 16) + 12 },
        ]}
        showsVerticalScrollIndicator={false}
    >
      {/* Avatar with Teacher Gradient Ring */}
      <View style={styles.avatarSection}>
        <LinearGradient
          colors={Gradients.teacher}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarRing}
        >
          <View style={styles.avatarInner}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
        </LinearGradient>

        <Text style={styles.displayName}>{displayName}</Text>
        <View style={styles.roleBadge}>
          <Ionicons name="school" size={14} color={Colors.teacherPurple} />
          <Text style={styles.roleLabel}>Guro (Teacher Portal)</Text>
        </View>
        {user?.email ? <Text style={styles.emailLabel}>{user.email}</Text> : null}
      </View>

      {/* Info Card */}
      <View style={[styles.infoCard, Shadows.card]}>
        <InfoRow icon="person" label="Buong Pangalan" value={user?.name ?? '—'} />
        <InfoRow icon="mail" label="Email Address" value={user?.email ?? '—'} />
        <InfoRow icon="shield-checkmark" label="Tungkulin" value="Guro / Administrator" />
      </View>

      {/* WikaPlay Info Card */}
      <View style={[styles.aboutCard, Shadows.card]}>
        <View style={styles.aboutHeader}>
          <Ionicons name="information-circle" size={20} color={Colors.teacherPurple} />
          <Text style={styles.aboutTitle}>Tungkol sa WikaPlay</Text>
        </View>
        <Text style={styles.aboutText}>
          Ang WikaPlay ay isang mobile learning application para sa mga mag-aaral sa kindergarten na nagtuturo ng
          Filipino vocabulary sa pamamagitan ng interactive flashcards, audio quizzes, at mini-games.
        </Text>
        <Text style={styles.version}>Bersyon: 1.0.0 (Expo SDK 58)</Text>
      </View>

      {/* Reports & CSV Export Hub */}
      <View style={[styles.aboutCard, Shadows.card]}>
        <View style={styles.aboutHeader}>
          <Ionicons name="document-text" size={20} color={Colors.teacherPurple} />
          <Text style={styles.aboutTitle}>Mga Ulat at CSV Export</Text>
        </View>
        <Text style={styles.aboutText}>
          I-download o i-export ang opisyal na mga datos ng mag-aaral para sa pagtatala ng grado at ebalwasyon ng klase:
        </Text>

        <View style={styles.exportList}>
          <TouchableOpacity
            style={styles.exportItemBtn}
            onPress={async () => {
              try {
                const res = await teacherService.exportReportsCsv('quizzes');
                Alert.alert(
                  'Ulat ng Pagsusulit (CSV)',
                  `Matagumpay na naihanda ang "${res.filename}" na may ${res.total_records} rekord ng pagsusulit.`
                );
              } catch (e: any) {
                Alert.alert('Error', e?.message || 'Nabigong i-export ang ulat.');
              }
            }}
          >
            <View style={[styles.exportIconCircle, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="newspaper" size={18} color={Colors.teacherPurple} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.exportItemTitle}>Ulat ng Pagsusulit (Quiz Records)</Text>
              <Text style={styles.exportItemSub}>Mga marka, kahirapan, tamang sagot, at resulta</Text>
            </View>
            <Ionicons name="download-outline" size={18} color={Colors.teacherPurple} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exportItemBtn}
            onPress={async () => {
              try {
                const res = await teacherService.exportReportsCsv('minigames');
                Alert.alert(
                  'Ulat ng Mini-Games (CSV)',
                  `Matagumpay na naihanda ang "${res.filename}" na may ${res.total_records} sesyon ng laro.`
                );
              } catch (e: any) {
                Alert.alert('Error', e?.message || 'Nabigong i-export ang ulat.');
              }
            }}
          >
            <View style={[styles.exportIconCircle, { backgroundColor: '#FCE7F3' }]}>
              <Ionicons name="game-controller" size={18} color="#DB2777" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.exportItemTitle}>Ulat ng Mini-Games</Text>
              <Text style={styles.exportItemSub}>Puntos sa 5 mini-games at mystery box qualifiers</Text>
            </View>
            <Ionicons name="download-outline" size={18} color="#DB2777" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exportItemBtn}
            onPress={async () => {
              try {
                const res = await teacherService.exportReportsCsv('stars');
                Alert.alert(
                  'Ledger ng mga Bituin (CSV)',
                  `Matagumpay na naihanda ang "${res.filename}" na may ${res.total_records} transaksyon.`
                );
              } catch (e: any) {
                Alert.alert('Error', e?.message || 'Nabigong i-export ang ulat.');
              }
            }}
          >
            <View style={[styles.exportIconCircle, { backgroundColor: '#FEF08A' }]}>
              <Ionicons name="star" size={18} color={Colors.sunYellowDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.exportItemTitle}>Ledger ng mga Bituin (Star Audit)</Text>
              <Text style={styles.exportItemSub}>Pumasok, lumabas, at adjustments ng guro</Text>
            </View>
            <Ionicons name="download-outline" size={18} color={Colors.sunYellowDark} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exportItemBtn}
            onPress={async () => {
              try {
                const res = await teacherService.exportReportsCsv('students');
                Alert.alert(
                  'Talaan ng Mag-aaral (CSV)',
                  `Matagumpay na naihanda ang "${res.filename}" na may ${res.total_records} mag-aaral.`
                );
              } catch (e: any) {
                Alert.alert('Error', e?.message || 'Nabigong i-export ang ulat.');
              }
            }}
          >
            <View style={[styles.exportIconCircle, { backgroundColor: '#DCFCE7' }]}>
              <Ionicons name="people" size={18} color={Colors.grassGreenDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.exportItemTitle}>Talaan ng Mag-aaral (Roster)</Text>
              <Text style={styles.exportItemSub}>Pangalan, Student ID, seksyon, at estado ng account</Text>
            </View>
            <Ionicons name="download-outline" size={18} color={Colors.grassGreenDark} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Logout Button */}
      <PrimaryButton
        title={loggingOut ? 'Lumalabas...' : 'Mag-logout'}
        variant="danger"
        size="lg"
        icon="log-out"
        onPress={handleLogout}
        disabled={loggingOut}
        style={{ marginTop: 12 }}
      />
    </ScrollView>

    {/* Logout Confirmation Modal */}
    <Modal
      visible={showLogoutModal}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!loggingOut) setShowLogoutModal(false);
      }}
    >
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.card, Shadows.card]}>
          <View style={modalStyles.iconCircle}>
            <Ionicons name="log-out" size={32} color="#EF4444" />
          </View>
          <Text style={modalStyles.title}>Mag-logout sa Portal ng Guro?</Text>
          <Text style={modalStyles.subtitle}>
            Sigurado ka bang nais mong lumabas sa portal, {user?.name || 'Guro'}?
          </Text>
          <View style={modalStyles.btnGroup}>
            <PrimaryButton
              title={loggingOut ? 'Lumalabas...' : 'Oo, Lumabas'}
              variant="danger"
              size="md"
              icon="log-out"
              onPress={confirmLogout}
              disabled={loggingOut}
              style={{ width: '100%', marginBottom: 10 }}
            />
            <PrimaryButton
              title="Bumalik"
              variant="outline"
              size="md"
              onPress={() => setShowLogoutModal(false)}
              disabled={loggingOut}
              style={{ width: '100%' }}
            />
          </View>
        </View>
      </View>
    </Modal>
  </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.iconWrapper}>
        <Ionicons name={icon} size={18} color={Colors.teacherPurple} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={rowStyles.label}>{label}</Text>
        <Text style={rowStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: Colors.teacherPurpleLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  label: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    fontWeight: Typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginTop: 2,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.teacherPurpleBg },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    padding: 3,
  },
  avatarInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 40,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.teacherPurple,
  },
  displayName: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.teacherPurpleLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    gap: 6,
    marginBottom: 4,
  },
  roleLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.teacherPurple,
    fontWeight: Typography.weights.bold,
  },
  emailLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 18,
    marginBottom: 16,
  },
  aboutCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 20,
    marginBottom: 20,
  },
  aboutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  aboutTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  aboutText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    lineHeight: 18,
    marginBottom: 10,
  },
  version: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  exportList: {
    marginTop: 8,
    gap: 8,
  },
  exportItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.md,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  exportIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportItemTitle: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  exportItemSub: {
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 1,
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    padding: 24,
    alignItems: 'center',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  btnGroup: {
    width: '100%',
  },
});
