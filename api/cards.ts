import type { VercelRequest, VercelResponse } from '@vercel/node';
import { CardService } from '../src/services/card.service';

// Helper para extrair userId do token
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const userId = getUserIdFromToken(req);
  if (!userId) {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const { id } = req.query;

  try {
    // GET /api/cards - Lista todos os cartões do usuário
    if (req.method === 'GET' && !id) {
      const cards = await CardService.getUserCards(userId);
      return res.json(cards);
    }

    // GET /api/cards?id=123 - Busca cartão específico
    if (req.method === 'GET' && id) {
      const card = await CardService.getCardById(Number(id), userId);
      return res.json(card);
    }

    // POST /api/cards - Cria novo cartão
    if (req.method === 'POST') {
      const card = await CardService.createCard({ ...req.body, userId });
      return res.json(card);
    }

    // PUT /api/cards?id=123 - Atualiza cartão
    if (req.method === 'PUT' && id) {
      const card = await CardService.updateCard(Number(id), userId, req.body);
      return res.json(card);
    }

    // DELETE /api/cards?id=123 - Deleta cartão
    if (req.method === 'DELETE' && id) {
      const result = await CardService.deactivateCard(Number(id), userId);
      return res.json({ success: result });
    }

    return res.status(404).json({ error: 'Rota não encontrada' });
  } catch (error) {
    console.error('Cards error:', error);
    return res.status(500).json({ error: 'Erro no servidor' });
  }
}
