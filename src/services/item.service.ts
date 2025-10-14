import { query, queryOne, queryWithConnection, transaction } from '../lib/db';
import type {
  InvoiceItem,
  InvoiceItemWithDetails,
  CreateInvoiceItemDTO,
  CreateInstallmentDTO,
} from '../types/database';
import { InvoiceService } from './invoice.service';

export class ItemService {
  /**
   * Listar itens de uma fatura
   */
  static async getInvoiceItems(
    invoiceId: number,
    userId: number
  ): Promise<InvoiceItemWithDetails[]> {
    try {
      const items = await query<InvoiceItemWithDetails[]>(
        `SELECT ii.* FROM invoice_item_details ii
         INNER JOIN invoices i ON ii.invoice_id = i.id
         INNER JOIN cards c ON i.card_id = c.id
         WHERE ii.invoice_id = ? AND (c.user_id = ? OR c.id IN (
           SELECT card_id FROM card_owners WHERE user_id = ?
         ))
         ORDER BY ii.created_at DESC`,
        [invoiceId, userId, userId]
      );
      return items;
    } catch (error) {
      console.error('Erro ao buscar itens da fatura:', error);
      return [];
    }
  }

  /**
   * Buscar item por ID
   */
  static async getItemById(
    itemId: number,
    userId: number
  ): Promise<InvoiceItemWithDetails | null> {
    try {
      const item = await queryOne<InvoiceItemWithDetails>(
        `SELECT ii.* FROM invoice_item_details ii
         INNER JOIN invoices i ON ii.invoice_id = i.id
         INNER JOIN cards c ON i.card_id = c.id
         WHERE ii.id = ? AND (c.user_id = ? OR c.id IN (
           SELECT card_id FROM card_owners WHERE user_id = ?
         ))`,
        [itemId, userId, userId]
      );
      return item;
    } catch (error) {
      console.error('Erro ao buscar item:', error);
      return null;
    }
  }

