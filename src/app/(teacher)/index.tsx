import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ErrorView } from '../../components/ErrorView';
import { LoadingView } from '../../components/LoadingView';
import { AnimatedBackground } from '../../components/AnimatedBackground';
import { VolumeButton } from '../../components/VolumeButton';
import { useAuth } from '../../hooks/use-auth';
import { teacherService } from '../../services/api';
import { bgm } from '../../services/audio/bgm-service';
import { Colors, Gradients, Shadows, Typography, Radius } from '../../theme';
import type { StudentMonitoringItem } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface DashboardStatsData {
  total_students: number;
  online_students: number;
  recently_active_students: number;
  offline_students: number;
  total_quiz_attempts: number;
  completed_minigames: number;
  total_sessions: number;
  average_quiz_score: number;
  average_accuracy: number;
  average_progress: number;
  total_stars_earned: number;
  total_stars_available: number;
  total_stars_spent: number;
  total_badges_earned: number;
  total_collectibles_claimed: number;
}

export default function TeacherDashboardScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [students, setStudents] = useState<StudentMonitoringItem[]>([]);
  const [stats, setStats] = useState<DashboardStatsData>({
    total_students: 0,
    online_students: 0,
    recently_active_students: 0,
    offline_students: 0,
    total_quiz_attempts: 0,
    completed_minigames: 0,
    total_sessions: 0,
    average_quiz_score: 0,
    average_accuracy: 0,
    average_progress: 0,
    total_stars_earned: 0,
    total_stars_available: 0,
    total_stars_spent: 0,
    total_badges_earned: 0,
    total_collectibles_claimed: 0,
  });

  const [charts, setCharts] = useState<{
    participation_over_time: { day: string; date: string; quizzes: number; minigames: number; total: number }[];
    category_performance: { id: number; name: string; color: string; attempts: number; accuracy: number; avg_score: number }[];
    activity_completion: { quizzes_passed: number; quizzes_failed: number; minigames_completed: number; mystery_box_qualified: number };
    star_history: { day: string; date: string; earned: number; spent: number }[];
  }>({
    participation_over_time: [],
    category_performance: [],
    activity_completion: { quizzes_passed: 0, quizzes_failed: 0, minigames_completed: 0, mystery_box_qualified: 0 },
    star_history: [],
  });

  const [recentQuizResults, setRecentQuizResults] = useState<any[]>([]);
  const [recentMinigames, setRecentMinigames] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'feed'>('overview');
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
        setStats(statsRes.value.stats);
        if (statsRes.value.charts) {
          setCharts(statsRes.value.charts);
        }
        setRecentQuizResults(statsRes.value.recent_quiz_results || []);
        setRecentMinigames(statsRes.value.recent_minigame_results || []);
      }
    } catch (err: any) {
      setError(err?.message || 'Nabigong kunin ang datos ng dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    bgm.init();
    bgm.restore();
    loadData();
    const interval = setInterval(loadData, 20000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading && !refreshing) return <LoadingView message="Loading Teacher Dashboard..." />;
  if (error && students.length === 0) return <ErrorView message={error} onRetry={loadData} />;

  const greeting = user?.name ? user.name.split(' ')[0] : 'Teacher';
  const onlineStudents = students.filter((s) => s.is_online);

  return (
    <AnimatedBackground>
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: Math.max(insets.top, 16) + 8 },
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
      {/* Top Header */}
      <View style={styles.topBar}>
        <View style={styles.brandingCol}>
          <Text style={styles.appTitle}>WikaPlay Teacher</Text>
          <Text style={styles.greeting}>Welcome back, {greeting}! 👋</Text>
        </View>
        <View style={styles.topBarRight}>
          {/* Music Volume Button (tap = mute/unmute, hold = slider) */}
          <VolumeButton activeColor={Colors.teacherPurple} size={38} />
          <View style={[styles.onlineBadge, Shadows.subtle]}>
            <View style={[styles.onlineDot, { backgroundColor: stats.online_students > 0 ? Colors.grassGreen : '#94A3B8' }]} />
            <Text style={styles.onlineText}>
              {stats.online_students} Online
            </Text>
          </View>
        </View>
      </View>

      {/* Navigation Pills */}
      <View style={styles.tabNavRow}>
        <TouchableOpacity
          style={[styles.tabNavBtn, activeTab === 'overview' && styles.tabNavBtnActive]}
          onPress={() => setActiveTab('overview')}
        >
          <Ionicons
            name="grid"
            size={16}
            color={activeTab === 'overview' ? Colors.white : Colors.teacherPurple}
          />
          <Text style={[styles.tabNavText, activeTab === 'overview' && styles.tabNavTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabNavBtn, activeTab === 'charts' && styles.tabNavBtnActive]}
          onPress={() => setActiveTab('charts')}
        >
          <Ionicons
            name="bar-chart"
            size={16}
            color={activeTab === 'charts' ? Colors.white : Colors.teacherPurple}
          />
          <Text style={[styles.tabNavText, activeTab === 'charts' && styles.tabNavTextActive]}>
            Charts & Analytics
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabNavBtn, activeTab === 'feed' && styles.tabNavBtnActive]}
          onPress={() => setActiveTab('feed')}
        >
          <Ionicons
            name="pulse"
            size={16}
            color={activeTab === 'feed' ? Colors.white : Colors.teacherPurple}
          />
          <Text style={[styles.tabNavText, activeTab === 'feed' && styles.tabNavTextActive]}>
            Live Feed ({onlineStudents.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* VIEW: OVERVIEW */}
      {activeTab === 'overview' && (
        <>
          {/* Section: Content Management Navigation */}
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="folder-open" size={18} color={Colors.teacherPurple} />
            <Text style={styles.sectionTitle}>Content Management</Text>
          </View>

          <View style={styles.dashboardHeroCards}>
            {/* Card 1: Manage Flashcards */}
            <TouchableOpacity
              style={[styles.dashboardHeroCard, Shadows.soft]}
              onPress={() => router.push('/(teacher)/manage-flashcards' as any)}
              activeOpacity={0.85}
            >
              <View style={styles.dashboardHeroTop}>
                <View style={[styles.dashboardHeroIcon, { backgroundColor: '#EDE9FE' }]}>
                  <Ionicons name="albums" size={22} color={Colors.teacherPurple} />
                </View>
                <View style={[styles.dashboardHeroBadge, { backgroundColor: '#EDE9FE' }]}>
                  <Text style={[styles.dashboardHeroBadgeText, { color: Colors.teacherPurple }]}>151 Cards</Text>
                </View>
              </View>
              <Text style={styles.dashboardHeroTitle}>Manage Flashcards</Text>
              <Text style={styles.dashboardHeroSub}>
                Add and edit words, images, audio recordings, and translations.
              </Text>
              <View style={styles.dashboardHeroFooter}>
                <Text style={[styles.dashboardHeroAction, { color: Colors.teacherPurple }]}>Open Flashcards →</Text>
              </View>
            </TouchableOpacity>

            {/* Card 2: Manage Quiz */}
            <TouchableOpacity
              style={[styles.dashboardHeroCard, Shadows.soft]}
              onPress={() => router.push('/(teacher)/manage-quiz' as any)}
              activeOpacity={0.85}
            >
              <View style={styles.dashboardHeroTop}>
                <View style={[styles.dashboardHeroIcon, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="newspaper" size={22} color="#0284C7" />
                </View>
                <View style={[styles.dashboardHeroBadge, { backgroundColor: '#E0F2FE' }]}>
                  <Text style={[styles.dashboardHeroBadgeText, { color: '#0369A1' }]}>Lock & Questions</Text>
                </View>
              </View>
              <Text style={styles.dashboardHeroTitle}>Manage Quizzes</Text>
              <Text style={styles.dashboardHeroSub}>
                Manage questions and lock or unlock quizzes per category.
              </Text>
              <View style={styles.dashboardHeroFooter}>
                <Text style={[styles.dashboardHeroAction, { color: '#0284C7' }]}>Open Quizzes →</Text>
              </View>
            </TouchableOpacity>

            {/* Card 3: Manage Mini-Games */}
            <TouchableOpacity
              style={[styles.dashboardHeroCard, Shadows.soft]}
              onPress={() => router.push('/(teacher)/manage-minigames' as any)}
              activeOpacity={0.85}
            >
              <View style={styles.dashboardHeroTop}>
                <View style={[styles.dashboardHeroIcon, { backgroundColor: '#FCE7F3' }]}>
                  <Ionicons name="game-controller" size={22} color="#DB2777" />
                </View>
                <View style={[styles.dashboardHeroBadge, { backgroundColor: '#FCE7F3' }]}>
                  <Text style={[styles.dashboardHeroBadgeText, { color: '#BE185D' }]}>5 Games</Text>
                </View>
              </View>
              <Text style={styles.dashboardHeroTitle}>Manage Mini-Games</Text>
              <Text style={styles.dashboardHeroSub}>
                Memory Match, Picture Search, Word Guess, Letter Wheel, Pop Balloon & score rules.
              </Text>
              <View style={styles.dashboardHeroFooter}>
                <Text style={[styles.dashboardHeroAction, { color: '#DB2777' }]}>Open Mini-Games →</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Section: 11 Summary Cards */}
          <View style={[styles.sectionHeaderRow, { marginTop: 14 }]}>
            <Ionicons name="stats-chart" size={18} color={Colors.teacherPurple} />
            <Text style={styles.sectionTitle}>Class Overview & Metrics</Text>
          </View>

          {/* Grid of 11 Cards */}
          <View style={styles.statsGrid}>
            <MetricCard
              icon="people"
              value={stats.total_students}
              label="Total Students"
              color={Colors.teacherPurple}
              sub={`${stats.offline_students} offline`}
            />
            <MetricCard
              icon="radio-button-on"
              value={stats.online_students}
              label="Currently Online"
              color={Colors.grassGreenDark}
              sub="Past 3 minutes"
            />
            <MetricCard
              icon="time"
              value={stats.recently_active_students}
              label="Recently Active"
              color={Colors.skyBlueDark}
              sub="Past 15 minutes"
            />
            <MetricCard
              icon="newspaper"
              value={stats.total_quiz_attempts}
              label="Quizzes Taken"
              color="#6366F1"
              sub={`Avg: ${stats.average_quiz_score} pts`}
            />
            <MetricCard
              icon="game-controller"
              value={stats.completed_minigames}
              label="Mini-Games Completed"
              color="#EC4899"
              sub="All 5 games"
            />
            <MetricCard
              icon="shield-checkmark"
              value={`${stats.average_accuracy}%`}
              label="Average Accuracy"
              color={Colors.grassGreenDark}
              sub="Correct answers"
            />
            <MetricCard
              icon="trending-up"
              value={`${stats.average_progress}%`}
              label="Average Progress"
              color="#F59E0B"
              sub="Toward 480 milestone"
            />
            <MetricCard
              icon="star"
              value={stats.total_stars_earned.toLocaleString()}
              label="Total Stars (Lifetime)"
              color={Colors.sunYellowDark}
              sub="All cumulative stars"
            />
            <MetricCard
              icon="wallet"
              value={stats.total_stars_available.toLocaleString()}
              label="Spendable Stars"
              color="#10B981"
              sub="Active student balance"
            />
            <MetricCard
              icon="ribbon"
              value={stats.total_badges_earned}
              label="Badges Claimed"
              color="#8B5CF6"
              sub="Milestone awards"
            />
            <MetricCard
              icon="albums"
              value={stats.total_collectibles_claimed}
              label="Collectibles Unlocked"
              color="#F97316"
              sub="Collection cards (151 items)"
            />
          </View>

          {/* Quick Notice on Star Balance (No 480 Cap) */}
          <View style={[styles.infoBanner, Shadows.subtle]}>
            <Ionicons name="information-circle" size={20} color={Colors.teacherPurple} />
            <Text style={styles.infoBannerText}>
              <Text style={{ fontWeight: 'bold' }}>Star Policy:</Text> There is no 480-star cap on total student stars. 480 is simply a milestone for the &ldquo;Ultimate Learner&rdquo; badge. Students can continue earning unlimited stars.
            </Text>
          </View>

          {/* Mini-Games Overview Row */}
          <View style={[styles.sectionHeaderRow, { marginTop: 20 }]}>
            <Ionicons name="game-controller" size={18} color="#EC4899" />
            <Text style={styles.sectionTitle}>WikaPlay 5 Mini-Games</Text>
          </View>

          <View style={styles.miniGamesRow}>
            {[
              { name: 'Memory Match', tag: '20 Levels', color: '#10B981' },
              { name: 'Picture Search', tag: 'Listening', color: '#F59E0B' },
              { name: 'Word Guess', tag: 'Vocabulary', color: '#3B82F6' },
              { name: 'Letter Wheel', tag: 'Spelling', color: '#8B5CF6' },
              { name: 'Pop Balloon', tag: 'Speed', color: '#EC4899' },
            ].map((g, i) => (
              <View key={i} style={[styles.gameMiniChip, { borderColor: g.color + '40' }]}>
                <View style={[styles.gameMiniDot, { backgroundColor: g.color }]} />
                <Text style={styles.gameMiniName}>{g.name}</Text>
                <Text style={[styles.gameMiniTag, { color: g.color }]}>{g.tag}</Text>
              </View>
            ))}
          </View>

          {/* Recent Quiz Results */}
          <View style={[styles.sectionHeaderRow, { marginTop: 22 }]}>
            <Ionicons name="newspaper-outline" size={18} color={Colors.teacherPurple} />
            <Text style={styles.sectionTitle}>Recent Quiz Results</Text>
          </View>

          {recentQuizResults.length > 0 ? (
            recentQuizResults.slice(0, 5).map((result, idx) => (
              <View key={result.id || idx} style={[styles.resultCard, Shadows.soft]}>
                <View
                  style={[
                    styles.resultBadge,
                    { backgroundColor: result.passed ? '#DCFCE7' : '#FEE2E2' },
                  ]}
                >
                  <Ionicons
                    name={result.passed ? 'checkmark-circle' : 'close-circle'}
                    size={20}
                    color={result.passed ? Colors.grassGreenDark : Colors.coralPinkDark}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultStudentName}>
                    {result.user?.name || 'Student'}
                  </Text>
                  <Text style={styles.resultMeta}>
                    {result.category?.name || 'Lesson'} · {result.difficulty ? result.difficulty.toUpperCase() : 'EASY'}
                  </Text>
                </View>
                <View style={styles.resultScoreCol}>
                  <Text
                    style={[
                      styles.resultScoreText,
                      { color: result.passed ? Colors.grassGreenDark : Colors.coralPinkDark },
                    ]}
                  >
                    {result.score} pts
                  </Text>
                  <Text style={styles.resultStarsText}>+{result.stars_awarded ?? 0} ⭐</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No quiz results recorded yet.</Text>
            </View>
          )}

          {/* Top Performers by Lifetime Stars */}
          <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
            <Ionicons name="trophy" size={18} color={Colors.sunYellowDark} />
            <Text style={styles.sectionTitle}>Top Performers (Stars)</Text>
          </View>

          {[...students]
            .sort((a, b) => (b.lifetime_stars ?? b.stars_balance) - (a.lifetime_stars ?? a.stars_balance))
            .slice(0, 5)
            .map((student, idx) => (
              <View key={student.id} style={[styles.leaderboardCard, Shadows.soft]}>
                <View style={styles.rankCircle}>
                  <Text style={styles.rankNum}>{idx + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lbStudentName}>{student.name}</Text>
                  <Text style={styles.lbMeta}>
                    {student.student_id_code || 'ID-' + student.id} · {student.quizzes_passed} passed quizzes
                  </Text>
                </View>
                <View style={styles.lbStarBadge}>
                  <Ionicons name="star" size={14} color={Colors.sunYellowDark} />
                  <Text style={styles.lbStars}>
                    {(student.lifetime_stars ?? student.stars_balance).toLocaleString()} ⭐
                  </Text>
                </View>
              </View>
            ))}
        </>
      )}

      {/* VIEW: CHARTS & ANALYTICS */}
      {activeTab === 'charts' && (
        <>
          {/* Chart 1: 7-Day Participation */}
          <View style={[styles.chartContainer, Shadows.soft]}>
            <View style={styles.chartHeader}>
              <Ionicons name="calendar-outline" size={18} color={Colors.teacherPurple} />
              <Text style={styles.chartTitle}>7-Day Activity & Participation</Text>
            </View>
            <Text style={styles.chartSub}>Total quizzes taken and mini-games played each day</Text>

            <View style={styles.barChartRow}>
              {charts.participation_over_time.length > 0 ? (
                charts.participation_over_time.map((d, i) => {
                  const maxVal = Math.max(1, ...charts.participation_over_time.map((item) => item.total));
                  const heightPct = Math.min(100, Math.max(10, Math.round((d.total / maxVal) * 100)));

                  return (
                    <View key={i} style={styles.barCol}>
                      <Text style={styles.barValText}>{d.total}</Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { height: `${heightPct}%` }]} />
                      </View>
                      <Text style={styles.barLabel}>{d.day}</Text>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.emptyText}>No data available for chart yet.</Text>
              )}
            </View>
          </View>

          {/* Chart 2: Category Performance & Accuracy */}
          <View style={[styles.chartContainer, Shadows.soft, { marginTop: 16 }]}>
            <View style={styles.chartHeader}>
              <Ionicons name="pie-chart-outline" size={18} color="#0284C7" />
              <Text style={styles.chartTitle}>Category Accuracy & Performance</Text>
            </View>
            <Text style={styles.chartSub}>Percentage of correct answers across each subject category</Text>

            {charts.category_performance.length > 0 ? (
              charts.category_performance.map((c) => (
                <View key={c.id} style={styles.catProgressItem}>
                  <View style={styles.catProgressHead}>
                    <Text style={styles.catNameText}>{c.name}</Text>
                    <Text style={styles.catStatText}>
                      {c.accuracy}% ({c.attempts} attempts)
                    </Text>
                  </View>
                  <View style={styles.catProgressBarTrack}>
                    <View
                      style={[
                        styles.catProgressBarFill,
                        {
                          width: `${Math.min(100, Math.max(5, c.accuracy))}%`,
                          backgroundColor: c.color || Colors.teacherPurple,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No completed quizzes across categories yet.</Text>
            )}
          </View>

          {/* Chart 3: Activity Completion Metrics */}
          <View style={[styles.chartContainer, Shadows.soft, { marginTop: 16 }]}>
            <View style={styles.chartHeader}>
              <Ionicons name="checkmark-done-circle-outline" size={18} color={Colors.grassGreenDark} />
              <Text style={styles.chartTitle}>Activity Completion Breakdown</Text>
            </View>

            <View style={styles.completionGrid}>
              <View style={[styles.compCard, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="checkmark-circle" size={24} color={Colors.grassGreenDark} />
                <Text style={styles.compVal}>{charts.activity_completion.quizzes_passed}</Text>
                <Text style={styles.compLabel}>Passed Quizzes</Text>
              </View>

              <View style={[styles.compCard, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="alert-circle" size={24} color={Colors.coralPinkDark} />
                <Text style={styles.compVal}>{charts.activity_completion.quizzes_failed}</Text>
                <Text style={styles.compLabel}>Needs Retake</Text>
              </View>

              <View style={[styles.compCard, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="game-controller" size={24} color={Colors.teacherPurple} />
                <Text style={styles.compVal}>{charts.activity_completion.minigames_completed}</Text>
                <Text style={styles.compLabel}>Completed Games</Text>
              </View>

              <View style={[styles.compCard, { backgroundColor: '#FEF08A' }]}>
                <Ionicons name="gift" size={24} color={Colors.sunYellowDark} />
                <Text style={styles.compVal}>{charts.activity_completion.mystery_box_qualified}</Text>
                <Text style={styles.compLabel}>Mystery Boxes Qualified</Text>
              </View>
            </View>
          </View>
        </>
      )}

      {/* VIEW: LIVE FEED & MONITORING */}
      {activeTab === 'feed' && (
        <>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="pulse" size={18} color={Colors.teacherPurple} />
            <Text style={styles.sectionTitle}>Live Student Activity</Text>
          </View>

          {onlineStudents.length > 0 ? (
            onlineStudents.map((s) => (
              <View key={s.id} style={[styles.liveCard, Shadows.soft]}>
                <LinearGradient
                  colors={Gradients.teacher}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarCircle}
                >
                  <Text style={styles.avatarLetter}>{s.name.charAt(0).toUpperCase()}</Text>
                </LinearGradient>

                <View style={{ flex: 1 }}>
                  <View style={styles.liveNameRow}>
                    <Text style={styles.liveName}>{s.name}</Text>
                    <View style={styles.onlinePip} />
                  </View>
                  <Text style={styles.liveActivityText} numberOfLines={1}>
                    {s.current_activity || 'Active on WikaPlay'}
                  </Text>
                  {s.section ? <Text style={styles.liveSectionText}>{s.section}</Text> : null}
                </View>

                <View style={styles.liveStarPill}>
                  <Ionicons name="star" size={14} color={Colors.sunYellowDark} />
                  <Text style={styles.liveStarCount}>{s.stars_balance}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={[styles.emptyContainer, Shadows.subtle]}>
              <Ionicons name="moon-outline" size={36} color={Colors.textMuted} style={{ marginBottom: 6 }} />
              <Text style={styles.emptyTitle}>No Students Online Right Now</Text>
              <Text style={styles.emptyText}>
                Students will automatically appear here in real time when they open WikaPlay Mobile.
              </Text>
            </View>
          )}

          {/* Recent Mini-Game Sessions Feed */}
          <View style={[styles.sectionHeaderRow, { marginTop: 22 }]}>
            <Ionicons name="game-controller" size={18} color="#EC4899" />
            <Text style={styles.sectionTitle}>Recent Mini-Game Sessions</Text>
          </View>

          {recentMinigames.length > 0 ? (
            recentMinigames.slice(0, 5).map((game, i) => (
              <View key={game.id || i} style={[styles.gameFeedCard, Shadows.soft]}>
                <View style={[styles.gameFeedIcon, { backgroundColor: '#FCE7F3' }]}>
                  <Ionicons name="game-controller" size={18} color="#DB2777" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.gameFeedStudent}>{game.user?.name || 'Student'}</Text>
                  <Text style={styles.gameFeedType}>{game.game_type}</Text>
                </View>
                <View style={styles.gameFeedScore}>
                  <Text style={styles.gameFeedPoints}>{game.score} / 20 pts</Text>
                  <Text style={styles.gameFeedStars}>+{game.stars_awarded ?? 0} ⭐</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No mini-game sessions recorded yet.</Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
    </AnimatedBackground>
  );
}

function MetricCard({
  icon,
  value,
  label,
  color,
  sub,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  color: string;
  sub: string;
}) {
  return (
    <View style={[styles.metricCard, Shadows.soft]}>
      <View style={[styles.metricIconWrap, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel} numberOfLines={2}>
        {label}
      </Text>
      <Text style={styles.metricSub} numberOfLines={1}>
        {sub}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 48,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  brandingCol: {
    flex: 1,
  },
  appTitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.teacherPurple,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  greeting: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.black,
    color: Colors.text,
    marginTop: 2,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  onlineText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tabNavRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    padding: 4,
    borderRadius: Radius.pill,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  tabNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: Radius.pill,
  },
  tabNavBtnActive: {
    backgroundColor: Colors.teacherPurple,
  },
  tabNavText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.textMuted,
  },
  tabNavTextActive: {
    color: Colors.white,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  metricCard: {
    width: (SCREEN_WIDTH - 42) / 2,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.black,
  },
  metricLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginTop: 2,
    minHeight: 30,
  },
  metricSub: {
    fontSize: 10,
    fontFamily: Typography.family.body,
    color: Colors.textLight,
    marginTop: 4,
  },
  infoBanner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#F3E8FF',
    borderRadius: Radius.md,
    padding: 12,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.teacherPurple,
  },
  infoBannerText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    color: Colors.text,
    lineHeight: 18,
  },
  miniGamesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  gameMiniChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  gameMiniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  gameMiniName: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  gameMiniTag: {
    fontSize: 10,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  resultBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultStudentName: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  resultMeta: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    color: Colors.textLight,
    marginTop: 2,
  },
  resultScoreCol: {
    alignItems: 'flex-end',
  },
  resultScoreText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  resultStarsText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.sunYellowDark,
    marginTop: 2,
  },
  leaderboardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  rankCircle: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    backgroundColor: Colors.teacherPurpleLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNum: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.black,
    color: Colors.teacherPurple,
  },
  lbStudentName: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  lbMeta: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  lbStarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF08A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  lbStars: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  chartContainer: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  chartSub: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    color: Colors.textLight,
    marginTop: 2,
    marginBottom: 16,
  },
  barChartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingTop: 16,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barValText: {
    fontSize: 10,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.textLight,
    marginBottom: 4,
  },
  barTrack: {
    width: 14,
    height: 70,
    backgroundColor: '#F3F4F6',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: Colors.teacherPurple,
    borderRadius: 7,
  },
  barLabel: {
    fontSize: 10,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.textMuted,
    marginTop: 6,
  },
  catProgressItem: {
    marginBottom: 12,
  },
  catProgressHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  catNameText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  catStatText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    color: Colors.textLight,
  },
  catProgressBarTrack: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  catProgressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  completionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  compCard: {
    width: (SCREEN_WIDTH - 64) / 2,
    borderRadius: Radius.md,
    padding: 12,
    alignItems: 'center',
  },
  compVal: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.black,
    color: Colors.text,
    marginTop: 4,
  },
  compLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.textLight,
    marginTop: 2,
    textAlign: 'center',
  },
  liveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  liveNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveName: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  onlinePip: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.grassGreen,
  },
  liveActivityText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    color: Colors.teacherPurple,
    marginTop: 2,
  },
  liveSectionText: {
    fontSize: 10,
    fontFamily: Typography.family.body,
    color: Colors.textLight,
  },
  liveStarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF08A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  liveStarCount: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  gameFeedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  gameFeedIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameFeedStudent: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  gameFeedType: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    color: Colors.textLight,
    marginTop: 2,
  },
  gameFeedScore: {
    alignItems: 'flex-end',
  },
  gameFeedPoints: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  gameFeedStars: {
    fontSize: 10,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.sunYellowDark,
    marginTop: 2,
  },
  emptyContainer: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 24,
    alignItems: 'center',
    marginVertical: 8,
  },
  emptyTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginTop: 8,
  },
  emptyText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 4,
  },
  dashboardHeroCards: {
    gap: 10,
    marginBottom: 8,
  },
  dashboardHeroCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  dashboardHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dashboardHeroIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashboardHeroBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  dashboardHeroBadgeText: {
    fontSize: 10,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  dashboardHeroTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginTop: 2,
  },
  dashboardHeroSub: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    color: Colors.textLight,
    marginTop: 2,
    lineHeight: 16,
  },
  dashboardHeroFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  dashboardHeroAction: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
  },
});
