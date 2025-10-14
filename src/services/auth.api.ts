import { apiClient } from '../lib/api';
import type { User, RegisterDTO, LoginDTO } from '../types/database';

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

export class AuthService {
  static async register(data: RegisterDTO): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/register', data);
  }

  static async login(data: LoginDTO): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>('/auth/login', data);
  }

  static async verifyToken(token: string): Promise<User | null> {
    try {
      apiClient.setToken(token);
      const response = await apiClient.get<{ success: boolean; user: User }>('/auth/verify');
      return response.success ? response.user : null;
    } catch {
      return null;
    }
  }
}
