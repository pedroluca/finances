import { Router } from 'express';
import { InvoiceService } from '../../src/services/invoice.service';
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

router.get('/user/:userId', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId || Number(req.params.userId);
    const invoices = await InvoiceService.getUserInvoices(userId);
    res.json(invoices);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar faturas' });
  }
});

router.get('/monthly-totals/:userId', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId || Number(req.params.userId);
    const months = Number(req.query.months) || 6;
    const totals = await InvoiceService.getMonthlyTotals(userId, months);
    res.json(totals);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar totais mensais' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId || 0;
    const invoice = await InvoiceService.getInvoiceById(Number(req.params.id), userId);
    res.json(invoice);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar fatura' });
  }
});

router.post('/get-or-create', async (req, res) => {
  try {
    const invoice = await InvoiceService.getOrCreateInvoice(req.body.cardId, req.body.month, req.body.year);
    res.json(invoice);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar/criar fatura' });
  }
});

export default router;
