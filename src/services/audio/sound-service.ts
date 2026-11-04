import { Asset } from 'expo-asset';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Image, Platform } from 'react-native';
import { bgm, useBgmDuck } from './bgm-service';
import { LEARNING_CATEGORIES } from '../../data/categories';
import { ALL_MADALI_AUDIO, ALL_MADALI_WEB_PATHS } from '../../utils/quiz-madali-audio';
import { COLLECTIBLE_NARRATION_AUDIO, COLLECTIBLE_NARRATION_WEB_PATHS } from '../../data/collectible-audio';

export { bgm, useBgmDuck };



// Centralized dictionary of all local audio assets across all 8 learning categories
export const LOCAL_AUDIO_ASSETS: Record<string, any> = {};

// Register every audio recording from all categories
LEARNING_CATEGORIES.forEach((category) => {
  category.items.forEach((item) => {
    if (item.audio) {
      LOCAL_AUDIO_ASSETS[item.id] = item.audio;
      LOCAL_AUDIO_ASSETS[`${item.id}.mp3`] = item.audio;

      const fil = item.filipino.toLowerCase().trim();
      LOCAL_AUDIO_ASSETS[fil] = item.audio;
      LOCAL_AUDIO_ASSETS[`${fil}.mp3`] = item.audio;

      // Map category-prefixed combinations used by backend seeder and APIs
      // e.g. "mga-gulay_ampalaya", "gulay_ampalaya", "cat_gulay_ampalaya"
      const catSlug = category.slug.toLowerCase().trim();
      LOCAL_AUDIO_ASSETS[`${catSlug}_${fil}`] = item.audio;
      LOCAL_AUDIO_ASSETS[`${catSlug}_${fil}.mp3`] = item.audio;

      const slugNoMga = catSlug.replace(/^mga[-_]/, '');
      LOCAL_AUDIO_ASSETS[`${slugNoMga}_${fil}`] = item.audio;
      LOCAL_AUDIO_ASSETS[`${slugNoMga}_${fil}.mp3`] = item.audio;

      if (category.id) {
        LOCAL_AUDIO_ASSETS[`${category.id}_${fil}`] = item.audio;
        LOCAL_AUDIO_ASSETS[`${category.id}_${fil}.mp3`] = item.audio;
      }

      // Handle hyphens and spaces
      const noHyphen = fil.replace(/-/g, ' ');
      LOCAL_AUDIO_ASSETS[noHyphen] = item.audio;
      LOCAL_AUDIO_ASSETS[`${noHyphen}.mp3`] = item.audio;

      const withHyphen = fil.replace(/\s+/g, '-');
      LOCAL_AUDIO_ASSETS[withHyphen] = item.audio;
      LOCAL_AUDIO_ASSETS[`${withHyphen}.mp3`] = item.audio;

      // Also capitalize first letter
      const cap = fil.charAt(0).toUpperCase() + fil.slice(1);
      LOCAL_AUDIO_ASSETS[cap] = item.audio;
      LOCAL_AUDIO_ASSETS[`${cap}.mp3`] = item.audio;
    }
  });
});

// Explicit aliases for buko and niyog
if (LOCAL_AUDIO_ASSETS['prutas_buko']) {
  const bukoAsset = LOCAL_AUDIO_ASSETS['prutas_buko'];
  LOCAL_AUDIO_ASSETS['niyog'] = bukoAsset;
  LOCAL_AUDIO_ASSETS['niyog.mp3'] = bukoAsset;
  LOCAL_AUDIO_ASSETS['Niyog.mp3'] = bukoAsset;
  LOCAL_AUDIO_ASSETS['prutas_niyog'] = bukoAsset;
  LOCAL_AUDIO_ASSETS['prutas_niyog.mp3'] = bukoAsset;
  LOCAL_AUDIO_ASSETS['mga-prutas_niyog'] = bukoAsset;
  LOCAL_AUDIO_ASSETS['mga-prutas_niyog.mp3'] = bukoAsset;
  LOCAL_AUDIO_ASSETS['buko'] = bukoAsset;
  LOCAL_AUDIO_ASSETS['buko.mp3'] = bukoAsset;
  LOCAL_AUDIO_ASSETS['Buko.mp3'] = bukoAsset;
}

// Backward-compatible HAYOP_AUDIO_ASSETS export
export const HAYOP_AUDIO_ASSETS: Record<string, any> = {};
const hayopCategory = LEARNING_CATEGORIES.find((c) => c.id === 'cat_hayop');
if (hayopCategory) {
  hayopCategory.items.forEach((item) => {
    if (item.audio) {
      const shortName = item.filipino.toLowerCase().trim();
      HAYOP_AUDIO_ASSETS[shortName] = item.audio;
    }
  });
}

