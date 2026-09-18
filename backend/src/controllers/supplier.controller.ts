import type { Request, Response, NextFunction } from 'express';
import { SupplierService } from '../services/supplier.service.js';
import { PaymentMethod } from '@prisma/client';
import { serializeBigInt } from '../utils/serializer.js';

export const getSupplierDebts = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
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
    res
      .status(200)
      .json({
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
    const { amountUsd, paymentMethod, referenceNumber, paymentDate, notes } =
      req.body;
    if (
      !amountUsd ||
      Number(amountUsd) <= 0 ||
      !paymentMethod ||
      !Object.values(PaymentMethod).includes(paymentMethod)
    ) {
      res
        .status(400)
        .json({
          status: 'BAD_REQUEST',
          message: `amountUsd y paymentMethod son obligatorios. Métodos: ${Object.values(PaymentMethod).join(', ')}`,
        });
      return;
    }
    const payment = await SupplierService.registerPayment({
      supplierId: Number(req.params.id),
      amountUsd: Number(amountUsd),
      paymentMethod,
      referenceNumber: referenceNumber ? String(referenceNumber) : null,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      notes: notes ? String(notes) : null,
      registeredById: req.user.id,
    });
    res
      .status(201)
      .json({
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
    const { search } = req.query;
    const suppliers = await SupplierService.listSuppliers(
      typeof search === 'string' ? search.trim() : undefined
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

    res.status(200).json({
      status: 'SUCCESS',
      data: supplier,
    });
  } catch (error) {
    next(error);
  }
};

export const createSupplier = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { rifOrId, name, contactName, phone, email, address } = req.body;

    if (!rifOrId || !name) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'El RIF/ID y la Razón Social (nombre) son obligatorios',
      });
      return;
    }

    const supplier = await SupplierService.createSupplier({
      rifOrId: String(rifOrId),
      name: String(name),
      contactName: contactName ? String(contactName) : null,
      phone: phone ? String(phone) : null,
      email: email ? String(email) : null,
      address: address ? String(address) : null,
    });

    res.status(201).json({
      status: 'SUCCESS',
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
    const { id } = req.params;
    const { name, contactName, phone, email, address, isActive } = req.body;

    const supplier = await SupplierService.updateSupplier(Number(id), {
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
      data: supplier,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSupplier = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    await SupplierService.deleteSupplier(Number(id));

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Proveedor desactivado correctamente',
    });
  } catch (error) {
    next(error);
  }
};
