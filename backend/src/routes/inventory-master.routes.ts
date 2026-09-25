import { Router } from 'express';
import { InventoryMasterController } from '../controllers/inventory-master.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

// Lectura abierta para usuarios autenticados
router.get('/categories', InventoryMasterController.getCategories);
router.get('/brands', InventoryMasterController.getBrands);
router.get('/units', InventoryMasterController.getUnits);
router.get('/locations', InventoryMasterController.getLocations);

// Mutaciones restringidas EXCLUSIVAMENTE a Administrador institucional
const adminOnly = requireRoles(['ADMINISTRADOR']);

// Categorías
router.post('/categories', adminOnly, InventoryMasterController.createCategory);
router.put('/categories/:id', adminOnly, InventoryMasterController.updateCategory);
router.patch('/categories/:id', adminOnly, InventoryMasterController.updateCategory);
router.delete('/categories/:id', adminOnly, InventoryMasterController.deleteCategory);

// Marcas
router.post('/brands', adminOnly, InventoryMasterController.createBrand);
router.put('/brands/:id', adminOnly, InventoryMasterController.updateBrand);
router.patch('/brands/:id', adminOnly, InventoryMasterController.updateBrand);
router.delete('/brands/:id', adminOnly, InventoryMasterController.deleteBrand);

// Unidades de Medida
router.post('/units', adminOnly, InventoryMasterController.createUnit);
router.put('/units/:id', adminOnly, InventoryMasterController.updateUnit);
router.patch('/units/:id', adminOnly, InventoryMasterController.updateUnit);
router.delete('/units/:id', adminOnly, InventoryMasterController.deleteUnit);

// Ubicaciones Físicas
router.post('/locations', adminOnly, InventoryMasterController.createLocation);
router.put('/locations/:id', adminOnly, InventoryMasterController.updateLocation);
router.patch('/locations/:id', adminOnly, InventoryMasterController.updateLocation);
router.delete('/locations/:id', adminOnly, InventoryMasterController.deleteLocation);

export default router;
