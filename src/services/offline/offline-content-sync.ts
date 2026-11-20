/**
 * WikaPlay — Offline Content Synchronizer
 *
 * Pre-fetches and caches all categories, teacher flashcards, and quizzes
 * in the background whenever the student is connected online.
 *
 * This ensures that when the student plays offline later, all newly added
 * teacher content (flashcards and quizzes across all difficulties) is
 * already cached in AsyncStorage and available offline.
 */

import { LEARNING_CATEGORIES, syncCategoryFlashcards } from '../../data/categories';
import { getMadaliQuestionsBySlug } from '../../data/quiz-bank-madali';
import { categoryService } from '../api';
import { storage } from '../../utils/storage';
import { resolveAvatarUrl } from '../../components/UserAvatar';
import { VocabularyItem } from '../../types';

let isSyncing = false;

const CACHE_VERSION = '4';
const CACHE_VERSION_KEY = '@wikaplay_madali_cache_v';

/** One-time cache bust: removes stale madali caches written before section-isolation fix */
async function bustStaleCachesIfNeeded() {
  try {
    const stored = await storage.getItem(CACHE_VERSION_KEY);
    if (stored !== CACHE_VERSION) {
      for (const cat of ['mga-hayop', 'mga-prutas', 'mga-gulay', 'mga-numero', 'mga-hugis', 'mga-kulay', 'bahagi-ng-katawan', 'mga-pagbati']) {
        await storage.removeItem(`@wikaplay_cached_madali_full_${cat}`).catch(() => {});
      }
      await storage.setItem(CACHE_VERSION_KEY, CACHE_VERSION);
    }
  } catch {}
}

