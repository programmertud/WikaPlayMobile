import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from '@/utils/haptics';

import { PressableScale } from '../../../components/PressableScale';
import { AnimatedBackground } from '../../../components/AnimatedBackground';
import { usePresence } from '../../../hooks/use-presence';
import { bgm } from '../../../services/audio/bgm-service';
import { Colors, Shadows, Typography, Radius } from '../../../theme';
import { LEARNING_CATEGORIES } from '../../../data/categories';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 44) / 2;

// Distinct cover image for each mini-game
const GAME_COVERS: Record<string, any> = {
  memory_match: require('../../../../assets/images/minigames/cover-memory-match.jpg'),
  paghahanap_larawan: require('../../../../assets/images/minigames/cover-paghahanap-larawan.jpg'),
  hulaan_salita: require('../../../../assets/images/minigames/cover-hulaan-salita.jpg'),
  gulong_letra: require('../../../../assets/images/minigames/cover-gulong-letra.jpg'),
  pop_balloon: require('../../../../assets/images/minigames/cover-pop-balloon.jpg'),
};

interface GameInfo {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  themeColor: string;
  gradientColors: [string, string];
  icon: string;
  tag: string;
}

const MINI_GAMES: GameInfo[] = [
  {
    id: 'memory_match',
    slug: 'memory-match',
    title: 'Memory Match',
    subtitle: '20 Antas',
    description: 'Hanapin ang magkaparehong larawan at palakasin ang memorya!',
    themeColor: '#7C3AED',
    gradientColors: ['#8B5CF6', '#6D28D9'],
    icon: '🧠',
    tag: 'Memorya',
  },
  {
    id: 'paghahanap_larawan',
    slug: 'paghahanap-larawan',
    title: 'Paghahanap ng Larawan',
    subtitle: '20 Tanong',
    description: 'Makinig sa panuto at hanapin ang tamang larawan!',
    themeColor: '#0284C7',
    gradientColors: ['#0EA5E9', '#0369A1'],
    icon: '🔍',
    tag: 'Pakikinig',
  },
  {
    id: 'hulaan_salita',
    slug: 'hulaan-salita',
    title: 'Hulaan ang Salita',
    subtitle: '20 Salita',
    description: 'Tingnan ang larawan at ayusin ang mga letra!',
    themeColor: '#059669',
    gradientColors: ['#10B981', '#047857'],
    icon: '💡',
    tag: 'Salita',
  },
  {
    id: 'gulong_letra',
    slug: 'gulong-letra',
    title: 'Gulong ng mga Letra',
    subtitle: '20 Salita',
    description: 'Gamitin ang umiikot na gulong upang buuin ang salita!',
    themeColor: '#D97706',
    gradientColors: ['#F59E0B', '#B45309'],
    icon: '🎡',
    tag: 'Gulong',
  },
  {
    id: 'pop_balloon',
    slug: 'pop-balloon',
    title: 'Pop Balloon',
    subtitle: '20 Lobo',
    description: 'Pumutok ng tamang lumulutang na lobo ayon sa panuto!',
    themeColor: '#DC2626',
    gradientColors: ['#EF4444', '#B91C1C'],
    icon: '🎈',
    tag: 'Bilis',
  },
];

