import { Asset } from 'expo-asset';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';
import { bgm, useBgmDuck } from './bgm-service';

export { bgm, useBgmDuck };

// Map all 20 animal audio recordings from assets/audio/HAYOP
export const HAYOP_AUDIO_ASSETS: Record<string, any> = {
  ahas: require('../../../assets/audio/HAYOP/Ahas.mp3'),
  aso: require('../../../assets/audio/HAYOP/Aso.mp3'),
  baboy: require('../../../assets/audio/HAYOP/Baboy.mp3'),
  bubuyog: require('../../../assets/audio/HAYOP/Bubuyog.mp3'),
  daga: require('../../../assets/audio/HAYOP/Daga.mp3'),
  gagamba: require('../../../assets/audio/HAYOP/Gagamba.mp3'),
  ibon: require('../../../assets/audio/HAYOP/Ibon.mp3'),
  isda: require('../../../assets/audio/HAYOP/Isda.mp3'),
  kabayo: require('../../../assets/audio/HAYOP/Kabayo.mp3'),
  kalabaw: require('../../../assets/audio/HAYOP/Kalabaw.mp3'),
  kambing: require('../../../assets/audio/HAYOP/Kambing.mp3'),
  leon: require('../../../assets/audio/HAYOP/Leon.mp3'),
  manok: require('../../../assets/audio/HAYOP/Manok.mp3'),
  pagong: require('../../../assets/audio/HAYOP/Pagong.mp3'),
  palaka: require('../../../assets/audio/HAYOP/Palaka.mp3'),
  pating: require('../../../assets/audio/HAYOP/Pating.mp3'),
  pugita: require('../../../assets/audio/HAYOP/Pugita.mp3'),
  pusa: require('../../../assets/audio/HAYOP/Pusa.mp3'),
  tigre: require('../../../assets/audio/HAYOP/Tigre.mp3'),
  unggoy: require('../../../assets/audio/HAYOP/Unggoy.mp3'),
};

// Aliases for matching by id (e.g. 'hayop_aso'), file names (e.g. 'Aso.mp3'), etc.
export const LOCAL_AUDIO_ASSETS: Record<string, any> = {};

Object.entries(HAYOP_AUDIO_ASSETS).forEach(([key, asset]) => {
  LOCAL_AUDIO_ASSETS[key] = asset;
  LOCAL_AUDIO_ASSETS[`${key}.mp3`] = asset;
  LOCAL_AUDIO_ASSETS[`hayop_${key}`] = asset;
  LOCAL_AUDIO_ASSETS[`hayop_${key}.mp3`] = asset;

  // Capitalized variants
  const cap = key.charAt(0).toUpperCase() + key.slice(1);
  LOCAL_AUDIO_ASSETS[cap] = asset;
  LOCAL_AUDIO_ASSETS[`${cap}.mp3`] = asset;
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
  const noExt = filename.replace(/\.mp3$/i, '').toLowerCase();

  if (LOCAL_AUDIO_ASSETS[filename]) {
    return LOCAL_AUDIO_ASSETS[filename];
  }
  if (LOCAL_AUDIO_ASSETS[noExt]) {
    return LOCAL_AUDIO_ASSETS[noExt];
  }

  // Strip prefix "hayop_" if passed
  const stripped = noExt.replace(/^hayop_/, '');
  if (LOCAL_AUDIO_ASSETS[stripped]) {
    return LOCAL_AUDIO_ASSETS[stripped];
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
 * Pronounce a vocabulary item: plays its assigned animal MP3 from HAYOP/,
 * or speaks its Filipino word via TTS.
 */
export async function playVocabularyItem(
  item: { id: string; filipino: string; audioUri?: string | null },
  onFinished?: () => void
) {
  if (item.audioUri) {
    return playSound(item.audioUri, onFinished);
  }

  // 1. Try Filipino word (e.g. 'aso')
  const byWord = resolveAudioSource(item.filipino);
  if (byWord) {
    return playSound(byWord, onFinished);
  }

  // 2. Try item ID (e.g. 'hayop_aso')
  const byId = resolveAudioSource(item.id);
  if (byId) {
    return playSound(byId, onFinished);
  }

  // 3. Fall back to speech pronunciation of the Filipino word
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
