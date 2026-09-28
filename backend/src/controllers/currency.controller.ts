import type { Request, Response, NextFunction } from 'express';
import { CurrencyService } from '../services/currency.service.js';
import { serializeBigInt } from '../utils/serializer.js';
import { prisma } from '../config/prisma.js';

export const getCurrenciesWithRates = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    const data = await CurrencyService.getLatestRates();
    res.status(200).json({ status: 'SUCCESS', data: serializeBigInt(data) });
  } catch (error) {
    next(error);
  }
};

export const registerExchangeRate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { currencyId, code, rate, usdRate, eurRate, effectiveDate } = req.body;

    let targetCurrencyId = currencyId ? Number(currencyId) : undefined;
    let targetRate = rate !== undefined && rate !== null ? Number(rate) : undefined;

    // Si no vino currencyId explícito, resolverlo por code o por usdRate/eurRate
    if (!targetCurrencyId) {
      const allCurrencies = await prisma.currency.findMany();
      if (code) {
        const found = allCurrencies.find((c) => c.code === code);
        if (found) targetCurrencyId = found.id;
      } else if (usdRate !== undefined && usdRate !== null) {
        const ves = allCurrencies.find((c) => c.code === 'VES' || c.code === 'VED');
        if (ves) {
          targetCurrencyId = ves.id;
          targetRate = Number(usdRate);
        }
      } else if (eurRate !== undefined && eurRate !== null) {
        const eur = allCurrencies.find((c) => c.code === 'EUR');
        if (eur) {
          targetCurrencyId = eur.id;
          targetRate = Number(eurRate);
        }
      }
    }

    if (!targetCurrencyId || targetRate === undefined || isNaN(targetRate)) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'Debe especificar el id o código de la moneda y una tasa de cambio válida',
      });
      return;
    }

    // Resolver usuario responsable
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

    const exchange = await CurrencyService.registerRate({
      currencyId: targetCurrencyId,
      rate: targetRate,
      effectiveDate: effectiveDateObj,
      createdById: userId,
    });

    // Actualizar también el modelo Currency con Prisma
    await prisma.currency.update({
      where: { id: targetCurrencyId },
      data: {},
    });

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Tasa de cambio registrada exitosamente',
      data: serializeBigInt(exchange),
    });
  } catch (error) {
    next(error);
  }
};
