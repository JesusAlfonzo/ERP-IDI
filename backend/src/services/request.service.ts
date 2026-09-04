import { prisma } from '../config/prisma.js';
import {
  RequestStatus,
  StockMovementType,
  BatchStatus,
  LabUnitStatus,
} from '@prisma/client';

export interface DispatchBatchAllocationDTO {
  batchId: bigint;
  quantity: number;
}

export interface DispatchItemDTO {
  itemId: bigint;
  allocations: DispatchBatchAllocationDTO[];
}

export interface DispatchRequestDTO {
  requestId: bigint;
  dispatchedById: number;
  notes?: string | null;
  items: DispatchItemDTO[];
}

export interface CreateRequestItemDTO {
  productId: bigint;
  quantityRequested: number;
}

export interface CreateRequestDTO {
  userId: number;
  notes?: string | null;
  items: CreateRequestItemDTO[];
}

export interface ApproveRequestItemDTO {
  itemId: bigint;
  quantityApproved: number;
}

export interface ApproveRequestDTO {
  requestId: bigint;
  approvedById: number;
  items: ApproveRequestItemDTO[];
}

/**
 * Calcula el ciclo semanal en formato ISO (ej: 2026-W36)
 */
function getIsoWeeklyCycle(date: Date = new Date()): string {
  const tempDate = new Date(date.getTime());
  tempDate.setHours(0, 0, 0, 0);
  tempDate.setDate(tempDate.getDate() + 3 - ((tempDate.getDay() + 6) % 7));
  const week1 = new Date(tempDate.getFullYear(), 0, 4);
  const weekNumber =
    1 +
    Math.round(
      ((tempDate.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    );
  return `${tempDate.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

export class RequestService {
  static async listRequests(filter?: {
    status?: RequestStatus;
    userId?: number;
    cycle?: string;
  }) {
    return prisma.request.findMany({
      where: {
        ...(filter?.status ? { status: filter.status } : {}),
        ...(filter?.userId ? { userId: filter.userId } : {}),
        ...(filter?.cycle ? { weeklyTokenCycle: filter.cycle } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            department: true,
          },
        },
        approvedBy: {
          select: { id: true, fullName: true, username: true },
        },
        items: {
          include: {
            product: {
              include: { baseUnit: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getRequestById(id: bigint) {
    const req = await prisma.request.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            department: true,
          },
        },
        approvedBy: {
          select: { id: true, fullName: true, username: true },
        },
        items: {
          include: {
            product: {
              include: { baseUnit: true },
            },
          },
        },
        dispatchedMovement: true,
      },
    });

    if (!req) {
      throw new Error('Solicitud no encontrada');
    }

    return req;
  }

  static async createRequest(data: CreateRequestDTO) {
    if (!data.items || data.items.length === 0) {
      throw new Error('Debe solicitar al menos un producto');
    }

    const currentYear = new Date().getFullYear();
    const count = await prisma.request.count();
    const requestNumber = `SOL-${currentYear}-${String(count + 1).padStart(4, '0')}`;
    const weeklyTokenCycle = getIsoWeeklyCycle();

    return prisma.request.create({
      data: {
        requestNumber,
        userId: data.userId,
        status: RequestStatus.PENDIENTE,
        weeklyTokenCycle,
        notes: data.notes ?? null,
        items: {
          create: data.items.map((it) => ({
            productId: it.productId,
            quantityRequested: it.quantityRequested,
            quantityApproved: 0,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: {
              include: { baseUnit: true },
            },
          },
        },
      },
    });
  }

  static async approveRequest(data: ApproveRequestDTO) {
    return prisma.$transaction(async (tx) => {
      const request = await tx.request.findUnique({
        where: { id: data.requestId },
        include: { items: true },
      });

      if (!request) {
        throw new Error('Solicitud no encontrada');
      }

      if (request.status !== RequestStatus.PENDIENTE) {
        throw new Error(
          'Solo se pueden aprobar solicitudes en estado PENDIENTE'
        );
      }

      for (const itemApproval of data.items) {
        const item = request.items.find((i) => i.id === itemApproval.itemId);
        if (!item) {
          throw new Error(
            `Ítem con ID ${itemApproval.itemId} no existe en la solicitud`
          );
        }

        if (itemApproval.quantityApproved < 0) {
          throw new Error('La cantidad aprobada no puede ser negativa');
        }

        await tx.requestItem.update({
          where: { id: item.id },
          data: {
            quantityApproved: itemApproval.quantityApproved,
          },
        });
      }

      return tx.request.update({
        where: { id: data.requestId },
        data: {
          status: RequestStatus.APROBADA,
          approvedById: data.approvedById,
          approvedAt: new Date(),
        },
        include: {
          items: {
            include: { product: true },
          },
          user: true,
          approvedBy: true,
        },
      });
    });
  }

  static async rejectRequest(id: bigint, rejectedById: number, notes?: string) {
    const request = await prisma.request.findUnique({ where: { id } });

    if (!request) {
      throw new Error('Solicitud no encontrada');
    }

    if (request.status !== RequestStatus.PENDIENTE) {
      throw new Error(
        'Solo se pueden rechazar solicitudes en estado PENDIENTE'
      );
    }

    return prisma.request.update({
      where: { id },
      data: {
        status: RequestStatus.RECHAZADA,
        approvedById: rejectedById,
        approvedAt: new Date(),
        notes: notes
          ? `${request.notes ? request.notes + ' | ' : ''}Rechazo: ${notes}`
          : request.notes,
      },
      include: {
        items: true,
      },
    });
  }

  static async dispatchRequest(data: DispatchRequestDTO) {
    if (!data.items || data.items.length === 0) {
      throw new Error('Debe especificar los ítems y lotes a despachar');
    }

    return prisma.$transaction(async (tx) => {
      // 1. Validar la solicitud
      const request = await tx.request.findUnique({
        where: { id: data.requestId },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      if (!request) {
        throw new Error('Solicitud no encontrada');
      }

      if (
        request.status !== RequestStatus.APROBADA &&
        request.status !== RequestStatus.DESPACHADA_PARCIAL
      ) {
        throw new Error(
          'Solo se pueden despachar solicitudes APROBADAS o con despacho PARCIAL'
        );
      }

      // 2. Generar correlativo del movimiento de salida
      const count = await tx.stockMovement.count();
      const currentYear = new Date().getFullYear();
      const refNumber = `MOV-DESP-${currentYear}-${String(count + 1).padStart(4, '0')}`;

      const movement = await tx.stockMovement.create({
        data: {
          referenceNumber: refNumber,
          type: StockMovementType.DESPACHO_SOLICITUD,
          notes: data.notes ?? `Despacho de solicitud ${request.requestNumber}`,
          createdById: data.dispatchedById,
        },
      });

      // 3. Procesar asignaciones por ítem
      for (const itemDispatch of data.items) {
        const reqItem = request.items.find((i) => i.id === itemDispatch.itemId);
        if (!reqItem) {
          throw new Error(`Ítem de solicitud ${itemDispatch.itemId} no existe`);
        }

        const totalToDispatch = itemDispatch.allocations.reduce(
          (sum, a) => sum + a.quantity,
          0
        );

        if (totalToDispatch > Number(reqItem.quantityApproved)) {
          throw new Error(
            `La cantidad asignada (${totalToDispatch}) excede la cantidad aprobada (${reqItem.quantityApproved})`
          );
        }

        for (const alloc of itemDispatch.allocations) {
          const batch = await tx.stockBatch.findUnique({
            where: { id: alloc.batchId },
          });

          if (!batch) {
            throw new Error(`Lote con ID ${alloc.batchId} no encontrado`);
          }

          if (Number(batch.currentQuantity) < alloc.quantity) {
            throw new Error(
              `Stock insuficiente en lote ${batch.lotNumber}. Disponible: ${batch.currentQuantity}, requerido: ${alloc.quantity}`
            );
          }

          // Descontar del lote físico
          const remainingStock = Number(batch.currentQuantity) - alloc.quantity;
          await tx.stockBatch.update({
            where: { id: batch.id },
            data: {
              currentQuantity: remainingStock,
              status: remainingStock === 0 ? BatchStatus.AGOTADO : batch.status,
            },
          });

          // Registrar detalle del movimiento de inventario
          await tx.stockMovementItem.create({
            data: {
              stockMovementId: movement.id,
              batchId: batch.id,
              quantity: alloc.quantity,
              unitCost: batch.costPrice,
            },
          });

          // Si el producto es un reactivo de laboratorio, crear frascos individuales
          if (reqItem.product.isReagent) {
            const currentUnitsCount = await tx.labReagentUnit.count();
            for (let i = 0; i < alloc.quantity; i++) {
              const unitCode = `LAB-${reqItem.product.sku}-${String(currentUnitsCount + i + 1).padStart(5, '0')}`;
              await tx.labReagentUnit.create({
                data: {
                  productId: reqItem.productId,
                  batchId: batch.id,
                  unitCode,
                  initialVolume: 100,
                  currentVolume: 100,
                  status: LabUnitStatus.SELLADO,
                  expirationDate: batch.expirationDate,
                },
              });
            }
          }
        }
      }

      // 4. Actualizar estado y enlazar con el movimiento generado
      return tx.request.update({
        where: { id: request.id },
        data: {
          status: RequestStatus.COMPLETADA,
          dispatchedMovementId: movement.id,
        },
        include: {
          items: {
            include: { product: true },
          },
          dispatchedMovement: {
            include: { items: true },
          },
        },
      });
    });
  }
}
