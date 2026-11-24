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
  '/payments',
  requireRoles(['ADMINISTRADOR', 'COMPRAS']),
  registerSupplierPayment
);
router.post(
  '/:id/payments',
  requireRoles(['ADMINISTRADOR', 'COMPRAS']),
  registerSupplierPayment
);

// Catálogo de proveedores: Lectura permitida para Compras, Almacén, Administración, Coordinación y Admin
router.get(
  '/',
  requireRoles([
    'ADMINISTRADOR',
    'COMPRAS',
    'ALMACENISTA',
    'ADMINISTRACION',
    'COORDINADOR',
  ]),
  getSuppliers
);
router.get(
  '/:id',
  requireRoles([
    'ADMINISTRADOR',
    'COMPRAS',
    'ALMACENISTA',
    'ADMINISTRACION',
    'COORDINADOR',
  ]),
  getSupplierById
);

// Mutaciones de ficha de proveedor
router.post(
  '/',
  requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ADMINISTRACION', 'COORDINADOR']),
  createSupplier
);
router.put(
  '/:id',
  requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ADMINISTRACION', 'COORDINADOR']),
  updateSupplier
);
router.delete(
  '/:id',
  requireRoles(['ADMINISTRADOR']),
  deleteSupplier
);

export default router;
