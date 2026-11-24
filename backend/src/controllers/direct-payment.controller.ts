import type { Request, Response, NextFunction } from 'express';
import { DirectPaymentService } from '../services/direct-payment.service.js';
import { serializeBigInt } from '../utils/serializer.js';

function getParamId(req: Request): string | null {
  const rawId = req.params.id;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  return id || null;
}

export const getDirectPayments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      search,
      status,
      departmentId,
      supplierId,
      method,
      currency,
      startDate,
      endDate,
      sourceAccountId,
    } = req.query;

    const payments = await DirectPaymentService.listDirectPayments({
      search: typeof search === 'string' ? search : undefined,
      status: typeof status === 'string' ? status : undefined,
      departmentId: departmentId ? Number(departmentId) : undefined,
      supplierId: supplierId ? Number(supplierId) : undefined,
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
    const id = getParamId(req);
    if (!id) {
      res.status(400).json({ status: 'BAD_REQUEST', message: 'ID de orden de servicio requerido' });
      return;
    }

    const payment = await DirectPaymentService.getDirectPaymentById(BigInt(id));
    if (!payment) {
      res.status(404).json({ status: 'NOT_FOUND', message: 'Orden de servicio no encontrada' });
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
      supplierId,
      newSupplier,
      departmentId,
      estimatedDate,
      supportUrl,
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
      immediateSettlement,
    } = req.body;

    if (!req.user?.id) {
      res.status(401).json({ status: 'UNAUTHORIZED', message: 'Usuario no autenticado' });
      return;
    }

    const payment = await DirectPaymentService.createDirectPayment({
      concept,
      beneficiary,
      supplierId: supplierId ? Number(supplierId) : null,
      newSupplier: newSupplier && typeof newSupplier === 'object' ? newSupplier : null,
      departmentId: departmentId ? Number(departmentId) : null,
      estimatedDate: estimatedDate ? new Date(estimatedDate) : null,
      supportUrl,
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
      immediateSettlement: Boolean(immediateSettlement),
    });

    res.status(201).json({
      status: 'SUCCESS',
      message: 'Orden de servicio creada exitosamente',
      data: serializeBigInt(payment),
    });
  } catch (error: any) {
    if (error?.statusCode === 409 || error?.status === 'CONFLICT') {
      res.status(409).json({
        status: 'CONFLICT',
        message: error.message,
        ...(error.existingSupplier
          ? { existingSupplier: serializeBigInt(error.existingSupplier) }
          : {}),
      });
      return;
    }
    if (error instanceof Error) {
      res.status((error as any).statusCode || 400).json({
        status: 'BAD_REQUEST',
        message: error.message,
      });
      return;
    }
    next(error);
  }
};

export const submitServiceOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getParamId(req);
    if (!id) {
      res.status(400).json({ status: 'BAD_REQUEST', message: 'ID requerido' });
      return;
    }

    const updated = await DirectPaymentService.submitForApproval(BigInt(id));
    res.status(200).json({
      status: 'SUCCESS',
      message: 'Orden de servicio enviada a aprobación',
      data: serializeBigInt(updated),
    });
  } catch (error: any) {
    if (error?.statusCode === 409 || error?.status === 'CONFLICT') {
      res.status(409).json({
        status: 'CONFLICT',
        message: error.message,
        ...(error.existingSupplier
          ? { existingSupplier: serializeBigInt(error.existingSupplier) }
          : {}),
      });
      return;
    }
    if (error instanceof Error) {
      res.status((error as any).statusCode || 400).json({
        status: 'BAD_REQUEST',
        message: error.message,
      });
      return;
    }
    next(error);
  }
};

export const approveServiceOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getParamId(req);
    if (!id || !req.user?.id) {
      res.status(400).json({ status: 'BAD_REQUEST', message: 'ID o usuario requerido' });
      return;
    }

    const { notes } = req.body || {};
    const updated = await DirectPaymentService.approveServiceOrder(
      BigInt(id),
      req.user.id,
      typeof notes === 'string' ? notes : undefined
    );

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Orden de servicio aprobada exitosamente',
      data: serializeBigInt(updated),
    });
  } catch (error: any) {
    if (error?.statusCode === 409 || error?.status === 'CONFLICT') {
      res.status(409).json({
        status: 'CONFLICT',
        message: error.message,
        ...(error.existingSupplier
          ? { existingSupplier: serializeBigInt(error.existingSupplier) }
          : {}),
      });
      return;
    }
    if (error instanceof Error) {
      res.status((error as any).statusCode || 400).json({
        status: 'BAD_REQUEST',
        message: error.message,
      });
      return;
    }
    next(error);
  }
};

export const rejectServiceOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getParamId(req);
    if (!id || !req.user?.id) {
      res.status(400).json({ status: 'BAD_REQUEST', message: 'ID o usuario requerido' });
      return;
    }

    const { reason } = req.body || {};
    const updated = await DirectPaymentService.rejectServiceOrder(
      BigInt(id),
      req.user.id,
      typeof reason === 'string' ? reason : ''
    );

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Orden de servicio rechazada',
      data: serializeBigInt(updated),
    });
  } catch (error: any) {
    if (error?.statusCode === 409 || error?.status === 'CONFLICT') {
      res.status(409).json({
        status: 'CONFLICT',
        message: error.message,
        ...(error.existingSupplier
          ? { existingSupplier: serializeBigInt(error.existingSupplier) }
          : {}),
      });
      return;
    }
    if (error instanceof Error) {
      res.status((error as any).statusCode || 400).json({
        status: 'BAD_REQUEST',
        message: error.message,
      });
      return;
    }
    next(error);
  }
};

