import { Asset } from 'expo-asset';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';
import { bgm, useBgmDuck } from './bgm-service';

export { bgm, useBgmDuck };

import { LEARNING_CATEGORIES } from '../../data/categories';

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

  // Fallback to speech feedback
  const feedbackWord = isCorrect ? 'Tama!' : 'Subukan muli';
  speakWordWeb(feedbackWord, onFinished);
}

/**
 * Resolve an audio key or URL to a playable source
 */
export function resolveAudioSource(source: string | any): any {
  if (!source) return null;
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

  // If it's a valid remote or absolute data URL, return it directly
  if (
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
 * Web Speech Synthesis fallback for pronouncing words when an mp3 is unavailable
 */
export function speakWordWeb(text: string, onFinished?: () => void): (() => void) | null {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fil-PH';
      utterance.rate = 0.9;
      utterance.onend = () => onFinished?.();
      utterance.onerror = () => onFinished?.();
      window.speechSynthesis.speak(utterance);
      return () => {
        try {
          window.speechSynthesis.cancel();
        } catch {}
      };
    } catch {
      onFinished?.();
      return null;
    }
  }
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
        player.remove();
      } catch {}
      player = null;
    }
    if (currentActivePlayer === player) {
      currentActivePlayer = null;
    }
  };

  try {
    // Check if it's a feedback sound (tama, mali, magaling, etc.)
    if (typeof source === 'string') {
      const lower = source.toLowerCase();
      if (lower.includes('tama') || lower.includes('magaling') || lower.includes('anggalingmo')) {
        playSynthesizedFeedback(true, onFinished);
        return cleanup;
      }
      if (lower.includes('mali') || lower.includes('oopsmali')) {
        playSynthesizedFeedback(false, onFinished);
        return cleanup;
      }
    }

    const resolvedSource = resolveAudioSource(source);

    // If source could not be resolved from local assets or valid URL
    if (!resolvedSource) {
      // Fallback: If it's a string word, pronounce it via Web Speech API
      if (typeof source === 'string') {
        const cleanWord = source.split('/').pop()?.replace(/\.mp3$/i, '').replace(/^hayop_/, '') || source;
        const speechCleaner = speakWordWeb(cleanWord, onFinished);
        if (speechCleaner) return speechCleaner;
      }
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
      } else {
        try {
          const asset = Asset.fromModule(resolvedSource);
          webUri = asset.uri || asset.localUri || '';
        } catch {
          webUri = '';
        }
      }

      if (webUri) {
        const audio = new Audio(webUri);
        audio.volume = 1.0;
        audio.onended = () => {
          if (!isCancelled) onFinished?.();
        };
        audio.onerror = () => {
          if (!isCancelled) onFinished?.();
        };
        audio.play().catch(() => {
          if (!isCancelled) onFinished?.();
        });
        return () => {
          try {
            audio.pause();
            audio.src = '';
          } catch {}
        };
      }
    }

    // Native mobile playback using expo-audio
    player = createAudioPlayer(resolvedSource);
    currentActivePlayer = player;

    fallbackTimer = setTimeout(() => {
      if (!isCancelled) {
        cleanup();
        onFinished?.();
      }
    }, 4000);

    player.play();

    const durationSec = player.duration || 1.4;
    const durationMs = Math.max(900, durationSec * 1000);

    setTimeout(() => {
      if (!isCancelled) {
        cleanup();
        onFinished?.();
      }
    }, durationMs);

    return cleanup;
  } catch {
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
      currentActivePlayer.remove();
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
  // 1. Direct audio asset attached to item (e.g. require('../../assets/audio/PRUTAS/Abukado.mp3'))
  if (item.audio) {
    return playSound(item.audio, onFinished);
  }

  // 2. Direct audioUri (URL or remote)
  if (item.audioUri) {
    return playSound(item.audioUri, onFinished);
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

/**
 * Streak feedback audio resolver
 */
export function getFeedbackAudio(isCorrect: boolean, streak: number): string {
  if (isCorrect) {
    if (streak <= 1) return 'tama';
    if (streak === 2) return 'magaling';
    return 'anggalingmo';
  } else {
    if (streak <= 1) return 'mali';
    return 'oopsmali';
  }
}
