import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LoadingView } from '../../../components/LoadingView';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { useAuth } from '../../../hooks/use-auth';
import { usePresence } from '../../../hooks/use-presence';
import { authService, quizService, rewardService } from '../../../services/api';
import { Colors, Shadows, Typography } from '../../../theme';

interface StatsData {
  stars_balance: number;
  unlocked_collectibles_count: number;
  quizzes_passed_count: number;
  minigames_played_count: number;
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  usePresence('Sa Profile', 'profile');

  const loadStats = useCallback(async () => {
    try {
      const res = await authService.getMe();
      setStats(res.stats);
      // Note: do NOT call updateUserStars here — that would trigger an auth
      // context re-render on every mount, causing an infinite setState loop.
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
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={[styles.avatarCircle, Shadows.card]}>
          <Text style={styles.avatarInitial}>{initial}</Text>
        </View>
        <Text style={styles.displayName}>{displayName}</Text>
        <Text style={styles.roleLabel}>
          {user?.role === 'teacher' ? '👩‍🏫 Guro' : '🎒 Estudyante'}
        </Text>
        {section && <Text style={styles.sectionLabel}>Seksiyon: {section}</Text>}
        <Text style={styles.emailLabel}>{user?.email}</Text>
      </View>

      {/* Stats Grid */}
      <View style={[styles.statsCard, Shadows.card]}>
        <Text style={styles.statsTitle}>Aking mga Tagumpay</Text>
        <View style={styles.statsGrid}>
          <StatBox emoji="⭐" value={stats?.stars_balance ?? user?.stars_balance ?? 0} label="Bituin" color="#F59E0B" />
          <StatBox emoji="🏆" value={stats?.unlocked_collectibles_count ?? 0} label="Kolektible" color="#8B5CF6" />
          <StatBox emoji="📝" value={stats?.quizzes_passed_count ?? 0} label="Quiz Naipasa" color="#10B981" />
          <StatBox emoji="🎮" value={stats?.minigames_played_count ?? 0} label="Laro Nilaro" color="#3B82F6" />
        </View>
      </View>

      {/* Info Card */}
      <View style={[styles.infoCard, Shadows.soft]}>
        <InfoRow icon="👤" label="Buong Pangalan" value={user?.name ?? '—'} />
        <InfoRow icon="📧" label="Email" value={user?.email ?? '—'} />
        {section && <InfoRow icon="🏫" label="Seksiyon" value={section} />}
        <InfoRow icon="🎭" label="Tungkulin" value={user?.role === 'teacher' ? 'Guro' : 'Estudyante'} />
      </View>

      {/* Logout */}
      <PrimaryButton
        title={loggingOut ? 'Lumalabas...' : '🚪 Mag-logout'}
        variant="danger"
        size="lg"
        onPress={handleLogout}
        disabled={loggingOut}
        style={{ marginTop: 8 }}
      />
    </ScrollView>
  );
}

function StatBox({ emoji, value, label, color }: { emoji: string; value: number; label: string; color: string }) {
  return (
    <View style={[statStyles.box, { borderColor: color }]}>
      <Text style={statStyles.emoji}>{emoji}</Text>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.icon}>{icon}</Text>
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
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    borderWidth: 2,
    padding: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  emoji: { fontSize: 28, marginBottom: 4 },
  value: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.heavy,
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
  icon: { fontSize: 20, width: 32 },
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
    marginTop: 1,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF' },
  scrollContent: { padding: 16, paddingTop: 52, paddingBottom: 40 },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.skyBlueDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: Colors.white,
    marginBottom: 12,
  },
  avatarInitial: {
    fontSize: 40,
    fontWeight: Typography.weights.heavy,
    color: Colors.white,
  },
  displayName: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.heavy,
    color: Colors.text,
    marginBottom: 4,
  },
  roleLabel: {
    fontSize: Typography.sizes.sm,
    color: Colors.skyBlueDark,
    fontWeight: Typography.weights.bold,
    marginBottom: 2,
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
    borderRadius: 24,
    borderWidth: 3,
    borderColor: Colors.white,
    padding: 20,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.heavy,
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
    borderRadius: 24,
    borderWidth: 3,
    borderColor: Colors.white,
    padding: 20,
    marginBottom: 20,
  },
});
