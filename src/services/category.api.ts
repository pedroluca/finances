import { apiClient } from '../lib/api';
import type { Category, CreateCategoryDTO } from '../types/database';

export class CategoryService {
  static async getUserCategories(userId: number): Promise<Category[]> {
    return apiClient.get<Category[]>(`/categories/user/${userId}`);
  }

  static async createCategory(data: CreateCategoryDTO): Promise<Category | null> {
    return apiClient.post<Category>('/categories', data);
  }
}
