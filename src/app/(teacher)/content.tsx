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
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import { EmptyState } from '../../components/EmptyState';
import { ErrorView } from '../../components/ErrorView';
import { LoadingView } from '../../components/LoadingView';
import { PressableScale } from '../../components/PressableScale';
import { AnimatedBackground } from '../../components/AnimatedBackground';
import { VolumeButton } from '../../components/VolumeButton';
import { teacherService } from '../../services/api';
import { playSound, stopCurrentSound } from '../../services/audio/sound-service';
import { Colors, Shadows, Typography, Radius } from '../../theme';
import type { Category, Flashcard, QuizDifficulty, QuizQuestion } from '../../types';
import { LEARNING_CATEGORIES, overrideVocabularyItem, getRandomVocabularyChoices } from '../../data/categories';
import { getMadaliQuestionsBySlug } from '../../data/quiz-bank-madali';
import { storage } from '../../utils/storage';

const EMPTY_FLASHCARD: Partial<Flashcard & { localImageSource?: any; localAudioSource?: any }> = {
  category_id: 1,
  filipino_name: '',
  english_name: '',
  description: '',
  image_url: '',
  audio_url: '',
  is_published: true,
};

const DIFFICULTIES: QuizDifficulty[] = ['madali', 'katamtaman', 'mahirap'];
const DIFF_LABELS: Record<QuizDifficulty, string> = {
  madali: 'Easy',
  katamtaman: 'Medium',
  mahirap: 'Hard',
};
const DIFF_COLORS: Record<QuizDifficulty, string> = {
  madali: Colors.grassGreen,
  katamtaman: Colors.sunYellowDark,
  mahirap: Colors.coralPink,
};

export type ManagementMode = 'flashcards' | 'quizzes' | 'minigames';

export interface ContentManagementScreenProps {
  initialMode?: ManagementMode;
  showBackToDashboard?: boolean;
}

const DEFAULT_STUDENT_CATEGORIES: Category[] = LEARNING_CATEGORIES.map((c, idx) => ({
  id: idx + 1, slug: c.slug, name: c.name, title: c.name, description: c.description,
  color: c.color, cover_image: null, icon: c.icon, flashcards_count: c.items.length,
}));

function buildDefaultFlashcards(categoriesList: Category[] = DEFAULT_STUDENT_CATEGORIES): (Flashcard & { category?: Category; localImageSource?: any; localAudioSource?: any })[] {
  const cards: any[] = [];
  let idCounter = 1;
  LEARNING_CATEGORIES.forEach((cat, catIdx) => {
    const catObj = categoriesList.find((c) => {
      if (c.slug === cat.slug) return true;
      const cSlugNorm = (c.slug || '').toLowerCase().replace(/^mga-/, '');
      const catSlugNorm = cat.slug.toLowerCase().replace(/^mga-/, '');
      if (cSlugNorm === catSlugNorm) return true;
      if (cSlugNorm.includes('katawan') && catSlugNorm.includes('katawan')) return true;
      if (cSlugNorm.includes('pagbati') && catSlugNorm.includes('pagbati')) return true;
      if (normalizeWord(c.name) === normalizeWord(cat.name)) return true;
      return false;
    }) || DEFAULT_STUDENT_CATEGORIES[catIdx];

    cat.items.forEach((item, itemIdx) => cards.push({
      id: idCounter++, category_id: catObj.id, name: item.filipino, filipino_name: item.filipino,
      english_name: item.english, description: `${item.filipino} (${item.english})`,
      image_url: typeof item.image === 'string' ? item.image : '', audio_url: typeof item.audio === 'string' ? item.audio : '',
      is_published: true, sort_order: itemIdx + 1, category: catObj, localImageSource: item.image, localAudioSource: item.audio,
    }));
  });
  return cards;
}

function normalizeWord(str?: string): string {
  if (!str) return '';
  return str.toLowerCase().trim().replace(/[^a-z0-9]/g, '').replace('kamusta', 'kumusta');
}

// Complete standard category definitions matching student curriculum
function getFlashcardImageSource(card?: Partial<Flashcard & { localImageSource?: any }>) {
  if (!card) return null;
  // If user explicitly picked/uploaded a custom file from device or local gallery:
  if (card.image_url && !card.image_url.includes('images.unsplash.com') && card.image_url.trim().length > 0) {
    return { uri: card.image_url };
  }
  // Authentic student flashcard bundled illustration:
  if (card.localImageSource) {
    return card.localImageSource;
  }
  // Fallback to server URL if valid and not empty
  if (card.image_url && card.image_url.trim().length > 0) {
    return { uri: card.image_url };
  }
  return null;
}

// Unified image resolver for quiz question target items and choices
function getQuestionVisualSource(
  imgUrl?: any,
  localSource?: any,
  wordOrVocabId?: string,
  catSlug?: string,
  flashcardsList?: Flashcard[]
) {
  // 1. Explicitly uploaded custom image (file://, data:, http(s)://):
  if (imgUrl && typeof imgUrl === 'string' && imgUrl.trim().length > 0 && !imgUrl.includes('images.unsplash.com')) {
    return { uri: imgUrl };
  }
  // 2. Bundled local image source (require asset or object with uri)
  if (localSource) {
    return typeof localSource === 'object' && localSource.uri ? localSource : localSource;
  }
  // 3. Match from LEARNING_CATEGORIES by word name, id, or translation:
  const query = (wordOrVocabId || '').toLowerCase().trim();
  if (query) {
    const targetCats = catSlug
      ? [LEARNING_CATEGORIES.find((c) => c.slug === catSlug), ...LEARNING_CATEGORIES.filter((c) => c.slug !== catSlug)]
      : LEARNING_CATEGORIES;

    for (const cat of targetCats) {
      if (!cat?.items) continue;
      const found = cat.items.find(
        (item) =>
          item.id.toLowerCase() === query ||
          item.filipino.toLowerCase().trim() === query ||
          item.english.toLowerCase().trim() === query ||
          (query.length > 2 && item.filipino.toLowerCase().includes(query))
      );
      if (found) {
        if (found.imageUri) return { uri: found.imageUri };
        if (found.image) return found.image;
      }
    }
  }
  // 4. Match from flashcards list
  if (query && flashcardsList && flashcardsList.length > 0) {
    const matchedFc = flashcardsList.find(
      (f) =>
        String(f.id) === query ||
        (f.filipino_name && f.filipino_name.toLowerCase().trim() === query) ||
        (f.name && f.name.toLowerCase().trim() === query)
    );
    if (matchedFc) {
      if (matchedFc.image_url && !matchedFc.image_url.includes('images.unsplash.com')) {
        return { uri: matchedFc.image_url };
      }
      if ((matchedFc as any).localImageSource) {
        return (matchedFc as any).localImageSource;
      }
    }
  }
  // 5. Fallback to server URL if valid and not empty
  if (imgUrl && typeof imgUrl === 'string' && imgUrl.trim().length > 0) {
    return { uri: imgUrl };
  }
  return null;
}

// Helper to reliably find a matching VocabularyItem from question data
function findTargetVocabItem(q: any, items: any[]): any | undefined {
  if (!items || items.length === 0 || !q) return undefined;

  // 1. Match by target_item_name
  if (q.target_item_name && typeof q.target_item_name === 'string' && q.target_item_name.trim().length > 0) {
    const norm = q.target_item_name.toLowerCase().trim();
    const found = items.find(
      (it) => it.filipino?.toLowerCase().trim() === norm || it.id?.toLowerCase() === norm || it.english?.toLowerCase().trim() === norm
    );
    if (found) return found;
  }

  // 2. Match by correct_answer
  if (q.correct_answer && typeof q.correct_answer === 'string' && q.correct_answer.trim().length > 0) {
    const norm = q.correct_answer.toLowerCase().trim();
    const found = items.find(
      (it) => it.filipino?.toLowerCase().trim() === norm || it.id?.toLowerCase() === norm || it.english?.toLowerCase().trim() === norm
    );
    if (found) return found;
  }

  // 3. Match from audio_url (e.g. 'mga-hayop_aso.mp3' -> 'aso', or 'hayop_aso')
  if (q.audio_url && typeof q.audio_url === 'string') {
    const clean = q.audio_url.split('/').pop()?.replace(/\.[^/.]+$/, '').toLowerCase().trim() || '';
    const parts = clean.split('_');
    const lastPart = parts[parts.length - 1];
    const found = items.find(
      (it) =>
        it.id?.toLowerCase() === clean ||
        it.filipino?.toLowerCase().trim() === lastPart ||
        it.english?.toLowerCase().trim() === lastPart ||
        it.id?.toLowerCase().endsWith(lastPart)
    );
    if (found) return found;
  }

  // 4. Match from question_text (e.g. 'Nasaan ang aso?' or 'para sa "Aso"')
  if (q.question_text && typeof q.question_text === 'string') {
    for (const it of items) {
      if (it.filipino && q.question_text.toLowerCase().includes(it.filipino.toLowerCase().trim())) {
        return it;
      }
    }
  }

  return undefined;
}

