import { Router } from 'express';
import {
  getInventorySummary,
  getBatches,
  getAlerts,
  getMovements,
  getMovementById,
  createAdjustment,
  registerDirectWaste,
} from '../controllers/inventory.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

router.get('/', getInventorySummary);
router.get('/batches', getBatches);
router.get('/alerts', getAlerts);
router.get('/movements', getMovements);
router.get('/movements/:id', getMovementById);

// Endpoints de Ajustes y Mermas
router.post('/adjustments', createAdjustment);
router.post('/wastes', registerDirectWaste);

export default router;
