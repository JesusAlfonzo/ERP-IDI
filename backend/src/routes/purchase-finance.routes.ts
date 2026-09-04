import { Router } from 'express';
import {
  registerInvoice,
  registerPayment,
  getOrderFinancialSummary,
} from '../controllers/purchase-finance.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

// Resumen financiero de la orden
router.get('/:orderId/finance', getOrderFinancialSummary);

// Registro de facturas y pagos (Admin y Compras)
router.post(
  '/:orderId/invoices',
  requireRoles(['ADMINISTRADOR', 'COMPRAS']),
  registerInvoice
);

router.post(
  '/:orderId/payments',
  requireRoles(['ADMINISTRADOR', 'COMPRAS']),
  registerPayment
);

export default router;
