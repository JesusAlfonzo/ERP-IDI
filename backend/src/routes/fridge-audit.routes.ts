import { Router } from 'express';
import {
  createFridgeAudit,
  listFridgeAudits,
  getFridgeAuditById,
} from '../controllers/fridge-audit.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

router.post(
  '/',
  requireRoles([
    'ADMINISTRADOR',
    'COORDINADOR_LABORATORIO',
    'COORDINADOR',
    'LABORATORIO',
    'BIOANALISTA',
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

export default router;
