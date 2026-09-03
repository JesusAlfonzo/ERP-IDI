import { Router } from 'express';
import {
  getCatalogs,
  createCategory,
  createBrand,
  getProducts,
  createProduct,
} from '../controllers/product.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router: Router = Router();

// Rutas protegidas (lectura permitida a usuarios autenticados)
router.use(authenticateJWT);

router.get('/catalogs', getCatalogs);
router.get('/', getProducts);

// Creación reservada para administración, compras y laboratorio
router.post(
  '/categories',
  requireRoles(['ADMINISTRADOR', 'COMPRAS']),
  createCategory
);
router.post('/brands', requireRoles(['ADMINISTRADOR', 'COMPRAS']), createBrand);
router.post(
  '/',
  requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ANALISTA_LABORATORIO']),
  createProduct
);

export default router;