export const generatePaymentOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getParamId(req);
    if (!id || !req.user?.id) {
      res.status(400).json({ status: 'BAD_REQUEST', message: 'ID o usuario requerido' });
      return;
    }

    const { notes } = req.body || {};
    const updated = await DirectPaymentService.generatePaymentOrder(
      BigInt(id),
      req.user.id,
      typeof notes === 'string' ? notes : undefined
    );

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Orden de pago generada exitosamente',
      data: serializeBigInt(updated),
    });
  } catch (error: any) {
    if (error?.statusCode === 409 || error?.status === 'CONFLICT') {
      res.status(409).json({
        status: 'CONFLICT',
        message: error.message,
        ...(error.existingSupplier
          ? { existingSupplier: serializeBigInt(error.existingSupplier) }
          : {}),
      });
      return;
    }
    if (error instanceof Error) {
      res.status((error as any).statusCode || 400).json({
        status: 'BAD_REQUEST',
        message: error.message,
      });
      return;
    }
    next(error);
  }
};

export const registerServicePayment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getParamId(req);
    if (!id || !req.user?.id) {
      res.status(400).json({ status: 'BAD_REQUEST', message: 'ID o usuario requerido' });
      return;
    }

    const {
      method,
      sourceAccountId,
      destinationAccount,
      referenceNumber,
      paymentDate,
      amountPaid,
      transactionCurrency,
      exchangeRate,
      receiptImageUrl,
      notes,
      reviewedBy,
      authorizedBy,
      approvedBy,
    } = req.body || {};

    const updated = await DirectPaymentService.registerServicePayment(
      BigInt(id),
      req.user.id,
      {
        method,
        sourceAccountId: sourceAccountId ? Number(sourceAccountId) : null,
        destinationAccount,
        referenceNumber,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        amountPaid: amountPaid !== undefined ? Number(amountPaid) : undefined,
        transactionCurrency,
        exchangeRate: exchangeRate ? Number(exchangeRate) : null,
        receiptImageUrl,
        notes,
        reviewedBy,
        authorizedBy,
        approvedBy,
      }
    );

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Pago registrado y orden de servicio cerrada exitosamente',
      data: serializeBigInt(updated),
    });
  } catch (error: any) {
    if (error?.statusCode === 409 || error?.status === 'CONFLICT') {
      res.status(409).json({
        status: 'CONFLICT',
        message: error.message,
        ...(error.existingSupplier
          ? { existingSupplier: serializeBigInt(error.existingSupplier) }
          : {}),
      });
      return;
    }
    if (error instanceof Error) {
      res.status((error as any).statusCode || 400).json({
        status: 'BAD_REQUEST',
        message: error.message,
      });
      return;
    }
    next(error);
  }
};

export const cancelServiceOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = getParamId(req);
    if (!id || !req.user?.id) {
      res.status(400).json({ status: 'BAD_REQUEST', message: 'ID o usuario requerido' });
      return;
    }

    const { reason } = req.body || {};
    const updated = await DirectPaymentService.cancelServiceOrder(
      BigInt(id),
      req.user.id,
      typeof reason === 'string' ? reason : undefined
    );

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Orden de servicio cancelada',
      data: serializeBigInt(updated),
    });
  } catch (error: any) {
    if (error?.statusCode === 409 || error?.status === 'CONFLICT') {
      res.status(409).json({
        status: 'CONFLICT',
        message: error.message,
        ...(error.existingSupplier
          ? { existingSupplier: serializeBigInt(error.existingSupplier) }
          : {}),
      });
      return;
    }
    if (error instanceof Error) {
      res.status((error as any).statusCode || 400).json({
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
        message: 'Acceso denegado: Solo el Administrador puede eliminar órdenes de servicio.',
      });
      return;
    }

    const id = getParamId(req);
    const reason = (req.body?.reason || req.query?.reason || '').toString();

    if (!id) {
      res.status(400).json({ status: 'BAD_REQUEST', message: 'ID requerido' });
      return;
    }

    await DirectPaymentService.deleteDirectPayment(BigInt(id), req.user?.id, reason);

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Orden de servicio eliminada exitosamente',
    });
  } catch (error: any) {
    if (error?.statusCode === 409 || error?.status === 'CONFLICT') {
      res.status(409).json({
        status: 'CONFLICT',
        message: error.message,
        ...(error.existingSupplier
          ? { existingSupplier: serializeBigInt(error.existingSupplier) }
          : {}),
      });
      return;
    }
    if (error instanceof Error) {
      res.status((error as any).statusCode || 400).json({
        status: 'BAD_REQUEST',
        message: error.message,
      });
      return;
    }
    next(error);
  }
};
