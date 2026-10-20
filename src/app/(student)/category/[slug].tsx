import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ErrorView } from '../../../components/ErrorView';
import { LoadingView } from '../../../components/LoadingView';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { usePresence } from '../../../hooks/use-presence';
import { categoryService } from '../../../services/api';
import { Colors, Shadows, Typography } from '../../../theme';
import { Category, QuizDifficulty } from '../../../types';

export default function CategoryDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  usePresence(`Tinitingnan ang ${category?.name || 'Aralin'}`, 'category_detail');

  const loadCategory = async () => {
    if (!slug) return;
    try {
      setLoading(true);
      setError(null);
      const data = await categoryService.getBySlug(slug);
      setCategory(data);
    } catch (err: any) {
      setError(err.message || 'Nabigong kunin ang detalye ng kategorya.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategory();
  }, [slug]);

  if (loading) {
    return <LoadingView message="Kinukuha ang aralin..." />;
  }

  if (error || !category) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenHeader title="Aralin" />
        <ErrorView message={error || 'Hindi natagpuan ang aralin.'} onRetry={loadCategory} />
      </View>
    );
  }

  const difficulties: {
    key: QuizDifficulty;
    title: string;
    subtitle: string;
    color: string;
    stars: string;
  }[] = [
    {
      key: 'madali',
      title: 'Madali (Easy)',
      subtitle: 'Piliin ang wastong salita ayon sa larawan',
      color: Colors.grassGreen,
      stars: '+5 ⭐',
    },
    {
      key: 'katamtaman',
      title: 'Katamtaman (Medium)',
      subtitle: 'Makinig sa audio at piliin ang tamang larawan',
      color: Colors.sunYellowDark,
      stars: '+10 ⭐',
    },
    {
      key: 'mahirap',
      title: 'Mahirap (Hard)',
      subtitle: 'Subukin ang talas ng iyong memorya at baybay',
      color: Colors.coralPink,
      stars: '+15 ⭐',
    },
  ];

  const handleStartQuiz = (diff: QuizDifficulty) => {
    const isLocked = category.quiz_availabilities?.[diff]?.is_locked;
    if (isLocked) {
      Alert.alert(
        'Naka-lock ang Pagsusulit',
        'Naka-lock pa ang antas na ito. Maghintay sa tagubilin ng iyong guro.'
      );
      return;
    }

    router.push(`/(student)/quiz/${category.slug}/${diff}` as any);
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={category.name}
        bgColor={category.color || Colors.skyBlue}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Category Hero Card */}
        <View style={[styles.heroCard, Shadows.card]}>
          {category.cover_image && (
            <Image
              source={{ uri: category.cover_image }}
              style={styles.heroImage}
              contentFit="cover"
            />
          )}
          <View style={styles.heroBody}>
            <Text style={styles.heroTitle}>{category.title}</Text>
            {category.description ? (
              <Text style={styles.heroDesc}>{category.description}</Text>
            ) : null}

            {/* Flashcards Entry Button */}
            <PrimaryButton
              title={`Basahin ang Flashcards (${category.flashcards?.length || 0}) 🗂️`}
              variant="primary"
              size="md"
              onPress={() => router.push(`/(student)/flashcards/${category.slug}` as any)}
              style={styles.flashcardsBtn}
            />
          </View>
        </View>

        {/* Quizzes Header */}
        <View style={styles.quizHeader}>
          <Text style={styles.quizTitle}>Pagsusulit (Quizzes) 🎯</Text>
          <Text style={styles.quizSubtitle}>Pumili ng antas ng kahirapan upang mag-quiz</Text>
        </View>

        {/* Difficulties List */}
        {difficulties.map((d) => {
          const isLocked = category.quiz_availabilities?.[d.key]?.is_locked;

          return (
            <TouchableOpacity
              key={d.key}
              activeOpacity={0.88}
              onPress={() => handleStartQuiz(d.key)}
              style={[
                styles.difficultyCard,
                { borderLeftColor: d.color },
                isLocked && styles.difficultyCardLocked,
                Shadows.card,
              ]}
            >
              <View style={styles.difficultyLeft}>
                <View style={[styles.diffBadge, { backgroundColor: isLocked ? '#94A3B8' : d.color }]}>
                  <Text style={styles.diffBadgeText}>
                    {isLocked ? '🔒' : d.stars}
                  </Text>
                </View>
                <View style={styles.diffTextContainer}>
                  <Text style={[styles.diffTitle, isLocked && styles.textLocked]}>
                    {d.title}
                  </Text>
                  <Text style={styles.diffSubtitle} numberOfLines={2}>
                    {d.subtitle}
                  </Text>
                </View>
              </View>

              <Text style={styles.arrowIcon}>{isLocked ? '🔒' : '➡️'}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  },
  content: {
    padding: 16,
    paddingBottom: 36,
  },
  heroCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    borderWidth: 4,
    borderColor: Colors.white,
    overflow: 'hidden',
    marginBottom: 24,
  },
  heroImage: {
    width: '100%',
    height: 180,
  },
  heroBody: {
    padding: 18,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.heavy,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  heroDesc: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  flashcardsBtn: {
    width: '100%',
    backgroundColor: Colors.skyBlue,
  },
  quizHeader: {
    marginBottom: 14,
  },
  quizTitle: {
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.heavy,
    color: Colors.text,
  },
  quizSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  difficultyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: Colors.white,
    borderLeftWidth: 8,
    padding: 16,
    marginBottom: 14,
  },
  difficultyCardLocked: {
    backgroundColor: '#F1F5F9',
    borderLeftColor: '#94A3B8',
    opacity: 0.8,
  },
  difficultyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  diffBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 14,
    minWidth: 50,
    alignItems: 'center',
  },
  diffBadgeText: {
    color: Colors.white,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.heavy,
  },
  diffTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  diffTitle: {
    fontSize: Typography.sizes.md,
    fontWeight: Typography.weights.heavy,
    color: Colors.text,
  },
  textLocked: {
    color: '#64748B',
  },
  diffSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  arrowIcon: {
    fontSize: 20,
  },
});
