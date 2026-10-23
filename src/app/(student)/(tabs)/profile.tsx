import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/utils/haptics';

import { LoadingView } from '../../../components/LoadingView';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { PressableScale } from '../../../components/PressableScale';
import { useAuth } from '../../../hooks/use-auth';
import { usePresence } from '../../../hooks/use-presence';
import {
  studentService,
  StudentProfileStatsResponse,
  CategoryProgressItem,
} from '../../../services/api';
import { Colors, Gradients, Shadows, Typography, Radius } from '../../../theme';

// Child-friendly preset avatars
const PRESET_AVATARS = [
  { id: 'bear', emoji: '🐻', label: 'Oso', seed: 'bear' },
  { id: 'fox', emoji: '🦊', label: 'Sora', seed: 'fox' },
  { id: 'lion', emoji: '🦁', label: 'Leon', seed: 'lion' },
  { id: 'cat', emoji: '🐱', label: 'Pusa', seed: 'cat' },
  { id: 'panda', emoji: '🐼', label: 'Panda', seed: 'panda' },
  { id: 'rabbit', emoji: '🐰', label: 'Koneho', seed: 'rabbit' },
  { id: 'owl', emoji: '🦉', label: 'Kuwago', seed: 'owl' },
  { id: 'monkey', emoji: '🐵', label: 'Unggoy', seed: 'monkey' },
];

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const [profileData, setProfileData] = useState<StudentProfileStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedAvatarEmoji, setSelectedAvatarEmoji] = useState('🐻');

  usePresence('Tinitingnan ang Aking Profile', 'profile');

  const loadProfile = useCallback(async () => {
    try {
      const res = await studentService.getProfileStats();
      setProfileData(res);
    } catch (e) {
      console.warn('Failed to load profile stats:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  const confirmLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch (e) {
      console.warn('Logout error:', e);
    } finally {
      setLoggingOut(false);
      setShowLogoutModal(false);
      router.replace('/login');
    }
  };

  const handleSelectAvatar = async (preset: typeof PRESET_AVATARS[0]) => {
    setSelectedAvatarEmoji(preset.emoji);
    setShowAvatarPicker(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    try {
      await studentService.updateAvatar(preset.emoji);
      loadProfile();
    } catch {}
  };

  if (loading) return <LoadingView message="Kinukuha ang profile at datos..." />;

  const displayName = profileData?.user?.name || user?.name || 'Estudyante';
  const studentCode = profileData?.user?.student_id_code || user?.student_id_code || 'WP-KINDER';
  const level = profileData?.user?.level ?? 1;
  const currentBadge = profileData?.user?.current_badge || 'Bagong Mag-aaral';
  const stats = profileData?.stats;
  const categoryProgress = profileData?.category_progress || [];
  const recentActivities = profileData?.recent_activities || [];
  const personalBests = stats?.personal_bests || {};
  const encouragement = profileData?.encouragement || 'Tuloy lang sa pag-aaral ng Filipino! 🌟';

  return (
    <View style={styles.outerContainer}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 16) + 12 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.skyBlueDark} />}
      >
        {/* A. Student Identity Hero */}
        <View style={[styles.identityCard, Shadows.card]}>
          <TouchableOpacity
            style={styles.avatarTouchable}
            activeOpacity={0.8}
            onPress={() => setShowAvatarPicker(true)}
          >
            <LinearGradient
              colors={Gradients.sky}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarRing}
            >
              <View style={styles.avatarInner}>
                <Text style={styles.avatarEmoji}>
                  {profileData?.user?.avatar && profileData.user.avatar.length <= 4
                    ? profileData.user.avatar
                    : selectedAvatarEmoji}
                </Text>
              </View>
            </LinearGradient>
            <View style={styles.avatarEditPill}>
              <Ionicons name="camera" size={12} color={Colors.white} />
            </View>
          </TouchableOpacity>

          <Text style={styles.displayName}>{displayName}</Text>

          <View style={styles.badgeRow}>
            <View style={styles.roleBadge}>
              <Ionicons name="school" size={13} color={Colors.skyBlueDark} />
              <Text style={styles.roleLabel}>{studentCode}</Text>
            </View>
            <View style={styles.levelBadge}>
              <Ionicons name="trophy" size={13} color={Colors.sunYellowDark} />
              <Text style={styles.levelLabel}>Antas {level}</Text>
            </View>
          </View>

          <View style={styles.currentBadgePill}>
            <Ionicons name="ribbon" size={16} color={Colors.sunYellowDark} />
            <Text style={styles.currentBadgeText}>Kasalukuyang Karangalan: {currentBadge}</Text>
          </View>

          {/* Encouragement Banner */}
          <View style={styles.encouragementBanner}>
            <Text style={styles.encouragementText}>{encouragement}</Text>
          </View>
        </View>

        {/* B. Learning Overview Stats Grid */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="stats-chart" size={20} color={Colors.skyBlueDark} />
            <Text style={styles.sectionTitle}>Pangkalahatang Datos ng Pagkatuto</Text>
          </View>

          <View style={styles.statsGrid}>
            <StatCard
              icon="star"
              iconColor={Colors.sunYellowDark}
              bg="#FEF08A"
              label="Kasalukuyang Bituin"
              value={`${stats?.spendable_stars ?? 0} ⭐`}
            />
            <StatCard
              icon="sparkles"
              iconColor={Colors.vibrantPurple}
              bg="#EDE9FE"
              label="Kabuuang Naipon"
              value={`${stats?.lifetime_stars ?? 0}`}
            />
            <StatCard
              icon="checkmark-done-circle"
              iconColor={Colors.grassGreenDark}
              bg="#DCFCE7"
              label="Katumpakan (Accuracy)"
              value={`${stats?.overall_accuracy ?? 0}%`}
            />
            <StatCard
              icon="albums"
              iconColor={Colors.coralPinkDark}
              bg="#FFE4E6"
              label="Koleksyon (Album)"
              value={`${stats?.collectibles_owned ?? 0} / 151`}
            />
            <StatCard
              icon="help-circle"
              iconColor="#0284C7"
              bg="#E0F2FE"
              label="Nasagot na Tanong"
              value={`${stats?.correct_answers ?? 0} / ${stats?.total_questions_answered ?? 0}`}
            />
            <StatCard
              icon="game-controller"
              iconColor="#D97706"
              bg="#FEF3C7"
              label="Nilarong Laro / Pagsusulit"
              value={`${stats?.total_sessions ?? 0}`}
            />
          </View>
        </View>

        {/* Mini-Games Personal Bests */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="medal" size={20} color={Colors.sunYellowDark} />
            <Text style={styles.sectionTitle}>Pinakamataas na Marka (Personal Bests)</Text>
          </View>
          <View style={styles.personalBestsRow}>
            <PersonalBestChip name="Memory Match" score={personalBests['memory_match'] ?? 0} max={20} icon="🧠" />
            <PersonalBestChip name="Paghahanap" score={personalBests['paghahanap_larawan'] ?? 0} max={20} icon="🔍" />
            <PersonalBestChip name="Hulaan" score={personalBests['hulaan_salita'] ?? 0} max={20} icon="💡" />
            <PersonalBestChip name="Gulong" score={personalBests['gulong_letra'] ?? 0} max={20} icon="🎡" />
            <PersonalBestChip name="Pop Balloon" score={personalBests['pop_balloon'] ?? 0} max={20} icon="🎈" />
          </View>
        </View>

        {/* C. Category-by-Category Progress */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="folder-open" size={20} color={Colors.grassGreenDark} />
            <Text style={styles.sectionTitle}>Pag-unlad Bawat Kategorya</Text>
          </View>
          <Text style={styles.sectionSub}>
            Tingnan ang iyong mga bituin at katumpakan sa bawat paksa (Hanggang 60 bituin bawat isa).
          </Text>

          <View style={styles.categoryCardsList}>
            {categoryProgress.map((cat: CategoryProgressItem) => {
              const starPct = Math.min(100, Math.round((cat.stars_earned / cat.max_stars) * 100));

              return (
                <View key={cat.id} style={[styles.catCard, Shadows.subtle]}>
                  <View style={styles.catCardHeader}>
                    <View style={styles.catTitleRow}>
                      <Text style={styles.catEmoji}>{cat.icon}</Text>
                      <View>
                        <Text style={styles.catName}>{cat.name}</Text>
                        <Text style={styles.catAccuracy}>Katumpakan: {cat.accuracy}% ({cat.attempts} beses naglaro)</Text>
                      </View>
                    </View>
                    <View style={[styles.catStarBadge, { backgroundColor: cat.color + '20' }]}>
                      <Ionicons name="star" size={14} color={cat.color} />
                      <Text style={[styles.catStarText, { color: cat.color }]}>
                        {cat.stars_earned} / {cat.max_stars}
                      </Text>
                    </View>
                  </View>

                  {/* Progress bar */}
                  <View style={styles.catTrack}>
                    <View style={[styles.catFill, { width: `${starPct}%`, backgroundColor: cat.color }]} />
                  </View>

                  <View style={styles.catFooter}>
                    <Text style={styles.catSuggestedText}>💡 {cat.suggested_activity}</Text>
                    <TouchableOpacity
                      style={[styles.practiceBtn, { backgroundColor: cat.color }]}
                      onPress={() => router.push(`/(student)/quiz/${cat.slug}/madali` as any)}
                    >
                      <Text style={styles.practiceBtnText}>Magsanay Dito</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* E. Recent Activity */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="time" size={20} color={Colors.textLight} />
            <Text style={styles.sectionTitle}>Kamakailang Gawain</Text>
          </View>

          {recentActivities.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>Wala pang kamakailang aktibidad.</Text>
            </View>
          ) : (
            <View style={[styles.recentList, Shadows.soft]}>
              {recentActivities.map((act, index) => (
                <View
                  key={act.id}
                  style={[
                    styles.recentItem,
                    index < recentActivities.length - 1 && styles.recentItemBorder,
                  ]}
                >
                  <View
                    style={[
                      styles.recentIconCircle,
                      act.type === 'quiz' ? { backgroundColor: '#EDE9FE' } : { backgroundColor: '#FEF3C7' },
                    ]}
                  >
                    <Ionicons
                      name={act.type === 'quiz' ? 'school' : 'game-controller'}
                      size={16}
                      color={act.type === 'quiz' ? Colors.vibrantPurple : Colors.sunYellowDark}
                    />
                  </View>
                  <View style={styles.recentInfo}>
                    <Text style={styles.recentTitle}>{act.title}</Text>
                    <Text style={styles.recentCategory}>{act.category} • {act.created_at_human}</Text>
                  </View>
                  <View style={styles.recentScoreBadge}>
                    <Text style={styles.recentScoreText}>{act.score}</Text>
                    <Text style={styles.recentStarsText}>+{act.stars_awarded} ⭐</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <PrimaryButton
            title="Mag-logout"
            variant="outline"
            size="md"
            icon="log-out-outline"
            onPress={() => setShowLogoutModal(true)}
            style={styles.logoutButton}
          />
        </View>
      </ScrollView>

      {/* Avatar Picker Modal */}
      <Modal
        visible={showAvatarPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAvatarPicker(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.pickerCard, Shadows.card]}>
            <Text style={styles.pickerTitle}>Pumili ng Iyong Hayop Avatar 🐾</Text>
            <Text style={styles.pickerSub}>Piliin ang paborito mong kalaro sa WikaPlay:</Text>

            <View style={styles.pickerGrid}>
              {PRESET_AVATARS.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.pickerItem}
                  onPress={() => handleSelectAvatar(p)}
                >
                  <Text style={styles.pickerEmoji}>{p.emoji}</Text>
                  <Text style={styles.pickerLabel}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.pickerCloseBtn}
              onPress={() => setShowAvatarPicker(false)}
            >
              <Text style={styles.pickerCloseText}>Isara</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!loggingOut) setShowLogoutModal(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.confirmCard, Shadows.card]}>
            <View style={styles.confirmIconCircle}>
              <Ionicons name="log-out" size={36} color={Colors.coralPink} />
            </View>
            <Text style={styles.confirmTitle}>Gusto mo bang mag-logout?</Text>
            <Text style={styles.confirmSub}>
              Ligtas na naka-save ang lahat ng iyong mga bituin at koleksyon sa WikaPlay!
            </Text>
            <View style={styles.confirmBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                disabled={loggingOut}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.cancelBtnText}>Bumalik</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmLogoutBtn}
                disabled={loggingOut}
                onPress={confirmLogout}
              >
                <Text style={styles.confirmLogoutText}>
                  {loggingOut ? 'Umaalis...' : 'Oo, Mag-logout'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function StatCard({
  icon,
  iconColor,
  bg,
  label,
  value,
}: {
  icon: any;
  iconColor: string;
  bg: string;
  label: string;
  value: string;
}) {
  return (
    <View style={[styles.statCard, Shadows.subtle]}>
      <View style={[styles.statIconCircle, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.statValText}>{value}</Text>
      <Text style={styles.statLblText}>{label}</Text>
    </View>
  );
}

function PersonalBestChip({
  name,
  score,
  max,
  icon,
}: {
  name: string;
  score: number;
  max: number;
  icon: string;
}) {
  return (
    <View style={[styles.pbChip, Shadows.subtle]}>
      <Text style={styles.pbIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.pbName} numberOfLines={1}>{name}</Text>
        <Text style={styles.pbScore}>{score} / {max} puntos</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },

  /* Identity Card */
  identityCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarTouchable: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarRing: {
    width: 94,
    height: 94,
    borderRadius: 47,
    padding: 3,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 44,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: {
    fontSize: 48,
  },
  avatarEditPill: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: Colors.skyBlueDark,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  displayName: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 10,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    gap: 4,
  },
  roleLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.skyBlueDark,
    fontWeight: Typography.weights.bold,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9C3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    gap: 4,
  },
  levelLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.sunYellowDark,
    fontWeight: Typography.weights.bold,
  },
  currentBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
    marginBottom: 12,
  },
  currentBadgeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.sunYellowDark,
  },
  encouragementBanner: {
    backgroundColor: '#F1F5F9',
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
    width: '100%',
  },
  encouragementText: {
    fontSize: Typography.sizes.xs,
    color: Colors.text,
    textAlign: 'center',
    fontWeight: Typography.weights.medium,
  },

  /* Section Styles */
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  sectionSub: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginBottom: 12,
  },

  /* Stats Grid */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statIconCircle: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValText: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  statLblText: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 2,
  },

  /* Personal Bests Row */
  personalBestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pbChip: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pbIcon: {
    fontSize: 22,
  },
  pbName: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  pbScore: {
    fontSize: 11,
    color: Colors.grassGreenDark,
    fontWeight: Typography.weights.semibold,
  },

  /* Category Progress Cards */
  categoryCardsList: {
    gap: 10,
  },
  catCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  catTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  catEmoji: {
    fontSize: 26,
  },
  catName: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  catAccuracy: {
    fontSize: 11,
    color: Colors.textLight,
  },
  catStarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    gap: 4,
  },
  catStarText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  catTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: Radius.pill,
    overflow: 'hidden',
    marginBottom: 10,
  },
  catFill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  catFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catSuggestedText: {
    fontSize: 11,
    color: Colors.textMuted,
    flex: 1,
    paddingRight: 6,
  },
  practiceBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  practiceBtnText: {
    fontSize: 11,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },

  /* Recent Activities */
  recentList: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 12,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  recentItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  recentIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentInfo: {
    flex: 1,
  },
  recentTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  recentCategory: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  recentScoreBadge: {
    alignItems: 'flex-end',
  },
  recentScoreText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  recentStarsText: {
    fontSize: 10,
    color: Colors.sunYellowDark,
    fontWeight: Typography.weights.bold,
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
  },

  /* Logout */
  logoutSection: {
    marginTop: 10,
    marginBottom: 20,
  },
  logoutButton: {
    borderColor: Colors.coralPink,
  },

  /* Modal Styles */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  pickerCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    padding: 24,
    alignItems: 'center',
  },
  pickerTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  pickerSub: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginBottom: 16,
  },
  pickerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 20,
  },
  pickerItem: {
    alignItems: 'center',
    padding: 12,
    borderRadius: Radius.xl,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: '21%',
  },
  pickerEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  pickerLabel: {
    fontSize: 10,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  pickerCloseBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: Radius.pill,
    backgroundColor: '#F1F5F9',
  },
  pickerCloseText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.textLight,
  },

  /* Confirm Logout Modal */
  confirmCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    padding: 24,
    alignItems: 'center',
  },
  confirmIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  confirmTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  confirmSub: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  confirmBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.pill,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.textLight,
  },
  confirmLogoutBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.pill,
    backgroundColor: Colors.coralPink,
    alignItems: 'center',
  },
  confirmLogoutText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
});
