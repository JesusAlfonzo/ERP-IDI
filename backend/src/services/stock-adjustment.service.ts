import { prisma } from '../config/prisma.js';
import {
  StockMovementType,
  BatchStatus,
  IncidentType,
  IncidentStatus,
} from '@prisma/client';
import {
  type PaginationParams,
  createPaginatedResponse,
} from '../utils/pagination.js';

export type AdjustmentAction = 'INCREMENTO' | 'DECREMENTO';

export interface MovementFilterOptions {
  batchId?: bigint | undefined;
  type?: StockMovementType | undefined;
  startDate?: Date | undefined;
  endDate?: Date | undefined;
}

export interface StockAdjustmentItemDTO {
  batchId: bigint;
  action: AdjustmentAction;
  quantity: number;
  reason?: string | null;
}

export interface DirectWasteDTO {
  batchId: bigint;
  quantity: number;
  reason: string;
}

export interface ProcessAdjustmentDTO {
  userId: number;
  type: StockMovementType; // AJUSTE_INVENTARIO o DESCARTE_MERMA
  notes: string;
  items: StockAdjustmentItemDTO[];
}

export class StockAdjustmentService {
  /**
   * Procesa un ajuste manual de inventario (cuadre de conteo físico o corrección)
   */
  static async processAdjustment(data: ProcessAdjustmentDTO) {
    if (!data.items || data.items.length === 0) {
      throw new Error('Debe especificar al menos un lote a ajustar');
    }

    return prisma.$transaction(async (tx) => {
      const count = await tx.stockMovement.count();
      const currentYear = new Date().getFullYear();
      const prefix =
        data.type === StockMovementType.DESCARTE_MERMA ? 'MERMA' : 'AJUSTE';
      const refNumber = `MOV-${prefix}-${currentYear}-${String(count + 1).padStart(4, '0')}`;

      const movement = await tx.stockMovement.create({
        data: {
          referenceNumber: refNumber,
          type: data.type,
          notes: data.notes,
          createdById: data.userId,
        },
      });

      const processedItems = [];

      for (const item of data.items) {
        if (item.quantity <= 0) {
          throw new Error(
            'La cantidad ajustada debe ser estrictamente mayor a 0'
          );
        }

        const batch = await tx.stockBatch.findUnique({
          where: { id: item.batchId },
          include: { product: true },
        });

        if (!batch) {
          throw new Error(`Lote con ID ${item.batchId} no existe`);
        }

        const currentQty = Number(batch.currentQuantity);
        let newQty = currentQty;

        if (item.action === 'DECREMENTO') {
          if (item.quantity > currentQty) {
            throw new Error(
              `Cantidad a descontar (${item.quantity}) excede el stock actual (${currentQty}) en el lote ${batch.lotNumber}`
            );
          }
          newQty = currentQty - item.quantity;
        } else if (item.action === 'INCREMENTO') {
          newQty = currentQty + item.quantity;
        }

        const nextStatus =
          newQty === 0
            ? BatchStatus.AGOTADO
            : batch.status === BatchStatus.AGOTADO && newQty > 0
              ? BatchStatus.DISPONIBLE
              : batch.status;

        const updatedBatch = await tx.stockBatch.update({
          where: { id: batch.id },
          data: {
            currentQuantity: newQty,
            status: nextStatus,
          },
        });

        const movementItem = await tx.stockMovementItem.create({
          data: {
            stockMovementId: movement.id,
            batchId: batch.id,
            quantity:
              item.action === 'INCREMENTO' ? item.quantity : -item.quantity,
            unitCost: batch.costPrice,
          },
        });

        processedItems.push({
          batch: updatedBatch,
          previousQuantity: currentQty,
          newQuantity: newQty,
          delta: item.action === 'INCREMENTO' ? item.quantity : -item.quantity,
          movementItem,
        });
      }

      return {
        movement,
        details: processedItems,
      };
    });
  }

  /**
   * Registro directo de descarte o merma (rotura, vencimiento, contaminación en almacén)
   */
  static async registerDirectWaste(userId: number, wastes: DirectWasteDTO[]) {
    return this.processAdjustment({
      userId,
      type: StockMovementType.DESCARTE_MERMA,
      notes: 'Baja formal de almacén por descarte / merma',
      items: wastes.map((w) => ({
        batchId: w.batchId,
        action: 'DECREMENTO',
        quantity: w.quantity,
        reason: w.reason,
      })),
    });
  }

  static async updateBatchStatus(
    batchId: bigint,
    newStatus: BatchStatus,
    reason?: string | null,
    reportedById?: number,
    incidentType?: IncidentType
  ) {
    return prisma.$transaction(async (tx) => {
      const batch = await tx.stockBatch.findUnique({
        where: { id: batchId },
        include: { product: true },
      });

      if (!batch) {
        throw new Error(`Lote con ID ${batchId} no encontrado`);
      }

      if (batch.status === newStatus) {
        throw new Error(`El lote ya se encuentra en estado ${newStatus}`);
      }

      if (
        Number(batch.currentQuantity) === 0 &&
        newStatus !== BatchStatus.AGOTADO
      ) {
        throw new Error(
          'No se puede cambiar el estado de un lote sin existencias (AGOTADO)'
        );
      }

      // Si se pasa a un estado de alerta o bloqueo (CUARENTENA, DEFECTUOSO, VENCIDO) y hay usuario
      const requiresIncidentLog =
        newStatus === BatchStatus.EN_CUARENTENA ||
        newStatus === BatchStatus.DEFECTUOSO ||
        newStatus === BatchStatus.VENCIDO;

      if (requiresIncidentLog && reportedById) {
        await tx.batchIncident.create({
          data: {
            batchId: batch.id,
            reportedById,
            incidentType: incidentType ?? IncidentType.FALLA_CONTROL_CALIDAD,
            description:
              reason ??
              `Cambio de estado forzado de ${batch.status} a ${newStatus}`,
            affectedQuantity: batch.currentQuantity,
            status: IncidentStatus.ABIERTA,
          },
        });
      }

      return tx.stockBatch.update({
        where: { id: batchId },
        data: {
          status: newStatus,
        },
        include: {
          product: true,
          location: true,
          incidents: {
            include: {
              reportedBy: {
                select: { id: true, fullName: true, username: true },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    });
  }
  /**
   * Consulta paginada del historial de movimientos (Kardex general)
   */
  static async getPaginatedMovements(
    pagination: PaginationParams,
    filters?: MovementFilterOptions
  ) {
    const whereClause: any = {};

    if (filters?.type) {
      whereClause.type = filters.type;
    }

    if (filters?.startDate || filters?.endDate) {
      whereClause.createdAt = {};
      if (filters.startDate) whereClause.createdAt.gte = filters.startDate;
      if (filters.endDate) whereClause.createdAt.lte = filters.endDate;
    }

    if (filters?.batchId) {
      whereClause.movementItems = {
        some: { batchId: filters.batchId },
      };
    }

    const [totalItems, movements] = await prisma.$transaction([
      prisma.stockMovement.count({ where: whereClause }),
      prisma.stockMovement.findMany({
        where: whereClause,
        skip: pagination.skip,
        take: pagination.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: { id: true, fullName: true, username: true },
          },
          movementItems: {
            include: {
              batch: {
                include: {
                  product: {
                    select: { id: true, name: true, sku: true },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    return createPaginatedResponse(movements, totalItems, pagination);
  }
}