// Official Voice-Over Feedback Assets for WikaPlay
export const VOICE_OVER_FEEDBACK_ASSETS: Record<string, any> = {
  tama: require('../../../assets/audio/VOICE OVERS/tama.mp3'),
  magaling: require('../../../assets/audio/VOICE OVERS/magaling.mp3'),
  anggalingmo: require('../../../assets/audio/VOICE OVERS/anggalingmo.mp3'),
  'ang galing mo': require('../../../assets/audio/VOICE OVERS/anggalingmo.mp3'),
  mali: require('../../../assets/audio/VOICE OVERS/mali.mp3'),
  oopsmali: require('../../../assets/audio/VOICE OVERS/oopsmali.mp3'),
  'oops mali': require('../../../assets/audio/VOICE OVERS/oopsmali.mp3'),
  subukanulit: require('../../../assets/audio/VOICE OVERS/subukan ulit.mp3'),
  'subukan ulit': require('../../../assets/audio/VOICE OVERS/subukan ulit.mp3'),
};

// Register all feedback voice-overs into LOCAL_AUDIO_ASSETS
Object.entries(VOICE_OVER_FEEDBACK_ASSETS).forEach(([key, asset]) => {
  LOCAL_AUDIO_ASSETS[key] = asset;
  LOCAL_AUDIO_ASSETS[`${key}.mp3`] = asset;
  const noSpace = key.replace(/[\s_-]+/g, '');
  LOCAL_AUDIO_ASSETS[noSpace] = asset;
  LOCAL_AUDIO_ASSETS[`${noSpace}.mp3`] = asset;
});

// Register all Madali quiz voice audios into LOCAL_AUDIO_ASSETS
Object.entries(ALL_MADALI_AUDIO).forEach(([key, asset]) => {
  LOCAL_AUDIO_ASSETS[key] = asset;
  LOCAL_AUDIO_ASSETS[`${key}.mp3`] = asset;
});


let isAudioModeConfigured = false;
let currentActivePlayer: any = null;
let currentActiveCleanup: (() => void) | null = null;

export async function setupAudioSession() {
  if (isAudioModeConfigured) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
    });
    isAudioModeConfigured = true;
  } catch {
    // Audio session warning ignored
  }
}

/**
 * Web Audio synthesizer for feedback sounds (chimes for correct, gentle tone for wrong)
 */
function playSynthesizedFeedback(isCorrect: boolean, onFinished?: () => void) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const now = ctx.currentTime;

        if (isCorrect) {
          // Cheerful ascending arpeggio chime (C5 -> E5 -> G5)
          const notes = [523.25, 659.25, 783.99];
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.1);

            gain.gain.setValueAtTime(0, now + idx * 0.1);
            gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.1 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.35);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + idx * 0.1);
            osc.stop(now + idx * 0.1 + 0.4);
          });
          setTimeout(() => {
            try {
              ctx.close();
            } catch {}
            onFinished?.();
          }, 600);
          return;
        } else {
          // Gentle low double-tone for wrong answer
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(220, now);
          osc.frequency.setValueAtTime(196, now + 0.12);

          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(now);
          osc.stop(now + 0.4);

          setTimeout(() => {
            try {
              ctx.close();
            } catch {}
            onFinished?.();
          }, 450);
          return;
        }
      }
    } catch {}
  }

  // Safe fallback completion without any AI speech voice
  setTimeout(() => {
    onFinished?.();
  }, 300);
}

// Static Web paths for voice-over feedback
export const VOICE_OVER_WEB_PATHS: Record<string, string> = {
  tama: '/audio/VOICE OVERS/tama.mp3',
  magaling: '/audio/VOICE OVERS/magaling.mp3',
  anggalingmo: '/audio/VOICE OVERS/anggalingmo.mp3',
  'ang galing mo': '/audio/VOICE OVERS/anggalingmo.mp3',
  mali: '/audio/VOICE OVERS/mali.mp3',
  oopsmali: '/audio/VOICE OVERS/oopsmali.mp3',
  'oops mali': '/audio/VOICE OVERS/oopsmali.mp3',
  subukanulit: '/audio/VOICE OVERS/subukan ulit.mp3',
  'subukan ulit': '/audio/VOICE OVERS/subukan ulit.mp3',
};

// Static Web paths for vocabulary flashcards across all 8 learning categories
export const VOCABULARY_WEB_PATHS: Record<string, string> = {};

