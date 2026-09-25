import type { Request, Response, NextFunction } from 'express';
import { PurchaseRequisitionService } from '../services/purchase-requisition.service.js';
import { PurchaseRequisitionStatus } from '@prisma/client';
import { serializeBigInt } from '../utils/serializer.js';

const isPurchasingOrAdmin = (roles: string[] = []): boolean => {
  return roles.includes('ADMINISTRADOR') || roles.includes('COMPRAS');
};

export const getRequisitions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, search } = req.query;

    const requisitions = await PurchaseRequisitionService.listRequisitions({
      status:
        typeof status === 'string' &&
        Object.values(PurchaseRequisitionStatus).includes(
          status as PurchaseRequisitionStatus
        )
          ? (status as PurchaseRequisitionStatus)
          : undefined,
      search:
        typeof search === 'string' && search.trim() !== ''
          ? search.trim()
          : undefined,
    });

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(requisitions),
    });
  } catch (error) {
    next(error);
  }
};

export const getRequisitionById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'ID de preorden no proporcionado',
      });
      return;
    }

    const requisition = await PurchaseRequisitionService.getRequisitionById(
      BigInt(id)
    );

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(requisition),
    });
  } catch (error) {
    next(error);
  }
};

export const createRequisition = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        status: 'UNAUTHORIZED',
        message: 'Usuario no autenticado',
      });
      return;
    }

    const userRoles = req.user.roles ?? [];
    if (!isPurchasingOrAdmin(userRoles)) {
      res.status(403).json({
        status: 'FORBIDDEN',
        message:
          'Solo personal de Compras o Administrador puede generar preórdenes de compra.',
      });
      return;
    }

    const { departmentSection, justification, notes, items } = req.body;

    if (!departmentSection || !justification) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'El departamento y la justificación son campos obligatorios.',
      });
      return;
    }

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'Debe incluir al menos un ítem o insumo a cotizar.',
      });
      return;
    }

    const formattedItems = items.map((it: any) => ({
      productId: BigInt(it.productId),
      unitId: Number(it.unitId),
      quantityRequested: Number(it.quantityRequested),
      estimatedPrice:
        it.estimatedPrice !== undefined && it.estimatedPrice !== null
          ? Number(it.estimatedPrice)
          : null,
    }));

    const requisition = await PurchaseRequisitionService.createRequisition({
      departmentSection: String(departmentSection),
      justification: String(justification),
      notes: notes ? String(notes) : null,
      createdById: req.user.id,
      items: formattedItems,
    });

    res.status(201).json({
      status: 'SUCCESS',
      message: 'Preorden de compra creada exitosamente',
      data: serializeBigInt(requisition),
    });
  } catch (error) {
    next(error);
  }
};

export const updateRequisitionStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userRoles = req.user?.roles ?? [];
    if (!isPurchasingOrAdmin(userRoles)) {
      res.status(403).json({
        status: 'FORBIDDEN',
        message: 'Acceso denegado.',
      });
      return;
    }

    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    const { status } = req.body;

    if (!id || !status) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'ID y estado son obligatorios.',
      });
      return;
    }

    if (
      !Object.values(PurchaseRequisitionStatus).includes(
        status as PurchaseRequisitionStatus
      )
    ) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'Estado de preorden no válido.',
      });
      return;
    }

    const updated = await PurchaseRequisitionService.updateStatus(
      BigInt(id),
      status as PurchaseRequisitionStatus
    );

    res.status(200).json({
      status: 'SUCCESS',
      message: `Preorden actualizada a ${status}`,
      data: serializeBigInt(updated),
    });
  } catch (error) {
    next(error);
  }
};

export const convertRequisitionToOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({
        status: 'UNAUTHORIZED',
        message: 'Usuario no autenticado',
      });
      return;
    }

    const userRoles = req.user.roles ?? [];
    if (!isPurchasingOrAdmin(userRoles)) {
      res.status(403).json({
        status: 'FORBIDDEN',
        message:
          'Solo Compras o Administración puede convertir preórdenes en órdenes de compra.',
      });
      return;
    }

    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'ID de preorden no proporcionado',
      });
      return;
    }

    const { supplierId, currencyId, exchangeRate, notes, items } = req.body;

    if (!supplierId || !currencyId || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message:
          'Proveedor, moneda e ítems con precios son requeridos para adjudicar la compra.',
      });
      return;
    }

    const formattedItems = items.map((it: any) => ({
      itemId: it.itemId ? BigInt(it.itemId) : undefined,
      productId: BigInt(it.productId),
      unitId: Number(it.unitId),
      quantityOrdered: Number(it.quantityOrdered),
      unitPrice: Number(it.unitPrice),
      isExempt: Boolean(it.isExempt),
    }));

    const order = await PurchaseRequisitionService.convertToOrder(BigInt(id), {
      supplierId: Number(supplierId),
      currencyId: Number(currencyId),
      exchangeRate: exchangeRate ? Number(exchangeRate) : undefined,
      notes: notes ? String(notes) : null,
      createdById: req.user.id,
      items: formattedItems,
    });

    res.status(201).json({
      status: 'SUCCESS',
      message: 'Preorden adjudicada y orden de compra generada exitosamente',
      data: serializeBigInt(order),
    });
  } catch (error) {
    next(error);
  }
};
