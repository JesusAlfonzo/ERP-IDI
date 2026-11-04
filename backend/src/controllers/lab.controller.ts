import type { Request, Response, NextFunction } from 'express';
import { LabService } from '../services/lab.service.js';
import { serializeBigInt } from '../utils/serializer.js';
import {
  LabUnitStatus,
  StockOwnership,
  QuarantineInstanceType,
  QuarantineReason,
  QuarantineResolutionStatus,
  LabInternalRequestStatus,
  LabWeeklyRunStatus,
  RepeatReason,
  ConsumptionConcept,
} from '@prisma/client';

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

    const userRoles = req.user?.roles ?? [];
    const isAuthorized =
      userRoles.includes('ADMINISTRADOR') ||
      userRoles.includes('LABORATORIO');
    if (!isAuthorized) {
      res.status(403).json({
        status: 'FORBIDDEN',
        message:
          'Acceso denegado: Se requieren privilegios de Laboratorio Clínico o Administración.',
      });
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
    if (!req.user?.id) {
      res
        .status(401)
        .json({ status: 'UNAUTHORIZED', message: 'Usuario no autenticado' });
      return;
    }

    const userRoles = req.user?.roles ?? [];
    const isAuthorized =
      userRoles.includes('ADMINISTRADOR') ||
      userRoles.includes('LABORATORIO');
    if (!isAuthorized) {
      res.status(403).json({
        status: 'FORBIDDEN',
        message:
          'Acceso denegado: Se requieren privilegios de Laboratorio Clínico o Administración.',
      });
      return;
    }

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

    const userRoles = req.user?.roles ?? [];
    const isAuthorized =
      userRoles.includes('ADMINISTRADOR') ||
      userRoles.includes('LABORATORIO');
    if (!isAuthorized) {
      res.status(403).json({
        status: 'FORBIDDEN',
        message:
          'Acceso denegado: Se requieren privilegios de Laboratorio Clínico o Administración.',
      });
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
    const { status, fridgeId, productId, search, labAreaId, ownershipType } = req.query;

    const filter: {
      status?: LabUnitStatus;
      fridgeId?: number;
      productId?: bigint;
      labAreaId?: number;
      ownershipType?: StockOwnership;
      search?: string;
      userAreaIds?: number[] | null;
    } = {};

    if (
      typeof status === 'string' &&
      Object.values(LabUnitStatus).includes(status as LabUnitStatus)
    ) {
      filter.status = status as LabUnitStatus;
    }
    if (fridgeId) filter.fridgeId = Number(fridgeId);
    if (productId) filter.productId = BigInt(String(productId));
    if (labAreaId) filter.labAreaId = Number(labAreaId);
    if (
      typeof ownershipType === 'string' &&
      Object.values(StockOwnership).includes(ownershipType as StockOwnership)
    ) {
      filter.ownershipType = ownershipType as StockOwnership;
    }
    if (typeof search === 'string' && search.trim() !== '')
      filter.search = search.trim();

    if (req.user?.id) {
      filter.userAreaIds = await LabService.getUserAuthorizedAreaIds(
        req.user.id,
        req.user.roles ?? []
      );
    }

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

    const userAreaIds = req.user?.id
      ? await LabService.getUserAuthorizedAreaIds(
          req.user.id,
          req.user.roles ?? []
        )
      : null;

    const reagents = await LabService.listAvailableReagents(search, userAreaIds);
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
          lotNumber: item.batch?.lotNumber ?? 'N/A',
          product: {
            sku: item.batch?.product?.sku ?? 'N/A',
            name: item.batch?.product?.name ?? 'Registro Financiero',
            unitOfMeasure: item.batch?.product?.baseUnit?.abbreviation ?? 'UND',
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

    const userRoles = req.user?.roles ?? [];
    const isAuthorized =
      userRoles.includes('ADMINISTRADOR') ||
      userRoles.includes('LABORATORIO');
    if (!isAuthorized) {
      res.status(403).json({
        status: 'FORBIDDEN',
        message:
          'Acceso denegado: Se requieren privilegios de Laboratorio Clínico o Administración.',
      });
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

    const userRoles = req.user?.roles ?? [];
    const isAuthorized =
      userRoles.includes('ADMINISTRADOR') ||
      userRoles.includes('LABORATORIO');
    if (!isAuthorized) {
      res.status(403).json({
        status: 'FORBIDDEN',
        message:
          'Acceso denegado: Se requieren privilegios de Laboratorio Clínico o Administración.',
      });
      return;
    }

    const {
      batchId,
      quantityBoxes,
      ownershipType,
      researchProjectId,
      status,
      isDonation,
      notes,
    } = req.body;
    if (!batchId) {
      res
        .status(400)
        .json({ status: 'BAD_REQUEST', message: 'batchId es obligatorio' });
      return;
    }
    const result = await LabService.assignBatchToFridge({
      batchId: BigInt(batchId),
      fridgeId: Number(req.params.id),
      executedById: req.user.id,
      quantityBoxes: quantityBoxes ? Number(quantityBoxes) : undefined,
      ownershipType: ownershipType ?? undefined,
      researchProjectId: researchProjectId ? Number(researchProjectId) : undefined,
      status: status ?? undefined,
      isDonation: Boolean(isDonation),
      notes: notes ? String(notes) : undefined,
    });
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

    const userRoles = req.user?.roles ?? [];
    const isAuthorized =
      userRoles.includes('ADMINISTRADOR') ||
      userRoles.includes('LABORATORIO');
    if (!isAuthorized) {
      res.status(403).json({
        status: 'FORBIDDEN',
        message:
          'Acceso denegado: Se requieren privilegios de Laboratorio Clínico o Administración.',
      });
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

    const userRoles = req.user?.roles ?? [];
    const isAuthorized =
      userRoles.includes('ADMINISTRADOR') ||
      userRoles.includes('LABORATORIO');
    if (!isAuthorized) {
      res.status(403).json({
        status: 'FORBIDDEN',
        message:
          'Acceso denegado: Se requieren privilegios de Laboratorio Clínico o Administración.',
      });
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

    const userRoles = req.user?.roles ?? [];
    const isAuthorized =
      userRoles.includes('ADMINISTRADOR') ||
      userRoles.includes('LABORATORIO');
    if (!isAuthorized) {
      res.status(403).json({
        status: 'FORBIDDEN',
        message:
          'Acceso denegado: Se requieren privilegios de Laboratorio Clínico o Administración.',
      });
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

    const userRoles = req.user?.roles ?? [];
    const isAuthorized =
      userRoles.includes('ADMINISTRADOR') ||
      userRoles.includes('LABORATORIO');
    if (!isAuthorized) {
      res.status(403).json({
        status: 'FORBIDDEN',
        message:
          'Acceso denegado: Se requieren privilegios de Laboratorio Clínico o Administración.',
      });
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

// --- CUARENTENA DE DOBLE INSTANCIA (LABORATORIO) ---

export const putUnitInQuarantine = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      res.status(400).json({ status: 'BAD_REQUEST', message: 'ID no proporcionado' });
      return;
    }

    if (!req.user?.id) {
      res.status(401).json({ status: 'UNAUTHORIZED', message: 'Usuario no autenticado' });
      return;
    }

    const { quarantineReason, description, evidenceUrl, labAreaId } = req.body;
    if (!quarantineReason || !description) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'quarantineReason y description son obligatorios',
      });
      return;
    }

    const result = await LabService.putUnitInQuarantine({
      unitId: BigInt(id),
      quarantineReason: quarantineReason as QuarantineReason,
      description: String(description),
      evidenceUrl: evidenceUrl ? String(evidenceUrl) : null,
      labAreaId: labAreaId ? Number(labAreaId) : null,
      reportedById: req.user.id,
    });

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Unidad puesta en cuarentena interna exitosamente',
      data: serializeBigInt(result),
    });
  } catch (error) {
    next(error);
  }
};

