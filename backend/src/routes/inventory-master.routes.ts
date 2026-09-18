import { Router } from 'express';
import { InventoryMasterController } from '../controllers/inventory-master.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

// Lectura abierta para usuarios autenticados
router.get('/brands', InventoryMasterController.getBrands);
router.get('/units', InventoryMasterController.getUnits);
router.get('/locations', InventoryMasterController.getLocations);

// Mutaciones restringidas a Administrador y Almacén
router.post(
  '/brands',
  requireRoles(['ADMINISTRADOR', 'ALMACENISTA']),
  InventoryMasterController.createBrand
);
router.patch(
  '/brands/:id',
  requireRoles(['ADMINISTRADOR', 'ALMACENISTA']),
  InventoryMasterController.updateBrand
);

router.post(
  '/units',
  requireRoles(['ADMINISTRADOR', 'ALMACENISTA']),
  InventoryMasterController.createUnit
);
router.patch(
  '/units/:id',
  requireRoles(['ADMINISTRADOR', 'ALMACENISTA']),
  InventoryMasterController.updateUnit
);

router.post(
  '/locations',
  requireRoles(['ADMINISTRADOR', 'ALMACENISTA']),
  InventoryMasterController.createLocation
);
router.patch(
  '/locations/:id',
  requireRoles(['ADMINISTRADOR', 'ALMACENISTA']),
  InventoryMasterController.updateLocation
);

export default router;
