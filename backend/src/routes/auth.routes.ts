import { Router } from 'express';
import {
  login,
  getMe,
  changePassword,
} from '../controllers/auth.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';

const router: Router = Router();

router.post('/login', login);
router.get('/me', authenticateJWT, getMe);
router.patch('/change-password', authenticateJWT, changePassword);

export default router;