LEARNING_CATEGORIES.forEach((category) => {
  category.items.forEach((item) => {
    const fil = item.filipino.toLowerCase().trim();
    const cap = fil.charAt(0).toUpperCase() + fil.slice(1);

    let folder = '';
    let isLower = false;
    const catId = category.id;
    if (catId === 'cat_hayop') {
      folder = 'HAYOP';
    } else if (catId === 'cat_prutas') {
      folder = 'PRUTAS';
    } else if (catId === 'cat_gulay') {
      folder = 'GULAY';
    } else if (catId === 'cat_kulay') {
      folder = 'KULAY';
    } else if (catId === 'cat_hugis') {
      folder = 'HUGIS';
      isLower = true;
    } else if (catId === 'cat_bilang') {
      folder = 'NUMERO';
    } else if (catId === 'cat_katawan') {
      folder = 'PARTE NG KATAWAN';
      isLower = true;
    } else if (catId === 'cat_pagbati') {
      folder = 'MGA BATIAN';
      isLower = true;
    }

    if (folder) {
      const fileName = isLower ? fil : cap;
      const finalPath = `/audio/${folder}/${fileName}.mp3`;
      VOCABULARY_WEB_PATHS[item.id] = finalPath;
      VOCABULARY_WEB_PATHS[`${item.id}.mp3`] = finalPath;
      VOCABULARY_WEB_PATHS[fil] = finalPath;
      VOCABULARY_WEB_PATHS[`${fil}.mp3`] = finalPath;
      VOCABULARY_WEB_PATHS[cap] = finalPath;
      VOCABULARY_WEB_PATHS[`${cap}.mp3`] = finalPath;
      VOCABULARY_WEB_PATHS[`${category.slug}_${fil}`] = finalPath;
      VOCABULARY_WEB_PATHS[`${category.slug}_${fil}.mp3`] = finalPath;
    }
  });
});

// Explicit aliases and overrides for special vocabulary recordings
// Prutas: buko uses Niyog.mp3, balimbing has normalized names
VOCABULARY_WEB_PATHS['prutas_buko'] = '/audio/PRUTAS/Niyog.mp3';
VOCABULARY_WEB_PATHS['prutas_buko.mp3'] = '/audio/PRUTAS/Niyog.mp3';
VOCABULARY_WEB_PATHS['buko'] = '/audio/PRUTAS/Niyog.mp3';
VOCABULARY_WEB_PATHS['buko.mp3'] = '/audio/PRUTAS/Niyog.mp3';
VOCABULARY_WEB_PATHS['prutas_niyog'] = '/audio/PRUTAS/Niyog.mp3';
VOCABULARY_WEB_PATHS['prutas_niyog.mp3'] = '/audio/PRUTAS/Niyog.mp3';
VOCABULARY_WEB_PATHS['niyog'] = '/audio/PRUTAS/Niyog.mp3';
VOCABULARY_WEB_PATHS['niyog.mp3'] = '/audio/PRUTAS/Niyog.mp3';
VOCABULARY_WEB_PATHS['mga-prutas_buko'] = '/audio/PRUTAS/Niyog.mp3';
VOCABULARY_WEB_PATHS['mga-prutas_buko.mp3'] = '/audio/PRUTAS/Niyog.mp3';
VOCABULARY_WEB_PATHS['mga-prutas_niyog'] = '/audio/PRUTAS/Niyog.mp3';
VOCABULARY_WEB_PATHS['mga-prutas_niyog.mp3'] = '/audio/PRUTAS/Niyog.mp3';

VOCABULARY_WEB_PATHS['prutas_balimbing'] = '/audio/PRUTAS/Balimbing.mp3';
VOCABULARY_WEB_PATHS['prutas_balimbing.mp3'] = '/audio/PRUTAS/Balimbing.mp3';
VOCABULARY_WEB_PATHS['balimbing'] = '/audio/PRUTAS/Balimbing.mp3';
VOCABULARY_WEB_PATHS['balimbing.mp3'] = '/audio/PRUTAS/Balimbing.mp3';
VOCABULARY_WEB_PATHS['balimbing .mp3'] = '/audio/PRUTAS/Balimbing.mp3';
VOCABULARY_WEB_PATHS['mga-prutas_balimbing'] = '/audio/PRUTAS/Balimbing.mp3';
VOCABULARY_WEB_PATHS['mga-prutas_balimbing.mp3'] = '/audio/PRUTAS/Balimbing.mp3';

