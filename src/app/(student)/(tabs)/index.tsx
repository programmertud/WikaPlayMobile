import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CategoryCard } from '../../../components/CategoryCard';
import { LoadingView } from '../../../components/LoadingView';
import { useAuth } from '../../../hooks/use-auth';
import { usePresence } from '../../../hooks/use-presence';
import { Colors, Shadows, Typography } from '../../../theme';
import { LEARNING_CATEGORIES } from '../../../data/categories';
import { Category } from '../../../types';
import { bgm } from '../../../services/audio/bgm-service';

export default function StudentDashboardScreen() {
  const { user, refreshProfile } = useAuth();
  const [isMuted, setIsMuted] = useState<boolean>(bgm.getMuted());

  // Always use local categories — they contain all 151 vocabulary items
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

  usePresence('Nasa Bahay (Dashboard)', 'student_home');

  const loadData = async () => {
    try {
      // Only refresh the user profile (stars, etc.) — never overwrite category data
      await refreshProfile().catch(() => null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // When returning to home screen, ensure background music is restored to full volume
    bgm.restore();
    loadData();

    const unsubscribeMute = bgm.subscribeMute((muted) => {
      setIsMuted(muted);
    });

    return () => {
      unsubscribeMute();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading && !refreshing) {
    return <LoadingView message="Kinukuha ang mga aralin sa WikaPlay..." />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.skyBlueDark]} />
      }
    >
      {/* Top Bar with Logo, Music Button and Stars Pill */}
      <View style={styles.topBar}>
        <View style={styles.brandingRow}>
          <View style={[styles.miniLogo, Shadows.soft]}>
            <Text style={styles.miniLogoEmoji}>☀️📖</Text>
          </View>
          <View>
            <Text style={styles.appTitle}>WikaPlay</Text>
            <Text style={styles.greetingText}>
              Kamusta, {user?.name ? user.name.split(' ')[0] : 'Kaibigan'}! 👋
            </Text>
          </View>
        </View>

        <View style={styles.topBarActions}>
          {/* Background Music Toggle */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => bgm.toggleMute()}
            style={[styles.musicButton, Shadows.button, isMuted && styles.musicButtonMuted]}
            accessibilityLabel={isMuted ? 'I-on ang tugtog' : 'I-off ang tugtog'}
          >
            <Text style={styles.musicIcon}>{isMuted ? '🔇' : '🎵'}</Text>
          </TouchableOpacity>

          {/* Live Stars Badge */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push('/gantimpala')}
            style={[styles.starsPill, Shadows.button]}
          >
            <Text style={styles.starIcon}>⭐</Text>
            <Text style={styles.starsCount}>{user?.stars_balance ?? 0}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Mga Kategorya ng Aralin 📚</Text>
        <Text style={styles.sectionSubtitle}>Pumili ng aralin upang mag-aral at mag-quiz</Text>
      </View>

      {/* 2-Column Responsive Categories Grid */}
      <View style={styles.grid}>
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
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
    padding: 16,
    paddingTop: 52,
    paddingBottom: 32,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.skyBlue,
    marginRight: 12,
  },
  miniLogoEmoji: {
    fontSize: 22,
  },
  appTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.heavy,
    color: '#0369A1',
    letterSpacing: 0.5,
  },
  greetingText: {
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    fontWeight: Typography.weights.bold,
  },
  starsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.sunYellowDark,
  },
  topBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  musicButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.skyBlue,
  },
  musicButtonMuted: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
  },
  musicIcon: {
    fontSize: 18,
  },
  starIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  starsCount: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.heavy,
    color: '#92400E',
  },
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#8B5CF6',
    borderRadius: 26,
    borderWidth: 4,
    borderColor: Colors.white,
    padding: 18,
    marginBottom: 24,
  },
  heroTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  heroTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 6,
  },
  heroTagText: {
    color: Colors.white,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.heavy,
  },
  heroTitle: {
    color: Colors.white,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.heavy,
    marginBottom: 4,
  },
  heroSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: Typography.sizes.xs,
    lineHeight: 16,
  },
  heroEmoji: {
    fontSize: 44,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.heavy,
    color: Colors.text,
  },
  sectionSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
