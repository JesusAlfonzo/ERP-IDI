import { Router } from 'express';
import {
  getRequisitions,
  getRequisitionById,
  createRequisition,
  updateRequisitionStatus,
  convertRequisitionToOrder,
} from '../controllers/purchase-requisition.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

// Lectura de preórdenes
router.get(
  '/',
  requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ALMACENISTA', 'ADMINISTRACION']),
  getRequisitions
);

router.get(
  '/:id',
  requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ALMACENISTA', 'ADMINISTRACION']),
  getRequisitionById
);

// Creación de preorden (Solicitud de cotización)
router.post(
  '/',
  requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ADMINISTRACION']),
  createRequisition
);

// Transición de estado manual (ej. Pasar a EN_COTIZACION o CANCELADA)
router.patch(
  '/:id/status',
  requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ADMINISTRACION']),
  updateRequisitionStatus
);

// Adjudicación y conversión a orden de compra con proveedor y fiscalidad
router.post(
  '/:id/convert-to-order',
  requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ADMINISTRACION']),
  convertRequisitionToOrder
);

export default router;
