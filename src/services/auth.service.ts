import bcrypt from 'bcryptjs';
import { query, queryOne } from '../lib/db';
import type { User, CreateUserDTO } from '../types/database';

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthResponse {
  success: boolean;
  user?: Omit<User, 'password_hash'>;
  token?: string;
  message?: string;
}

export class AuthService {
  /**
   * Registrar novo usuário
   */
  static async register(data: CreateUserDTO): Promise<AuthResponse> {
    try {
      // Verificar se o email já existe
      const existingUser = await queryOne<User>(
        'SELECT id FROM users WHERE email = ?',
        [data.email]
      );

      if (existingUser) {
        return {
          success: false,
          message: 'Este email já está cadastrado',
        };
      }

      // Hash da senha
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(data.password, salt);

      // Inserir usuário
      const result = await query<{ insertId: number }>(
        'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
        [data.name, data.email, password_hash]
      );

      const userId = result.insertId;

      // Buscar usuário criado
      const user = await queryOne<User>(
        'SELECT id, name, email, created_at, updated_at FROM users WHERE id = ?',
        [userId]
      );

      if (!user) {
        return {
          success: false,
          message: 'Erro ao criar usuário',
        };
      }

      // Criar categorias padrão para o usuário
      await this.createDefaultCategories(userId);

      // Criar autor padrão (o próprio usuário)
      await query(
        'INSERT INTO authors (user_id, name, is_owner) VALUES (?, ?, TRUE)',
        [userId, data.name]
      );

      // Gerar token simples (em produção, use JWT)
      const token = this.generateToken(user);

      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          created_at: user.created_at,
          updated_at: user.updated_at,
        } as Omit<User, 'password_hash'>,
        token,
      };
    } catch (error) {
      console.error('Erro ao registrar usuário:', error);
      return {
        success: false,
        message: 'Erro ao registrar usuário',
      };
    }
  }

  /**
   * Fazer login
   */
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Buscar usuário por email
      const user = await queryOne<User>(
        'SELECT * FROM users WHERE email = ?',
        [credentials.email]
      );

      if (!user) {
        return {
          success: false,
          message: 'Email ou senha incorretos',
        };
      }

      // Verificar senha
      const isValidPassword = await bcrypt.compare(
        credentials.password,
        user.password_hash
      );

      if (!isValidPassword) {
        return {
          success: false,
          message: 'Email ou senha incorretos',
        };
      }

      // Gerar token
      const token = this.generateToken(user);

      return {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          created_at: user.created_at,
          updated_at: user.updated_at,
        } as Omit<User, 'password_hash'>,
        token,
      };
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return {
        success: false,
        message: 'Erro ao fazer login',
      };
    }
  }

  /**
   * Verificar token e retornar usuário
   */
  static async verifyToken(token: string): Promise<User | null> {
    try {
      // Decodificar token simples (em produção, use JWT)
      const userId = this.decodeToken(token);
      
      if (!userId) {
        return null;
      }

      const user = await queryOne<User>(
        'SELECT id, name, email, created_at, updated_at FROM users WHERE id = ?',
        [userId]
      );

      return user;
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      return null;
    }
  }

  /**
   * Criar categorias padrão para um novo usuário
   */
  private static async createDefaultCategories(userId: number): Promise<void> {
    const defaultCategories = [
      { name: 'Alimentação', icon: '🍔', color: '#ef4444' },
      { name: 'Transporte', icon: '🚗', color: '#3b82f6' },
      { name: 'Saúde', icon: '💊', color: '#10b981' },
      { name: 'Educação', icon: '📚', color: '#8b5cf6' },
      { name: 'Lazer', icon: '🎮', color: '#f59e0b' },
      { name: 'Moradia', icon: '🏠', color: '#06b6d4' },
      { name: 'Streaming', icon: '📺', color: '#ec4899' },
      { name: 'Compras', icon: '🛒', color: '#14b8a6' },
      { name: 'Contas', icon: '📄', color: '#6366f1' },
      { name: 'Outros', icon: '📦', color: '#64748b' },
    ];

    for (const category of defaultCategories) {
      await query(
        'INSERT INTO categories (user_id, name, icon, color) VALUES (?, ?, ?, ?)',
        [userId, category.name, category.icon, category.color]
      );
    }
  }

  /**
   * Gerar token simples (Base64 do ID + timestamp)
   * Em produção, use JWT com assinatura
   */
  private static generateToken(user: User): string {
    const payload = {
      userId: user.id,
      email: user.email,
      timestamp: Date.now(),
    };
    return btoa(JSON.stringify(payload));
  }

  /**
   * Decodificar token simples
   */
  private static decodeToken(token: string): number | null {
    try {
      const payload = JSON.parse(atob(token));
      return payload.userId;
    } catch {
      return null;
    }
  }

  /**
   * Atualizar perfil do usuário
   */
  static async updateProfile(
    userId: number,
    data: { name?: string; email?: string }
  ): Promise<AuthResponse> {
    try {
      const updates: string[] = [];
      const values: unknown[] = [];

      if (data.name) {
        updates.push('name = ?');
        values.push(data.name);
      }

      if (data.email) {
        // Verificar se o email já está em uso
        const existingUser = await queryOne<User>(
          'SELECT id FROM users WHERE email = ? AND id != ?',
          [data.email, userId]
        );

        if (existingUser) {
          return {
            success: false,
            message: 'Este email já está em uso',
          };
        }

        updates.push('email = ?');
        values.push(data.email);
      }

      if (updates.length === 0) {
        return {
          success: false,
          message: 'Nenhum dado para atualizar',
        };
      }

      values.push(userId);

      await query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      const user = await queryOne<User>(
        'SELECT id, name, email, created_at, updated_at FROM users WHERE id = ?',
        [userId]
      );

      return {
        success: true,
        user: user as Omit<User, 'password_hash'>,
      };
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      return {
        success: false,
        message: 'Erro ao atualizar perfil',
      };
    }
  }

  /**
   * Alterar senha
   */
  static async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Buscar usuário
      const user = await queryOne<User>(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );

      if (!user) {
        return {
          success: false,
          message: 'Usuário não encontrado',
        };
      }

      // Verificar senha atual
      const isValidPassword = await bcrypt.compare(
        currentPassword,
        user.password_hash
      );

      if (!isValidPassword) {
        return {
          success: false,
          message: 'Senha atual incorreta',
        };
      }

      // Hash da nova senha
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(newPassword, salt);

      // Atualizar senha
      await query('UPDATE users SET password_hash = ? WHERE id = ?', [
        password_hash,
        userId,
      ]);

      return {
        success: true,
        message: 'Senha alterada com sucesso',
      };
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      return {
        success: false,
        message: 'Erro ao alterar senha',
      };
    }
  }
}
