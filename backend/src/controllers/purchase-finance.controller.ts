import type { Request, Response, NextFunction } from 'express';
import { PurchaseFinanceService } from '../services/purchase-finance.service.js';
import { serializeBigInt } from '../utils/serializer.js';
import { PaymentMethod } from '@prisma/client';

export const registerInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawId = req.params.orderId;
    const orderId = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!orderId) {
      res
        .status(400)
        .json({ status: 'BAD_REQUEST', message: 'ID de orden requerido' });
      return;
    }

    const {
      invoiceNumber,
      controlNumber,
      invoiceDate,
      taxAmount,
      totalAmount,
      fileUrl,
    } = req.body;

    if (!invoiceNumber || !invoiceDate || totalAmount === undefined) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'invoiceNumber, invoiceDate y totalAmount son obligatorios',
      });
      return;
    }

    const invoice = await PurchaseFinanceService.registerInvoice({
      orderId: BigInt(orderId),
      invoiceNumber: String(invoiceNumber),
      controlNumber: controlNumber ? String(controlNumber) : null,
      invoiceDate: new Date(invoiceDate),
      taxAmount: taxAmount ? Number(taxAmount) : 0,
      totalAmount: Number(totalAmount),
      fileUrl: fileUrl ? String(fileUrl) : null,
    });

    res.status(201).json({
      status: 'SUCCESS',
      message: 'Factura registrada exitosamente',
      data: serializeBigInt(invoice),
    });
  } catch (error) {
    next(error);
  }
};

export const registerPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawId = req.params.orderId;
    const orderId = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!orderId) {
      res
        .status(400)
        .json({ status: 'BAD_REQUEST', message: 'ID de orden requerido' });
      return;
    }

    if (!req.user?.id) {
      res
        .status(401)
        .json({ status: 'UNAUTHORIZED', message: 'Usuario no autenticado' });
      return;
    }

    const {
      paymentMethod,
      currencyId,
      amount,
      exchangeRate,
      bankName,
      referenceNumber,
      paymentDate,
      receiptImageUrl,
    } = req.body;

    if (!paymentMethod || !currencyId || !amount) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'paymentMethod, currencyId y amount son obligatorios',
      });
      return;
    }

    if (!Object.values(PaymentMethod).includes(paymentMethod)) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: `Método de pago inválido. Valores aceptados: ${Object.values(PaymentMethod).join(', ')}`,
      });
      return;
    }

    const result = await PurchaseFinanceService.registerPayment({
      orderId: BigInt(orderId),
      paymentMethod: paymentMethod as PaymentMethod,
      currencyId: Number(currencyId),
      amount: Number(amount),
      exchangeRate: exchangeRate ? Number(exchangeRate) : null,
      bankName: bankName ? String(bankName) : null,
      referenceNumber: referenceNumber ? String(referenceNumber) : null,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      receiptImageUrl: receiptImageUrl ? String(receiptImageUrl) : null,
      registeredById: req.user.id,
    });

    res.status(201).json({
      status: 'SUCCESS',
      message: 'Pago registrado exitosamente',
      data: serializeBigInt(result),
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderFinancialSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawId = req.params.orderId;
    const orderId = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!orderId) {
      res
        .status(400)
        .json({ status: 'BAD_REQUEST', message: 'ID de orden requerido' });
      return;
    }

    const summary = await PurchaseFinanceService.getOrderFinancialSummary(
      BigInt(orderId)
    );

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(summary),
    });
  } catch (error) {
    next(error);
  }
};
