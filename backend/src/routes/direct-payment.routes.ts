import { Router } from 'express';
import {
  getDirectPayments,
  getDirectPaymentById,
  createDirectPayment,
  submitServiceOrder,
  approveServiceOrder,
  rejectServiceOrder,
  generatePaymentOrder,
  registerServicePayment,
  cancelServiceOrder,
  deleteDirectPayment,
} from '../controllers/direct-payment.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

// Lectura y creación de Órdenes de Servicio
router.get(
  '/',
  requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ADMINISTRACION', 'COORDINADOR']),
  getDirectPayments
);
router.get(
  '/:id',
  requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ADMINISTRACION', 'COORDINADOR']),
  getDirectPaymentById
);
router.post(
  '/',
  requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ADMINISTRACION', 'COORDINADOR']),
  createDirectPayment
);

// Etapa 1 -> 2: Enviar a aprobación
router.post(
  '/:id/submit',
  requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ADMINISTRACION', 'COORDINADOR']),
  submitServiceOrder
);

// Etapa 2: Aprobación / Rechazo
router.post(
  '/:id/approve',
  requireRoles(['ADMINISTRADOR', 'ADMINISTRACION', 'COORDINADOR']),
  approveServiceOrder
);
router.post(
  '/:id/reject',
  requireRoles(['ADMINISTRADOR', 'ADMINISTRACION', 'COORDINADOR']),
  rejectServiceOrder
);

// Etapa 3: Generar Orden de Pago
router.post(
  '/:id/payment-order',
  requireRoles(['ADMINISTRADOR', 'ADMINISTRACION']),
  generatePaymentOrder
);

// Etapa 4: Registrar Pago efectivo
router.post(
  '/:id/pay',
  requireRoles(['ADMINISTRADOR', 'ADMINISTRACION']),
  registerServicePayment
);

// Cancelar (antes de pago)
router.post(
  '/:id/cancel',
  requireRoles(['ADMINISTRADOR', 'ADMINISTRACION', 'COORDINADOR']),
  cancelServiceOrder
);

// Eliminación permanente (exclusiva Administrador)
router.delete('/:id', requireRoles(['ADMINISTRADOR']), deleteDirectPayment);

export default router;