export const resolveQuarantine = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id) {
      res.status(400).json({ status: 'BAD_REQUEST', message: 'ID de incidencia no proporcionado' });
      return;
    }

    if (!req.user?.id) {
      res.status(401).json({ status: 'UNAUTHORIZED', message: 'Usuario no autenticado' });
      return;
    }

    const userRoles = req.user?.roles ?? [];
    const isAuthorized =
      userRoles.includes('ADMINISTRADOR') ||
      userRoles.includes('LABORATORIO');
    if (!isAuthorized) {
      res.status(403).json({
        status: 'FORBIDDEN',
        message: 'Acceso denegado: Se requieren privilegios de Coordinación de Laboratorio o Administración.',
      });
      return;
    }

    const { resolutionStatus, resolutionNotes } = req.body;
    if (!resolutionStatus || !resolutionNotes) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'resolutionStatus y resolutionNotes son obligatorios',
      });
      return;
    }

    const result = await LabService.resolveQuarantine({
      incidentId: BigInt(id),
      resolutionStatus: resolutionStatus as QuarantineResolutionStatus,
      resolutionNotes: String(resolutionNotes),
      resolvedById: req.user.id,
    });

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Incidencia de cuarentena resuelta exitosamente',
      data: serializeBigInt(result),
    });
  } catch (error) {
    next(error);
  }
};

