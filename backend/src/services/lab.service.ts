import { prisma } from '../config/prisma.js';
import {
  LabUnitStatus,
  LabMovementType,
  FridgeStatus,
  BatchStatus,
  StockMovementType,
} from '@prisma/client';

export interface CreateLabUnitDTO {
  productId: bigint;
  batchId: bigint;
  fridgeId: number;
  unitCode: string;
  initialVolume: number;
  expirationDate?: Date | null;
  openedById?: number | null;
}

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

export interface ReagentConsumptionDTO {
  batchId: bigint;
  quantity: number;
  diagnosticProtocol: string;
  departmentSection: string;
  notes?: string | null;
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
  static async listAvailableReagents(search?: string) {
    return prisma.stockBatch.findMany({
      where: {
        status: BatchStatus.DISPONIBLE,
        currentQuantity: { gt: 0 },
        ...(search
          ? {
              OR: [
                { lotNumber: { contains: search, mode: 'insensitive' } },
                {
                  product: {
                    name: { contains: search, mode: 'insensitive' },
                  },
                },
                {
                  product: {
                    sku: { contains: search, mode: 'insensitive' },
                  },
                },
              ],
            }
          : {}),
        product: {
          isReagent: true,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            isReagent: true,
            minStockAlert: true,
            baseUnit: { select: { abbreviation: true } },
          },
        },
        labReagentUnits: {
          where: { status: { not: LabUnitStatus.AGOTADO } },
          select: {
            fridge: {
              select: {
                id: true,
                name: true,
                code: true,
                targetTempCelsius: true,
              },
            },
          },
          take: 1,
        },
      },
      orderBy: [{ expirationDate: 'asc' }, { createdAt: 'desc' }],
      take: 100,
    });
  }

  static async listRecentConsumptions(limit = 10) {
    return prisma.stockMovement.findMany({
      where: { type: StockMovementType.DESPACHO_SOLICITUD },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
      include: {
        createdBy: { select: { fullName: true, username: true } },
        items: {
          include: {
            batch: {
              include: {
                product: { include: { baseUnit: true } },
              },
            },
          },
        },
      },
    });
  }

  static async registerReagentConsumption(data: ReagentConsumptionDTO) {
    if (data.quantity <= 0) {
      throw new Error('La cantidad consumida debe ser mayor a 0');
    }

    return prisma.$transaction(async (tx) => {
      const batch = await tx.stockBatch.findUnique({
        where: { id: data.batchId },
        include: { product: { include: { baseUnit: true } } },
      });

      if (!batch || !batch.product.isReagent) {
        throw new Error('El lote no existe o no corresponde a un reactivo');
      }
      if (batch.status !== BatchStatus.DISPONIBLE) {
        throw new Error('Solo se pueden consumir lotes disponibles');
      }
      if (data.quantity > Number(batch.currentQuantity)) {
        throw new Error(
          `Cantidad insuficiente. Disponible: ${batch.currentQuantity}`
        );
      }

      const movementCount = await tx.stockMovement.count();
      const movement = await tx.stockMovement.create({
        data: {
          referenceNumber: `MOV-LAB-${new Date().getFullYear()}-${String(
            movementCount + 1
          ).padStart(4, '0')}`,
          type: StockMovementType.DESPACHO_SOLICITUD,
          notes: `${data.diagnosticProtocol} | ${data.departmentSection}${
            data.notes ? ` | ${data.notes}` : ''
          }`,
          createdById: data.executedById,
        },
      });

      const remaining = Number(batch.currentQuantity) - data.quantity;
      const updatedBatch = await tx.stockBatch.update({
        where: { id: batch.id },
        data: {
          currentQuantity: remaining,
          status: remaining === 0 ? BatchStatus.AGOTADO : batch.status,
        },
      });

      await tx.stockMovementItem.create({
        data: {
          stockMovementId: movement.id,
          batchId: batch.id,
          quantity: -data.quantity,
          unitCost: batch.costPrice,
        },
      });

      return {
        id: movement.id,
        createdAt: movement.createdAt,
        quantity: data.quantity,
        diagnosticProtocol: data.diagnosticProtocol,
        departmentSection: data.departmentSection,
        notes: data.notes ?? null,
        analyst: { fullName: '', username: '' },
        batch: {
          lotNumber: batch.lotNumber,
          product: {
            sku: batch.product.sku,
            name: batch.product.name,
            unitOfMeasure: batch.product.baseUnit.abbreviation,
          },
        },
        currentQuantity: updatedBatch.currentQuantity,
      };
    });
  }

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

  static async getFridgeContents(fridgeId: number) {
    const fridge = await prisma.fridge.findUnique({
      where: { id: fridgeId },
      include: {
        location: true,
        labReagentUnits: {
          where: { status: { not: LabUnitStatus.AGOTADO } },
          include: {
            product: { include: { baseUnit: true } },
            batch: true,
          },
          orderBy: { expirationDate: 'asc' },
        },
      },
    });
    if (!fridge) throw new Error('Nevera no encontrada');
    return fridge;
  }

  static async assignUnitToFridge(
    unitId: bigint,
    fridgeId: number,
    executedById: number,
    reason?: string | null
  ) {
    return this.transferFridge({
      unitId,
      toFridgeId: fridgeId,
      reason: reason ?? 'Asignación inicial a nevera',
      executedById,
    });
  }

  static async assignBatchToFridge(
    batchId: bigint,
    fridgeId: number,
    executedById: number
  ) {
    return prisma.$transaction(async (tx) => {
      const fridge = await tx.fridge.findUnique({ where: { id: fridgeId } });
      if (!fridge) throw new Error('Nevera no encontrada');
      const units = await tx.labReagentUnit.findMany({
        where: { batchId, status: { not: LabUnitStatus.AGOTADO } },
      });
      for (const unit of units) {
        await tx.labStockMovement.create({
          data: {
            labReagentUnitId: unit.id,
            movementType: LabMovementType.TRASLADO_NEVERA,
            amountUsed: 0,
            fromFridgeId: unit.fridgeId,
            toFridgeId: fridgeId,
            reason: 'Asignación de lote a nevera',
            executedById,
          },
        });
      }
      await tx.labReagentUnit.updateMany({
        where: { batchId, status: { not: LabUnitStatus.AGOTADO } },
        data: { fridgeId },
      });
      return { batchId, fridgeId, assignedUnits: units.length };
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
  static async createLabUnit(data: CreateLabUnitDTO) {
    return prisma.labReagentUnit.create({
      data: {
        productId: data.productId,
        batchId: data.batchId,
        fridgeId: data.fridgeId,
        unitCode: data.unitCode.trim(),
        initialVolume: data.initialVolume,
        currentVolume: data.initialVolume,
        status: LabUnitStatus.SELLADO,
        expirationDate: data.expirationDate ?? null,
        openedById: data.openedById ?? null,
      },
      include: {
        product: true,
        fridge: true,
        batch: true,
      },
    });
  }
}
