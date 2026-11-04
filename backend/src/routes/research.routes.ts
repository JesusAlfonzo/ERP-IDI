import { Router } from 'express';
import {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  addProjectMember,
  updateProjectMember,
  removeProjectMember,
  getInvestors,
  getInvestorById,
  createInvestor,
  getInvestments,
  recordInvestment,
  getDonations,
  recordDonation,
  getStockTransfers,
  transferStock,
  getTrials,
  getTrialById,
  createTrial,
  recordTrialExecution,
  getFindings,
  getFindingById,
  createFinding,
  updateFinding,
} from '../controllers/research.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

const RESEARCH_ROLES = [
  'ADMINISTRADOR',
  'INVESTIGACION',
  'DOCENCIA',
  'LABORATORIO',
  'COORDINADOR_LABORATORIO',
  'BIOANALISTA',
];

// 1. Proyectos de Investigación y Docencia
router.get('/projects', getProjects);
router.get('/projects/:id', getProjectById);
router.post('/projects', requireRoles(RESEARCH_ROLES), createProject);
router.put('/projects/:id', requireRoles(RESEARCH_ROLES), updateProject);

// 2. Miembros de Proyectos
router.post('/projects/:id/members', requireRoles(RESEARCH_ROLES), addProjectMember);
router.put('/projects/:id/members/:memberId', requireRoles(RESEARCH_ROLES), updateProjectMember);
router.delete('/projects/:id/members/:memberId', requireRoles(RESEARCH_ROLES), removeProjectMember);

// 3. Inversores y Aportes Financieros
router.get('/investors', getInvestors);
router.get('/investors/:id', getInvestorById);
router.post('/investors', requireRoles(RESEARCH_ROLES), createInvestor);
router.get('/investments', getInvestments);
router.post('/investments', requireRoles(RESEARCH_ROLES), recordInvestment);

// 4. Donaciones en Especie
router.get('/donations', getDonations);
router.post('/donations', requireRoles(RESEARCH_ROLES), recordDonation);

// 5. Cesiones y Traspasos de Stock
router.get('/transfers', getStockTransfers);
router.post('/transfers', requireRoles(RESEARCH_ROLES), transferStock);

// 6. Ensayos Experimentales
router.get('/trials', getTrials);
router.get('/trials/:id', getTrialById);
router.post('/trials', requireRoles(RESEARCH_ROLES), createTrial);
router.post('/trials/:id/execute', requireRoles(RESEARCH_ROLES), recordTrialExecution);

// 7. Resultados Obtenidos e Hitos
router.get('/findings', getFindings);
router.get('/findings/:id', getFindingById);
router.post('/findings', requireRoles(RESEARCH_ROLES), createFinding);
router.put('/findings/:id', requireRoles(RESEARCH_ROLES), updateFinding);

export default router;
