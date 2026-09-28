import { Router } from 'express';
import {
  getBankAccounts,
  getBankAccountById,
  createBankAccount,
  updateBankAccount,
  deleteBankAccount,
} from '../controllers/bank-account.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

// Lectura de cuentas bancarias institucionales: Administrador, Compras y Administración
router.get('/', requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ADMINISTRACION']), getBankAccounts);
router.get('/:id', requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ADMINISTRACION']), getBankAccountById);

// Gestión y CRUD de cuentas: ADMINISTRADOR y ADMINISTRACION
router.post('/', requireRoles(['ADMINISTRADOR', 'ADMINISTRACION']), createBankAccount);
router.put('/:id', requireRoles(['ADMINISTRADOR', 'ADMINISTRACION']), updateBankAccount);
// Eliminación: ESTRICTAMENTE ADMINISTRADOR
router.delete('/:id', requireRoles(['ADMINISTRADOR']), deleteBankAccount);

export default router;
