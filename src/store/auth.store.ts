import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types/database';
import { AuthService } from '../services/auth.api';
import { apiClient } from '../lib/api';

interface AuthState {
  user: Omit<User, 'password_hash'> | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (name: string, email: string, password: string, confirmPassword: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  verifyAuth: () => Promise<void>;
  updateUser: (user: Omit<User, 'password_hash'>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const response = await AuthService.login({ email, password });
          
          if (response.success && response.user && response.token) {
            apiClient.setToken(response.token);
            set({
              user: response.user,
              token: response.token,
              isAuthenticated: true,
              isLoading: false,
            });
            return { success: true };
          }

          set({ isLoading: false });
          return {
            success: false,
            message: 'Erro ao fazer login',
          };
        } catch {
          set({ isLoading: false });
          return {
            success: false,
            message: 'Erro ao fazer login',
          };
        }
      },

      register: async (name, email, password, confirmPassword) => {
        set({ isLoading: true });
        try {
          const response = await AuthService.register({ name, email, password, confirmPassword });
          
          if (response.success && response.user && response.token) {
            apiClient.setToken(response.token);
            set({
              user: response.user,
              token: response.token,
              isAuthenticated: true,
              isLoading: false,
            });
            return { success: true };
          }

          set({ isLoading: false });
          return {
            success: false,
            message: response.message || 'Erro ao registrar',
          };
        } catch {
          set({ isLoading: false });
          return {
            success: false,
            message: 'Erro ao registrar',
          };
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      verifyAuth: async () => {
        const { token } = get();
        
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        try {
          apiClient.setToken(token);
          const user = await AuthService.verifyToken(token);
          
          if (user) {
            set({
              user: {
                id: user.id,
                name: user.name,
                email: user.email,
                created_at: user.created_at,
                updated_at: user.updated_at,
              },
              isAuthenticated: true,
            });
          } else {
            set({
              user: null,
              token: null,
              isAuthenticated: false,
            });
          }
        } catch {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
          });
        }
      },

      updateUser: (user) => {
        set({ user });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
