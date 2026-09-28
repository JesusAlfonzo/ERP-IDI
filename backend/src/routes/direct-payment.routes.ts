import { Router } from 'express';
import {
  getDirectPayments,
  getDirectPaymentById,
  createDirectPayment,
  deleteDirectPayment,
} from '../controllers/direct-payment.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

router.get('/', requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ADMINISTRACION']), getDirectPayments);
router.get('/:id', requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ADMINISTRACION']), getDirectPaymentById);
router.post('/', requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ADMINISTRACION']), createDirectPayment);
router.delete('/:id', requireRoles(['ADMINISTRADOR']), deleteDirectPayment);

export default router;
