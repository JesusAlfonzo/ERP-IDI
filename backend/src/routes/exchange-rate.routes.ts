import { Router } from 'express';
import {
  getCurrentExchangeRates,
  getExchangeRatesByDate,
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
 * GET /api/exchange-rates/by-date?date=YYYY-MM-DD
 * Retorna las tasas manuales registradas exactamente para la fecha indicada.
 */
router.get('/by-date', getExchangeRatesByDate);

/**
 * POST y PUT /api/exchange-rates
 * Permite a ADMINISTRADOR, COMPRAS o ADMINISTRACION registrar o actualizar tasas de cambio.
 */
router.post(
  '/',
  authenticateJWT,
  requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ADMINISTRACION']),
  updateExchangeRates
);

router.put(
  '/',
  authenticateJWT,
  requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ADMINISTRACION']),
  updateExchangeRates
);

router.post(
  '/current',
  authenticateJWT,
  requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ADMINISTRACION']),
  updateExchangeRates
);

router.put(
  '/current',
  authenticateJWT,
  requireRoles(['ADMINISTRADOR', 'COMPRAS', 'ADMINISTRACION']),
  updateExchangeRates
);

export default router;
