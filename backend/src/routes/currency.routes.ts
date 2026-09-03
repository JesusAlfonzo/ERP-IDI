import { Router } from 'express';
import {
  getCurrenciesWithRates,
  registerExchangeRate,
} from '../controllers/currency.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router: Router = Router();

router.use(authenticateJWT);

// Lectura de monedas y tasas para cualquier usuario autenticado
router.get('/', getCurrenciesWithRates);

// Ajuste manual de tasa diario exclusivo para Admin y Compras
router.post(
  '/rate',
  requireRoles(['ADMINISTRADOR', 'COMPRAS']),
  registerExchangeRate
);

export default router;
