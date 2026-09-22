import type { Request, Response, NextFunction } from 'express';
import {
  InventoryService,
  type InventoryFilterDTO,
} from '../services/inventory.service.js';
import { serializeBigInt } from '../utils/serializer.js';
import { BatchStatus } from '@prisma/client';

export const getInventorySummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { categoryId, locationId, search, lowStockOnly } = req.query;

    const filter: InventoryFilterDTO = {};
    if (categoryId) filter.categoryId = Number(categoryId);
    if (locationId) filter.locationId = Number(locationId);
    if (typeof search === 'string' && search.trim() !== '')
      filter.search = search.trim();
    if (lowStockOnly !== undefined)
      filter.lowStockOnly = lowStockOnly === 'true';

    const summary = await InventoryService.getInventorySummary(filter);

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(summary),
    });
  } catch (error) {
    next(error);
  }
};

export const getBatches = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { productId, locationId, status, search, page, limit } = req.query;

    const filter: {
      productId?: bigint;
      locationId?: number;
      status?: BatchStatus;
      search?: string;
      page?: number;
      limit?: number;
    } = {};
    if (productId) filter.productId = BigInt(String(productId));
    if (locationId) filter.locationId = Number(locationId);
    if (typeof search === 'string' && search.trim() !== '') {
      filter.search = search.trim();
    }
    const parsedPage = Number(page);
    const parsedLimit = Number(limit);
    if (Number.isInteger(parsedPage) && parsedPage > 0) {
      filter.page = parsedPage;
    }
    if (Number.isInteger(parsedLimit) && parsedLimit > 0) {
      filter.limit = parsedLimit;
    }
    if (
      typeof status === 'string' &&
      Object.values(BatchStatus).includes(status as BatchStatus)
    ) {
      filter.status = status as BatchStatus;
    }

    const batches = await InventoryService.listBatches(filter);

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(batches),
    });
  } catch (error) {
    next(error);
  }
};

export const getAlerts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { days } = req.query;
    const daysThreshold = days ? Number(days) : 90;

    const alerts = await InventoryService.getInventoryAlerts(daysThreshold);

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(alerts),
    });
  } catch (error) {
    next(error);
  }
};

export const getMovements = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page, limit, type, startDate, endDate, search, orderId } =
      req.query;

    const result = await InventoryService.listMovements({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 15,
      type:
        typeof type === 'string' && type.trim() !== ''
          ? type.trim()
          : undefined,
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
      search: typeof search === 'string' ? search.trim() : undefined,
      orderId: orderId ? BigInt(String(orderId)) : undefined,
    });

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(result.data),
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

export const getMovementById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawId = req.params.id;
    const idStr = Array.isArray(rawId) ? rawId[0] : rawId;

    if (!idStr) {
      res
        .status(400)
        .json({ status: 'BAD_REQUEST', message: 'ID no proporcionado' });
      return;
    }

    const movement = await InventoryService.getMovementById(BigInt(idStr));
    if (!movement) {
      res
        .status(404)
        .json({ status: 'NOT_FOUND', message: 'Movimiento no encontrado' });
      return;
    }

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(movement),
    });
  } catch (error) {
    next(error);
  }
};
