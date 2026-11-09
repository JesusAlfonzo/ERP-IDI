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
  quickConsumeReagent,
  failRunByCalibration,
  reconcileFridgeAudit,
  getConsumptionAuditLogs,
} from '../controllers/lab.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

/**
 * Matriz Homologada de Permisos (RBAC) - Laboratorio Clínico
 * 
 * 1. Roles Analíticos / Operativos:
 *    Permite consulta general y trabajo diario en mesón analítico.
 *    Roles: BIOANALISTA, LABORATORIO, COORDINADOR_LABORATORIO, COORDINADOR, ADMINISTRADOR.
 * 
 * 2. Roles de Supervisión y Control Crítico:
 *    Restringido exclusivamente para gobierno, aprobaciones FEFO, cuarentena y auditorías.
 *    Roles: COORDINADOR_LABORATORIO, COORDINADOR, ADMINISTRADOR.
 */
export const LAB_ANALYTICAL_ROLES = [
  'ADMINISTRADOR',
  'COORDINADOR_LABORATORIO',
  'COORDINADOR',
  'LABORATORIO',
  'BIOANALISTA',
];

export const LAB_SUPERVISORY_ROLES = [
  'ADMINISTRADOR',
  'COORDINADOR_LABORATORIO',
  'COORDINADOR',
];

const router: Router = Router();

router.use(authenticateJWT);

// ==========================================
// 1. NEVERAS, CAVAS Y EQUIPOS DE FRÍO
// ==========================================
router.get('/fridges', requireRoles(LAB_ANALYTICAL_ROLES), getFridges);
router.post(
  '/fridges',
  requireRoles(LAB_SUPERVISORY_ROLES),
  createFridge
);
router.get(
  '/fridges/:id/contents',
  requireRoles(LAB_ANALYTICAL_ROLES),
  getFridgeContents
);
router.post(
  '/fridges/:id/assign',
  requireRoles(LAB_ANALYTICAL_ROLES),
  assignUnitToFridge
);
router.post(
  '/fridges/:id/assign-batch',
  requireRoles(LAB_ANALYTICAL_ROLES),
  assignBatchToFridge
);

// ==========================================
// 2. FRASCOS / UNIDADES Y CONSUMOS DIRECTOS
// ==========================================
router.get('/units', requireRoles(LAB_ANALYTICAL_ROLES), getLabUnits);
router.get(
  '/reagents',
  requireRoles(LAB_ANALYTICAL_ROLES),
  getAvailableReagents
);
router.get(
  '/consumptions',
  requireRoles(LAB_ANALYTICAL_ROLES),
  getRecentConsumptions
);
router.post(
  '/consumptions',
  requireRoles(LAB_ANALYTICAL_ROLES),
  registerReagentConsumption
);
router.get('/units/:id', requireRoles(LAB_ANALYTICAL_ROLES), getLabUnitById);
router.post(
  '/units/:id/open',
  requireRoles(LAB_ANALYTICAL_ROLES),
  openLabUnit
);
router.patch(
  '/units/:id/open',
  requireRoles(LAB_ANALYTICAL_ROLES),
  openLabUnit
);
router.post(
  '/units/:id/consume',
  requireRoles(LAB_ANALYTICAL_ROLES),
  consumeLabUnit
);
router.post(
  '/units/:id/transfer',
  requireRoles(LAB_ANALYTICAL_ROLES),
  transferFridge
);
router.post(
  '/units/:id/discard',
  requireRoles(LAB_SUPERVISORY_ROLES),
  discardLabUnit
);

// ==========================================
// 3. CUARENTENA TÉCNICA E INCIDENCIAS (LAB)
// ==========================================
router.post(
  '/units/:id/quarantine',
  requireRoles(LAB_SUPERVISORY_ROLES),
  putUnitInQuarantine
);
router.post(
  '/quarantine/:id/resolve',
  requireRoles(LAB_SUPERVISORY_ROLES),
  resolveQuarantine
);
router.get(
  '/quarantine',
  requireRoles(LAB_ANALYTICAL_ROLES),
  getQuarantineIncidents
);

