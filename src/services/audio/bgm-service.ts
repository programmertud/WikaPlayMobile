import { Asset } from 'expo-asset';
import { createAudioPlayer } from 'expo-audio';
import { useEffect } from 'react';
import { Platform } from 'react-native';

const BGM_ASSET = require('../../../assets/audio/happy.mp3');

const VOLUME_NORMAL = 0.32;
const VOLUME_MINIMIZED = 0.06;

class BackgroundMusicManager {
  private webAudio: HTMLAudioElement | null = null;
  private nativePlayer: any = null;
  private isPlaying = false;
  private isMuted = false;
  private currentVolume = VOLUME_NORMAL;
  private isInitialized = false;

  public async init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    if (Platform.OS === 'web') {
      try {
        const asset = Asset.fromModule(BGM_ASSET);
        const uri = asset.uri || asset.localUri || '';
        if (uri && typeof Audio !== 'undefined') {
          this.webAudio = new Audio(uri);
          this.webAudio.loop = true;
          this.webAudio.volume = this.currentVolume;

          // Attempt autoplay; if blocked by browser policy, start on first user interaction
          const playPromise = this.webAudio.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                this.isPlaying = true;
              })
              .catch(() => {
                // Browser prevented autoplay before user gesture
                this.isPlaying = false;
                const resumeOnInteraction = () => {
                  if (this.webAudio && !this.isMuted) {
                    this.webAudio
                      .play()
                      .then(() => {
                        this.isPlaying = true;
                      })
                      .catch(() => {});
                  }
                  window.removeEventListener('click', resumeOnInteraction);
                  window.removeEventListener('touchstart', resumeOnInteraction);
                  window.removeEventListener('keydown', resumeOnInteraction);
                };
                window.addEventListener('click', resumeOnInteraction, { once: true });
                window.addEventListener('touchstart', resumeOnInteraction, { once: true });
                window.addEventListener('keydown', resumeOnInteraction, { once: true });
              });
          }
        }
      } catch {
        // Fallback gracefully
      }
    } else {
      // Native (iOS / Android)
      try {
        this.nativePlayer = createAudioPlayer(BGM_ASSET);
        if (this.nativePlayer) {
          this.nativePlayer.loop = true;
          if (typeof this.nativePlayer.setVolume === 'function') {
            this.nativePlayer.setVolume(this.currentVolume);
          }
          this.nativePlayer.play();
          this.isPlaying = true;
        }
      } catch {
        // Fallback gracefully
      }
    }
  }

  public minimize() {
    this.currentVolume = VOLUME_MINIMIZED;
    this.applyVolume();
  }

  public restore() {
    this.currentVolume = VOLUME_NORMAL;
    this.applyVolume();
  }

  private muteListeners = new Set<(muted: boolean) => void>();

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    this.applyVolume();
    this.muteListeners.forEach((fn) => fn(this.isMuted));
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public subscribeMute(callback: (muted: boolean) => void): () => void {
    this.muteListeners.add(callback);
    return () => {
      this.muteListeners.delete(callback);
    };
  }

  private applyVolume() {
    const targetVol = this.isMuted ? 0 : this.currentVolume;

    if (Platform.OS === 'web' && this.webAudio) {
      this.webAudio.volume = targetVol;
      if (this.webAudio.paused && !this.isMuted && this.isPlaying) {
        this.webAudio.play().catch(() => {});
      }
    } else if (this.nativePlayer) {
      try {
        if (typeof this.nativePlayer.setVolume === 'function') {
          this.nativePlayer.setVolume(targetVol);
        }
      } catch {}
    }
  }

  public stop() {
    this.isPlaying = false;
    if (Platform.OS === 'web' && this.webAudio) {
      try {
        this.webAudio.pause();
      } catch {}
    } else if (this.nativePlayer) {
      try {
        this.nativePlayer.pause();
      } catch {}
    }
  }
}

export const bgm = new BackgroundMusicManager();

/**
 * Hook to automatically minimize background music volume while a screen is active
 * (used in Flashcards, Quiz, and Mini-Games) and restore it on exit.
 */
export function useBgmDuck() {
  useEffect(() => {
    // Minimize background music volume so student can focus on voice audio
    bgm.minimize();

    return () => {
      // Restore normal background music volume when leaving the screen
      bgm.restore();
    };
  }, []);
}
