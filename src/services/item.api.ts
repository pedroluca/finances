import { apiClient } from '../lib/api';
import type { InvoiceItem, InvoiceItemWithDetails, CreateInstallmentDTO } from '../types/database';

export class ItemService {
  static async getInvoiceItems(invoiceId: number): Promise<InvoiceItemWithDetails[]> {
    return apiClient.get<InvoiceItemWithDetails[]>(`/items/invoice/${invoiceId}`);
  }

  static async createItem(data: Partial<InvoiceItem>): Promise<InvoiceItem | null> {
    return apiClient.post<InvoiceItem>('/items', data);
  }

  static async createInstallment(data: CreateInstallmentDTO): Promise<InvoiceItem[]> {
    return apiClient.post<InvoiceItem[]>('/items/installment', data);
  }

  static async updateItem(itemId: number, userId: number, data: Partial<InvoiceItem>): Promise<InvoiceItem | null> {
    return apiClient.put<InvoiceItem>(`/items/${itemId}`, { ...data, userId });
  }

  static async deleteItem(itemId: number): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/items/${itemId}`);
  }

  static async togglePaidStatus(itemId: number, userId: number): Promise<{ success: boolean }> {
    return apiClient.put<{ success: boolean }>(`/items/${itemId}/toggle-paid`, { userId, isPaid: true });
  }
}