export const getQuarantineIncidents = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { instanceType, resolutionStatus, labAreaId } = req.query;

    const incidents = await LabService.listQuarantineIncidents({
      instanceType: instanceType ? (instanceType as QuarantineInstanceType) : undefined,
      resolutionStatus: resolutionStatus ? (resolutionStatus as QuarantineResolutionStatus) : undefined,
      labAreaId: labAreaId ? Number(labAreaId) : undefined,
    });

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(incidents),
    });
  } catch (error) {
    next(error);
  }
};

// --- ÁREAS DE LABORATORIO ---

export const getLabAreas = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { search } = req.query;
    const areas = await LabService.listLabAreas(typeof search === 'string' ? search : undefined);
    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(areas),
    });
  } catch (error) {
    next(error);
  }
};

export const getLabAreaById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const area = await LabService.getLabAreaById(Number(req.params.id));
    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(area),
    });
  } catch (error) {
    next(error);
  }
};

export const createLabArea = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { code, name, description } = req.body;
    if (!code || !name) {
      res.status(400).json({ status: 'BAD_REQUEST', message: 'code y name son obligatorios' });
      return;
    }

    const area = await LabService.createLabArea({
      code: String(code),
      name: String(name),
      description: description ? String(description) : null,
    });

    res.status(201).json({
      status: 'SUCCESS',
      message: 'Área de laboratorio registrada exitosamente',
      data: serializeBigInt(area),
    });
  } catch (error) {
    next(error);
  }
};

export const updateLabArea = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description, isActive } = req.body;
    const area = await LabService.updateLabArea(Number(req.params.id), {
      name: name ? String(name) : undefined,
      description: description !== undefined ? String(description) : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
    });

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Área de laboratorio actualizada exitosamente',
      data: serializeBigInt(area),
    });
  } catch (error) {
    next(error);
  }
};

export const assignUsersToLabArea = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userIds } = req.body;
    if (!Array.isArray(userIds)) {
      res.status(400).json({ status: 'BAD_REQUEST', message: 'userIds debe ser un array de números' });
      return;
    }

    const result = await LabService.assignUsersToLabArea(
      Number(req.params.id),
      userIds.map((id) => Number(id))
    );

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Bioanalistas asignados al área exitosamente',
      data: serializeBigInt(result),
    });
  } catch (error) {
    next(error);
  }
};

export const getUserLabAreas = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.params.id ? Number(req.params.id) : req.user?.id;
    if (!userId) {
      res.status(400).json({ status: 'BAD_REQUEST', message: 'userId no proporcionado' });
      return;
    }

    const areas = await LabService.getUserLabAreas(userId);
    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(areas),
    });
  } catch (error) {
    next(error);
  }
};

// --- CATÁLOGO DE EXÁMENES ---

export const getLabExams = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { areaId, search } = req.query;
    const userAreaIds = req.user?.id
      ? await LabService.getUserAuthorizedAreaIds(
          req.user.id,
          req.user.roles ?? []
        )
      : null;

    const exams = await LabService.listLabExams({
      areaId: areaId ? Number(areaId) : undefined,
      search: typeof search === 'string' ? search : undefined,
      userAreaIds,
    });

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(exams),
    });
  } catch (error) {
    next(error);
  }
};

