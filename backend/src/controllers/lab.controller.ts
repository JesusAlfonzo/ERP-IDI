import type { Request, Response, NextFunction } from 'express';
import { LabService } from '../services/lab.service.js';
import { serializeBigInt } from '../utils/serializer.js';
import { LabUnitStatus } from '@prisma/client';

export const getFridges = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { locationId } = req.query;
    const fridges = await LabService.listFridges(
      locationId ? Number(locationId) : undefined
    );

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(fridges),
    });
  } catch (error) {
    next(error);
  }
};

export const createFridge = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { locationId, code, name, targetTempCelsius, status, description } =
      req.body;

    if (!locationId || !code || !name) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'locationId, code y name son requeridos',
      });
      return;
    }

    const fridge = await LabService.createFridge({
      locationId: Number(locationId),
      code: String(code),
      name: String(name),
      targetTempCelsius: targetTempCelsius ? Number(targetTempCelsius) : null,
      status,
      description: description ? String(description) : null,
    });

    res.status(201).json({
      status: 'SUCCESS',
      message: 'Nevera registrada exitosamente',
      data: serializeBigInt(fridge),
    });
  } catch (error) {
    next(error);
  }
};

export const getLabUnits = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, fridgeId, productId, search } = req.query;

    const filter: {
      status?: LabUnitStatus;
      fridgeId?: number;
      productId?: bigint;
      search?: string;
    } = {};

    if (
      typeof status === 'string' &&
      Object.values(LabUnitStatus).includes(status as LabUnitStatus)
    ) {
      filter.status = status as LabUnitStatus;
    }
    if (fridgeId) filter.fridgeId = Number(fridgeId);
    if (productId) filter.productId = BigInt(String(productId));
    if (typeof search === 'string' && search.trim() !== '')
      filter.search = search.trim();

    const units = await LabService.listLabUnits(filter);

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(units),
    });
  } catch (error) {
    next(error);
  }
};

export const getLabUnitById = async (
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

    const unit = await LabService.getLabUnitById(BigInt(id));

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(unit),
    });
  } catch (error) {
    next(error);
  }
};

export const openLabUnit = async (
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

    if (!req.user?.id) {
      res
        .status(401)
        .json({ status: 'UNAUTHORIZED', message: 'Usuario no autenticado' });
      return;
    }

    const unit = await LabService.openLabUnit(BigInt(id), req.user.id);

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Frasco abierto y marcado en uso',
      data: serializeBigInt(unit),
    });
  } catch (error) {
    next(error);
  }
};

export const consumeLabUnit = async (
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

    if (!req.user?.id) {
      res
        .status(401)
        .json({ status: 'UNAUTHORIZED', message: 'Usuario no autenticado' });
      return;
    }

    const { amountUsed, reason } = req.body;

    if (amountUsed === undefined || Number(amountUsed) <= 0) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'amountUsed debe ser un número positivo',
      });
      return;
    }

    const unit = await LabService.consumeLabUnit({
      unitId: BigInt(id),
      amountUsed: Number(amountUsed),
      reason: reason ? String(reason) : null,
      executedById: req.user.id,
    });

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Consumo registrado exitosamente',
      data: serializeBigInt(unit),
    });
  } catch (error) {
    next(error);
  }
};

export const transferFridge = async (
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

    if (!req.user?.id) {
      res
        .status(401)
        .json({ status: 'UNAUTHORIZED', message: 'Usuario no autenticado' });
      return;
    }

    const { toFridgeId, reason } = req.body;

    if (!toFridgeId) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'toFridgeId es obligatorio',
      });
      return;
    }

    const unit = await LabService.transferFridge({
      unitId: BigInt(id),
      toFridgeId: Number(toFridgeId),
      reason: reason ? String(reason) : null,
      executedById: req.user.id,
    });

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Unidad transferida de nevera exitosamente',
      data: serializeBigInt(unit),
    });
  } catch (error) {
    next(error);
  }
};

export const discardLabUnit = async (
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

    if (!req.user?.id) {
      res
        .status(401)
        .json({ status: 'UNAUTHORIZED', message: 'Usuario no autenticado' });
      return;
    }

    const { reason } = req.body;

    if (!reason) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'Debe justificar el motivo del descarte',
      });
      return;
    }

    const unit = await LabService.discardLabUnit({
      unitId: BigInt(id),
      reason: String(reason),
      executedById: req.user.id,
    });

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Unidad descartada satisfactoriamente',
      data: serializeBigInt(unit),
    });
  } catch (error) {
    next(error);
  }
};
