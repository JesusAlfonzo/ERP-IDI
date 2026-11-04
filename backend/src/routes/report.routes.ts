import { Router } from 'express';
import {
  getDashboardSummary,
  getCustomReport,
  getCostRealByExamReport,
  getFinancialConsolidatedByAreaReport,
  getItemTraceabilityReport,
} from '../controllers/report.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

router.get(
  '/dashboard',
  requireRoles(['ADMINISTRADOR', 'ALMACENISTA', 'COMPRAS', 'ADMINISTRACION']),
  getDashboardSummary
);

router.get(
  '/custom',
  requireRoles(['ADMINISTRADOR', 'ALMACENISTA', 'COMPRAS', 'ADMINISTRACION', 'SOLICITANTE']),
  getCustomReport
);

// Reportes Financieros de Laboratorio e Investigación (Fase 4)
router.get(
  '/financial/by-exam',
  requireRoles([
    'ADMINISTRADOR',
    'COORDINADOR_LABORATORIO',
    'COORDINADOR',
    'ADMINISTRACION',
    'LABORATORIO',
    'BIOANALISTA',
  ]),
  getCostRealByExamReport
);

router.get(
  '/financial/by-area',
  requireRoles([
    'ADMINISTRADOR',
    'COORDINADOR_LABORATORIO',
    'COORDINADOR',
    'ADMINISTRACION',
    'LABORATORIO',
  ]),
  getFinancialConsolidatedByAreaReport
);

// Trazabilidad Punta a Punta (Fase 4)
router.get(
  '/traceability/item/:id',
  requireRoles([
    'ADMINISTRADOR',
    'COORDINADOR_LABORATORIO',
    'COORDINADOR',
    'ADMINISTRACION',
    'LABORATORIO',
    'BIOANALISTA',
    'ALMACENISTA',
  ]),
  getItemTraceabilityReport
);

router.get(
  '/traceability/batch/:batchId',
  requireRoles([
    'ADMINISTRADOR',
    'COORDINADOR_LABORATORIO',
    'COORDINADOR',
    'ADMINISTRACION',
    'LABORATORIO',
    'BIOANALISTA',
    'ALMACENISTA',
  ]),
  getItemTraceabilityReport
);

router.get(
  '/traceability/product/:productId',
  requireRoles([
    'ADMINISTRADOR',
    'COORDINADOR_LABORATORIO',
    'COORDINADOR',
    'ADMINISTRACION',
    'LABORATORIO',
    'BIOANALISTA',
    'ALMACENISTA',
  ]),
  getItemTraceabilityReport
);

router.get(
  '/traceability',
  requireRoles([
    'ADMINISTRADOR',
    'COORDINADOR_LABORATORIO',
    'COORDINADOR',
    'ADMINISTRACION',
    'LABORATORIO',
    'BIOANALISTA',
    'ALMACENISTA',
  ]),
  getItemTraceabilityReport
);

export default router;