export const getLabExamById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const exam = await LabService.getLabExamById(Number(req.params.id));
    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(exam),
    });
  } catch (error) {
    next(error);
  }
};

export const createLabExam = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { code, name, description, areaId, compatibleProductIds } = req.body;
    if (!code || !name) {
      res.status(400).json({ status: 'BAD_REQUEST', message: 'code y name son obligatorios' });
      return;
    }

    const exam = await LabService.createLabExam({
      code: String(code),
      name: String(name),
      description: description ? String(description) : null,
      areaId: areaId ? Number(areaId) : null,
      compatibleProductIds: Array.isArray(compatibleProductIds)
        ? compatibleProductIds.map((id: any) => BigInt(id))
        : undefined,
    });

    res.status(201).json({
      status: 'SUCCESS',
      message: 'Examen de laboratorio registrado exitosamente',
      data: serializeBigInt(exam),
    });
  } catch (error) {
    next(error);
  }
};

export const updateLabExam = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, description, areaId, isActive, compatibleProductIds } = req.body;

    const exam = await LabService.updateLabExam(Number(req.params.id), {
      name: name ? String(name) : undefined,
      description: description !== undefined ? String(description) : undefined,
      areaId: areaId !== undefined ? (areaId ? Number(areaId) : null) : undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      compatibleProductIds: Array.isArray(compatibleProductIds)
        ? compatibleProductIds.map((id: any) => BigInt(id))
        : undefined,
    });

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Examen de laboratorio actualizado exitosamente',
      data: serializeBigInt(exam),
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 14. SOLICITUDES INTERNAS DE REACTIVOS (FASE 2)
// ==========================================

export const getInternalRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { labAreaId, status, search } = req.query;
    const userAreaIds = req.user?.id
      ? await LabService.getUserAuthorizedAreaIds(
          req.user.id,
          req.user.roles ?? []
        )
      : null;

    const requests = await LabService.listInternalRequests({
      labAreaId: labAreaId ? Number(labAreaId) : undefined,
      status:
        typeof status === 'string' &&
        Object.values(LabInternalRequestStatus).includes(
          status as LabInternalRequestStatus
        )
          ? (status as LabInternalRequestStatus)
          : undefined,
      search: typeof search === 'string' ? search : undefined,
      userAreaIds,
    });

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(requests),
    });
  } catch (error) {
    next(error);
  }
};

export const getInternalRequestById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userAreaIds = req.user?.id
      ? await LabService.getUserAuthorizedAreaIds(
          req.user.id,
          req.user.roles ?? []
        )
      : null;

    const request = await LabService.getInternalRequestById(
      Number(req.params.id),
      userAreaIds
    );

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(request),
    });
  } catch (error) {
    next(error);
  }
};

export const createInternalRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ status: 'UNAUTHORIZED', message: 'Usuario no autenticado' });
      return;
    }

    const { labAreaId, justification, items } = req.body;
    if (!labAreaId || !justification || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'labAreaId, justification e items son obligatorios',
      });
      return;
    }

    const userAreaIds = await LabService.getUserAuthorizedAreaIds(
      req.user.id,
      req.user.roles ?? []
    );
    if (userAreaIds !== null && !userAreaIds.includes(Number(labAreaId))) {
      res.status(403).json({
        status: 'FORBIDDEN',
        message: 'No posee privilegios para solicitar reactivos para esta área',
      });
      return;
    }

    const request = await LabService.createInternalRequest({
      labAreaId: Number(labAreaId),
      requestedById: req.user.id,
      justification: String(justification),
      items: items.map((i: any) => ({
        productId: BigInt(i.productId),
        requestedUsesOrUnits: Number(i.requestedUsesOrUnits || 1),
      })),
    });

    res.status(201).json({
      status: 'SUCCESS',
      message: 'Solicitud interna de reactivos creada exitosamente',
      data: serializeBigInt(request),
    });
  } catch (error) {
    next(error);
  }
};