VOCABULARY_WEB_PATHS['gulay_sibuyas'] = '/audio/GULAY/Sibuyas.mp3';
VOCABULARY_WEB_PATHS['gulay_sibuyas.mp3'] = '/audio/GULAY/Sibuyas.mp3';
VOCABULARY_WEB_PATHS['sibuyas'] = '/audio/GULAY/Sibuyas.mp3';
VOCABULARY_WEB_PATHS['sibuyas.mp3'] = '/audio/GULAY/Sibuyas.mp3';
VOCABULARY_WEB_PATHS['sibuyas .mp3'] = '/audio/GULAY/Sibuyas.mp3';
VOCABULARY_WEB_PATHS['mga-gulay_sibuyas'] = '/audio/GULAY/Sibuyas.mp3';
VOCABULARY_WEB_PATHS['mga-gulay_sibuyas.mp3'] = '/audio/GULAY/Sibuyas.mp3';

VOCABULARY_WEB_PATHS['hugis_silindro'] = '/audio/HUGIS/silindro.mp3';
VOCABULARY_WEB_PATHS['hugis_silindro.mp3'] = '/audio/HUGIS/silindro.mp3';
VOCABULARY_WEB_PATHS['silindro'] = '/audio/HUGIS/silindro.mp3';
VOCABULARY_WEB_PATHS['silindro.mp3'] = '/audio/HUGIS/silindro.mp3';
VOCABULARY_WEB_PATHS['silindro .mp3'] = '/audio/HUGIS/silindro.mp3';
VOCABULARY_WEB_PATHS['mga-hugis_silindro'] = '/audio/HUGIS/silindro.mp3';
VOCABULARY_WEB_PATHS['mga-hugis_silindro.mp3'] = '/audio/HUGIS/silindro.mp3';

// Unlock browser audio upon first user gesture
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const unlockAudioContext = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      }
    } catch {}
    window.removeEventListener('click', unlockAudioContext);
    window.removeEventListener('touchstart', unlockAudioContext);
    window.removeEventListener('keydown', unlockAudioContext);
  };
  window.addEventListener('click', unlockAudioContext, { once: true, passive: true });
  window.addEventListener('touchstart', unlockAudioContext, { once: true, passive: true });
  window.addEventListener('keydown', unlockAudioContext, { once: true, passive: true });
}

/**
 * Resolve an audio key or URL to a playable source
 */
