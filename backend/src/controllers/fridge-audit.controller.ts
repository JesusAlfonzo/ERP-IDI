import type { Request, Response, NextFunction } from 'express';
import { FridgeAuditService } from '../services/fridge-audit.service.js';
import { serializeBigInt } from '../utils/serializer.js';

export const createFridgeAudit = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const performedById = req.user?.id ? Number(req.user.id) : Number(req.body.performedById);

    if (!performedById) {
      res.status(400).json({
        status: 'ERROR',
        message: 'No se pudo identificar el usuario que realiza la auditoría',
      });
      return;
    }

    const { notes, items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        status: 'ERROR',
        message: 'Debe enviar una lista de ítems para auditar',
      });
      return;
    }

    const audit = await FridgeAuditService.createFridgeAudit({
      performedById,
      notes,
      items,
    });

    res.status(201).json({
      status: 'SUCCESS',
      message: 'Auditoría de recuento físico registrada exitosamente',
      data: serializeBigInt(audit),
    });
  } catch (error) {
    next(error);
  }
};

export const listFridgeAudits = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filter = {
      performedById: req.query.performedById ? Number(req.query.performedById) : undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      search: req.query.search as string | undefined,
    };

    const audits = await FridgeAuditService.listFridgeAudits(filter);

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(audits),
    });
  } catch (error) {
    next(error);
  }
};

export const getFridgeAuditById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({
        status: 'ERROR',
        message: 'El ID de la auditoría debe ser un número válido',
      });
      return;
    }

    const audit = await FridgeAuditService.getFridgeAuditById(id);

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(audit),
    });
  } catch (error) {
    next(error);
  }
};
