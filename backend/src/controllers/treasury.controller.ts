import type { Request, Response, NextFunction } from 'express';
import { PaymentOrderSourceType } from '@prisma/client';
import { TreasuryService } from '../services/treasury.service.js';
import { serializeBigInt } from '../utils/serializer.js';

function handleTreasuryError(err: unknown, res: Response, next: NextFunction) {
  if (err instanceof Error) {
    const msg = err.message;
    const isNotFound =
      msg.includes('no encontrada') || msg.includes('no encontrado');
    res.status(isNotFound ? 404 : 400).json({
      status: isNotFound ? 'NOT_FOUND' : 'BAD_REQUEST',
      message: msg,
    });
    return;
  }
  next(err);
}

export class TreasuryController {
  static async listEligibleSources(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const data = await TreasuryService.listEligibleSources();
      res.status(200).json({
        status: 'SUCCESS',
        data: serializeBigInt(data),
      });
    } catch (err) {
      next(err);
    }
  }

  static async listPaymentOrders(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { search, status, sourceType, supplierId } = req.query;
      const data = await TreasuryService.listPaymentOrders({
        search: typeof search === 'string' ? search : undefined,
        status: typeof status === 'string' ? status : undefined,
        sourceType: typeof sourceType === 'string' ? sourceType : undefined,
        supplierId: supplierId ? Number(supplierId) : undefined,
      });
      res.status(200).json({
        status: 'SUCCESS',
        data: serializeBigInt(data),
      });
    } catch (err) {
      next(err);
    }
  }

  static async getPaymentOrderById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = BigInt(String(req.params.id));
      const data = await TreasuryService.getPaymentOrderById(id);
      res.status(200).json({
        status: 'SUCCESS',
        data: serializeBigInt(data),
      });
    } catch (err) {
      handleTreasuryError(err, res, next);
    }
  }

  static async createPaymentOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ status: 'UNAUTHORIZED', message: 'No autenticado.' });
        return;
      }

      const rawType = String(req.body.sourceType || '').toUpperCase();
      if (
        rawType !== PaymentOrderSourceType.PURCHASE_ORDER &&
        rawType !== PaymentOrderSourceType.SERVICE_ORDER
      ) {
        res.status(400).json({
          status: 'BAD_REQUEST',
          message:
            'El campo sourceType es obligatorio (PURCHASE_ORDER o SERVICE_ORDER).',
        });
        return;
      }

      const data = await TreasuryService.createPaymentOrder({
        sourceType: rawType as PaymentOrderSourceType,
        purchaseOrderId: req.body.purchaseOrderId
          ? BigInt(req.body.purchaseOrderId)
          : undefined,
        serviceOrderId: req.body.serviceOrderId
          ? BigInt(req.body.serviceOrderId)
          : undefined,
        notes: req.body.notes ?? null,
        createdById: userId,
      });

      res.status(201).json({
        status: 'SUCCESS',
        message: `Orden de Pago ${data.paymentOrderNumber} creada y enviada a aprobación.`,
        data: serializeBigInt(data),
      });
    } catch (err) {
      handleTreasuryError(err, res, next);
    }
  }

  static async approvePaymentOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ status: 'UNAUTHORIZED', message: 'No autenticado.' });
        return;
      }
      const id = BigInt(String(req.params.id));
      const data = await TreasuryService.approvePaymentOrder(
        id,
        userId,
        req.body.notes
      );
      res.status(200).json({
        status: 'SUCCESS',
        message: `Orden de Pago ${data.paymentOrderNumber} aprobada.`,
        data: serializeBigInt(data),
      });
    } catch (err) {
      handleTreasuryError(err, res, next);
    }
  }

  static async rejectPaymentOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ status: 'UNAUTHORIZED', message: 'No autenticado.' });
        return;
      }
      const id = BigInt(String(req.params.id));
      const data = await TreasuryService.rejectPaymentOrder(
        id,
        userId,
        String(req.body.reason || '')
      );
      res.status(200).json({
        status: 'SUCCESS',
        message: `Orden de Pago ${data.paymentOrderNumber} rechazada.`,
        data: serializeBigInt(data),
      });
    } catch (err) {
      handleTreasuryError(err, res, next);
    }
  }

  static async resubmitPaymentOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = BigInt(String(req.params.id));
      const data = await TreasuryService.resubmitPaymentOrder(id);
      res.status(200).json({
        status: 'SUCCESS',
        message: `Orden de Pago ${data.paymentOrderNumber} reenviada a aprobación.`,
        data: serializeBigInt(data),
      });
    } catch (err) {
      handleTreasuryError(err, res, next);
    }
  }

  static async cancelPaymentOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ status: 'UNAUTHORIZED', message: 'No autenticado.' });
        return;
      }
      const id = BigInt(String(req.params.id));
      const data = await TreasuryService.cancelPaymentOrder(
        id,
        userId,
        req.body.reason
      );
      res.status(200).json({
        status: 'SUCCESS',
        message: `Orden de Pago ${data.paymentOrderNumber} anulada.`,
        data: serializeBigInt(data),
      });
    } catch (err) {
      handleTreasuryError(err, res, next);
    }
  }

  static async createTreasuryPayment(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ status: 'UNAUTHORIZED', message: 'No autenticado.' });
        return;
      }
      const paymentOrderId = BigInt(String(req.params.id));
      const data = await TreasuryService.createTreasuryPayment(
        paymentOrderId,
        userId,
        {
          paymentDate: String(req.body.paymentDate || ''),
          notes: req.body.notes ?? null,
          confirmImmediately: Boolean(req.body.confirmImmediately),
          lines: Array.isArray(req.body.lines) ? req.body.lines : [],
        }
      );

      res.status(201).json({
        status: 'SUCCESS',
        message: req.body.confirmImmediately
          ? 'Pago registrado y confirmado exitosamente.'
          : 'Borrador de pago registrado exitosamente.',
        data: serializeBigInt(data),
      });
    } catch (err) {
      handleTreasuryError(err, res, next);
    }
  }

  static async confirmTreasuryPayment(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ status: 'UNAUTHORIZED', message: 'No autenticado.' });
        return;
      }
      const paymentId = BigInt(String(req.params.paymentId));
      const data = await TreasuryService.confirmTreasuryPayment(paymentId, userId);
      res.status(200).json({
        status: 'SUCCESS',
        message: 'Pago confirmado y descontado del saldo pendiente.',
        data: serializeBigInt(data),
      });
    } catch (err) {
      handleTreasuryError(err, res, next);
    }
  }

  static async voidTreasuryPayment(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const paymentId = BigInt(String(req.params.paymentId));
      const data = await TreasuryService.voidTreasuryPayment(paymentId);
      res.status(200).json({
        status: 'SUCCESS',
        message: 'Borrador de pago anulado.',
        data: serializeBigInt(data),
      });
    } catch (err) {
      handleTreasuryError(err, res, next);
    }
  }

  static async listAccountMovements(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const bankAccountId = Number(req.params.id);
      if (Number.isNaN(bankAccountId)) {
        res.status(400).json({
          status: 'BAD_REQUEST',
          message: 'ID de cuenta inválido.',
        });
        return;
      }
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const data = await TreasuryService.listAccountMovements(bankAccountId, limit);
      res.status(200).json({
        status: 'SUCCESS',
        data: serializeBigInt(data),
      });
    } catch (err) {
      next(err);
    }
  }
}
