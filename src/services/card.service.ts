import { query, queryOne } from '../lib/db';
import type {
  Card,
  CardWithBalance,
  CreateCardDTO,
  CardOwner,
} from '../types/database';

export class CardService {
  /**
   * Listar todos os cartões do usuário
   */
  static async getUserCards(userId: number): Promise<Card[]> {
    try {
      const cards = await query<Card[]>(
        `SELECT c.* FROM cards c
         WHERE c.user_id = ? OR c.id IN (
           SELECT card_id FROM card_owners WHERE user_id = ?
         )
         ORDER BY c.active DESC, c.name ASC`,
        [userId, userId]
      );
      return cards;
    } catch (error) {
      console.error('Erro ao buscar cartões:', error);
      return [];
    }
  }

  /**
   * Buscar cartão por ID com saldo disponível
   */
  static async getCardById(
    cardId: number,
    userId: number
  ): Promise<CardWithBalance | null> {
    try {
      const card = await queryOne<CardWithBalance>(
        `SELECT * FROM card_available_balance 
         WHERE card_id = ? AND user_id = ?`,
        [cardId, userId]
      );
      return card;
    } catch (error) {
      console.error('Erro ao buscar cartão:', error);
      return null;
    }
  }

  /**
   * Criar novo cartão
   */
  static async createCard(data: CreateCardDTO): Promise<Card | null> {
    try {
      const result = await query<{ insertId: number }>(
        `INSERT INTO cards (user_id, name, card_limit, closing_day, due_day, color)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          data.user_id,
          data.name,
          data.card_limit,
          data.closing_day,
          data.due_day,
          data.color || '#6366f1',
        ]
      );

      const card = await queryOne<Card>(
        'SELECT * FROM cards WHERE id = ?',
        [result.insertId]
      );

      return card;
    } catch (error) {
      console.error('Erro ao criar cartão:', error);
      return null;
    }
  }

  /**
   * Atualizar cartão
   */
  static async updateCard(
    cardId: number,
    userId: number,
    data: Partial<CreateCardDTO>
  ): Promise<Card | null> {
    try {
      // Verificar permissão
      const hasPermission = await this.checkPermission(cardId, userId, 'edit');
      if (!hasPermission) {
        throw new Error('Sem permissão para editar este cartão');
      }

      const updates: string[] = [];
      const values: unknown[] = [];

      if (data.name !== undefined) {
        updates.push('name = ?');
        values.push(data.name);
      }
      if (data.card_limit !== undefined) {
        updates.push('card_limit = ?');
        values.push(data.card_limit);
      }
      if (data.closing_day !== undefined) {
        updates.push('closing_day = ?');
        values.push(data.closing_day);
      }
      if (data.due_day !== undefined) {
        updates.push('due_day = ?');
        values.push(data.due_day);
      }
      if (data.color !== undefined) {
        updates.push('color = ?');
        values.push(data.color);
      }

      if (updates.length === 0) {
        return null;
      }

      values.push(cardId);

      await query(`UPDATE cards SET ${updates.join(', ')} WHERE id = ?`, values);

      const card = await queryOne<Card>('SELECT * FROM cards WHERE id = ?', [
        cardId,
      ]);

      return card;
    } catch (error) {
      console.error('Erro ao atualizar cartão:', error);
      return null;
    }
  }

  /**
   * Desativar cartão
   */
  static async deactivateCard(
    cardId: number,
    userId: number
  ): Promise<boolean> {
    try {
      // Verificar se é o dono
      const card = await queryOne<Card>(
        'SELECT * FROM cards WHERE id = ? AND user_id = ?',
        [cardId, userId]
      );

      if (!card) {
        return false;
      }

      await query('UPDATE cards SET active = FALSE WHERE id = ?', [cardId]);
      return true;
    } catch (error) {
      console.error('Erro ao desativar cartão:', error);
      return false;
    }
  }

  /**
   * Reativar cartão
   */
  static async activateCard(cardId: number, userId: number): Promise<boolean> {
    try {
      const card = await queryOne<Card>(
        'SELECT * FROM cards WHERE id = ? AND user_id = ?',
        [cardId, userId]
      );

      if (!card) {
        return false;
      }

      await query('UPDATE cards SET active = TRUE WHERE id = ?', [cardId]);
      return true;
    } catch (error) {
      console.error('Erro ao reativar cartão:', error);
      return false;
    }
  }

  /**
   * Compartilhar cartão com outro usuário
   */
  static async shareCard(
    cardId: number,
    ownerId: number,
    userEmail: string,
    permission: 'view' | 'edit' | 'admin'
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Verificar se é o dono
      const card = await queryOne<Card>(
        'SELECT * FROM cards WHERE id = ? AND user_id = ?',
        [cardId, ownerId]
      );

      if (!card) {
        return {
          success: false,
          message: 'Cartão não encontrado ou sem permissão',
        };
      }

      // Buscar usuário pelo email
      const user = await queryOne<{ id: number }>(
        'SELECT id FROM users WHERE email = ?',
        [userEmail]
      );

      if (!user) {
        return {
          success: false,
          message: 'Usuário não encontrado',
        };
      }

      // Verificar se já está compartilhado
      const existing = await queryOne<CardOwner>(
        'SELECT * FROM card_owners WHERE card_id = ? AND user_id = ?',
        [cardId, user.id]
      );

      if (existing) {
        // Atualizar permissão
        await query(
          'UPDATE card_owners SET permission = ? WHERE card_id = ? AND user_id = ?',
          [permission, cardId, user.id]
        );
      } else {
        // Inserir novo compartilhamento
        await query(
          'INSERT INTO card_owners (card_id, user_id, permission) VALUES (?, ?, ?)',
          [cardId, user.id, permission]
        );
      }

      return {
        success: true,
        message: 'Cartão compartilhado com sucesso',
      };
    } catch (error) {
      console.error('Erro ao compartilhar cartão:', error);
      return {
        success: false,
        message: 'Erro ao compartilhar cartão',
      };
    }
  }

  /**
   * Remover compartilhamento
   */
  static async unshareCard(
    cardId: number,
    ownerId: number,
    sharedUserId: number
  ): Promise<boolean> {
    try {
      // Verificar se é o dono
      const card = await queryOne<Card>(
        'SELECT * FROM cards WHERE id = ? AND user_id = ?',
        [cardId, ownerId]
      );

      if (!card) {
        return false;
      }

      await query(
        'DELETE FROM card_owners WHERE card_id = ? AND user_id = ?',
        [cardId, sharedUserId]
      );

      return true;
    } catch (error) {
      console.error('Erro ao remover compartilhamento:', error);
      return false;
    }
  }

  /**
   * Verificar permissão do usuário no cartão
   */
  static async checkPermission(
    cardId: number,
    userId: number,
    requiredPermission: 'view' | 'edit' | 'admin'
  ): Promise<boolean> {
    try {
      // Verificar se é o dono
      const card = await queryOne<Card>(
        'SELECT * FROM cards WHERE id = ? AND user_id = ?',
        [cardId, userId]
      );

      if (card) {
        return true; // Dono tem todas as permissões
      }

      // Verificar permissão compartilhada
      const owner = await queryOne<CardOwner>(
        'SELECT * FROM card_owners WHERE card_id = ? AND user_id = ?',
        [cardId, userId]
      );

      if (!owner) {
        return false;
      }

      // Hierarquia de permissões: admin > edit > view
      const permissions = ['view', 'edit', 'admin'];
      const userPermissionLevel = permissions.indexOf(owner.permission);
      const requiredPermissionLevel = permissions.indexOf(requiredPermission);

      return userPermissionLevel >= requiredPermissionLevel;
    } catch (error) {
      console.error('Erro ao verificar permissão:', error);
      return false;
    }
  }

  /**
   * Listar usuários com acesso ao cartão
   */
  static async getCardOwners(
    cardId: number
  ): Promise<Array<{ id: number; name: string; email: string; permission: string }>> {
    try {
      const owners = await query<Array<{ id: number; name: string; email: string; permission: string }>>(
        `SELECT u.id, u.name, u.email, co.permission
         FROM card_owners co
         INNER JOIN users u ON co.user_id = u.id
         WHERE co.card_id = ?`,
        [cardId]
      );

      return owners;
    } catch (error) {
      console.error('Erro ao buscar donos do cartão:', error);
      return [];
    }
  }
}
