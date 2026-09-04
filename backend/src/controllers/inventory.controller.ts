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
    const { productId, locationId, status } = req.query;

    const filter: {
      productId?: bigint;
      locationId?: number;
      status?: BatchStatus;
    } = {};
    if (productId) filter.productId = BigInt(String(productId));
    if (locationId) filter.locationId = Number(locationId);
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
    const { orderId, limit } = req.query;

    const filter: { orderId?: bigint; take?: number } = {};
    if (orderId) filter.orderId = BigInt(String(orderId));
    if (limit) filter.take = Number(limit);

    const movements = await InventoryService.listMovements(filter);

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(movements),
    });
  } catch (error) {
    next(error);
  }
};
