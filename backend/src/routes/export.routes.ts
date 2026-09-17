import { Router } from 'express';
import {
  downloadInventoryValuationCSV,
  downloadKardexCSV,
} from '../controllers/export.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

router.get(
  '/inventory-valuation',
  requireRoles(['ADMINISTRADOR', 'ALMACENISTA', 'COMPRAS']),
  downloadInventoryValuationCSV
);

router.get(
  '/kardex',
  requireRoles(['ADMINISTRADOR', 'ALMACENISTA']),
  downloadKardexCSV
);

export default router;
