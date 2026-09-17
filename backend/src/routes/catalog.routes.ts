import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getBrands,
  createBrand,
  updateBrand,
  getUnits,
  createUnit,
  updateUnit,
  getLocations,
  createLocation,
  updateLocation,
  getDepartments,
} from '../controllers/catalog.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

// Lectura general de catálogo (abierta a usuarios autenticados)
router.get('/categories', getCategories);
router.get('/brands', getBrands);
router.get('/units', getUnits);
router.get('/locations', getLocations);
router.get('/departments', getDepartments);

// Mutaciones administrativas y de almacén
const adminOrWarehouse = requireRoles(['ADMINISTRADOR', 'ALMACENISTA']);

router.post('/categories', adminOrWarehouse, createCategory);
router.patch('/categories/:id', adminOrWarehouse, updateCategory);
router.delete(
  '/categories/:id',
  requireRoles(['ADMINISTRADOR']),
  deleteCategory
);

router.post('/brands', adminOrWarehouse, createBrand);
router.patch('/brands/:id', adminOrWarehouse, updateBrand);

router.post('/units', adminOrWarehouse, createUnit);
router.patch('/units/:id', adminOrWarehouse, updateUnit);

router.post('/locations', adminOrWarehouse, createLocation);
router.patch('/locations/:id', adminOrWarehouse, updateLocation);

export default router;
