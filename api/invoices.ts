import type { VercelRequest, VercelResponse } from '@vercel/node';
import { InvoiceService } from '../src/services/invoice.service';

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

  const { cardId, month, year } = req.query;

  try {
    // GET /api/invoices?cardId=1&month=10&year=2025
    if (req.method === 'GET' && cardId && month && year) {
      const invoice = await InvoiceService.getOrCreateInvoice(
        Number(cardId),
        Number(month),
        Number(year)
      );
      return res.json(invoice);
    }

    return res.status(404).json({ error: 'Rota não encontrada' });
  } catch (error) {
    console.error('Invoices error:', error);
    return res.status(500).json({ error: 'Erro no servidor' });
  }
}
