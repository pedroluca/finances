import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '../types/database';
import { phpApiRequest } from '../lib/api';

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
          const response = await phpApiRequest('auth.php?action=login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          });
          if (response.success && response.user && response.token) {
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
            message: response.message || 'Erro ao fazer login',
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
          const response = await phpApiRequest('auth.php?action=register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, confirmPassword })
          });
          if (response.success && response.user && response.token) {
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
        // Limpar COMPLETAMENTE o localStorage
        localStorage.clear();
        // Forçar reload completo da página para garantir que nada fique em cache
        window.location.href = '/login';
      },

      verifyAuth: async () => {
        const { token } = get();

        if (!token) {
          set({ isAuthenticated: false, user: null });
          return;
        }

        try {
          const response = await phpApiRequest('auth.php?action=verify', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (response.success && response.user) {
            set({
              user: response.user,
              isAuthenticated: true,
            });
          } else {
            // NÃO fazer logout automático - apenas desautenticar
            set({
              user: null,
              token: null,
              isAuthenticated: false,
            });
          }
        } catch (error) {
          console.error('Erro ao verificar autenticação:', error);
          // Em caso de erro, manter o estado atual (pode ser erro de rede temporário)
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
