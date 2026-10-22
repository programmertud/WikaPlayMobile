import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
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

import { EmptyState } from '../../../components/EmptyState';
import { ErrorView } from '../../../components/ErrorView';
import { LoadingView } from '../../../components/LoadingView';
import { PressableScale } from '../../../components/PressableScale';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ProgressIndicator } from '../../../components/ProgressIndicator';
import { usePresence } from '../../../hooks/use-presence';
import { rewardService } from '../../../services/api';
import { playSound, speakWordWeb } from '../../../services/audio/sound-service';
import { Colors, Gradients, Shadows, Typography, Radius } from '../../../theme';
import { Collectible } from '../../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

const RARITY_ORDER = ['legendary', 'epic', 'rare', 'common'];

export default function NakolektaScreen() {
  const insets = useSafeAreaInsets();
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [starsBalance, setStarsBalance] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('Lahat');
  const [selectedCard, setSelectedCard] = useState<Collectible | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);
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

  // Audio Playback handler
  const handlePlayAudio = (item: Collectible) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPlayingAudioId(item.id);

    if (item.audio_url) {
      playSound(item.audio_url, () => {
        setPlayingAudioId(null);
      });
    } else {
      const textToSpeak = `${item.filipino_name || item.name}. ${item.description}`;
      speakWordWeb(textToSpeak, () => {
        setPlayingAudioId(null);
      });
    }
  };

  if (loading) return <LoadingView message="Kinukuha ang koleksyon..." />;
  if (error) return <ErrorView message={error} onRetry={loadData} />;

  // Unique categories list
  const categorySet = new Set<string>();
  collectibles.forEach((c) => {
    if (c.category) categorySet.add(c.category);
  });
  const categoriesList = ['Lahat', ...Array.from(categorySet)];

  // Filter collectibles
  const filteredCollectibles =
    selectedCategory === 'Lahat'
      ? collectibles
      : collectibles.filter((c) => c.category === selectedCategory);

  const unlocked = filteredCollectibles.filter((c) => c.is_unlocked);
  const locked = filteredCollectibles.filter((c) => !c.is_unlocked);

  const sortedUnlocked = [...unlocked].sort(
    (a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity)
  );

  const totalUnlockedOverall = collectibles.filter((c) => c.is_unlocked).length;

  return (
    <View style={styles.container}>
      <ScrollView
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
              <Ionicons name="trophy" size={24} color={Colors.sunYellowDark} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Nakolekta</Text>
              <Text style={styles.headerSub}>
                {totalUnlockedOverall} ng {collectibles.length} kolektible
              </Text>
            </View>
          </View>
          <View style={[styles.starsBadge, Shadows.subtle]}>
            <Ionicons name="star" size={18} color={Colors.sunYellowDark} />
            <Text style={styles.starsCount}>{starsBalance}</Text>
          </View>
        </View>

        {/* Progress Bar Card */}
        <View style={[styles.progressCard, Shadows.card]}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Kabuuang Koleksyon</Text>
            <Text style={styles.progressPercent}>
              {collectibles.length > 0
                ? Math.round((totalUnlockedOverall / collectibles.length) * 100)
                : 0}
              %
            </Text>
          </View>
          <ProgressIndicator
            current={totalUnlockedOverall}
            total={collectibles.length || 1}
            gradient={Gradients.sun}
            height={10}
          />
        </View>

        {/* Category Filter Pills (Rule 10 & 11) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryFiltersContainer}
        >
          {categoriesList.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setSelectedCategory(cat);
                }}
                style={[
                  styles.categoryPill,
                  isSelected && styles.categoryPillActive,
                  Shadows.subtle,
                ]}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isSelected && styles.categoryPillTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Unlocked Collectibles Section */}
        {sortedUnlocked.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Na-unlock Na 🌟 ({sortedUnlocked.length})</Text>
            <View style={styles.grid}>
              {sortedUnlocked.map((item) => {
                const isPlaying = playingAudioId === item.id;
                const rarityColor = RARITY_COLORS[item.rarity] ?? Colors.skyBlueDark;

                return (
                  <PressableScale
                    key={item.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setSelectedCard(item);
                      handlePlayAudio(item);
                    }}
                    style={[styles.collectibleCard, Shadows.card]}
                  >
                    {/* Card Image Frame */}
                    <View style={[styles.imageContainer, { backgroundColor: rarityColor + '12' }]}>
                      {item.image_url ? (
                        <Image
                          source={{ uri: item.image_url }}
                          style={styles.cardImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <Ionicons name="ribbon" size={44} color={rarityColor} />
                      )}

                      {/* Audio Replay Button */}
                      <TouchableOpacity
                        style={[
                          styles.audioCardBtn,
                          isPlaying && styles.audioCardBtnActive,
                        ]}
                        onPress={() => handlePlayAudio(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name={isPlaying ? 'volume-high' : 'volume-medium-outline'}
                          size={18}
                          color={isPlaying ? Colors.white : Colors.skyBlueDark}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Category Label */}
                    {item.category && (
                      <Text style={styles.cardCategory} numberOfLines={1}>
                        {item.category}
                      </Text>
                    )}

                    {/* Filipino Name */}
                    <Text style={styles.cardName} numberOfLines={1}>
                      {item.filipino_name || item.name}
                    </Text>

                    {/* Rarity Pill */}
                    <View style={[styles.rarityPill, { backgroundColor: rarityColor }]}>
                      <Text style={styles.rarityPillText}>{RARITY_LABELS[item.rarity]}</Text>
                    </View>

                    {/* Filipino Short Description */}
                    <Text style={styles.cardDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  </PressableScale>
                );
              })}
            </View>
          </View>
        ) : (
          <EmptyState
            emoji="🎁"
            title="Wala Pang Koleksyon"
            message={
              selectedCategory === 'Lahat'
                ? 'Maglaro ng mini-game at kumuha ng 15-20 puntos para mag-unlock ng kard!'
                : `Wala ka pang nakokolekta sa kategoryang ${selectedCategory}.`
            }
          />
        )}

        {/* Locked / Undiscovered Collectibles Section (Rule 10) */}
        {locked.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors.textLight }]}>
              Naka-lock Pa 🔒 ({locked.length})
            </Text>
            <View style={styles.grid}>
              {locked.map((item) => (
                <View
                  key={item.id}
                  style={[styles.collectibleCard, styles.lockedCard, Shadows.subtle]}
                >
                  <View style={styles.lockedIconBox}>
                    <Ionicons name="lock-closed" size={32} color={Colors.textMuted} />
                  </View>
                  {item.category && (
                    <Text style={styles.lockedCategory} numberOfLines={1}>
                      {item.category}
                    </Text>
                  )}
                  <Text style={styles.lockedCardName}>???</Text>
                  <View style={[styles.rarityPill, { backgroundColor: '#CBD5E1' }]}>
                    <Text style={styles.rarityPillText}>{RARITY_LABELS[item.rarity]}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Card Detail Modal */}
      {selectedCard && (
        <Modal
          visible={!!selectedCard}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedCard(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, Shadows.card]}>
              <LinearGradient
                colors={['#8B5CF6', '#6D28D9']}
                style={styles.modalHeader}
              >
                <View style={styles.modalRarityRow}>
                  <View
                    style={[
                      styles.modalRarityPill,
                      {
                        backgroundColor:
                          RARITY_COLORS[selectedCard.rarity] ?? Colors.skyBlueDark,
                      },
                    ]}
                  >
                    <Text style={styles.modalRarityText}>
                      {RARITY_LABELS[selectedCard.rarity]}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedCard(null)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={20} color={Colors.white} />
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalTitle}>
                  {selectedCard.filipino_name || selectedCard.name}
                </Text>
                {selectedCard.category && (
                  <Text style={styles.modalCategoryText}>
                    Kategorya: {selectedCard.category}
                  </Text>
                )}
              </LinearGradient>

              <View style={styles.modalBody}>
                {/* Large Image Frame */}
                <View style={styles.modalImageFrame}>
                  {selectedCard.image_url ? (
                    <Image
                      source={{ uri: selectedCard.image_url }}
                      style={styles.modalImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons name="trophy" size={72} color={Colors.sunYellowDark} />
                  )}
                </View>

                {/* Filipino Description */}
                <Text style={styles.modalDescription}>
                  {selectedCard.description || 'Isang espesyal na kard mula sa WikaPlay!'}
                </Text>

                {/* Audio Replay Control (Rule 8) */}
                <TouchableOpacity
                  style={[
                    styles.modalAudioBtn,
                    playingAudioId === selectedCard.id && styles.modalAudioBtnActive,
                  ]}
                  onPress={() => handlePlayAudio(selectedCard)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={
                      playingAudioId === selectedCard.id
                        ? 'volume-high'
                        : 'volume-medium-outline'
                    }
                    size={24}
                    color={Colors.skyBlueDark}
                  />
                  <Text style={styles.modalAudioBtnText}>
                    {playingAudioId === selectedCard.id
                      ? 'Pinakikinggan...'
                      : 'Pakinggan ang Paglalarawan 🔊'}
                  </Text>
                </TouchableOpacity>

                <PrimaryButton
                  title="Isara"
                  variant="outline"
                  size="md"
                  onPress={() => setSelectedCard(null)}
                  style={{ width: '100%', marginTop: 12 }}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
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
    marginBottom: 16,
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
  progressCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progressTitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  progressPercent: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.sunYellowDark,
  },
  categoryFiltersContainer: {
    gap: 8,
    paddingBottom: 16,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  categoryPillActive: {
    backgroundColor: Colors.skyBlue,
    borderColor: Colors.skyBlue,
  },
  categoryPillText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.textLight,
  },
  categoryPillTextActive: {
    color: Colors.white,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  collectibleCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    alignItems: 'center',
  },
  imageContainer: {
    width: '100%',
    height: 100,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  audioCardBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  audioCardBtnActive: {
    backgroundColor: Colors.skyBlue,
  },
  cardCategory: {
    fontSize: 10,
    color: Colors.textLight,
    fontWeight: Typography.weights.semibold,
    marginBottom: 2,
  },
  cardName: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  rarityPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    marginBottom: 6,
  },
  rarityPillText: {
    fontSize: 9,
    fontWeight: Typography.weights.heavy,
    color: Colors.white,
    textTransform: 'uppercase',
  },
  cardDesc: {
    fontSize: 11,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 14,
  },
  lockedCard: {
    backgroundColor: '#F8FAFC',
    borderColor: 'rgba(0, 0, 0, 0.04)',
    opacity: 0.85,
  },
  lockedIconBox: {
    width: '100%',
    height: 100,
    borderRadius: Radius.lg,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  lockedCategory: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: Typography.weights.medium,
    marginBottom: 2,
  },
  lockedCardName: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.textMuted,
    marginBottom: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    overflow: 'hidden',
    maxWidth: 360,
  },
  modalHeader: {
    padding: 16,
    alignItems: 'center',
  },
  modalRarityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalRarityPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  modalRarityText: {
    fontSize: 10,
    color: Colors.white,
    fontWeight: Typography.weights.heavy,
    textTransform: 'uppercase',
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
    textAlign: 'center',
  },
  modalCategoryText: {
    fontSize: Typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  modalBody: {
    padding: 20,
    alignItems: 'center',
  },
  modalImageFrame: {
    width: 140,
    height: 140,
    borderRadius: Radius.xl,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalDescription: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  modalAudioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  modalAudioBtnActive: {
    backgroundColor: '#BAE6FD',
  },
  modalAudioBtnText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.skyBlueDark,
  },
});
