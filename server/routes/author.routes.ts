import { Router } from 'express';
import { AuthorService } from '../../src/services/author.service';
import { authMiddleware, type AuthRequest } from '../middleware/auth.middleware';

const router = Router();

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

router.get('/user/:userId', async (req: AuthRequest, res) => {
  try {
    const userId = req.userId || Number(req.params.userId);
    const authors = await AuthorService.getUserAuthors(userId);
    res.json(authors);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar autores' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const author = await AuthorService.createAuthor(req.body);
    res.json(author);
  } catch {
    res.status(500).json({ error: 'Erro ao criar autor' });
  }
});

export default router;