export function resolveAudioSource(source: string | any): any {
  if (!source) return null;

  if (typeof source !== 'string') return source;

  // Extract base filename if it has path elements (e.g. "https://wikaplay-api.../audio/mga-hayop_aso.mp3" -> "mga-hayop_aso.mp3")
  const rawTrim = source.trim();
  const filename = rawTrim.split('/').pop()?.split('?')[0] || rawTrim;
  const noExt = filename.replace(/\.(mp3|m4a|wav|ogg)$/i, '').toLowerCase().trim();

  // If source already starts with /audio/ AND includes a known category subdirectory, return directly
  // e.g. /audio/HAYOP/Aso.mp3 → OK, but /audio/mga-hayop_aso.mp3 → must NOT short-circuit (needs remapping)
  if (rawTrim.startsWith('/audio/') || rawTrim.startsWith('audio/')) {
    const normalized = rawTrim.startsWith('/') ? rawTrim : `/${rawTrim}`;
    // Only short-circuit if it already has a proper category subfolder path
    const hasCategory = /^\/audio\/(HAYOP|PRUTAS|GULAY|KULAY|HUGIS|NUMERO|PARTE NG KATAWAN|MGA BATIAN|VOICE OVERS|BATIAN)\//i.test(normalized);
    if (hasCategory) return normalized;
    // Otherwise fall through to VOCABULARY_WEB_PATHS and LOCAL_AUDIO_ASSETS for remapping
  }

  // On Web, prefer direct web paths from public/audio to avoid Metro unstable_path 404s
  if (Platform.OS === 'web') {
    // 1. Feedback sounds (tama, mali, magaling)
    if (VOICE_OVER_WEB_PATHS[noExt]) return VOICE_OVER_WEB_PATHS[noExt];
    if (VOICE_OVER_WEB_PATHS[rawTrim]) return VOICE_OVER_WEB_PATHS[rawTrim];

    // 2. Madali quiz prompt voice audios
    if (ALL_MADALI_WEB_PATHS[rawTrim] || ALL_MADALI_WEB_PATHS[filename] || ALL_MADALI_WEB_PATHS[noExt]) {
      return ALL_MADALI_WEB_PATHS[rawTrim] || ALL_MADALI_WEB_PATHS[filename] || ALL_MADALI_WEB_PATHS[noExt];
    }

    // 3. Vocabulary flashcards pronunciation (CRITICAL: checked BEFORE collectible narration so 'abukado' plays Abukado.mp3, NOT the long story!)
    if (VOCABULARY_WEB_PATHS[rawTrim] || VOCABULARY_WEB_PATHS[filename] || VOCABULARY_WEB_PATHS[noExt]) {
      return VOCABULARY_WEB_PATHS[rawTrim] || VOCABULARY_WEB_PATHS[filename] || VOCABULARY_WEB_PATHS[noExt];
    }

    // 4. Collectible story narration (.m4a) — only for collectible cards/slugs
    if (COLLECTIBLE_NARRATION_WEB_PATHS[rawTrim] || COLLECTIBLE_NARRATION_WEB_PATHS[filename] || COLLECTIBLE_NARRATION_WEB_PATHS[noExt]) {
      return COLLECTIBLE_NARRATION_WEB_PATHS[rawTrim] || COLLECTIBLE_NARRATION_WEB_PATHS[filename] || COLLECTIBLE_NARRATION_WEB_PATHS[noExt];
    }
  }

  // 1. Check local bundled audio assets (solves abukado and all 151 vocabulary words on mobile APK)
  if (LOCAL_AUDIO_ASSETS[filename]) return LOCAL_AUDIO_ASSETS[filename];
  if (LOCAL_AUDIO_ASSETS[noExt]) return LOCAL_AUDIO_ASSETS[noExt];
  if (LOCAL_AUDIO_ASSETS[`${noExt}.mp3`]) return LOCAL_AUDIO_ASSETS[`${noExt}.mp3`];

  // 2. Strip prefixes like "mga-gulay_", "gulay_", "mga-hayop_", etc.
  const strippedPrefix = noExt.replace(/^(mga[-_])?(hayop|prutas|gulay|kulay|hugis|bilang|katawan|bahagi-ng-katawan|pagbati|numero)[-_]/, '');
  if (LOCAL_AUDIO_ASSETS[strippedPrefix]) return LOCAL_AUDIO_ASSETS[strippedPrefix];
  if (LOCAL_AUDIO_ASSETS[`${strippedPrefix}.mp3`]) return LOCAL_AUDIO_ASSETS[`${strippedPrefix}.mp3`];

  // 3. Suffix after underscore (e.g. "mga-hayop_aso" -> "aso")
  if (noExt.includes('_')) {
    const afterUnderscore = noExt.split('_').pop() || '';
    if (LOCAL_AUDIO_ASSETS[afterUnderscore]) return LOCAL_AUDIO_ASSETS[afterUnderscore];
    if (LOCAL_AUDIO_ASSETS[`${afterUnderscore}.mp3`]) return LOCAL_AUDIO_ASSETS[`${afterUnderscore}.mp3`];
  }

  // 4. Madali audio dictionary
  if (ALL_MADALI_AUDIO[rawTrim] || ALL_MADALI_AUDIO[filename] || ALL_MADALI_AUDIO[noExt] || ALL_MADALI_AUDIO[strippedPrefix]) {
    return ALL_MADALI_AUDIO[rawTrim] || ALL_MADALI_AUDIO[filename] || ALL_MADALI_AUDIO[noExt] || ALL_MADALI_AUDIO[strippedPrefix];
  }

  // 5. Collectible story narration audio (.m4a)
  if (COLLECTIBLE_NARRATION_AUDIO[filename]) return COLLECTIBLE_NARRATION_AUDIO[filename];
  if (COLLECTIBLE_NARRATION_AUDIO[noExt]) return COLLECTIBLE_NARRATION_AUDIO[noExt];

  // 6. Web static paths fallback
  if (Platform.OS === 'web') {
    if (VOICE_OVER_WEB_PATHS[noExt]) return VOICE_OVER_WEB_PATHS[noExt];
    if (VOCABULARY_WEB_PATHS[noExt]) return VOCABULARY_WEB_PATHS[noExt];
    if (COLLECTIBLE_NARRATION_WEB_PATHS[rawTrim]) return COLLECTIBLE_NARRATION_WEB_PATHS[rawTrim];
    if (COLLECTIBLE_NARRATION_WEB_PATHS[noExt]) return COLLECTIBLE_NARRATION_WEB_PATHS[noExt];
    if (ALL_MADALI_WEB_PATHS[rawTrim]) return ALL_MADALI_WEB_PATHS[rawTrim];
    if (ALL_MADALI_WEB_PATHS[noExt]) return ALL_MADALI_WEB_PATHS[noExt];
  }

  // 7. Custom uploaded audio files (http/https remote URLs that teacher recorded/uploaded)
  if (
    rawTrim.startsWith('/') ||
    rawTrim.startsWith('./') ||
    rawTrim.startsWith('http://') ||
    rawTrim.startsWith('https://') ||
    rawTrim.startsWith('data:') ||
    rawTrim.startsWith('blob:')
  ) {
    return rawTrim;
  }

  return null;
}

