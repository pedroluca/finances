import { Router } from 'express';
import { CategoryService } from '../../src/services/category.service';
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

router.get('/user/:userId', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId || Number(req.params.userId);
    const categories = await CategoryService.getUserCategories(userId);
    res.json(categories);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const category = await CategoryService.createCategory(req.body);
    res.json(category);
  } catch {
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
});

export default router;
