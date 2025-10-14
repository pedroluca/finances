import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ItemService } from '../src/services/item.service';

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

  const { id, invoiceId, action } = req.query;

  try {
    // GET /api/items?invoiceId=123 - Lista itens da fatura
    if (req.method === 'GET' && invoiceId) {
      const items = await ItemService.getInvoiceItems(Number(invoiceId), userId);
      return res.json(items);
    }

    // POST /api/items - Cria item simples
    if (req.method === 'POST' && !action) {
      const item = await ItemService.createItem(req.body, userId);
      return res.json(item);
    }

    // POST /api/items?action=installment - Cria parcelamento
    if (req.method === 'POST' && action === 'installment') {
      const items = await ItemService.createInstallment(req.body, userId);
      return res.json(items);
    }

    // PUT /api/items?id=123 - Atualiza item
    if (req.method === 'PUT' && id && !action) {
      const item = await ItemService.updateItem(Number(id), userId, req.body);
      return res.json(item);
    }

    // PUT /api/items?id=123&action=toggle-paid - Marca item como pago/não pago
    if (req.method === 'PUT' && id && action === 'toggle-paid') {
      const result = await ItemService.togglePaidStatus(Number(id), userId, req.body.isPaid);
      return res.json(result);
    }

    // DELETE /api/items?id=123 - Deleta item
    if (req.method === 'DELETE' && id) {
      const result = await ItemService.deleteItem(Number(id), userId);
      return res.json(result);
    }

    return res.status(404).json({ error: 'Rota não encontrada' });
  } catch (error) {
    console.error('Items error:', error);
    return res.status(500).json({ error: 'Erro no servidor' });
  }
}
