import { apiClient } from '../lib/api';
import type { Card, CreateCardDTO, UpdateCardDTO } from '../types/database';

export class CardService {
  static async getUserCards(userId: number): Promise<Card[]> {
    return apiClient.get<Card[]>(`/cards/user/${userId}`);
  }

  static async getCardById(cardId: number): Promise<Card | null> {
    try {
      return await apiClient.get<Card>(`/cards/${cardId}`);
    } catch {
      return null;
    }
  }

  static async createCard(data: CreateCardDTO): Promise<Card | null> {
    return apiClient.post<Card>('/cards', data);
  }

  static async updateCard(
    cardId: number,
    userId: number,
    data: UpdateCardDTO
  ): Promise<Card | null> {
    return apiClient.put<Card>(`/cards/${cardId}`, { userId, ...data });
  }

  static async deactivateCard(cardId: number, userId: number): Promise<void> {
    await apiClient.post(`/cards/${cardId}/deactivate`, { userId });
  }
}
