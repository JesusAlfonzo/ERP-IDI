import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  getUnits,
  createUnit,
  updateUnit,
  deleteUnit,
  getLocations,
  createLocation,
  updateLocation,
  deleteLocation,
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

// Mutaciones administrativas (EXCLUSIVAMENTE ADMINISTRADOR)
const adminOnly = requireRoles(['ADMINISTRADOR']);

// Categorías
router.post('/categories', adminOnly, createCategory);
router.patch('/categories/:id', adminOnly, updateCategory);
router.put('/categories/:id', adminOnly, updateCategory);
router.delete('/categories/:id', adminOnly, deleteCategory);

// Marcas
router.post('/brands', adminOnly, createBrand);
router.patch('/brands/:id', adminOnly, updateBrand);
router.put('/brands/:id', adminOnly, updateBrand);
router.delete('/brands/:id', adminOnly, deleteBrand);

// Unidades de Medida
router.post('/units', adminOnly, createUnit);
router.patch('/units/:id', adminOnly, updateUnit);
router.put('/units/:id', adminOnly, updateUnit);
router.delete('/units/:id', adminOnly, deleteUnit);

// Ubicaciones Físicas
router.post('/locations', adminOnly, createLocation);
router.patch('/locations/:id', adminOnly, updateLocation);
router.put('/locations/:id', adminOnly, updateLocation);
router.delete('/locations/:id', adminOnly, deleteLocation);

export default router;
