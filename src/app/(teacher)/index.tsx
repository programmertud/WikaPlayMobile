import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ErrorView } from '../../components/ErrorView';
import { LoadingView } from '../../components/LoadingView';
import { useAuth } from '../../hooks/use-auth';
import { teacherService } from '../../services/api';
import { Colors, Shadows, Typography } from '../../theme';
import type { StudentMonitoringItem } from '../../types';

export default function TeacherDashboardScreen() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentMonitoringItem[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const res = await teacherService.getStudents();
      setStudents(res.students);
      setOnlineCount(res.online_count);
      setTotalStudents(res.total_students);
    } catch (err: any) {
      setError(err.message || 'Nabigong kunin ang datos ng estudyante.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    // Poll every 30 seconds for live monitoring
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading && !refreshing) return <LoadingView message="Kinukuha ang dashboard..." />;
  if (error && students.length === 0) return <ErrorView message={error} onRetry={loadData} />;

  const greeting = user?.name ? user.name.split(' ')[0] : 'Guro';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} colors={['#7C3AED']} />}
    >
      {/* Header */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.appTitle}>👩‍🏫 WikaPlay</Text>
          <Text style={styles.greeting}>Magandang araw, {greeting}!</Text>
        </View>
        <View style={styles.onlineBadge}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>{onlineCount} Online</Text>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <StatCard emoji="👨‍🎓" value={totalStudents} label="Estudyante" color="#7C3AED" />
        <StatCard emoji="🟢" value={onlineCount} label="Online Ngayon" color="#10B981" />
        <StatCard emoji="📊" value={students.filter((s) => s.quizzes_passed > 0).length} label="May Naipasa" color="#3B82F6" />
      </View>

      {/* Live Activity Feed */}
      <Text style={styles.sectionTitle}>🔴 Live na Aktibidad</Text>
      {students
        .filter((s) => s.is_online)
        .map((student) => (
          <LiveCard key={student.id} student={student} />
        ))}
      {students.filter((s) => s.is_online).length === 0 && (
        <View style={[styles.emptyCard, Shadows.soft]}>
          <Text style={styles.emptyText}>Walang estudyante na online ngayon.</Text>
        </View>
      )}

      {/* Top Performers */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>🏆 Mga Nangungunang Estudyante</Text>
      {[...students]
        .sort((a, b) => b.quizzes_passed - a.quizzes_passed)
        .slice(0, 5)
        .map((student, idx) => (
          <LeaderboardCard key={student.id} student={student} rank={idx + 1} />
        ))}
      {students.length === 0 && (
        <View style={[styles.emptyCard, Shadows.soft]}>
          <Text style={styles.emptyText}>Walang datos na estudyante pa.</Text>
        </View>
      )}
    </ScrollView>
  );
}

function StatCard({ emoji, value, label, color }: { emoji: string; value: number; label: string; color: string }) {
  return (
    <View style={[statStyles.card, { borderColor: color }, Shadows.soft]}>
      <Text style={statStyles.emoji}>{emoji}</Text>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function LiveCard({ student }: { student: StudentMonitoringItem }) {
  return (
    <View style={[liveStyles.card, Shadows.soft]}>
      <View style={liveStyles.avatar}>
        <Text style={liveStyles.avatarText}>{student.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={liveStyles.nameRow}>
          <Text style={liveStyles.name}>{student.name}</Text>
          <View style={liveStyles.onlinePip} />
        </View>
        <Text style={liveStyles.activity} numberOfLines={1}>
          {student.current_activity || 'Nag-aaral...'}
        </Text>
        {student.section ? <Text style={liveStyles.section}>{student.section}</Text> : null}
      </View>
      <Text style={liveStyles.stars}>⭐ {student.stars_balance}</Text>
    </View>
  );
}

function LeaderboardCard({ student, rank }: { student: StudentMonitoringItem; rank: number }) {
  const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;
  return (
    <View style={[lbStyles.card, Shadows.soft]}>
      <Text style={lbStyles.rank}>{rankEmoji}</Text>
      <View style={lbStyles.avatar}>
        <Text style={lbStyles.avatarText}>{student.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={lbStyles.name}>{student.name}</Text>
        <Text style={lbStyles.meta}>
          {student.quizzes_passed} quiz naipasa · {student.games_played} laro
        </Text>
      </View>
      <Text style={lbStyles.stars}>⭐ {student.stars_balance}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1, marginHorizontal: 4, backgroundColor: Colors.white,
    borderRadius: 18, borderWidth: 2, padding: 14, alignItems: 'center',
  },
  emoji: { fontSize: 24, marginBottom: 4 },
  value: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.heavy },
  label: { fontSize: Typography.sizes.xs, color: Colors.textLight, fontWeight: Typography.weights.semibold, textAlign: 'center', marginTop: 2 },
});

const liveStyles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    borderRadius: 18, borderWidth: 2, borderColor: '#D1FAE5',
    padding: 14, marginBottom: 10,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#7C3AED',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { color: Colors.white, fontWeight: Typography.weights.heavy, fontSize: Typography.sizes.md },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.heavy, color: Colors.text, flex: 1 },
  onlinePip: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  activity: { fontSize: Typography.sizes.xs, color: Colors.textLight, marginTop: 2 },
  section: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 1 },
  stars: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.heavy, color: '#D97706' },
});

const lbStyles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    borderRadius: 18, borderWidth: 2, borderColor: '#E2E8F0', padding: 14, marginBottom: 10,
  },
  rank: { fontSize: Typography.sizes.xl, marginRight: 10, width: 36 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#7C3AED',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { color: Colors.white, fontWeight: Typography.weights.heavy },
  name: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.heavy, color: Colors.text },
  meta: { fontSize: Typography.sizes.xs, color: Colors.textLight, marginTop: 2 },
  stars: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.heavy, color: '#D97706' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3FF' },
  scrollContent: { padding: 16, paddingTop: 52, paddingBottom: 40 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20,
  },
  appTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.heavy, color: '#4C1D95' },
  greeting: { fontSize: Typography.sizes.sm, color: Colors.textLight, marginTop: 2 },
  onlineBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#D1FAE5',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: '#6EE7B7',
  },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 6 },
  onlineText: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.heavy, color: '#065F46' },
  statsRow: { flexDirection: 'row', marginBottom: 24 },
  sectionTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.heavy, color: Colors.text, marginBottom: 14 },
  emptyCard: {
    backgroundColor: Colors.white, borderRadius: 18, padding: 20, alignItems: 'center',
  },
  emptyText: { fontSize: Typography.sizes.sm, color: Colors.textMuted },
});
