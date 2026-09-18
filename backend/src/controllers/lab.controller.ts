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

export const getFridgeContents = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const contents = await LabService.getFridgeContents(Number(req.params.id));
    res
      .status(200)
      .json({ status: 'SUCCESS', data: serializeBigInt(contents) });
  } catch (error) {
    next(error);
  }
};

export const assignUnitToFridge = async (
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
    const { unitId, fridgeId, reason } = req.body;
    if (!unitId || !fridgeId) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'unitId y fridgeId son obligatorios',
      });
      return;
    }
    // Orden corregido: unitId, fridgeId, executedById, reason
    const unit = await LabService.assignUnitToFridge(
      BigInt(unitId),
      Number(fridgeId),
      req.user.id,
      reason ? String(reason) : null
    );
    res.status(200).json({ status: 'SUCCESS', data: serializeBigInt(unit) });
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

export const createLabUnit = async (
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
    const {
      productId,
      batchId,
      fridgeId,
      unitCode,
      initialVolume,
      expirationDate,
    } = req.body;

    if (!productId || !batchId || !fridgeId || !unitCode || !initialVolume) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message:
          'productId, batchId, fridgeId, unitCode e initialVolume son obligatorios',
      });
      return;
    }

    const unit = await LabService.createLabUnit({
      productId: BigInt(productId),
      batchId: BigInt(batchId),
      fridgeId: Number(fridgeId),
      unitCode: String(unitCode),
      initialVolume: Number(initialVolume),
      expirationDate: expirationDate ? new Date(expirationDate) : null,
      openedById: req.user.id,
    });

    res.status(201).json({
      status: 'SUCCESS',
      message: 'Unidad de reactivo registrada en nevera',
      data: serializeBigInt(unit),
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

export const getAvailableReagents = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const search =
      typeof req.query.search === 'string'
        ? req.query.search.trim()
        : undefined;
    const reagents = await LabService.listAvailableReagents(search);
    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(
        reagents.map((batch) => ({
          ...batch,
          product: {
            ...batch.product,
            unitOfMeasure: batch.product.baseUnit.abbreviation,
          },
          fridge: batch.labReagentUnits[0]?.fridge ?? null,
        }))
      ),
    });
  } catch (error) {
    next(error);
  }
};

export const getRecentConsumptions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const limit = Number(req.query.limit) || 10;
    const movements = await LabService.listRecentConsumptions(limit);
    const records = movements.flatMap((movement) =>
      movement.items.map((item) => ({
        id: item.id,
        createdAt: movement.createdAt,
        quantity: Math.abs(Number(item.quantity)),
        diagnosticProtocol: movement.notes ?? 'Consumo de laboratorio',
        departmentSection: '',
        notes: movement.notes,
        analyst: movement.createdBy,
        batch: {
          lotNumber: item.batch.lotNumber,
          product: {
            sku: item.batch.product.sku,
            name: item.batch.product.name,
            unitOfMeasure: item.batch.product.baseUnit.abbreviation,
          },
        },
      }))
    );
    res.status(200).json({ status: 'SUCCESS', data: serializeBigInt(records) });
  } catch (error) {
    next(error);
  }
};

export const registerReagentConsumption = async (
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
    const { batchId, quantity, diagnosticProtocol, departmentSection, notes } =
      req.body;
    if (!batchId || !quantity || !diagnosticProtocol || !departmentSection) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message:
          'batchId, quantity, diagnosticProtocol y departmentSection son obligatorios',
      });
      return;
    }
    const consumption = await LabService.registerReagentConsumption({
      batchId: BigInt(batchId),
      quantity: Number(quantity),
      diagnosticProtocol: String(diagnosticProtocol),
      departmentSection: String(departmentSection),
      notes: notes ? String(notes) : null,
      executedById: req.user.id,
    });
    res.status(201).json({
      status: 'SUCCESS',
      message: 'Consumo registrado exitosamente',
      data: serializeBigInt(consumption),
    });
  } catch (error) {
    next(error);
  }
};

export const assignBatchToFridge = async (
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
    const { batchId } = req.body;
    if (!batchId) {
      res
        .status(400)
        .json({ status: 'BAD_REQUEST', message: 'batchId es obligatorio' });
      return;
    }
    const result = await LabService.assignBatchToFridge(
      BigInt(batchId),
      Number(req.params.id),
      req.user.id
    );
    res.status(200).json({ status: 'SUCCESS', data: serializeBigInt(result) });
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
