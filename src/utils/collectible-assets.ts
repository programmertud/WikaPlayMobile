import { Platform } from 'react-native';
import { LEARNING_CATEGORIES } from '../data/categories';
import { VocabularyItem } from '../types';
import { COLLECTIBLE_NARRATION_AUDIO, COLLECTIBLE_NARRATION_WEB_PATHS } from '../data/collectible-audio';

/**
 * Maps a Collectible (from backend API or session) to its corresponding
 * bundled flashcard VocabularyItem (image, audio, emoji, colorCode).
 */
export function getCollectibleVisual(item?: {
  filipino_name?: string;
  name?: string;
  slug?: string;
} | null): VocabularyItem | undefined {
  if (!item) return undefined;

  const normF = (item.filipino_name || '').toLowerCase().trim();
  const normN = (item.name || '').toLowerCase().trim();
  const rawSlug = (item.slug || '').toLowerCase().replace(/_/g, '-');

  for (const cat of LEARNING_CATEGORIES) {
    const found = cat.items.find((vocab) => {
      const vF = vocab.filipino.toLowerCase().trim();
      const vE = vocab.english.toLowerCase().trim();
      const vId = vocab.id.toLowerCase().replace(/_/g, '-');

      return (
        vF === normF ||
        vE === normN ||
        vId === rawSlug ||
        rawSlug.endsWith(vF.replace(/\s+/g, '-')) ||
        rawSlug.replace(/^cat-/, '') === vId
      );
    });
    if (found) return found;
  }

  return undefined;
}

/**
 * Returns the resolved Image source for a Collectible:
 * Prefers bundled high-resolution local asset if matched,
 * otherwise falls back to remote image_url object or undefined.
 */
export function getCollectibleImageSource(item?: {
  filipino_name?: string;
  name?: string;
  slug?: string;
  image_url?: string | null;
} | null): any {
  if (!item) return null;

  const visual = getCollectibleVisual(item);
  if (visual?.image) {
    return visual.image;
  }

  if (item.image_url && typeof item.image_url === 'string' && item.image_url.startsWith('http')) {
    return { uri: item.image_url };
  }

  return null;
}

/**
 * Returns the resolved Audio source for a Collectible:
 * 1. Prefers bundled description narration (.m4a) asset,
 * 2. Falls back to bundled local vocabulary pronunciation MP3 asset,
 * 3. Falls back to remote audio_url string or null.
 */
export function getCollectibleAudioSource(item?: {
  filipino_name?: string;
  name?: string;
  slug?: string;
  audio_url?: string | null;
} | null): any {
  if (!item) return null;

  const normF = (item.filipino_name || '').toLowerCase().trim();
  const rawSlug = (item.slug || '').toLowerCase().replace(/_/g, '-');
  const cleanKey = rawSlug.replace(/^hayop-|^prutas-|^gulay-|^kulay-|^katawan-|^hugis-|^bilang-|^pagbati-/, '');

  // 1. On Web, prefer direct web paths from public/audio to guarantee .m4a narration playback
  if (Platform.OS === 'web') {
    if (COLLECTIBLE_NARRATION_WEB_PATHS[rawSlug]) {
      return COLLECTIBLE_NARRATION_WEB_PATHS[rawSlug];
    }
    if (COLLECTIBLE_NARRATION_WEB_PATHS[normF]) {
      return COLLECTIBLE_NARRATION_WEB_PATHS[normF];
    }
    if (COLLECTIBLE_NARRATION_WEB_PATHS[cleanKey]) {
      return COLLECTIBLE_NARRATION_WEB_PATHS[cleanKey];
    }
  }

  // 2. Prefer full description voice narration audio (.m4a) for Native Android APK / iOS
  if (COLLECTIBLE_NARRATION_AUDIO[rawSlug]) {
    return COLLECTIBLE_NARRATION_AUDIO[rawSlug];
  }
  if (COLLECTIBLE_NARRATION_AUDIO[normF]) {
    return COLLECTIBLE_NARRATION_AUDIO[normF];
  }
  if (COLLECTIBLE_NARRATION_AUDIO[cleanKey]) {
    return COLLECTIBLE_NARRATION_AUDIO[cleanKey];
  }

  const visual = getCollectibleVisual(item);
  if (visual?.audio) {
    return visual.audio;
  }

  if (item.audio_url && typeof item.audio_url === 'string' && item.audio_url.startsWith('http')) {
    return item.audio_url;
  }

  return null;
}

export { getCollectibleDescription, COLLECTIBLE_DESCRIPTIONS } from '../data/collectible-descriptions';

