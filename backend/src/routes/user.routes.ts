import { Router } from 'express';
import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  syncUserRoles,
  listRoles,
  resetPassword,
} from '../controllers/user.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

// Rutas exclusivas para administradores
router.get('/roles', requireRoles(['ADMINISTRADOR']), listRoles);
router.get('/', requireRoles(['ADMINISTRADOR']), listUsers);
router.get('/:id', requireRoles(['ADMINISTRADOR']), getUserById);
router.post('/', requireRoles(['ADMINISTRADOR']), createUser);
router.patch('/:id', requireRoles(['ADMINISTRADOR']), updateUser);
router.patch(
  '/:id/reset-password',
  requireRoles(['ADMINISTRADOR']),
  resetPassword
);
router.put('/:id/roles', requireRoles(['ADMINISTRADOR']), syncUserRoles);

export default router;
