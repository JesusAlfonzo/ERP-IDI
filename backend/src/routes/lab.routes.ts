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
  putUnitInQuarantine,
  resolveQuarantine,
  getQuarantineIncidents,
  getLabAreas,
  getLabAreaById,
  createLabArea,
  updateLabArea,
  assignUsersToLabArea,
  getUserLabAreas,
  getLabExams,
  getLabExamById,
  createLabExam,
  updateLabExam,
  getInternalRequests,
  getInternalRequestById,
  createInternalRequest,
  suggestFefoForRequest,
  approveInternalRequest,
  deliverInternalRequest,
  rejectInternalRequest,
  getWeeklyRuns,
  getWeeklyRunById,
  createWeeklyRun,
  closeWeeklyRun,
  getConsumptionAuditLogs,
} from '../controllers/lab.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

// Neveras / Equipos
router.get('/fridges', getFridges);
router.post(
  '/fridges',
  requireRoles(['ADMINISTRADOR', 'LABORATORIO']),
  createFridge
);
router.get('/fridges/:id/contents', getFridgeContents);
router.post(
  '/fridges/:id/assign',
  requireRoles(['ADMINISTRADOR', 'LABORATORIO']),
  assignUnitToFridge
);
router.post(
  '/fridges/:id/assign-batch',
  requireRoles(['ADMINISTRADOR', 'LABORATORIO']),
  assignBatchToFridge
);

// Frascos de reactivos
router.get('/units', getLabUnits);
router.get(
  '/reagents',
  requireRoles(['ADMINISTRADOR', 'LABORATORIO']),
  getAvailableReagents
);
router.get(
  '/consumptions',
  requireRoles(['ADMINISTRADOR', 'LABORATORIO']),
  getRecentConsumptions
);
router.post(
  '/consumptions',
  requireRoles(['ADMINISTRADOR', 'LABORATORIO']),
  registerReagentConsumption
);
router.get('/units/:id', getLabUnitById);
router.patch(
  '/units/:id/open',
  requireRoles(['ADMINISTRADOR', 'LABORATORIO']),
  openLabUnit
);
router.post(
  '/units/:id/consume',
  requireRoles(['ADMINISTRADOR', 'LABORATORIO']),
  consumeLabUnit
);
router.post(
  '/units/:id/transfer',
  requireRoles(['ADMINISTRADOR', 'LABORATORIO']),
  transferFridge
);
router.post(
  '/units/:id/discard',
  requireRoles(['ADMINISTRADOR', 'LABORATORIO']),
  discardLabUnit
);

// Cuarentena de doble instancia (Laboratorio)
router.post(
  '/units/:id/quarantine',
  requireRoles(['ADMINISTRADOR', 'LABORATORIO']),
  putUnitInQuarantine
);
router.post(
  '/quarantine/:id/resolve',
  requireRoles(['ADMINISTRADOR', 'LABORATORIO']),
  resolveQuarantine
);
router.get(
  '/quarantine',
  requireRoles(['ADMINISTRADOR', 'LABORATORIO']),
  getQuarantineIncidents
);

// Áreas de Laboratorio
router.get('/areas', getLabAreas);
router.get('/areas/:id', getLabAreaById);
router.post(
  '/areas',
  requireRoles(['ADMINISTRADOR', 'LABORATORIO']),
  createLabArea
);
router.put(
  '/areas/:id',
  requireRoles(['ADMINISTRADOR', 'LABORATORIO']),
  updateLabArea
);
router.post(
  '/areas/:id/users',
  requireRoles(['ADMINISTRADOR', 'LABORATORIO']),
  assignUsersToLabArea
);
router.get('/users/:id/areas', getUserLabAreas);
router.get('/my-areas', getUserLabAreas);

// Catálogo de Exámenes
router.get('/exams', getLabExams);
router.get('/exams/:id', getLabExamById);
router.post(
  '/exams',
  requireRoles(['ADMINISTRADOR', 'LABORATORIO']),
  createLabExam
);
router.put(
  '/exams/:id',
  requireRoles(['ADMINISTRADOR', 'LABORATORIO']),
  updateLabExam
);

// Solicitudes Internas a Coordinación
router.get('/requests', getInternalRequests);
router.get('/requests/:id', getInternalRequestById);
router.post(
  '/requests',
  requireRoles([
    'ADMINISTRADOR',
    'LABORATORIO',
    'COORDINADOR_LABORATORIO',
    'COORDINADOR',
    'BIOANALISTA',
  ]),
  createInternalRequest
);
router.get(
  '/requests/:id/suggest-fefo',
  requireRoles([
    'ADMINISTRADOR',
    'LABORATORIO',
    'COORDINADOR_LABORATORIO',
    'COORDINADOR',
  ]),
  suggestFefoForRequest
);
router.post(
  '/requests/:id/approve',
  requireRoles([
    'ADMINISTRADOR',
    'LABORATORIO',
    'COORDINADOR_LABORATORIO',
    'COORDINADOR',
  ]),
  approveInternalRequest
);
router.post(
  '/requests/:id/deliver',
  requireRoles([
    'ADMINISTRADOR',
    'LABORATORIO',
    'COORDINADOR_LABORATORIO',
    'COORDINADOR',
  ]),
  deliverInternalRequest
);
router.post(
  '/requests/:id/reject',
  requireRoles([
    'ADMINISTRADOR',
    'LABORATORIO',
    'COORDINADOR_LABORATORIO',
    'COORDINADOR',
  ]),
  rejectInternalRequest
);

// Motor de Corridas Semanales
router.get('/runs', getWeeklyRuns);
router.get('/runs/:id', getWeeklyRunById);
router.post(
  '/runs',
  requireRoles([
    'ADMINISTRADOR',
    'LABORATORIO',
    'COORDINADOR_LABORATORIO',
    'COORDINADOR',
    'BIOANALISTA',
  ]),
  createWeeklyRun
);
router.post(
  '/runs/:id/close',
  requireRoles([
    'ADMINISTRADOR',
    'LABORATORIO',
    'COORDINADOR_LABORATORIO',
    'COORDINADOR',
    'BIOANALISTA',
  ]),
  closeWeeklyRun
);

// Auditoría Inmutable de Consumos (5 Dimensiones)
router.get(
  '/audit-logs',
  requireRoles([
    'ADMINISTRADOR',
    'LABORATORIO',
    'COORDINADOR_LABORATORIO',
    'COORDINADOR',
    'BIOANALISTA',
  ]),
  getConsumptionAuditLogs
);

export default router;