  /**
   * Criar item simples (não parcelado)
   */
  static async createItem(
    data: CreateInvoiceItemDTO,
    userId: number
  ): Promise<InvoiceItem | null> {
    try {
      // Verificar permissão na fatura
      const invoice = await InvoiceService.getInvoiceById(data.invoice_id, userId);
      if (!invoice) {
        throw new Error('Fatura não encontrada ou sem permissão');
      }

      const result = await query<{ insertId: number }>(
        `INSERT INTO invoice_items 
         (invoice_id, description, amount, category_id, author_id, purchase_date, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.invoice_id,
          data.description,
          data.amount,
          data.category_id || null,
          data.author_id,
          data.purchase_date || null,
          data.notes || null,
        ]
      );

      const item = await queryOne<InvoiceItem>(
        'SELECT * FROM invoice_items WHERE id = ?',
        [result.insertId]
      );

      return item;
    } catch (error) {
      console.error('Erro ao criar item:', error);
      return null;
    }
  }

  /**
   * Criar compra parcelada
   */
  static async createInstallment(
    data: CreateInstallmentDTO,
    userId: number
  ): Promise<{ success: boolean; message: string; items?: InvoiceItem[] }> {
    try {
      const result = await transaction(async (connection) => {
        // Verificar permissão no cartão
        const card = await queryWithConnection<Array<{ user_id: number }>>(
          connection,
          `SELECT user_id FROM cards 
           WHERE id = ? AND (user_id = ? OR id IN (
             SELECT card_id FROM card_owners WHERE user_id = ? AND permission IN ('edit', 'admin')
           ))`,
          [data.card_id, userId, userId]
        );

        if (!card || card.length === 0) {
          throw new Error('Cartão não encontrado ou sem permissão');
        }

        // Calcular valor da parcela
        const installmentAmount = data.total_amount / data.total_installments;

        // Gerar ID único para o grupo de parcelas
        const installmentGroupId = crypto.randomUUID();

        const items: InvoiceItem[] = [];

        let currentMonth = data.start_month;
        let currentYear = data.start_year;

        // Determinar a partir de qual parcela criar (padrão: 1)
        const startInstallment = data.current_installment || 1;

        // Criar parcelas a partir da parcela atual até a última
        for (let i = startInstallment; i <= data.total_installments; i++) {
          // Criar fatura se não existir
          await queryWithConnection(
            connection,
            'CALL create_invoice_for_card(?, ?, ?)',
            [data.card_id, currentMonth, currentYear]
          );

          // Buscar ID da fatura
          const invoice = await queryWithConnection<Array<{ id: number }>>(
            connection,
            'SELECT id FROM invoices WHERE card_id = ? AND reference_month = ? AND reference_year = ?',
            [data.card_id, currentMonth, currentYear]
          );

          if (!invoice || invoice.length === 0) {
            throw new Error('Erro ao criar fatura');
          }

          const invoiceId = invoice[0].id;

          // Inserir item
          const itemResult = await queryWithConnection<{ insertId: number }>(
            connection,
            `INSERT INTO invoice_items 
             (invoice_id, description, amount, category_id, author_id, 
              is_installment, installment_number, total_installments, 
              installment_group_id, purchase_date)
             VALUES (?, ?, ?, ?, ?, TRUE, ?, ?, ?, ?)`,
            [
              invoiceId,
              `${data.description} (${i}/${data.total_installments})`,
              installmentAmount,
              data.category_id || null,
              data.author_id,
              i,
              data.total_installments,
              installmentGroupId,
              data.purchase_date || null,
            ]
          );

          const item = await queryWithConnection<InvoiceItem[]>(
            connection,
            'SELECT * FROM invoice_items WHERE id = ?',
            [itemResult.insertId]
          );

          if (item && item.length > 0) {
            items.push(item[0]);
          }

          // Avançar para o próximo mês
          if (currentMonth === 12) {
            currentMonth = 1;
            currentYear++;
          } else {
            currentMonth++;
          }
        }

        return items;
      });

      return {
        success: true,
        message: 'Parcelas criadas com sucesso',
        items: result,
      };
    } catch (error) {
      console.error('Erro ao criar parcelamento:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Erro ao criar parcelamento',
      };
    }
  }

  /**
   * Atualizar item
   */
  static async updateItem(
    itemId: number,
    userId: number,
    data: Partial<CreateInvoiceItemDTO>
  ): Promise<InvoiceItem | null> {
    try {
      // Verificar permissão
      const item = await this.getItemById(itemId, userId);
      if (!item) {
        throw new Error('Item não encontrado ou sem permissão');
      }

      const updates: string[] = [];
      const values: unknown[] = [];

      if (data.description !== undefined) {
        updates.push('description = ?');
        values.push(data.description);
      }
      if (data.amount !== undefined) {
        updates.push('amount = ?');
        values.push(data.amount);
      }
      if (data.category_id !== undefined) {
        updates.push('category_id = ?');
        values.push(data.category_id);
      }
      if (data.author_id !== undefined) {
        updates.push('author_id = ?');
        values.push(data.author_id);
      }
      if (data.purchase_date !== undefined) {
        updates.push('purchase_date = ?');
        values.push(data.purchase_date);
      }
      if (data.notes !== undefined) {
        updates.push('notes = ?');
        values.push(data.notes);
      }

      if (updates.length === 0) {
        return null;
      }

      values.push(itemId);

      await query(
        `UPDATE invoice_items SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      const updatedItem = await queryOne<InvoiceItem>(
        'SELECT * FROM invoice_items WHERE id = ?',
        [itemId]
      );

      return updatedItem;
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      return null;
    }
  }

  /**
   * Marcar item como pago/não pago
   */
  static async togglePaidStatus(
    itemId: number,
    userId: number,
    isPaid: boolean
  ): Promise<boolean> {
    try {
      const item = await this.getItemById(itemId, userId);
      if (!item) {
        return false;
      }

      await query('UPDATE invoice_items SET is_paid = ? WHERE id = ?', [
        isPaid,
        itemId,
      ]);

      return true;
    } catch (error) {
      console.error('Erro ao atualizar status de pagamento:', error);
      return false;
    }
  }

  /**
   * Marcar múltiplos itens como pagos
   */
  static async markMultipleAsPaid(
    itemIds: number[],
    userId: number,
    isPaid: boolean = true
  ): Promise<{ success: boolean; count: number }> {
    try {
      if (itemIds.length === 0) {
        return { success: true, count: 0 };
      }

      // Verificar permissão em todos os itens
      const placeholders = itemIds.map(() => '?').join(',');
      const items = await query<InvoiceItemWithDetails[]>(
        `SELECT ii.id FROM invoice_item_details ii
         INNER JOIN invoices i ON ii.invoice_id = i.id
         INNER JOIN cards c ON i.card_id = c.id
         WHERE ii.id IN (${placeholders}) AND (c.user_id = ? OR c.id IN (
           SELECT card_id FROM card_owners WHERE user_id = ?
         ))`,
        [...itemIds, userId, userId]
      );

      if (items.length !== itemIds.length) {
        throw new Error('Alguns itens não foram encontrados ou você não tem permissão');
      }

      const result = await query<{ affectedRows: number }>(
        `UPDATE invoice_items SET is_paid = ? WHERE id IN (${placeholders})`,
        [isPaid, ...itemIds]
      );

      return {
        success: true,
        count: result.affectedRows || 0,
      };
    } catch (error) {
      console.error('Erro ao marcar múltiplos itens:', error);
      return { success: false, count: 0 };
    }
  }

  /**
   * Deletar item
   */
  static async deleteItem(itemId: number, userId: number): Promise<boolean> {
    try {
      const item = await this.getItemById(itemId, userId);
      if (!item) {
        return false;
      }

      await query('DELETE FROM invoice_items WHERE id = ?', [itemId]);
      return true;
    } catch (error) {
      console.error('Erro ao deletar item:', error);
      return false;
    }
  }

  /**
   * Deletar todas as parcelas de um grupo
   */
  static async deleteInstallmentGroup(
    groupId: string,
    userId: number
  ): Promise<{ success: boolean; count: number }> {
    try {
      // Buscar itens do grupo
      const items = await query<InvoiceItemWithDetails[]>(
        `SELECT ii.id FROM invoice_item_details ii
         INNER JOIN invoices i ON ii.invoice_id = i.id
         INNER JOIN cards c ON i.card_id = c.id
         WHERE ii.installment_group_id = ? AND (c.user_id = ? OR c.id IN (
           SELECT card_id FROM card_owners WHERE user_id = ?
         ))`,
        [groupId, userId, userId]
      );

      if (items.length === 0) {
        return { success: false, count: 0 };
      }

      const result = await query<{ affectedRows: number }>(
        'DELETE FROM invoice_items WHERE installment_group_id = ?',
        [groupId]
      );

      return {
        success: true,
        count: result.affectedRows || 0,
      };
    } catch (error) {
      console.error('Erro ao deletar grupo de parcelas:', error);
      return { success: false, count: 0 };
    }
  }

  /**
   * Buscar itens de um grupo de parcelas
   */
  static async getInstallmentGroupItems(
    groupId: string,
    userId: number
  ): Promise<InvoiceItemWithDetails[]> {
    try {
      const items = await query<InvoiceItemWithDetails[]>(
        `SELECT ii.* FROM invoice_item_details ii
         INNER JOIN invoices i ON ii.invoice_id = i.id
         INNER JOIN cards c ON i.card_id = c.id
         WHERE ii.installment_group_id = ? AND (c.user_id = ? OR c.id IN (
           SELECT card_id FROM card_owners WHERE user_id = ?
         ))
         ORDER BY ii.installment_number ASC`,
        [groupId, userId, userId]
      );
      return items;
    } catch (error) {
      console.error('Erro ao buscar parcelas do grupo:', error);
      return [];
    }
  }

  /**
   * Obter total selecionado (soma de itens específicos)
   */
  static async getSelectedTotal(
    itemIds: number[],
    userId: number
  ): Promise<number> {
    try {
      if (itemIds.length === 0) {
        return 0;
      }

      const placeholders = itemIds.map(() => '?').join(',');
      const result = await queryOne<{ total: number }>(
        `SELECT COALESCE(SUM(ii.amount), 0) as total
         FROM invoice_items ii
         INNER JOIN invoices i ON ii.invoice_id = i.id
         INNER JOIN cards c ON i.card_id = c.id
         WHERE ii.id IN (${placeholders}) AND (c.user_id = ? OR c.id IN (
           SELECT card_id FROM card_owners WHERE user_id = ?
         ))`,
        [...itemIds, userId, userId]
      );

      return result?.total || 0;
    } catch (error) {
      console.error('Erro ao calcular total selecionado:', error);
      return 0;
    }
  }
}
