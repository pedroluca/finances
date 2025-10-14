import { query, queryOne, queryWithConnection, transaction } from '../lib/db';
import type {
  Invoice,
  InvoiceWithCard,
  MonthlyTotal,
} from '../types/database';

export class InvoiceService {
  /**
   * Listar faturas do usuário
   */
  static async getUserInvoices(
    userId: number,
    year?: number,
    month?: number
  ): Promise<InvoiceWithCard[]> {
    try {
      let sql = `
        SELECT * FROM invoice_details
        WHERE user_id = ?
      `;
      const params: unknown[] = [userId];

      if (year !== undefined) {
        sql += ' AND reference_year = ?';
        params.push(year);
      }

      if (month !== undefined) {
        sql += ' AND reference_month = ?';
        params.push(month);
      }

      sql += ' ORDER BY reference_year DESC, reference_month DESC, due_date ASC';

      const invoices = await query<InvoiceWithCard[]>(sql, params);
      return invoices;
    } catch (error) {
      console.error('Erro ao buscar faturas:', error);
      return [];
    }
  }

  /**
   * Buscar fatura por ID
   */
  static async getInvoiceById(
    invoiceId: number,
    userId: number
  ): Promise<InvoiceWithCard | null> {
    try {
      const invoice = await queryOne<InvoiceWithCard>(
        `SELECT * FROM invoice_details 
         WHERE id = ? AND user_id = ?`,
        [invoiceId, userId]
      );
      return invoice;
    } catch (error) {
      console.error('Erro ao buscar fatura:', error);
      return null;
    }
  }

  /**
   * Buscar ou criar fatura para um cartão em um mês específico
   */
  static async getOrCreateInvoice(
    cardId: number,
    month: number,
    year: number
  ): Promise<Invoice | null> {
    try {
      // Verificar se já existe
      let invoice = await queryOne<Invoice>(
        'SELECT * FROM invoices WHERE card_id = ? AND reference_month = ? AND reference_year = ?',
        [cardId, month, year]
      );

      if (invoice) {
        return invoice;
      }

      // Criar nova fatura usando a procedure
      await query('CALL create_invoice_for_card(?, ?, ?)', [cardId, month, year]);

      // Buscar a fatura criada
      invoice = await queryOne<Invoice>(
        'SELECT * FROM invoices WHERE card_id = ? AND reference_month = ? AND reference_year = ?',
        [cardId, month, year]
      );

      return invoice;
    } catch (error) {
      console.error('Erro ao buscar/criar fatura:', error);
      return null;
    }
  }

  /**
   * Listar faturas de um cartão
   */
  static async getCardInvoices(
    cardId: number,
    userId: number
  ): Promise<InvoiceWithCard[]> {
    try {
      const invoices = await query<InvoiceWithCard[]>(
        `SELECT * FROM invoice_details 
         WHERE card_id = ? AND user_id = ?
         ORDER BY reference_year DESC, reference_month DESC`,
        [cardId, userId]
      );
      return invoices;
    } catch (error) {
      console.error('Erro ao buscar faturas do cartão:', error);
      return [];
    }
  }

  /**
   * Atualizar status da fatura
   */
  static async updateInvoiceStatus(
    invoiceId: number,
    userId: number,
    status: 'open' | 'closed' | 'paid' | 'overdue'
  ): Promise<boolean> {
    try {
      // Verificar permissão
      const invoice = await queryOne<InvoiceWithCard>(
        'SELECT * FROM invoice_details WHERE id = ? AND user_id = ?',
        [invoiceId, userId]
      );

      if (!invoice) {
        return false;
      }

      await query('UPDATE invoices SET status = ? WHERE id = ?', [
        status,
        invoiceId,
      ]);

      return true;
    } catch (error) {
      console.error('Erro ao atualizar status da fatura:', error);
      return false;
    }
  }

  /**
   * Fechar fatura (marcar como fechada)
   */
  static async closeInvoice(invoiceId: number, userId: number): Promise<boolean> {
    return this.updateInvoiceStatus(invoiceId, userId, 'closed');
  }

