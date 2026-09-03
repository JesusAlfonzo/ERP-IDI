import { Router } from 'express';
import { login, getMe } from '../controllers/auth.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';

const router: Router = Router();

router.post('/login', login);
router.get('/me', authenticateJWT, getMe);

export default router;