export default function ContentManagementScreen({
  initialMode,
  showBackToDashboard,
}: ContentManagementScreenProps = {}) {
  const insets = useSafeAreaInsets();
  const searchParams = useLocalSearchParams<{ mode?: ManagementMode }>();
  const [activeMode, setActiveMode] = useState<ManagementMode>(
    searchParams.mode || initialMode || 'flashcards'
  );

  useEffect(() => {
    if (searchParams.mode && ['flashcards', 'quizzes', 'minigames'].includes(searchParams.mode)) {
      setActiveMode(searchParams.mode);
    }
  }, [searchParams.mode]);

  // Categories & Global Data
  const [categories, setCategories] = useState<Category[]>(DEFAULT_STUDENT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Flashcard Management State (Initialized with accurate 151 cards) ────
  const [flashcards, setFlashcards] = useState<(Flashcard & { category?: Category; localImageSource?: any; localAudioSource?: any })[]>(() => buildDefaultFlashcards());
  const [flashcardCategoryFilter, setFlashcardCategoryFilter] = useState<number | 'all'>('all');
  const [flashcardSearch, setFlashcardSearch] = useState('');
  const [flashcardModal, setFlashcardModal] = useState<{
    open: boolean;
    card: Partial<Flashcard & { localImageSource?: any; localAudioSource?: any }>;
    isEditing: boolean;
  }>({
    open: false,
    card: EMPTY_FLASHCARD,
    isEditing: false,
  });
  const [isSavingFlashcard, setIsSavingFlashcard] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);

  // Per-game category assignments (teacher-configurable)
  const LOCAL_CATEGORIES = LEARNING_CATEGORIES.map((c, i) => ({ id: i + 1, name: c.name, slug: c.slug, count: c.items.length }));
  const [gameCategories, setGameCategories] = useState<Record<string, string[]>>({
    memory_match: ['mga-hayop', 'mga-prutas', 'mga-gulay'],
    paghahanap_larawan: ['mga-hayop', 'mga-prutas', 'mga-kulay'],
    hulaan_salita: ['mga-hayop', 'mga-prutas', 'mga-gulay', 'mga-hugis'],
    gulong_letra: ['mga-hayop', 'mga-prutas', 'mga-gulay', 'mga-numero'],
    pop_balloon: ['mga-hayop', 'mga-prutas', 'mga-kulay', 'mga-hugis'],
  });

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
    isEditing?: boolean;
  }>({
    open: false,
    question: {},
    isEditing: false,
  });
  const [isUploadingQImage, setIsUploadingQImage] = useState(false);
  const [isUploadingQAudio, setIsUploadingQAudio] = useState(false);

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

      let loadedCategories = DEFAULT_STUDENT_CATEGORIES;
      if (catsRes.status === 'fulfilled' && Array.isArray(catsRes.value) && catsRes.value.length > 0) {
        loadedCategories = DEFAULT_STUDENT_CATEGORIES.map((defCat) => {
          const matched = catsRes.value.find(
            (c: any) => c.slug === defCat.slug || normalizeWord(c.name) === normalizeWord(defCat.name)
          );
          return {
            ...defCat,
            id: matched?.id || defCat.id,
            color: matched?.color || defCat.color,
            description: matched?.description || defCat.description,
            flashcards_count: defCat.flashcards_count,
            quizAvailabilities: matched?.quiz_availabilities || matched?.quizAvailabilities || [],
            is_locked: Boolean(
              matched?.is_locked ||
              (matched?.quiz_availabilities || matched?.quizAvailabilities || []).some((qa: any) => qa.is_locked)
            ),
          };
        });
      }
      setCategories(loadedCategories);

      // Build full 151 base flashcards linked to loaded categories
      const base151Cards = buildDefaultFlashcards(loadedCategories);

      if (fcRes.status === 'fulfilled' && fcRes.value?.flashcards && Array.isArray(fcRes.value.flashcards)) {
        const backendMap = new Map<string, Flashcard>();
        fcRes.value.flashcards.forEach((bf: Flashcard) => {
          const key = normalizeWord(bf.filipino_name || bf.name);
          if (key) backendMap.set(key, bf);
        });

        const merged = base151Cards.map((baseCard) => {
          const key = normalizeWord(baseCard.filipino_name);
          const backendCard = backendMap.get(key);
          if (backendCard) {
            return {
              ...baseCard,
              id: backendCard.id || baseCard.id,
              is_published: backendCard.is_published,
              image_url: backendCard.image_url || baseCard.image_url,
              audio_url: backendCard.audio_url || baseCard.audio_url,
            };
          }
          return baseCard;
        });

        // Keep any custom teacher-added cards outside the standard 151
        fcRes.value.flashcards.forEach((bf: Flashcard) => {
          const key = normalizeWord(bf.filipino_name || bf.name);
          if (key && !base151Cards.some((b) => normalizeWord(b.filipino_name) === key)) {
            merged.push({
              ...bf,
              localImageSource: null,
              localAudioSource: null,
            });
          }
        });

        setFlashcards(merged);
      } else {
        setFlashcards(base151Cards);
      }

      if (mgRes.status === 'fulfilled' && mgRes.value) {
        setMinigamesData(mgRes.value);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    return () => {
      stopCurrentSound();
    };
  }, []);

  // Load quiz questions for a category & difficulty matching the student quiz experience
  const loadQuiz = useCallback(async (catId: number, diff: QuizDifficulty) => {
    setLoadingQuiz(true);
    setQuizData(null);
    try {
      const cat = categories.find((c) => c.id === catId) || DEFAULT_STUDENT_CATEGORIES.find((c) => c.id === catId);
      const catSlug = cat?.slug || 'mga-hayop';
      const catObj = LEARNING_CATEGORIES.find((c) => c.slug === catSlug || c.name === cat?.name) || LEARNING_CATEGORIES[0];
      let availability: any = { is_locked: false, pass_score: 3 };
      const res = await teacherService.getQuizQuestions(catId, diff);
      if (res?.availability) availability = res.availability;
      let questions = Array.isArray(res?.questions) ? res.questions : [];
      if (questions.length < 10) {
        if (diff === 'madali') {
          questions = getMadaliQuestionsBySlug(catSlug).map((q, idx) => {
            const isPictureQuestion =
              q.type === 'picture-id' ||
              Boolean(q.questionFil && /larawan|litrato/i.test(q.questionFil)) ||
              idx >= 10;

            let matchedItem: any;
            if (isPictureQuestion) {
              matchedItem = catObj.items.find(
                (it) => it.id === q.correctVocabId || it.filipino.toLowerCase() === (q.correctTextId || '').toLowerCase()
              );
              if (!matchedItem && q.correctVocabId) {
                matchedItem = catObj.items.find((it) => it.id.includes(q.correctVocabId!));
              }
              if (!matchedItem) {
                const correctChoiceText = q.textChoices?.find((c) => c.id === q.correctTextId)?.text;
                if (correctChoiceText) {
                  matchedItem = catObj.items.find((it) => it.filipino.toLowerCase() === correctChoiceText.toLowerCase());
                }
              }
            }

            const targetName = isPictureQuestion ? (matchedItem?.filipino || '') : '';
            const targetImg = isPictureQuestion ? (matchedItem?.imageUri || '') : '';
            const localImg = isPictureQuestion ? matchedItem?.image : undefined;

            return {
              id: idx + 1,
              category_id: catId,
              flashcard_id: null,
              question_text: q.questionFil || q.questionEn,
              target_image_url: targetImg,
              target_item_name: targetName,
              targetItem: matchedItem,
              localImageSource: localImg,
              choices: q.textChoices?.map((choice) => ({ id: choice.id, text: choice.text, image_url: '' })) || [],
              correct_answer: q.textChoices?.find((c) => c.id === q.correctTextId)?.text || q.correctTextId || 'A',
              points: 1,
              difficulty: diff,
              is_picture_question: isPictureQuestion,
            } as any;
          });
        } else if (diff === 'katamtaman') {
          questions = catObj.items.map((item, idx) => {
            const choices = getRandomVocabularyChoices(catSlug, item, 4);
            const mappedChoices = choices.map((c, cIdx) => ({
              id: String(c.id || cIdx + 1),
              image_url: c.imageUri || '',
              text: c.filipino,
              vocabularyItem: c,
              localImageSource: c.image,
            }));

            return {
              id: idx + 1,
              category_id: catId,
              flashcard_id: null,
              question_text: `Pakinggan ang audio at piliin ang tamang larawan para sa "${item.filipino}":`,
              target_image_url: item.imageUri || '',
              target_item_name: item.filipino,
              targetItem: item,
              localImageSource: item.image,
              audio_url: item.audioUri || (typeof item.audio === 'string' ? item.audio : `${item.id}.mp3`),
              choices: mappedChoices,
              correct_answer: item.filipino,
              points: 2,
              difficulty: diff,
            } as any;
          });
        } else {
          // mahirap
          questions = catObj.items.map((item, idx) => ({
            id: idx + 1,
            category_id: catId,
            flashcard_id: null,
            question_text: 'Ayusin ang mga letra upang mabuo ang tamang salita.',
            target_image_url: item.imageUri || '',
            target_item_name: item.filipino.toUpperCase(),
            targetItem: item,
            localImageSource: item.image,
            choices: [],
            correct_answer: item.filipino.toUpperCase(),
            points: 3,
            difficulty: diff,
          })) as any;
        }
      } else {
        // Enrich questions returned from server so local assets and images are linked
        questions = questions.map((q: any, idx: number) => {
          if (diff === 'katamtaman') {
            const target = findTargetVocabItem(q, catObj.items) || catObj.items[idx % catObj.items.length];
            const targetWord = target?.filipino || q.target_item_name || q.correct_answer || '';

            // Check if choices are empty or missing text
            const needsChoices =
              !Array.isArray(q.choices) ||
              q.choices.length < 4 ||
              q.choices.every((c: any) => !(c?.text || c?.filipino_name)?.trim());

            let finalChoices: any[] = [];
            if (needsChoices && target) {
              const gen = getRandomVocabularyChoices(catSlug, target, 4);
              finalChoices = gen.map((c, cIdx) => ({
                id: String(c.id || cIdx + 1),
                text: c.filipino,
                image_url: c.imageUri || '',
                vocabularyItem: c,
                localImageSource: c.image,
              }));
            } else {
              finalChoices = (q.choices || []).map((ch: any, cIdx: number) => {
                const chText = typeof ch === 'string' ? ch : (ch.text || ch.filipino_name || '');
                const chImg = typeof ch === 'object' ? ch.image_url : '';
                const vocab =
                  ch.vocabularyItem ||
                  catObj.items.find(
                    (it) => it.id === ch.id || it.filipino.toLowerCase().trim() === chText.toLowerCase().trim()
                  );
                return {
                  id: String(ch.id || cIdx + 1),
                  text: chText || vocab?.filipino || `Choice #${cIdx + 1}`,
                  image_url: chImg || vocab?.imageUri || '',
                  vocabularyItem: vocab,
                  localImageSource: ch.localImageSource || vocab?.image,
                };
              });
            }

            return {
              ...q,
              targetItem: target ?? q.targetItem,
              target_item_name: targetWord,
              correct_answer: q.correct_answer || targetWord,
              localImageSource: (q as any).localImageSource || target?.image,
              audio_url:
                q.audio_url ||
                target?.audioUri ||
                (typeof target?.audio === 'string' ? target.audio : `${target?.id || 'audio'}.mp3`),
              choices: finalChoices,
            };
          }

          if (diff === 'mahirap') {
            const target = findTargetVocabItem(q, catObj.items) || catObj.items[idx % catObj.items.length];
            const targetWord = (target?.filipino || q.target_item_name || q.correct_answer || '').toUpperCase();
            return {
              ...q,
              targetItem: target ?? q.targetItem,
              target_item_name: targetWord,
              correct_answer: targetWord,
              target_image_url: q.target_image_url || target?.imageUri || '',
              localImageSource: (q as any).localImageSource || target?.image,
            };
          }

          // diff === 'madali'
          const isPicQ =
            Boolean((q as any).is_picture_question) ||
            Boolean(q.question_text && /larawan|litrato/i.test(q.question_text)) ||
            Boolean(q.target_image_url && q.target_image_url.trim().length > 0) ||
            idx >= 10;

          let target: any;
          if (isPicQ) {
            target = findTargetVocabItem(q, catObj.items);
          }

          const enrichedChoices = (q.choices || []).map((ch: any, cIdx: number) => {
            const chText = typeof ch === 'string' ? ch : (ch.text || ch.filipino_name || '');
            return {
              id: String(ch.id || cIdx + 1),
              text: chText,
              image_url: typeof ch === 'object' ? ch.image_url || '' : '',
            };
          });

          return {
            ...q,
            targetItem: target ?? q.targetItem,
            target_item_name: isPicQ ? (q.target_item_name || target?.filipino || q.correct_answer) : '',
            target_image_url: isPicQ ? (q.target_image_url || target?.imageUri || '') : '',
            localImageSource: isPicQ ? ((q as any).localImageSource || target?.image) : undefined,
            is_picture_question: isPicQ,
            choices: enrichedChoices,
          };
        });
      }
      setQuizData({
        availability,
        questions,
        available_flashcards: res?.available_flashcards ?? flashcards.filter((f) => f.category_id === catId),
      });
    } catch {
      setQuizData(null);
    } finally {
      setLoadingQuiz(false);
    }
  }, [categories, flashcards]);

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
      Alert.alert('Error', err?.message || 'Failed to save changes.');
    } finally {
      setSavingLock(false);
    }
  };

  const handleToggleCategoryQuizLock = (cat: Category, currentlyLocked: boolean) => {
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${currentlyLocked ? 'unlock' : 'lock'} quizzes for "${cat.name}"?\n\n${
        currentlyLocked
          ? 'Students can now play and take quizzes for this category.'
          : 'Students will not be able to open or answer quizzes for this category while locked.'
      }`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: currentlyLocked ? 'Unlock' : 'Lock',
          style: currentlyLocked ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await teacherService.toggleQuizLock({
                category_id: cat.id,
                difficulty: 'all',
                is_locked: !currentlyLocked,
              });
              setCategories((prev) =>
                prev.map((c) => {
                  if (c.id === cat.id) {
                    const newAvails = (c.quizAvailabilities || []).map((qa: any) => ({
                      ...qa,
                      is_locked: !currentlyLocked,
                    }));
                    return {
                      ...c,
                      is_locked: !currentlyLocked,
                      quizAvailabilities: newAvails.length > 0 ? newAvails : [
                        { difficulty: 'madali', is_locked: !currentlyLocked },
                        { difficulty: 'katamtaman', is_locked: !currentlyLocked },
                        { difficulty: 'mahirap', is_locked: !currentlyLocked },
                      ],
                    };
                  }
                  return c;
                })
              );
              Alert.alert(
                'Success',
                !currentlyLocked
                  ? `Quiz locked for ${cat.name}. Students cannot access it.`
                  : `Quiz unlocked for ${cat.name}. Students can now access it.`
              );
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to update quiz status.');
            }
          },
        },
      ]
    );
  };

  // ── Flashcard Actions ───────────────────────────────────────────────────
  const handlePickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Permission is required to access your device gallery or photo library.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setIsUploadingImage(true);
      try {
        const form = new FormData();
        if (Platform.OS === 'web') {
          // On Web, fetch the blob URL and wrap in a real File instance so FormData transmits as multipart file
          const resp = await fetch(asset.uri);
          const blob = await resp.blob();
          const ext = (asset.mimeType || blob.type || 'image/jpeg').split('/')[1] || 'jpg';
          const file = new File([blob], asset.fileName || `image_${Date.now()}.${ext}`, {
            type: blob.type || asset.mimeType || 'image/jpeg',
          });
          form.append('image', file);
        } else {
          form.append('image', {
            uri: asset.uri,
            name: asset.fileName || 'image.jpg',
            type: asset.mimeType || 'image/jpeg',
          } as any);
        }
        const res = await teacherService.uploadImage(form);
        setFlashcardModal((prev) => ({
          ...prev,
          card: { ...prev.card, image_url: res.url, localImageSource: undefined },
        }));
      } catch (uploadErr: any) {
        console.warn('Image upload error, fallback to local asset:', uploadErr);
        // Direct local device/computer file URI fallback
        setFlashcardModal((prev) => ({
          ...prev,
          card: { ...prev.card, image_url: asset.uri, localImageSource: undefined },
        }));
      }
    } catch (err: any) {
      Alert.alert('Select Image', err?.message || 'Failed to select image.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handlePickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setIsUploadingAudio(true);
      try {
        const form = new FormData();
        if (Platform.OS === 'web') {
          const resp = await fetch(asset.uri);
          const blob = await resp.blob();
          const ext = (asset.mimeType || blob.type || 'audio/mpeg').split('/')[1] || 'mp3';
          const file = new File([blob], asset.name || `audio_${Date.now()}.${ext}`, {
            type: blob.type || asset.mimeType || 'audio/mpeg',
          });
          form.append('audio', file);
        } else {
          form.append('audio', {
            uri: asset.uri,
            name: asset.name,
            type: asset.mimeType || 'audio/mpeg',
          } as any);
        }
        const res = await teacherService.uploadAudio(form);
        setFlashcardModal((prev) => ({
          ...prev,
          card: { ...prev.card, audio_url: res.url, localAudioSource: undefined },
        }));
      } catch (uploadErr: any) {
        console.warn('Audio upload error, fallback to local asset:', uploadErr);
        // Direct local device/computer file URI fallback
        setFlashcardModal((prev) => ({
          ...prev,
          card: { ...prev.card, audio_url: asset.uri, localAudioSource: undefined },
        }));
      }
    } catch (err: any) {
      Alert.alert('Select Audio', err?.message || 'Failed to select audio.');
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const handleOpenAddFlashcard = () => {
    setFlashcardModal({
      open: true,
      card: {
        ...EMPTY_FLASHCARD,
        category_id: categories[0]?.id ?? 1,
      },
      isEditing: false,
    });
  };

  const handleOpenEditFlashcard = (card: Flashcard & { localImageSource?: any; localAudioSource?: any }) => {
    setFlashcardModal({
      open: true,
      card: {
        ...EMPTY_FLASHCARD,
        ...card,
        filipino_name: card.filipino_name || card.name || '',
        english_name: card.english_name || '',
        description: card.description || '',
        image_url: card.image_url || '',
        audio_url: card.audio_url || '',
      },
      isEditing: true,
    });
  };

  const handleSaveFlashcard = async () => {
    const c = flashcardModal.card;
    if (!c.filipino_name?.trim() || !c.category_id) {
      Alert.alert('Missing Fields', 'Please provide the Filipino name and select a category.');
      return;
    }

    setIsSavingFlashcard(true);
    try {
      const catObj = categories.find((cat) => cat.id === c.category_id);
      let savedCard: any = null;
      try {
        const res = await teacherService.saveFlashcard({
          id: c.id,
          category_id: c.category_id,
          filipino_name: c.filipino_name.trim(),
          english_name: c.english_name?.trim() || null,
          description: c.description?.trim() || null,
          image_url: (c.image_url && !c.image_url.startsWith('blob:')) ? c.image_url : null,
          audio_url: c.audio_url || null,
          is_published: c.is_published ?? true,
        });
        savedCard = res.flashcard;
      } catch (err: any) {
        console.warn('Backend saveFlashcard failed, saving to local cache:', err);
      }

      const catSlug = catObj?.slug || 'mga-hayop';
      try {
        const raw = await storage.getItem(`@wikaplay_flashcards_${catSlug}`);
        const overrides = raw ? JSON.parse(raw) : {};
        const norm = c.filipino_name.toLowerCase().trim();
        overrides[norm] = {
          imageUri: (c.image_url && !c.image_url.startsWith('blob:')) ? c.image_url : undefined,
          audioUri: (c.audio_url && !c.audio_url.startsWith('blob:')) ? c.audio_url : undefined,
        };
        await storage.setItem(`@wikaplay_flashcards_${catSlug}`, JSON.stringify(overrides));
        overrideVocabularyItem(c.filipino_name, {
          filipino: c.filipino_name.trim(),
          english: c.english_name?.trim() || undefined,
          imageUri: (c.image_url && !c.image_url.startsWith('blob:')) ? c.image_url : undefined,
          audioUri: (c.audio_url && !c.audio_url.startsWith('blob:')) ? c.audio_url : undefined,
        });
      } catch (storeErr) {
        console.warn('Storage override saving failed:', storeErr);
      }

      setFlashcards((prev) => {
        if (c.id) {
          return prev.map((f) => (f.id === c.id ? { ...f, ...c, category: catObj || f.category } : f));
        } else {
          const newId = savedCard?.id || Math.max(...prev.map((p) => p.id), 151) + 1;
          return [
            {
              id: newId,
              category_id: c.category_id!,
              name: c.filipino_name!.trim(),
              filipino_name: c.filipino_name!.trim(),
              english_name: c.english_name?.trim() || '',
              description: c.description?.trim() || '',
              image_url: c.image_url || '',
              audio_url: c.audio_url || '',
              is_published: c.is_published ?? true,
              sort_order: prev.length + 1,
              category: catObj,
              localImageSource: c.localImageSource,
              localAudioSource: c.localAudioSource,
            },
            ...prev,
          ];
        }
      });

      Alert.alert('Success', 'Flashcard saved successfully!');
      setFlashcardModal({ open: false, card: EMPTY_FLASHCARD, isEditing: false });
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save flashcard.');
    } finally {
      setIsSavingFlashcard(false);
    }
  };

  const handleDeleteFlashcard = (id: number, name: string) => {
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete the flashcard "${name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await teacherService.deleteFlashcard(id).catch(() => {});
              setFlashcards((prev) => prev.filter((f) => f.id !== id));
              Alert.alert('Success', 'Flashcard deleted successfully.');
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete flashcard.');
            }
          },
        },
      ]
    );
  };

  const handlePlayAudioPreview = (cardOrAudio?: any) => {
    if (!cardOrAudio) {
      Alert.alert('No Audio', 'No audio recording linked to this flashcard.');
      return;
    }
    if (typeof cardOrAudio === 'object') {
      if (cardOrAudio.localAudioSource) {
        playSound(cardOrAudio.localAudioSource);
        return;
      }
      if (cardOrAudio.audio_url) {
        playSound(cardOrAudio.audio_url);
        return;
      }
      if (cardOrAudio.filipino_name) {
        playSound(cardOrAudio.filipino_name);
        return;
      }
    } else if (typeof cardOrAudio === 'string') {
      playSound(cardOrAudio);
      return;
    }
    Alert.alert('No Audio', 'No audio recording linked to this flashcard.');
  };

  // ── Quiz Question Actions ───────────────────────────────────────────────
  const handlePickQuizChoiceImage = async (choiceIndex: number) => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Permission is required to access your gallery.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setIsUploadingQImage(true);
      try {
        const form = new FormData();
        if (Platform.OS === 'web') {
          const resp = await fetch(asset.uri);
          const blob = await resp.blob();
          const ext = (asset.mimeType || blob.type || 'image/jpeg').split('/')[1] || 'jpg';
          const file = new File([blob], asset.fileName || `choice_${Date.now()}.${ext}`, {
            type: blob.type || asset.mimeType || 'image/jpeg',
          });
          form.append('image', file);
        } else {
          form.append('image', {
            uri: asset.uri,
            name: asset.fileName || 'choice.jpg',
            type: asset.mimeType || 'image/jpeg',
          } as any);
        }
        const res = await teacherService.uploadImage(form);
        setQuestionModal((prev) => {
          const choices = [...(prev.question.choices || [{}, {}, {}, {}])];
          const curr = typeof choices[choiceIndex] === 'object' ? choices[choiceIndex] : { text: choices[choiceIndex] || '' };
          choices[choiceIndex] = { ...curr, image_url: res.url, localImageSource: { uri: res.url } };
          return { ...prev, question: { ...prev.question, choices } };
        });
      } catch {
        setQuestionModal((prev) => {
          const choices = [...(prev.question.choices || [{}, {}, {}, {}])];
          const curr = typeof choices[choiceIndex] === 'object' ? choices[choiceIndex] : { text: choices[choiceIndex] || '' };
          choices[choiceIndex] = { ...curr, image_url: asset.uri, localImageSource: { uri: asset.uri } };
          return { ...prev, question: { ...prev.question, choices } };
        });
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to select image.');
    } finally {
      setIsUploadingQImage(false);
    }
  };

  const handlePickQuizAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setIsUploadingQAudio(true);
      try {
        const form = new FormData();
        if (Platform.OS === 'web') {
          const resp = await fetch(asset.uri);
          const blob = await resp.blob();
          const ext = (asset.mimeType || blob.type || 'audio/mpeg').split('/')[1] || 'mp3';
          const file = new File([blob], asset.name || `quiz_voice_${Date.now()}.${ext}`, {
            type: blob.type || asset.mimeType || 'audio/mpeg',
          });
          form.append('audio', file);
        } else {
          form.append('audio', {
            uri: asset.uri,
            name: asset.name,
            type: asset.mimeType || 'audio/mpeg',
          } as any);
        }
        const res = await teacherService.uploadAudio(form);
        setQuestionModal((prev) => ({
          ...prev,
          question: { ...prev.question, audio_url: res.url },
        }));
      } catch {
        setQuestionModal((prev) => ({
          ...prev,
          question: { ...prev.question, audio_url: asset.uri },
        }));
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to select audio.');
    } finally {
      setIsUploadingQAudio(false);
    }
  };

  const handlePickQuizTargetImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Permission is required to access your gallery.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setIsUploadingQImage(true);
      try {
        const form = new FormData();
        if (Platform.OS === 'web') {
          const resp = await fetch(asset.uri);
          const blob = await resp.blob();
          const ext = (asset.mimeType || blob.type || 'image/jpeg').split('/')[1] || 'jpg';
          const file = new File([blob], asset.fileName || `target_${Date.now()}.${ext}`, {
            type: blob.type || asset.mimeType || 'image/jpeg',
          });
          form.append('image', file);
        } else {
          form.append('image', {
            uri: asset.uri,
            name: asset.fileName || 'target.jpg',
            type: asset.mimeType || 'image/jpeg',
          } as any);
        }
        const res = await teacherService.uploadImage(form);
        setQuestionModal((prev) => ({
          ...prev,
          question: {
            ...prev.question,
            target_image_url: res.url,
            localImageSource: { uri: res.url },
          },
        }));
      } catch {
        setQuestionModal((prev) => ({
          ...prev,
          question: {
            ...prev.question,
            target_image_url: asset.uri,
            localImageSource: { uri: asset.uri },
          },
        }));
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to select image.');
    } finally {
      setIsUploadingQImage(false);
    }
  };

  const handleOpenQuestionModal = (question?: Partial<QuizQuestion>) => {
    if (!selectedCategory) return;
    const isEdit = !!question?.id;

    const cat = categories.find((c) => c.id === selectedCategory.id) || DEFAULT_STUDENT_CATEGORIES.find((c) => c.id === selectedCategory.id);
    const catSlug = cat?.slug || 'mga-hayop';
    const catObj = LEARNING_CATEGORIES.find((c) => c.slug === catSlug || c.name === cat?.name) || LEARNING_CATEGORIES[0];

    if (question) {
      let normChoices: any[] = question.choices || [];

      if (selectedDiff === 'katamtaman') {
        // Always resolve choices with images for Katamtaman edit:
        // - If choices from DB already have text, match them to vocab items for images
        // - If choices are empty/missing, generate from vocabulary
        const choicesHaveContent =
          Array.isArray(normChoices) &&
          normChoices.length >= 4 &&
          normChoices.some((c: any) => (c?.text || c?.filipino_name || '').trim().length > 0);

        if (choicesHaveContent) {
          // Re-enrich existing choices with localImageSource from vocab
          normChoices = normChoices.map((c: any, idx: number) => {
            if (typeof c === 'string') {
              const vocab = catObj.items.find((it) => it.filipino.toLowerCase().trim() === c.toLowerCase().trim());
              return { id: String(idx + 1), text: c, image_url: vocab?.imageUri || '', localImageSource: vocab?.image, vocabularyItem: vocab };
            }
            const chText = c.text || c.filipino_name || '';
            // Try to find vocab by text, id, or audio match
            const vocab =
              c.vocabularyItem ||
              catObj.items.find(
                (it) =>
                  it.id === c.id ||
                  it.filipino.toLowerCase().trim() === chText.toLowerCase().trim()
              );
            return {
              id: String(c.id || idx + 1),
              text: chText || vocab?.filipino || '',
              image_url: c.image_url || vocab?.imageUri || '',
              localImageSource: c.localImageSource || vocab?.image,
              vocabularyItem: c.vocabularyItem || vocab,
            };
          });

          // If after enrichment still no images, generate fresh choices from vocab
          const stillNoImages = normChoices.every((c: any) => !c.localImageSource && !c.image_url);
          if (stillNoImages) {
            const targetVocab = findTargetVocabItem(question, catObj.items) || catObj.items[0];
            const gen = getRandomVocabularyChoices(catSlug, targetVocab, 4);
            normChoices = gen.map((c, idx) => ({
              id: String(c.id || idx + 1),
              text: c.filipino,
              image_url: c.imageUri || '',
              localImageSource: c.image,
              vocabularyItem: c,
            }));
          }
        } else {
          // Generate fresh choices from vocabulary
          const targetVocab =
            findTargetVocabItem(question, catObj.items) || catObj.items[0];
          const gen = getRandomVocabularyChoices(catSlug, targetVocab, 4);
          normChoices = gen.map((c, idx) => ({
            id: String(c.id || idx + 1),
            text: c.filipino,
            image_url: c.imageUri || '',
            localImageSource: c.image,
            vocabularyItem: c,
          }));
        }
      } else if (selectedDiff === 'mahirap') {
        // mahirap doesn't use choices
        normChoices = [];
      } else {
        // madali: text choices
        if (!Array.isArray(normChoices) || normChoices.length === 0) {
          normChoices = [
            { id: '1', text: '', image_url: '' },
            { id: '2', text: '', image_url: '' },
            { id: '3', text: '', image_url: '' },
            { id: '4', text: '', image_url: '' },
          ];
        } else {
          normChoices = normChoices.map((c: any, idx: number) =>
            typeof c === 'string'
              ? { id: String(idx + 1), text: c, image_url: '' }
              : { id: String(c.id || idx + 1), text: c.text || c.filipino_name || '', image_url: c.image_url || '' }
          );
        }
      }

      // Re-attach targetItem & localImageSource for the question itself
      const enrichedTargetItem =
        (question as any).targetItem ||
        findTargetVocabItem(question, catObj.items);

      setQuestionModal({
        open: true,
        question: {
          ...question,
          category_id: selectedCategory.id,
          difficulty: selectedDiff,
          choices: normChoices,
          targetItem: enrichedTargetItem,
          localImageSource: (question as any).localImageSource || enrichedTargetItem?.image,
        },
        isEditing: isEdit,
      });
    } else {
      if (selectedDiff === 'katamtaman') {
        setQuestionModal({
          open: true,
          question: {
            category_id: selectedCategory.id,
            difficulty: 'katamtaman',
            points: 2,
            question_text: `Pakinggan ang audio at piliin ang tamang larawan:`,
            target_item_name: '',
            audio_url: '',
            choices: [
              { id: '1', text: '', image_url: '' },
              { id: '2', text: '', image_url: '' },
              { id: '3', text: '', image_url: '' },
              { id: '4', text: '', image_url: '' },
            ],
            correct_answer: '',
          },
          isEditing: false,
        });
      } else if (selectedDiff === 'mahirap') {
        setQuestionModal({
          open: true,
          question: {
            category_id: selectedCategory.id,
            difficulty: 'mahirap',
            points: 3,
            question_text: 'Ayusin ang mga letra upang mabuo ang tamang salita.',
            target_item_name: '',
            target_image_url: '',
            correct_answer: '',
            choices: [],
          },
          isEditing: false,
        });
      } else {
        setQuestionModal({
          open: true,
          question: {
            category_id: selectedCategory.id,
            difficulty: 'madali',
            points: 1,
            question_text: `Alin sa mga sumusunod ang ${selectedCategory.name.toLowerCase()}?`,
            target_item_name: '',
            choices: [
              { id: '1', text: '', image_url: '' },
              { id: '2', text: '', image_url: '' },
              { id: '3', text: '', image_url: '' },
              { id: '4', text: '', image_url: '' },
            ],
            correct_answer: '',
          },
          isEditing: false,
        });
      }
    }
  };

  const handleSaveQuestion = async () => {
    const q = { ...questionModal.question };
    if (!selectedCategory) return;

    if (selectedDiff === 'mahirap') {
      const word = (q.target_item_name || q.correct_answer || '').trim().toUpperCase();
      if (!word) {
        Alert.alert('Notice', 'Please enter the Filipino word to jumble (e.g. ASO, PUSA, MANSANAS).');
        return;
      }
      q.target_item_name = word;
      q.correct_answer = word;
      if (!q.question_text) {
        q.question_text = 'Ayusin ang mga letra.';
      }
    } else if (selectedDiff === 'katamtaman') {
      if (!q.correct_answer && !q.target_item_name) {
        Alert.alert('Notice', 'Please specify the correct answer or target item.');
        return;
      }
      if (!q.target_item_name && q.correct_answer) {
        q.target_item_name = q.correct_answer;
      }
      if (!q.question_text) {
        q.question_text = `Nasaan ang ${q.target_item_name || q.correct_answer}?`;
      }
    } else {
      if (!q.correct_answer) {
        Alert.alert('Notice', 'Please specify the correct answer.');
        return;
      }
    }

    try {
      await teacherService.saveQuizQuestion({
        ...q,
        category_id: selectedCategory.id,
        difficulty: selectedDiff,
      } as any);

      // Instantly update local state so changes reflect immediately without waiting
      setQuizData((prev) => {
        if (!prev) return prev;
        const existingIdx = prev.questions.findIndex((item) => item.id === q.id);
        const updated = [...prev.questions];
        if (existingIdx >= 0) {
          updated[existingIdx] = { ...updated[existingIdx], ...q };
        } else {
          updated.push({ ...q, id: q.id || Date.now() });
        }
        return { ...prev, questions: updated };
      });

      // Update in-memory vocabulary item overrides
      if (q.target_image_url && (q.target_item_name || q.correct_answer)) {
        overrideVocabularyItem(q.target_item_name || q.correct_answer, { imageUri: q.target_image_url });
      }
      if (Array.isArray(q.choices)) {
        for (const ch of q.choices) {
          if (ch?.text && ch?.image_url) {
            overrideVocabularyItem(ch.text, { imageUri: ch.image_url });
          }
        }
      }

      setQuestionModal({ open: false, question: {}, isEditing: false });
      loadQuiz(selectedCategory.id, selectedDiff);
      Alert.alert('Success', `Quiz question ${questionModal.isEditing ? 'updated' : 'created'} successfully!`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save question.');
    }
  };

  const handleDeleteQuestion = (questionId: number) => {
    Alert.alert(
      'Confirm Deletion',
      'Are you sure you want to delete this question?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await teacherService.deleteQuizQuestion(questionId);
              if (selectedCategory) loadQuiz(selectedCategory.id, selectedDiff);
              Alert.alert('Success', 'Question deleted successfully.');
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete question.');
            }
          },
        },
      ]
    );
  };

  if (loading && !refreshing) return <LoadingView message="Loading content and lessons..." />;
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
    <AnimatedBackground>
      <View style={{ flex: 1, paddingTop: Math.max(insets.top, 16) + 10 }}>
        {/* Fixed Header Row & Controls */}
        <View style={{ paddingHorizontal: 16 }}>
          {showBackToDashboard && (
            <TouchableOpacity
              style={styles.backToDashboardButton}
              onPress={() => router.replace('/(teacher)' as any)}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color={Colors.teacherPurple} />
              <Text style={styles.backToDashboardText}>Back to Dashboard</Text>
            </TouchableOpacity>
          )}

          {/* Header */}
          <View style={styles.topHeader}>
            <View style={styles.topHeaderIcon}>
              <Ionicons
                name={
                  activeMode === 'flashcards'
                    ? 'albums'
                    : activeMode === 'quizzes'
                    ? 'newspaper'
                    : 'game-controller'
                }
                size={24}
                color={Colors.teacherPurple}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pageTitle}>
                {activeMode === 'flashcards'
                  ? 'Manage Flashcards'
                  : activeMode === 'quizzes'
                  ? 'Manage Quizzes'
                  : 'Manage Mini-Games'}
              </Text>
              <Text style={styles.pageSub}>
                {activeMode === 'flashcards'
                  ? 'Manage 151 vocabulary words, pictures, audio recordings, and translations.'
                  : activeMode === 'quizzes'
                  ? 'Configure quiz questions and lock or unlock quizzes per category.'
                  : 'Manage 5 mini-games, scoring policies, and learning categories.'}
              </Text>
            </View>
            <VolumeButton activeColor={Colors.teacherPurple} size={38} />
          </View>

          {/* Quick Mode Toggle Bar */}
          <View style={styles.quickTabsRow}>
            <TouchableOpacity
              style={[
                styles.quickTabBtn,
                activeMode === 'flashcards' && styles.quickTabBtnActiveFlashcards,
              ]}
              onPress={() => setActiveMode('flashcards')}
            >
              <Ionicons
                name="albums"
                size={16}
                color={activeMode === 'flashcards' ? Colors.white : Colors.teacherPurple}
              />
              <Text
                style={[
                  styles.quickTabBtnText,
                  activeMode === 'flashcards' && styles.quickTabBtnTextActive,
                ]}
              >
                Flashcards ({flashcards.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.quickTabBtn,
                activeMode === 'quizzes' && styles.quickTabBtnActiveQuizzes,
              ]}
              onPress={() => setActiveMode('quizzes')}
            >
              <Ionicons
                name="newspaper"
                size={16}
                color={activeMode === 'quizzes' ? Colors.white : '#0284C7'}
              />
              <Text
                style={[
                  styles.quickTabBtnText,
                  activeMode === 'quizzes' && styles.quickTabBtnTextActive,
                ]}
              >
                Quizzes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.quickTabBtn,
                activeMode === 'minigames' && styles.quickTabBtnActiveMinigames,
              ]}
              onPress={() => setActiveMode('minigames')}
            >
              <Ionicons
                name="game-controller"
                size={16}
                color={activeMode === 'minigames' ? Colors.white : '#DB2777'}
              />
              <Text
                style={[
                  styles.quickTabBtnText,
                  activeMode === 'minigames' && styles.quickTabBtnTextActive,
                ]}
              >
                Mini-Games (5)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Fixed Search Bar, Category Filter Pills, and Add Card for Manage Flashcards */}
          {activeMode === 'flashcards' && (
            <View>
              {/* Action Header */}
              <View style={[styles.sectionHeaderRow, { marginBottom: 8 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionHeading}>System Flashcards</Text>
                  <Text style={styles.sectionSubText}>
                    Total {flashcards.length} words across all {categories.length} categories
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.addBtnPrimary}
                  onPress={handleOpenAddFlashcard}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add-circle" size={18} color={Colors.white} />
                  <Text style={styles.addBtnText}>Add Card</Text>
                </TouchableOpacity>
              </View>

              {/* Search Box */}
              <View style={[styles.searchBox, Shadows.subtle, { marginBottom: 8 }]}>
                <Ionicons name="search" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search Filipino or English word..."
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
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.filterScroll, { marginBottom: 6 }]}>
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
                    All ({flashcards.length})
                  </Text>
                </TouchableOpacity>

                {categories.map((cat, catIdx) => {
                  const count = flashcards.filter((fc) => fc.category_id === cat.id).length;
                  const isActive = flashcardCategoryFilter === cat.id;
                  return (
                    <TouchableOpacity
                      key={`filter_cat_${cat.id}_${cat.slug || catIdx}`}
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
            </View>
          )}
        </View>

        {/* Scrollable Content (Flashcards List, Quizzes, Mini-games) */}
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48 }}
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
          {/* ── SECTION 1: MANAGE FLASHCARDS ─────────────────────────────────── */}
          {activeMode === 'flashcards' && (
            <View style={styles.sectionWrap}>

          {/* Flashcards List */}
          {filteredFlashcards.length === 0 ? (
            <EmptyState
              emoji="🎴"
              title="No Flashcards"
              message="No cards match your filter or search. Tap '+ Add Card' to create one."
            />
          ) : (
            filteredFlashcards.map((fc, fcIdx) => {
              const categoryObj = categories.find((c) => c.id === fc.category_id);
              const cardKey = `fc_${fc.id}_${fc.category_id}_${fc.filipino_name || fc.name || fcIdx}`;

              return (
                <View key={cardKey} style={[styles.flashcardCard, Shadows.soft]}>
                  {getFlashcardImageSource(fc) ? (
                    <Image source={getFlashcardImageSource(fc)!} style={styles.flashcardThumb} />
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
                          <Text style={styles.publishedText}>Published</Text>
                        </View>
                      ) : (
                        <View style={styles.draftBadge}>
                          <Text style={styles.draftText}>Draft</Text>
                        </View>
                      )}
                    </View>

                    {fc.english_name ? (
                      <Text style={styles.cardEnglish}>{fc.english_name}</Text>
                    ) : null}

                    <View style={styles.cardMetaRow}>
                      <Text
                        style={[
                          styles.catBadge,
                          { color: categoryObj?.color || Colors.teacherPurple },
                        ]}
                      >
                        {categoryObj?.name || 'Category'}
                      </Text>
                      {fc.description ? (
                        <Text style={styles.cardDesc} numberOfLines={1}>
                          {fc.description}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Actions: Audio, Edit, Delete */}
                  <View style={styles.actionsCol}>
                    <TouchableOpacity
                      style={styles.audioActionBtn}
                      onPress={() => handlePlayAudioPreview(fc)}
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
              {/* Category-Level Quiz Access Management (Quiz Locking by Category) */}
              <View style={[styles.accessSectionCard, Shadows.soft]}>
                <View style={styles.accessSectionHeader}>
                  <View style={styles.accessHeaderIcon}>
                    <Ionicons name="lock-closed" size={20} color={Colors.teacherPurple} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.accessSectionTitle}>Quiz Access Management</Text>
                    <Text style={styles.accessSectionSub}>
                      Lock or unlock quizzes per category. Locked categories are blocked for students in the app and enforced by the backend API (HTTP 403 QUIZ_LOCKED).
                    </Text>
                  </View>
                </View>

                {categories.map((cat) => {
                  const isLocked = Boolean(
                    (cat as any).is_locked ||
                    cat.quizAvailabilities?.some((qa: any) => qa.is_locked)
                  );
                  return (
                    <View key={`access_cat_${cat.id}`} style={styles.accessRow}>
                      <View style={styles.accessRowInfo}>
                        <Text style={styles.accessCatName}>{cat.name}</Text>
                        <Text style={styles.accessCatMeta}>
                          {cat.flashcards_count ?? 20} Flashcards · 15 Questions (3 Levels)
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.accessStatusBadge,
                          { backgroundColor: isLocked ? '#FEE2E2' : '#DCFCE7' },
                        ]}
                      >
                        <Ionicons
                          name={isLocked ? 'lock-closed' : 'lock-open'}
                          size={13}
                          color={isLocked ? Colors.coralPinkDark : Colors.grassGreenDark}
                        />
                        <Text
                          style={[
                            styles.accessStatusText,
                            { color: isLocked ? Colors.coralPinkDark : Colors.grassGreenDark },
                          ]}
                        >
                          {isLocked ? 'Locked' : 'Open'}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.accessActionBtn,
                          isLocked ? styles.accessUnlockBtn : styles.accessLockBtn,
                        ]}
                        onPress={() => handleToggleCategoryQuizLock(cat, isLocked)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.accessActionBtnText,
                            isLocked ? styles.accessUnlockBtnText : styles.accessLockBtnText,
                          ]}
                        >
                          {isLocked ? 'Unlock' : 'Lock'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>

              <View style={[styles.sectionHeaderRow, { marginTop: 12 }]}>
                <View>
                  <Text style={styles.sectionHeading}>Select Category to Edit Questions</Text>
                  <Text style={styles.sectionSubText}>
                    Configure Easy, Medium, and Hard questions for each lesson.
                  </Text>
                </View>
              </View>

              {categories.map((cat, catIdx) => (
                <PressableScale
                  key={`quiz_cat_${cat.id}_${cat.slug || catIdx}`}
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
                      {cat.flashcards_count ?? 0} flashcards · 3 Levels (Easy, Medium, Hard)
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
                onPress={() => { setSelectedCategory(null); setQuizData(null); }}
                style={styles.backBtn}
              >
                <Ionicons name="arrow-back" size={18} color={Colors.teacherPurple} />
                <Text style={styles.backBtnText}>Back to Categories</Text>
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
              {!initialMode && quizData && (
                <View style={[styles.lockCard, Shadows.subtle]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lockTitle}>
                      {quizData.availability?.is_locked
                        ? 'Level is locked'
                        : 'Open to students'}
                    </Text>
                    <Text style={styles.lockSub}>
                      {quizData.availability?.is_locked
                        ? 'Students cannot open this quiz level.'
                        : 'Students can play and take this quiz.'}
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
              {quizData && <View style={styles.addQuestionRow}>
                <Text style={styles.questionsCountText}>
                  {quizData?.questions?.length ?? 0} Questions ({DIFF_LABELS[selectedDiff]})
                </Text>

                <TouchableOpacity
                  style={styles.addQuestionBtn}
                  onPress={() => handleOpenQuestionModal()}
                >
                  <Ionicons name="add-circle" size={16} color={Colors.white} />
                  <Text style={styles.addQuestionBtnText}>Add Question</Text>
                </TouchableOpacity>
              </View>}

              {/* Questions List */}
              {loadingQuiz ? (
                <LoadingView message="Loading questions..." />
              ) : quizData?.questions && quizData.questions.length > 0 ? (
                quizData.questions.map((q, idx) => (
                  <View key={`quiz_q_${q.id || idx}_${idx}`} style={[styles.questionCard, Shadows.soft]}>
                    <View style={styles.questionHead}>
                      <View style={styles.qNumBadge}>
                        <Text style={styles.qNumText}>{idx + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.questionText}>
                          {q.question_text || `Question #${idx + 1}`}
                        </Text>
                        <Text style={styles.targetItemText}>
                          Target: <Text style={{ fontWeight: 'bold' }}>{q.target_item_name || q.correct_answer}</Text>
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.delQBtn, { backgroundColor: '#E0F2FE', marginRight: 6 }]}
                        onPress={() => handleOpenQuestionModal(q)}
                      >
                        <Ionicons name="pencil" size={15} color="#0284C7" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.delQBtn}
                        onPress={() => handleDeleteQuestion(q.id)}
                      >
                        <Ionicons name="trash-outline" size={16} color={Colors.coralPinkDark} />
                      </TouchableOpacity>
                    </View>

                    {/* Katamtaman Audio / 4 Picture Choices */}
                    {selectedDiff === 'katamtaman' && (
                      <>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 6, backgroundColor: '#F0F9FF', padding: 8, borderRadius: 8 }}>
                          <Ionicons name="volume-medium" size={18} color="#0284C7" />
                          <Text style={{ fontSize: 12, color: '#0369A1', flex: 1 }} numberOfLines={1}>
                            {q.audio_url ? q.audio_url.split('/').pop() : `Voice: "${q.target_item_name || 'audio'}"`}
                          </Text>
                          <TouchableOpacity
                            style={{ backgroundColor: '#0284C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}
                            onPress={() => handlePlayAudioPreview(q.audio_url || q.target_item_name)}
                          >
                            <Ionicons name="play" size={12} color="#FFF" />
                          </TouchableOpacity>
                        </View>

                        {/* 4 Picture Choices Grid preview */}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                          {q.choices?.map((choice: any, cIdx: number) => {
                            const choiceImg = typeof choice === 'object' ? choice.image_url : '';
                            const choiceText = typeof choice === 'string' ? choice : (choice?.text || choice?.filipino_name || '');
                            const isCorrect = q.correct_answer && (
                              choiceText.toLowerCase().trim() === q.correct_answer.toLowerCase().trim() ||
                              String(cIdx) === String(q.correct_answer)
                            );
                            const choiceImgSource = getQuestionVisualSource(
                              choiceImg,
                              choice?.localImageSource || choice?.vocabularyItem?.image,
                              choiceText || choice?.id,
                              selectedCategory?.slug,
                              quizData?.available_flashcards
                            );
                            return (
                              <View
                                key={`choice_${q.id || idx}_${cIdx}`}
                                style={{
                                  flexDirection: 'row', alignItems: 'center', gap: 6,
                                  paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
                                  borderWidth: 1.5, borderColor: isCorrect ? Colors.grassGreen : '#E2E8F0',
                                  backgroundColor: isCorrect ? '#DCFCE7' : '#F8FAFC',
                                }}
                              >
                                {choiceImgSource ? (
                                  <Image source={choiceImgSource} style={{ width: 28, height: 28, borderRadius: 4 }} resizeMode="cover" />
                                ) : (
                                  <Text style={{ fontSize: 14 }}>🖼️</Text>
                                )}
                                <Text style={{ fontSize: 11, fontWeight: isCorrect ? 'bold' : 'normal', color: isCorrect ? Colors.grassGreenDark : Colors.text }}>
                                  {choiceText || `Choice #${cIdx + 1}`} {isCorrect ? '✓' : ''}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      </>
                    )}

                    {/* Mahirap Target Image & Word to Jumble */}
                    {selectedDiff === 'mahirap' && (() => {
                      const hardImgSource = getQuestionVisualSource(
                        q.target_image_url,
                        (q as any).localImageSource || q.targetItem?.image,
                        q.target_item_name || q.correct_answer,
                        selectedCategory?.slug,
                        quizData?.available_flashcards
                      );
                      return (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 6, backgroundColor: '#FFFBEB', padding: 8, borderRadius: 8 }}>
                          {hardImgSource ? (
                            <Image source={hardImgSource} style={{ width: 50, height: 50, borderRadius: 8 }} resizeMode="cover" />
                          ) : (
                            <View style={{ width: 50, height: 50, borderRadius: 8, backgroundColor: '#FEF3C7', alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ fontSize: 22 }}>🖼️</Text>
                            </View>
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#92400E' }}>
                              Word to Jumble: {q.target_item_name || q.correct_answer}
                            </Text>
                            <Text style={{ fontSize: 11, color: '#B45309', marginTop: 2 }}>
                              Scrambled: {(q.target_item_name || q.correct_answer || '').split('').sort(() => 0.5 - Math.random()).join(' ')}
                            </Text>
                          </View>
                        </View>
                      );
                    })()}

                    {/* Madali: Target Picture if it's a picture-id question, then Choices */}
                    {selectedDiff === 'madali' && (() => {
                      const isPicQ =
                        Boolean((q as any).is_picture_question) ||
                        Boolean(q.target_image_url && q.target_image_url.trim().length > 0) ||
                        Boolean((q as any).localImageSource) ||
                        Boolean(q.targetItem?.image) ||
                        Boolean(q.targetItem?.imageUri);

                      const easyImgSource = isPicQ
                        ? getQuestionVisualSource(
                            q.target_image_url,
                            (q as any).localImageSource || q.targetItem?.image,
                            q.target_item_name || q.correct_answer,
                            selectedCategory?.slug,
                            quizData?.available_flashcards
                          )
                        : null;

                      return (
                        <>
                          {isPicQ && easyImgSource && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 6, backgroundColor: '#F0FDF4', padding: 8, borderRadius: 8 }}>
                              <Image source={easyImgSource} style={{ width: 44, height: 44, borderRadius: 8 }} resizeMode="cover" />
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 11, fontWeight: 'bold', color: Colors.grassGreenDark }}>
                                  🖼️ Picture Prompt
                                </Text>
                                <Text style={{ fontSize: 12, color: Colors.text }}>
                                  {q.target_item_name || q.correct_answer}
                                </Text>
                              </View>
                            </View>
                          )}
                          <View style={styles.choicesRow}>
                            {q.choices?.map((choice: any, cIdx: number) => {
                              const choiceText = typeof choice === 'string' ? choice : (choice?.text || choice?.filipino_name || '');
                              const isCorrect =
                                q.correct_answer && choiceText.toLowerCase().trim() === q.correct_answer.toLowerCase().trim();
                              return (
                                <View
                                  key={`choice_${q.id || idx}_${cIdx}`}
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
                        </>
                      );
                    })()}
                  </View>
                ))
              ) : (
                <EmptyState
                  emoji="📝"
                  title="No Questions"
                  message="No questions yet for this difficulty. Tap '+ Add Question'."
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
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionHeading}>5 WikaPlay Mini-Games</Text>
              <Text style={styles.sectionSubText}>
                Configure categories and content used by each mini-game.
              </Text>
            </View>
          </View>

          {/* Scoring Policy Info Banner */}
          <View style={[styles.policyBanner, Shadows.subtle]}>
            <Ionicons name="shield-checkmark" size={20} color={Colors.grassGreenDark} />
            <Text style={styles.policyText}>
              <Text style={{ fontWeight: 'bold' }}>Scoring Policy:</Text> 0–20 points per session · 1 point = 1 star · <Text style={{ fontWeight: 'bold', color: Colors.grassGreenDark }}>15–20 points</Text> = Mystery Box Qualified.
            </Text>
          </View>

          {/* Global Stats Row */}
          {minigamesData && (
            <View style={[styles.mgStatsRow, Shadows.subtle]}>
              <View style={styles.mgStatItem}>
                <Text style={styles.mgStatVal}>{minigamesData.total_completed_sessions}</Text>
                <Text style={styles.mgStatLabel}>Total Sessions</Text>
              </View>
              <View style={styles.gameMetricDivider} />
              <View style={styles.mgStatItem}>
                <Text style={styles.mgStatVal}>{minigamesData.total_qualifying_sessions}</Text>
                <Text style={styles.mgStatLabel}>Mystery Boxes Won</Text>
              </View>
              <View style={styles.gameMetricDivider} />
              <View style={styles.mgStatItem}>
                <Text style={styles.mgStatVal}>{minigamesData.games?.length ?? 5}</Text>
                <Text style={styles.mgStatLabel}>Mini-Games</Text>
              </View>
            </View>
          )}

          {/* 5 Mini-Games with Category Management */}
          {(minigamesData?.games ?? [
            { id: 'memory_match', title: 'Memory Match', description: 'Match corresponding picture cards.', rules: '0–20 points · 1:1 star · 15–20 = Mystery Box.', color: '#7C3AED', total_plays: 0, average_score: 0, qualifiers_count: 0, stars_awarded: 0 },
            { id: 'paghahanap_larawan', title: 'Paghahanap ng Litrato', description: 'Listen to the sound and choose the matching picture.', rules: '0–20 points · 1:1 star · 15–20 = Mystery Box.', color: '#0284C7', total_plays: 0, average_score: 0, qualifiers_count: 0, stars_awarded: 0 },
            { id: 'hulaan_salita', title: 'Hulaan ang Salita', description: 'Look at the clue and guess the hidden word.', rules: '0–20 points · 1:1 star · 15–20 = Mystery Box.', color: '#059669', total_plays: 0, average_score: 0, qualifiers_count: 0, stars_awarded: 0 },
            { id: 'gulong_letra', title: 'Gulong ng mga Letra', description: 'Rearrange scrambled letters to form the word.', rules: '0–20 points · 1:1 star · 15–20 = Mystery Box.', color: '#D97706', total_plays: 0, average_score: 0, qualifiers_count: 0, stars_awarded: 0 },
            { id: 'pop_balloon', title: 'Pop Balloon', description: 'Pop the balloon containing the correct answer.', rules: '0–20 points · 1:1 star · 15–20 = Mystery Box.', color: '#DC2626', total_plays: 0, average_score: 0, qualifiers_count: 0, stars_awarded: 0 },
          ]).map((g) => {
            const selected = gameCategories[g.id] ?? [];
            return (
              <View key={g.id} style={[styles.gameManageCard, Shadows.soft]}>
                <View style={[styles.gameManageHead, { borderLeftColor: g.color || Colors.teacherPurple }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.gameManageTitle}>{g.title}</Text>
                    <Text style={styles.gameManageDesc}>{g.description}</Text>
                  </View>
                  <View style={[styles.gameManagePill, { backgroundColor: (g.color || '#EC4899') + '20' }]}>
                    <Text style={[styles.gameManagePillText, { color: g.color || '#EC4899' }]}>
                      {g.total_plays} Plays
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
                    <Text style={styles.gameMetricVal}>{g.average_score ?? 0} / 20</Text>
                    <Text style={styles.gameMetricLabel}>Average Score</Text>
                  </View>
                  <View style={styles.gameMetricDivider} />
                  <View style={styles.gameMetricCol}>
                    <Text style={styles.gameMetricVal}>{g.qualifiers_count ?? 0}</Text>
                    <Text style={styles.gameMetricLabel}>Mystery Box</Text>
                  </View>
                  <View style={styles.gameMetricDivider} />
                  <View style={styles.gameMetricCol}>
                    <Text style={styles.gameMetricVal}>+{g.stars_awarded ?? 0} ⭐</Text>
                    <Text style={styles.gameMetricLabel}>Stars</Text>
                  </View>
                </View>

                {/* Category Selector */}
                <View style={styles.gameCatSection}>
                  <Text style={styles.gameCatSectionTitle}>📚 Active Categories:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                    {LOCAL_CATEGORIES.map((cat) => {
                      const isSelected = selected.includes(cat.slug);
                      return (
                        <TouchableOpacity
                          key={cat.slug}
                          style={[
                            styles.gameCatChip,
                            isSelected && { backgroundColor: g.color || Colors.teacherPurple },
                          ]}
                          onPress={() => {
                            const next = isSelected
                              ? selected.filter((s) => s !== cat.slug)
                              : [...selected, cat.slug];
                            setGameCategories((prev) => ({ ...prev, [g.id]: next }));
                          }}
                        >
                          <Text style={[styles.gameCatChipText, isSelected && { color: Colors.white }]}>
                            {cat.name} ({cat.count})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  <Text style={styles.gameCatHint}>
                    {selected.length === 0
                      ? '⚠️ No categories selected — select at least one'
                      : `✓ ${selected.length} categories selected · ${LOCAL_CATEGORIES.filter(c => selected.includes(c.slug)).reduce((sum, c) => sum + c.count, 0)} cards`}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* ── MODAL: ADD / EDIT FLASHCARD ──────────────────────────────────── */}
      <Modal
        visible={flashcardModal.open}
        transparent
        animationType="slide"
        onRequestClose={() => setFlashcardModal({ open: false, card: EMPTY_FLASHCARD, isEditing: false })}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, Shadows.card]}>
            <View style={styles.modalHeadRow}>
              <Text style={styles.modalTitle}>
                {flashcardModal.isEditing ? 'Edit Flashcard' : 'Add New Flashcard'}
              </Text>
              <TouchableOpacity
                onPress={() => setFlashcardModal({ open: false, card: EMPTY_FLASHCARD, isEditing: false })}
              >
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Category Selection */}
              <Text style={styles.inputLabel}>Category:</Text>
              <View style={styles.modalCatRow}>
                {categories.map((c) => {
                  const isSelected = flashcardModal.card.category_id === c.id;
                  return (
                    <TouchableOpacity
                      key={`modal_cat_${c.id}_${c.slug}`}
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

              <Text style={styles.inputLabel}>Filipino Name (Required):</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Aso, Pusa, Mansanas..."
                value={flashcardModal.card.filipino_name || ''}
                onChangeText={(val) =>
                  setFlashcardModal((prev) => ({
                    ...prev,
                    card: { ...prev.card, filipino_name: val },
                  }))
                }
              />

              <Text style={styles.inputLabel}>English Name:</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Dog, Cat, Apple..."
                value={flashcardModal.card.english_name || ''}
                onChangeText={(val) =>
                  setFlashcardModal((prev) => ({
                    ...prev,
                    card: { ...prev.card, english_name: val },
                  }))
                }
              />

              <Text style={styles.inputLabel}>Description / Sentence:</Text>
              <TextInput
                style={[styles.modalInput, { height: 60, textAlignVertical: 'top' }]}
                multiline
                placeholder="Brief explanation for learners..."
                value={flashcardModal.card.description || ''}
                onChangeText={(val) =>
                  setFlashcardModal((prev) => ({
                    ...prev,
                    card: { ...prev.card, description: val },
                  }))
                }
              />

              {/* Image Picker */}
              <Text style={styles.inputLabel}>Image:</Text>
              {getFlashcardImageSource(flashcardModal.card) ? (
                <View style={styles.previewImageWrap}>
                  <Image
                    source={getFlashcardImageSource(flashcardModal.card)!}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.changeMediaBtn}
                    onPress={handlePickImage}
                    disabled={isUploadingImage}
                  >
                    {isUploadingImage ? (
                      <ActivityIndicator size="small" color={Colors.white} />
                    ) : (
                      <Ionicons name="camera" size={16} color={Colors.white} />
                    )}
                    <Text style={styles.changeMediaBtnText}>
                      {isUploadingImage ? 'Uploading...' : 'Replace from Device/Computer'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.pickMediaBtn}
                  onPress={handlePickImage}
                  disabled={isUploadingImage}
                >
                  {isUploadingImage ? (
                    <ActivityIndicator size="small" color={Colors.teacherPurple} />
                  ) : (
                    <Ionicons name="image-outline" size={22} color={Colors.teacherPurple} />
                  )}
                  <Text style={styles.pickMediaBtnText}>
                    {isUploadingImage ? 'Uploading...' : 'Choose Image from Device/Computer'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Audio Picker */}
              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Audio Recording:</Text>
              {flashcardModal.card.audio_url || (flashcardModal.card as any)?.localAudioSource ? (
                <View style={styles.audioPickedRow}>
                  <Ionicons name="musical-note" size={18} color={Colors.grassGreenDark} />
                  <Text style={styles.audioPickedText} numberOfLines={1}>
                    {flashcardModal.card.audio_url
                      ? flashcardModal.card.audio_url.split('/').pop()
                      : `${flashcardModal.card.filipino_name || 'Voice'}.mp3 (Bundled Audio)`}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handlePlayAudioPreview(flashcardModal.card)}
                    style={styles.audioPlayTestBtn}
                  >
                    <Ionicons name="play" size={14} color={Colors.white} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handlePickAudio}
                    disabled={isUploadingAudio}
                    style={styles.audioReplaceBtn}
                  >
                    {isUploadingAudio ? (
                      <ActivityIndicator size="small" color={Colors.teacherPurple} />
                    ) : (
                      <Text style={styles.audioReplaceBtnText}>Replace</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.pickMediaBtn}
                  onPress={handlePickAudio}
                  disabled={isUploadingAudio}
                >
                  {isUploadingAudio ? (
                    <ActivityIndicator size="small" color={Colors.teacherPurple} />
                  ) : (
                    <Ionicons name="mic-outline" size={22} color={Colors.teacherPurple} />
                  )}
                  <Text style={styles.pickMediaBtnText}>
                    {isUploadingAudio ? 'Uploading...' : 'Choose Audio from Device/Computer'}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <View style={styles.modalFooterActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setFlashcardModal({ open: false, card: EMPTY_FLASHCARD, isEditing: false })}
                disabled={isSavingFlashcard}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveFlashcard}
                disabled={isSavingFlashcard}
              >
                <Text style={styles.modalSaveText}>
                  {isSavingFlashcard ? 'Saving...' : 'Save Flashcard'}
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
        onRequestClose={() => setQuestionModal({ open: false, question: {}, isEditing: false })}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, Shadows.card, { maxHeight: Dimensions.get('window').height * 0.88 }]}>
            <View style={styles.modalHeadRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {questionModal.isEditing ? 'Edit Quiz Question' : 'Add Quiz Question'}
                </Text>
                <Text style={{ fontSize: 12, color: DIFF_COLORS[selectedDiff], fontWeight: 'bold' }}>
                  Antas: {DIFF_LABELS[selectedDiff]} ({selectedDiff === 'katamtaman' ? 'Voice Audio & Picture Choices' : selectedDiff === 'mahirap' ? 'Picture & Jumble Word' : 'Text Choices'})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setQuestionModal({ open: false, question: {}, isEditing: false })}>
                <Ionicons name="close" size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
              {/* Difficulty Banner Guide */}
              <View
                style={{
                  backgroundColor: DIFF_COLORS[selectedDiff] + '18',
                  borderRadius: Radius.lg,
                  padding: 10,
                  marginBottom: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Ionicons
                  name={
                    selectedDiff === 'katamtaman'
                      ? 'volume-high'
                      : selectedDiff === 'mahirap'
                      ? 'shuffle'
                      : 'help-circle'
                  }
                  size={22}
                  color={DIFF_COLORS[selectedDiff]}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 'bold', color: DIFF_COLORS[selectedDiff], fontSize: 12 }}>
                    {selectedDiff === 'katamtaman'
                      ? 'Katamtaman (Medium) Quiz Mode'
                      : selectedDiff === 'mahirap'
                      ? 'Mahirap (Hard) Jumbled Word Mode'
                      : 'Madali (Easy) Quiz Mode'}
                  </Text>
                  <Text style={{ color: Colors.text, fontSize: 11, marginTop: 2, lineHeight: 15 }}>
                    {selectedDiff === 'katamtaman'
                      ? 'Student hears a voice audio, then selects the matching picture from 4 choices (no text displayed beneath pictures in student quiz).'
                      : selectedDiff === 'mahirap'
                      ? 'Student sees a picture and taps jumbled letter buttons to arrange and spell the word correctly.'
                      : 'Student reads a question and selects the correct text answer.'}
                  </Text>
                </View>
              </View>

              {/* ── KATAMTAMAN (MEDIUM): Voice Audio + 4 Picture Choices ── */}
              {selectedDiff === 'katamtaman' && (
                <>
                  <Text style={styles.inputLabel}>Target Word (Filipino):</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. Aso, Pusa, Mansanas..."
                    value={questionModal.question.target_item_name || ''}
                    onChangeText={(val) =>
                      setQuestionModal((prev) => ({
                        ...prev,
                        question: { ...prev.question, target_item_name: val, correct_answer: prev.question.correct_answer || val },
                      }))
                    }
                  />

                  {/* Audio upload/picker */}
                  <Text style={[styles.inputLabel, { marginTop: 8 }]}>🔊 Voice Over Audio (what student hears):</Text>
                  {questionModal.question.audio_url ? (
                    <View style={styles.audioPickedRow}>
                      <Ionicons name="musical-note" size={18} color={Colors.grassGreenDark} />
                      <Text style={styles.audioPickedText} numberOfLines={1}>
                        {questionModal.question.audio_url.split('/').pop() || 'voice_recording.mp3'}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handlePlayAudioPreview(questionModal.question.audio_url || questionModal.question.target_item_name)}
                        style={styles.audioPlayTestBtn}
                      >
                        <Ionicons name="play" size={14} color={Colors.white} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handlePickQuizAudio}
                        disabled={isUploadingQAudio}
                        style={styles.audioReplaceBtn}
                      >
                        {isUploadingQAudio ? (
                          <ActivityIndicator size="small" color={Colors.teacherPurple} />
                        ) : (
                          <Text style={styles.audioReplaceBtnText}>Replace</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.pickMediaBtn}
                      onPress={handlePickQuizAudio}
                      disabled={isUploadingQAudio}
                    >
                      {isUploadingQAudio ? (
                        <ActivityIndicator size="small" color={Colors.teacherPurple} />
                      ) : (
                        <Ionicons name="mic-outline" size={22} color={Colors.teacherPurple} />
                      )}
                      <Text style={styles.pickMediaBtnText}>
                        {isUploadingQAudio ? 'Uploading Voice Audio...' : 'Choose / Upload Audio from Device'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* 4 Picture Choices */}
                  <Text style={[styles.inputLabel, { marginTop: 14 }]}>
                    🖼️ 4 Picture Choices (Tap image to upload or replace):
                  </Text>
                  <Text style={{ fontSize: 11, color: Colors.textMuted, marginBottom: 8 }}>
                    {'Provide 4 pictures for the student to choose from. Tap "Mark as Correct" for the right answer.'}
                  </Text>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                    {[0, 1, 2, 3].map((choiceIndex) => {
                      const choice = (questionModal.question.choices || [])[choiceIndex] || {};
                      const imgUrl = typeof choice === 'object' ? choice.image_url : '';
                      const choiceText = typeof choice === 'object' ? (choice.text || '') : (choice || '');
                      const isCorrect =
                        (questionModal.question.correct_choice_index === choiceIndex) ||
                        (questionModal.question.correct_answer &&
                          choiceText &&
                          questionModal.question.correct_answer.toLowerCase().trim() === choiceText.toLowerCase().trim());
                      const choiceImgSource = getQuestionVisualSource(
                        imgUrl,
                        choice.localImageSource || choice.vocabularyItem?.image,
                        choiceText || choice.id,
                        selectedCategory?.slug,
                        quizData?.available_flashcards
                      );

                      return (
                        <View
                          key={`choice_card_${choiceIndex}`}
                          style={{
                            width: '47%',
                            backgroundColor: isCorrect ? '#F0FDF4' : '#F8FAFC',
                            borderRadius: Radius.lg,
                            padding: 8,
                            borderWidth: 2,
                            borderColor: isCorrect ? Colors.grassGreen : '#E2E8F0',
                          }}
                        >
                          <TouchableOpacity
                            onPress={() => handlePickQuizChoiceImage(choiceIndex)}
                            disabled={isUploadingQImage}
                            style={{
                              height: 86,
                              borderRadius: Radius.md,
                              backgroundColor: '#E2E8F0',
                              justifyContent: 'center',
                              alignItems: 'center',
                              overflow: 'hidden',
                              borderWidth: 1,
                              borderColor: 'rgba(0,0,0,0.08)',
                            }}
                          >
                            {choiceImgSource ? (
                              <View style={{ width: '100%', height: '100%' }}>
                                <Image source={choiceImgSource} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                                <View style={{
                                  position: 'absolute', bottom: 0, left: 0, right: 0,
                                  backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 2, alignItems: 'center',
                                }}>
                                  <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '600' }}>
                                    📷 Tap to Replace
                                  </Text>
                                </View>
                              </View>
                            ) : (
                              <View style={{ alignItems: 'center' }}>
                                <Ionicons name="camera-outline" size={24} color={Colors.textMuted} />
                                <Text style={{ fontSize: 10, color: Colors.textMuted, marginTop: 2 }}>
                                  Choice #{choiceIndex + 1} Image
                                </Text>
                                <Text style={{ fontSize: 9, color: Colors.teacherPurple, fontWeight: 'bold' }}>
                                  Tap to Upload
                                </Text>
                              </View>
                            )}
                          </TouchableOpacity>

                          <TextInput
                            style={[
                              styles.modalInput,
                              {
                                marginTop: 6,
                                paddingVertical: 4,
                                paddingHorizontal: 8,
                                fontSize: 11,
                                height: 32,
                              },
                            ]}
                            placeholder={`Word (e.g. ${choiceIndex === 0 ? 'Aso' : choiceIndex === 1 ? 'Pusa' : 'Ibon'})`}
                            value={choiceText}
                            onChangeText={(val) => {
                              const choices = [...(questionModal.question.choices || [{}, {}, {}, {}])];
                              const curr = typeof choices[choiceIndex] === 'object' ? choices[choiceIndex] : {};
                              choices[choiceIndex] = { ...curr, text: val };
                              setQuestionModal((prev) => ({
                                ...prev,
                                question: { ...prev.question, choices },
                              }));
                            }}
                          />

                          <TouchableOpacity
                            style={{
                              marginTop: 4,
                              backgroundColor: isCorrect ? Colors.grassGreen : '#E2E8F0',
                              paddingVertical: 5,
                              borderRadius: Radius.sm,
                              alignItems: 'center',
                            }}
                            onPress={() => {
                              setQuestionModal((prev) => ({
                                ...prev,
                                question: {
                                  ...prev.question,
                                  correct_choice_index: choiceIndex,
                                  correct_answer: choiceText || prev.question.target_item_name,
                                },
                              }));
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: 'bold',
                                color: isCorrect ? Colors.white : Colors.text,
                              }}
                            >
                              {isCorrect ? '✓ Correct Choice' : 'Mark as Correct'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>

                  <Text style={[styles.inputLabel, { marginTop: 12 }]}>Correct Answer Word:</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Filipino name of the correct picture..."
                    value={questionModal.question.correct_answer || ''}
                    onChangeText={(val) =>
                      setQuestionModal((prev) => ({
                        ...prev,
                        question: { ...prev.question, correct_answer: val },
                      }))
                    }
                  />
                </>
              )}

              {/* ── MAHIRAP (HARD): Picture + Jumble Word ── */}
              {selectedDiff === 'mahirap' && (() => {
                const hardImgSource = getQuestionVisualSource(
                  questionModal.question.target_image_url,
                  questionModal.question.localImageSource || questionModal.question.targetItem?.image,
                  questionModal.question.target_item_name || questionModal.question.correct_answer,
                  selectedCategory?.slug,
                  quizData?.available_flashcards
                );
                return (
                  <>
                    <Text style={styles.inputLabel}>🖼️ Target Picture (shown to student):</Text>
                    {hardImgSource ? (
                      <View style={styles.previewImageWrap}>
                        <Image
                          source={hardImgSource}
                          style={styles.previewImage}
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          style={styles.changeMediaBtn}
                          onPress={handlePickQuizTargetImage}
                          disabled={isUploadingQImage}
                        >
                          {isUploadingQImage ? (
                            <ActivityIndicator size="small" color={Colors.white} />
                          ) : (
                            <Ionicons name="camera" size={16} color={Colors.white} />
                          )}
                          <Text style={styles.changeMediaBtnText}>
                            {isUploadingQImage ? 'Uploading Picture...' : 'Replace Picture from Device'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.pickMediaBtn}
                        onPress={handlePickQuizTargetImage}
                        disabled={isUploadingQImage}
                      >
                        {isUploadingQImage ? (
                          <ActivityIndicator size="small" color={Colors.teacherPurple} />
                        ) : (
                          <Ionicons name="image-outline" size={22} color={Colors.teacherPurple} />
                        )}
                        <Text style={styles.pickMediaBtnText}>
                          {isUploadingQImage ? 'Uploading Picture...' : 'Choose / Upload Picture from Device'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    <Text style={[styles.inputLabel, { marginTop: 12 }]}>
                      Word to Jumble (Filipino):
                    </Text>
                    <Text style={{ fontSize: 11, color: Colors.textMuted, marginBottom: 4 }}>
                      Type the correct word. The student will be given these letters in scrambled order to solve.
                    </Text>
                    <TextInput
                      style={[styles.modalInput, { fontSize: 16, fontWeight: 'bold', letterSpacing: 2 }]}
                      placeholder="e.g. ASO, PUSA, MANSANAS..."
                      autoCapitalize="characters"
                      value={questionModal.question.target_item_name || questionModal.question.correct_answer || ''}
                      onChangeText={(val) => {
                        const upper = val.toUpperCase();
                        setQuestionModal((prev) => ({
                          ...prev,
                          question: {
                            ...prev.question,
                            target_item_name: upper,
                            correct_answer: upper,
                          },
                        }));
                      }}
                    />

                    {/* Real-time Jumble Scramble Preview */}
                    {(questionModal.question.target_item_name || questionModal.question.correct_answer) ? (
                      <View style={{ backgroundColor: '#FEF3C7', borderRadius: Radius.md, padding: 12, marginTop: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#92400E', marginBottom: 6 }}>
                          🎲 Student Jumble Preview:
                        </Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                          {(questionModal.question.target_item_name || questionModal.question.correct_answer)
                            .split('')
                            .sort(() => 0.5 - Math.random())
                            .map((char: string, cIdx: number) => (
                              <View
                                key={`tile_${cIdx}`}
                                style={{
                                  width: 34,
                                  height: 38,
                                  backgroundColor: Colors.white,
                                  borderRadius: 6,
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  borderWidth: 2,
                                  borderColor: Colors.sunYellowDark,
                                }}
                              >
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: Colors.text }}>{char}</Text>
                              </View>
                            ))}
                        </View>
                        <Text style={{ fontSize: 10, color: '#B45309', marginTop: 6 }}>
                          ✓ Correct Answer: {questionModal.question.target_item_name || questionModal.question.correct_answer}
                        </Text>
                      </View>
                    ) : null}

                    <Text style={[styles.inputLabel, { marginTop: 12 }]}>Instruction Text:</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Ayusin ang mga letra upang mabuo ang tamang salita."
                      value={questionModal.question.question_text || ''}
                      onChangeText={(val) =>
                        setQuestionModal((prev) => ({
                          ...prev,
                          question: { ...prev.question, question_text: val },
                        }))
                      }
                    />
                  </>
                );
              })()}

              {/* ── MADALI (EASY): Standard Text Question + Target Picture + 4 Choices ── */}
              {selectedDiff === 'madali' && (() => {
                const easyImgSource = getQuestionVisualSource(
                  questionModal.question.target_image_url,
                  questionModal.question.localImageSource || questionModal.question.targetItem?.image,
                  questionModal.question.target_item_name || questionModal.question.correct_answer,
                  selectedCategory?.slug,
                  quizData?.available_flashcards
                );
                return (
                  <>
                    <Text style={styles.inputLabel}>Question Text:</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Which of the following is...?"
                      value={questionModal.question.question_text || ''}
                      onChangeText={(val) =>
                        setQuestionModal((prev) => ({
                          ...prev,
                          question: { ...prev.question, question_text: val },
                        }))
                      }
                    />

                    {/* Picture preview & replace (especially for "Ano ang nasa larawan?" questions) */}
                    <Text style={[styles.inputLabel, { marginTop: 10 }]}>
                      🖼️ Question Picture (Optional / For Picture ID Questions):
                    </Text>
                    <Text style={{ fontSize: 11, color: Colors.textMuted, marginBottom: 6 }}>
                      {'If this question asks "Ano ang nasa larawan?" or tests image recognition, you can view or replace the picture here:'}
                    </Text>
                    {easyImgSource ? (
                      <View style={styles.previewImageWrap}>
                        <Image
                          source={easyImgSource}
                          style={styles.previewImage}
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          style={styles.changeMediaBtn}
                          onPress={handlePickQuizTargetImage}
                          disabled={isUploadingQImage}
                        >
                          {isUploadingQImage ? (
                            <ActivityIndicator size="small" color={Colors.white} />
                          ) : (
                            <Ionicons name="camera" size={16} color={Colors.white} />
                          )}
                          <Text style={styles.changeMediaBtnText}>
                            {isUploadingQImage ? 'Uploading Picture...' : 'Replace Picture from Device'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.pickMediaBtn}
                        onPress={handlePickQuizTargetImage}
                        disabled={isUploadingQImage}
                      >
                        {isUploadingQImage ? (
                          <ActivityIndicator size="small" color={Colors.teacherPurple} />
                        ) : (
                          <Ionicons name="image-outline" size={22} color={Colors.teacherPurple} />
                        )}
                        <Text style={styles.pickMediaBtnText}>
                          {isUploadingQImage ? 'Uploading Picture...' : 'Add / Choose Picture for Question'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    <Text style={[styles.inputLabel, { marginTop: 10 }]}>Target Item Name (Filipino):</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="e.g. Aso, Pusa..."
                      value={questionModal.question.target_item_name || ''}
                      onChangeText={(val) =>
                        setQuestionModal((prev) => ({
                          ...prev,
                          question: { ...prev.question, target_item_name: val },
                        }))
                      }
                    />

                    <Text style={styles.inputLabel}>Correct Answer:</Text>
                    <TextInput
                      style={styles.modalInput}
                      placeholder="Type the exact correct answer..."
                      value={questionModal.question.correct_answer || ''}
                      onChangeText={(val) =>
                        setQuestionModal((prev) => ({
                          ...prev,
                          question: { ...prev.question, correct_answer: val },
                        }))
                      }
                    />

                    <Text style={styles.inputLabel}>Options (4 Choices):</Text>
                    {(questionModal.question.choices || ['', '', '', '']).map((ch: any, i: number) => {
                      const valStr = typeof ch === 'string' ? ch : (ch?.text || '');
                      return (
                        <TextInput
                          key={i}
                          style={[styles.modalInput, { marginBottom: 6 }]}
                          placeholder={`Choice #${i + 1}`}
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
                  </>
                );
              })()}
            </ScrollView>

            <View style={styles.modalFooterActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setQuestionModal({ open: false, question: {}, isEditing: false })}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveQuestion}>
                <Text style={styles.modalSaveText}>
                  {questionModal.isEditing ? 'Update Question' : 'Save Question'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
        </ScrollView>
      </View>
    </AnimatedBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 48 },
  stickyFlashcardHeader: {
    backgroundColor: 'transparent',
    paddingBottom: 4,
  },
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
    marginBottom: 14,
    gap: 10,
  },
  quickTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: Radius.pill,
    padding: 4,
  },
  quickTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.pill,
  },
  quickTabBtnActiveFlashcards: {
    backgroundColor: Colors.teacherPurple,
  },
  quickTabBtnActiveQuizzes: {
    backgroundColor: '#0284C7',
  },
  quickTabBtnActiveMinigames: {
    backgroundColor: '#DB2777',
  },
  quickTabBtnText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.textMuted,
  },
  quickTabBtnTextActive: {
    color: Colors.white,
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
  pickMediaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.teacherPurple,
    borderRadius: Radius.md,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#FAF5FF',
    marginBottom: 4,
  },
  pickMediaBtnText: {
    fontSize: Typography.sizes.xs,
    color: Colors.teacherPurple,
    fontWeight: 'bold',
  },
  previewImageWrap: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: 4,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 140,
    borderRadius: Radius.md,
  },
  changeMediaBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  changeMediaBtnText: {
    fontSize: 11,
    color: Colors.white,
    fontWeight: 'bold',
  },
  audioPickedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DCFCE7',
    borderRadius: Radius.md,
    padding: 10,
    marginBottom: 4,
  },
  audioPickedText: {
    flex: 1,
    fontSize: Typography.sizes.xs,
    color: Colors.grassGreenDark,
  },
  audioPlayTestBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.grassGreenDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  audioReplaceBtn: {
    backgroundColor: Colors.teacherPurple,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  audioReplaceBtnText: {
    fontSize: 10,
    color: Colors.white,
    fontWeight: 'bold',
  },
  mgStatsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  mgStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  mgStatVal: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.teacherPurple,
  },
  mgStatLabel: {
    fontSize: 9,
    color: Colors.textLight,
    marginTop: 2,
    textAlign: 'center',
  },
  gameCatSection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  gameCatSectionTitle: {
    fontSize: Typography.sizes.xs,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 2,
  },
  gameCatChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.pill,
    marginRight: 6,
    marginBottom: 4,
  },
  gameCatChipText: {
    fontSize: 10,
    color: Colors.text,
    fontWeight: '600',
  },
  gameCatHint: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },
  backToDashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    marginBottom: 14,
    gap: 6,
  },
  backToDashboardText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.teacherPurple,
  },
  accessSectionCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  accessSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  accessHeaderIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accessSectionTitle: {
    fontSize: Typography.sizes.md,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  accessSectionSub: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    color: Colors.textLight,
    marginTop: 2,
    lineHeight: 18,
  },
  accessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    gap: 10,
  },
  accessRowInfo: {
    flex: 1,
  },
  accessCatName: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.text,
  },
  accessCatMeta: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.body,
    color: Colors.textMuted,
    marginTop: 2,
  },
  accessStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  accessStatusText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  accessActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.md,
    minWidth: 70,
    alignItems: 'center',
  },
  accessActionBtnText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
  },
  accessLockBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  accessLockBtnText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.coralPinkDark,
  },
  accessUnlockBtn: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  accessUnlockBtnText: {
    fontSize: Typography.sizes.xs,
    fontFamily: Typography.family.display,
    fontWeight: Typography.weights.bold,
    color: Colors.grassGreenDark,
  },
});
