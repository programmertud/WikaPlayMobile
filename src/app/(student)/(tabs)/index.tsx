import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  RefreshControl,
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

import { CategoryCard } from '../../../components/CategoryCard';
import { LoadingView } from '../../../components/LoadingView';
import { PressableScale } from '../../../components/PressableScale';
import { useAuth } from '../../../hooks/use-auth';
import { usePresence } from '../../../hooks/use-presence';
import { Colors, Gradients, Shadows, Typography, Radius } from '../../../theme';
import { LEARNING_CATEGORIES } from '../../../data/categories';
import { Category } from '../../../types';
import { bgm } from '../../../services/audio/bgm-service';

export default function StudentDashboardScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [isMuted, setIsMuted] = useState<boolean>(bgm.getMuted());

  const categories: Category[] = LEARNING_CATEGORIES.map((c, idx) => ({
    id: idx + 1,
    slug: c.slug,
    name: c.name,
    title: c.name,
    description: c.description,
    color: c.color,
    cover_image: null,
    icon: c.icon,
    flashcards_count: c.items.length,
  }));

  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Pulse animation for stars pill
  const starScale = useSharedValue(1);

  usePresence('Nasa Bahay (Dashboard)', 'student_home');

  const loadData = async () => {
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    bgm.init();
    bgm.restore();
    loadData();

    const unsubscribeMute = bgm.subscribeMute((muted) => {
      setIsMuted(muted);
    });

    return () => {
      unsubscribeMute();
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleStarPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    starScale.value = withSequence(
      withTiming(1.22, { duration: 100 }),
      withSpring(1, { damping: 10, stiffness: 300 })
    );
    router.push('/gantimpala');
  };

  const starAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: starScale.value }],
  }));



  if (loading && !refreshing) {
    return <LoadingView message="Kinukuha ang mga aralin sa WikaPlay..." />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: Math.max(insets.top, 16) + 12 },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[Colors.skyBlueDark]}
        />
      }
    >
      {/* Top Bar with Logo, Music Button and Stars Pill */}
      <View style={styles.topBar}>
        <View style={styles.brandingRow}>
          <View style={[styles.miniLogo, Shadows.soft]}>
            <Ionicons name="sparkles" size={24} color={Colors.skyBlueDark} />
          </View>
          <View>
            <Text style={styles.appTitle}>WikaPlay</Text>
            <Text style={styles.greetingText}>
              Kumusta, {user?.name ? user.name.split(' ')[0] : 'Kaibigan'}! 👋
            </Text>
          </View>
        </View>

        <View style={styles.topBarActions}>
          {/* Background Music Toggle */}
          <PressableScale
            onPress={() => bgm.toggleMute()}
            style={[styles.musicButton, Shadows.subtle, isMuted && styles.musicButtonMuted]}
            accessibilityLabel={isMuted ? 'I-on ang tugtog' : 'I-off ang tugtog'}
          >
            <Ionicons
              name={isMuted ? 'volume-mute' : 'volume-high'}
              size={20}
              color={isMuted ? Colors.textMuted : Colors.skyBlueDark}
            />
          </PressableScale>

          {/* Live Stars Badge with Pulse animation */}
          <Animated.View style={starAnimatedStyle}>
            <PressableScale
              onPress={handleStarPress}
              style={[styles.starsPill, Shadows.subtle]}
            >
              <Ionicons name="star" size={18} color={Colors.sunYellowDark} style={styles.starIcon} />
              <Text style={styles.starsCount}>{user?.stars_balance ?? 0}</Text>
            </PressableScale>
          </Animated.View>
        </View>
      </View>

      {/* Hero Banner: Daily Goal & Motivation */}
      <PressableScale
        onPress={() => router.push(`/(student)/category/${categories[0]?.slug ?? 'mga-hayop'}` as any)}
        style={[styles.heroCard, Shadows.card]}
      >
        <LinearGradient
          colors={Gradients.purple}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroDecorCircle1} />
        <View style={styles.heroDecorCircle2} />

        <View style={styles.heroContent}>
          <View style={styles.heroBadge}>
            <Ionicons name="flame" size={14} color={Colors.sunYellow} />
            <Text style={styles.heroBadgeText}>Araw-araw na Hamon</Text>
          </View>
          <Text style={styles.heroTitle}>Matuto ng Bagong Salita!</Text>
          <Text style={styles.heroSubtitle}>
            Tuklasin ang mga salitang Filipino at makakuha ng karagdagang bituin.
          </Text>
          <View style={styles.heroCta}>
            <Text style={styles.heroCtaText}>Magsimula Na</Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.white} />
          </View>
        </View>
        <Text style={styles.heroEmoji}>🌟</Text>
      </PressableScale>



      {/* Categories Grid Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Lahat ng Aralin 📚</Text>
        <Text style={styles.sectionSubtitle}>Pumili ng kategorya upang mag-aral o mag-laro</Text>
      </View>

      {/* 2-Column Responsive Categories Grid */}
      <View style={styles.grid}>
        {categories.map((category, index) => (
          <CategoryCard
            key={category.id}
            index={index}
            category={category}
            onPress={() => router.push(`/(student)/category/${category.slug}` as any)}
          />
        ))}
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  brandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniLogo: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    marginRight: 10,
  },
  appTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.skyBlueDark,
    lineHeight: 22,
  },
  greetingText: {
    fontSize: Typography.sizes.xs,
    color: Colors.text,
    fontWeight: Typography.weights.bold,
  },
  starsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  musicButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  musicButtonMuted: {
    backgroundColor: '#F1F5F9',
  },
  starIcon: {
    marginRight: 4,
  },
  starsCount: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: '#92400E',
  },
  heroCard: {
    borderRadius: Radius.xxl,
    overflow: 'hidden',
    padding: 20,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  heroDecorCircle1: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    top: -40,
    right: 20,
  },
  heroDecorCircle2: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    bottom: -20,
    left: 40,
  },
  heroContent: {
    flex: 1,
    paddingRight: 10,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    marginBottom: 8,
    gap: 4,
  },
  heroBadgeText: {
    color: Colors.white,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  heroTitle: {
    color: Colors.white,
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    marginBottom: 4,
  },
  heroSubtitle: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: Typography.sizes.xs,
    lineHeight: 18,
    marginBottom: 12,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    gap: 6,
  },
  heroCtaText: {
    color: Colors.white,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
  },
  heroEmoji: {
    fontSize: 48,
    marginLeft: 8,
  },
  continueSection: {
    marginBottom: 24,
  },
  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  continueIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  continueEmoji: {
    fontSize: 24,
  },
  continueInfo: {
    flex: 1,
  },
  continueCatName: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  continueStats: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginBottom: 6,
  },
  continueProgressTrack: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  continueProgressBar: {
    height: '100%',
    borderRadius: 2,
  },
  playArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.skyBlueDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    ...Shadows.colored(Colors.skyBlueDark, 0.25),
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  sectionSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
