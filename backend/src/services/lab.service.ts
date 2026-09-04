import { prisma } from '../config/prisma.js';
import { LabUnitStatus, LabMovementType, FridgeStatus } from '@prisma/client';

export interface CreateFridgeDTO {
  locationId: number;
  code: string;
  name: string;
  targetTempCelsius?: number | null;
  status?: FridgeStatus;
  description?: string | null;
}

export interface ConsumeLabUnitDTO {
  unitId: bigint;
  amountUsed: number;
  reason?: string | null;
  executedById: number;
}

export interface TransferLabUnitFridgeDTO {
  unitId: bigint;
  toFridgeId: number;
  reason?: string | null;
  executedById: number;
}

export interface DiscardLabUnitDTO {
  unitId: bigint;
  reason: string;
  executedById: number;
}

export class LabService {
  // --- GESTIÓN DE NEVERAS ---

  static async listFridges(locationId?: number) {
    return prisma.fridge.findMany({
      where: {
        ...(locationId ? { locationId } : {}),
      },
      include: {
        location: true,
        _count: {
          select: { labReagentUnits: true },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  static async createFridge(data: CreateFridgeDTO) {
    return prisma.fridge.create({
      data: {
        locationId: data.locationId,
        code: data.code.trim().toUpperCase(),
        name: data.name.trim(),
        targetTempCelsius: data.targetTempCelsius ?? null,
        status: data.status ?? FridgeStatus.OPERATIVO,
        description: data.description ?? null,
      },
      include: {
        location: true,
      },
    });
  }

  // --- TRAZABILIDAD DE FRASCOS / UNIDADES ---

  static async listLabUnits(filter?: {
    status?: LabUnitStatus;
    fridgeId?: number;
    productId?: bigint;
    search?: string;
  }) {
    return prisma.labReagentUnit.findMany({
      where: {
        ...(filter?.status ? { status: filter.status } : {}),
        ...(filter?.fridgeId ? { fridgeId: filter.fridgeId } : {}),
        ...(filter?.productId ? { productId: filter.productId } : {}),
        ...(filter?.search
          ? {
              OR: [
                { unitCode: { contains: filter.search, mode: 'insensitive' } },
                {
                  product: {
                    name: { contains: filter.search, mode: 'insensitive' },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        product: {
          include: { baseUnit: true },
        },
        batch: true,
        fridge: true,
        openedBy: {
          select: { id: true, fullName: true, username: true },
        },
      },
      orderBy: [{ expirationDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  static async getLabUnitById(id: bigint) {
    const unit = await prisma.labReagentUnit.findUnique({
      where: { id },
      include: {
        product: {
          include: { baseUnit: true },
        },
        batch: true,
        fridge: true,
        openedBy: {
          select: { id: true, fullName: true, username: true },
        },
        movements: {
          include: {
            fromFridge: true,
            toFridge: true,
            executedBy: {
              select: { id: true, fullName: true, username: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!unit) {
      throw new Error('Frasco o unidad de laboratorio no encontrada');
    }

    return unit;
  }

  /**
   * Apertura de un frasco sellado
   */
  static async openLabUnit(unitId: bigint, openedById: number) {
    const unit = await prisma.labReagentUnit.findUnique({
      where: { id: unitId },
    });

    if (!unit) {
      throw new Error('Unidad no encontrada');
    }

    if (unit.status !== LabUnitStatus.SELLADO) {
      throw new Error(`No se puede abrir una unidad en estado ${unit.status}`);
    }

    return prisma.labReagentUnit.update({
      where: { id: unitId },
      data: {
        status: LabUnitStatus.EN_USO,
        openedAt: new Date(),
        openedById,
      },
      include: {
        product: true,
        openedBy: {
          select: { id: true, fullName: true, username: true },
        },
      },
    });
  }

  /**
   * Consumo volumétrico para ensayos o pruebas clínicas
   */
  static async consumeLabUnit(data: ConsumeLabUnitDTO) {
    if (data.amountUsed <= 0) {
      throw new Error('La cantidad consumida debe ser mayor a 0');
    }

    return prisma.$transaction(async (tx) => {
      const unit = await tx.labReagentUnit.findUnique({
        where: { id: data.unitId },
      });

      if (!unit) {
        throw new Error('Unidad no encontrada');
      }

      if (
        unit.status !== LabUnitStatus.EN_USO &&
        unit.status !== LabUnitStatus.SELLADO
      ) {
        throw new Error(
          `No se puede consumir un reactivo en estado ${unit.status}`
        );
      }

      const currentVol = Number(unit.currentVolume);
      if (data.amountUsed > currentVol) {
        throw new Error(
          `Volumen insuficiente. Disponible: ${currentVol}, solicitado: ${data.amountUsed}`
        );
      }

      const remainingVol = currentVol - data.amountUsed;
      const nextStatus =
        remainingVol === 0 ? LabUnitStatus.AGOTADO : LabUnitStatus.EN_USO;

      // Registrar movimiento de laboratorio
      await tx.labStockMovement.create({
        data: {
          labReagentUnitId: unit.id,
          movementType: LabMovementType.CONSUMO_PRUEBAS,
          amountUsed: data.amountUsed,
          fromFridgeId: unit.fridgeId,
          reason: data.reason ?? 'Consumo de rutina en laboratorio',
          executedById: data.executedById,
        },
      });

      // Actualizar la unidad
      return tx.labReagentUnit.update({
        where: { id: unit.id },
        data: {
          currentVolume: remainingVol,
          status: nextStatus,
          // Si estaba sellado, se marca como abierto al primer consumo
          openedAt: unit.openedAt ?? new Date(),
          openedById: unit.openedById ?? data.executedById,
        },
        include: {
          product: true,
          fridge: true,
        },
      });
    });
  }

  /**
   * Traslado de un frasco a otra nevera o cava
   */
  static async transferFridge(data: TransferLabUnitFridgeDTO) {
    return prisma.$transaction(async (tx) => {
      const unit = await tx.labReagentUnit.findUnique({
        where: { id: data.unitId },
      });

      if (!unit) {
        throw new Error('Unidad no encontrada');
      }

      if (
        unit.status === LabUnitStatus.AGOTADO ||
        unit.status === LabUnitStatus.DESCARTADO
      ) {
        throw new Error(
          `No se puede trasladar una unidad en estado ${unit.status}`
        );
      }

      if (unit.fridgeId === data.toFridgeId) {
        throw new Error('La unidad ya se encuentra en la nevera destino');
      }

      const targetFridge = await tx.fridge.findUnique({
        where: { id: data.toFridgeId },
      });
      if (!targetFridge) {
        throw new Error('Nevera destino no encontrada');
      }

      await tx.labStockMovement.create({
        data: {
          labReagentUnitId: unit.id,
          movementType: LabMovementType.TRASLADO_NEVERA,
          amountUsed: 0,
          fromFridgeId: unit.fridgeId,
          toFridgeId: data.toFridgeId,
          reason: data.reason ?? 'Reubicación de material refrigerado',
          executedById: data.executedById,
        },
      });

      return tx.labReagentUnit.update({
        where: { id: unit.id },
        data: {
          fridgeId: data.toFridgeId,
        },
        include: {
          fridge: true,
          product: true,
        },
      });
    });
  }

  /**
   * Descarte formal por vencimiento, contaminación o merma
   */
  static async discardLabUnit(data: DiscardLabUnitDTO) {
    return prisma.$transaction(async (tx) => {
      const unit = await tx.labReagentUnit.findUnique({
        where: { id: data.unitId },
      });

      if (!unit) {
        throw new Error('Unidad no encontrada');
      }

      if (
        unit.status === LabUnitStatus.DESCARTADO ||
        unit.status === LabUnitStatus.AGOTADO
      ) {
        throw new Error(`La unidad ya se encuentra en estado ${unit.status}`);
      }

      await tx.labStockMovement.create({
        data: {
          labReagentUnitId: unit.id,
          movementType: LabMovementType.DESCARTE,
          amountUsed: Number(unit.currentVolume),
          fromFridgeId: unit.fridgeId,
          reason: data.reason,
          executedById: data.executedById,
        },
      });

      return tx.labReagentUnit.update({
        where: { id: unit.id },
        data: {
          status: LabUnitStatus.DESCARTADO,
          currentVolume: 0,
        },
        include: {
          product: true,
        },
      });
    });
  }
}
