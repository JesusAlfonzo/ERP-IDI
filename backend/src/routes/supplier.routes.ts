import { Router } from 'express';
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from '../controllers/supplier.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

// Lectura para cualquier usuario autenticado (útil para ver ficha del proveedor)
router.get('/', getSuppliers);
router.get('/:id', getSupplierById);

// Escritura restringida a Compras y Administrador
router.post('/', requireRoles(['ADMINISTRADOR', 'COMPRAS']), createSupplier);
router.put('/:id', requireRoles(['ADMINISTRADOR', 'COMPRAS']), updateSupplier);
router.delete(
  '/:id',
  requireRoles(['ADMINISTRADOR', 'COMPRAS']),
  deleteSupplier
);

export default router;
