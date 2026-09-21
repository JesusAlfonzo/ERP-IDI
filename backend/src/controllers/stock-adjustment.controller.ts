import type { Request, Response, NextFunction } from 'express';
import {
  StockAdjustmentService,
  type AdjustmentAction,
  type MovementFilterOptions,
} from '../services/stock-adjustment.service.js';
import { serializeBigInt } from '../utils/serializer.js';
import { BatchStatus, IncidentType, StockMovementType } from '@prisma/client';
import { getPaginationParams } from '../utils/pagination.js';

export const createStockAdjustment = async (
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

    const { notes, items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'Debe proporcionar una lista de ítems a ajustar',
      });
      return;
    }

    const formattedItems = items.map((it: any) => {
      if (!['INCREMENTO', 'DECREMENTO'].includes(it.action)) {
        throw new Error(
          'La acción de cada ítem debe ser INCREMENTO o DECREMENTO'
        );
      }
      return {
        batchId: BigInt(it.batchId),
        action: it.action as AdjustmentAction,
        quantity: Number(it.quantity),
        reason: it.reason ? String(it.reason) : null,
      };
    });

    const result = await StockAdjustmentService.processAdjustment({
      userId: req.user.id,
      type: StockMovementType.AJUSTE_INVENTARIO,
      notes: notes ? String(notes) : 'Ajuste manual de inventario',
      items: formattedItems,
    });

    res.status(201).json({
      status: 'SUCCESS',
      message: 'Ajuste de inventario aplicado correctamente',
      data: serializeBigInt(result),
    });
  } catch (error) {
    next(error);
  }
};

export const registerDirectWaste = async (
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

    const { wastes } = req.body;

    if (!Array.isArray(wastes) || wastes.length === 0) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'Debe especificar los lotes a descartar',
      });
      return;
    }

    const formattedWastes = wastes.map((w: any) => {
      if (!w.reason) {
        throw new Error('Cada merma debe incluir su motivo (reason)');
      }
      return {
        batchId: BigInt(w.batchId),
        quantity: Number(w.quantity),
        reason: String(w.reason),
      };
    });

    const result = await StockAdjustmentService.registerDirectWaste(
      req.user.id,
      formattedWastes
    );

    res.status(201).json({
      status: 'SUCCESS',
      message: 'Descarte asentado en inventario exitosamente',
      data: serializeBigInt(result),
    });
  } catch (error) {
    next(error);
  }
};

export const updateBatchStatus = async (
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
        message: 'ID de lote no proporcionado',
      });
      return;
    }

    const { status, reason, incidentType } = req.body;

    if (
      !status ||
      !Object.values(BatchStatus).includes(status as BatchStatus)
    ) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: `Estado inválido. Debe ser uno de: ${Object.values(BatchStatus).join(', ')}`,
      });
      return;
    }

    if (
      incidentType &&
      !Object.values(IncidentType).includes(incidentType as IncidentType)
    ) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: `Tipo de incidente inválido. Opciones: ${Object.values(IncidentType).join(', ')}`,
      });
      return;
    }

    const updatedBatch = await StockAdjustmentService.updateBatchStatus(
      BigInt(id),
      status as BatchStatus,
      reason ? String(reason) : null,
      req.user?.id,
      incidentType as IncidentType | undefined
    );

    res.status(200).json({
      status: 'SUCCESS',
      message: `Lote actualizado a estado ${status} exitosamente`,
      data: serializeBigInt(updatedBatch),
    });
  } catch (error) {
    next(error);
  }
};

export const listStockMovements = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const pagination = getPaginationParams(req, 10, 100);

    const { batchId, productId, search, type, startDate, endDate } = req.query;

    const filters: MovementFilterOptions = {};

    if (batchId) {
      filters.batchId = BigInt(String(batchId));
    }
    if (productId) {
      filters.productId = BigInt(String(productId));
    }
    if (typeof search === 'string' && search.trim()) {
      filters.search = search.trim();
    }
    if (
      type &&
      Object.values(StockMovementType).includes(type as StockMovementType)
    ) {
      filters.type = type as StockMovementType;
    }
    if (startDate) {
      filters.startDate = new Date(String(startDate));
    }
    if (endDate) {
      filters.endDate = new Date(String(endDate));
    }

    const paginatedMovements =
      await StockAdjustmentService.getPaginatedMovements(pagination, filters);

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(paginatedMovements.items),
      meta: paginatedMovements.meta,
    });
  } catch (error) {
    next(error);
  }
};

export const getStockMovementById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!id) {
      res
        .status(400)
        .json({ status: 'BAD_REQUEST', message: 'ID no proporcionado' });
      return;
    }

    const movement = await StockAdjustmentService.getMovementById(BigInt(id));

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(movement),
    });
  } catch (error) {
    next(error);
  }
};
