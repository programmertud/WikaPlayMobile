import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { LoadingView } from '../../../components/LoadingView';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { useAuth } from '../../../hooks/use-auth';
import { usePresence } from '../../../hooks/use-presence';
import { authService } from '../../../services/api';
import { Colors, Gradients, Shadows, Typography, Radius } from '../../../theme';

interface StatsData {
  stars_balance: number;
  unlocked_collectibles_count: number;
  quizzes_passed_count: number;
  minigames_played_count: number;
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  usePresence('Sa Profile', 'profile');

  const loadStats = useCallback(async () => {
    try {
      const res = await authService.getMe();
      setStats(res.stats);
    } catch {
      // Non-critical; user info is still visible
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleLogout = () => {
    Alert.alert(
      'Mag-logout',
      'Sigurado ka bang gusto mong lumabas sa WikaPlay?',
      [
        { text: 'Hindi', style: 'cancel' },
        {
          text: 'Oo, Lumabas',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await logout();
            } catch {
              // logout clears token regardless
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  if (loading) return <LoadingView message="Kinukuha ang profile..." />;

  const displayName = user?.name ?? 'Estudyante';
  const initial = displayName.charAt(0).toUpperCase();
  const section = user?.section;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: Math.max(insets.top, 16) + 12 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar with Gradient Ring */}
      <View style={styles.avatarSection}>
        <LinearGradient
          colors={Gradients.sky}
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
          <Ionicons
            name={user?.role === 'teacher' ? 'school' : 'happy'}
            size={14}
            color={Colors.skyBlueDark}
          />
          <Text style={styles.roleLabel}>
            {user?.role === 'teacher' ? 'Guro' : 'Estudyante'}
          </Text>
        </View>
        {section && <Text style={styles.sectionLabel}>Seksiyon: {section}</Text>}
        <Text style={styles.emailLabel}>{user?.email}</Text>
      </View>

      {/* Stats Grid with Ionicons */}
      <View style={[styles.statsCard, Shadows.card]}>
        <Text style={styles.statsTitle}>Aking mga Tagumpay 🌟</Text>
        <View style={styles.statsGrid}>
          <StatBox
            icon="star"
            value={stats?.stars_balance ?? user?.stars_balance ?? 0}
            label="Bituin"
            color="#F59E0B"
            bgColor="#FFFBEB"
          />
          <StatBox
            icon="trophy"
            value={stats?.unlocked_collectibles_count ?? 0}
            label="Kolektible"
            color="#8B5CF6"
            bgColor="#F5F3FF"
          />
          <StatBox
            icon="checkmark-circle"
            value={stats?.quizzes_passed_count ?? 0}
            label="Quiz Naipasa"
            color="#10B981"
            bgColor="#F0FDF4"
          />
          <StatBox
            icon="game-controller"
            value={stats?.minigames_played_count ?? 0}
            label="Laro Nilaro"
            color="#0284C7"
            bgColor="#F0F9FF"
          />
        </View>
      </View>

      {/* Info Card */}
      <View style={[styles.infoCard, Shadows.soft]}>
        <InfoRow icon="person" label="Buong Pangalan" value={user?.name ?? '—'} />
        <InfoRow icon="mail" label="Email" value={user?.email ?? '—'} />
        {section && <InfoRow icon="business" label="Seksiyon" value={section} />}
        <InfoRow
          icon="shield-checkmark"
          label="Tungkulin"
          value={user?.role === 'teacher' ? 'Guro' : 'Estudyante'}
        />
      </View>

      {/* Logout Button */}
      <PrimaryButton
        title={loggingOut ? 'Lumalabas...' : 'Mag-logout'}
        variant="danger"
        size="lg"
        icon="log-out"
        onPress={handleLogout}
        disabled={loggingOut}
        style={{ marginTop: 8 }}
      />
    </ScrollView>
  );
}

function StatBox({
  icon,
  value,
  label,
  color,
  bgColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  color: string;
  bgColor: string;
}) {
  return (
    <View style={[statStyles.box, { backgroundColor: bgColor, borderColor: color + '30' }]}>
      <Ionicons name={icon} size={26} color={color} style={{ marginBottom: 4 }} />
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
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
    <View style={infoStyles.row}>
      <View style={infoStyles.iconWrapper}>
        <Ionicons name={icon} size={18} color={Colors.skyBlueDark} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={infoStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

const statStyles = StyleSheet.create({
  box: {
    width: '47%',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  value: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    marginBottom: 2,
  },
  label: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    fontWeight: Typography.weights.semibold,
  },
});

const infoStyles = StyleSheet.create({
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
    backgroundColor: Colors.skyBlueLight,
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
  container: { flex: 1, backgroundColor: '#F0F9FF' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
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
    color: Colors.skyBlueDark,
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
    backgroundColor: Colors.skyBlueLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    gap: 6,
    marginBottom: 4,
  },
  roleLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.skyBlueDark,
    fontWeight: Typography.weights.bold,
  },
  sectionLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
  },
  emailLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statsCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 20,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 18,
    marginBottom: 20,
  },
});
