import { Router } from 'express';
import {
  getRequests,
  getRequestById,
  createRequest,
  approveRequest,
  rejectRequest,
  dispatchRequest,
} from '../controllers/request.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

// Consultas y creación disponibles para usuarios autenticados (Bioanalistas, etc.)
router.get('/', getRequests);
router.get('/:id', getRequestById);
router.post('/', createRequest);
router.patch(
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

router.patch(
  '/:id/reject',
  requireRoles(['ADMINISTRADOR', 'ALMACENISTA']),
  rejectRequest
);

export default router;
