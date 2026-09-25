import { prisma } from '../config/prisma.js';
import {
  RequestStatus,
  RequestPriority,
  StockMovementType,
  BatchStatus,
} from '@prisma/client';
import { getCaracasTime } from './request-window.service.js';

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
  priority?: RequestPriority;
  departmentSection: string;
  justification: string;
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

export interface ListRequestsFilter {
  status?: RequestStatus;
  userId?: number;
  cycle?: string;
  search?: string;
}

export function formatRequestItem(it: any) {
  const parseNum = (val: any) => {
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
  };

  const qtyRequested = parseNum(it.quantityRequested ?? it.requestedQuantity);
  const qtyApproved = parseNum(it.quantityApproved);
  const qtyDispatched = parseNum(it.quantityDispatched ?? it.dispatchedQuantity);

  return {
    ...it,
    quantityRequested: qtyRequested,
    requestedQuantity: qtyRequested,
    quantityApproved: qtyApproved,
    quantityDispatched: qtyDispatched,
    dispatchedQuantity: qtyDispatched,
    product: it.product
      ? {
          ...it.product,
          unitOfMeasure:
            it.product.unitOfMeasure ||
            it.product.baseUnit?.abbreviation ||
            'UND',
        }
      : undefined,
  };
}

export class RequestService {
  static async listRequests(filter?: ListRequestsFilter) {
    const list = await prisma.request.findMany({
      where: {
        ...(filter?.status ? { status: filter.status } : {}),
        ...(filter?.userId ? { userId: filter.userId } : {}),
        ...(filter?.cycle ? { weeklyTokenCycle: filter.cycle } : {}),
        ...(filter?.search && filter.search.trim() !== ''
          ? {
              OR: [
                {
                  requestNumber: {
                    contains: filter.search.trim(),
                    mode: 'insensitive',
                  },
                },
                {
                  departmentSection: {
                    contains: filter.search.trim(),
                    mode: 'insensitive',
                  },
                },
                {
                  user: {
                    OR: [
                      {
                        fullName: {
                          contains: filter.search.trim(),
                          mode: 'insensitive',
                        },
                      },
                      {
                        username: {
                          contains: filter.search.trim(),
                          mode: 'insensitive',
                        },
                      },
                    ],
                  },
                },
                {
                  items: {
                    some: {
                      product: {
                        OR: [
                          {
                            name: {
                              contains: filter.search.trim(),
                              mode: 'insensitive',
                            },
                          },
                          {
                            sku: {
                              contains: filter.search.trim(),
                              mode: 'insensitive',
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              ],
            }
          : {}),
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

    return list.map((r) => ({
      ...r,
      applicant: r.user,
      items: r.items.map(formatRequestItem),
    }));
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
        dispatchedMovement: {
          include: {
            items: {
              include: {
                batch: true,
              },
            },
          },
        },
      },
    });

    if (!req) {
      throw new Error('Solicitud no encontrada');
    }

    return {
      ...req,
      applicant: req.user,
      items: req.items.map(formatRequestItem),
    };
  }

  static async createRequest(data: CreateRequestDTO) {
    if (!data.items || data.items.length === 0) {
      throw new Error('Debe solicitar al menos un producto');
    }

    const currentYear = new Date().getFullYear();
    const latest = await prisma.request.findFirst({
      where: {
        requestNumber: {
          startsWith: `SOL-${currentYear}-`,
        },
      },
      orderBy: { id: 'desc' },
      select: { requestNumber: true },
    });

    let nextSeq = 1;
    if (latest?.requestNumber) {
      const parts = latest.requestNumber.split('-');
      const lastPart = parts[parts.length - 1];
      const parsed = lastPart ? parseInt(lastPart, 10) : NaN;
      if (!isNaN(parsed)) {
        nextSeq = parsed + 1;
      }
    }
    const requestNumber = `SOL-${currentYear}-${String(nextSeq).padStart(4, '0')}`;
    const weeklyTokenCycle = getCaracasTime().isoWeeklyCycle;

    const created = await prisma.request.create({
      data: {
        requestNumber,
        userId: data.userId,
        status: RequestStatus.PENDIENTE,
        priority: data.priority ?? RequestPriority.RUTINA,
        departmentSection: data.departmentSection,
        justification: data.justification,
        weeklyTokenCycle,
        notes: data.notes ?? null,
        items: {
          create: data.items.map((it) => ({
            productId: it.productId,
            quantityRequested: it.quantityRequested,
            quantityApproved: 0,
            quantityDispatched: 0,
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
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            department: true,
          },
        },
      },
    });

    return {
      ...created,
      applicant: created.user,
      items: created.items.map(formatRequestItem),
    };
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

        const approvedQty =
          itemApproval.quantityApproved !== undefined &&
          itemApproval.quantityApproved !== null &&
          !Number.isNaN(Number(itemApproval.quantityApproved))
            ? Number(itemApproval.quantityApproved)
            : Number(item.quantityRequested);

        if (approvedQty < 0) {
          throw new Error('La cantidad aprobada no puede ser negativa');
        }

        await tx.requestItem.update({
          where: { id: item.id },
          data: {
            quantityApproved: approvedQty,
          },
        });
      }

      const updated = await tx.request.update({
        where: { id: data.requestId },
        data: {
          status: RequestStatus.APROBADA,
          approvedById: data.approvedById,
          approvedAt: new Date(),
        },
        include: {
          items: {
            include: {
              product: {
                include: { baseUnit: true },
              },
            },
          },
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
        },
      });

      return {
        ...updated,
        applicant: updated.user,
        items: updated.items.map(formatRequestItem),
      };
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

    const updated = await prisma.request.update({
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
        items: {
          include: {
            product: {
              include: { baseUnit: true },
            },
          },
        },
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
      },
    });

    return {
      ...updated,
      applicant: updated.user,
      items: updated.items.map(formatRequestItem),
    };
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
            include: {
              product: {
                include: { baseUnit: true },
              },
            },
          },
        },
      });

      if (!request) {
        throw new Error('Solicitud no encontrada');
      }

      // VALIDACIÓN ESTRICTA: Solo APROBADA o DESPACHADA_PARCIAL. PENDIENTE está PROHIBIDA.
      if (request.status === RequestStatus.PENDIENTE) {
        throw new Error(
          'La solicitud debe ser aprobada antes de proceder al despacho'
        );
      }

      if (
        request.status !== RequestStatus.APROBADA &&
        request.status !== RequestStatus.DESPACHADA_PARCIAL
      ) {
        throw new Error(
          'Solo se pueden despachar solicitudes APROBADAS o con despacho PARCIAL'
        );
      }

      // Filtrar ítems que realmente tengan lotes y cantidad > 0 asignada
      const validItemsToDispatch = data.items
        .map((it) => ({
          itemId: it.itemId,
          allocations: it.allocations.filter((a) => a.quantity > 0),
        }))
        .filter((it) => it.allocations.length > 0);

      if (validItemsToDispatch.length === 0) {
        throw new Error(
          'Indique al menos una cantidad mayor a 0 para despachar, o cierre el modal para mantener la solicitud en espera.'
        );
      }

      // 2. Generar correlativo del movimiento de salida para Kardex
      const count = await tx.stockMovement.count();
      const currentYear = new Date().getFullYear();
      const refNumber = `MOV-DESP-${currentYear}-${String(count + 1).padStart(4, '0')}`;

      const movement = await tx.stockMovement.create({
        data: {
          referenceNumber: refNumber,
          type: StockMovementType.DESPACHO_SOLICITUD,
          notes:
            data.notes ??
            `Despacho de solicitud ${request.requestNumber} a ${request.departmentSection}`,
          createdById: data.dispatchedById,
        },
      });

      const newlyDispatchedMap = new Map<bigint, number>();

      // 3. Procesar asignaciones por ítem
      for (const itemDispatch of validItemsToDispatch) {
        const reqItem = request.items.find((i) => i.id === itemDispatch.itemId);
        if (!reqItem) {
          throw new Error(`Ítem de solicitud ${itemDispatch.itemId} no existe`);
        }

        const totalToDispatch = itemDispatch.allocations.reduce(
          (sum, a) => sum + a.quantity,
          0
        );

        const approvedQuantity = Number(reqItem.quantityApproved);
        const alreadyDispatched = Number(reqItem.quantityDispatched);
        const pendingQuantity = Math.max(
          0,
          approvedQuantity - alreadyDispatched
        );

        if (totalToDispatch > pendingQuantity) {
          throw new Error(
            `La cantidad asignada (${totalToDispatch}) excede el saldo pendiente (${pendingQuantity}) para el producto ${reqItem.product.name}`
          );
        }

        for (const alloc of itemDispatch.allocations) {
          const batch = await tx.stockBatch.findUnique({
            where: { id: alloc.batchId },
          });

          if (!batch) {
            throw new Error(`Lote con ID ${alloc.batchId} no encontrado`);
          }

          if (batch.productId !== reqItem.productId) {
            throw new Error(
              `El lote ${batch.lotNumber} no corresponde al producto solicitado`
            );
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

          // Registrar en el Kardex institucional
          await tx.stockMovementItem.create({
            data: {
              stockMovementId: movement.id,
              batchId: batch.id,
              quantity: -alloc.quantity,
              unitCost: batch.costPrice,
            },
          });
        }

        const updatedDispatched = alreadyDispatched + totalToDispatch;
        await tx.requestItem.update({
          where: { id: reqItem.id },
          data: { quantityDispatched: updatedDispatched },
        });

        newlyDispatchedMap.set(reqItem.id, totalToDispatch);
      }

      // 4. Evaluar si todos los renglones han sido satisfechos al 100%
      const fullyDispatched = request.items.every((item) => {
        const newlyDispatched = newlyDispatchedMap.get(item.id) ?? 0;
        const totalDispatched =
          Number(item.quantityDispatched) + newlyDispatched;
        return totalDispatched >= Number(item.quantityApproved);
      });

      // Actualizar estado de la solicitud y enlazar con el movimiento generado
      const updated = await tx.request.update({
        where: { id: request.id },
        data: {
          status: fullyDispatched
            ? RequestStatus.COMPLETADA
            : RequestStatus.DESPACHADA_PARCIAL,
          dispatchedMovementId: movement.id,
        },
        include: {
          items: {
            include: {
              product: {
                include: { baseUnit: true },
              },
            },
          },
          dispatchedMovement: {
            include: { items: true },
          },
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
        },
      });

      return {
        ...updated,
        applicant: updated.user,
        items: updated.items.map(formatRequestItem),
      };
    });
  }
}
