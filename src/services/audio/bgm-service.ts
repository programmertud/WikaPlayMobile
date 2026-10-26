import { Asset } from 'expo-asset';
import { createAudioPlayer } from 'expo-audio';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { storage } from '../../utils/storage';

const BGM_ASSET = require('../../../assets/audio/happy.mp3');

const VOLUME_NORMAL = 0.32;
const VOLUME_MINIMIZED = 0.06;
const STORAGE_VOLUME_KEY = 'wikaplay_bgm_volume';
const STORAGE_MUTED_KEY = 'wikaplay_bgm_muted';

class BackgroundMusicManager {
  private webAudio: HTMLAudioElement | null = null;
  private nativePlayer: any = null;
  private isPlaying = false;
  private isMuted = false;
  private currentVolume = VOLUME_NORMAL;
  /** The user-set volume level (0.0–1.0). Separate from duck/minimize logic. */
  private userVolume = VOLUME_NORMAL;
  private isInitialized = false;

  public async init() {
    // Load persisted volume & mute settings
    try {
      const savedVolStr = await storage.getItem(STORAGE_VOLUME_KEY);
      const savedMutedStr = await storage.getItem(STORAGE_MUTED_KEY);
      if (savedVolStr !== null) {
        const parsed = parseFloat(savedVolStr);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
          this.userVolume = parsed;
          this.currentVolume = parsed;
        }
      }
      if (savedMutedStr !== null) {
        this.isMuted = savedMutedStr === 'true';
      }
    } catch {
      // Non-critical: defaults used
    }

    if (this.isInitialized && (this.webAudio || this.nativePlayer)) {
      this.applyVolume();
      return;
    }
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
          const targetVol = this.isMuted ? 0 : this.currentVolume;
          if (typeof this.nativePlayer.setVolume === 'function') {
            this.nativePlayer.setVolume(targetVol);
          } else {
            this.nativePlayer.volume = targetVol;
          }
          if (!this.isMuted) {
            this.nativePlayer.play();
            this.isPlaying = true;
          }
        }
      } catch {
        // Fallback gracefully
      }
    }
  }

  public play() {
    this.isMuted = false;
    this.isPlaying = true;
    storage.setItem(STORAGE_MUTED_KEY, 'false').catch(() => {});
    if (Platform.OS === 'web' && this.webAudio) {
      this.webAudio.volume = this.currentVolume;
      this.webAudio.play().catch(() => {});
    } else if (this.nativePlayer) {
      try {
        if (typeof this.nativePlayer.setVolume === 'function') {
          this.nativePlayer.setVolume(this.currentVolume);
        } else {
          this.nativePlayer.volume = this.currentVolume;
        }
        this.nativePlayer.play();
      } catch {}
    }
  }

  private duckCount = 0;

  public minimize() {
    this.duckCount++;
    this.currentVolume = Math.min(VOLUME_MINIMIZED, this.userVolume * 0.25);
    this.applyVolume();
  }

  public restore(force = false) {
    if (force) {
      this.duckCount = 0;
    } else {
      this.duckCount = Math.max(0, this.duckCount - 1);
    }
    if (this.duckCount === 0) {
      this.currentVolume = this.userVolume;
      this.applyVolume();
    }
  }

  private muteListeners = new Set<(muted: boolean) => void>();
  private volumeListeners = new Set<(volume: number) => void>();

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (!this.isMuted) {
      this.isPlaying = true;
      if (this.userVolume === 0) {
        this.userVolume = VOLUME_NORMAL;
        this.currentVolume = VOLUME_NORMAL;
        this.volumeListeners.forEach((fn) => fn(VOLUME_NORMAL));
        storage.setItem(STORAGE_VOLUME_KEY, VOLUME_NORMAL.toString()).catch(() => {});
      }
      if (Platform.OS === 'web' && this.webAudio) {
        this.webAudio.play().catch(() => {});
      }
    }
    this.applyVolume();
    this.muteListeners.forEach((fn) => fn(this.isMuted));
    storage.setItem(STORAGE_MUTED_KEY, this.isMuted.toString()).catch(() => {});
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    if (this.isMuted === muted) return;
    this.isMuted = muted;
    if (!this.isMuted && this.userVolume === 0) {
      this.userVolume = VOLUME_NORMAL;
      this.currentVolume = VOLUME_NORMAL;
      this.volumeListeners.forEach((fn) => fn(VOLUME_NORMAL));
      storage.setItem(STORAGE_VOLUME_KEY, VOLUME_NORMAL.toString()).catch(() => {});
    }
    this.applyVolume();
    this.muteListeners.forEach((fn) => fn(this.isMuted));
    storage.setItem(STORAGE_MUTED_KEY, this.isMuted.toString()).catch(() => {});
  }

  /**
   * Set user-controlled volume level (0.0 – 1.0).
   * Also unmutes if volume > 0, and saves to storage.
   */
  public setUserVolume(volume: number) {
    const clamped = Math.max(0, Math.min(1, volume));
    this.userVolume = clamped;
    if (this.duckCount === 0) {
      this.currentVolume = clamped;
    } else {
      this.currentVolume = Math.min(VOLUME_MINIMIZED, clamped * 0.25);
    }

    if (clamped > 0 && this.isMuted) {
      this.isMuted = false;
      this.muteListeners.forEach((fn) => fn(false));
      storage.setItem(STORAGE_MUTED_KEY, 'false').catch(() => {});
    } else if (clamped === 0 && !this.isMuted) {
      this.isMuted = true;
      this.muteListeners.forEach((fn) => fn(true));
      storage.setItem(STORAGE_MUTED_KEY, 'true').catch(() => {});
    }

    this.applyVolume();
    this.volumeListeners.forEach((fn) => fn(clamped));
    storage.setItem(STORAGE_VOLUME_KEY, clamped.toString()).catch(() => {});
  }

  /** Get current user-set volume (0.0 – 1.0). */
  public getUserVolume(): number {
    return this.userVolume;
  }

  public getVolumePercent(): number {
    return Math.round(this.userVolume * 100);
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

  /** Subscribe to volume changes from setUserVolume. */
  public subscribeVolume(callback: (volume: number) => void): () => void {
    this.volumeListeners.add(callback);
    return () => {
      this.volumeListeners.delete(callback);
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
        } else {
          this.nativePlayer.volume = targetVol;
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
