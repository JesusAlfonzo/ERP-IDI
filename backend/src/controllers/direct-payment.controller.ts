import type { Request, Response, NextFunction } from 'express';
import { DirectPaymentService } from '../services/direct-payment.service.js';
import { serializeBigInt } from '../utils/serializer.js';

export const getDirectPayments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { search, method, currency, startDate, endDate, sourceAccountId } = req.query;

    const payments = await DirectPaymentService.listDirectPayments({
      search: typeof search === 'string' ? search : undefined,
      method: typeof method === 'string' ? method : undefined,
      currency: typeof currency === 'string' ? currency : undefined,
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
      sourceAccountId: sourceAccountId ? Number(sourceAccountId) : undefined,
    });

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(payments),
    });
  } catch (error) {
    next(error);
  }
};

export const getDirectPaymentById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id) {
      res.status(400).json({ status: 'BAD_REQUEST', message: 'ID de pago requerido' });
      return;
    }

    const payment = await DirectPaymentService.getDirectPaymentById(BigInt(id));
    if (!payment) {
      res.status(404).json({ status: 'NOT_FOUND', message: 'Pago directo no encontrado' });
      return;
    }

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(payment),
    });
  } catch (error) {
    next(error);
  }
};

export const createDirectPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      concept,
      beneficiary,
      method,
      sourceAccountId,
      destinationAccount,
      referenceNumber,
      paymentDate,
      amountPaid,
      transactionCurrency,
      exchangeRate,
      notes,
      receiptImageUrl,
      reviewedBy,
      authorizedBy,
      approvedBy,
    } = req.body;

    if (!req.user?.id) {
      res.status(401).json({ status: 'UNAUTHORIZED', message: 'Usuario no autenticado' });
      return;
    }

    const payment = await DirectPaymentService.createDirectPayment({
      concept,
      beneficiary,
      method,
      sourceAccountId: sourceAccountId ? Number(sourceAccountId) : null,
      destinationAccount,
      referenceNumber,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      amountPaid: Number(amountPaid),
      transactionCurrency,
      exchangeRate: exchangeRate ? Number(exchangeRate) : null,
      notes,
      receiptImageUrl,
      reviewedBy,
      authorizedBy,
      approvedBy,
      registeredById: req.user.id,
    });

    res.status(201).json({
      status: 'SUCCESS',
      message: 'Pago directo registrado exitosamente',
      data: serializeBigInt(payment),
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: error.message,
      });
      return;
    }
    next(error);
  }
};

export const deleteDirectPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userRoles = req.user?.roles ?? [];
    if (!userRoles.includes('ADMINISTRADOR')) {
      res.status(403).json({
        status: 'FORBIDDEN',
        message: 'Acceso denegado: Solo el Administrador puede eliminar egresos directos.',
      });
      return;
    }

    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id) {
      res.status(400).json({ status: 'BAD_REQUEST', message: 'ID de pago requerido' });
      return;
    }

    await DirectPaymentService.deleteDirectPayment(BigInt(id));

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Pago directo eliminado exitosamente',
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: error.message,
      });
      return;
    }
    next(error);
  }
};
