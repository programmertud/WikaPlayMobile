import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import * as FileSystemLegacy from 'expo-file-system/legacy';

const TOKEN_KEY = 'wikaplay_auth_token';
const API_URL_KEY = 'wikaplay_custom_api_url';

export const PRODUCTION_API_URL = 'https://wikaplay-api.onrender.com/api';

/**
 * Automatically determine the default API Base URL based on environment and platform:
 * - Uses EXPO_PUBLIC_API_URL if configured
 * - In production APK / standalone builds / EAS updates: always https://wikaplay-api.onrender.com/api
 * - In local dev (__DEV__) mode with Metro bundler: extracts LAN IP from hostUri
 */
export function getDefaultApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && (window.location?.hostname === 'localhost' || window.location?.hostname === '127.0.0.1')) {
      return 'http://127.0.0.1:8000/api';
    }
    return PRODUCTION_API_URL;
  }

  // Development mode only: if running inside local Expo Go or dev client connected to Metro
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1' && ip !== '10.0.2.2') {
        return `http://${ip}:8000/api`;
      }
    }
  }

  // Production standalone APK, EAS build, EAS update, or physical device fallback:
  return PRODUCTION_API_URL;
}

export class ApiClient {
  private static cachedToken: string | null = null;
  private static currentBaseUrl: string = getDefaultApiBaseUrl();

