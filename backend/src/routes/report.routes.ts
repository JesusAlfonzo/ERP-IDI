import { Router } from 'express';
import { getDashboardSummary } from '../controllers/report.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

router.get(
  '/dashboard',
  requireRoles(['ADMINISTRADOR', 'ALMACENISTA', 'COMPRAS']),
  getDashboardSummary
);

export default router;
