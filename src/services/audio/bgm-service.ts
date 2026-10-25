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
    if (this.isInitialized && (this.webAudio || this.nativePlayer)) return;
    this.isInitialized = true;

    if (Platform.OS === 'web') {
      try {
        let uri = '';
        try {
          const asset = Asset.fromModule(BGM_ASSET);
          uri = asset.uri || asset.localUri || '';
        } catch {
          uri = '';
        }

        // Fallbacks for web if asset registry doesn't resolve direct URI
        if (!uri) {
          uri = '/audio/happy.mp3';
        }

        if (typeof Audio !== 'undefined') {
          this.webAudio = new Audio(uri);
          this.webAudio.loop = true;
          this.webAudio.volume = this.isMuted ? 0 : this.currentVolume;

          // If primary URI fails to load, fallback to API or relative path
          this.webAudio.onerror = () => {
            if (this.webAudio && !this.webAudio.src.includes('localhost:8000')) {
              this.webAudio.src = 'http://localhost:8000/audio/happy.mp3';
              if (!this.isMuted) {
                this.webAudio.play().catch(() => {});
              }
            }
          };

          // Handle browser autoplay policy: modern browsers require a user gesture first
          const startPlayback = () => {
            if (!this.webAudio || this.isMuted) return;
            this.webAudio
              .play()
              .then(() => {
                this.isPlaying = true;
              })
              .catch(() => {
                // Keep listening until a user gesture satisfies browser policy
              });
          };

          // 1. Try immediate autoplay
          startPlayback();

          // 2. Setup user interaction listeners to unlock audio on first tap/click anywhere
          const unlockGesture = () => {
            startPlayback();
            ['pointerdown', 'touchstart', 'mousedown', 'click', 'keydown'].forEach((evt) => {
              window.removeEventListener(evt, unlockGesture, true);
            });
          };

          ['pointerdown', 'touchstart', 'mousedown', 'click', 'keydown'].forEach((evt) => {
            window.addEventListener(evt, unlockGesture, { once: true, capture: true });
          });
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

  public play() {
    this.isMuted = false;
    this.isPlaying = true;
    if (Platform.OS === 'web' && this.webAudio) {
      this.webAudio.volume = this.currentVolume;
      this.webAudio.play().catch(() => {});
    } else if (this.nativePlayer) {
      try {
        this.nativePlayer.play();
      } catch {}
    }
  }

  private duckCount = 0;

  public minimize() {
    this.duckCount++;
    this.currentVolume = VOLUME_MINIMIZED;
    this.applyVolume();
  }

  public restore(force = false) {
    if (force) {
      this.duckCount = 0;
    } else {
      this.duckCount = Math.max(0, this.duckCount - 1);
    }
    if (this.duckCount === 0) {
      this.currentVolume = VOLUME_NORMAL;
      this.applyVolume();
    }
  }

  private muteListeners = new Set<(muted: boolean) => void>();

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (!this.isMuted) {
      this.isPlaying = true;
      if (Platform.OS === 'web' && this.webAudio) {
        this.webAudio.play().catch(() => {});
      }
    }
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
      if (!this.isMuted && this.webAudio.paused) {
        this.webAudio.play().then(() => {
          this.isPlaying = true;
        }).catch(() => {});
      } else if (this.isMuted && !this.webAudio.paused) {
        this.webAudio.pause();
      }
    } else if (this.nativePlayer) {
      try {
        if (typeof this.nativePlayer.setVolume === 'function') {
          this.nativePlayer.setVolume(targetVol);
        }
        if (!this.isMuted) {
          this.nativePlayer.play();
        } else {
          this.nativePlayer.pause();
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
