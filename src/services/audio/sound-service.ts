import { AudioModule, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';

// Local asset map for feedback sounds
export const LOCAL_AUDIO_ASSETS: Record<string, any> = {
  'tama.mp3': require('../../../assets/audio/tama.mp3'),
  'magaling.mp3': require('../../../assets/audio/magaling.mp3'),
  'anggalingmo.mp3': require('../../../assets/audio/anggalingmo.mp3'),
  'mali.mp3': require('../../../assets/audio/mali.mp3'),
  'oopsmali.mp3': require('../../../assets/audio/oopsmali.mp3'),
};

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
  } catch (err) {
    // Audio session configuration warning
  }
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
    // Determine actual source
    let resolvedSource = source;

    if (typeof source === 'string') {
      const filename = source.split('/').pop() || '';
      if (LOCAL_AUDIO_ASSETS[filename]) {
        resolvedSource = LOCAL_AUDIO_ASSETS[filename];
      }
    }

    if (Platform.OS === 'web') {
      // Web Audio fallback
      const audioUrl = typeof resolvedSource === 'string' ? resolvedSource : '';
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.onended = () => {
          if (!isCancelled && onFinished) onFinished();
        };
        audio.onerror = () => {
          if (!isCancelled && onFinished) onFinished();
        };
        audio.play().catch(() => {
          if (!isCancelled && onFinished) onFinished();
        });
        return () => {
          audio.pause();
          audio.src = '';
        };
      }
    }

    player = createAudioPlayer(resolvedSource);
    currentActivePlayer = player;

    // Safety fallback: if completion event doesn't fire within 3.5s, unlock choices
    fallbackTimer = setTimeout(() => {
      if (!isCancelled) {
        cleanup();
        onFinished?.();
      }
    }, 3500);

    // Play sound
    player.play();

    // In expo-audio, we can monitor duration and schedule exact completion
    const durationSec = player.duration || 1.2;
    const durationMs = Math.max(800, durationSec * 1000);

    setTimeout(() => {
      if (!isCancelled) {
        cleanup();
        onFinished?.();
      }
    }, durationMs);

    return cleanup;
  } catch (err) {
    // Safe recovery so student is never permanently locked
    cleanup();
    setTimeout(() => {
      if (!isCancelled) onFinished?.();
    }, 500);
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
