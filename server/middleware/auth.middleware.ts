import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
  userId?: number;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.substring(7);
    
    // Decodificar o token Base64
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const payload = JSON.parse(decoded);
      
      if (!payload.userId || typeof payload.userId !== 'number') {
        return res.status(401).json({ error: 'Token inválido' });
      }

      req.userId = payload.userId;
      next();
    } catch {
      return res.status(401).json({ error: 'Token malformado' });
    }
  } catch {
    res.status(401).json({ error: 'Erro ao autenticar' });
  }
};
