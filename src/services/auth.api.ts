import { apiClient, isProduction } from '../lib/api';
import type { User, RegisterDTO, LoginDTO } from '../types/database';

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

export class AuthService {
  static async register(data: RegisterDTO): Promise<AuthResponse> {
    try {
      // Usa query param para Vercel, path para Express local
      const endpoint = isProduction ? '/auth?action=register' : '/auth/register';
      return await apiClient.post<AuthResponse>(endpoint, data);
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao registrar usuário'
      };
    }
  }

  static async login(data: LoginDTO): Promise<AuthResponse> {
    try {
      // Usa query param para Vercel, path para Express local
      const endpoint = isProduction ? '/auth?action=login' : '/auth/login';
      return await apiClient.post<AuthResponse>(endpoint, data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao fazer login';
      
      // Mensagens mais amigáveis
      if (message.includes('401') || message.toLowerCase().includes('credenciais')) {
        return {
          success: false,
          message: 'Email ou senha incorretos'
        };
      }
      
      if (message.includes('404') || message.toLowerCase().includes('não encontrado')) {
        return {
          success: false,
          message: 'Usuário não encontrado'
        };
      }
      
      if (message.includes('timeout') || message.includes('network')) {
        return {
          success: false,
          message: 'Erro de conexão. Verifique sua internet'
        };
      }
      
      return {
        success: false,
        message: message || 'Erro ao fazer login. Tente novamente'
      };
    }
  }

  static async verifyToken(token: string): Promise<User | null> {
    try {
      apiClient.setToken(token);
      // Usa query param para Vercel, path para Express local
      const endpoint = isProduction ? '/auth?action=verify' : '/auth/verify';
      const response = await apiClient.get<{ success: boolean; user: User }>(endpoint);
      return response.success ? response.user : null;
    } catch {
      return null;
    }
  }
}
