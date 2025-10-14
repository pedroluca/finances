import { apiClient } from '../lib/api';
import type { Author, CreateAuthorDTO } from '../types/database';

export class AuthorService {
  static async getUserAuthors(userId: number): Promise<Author[]> {
    return apiClient.get<Author[]>(`/authors/user/${userId}`);
  }

  static async createAuthor(data: CreateAuthorDTO): Promise<Author | null> {
    return apiClient.post<Author>('/authors', data);
  }
}
