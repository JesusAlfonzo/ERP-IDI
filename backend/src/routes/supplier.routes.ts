import { Router } from 'express';
import {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierDebts,
  getSupplierStatement,
  registerSupplierPayment,
} from '../controllers/supplier.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

// Finanzas y deudas comerciales: Exclusivo Compras y Administrador
router.get(
  '/debts',
  requireRoles(['ADMINISTRADOR', 'COMPRAS']),
  getSupplierDebts
);
router.get(
  '/:id/statement',
  requireRoles(['ADMINISTRADOR', 'COMPRAS']),
  getSupplierStatement
);
router.post(
  '/:id/payments',
  requireRoles(['ADMINISTRADOR', 'COMPRAS']),
  registerSupplierPayment
);

// Catálogo de proveedores: Lectura permitida para Compras, Almacén y Admin
router.get(
  '/',
  requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ALMACENISTA']),
  getSuppliers
);
router.get(
  '/:id',
  requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ALMACENISTA']),
  getSupplierById
);

// Mutaciones de ficha de proveedor
router.post('/', requireRoles(['ADMINISTRADOR', 'COMPRAS']), createSupplier);
router.put('/:id', requireRoles(['ADMINISTRADOR', 'COMPRAS']), updateSupplier);
router.delete(
  '/:id',
  requireRoles(['ADMINISTRADOR', 'COMPRAS']),
  deleteSupplier
);

export default router;
