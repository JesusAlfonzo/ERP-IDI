import type { Request, Response, NextFunction } from 'express';
import { PurchaseFinanceService } from '../services/purchase-finance.service.js';
import { serializeBigInt } from '../utils/serializer.js';
import { PaymentMethod } from '@prisma/client';

const isPurchasingOrAdmin = (roles: string[] = []): boolean => {
  return (
    roles.includes('ADMINISTRADOR') ||
    roles.includes('COMPRAS') ||
    roles.includes('ADMINISTRACION')
  );
};

export const registerInvoice = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res
        .status(401)
        .json({ status: 'UNAUTHORIZED', message: 'Usuario no autenticado' });
      return;
    }

    const userRoles = req.user.roles ?? [];
    if (!isPurchasingOrAdmin(userRoles)) {
      res.status(403).json({
        status: 'FORBIDDEN',
        message:
          'Acceso denegado: Solo el departamento de Compras o Administración puede cargar facturas.',
      });
      return;
    }

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
    if (!req.user?.id) {
      res
        .status(401)
        .json({ status: 'UNAUTHORIZED', message: 'Usuario no autenticado' });
      return;
    }

    const userRoles = req.user.roles ?? [];
    if (!isPurchasingOrAdmin(userRoles)) {
      res.status(403).json({
        status: 'FORBIDDEN',
        message:
          'Acceso denegado: Solo el departamento de Compras o Administración puede amortizar pagos de órdenes.',
      });
      return;
    }

    const rawId = req.params.orderId ?? req.params.id;
    const orderId = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!orderId) {
      res
        .status(400)
        .json({ status: 'BAD_REQUEST', message: 'ID de orden requerido' });
      return;
    }

    const {
      method,
      paymentMethod,
      sourceAccountId,
      destinationAccount,
      currencyId,
      transactionCurrency,
      amount,
      amountPaid,
      exchangeRate,
      bankName,
      referenceNumber,
      paymentDate,
      receiptImageUrl,
      reviewedBy,
      authorizedBy,
      approvedBy,
    } = req.body;

    const finalAmount =
      amountPaid !== undefined && amountPaid !== null
        ? Number(amountPaid)
        : Number(amount);

    if (!finalAmount || isNaN(finalAmount) || finalAmount <= 0) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'Debe especificar un monto a pagar (amount o amountPaid) mayor a 0',
      });
      return;
    }

    const finalMethod = (method || paymentMethod || 'TRANSFERENCIA').toString().toUpperCase();

    const result = await PurchaseFinanceService.registerPayment({
      orderId: BigInt(orderId),
      method: finalMethod,
      paymentMethod: paymentMethod as PaymentMethod | undefined,
      sourceAccountId: sourceAccountId ? Number(sourceAccountId) : null,
      destinationAccount: destinationAccount ? String(destinationAccount) : null,
      currencyId: currencyId ? Number(currencyId) : undefined,
      amount: finalAmount,
      amountPaid: finalAmount,
      transactionCurrency: transactionCurrency ? String(transactionCurrency) : undefined,
      exchangeRate: exchangeRate ? Number(exchangeRate) : null,
      bankName: bankName ? String(bankName) : null,
      referenceNumber: referenceNumber ? String(referenceNumber) : null,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      receiptImageUrl: receiptImageUrl ? String(receiptImageUrl) : null,
      reviewedBy: reviewedBy ? String(reviewedBy) : null,
      authorizedBy: authorizedBy ? String(authorizedBy) : null,
      approvedBy: approvedBy ? String(approvedBy) : null,
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
    const userRoles = req.user?.roles ?? [];
    if (!isPurchasingOrAdmin(userRoles)) {
      res.status(403).json({
        status: 'FORBIDDEN',
        message:
          'No posee privilegios para consultar el balance financiero de esta orden.',
      });
      return;
    }

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