/**
 * Speech synthesis is completely disabled â€” AI voice removed per requirements.
 * Only pre-recorded human voice audios are used in WikaPlay.
 */
export function speakWordWeb(_text: string, onFinished?: () => void): (() => void) | null {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
  setTimeout(() => {
    onFinished?.();
  }, 100);
  return null;
}

/**
 * Play a sound source (URL or local require asset) with completion callback and safe recovery timeout.
 */
export async function playSound(
  source: string | any,
  onFinished?: () => void
): Promise<() => void> {
  await setupAudioSession();

  // Stop any currently active voice playback
  stopCurrentSound();

  let isCancelled = false;
  let player: any = null;
  let fallbackTimer: any = null;
  let hasRestoredBgm = false;

  // Minimize BGM (@happy.mp3) sound so voice recording / sound effect is loud and clear
  bgm.minimize();

  const restoreBgmOnce = () => {
    if (!hasRestoredBgm) {
      hasRestoredBgm = true;
      bgm.restore();
    }
  };

  const cleanup = () => {
    isCancelled = true;
    restoreBgmOnce();
    if (fallbackTimer) clearTimeout(fallbackTimer);
    if (player) {
      try {
        player.pause();
        if (typeof player.remove === 'function') {
          player.remove();
        } else {
          player.src = '';
        }
      } catch {}
      player = null;
    }
    if (currentActivePlayer === player) {
      currentActivePlayer = null;
    }
    if (currentActiveCleanup === cleanup) {
      currentActiveCleanup = null;
    }
  };

  currentActiveCleanup = cleanup;

  try {
    const resolvedSource = resolveAudioSource(source);

    // If source could not be resolved from local assets or valid URL
    if (!resolvedSource) {
      restoreBgmOnce();
      setTimeout(() => {
        if (!isCancelled) onFinished?.();
      }, 300);
      return cleanup;
    }

    if (Platform.OS === 'web') {
      let webUri = '';
      if (typeof resolvedSource === 'string') {
        webUri = resolvedSource;
      } else if (
        typeof resolvedSource === 'object' &&
        resolvedSource !== null &&
        (resolvedSource.default || resolvedSource.uri)
      ) {
        webUri = resolvedSource.default || resolvedSource.uri;
      }

      // Handle numeric require() module IDs â€” common when question.audio is a require() asset on web
      if (!webUri && typeof resolvedSource === 'number') {
        try {
          const resolved = Image.resolveAssetSource?.(resolvedSource);
          webUri = resolved?.uri || '';
        } catch {}
      }

      // Try Asset.fromModule as secondary resolution for number/object assets
      if (!webUri && (typeof resolvedSource === 'number' || (typeof resolvedSource === 'object' && resolvedSource !== null))) {
        try {
          const asset = Asset.fromModule(resolvedSource);
          if (asset.uri) {
            webUri = asset.uri;
          } else {
            await asset.downloadAsync();
            webUri = asset.localUri || asset.uri || '';
          }
        } catch {}
      }

      // If still no URI and source was a string, try web path maps
      if (!webUri && typeof source === 'string') {
        const clean = source.trim().toLowerCase();
        webUri =
          VOICE_OVER_WEB_PATHS[clean] ||
          ALL_MADALI_WEB_PATHS[clean] ||
          COLLECTIBLE_NARRATION_WEB_PATHS[clean] ||
          VOCABULARY_WEB_PATHS[clean] ||
          '';
      }

      // Check COLLECTIBLE_NARRATION_AUDIO if source is a number, find its key and use web path
      if (!webUri && typeof source === 'number') {
        for (const [key, asset] of Object.entries(COLLECTIBLE_NARRATION_AUDIO)) {
          if (asset === source) {
            webUri = COLLECTIBLE_NARRATION_WEB_PATHS[key] || '';
            break;
          }
        }
      }

      // Check ALL_MADALI_AUDIO if source is a number, find its key and use web path
      if (!webUri && typeof source === 'number') {
        for (const [key, asset] of Object.entries(ALL_MADALI_AUDIO)) {
          if (asset === source) {
            webUri = ALL_MADALI_WEB_PATHS[key] || '';
            break;
          }
        }
      }

      // Normalize Metro web asset URLs to public folder URLs
      if (webUri) {
        if (webUri.includes('unstable_path=')) {
          try {
            const match = webUri.match(/unstable_path=([^&]+)/);
            if (match) {
              const decoded = decodeURIComponent(match[1]);
              const audioIdx = decoded.toLowerCase().indexOf('assets/audio/');
              if (audioIdx !== -1) {
                webUri = '/' + decoded.substring(audioIdx).replace(/\\/g, '/').replace(/^assets\//i, '');
              } else {
                webUri = decoded.replace(/^.*?assets\/audio\//i, '/audio/').replace(/\\/g, '/');
              }
            }
          } catch {}
        }
        if (webUri.includes('assets/audio/')) {
          webUri = webUri.replace(/^.*?assets\/audio\//i, '/audio/').replace(/\\/g, '/');
        }

        // Rewrite localhost storage URLs to live Render backend
        if (webUri.startsWith('http://localhost/storage/') || webUri.startsWith('https://localhost/storage/')) {
          webUri = webUri.replace(/https?:\/\/localhost\/storage\//, 'https://wikaplay-api.onrender.com/storage/');
        } else if (webUri.startsWith('/storage/')) {
          webUri = `https://wikaplay-api.onrender.com${webUri}`;
        }
      }

      if (webUri) {
        const audio = new Audio(encodeURI(webUri));
        player = audio;
        currentActivePlayer = audio;
        audio.volume = 1.0;

        let hasFinished = false;
        const finish = () => {
          if (hasFinished) return;
          hasFinished = true;
          restoreBgmOnce();
          if (fallbackTimer) clearTimeout(fallbackTimer);
          if (currentActivePlayer === audio) {
            currentActivePlayer = null;
          }
          if (!isCancelled) onFinished?.();
        };

        audio.onended = () => {
          finish();
        };

        audio.onerror = (e) => {
          console.warn('[SoundService] Web audio error for:', webUri, e);
          finish();
        };

        audio.play().catch((err) => {
          // Autoplay policy or gesture required
          console.warn('[SoundService] Play notice:', err?.message || err);
          finish();
        });

        audio.onloadedmetadata = () => {
          if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
            if (fallbackTimer) clearTimeout(fallbackTimer);
            fallbackTimer = setTimeout(() => {
              if (!isCancelled) finish();
            }, Math.max(25000, Math.ceil((audio.duration + 4) * 1000)));
          }
        };

        fallbackTimer = setTimeout(() => {
          if (!isCancelled) finish();
        }, 25000);

        return cleanup;
      }

      // Safe fallback on web when audio cannot be played
      setTimeout(() => {
        if (!isCancelled) onFinished?.();
      }, 300);
      return cleanup;
    }

    // Native mobile playback using expo-audio
    // createAudioPlayer requires { uri } object for remote HTTPS URLs — not a bare string
    let nativeSource = resolvedSource;
    if (typeof resolvedSource === 'string' && (resolvedSource.startsWith('http://') || resolvedSource.startsWith('https://'))) {
      nativeSource = { uri: resolvedSource };
    }
    player = createAudioPlayer(nativeSource, {
      downloadFirst: true,
    });
    currentActivePlayer = player;

    let hasFinished = false;
    const finish = () => {
      if (hasFinished) return;
      hasFinished = true;
      cleanup();
      onFinished?.();
    };

    // Listen for actual playback completion event from native player
    try {
      player.addListener('playbackStatusUpdate', (status: any) => {
        if (status?.didJustFinish && !isCancelled) {
          finish();
        }
      });
    } catch {}

    // Safe fallback timeout (25s) ensures long voice descriptions (e.g. atis.m4a at ~10s, kahel.m4a at ~13s) play completely
    fallbackTimer = setTimeout(() => {
      if (!isCancelled) {
        finish();
      }
    }, 25000);

    player.play();

    return cleanup;
  } catch (err) {
    console.warn('[SoundService] Playback error:', err);
    cleanup();
    setTimeout(() => {
      if (!isCancelled) onFinished?.();
    }, 300);
    return cleanup;
  }
}

export function stopCurrentSound() {
  if (currentActiveCleanup) {
    const fn = currentActiveCleanup;
    currentActiveCleanup = null;
    try {
      fn();
    } catch {}
  }
  if (currentActivePlayer) {
    try {
      currentActivePlayer.pause();
      if (typeof currentActivePlayer.remove === 'function') {
        currentActivePlayer.remove();
      } else {
        currentActivePlayer.src = '';
      }
    } catch {}
    currentActivePlayer = null;
  }
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
  bgm.restore();
}

export async function playLocalSound(soundName: string, onFinished?: () => void) {
  return playSound(soundName, onFinished);
}

/**
 * Pronounce a vocabulary item: plays its assigned native MP3 recording from assets/audio/,
 * or speaks its Filipino word via TTS as a last resort.
 */
export async function playVocabularyItem(
  item: { id?: string; filipino: string; audioUri?: string | null; audio?: any },
  onFinished?: () => void
) {
  // 1. Direct audioUri (custom recording or upload by teacher)
  if (item.audioUri) {
    return playSound(item.audioUri, onFinished);
  }

  // On Web, check direct web path first to avoid Metro bundler packager 404s
  if (Platform.OS === 'web') {
    const fil = item.filipino?.toLowerCase().trim();
    if (fil && VOCABULARY_WEB_PATHS[fil]) {
      return playSound(VOCABULARY_WEB_PATHS[fil], onFinished);
    }
    if (item.id && VOCABULARY_WEB_PATHS[item.id]) {
      return playSound(VOCABULARY_WEB_PATHS[item.id], onFinished);
    }
  }

  // 2. Direct audio asset attached to item (e.g. require('../../assets/audio/...'))
  if (item.audio) {
    return playSound(item.audio, onFinished);
  }

  // 3. Try item ID lookup in LOCAL_AUDIO_ASSETS
  if (item.id) {
    const byId = resolveAudioSource(item.id);
    if (byId) {
      return playSound(byId, onFinished);
    }
  }

  // 4. Try Filipino word lookup in LOCAL_AUDIO_ASSETS
  const byWord = resolveAudioSource(item.filipino);
  if (byWord) {
    return playSound(byWord, onFinished);
  }

  // 5. Fall back to speech pronunciation of the Filipino word
  return playSound(item.filipino, onFinished);
}

export type FeedbackAudioKey = 'tama' | 'magaling' | 'anggalingmo' | 'mali' | 'oopsmali';

/**
 * Streak feedback audio resolver according to WikaPlay rules:
 * Correct Streak:
 *   1st: 'tama'
 *   2nd: 'magaling'
 *   3rd+: 'anggalingmo'
 * Wrong Streak:
 *   1st: 'mali'
 *   2nd+: 'oopsmali'
 */
export function getFeedbackAudio(isCorrect: boolean, streak: number): FeedbackAudioKey {
  if (isCorrect) {
    if (streak <= 1) return 'tama';
    if (streak === 2) return 'magaling';
    return 'anggalingmo';
  } else {
    if (streak <= 1) return 'mali';
    return 'oopsmali';
  }
}

/**
 * Explicitly play a voice-over feedback sound with fallback
 */
export async function playFeedbackSound(
  soundKey: FeedbackAudioKey | string,
  onFinished?: () => void
): Promise<() => void> {
  const normalizedKey = soundKey.toLowerCase().replace(/[\s_-]+/g, '');

  // On web, use static paths from public/audio directly to bypass Asset resolution issues
  if (Platform.OS === 'web') {
    const webPath = VOICE_OVER_WEB_PATHS[normalizedKey] || VOICE_OVER_WEB_PATHS[soundKey] || '';
    if (webPath) {
      return playSound(webPath, onFinished);
    }
    const isCorrectWeb = ['tama', 'magaling', 'anggalingmo'].includes(normalizedKey);
    playSynthesizedFeedback(isCorrectWeb, onFinished);
    return () => {};
  }

  const asset =
    VOICE_OVER_FEEDBACK_ASSETS[normalizedKey] ||
    VOICE_OVER_FEEDBACK_ASSETS[soundKey] ||
    resolveAudioSource(soundKey);

  if (asset) {
    return playSound(asset, onFinished);
  }

  // Graceful fallback to synthesized tones if file is unavailable
  const isCorrect = ['tama', 'magaling', 'anggalingmo'].includes(normalizedKey);
  playSynthesizedFeedback(isCorrect, onFinished);
  return () => {};
}

/**
 * Maligayang Pagdating audio voice recording (played when student logs in)
 */
export const MALIGAYANG_PAGDATING_AUDIO = require('../../../assets/audio/MGA BATIAN/maligayang pagdating.mp3');

export async function playWelcomeSound(onFinished?: () => void): Promise<() => void> {
  if (Platform.OS === 'web') {
    return playSound('/audio/MGA BATIAN/maligayang pagdating.mp3', onFinished);
  }
  return playSound(MALIGAYANG_PAGDATING_AUDIO, onFinished);
}

