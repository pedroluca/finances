import { apiClient } from '../lib/api';
import type { Invoice, MonthlyTotal } from '../types/database';

export class InvoiceService {
  static async getUserInvoices(userId: number): Promise<Invoice[]> {
    return apiClient.get<Invoice[]>(`/invoices/user/${userId}`);
  }

  static async getInvoiceById(invoiceId: number): Promise<Invoice | null> {
    try {
      return await apiClient.get<Invoice>(`/invoices/${invoiceId}`);
    } catch {
      return null;
    }
  }

  static async getOrCreateInvoice(
    cardId: number,
    month: number,
    year: number
  ): Promise<Invoice | null> {
    return apiClient.post<Invoice>('/invoices/get-or-create', { cardId, month, year });
  }

  static async getMonthlyTotals(userId: number, months: number): Promise<MonthlyTotal[]> {
    return apiClient.get<MonthlyTotal[]>(`/invoices/monthly-totals/${userId}?months=${months}`);
  }
}
