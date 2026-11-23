import { Router } from 'express';
import { TreasuryController } from '../controllers/treasury.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

const READ_AND_CREATE_ROLES = [
  'ADMINISTRADOR',
  'COMPRAS',
  'ADMINISTRACION',
  'COORDINADOR',
];

const APPROVE_ROLES = ['ADMINISTRADOR', 'ADMINISTRACION', 'COORDINADOR'];

const PAY_ROLES = ['ADMINISTRADOR', 'ADMINISTRACION'];

// Documentos origen elegibles para crear Orden de Pago (OC y OS)
router.get(
  '/eligible-sources',
  requireRoles(READ_AND_CREATE_ROLES),
  TreasuryController.listEligibleSources
);

// Órdenes de Pago unificadas
router.get(
  '/payment-orders',
  requireRoles(READ_AND_CREATE_ROLES),
  TreasuryController.listPaymentOrders
);

router.get(
  '/payment-orders/:id',
  requireRoles(READ_AND_CREATE_ROLES),
  TreasuryController.getPaymentOrderById
);

router.post(
  '/payment-orders',
  requireRoles(READ_AND_CREATE_ROLES),
  TreasuryController.createPaymentOrder
);

router.post(
  '/payment-orders/:id/approve',
  requireRoles(APPROVE_ROLES),
  TreasuryController.approvePaymentOrder
);

router.post(
  '/payment-orders/:id/reject',
  requireRoles(APPROVE_ROLES),
  TreasuryController.rejectPaymentOrder
);

router.post(
  '/payment-orders/:id/resubmit',
  requireRoles(READ_AND_CREATE_ROLES),
  TreasuryController.resubmitPaymentOrder
);

router.post(
  '/payment-orders/:id/cancel',
  requireRoles(APPROVE_ROLES),
  TreasuryController.cancelPaymentOrder
);

// Registro y confirmación de Pagos (parciales, completos y mixtos / split)
router.post(
  '/payment-orders/:id/payments',
  requireRoles(PAY_ROLES),
  TreasuryController.createTreasuryPayment
);

router.post(
  '/payments/:paymentId/confirm',
  requireRoles(PAY_ROLES),
  TreasuryController.confirmTreasuryPayment
);

router.post(
  '/payments/:paymentId/void',
  requireRoles(PAY_ROLES),
  TreasuryController.voidTreasuryPayment
);

// Movimientos de salida por cuenta maestra
router.get(
  '/bank-accounts/:id/movements',
  requireRoles(['ADMINISTRADOR', 'ADMINISTRACION', 'COMPRAS']),
  TreasuryController.listAccountMovements
);

export default router;
