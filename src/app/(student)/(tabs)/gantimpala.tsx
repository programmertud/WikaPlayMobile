/* eslint-disable react-hooks/immutability */
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/utils/haptics';

import { LoadingView } from '../../../components/LoadingView';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { PressableScale } from '../../../components/PressableScale';
import { useAuth } from '../../../hooks/use-auth';
import { usePresence } from '../../../hooks/use-presence';
import {
  rewardService,
  AchievementsResponse,
  AchievementBadge,
  LearningMission,
} from '../../../services/api';
import { Colors, Gradients, Shadows, Typography, Radius } from '../../../theme';

export default function GantimpalaScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<AchievementsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Claim celebration modal
  const [claimedModalBadge, setClaimedModalBadge] = useState<AchievementBadge | null>(null);
  const [claimingKey, setClaimingKey] = useState<string | null>(null);

  // Star scale animation
  const starScale = useSharedValue(1);
  const starAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: starScale.value }],
  }));

  usePresence('Sa Gantimpala (Reward Center)', 'gantimpala');

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const res = await rewardService.getAchievements();
      setData(res);

      // Pulse star balance animation on load
      starScale.value = withSequence(
        withTiming(1.15, { duration: 250 }),
        withSpring(1, { damping: 6, stiffness: 120 })
      );
    } catch (err: any) {
      setError(err?.message || 'Nabigong kunin ang mga gantimpala.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [starScale]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleClaimBadge = async (badge: AchievementBadge) => {
    if (badge.status !== 'unlocked') return;
    setClaimingKey(badge.key);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    try {
      await rewardService.claimBadge(badge.key);
      setClaimedModalBadge(badge);
      // Reload updated status from backend
      loadData();
    } catch (err: any) {
      setError(err?.message || 'Hindi na-claim ang badge.');
    } finally {
      setClaimingKey(null);
    }
  };

  if (loading) return <LoadingView message="Kinukuha ang Gantimpala Center..." />;

  const starsBalance = data?.stars_balance ?? user?.stars_balance ?? 0;
  const lifetimeStars = data?.lifetime_stars ?? starsBalance;
  const spentStars = data?.spent_stars ?? 0;
  const nextMilestone = data?.next_milestone;
  const currentMilestone = data?.current_milestone;
  const progressPct = data?.milestone_progress_pct ?? 0;
  const badges = data?.badges ?? [];
  const missions = data?.missions ?? [];
  const recentRewards = data?.recent_rewards ?? [];

  return (
    <View style={styles.outerContainer}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 16) + 12 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.sunYellow} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.headerIconCircle, Shadows.soft]}>
              <Ionicons name="gift" size={26} color={Colors.vibrantPurple} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Gantimpala</Text>
              <Text style={styles.headerSub}>Aking mga Bituin, Badge at Misyon ⭐</Text>
            </View>
          </View>
          <Animated.View style={[styles.starsBadge, Shadows.subtle, starAnimStyle]}>
            <Ionicons name="star" size={20} color={Colors.sunYellowDark} />
            <Text style={styles.starsCount}>{starsBalance}</Text>
          </Animated.View>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={Colors.coralPinkDark} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* 1. Star Balance & Ledger Hero Card */}
        <LinearGradient
          colors={['#8B5CF6', '#6D28D9']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroCard, Shadows.card]}
        >
          <View style={styles.heroRow}>
            <Animated.View style={[styles.heroStarCircle, starAnimStyle]}>
              <Ionicons name="star" size={48} color={Colors.sunYellow} />
            </Animated.View>
            <View style={styles.heroInfo}>
              <Text style={styles.heroLabel}>Kasalukuyang Bituin</Text>
              <Text style={styles.heroBalanceText}>{starsBalance} ⭐</Text>
              <Text style={styles.heroSubtitle}>
                Magagamit at maipagmamalaki sa WikaPlay!
              </Text>
            </View>
          </View>

          {/* Ledger Breakdown Pill */}
          <View style={styles.ledgerRow}>
            <View style={styles.ledgerItem}>
              <Text style={styles.ledgerValue}>{lifetimeStars}</Text>
              <Text style={styles.ledgerLabel}>Kabuuang Naipon</Text>
            </View>
            <View style={styles.ledgerDivider} />
            <View style={styles.ledgerItem}>
              <Text style={styles.ledgerValue}>{starsBalance}</Text>
              <Text style={styles.ledgerLabel}>Magagamit</Text>
            </View>
            <View style={styles.ledgerDivider} />
            <View style={styles.ledgerItem}>
              <Text style={styles.ledgerValue}>{spentStars}</Text>
              <Text style={styles.ledgerLabel}>Nagamit na</Text>
            </View>
          </View>

          {/* Milestone Progress Bar */}
          <View style={styles.milestoneSection}>
            <View style={styles.milestoneHeader}>
              <Text style={styles.milestoneTitle}>
                {nextMilestone
                  ? `Susunod na Badge: ${nextMilestone.filipino_title}`
                  : 'Nakamit ang Lahat ng Milestone! 👑'}
              </Text>
              <Text style={styles.milestoneCounter}>
                {nextMilestone ? `${lifetimeStars} / ${nextMilestone.threshold} ⭐` : `${lifetimeStars} ⭐ (Naabot Lahat!)`}
              </Text>
            </View>
            <View style={styles.milestoneBarTrack}>
              <View style={[styles.milestoneBarFill, { width: `${Math.min(100, Math.max(0, progressPct))}%` }]} />
            </View>
          </View>
        </LinearGradient>

        {/* 2. Achievement Badge Collection (Section 4) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconRow}>
              <Ionicons name="ribbon" size={22} color={Colors.sunYellowDark} />
              <Text style={styles.sectionTitle}>Mga Badge ng Karangalan</Text>
            </View>
            <Text style={styles.sectionCounter}>
              {badges.filter((b) => b.status === 'claimed' || b.status === 'unlocked').length} / {badges.length}
            </Text>
          </View>
          <Text style={styles.sectionSub}>
            Maabot ang kinakailangang bituin upang mai-unlock at ma-claim ang bawat badge!
          </Text>

          <View style={styles.badgesGrid}>
            {badges.map((badge) => {
              const isLocked = badge.status === 'locked';
              const isUnlocked = badge.status === 'unlocked';
              const isClaimed = badge.status === 'claimed';

              return (
                <View
                  key={badge.key}
                  style={[
                    styles.badgeCard,
                    Shadows.soft,
                    isClaimed && styles.badgeCardClaimed,
                    isUnlocked && styles.badgeCardUnlocked,
                    isLocked && styles.badgeCardLocked,
                  ]}
                >
                  <View
                    style={[
                      styles.badgeIconCircle,
                      isClaimed && { backgroundColor: '#FEF3C7' },
                      isUnlocked && { backgroundColor: '#EDE9FE' },
                      isLocked && { backgroundColor: '#F1F5F9' },
                    ]}
                  >
                    <Text style={[styles.badgeIconEmoji, isLocked && { opacity: 0.35 }]}>
                      {badge.icon}
                    </Text>
                  </View>

                  <Text style={styles.badgeFilipinoTitle} numberOfLines={1}>
                    {badge.filipino_title}
                  </Text>
                  <Text style={styles.badgeEnglishTitle} numberOfLines={1}>
                    {badge.title}
                  </Text>
                  <Text style={styles.badgeRequirement}>
                    {badge.threshold} Bituin
                  </Text>
                  <Text style={styles.badgeDesc} numberOfLines={2}>
                    {badge.description}
                  </Text>

                  {/* Badge Action / Status Button */}
                  <View style={styles.badgeActionArea}>
                    {isClaimed ? (
                      <View style={styles.claimedPill}>
                        <Ionicons name="checkmark-circle" size={14} color={Colors.grassGreenDark} />
                        <Text style={styles.claimedText}>Nakuha Na</Text>
                      </View>
                    ) : isUnlocked ? (
                      <TouchableOpacity
                        style={styles.claimButton}
                        activeOpacity={0.8}
                        onPress={() => handleClaimBadge(badge)}
                        disabled={claimingKey === badge.key}
                      >
                        <LinearGradient
                          colors={Gradients.sun}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.claimButtonGradient}
                        >
                          <Ionicons name="gift" size={14} color={Colors.white} />
                          <Text style={styles.claimButtonText}>
                            {claimingKey === badge.key ? 'Kinukuha...' : 'I-claim'}
                          </Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.lockedPill}>
                        <Ionicons name="lock-closed" size={13} color={Colors.textMuted} />
                        <Text style={styles.lockedText}>Naka-lock</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* 3. Daily & Weekly Missions (Section 6) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconRow}>
              <Ionicons name="rocket" size={22} color={Colors.skyBlueDark} />
              <Text style={styles.sectionTitle}>Mga Misyon at Hamon</Text>
            </View>
            <View style={styles.dailyTag}>
              <Text style={styles.dailyTagText}>Araw-araw / Lingguhan</Text>
            </View>
          </View>
          <Text style={styles.sectionSub}>
            Ligtas at masayang paraan upang palaging may bagong layunin bawat araw!
          </Text>

          <View style={styles.missionsList}>
            {missions.map((mission) => {
              const isDone = mission.is_completed;
              const pct = Math.min(100, Math.round((mission.progress / Math.max(1, mission.target)) * 100));

              return (
                <View key={mission.id} style={[styles.missionCard, Shadows.subtle]}>
                  <View style={styles.missionTopRow}>
                    <View style={[styles.missionIconBox, isDone && { backgroundColor: '#DCFCE7' }]}>
                      <Ionicons
                        name={isDone ? 'checkmark-circle' : mission.type === 'weekly' ? 'calendar' : 'flame'}
                        size={22}
                        color={isDone ? Colors.grassGreenDark : Colors.skyBlueDark}
                      />
                    </View>
                    <View style={styles.missionTextCol}>
                      <Text style={styles.missionTitle}>{mission.title}</Text>
                      <Text style={styles.missionDesc}>{mission.description}</Text>
                    </View>
                    <View style={[styles.missionStatusPill, isDone ? styles.statusPillDone : styles.statusPillActive]}>
                      <Text style={[styles.statusPillText, isDone ? styles.statusTextDone : styles.statusTextActive]}>
                        {isDone ? 'Tapos Na 🎉' : `${mission.progress}/${mission.target}`}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.missionTrack}>
                    <View
                      style={[
                        styles.missionFill,
                        { width: `${pct}%`, backgroundColor: isDone ? Colors.grassGreen : Colors.skyBlueDark },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* 4. Recent Star Activity Ledger (Section 7) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionIconRow}>
              <Ionicons name="time" size={22} color={Colors.textLight} />
              <Text style={styles.sectionTitle}>Talaan ng mga Bituin</Text>
            </View>
          </View>

          {recentRewards.length === 0 ? (
            <View style={[styles.emptyHistoryBox, Shadows.soft]}>
              <Ionicons name="sparkles-outline" size={36} color={Colors.textMuted} />
              <Text style={styles.emptyHistoryText}>
                Wala pang naitalang mga bituin. Maglaro ng pagsusulit o mini-game upang magsimula!
              </Text>
            </View>
          ) : (
            <View style={[styles.historyContainer, Shadows.soft]}>
              {recentRewards.map((item, index) => {
                const isPositive = item.amount > 0;
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.historyItem,
                      index < recentRewards.length - 1 && styles.historyItemBorder,
                    ]}
                  >
                    <View
                      style={[
                        styles.historyIcon,
                        isPositive ? styles.historyIconPos : styles.historyIconNeg,
                      ]}
                    >
                      <Ionicons
                        name={isPositive ? 'arrow-up' : 'arrow-down'}
                        size={14}
                        color={isPositive ? Colors.grassGreenDark : Colors.coralPinkDark}
                      />
                    </View>
                    <View style={styles.historyInfo}>
                      <Text style={styles.historyDesc} numberOfLines={1}>
                        {item.description}
                      </Text>
                      <Text style={styles.historyTime}>{item.created_at_human}</Text>
                    </View>
                    <Text
                      style={[
                        styles.historyAmount,
                        isPositive ? styles.historyAmountPos : styles.historyAmountNeg,
                      ]}
                    >
                      {isPositive ? `+${item.amount}` : item.amount} ⭐
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* 5. Return to Learning Button (Section 3 #12) */}
        <View style={styles.bottomNavSection}>
          <PressableScale
            onPress={() => router.push('/(student)/(tabs)' as any)}
            style={[styles.returnButton, Shadows.card]}
          >
            <LinearGradient
              colors={Gradients.grass}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.returnButtonGradient}
            >
              <Ionicons name="book" size={22} color={Colors.white} />
              <Text style={styles.returnButtonText}>Ipagpatuloy ang Pag-aaral 🚀</Text>
            </LinearGradient>
          </PressableScale>
        </View>
      </ScrollView>

      {/* Claim Congratulations Modal (Section 5) */}
      <Modal
        visible={!!claimedModalBadge}
        transparent
        animationType="fade"
        onRequestClose={() => setClaimedModalBadge(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, Shadows.card]}>
            <LinearGradient
              colors={['#FEF3C7', '#FDE68A']}
              style={styles.modalBadgeCircle}
            >
              <Text style={styles.modalBadgeEmoji}>{claimedModalBadge?.icon || '🏆'}</Text>
            </LinearGradient>

            <Text style={styles.modalTitle}>Binabati Kita! 🎉</Text>
            <Text style={styles.modalSubtitle}>
              Nakuha mo ang badge na:
            </Text>
            <Text style={styles.modalBadgeName}>
              {claimedModalBadge?.filipino_title || claimedModalBadge?.title}
            </Text>
            <Text style={styles.modalBadgeDesc}>
              {claimedModalBadge?.description}
            </Text>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setClaimedModalBadge(null)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={Gradients.sun}
                style={styles.modalCloseGradient}
              >
                <Text style={styles.modalCloseText}>Salamat! Tuloy sa Laro</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.sizes.xxl,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  headerSub: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
  },
  starsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#FEF08A',
  },
  starsCount: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: Typography.sizes.xs,
    color: Colors.coralPinkDark,
    flex: 1,
  },

  /* Hero Card */
  heroCard: {
    borderRadius: Radius.xxl,
    padding: 20,
    marginBottom: 20,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 18,
  },
  heroStarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  heroInfo: {
    flex: 1,
  },
  heroLabel: {
    fontSize: Typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: Typography.weights.semibold,
    textTransform: 'uppercase',
  },
  heroBalanceText: {
    fontSize: 34,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
    marginVertical: 2,
  },
  heroSubtitle: {
    fontSize: Typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.9)',
  },

  /* Ledger Breakdown */
  ledgerRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: Radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  ledgerItem: {
    flex: 1,
    alignItems: 'center',
  },
  ledgerValue: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  ledgerLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  ledgerDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },

  /* Milestone Progress */
  milestoneSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: Radius.md,
    padding: 12,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  milestoneTitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.white,
    fontWeight: Typography.weights.bold,
  },
  milestoneCounter: {
    fontSize: Typography.sizes.xs,
    color: '#FEF08A',
    fontWeight: Typography.weights.bold,
  },
  milestoneBarTrack: {
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  milestoneBarFill: {
    height: '100%',
    backgroundColor: Colors.sunYellow,
    borderRadius: Radius.pill,
  },

  /* Section Container */
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  sectionCounter: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.textLight,
  },
  sectionSub: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginBottom: 12,
  },
  dailyTag: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  dailyTagText: {
    fontSize: 10,
    fontWeight: Typography.weights.bold,
    color: Colors.skyBlueDark,
  },

  /* Badges Grid */
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  badgeCardClaimed: {
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
  },
  badgeCardUnlocked: {
    borderColor: '#C4B5FD',
    backgroundColor: '#FAF5FF',
  },
  badgeCardLocked: {
    borderColor: '#E2E8F0',
    opacity: 0.85,
  },
  badgeIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeIconEmoji: {
    fontSize: 30,
  },
  badgeFilipinoTitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  badgeEnglishTitle: {
    fontSize: 11,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 4,
  },
  badgeRequirement: {
    fontSize: Typography.sizes.xs,
    color: Colors.sunYellowDark,
    fontWeight: Typography.weights.bold,
    marginBottom: 4,
  },
  badgeDesc: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 10,
    height: 30,
  },
  badgeActionArea: {
    width: '100%',
    alignItems: 'center',
  },
  claimedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    gap: 4,
  },
  claimedText: {
    fontSize: 11,
    fontWeight: Typography.weights.bold,
    color: Colors.grassGreenDark,
  },
  claimButton: {
    width: '100%',
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  claimButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    gap: 4,
  },
  claimButtonText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  lockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    gap: 4,
  },
  lockedText: {
    fontSize: 11,
    fontWeight: Typography.weights.medium,
    color: Colors.textMuted,
  },

  /* Missions List */
  missionsList: {
    gap: 10,
  },
  missionCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  missionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  missionIconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  missionTextCol: {
    flex: 1,
  },
  missionTitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  missionDesc: {
    fontSize: 11,
    color: Colors.textLight,
  },
  missionStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  statusPillActive: {
    backgroundColor: '#F1F5F9',
  },
  statusPillDone: {
    backgroundColor: '#DCFCE7',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: Typography.weights.bold,
  },
  statusTextActive: {
    color: Colors.textLight,
  },
  statusTextDone: {
    color: Colors.grassGreenDark,
  },
  missionTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  missionFill: {
    height: '100%',
    borderRadius: Radius.pill,
  },

  /* Ledger History */
  historyContainer: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  historyItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  historyIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyIconPos: {
    backgroundColor: '#DCFCE7',
  },
  historyIconNeg: {
    backgroundColor: '#FEE2E2',
  },
  historyInfo: {
    flex: 1,
  },
  historyDesc: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  historyTime: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  historyAmount: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  historyAmountPos: {
    color: Colors.grassGreenDark,
  },
  historyAmountNeg: {
    color: Colors.coralPinkDark,
  },
  emptyHistoryBox: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyHistoryText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 18,
  },

  /* Bottom Return Button */
  bottomNavSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  returnButton: {
    borderRadius: Radius.xxl,
    overflow: 'hidden',
  },
  returnButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  returnButtonText: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },

  /* Celebration Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    padding: 24,
    alignItems: 'center',
  },
  modalBadgeCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#F59E0B',
  },
  modalBadgeEmoji: {
    fontSize: 44,
  },
  modalTitle: {
    fontSize: Typography.sizes.xxl,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
  },
  modalBadgeName: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.vibrantPurpleDark,
    marginVertical: 4,
  },
  modalBadgeDesc: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  modalCloseBtn: {
    width: '100%',
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  modalCloseGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
});
