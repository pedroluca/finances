import { query, queryOne } from '../lib/db';
import type { Category, CreateCategoryDTO } from '../types/database';

export class CategoryService {
  /**
   * Listar categorias do usuário
   */
  static async getUserCategories(userId: number): Promise<Category[]> {
    try {
      const categories = await query<Category[]>(
        'SELECT * FROM categories WHERE user_id = ? ORDER BY name ASC',
        [userId]
      );
      return categories;
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      return [];
    }
  }

  /**
   * Buscar categoria por ID
   */
  static async getCategoryById(
    categoryId: number,
    userId: number
  ): Promise<Category | null> {
    try {
      const category = await queryOne<Category>(
        'SELECT * FROM categories WHERE id = ? AND user_id = ?',
        [categoryId, userId]
      );
      return category;
    } catch (error) {
      console.error('Erro ao buscar categoria:', error);
      return null;
    }
  }

  /**
   * Criar categoria
   */
  static async createCategory(
    data: CreateCategoryDTO
  ): Promise<Category | null> {
    try {
      const result = await query<{ insertId: number }>(
        'INSERT INTO categories (user_id, name, color, icon) VALUES (?, ?, ?, ?)',
        [data.user_id, data.name, data.color || '#6366f1', data.icon || '📦']
      );

      const category = await queryOne<Category>(
        'SELECT * FROM categories WHERE id = ?',
        [result.insertId]
      );

      return category;
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      return null;
    }
  }

  /**
   * Atualizar categoria
   */
  static async updateCategory(
    categoryId: number,
    userId: number,
    data: Partial<CreateCategoryDTO>
  ): Promise<Category | null> {
    try {
      const updates: string[] = [];
      const values: unknown[] = [];

      if (data.name !== undefined) {
        updates.push('name = ?');
        values.push(data.name);
      }
      if (data.color !== undefined) {
        updates.push('color = ?');
        values.push(data.color);
      }
      if (data.icon !== undefined) {
        updates.push('icon = ?');
        values.push(data.icon);
      }

      if (updates.length === 0) {
        return null;
      }

      values.push(categoryId, userId);

      await query(
        `UPDATE categories SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
        values
      );

      const category = await queryOne<Category>(
        'SELECT * FROM categories WHERE id = ?',
        [categoryId]
      );

      return category;
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      return null;
    }
  }

  /**
   * Deletar categoria
   */
  static async deleteCategory(
    categoryId: number,
    userId: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Verificar se há itens usando esta categoria
      const itemCount = await queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM invoice_items 
         WHERE category_id = ?`,
        [categoryId]
      );

      if (itemCount && itemCount.count > 0) {
        return {
          success: false,
          message: `Não é possível deletar. Existem ${itemCount.count} itens usando esta categoria.`,
        };
      }

      const result = await query<{ affectedRows: number }>(
        'DELETE FROM categories WHERE id = ? AND user_id = ?',
        [categoryId, userId]
      );

      if (result.affectedRows === 0) {
        return {
          success: false,
          message: 'Categoria não encontrada',
        };
      }

      return {
        success: true,
        message: 'Categoria deletada com sucesso',
      };
    } catch (error) {
      console.error('Erro ao deletar categoria:', error);
      return {
        success: false,
        message: 'Erro ao deletar categoria',
      };
    }
  }

  /**
   * Buscar ou criar categoria por nome
   */
  static async getOrCreateByName(
    userId: number,
    name: string,
    options?: { color?: string; icon?: string }
  ): Promise<Category | null> {
    try {
      // Tentar buscar
      let category = await queryOne<Category>(
        'SELECT * FROM categories WHERE user_id = ? AND name = ?',
        [userId, name]
      );

      if (category) {
        return category;
      }

      // Criar se não existir
      category = await this.createCategory({
        user_id: userId,
        name,
        color: options?.color,
        icon: options?.icon,
      });

      return category;
    } catch (error) {
      console.error('Erro ao buscar/criar categoria:', error);
      return null;
    }
  }
}
