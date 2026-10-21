import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { getCategoryBySlug } from '../../../data/categories';
import { usePresence } from '../../../hooks/use-presence';
import { Colors, Shadows, Typography } from '../../../theme';
import { QuizDifficulty } from '../../../types';

export default function CategoryDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const category = getCategoryBySlug(slug);

  const [quizModalVisible, setQuizModalVisible] = useState(false);
  const [gamesModalVisible, setGamesModalVisible] = useState(false);

  usePresence(`Tinitingnan ang ${category.name}`, 'category_detail');

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

  const handleStartQuiz = (difficulty: QuizDifficulty) => {
    setQuizModalVisible(false);
    router.push(`/(student)/quiz/${category.slug}/${difficulty}` as any);
  };

  const handleOpenGame = (gameSlug: string) => {
    setGamesModalVisible(false);
    router.push({
      pathname: '/(student)/games/[slug]' as any,
      params: { slug: gameSlug, category: category.slug },
    });
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={category.name}
        bgColor={category.color}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Category Header Banner */}
        <View style={[styles.heroCard, Shadows.card, { borderTopColor: category.color }]}>
          <Text style={styles.heroEmoji}>{category.icon}</Text>
          <Text style={styles.heroTitle}>{category.name}</Text>
          <Text style={styles.heroSub}>{category.englishName} • {category.items.length} Salita</Text>
          {category.description ? (
            <Text style={styles.heroDesc}>{category.description}</Text>
          ) : null}
        </View>

        <Text style={styles.sectionHeader}>Pumili ng Gawain:</Text>

        {/* Option 1: Flashcards */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => router.push(`/(student)/flashcards/${category.slug}` as any)}
          style={[styles.primaryCard, styles.flashcardsCard, Shadows.card]}
        >
          <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}>
            <Text style={styles.iconBoxText}>🗂️</Text>
          </View>
          <View style={styles.cardTextBox}>
            <Text style={styles.cardTitle}>1. Mga Flashcard</Text>
            <Text style={styles.cardSubtitle}>
              Basahin at aralin ang {category.items.length} Filipino-English cards
            </Text>
          </View>
          <Text style={styles.arrowIcon}>➡️</Text>
        </TouchableOpacity>

        {/* Option 2: Quiz */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => setQuizModalVisible(true)}
          style={[styles.primaryCard, styles.quizCard, Shadows.card]}
        >
          <View style={[styles.iconBox, { backgroundColor: '#DCFCE7' }]}>
            <Text style={styles.iconBoxText}>🎯</Text>
          </View>
          <View style={styles.cardTextBox}>
            <Text style={styles.cardTitle}>2. Pagsusulit (Quiz)</Text>
            <Text style={styles.cardSubtitle}>
              Madali, Katamtaman, at Mahirap na antas
            </Text>
          </View>
          <Text style={styles.arrowIcon}>➡️</Text>
        </TouchableOpacity>

        {/* Option 3: Mini Games */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => setGamesModalVisible(true)}
          style={[styles.primaryCard, styles.gamesCard, Shadows.card]}
        >
          <View style={[styles.iconBox, { backgroundColor: '#FEF3C7' }]}>
            <Text style={styles.iconBoxText}>🎮</Text>
          </View>
          <View style={styles.cardTextBox}>
            <Text style={styles.cardTitle}>3. Mga Mini-Game</Text>
            <Text style={styles.cardSubtitle}>
              5 larong pang-aral gamit ang {category.name}
            </Text>
          </View>
          <Text style={styles.arrowIcon}>➡️</Text>
        </TouchableOpacity>
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
              <TouchableOpacity
                key={d.key}
                activeOpacity={0.85}
                onPress={() => handleStartQuiz(d.key)}
                style={[styles.diffItem, { borderLeftColor: d.color }]}
              >
                <View style={styles.diffItemTextContainer}>
                  <Text style={styles.diffItemTitle}>
                    {d.title} <Text style={styles.diffItemEnglish}>({d.english})</Text>
                  </Text>
                  <Text style={styles.diffItemDesc}>{d.desc}</Text>
                </View>
                <View style={[styles.diffBadge, { backgroundColor: d.color }]}>
                  <Text style={styles.diffBadgeText}>{d.stars}</Text>
                </View>
              </TouchableOpacity>
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
                <TouchableOpacity
                  key={game.slug}
                  activeOpacity={0.85}
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
                  <Text style={styles.arrowIcon}>➡️</Text>
                </TouchableOpacity>
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
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    borderTopWidth: 8,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  heroEmoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 2,
  },
  heroSub: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
  },
  heroDesc: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 12,
  },
  primaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    padding: 16,
    marginBottom: 14,
  },
  flashcardsCard: {
    borderLeftColor: '#38BDF8',
    borderLeftWidth: 8,
  },
  quizCard: {
    borderLeftColor: '#4ADE80',
    borderLeftWidth: 8,
  },
  gamesCard: {
    borderLeftColor: '#FACC15',
    borderLeftWidth: 8,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconBoxText: {
    fontSize: 28,
  },
  cardTextBox: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 3,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  arrowIcon: {
    fontSize: 20,
    marginLeft: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  modalSub: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  diffItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderLeftWidth: 6,
    padding: 14,
    marginBottom: 10,
  },
  diffItemTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  diffItemTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  diffItemEnglish: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  diffItemDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  diffBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  diffBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  gameItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderLeftWidth: 6,
    padding: 12,
    marginBottom: 10,
  },
  gameEmojiBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  gameEmoji: {
    fontSize: 24,
  },
  gameTextContainer: {
    flex: 1,
  },
  gameTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  gameDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    marginTop: 12,
    backgroundColor: '#E2E8F0',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
  },
});
