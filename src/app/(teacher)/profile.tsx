import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LoadingView } from '../../components/LoadingView';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuth } from '../../hooks/use-auth';
import { authService } from '../../services/api';
import { Colors, Shadows, Typography } from '../../theme';

interface StatsData {
  stars_balance: number;
  unlocked_collectibles_count: number;
  quizzes_passed_count: number;
  minigames_played_count: number;
}

export default function TeacherProfileScreen() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    authService.getMe()
      .then((res) => setStats(res.stats))
      .catch(() => { /* non-critical */ })
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    Alert.alert('Mag-logout', 'Sigurado ka bang gusto mong lumabas?', [
      { text: 'Hindi', style: 'cancel' },
      {
        text: 'Oo', style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try { await logout(); } catch { } finally { setLoggingOut(false); }
        },
      },
    ]);
  };

  if (loading) return <LoadingView message="Kinukuha ang profile..." />;

  const displayName = user?.name ?? 'Guro';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={[styles.avatarCircle, Shadows.card]}>
          <Text style={styles.avatarInitial}>{initial}</Text>
        </View>
        <Text style={styles.displayName}>{displayName}</Text>
        <Text style={styles.roleLabel}>👩‍🏫 Guro</Text>
        {user?.email && <Text style={styles.emailLabel}>{user.email}</Text>}
      </View>

      {/* Info Card */}
      <View style={[styles.infoCard, Shadows.soft]}>
        <InfoRow icon="👤" label="Buong Pangalan" value={user?.name ?? '—'} />
        <InfoRow icon="📧" label="Email" value={user?.email ?? '—'} />
        <InfoRow icon="🎭" label="Tungkulin" value="Guro" />
      </View>

      {/* WikaPlay Info */}
      <View style={[styles.aboutCard, Shadows.soft]}>
        <Text style={styles.aboutTitle}>ℹ️ Tungkol sa WikaPlay</Text>
        <Text style={styles.aboutText}>
          Ang WikaPlay ay isang mobile application para sa mga mag-aaral sa kindergarten na nagtuturong
          Filipino vocabulary sa pamamagitan ng mga flashcard, quiz, at mini-games.
        </Text>
        <Text style={styles.version}>Bersyon: 1.0.0</Text>
      </View>

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

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.icon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={rowStyles.label}>{label}</Text>
        <Text style={rowStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  icon: { fontSize: 20, width: 32 },
  label: { fontSize: Typography.sizes.xs, color: Colors.textMuted, fontWeight: Typography.weights.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  value: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, color: Colors.text, marginTop: 1 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3FF' },
  scrollContent: { padding: 16, paddingTop: 52, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatarCircle: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: '#7C3AED',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderColor: Colors.white, marginBottom: 12,
  },
  avatarInitial: { fontSize: 40, fontWeight: Typography.weights.heavy, color: Colors.white },
  displayName: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.heavy, color: Colors.text, marginBottom: 4 },
  roleLabel: { fontSize: Typography.sizes.sm, color: '#7C3AED', fontWeight: Typography.weights.bold, marginBottom: 2 },
  emailLabel: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 2 },
  infoCard: { backgroundColor: Colors.white, borderRadius: 24, borderWidth: 3, borderColor: Colors.white, padding: 20, marginBottom: 16 },
  aboutCard: { backgroundColor: Colors.white, borderRadius: 24, borderWidth: 3, borderColor: Colors.white, padding: 20, marginBottom: 20 },
  aboutTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.heavy, color: Colors.text, marginBottom: 10 },
  aboutText: { fontSize: Typography.sizes.sm, color: Colors.textLight, lineHeight: 20, marginBottom: 8 },
  version: { fontSize: Typography.sizes.xs, color: Colors.textMuted, fontStyle: 'italic' },
});
