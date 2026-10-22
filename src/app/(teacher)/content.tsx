/**
 * Content Management Screen for Teachers
 * Allows: category browsing, flashcard management, quiz availability toggling
 * and viewing/saving quiz questions per category/difficulty.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
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
import { Ionicons } from '@expo/vector-icons';

import { EmptyState } from '../../components/EmptyState';
import { ErrorView } from '../../components/ErrorView';
import { LoadingView } from '../../components/LoadingView';
import { PrimaryButton } from '../../components/PrimaryButton';
import { PressableScale } from '../../components/PressableScale';
import { teacherService } from '../../services/api';
import { Colors, Shadows, Typography, Radius } from '../../theme';
import type { Category, Flashcard, QuizDifficulty, QuizQuestion } from '../../types';

const DIFFICULTIES: QuizDifficulty[] = ['madali', 'katamtaman', 'mahirap'];
const DIFF_LABELS: Record<QuizDifficulty, string> = { madali: 'Madali', katamtaman: 'Katamtaman', mahirap: 'Mahirap' };
const DIFF_COLORS: Record<QuizDifficulty, string> = { madali: Colors.grassGreen, katamtaman: Colors.sunYellowDark, mahirap: Colors.coralPink };

export default function ContentManagementScreen() {
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedDiff, setSelectedDiff] = useState<QuizDifficulty>('madali');
  const [quizData, setQuizData] = useState<{
    availability: any;
    questions: QuizQuestion[];
    available_flashcards: Flashcard[];
  } | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [savingLock, setSavingLock] = useState(false);
  const [questionModal, setQuestionModal] = useState<{ open: boolean; question: Partial<QuizQuestion> & { category_id?: number; difficulty?: QuizDifficulty } }>({
    open: false,
    question: {},
  });

  const loadCategories = useCallback(async () => {
    try {
      setError(null);
      const cats = await teacherService.getCategories();
      setCategories(cats);
    } catch (err: any) {
      setError(err.message || 'Nabigong kunin ang mga kategorya.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

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

  const handleSelectCategory = (cat: Category) => {
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
      Alert.alert('Error', err.message || 'Hindi nai-save ang pagbabago.');
    } finally {
      setSavingLock(false);
    }
  };

  const handleOpenQuestionModal = (question?: Partial<QuizQuestion>) => {
    if (!selectedCategory) return;
    setQuestionModal({
      open: true,
      question: question ?? {
        category_id: selectedCategory.id,
        difficulty: selectedDiff,
        points: 10,
      },
    });
  };

  const handleSaveQuestion = async () => {
    const q = questionModal.question;
    if (!q.correct_answer || !selectedCategory) {
      Alert.alert('Paalala', 'Punan ang lahat ng kinakailangang patlang.');
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
      Alert.alert('Tagumpay', 'Na-save ang tanong!');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Hindi nai-save ang tanong.');
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
              Alert.alert('Error', err.message || 'Nabigong burahin ang tanong.');
            }
          },
        },
      ]
    );
  };

  const handleExportCsv = async () => {
    try {
      const res = await teacherService.exportReportsCsv();
      Alert.alert(
        'Ulat ng Pagsusulit (CSV Export)',
        `Matagumpay na nai-generate ang ulat (${res.filename}). May kabuuang ${res.csv.split('\n').length - 1} rekord.`
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Nabigong i-export ang CSV report.');
    }
  };

  if (loading && !refreshing) return <LoadingView message="Kinukuha ang nilalaman..." />;
  if (error && categories.length === 0) return <ErrorView message={error} onRetry={loadCategories} />;

  // ── Category list view ──────────────────────────────────────────────────
  if (!selectedCategory) {
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
            onRefresh={() => {
              setRefreshing(true);
              loadCategories();
            }}
            colors={[Colors.teacherPurple]}
          />
        }
      >
        <View style={styles.headerRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="book" size={24} color={Colors.teacherPurple} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Pamahalaan ang Nilalaman</Text>
            <Text style={styles.pageSub}>Pumili ng kategorya upang pamahalaan ang mga quiz.</Text>
          </View>
          <TouchableOpacity
            style={styles.exportCsvBtn}
            onPress={handleExportCsv}
            accessibilityLabel="I-export ang CSV Report"
          >
            <Ionicons name="download-outline" size={16} color={Colors.teacherPurple} />
            <Text style={styles.exportCsvText}>CSV Ulat</Text>
          </TouchableOpacity>
        </View>

        {categories.length === 0 ? (
          <EmptyState
            emoji="📭"
            title="Walang Kategorya"
            message="Magdagdag ng kategorya sa pamamagitan ng Laravel seeder."
          />
        ) : (
          categories.map((cat) => (
            <PressableScale
              key={cat.id}
              onPress={() => handleSelectCategory(cat)}
              style={[
                styles.categoryCard,
                { borderLeftColor: cat.color || Colors.teacherPurple },
                Shadows.soft,
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.catName}>{cat.name}</Text>
                <Text style={styles.catMeta}>
                  {cat.flashcards_count ?? 0} flashcards · 3 difficulty levels
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
            </PressableScale>
          ))
        )}
      </ScrollView>
    );
  }

  // ── Category detail / quiz editor ───────────────────────────────────────
  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 16) + 12 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <PressableScale
          onPress={() => setSelectedCategory(null)}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={18} color={Colors.teacherPurple} />
          <Text style={styles.backBtnText}>Bumalik sa Mga Kategorya</Text>
        </PressableScale>

        <Text style={styles.pageTitle}>{selectedCategory.name}</Text>

        {/* Difficulty Tabs */}
        <View style={styles.diffTabs}>
          {DIFFICULTIES.map((diff) => (
            <TouchableOpacity
              key={diff}
              activeOpacity={0.85}
              onPress={() => handleSelectDiff(diff)}
              style={[
                styles.diffTab,
                { backgroundColor: selectedDiff === diff ? DIFF_COLORS[diff] : '#E2E8F0' },
              ]}
            >
              <Text style={[styles.diffTabText, { color: selectedDiff === diff ? Colors.white : Colors.textLight }]}>
                {DIFF_LABELS[diff]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loadingQuiz ? (
          <LoadingView message="Kinukuha ang quiz data..." />
        ) : quizData ? (
          <>
            {/* Lock Toggle Card */}
            <View style={[styles.lockCard, Shadows.soft]}>
              <View style={{ flex: 1 }}>
                <View style={styles.lockTitleRow}>
                  <Ionicons
                    name={quizData.availability?.is_locked ? 'lock-closed' : 'lock-open'}
                    size={18}
                    color={quizData.availability?.is_locked ? Colors.coralPink : Colors.grassGreen}
                  />
                  <Text style={styles.lockTitle}>
                    {quizData.availability?.is_locked ? 'Naka-lock' : 'Bukas para sa Mag-aaral'}
                  </Text>
                </View>
                <Text style={styles.lockSub}>
                  {quizData.availability?.is_locked
                    ? 'Ang mga estudyante ay hindi makakapagsimula ng quiz na ito.'
                    : 'Maaaring sagutan ng mga estudyante ang antas na ito.'}
                </Text>
              </View>
              <Switch
                value={!quizData.availability?.is_locked}
                onValueChange={handleToggleLock}
                disabled={savingLock}
                trackColor={{ false: '#FCA5A5', true: '#A7F3D0' }}
                thumbColor={quizData.availability?.is_locked ? Colors.coralPink : Colors.grassGreen}
              />
            </View>

            {/* Questions List Header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Mga Tanong ({quizData.questions.length})</Text>
              <PressableScale
                style={styles.addBtn}
                onPress={() => handleOpenQuestionModal()}
              >
                <Ionicons name="add" size={16} color={Colors.white} />
                <Text style={styles.addBtnText}>Magdagdag</Text>
              </PressableScale>
            </View>

            {quizData.questions.length === 0 ? (
              <EmptyState
                emoji="❓"
                title="Walang Tanong"
                message="Magdagdag ng tanong para sa difficulty level na ito."
              />
            ) : (
              quizData.questions.map((q, idx) => (
                <View
                  key={q.id}
                  style={[styles.questionCard, Shadows.soft]}
                >
                  <Text style={styles.questionNum}>#{idx + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.questionText} numberOfLines={2}>
                      {q.question_text || (selectedDiff === 'katamtaman' ? `(Audio-based: Tamang Sagot: ${q.correct_answer})` : 'Walang teksto')}
                    </Text>
                    <Text style={styles.questionMeta}>
                      {q.choices?.length ?? 0} pagpipilian · {q.points} puntos
                    </Text>
                  </View>
                  <View style={styles.questionActions}>
                    <TouchableOpacity
                      onPress={() => handleOpenQuestionModal(q)}
                      style={styles.actionIconBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="pencil" size={18} color={Colors.teacherPurple} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteQuestion(q.id)}
                      style={styles.actionIconBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={18} color={Colors.coralPink} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        ) : null}
      </ScrollView>

      {/* Question Edit Modal */}
      <Modal
        visible={questionModal.open}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {questionModal.question.id ? 'I-edit ang Tanong' : 'Bagong Tanong'}
          </Text>
          <Text style={styles.modalSub}>
            {selectedCategory?.name} · {DIFF_LABELS[selectedDiff]}
          </Text>

          {selectedDiff !== 'katamtaman' && (
            <>
              <Text style={styles.fieldLabel}>Teksto ng Tanong</Text>
              <TextInput
                style={styles.input}
                placeholder="Hal: Ano ang pangalan ng hayop na ito?"
                placeholderTextColor={Colors.textMuted}
                value={questionModal.question.question_text ?? ''}
                onChangeText={(t) => setQuestionModal((prev) => ({ ...prev, question: { ...prev.question, question_text: t } }))}
                multiline
              />
            </>
          )}

          <Text style={styles.fieldLabel}>Tamang Sagot (Item ID o Teksto)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ilagay ang ID ng tamang pagpipilian"
            placeholderTextColor={Colors.textMuted}
            value={String(questionModal.question.correct_answer ?? '')}
            onChangeText={(t) => setQuestionModal((prev) => ({ ...prev, question: { ...prev.question, correct_answer: t } }))}
          />

          <Text style={styles.fieldLabel}>Puntos</Text>
          <TextInput
            style={styles.input}
            placeholder="10"
            placeholderTextColor={Colors.textMuted}
            keyboardType="number-pad"
            value={String(questionModal.question.points ?? 10)}
            onChangeText={(t) => setQuestionModal((prev) => ({ ...prev, question: { ...prev.question, points: parseInt(t) || 10 } }))}
          />

          {selectedDiff === 'katamtaman' && (
            <View style={styles.katInfo}>
              <Text style={styles.katInfoText}>
                ℹ️ Para sa Katamtaman: Ang audio ay awtomatikong gagamitin ang naka-link na flashcard audio.
                Tiyaking nakatakda ang tamang Flashcard ID bilang correct_answer.
              </Text>
            </View>
          )}

          {/* Available flashcards reference */}
          {quizData?.available_flashcards && quizData.available_flashcards.length > 0 && (
            <>
              <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Mga Available na Flashcard (i-tap para pumili):</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.flashcardScroll}>
                {quizData.available_flashcards.map((fc) => (
                  <TouchableOpacity
                    key={fc.id}
                    style={styles.flashcardChip}
                    onPress={() => setQuestionModal((prev) => ({
                      ...prev,
                      question: { ...prev.question, flashcard_id: fc.id, correct_answer: String(fc.id) },
                    }))}
                  >
                    <Text style={styles.flashcardChipId}>ID:{fc.id}</Text>
                    <Text style={styles.flashcardChipName}>{fc.filipino_name || fc.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          <View style={styles.modalActions}>
            <PrimaryButton
              title="I-cancel"
              variant="outline"
              size="md"
              onPress={() => setQuestionModal({ open: false, question: {} })}
              style={{ flex: 1, marginRight: 8 }}
            />
            <PrimaryButton
              title="I-save"
              variant="teacher"
              size="md"
              onPress={handleSaveQuestion}
              style={{ flex: 1 }}
            />
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.teacherPurpleBg },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
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
  categoryCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    borderLeftWidth: 6,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  catName: {
    fontSize: Typography.sizes.md,
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
    marginBottom: 14,
  },
  backBtnText: {
    fontSize: Typography.sizes.sm,
    color: Colors.teacherPurple,
    fontWeight: Typography.weights.semibold,
  },
  diffTabs: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
    marginTop: 10,
  },
  diffTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  diffTabText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  lockCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  lockTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lockTitle: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  lockSub: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.teacherPurple,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
  },
  addBtnText: {
    color: Colors.white,
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  questionCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  questionNum: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.teacherPurple,
    width: 32,
  },
  questionText: {
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.text,
  },
  questionMeta: {
    fontSize: Typography.sizes.xs,
    color: Colors.textLight,
    marginTop: 2,
  },
  modalContent: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 60,
  },
  modalTitle: {
    fontSize: Typography.sizes.xl,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: Typography.sizes.sm,
    color: Colors.textLight,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.heavy,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: Typography.sizes.sm,
    color: Colors.text,
    marginBottom: 16,
  },
  katInfo: {
    backgroundColor: Colors.teacherPurpleLight,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 16,
  },
  katInfoText: {
    fontSize: Typography.sizes.xs,
    color: Colors.teacherPurpleDark,
    lineHeight: 18,
  },
  flashcardScroll: {
    marginBottom: 16,
  },
  flashcardChip: {
    backgroundColor: Colors.teacherPurpleLight,
    borderRadius: Radius.md,
    padding: 10,
    marginRight: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  flashcardChipId: {
    fontSize: Typography.sizes.xs,
    color: Colors.teacherPurple,
    fontWeight: Typography.weights.heavy,
  },
  flashcardChipName: {
    fontSize: Typography.sizes.xs,
    color: Colors.text,
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 20,
  },
  exportCsvBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.pill,
  },
  exportCsvText: {
    fontSize: 11,
    fontWeight: Typography.weights.bold,
    color: Colors.teacherPurple,
  },
  questionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  actionIconBtn: {
    padding: 6,
    borderRadius: Radius.sm,
    backgroundColor: '#F8FAFC',
  },
});
