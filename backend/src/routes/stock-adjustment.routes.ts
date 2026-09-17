import { Router } from 'express';
import {
  createStockAdjustment,
  registerDirectWaste,
  updateBatchStatus,
  listStockMovements,
} from '../controllers/stock-adjustment.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';
import { validateRequest } from '../middlewares/validate.middleware.js';
import {
  StockAdjustmentSchema,
  DirectWasteSchema,
  BatchStatusUpdateSchema,
} from '../schemas/stock-adjustment.schema.js';

const router: Router = Router();

router.use(authenticateJWT);

router.get(
  '/movements',
  requireRoles(['ADMINISTRADOR', 'ALMACENISTA']),
  listStockMovements
);

router.post(
  '/adjustments',
  requireRoles(['ADMINISTRADOR', 'ALMACENISTA']),
  validateRequest(StockAdjustmentSchema),
  createStockAdjustment
);

router.post(
  '/wastes',
  requireRoles(['ADMINISTRADOR', 'ALMACENISTA']),
  validateRequest(DirectWasteSchema),
  registerDirectWaste
);

router.patch(
  '/batches/:id/status',
  requireRoles(['ADMINISTRADOR', 'ALMACENISTA']),
  validateRequest(BatchStatusUpdateSchema),
  updateBatchStatus
);

export default router;
