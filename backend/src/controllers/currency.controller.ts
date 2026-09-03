import type { Request, Response, NextFunction } from 'express';
import { CurrencyService } from '../services/currency.service.js';
import { serializeBigInt } from '../utils/serializer.js';

export const getCurrenciesWithRates = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
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
    const { currencyId, rate, effectiveDate } = req.body;

    if (!currencyId || !rate) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'Debe especificar el id de la moneda y la tasa de cambio',
      });
      return;
    }

    if (!req.user?.id) {
      res
        .status(401)
        .json({ status: 'UNAUTHORIZED', message: 'Usuario no autenticado' });
      return;
    }

    const exchange = await CurrencyService.registerRate({
      currencyId: Number(currencyId),
      rate: Number(rate),
      effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
      createdById: req.user.id,
    });

    res.status(201).json({
      status: 'SUCCESS',
      data: serializeBigInt(exchange),
    });
  } catch (error) {
    next(error);
  }
};