  public static async init() {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        this.cachedToken = window.localStorage.getItem(TOKEN_KEY);
        const customUrl = window.localStorage.getItem(API_URL_KEY);
        if (customUrl && !customUrl.includes('10.0.2.2') && !customUrl.includes('localhost') && !customUrl.includes('127.0.0.1')) {
          this.currentBaseUrl = customUrl;
        } else {
          this.currentBaseUrl = getDefaultApiBaseUrl();
        }
      } else {
        this.cachedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        const customUrl = await SecureStore.getItemAsync(API_URL_KEY);
        if (customUrl && !customUrl.includes('10.0.2.2') && !customUrl.includes('localhost') && !customUrl.includes('127.0.0.1')) {
          this.currentBaseUrl = customUrl;
        } else {
          this.currentBaseUrl = getDefaultApiBaseUrl();
        }
      }
    } catch {
      // Secure store might not be available on Web or during initial boot
    }
  }

  public static getBaseUrl(): string {
    return this.currentBaseUrl;
  }

  public static async setBaseUrl(url: string) {
    this.currentBaseUrl = url.trim().replace(/\/+$/, '');
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(API_URL_KEY, this.currentBaseUrl);
      } else {
        await SecureStore.setItemAsync(API_URL_KEY, this.currentBaseUrl);
      }
    } catch {}
  }

  public static async setToken(token: string | null) {
    this.cachedToken = token;
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        if (token) {
          window.localStorage.setItem(TOKEN_KEY, token);
        } else {
          window.localStorage.removeItem(TOKEN_KEY);
        }
      } else {
        if (token) {
          await SecureStore.setItemAsync(TOKEN_KEY, token);
        } else {
          await SecureStore.deleteItemAsync(TOKEN_KEY);
        }
      }
    } catch {}
  }

  public static getToken(): string | null {
    return this.cachedToken;
  }

  public static async request<T = any>(
    endpoint: string,
    options: RequestInit & { timeoutMs?: number; requiresAuth?: boolean } = {}
  ): Promise<T> {
    const { timeoutMs = 12000, requiresAuth = false, ...fetchOptions } = options;

    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.currentBaseUrl}/${endpoint.replace(/^\/+/, '')}`;

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    };

    if (this.cachedToken) {
      headers['Authorization'] = `Bearer ${this.cachedToken}`;
    } else if (requiresAuth) {
      throw new Error('Kinakailangan mong mag-login muna.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type');
      let data: any = null;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text };
        }
      }

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid
          await this.setToken(null);
          throw new Error('Nag-expire ang iyong sesyon. Mangyaring mag-login muli.');
        }

        if (response.status === 422 && data.errors) {
          const firstErr = Object.values(data.errors)[0] as string[];
          throw new Error(firstErr?.[0] || data.message || 'Maling impormasyon.');
        }

        throw new Error(data.message || `May naganap na error (${response.status})`);
      }

      return data as T;
    } catch (err: any) {
      clearTimeout(timeoutId);

      if (err.name === 'AbortError') {
        throw new Error('Matagal sumagot ang server. Pakisubukang muli.');
      }

      if (err.message && err.message.includes('Network request failed')) {
        throw new Error(
          `Hindi makakonekta sa server (${this.currentBaseUrl}). Pakitiyak na tumatakbo ang Laravel backend at tama ang IP address.`
        );
      }

      throw err;
    }
  }

  // HTTP Helper methods
  public static get<T = any>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public static post<T = any>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public static put<T = any>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public static delete<T = any>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Native-safe single-file multipart upload.
   *
   * On iOS / Android we use expo-file-system's `uploadAsync` because React
   * Native's `fetch` + FormData cannot resolve `content://` Media Store URIs
   * that expo-image-picker and expo-document-picker return on physical devices
   * running Android.  Using `uploadAsync` avoids the silent "empty body" bug
   * that causes the server to return 422 / "no file received".
   *
   * On Web we fall back to the existing blob-based FormData approach.
   */
  public static async uploadFileUri<T = any>(
    endpoint: string,
    fileUri: string,
    fieldName: string,
    mimeType?: string,
    fileName?: string
  ): Promise<T> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.currentBaseUrl}/${endpoint.replace(/^\/+/, '')}`;

    const authHeaders: Record<string, string> = {
      Accept: 'application/json',
    };
    if (this.cachedToken) {
      authHeaders['Authorization'] = `Bearer ${this.cachedToken}`;
    }

    // ── Web path: fetch blob then post as FormData ──────────────────────────
    if (Platform.OS === 'web') {
      const resp = await fetch(fileUri);
      const blob = await resp.blob();
      const ext = (mimeType || blob.type || 'application/octet-stream').split('/')[1] || 'bin';
      const form = new FormData();
      form.append(fieldName, blob, fileName || `upload.${ext}`);
      return this.uploadFile<T>(endpoint, form);
    }

    // ── Native path (Android / iOS): use expo-file-system uploadAsync ───────
    // This correctly handles  content://  and  file://  URIs on Android.
    const uploadResult = await FileSystemLegacy.uploadAsync(url, fileUri, {
      httpMethod: 'POST',
      uploadType: FileSystemLegacy.FileSystemUploadType.MULTIPART,
      fieldName,
      mimeType: mimeType || 'application/octet-stream',
      headers: authHeaders,
    });

    let data: any;
    try {
      data = JSON.parse(uploadResult.body);
    } catch {
      data = { message: uploadResult.body };
    }

    if (uploadResult.status >= 400) {
      if (uploadResult.status === 401) {
        await this.setToken(null);
        throw new Error('Nag-expire ang iyong sesyon. Mangyaring mag-login muli.');
      }
      if (uploadResult.status === 422 && data.errors) {
        const firstErr = Object.values(data.errors)[0] as string[];
        throw new Error(firstErr?.[0] || data.message || 'Maling impormasyon.');
      }
      throw new Error(data.message || `Nabigong mag-upload ng file (${uploadResult.status}).`);
    }

    return data as T;
  }

  /**
   * Multipart Form-Data upload for audio / pictures
   * Uses a generous 90-second timeout to accommodate slow server cold starts (e.g. Render free tier).
   * NOTE: Prefer uploadFileUri() on native — this method is kept for the web
   * blob path and for any caller that already has a FormData object.
   */
  public static async uploadFile<T = any>(endpoint: string, formData: FormData): Promise<T> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.currentBaseUrl}/${endpoint.replace(/^\/+/, '')}`;

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (this.cachedToken) {
      headers['Authorization'] = `Bearer ${this.cachedToken}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = response.headers.get('content-type');
      let data: any = null;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try { data = JSON.parse(text); } catch { data = { message: text }; }
      }

      if (!response.ok) {
        if (response.status === 422 && data.errors) {
          const firstErr = Object.values(data.errors)[0] as string[];
          throw new Error(firstErr?.[0] || data.message || 'Maling impormasyon.');
        }
        throw new Error(data.message || 'Nabigong mag-upload ng file.');
      }

      return data;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Nag-timeout ang pag-upload. Pakisubukang muli.');
      }
      if (err.message && err.message.includes('Network request failed')) {
        throw new Error('Hindi makakonekta sa server. Pakitiyak na may internet connection.');
      }
      throw err;
    }
  }
}
