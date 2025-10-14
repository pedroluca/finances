import type { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthService } from '../src/services/auth.service';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  try {
    // POST /api/auth?action=register
    if (req.method === 'POST' && action === 'register') {
      const result = await AuthService.register(req.body);
      return res.json(result);
    }

    // POST /api/auth?action=login
    if (req.method === 'POST' && action === 'login') {
      const result = await AuthService.login(req.body);
      return res.json(result);
    }

    // GET /api/auth?action=verify
    if (req.method === 'GET' && action === 'verify') {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ success: false, message: 'Token não fornecido' });
      }
      const user = await AuthService.verifyToken(token);
      return res.json({ success: true, user });
    }

    return res.status(404).json({ error: 'Rota não encontrada' });
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(500).json({ success: false, message: 'Erro no servidor' });
  }
}
