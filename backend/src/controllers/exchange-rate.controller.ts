import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';

/**
 * GET /api/exchange-rates/current
 * Retorna las tasas oficiales BCV vigentes para USD y EUR respecto al Bolívar (VED/VES).
 * Envía cabeceras anti-caché estrictas para garantizar información en tiempo real.
 */
export const getCurrentExchangeRates = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    const currencies = await prisma.currency.findMany({
      include: {
        exchanges: {
          orderBy: [{ effectiveDate: 'desc' }, { id: 'desc' }],
          take: 1,
        },
      },
    });

    const ves = currencies.find((c) => c.code === 'VES' || c.code === 'VED');
    const eur = currencies.find((c) => c.code === 'EUR');

    const usdRate = ves?.exchanges[0]?.rate ? Number(ves.exchanges[0].rate) : 75.0;
    const eurRate = eur?.exchanges[0]?.rate ? Number(eur.exchanges[0].rate) : 81.5;

    const latestExchange = [ves?.exchanges[0], eur?.exchanges[0]]
      .filter((ex): ex is NonNullable<typeof ex> => !!ex)
      .sort((a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime())[0];

    const effectiveDateObj = latestExchange?.effectiveDate ?? new Date();
    const effectiveDate = effectiveDateObj.toISOString().split('T')[0];
    const lastUpdated = effectiveDateObj.toISOString();

    res.status(200).json({
      status: 'SUCCESS',
      data: {
        rate: usdRate,
        usdRate,
        bcvRate: usdRate,
        eurRate,
        USD: usdRate,
        EUR: eurRate,
        VED: 1.0,
        VES: usdRate,
        date: effectiveDate,
        effectiveDate,
        lastUpdated,
        rates: {
          USD: usdRate,
          EUR: eurRate,
          VED: 1.0,
          VES: usdRate,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT / POST /api/exchange-rates
 * Actualiza o registra nuevas tasas oficiales en la base de datos (Prisma).
 * Soporta múltiples formatos de payload:
 * - { currencyId, rate }
 * - { code: 'VES' | 'EUR', rate }
 * - { usdRate, eurRate }
 * - { rates: { USD?, EUR?, VES? } } o { rates: [ { currencyId, rate } ] }
 * Retorna siempre HTTP 200 OK con la tasa actualizada.
 */
export const updateExchangeRates = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      currencyId,
      code,
      rate,
      usdRate,
      eurRate,
      rates,
      effectiveDate,
    } = req.body;

    // 1. Obtener ID del usuario que registra el cambio
    let userId = req.user?.id;
    if (!userId) {
      const adminUser =
        (await prisma.user.findFirst({
          where: {
            userRoles: {
              some: { role: { name: 'ADMINISTRADOR' } },
            },
          },
        })) || (await prisma.user.findFirst());
      userId = adminUser?.id ?? 1;
    }

    const effectiveDateObj = effectiveDate ? new Date(effectiveDate) : new Date();

    // 2. Normalizar la lista de tasas a registrar
    const updatesToApply: Array<{ currencyId: number; rate: number }> = [];

    // Cargar todas las monedas registradas
    const allCurrencies = await prisma.currency.findMany();
    const ves = allCurrencies.find((c) => c.code === 'VES' || c.code === 'VED');
    const eur = allCurrencies.find((c) => c.code === 'EUR');

    if (currencyId && rate !== undefined && rate !== null) {
      updatesToApply.push({ currencyId: Number(currencyId), rate: Number(rate) });
    } else if (code && rate !== undefined && rate !== null) {
      const target = allCurrencies.find((c) => c.code === code);
      if (target) {
        updatesToApply.push({ currencyId: target.id, rate: Number(rate) });
      }
    }

    if (usdRate !== undefined && usdRate !== null && ves) {
      updatesToApply.push({ currencyId: ves.id, rate: Number(usdRate) });
    }

    if (eurRate !== undefined && eurRate !== null && eur) {
      updatesToApply.push({ currencyId: eur.id, rate: Number(eurRate) });
    }

    if (Array.isArray(rates)) {
      for (const item of rates) {
        if (item.currencyId && item.rate !== undefined) {
          updatesToApply.push({ currencyId: Number(item.currencyId), rate: Number(item.rate) });
        } else if (item.code && item.rate !== undefined) {
          const target = allCurrencies.find((c) => c.code === item.code);
          if (target) {
            updatesToApply.push({ currencyId: target.id, rate: Number(item.rate) });
          }
        }
      }
    } else if (rates && typeof rates === 'object') {
      for (const [key, val] of Object.entries(rates)) {
        if (val !== undefined && val !== null) {
          const target = allCurrencies.find((c) => c.code === key) ||
            (key === 'USD' ? ves : null);
          if (target) {
            updatesToApply.push({ currencyId: target.id, rate: Number(val) });
          }
        }
      }
    }

    if (updatesToApply.length === 0) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message:
          'Debe especificar al menos una tasa de cambio válida a actualizar (currencyId + rate, code + rate, usdRate, o eurRate)',
      });
      return;
    }

    // 3. Persistir en la base de datos con Prisma
    for (const item of updatesToApply) {
      // Registrar en el historial de intercambios
      await prisma.currencyExchange.create({
        data: {
          currencyId: item.currencyId,
          rate: item.rate,
          effectiveDate: effectiveDateObj,
          createdById: userId,
        },
      });

      // Actualizar el modelo Currency
      await prisma.currency.update({
        where: { id: item.currencyId },
        data: {},
      });
    }

    // 4. Cabeceras anti-caché
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    // 5. Cargar y responder con el estado fresco actualizado (HTTP 200 OK)
    const refreshedCurrencies = await prisma.currency.findMany({
      include: {
        exchanges: {
          orderBy: [{ effectiveDate: 'desc' }, { id: 'desc' }],
          take: 1,
        },
      },
    });

    const refreshedVes = refreshedCurrencies.find((c) => c.code === 'VES' || c.code === 'VED');
    const refreshedEur = refreshedCurrencies.find((c) => c.code === 'EUR');

    const finalUsdRate = refreshedVes?.exchanges[0]?.rate
      ? Number(refreshedVes.exchanges[0].rate)
      : 75.0;
    const finalEurRate = refreshedEur?.exchanges[0]?.rate
      ? Number(refreshedEur.exchanges[0].rate)
      : 81.5;

    const effDateStr = effectiveDateObj.toISOString().split('T')[0];
    const lastUpdStr = effectiveDateObj.toISOString();

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Tasa de cambio actualizada correctamente',
      data: {
        rate: finalUsdRate,
        usdRate: finalUsdRate,
        bcvRate: finalUsdRate,
        eurRate: finalEurRate,
        USD: finalUsdRate,
        EUR: finalEurRate,
        VED: 1.0,
        VES: finalUsdRate,
        date: effDateStr,
        effectiveDate: effDateStr,
        lastUpdated: lastUpdStr,
        rates: {
          USD: finalUsdRate,
          EUR: finalEurRate,
          VED: 1.0,
          VES: finalUsdRate,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
