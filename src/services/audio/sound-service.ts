import { Asset } from 'expo-asset';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';

// Local asset map for all packaged feedback and vocabulary sounds
export const LOCAL_AUDIO_ASSETS: Record<string, any> = {
  // Feedback sounds
  'tama.mp3': require('../../../assets/audio/tama.mp3'),
  'magaling.mp3': require('../../../assets/audio/magaling.mp3'),
  'anggalingmo.mp3': require('../../../assets/audio/anggalingmo.mp3'),
  'mali.mp3': require('../../../assets/audio/mali.mp3'),
  'oopsmali.mp3': require('../../../assets/audio/oopsmali.mp3'),

  // Hayop (Animals)
  'hayop_aso.mp3': require('../../../assets/audio/hayop_aso.mp3'),
  'hayop_pusa.mp3': require('../../../assets/audio/hayop_pusa.mp3'),
  'hayop_ibon.mp3': require('../../../assets/audio/hayop_ibon.mp3'),
  'hayop_kalabaw.mp3': require('../../../assets/audio/hayop_kalabaw.mp3'),

  // Prutas (Fruits)
  'prutas_mangga.mp3': require('../../../assets/audio/prutas_mangga.mp3'),
  'prutas_mansanas.mp3': require('../../../assets/audio/prutas_mansanas.mp3'),
  'prutas_pakwan.mp3': require('../../../assets/audio/prutas_pakwan.mp3'),
  'prutas_saging.mp3': require('../../../assets/audio/prutas_saging.mp3'),

  // Gulay (Vegetables)
  'gulay_kalabasa.mp3': require('../../../assets/audio/gulay_kalabasa.mp3'),
  'gulay_kamatis.mp3': require('../../../assets/audio/gulay_kamatis.mp3'),
  'gulay_sitaw.mp3': require('../../../assets/audio/gulay_sitaw.mp3'),
  'gulay_talong.mp3': require('../../../assets/audio/gulay_talong.mp3'),

  // Kulay (Colors)
  'kulay_pula.mp3': require('../../../assets/audio/kulay_pula.mp3'),
  'kulay_asul.mp3': require('../../../assets/audio/kulay_asul.mp3'),
  'kulay_dilaw.mp3': require('../../../assets/audio/kulay_dilaw.mp3'),
  'kulay_berde.mp3': require('../../../assets/audio/kulay_berde.mp3'),

  // Hugis (Shapes)
  'hugis_bilog.mp3': require('../../../assets/audio/hugis_bilog.mp3'),
  'hugis_parisukat.mp3': require('../../../assets/audio/hugis_parisukat.mp3'),
  'hugis_tatsulok.mp3': require('../../../assets/audio/hugis_tatsulok.mp3'),
  'hugis_parihaba.mp3': require('../../../assets/audio/hugis_parihaba.mp3'),

  // Bilang (Numbers)
  'bilang_isa.mp3': require('../../../assets/audio/bilang_isa.mp3'),
  'bilang_dalawa.mp3': require('../../../assets/audio/bilang_dalawa.mp3'),
  'bilang_tatlo.mp3': require('../../../assets/audio/bilang_tatlo.mp3'),
  'bilang_apat.mp3': require('../../../assets/audio/bilang_apat.mp3'),

  // Katawan (Body parts)
  'katawan_mata.mp3': require('../../../assets/audio/katawan_mata.mp3'),
  'katawan_ilong.mp3': require('../../../assets/audio/katawan_ilong.mp3'),
  'katawan_bibig.mp3': require('../../../assets/audio/katawan_bibig.mp3'),
  'katawan_kamay.mp3': require('../../../assets/audio/katawan_kamay.mp3'),

  // Pagbati (Greetings)
  'pagbati_kamusta.mp3': require('../../../assets/audio/pagbati_kamusta.mp3'),
  'pagbati_salamat.mp3': require('../../../assets/audio/pagbati_salamat.mp3'),
  'pagbati_umaga.mp3': require('../../../assets/audio/pagbati_umaga.mp3'),
  'pagbati_paalam.mp3': require('../../../assets/audio/pagbati_paalam.mp3'),
};

// Also index without .mp3 extension for convenience
Object.keys(LOCAL_AUDIO_ASSETS).forEach((key) => {
  if (key.endsWith('.mp3')) {
    LOCAL_AUDIO_ASSETS[key.replace(/\.mp3$/, '')] = LOCAL_AUDIO_ASSETS[key];
  }
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
 * Resolve an audio key or URL to a playable source
 */
export function resolveAudioSource(source: string | any): any {
  if (!source) return null;
  if (typeof source !== 'string') return source;

  // Extract base filename if it has path elements (e.g. "audio/hayop_aso.mp3" -> "hayop_aso.mp3")
  const filename = source.split('/').pop() || source;
  const noExt = filename.replace(/\.mp3$/, '');

  if (LOCAL_AUDIO_ASSETS[filename]) {
    return LOCAL_AUDIO_ASSETS[filename];
  }
  if (LOCAL_AUDIO_ASSETS[noExt]) {
    return LOCAL_AUDIO_ASSETS[noExt];
  }

  // If it's a valid remote or absolute data URL, return it directly
  if (source.startsWith('http://') || source.startsWith('https://') || source.startsWith('data:') || source.startsWith('blob:')) {
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

  // Stop any currently active playback
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
    const resolvedSource = resolveAudioSource(source);

    // If source could not be resolved from local assets or valid URL
    if (!resolvedSource) {
      // Fallback: If it's a string, try Web Speech API
      if (typeof source === 'string') {
        const speechCleaner = speakWordWeb(source.replace(/\.mp3$/, ''), onFinished);
        if (speechCleaner) return speechCleaner;
      }
      // Otherwise immediately complete so student is never stuck
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
        // Resolve require module to URI using expo-asset
        try {
          const asset = Asset.fromModule(resolvedSource);
          webUri = asset.uri || asset.localUri || '';
        } catch {
          webUri = '';
        }
      }

      if (webUri) {
        const audio = new Audio(webUri);
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

    // Safety fallback: ensure callback fires within 3.5s
    fallbackTimer = setTimeout(() => {
      if (!isCancelled) {
        cleanup();
        onFinished?.();
      }
    }, 3500);

    player.play();

    const durationSec = player.duration || 1.2;
    const durationMs = Math.max(800, durationSec * 1000);

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
 * Pronounce a vocabulary item: plays its audio asset if bundled,
 * or speaks its Filipino word via TTS.
 */
export async function playVocabularyItem(
  item: { id: string; filipino: string; audioUri?: string | null },
  onFinished?: () => void
) {
  if (item.audioUri) {
    return playSound(item.audioUri, onFinished);
  }
  // Try item id (e.g. 'hayop_aso')
  const resolved = resolveAudioSource(item.id);
  if (resolved) {
    return playSound(resolved, onFinished);
  }
  // Fall back to pronouncing Filipino word
  return playSound(item.filipino, onFinished);
}

/**
 * Exact streak feedback audio resolver:
 * Correct Streak:
 * - 1st: tama.mp3
 * - 2nd: magaling.mp3
 * - 3rd+: anggalingmo.mp3
 *
 * Wrong Streak:
 * - 1st: mali.mp3
 * - 2nd+: oopsmali.mp3
 */
export function getFeedbackAudio(isCorrect: boolean, streak: number): string {
  if (isCorrect) {
    if (streak <= 1) return 'tama.mp3';
    if (streak === 2) return 'magaling.mp3';
    return 'anggalingmo.mp3';
  } else {
    if (streak <= 1) return 'mali.mp3';
    return 'oopsmali.mp3';
  }
}
