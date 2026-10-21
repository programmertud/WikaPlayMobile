import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { EmptyState } from '../../../components/EmptyState';
import { ErrorView } from '../../../components/ErrorView';
import { LoadingView } from '../../../components/LoadingView';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { useAuth } from '../../../hooks/use-auth';
import { usePresence } from '../../../hooks/use-presence';
import { rewardService } from '../../../services/api';
import { Colors, Shadows, Typography } from '../../../theme';
import { Collectible } from '../../../types';

const { width } = Dimensions.get('window');

const RARITY_COLORS: Record<string, string> = {
  common: '#64748B',
  rare: '#3B82F6',
  epic: '#8B5CF6',
  legendary: '#F59E0B',
};

const RARITY_LABELS: Record<string, string> = {
  common: 'Karaniwan',
  rare: 'Bihara',
  epic: 'Mahiwaga',
  legendary: 'Pambihira',
};

export default function GantimpalaScreen() {
  const { user, updateUserStars } = useAuth();
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [starsBalance, setStarsBalance] = useState(user?.stars_balance ?? 0);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealedCollectible, setRevealedCollectible] = useState<Collectible | null>(null);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;

  usePresence('Sa Gantimpala', 'gantimpala');

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const res = await rewardService.getCollectibles();
      setCollectibles(res.collectibles);
      setStarsBalance(res.stars_balance);
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

    // Shake animation on the mystery box
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]).start();

    try {
      const res = await rewardService.unlockMystery();
      if (res.all_unlocked) {
        setError('Mayroon ka nang lahat ng koleksyon! 🎊');
      } else if (res.collectible) {
        setRevealedCollectible(res.collectible);
        setStarsBalance(res.stars_balance ?? starsBalance);
        updateUserStars(res.stars_balance ?? starsBalance);
        // Pop-in animation for revealed card
        scaleAnim.setValue(0);
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 120,
          useNativeDriver: true,
        }).start();
        loadData();
      }
    } catch (err: any) {
      setError(err.message || 'Hindi nai-unlock ang gantimpala. Subukan muli.');
    } finally {
      setUnlocking(false);
    }
  };

  if (loading) return <LoadingView message="Kinukuha ang mga gantimpala..." />;

  const unlockedCount = collectibles.filter((c) => c.is_unlocked).length;
  const MYSTERY_COST = 5;
  const canUnlock = starsBalance >= MYSTERY_COST;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, Shadows.soft]}>
          <Text style={styles.headerEmoji}>🎁</Text>
        </View>
        <View>
          <Text style={styles.headerTitle}>Gantimpala</Text>
          <Text style={styles.headerSub}>I-unlock ang mga mystery reward!</Text>
        </View>
        <View style={[styles.starsBadge, Shadows.button]}>
          <Text style={styles.starsIcon}>⭐</Text>
          <Text style={styles.starsCount}>{starsBalance}</Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Mystery Box */}
      <Animated.View style={[styles.mysteryBox, Shadows.card, { transform: [{ translateX: shakeAnim }] }]}>
        <Text style={styles.mysteryEmoji}>🎁</Text>
        <Text style={styles.mysteryTitle}>Mystery Reward!</Text>
        <Text style={styles.mysterySub}>
          Gumastos ng {MYSTERY_COST} bituin para i-reveal ang isang lihim na kolektible!
        </Text>
        <View style={styles.mysteryMeta}>
          <Text style={styles.mysteryMetaText}>
            Iyong mga bituin: <Text style={{ fontWeight: '800', color: '#F59E0B' }}>{starsBalance} ⭐</Text>
          </Text>
          <Text style={styles.mysteryMetaText}>
            Koleksyon: <Text style={{ fontWeight: '800', color: Colors.skyBlueDark }}>{unlockedCount}/{collectibles.length}</Text>
          </Text>
        </View>

        <PrimaryButton
          title={unlocking ? 'Ina-unlock...' : `I-unlock! (${MYSTERY_COST} ⭐)`}
          variant={canUnlock ? 'primary' : 'disabled'}
          size="lg"
          onPress={handleUnlockMystery}
          disabled={!canUnlock || unlocking}
          style={{ marginTop: 4 }}
        />
        {!canUnlock && (
          <Text style={styles.notEnoughText}>
            Mangailangan pa ng {MYSTERY_COST - starsBalance} bituin!
          </Text>
        )}
      </Animated.View>

      {/* Revealed Collectible Pop-up */}
      {revealedCollectible && (
        <Animated.View
          style={[styles.revealCard, Shadows.card, { transform: [{ scale: scaleAnim }] }]}
        >
          <Text style={styles.revealBadge}>✨ BAGONG KOLEKTIBLE! ✨</Text>
          <Text style={styles.revealEmoji}>
            {revealedCollectible.image_url ? '🎊' : '🌟'}
          </Text>
          <Text style={styles.revealName}>{revealedCollectible.filipino_name || revealedCollectible.name}</Text>
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
            title="Tingnan sa Koleksyon →"
            variant="outline"
            size="md"
            onPress={() => {
              setRevealedCollectible(null);
              router.push('/(student)/nakolekta');
            }}
            style={{ marginTop: 12 }}
          />
        </Animated.View>
      )}

      {/* Collectibles Preview (unlocked) */}
      {unlockedCount > 0 && (
        <>
          <Text style={styles.sectionTitle}>Nakolekta Mo 🏆 ({unlockedCount})</Text>
          <View style={styles.previewGrid}>
            {collectibles
              .filter((c) => c.is_unlocked)
              .slice(0, 4)
              .map((c) => (
                <View key={c.id} style={[styles.previewCard, Shadows.soft]}>
                  <Text style={styles.previewEmoji}>🌟</Text>
                  <Text style={styles.previewName} numberOfLines={2}>
                    {c.filipino_name || c.name}
                  </Text>
                  <View style={[styles.miniRarity, { backgroundColor: RARITY_COLORS[c.rarity] ?? '#64748B' }]}>
                    <Text style={styles.miniRarityText}>{RARITY_LABELS[c.rarity]}</Text>
                  </View>
                </View>
              ))}
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/(student)/nakolekta')}
            style={styles.seeAllBtn}
          >
            <Text style={styles.seeAllText}>Tingnan Lahat ng Koleksyon →</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF' },
  scrollContent: { padding: 16, paddingTop: 52, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#F59E0B',
    marginRight: 12,
  },
  headerEmoji: { fontSize: 26 },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.heavy,
    color: Colors.text,
  },
  headerSub: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  starsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#F59E0B',
    marginLeft: 'auto',
  },
  starsIcon: { fontSize: 16 },
  starsCount: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.heavy,
    color: '#92400E',
    marginLeft: 4,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    textAlign: 'center',
  },
  mysteryBox: {
    backgroundColor: '#8B5CF6',
    borderRadius: 28,
    borderWidth: 4,
    borderColor: Colors.white,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  mysteryEmoji: { fontSize: 72, marginBottom: 12 },
  mysteryTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.heavy,
    color: Colors.white,
    marginBottom: 6,
  },
  mysterySub: {
    fontSize: Typography.sizes.sm,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  mysteryMeta: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  mysteryMetaText: {
    fontSize: Typography.sizes.sm,
    color: 'rgba(255,255,255,0.9)',
  },
  notEnoughText: {
    marginTop: 8,
    fontSize: Typography.sizes.xs,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: Typography.weights.semibold,
  },
  revealCard: {
    backgroundColor: Colors.white,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: '#F59E0B',
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  revealBadge: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.heavy,
    color: '#D97706',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  revealEmoji: { fontSize: 64, marginBottom: 8 },
  revealName: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.heavy,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  rarityBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 14,
    marginBottom: 10,
  },
  rarityText: {
    color: Colors.white,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.heavy,
    letterSpacing: 0.5,
  },
  revealDesc: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.heavy,
    color: Colors.text,
    marginBottom: 14,
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  previewCard: {
    width: (width - 56) / 2,
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: Colors.white,
    padding: 14,
    alignItems: 'center',
  },
  previewEmoji: { fontSize: 36, marginBottom: 6 },
  previewName: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.heavy,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  miniRarity: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  miniRarityText: {
    color: Colors.white,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.heavy,
  },
  seeAllBtn: {
    backgroundColor: Colors.skyBlueLight,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  seeAllText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.heavy,
    color: Colors.skyBlueDark,
  },
});
