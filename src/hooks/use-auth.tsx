/**
 * WikaPlay Authentication Hook — Offline-First Edition
 *
 * Changes from original:
 * 1. Cold boot no longer clears the auth token — restores the previous session
 * 2. Cached user metadata is persisted to SQLite for offline identity display
 * 3. On cold boot: tries to restore session from token (online) or SQLite (offline)
 * 4. Logout properly clears SQLite user cache for the logged-out account
 * 5. Account switching is safe — each account's pending sessions are account-scoped
 *
 * Preserved behaviors:
 * - All login/register methods work exactly as before when online
 * - Teacher/admin role checks unchanged
 * - Star balance update, profile update, avatar update unchanged
 * - If token is invalid/expired, user is shown as not authenticated
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiClient, authService } from '../services/api';
import { User } from '../types';
import {
  cacheUser,
  clearCachedUser,
  getCachedUser,
  getLatestCachedUser,
  getCachedUserByName,
  getPendingStarsTotal,
} from '../services/offline/offline-session-store';
import { getDatabase } from '../services/offline/database';
import { setHealthCheckUrl } from '../services/offline/connectivity-service';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  login: (email: string, password: string, role?: string) => Promise<User>;
  studentLogin: (name: string) => Promise<User>;
  register: (name: string, email: string, password: string, role?: 'student' | 'teacher', section_name?: string) => Promise<User>;
  studentRegister: (name: string, enrollment_code?: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUserStars: (newBalance: number) => void;
  updateProfile: (payload: { name?: string; avatar?: string; section?: string }) => Promise<User>;
  updateUserAvatar: (avatar: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Cache user info to SQLite whenever user changes (not on logout)
  const cacheUserInfo = useCallback(async (u: User) => {
    if (u.role !== 'student') return; // Only cache students for offline play
    try {
      await cacheUser({
        student_id: u.id,
        name: u.name,
        role: u.role,
        avatar: u.avatar ?? null,
        section: u.section ?? null,
        stars_balance_last_known: u.stars_balance ?? 0,
        cached_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('[AuthProvider] Failed to cache user info:', err);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Initialize SQLite database first
        await getDatabase();

        await ApiClient.init();

        // Set health check URL for connectivity service
        setHealthCheckUrl(ApiClient.getBaseUrl());

        // Try to restore session from stored token (CHANGED: no longer clears token on boot)
        const token = ApiClient.getToken();
        if (token) {
          try {
            const res = await authService.getMe();
            const pendingStars = await getPendingStarsTotal().catch(() => 0);
            const cached = await getLatestCachedUser().catch(() => null);
            const combinedStars = Math.max(
              res.user.stars_balance ?? 0,
              (res.user.stars_balance ?? 0) + pendingStars,
              cached?.stars_balance_last_known ?? 0
            );
            const enrichedUser = {
              ...res.user,
              stars_balance: combinedStars,
            };
            setUser(enrichedUser);
            await cacheUserInfo(enrichedUser);
          } catch (err: any) {
            // Token expired or invalid — clear it only on 401 / auth errors
            const isAuthError =
              err?.status === 401 ||
              err?.response?.status === 401 ||
              err?.message?.includes('sesyon') ||
              err?.message?.includes('401') ||
              err?.message?.includes('Unauthenticated');

            if (isAuthError) {
              await ApiClient.setToken(null);
              setUser(null);
            } else {
              // Network error (offline mode) — restore from SQLite cache
              // Retain the token so when network reconnects, sync can proceed immediately
              const cached = await getLatestCachedUser();
              if (cached) {
                setUser({
                  id: cached.student_id,
                  name: cached.name,
                  role: (cached.role as 'student' | 'teacher' | 'admin') || 'student',
                  avatar: cached.avatar ?? undefined,
                  section: cached.section ?? undefined,
                  stars_balance: cached.stars_balance_last_known,
                } as User);
              } else {
                setUser(null);
              }
            }
          }
        } else {
          setUser(null);
        }
      } catch (err) {
        console.warn('[AuthProvider] Init error:', err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setAndCacheUser = useCallback(async (u: User | null) => {
    setUser(u);
    if (u) await cacheUserInfo(u);
  }, [cacheUserInfo]);

  const login = async (email: string, password: string, role?: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await authService.login({ email, password, role });
      await setAndCacheUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role?: 'student' | 'teacher',
    section_name?: string
  ): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await authService.register({ name, email, password, role, section_name });
      await setAndCacheUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const studentLogin = async (name: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await authService.studentLogin(name);
      await setAndCacheUser(res.user);
      return res.user;
    } catch (err: any) {
      const isNetworkError =
        err?.message?.includes('fetch') ||
        err?.message?.includes('Network') ||
        err?.message?.includes('network') ||
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('Internet') ||
        err?.status === 0;

      if (isNetworkError) {
        // 1. Check if this student is already in local SQLite cache
        const existing = await getCachedUserByName(name);
        if (existing) {
          const offlineUser: User = {
            id: existing.student_id,
            name: existing.name,
            role: (existing.role as 'student' | 'teacher' | 'admin') || 'student',
            avatar: existing.avatar ?? undefined,
            section: existing.section ?? undefined,
            stars_balance: existing.stars_balance_last_known,
          };
          setUser(offlineUser);
          return offlineUser;
        }

        // 2. First-time offline student on this device: create an instant offline profile!
        const trimmed = name.trim();
        let hash = 0;
        for (let i = 0; i < trimmed.length; i++) {
          hash = (hash << 5) - hash + trimmed.charCodeAt(i);
          hash |= 0;
        }
        const offlineStudentId = Math.abs(hash) || Math.floor(Math.random() * 800000) + 100000;

        const newOfflineUser: User = {
          id: offlineStudentId,
          name: trimmed,
          role: 'student',
          stars_balance: 0,
        };

        await setAndCacheUser(newOfflineUser);
        return newOfflineUser;
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const studentRegister = async (name: string, enrollment_code?: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await authService.studentRegister({ name, enrollment_code });
      await setAndCacheUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Clear user cache for this account before logging out
      if (user?.id) {
        await clearCachedUser(user.id);
        // NOTE: We do NOT delete pending_sessions on logout — they belong to this student
        // and must be synced on next login. The student_id scoping prevents data leakage.
      }
      await authService.logout();
    } catch {
      // Ignore network errors — always clear local token
      await ApiClient.setToken(null);
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    try {
      const res = await authService.getMe();
      const pendingStars = await getPendingStarsTotal().catch(() => 0);
      const combinedStars = Math.max(
        res.user.stars_balance ?? 0,
        (res.user.stars_balance ?? 0) + pendingStars,
        user?.stars_balance ?? 0
      );
      const updatedUser = {
        ...res.user,
        stars_balance: combinedStars,
      };
      await setAndCacheUser(updatedUser);
    } catch {}
  };

  const updateUserStars = (newBalance: number) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, stars_balance: newBalance };
      // Update cache asynchronously
      cacheUserInfo(updated).catch(console.warn);
      return updated;
    });
  };

  const updateProfile = async (payload: { name?: string; avatar?: string; section?: string }): Promise<User> => {
    const res = await authService.updateProfile(payload);
    await setAndCacheUser(res.user);
    return res.user;
  };

  const updateUserAvatar = (avatar: string) => {
    setUser((prev) => (prev ? { ...prev, avatar } : null));
  };

  // Memoize the context value so consumers only re-render when user or isLoading actually change
  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      isTeacher: user?.role === 'teacher' || user?.role === 'admin',
      isStudent: user?.role === 'student',
      login,
      studentLogin,
      register,
      studentRegister,
      logout,
      refreshProfile,
      updateUserStars,
      updateProfile,
      updateUserAvatar,
    }),
    [user, isLoading] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
