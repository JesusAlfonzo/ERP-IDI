import { Router } from 'express';
import {
  createFridgeAudit,
  listFridgeAudits,
  getFridgeAuditById,
  reconcileFridgeAudit,
} from '../controllers/fridge-audit.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

// Creación y conciliación de arqueo físico (Supervisión y control crítico)
router.post(
  '/',
  requireRoles([
    'ADMINISTRADOR',
    'COORDINADOR_LABORATORIO',
    'COORDINADOR',
  ]),
  createFridgeAudit
);

router.get(
  '/',
  requireRoles([
    'ADMINISTRADOR',
    'COORDINADOR_LABORATORIO',
    'COORDINADOR',
    'LABORATORIO',
    'BIOANALISTA',
    'ADMINISTRACION',
  ]),
  listFridgeAudits
);

router.get(
  '/:id',
  requireRoles([
    'ADMINISTRADOR',
    'COORDINADOR_LABORATORIO',
    'COORDINADOR',
    'LABORATORIO',
    'BIOANALISTA',
    'ADMINISTRACION',
  ]),
  getFridgeAuditById
);

// Reconciliación en 1 Clic de Arqueo Físico (Caso Borde E6)
router.post(
  '/:id/reconcile',
  requireRoles([
    'ADMINISTRADOR',
    'COORDINADOR_LABORATORIO',
    'COORDINADOR',
  ]),
  reconcileFridgeAudit
);

export default router;
