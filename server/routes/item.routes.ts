import { Router } from 'express';
import { ItemService } from '../../src/services/item.service';
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

router.get('/invoice/:invoiceId', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId || 0;
    const items = await ItemService.getInvoiceItems(Number(req.params.invoiceId), userId);
    res.json(items);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar itens' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId || 0;
    const item = await ItemService.createItem(req.body, userId);
    res.json(item);
  } catch {
    res.status(500).json({ error: 'Erro ao criar item' });
  }
});

router.post('/installment', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId || 0;
    const items = await ItemService.createInstallment(req.body, userId);
    res.json(items);
  } catch {
    res.status(500).json({ error: 'Erro ao criar parcelamento' });
  }
});

router.put('/:id/toggle-paid', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId || 0;
    const isPaid = req.body.isPaid !== undefined ? req.body.isPaid : true;
    const success = await ItemService.togglePaidStatus(Number(req.params.id), userId, isPaid);
    res.json({ success });
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar status' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId || 0;
    const item = await ItemService.updateItem(Number(req.params.id), userId, req.body);
    res.json(item);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar item' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId || 0;
    const success = await ItemService.deleteItem(Number(req.params.id), userId);
    res.json({ success });
  } catch {
    res.status(500).json({ error: 'Erro ao excluir item' });
  }
});

export default router;
