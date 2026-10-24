/**
 * Complete Content, Quiz, Flashcard & Mini-Game Management for Teachers
 * Allows:
 * 1. Manage Flashcards (Create, edit, delete, preview audio/image, toggle publish)
 * 2. Manage Quizzes (Madali, Katamtaman, Mahirap, difficulty locking, choices, validation)
 * 3. Manage Mini-Games (5 mini-games overview, scoring rules, 15-20/20 mystery box qualification, statistics)
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
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
import { PressableScale } from '../../components/PressableScale';
import { teacherService } from '../../services/api';
import { playSound } from '../../services/audio/sound-service';
import { Colors, Gradients, Shadows, Typography, Radius } from '../../theme';
import type { Category, Flashcard, QuizDifficulty, QuizQuestion } from '../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DIFFICULTIES: QuizDifficulty[] = ['madali', 'katamtaman', 'mahirap'];
const DIFF_LABELS: Record<QuizDifficulty, string> = {
  madali: 'Madali',
  katamtaman: 'Katamtaman',
  mahirap: 'Mahirap',
};
const DIFF_COLORS: Record<QuizDifficulty, string> = {
  madali: Colors.grassGreen,
  katamtaman: Colors.sunYellowDark,
  mahirap: Colors.coralPink,
};

type ManagementMode = 'flashcards' | 'quizzes' | 'minigames';

export default function ContentManagementScreen() {
  const insets = useSafeAreaInsets();
  const [activeMode, setActiveMode] = useState<ManagementMode>('flashcards');

  // Categories & Global Data
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Flashcard Management State ──────────────────────────────────────────
  const [flashcards, setFlashcards] = useState<(Flashcard & { category?: Category })[]>([]);
  const [flashcardCategoryFilter, setFlashcardCategoryFilter] = useState<number | 'all'>('all');
  const [flashcardSearch, setFlashcardSearch] = useState('');
  const [flashcardModal, setFlashcardModal] = useState<{
    open: boolean;
    card: Partial<Flashcard>;
    isEditing: boolean;
  }>({
    open: false,
    card: {},
    isEditing: false,
  });
  const [isSavingFlashcard, setIsSavingFlashcard] = useState(false);

  // ── Quiz Management State ───────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedDiff, setSelectedDiff] = useState<QuizDifficulty>('madali');
  const [quizData, setQuizData] = useState<{
    availability: any;
    questions: QuizQuestion[];
    available_flashcards: Flashcard[];
  } | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [savingLock, setSavingLock] = useState(false);
  const [questionModal, setQuestionModal] = useState<{
    open: boolean;
    question: any;
  }>({
    open: false,
    question: {},
  });

  // ── Mini-Games Management State ─────────────────────────────────────────
  const [minigamesData, setMinigamesData] = useState<{
    games: any[];
    recent_sessions: any[];
    total_completed_sessions: number;
    total_qualifying_sessions: number;
  } | null>(null);

  const loadAllData = useCallback(async () => {
    try {
      setError(null);
      const [catsRes, fcRes, mgRes] = await Promise.allSettled([
        teacherService.getCategories(),
        teacherService.getFlashcards(),
        teacherService.getMinigamesOverview(),
      ]);

      if (catsRes.status === 'fulfilled') {
        setCategories(catsRes.value);
      }
      if (fcRes.status === 'fulfilled') {
        setFlashcards(fcRes.value.flashcards);
      }
      if (mgRes.status === 'fulfilled') {
        setMinigamesData(mgRes.value);
      }
    } catch (err: any) {
      setError(err?.message || 'Nabigong kunin ang datos.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Load quiz questions for a category & difficulty
  const loadQuiz = useCallback(async (catId: number, diff: QuizDifficulty) => {
    setLoadingQuiz(true);
    setQuizData(null);
    try {
      const res = await teacherService.getQuizQuestions(catId, diff);
      setQuizData({
        availability: res.availability,
        questions: res.questions,
        available_flashcards: res.available_flashcards,
      });
    } catch {
      setQuizData(null);
    } finally {
      setLoadingQuiz(false);
    }
  }, []);

  const handleSelectQuizCategory = (cat: Category) => {
    setSelectedCategory(cat);
    setSelectedDiff('madali');
    loadQuiz(cat.id, 'madali');
  };

  const handleSelectDiff = (diff: QuizDifficulty) => {
    setSelectedDiff(diff);
    if (selectedCategory) loadQuiz(selectedCategory.id, diff);
  };

  const handleToggleLock = async () => {
    if (!selectedCategory || !quizData) return;
    setSavingLock(true);
    try {
      const newLocked = !quizData.availability?.is_locked;
      await teacherService.toggleQuizLock({
        category_id: selectedCategory.id,
        difficulty: selectedDiff,
        is_locked: newLocked,
      });
      setQuizData((prev) =>
        prev ? { ...prev, availability: { ...prev.availability, is_locked: newLocked } } : prev
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Hindi nai-save ang pagbabago.');
    } finally {
      setSavingLock(false);
    }
  };

  // ── Flashcard Actions ───────────────────────────────────────────────────
  const handleOpenAddFlashcard = () => {
    setFlashcardModal({
      open: true,
      card: {
        category_id: categories[0]?.id ?? 1,
        filipino_name: '',
        english_name: '',
        description: '',
        image_url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&q=80',
        audio_url: '',
        is_published: true,
      },
      isEditing: false,
    });
  };

  const handleOpenEditFlashcard = (card: Flashcard) => {
    setFlashcardModal({
      open: true,
      card: { ...card },
      isEditing: true,
    });
  };

  const handleSaveFlashcard = async () => {
    const c = flashcardModal.card;
    if (!c.filipino_name?.trim() || !c.category_id) {
      Alert.alert('Kulang na Patlang', 'Pakilagay ang Filipino name at kategorya.');
      return;
    }

    setIsSavingFlashcard(true);
    try {
      await teacherService.saveFlashcard({
        id: c.id,
        category_id: c.category_id,
        filipino_name: c.filipino_name.trim(),
        english_name: c.english_name?.trim() || null,
        description: c.description?.trim() || null,
        image_url: c.image_url || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&q=80',
        audio_url: c.audio_url || null,
        is_published: c.is_published ?? true,
      });

      Alert.alert('Tagumpay', 'Nai-save ang flashcard!');
      setFlashcardModal({ open: false, card: {}, isEditing: false });
      // Reload flashcards
      const res = await teacherService.getFlashcards();
      setFlashcards(res.flashcards);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Nabigong i-save ang flashcard.');
    } finally {
      setIsSavingFlashcard(false);
    }
  };

  const handleDeleteFlashcard = (id: number, name: string) => {
    Alert.alert(
      'Kumpirmahin ang Pagbura',
      `Sigurado ka bang nais mong burahin ang flashcard na "${name}"?`,
      [
        { text: 'Kanselahin', style: 'cancel' },
        {
          text: 'Burahin',
          style: 'destructive',
          onPress: async () => {
            try {
              await teacherService.deleteFlashcard(id);
              setFlashcards((prev) => prev.filter((f) => f.id !== id));
              Alert.alert('Tagumpay', 'Matagumpay na nabura ang flashcard.');
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Nabigong burahin ang flashcard.');
            }
          },
        },
      ]
    );
  };

  const handlePlayAudioPreview = (audioUrlOrName?: string | null) => {
    if (!audioUrlOrName) {
      Alert.alert('Walang Audio', 'Walang naka-link na audio recording sa flashcard na ito.');
      return;
    }
    playSound(audioUrlOrName);
  };

  // ── Quiz Question Actions ───────────────────────────────────────────────
  const handleOpenQuestionModal = (question?: Partial<QuizQuestion>) => {
    if (!selectedCategory) return;
    setQuestionModal({
      open: true,
      question: (question ?? {
        category_id: selectedCategory.id,
        difficulty: selectedDiff,
        points: 1,
        question_text: `Alin sa mga sumusunod ang ${selectedCategory.name.toLowerCase()}?`,
        target_item_name: '',
        target_image_url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&q=80',
        choices: ['', '', '', ''],
        correct_answer: '',
      }) as any,
    });
  };

  const handleSaveQuestion = async () => {
    const q = questionModal.question;
    if (!q.correct_answer || !selectedCategory) {
      Alert.alert('Paalala', 'Punan ang tamang sagot at kategorya.');
      return;
    }

    try {
      await teacherService.saveQuizQuestion({
        ...q,
        category_id: selectedCategory.id,
        difficulty: selectedDiff,
      } as any);

      setQuestionModal({ open: false, question: {} });
      loadQuiz(selectedCategory.id, selectedDiff);
      Alert.alert('Tagumpay', 'Nai-save ang tanong sa quiz!');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Hindi nai-save ang tanong.');
    }
  };

  const handleDeleteQuestion = (questionId: number) => {
    Alert.alert(
      'Kumpirmahin ang Pagbura',
      'Nais mo bang burahin ang tanong na ito?',
      [
        { text: 'Kanselahin', style: 'cancel' },
        {
          text: 'Burahin',
          style: 'destructive',
          onPress: async () => {
            try {
              await teacherService.deleteQuizQuestion(questionId);
              if (selectedCategory) loadQuiz(selectedCategory.id, selectedDiff);
              Alert.alert('Tagumpay', 'Nabura ang tanong.');
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Nabigong burahin ang tanong.');
            }
          },
        },
      ]
    );
  };

  if (loading && !refreshing) return <LoadingView message="Kinukuha ang nilalaman at mga aralin..." />;
  if (error && categories.length === 0) return <ErrorView message={error} onRetry={loadAllData} />;

  // Filtered flashcards
  const filteredFlashcards = flashcards.filter((fc) => {
    const matchesCat = flashcardCategoryFilter === 'all' || fc.category_id === flashcardCategoryFilter;
    const matchesSearch =
      fc.filipino_name.toLowerCase().includes(flashcardSearch.toLowerCase().trim()) ||
      (fc.english_name && fc.english_name.toLowerCase().includes(flashcardSearch.toLowerCase().trim()));
    return matchesCat && matchesSearch;
  });

  return (
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
            loadAllData();
          }}
          colors={[Colors.teacherPurple]}
        />
      }
    >
      {/* Header */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderIcon}>
          <Ionicons name="book" size={24} color={Colors.teacherPurple} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>Pamahalaan ang Nilalaman</Text>
          <Text style={styles.pageSub}>
            Pumili sa ibaba upang pamahalaan ang Flashcards, Pagsusulit, o Mini-Games.
          </Text>
        </View>
      </View>

      {/* 3 HERO MANAGEMENT CARDS */}
      <View style={styles.heroCardsContainer}>
        {/* CARD 1: MANAGE FLASHCARDS */}
        <TouchableOpacity
          style={[
            styles.heroActionCard,
            activeMode === 'flashcards' && styles.heroActionCardActive,
            Shadows.soft,
          ]}
          onPress={() => {
            setActiveMode('flashcards');
            setSelectedCategory(null);
          }}
          activeOpacity={0.85}
        >
          <View style={styles.heroCardTopRow}>
            <View style={[styles.heroIconCircle, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="albums" size={22} color={Colors.teacherPurple} />
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>{flashcards.length} Flashcards</Text>
            </View>
          </View>
          <Text style={styles.heroCardTitle}>Pamahalaan ang Flashcards</Text>
          <Text style={styles.heroCardSubtitle}>
            Magdagdag, mag-edit ng mga salita, larawan, audio recording, at pagsasalin.
          </Text>
          <View style={styles.heroCardFooter}>
            <Text style={[styles.heroCardActionText, { color: Colors.teacherPurple }]}>
              {activeMode === 'flashcards' ? 'Kasalukuyang Bukas ✓' : 'Buksan ang Flashcards →'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* CARD 2: MANAGE QUIZ */}
        <TouchableOpacity
          style={[
            styles.heroActionCard,
            activeMode === 'quizzes' && styles.heroActionCardActive,
            Shadows.soft,
          ]}
          onPress={() => setActiveMode('quizzes')}
          activeOpacity={0.85}
        >
          <View style={styles.heroCardTopRow}>
            <View style={[styles.heroIconCircle, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="newspaper" size={22} color="#0284C7" />
            </View>
            <View style={[styles.heroBadge, { backgroundColor: '#E0F2FE' }]}>
              <Text style={[styles.heroBadgeText, { color: '#0369A1' }]}>3 Antas ng Hirap</Text>
            </View>
          </View>
          <Text style={styles.heroCardTitle}>Pamahalaan ang Pagsusulit</Text>
          <Text style={styles.heroCardSubtitle}>
            Ayusin ang mga tanong, choices, Katamtaman flashcard audio, at locking status.
          </Text>
          <View style={styles.heroCardFooter}>
            <Text style={[styles.heroCardActionText, { color: '#0284C7' }]}>
              {activeMode === 'quizzes' ? 'Kasalukuyang Bukas ✓' : 'Buksan ang Pagsusulit →'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* CARD 3: MANAGE MINI-GAMES */}
        <TouchableOpacity
          style={[
            styles.heroActionCard,
            activeMode === 'minigames' && styles.heroActionCardActive,
            Shadows.soft,
          ]}
          onPress={() => {
            setActiveMode('minigames');
            setSelectedCategory(null);
          }}
          activeOpacity={0.85}
        >
          <View style={styles.heroCardTopRow}>
            <View style={[styles.heroIconCircle, { backgroundColor: '#FCE7F3' }]}>
              <Ionicons name="game-controller" size={22} color="#DB2777" />
            </View>
            <View style={[styles.heroBadge, { backgroundColor: '#FCE7F3' }]}>
              <Text style={[styles.heroBadgeText, { color: '#BE185D' }]}>5 Mini-Games</Text>
            </View>
          </View>
          <Text style={styles.heroCardTitle}>Pamahalaan ang Mini-Games</Text>
          <Text style={styles.heroCardSubtitle}>
            Memory Match, Paghahanap, Hulaan, Gulong, Pop Balloon at Mystery Box policy.
          </Text>
          <View style={styles.heroCardFooter}>
            <Text style={[styles.heroCardActionText, { color: '#DB2777' }]}>
              {activeMode === 'minigames' ? 'Kasalukuyang Bukas ✓' : 'Buksan ang Mini-Games →'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ── SECTION 1: MANAGE FLASHCARDS ─────────────────────────────────── */}
      {activeMode === 'flashcards' && (
        <View style={styles.sectionWrap}>
          {/* Action Header */}
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionHeading}>Mga Flashcards sa Sistema</Text>
              <Text style={styles.sectionSubText}>
                Kabuuang {flashcards.length} salita sa lahat ng {categories.length} kategorya
              </Text>
            </View>

            <TouchableOpacity
              style={styles.addBtnPrimary}
              onPress={handleOpenAddFlashcard}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle" size={18} color={Colors.white} />
              <Text style={styles.addBtnText}>Magdagdag ng Kard</Text>
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={[styles.searchBox, Shadows.subtle]}>
            <Ionicons name="search" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Ihanap ang salitang Filipino o Ingles..."
              value={flashcardSearch}
              onChangeText={setFlashcardSearch}
            />
            {flashcardSearch.length > 0 && (
              <TouchableOpacity onPress={() => setFlashcardSearch('')}>
                <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[
                styles.filterPill,
                flashcardCategoryFilter === 'all' && styles.filterPillActive,
              ]}
              onPress={() => setFlashcardCategoryFilter('all')}
            >
              <Text
                style={[
                  styles.filterPillText,
                  flashcardCategoryFilter === 'all' && styles.filterPillTextActive,
                ]}
              >
                Lahat ({flashcards.length})
              </Text>
            </TouchableOpacity>

            {categories.map((cat) => {
              const count = flashcards.filter((fc) => fc.category_id === cat.id).length;
              const isActive = flashcardCategoryFilter === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.filterPill, isActive && styles.filterPillActive]}
                  onPress={() => setFlashcardCategoryFilter(cat.id)}
                >
                  <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                    {cat.name} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Flashcards List */}
          {filteredFlashcards.length === 0 ? (
            <EmptyState
              emoji="🎴"
              title="Walang Flashcards"
              message="Walang tumutugma sa filter o paghahanap. Pindutin ang '+ Magdagdag ng Kard' upang magsimula."
            />
          ) : (
            filteredFlashcards.map((fc) => {
              const categoryObj = categories.find((c) => c.id === fc.category_id);

              return (
                <View key={fc.id} style={[styles.flashcardCard, Shadows.soft]}>
                  {fc.image_url ? (
                    <Image source={{ uri: fc.image_url }} style={styles.flashcardThumb} />
                  ) : (
                    <View style={[styles.flashcardThumb, styles.thumbPlaceholder]}>
                      <Text style={{ fontSize: 24 }}>🖼️</Text>
                    </View>
                  )}

                  <View style={{ flex: 1 }}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.cardFilipino}>{fc.filipino_name || fc.name}</Text>
                      {fc.is_published ? (
                        <View style={styles.publishedBadge}>
                          <Text style={styles.publishedText}>Naka-publish</Text>
                        </View>
                      ) : (
                        <View style={styles.draftBadge}>
                          <Text style={styles.draftText}>Draft</Text>
                        </View>
                      )}
                    </View>

                    {fc.english_name && (
                      <Text style={styles.cardEnglish}>{fc.english_name}</Text>
                    )}

                    <View style={styles.cardMetaRow}>
                      <Text
                        style={[
                          styles.catBadge,
                          { color: categoryObj?.color || Colors.teacherPurple },
                        ]}
                      >
                        {categoryObj?.name || 'Kategorya'}
                      </Text>
                      {fc.description && (
                        <Text style={styles.cardDesc} numberOfLines={1}>
                          {fc.description}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Actions: Audio, Edit, Delete */}
                  <View style={styles.actionsCol}>
                    <TouchableOpacity
                      style={styles.audioActionBtn}
                      onPress={() => handlePlayAudioPreview(fc.audio_url || fc.filipino_name)}
                    >
                      <Ionicons name="volume-medium" size={16} color={Colors.teacherPurple} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.editActionBtn}
                      onPress={() => handleOpenEditFlashcard(fc)}
                    >
                      <Ionicons name="pencil" size={14} color="#0284C7" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteActionBtn}
                      onPress={() => handleDeleteFlashcard(fc.id, fc.filipino_name || fc.name)}
                    >
                      <Ionicons name="trash" size={14} color={Colors.coralPinkDark} />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* ── SECTION 2: MANAGE QUIZZES ─────────────────────────────────────── */}
      {activeMode === 'quizzes' && (
        <View style={styles.sectionWrap}>
          {!selectedCategory ? (
            <>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionHeading}>Pumili ng Kategorya para sa Quiz</Text>
                  <Text style={styles.sectionSubText}>
                    I-configure ang Madali, Katamtaman, at Mahirap na tanong bawat aralin.
                  </Text>
                </View>
              </View>

              {categories.map((cat) => (
                <PressableScale
                  key={cat.id}
                  onPress={() => handleSelectQuizCategory(cat)}
                  style={[
                    styles.categoryCard,
                    { borderLeftColor: cat.color || Colors.teacherPurple },
                    Shadows.soft,
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.catName}>{cat.name}</Text>
                    <Text style={styles.catMeta}>
                      {cat.flashcards_count ?? 0} flashcards · 3 Antas (Madali, Katamtaman, Mahirap)
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
                </PressableScale>
              ))}
            </>
          ) : (
            <>
              {/* Back to Category List */}
              <TouchableOpacity
                onPress={() => setSelectedCategory(null)}
                style={styles.backBtn}
              >
                <Ionicons name="arrow-back" size={18} color={Colors.teacherPurple} />
                <Text style={styles.backBtnText}>Bumalik sa Mga Kategorya</Text>
              </TouchableOpacity>

              <Text style={styles.selectedCatTitle}>{selectedCategory.name}</Text>

              {/* Difficulty Tabs */}
              <View style={styles.diffTabsRow}>
                {DIFFICULTIES.map((diff) => (
                  <TouchableOpacity
                    key={diff}
                    activeOpacity={0.85}
                    onPress={() => handleSelectDiff(diff)}
                    style={[
                      styles.diffTab,
                      {
                        backgroundColor:
                          selectedDiff === diff ? DIFF_COLORS[diff] : '#E2E8F0',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.diffTabText,
                        {
                          color: selectedDiff === diff ? Colors.white : Colors.textLight,
                        },
                      ]}
                    >
                      {DIFF_LABELS[diff]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Lock Switch Banner */}
              {quizData && (
                <View style={[styles.lockCard, Shadows.subtle]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lockTitle}>
                      {quizData.availability?.is_locked
                        ? 'Naka-lock ang antas na ito'
                        : 'Bukas sa mga mag-aaral'}
                    </Text>
                    <Text style={styles.lockSub}>
                      {quizData.availability?.is_locked
                        ? 'Hindi mabubuksan ng mga mag-aaral ang pagsusulit na ito.'
                        : 'Maaaring laruin at sagutan ng mga mag-aaral.'}
                    </Text>
                  </View>
                  <Switch
                    value={!quizData.availability?.is_locked}
                    onValueChange={handleToggleLock}
                    disabled={savingLock}
                    trackColor={{ false: '#CBD5E1', true: Colors.grassGreen }}
                    thumbColor={Colors.white}
                  />
                </View>
              )}

              {/* Add Question Button */}
              <View style={styles.addQuestionRow}>
                <Text style={styles.questionsCountText}>
                  {quizData?.questions?.length ?? 0} Tanong ({DIFF_LABELS[selectedDiff]})
                </Text>

                <TouchableOpacity
                  style={styles.addQuestionBtn}
                  onPress={() => handleOpenQuestionModal()}
                >
                  <Ionicons name="add-circle" size={16} color={Colors.white} />
                  <Text style={styles.addQuestionBtnText}>Magdagdag ng Tanong</Text>
                </TouchableOpacity>
              </View>

              {/* Questions List */}
              {loadingQuiz ? (
                <LoadingView message="Kinukuha ang mga tanong..." />
              ) : quizData?.questions && quizData.questions.length > 0 ? (
                quizData.questions.map((q, idx) => (
                  <View key={q.id || idx} style={[styles.questionCard, Shadows.soft]}>
                    <View style={styles.questionHead}>
                      <View style={styles.qNumBadge}>
                        <Text style={styles.qNumText}>{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.questionText}>
                          {q.question_text || `Tanong #${idx + 1}`}
                        </Text>
                        <Text style={styles.targetItemText}>
                          Target: <Text style={{ fontWeight: 'bold' }}>{q.target_item_name}</Text>
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.delQBtn}
                        onPress={() => handleDeleteQuestion(q.id)}
                      >
                        <Ionicons name="trash-outline" size={16} color={Colors.coralPinkDark} />
                      </TouchableOpacity>
                    </View>

                    {/* Choices */}
                    <View style={styles.choicesRow}>
                      {q.choices?.map((choice: any, cIdx: number) => {
                        const choiceText = typeof choice === 'string' ? choice : (choice?.text || choice?.filipino_name || '');
                        const isCorrect =
                          choiceText.toLowerCase().trim() === q.correct_answer.toLowerCase().trim();
                        return (
                          <View
                            key={cIdx}
                            style={[
                              styles.choiceChip,
                              isCorrect && styles.choiceChipCorrect,
                            ]}
                          >
                            <Text
                              style={[
                                styles.choiceText,
                                isCorrect && styles.choiceTextCorrect,
                              ]}
                            >
                              {choiceText} {isCorrect ? '✓' : ''}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))
              ) : (
                <EmptyState
                  emoji="📝"
                  title="Walang Tanong"
                  message="Wala pang tanong para sa antas na ito. Pindutin ang '+ Magdagdag ng Tanong'."
                />
              )}
            </>
          )}
        </View>
      )}

      {/* ── SECTION 3: MANAGE MINI-GAMES ─────────────────────────────────── */}
      {activeMode === 'minigames' && (
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionHeading}>5 Mini-Games ng WikaPlay</Text>
              <Text style={styles.sectionSubText}>
                Memory Match, Paghahanap ng Larawan, Hulaan ang Salita, Gulong ng Letra, at Pop Balloon.
              </Text>
            </View>
          </View>

          {/* Scoring Policy Info Banner */}
          <View style={[styles.policyBanner, Shadows.subtle]}>
            <Ionicons name="shield-checkmark" size={20} color={Colors.grassGreenDark} />
            <Text style={styles.policyText}>
              <Text style={{ fontWeight: 'bold' }}>Patakaran sa Puntos at Gantimpala:</Text> 0–20 puntos bawat sesyon. Bawat puntos ay nagbibigay ng 1:1 bituin. Ang markang <Text style={{ fontWeight: 'bold', color: Colors.grassGreenDark }}>15–20 / 20</Text> ay nagbibigay ng pagkakataong makakuha ng mahiwagang kahon (Nakolekta kard). Ang 0–14 puntos ay hindi kwalipikado.
            </Text>
          </View>

          {/* 5 Mini-Games List */}
          {minigamesData?.games?.map((g) => (
            <View key={g.id} style={[styles.gameManageCard, Shadows.soft]}>
              <View style={[styles.gameManageHead, { borderLeftColor: g.color || Colors.teacherPurple }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.gameManageTitle}>{g.title}</Text>
                  <Text style={styles.gameManageDesc}>{g.description}</Text>
                </View>
                <View style={[styles.gameManagePill, { backgroundColor: (g.color || '#EC4899') + '20' }]}>
                  <Text style={[styles.gameManagePillText, { color: g.color || '#EC4899' }]}>
                    {g.total_plays} Nilaro
                  </Text>
                </View>
              </View>

              <View style={styles.gameManageRulesBox}>
                <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
                <Text style={styles.gameManageRulesText}>{g.rules}</Text>
              </View>

              {/* Key Metrics */}
              <View style={styles.gameManageMetricsRow}>
                <View style={styles.gameMetricCol}>
                  <Text style={styles.gameMetricVal}>{g.average_score} / 20</Text>
                  <Text style={styles.gameMetricLabel}>Average Score</Text>
                </View>
                <View style={styles.gameMetricDivider} />
                <View style={styles.gameMetricCol}>
                  <Text style={styles.gameMetricVal}>{g.qualifiers_count}</Text>
                  <Text style={styles.gameMetricLabel}>Mahiwagang Kahon (15-20 pts)</Text>
                </View>
                <View style={styles.gameMetricDivider} />
                <View style={styles.gameMetricCol}>
                  <Text style={styles.gameMetricVal}>+{g.stars_awarded} ⭐</Text>
                  <Text style={styles.gameMetricLabel}>Naipamahaging Bituin</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── MODAL: ADD / EDIT FLASHCARD ──────────────────────────────────── */}
      <Modal
        visible={flashcardModal.open}
        transparent
        animationType="slide"
        onRequestClose={() => setFlashcardModal({ open: false, card: {}, isEditing: false })}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, Shadows.card]}>
            <View style={styles.modalHeadRow}>
              <Text style={styles.modalTitle}>
                {flashcardModal.isEditing ? 'I-edit ang Flashcard' : 'Magdagdag ng Bagong Flashcard'}
              </Text>
              <TouchableOpacity
                onPress={() => setFlashcardModal({ open: false, card: {}, isEditing: false })}
              >
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Category Selection */}
              <Text style={styles.inputLabel}>Kategorya:</Text>
              <View style={styles.modalCatRow}>
                {categories.map((c) => {
                  const isSelected = flashcardModal.card.category_id === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.modalCatChip,
                        isSelected && { backgroundColor: c.color || Colors.teacherPurple },
                      ]}
                      onPress={() =>
                        setFlashcardModal((prev) => ({
                          ...prev,
                          card: { ...prev.card, category_id: c.id },
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.modalCatChipText,
                          isSelected && { color: Colors.white, fontWeight: 'bold' },
                        ]}
                      >
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Pangalan sa Filipino (Required):</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Hal. Aso, Pusa, Mansanas..."
                value={flashcardModal.card.filipino_name}
                onChangeText={(val) =>
                  setFlashcardModal((prev) => ({
                    ...prev,
                    card: { ...prev.card, filipino_name: val },
                  }))
                }
              />

              <Text style={styles.inputLabel}>Pangalan sa Ingles:</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Hal. Dog, Cat, Apple..."
                value={flashcardModal.card.english_name || ''}
                onChangeText={(val) =>
                  setFlashcardModal((prev) => ({
                    ...prev,
                    card: { ...prev.card, english_name: val },
                  }))
                }
              />

              <Text style={styles.inputLabel}>Deskripsyon / Pangungusap:</Text>
              <TextInput
                style={[styles.modalInput, { height: 60, textAlignVertical: 'top' }]}
                multiline
                placeholder="Maikling paliwanag para sa mga bata..."
                value={flashcardModal.card.description || ''}
                onChangeText={(val) =>
                  setFlashcardModal((prev) => ({
                    ...prev,
                    card: { ...prev.card, description: val },
                  }))
                }
              />

              <Text style={styles.inputLabel}>URL ng Larawan:</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="https://..."
                value={flashcardModal.card.image_url || ''}
                onChangeText={(val) =>
                  setFlashcardModal((prev) => ({
                    ...prev,
                    card: { ...prev.card, image_url: val },
                  }))
                }
              />

              <Text style={styles.inputLabel}>Audio Asset / Path:</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="audio/salita.mp3 o pangalan ng audio"
                value={flashcardModal.card.audio_url || ''}
                onChangeText={(val) =>
                  setFlashcardModal((prev) => ({
                    ...prev,
                    card: { ...prev.card, audio_url: val },
                  }))
                }
              />
            </ScrollView>

            <View style={styles.modalFooterActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setFlashcardModal({ open: false, card: {}, isEditing: false })}
                disabled={isSavingFlashcard}
              >
                <Text style={styles.modalCancelText}>Kanselahin</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveFlashcard}
                disabled={isSavingFlashcard}
              >
                <Text style={styles.modalSaveText}>
                  {isSavingFlashcard ? 'Nai-save...' : 'I-save ang Flashcard'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: ADD / EDIT QUIZ QUESTION ──────────────────────────────── */}
      <Modal
        visible={questionModal.open}
        transparent
        animationType="slide"
        onRequestClose={() => setQuestionModal({ open: false, question: {} })}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, Shadows.card]}>
            <View style={styles.modalHeadRow}>
              <Text style={styles.modalTitle}>Tanong sa Quiz ({DIFF_LABELS[selectedDiff]})</Text>
              <TouchableOpacity onPress={() => setQuestionModal({ open: false, question: {} })}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={styles.inputLabel}>Teksto ng Tanong:</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Alin sa mga sumusunod ang...?"
                value={questionModal.question.question_text || ''}
                onChangeText={(val) =>
                  setQuestionModal((prev) => ({
                    ...prev,
                    question: { ...prev.question, question_text: val },
                  }))
                }
              />

              <Text style={styles.inputLabel}>Target Item Name (Filipino):</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Hal. Aso, Pusa..."
                value={questionModal.question.target_item_name || ''}
                onChangeText={(val) =>
                  setQuestionModal((prev) => ({
                    ...prev,
                    question: { ...prev.question, target_item_name: val },
                  }))
                }
              />

              <Text style={styles.inputLabel}>Tamang Sagot (Correct Answer):</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="I-type ang eksaktong tamang sagot..."
                value={questionModal.question.correct_answer || ''}
                onChangeText={(val) =>
                  setQuestionModal((prev) => ({
                    ...prev,
                    question: { ...prev.question, correct_answer: val },
                  }))
                }
              />

              <Text style={styles.inputLabel}>Mga Pagpipilian (4 Choices):</Text>
              {(questionModal.question.choices || ['', '', '', '']).map((ch: any, i: number) => {
                const valStr = typeof ch === 'string' ? ch : (ch?.text || '');
                return (
                  <TextInput
                    key={i}
                    style={[styles.modalInput, { marginBottom: 6 }]}
                    placeholder={`Pagpipilian #${i + 1}`}
                    value={valStr}
                    onChangeText={(val) => {
                      const next = [...(questionModal.question.choices || ['', '', '', ''])];
                      next[i] = val;
                      setQuestionModal((prev) => ({
                        ...prev,
                        question: { ...prev.question, choices: next },
                      }));
                    }}
                  />
                );
              })}
            </ScrollView>

            <View style={styles.modalFooterActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setQuestionModal({ open: false, question: {} })}
              >
                <Text style={styles.modalCancelText}>Kanselahin</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveQuestion}>
                <Text style={styles.modalSaveText}>I-save ang Tanong</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.teacherPurpleBg },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 48 },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  topHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
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
  heroCardsContainer: {
    marginBottom: 18,
    gap: 10,
  },
  heroActionCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  heroActionCardActive: {
    borderColor: Colors.teacherPurple,
    backgroundColor: '#FAF5FF',
  },
  heroCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroIconCircle: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadge: {
    backgroundColor: Colors.teacherPurpleLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  heroBadgeText: {
    fontSize: 10,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.teacherPurple,
  },
  heroCardTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginTop: 4,
  },
  heroCardSubtitle: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    color: Colors.textLight,
    marginTop: 2,
    lineHeight: 16,
  },
  heroCardFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  heroCardActionText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
  },
  sectionWrap: {
    marginTop: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  sectionSubText: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  addBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.teacherPurple,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.pill,
  },
  addBtnText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    color: Colors.text,
  },
  filterScroll: {
    marginBottom: 12,
  },
  filterPill: {
    backgroundColor: Colors.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  filterPillActive: {
    backgroundColor: Colors.teacherPurple,
    borderColor: Colors.teacherPurple,
  },
  filterPillText: {
    fontSize: 11,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.textMuted,
  },
  filterPillTextActive: {
    color: Colors.white,
  },
  flashcardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  flashcardThumb: {
    width: 56,
    height: 56,
    borderRadius: Radius.md,
  },
  thumbPlaceholder: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardFilipino: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  publishedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  publishedText: {
    fontSize: 9,
    color: Colors.grassGreenDark,
    fontWeight: 'bold',
  },
  draftBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  draftText: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: 'bold',
  },
  cardEnglish: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    fontStyle: 'italic',
    marginTop: 1,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  catBadge: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  cardDesc: {
    fontSize: 10,
    color: Colors.textLight,
    flex: 1,
  },
  actionsCol: {
    gap: 4,
  },
  audioActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.teacherPurpleLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 5,
  },
  catName: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  catMeta: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  backBtnText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.teacherPurple,
  },
  selectedCatTitle: {
    fontSize: Typography.sizes.lg,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 10,
  },
  diffTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  diffTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    alignItems: 'center',
  },
  diffTabText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
  },
  lockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 12,
  },
  lockTitle: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  lockSub: {
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 1,
  },
  addQuestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  questionsCountText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  addQuestionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.teacherPurple,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  addQuestionBtnText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },
  questionCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 8,
  },
  questionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  qNumBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.teacherPurpleLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qNumText: {
    fontSize: 11,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.teacherPurple,
  },
  questionText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  targetItemText: {
    fontSize: 10,
    color: Colors.textLight,
  },
  delQBtn: {
    padding: 4,
  },
  choicesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  choiceChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  choiceChipCorrect: {
    backgroundColor: '#DCFCE7',
  },
  choiceText: {
    fontSize: 10,
    color: Colors.text,
  },
  choiceTextCorrect: {
    color: Colors.grassGreenDark,
    fontWeight: 'bold',
  },
  policyBanner: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#DCFCE7',
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 14,
  },
  policyText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    color: Colors.text,
    lineHeight: 18,
  },
  gameManageCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 10,
  },
  gameManageHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 4,
    paddingLeft: 10,
    marginBottom: 8,
  },
  gameManageTitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.body,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  gameManageDesc: {
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 2,
  },
  gameManagePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  gameManagePillText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  gameManageRulesBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: Radius.sm,
    marginBottom: 10,
  },
  gameManageRulesText: {
    flex: 1,
    fontSize: 10,
    color: Colors.textLight,
  },
  gameManageMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FAF5FF',
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
  modalCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 20,
  },
  modalHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
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
    marginTop: 8,
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
  modalCatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  modalCatChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  modalCatChipText: {
    fontSize: 10,
    color: Colors.text,
  },
  modalFooterActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
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
