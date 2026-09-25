import { Router } from 'express';
import {
  getInventorySummary,
  getBatches,
  getAlerts,
  getMovements,
  getMovementById,
  createAdjustment,
  registerDirectWaste,
  updateBatchStatus,
} from '../controllers/inventory.controller.js';
import { InventoryMasterController } from '../controllers/inventory-master.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

router.get('/', getInventorySummary);
router.get('/batches', getBatches);
router.get('/alerts', getAlerts);
router.get('/movements', getMovements);
router.get('/movements/:id', getMovementById);

// Dictamen de Calidad / Liberación de Cuarentena
router.patch(
  '/batches/:id/status',
  requireRoles(['ADMINISTRADOR', 'ALMACENISTA']),
  updateBatchStatus
);

// Endpoints de Ajustes y Mermas
router.post(
  '/adjustments',
  requireRoles(['ADMINISTRADOR', 'ALMACENISTA']),
  createAdjustment
);
router.post(
  '/wastes',
  requireRoles(['ADMINISTRADOR', 'ALMACENISTA']),
  registerDirectWaste
);

// Maestros de Categorías en Inventario (Solo ADMINISTRADOR para mutaciones)
router.get('/categories', InventoryMasterController.getCategories);
router.post(
  '/categories',
  requireRoles(['ADMINISTRADOR']),
  InventoryMasterController.createCategory
);
router.put(
  '/categories/:id',
  requireRoles(['ADMINISTRADOR']),
  InventoryMasterController.updateCategory
);
router.patch(
  '/categories/:id',
  requireRoles(['ADMINISTRADOR']),
  InventoryMasterController.updateCategory
);
router.delete(
  '/categories/:id',
  requireRoles(['ADMINISTRADOR']),
  InventoryMasterController.deleteCategory
);

export default router;
