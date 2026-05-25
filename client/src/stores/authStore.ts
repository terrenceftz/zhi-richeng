import { create } from 'zustand';
import type { User } from '../types';
import * as authApi from '../api/auth';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authApi.login(email, password);
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
      localStorage.setItem('user', JSON.stringify(result.user));
      set({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: any) {
      set({ isLoading: false, error: err.response?.data?.message || '登录失败' });
      throw err;
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true, error: null });
    try {
      const result = await authApi.register(email, password, name);
      localStorage.setItem('accessToken', result.accessToken);
      localStorage.setItem('refreshToken', result.refreshToken);
      localStorage.setItem('user', JSON.stringify(result.user));
      set({
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: any) {
      set({ isLoading: false, error: err.response?.data?.message || '注册失败' });
      throw err;
    }
  },

  logout: async () => {
    const token = get().refreshToken;
    if (token) {
      await authApi.logout(token).catch(() => {});
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },

  clearError: () => set({ error: null }),

  hydrate: () => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;
    if (accessToken && refreshToken) {
      set({ accessToken, refreshToken, user, isAuthenticated: true });
    }
  },
}));
