import type { Request, Response, NextFunction } from 'express';
import { SupplierService } from '../services/supplier.service.js';
import { PaymentMethod } from '@prisma/client';
import { serializeBigInt } from '../utils/serializer.js';

const isPurchasingOrAdmin = (roles: string[] = []): boolean => {
  return roles.includes('ADMINISTRADOR') || roles.includes('COMPRAS');
};

export const getSupplierDebts = async (
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
          'No posee privilegios para consultar las deudas comerciales de la institución.',
      });
      return;
    }

    res
      .status(200)
      .json({ status: 'SUCCESS', data: await SupplierService.listDebts() });
  } catch (error) {
    next(error);
  }
};

export const getSupplierStatement = async (
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
          'No posee privilegios para consultar el estado de cuenta financiero del proveedor.',
      });
      return;
    }

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(
        await SupplierService.getStatement(Number(req.params.id))
      ),
    });
  } catch (error) {
    next(error);
  }
};

export const registerSupplierPayment = async (
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
          'Acceso denegado: Solo el departamento de Compras o Administración puede registrar pagos.',
      });
      return;
    }

    const {
      amount,
      amountPaid,
      amountUsd,
      method,
      paymentMethod,
      sourceAccountId,
      currencyId,
      transactionCurrency,
      exchangeRate,
      bankName,
      referenceNumber,
      paymentDate,
      notes,
      receiptImageUrl,
      reviewedBy,
      authorizedBy,
      approvedBy,
    } = req.body;

    const rawAmount =
      amountPaid !== undefined && amountPaid !== null
        ? Number(amountPaid)
        : amount !== undefined && amount !== null
          ? Number(amount)
          : Number(amountUsd || 0);

    if (!rawAmount || isNaN(rawAmount) || rawAmount <= 0) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'Debe especificar un monto a pagar (amountPaid o amountUsd) mayor a 0',
      });
      return;
    }

    const finalMethod = (method || paymentMethod || 'TRANSFERENCIA').toString().toUpperCase();

    const resolvedSupplierId = Number(
      req.params.id && req.params.id !== 'payments'
        ? req.params.id
        : req.body.supplierId
    );

    if (!resolvedSupplierId || isNaN(resolvedSupplierId)) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'ID de proveedor requerido para registrar el pago',
      });
      return;
    }

    const payment = await SupplierService.registerPayment({
      supplierId: resolvedSupplierId,
      amount: rawAmount,
      amountPaid: rawAmount,
      amountUsd: rawAmount,
      method: finalMethod,
      paymentMethod: paymentMethod as PaymentMethod | undefined,
      sourceAccountId: sourceAccountId ? Number(sourceAccountId) : null,
      transactionCurrency: transactionCurrency ? String(transactionCurrency) : 'USD',
      exchangeRate: exchangeRate ? Number(exchangeRate) : null,
      bankName: bankName ? String(bankName) : null,
      referenceNumber: referenceNumber ? String(referenceNumber) : null,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      notes: notes ? String(notes) : null,
      receiptImageUrl: receiptImageUrl ? String(receiptImageUrl) : null,
      reviewedBy: reviewedBy ? String(reviewedBy) : null,
      authorizedBy: authorizedBy ? String(authorizedBy) : null,
      approvedBy: approvedBy ? String(approvedBy) : null,
      registeredById: req.user.id,
    });

    res.status(201).json({
      status: 'SUCCESS',
      message: 'Pago registrado correctamente',
      data: serializeBigInt(payment),
    });
  } catch (error) {
    next(error);
  }
};

export const getSuppliers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { search, includeInactive } = req.query;
    const suppliers = await SupplierService.listSuppliers(
      typeof search === 'string' ? search.trim() : undefined,
      includeInactive === 'true' || includeInactive === '1'
    );

    res.status(200).json({
      status: 'SUCCESS',
      data: suppliers,
    });
  } catch (error) {
    next(error);
  }
};

export const getSupplierById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const supplier = await SupplierService.getSupplierById(Number(id));

    if (!supplier) {
      res.status(404).json({
        status: 'NOT_FOUND',
        message: 'Proveedor no encontrado',
      });
      return;
    }

    res.status(200).json({
      status: 'SUCCESS',
      data: supplier,
    });
  } catch (error: any) {
    if (error.statusCode === 404 || error.status === 'NOT_FOUND') {
      res.status(404).json({
        status: 'NOT_FOUND',
        message: error.message || 'Proveedor no encontrado',
      });
      return;
    }
    next(error);
  }
};

export const createSupplier = async (
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
          'No posee privilegios para registrar proveedores en el sistema.',
      });
      return;
    }

    const { rifOrId, rif, name, contactName, phone, email, address } = req.body;
    const finalRif = rifOrId ?? rif;

    if (!finalRif || !name) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'El RIF/ID y la Razón Social (nombre) son obligatorios',
      });
      return;
    }

    const supplier = await SupplierService.createSupplier({
      rifOrId: String(finalRif),
      name: String(name),
      contactName: contactName ? String(contactName) : null,
      phone: phone ? String(phone) : null,
      email: email ? String(email) : null,
      address: address ? String(address) : null,
    });

    res.status(201).json({
      status: 'SUCCESS',
      message: 'Proveedor registrado exitosamente',
      data: supplier,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSupplier = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userRoles = req.user?.roles ?? [];
    if (!isPurchasingOrAdmin(userRoles)) {
      res.status(403).json({
        status: 'FORBIDDEN',
        message: 'No posee privilegios para modificar datos de proveedores.',
      });
      return;
    }

    const { id } = req.params;
    const { rifOrId, rif, name, contactName, phone, email, address, isActive } =
      req.body;
    const finalRif = rifOrId ?? rif;

    const supplier = await SupplierService.updateSupplier(Number(id), {
      ...(finalRif !== undefined ? { rifOrId: String(finalRif) } : {}),
      ...(name !== undefined ? { name: String(name) } : {}),
      ...(contactName !== undefined
        ? { contactName: contactName ? String(contactName) : null }
        : {}),
      ...(phone !== undefined ? { phone: phone ? String(phone) : null } : {}),
      ...(email !== undefined ? { email: email ? String(email) : null } : {}),
      ...(address !== undefined
        ? { address: address ? String(address) : null }
        : {}),
      ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
    });

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Proveedor actualizado correctamente',
      data: supplier,
    });
  } catch (error: any) {
    if (error.statusCode === 409 || error.status === 'CONFLICT') {
      res.status(409).json({
        status: 'CONFLICT',
        message: error.message,
      });
      return;
    }
    if (error.statusCode === 404 || error.status === 'NOT_FOUND') {
      res.status(404).json({
        status: 'NOT_FOUND',
        message: error.message,
      });
      return;
    }
    next(error);
  }
};

export const deleteSupplier = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userRoles = req.user?.roles ?? [];
    if (!userRoles.includes('ADMINISTRADOR')) {
      res.status(403).json({
        status: 'FORBIDDEN',
        message:
          'Solo permitido para el rol ADMINISTRADOR.',
      });
      return;
    }

    const { id } = req.params;
    await SupplierService.deleteSupplier(Number(id));

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Proveedor eliminado correctamente',
    });
  } catch (error: any) {
    if (error.statusCode === 409 || error.status === 'CONFLICT') {
      res.status(409).json({
        status: 'CONFLICT',
        message: error.message,
      });
      return;
    }
    if (error.statusCode === 404 || error.status === 'NOT_FOUND') {
      res.status(404).json({
        status: 'NOT_FOUND',
        message: error.message,
      });
      return;
    }
    next(error);
  }
};
