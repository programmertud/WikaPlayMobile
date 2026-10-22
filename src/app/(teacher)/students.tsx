import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { EmptyState } from '../../components/EmptyState';
import { ErrorView } from '../../components/ErrorView';
import { LoadingView } from '../../components/LoadingView';
import { PressableScale } from '../../components/PressableScale';
import { teacherService } from '../../services/api';
import { Colors, Gradients, Shadows, Typography, Radius } from '../../theme';
import type { StudentMonitoringItem } from '../../types';

export default function StudentsMonitoringScreen() {
  const insets = useSafeAreaInsets();
  const [students, setStudents] = useState<StudentMonitoringItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [studentHistory, setStudentHistory] = useState<Record<number, any>>({});
  const [loadingHistory, setLoadingHistory] = useState<number | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);

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

  const handleToggleStatus = async (student: StudentMonitoringItem) => {
    const newStatus = student.status === 'disabled' ? 'active' : 'disabled';
    const actionLabel = newStatus === 'active' ? 'buhayin (activate)' : 'i-disable';

    Alert.alert(
      'Kumpirmahin',
      `Nais mo bang ${actionLabel} ang account ni ${student.name}?`,
      [
        { text: 'Kanselahin', style: 'cancel' },
        {
          text: 'Ipagpatuloy',
          onPress: async () => {
            setUpdatingStatusId(student.id);
            try {
              await teacherService.updateStudentStatus(student.id, newStatus);
              setStudents((prev) =>
                prev.map((s) => (s.id === student.id ? { ...s, status: newStatus } : s))
              );
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Nabigong i-update ang status.');
            } finally {
              setUpdatingStatusId(null);
            }
          },
        },
      ]
    );
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      (s.student_id_code && s.student_id_code.toLowerCase().includes(searchQuery.toLowerCase().trim()))
  );

  if (loading && !refreshing) return <LoadingView message="Kinukuha ang mga estudyante..." />;
  if (error && students.length === 0) return <ErrorView message={error} onRetry={loadStudents} />;

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
            loadStudents();
          }}
          colors={[Colors.teacherPurple]}
        />
      }
    >
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <Ionicons name="people" size={24} color={Colors.teacherPurple} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>Mga Estudyante</Text>
          <Text style={styles.pageSubtitle}>{students.length} nakatalang mag-aaral</Text>
        </View>
      </View>

      {/* Student Name Search Bar */}
      <View style={[styles.searchBox, Shadows.subtle]}>
        <Ionicons name="search" size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Ihanap ayon sa pangalan o Student ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="words"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {filteredStudents.length === 0 ? (
        <EmptyState
          emoji="👨‍🎓"
          title={searchQuery ? 'Walang nahanap' : 'Walang Estudyante'}
          message={
            searchQuery
              ? `Walang tumutugma sa "${searchQuery}". Pakisuri ang baybay.`
              : 'Walang estudyante na nagrehistro pa sa klase.'
          }
        />
      ) : (
        filteredStudents.map((student) => (
          <View key={student.id} style={[styles.studentCard, Shadows.soft]}>
            {/* Student Row */}
            <PressableScale
              onPress={() => handleExpandStudent(student.id)}
              style={styles.studentRow}
            >
              {/* Avatar */}
              <LinearGradient
                colors={student.is_online ? Gradients.grass : Gradients.teacher}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>{student.name.charAt(0).toUpperCase()}</Text>
              </LinearGradient>

              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.studentName} numberOfLines={1}>{student.name}</Text>
                  {student.is_online && <View style={styles.onlinePip} />}
                </View>

                {/* Student ID Code & Section */}
                <View style={styles.metaRow}>
                  {student.student_id_code ? (
                    <Text style={styles.idBadge}>{student.student_id_code}</Text>
                  ) : null}
                  {student.section ? <Text style={styles.section}>{student.section}</Text> : null}
                </View>

                <Text style={styles.activity} numberOfLines={1}>
                  {student.is_online
                    ? student.current_activity || 'Nag-aaral...'
                    : `Huling aktibo: ${student.last_active_at ? new Date(student.last_active_at).toLocaleDateString('fil-PH') : 'Kamakailan'}`}
                </Text>
              </View>

              {/* Status Toggle & Quick Stats Pill */}
              <View style={styles.statusCol}>
                <TouchableOpacity
                  onPress={() => handleToggleStatus(student)}
                  disabled={updatingStatusId === student.id}
                  style={[
                    styles.statusToggleBtn,
                    student.status === 'disabled' ? styles.statusBtnDisabled : styles.statusBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusToggleText,
                      student.status === 'disabled' ? styles.statusTextDisabled : styles.statusTextActive,
                    ]}
                  >
                    {updatingStatusId === student.id
                      ? '...'
                      : student.status === 'disabled'
                      ? 'Naka-disable'
                      : 'Aktibo'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.quickStats}>
                  <View style={styles.statPill}>
                    <Ionicons name="star" size={13} color={Colors.sunYellowDark} />
                    <Text style={styles.quickStat}>{student.stars_balance}</Text>
                  </View>
                  <View style={styles.statPill}>
                    <Ionicons name="checkmark-circle" size={13} color={Colors.grassGreenDark} />
                    <Text style={styles.quickStat}>{student.quizzes_passed}</Text>
                  </View>
                </View>
              </View>
            </PressableScale>

            {/* Expanded History */}
            {expandedId === student.id && (
              <View style={styles.historySection}>
                {loadingHistory === student.id ? (
                  <Text style={styles.historyLoading}>Kinukuha ang kasaysayan...</Text>
                ) : studentHistory[student.id] ? (
                  <>
                    <View style={styles.historyHeader}>
                      <Ionicons name="document-text" size={16} color={Colors.teacherPurple} />
                      <Text style={styles.historyTitle}>Kasaysayan ng Quiz</Text>
                    </View>
                    {studentHistory[student.id].quiz_history?.slice(0, 5).map((quiz: any, i: number) => (
                      <View key={i} style={styles.historyRow}>
                        <View style={styles.quizInfoRow}>
                          <Ionicons
                            name={quiz.passed ? 'checkmark-circle' : 'close-circle'}
                            size={16}
                            color={quiz.passed ? Colors.grassGreen : Colors.coralPink}
                          />
                          <Text style={styles.historyItem}>
                            {quiz.category_name ?? 'Quiz'} ({quiz.difficulty})
                          </Text>
                        </View>
                        <Text style={styles.historyScore}>{quiz.score ?? 0} pts</Text>
                      </View>
                    )) ?? <Text style={styles.historyEmpty}>Walang kasaysayan ng quiz.</Text>}

                    <View style={[styles.historyHeader, { marginTop: 14 }]}>
                      <Ionicons name="game-controller" size={16} color={Colors.skyBlueDark} />
                      <Text style={styles.historyTitle}>Kasaysayan ng Laro</Text>
                    </View>
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
  container: { flex: 1, backgroundColor: Colors.teacherPurpleBg },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  pageTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  pageSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
  },
  studentCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    marginBottom: 12,
    overflow: 'hidden',
  },
  studentRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
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
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  studentName: {
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
  section: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  activity: { fontSize: Typography.sizes.xs, color: Colors.textLight, marginTop: 2 },
  quickStats: { alignItems: 'flex-end', gap: 4 },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickStat: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.textLight,
  },
  historySection: {
    backgroundColor: '#FAF5FF',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 58, 237, 0.1)',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  historyLoading: {
    fontSize: Typography.sizes.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    padding: 12,
  },
  historyTitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  quizInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
  },
  historyItem: { fontSize: Typography.sizes.xs, color: Colors.text, flex: 1 },
  historyScore: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.teacherPurple,
  },
  historyEmpty: { fontSize: Typography.sizes.xs, color: Colors.textMuted, fontStyle: 'italic' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    paddingVertical: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  idBadge: {
    fontSize: 10,
    fontWeight: Typography.weights.bold,
    color: Colors.teacherPurple,
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },
  statusCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  statusBtnActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  statusBtnDisabled: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusToggleText: {
    fontSize: 10,
    fontWeight: Typography.weights.bold,
  },
  statusTextActive: {
    color: Colors.grassGreenDark,
  },
  statusTextDisabled: {
    color: Colors.coralPinkDark,
  },
});
