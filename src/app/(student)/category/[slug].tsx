import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { useEffect } from 'react';
import {
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { PressableScale } from '../../../components/PressableScale';
import { getCategoryBySlug } from '../../../data/categories';
import { usePresence } from '../../../hooks/use-presence';
import { AnimatedBackground } from '../../../components/AnimatedBackground';
import { stopCurrentSound } from '../../../services/audio/sound-service';
import { QuizDifficulty } from '../../../types';
import { categoryService } from '../../../services/api';
import { Colors, Gradients, Radius, Shadows, Typography } from '../../../constants/theme';

export default function CategoryDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const category = getCategoryBySlug(slug);

  const [quizModalVisible, setQuizModalVisible] = useState(false);
  const [gamesModalVisible, setGamesModalVisible] = useState(false);
  const [quizLocks, setQuizLocks] = useState<Record<string, boolean>>({});

  usePresence(`Tinitingnan ang ${category.name}`, 'category_detail');

  useEffect(() => {
    let mounted = true;
    categoryService.getAll().then((cats) => {
      const current = cats.find((item) => item.slug === slug) as any;
      const availabilities = current?.quiz_availabilities || current?.category?.quiz_availabilities;
      if (mounted && availabilities) {
        setQuizLocks(Object.fromEntries(Object.entries(availabilities).map(([key, item]: [string, any]) => [key, item.is_locked])));
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, [slug]);

  const blurActiveElement = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined' && document.activeElement) {
      (document.activeElement as HTMLElement).blur?.();
    }
  };

  const difficulties: {
    key: QuizDifficulty;
    title: string;
    english: string;
    stars: string;
    color: string;
    desc: string;
  }[] = [
    {
      key: 'madali',
      title: 'Madali',
      english: 'Easy',
      stars: '+5 ⭐',
      color: Colors.grassGreen,
      desc: 'Piliin ang wastong salita ayon sa larawan',
    },
    {
      key: 'katamtaman',
      title: 'Katamtaman',
      english: 'Medium',
      stars: '+10 ⭐',
      color: Colors.sunYellowDark,
      desc: 'Makinig sa audio at piliin ang larawan',
    },
    {
      key: 'mahirap',
      title: 'Mahirap',
      english: 'Hard',
      stars: '+15 ⭐',
      color: Colors.coralPink,
      desc: 'Subukin ang baybay at memorya',
    },
  ];

  const miniGames = [
    {
      slug: 'memory-match',
      title: 'Memory Match',
      emoji: '🧠',
      color: '#38BDF8',
      desc: `Itugma ang magkapares na ${category.name}`,
    },
    {
      slug: 'paghahanap-larawan',
      title: 'Paghahanap ng Larawan',
      emoji: '🔍',
      color: '#4ADE80',
      desc: `Hanapin ang tamang larawan ng ${category.name}`,
    },
    {
      slug: 'hulaan-salita',
      title: 'Hulaan ang Salita',
      emoji: '💡',
      color: '#FACC15',
      desc: `Hulaan ang tamang baybay ng salita`,
    },
    {
      slug: 'gulong-letra',
      title: 'Gulong ng mga Letra',
      emoji: '🎡',
      color: '#FB923C',
      desc: `Ayusin ang mga titik upang mabuo ang salita`,
    },
    {
      slug: 'pop-balloon',
      title: 'Pop Balloon',
      emoji: '🎈',
      color: '#EC4899',
      desc: `Pumutok ng lobo na may tamang sagot`,
    },
  ];

  useEffect(() => {
    return () => {
      stopCurrentSound();
    };
  }, []);

  const handleStartQuiz = (difficulty: QuizDifficulty) => {
    blurActiveElement();
    if (quizLocks[difficulty]) {
      setQuizModalVisible(false);
      router.push({ pathname: '/(student)/quiz-locked' as any, params: { category: category.name, difficulty } } as any);
      return;
    }
    setQuizModalVisible(false);
    if (difficulty === 'madali') {
      router.push(`/(student)/quiz/${category.slug}/madali` as any);
    } else {
      router.push(`/(student)/quiz/${category.slug}/${difficulty}` as any);
    }
  };

  const handleOpenGame = (gameSlug: string) => {
    blurActiveElement();
    setGamesModalVisible(false);
    router.push({
      pathname: '/(student)/games/[slug]' as any,
      params: { slug: gameSlug, category: category.slug },
    });
  };

  const handleOpenFlashcards = () => {
    blurActiveElement();
    router.push(`/(student)/flashcards/${category.slug}` as any);
  };

  return (
    <AnimatedBackground>
      <ScreenHeader
        title={category.name}
        bgColor={category.color}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Category Hero Banner with LinearGradient & Decorative Blobs */}
        <View style={[styles.heroCard, Shadows.card]}>
          <LinearGradient
            colors={[category.color || '#38BDF8', '#0284C7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroBlob1} />
          <View style={styles.heroBlob2} />

          {category.logoImage ? (
            <View style={styles.heroLogoWrapper}>
              <Image source={category.logoImage} style={styles.heroLogo} resizeMode="contain" />
            </View>
          ) : (
            <Text style={styles.heroEmoji}>{category.icon}</Text>
          )}
          <Text style={styles.heroTitle}>{category.name}</Text>
          <Text style={styles.heroSub}>{category.englishName} • {category.items.length} Salita</Text>
          {category.description ? (
            <Text style={styles.heroDesc}>{category.description}</Text>
          ) : null}
        </View>

        <Text style={styles.sectionHeader}>Pumili ng Gawain:</Text>

        {/* Option 1: Flashcards */}
        <PressableScale
          onPress={handleOpenFlashcards}
          style={[styles.primaryCard, Shadows.soft]}
        >
          <LinearGradient
            colors={Gradients.skyLight}
            style={styles.iconBox}
          >
            <Ionicons name="albums" size={24} color={Colors.skyBlueDark} />
          </LinearGradient>
          <View style={styles.cardTextBox}>
            <Text style={styles.cardTitle}>1. Mga Flashcard</Text>
            <Text style={styles.cardSubtitle}>
              Basahin at aralin ang {category.items.length} Filipino-English cards
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={Colors.textMuted} />
        </PressableScale>

        {/* Option 2: Quiz */}
        <PressableScale
          onPress={() => setQuizModalVisible(true)}
          style={[styles.primaryCard, Shadows.soft]}
        >
          <LinearGradient
            colors={Gradients.grassLight}
            style={styles.iconBox}
          >
            <Ionicons name="checkbox" size={24} color={Colors.grassGreenDark} />
          </LinearGradient>
          <View style={styles.cardTextBox}>
            <Text style={styles.cardTitle}>2. Pagsusulit (Quiz)</Text>
            <Text style={styles.cardSubtitle}>
              Madali, Katamtaman, at Mahirap na antas
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={Colors.textMuted} />
        </PressableScale>

        {/* Option 3: Mini Games */}
        <PressableScale
          onPress={() => setGamesModalVisible(true)}
          style={[styles.primaryCard, Shadows.soft]}
        >
          <LinearGradient
            colors={Gradients.sunLight}
            style={styles.iconBox}
          >
            <Ionicons name="game-controller" size={24} color={Colors.sunYellowDark} />
          </LinearGradient>
          <View style={styles.cardTextBox}>
            <Text style={styles.cardTitle}>3. Mga Mini-Game</Text>
            <Text style={styles.cardSubtitle}>
              5 larong pang-aral gamit ang {category.name}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={Colors.textMuted} />
        </PressableScale>
      </ScrollView>

      {/* QUIZ DIFFICULTY MODAL */}
      <Modal
        visible={quizModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQuizModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, Shadows.card]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Pumili ng Antas (Quiz)</Text>
              <Text style={styles.modalSub}>{category.name}</Text>
            </View>

            {difficulties.map((d) => (
              <PressableScale
                key={d.key}
                onPress={() => handleStartQuiz(d.key)}
                style={[styles.diffItem, { borderLeftColor: d.color }, quizLocks[d.key] && { opacity: 0.6 }]}
              >
                <View style={styles.diffItemTextContainer}>
                  <Text style={styles.diffItemTitle}>
                    {d.title} <Text style={styles.diffItemEnglish}>({d.english})</Text>
                  </Text>
                  <Text style={styles.diffItemDesc}>{quizLocks[d.key] ? 'Naka-lock ng guro' : d.desc}</Text>
                </View>
                <View style={[styles.diffBadge, { backgroundColor: quizLocks[d.key] ? '#94A3B8' : d.color }]}>
                  <Ionicons name={quizLocks[d.key] ? 'lock-closed' : 'play'} size={16} color={Colors.white} />
                </View>
              </PressableScale>
            ))}

            <TouchableOpacity
              onPress={() => setQuizModalVisible(false)}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>Isara</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MINI GAMES SELECTION MODAL */}
      <Modal
        visible={gamesModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGamesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, Shadows.card]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mga Mini-Game</Text>
              <Text style={styles.modalSub}>Lalaruin gamit ang: {category.name}</Text>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              {miniGames.map((game) => (
                <PressableScale
                  key={game.slug}
                  onPress={() => handleOpenGame(game.slug)}
                  style={[styles.gameItem, { borderLeftColor: game.color }]}
                >
                  <View style={[styles.gameEmojiBox, { backgroundColor: game.color + '25' }]}>
                    <Text style={styles.gameEmoji}>{game.emoji}</Text>
                  </View>
                  <View style={styles.gameTextContainer}>
                    <Text style={styles.gameTitle}>{game.title}</Text>
                    <Text style={styles.gameDesc}>{game.desc}</Text>
                  </View>
                  <Ionicons name="play" size={18} color={game.color} />
                </PressableScale>
              ))}
            </ScrollView>

            <TouchableOpacity
              onPress={() => setGamesModalVisible(false)}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>Isara</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: Radius.xxl,
    overflow: 'hidden',
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  heroBlob1: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    top: -30,
    right: -20,
  },
  heroBlob2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    bottom: -20,
    left: -20,
  },
  heroEmoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: Typography.sizes.xxl,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
    marginBottom: 2,
  },
  heroSub: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: 'rgba(255, 255, 255, 0.92)',
    marginBottom: 8,
  },
  heroDesc: {
    fontSize: Typography.sizes.xs,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 300,
  },
  sectionHeader: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 12,
  },
  primaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 16,
    marginBottom: 14,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardTextBox: {
    flex: 1,
  },
  cardTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    lineHeight: 16,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xxl,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  modalSub: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    color: Colors.textLight,
    marginTop: 2,
  },
  diffItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.lg,
    borderLeftWidth: 5,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  diffItemTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  diffItemTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  diffItemEnglish: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    color: Colors.textLight,
  },
  diffItemDesc: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  diffBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  diffBadgeText: {
    color: Colors.white,
    fontWeight: Typography.weights.heavy,
    fontSize: Typography.sizes.xs,
  },
  gameItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.lg,
    borderLeftWidth: 5,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  gameEmojiBox: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  gameEmoji: {
    fontSize: 22,
  },
  gameTextContainer: {
    flex: 1,
  },
  gameTitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  gameDesc: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: 1,
  },
  closeBtn: {
    marginTop: 12,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.textLight,
  },
  heroLogoWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    overflow: 'hidden',
  },
  heroLogo: {
    width: 64,
    height: 64,
  },
});
