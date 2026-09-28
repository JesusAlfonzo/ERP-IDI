import { Router } from 'express';
import {
  getCurrentExchangeRates,
  updateExchangeRates,
} from '../controllers/exchange-rate.controller.js';
import { authenticateJWT } from '../middlewares/auth.middleware.js';
import { requireRoles } from '../middlewares/role.middleware.js';

const router: Router = Router();

/**
 * GET /api/exchange-rates/current
 * Retorna las tasas oficiales BCV vigentes para USD y EUR respecto al Bolívar (VED/VES).
 */
router.get('/current', getCurrentExchangeRates);

/**
 * POST y PUT /api/exchange-rates
 * Permite a ADMINISTRADOR o COMPRAS registrar o actualizar tasas de cambio.
 */
router.post(
  '/',
  authenticateJWT,
  requireRoles(['ADMINISTRADOR', 'COMPRAS']),
  updateExchangeRates
);

router.put(
  '/',
  authenticateJWT,
  requireRoles(['ADMINISTRADOR', 'COMPRAS']),
  updateExchangeRates
);

router.post(
  '/current',
  authenticateJWT,
  requireRoles(['ADMINISTRADOR', 'COMPRAS']),
  updateExchangeRates
);

router.put(
  '/current',
  authenticateJWT,
  requireRoles(['ADMINISTRADOR', 'COMPRAS']),
  updateExchangeRates
);

export default router;
