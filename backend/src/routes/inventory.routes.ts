import { Router } from 'express';
import {
  getInventorySummary,
  getBatches,
  getAlerts,
  getMovements,
  getMovementById,
} from '../controllers/inventory.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

router.get('/', getInventorySummary);
router.get('/batches', getBatches);
router.get('/alerts', getAlerts);
router.get('/movements', getMovements);
router.get('/movements/:id', getMovementById);

export default router;
