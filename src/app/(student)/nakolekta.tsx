import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { EmptyState } from '../../components/EmptyState';
import { ErrorView } from '../../components/ErrorView';
import { LoadingView } from '../../components/LoadingView';
import { usePresence } from '../../hooks/use-presence';
import { rewardService } from '../../services/api';
import { Colors, Shadows, Typography } from '../../theme';
import { Collectible } from '../../types';

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

const RARITY_ORDER = ['legendary', 'epic', 'rare', 'common'];

export default function NakolektaScreen() {
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [starsBalance, setStarsBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  usePresence('Sa Nakolekta (Koleksyon)', 'nakolekta');

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const res = await rewardService.getCollectibles();
      setCollectibles(res.collectibles);
      setStarsBalance(res.stars_balance);
    } catch (err: any) {
      setError(err.message || 'Nabigong kunin ang mga kolektible.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <LoadingView message="Kinukuha ang koleksyon..." />;
  if (error) return <ErrorView message={error} onRetry={loadData} />;

  const unlocked = collectibles.filter((c) => c.is_unlocked);
  const locked = collectibles.filter((c) => !c.is_unlocked);

  // Sort by rarity order
  const sortedUnlocked = [...unlocked].sort(
    (a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, Shadows.soft]}>
          <Text style={styles.headerEmoji}>🏆</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Nakolekta</Text>
          <Text style={styles.headerSub}>
            {unlocked.length} ng {collectibles.length} kolektible
          </Text>
        </View>
        <View style={[styles.starsBadge, Shadows.soft]}>
          <Text>⭐ {starsBalance}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressContainer, Shadows.soft]}>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: collectibles.length > 0
                  ? `${(unlocked.length / collectibles.length) * 100}%`
                  : '0%',
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round(collectibles.length > 0 ? (unlocked.length / collectibles.length) * 100 : 0)}% Nakumpleto
        </Text>
      </View>

      {/* Unlocked Section */}
      {sortedUnlocked.length === 0 ? (
        <EmptyState
          emoji="🔮"
          title="Wala Pang Kolektible"
          subtitle="Pumunta sa Gantimpala at gamitin ang iyong mga bituin para i-unlock ang mga kolektible!"
        />
      ) : (
        <>
          <Text style={styles.sectionTitle}>Mga Nakolekta ✨ ({unlocked.length})</Text>
          <View style={styles.grid}>
            {sortedUnlocked.map((item) => (
              <View key={item.id} style={[styles.card, styles.unlockedCard, Shadows.card]}>
                <View style={[styles.rarityDot, { backgroundColor: RARITY_COLORS[item.rarity] ?? '#64748B' }]} />
                <Text style={styles.cardEmoji}>🌟</Text>
                <Text style={styles.cardName} numberOfLines={2}>
                  {item.filipino_name || item.name}
                </Text>
                <View style={[styles.rarityBadge, { backgroundColor: RARITY_COLORS[item.rarity] ?? '#64748B' }]}>
                  <Text style={styles.rarityText}>{RARITY_LABELS[item.rarity]}</Text>
                </View>
                {item.description ? (
                  <Text style={styles.cardDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        </>
      )}

      {/* Locked Section */}
      {locked.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
            Hindi Pa Na-unlock 🔒 ({locked.length})
          </Text>
          <View style={styles.grid}>
            {locked.map((item) => (
              <View key={item.id} style={[styles.card, styles.lockedCard, Shadows.soft]}>
                <Text style={styles.lockEmoji}>🔒</Text>
                <Text style={styles.lockedName} numberOfLines={2}>???</Text>
                <View style={[styles.rarityBadge, { backgroundColor: RARITY_COLORS[item.rarity] ?? '#64748B', opacity: 0.5 }]}>
                  <Text style={styles.rarityText}>{RARITY_LABELS[item.rarity]}</Text>
                </View>
                <Text style={styles.lockedCost}>⭐ {item.required_stars} bituin</Text>
              </View>
            ))}
          </View>
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
    marginBottom: 20,
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
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  progressContainer: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
  },
  progressBarBg: {
    height: 12,
    backgroundColor: '#E2E8F0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 6,
  },
  progressText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.textLight,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.heavy,
    color: Colors.text,
    marginBottom: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: (width - 48) / 2,
    borderRadius: 22,
    borderWidth: 4,
    borderColor: Colors.white,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
    position: 'relative',
  },
  unlockedCard: {
    backgroundColor: Colors.white,
  },
  lockedCard: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  rarityDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardEmoji: { fontSize: 44, marginBottom: 6 },
  cardName: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.heavy,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 18,
  },
  rarityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 6,
  },
  rarityText: {
    color: Colors.white,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.heavy,
  },
  cardDesc: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  lockEmoji: { fontSize: 36, marginBottom: 8, opacity: 0.5 },
  lockedName: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.heavy,
    color: Colors.textMuted,
    marginBottom: 8,
  },
  lockedCost: {
    fontSize: Typography.sizes.xs,
    color: Colors.textMuted,
    fontWeight: Typography.weights.semibold,
  },
});
