import { Router } from 'express';
import {
  getOrders,
  getOrderById,
  createOrder,
  receiveOrder,
} from '../controllers/order.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

// Lectura de órdenes: Personal involucrado en el flujo de compras y recepción física
router.get(
  '/',
  requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ALMACENISTA']),
  getOrders
);
router.get(
  '/:id',
  requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ALMACENISTA']),
  getOrderById
);

// Creación de órdenes: Exclusivo para Compras y Dirección
router.post('/', requireRoles(['ADMINISTRADOR', 'COMPRAS']), createOrder);

// Recepción física de insumos en almacén: Exclusivo Almacén y Dirección
router.post(
  '/:id/receive',
  requireRoles(['ADMINISTRADOR', 'ALMACENISTA']),
  receiveOrder
);

export default router;
