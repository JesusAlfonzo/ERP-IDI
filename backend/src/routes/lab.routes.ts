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
} from '../controllers/lab.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

// Neveras / Equipos
router.get('/fridges', getFridges);
router.post(
  '/fridges',
  requireRoles(['ADMINISTRADOR', 'ALMACENISTA']),
  createFridge
);

// Frascos de reactivos
router.get('/units', getLabUnits);
router.get('/units/:id', getLabUnitById);
router.patch('/units/:id/open', openLabUnit);
router.post('/units/:id/consume', consumeLabUnit);
router.post('/units/:id/transfer', transferFridge);
router.post('/units/:id/discard', discardLabUnit);

export default router;
