import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CategoryCard } from '../../components/CategoryCard';
import { ErrorView } from '../../components/ErrorView';
import { LoadingView } from '../../components/LoadingView';
import { useAuth } from '../../hooks/use-auth';
import { usePresence } from '../../hooks/use-presence';
import { categoryService } from '../../services/api';
import { Colors, Shadows, Typography } from '../../theme';
import { Category } from '../../types';

export default function StudentDashboardScreen() {
  const { user, refreshProfile } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  usePresence('Nasa Bahay (Dashboard)', 'student_home');

  const loadData = async () => {
    try {
      setError(null);
      const [cats] = await Promise.all([
        categoryService.getAll(),
        refreshProfile(),
      ]);
      setCategories(cats);
    } catch (err: any) {
      setError(err.message || 'Nabigong kunin ang mga kategorya.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading && !refreshing) {
    return <LoadingView message="Kinukuha ang mga aralin sa WikaPlay..." />;
  }

  if (error && categories.length === 0) {
    return <ErrorView message={error} onRetry={loadData} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.skyBlueDark]} />
      }
    >
      {/* Top Bar with Logo and Stars Pill */}
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

        {/* Live Stars Badge */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push('/(student)/gantimpala')}
          style={[styles.starsPill, Shadows.button]}
        >
          <Text style={styles.starIcon}>⭐</Text>
          <Text style={styles.starsCount}>{user?.stars_balance ?? 0}</Text>
        </TouchableOpacity>
      </View>

      {/* Mini-Games Hero Banner */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push('/(student)/minigames')}
        style={[styles.heroBanner, Shadows.card]}
      >
        <View style={styles.heroTextContainer}>
          <View style={styles.heroTag}>
            <Text style={styles.heroTagText}>🎉 MASAYANG LARO</Text>
          </View>
          <Text style={styles.heroTitle}>Maglaro at Matuto!</Text>
          <Text style={styles.heroSubtitle}>
            Memory Match, Pop Balloon, at marami pang iba!
          </Text>
        </View>
        <Text style={styles.heroEmoji}>🎮🎈</Text>
      </TouchableOpacity>

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
