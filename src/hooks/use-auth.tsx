import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ApiClient, authService } from '../services/api';
import { User } from '../types';

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

  // On app cold launch / fresh start, clear previous session so reopening the APK always returns to Welcome Screen
  useEffect(() => {
    const initAuth = async () => {
      try {
        await ApiClient.init();
        // Clear stored session on cold boot
        await ApiClient.setToken(null);
        setUser(null);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string, role?: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await authService.login({ email, password, role });
      setUser(res.user);
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
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const studentLogin = async (name: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await authService.studentLogin(name);
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const studentRegister = async (name: string, enrollment_code?: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await authService.studentRegister({ name, enrollment_code });
      setUser(res.user);
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
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
      setUser(res.user);
    } catch {}
  };

  const updateUserStars = (newBalance: number) => {
    setUser((prev) => (prev ? { ...prev, stars_balance: newBalance } : null));
  };

  const updateProfile = async (payload: { name?: string; avatar?: string; section?: string }): Promise<User> => {
    const res = await authService.updateProfile(payload);
    setUser(res.user);
    return res.user;
  };

  const updateUserAvatar = (avatar: string) => {
    setUser((prev) => (prev ? { ...prev, avatar } : null));
  };

  // Memoize the context value so consumers only re-render when user or isLoading
  // actually change — prevents the infinite setState/update-depth loops
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
    [user, isLoading]
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