export default function MiniGamesScreen() {
  const insets = useSafeAreaInsets();
  const [selectedCategory, setSelectedCategory] = useState<string>(
    LEARNING_CATEGORIES[0]?.slug ?? 'mga-hayop'
  );

  usePresence('Pinipili ng Laro (Mini-Games)', 'minigame_select');

  // Minimize @happy.mp3 sound when opening mini-games tab
  useFocusEffect(
    useCallback(() => {
      bgm.minimize();
      return () => {
        bgm.restore();
      };
    }, [])
  );

  const handleSelectGame = (game: GameInfo) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push(`/(student)/games/${game.slug}?category=${selectedCategory}` as any);
  };

  return (
    <AnimatedBackground>
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: Math.max(insets.top, 16) + 8 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIconCircle, Shadows.soft]}>
          <Ionicons name="game-controller" size={26} color={Colors.vibrantPurple} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Mga Mini-Games</Text>
          <Text style={styles.headerSub}>Maglaro at matuto ng Filipino! 🌟</Text>
        </View>
      </View>

      {/* Rewards Info Banner */}
      <View style={[styles.statsBar, Shadows.soft]}>
        <View style={styles.statItem}>
          <Ionicons name="trophy" size={18} color={Colors.sunYellowDark} />
          <Text style={styles.statLabel}>5 Laruan</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="star" size={18} color={Colors.grassGreenDark} />
          <Text style={styles.statLabel}>+Bituin Bawat Laro</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="gift" size={18} color={Colors.coralPink} />
          <Text style={styles.statLabel}>Kolektabol (15+)</Text>
        </View>
      </View>

      {/* Category Selection Filter */}
      <View style={styles.categorySection}>
        <View style={styles.categorySectionHeader}>
          <Ionicons name="albums-outline" size={16} color={Colors.textLight} />
          <Text style={styles.categorySectionTitle}>Pumili ng Paksa / Kategorya:</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryChips}
        >
          {LEARNING_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.slug;
            return (
              <TouchableOpacity
                key={cat.slug}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setSelectedCategory(cat.slug);
                }}
                style={[
                  styles.categoryChip,
                  isSelected && {
                    backgroundColor: cat.color || Colors.skyBlueDark,
                    borderColor: cat.color || Colors.skyBlueDark,
                  },
                ]}
              >
                <Text style={styles.categoryChipIcon}>{cat.icon}</Text>
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected && styles.categoryChipTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Mini-Games Grid (matching WikaPlay learning-category visual style) */}
      <View style={styles.grid}>
        {MINI_GAMES.map((game, index) => {
          const isFullWidth = index === MINI_GAMES.length - 1 && MINI_GAMES.length % 2 !== 0;
          return (
            <GameCard
              key={game.id}
              game={game}
              isFullWidth={isFullWidth}
              onPress={() => handleSelectGame(game)}
            />
          );
        })}
      </View>
    </ScrollView>
    </AnimatedBackground>
  );
}

function GameCard({
  game,
  isFullWidth,
  onPress,
}: {
  game: GameInfo;
  isFullWidth: boolean;
  onPress: () => void;
}) {
  const coverSource = GAME_COVERS[game.id];

  return (
    <View style={[styles.cardWrapper, isFullWidth && styles.fullWidthWrapper]}>
      <PressableScale
        onPress={onPress}
        activeScale={0.97}
        style={[styles.card, Shadows.card]}
        accessibilityRole="button"
        accessibilityLabel={`Laruin ang ${game.title}`}
      >
        {/* Card Header with Individual Cover Image */}
        <View style={[styles.coverContainer, isFullWidth && styles.fullWidthCover]}>
          {coverSource ? (
            <Image
              source={coverSource}
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={game.gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}

          {/* Dark gradient shadow overlay on bottom of cover */}
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)']}
            style={styles.coverGradientOverlay}
          />

          {/* Category / Type Tag Badge */}
          <View style={styles.tagBadge}>
            <Text style={styles.tagText}>{game.tag}</Text>
          </View>

          {/* Subtitle pill */}
          <View style={styles.subtitleBadge}>
            <Text style={styles.subtitleBadgeText}>{game.subtitle}</Text>
          </View>
        </View>

        {/* Card Body — Clean, legible, accessible child-friendly UI */}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={isFullWidth ? 1 : 2}>
            {game.title}
          </Text>
          <Text style={styles.cardDescription} numberOfLines={2}>
            {game.description}
          </Text>

          <View style={[styles.playButton, { backgroundColor: game.themeColor }]}>
            <Text style={styles.playButtonText}>Maglaro</Text>
            <Ionicons name="play-circle" size={16} color={Colors.white} />
          </View>
        </View>
      </PressableScale>
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
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  headerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  headerSub: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: 1,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: Typography.weights.semibold,
    color: Colors.textLight,
  },
  statDivider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  categorySection: {
    marginBottom: 16,
  },
  categorySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  categorySectionTitle: {
    fontSize: 12,
    fontWeight: Typography.weights.semibold,
    color: Colors.textLight,
  },
  categoryChips: {
    gap: 8,
    paddingRight: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  categoryChipIcon: {
    fontSize: 14,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  categoryChipTextActive: {
    color: Colors.white,
    fontWeight: Typography.weights.bold,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    marginBottom: 14,
  },
  fullWidthWrapper: {
    width: '100%',
  },
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    overflow: 'hidden',
    backgroundColor: Colors.white,
  },
  coverContainer: {
    width: '100%',
    height: 115,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  fullWidthCover: {
    height: 140,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverGradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 48,
  },
  tagBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 9,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  subtitleBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: Radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  subtitleBadgeText: {
    fontSize: 10,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  cardBody: {
    padding: 12,
    justifyContent: 'space-between',
    minHeight: 125,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 3,
    lineHeight: 19,
  },
  cardDescription: {
    fontSize: 11,
    color: Colors.textLight,
    lineHeight: 15,
    marginBottom: 10,
    flex: 1,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  playButtonText: {
    fontSize: 12,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
});
