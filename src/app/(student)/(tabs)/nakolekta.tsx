/**
 * Nakolekta — Collectible Album Screen
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '@/utils/haptics';

import { EmptyState } from '../../../components/EmptyState';
import { ErrorView } from '../../../components/ErrorView';
import { PressableScale } from '../../../components/PressableScale';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ProgressIndicator } from '../../../components/ProgressIndicator';
import { useAuth } from '../../../hooks/use-auth';
import { usePresence } from '../../../hooks/use-presence';
import { collectibleService } from '../../../services/api';
import { bgm, playSound, speakWordWeb, stopCurrentSound } from '../../../services/audio/sound-service';
import { getCollectibleAudioSource, getCollectibleDescription, getCollectibleImageSource } from '@/utils/collectible-assets';
import { Colors, Gradients, Shadows, Typography, Radius } from '../../../theme';
import { Collectible } from '../../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 44) / 2;

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

const CATEGORY_EMOJI: Record<string, string> = {
  'Mga Hayop': '🐾',
  'Mga Prutas': '🍎',
  'Mga Gulay': '🥦',
  'Mga Kulay': '🎨',
  'Mga Hugis': '⭐',
  'Mga Numero': '🔢',
  'Mga Bilang': '🔢',
  'Mga Bahagi ng Katawan': '🦷',
  'Mga Pagbati': '👋',
  'Mga Pagbati at Parirala': '👋',
  Lahat: '📚',
};

const ORDERED_CATEGORIES = [
  'Lahat',
  'Mga Hayop',
  'Mga Prutas',
  'Mga Gulay',
  'Mga Kulay',
  'Mga Hugis',
  'Mga Bilang',
  'Mga Bahagi ng Katawan',
  'Mga Pagbati',
];

function catEmoji(cat: string) {
  return CATEGORY_EMOJI[cat] ?? '🎁';
}

// ── Shimmer skeleton ──────────────────────────────────────────────────────────
function ShimmerCard() {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View style={[skeletonStyles.card, { opacity }]}>
      <View style={skeletonStyles.image} />
      <View style={skeletonStyles.line} />
      <View style={[skeletonStyles.line, { width: '60%' }]} />
    </Animated.View>
  );
}
const skeletonStyles = StyleSheet.create({
  card: { width: CARD_WIDTH, backgroundColor: '#E2E8F0', borderRadius: Radius.xl, padding: 12, alignItems: 'center' },
  image: { width: '100%', height: 100, backgroundColor: '#CBD5E1', borderRadius: Radius.lg, marginBottom: 8 },
  line: { height: 10, width: '80%', backgroundColor: '#CBD5E1', borderRadius: 6, marginBottom: 6 },
});

// ── Detail Modal ──────────────────────────────────────────────────────────────
function CollectibleDetailModal({ item, onClose }: { item: Collectible; onClose: () => void }) {
  const [playing, setPlaying] = useState(false);
  const rarityColor = RARITY_COLORS[item.rarity] ?? Colors.skyBlueDark;
  const displayName = item.filipino_name || item.name;

  const handleClose = useCallback(() => {
    stopCurrentSound();
    bgm.restore();
    onClose();
  }, [onClose]);

  const handlePlayAudio = useCallback(() => {
    if (playing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setPlaying(true);
    bgm.minimize();
    const audioSource = getCollectibleAudioSource(item);
    if (audioSource) {
      playSound(audioSource, () => setPlaying(false));
    } else {
      const desc = getCollectibleDescription(item);
      speakWordWeb(`${displayName}. ${desc}`, () => setPlaying(false));
    }
  }, [playing, item, displayName]);

  useEffect(() => {
    // Minimize @happy.mp3 sound so narration is clear and pleasant
    bgm.minimize();

    const t = setTimeout(handlePlayAudio, 400);
    return () => {
      clearTimeout(t);
      stopCurrentSound();
      bgm.restore();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleClose}>
      <View style={modalStyles.overlay}>
        <View style={[modalStyles.card, Shadows.card]}>
          <LinearGradient colors={[rarityColor, rarityColor + 'BB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={modalStyles.header}>
            <View style={modalStyles.headerRow}>
              <View style={modalStyles.rarityPill}>
                <Text style={modalStyles.rarityText}>{catEmoji(item.category ?? '')} {RARITY_LABELS[item.rarity] ?? item.rarity}</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={modalStyles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={20} color={Colors.white} />
              </TouchableOpacity>
            </View>
            <Text style={modalStyles.title}>{displayName}</Text>
            {item.category && <Text style={modalStyles.categoryLabel}>Kategorya: {item.category}</Text>}
          </LinearGradient>

          <View style={modalStyles.body}>
            <View style={modalStyles.imageFrame}>
              {(() => {
                const imgSource = getCollectibleImageSource(item);
                return imgSource ? (
                  <Image source={imgSource} style={modalStyles.image} resizeMode="contain" />
                ) : (
                  <Ionicons name="trophy" size={72} color={Colors.sunYellowDark} />
                );
              })()}
            </View>

            <Text style={modalStyles.description}>{getCollectibleDescription(item)}</Text>

            {item.unlocked_at && (
              <View style={modalStyles.dateRow}>
                <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
                <Text style={modalStyles.dateText}>
                  Nakolekta: {new Date(item.unlocked_at).toLocaleDateString('fil-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
              </View>
            )}

            <TouchableOpacity style={[modalStyles.audioBtn, playing && modalStyles.audioBtnActive]} onPress={handlePlayAudio} activeOpacity={0.8}>
              <Ionicons name={playing ? 'volume-high' : 'volume-medium-outline'} size={22} color={playing ? Colors.white : Colors.skyBlueDark} />
              <Text style={[modalStyles.audioBtnText, playing && { color: Colors.white }]}>
                {playing ? 'Pinakikinggan...' : 'Pakinggan ang Paglalarawan 🔊'}
              </Text>
            </TouchableOpacity>

            <PrimaryButton title="Isara" variant="outline" size="md" onPress={handleClose} style={{ width: '100%', marginTop: 10 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Unlocked Card ─────────────────────────────────────────────────────────────
function UnlockedCard({ item, onPress }: { item: Collectible; onPress: () => void }) {
  const rarityColor = RARITY_COLORS[item.rarity] ?? Colors.skyBlueDark;
  const imageSource = getCollectibleImageSource(item);

  return (
    <PressableScale onPress={onPress} style={[styles.card, Shadows.card]}>
      <View style={[styles.cardImageBox, { backgroundColor: rarityColor + '18' }]}>
        {imageSource ? (
          <Image source={imageSource} style={styles.cardImage} resizeMode="contain" />
        ) : (
          <Ionicons name="ribbon" size={44} color={rarityColor} />
        )}
        <View style={styles.unlockedBadge}><Ionicons name="checkmark-circle" size={18} color="#22C55E" /></View>
      </View>
      {item.category && <Text style={styles.cardCategory} numberOfLines={1}>{catEmoji(item.category)} {item.category}</Text>}
      <Text style={styles.cardName} numberOfLines={1}>{item.filipino_name || item.name}</Text>
      <View style={[styles.rarityPill, { backgroundColor: rarityColor }]}>
        <Text style={styles.rarityPillText}>{RARITY_LABELS[item.rarity]}</Text>
      </View>
      <Text style={styles.cardDesc} numberOfLines={2}>{getCollectibleDescription(item)}</Text>
    </PressableScale>
  );
}

// ── Locked Card ───────────────────────────────────────────────────────────────
function LockedCard({ item }: { item: Collectible }) {
  return (
    <View style={[styles.card, styles.lockedCard, Shadows.subtle]}>
      <View style={styles.lockedImageBox}><Ionicons name="lock-closed" size={36} color="#94A3B8" /></View>
      {item.category && <Text style={styles.lockedCategory} numberOfLines={1}>{catEmoji(item.category)} {item.category}</Text>}
      <Text style={styles.lockedName}>???</Text>
      <View style={[styles.rarityPill, { backgroundColor: '#CBD5E1' }]}>
        <Text style={styles.rarityPillText}>{RARITY_LABELS[item.rarity]}</Text>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function NakolektaScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [starsBalance, setStarsBalance] = useState(user?.stars_balance ?? 0);
  const [selectedCategory, setSelectedCategory] = useState<string>('Lahat');
  const [selectedCard, setSelectedCard] = useState<Collectible | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  usePresence('Sa Nakolekta (Koleksyon)', 'nakolekta');

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setError(null);
    try {
      const res = await collectibleService.getAll();
      setCollectibles(res.collectibles ?? []);
      setStarsBalance(res.stars_balance ?? 0);
    } catch (err: any) {
      if (!silent) setError(err?.message ?? 'Nabigong kunin ang mga kolektible.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // When a card is opened in nakolekta, minimize @happy.mp3 sound
  useEffect(() => {
    if (selectedCard) {
      bgm.minimize();
    } else {
      bgm.restore();
    }
    return () => {
      bgm.restore();
    };
  }, [selectedCard]);

  // Refresh when tab gains focus (after returning from minigame)
  useFocusEffect(useCallback(() => {
    if (!loading) loadData(true);
  }, [loading, loadData]));

  const handleRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

  // Derived
  const categoryProgress = collectibleService.getCategoryProgress(collectibles);
  const presentCats = Object.keys(categoryProgress);
  const categoriesList = [
    'Lahat',
    ...ORDERED_CATEGORIES.filter((c) => c !== 'Lahat' && presentCats.includes(c)),
    ...presentCats.filter((c) => !ORDERED_CATEGORIES.includes(c)).sort(),
  ];

  const filtered = selectedCategory === 'Lahat'
    ? collectibles
    : collectibles.filter((c) => (c.category ?? 'Iba Pa') === selectedCategory);

  const unlocked = [...filtered.filter((c) => c.is_unlocked)]
    .sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity));
  const locked = filtered.filter((c) => !c.is_unlocked);

  const totalUnlocked = collectibles.filter((c) => c.is_unlocked).length;
  const totalAvailable = collectibles.length;
  const catUnlocked = selectedCategory === 'Lahat' ? totalUnlocked : (categoryProgress[selectedCategory]?.unlocked ?? 0);
  const catTotal = selectedCategory === 'Lahat' ? totalAvailable : (categoryProgress[selectedCategory]?.total ?? 0);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.skeletonHeader, { paddingTop: Math.max(insets.top, 16) + 12 }]}>
          <View style={styles.skeletonTitle} />
          <View style={styles.skeletonBadge} />
        </View>
        <View style={[styles.grid, { paddingHorizontal: 16 }]}>
          {[1, 2, 3, 4].map((k) => <ShimmerCard key={k} />)}
        </View>
      </View>
    );
  }

  if (error) {
    return <ErrorView message={error} onRetry={() => { setLoading(true); loadData(); }} />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 16) + 12 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.skyBlue} colors={[Colors.skyBlue]} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <LinearGradient colors={['#F59E0B', '#EF4444']} style={styles.headerIconCircle} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name="trophy" size={22} color={Colors.white} />
            </LinearGradient>
            <View>
              <Text style={styles.headerTitle}>Nakolekta</Text>
              <Text style={styles.headerSub}>{totalUnlocked} ng {totalAvailable} kolektible</Text>
            </View>
          </View>
          <View style={[styles.starsBadge, Shadows.subtle]}>
            <Ionicons name="star" size={16} color="#F59E0B" />
            <Text style={styles.starsCount}>{starsBalance}</Text>
          </View>
        </View>

        {/* Overall progress */}
        <View style={[styles.progressCard, Shadows.card]}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>📚 Kabuuang Koleksyon</Text>
            <Text style={styles.progressPercent}>
              {totalAvailable > 0 ? Math.round((totalUnlocked / totalAvailable) * 100) : 0}%
            </Text>
          </View>
          <ProgressIndicator current={totalUnlocked} total={totalAvailable || 1} gradient={Gradients.sun} height={12} />
          <Text style={styles.progressSubLabel}>{totalUnlocked} / {totalAvailable}</Text>
        </View>

        {/* Category filter pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
          {categoriesList.map((cat) => {
            const isSelected = selectedCategory === cat;
            const prog = cat === 'Lahat' ? null : categoryProgress[cat];
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setSelectedCategory(cat); }}
                style={[styles.pill, isSelected && styles.pillActive, Shadows.subtle]}
                activeOpacity={0.8}
              >
                <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>{catEmoji(cat)} {cat}</Text>
                {prog && <Text style={[styles.pillCount, isSelected && styles.pillCountActive]}>{prog.unlocked}/{prog.total}</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Category progress bar */}
        {selectedCategory !== 'Lahat' && catTotal > 0 && (
          <View style={[styles.catProgressCard, Shadows.soft]}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressTitle}>{catEmoji(selectedCategory)} {selectedCategory}</Text>
              <Text style={styles.progressPercent}>{Math.round((catUnlocked / catTotal) * 100)}%</Text>
            </View>
            <ProgressIndicator current={catUnlocked} total={catTotal} gradient={Gradients.sky} height={8} />
          </View>
        )}

        {/* Unlocked section */}
        {unlocked.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🌟 Na-unlock Na ({unlocked.length})</Text>
            <View style={styles.grid}>
              {unlocked.map((item) => (
                <UnlockedCard key={item.id} item={item} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); setSelectedCard(item); }} />
              ))}
            </View>
          </View>
        ) : (
          <EmptyState
            emoji="🎁"
            title="Wala Pa sa Kategoryang Ito"
            message={selectedCategory === 'Lahat'
              ? 'Maglaro ng mini-game at kumuha ng 15–20 puntos para mag-unlock ng kard!'
              : `Wala ka pang nakokolekta sa "${selectedCategory}". Subukan ang mini-game!`}
          />
        )}

        {/* Locked section */}
        {locked.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: Colors.textLight }]}>🔒 Naka-lock Pa ({locked.length})</Text>
            <View style={styles.grid}>
              {locked.map((item) => <LockedCard key={item.id} item={item} />)}
            </View>
          </View>
        )}

        {/* Hint */}
        <View style={styles.hintBox}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.textMuted} />
          <Text style={styles.hintText}>Kumita ng 15–20 puntos sa mini-game para mag-unlock ng collectible!</Text>
        </View>
      </ScrollView>

      {selectedCard && <CollectibleDetailModal item={selectedCard} onClose={() => setSelectedCard(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F9FF' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 48 },
  skeletonHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16 },
  skeletonTitle: { width: 160, height: 28, borderRadius: 8, backgroundColor: '#CBD5E1' },
  skeletonBadge: { width: 60, height: 28, borderRadius: 20, backgroundColor: '#CBD5E1' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: Typography.sizes.lg, fontFamily: Typography.family.display, fontWeight: Typography.weights.bold, color: Colors.text },
  headerSub: { fontSize: Typography.sizes.xs, color: Colors.textLight },
  starsBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.pill, borderWidth: 1, borderColor: 'rgba(251,191,36,0.4)', gap: 4 },
  starsCount: { fontSize: Typography.sizes.sm, fontFamily: Typography.family.display, fontWeight: Typography.weights.bold, color: '#92400E' },
  progressCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  catProgressCard: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressTitle: { fontSize: Typography.sizes.sm, fontFamily: Typography.family.display, fontWeight: Typography.weights.bold, color: Colors.text },
  progressPercent: { fontSize: Typography.sizes.sm, fontFamily: Typography.family.display, fontWeight: Typography.weights.bold, color: '#F59E0B' },
  progressSubLabel: { fontSize: Typography.sizes.xs, color: Colors.textMuted, textAlign: 'right', marginTop: 6 },
  pillRow: { gap: 8, paddingBottom: 14, paddingRight: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: Colors.white, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  pillActive: { backgroundColor: Colors.skyBlue, borderColor: Colors.skyBlue },
  pillText: { fontSize: Typography.sizes.xs, fontFamily: Typography.family.display, fontWeight: Typography.weights.bold, color: Colors.textLight },
  pillTextActive: { color: Colors.white },
  pillCount: { fontSize: 10, fontWeight: Typography.weights.bold, color: Colors.textMuted },
  pillCountActive: { color: 'rgba(255,255,255,0.85)' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: Typography.sizes.md, fontFamily: Typography.family.display, fontWeight: Typography.weights.bold, color: Colors.text, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: CARD_WIDTH, backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 10, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)', alignItems: 'center' },
  cardImageBox: { width: '100%', height: 100, borderRadius: Radius.lg, justifyContent: 'center', alignItems: 'center', marginBottom: 8, overflow: 'hidden', position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  unlockedBadge: { position: 'absolute', top: 5, right: 5, backgroundColor: Colors.white, borderRadius: 12, padding: 1 },
  cardCategory: { fontSize: 10, color: Colors.textLight, fontWeight: Typography.weights.semibold, marginBottom: 2 },
  cardName: { fontSize: Typography.sizes.sm, fontFamily: Typography.family.display, fontWeight: Typography.weights.bold, color: Colors.text, textAlign: 'center', marginBottom: 4 },
  rarityPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.pill, marginBottom: 6 },
  rarityPillText: { fontSize: 9, fontWeight: Typography.weights.heavy, color: Colors.white, textTransform: 'uppercase' },
  cardDesc: { fontSize: 10, color: Colors.textLight, textAlign: 'center', lineHeight: 14 },
  lockedCard: { backgroundColor: '#F8FAFC', borderColor: 'rgba(0,0,0,0.04)' },
  lockedImageBox: { width: '100%', height: 100, borderRadius: Radius.lg, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  lockedCategory: { fontSize: 10, color: Colors.textMuted, fontWeight: Typography.weights.medium, marginBottom: 2 },
  lockedName: { fontSize: Typography.sizes.sm, fontFamily: Typography.family.display, fontWeight: Typography.weights.bold, color: Colors.textMuted, marginBottom: 6 },
  hintBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#F1F5F9', borderRadius: Radius.xl, padding: 12, marginTop: 8 },
  hintText: { flex: 1, fontSize: Typography.sizes.xs, color: Colors.textMuted, lineHeight: 18 },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', backgroundColor: Colors.white, borderRadius: Radius.xxl, overflow: 'hidden', maxWidth: 380 },
  header: { padding: 18, alignItems: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: 10 },
  rarityPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.pill, backgroundColor: 'rgba(0,0,0,0.25)' },
  rarityText: { fontSize: 10, color: Colors.white, fontWeight: Typography.weights.heavy, textTransform: 'uppercase' },
  closeBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: Typography.sizes.xl, fontFamily: Typography.family.display, fontWeight: Typography.weights.bold, color: Colors.white, textAlign: 'center' },
  categoryLabel: { fontSize: Typography.sizes.xs, color: 'rgba(255,255,255,0.85)', marginTop: 3 },
  body: { padding: 20, alignItems: 'center' },
  imageFrame: { width: 140, height: 140, borderRadius: Radius.xl, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)' },
  image: { width: '100%', height: '100%' },
  description: { fontSize: Typography.sizes.sm, color: Colors.text, textAlign: 'center', lineHeight: 20, marginBottom: 12 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 14 },
  dateText: { fontSize: Typography.sizes.xs, color: Colors.textMuted },
  audioBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E0F2FE', paddingHorizontal: 18, paddingVertical: 11, borderRadius: Radius.pill, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(56,189,248,0.4)', width: '100%', justifyContent: 'center' },
  audioBtnActive: { backgroundColor: Colors.skyBlue, borderColor: Colors.skyBlue },
  audioBtnText: { fontSize: Typography.sizes.xs, fontFamily: Typography.family.display, fontWeight: Typography.weights.bold, color: Colors.skyBlueDark },
});
