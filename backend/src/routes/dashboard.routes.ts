import { Router } from 'express';
import {
  getDashboardData,
  getNotifications,
} from '../controllers/dashboard.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

router.get('/metrics', getDashboardData);
router.get('/notifications', getNotifications);

export default router;
