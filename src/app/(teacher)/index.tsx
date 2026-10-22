import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { ErrorView } from '../../components/ErrorView';
import { LoadingView } from '../../components/LoadingView';
import { useAuth } from '../../hooks/use-auth';
import { teacherService } from '../../services/api';
import { Colors, Gradients, Shadows, Typography, Radius } from '../../theme';
import type { StudentMonitoringItem } from '../../types';

export default function TeacherDashboardScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [students, setStudents] = useState<StudentMonitoringItem[]>([]);
  const [dashboardStats, setDashboardStats] = useState<{
    total_students: number;
    online_students: number;
    offline_students: number;
    total_quiz_attempts: number;
    average_quiz_score: number;
    total_stars_awarded: number;
  }>({
    total_students: 0,
    online_students: 0,
    offline_students: 0,
    total_quiz_attempts: 0,
    average_quiz_score: 0,
    total_stars_awarded: 0,
  });
  const [recentQuizResults, setRecentQuizResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [studentsRes, statsRes] = await Promise.allSettled([
        teacherService.getStudents(),
        teacherService.getDashboardStats(),
      ]);

      if (studentsRes.status === 'fulfilled') {
        setStudents(studentsRes.value.students);
      }

      if (statsRes.status === 'fulfilled') {
        setDashboardStats(statsRes.value.stats);
        setRecentQuizResults(statsRes.value.recent_quiz_results || []);
      }
    } catch (err: any) {
      setError(err.message || 'Nabigong kunin ang datos ng dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading && !refreshing) return <LoadingView message="Kinukuha ang dashboard..." />;
  if (error && students.length === 0) return <ErrorView message={error} onRetry={loadData} />;

  const greeting = user?.name ? user.name.split(' ')[0] : 'Guro';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: Math.max(insets.top, 16) + 12 },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadData();
          }}
          colors={[Colors.teacherPurple]}
        />
      }
    >
      {/* Header */}
      <View style={styles.topBar}>
        <View style={styles.brandingCol}>
          <Text style={styles.appTitle}>WikaPlay Guro</Text>
          <Text style={styles.greeting}>Magandang araw, {greeting}! 👋</Text>
        </View>
        <View style={[styles.onlineBadge, Shadows.subtle]}>
          <View style={styles.onlineDot} />
          <Text style={styles.onlineText}>{dashboardStats.online_students} Online</Text>
        </View>
      </View>

      {/* Stats Cards Row */}
      <View style={styles.statsRow}>
        <StatCard icon="people" value={dashboardStats.total_students} label="Estudyante" color={Colors.teacherPurple} />
        <StatCard icon="radio-button-on" value={dashboardStats.online_students} label="Online" color={Colors.grassGreen} />
        <StatCard icon="checkmark-done" value={dashboardStats.total_quiz_attempts} label="Pagsusulit" color={Colors.skyBlueDark} />
        <StatCard icon="analytics" value={dashboardStats.average_quiz_score} label="Avg Score" color={Colors.sunYellowDark} />
      </View>

      {/* Recent Quiz Results */}
      {recentQuizResults.length > 0 && (
        <View style={styles.recentSection}>
          <View style={[styles.sectionHeaderRow, { marginTop: 14 }]}>
            <Ionicons name="newspaper-outline" size={20} color={Colors.teacherPurple} />
            <Text style={styles.sectionTitle}>Pinakabagong Resulta ng Quiz</Text>
          </View>
          {recentQuizResults.slice(0, 5).map((result, idx) => (
            <View key={result.id || idx} style={[recentStyles.card, Shadows.soft]}>
              <View style={[recentStyles.badge, { backgroundColor: result.passed ? '#DCFCE7' : '#FEE2E2' }]}>
                <Ionicons
                  name={result.passed ? 'checkmark-circle' : 'close-circle'}
                  size={18}
                  color={result.passed ? Colors.grassGreenDark : Colors.coralPinkDark}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={recentStyles.studentName}>{result.user?.name || 'Estudyante'}</Text>
                <Text style={recentStyles.meta}>
                  {result.category?.name || 'Aralin'} · {result.difficulty ? result.difficulty.toUpperCase() : 'MADALI'}
                </Text>
              </View>
              <View style={recentStyles.scoreCol}>
                <Text style={[recentStyles.scoreText, { color: result.passed ? Colors.grassGreenDark : Colors.coralPinkDark }]}>
                  {result.score} pts
                </Text>
                <Text style={recentStyles.starsText}>+{result.stars_awarded ?? 0} ⭐</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Live Activity Feed */}
      <View style={[styles.sectionHeaderRow, { marginTop: 16 }]}>
        <Ionicons name="pulse" size={20} color={Colors.teacherPurple} />
        <Text style={styles.sectionTitle}>Live na Aktibidad</Text>
      </View>

      {students
        .filter((s) => s.is_online)
        .map((student) => (
          <LiveCard key={student.id} student={student} />
        ))}
      {students.filter((s) => s.is_online).length === 0 && (
        <View style={[styles.emptyCard, Shadows.subtle]}>
          <Ionicons name="moon-outline" size={32} color={Colors.textMuted} style={{ marginBottom: 6 }} />
          <Text style={styles.emptyText}>Walang estudyante na online ngayon.</Text>
        </View>
      )}

      {/* Top Performers */}
      <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
        <Ionicons name="trophy" size={20} color={Colors.sunYellowDark} />
        <Text style={styles.sectionTitle}>Mga Nangungunang Estudyante</Text>
      </View>

      {[...students]
        .sort((a, b) => b.quizzes_passed - a.quizzes_passed)
        .slice(0, 5)
        .map((student, idx) => (
          <LeaderboardCard key={student.id} student={student} rank={idx + 1} />
        ))}
      {students.length === 0 && (
        <View style={[styles.emptyCard, Shadows.subtle]}>
          <Text style={styles.emptyText}>Walang datos na estudyante pa.</Text>
        </View>
      )}
    </ScrollView>
  );
}

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <View style={[statStyles.card, Shadows.soft]}>
      <Ionicons name={icon} size={22} color={color} style={{ marginBottom: 4 }} />
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function LiveCard({ student }: { student: StudentMonitoringItem }) {
  return (
    <View style={[liveStyles.card, Shadows.soft]}>
      <LinearGradient
        colors={Gradients.teacher}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={liveStyles.avatar}
      >
        <Text style={liveStyles.avatarText}>{student.name.charAt(0).toUpperCase()}</Text>
      </LinearGradient>
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
      <View style={liveStyles.starsBadge}>
        <Ionicons name="star" size={14} color={Colors.sunYellowDark} />
        <Text style={liveStyles.stars}>{student.stars_balance}</Text>
      </View>
    </View>
  );
}

function LeaderboardCard({ student, rank }: { student: StudentMonitoringItem; rank: number }) {
  const getRankBadge = () => {
    if (rank === 1) return { color: Colors.sunYellowDark, icon: 'trophy' as const };
    if (rank === 2) return { color: '#94A3B8', icon: 'medal' as const };
    if (rank === 3) return { color: '#B45309', icon: 'ribbon' as const };
    return { color: Colors.textMuted, icon: null };
  };

  const badge = getRankBadge();

  return (
    <View style={[lbStyles.card, Shadows.soft]}>
      <View style={lbStyles.rankBox}>
        {badge.icon ? (
          <Ionicons name={badge.icon} size={20} color={badge.color} />
        ) : (
          <Text style={lbStyles.rankNum}>#{rank}</Text>
        )}
      </View>
      <LinearGradient
        colors={Gradients.purpleLight}
        style={lbStyles.avatar}
      >
        <Text style={lbStyles.avatarText}>{student.name.charAt(0).toUpperCase()}</Text>
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={lbStyles.name}>{student.name}</Text>
        <Text style={lbStyles.meta}>
          {student.quizzes_passed} quiz naipasa · {student.games_played} laro
        </Text>
      </View>
      <View style={lbStyles.starsBadge}>
        <Ionicons name="star" size={14} color={Colors.sunYellowDark} />
        <Text style={lbStyles.stars}>{student.stars_balance}</Text>
      </View>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 14,
    alignItems: 'center',
  },
  value: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  label: {
    fontSize: 11,
    color: Colors.textLight,
    fontWeight: Typography.weights.semibold,
    textAlign: 'center',
    marginTop: 2,
  },
});

const liveStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    padding: 14,
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: Colors.white,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    fontSize: Typography.sizes.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    flex: 1,
  },
  onlinePip: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.grassGreen,
    marginLeft: 6,
  },
  activity: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  section: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  starsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  stars: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: '#92400E',
  },
});

const lbStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 14,
    marginBottom: 10,
  },
  rankBox: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  rankNum: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.textLight,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: Colors.teacherPurple,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  name: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  meta: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  starsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  stars: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: '#92400E',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.teacherPurpleBg,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  brandingCol: {
    flex: 1,
  },
  appTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.teacherPurpleDark,
  },
  greeting: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: 1,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.grassGreen,
    marginRight: 6,
  },
  onlineText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: '#065F46',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  emptyText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
  },
  recentSection: {
    marginBottom: 8,
  },
});

const recentStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  studentName: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  meta: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 2,
  },
  scoreCol: {
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  starsText: {
    fontSize: 11,
    color: Colors.sunYellowDark,
    fontWeight: Typography.weights.bold,
  },
});
