import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
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
import { rewardService } from '../../../services/api';
import { Colors, Gradients, Shadows, Typography, Radius } from '../../../theme';
import { Collectible } from '../../../types';

const RARITY_COLORS: Record<string, string> = {
  common: '#64748B',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B',
};

const RARITY_LABELS: Record<string, string> = {
  common: 'Karaniwan',
  rare: 'Bihira',
  epic: 'Mahiwaga',
  legendary: 'Pambihira',
};

export default function GantimpalaScreen() {
  const { user, updateUserStars } = useAuth();
  const insets = useSafeAreaInsets();
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [starsBalance, setStarsBalance] = useState(user?.stars_balance ?? 0);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealedCollectible, setRevealedCollectible] = useState<Collectible | null>(null);

  const [totalEarned, setTotalEarned] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [history, setHistory] = useState<any[]>([]);

  const shakeTranslateX = useSharedValue(0);
  const revealScale = useSharedValue(0.5);
  const revealOpacity = useSharedValue(0);

  usePresence('Sa Gantimpala', 'gantimpala');

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [colRes, histRes] = await Promise.all([
        rewardService.getCollectibles(),
        rewardService.getStarsHistory().catch(() => null),
      ]);
      setCollectibles(colRes.collectibles);
      setStarsBalance(colRes.stars_balance);
      if (histRes) {
        setTotalEarned(histRes.total_earned ?? 0);
        setTotalSpent(histRes.total_spent ?? 0);
        setHistory(histRes.history?.data ?? []);
      }
    } catch (err: any) {
      setError(err.message || 'Nabigong kunin ang mga gantimpala.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUnlockMystery = async () => {
    if (unlocking) return;
    setUnlocking(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    // Shake animation
    shakeTranslateX.value = withSequence(
      withTiming(-12, { duration: 60 }),
      withTiming(12, { duration: 60 }),
      withTiming(-8, { duration: 60 }),
      withTiming(8, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );

    try {
      const res = await rewardService.unlockMystery();
      if (res.all_unlocked) {
        setError('Mayroon ka nang lahat ng koleksyon! 🎊');
      } else if (res.collectible) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setRevealedCollectible(res.collectible);
        setStarsBalance(res.stars_balance ?? starsBalance);
        updateUserStars(res.stars_balance ?? starsBalance);

        revealScale.value = withSpring(1, { damping: 12, stiffness: 200 });
        revealOpacity.value = withTiming(1, { duration: 250 });
        loadData();
      }
    } catch (err: any) {
      setError(err.message || 'Hindi nai-unlock ang gantimpala. Subukan muli.');
    } finally {
      setUnlocking(false);
    }
  };

  const shakeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeTranslateX.value }],
  }));

  const revealAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: revealScale.value }],
    opacity: revealOpacity.value,
  }));

  if (loading) return <LoadingView message="Kinukuha ang mga gantimpala..." />;

  const unlockedCount = collectibles.filter((c) => c.is_unlocked).length;
  const MYSTERY_COST = 5;
  const canUnlock = starsBalance >= MYSTERY_COST;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: Math.max(insets.top, 16) + 12 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIconCircle, Shadows.soft]}>
            <Ionicons name="gift" size={24} color={Colors.vibrantPurple} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Gantimpala</Text>
            <Text style={styles.headerSub}>I-unlock ang mga mystery reward!</Text>
          </View>
        </View>
        <View style={[styles.starsBadge, Shadows.subtle]}>
          <Ionicons name="star" size={18} color={Colors.sunYellowDark} />
          <Text style={styles.starsCount}>{starsBalance}</Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Star Balance & Stats Card (Rule 8) */}
      <View style={[styles.statsCard, Shadows.card]}>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Kasalukuyan</Text>
          <View style={styles.statValRow}>
            <Ionicons name="star" size={18} color={Colors.sunYellowDark} />
            <Text style={styles.statVal}>{starsBalance}</Text>
          </View>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Kabuuang Kinita</Text>
          <View style={styles.statValRow}>
            <Ionicons name="trending-up" size={18} color={Colors.grassGreenDark} />
            <Text style={[styles.statVal, { color: Colors.grassGreenDark }]}>+{totalEarned}</Text>
          </View>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Nagastos</Text>
          <View style={styles.statValRow}>
            <Ionicons name="gift-outline" size={18} color={Colors.coralPink} />
            <Text style={[styles.statVal, { color: Colors.coralPink }]}>-{totalSpent}</Text>
          </View>
        </View>
      </View>

      {/* Mystery Box Card with Gradient */}
      <Animated.View style={[styles.mysteryCardWrapper, shakeAnimatedStyle]}>
        <View style={[styles.mysteryBox, Shadows.card]}>
          <LinearGradient
            colors={Gradients.purple}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />

          <Ionicons name="gift" size={54} color={Colors.white} style={styles.mysteryIcon} />
          <Text style={styles.mysteryTitle}>Mystery Reward!</Text>
          <Text style={styles.mysterySub}>
            Gumastos ng {MYSTERY_COST} bituin para i-reveal ang isang lihim na kolektible!
          </Text>

          <View style={styles.mysteryMetaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Iyong Bituin</Text>
              <Text style={styles.metaVal}>{starsBalance} ⭐</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Koleksyon</Text>
              <Text style={styles.metaVal}>{unlockedCount}/{collectibles.length}</Text>
            </View>
          </View>

          <PrimaryButton
            title={unlocking ? 'Ina-unlock...' : `I-unlock! (${MYSTERY_COST} ⭐)`}
            variant={canUnlock ? 'warning' : 'disabled'}
            size="lg"
            icon="sparkles"
            onPress={handleUnlockMystery}
            disabled={!canUnlock || unlocking}
            style={{ width: '100%', marginTop: 8 }}
          />

          {!canUnlock && (
            <Text style={styles.notEnoughText}>
              Mangailangan pa ng {MYSTERY_COST - starsBalance} bituin!
            </Text>
          )}
        </View>
      </Animated.View>

      {/* Revealed Collectible Pop-up */}
      {revealedCollectible && (
        <Animated.View
          style={[styles.revealCard, Shadows.card, revealAnimatedStyle]}
        >
          <View style={styles.revealBadge}>
            <Ionicons name="sparkles" size={14} color={Colors.sunYellowDark} />
            <Text style={styles.revealBadgeText}>BAGONG KOLEKTIBLE!</Text>
          </View>
          <Ionicons name="trophy" size={52} color={Colors.sunYellowDark} style={{ marginVertical: 8 }} />
          <Text style={styles.revealName}>
            {revealedCollectible.filipino_name || revealedCollectible.name}
          </Text>
          <View
            style={[
              styles.rarityBadge,
              { backgroundColor: RARITY_COLORS[revealedCollectible.rarity] ?? '#64748B' },
            ]}
          >
            <Text style={styles.rarityText}>{RARITY_LABELS[revealedCollectible.rarity]}</Text>
          </View>
          <Text style={styles.revealDesc}>{revealedCollectible.description}</Text>
          <PrimaryButton
            title="Tingnan sa Koleksyon"
            variant="outline"
            size="md"
            icon="arrow-forward"
            iconPosition="right"
            onPress={() => {
              setRevealedCollectible(null);
              router.push('/nakolekta');
            }}
            style={{ marginTop: 14, width: '100%' }}
          />
        </Animated.View>
      )}

      {/* Collectibles Preview */}
      {unlockedCount > 0 && (
        <View style={styles.previewSection}>
          <Text style={styles.sectionTitle}>Nakolekta Mo 🏆 ({unlockedCount})</Text>
          <View style={styles.previewGrid}>
            {collectibles
              .filter((c) => c.is_unlocked)
              .slice(0, 4)
              .map((c) => (
                <View key={c.id} style={[styles.previewCard, Shadows.soft]}>
                  <Ionicons name="ribbon" size={28} color={RARITY_COLORS[c.rarity] ?? Colors.skyBlueDark} />
                  <Text style={styles.previewName} numberOfLines={2}>
                    {c.filipino_name || c.name}
                  </Text>
                  <View style={[styles.miniRarity, { backgroundColor: RARITY_COLORS[c.rarity] ?? '#64748B' }]}>
                    <Text style={styles.miniRarityText}>{RARITY_LABELS[c.rarity]}</Text>
                  </View>
                </View>
              ))}
          </View>
          <PressableScale
            onPress={() => router.push('/nakolekta')}
            style={[styles.seeAllBtn, Shadows.subtle]}
          >
            <Text style={styles.seeAllText}>Tingnan Lahat ng Koleksyon</Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.skyBlueDark} />
          </PressableScale>
        </View>
      )}

      {/* Reward & Stars Transaction History (Rule 8) */}
      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Kasaysayan ng Bituin 📜</Text>
        {history.length > 0 ? (
          <View style={[styles.historyCard, Shadows.soft]}>
            {history.map((tx: any, idx: number) => {
              const isPositive = tx.amount > 0;
              const dateStr = tx.created_at
                ? new Date(tx.created_at).toLocaleDateString('fil-PH', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : '';

              return (
                <View
                  key={tx.id || idx}
                  style={[
                    styles.txRow,
                    idx < history.length - 1 && styles.txBorderBottom,
                  ]}
                >
                  <View style={[styles.txIconBox, isPositive ? styles.txEarnedBox : styles.txSpentBox]}>
                    <Ionicons
                      name={isPositive ? 'star' : 'gift'}
                      size={18}
                      color={isPositive ? Colors.sunYellowDark : Colors.coralPink}
                    />
                  </View>
                  <View style={styles.txInfo}>
                    <Text style={styles.txDesc} numberOfLines={1}>
                      {tx.description || (isPositive ? 'Nakumpletong Aktibidad' : 'Gantimpala')}
                    </Text>
                    <Text style={styles.txDate}>{dateStr}</Text>
                  </View>
                  <View style={styles.txAmountCol}>
                    <Text
                      style={[
                        styles.txAmount,
                        { color: isPositive ? Colors.grassGreenDark : Colors.coralPink },
                      ]}
                    >
                      {isPositive ? `+${tx.amount}` : `${tx.amount}`} ⭐
                    </Text>
                    {tx.balance_after !== undefined && (
                      <Text style={styles.txBalanceAfter}>Natira: {tx.balance_after}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={[styles.emptyHistoryBox, Shadows.subtle]}>
            <Ionicons name="time-outline" size={32} color={Colors.textMuted} />
            <Text style={styles.emptyHistoryText}>
              Wala pang tala ng mga bituin. Maglaro ng pagsasanay o minigame upang magsimula!
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  headerTitle: {
    fontSize: Typography.sizes.lg,
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
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
    gap: 4,
  },
  starsCount: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: '#92400E',
  },
  errorBanner: {
    backgroundColor: '#FFF1F2',
    padding: 12,
    borderRadius: Radius.lg,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.2)',
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    textAlign: 'center',
  },
  mysteryCardWrapper: {
    width: '100%',
    marginBottom: 24,
  },
  mysteryBox: {
    borderRadius: Radius.xxl,
    overflow: 'hidden',
    padding: 24,
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  decorCircle1: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: -20,
    right: -20,
  },
  decorCircle2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: -10,
    left: 20,
  },
  mysteryIcon: {
    marginBottom: 8,
  },
  mysteryTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
    marginBottom: 4,
  },
  mysterySub: {
    fontSize: Typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.88)',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: 16,
  },
  mysteryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: Radius.xl,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginBottom: 16,
    width: '100%',
    justifyContent: 'space-around',
  },
  metaItem: {
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: Typography.weights.semibold,
  },
  metaVal: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
    marginTop: 2,
  },
  metaDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  notEnoughText: {
    color: '#FEF08A',
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    marginTop: 8,
  },
  revealCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    marginBottom: 24,
  },
  revealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    marginBottom: 8,
  },
  revealBadgeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.heavy,
    color: '#92400E',
  },
  revealName: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 6,
  },
  rarityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    marginBottom: 8,
  },
  rarityText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: Typography.weights.heavy,
  },
  revealDesc: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 18,
  },
  previewSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 12,
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  previewCard: {
    width: '47%',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 14,
    alignItems: 'center',
  },
  previewName: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 6,
  },
  miniRarity: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  miniRarityText: {
    color: Colors.white,
    fontSize: 9,
    fontWeight: Typography.weights.heavy,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    borderRadius: Radius.pill,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  seeAllText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.skyBlueDark,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    fontWeight: Typography.weights.medium,
    marginBottom: 4,
  },
  statValRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statVal: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  historySection: {
    marginTop: 24,
    marginBottom: 20,
  },
  historyCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  txBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
  },
  txIconBox: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  txEarnedBox: {
    backgroundColor: '#FEF3C7',
  },
  txSpentBox: {
    backgroundColor: '#FFE4E6',
  },
  txInfo: {
    flex: 1,
  },
  txDesc: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  txDate: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  txAmountCol: {
    alignItems: 'flex-end',
  },
  txAmount: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  txBalanceAfter: {
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 2,
  },
  emptyHistoryBox: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  emptyHistoryText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
});