export const suggestFefoForRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const suggestions = await LabService.suggestFefoForRequest(
      Number(req.params.id)
    );

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(suggestions),
    });
  } catch (error) {
    next(error);
  }
};

export const approveInternalRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ status: 'UNAUTHORIZED', message: 'Usuario no autenticado' });
      return;
    }

    const { reviewNotes, itemAssignments } = req.body;

    const request = await LabService.approveInternalRequest(
      Number(req.params.id),
      {
        reviewedById: req.user.id,
        reviewNotes: reviewNotes ? String(reviewNotes) : null,
        itemAssignments: Array.isArray(itemAssignments)
          ? itemAssignments.map((a: any) => ({
              itemId: Number(a.itemId),
              assignedLabUnitId: BigInt(a.assignedLabUnitId),
            }))
          : undefined,
      }
    );

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Solicitud interna aprobada y lotes asignados exitosamente',
      data: serializeBigInt(request),
    });
  } catch (error) {
    next(error);
  }
};

export const deliverInternalRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ status: 'UNAUTHORIZED', message: 'Usuario no autenticado' });
      return;
    }

    const request = await LabService.deliverInternalRequest(
      Number(req.params.id),
      req.user.id
    );

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Solicitud entregada y reactivos habilitados para uso en área',
      data: serializeBigInt(request),
    });
  } catch (error) {
    next(error);
  }
};

export const rejectInternalRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ status: 'UNAUTHORIZED', message: 'Usuario no autenticado' });
      return;
    }

    const { reviewNotes } = req.body;
    if (!reviewNotes) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'reviewNotes es obligatorio para rechazar la solicitud',
      });
      return;
    }

    const request = await LabService.rejectInternalRequest(
      Number(req.params.id),
      {
        reviewedById: req.user.id,
        reviewNotes: String(reviewNotes),
      }
    );

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Solicitud interna rechazada exitosamente',
      data: serializeBigInt(request),
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 15. MOTOR DE CORRIDAS SEMANALES (FASE 2)
// ==========================================

export const getWeeklyRuns = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { labAreaId, labExamId, status, search } = req.query;
    const userAreaIds = req.user?.id
      ? await LabService.getUserAuthorizedAreaIds(
          req.user.id,
          req.user.roles ?? []
        )
      : null;

    const runs = await LabService.listWeeklyRuns({
      labAreaId: labAreaId ? Number(labAreaId) : undefined,
      labExamId: labExamId ? Number(labExamId) : undefined,
      status:
        typeof status === 'string' &&
        Object.values(LabWeeklyRunStatus).includes(status as LabWeeklyRunStatus)
          ? (status as LabWeeklyRunStatus)
          : undefined,
      search: typeof search === 'string' ? search : undefined,
      userAreaIds,
    });

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(runs),
    });
  } catch (error) {
    next(error);
  }
};

export const getWeeklyRunById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userAreaIds = req.user?.id
      ? await LabService.getUserAuthorizedAreaIds(
          req.user.id,
          req.user.roles ?? []
        )
      : null;

    const run = await LabService.getWeeklyRunById(
      Number(req.params.id),
      userAreaIds
    );

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(run),
    });
  } catch (error) {
    next(error);
  }
};

export const createWeeklyRun = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ status: 'UNAUTHORIZED', message: 'Usuario no autenticado' });
      return;
    }

    const { labAreaId, labExamId, weekStartDate, weekEndDate, notes } = req.body;
    if (!labAreaId || !labExamId || !weekStartDate || !weekEndDate) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'labAreaId, labExamId, weekStartDate y weekEndDate son obligatorios',
      });
      return;
    }

    const userAreaIds = await LabService.getUserAuthorizedAreaIds(
      req.user.id,
      req.user.roles ?? []
    );
    if (userAreaIds !== null && !userAreaIds.includes(Number(labAreaId))) {
      res.status(403).json({
        status: 'FORBIDDEN',
        message: 'No posee privilegios para registrar corridas en esta área de laboratorio',
      });
      return;
    }

    const run = await LabService.createWeeklyRun({
      labAreaId: Number(labAreaId),
      labExamId: Number(labExamId),
      bioanalystId: req.user.id,
      weekStartDate: new Date(weekStartDate),
      weekEndDate: new Date(weekEndDate),
      notes: notes ? String(notes) : null,
    });

    res.status(201).json({
      status: 'SUCCESS',
      message: 'Corrida semanal de laboratorio abierta exitosamente',
      data: serializeBigInt(run),
    });
  } catch (error) {
    next(error);
  }
};

