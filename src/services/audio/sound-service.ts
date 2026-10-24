import { Asset } from 'expo-asset';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Image, Platform } from 'react-native';
import { bgm, useBgmDuck } from './bgm-service';
import { LEARNING_CATEGORIES } from '../../data/categories';
import { ALL_MADALI_AUDIO, ALL_MADALI_WEB_PATHS } from '../../utils/quiz-madali-audio';

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

/**
 * Resolve an audio key or URL to a playable source
 */
export function resolveAudioSource(source: string | any): any {
  if (!source) return null;

  // On Web, prefer direct web paths from public/audio if matching ID or key
  if (Platform.OS === 'web' && typeof source === 'string') {
    const rawTrim = source.trim();
    const cleanKey = rawTrim.split('/').pop()?.replace(/\.mp3$/i, '').toLowerCase() || rawTrim;
    if (ALL_MADALI_WEB_PATHS[rawTrim]) return ALL_MADALI_WEB_PATHS[rawTrim];
    if (ALL_MADALI_WEB_PATHS[cleanKey]) return ALL_MADALI_WEB_PATHS[cleanKey];
    if (VOICE_OVER_WEB_PATHS[cleanKey]) return VOICE_OVER_WEB_PATHS[cleanKey];
  }

  if (typeof source !== 'string') return source;

  // Extract base filename if it has path elements (e.g. "audio/hayop_aso.mp3" -> "hayop_aso.mp3")
  const filename = source.split('/').pop() || source;
  const noExt = filename.replace(/\.mp3$/i, '').toLowerCase().trim();

  if (LOCAL_AUDIO_ASSETS[filename]) {
    return LOCAL_AUDIO_ASSETS[filename];
  }
  if (LOCAL_AUDIO_ASSETS[noExt]) {
    return LOCAL_AUDIO_ASSETS[noExt];
  }

  // Strip category prefix if passed (e.g. "prutas_abukado" -> "abukado")
  const stripped = noExt.replace(/^(hayop|prutas|gulay|kulay|hugis|bilang|katawan|pagbati)_/, '');
  if (LOCAL_AUDIO_ASSETS[stripped]) {
    return LOCAL_AUDIO_ASSETS[stripped];
  }
  if (LOCAL_AUDIO_ASSETS[`${stripped}.mp3`]) {
    return LOCAL_AUDIO_ASSETS[`${stripped}.mp3`];
  }

  // Check direct lookup in Madali dictionary
  if (ALL_MADALI_AUDIO[source] || ALL_MADALI_AUDIO[noExt]) {
    return ALL_MADALI_AUDIO[source] || ALL_MADALI_AUDIO[noExt];
  }

  // If it's a valid remote or relative web URL, return it directly
  if (
    source.startsWith('/') ||
    source.startsWith('./') ||
    source.startsWith('http://') ||
    source.startsWith('https://') ||
    source.startsWith('data:') ||
    source.startsWith('blob:')
  ) {
    return source;
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

  const cleanup = () => {
    isCancelled = true;
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
  };

  try {
    const resolvedSource = resolveAudioSource(source);

    // If source could not be resolved from local assets or valid URL
    if (!resolvedSource) {
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
        webUri = ALL_MADALI_WEB_PATHS[clean] || VOICE_OVER_WEB_PATHS[clean] || '';
      }

      // Last resort: if source is a number, find its key in ALL_MADALI_AUDIO and use web path
      if (!webUri && typeof source === 'number') {
        for (const [key, asset] of Object.entries(ALL_MADALI_AUDIO)) {
          if (asset === source) {
            webUri = ALL_MADALI_WEB_PATHS[key] || '';
            break;
          }
        }
      }

      if (webUri) {
        const audio = new Audio(webUri);
        player = audio;
        currentActivePlayer = audio;
        audio.volume = 1.0;

        let hasFinished = false;
        const finish = () => {
          if (hasFinished) return;
          hasFinished = true;
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
          console.warn('[SoundService] Play error (autoplay gesture policy):', err?.message);
          finish();
        });

        fallbackTimer = setTimeout(() => {
          if (!isCancelled) finish();
        }, 8000);

        return cleanup;
      }

      // Safe fallback on web when audio cannot be played
      setTimeout(() => {
        if (!isCancelled) onFinished?.();
      }, 300);
      return cleanup;
    }

    // Native mobile playback using expo-audio
    player = createAudioPlayer(resolvedSource, {
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

    // Safe fallback timeout (8s) gives the full question time to finish
    fallbackTimer = setTimeout(() => {
      if (!isCancelled) {
        finish();
      }
    }, 8000);

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
