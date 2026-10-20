import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'wikaplay_auth_token';
const API_URL_KEY = 'wikaplay_custom_api_url';

/**
 * Automatically determine the default API Base URL based on environment and platform:
 * - Web: http://127.0.0.1:8000/api
 * - Android Emulator: http://10.0.2.2:8000/api
 * - Physical device: uses the IP extracted from hostUri (development machine LAN IP)
 */
export function getDefaultApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (Platform.OS === 'web') {
    return 'http://127.0.0.1:8000/api';
  }

  // Attempt to extract development host IP from Expo manifest (LAN IP for physical device / emulator)
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:8000/api`;
    }
  }

  // Default fallback for Android emulator
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8000/api';
  }

  // Fallback for iOS simulator
  return 'http://127.0.0.1:8000/api';
}

export class ApiClient {
  private static cachedToken: string | null = null;
  private static currentBaseUrl: string = getDefaultApiBaseUrl();

  public static async init() {
    try {
      this.cachedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      const customUrl = await SecureStore.getItemAsync(API_URL_KEY);
      if (customUrl) {
        this.currentBaseUrl = customUrl;
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
      await SecureStore.setItemAsync(API_URL_KEY, this.currentBaseUrl);
    } catch {}
  }

  public static async setToken(token: string | null) {
    this.cachedToken = token;
    try {
      if (token) {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
      } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
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
   * Multipart Form-Data upload for audio / pictures
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

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Nabigong mag-upload ng file.');
    }

    return data;
  }
}