export const closeWeeklyRun = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ status: 'UNAUTHORIZED', message: 'Usuario no autenticado' });
      return;
    }

    const { totalValidPatientExams, notes, consumptions } = req.body;
    if (!Array.isArray(consumptions) || consumptions.length === 0) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'consumptions debe ser una lista no vacía de consumos de reactivos',
      });
      return;
    }

    const closedRun = await LabService.closeWeeklyRun({
      runId: Number(req.params.id),
      bioanalystId: req.user.id,
      totalValidPatientExams: Number(totalValidPatientExams || 0),
      notes: notes ? String(notes) : null,
      consumptions: consumptions.map((c: any) => ({
        labReagentUnitId: BigInt(c.labReagentUnitId),
        externalCalibratorUnitId: c.externalCalibratorUnitId
          ? BigInt(c.externalCalibratorUnitId)
          : null,
        patientUses: Number(c.patientUses || 0),
        repeatUses: Number(c.repeatUses || 0),
        repeatReason: c.repeatReason ? (c.repeatReason as RepeatReason) : null,
        repeatNotes: c.repeatNotes ? String(c.repeatNotes) : null,
        calibratorUses: Number(c.calibratorUses || 0),
        calibratorNotes: c.calibratorNotes ? String(c.calibratorNotes) : null,
        controlUses: Number(c.controlUses || 0),
        wasteUses: Number(c.wasteUses || 0),
        isPrimaryKitDepleted: Boolean(c.isPrimaryKitDepleted),
        primaryKitPhysicalRemainingUses:
          c.primaryKitPhysicalRemainingUses !== undefined &&
          c.primaryKitPhysicalRemainingUses !== null
            ? Number(c.primaryKitPhysicalRemainingUses)
            : null,
        isExternalCalibratorDepleted: Boolean(c.isExternalCalibratorDepleted),
        externalCalibratorPhysicalRemainingUses:
          c.externalCalibratorPhysicalRemainingUses !== undefined &&
          c.externalCalibratorPhysicalRemainingUses !== null
            ? Number(c.externalCalibratorPhysicalRemainingUses)
            : null,
      })),
    });

    res.status(200).json({
      status: 'SUCCESS',
      message: 'Corrida semanal cerrada, stock conciliado y auditoría 5D registrada exitosamente',
      data: serializeBigInt(closedRun),
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// 16. AUDITORÍA INMUTABLE DE 5 DIMENSIONES (FASE 2)
// ==========================================

export const getConsumptionAuditLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      labAreaId,
      labExamId,
      weeklyRunId,
      concept,
      labReagentUnitId,
      startDate,
      endDate,
    } = req.query;

    const userAreaIds = req.user?.id
      ? await LabService.getUserAuthorizedAreaIds(
          req.user.id,
          req.user.roles ?? []
        )
      : null;

    const logs = await LabService.listConsumptionAuditLogs({
      labAreaId: labAreaId ? Number(labAreaId) : undefined,
      labExamId: labExamId ? Number(labExamId) : undefined,
      weeklyRunId: weeklyRunId ? Number(weeklyRunId) : undefined,
      concept:
        typeof concept === 'string' &&
        Object.values(ConsumptionConcept).includes(concept as ConsumptionConcept)
          ? (concept as ConsumptionConcept)
          : undefined,
      labReagentUnitId: labReagentUnitId
        ? BigInt(String(labReagentUnitId))
        : undefined,
      startDate: typeof startDate === 'string' ? startDate : undefined,
      endDate: typeof endDate === 'string' ? endDate : undefined,
      userAreaIds,
    });

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(logs),
    });
  } catch (error) {
    next(error);
  }
};
