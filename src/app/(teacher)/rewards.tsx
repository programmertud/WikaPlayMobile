import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
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
import { AnimatedBackground } from '../../components/AnimatedBackground';
import { VolumeButton } from '../../components/VolumeButton';
import { teacherService } from '../../services/api';
import { Colors, Gradients, Shadows, Typography, Radius } from '../../theme';
import type { Collectible } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function TeacherRewardsScreen() {
  const insets = useSafeAreaInsets();
  const [subTab, setSubTab] = useState<'stars' | 'collectibles' | 'minigames'>('stars');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Star & Badge Audit Data
  const [rewardAudit, setRewardAudit] = useState<{
    total_earned: number;
    total_spendable: number;
    total_spent: number;
    badge_stats: { key: string; title: string; threshold: number; claimed_count: number }[];
    recent_transactions: any[];
  } | null>(null);

  // Mini-Games Overview Data
  const [minigamesData, setMinigamesData] = useState<{
    games: any[];
    recent_sessions: any[];
    total_completed_sessions: number;
    total_qualifying_sessions: number;
  } | null>(null);

  // Collectibles Data
  const [collectibles, setCollectibles] = useState<(Collectible & { claims_count?: number })[]>([]);
  const [totalCollectibles, setTotalCollectibles] = useState(151);
  const [totalClaims, setTotalClaims] = useState(0);
  const [collectibleCategories, setCollectibleCategories] = useState<string[]>([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [collectibleSearch, setCollectibleSearch] = useState('');

  // Collectible Edit Modal State
  const [editingCard, setEditingCard] = useState<Collectible | null>(null);
  const [editName, setEditName] = useState('');
  const [editFilipinoName, setEditFilipinoName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSavingCard, setIsSavingCard] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [auditRes, minigamesRes, collectiblesRes] = await Promise.allSettled([
        teacherService.getRewardAudit(),
        teacherService.getMinigamesOverview(),
        teacherService.getCollectibles(),
      ]);

      if (auditRes.status === 'fulfilled') {
        setRewardAudit(auditRes.value);
      }
      if (minigamesRes.status === 'fulfilled') {
        setMinigamesData(minigamesRes.value);
      }
      if (collectiblesRes.status === 'fulfilled') {
        setCollectibles(collectiblesRes.value.collectibles);
        setTotalCollectibles(collectiblesRes.value.total_collectibles);
        setTotalClaims(collectiblesRes.value.total_claims);
        setCollectibleCategories(collectiblesRes.value.categories);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load rewards and collectibles data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenEditCard = (card: Collectible) => {
    setEditingCard(card);
    setEditName(card.name);
    setEditFilipinoName(card.filipino_name);
    setEditDescription(card.description);
  };

  const handleSaveCard = async () => {
    if (!editingCard) return;
    if (!editFilipinoName.trim() || !editDescription.trim()) {
      Alert.alert('Missing Data', 'Please fill in the Filipino name and description.');
      return;
    }

    setIsSavingCard(true);
    try {
      await teacherService.saveCollectible({
        id: editingCard.id,
        name: editName.trim(),
        filipino_name: editFilipinoName.trim(),
        category: editingCard.category || 'Mga Hayop',
        description: editDescription.trim(),
        image_url: editingCard.image_url || '',
        rarity: editingCard.rarity,
      });

      Alert.alert('Success', 'Card information updated successfully!');
      setEditingCard(null);
      // Reload updated cards
      const res = await teacherService.getCollectibles();
      setCollectibles(res.collectibles);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save card.');
    } finally {
      setIsSavingCard(false);
    }
  };

  if (loading && !refreshing) return <LoadingView message="Loading Rewards & Collectibles Center..." />;
  if (error && !rewardAudit) return <ErrorView message={error} onRetry={loadData} />;

  const filteredCollectibles = collectibles.filter((c) => {
    const matchesCat =
      selectedCategoryFilter === 'all' ||
      (c.category && c.category.toLowerCase() === selectedCategoryFilter.toLowerCase());

    const matchesSearch =
      c.name.toLowerCase().includes(collectibleSearch.toLowerCase().trim()) ||
      c.filipino_name.toLowerCase().includes(collectibleSearch.toLowerCase().trim()) ||
      c.description.toLowerCase().includes(collectibleSearch.toLowerCase().trim());

    return matchesCat && matchesSearch;
  });

  return (
    <AnimatedBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 16) + 10 },
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
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <Ionicons name="gift" size={24} color={Colors.teacherPurple} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>Rewards & Collectibles</Text>
          <Text style={styles.pageSub}>
            Manage stars, badges, mini-game qualifications, and 151 collectible cards.
          </Text>
        </View>
        <VolumeButton activeColor={Colors.teacherPurple} size={38} />
      </View>

      {/* Sub Tabs */}
      <View style={styles.subTabNav}>
        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'stars' && styles.subTabBtnActive]}
          onPress={() => setSubTab('stars')}
        >
          <Ionicons
            name="star"
            size={16}
            color={subTab === 'stars' ? Colors.white : Colors.sunYellowDark}
          />
          <Text style={[styles.subTabText, subTab === 'stars' && styles.subTabTextActive]}>
            Stars & Badges
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'collectibles' && styles.subTabBtnActive]}
          onPress={() => setSubTab('collectibles')}
        >
          <Ionicons
            name="albums"
            size={16}
            color={subTab === 'collectibles' ? Colors.white : Colors.coralPinkDark}
          />
          <Text style={[styles.subTabText, subTab === 'collectibles' && styles.subTabTextActive]}>
            Collectibles (151 Cards)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'minigames' && styles.subTabBtnActive]}
          onPress={() => setSubTab('minigames')}
        >
          <Ionicons
            name="game-controller"
            size={16}
            color={subTab === 'minigames' ? Colors.white : '#8B5CF6'}
          />
          <Text style={[styles.subTabText, subTab === 'minigames' && styles.subTabTextActive]}>
            5 Mini-Games
          </Text>
        </TouchableOpacity>
      </View>

      {/* SUBTAB 1: STARS & GANTIMPALA AUDIT */}
      {subTab === 'stars' && (
        <>
          {/* Hero Audit Card */}
          <LinearGradient
            colors={['#8B5CF6', '#6D28D9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.heroCard, Shadows.card]}
          >
            <View style={styles.heroRow}>
              <View style={styles.heroStarCircle}>
                <Ionicons name="star" size={32} color={Colors.sunYellow} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroLabel}>Total Class Stars</Text>
                <Text style={styles.heroValue}>
                  {(rewardAudit?.total_earned ?? 0).toLocaleString()} ⭐
                </Text>
                <Text style={styles.heroNotice}>
                  No 480-Star Cap Policy: Students can continue earning beyond 480 stars without limit.
                </Text>
              </View>
            </View>

            <View style={styles.ledgerRow}>
              <View style={styles.ledgerCol}>
                <Text style={styles.ledgerNum}>
                  {(rewardAudit?.total_earned ?? 0).toLocaleString()}
                </Text>
                <Text style={styles.ledgerDesc}>Lifetime Earned</Text>
              </View>
              <View style={styles.ledgerDivider} />
              <View style={styles.ledgerCol}>
                <Text style={styles.ledgerNum}>
                  {(rewardAudit?.total_spendable ?? 0).toLocaleString()}
                </Text>
                <Text style={styles.ledgerDesc}>Currently Held</Text>
              </View>
              <View style={styles.ledgerDivider} />
              <View style={styles.ledgerCol}>
                <Text style={styles.ledgerNum}>
                  {(rewardAudit?.total_spent ?? 0).toLocaleString()}
                </Text>
                <Text style={styles.ledgerDesc}>Spent on Rewards</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Badge Milestones Distribution */}
          <View style={[styles.sectionBox, Shadows.soft]}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="ribbon" size={20} color={Colors.sunYellowDark} />
              <Text style={styles.sectionBoxTitle}>Honor Badge Distribution</Text>
            </View>
            <Text style={styles.sectionBoxSub}>
              Number of students who reached and claimed each badge milestone
            </Text>

            {rewardAudit?.badge_stats?.map((b) => (
              <View key={b.key} style={styles.badgeStatRow}>
                <View style={styles.badgeIconCol}>
                  <Text style={{ fontSize: 20 }}>
                    {b.key === 'ultimate_learner' ? '👑' : b.key === 'learning_champion' ? '🏆' : b.key === 'quiz_master' ? '🎯' : '⭐'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.badgeStatTitle}>{b.title}</Text>
                  <Text style={styles.badgeStatThreshold}>Threshold: {b.threshold} total stars</Text>
                </View>
                <View style={styles.badgeClaimCountBadge}>
                  <Text style={styles.badgeClaimCountText}>{b.claimed_count} students</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Recent Global Star Transactions */}
          <View style={[styles.sectionBox, Shadows.soft, { marginTop: 14 }]}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="receipt-outline" size={20} color={Colors.teacherPurple} />
              <Text style={styles.sectionBoxTitle}>Recent Star Transactions</Text>
            </View>

            {rewardAudit?.recent_transactions && rewardAudit.recent_transactions.length > 0 ? (
              rewardAudit.recent_transactions.slice(0, 12).map((tx, idx) => (
                <View key={tx.id || idx} style={styles.txRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txStudentName}>{tx.user?.name || 'Student'}</Text>
                    <Text style={styles.txDesc}>{tx.description || tx.source_type}</Text>
                    <Text style={styles.txDate}>
                      {tx.created_at ? new Date(tx.created_at).toLocaleString('en-PH') : ''} · Balance: {tx.balance_after} ⭐
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.txAmount,
                      { color: tx.amount >= 0 ? Colors.grassGreenDark : Colors.coralPinkDark },
                    ]}
                  >
                    {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} ⭐
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No transactions recorded yet.</Text>
            )}
          </View>
        </>
      )}

      {/* SUBTAB 2: NAKOLEKTA (COLLECTIBLES CATALOG) */}
      {subTab === 'collectibles' && (
        <>
          {/* Summary Banner */}
          <View style={[styles.collectibleBanner, Shadows.soft]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cbTitle}>Collectibles Catalog (151 Cards)</Text>
              <Text style={styles.cbSub}>
                {totalCollectibles} cards in the system. {totalClaims} total cards claimed by students.
              </Text>
            </View>
            <View style={styles.cbBadge}>
              <Ionicons name="sparkles" size={18} color={Colors.sunYellowDark} />
              <Text style={styles.cbBadgeText}>{totalClaims} Unlocked</Text>
            </View>
          </View>

          {/* Search Box */}
          <View style={[styles.searchBox, Shadows.subtle]}>
            <Ionicons name="search" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or description..."
              value={collectibleSearch}
              onChangeText={setCollectibleSearch}
            />
            {collectibleSearch.length > 0 && (
              <TouchableOpacity onPress={() => setCollectibleSearch('')}>
                <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catFilterScroll}>
            <TouchableOpacity
              style={[styles.catFilterChip, selectedCategoryFilter === 'all' && styles.catFilterChipActive]}
              onPress={() => setSelectedCategoryFilter('all')}
            >
              <Text
                style={[styles.catFilterText, selectedCategoryFilter === 'all' && styles.catFilterTextActive]}
              >
                All ({collectibles.length})
              </Text>
            </TouchableOpacity>

            {collectibleCategories.map((cat) => {
              const count = collectibles.filter((c) => c.category === cat).length;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catFilterChip, selectedCategoryFilter === cat && styles.catFilterChipActive]}
                  onPress={() => setSelectedCategoryFilter(cat)}
                >
                  <Text
                    style={[styles.catFilterText, selectedCategoryFilter === cat && styles.catFilterTextActive]}
                  >
                    {cat} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Cards Grid / List */}
          {filteredCollectibles.length === 0 ? (
            <EmptyState
              emoji="🎴"
              title="No Cards Found"
              message="No cards match your filter or search term."
            />
          ) : (
            filteredCollectibles.map((card) => (
              <View key={card.id} style={[styles.cardItem, Shadows.soft]}>
                {card.image_url ? (
                  <Image source={{ uri: card.image_url }} style={styles.cardThumb} resizeMode="cover" />
                ) : (
                  <View style={[styles.cardThumb, styles.cardThumbPlaceholder]}>
                    <Text style={{ fontSize: 24 }}>🎴</Text>
                  </View>
                )}

                <View style={{ flex: 1 }}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardFilipinoName}>{card.filipino_name}</Text>
                    <View style={styles.rarityPill}>
                      <Text style={styles.rarityText}>{card.rarity.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.cardCategory}>{card.category || 'Animals'}</Text>
                  <Text style={styles.cardDesc} numberOfLines={2}>
                    {card.description}
                  </Text>
                  <Text style={styles.cardClaimsCount}>
                    {card.claims_count ?? 0} students own this card
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.cardEditBtn}
                  onPress={() => handleOpenEditCard(card)}
                >
                  <Ionicons name="pencil" size={16} color={Colors.teacherPurple} />
                  <Text style={styles.cardEditText}>Edit</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </>
      )}

      {/* SUBTAB 3: 5 MINI-GAMES OVERVIEW */}
      {subTab === 'minigames' && (
        <>
          <View style={[styles.sectionBox, Shadows.soft]}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="game-controller" size={20} color="#EC4899" />
              <Text style={styles.sectionBoxTitle}>5 WikaPlay Mini-Games</Text>
            </View>
            <Text style={styles.sectionBoxSub}>
              Mystery Box Policy: Scoring 15–20 / 20 points qualifies for the mystery box. 0–14 points do not qualify.
            </Text>

            {minigamesData?.games?.map((g) => (
              <View key={g.id} style={[styles.gameCard, Shadows.subtle]}>
                <View style={[styles.gameCardHead, { borderLeftColor: g.color || '#EC4899' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.gameCardTitle}>{g.title}</Text>
                    <Text style={styles.gameCardDesc}>{g.description}</Text>
                  </View>
                  <View style={[styles.gamePlaysPill, { backgroundColor: g.color + '20' }]}>
                    <Text style={[styles.gamePlaysText, { color: g.color }]}>
                      {g.total_plays} Plays
                    </Text>
                  </View>
                </View>

                <View style={styles.gameMetricsRow}>
                  <View style={styles.gameMetricCol}>
                    <Text style={styles.gameMetricVal}>{g.average_score} / 20</Text>
                    <Text style={styles.gameMetricLabel}>Avg Score</Text>
                  </View>
                  <View style={styles.gameMetricDivider} />
                  <View style={styles.gameMetricCol}>
                    <Text style={styles.gameMetricVal}>{g.qualifiers_count}</Text>
                    <Text style={styles.gameMetricLabel}>Mystery Box (15-20 pts)</Text>
                  </View>
                  <View style={styles.gameMetricDivider} />
                  <View style={styles.gameMetricCol}>
                    <Text style={styles.gameMetricVal}>+{g.stars_awarded} ⭐</Text>
                    <Text style={styles.gameMetricLabel}>Stars Awarded</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      {/* EDIT COLLECTIBLE MODAL */}
      <Modal
        visible={!!editingCard}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingCard(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.editModalCard, Shadows.card]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.editModalTitle}>Edit Collectible Card</Text>
              <TouchableOpacity onPress={() => setEditingCard(null)}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Filipino Name:</Text>
            <TextInput
              style={styles.modalInput}
              value={editFilipinoName}
              onChangeText={setEditFilipinoName}
              placeholder="Example: Ang Aso"
            />

            <Text style={styles.inputLabel}>Description / Story:</Text>
            <TextInput
              style={[styles.modalInput, { height: 90, textAlignVertical: 'top' }]}
              multiline
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Educational description of the card..."
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setEditingCard(null)}
                disabled={isSavingCard}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveCard}
                disabled={isSavingCard}
              >
                <Text style={styles.modalSaveText}>
                  {isSavingCard ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 48 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
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
  pageSub: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  subTabNav: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    padding: 4,
    borderRadius: Radius.pill,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  subTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: Radius.pill,
  },
  subTabBtnActive: {
    backgroundColor: Colors.teacherPurple,
  },
  subTabText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.textMuted,
  },
  subTabTextActive: {
    color: Colors.white,
  },
  heroCard: {
    borderRadius: Radius.xl,
    padding: 16,
    marginBottom: 16,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroStarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: {
    fontSize: Typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  heroValue: {
    fontSize: Typography.sizes.xxl,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.black,
    color: Colors.white,
    marginTop: 2,
  },
  heroNotice: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
    lineHeight: 14,
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 14,
  },
  ledgerCol: {
    alignItems: 'center',
  },
  ledgerNum: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  ledgerDesc: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  ledgerDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  sectionBox: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionBoxTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  sectionBoxSub: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: 2,
    marginBottom: 14,
  },
  badgeStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
  },
  badgeIconCol: {
    width: 36,
    alignItems: 'center',
  },
  badgeStatTitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  badgeStatThreshold: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  badgeClaimCountBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  badgeClaimCountText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.teacherPurple,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
  },
  txStudentName: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  txDesc: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 1,
  },
  txDate: {
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 2,
  },
  txAmount: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  emptyText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    textAlign: 'center',
    paddingVertical: 12,
  },
  collectibleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 12,
  },
  cbTitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  cbSub: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  cbBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF08A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  cbBadgeText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    color: Colors.text,
  },
  catFilterScroll: {
    marginBottom: 14,
  },
  catFilterChip: {
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  catFilterChipActive: {
    backgroundColor: Colors.teacherPurple,
    borderColor: Colors.teacherPurple,
  },
  catFilterText: {
    fontSize: 11,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.textMuted,
  },
  catFilterTextActive: {
    color: Colors.white,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },
  cardThumb: {
    width: 60,
    height: 60,
    borderRadius: Radius.md,
  },
  cardThumbPlaceholder: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardFilipinoName: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    flex: 1,
  },
  rarityPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rarityText: {
    fontSize: 9,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: '#D97706',
  },
  cardCategory: {
    fontSize: 10,
    color: Colors.teacherPurple,
    fontWeight: 'bold',
    marginTop: 1,
  },
  cardDesc: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 2,
  },
  cardClaimsCount: {
    fontSize: 10,
    color: Colors.grassGreenDark,
    fontWeight: 'bold',
    marginTop: 4,
  },
  cardEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.teacherPurpleLight,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  cardEditText: {
    fontSize: 11,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.teacherPurple,
  },
  gameCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 12,
  },
  gameCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 3,
    paddingLeft: 8,
    marginBottom: 10,
  },
  gameCardTitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  gameCardDesc: {
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 1,
  },
  gamePlaysPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  gamePlaysText: {
    fontSize: 10,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  gameMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    padding: 8,
  },
  gameMetricCol: {
    flex: 1,
    alignItems: 'center',
  },
  gameMetricVal: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  gameMetricLabel: {
    fontSize: 9,
    color: Colors.textLight,
    marginTop: 2,
    textAlign: 'center',
  },
  gameMetricDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editModalCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  editModalTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  inputLabel: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginTop: 10,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: Typography.sizes.xs,
    color: Colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: '#F3F4F6',
  },
  modalCancelText: {
    fontSize: Typography.sizes.xs,
    fontWeight: 'bold',
    color: Colors.textMuted,
  },
  modalSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.teacherPurple,
  },
  modalSaveText: {
    fontSize: Typography.sizes.xs,
    fontWeight: 'bold',
    color: Colors.white,
  },
});
