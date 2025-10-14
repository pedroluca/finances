import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthorService } from '../src/services/author.service';

function getUserIdFromToken(req: VercelRequest): number | null {
  try {
    const authHeader = req.headers.authorization as string;
    if (!authHeader?.startsWith('Bearer ')) return null;
    
    const token = authHeader.substring(7);
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const payload = JSON.parse(decoded);
    
    return payload.userId || null;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const userId = getUserIdFromToken(req);
  if (!userId) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  try {
    // GET /api/authors - Lista autores do usuário
    if (req.method === 'GET') {
      const authors = await AuthorService.getUserAuthors(userId);
      return res.json(authors);
    }

    // POST /api/authors - Cria novo autor
    if (req.method === 'POST') {
      const author = await AuthorService.createAuthor({ ...req.body, userId });
      return res.json(author);
    }

    return res.status(404).json({ error: 'Rota não encontrada' });
  } catch (error) {
    console.error('Authors error:', error);
    return res.status(500).json({ error: 'Erro no servidor' });
  }
}
