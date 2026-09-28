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
router.get(
  '/:orderId/finance',
  requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ADMINISTRACION']),
  getOrderFinancialSummary
);

// Registro de facturas y amortización de pagos
router.post(
  '/:orderId/invoices',
  requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ADMINISTRACION']),
  registerInvoice
);

router.post(
  '/:orderId/payments',
  requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ADMINISTRACION']),
  registerPayment
);

export default router;
