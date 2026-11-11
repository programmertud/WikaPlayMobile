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

export async function prefetchAndCacheOfflineContent(sectionId?: number | null) {
  if (isSyncing) return;
  isSyncing = true;

  try {
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

          // Merge custom items with existing cache
          const prevRaw = await storage.getItem(`@wikaplay_custom_items_${slug}`);
          const prevCustom: VocabularyItem[] = prevRaw ? JSON.parse(prevRaw) : [];
          const mergedMap = new Map<string, VocabularyItem>();
          prevCustom.forEach((item) => mergedMap.set(item.filipino.toLowerCase().trim(), item));
          customItems.forEach((item) => mergedMap.set(item.filipino.toLowerCase().trim(), item));
          await storage.setItem(`@wikaplay_custom_items_${slug}`, JSON.stringify(Array.from(mergedMap.values())));
        }
      } catch {}

      // 2. Sync & cache Madali quiz
      try {
        const madaliRes = await categoryService.getQuizQuestions(slug, 'madali', sectionId);
        if (madaliRes?.questions && Array.isArray(madaliRes.questions)) {
          const localQuestions = getMadaliQuestionsBySlug(slug);
          const customQuestions = madaliRes.questions.filter((q: any) => {
            if (q.section_id) return true;
            const targetWord = (q.target_item_name || q.correct_answer || '').toLowerCase().trim();
            const isBase = cat.items.slice(0, 20).some((it) => it.filipino.toLowerCase().trim() === targetWord);
            return !isBase;
          });

          const letters = ['A', 'B', 'C', 'D'];
          const mapped = customQuestions.map((apiQ: any, idx: number) => {
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
            return {
              id: `api_${apiQ.id || idx}`,
              categoryId: `cat_${slug}`,
              categorySlug: slug,
              difficulty: 'madali',
              type: hasPic ? 'picture-id' : 'multiple-choice',
              questionFil: apiQ.question_text || 'Piliin ang tamang sagot.',
              questionEn: apiQ.question_text || '',
              textChoices,
              correctTextId: (correctIdx >= 0 ? letters[correctIdx] : 'A'),
              target_image_url: hasPic ? (resolveAvatarUrl(apiQ.target_image_url) || apiQ.target_image_url) : undefined,
              audio: apiQ.audio_url ? { uri: resolveAvatarUrl(apiQ.audio_url) || apiQ.audio_url } : undefined,
            };
          });

          const fullMadaliList = [...localQuestions, ...mapped];
          await storage.setItem(`@wikaplay_cached_madali_full_${slug}`, JSON.stringify(fullMadaliList));

          if (customQuestions.length > 0) {
            const prevRaw = await storage.getItem(`@wikaplay_cached_madali_custom_${slug}`);
            const prevList = prevRaw ? JSON.parse(prevRaw) : [];
            const mergedMap = new Map<string, any>();
            prevList.forEach((q: any) => mergedMap.set(q.id, q));
            mapped.forEach((q: any) => mergedMap.set(q.id, q));
            await storage.setItem(`@wikaplay_cached_madali_custom_${slug}`, JSON.stringify(Array.from(mergedMap.values())));
          }
        }
      } catch {}

      // 3. Sync & cache Katamtaman and Mahirap quizzes
      for (const diff of ['katamtaman', 'mahirap'] as const) {
        try {
          const quizRes = await categoryService.getQuizQuestions(slug, diff, sectionId);
          if (quizRes?.questions && Array.isArray(quizRes.questions) && quizRes.questions.length > 0) {
            // Deduplicate questions by target item name
            const seen = new Map<string, any>();
            quizRes.questions.forEach((q: any) => {
              const key = (q.target_item_name || q.correct_answer || '').toLowerCase().trim();
              if (!key) return;
              if (!seen.has(key) || (q.section_id && !seen.get(key).section_id)) {
                seen.set(key, q);
              }
            });
            const dedupedQuestions = Array.from(seen.values());
            await storage.setItem(`@wikaplay_cached_quiz_${slug}_${diff}`, JSON.stringify(dedupedQuestions));
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
