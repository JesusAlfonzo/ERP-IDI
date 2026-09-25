import { Router } from 'express';
import {
  getRequests,
  getRequestById,
  createRequest,
  approveRequest,
  rejectRequest,
  dispatchRequest,
  getWindowStatus,
  getWindowConfig,
  updateWindowConfig,
} from '../controllers/request.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

// Rutas de configuración y estado de ventana institucional (Deben registrarse antes de /:id)
router.get('/window-status', getWindowStatus);
router.get('/window-config', requireRoles(['ADMINISTRADOR']), getWindowConfig);
router.put('/window-config', requireRoles(['ADMINISTRADOR']), updateWindowConfig);

// Consultas y creación disponibles para usuarios autenticados (Bioanalistas, etc.)
router.get('/', getRequests);
router.get('/:id', getRequestById);
router.post('/', createRequest);

// Despacho de almacén
router.post(
  '/:id/dispatch',
  requireRoles(['ADMINISTRADOR', 'ALMACENISTA']),
  dispatchRequest
);

// Aprobación o rechazo exclusivo para Almacenista y Administrador
router.patch(
  '/:id/approve',
  requireRoles(['ADMINISTRADOR', 'ALMACENISTA']),
  approveRequest
);

router.post(
  '/:id/reject',
  requireRoles(['ADMINISTRADOR', 'ALMACENISTA']),
  rejectRequest
);

export default router;
