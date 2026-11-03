import { Router } from 'express';
import {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  sendOrder,
  receiveOrder,
} from '../controllers/order.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

// Lectura de órdenes: Personal involucrado en el flujo de compras y recepción física
router.get(
  '/',
  requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ALMACENISTA', 'ADMINISTRACION']),
  getOrders
);
router.get(
  '/:id',
  requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ALMACENISTA', 'ADMINISTRACION']),
  getOrderById
);

// Creación, edición y envío de órdenes: Exclusivo para Compras y Dirección
router.post('/', requireRoles(['ADMINISTRADOR', 'COMPRAS']), createOrder);
router.put('/:id', requireRoles(['ADMINISTRADOR', 'COMPRAS']), updateOrder);
router.patch('/:id/send', requireRoles(['ADMINISTRADOR', 'COMPRAS']), sendOrder);

// Recepción física de insumos en almacén: Exclusivo Almacén y Dirección
router.post(
  '/:id/receive',
  requireRoles(['ADMINISTRADOR', 'ALMACENISTA']),
  receiveOrder
);

export default router;
