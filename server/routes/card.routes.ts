import { Router } from 'express';
import { CardService } from '../../src/services/card.service';
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

router.get('/user/:userId', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId || Number(req.params.userId);
    const cards = await CardService.getUserCards(userId);
    res.json(cards);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar cartões' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId || 0;
    const card = await CardService.getCardById(Number(req.params.id), userId);
    res.json(card);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar cartão' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const card = await CardService.createCard(req.body);
    res.json(card);
  } catch {
    res.status(500).json({ error: 'Erro ao criar cartão' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId || 0;
    const card = await CardService.updateCard(Number(req.params.id), userId, req.body);
    res.json(card);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar cartão' });
  }
});

router.post('/:id/deactivate', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId || 0;
    await CardService.deactivateCard(Number(req.params.id), userId);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Erro ao desativar cartão' });
  }
});

export default router;
