import { Router } from 'express';
import {
  getFridges,
  createFridge,
  getLabUnits,
  getLabUnitById,
  openLabUnit,
  consumeLabUnit,
  transferFridge,
  discardLabUnit,
  getAvailableReagents,
  getRecentConsumptions,
  registerReagentConsumption,
  getFridgeContents,
  assignUnitToFridge,
  assignBatchToFridge,
} from '../controllers/lab.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

// Neveras / Equipos
router.get('/fridges', getFridges);
router.post(
  '/fridges',
  requireRoles(['ADMINISTRADOR', 'ANALISTA_LABORATORIO']),
  createFridge
);
router.get('/fridges/:id/contents', getFridgeContents);
router.post(
  '/fridges/:id/assign',
  requireRoles(['ADMINISTRADOR', 'ANALISTA_LABORATORIO']),
  assignUnitToFridge
);
router.post(
  '/fridges/:id/assign-batch',
  requireRoles(['ADMINISTRADOR', 'ANALISTA_LABORATORIO']),
  assignBatchToFridge
);

// Frascos de reactivos
router.get('/units', getLabUnits);
router.get(
  '/reagents',
  requireRoles(['ADMINISTRADOR', 'ANALISTA_LABORATORIO']),
  getAvailableReagents
);
router.get(
  '/consumptions',
  requireRoles(['ADMINISTRADOR', 'ANALISTA_LABORATORIO']),
  getRecentConsumptions
);
router.post(
  '/consumptions',
  requireRoles(['ADMINISTRADOR', 'ANALISTA_LABORATORIO']),
  registerReagentConsumption
);
router.get('/units/:id', getLabUnitById);
router.patch(
  '/units/:id/open',
  requireRoles(['ADMINISTRADOR', 'ANALISTA_LABORATORIO']),
  openLabUnit
);
router.post(
  '/units/:id/consume',
  requireRoles(['ADMINISTRADOR', 'ANALISTA_LABORATORIO']),
  consumeLabUnit
);
router.post(
  '/units/:id/transfer',
  requireRoles(['ADMINISTRADOR', 'ANALISTA_LABORATORIO']),
  transferFridge
);
router.post(
  '/units/:id/discard',
  requireRoles(['ADMINISTRADOR', 'ANALISTA_LABORATORIO']),
  discardLabUnit
);

export default router;
