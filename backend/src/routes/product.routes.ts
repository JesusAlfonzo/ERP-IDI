import { Router } from 'express';
import {
  getCatalogs,
  createCategory,
  createBrand,
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
} from '../controllers/product.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

router.get('/catalogs', getCatalogs);
router.get('/', getProducts);
router.get('/:id', getProductById);

// Creación y Modificación
router.post(
  '/categories',
  requireRoles(['ADMINISTRADOR', 'COMPRAS']),
  createCategory
);
router.post('/brands', requireRoles(['ADMINISTRADOR', 'COMPRAS']), createBrand);
router.post(
  '/',
  requireRoles(['ADMINISTRADOR', 'COMPRAS', 'LABORATORIO']),
  createProduct
);
router.put(
  '/:id',
  requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ALMACENISTA']),
  updateProduct
);
router.patch(
  '/:id',
  requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ALMACENISTA']),
  updateProduct
);

export default router;
