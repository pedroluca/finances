import { query, queryOne } from '../lib/db';
import type { Author, CreateAuthorDTO } from '../types/database';

export class AuthorService {
  /**
   * Listar autores do usuário
   */
  static async getUserAuthors(userId: number): Promise<Author[]> {
    try {
      const authors = await query<Author[]>(
        'SELECT * FROM authors WHERE user_id = ? ORDER BY is_owner DESC, name ASC',
        [userId]
      );
      return authors;
    } catch (error) {
      console.error('Erro ao buscar autores:', error);
      return [];
    }
  }

  /**
   * Buscar autor por ID
   */
  static async getAuthorById(
    authorId: number,
    userId: number
  ): Promise<Author | null> {
    try {
      const author = await queryOne<Author>(
        'SELECT * FROM authors WHERE id = ? AND user_id = ?',
        [authorId, userId]
      );
      return author;
    } catch (error) {
      console.error('Erro ao buscar autor:', error);
      return null;
    }
  }

  /**
   * Criar autor
   */
  static async createAuthor(data: CreateAuthorDTO): Promise<Author | null> {
    let retries = 3;
    
    while (retries > 0) {
      try {
        const result = await query<{ insertId: number }>(
          'INSERT INTO authors (user_id, name, is_owner) VALUES (?, ?, ?)',
          [data.user_id, data.name, data.is_owner || false]
        );

        const author = await queryOne<Author>(
          'SELECT * FROM authors WHERE id = ?',
          [result.insertId]
        );

        return author;
      } catch (error) {
        // Se for erro de conexão, tenta novamente
        const err = error as { code?: string };
        if (err.code === 'ECONNRESET' && retries > 1) {
          console.log(`Tentando criar autor novamente... (${retries - 1} tentativas restantes)`);
          retries--;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Espera 1 segundo
          continue;
        }
        
        console.error('Erro ao criar autor:', error);
        return null;
      }
    }
    
    return null;
  }

  /**
   * Atualizar autor
   */
  static async updateAuthor(
    authorId: number,
    userId: number,
    data: Partial<CreateAuthorDTO>
  ): Promise<Author | null> {
    try {
      const updates: string[] = [];
      const values: unknown[] = [];

      if (data.name !== undefined) {
        updates.push('name = ?');
        values.push(data.name);
      }
      if (data.is_owner !== undefined) {
        updates.push('is_owner = ?');
        values.push(data.is_owner);
      }

      if (updates.length === 0) {
        return null;
      }

      values.push(authorId, userId);

      await query(
        `UPDATE authors SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
        values
      );

      const author = await queryOne<Author>(
        'SELECT * FROM authors WHERE id = ?',
        [authorId]
      );

      return author;
    } catch (error) {
      console.error('Erro ao atualizar autor:', error);
      return null;
    }
  }

  /**
   * Deletar autor
   */
  static async deleteAuthor(
    authorId: number,
    userId: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Verificar se há itens usando este autor
      const itemCount = await queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM invoice_items WHERE author_id = ?',
        [authorId]
      );

      if (itemCount && itemCount.count > 0) {
        return {
          success: false,
          message: `Não é possível deletar. Existem ${itemCount.count} itens deste autor.`,
        };
      }

      const result = await query<{ affectedRows: number }>(
        'DELETE FROM authors WHERE id = ? AND user_id = ?',
        [authorId, userId]
      );

      if (result.affectedRows === 0) {
        return {
          success: false,
          message: 'Autor não encontrado',
        };
      }

      return {
        success: true,
        message: 'Autor deletado com sucesso',
      };
    } catch (error) {
      console.error('Erro ao deletar autor:', error);
      return {
        success: false,
        message: 'Erro ao deletar autor',
      };
    }
  }

  /**
   * Buscar ou criar autor por nome
   */
  static async getOrCreateByName(
    userId: number,
    name: string,
    isOwner: boolean = false
  ): Promise<Author | null> {
    try {
      // Tentar buscar
      let author = await queryOne<Author>(
        'SELECT * FROM authors WHERE user_id = ? AND name = ?',
        [userId, name]
      );

      if (author) {
        return author;
      }

      // Criar se não existir
      author = await this.createAuthor({
        user_id: userId,
        name,
        is_owner: isOwner,
      });

      return author;
    } catch (error) {
      console.error('Erro ao buscar/criar autor:', error);
      return null;
    }
  }

  /**
   * Obter autor padrão (o próprio usuário)
   */
  static async getDefaultAuthor(userId: number): Promise<Author | null> {
    try {
      const author = await queryOne<Author>(
        'SELECT * FROM authors WHERE user_id = ? AND is_owner = TRUE LIMIT 1',
        [userId]
      );
      return author;
    } catch (error) {
      console.error('Erro ao buscar autor padrão:', error);
      return null;
    }
  }

  /**
   * Obter estatísticas de gastos por autor
   */
  static async getAuthorStats(
    userId: number,
    month?: number,
    year?: number
  ): Promise<
    Array<{
      author_id: number;
      author_name: string;
      total_amount: number;
      total_items: number;
      total_paid: number;
    }>
  > {
    try {
      let sql = `
        SELECT 
          a.id as author_id,
          a.name as author_name,
          COALESCE(SUM(ii.amount), 0) as total_amount,
          COUNT(ii.id) as total_items,
          COALESCE(SUM(CASE WHEN ii.is_paid THEN ii.amount ELSE 0 END), 0) as total_paid
        FROM authors a
        LEFT JOIN invoice_items ii ON a.id = ii.author_id
        LEFT JOIN invoices i ON ii.invoice_id = i.id
        WHERE a.user_id = ?
      `;

      const params: unknown[] = [userId];

      if (year !== undefined) {
        sql += ' AND i.reference_year = ?';
        params.push(year);
      }

      if (month !== undefined) {
        sql += ' AND i.reference_month = ?';
        params.push(month);
      }

      sql += ' GROUP BY a.id, a.name ORDER BY total_amount DESC';

      const stats = await query<
        Array<{
          author_id: number;
          author_name: string;
          total_amount: number;
          total_items: number;
          total_paid: number;
        }>
      >(sql, params);

      return stats;
    } catch (error) {
      console.error('Erro ao buscar estatísticas de autores:', error);
      return [];
    }
  }
}
