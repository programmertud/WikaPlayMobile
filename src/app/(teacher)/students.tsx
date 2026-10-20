import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { EmptyState } from '../../components/EmptyState';
import { ErrorView } from '../../components/ErrorView';
import { LoadingView } from '../../components/LoadingView';
import { teacherService } from '../../services/api';
import { Colors, Shadows, Typography } from '../../theme';
import type { StudentMonitoringItem } from '../../types';

export default function StudentsMonitoringScreen() {
  const [students, setStudents] = useState<StudentMonitoringItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [studentHistory, setStudentHistory] = useState<Record<number, any>>({});
  const [loadingHistory, setLoadingHistory] = useState<number | null>(null);

  const loadStudents = useCallback(async () => {
    try {
      setError(null);
      const res = await teacherService.getStudents();
      setStudents(res.students);
    } catch (err: any) {
      setError(err.message || 'Nabigong kunin ang listahan ng estudyante.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
    const t = setInterval(loadStudents, 30000);
    return () => clearInterval(t);
  }, [loadStudents]);

  const handleExpandStudent = async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!studentHistory[id]) {
      setLoadingHistory(id);
      try {
        const res = await teacherService.getStudentHistory(id);
        setStudentHistory((prev) => ({ ...prev, [id]: res }));
      } catch { /* non-critical */ }
      finally { setLoadingHistory(null); }
    }
  };

  if (loading && !refreshing) return <LoadingView message="Kinukuha ang mga estudyante..." />;
  if (error && students.length === 0) return <ErrorView message={error} onRetry={loadStudents} />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadStudents(); }} colors={['#7C3AED']} />}
    >
      <Text style={styles.pageTitle}>👨‍🎓 Mga Estudyante ({students.length})</Text>

      {students.length === 0 ? (
        <EmptyState emoji="👨‍🎓" title="Walang Estudyante" subtitle="Walang estudyante na nagrehistro pa." />
      ) : (
        students.map((student) => (
          <View key={student.id} style={[styles.studentCard, Shadows.soft]}>
            {/* Student Row */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleExpandStudent(student.id)}
              style={styles.studentRow}
            >
              {/* Avatar */}
              <View style={[styles.avatar, student.is_online && styles.avatarOnline]}>
                <Text style={styles.avatarText}>{student.name.charAt(0).toUpperCase()}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.studentName} numberOfLines={1}>{student.name}</Text>
                  {student.is_online && <View style={styles.onlinePip} />}
                </View>
                {student.section && <Text style={styles.section}>{student.section}</Text>}
                <Text style={styles.activity} numberOfLines={1}>
                  {student.is_online ? student.current_activity || 'Nag-aaral...' : `Huling aktibo: ${new Date(student.last_active_at).toLocaleDateString('fil-PH')}`}
                </Text>
              </View>

              {/* Quick Stats */}
              <View style={styles.quickStats}>
                <Text style={styles.quickStat}>⭐ {student.stars_balance}</Text>
                <Text style={styles.quickStat}>✅ {student.quizzes_passed}</Text>
                <Text style={styles.quickStat}>🎮 {student.games_played}</Text>
              </View>
            </TouchableOpacity>

            {/* Expanded History */}
            {expandedId === student.id && (
              <View style={styles.historySection}>
                {loadingHistory === student.id ? (
                  <Text style={styles.historyLoading}>Kinukuha ang kasaysayan...</Text>
                ) : studentHistory[student.id] ? (
                  <>
                    <Text style={styles.historyTitle}>📋 Kasaysayan ng Quiz</Text>
                    {studentHistory[student.id].quiz_history?.slice(0, 5).map((quiz: any, i: number) => (
                      <View key={i} style={styles.historyRow}>
                        <Text style={styles.historyItem}>
                          {quiz.passed ? '✅' : '❌'} {quiz.category_name ?? 'Quiz'} ({quiz.difficulty})
                        </Text>
                        <Text style={styles.historyScore}>{quiz.score ?? 0} pts</Text>
                      </View>
                    )) ?? <Text style={styles.historyEmpty}>Walang kasaysayan ng quiz.</Text>}

                    <Text style={[styles.historyTitle, { marginTop: 12 }]}>🎮 Kasaysayan ng Laro</Text>
                    {studentHistory[student.id].game_history?.slice(0, 5).map((game: any, i: number) => (
                      <View key={i} style={styles.historyRow}>
                        <Text style={styles.historyItem}>{game.game_type ?? 'Laro'}</Text>
                        <Text style={styles.historyScore}>{game.score ?? 0} pts</Text>
                      </View>
                    )) ?? <Text style={styles.historyEmpty}>Walang kasaysayan ng laro.</Text>}
                  </>
                ) : (
                  <Text style={styles.historyEmpty}>Walang datos.</Text>
                )}
              </View>
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3FF' },
  scrollContent: { padding: 16, paddingTop: 52, paddingBottom: 40 },
  pageTitle: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.heavy, color: Colors.text, marginBottom: 20 },
  studentCard: {
    backgroundColor: Colors.white, borderRadius: 20, borderWidth: 2,
    borderColor: '#E2E8F0', marginBottom: 12, overflow: 'hidden',
  },
  studentRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: '#7C3AED',
    justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 3, borderColor: Colors.white,
  },
  avatarOnline: { borderColor: '#10B981' },
  avatarText: { color: Colors.white, fontWeight: Typography.weights.heavy, fontSize: Typography.sizes.md },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  studentName: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.heavy, color: Colors.text, flex: 1 },
  onlinePip: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginLeft: 6 },
  section: { fontSize: Typography.sizes.xs, color: Colors.textMuted, marginTop: 1 },
  activity: { fontSize: Typography.sizes.xs, color: Colors.textLight, marginTop: 2 },
  quickStats: { alignItems: 'flex-end', gap: 2 },
  quickStat: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold, color: Colors.textLight },
  historySection: {
    backgroundColor: '#F8FAFC', padding: 14,
    borderTopWidth: 1, borderTopColor: '#E2E8F0',
  },
  historyLoading: { fontSize: Typography.sizes.sm, color: Colors.textMuted, textAlign: 'center', padding: 12 },
  historyTitle: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.heavy, color: Colors.text, marginBottom: 8 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  historyItem: { fontSize: Typography.sizes.xs, color: Colors.textLight, flex: 1 },
  historyScore: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.heavy, color: '#7C3AED' },
  historyEmpty: { fontSize: Typography.sizes.xs, color: Colors.textMuted, fontStyle: 'italic' },
});