export async function prefetchAndCacheOfflineContent(sectionId?: number | null) {
  if (isSyncing) return;
  isSyncing = true;

  try {
    // Clear stale caches from before section-isolation fix (one-time per device)
    await bustStaleCachesIfNeeded();
    for (const cat of LEARNING_CATEGORIES) {
      const slug = cat.slug;

      // 1. Sync & cache flashcards for this category
      try {
        const fcRes = await categoryService.getFlashcards(slug, sectionId);
        if (fcRes?.flashcards && Array.isArray(fcRes.flashcards)) {
          syncCategoryFlashcards(slug, fcRes.flashcards);

          // Save the full updated category items directly for offline recovery
          await storage.setItem(`@wikaplay_full_items_${slug}`, JSON.stringify(cat.items));

          const overridesMap: Record<string, { imageUri?: string; audioUri?: string }> = {};
          const customItems: VocabularyItem[] = [];

          fcRes.flashcards.forEach((f) => {
            const fNorm = (f.filipino_name || f.name || '').toLowerCase().trim();
            const isBaseItem = cat.items.slice(0, 20).some(
              (it) => it.filipino.toLowerCase().trim() === fNorm
            );
            const isTestCard = f.id === 155 || /s{3,}/i.test(fNorm) || /s{3,}/i.test(f.english_name || '');

            const normalizedImg = f.image_url ? resolveAvatarUrl(f.image_url) : undefined;
            const isUnsplash = typeof normalizedImg === 'string' && normalizedImg.includes('images.unsplash.com');
            const isBlobUrl = typeof normalizedImg === 'string' && normalizedImg.startsWith('blob:');
            const isLocalFile = typeof normalizedImg === 'string' && normalizedImg.startsWith('file://');
            const isPlaceholder = typeof normalizedImg === 'string' && (normalizedImg.includes('wikaplay.app') || normalizedImg.trim().length === 0);
            const validImage = normalizedImg && !isUnsplash && !isBlobUrl && !isLocalFile && !isPlaceholder ? normalizedImg : undefined;

            const isRealRemoteAudio = typeof f.audio_url === 'string' &&
              (f.audio_url.startsWith('http://') || f.audio_url.startsWith('https://') || f.audio_url.includes('/storage/'));
            const isLocalAudioFile = typeof f.audio_url === 'string' && f.audio_url.startsWith('file://');
            const validAudio = typeof f.audio_url === 'string' && isRealRemoteAudio && !f.audio_url.startsWith('blob:') && !isLocalAudioFile
              ? f.audio_url
              : undefined;

            if (isBaseItem) {
              overridesMap[fNorm] = {
                imageUri: validImage,
                audioUri: validAudio,
              };
            } else if (f.filipino_name && f.is_published !== false && !isTestCard) {
              const customItem: VocabularyItem = {
                id: `fc_${f.id}`,
                categoryId: cat.id,
                filipino: f.filipino_name,
                english: f.english_name || '',
                imageUri: validImage,
                audioUri: validAudio,
                emoji: '⭐',
              };
              customItems.push(customItem);
              overridesMap[fNorm] = {
                imageUri: validImage,
                audioUri: validAudio,
              };
            }
          });

          await storage.setItem(`@wikaplay_flashcards_${slug}`, JSON.stringify(overridesMap));

          // Write ONLY the current teacher's custom items — do NOT merge with previous
          // cached items, as those may belong to a different teacher/section.
          await storage.setItem(`@wikaplay_custom_items_${slug}`, JSON.stringify(customItems));
        }
      } catch {}

      // 2. Sync & cache Madali quiz: base curriculum + custom teacher questions
      try {
        const madaliRes = await categoryService.getQuizQuestions(slug, 'madali', sectionId);
        const apiQuestions = (madaliRes?.questions || []).filter(
          (q: any) => q.question_text !== 'Ano ang nasa larawan?'
        );
        const localQuestions = getMadaliQuestionsBySlug(slug);

        const letters = ['A', 'B', 'C', 'D'];
        const mappedCustom = apiQuestions.map((apiQ: any, idx: number) => {
          const choices = (apiQ.choices || []).slice(0, 4);
          const textChoices = choices.map((ch: any, cIdx: number) => ({
            id: letters[cIdx],
            text: typeof ch === 'string' ? ch : (ch?.text || ''),
          }));
          const correctIdx = choices.findIndex((ch: any) => {
            const text = typeof ch === 'string' ? ch : (ch?.text || '');
            const idStr = typeof ch === 'object' && ch ? String(ch.id) : '';
            return (
              text.toLowerCase().trim() === (apiQ.correct_answer || '').toLowerCase().trim() ||
              idStr === String(apiQ.correct_answer)
            );
          });
          const hasPic = Boolean(apiQ.target_image_url && !apiQ.target_image_url.includes('wikaplay.app'));
          const rawQText = apiQ.question_text || '';
          let qFil = rawQText;
          let qEn = (apiQ.question_text_en || (apiQ as any).questionEn || '').trim();

          if (rawQText.includes(' ||| ')) {
            const parts = rawQText.split(' ||| ');
            qFil = parts[0].trim();
            if (!qEn) {
              qEn = parts[1].trim();
            }
          }

          if (qFil.includes(' ||| ')) {
            qFil = qFil.split(' ||| ')[0].trim();
          }

          if (qEn.toLowerCase().trim() === qFil.toLowerCase().trim()) {
            qEn = '';
          }

          return {
            id: `api_${apiQ.id || idx}`,
            categoryId: `cat_${slug}`,
            categorySlug: slug,
            difficulty: 'madali',
            type: hasPic ? 'picture-id' : 'multiple-choice',
            questionFil: qFil || 'Piliin ang tamang sagot.',
            questionEn: qEn,
            englishOnTop: false,
            textChoices,
            correctTextId: (correctIdx >= 0 ? letters[correctIdx] : 'A'),
            target_image_url: hasPic ? (resolveAvatarUrl(apiQ.target_image_url) || apiQ.target_image_url) : undefined,
            audio: apiQ.audio_url ? { uri: resolveAvatarUrl(apiQ.audio_url) || apiQ.audio_url } : undefined,
          };
        });

        const combined = [...localQuestions, ...mappedCustom];
        await storage.setItem(`@wikaplay_cached_madali_full_${slug}`, JSON.stringify(combined));
      } catch {}

      // 3. Sync & cache Katamtaman and Mahirap quizzes
      for (const diff of ['katamtaman', 'mahirap'] as const) {
        try {
          const quizRes = await categoryService.getQuizQuestions(slug, diff, sectionId);
          if (quizRes?.questions && Array.isArray(quizRes.questions) && quizRes.questions.length > 0) {
            // Store ALL questions as returned by the API — teacher-added questions are already
            // section-scoped by the backend. Do NOT deduplicate here, since a teacher may
            // legitimately have multiple questions targeting the same animal/item.
            await storage.setItem(`@wikaplay_cached_quiz_${slug}_${diff}`, JSON.stringify(quizRes.questions));
          }
        } catch {}
      }
    }
  } catch (err) {
    console.warn('[OfflineContentSync] Failed during prefetch:', err);
  } finally {
    isSyncing = false;
  }
}