// ==========================================
// 4. ÁREAS DE LABORATORIO
// ==========================================
router.get('/areas', requireRoles(LAB_ANALYTICAL_ROLES), getLabAreas);
router.get('/areas/:id', requireRoles(LAB_ANALYTICAL_ROLES), getLabAreaById);
router.post(
  '/areas',
  requireRoles(LAB_SUPERVISORY_ROLES),
  createLabArea
);
router.put(
  '/areas/:id',
  requireRoles(LAB_SUPERVISORY_ROLES),
  updateLabArea
);
router.post(
  '/areas/:id/users',
  requireRoles(LAB_SUPERVISORY_ROLES),
  assignUsersToLabArea
);
router.get('/users/:id/areas', requireRoles(LAB_ANALYTICAL_ROLES), getUserLabAreas);
router.get('/my-areas', requireRoles(LAB_ANALYTICAL_ROLES), getUserLabAreas);

// ==========================================
// 5. CATÁLOGO DE EXÁMENES CLÍNICOS
// ==========================================
router.get('/exams', requireRoles(LAB_ANALYTICAL_ROLES), getLabExams);
router.get('/exams/:id', requireRoles(LAB_ANALYTICAL_ROLES), getLabExamById);
router.post(
  '/exams',
  requireRoles(LAB_SUPERVISORY_ROLES),
  createLabExam
);
router.put(
  '/exams/:id',
  requireRoles(LAB_SUPERVISORY_ROLES),
  updateLabExam
);

// ==========================================
// 6. SOLICITUDES INTERNAS Y DESPACHO FEFO
// ==========================================
router.get('/requests', requireRoles(LAB_ANALYTICAL_ROLES), getInternalRequests);
router.get('/requests/:id', requireRoles(LAB_ANALYTICAL_ROLES), getInternalRequestById);
router.post(
  '/requests',
  requireRoles(LAB_ANALYTICAL_ROLES),
  createInternalRequest
);
router.get(
  '/requests/:id/suggest-fefo',
  requireRoles(LAB_SUPERVISORY_ROLES),
  suggestFefoForRequest
);
router.post(
  '/requests/:id/approve',
  requireRoles(LAB_SUPERVISORY_ROLES),
  approveInternalRequest
);
router.post(
  '/requests/:id/deliver',
  requireRoles(LAB_SUPERVISORY_ROLES),
  deliverInternalRequest
);
router.post(
  '/requests/:id/reject',
  requireRoles(LAB_SUPERVISORY_ROLES),
  rejectInternalRequest
);

// ==========================================
// 7. MOTOR DE CORRIDAS SEMANALES Y ACCIONES RÁPIDAS (FASE 2B)
// ==========================================
router.get('/runs', requireRoles(LAB_ANALYTICAL_ROLES), getWeeklyRuns);

// Consumo rápido / prueba individual (debe ir antes de /runs/:id)
router.post(
  '/runs/quick-consume',
  requireRoles(LAB_ANALYTICAL_ROLES),
  quickConsumeReagent
);

router.get('/runs/:id', requireRoles(LAB_ANALYTICAL_ROLES), getWeeklyRunById);
router.post(
  '/runs',
  requireRoles(LAB_ANALYTICAL_ROLES),
  createWeeklyRun
);
router.post(
  '/runs/:id/close',
  requireRoles(LAB_ANALYTICAL_ROLES),
  closeWeeklyRun
);

// Acción rápida: corrida fallida por calibración (Caso Borde E5)
router.post(
  '/runs/:id/fail-calibration',
  requireRoles(LAB_ANALYTICAL_ROLES),
  failRunByCalibration
);

// ==========================================
// 8. ARQUEO FÍSICO DE NEVERAS (RECONCILIACIÓN EN 1 CLIC - CASO BORDE E6)
// ==========================================
router.post(
  '/fridge-audits/:id/reconcile',
  requireRoles(LAB_SUPERVISORY_ROLES),
  reconcileFridgeAudit
);

// ==========================================
// 9. AUDITORÍA INMUTABLE DE CONSUMOS (5D)
// ==========================================
router.get(
  '/audit-logs',
  requireRoles(LAB_ANALYTICAL_ROLES),
  getConsumptionAuditLogs
);

export default router;
