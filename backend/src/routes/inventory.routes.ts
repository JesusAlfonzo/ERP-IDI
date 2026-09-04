import { Router } from 'express';
import {
  getInventorySummary,
  getBatches,
  getAlerts,
  getMovements,
} from '../controllers/inventory.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

// Todos los usuarios autenticados (Almacén, Laboratorio, Compras, Admin) pueden consultar inventario
router.get('/', getInventorySummary);
router.get('/batches', getBatches);
router.get('/alerts', getAlerts);
router.get('/movements', getMovements);

export default router;
