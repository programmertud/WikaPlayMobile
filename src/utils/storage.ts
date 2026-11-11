import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as FileSystemLegacy from 'expo-file-system/legacy';

const STORAGE_DIR = `${FileSystemLegacy.documentDirectory || ''}wikaplay_storage/`;

let dirCreated = false;
async function ensureDir() {
  if (dirCreated || !FileSystemLegacy.documentDirectory) return;
  try {
    const info = await FileSystemLegacy.getInfoAsync(STORAGE_DIR);
    if (!info.exists) {
      await FileSystemLegacy.makeDirectoryAsync(STORAGE_DIR, { intermediates: true });
    }
    dirCreated = true;
  } catch {
    // Directory creation failed or unsupported
  }
}

function getSafeFileName(key: string): string {
  // Convert keys like "@wikaplay_full_items_mga-hayop" into safe filesystem filenames
  return encodeURIComponent(key).replace(/[*]/g, '_') + '.json';
}

/**
 * Universal key-value storage for WikaPlay.
 *
 * - Web: Uses `window.localStorage`
 * - Native (Android / iOS):
 *   Uses `expo-file-system/legacy` document directory files for unlimited payload size
 *   (bypasses expo-secure-store's 2048-byte limit on Android), with fallback to
 *   `expo-secure-store` for small credentials/tokens and backward compatibility.
 */
export const storage = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return null;
      }

      // 1. Try file-based storage first (unlimited payload size)
      if (FileSystemLegacy.documentDirectory) {
        await ensureDir();
        const fileUri = `${STORAGE_DIR}${getSafeFileName(key)}`;
        const info = await FileSystemLegacy.getInfoAsync(fileUri);
        if (info.exists) {
          const content = await FileSystemLegacy.readAsStringAsync(fileUri);
          return content;
        }
      }

      // 2. Fall back to SecureStore (for small keys, auth tokens, or legacy data)
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
        }
        return;
      }

      // Always write to FileSystem (no 2048-byte limit on Android)
      if (FileSystemLegacy.documentDirectory) {
        await ensureDir();
        const fileUri = `${STORAGE_DIR}${getSafeFileName(key)}`;
        await FileSystemLegacy.writeAsStringAsync(fileUri, value);
      }

      // If value is small (< 1800 bytes), also mirror to SecureStore for compatibility
      if (value.length < 1800) {
        try {
          await SecureStore.setItemAsync(key, value);
        } catch {}
      } else {
        // If it previously existed in SecureStore, purge it to avoid stale reads
        try {
          await SecureStore.deleteItemAsync(key);
        } catch {}
      }
    } catch (e) {
      console.warn('Storage setItem failed:', e);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
        }
        return;
      }

      if (FileSystemLegacy.documentDirectory) {
        await ensureDir();
        const fileUri = `${STORAGE_DIR}${getSafeFileName(key)}`;
        try {
          await FileSystemLegacy.deleteAsync(fileUri, { idempotent: true });
        } catch {}
      }

      try {
        await SecureStore.deleteItemAsync(key);
      } catch {}
    } catch (e) {
      console.warn('Storage removeItem failed:', e);
    }
  },
};
