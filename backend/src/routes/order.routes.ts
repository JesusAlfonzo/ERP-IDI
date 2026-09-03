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

// Lectura de órdenes para usuarios autenticados
router.get('/', getOrders);
router.get('/:id', getOrderById);

// Creación de órdenes exclusiva para Compras y Admin
router.post('/', requireRoles(['ADMINISTRADOR', 'COMPRAS']), createOrder);

// Recepción física en almacén (Permitido para Almacenista y Administrador)
router.post(
  '/:id/receive',
  requireRoles(['ADMINISTRADOR', 'ALMACENISTA']),
  receiveOrder
);

export default router;
