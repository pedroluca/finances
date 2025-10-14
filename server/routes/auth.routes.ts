import { Router } from 'express';
import { AuthService } from '../../src/services/auth.service';

const router = Router();

router.post('/register', async (req, res) => {
  try {
    const result = await AuthService.register(req.body);
    res.json(result);
  } catch {
    res.status(500).json({ success: false, message: 'Erro ao registrar' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const result = await AuthService.login(req.body);
    res.json(result);
  } catch {
    res.status(500).json({ success: false, message: 'Erro ao fazer login' });
  }
});

router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token não fornecido' });
    }
    const user = await AuthService.verifyToken(token);
    res.json({ success: true, user });
  } catch {
    res.status(401).json({ success: false, message: 'Token inválido' });
  }
});

export default router;