  /**
   * Marcar fatura como paga
   */
  static async markInvoiceAsPaid(
    invoiceId: number,
    userId: number
  ): Promise<boolean> {
    try {
      const result = await transaction(async (connection) => {
        // Verificar permissão
        const invoice = await queryWithConnection<InvoiceWithCard[]>(
          connection,
          'SELECT * FROM invoice_details WHERE id = ? AND user_id = ?',
          [invoiceId, userId]
        );

        if (!invoice || invoice.length === 0) {
          throw new Error('Fatura não encontrada');
        }

        // Marcar todos os itens como pagos
        await queryWithConnection(
          connection,
          'UPDATE invoice_items SET is_paid = TRUE WHERE invoice_id = ?',
          [invoiceId]
        );

        // Atualizar status da fatura
        await queryWithConnection(
          connection,
          'UPDATE invoices SET status = ? WHERE id = ?',
          ['paid', invoiceId]
        );

        return true;
      });

      return result;
    } catch (error) {
      console.error('Erro ao marcar fatura como paga:', error);
      return false;
    }
  }

  /**
   * Deletar fatura (apenas se não tiver itens)
   */
  static async deleteInvoice(
    invoiceId: number,
    userId: number
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Verificar permissão
      const invoice = await queryOne<InvoiceWithCard>(
        'SELECT * FROM invoice_details WHERE id = ? AND user_id = ?',
        [invoiceId, userId]
      );

      if (!invoice) {
        return {
          success: false,
          message: 'Fatura não encontrada',
        };
      }

      // Verificar se tem itens
      const itemCount = await queryOne<{ count: number }>(
        'SELECT COUNT(*) as count FROM invoice_items WHERE invoice_id = ?',
        [invoiceId]
      );

      if (itemCount && itemCount.count > 0) {
        return {
          success: false,
          message: 'Não é possível deletar fatura com itens',
        };
      }

      await query('DELETE FROM invoices WHERE id = ?', [invoiceId]);

      return {
        success: true,
        message: 'Fatura deletada com sucesso',
      };
    } catch (error) {
      console.error('Erro ao deletar fatura:', error);
      return {
        success: false,
        message: 'Erro ao deletar fatura',
      };
    }
  }

  /**
   * Obter resumo mensal de todas as faturas
   */
  static async getMonthlyTotals(
    userId: number,
    limit: number = 12
  ): Promise<MonthlyTotal[]> {
    try {
      const totals = await query<MonthlyTotal[]>(
        `SELECT mt.* FROM monthly_totals mt
         WHERE mt.user_id = ?
         ORDER BY mt.reference_year DESC, mt.reference_month DESC
         LIMIT ?`,
        [userId, limit]
      );
      return totals;
    } catch (error) {
      console.error('Erro ao buscar totais mensais:', error);
      return [];
    }
  }

  /**
   * Obter total de um mês específico
   */
  static async getMonthTotal(
    userId: number,
    month: number,
    year: number
  ): Promise<MonthlyTotal | null> {
    try {
      const total = await queryOne<MonthlyTotal>(
        `SELECT mt.* FROM monthly_totals mt
         WHERE mt.user_id = ? AND mt.reference_month = ? AND mt.reference_year = ?`,
        [userId, month, year]
      );
      return total;
    } catch (error) {
      console.error('Erro ao buscar total do mês:', error);
      return null;
    }
  }

  /**
   * Verificar faturas vencidas e atualizar status
   */
  static async checkOverdueInvoices(): Promise<number> {
    try {
      const result = await query<{ affectedRows: number }>(
        `UPDATE invoices 
         SET status = 'overdue'
         WHERE status IN ('open', 'closed')
         AND due_date < CURDATE()
         AND paid_amount < total_amount`
      );

      return result.affectedRows || 0;
    } catch (error) {
      console.error('Erro ao verificar faturas vencidas:', error);
      return 0;
    }
  }
}
