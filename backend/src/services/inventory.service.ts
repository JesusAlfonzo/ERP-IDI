import { prisma } from '../config/prisma.js';
import { BatchStatus, StockMovementType, Prisma } from '@prisma/client';

export interface InventoryFilterDTO {
  categoryId?: number;
  locationId?: number;
  search?: string;
  lowStockOnly?: boolean;
}

export interface MovementFilterDTO {
  page?: number;
  limit?: number;
  type?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  orderId?: bigint;
}

export interface InventoryAdjustmentItemDTO {
  batchId: number;
  action: 'INCREMENTO' | 'DECREMENTO';
  quantity: number;
  reason?: string;
}

export interface InventoryAdjustmentDTO {
  notes?: string;
  items: InventoryAdjustmentItemDTO[];
  executedById: number;
}

export interface DirectWasteDTO {
  wastes: {
    batchId: number;
    quantity: number;
    reason: string;
  }[];
  executedById: number;
}

export class InventoryService {
  /**
   * Resumen de inventario consolidado por producto
   */
  static async getInventorySummary(filter?: InventoryFilterDTO) {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(filter?.categoryId !== undefined
          ? { categoryId: filter.categoryId }
          : {}),
        ...(filter?.search
          ? {
              OR: [
                { name: { contains: filter.search, mode: 'insensitive' } },
                { sku: { contains: filter.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        category: true,
        baseUnit: true,
        purchaseUnit: true,
        stockBatches: {
          where: {
            status: BatchStatus.DISPONIBLE,
            currentQuantity: { gt: 0 },
            ...(filter?.locationId !== undefined
              ? { locationId: filter.locationId }
              : {}),
          },
          include: {
            location: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const summary = products.map((prod) => {
      const totalStock = prod.stockBatches.reduce(
        (sum, batch) => sum + Number(batch.currentQuantity),
        0
      );

      const totalValue = prod.stockBatches.reduce(
        (sum, batch) =>
          sum + Number(batch.currentQuantity) * Number(batch.costPrice),
        0
      );

      const isLowStock = totalStock <= Number(prod.minStockAlert);

      return {
        productId: prod.id,
        sku: prod.sku,
        name: prod.name,
        category: prod.category.name,
        baseUnit: prod.baseUnit.abbreviation,
        purchaseUnit: prod.purchaseUnit?.abbreviation ?? null,
        conversionFactor: Number(prod.conversionFactor),
        minStockAlert: Number(prod.minStockAlert),
        totalStock,
        totalValue,
        isLowStock,
        activeBatchesCount: prod.stockBatches.length,
      };
    });

    if (filter?.lowStockOnly) {
      return summary.filter((item) => item.isLowStock);
    }

    return summary;
  }

  /**
   * Listado detallado de lotes físicos
   */
  static async listBatches(filter?: {
    productId?: bigint;
    locationId?: number;
    status?: BatchStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const limit = Math.min(Math.max(filter?.limit ?? 30, 1), 100);
    const page = Math.max(filter?.page ?? 1, 1);

    return prisma.stockBatch.findMany({
      where: {
        ...(filter?.productId !== undefined
          ? { productId: filter.productId }
          : {}),
        ...(filter?.locationId !== undefined
          ? { locationId: filter.locationId }
          : {}),
        status: filter?.status ?? BatchStatus.DISPONIBLE,
        ...(filter?.search
          ? {
              OR: [
                { lotNumber: { contains: filter.search, mode: 'insensitive' } },
                {
                  product: {
                    name: { contains: filter.search, mode: 'insensitive' },
                  },
                },
                {
                  product: {
                    sku: { contains: filter.search, mode: 'insensitive' },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        product: {
          include: {
            baseUnit: true,
          },
        },
        location: true,
      },
      orderBy: [
        { expirationDate: 'asc' }, // FIFO: primero los más próximos a expirar
        { createdAt: 'desc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  /**
   * Alertas tempranas: Stock mínimo y vencimientos próximos
   */
  static async getInventoryAlerts(daysThreshold: number = 90) {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysThreshold);

    // 1. Lotes vencidos o por vencer
    const expiringBatches = await prisma.stockBatch.findMany({
      where: {
        currentQuantity: { gt: 0 },
        status: BatchStatus.DISPONIBLE,
        expirationDate: {
          lte: futureDate,
        },
      },
      include: {
        product: {
          include: { baseUnit: true },
        },
        location: true,
      },
      orderBy: { expirationDate: 'asc' },
    });

    // 2. Productos bajo stock mínimo
    const lowStockSummary = await this.getInventorySummary({
      lowStockOnly: true,
    });

    return {
      expiringBatches,
      lowStockProducts: lowStockSummary,
    };
  }

  /**
   * Kardex general / Historial de movimientos de inventario con paginación y filtros
   */
  static async listMovements(filters: MovementFilterDTO) {
    const page = Math.max(filters.page || 1, 1);
    const limit = Math.min(Math.max(filters.limit || 15, 1), 100);
    const skip = (page - 1) * limit;

    const whereClause: Prisma.StockMovementWhereInput = {
      ...(filters.orderId ? { orderId: filters.orderId } : {}),
      ...(filters.type &&
      Object.values(StockMovementType).includes(
        filters.type as StockMovementType
      )
        ? { type: filters.type as StockMovementType }
        : {}),
      ...(filters.startDate || filters.endDate
        ? {
            createdAt: {
              ...(filters.startDate
                ? { gte: new Date(`${filters.startDate}T00:00:00.000Z`) }
                : {}),
              ...(filters.endDate
                ? { lte: new Date(`${filters.endDate}T23:59:59.999Z`) }
                : {}),
            },
          }
        : {}),
      ...(filters.search
        ? {
            OR: [
              {
                referenceNumber: {
                  contains: filters.search,
                  mode: 'insensitive',
                },
              },
              { notes: { contains: filters.search, mode: 'insensitive' } },
              {
                items: {
                  some: {
                    batch: {
                      OR: [
                        {
                          lotNumber: {
                            contains: filters.search,
                            mode: 'insensitive',
                          },
                        },
                        {
                          product: {
                            name: {
                              contains: filters.search,
                              mode: 'insensitive',
                            },
                          },
                        },
                        {
                          product: {
                            sku: {
                              contains: filters.search,
                              mode: 'insensitive',
                            },
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
    };

    const [totalItems, movements] = await prisma.$transaction([
      prisma.stockMovement.count({ where: whereClause }),
      prisma.stockMovement.findMany({
        where: whereClause,
        include: {
          createdBy: {
            select: {
              id: true,
              fullName: true,
              username: true,
            },
          },
          originLocation: true,
          destinationLocation: true,
          items: {
            include: {
              batch: {
                include: {
                  product: {
                    include: {
                      baseUnit: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: movements,
      meta: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit) || 1,
      },
    };
  }

  /**
   * Consulta de detalle de un movimiento para auditoría por ID
   */
  static async getMovementById(id: bigint) {
    return prisma.stockMovement.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            fullName: true,
            username: true,
            department: true,
          },
        },
        originLocation: true,
        destinationLocation: true,
        order: {
          include: {
            supplier: true,
          },
        },
        items: {
          include: {
            batch: {
              include: {
                product: {
                  include: {
                    category: true,
                    baseUnit: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Registro de Ajustes de Inventario (Incrementos / Decrementos)
   */
  static async createAdjustment(data: InventoryAdjustmentDTO) {
    if (!data.items || data.items.length === 0) {
      throw new Error('Debe especificar al menos un renglón para ajustar.');
    }

    return prisma.$transaction(async (tx) => {
      const movementCount = await tx.stockMovement.count();
      const referenceNumber = `AJUSTE-${new Date().getFullYear()}-${String(
        movementCount + 1
      ).padStart(4, '0')}`;

      const movement = await tx.stockMovement.create({
        data: {
          referenceNumber,
          type: StockMovementType.AJUSTE_INVENTARIO,
          notes: data.notes || 'Ajuste manual de existencias',
          createdById: data.executedById,
        },
      });

      const details = [];

      for (const item of data.items) {
        if (item.quantity <= 0) {
          throw new Error('La cantidad ajustada debe ser mayor a 0');
        }

        const batch = await tx.stockBatch.findUnique({
          where: { id: BigInt(item.batchId) },
        });

        if (!batch) {
          throw new Error(`El lote #${item.batchId} no fue encontrado`);
        }

        const currentQty = Number(batch.currentQuantity);
        let newQty = currentQty;
        let deltaQty = item.quantity;

        if (item.action === 'DECREMENTO') {
          if (item.quantity > currentQty) {
            throw new Error(
              `El decremento (${item.quantity}) supera el saldo actual del lote (${currentQty})`
            );
          }
          newQty = currentQty - item.quantity;
          deltaQty = -item.quantity;
        } else {
          newQty = currentQty + item.quantity;
        }

        const updatedBatch = await tx.stockBatch.update({
          where: { id: batch.id },
          data: {
            currentQuantity: newQty,
            status:
              newQty === 0
                ? BatchStatus.AGOTADO
                : batch.status === BatchStatus.AGOTADO && newQty > 0
                  ? BatchStatus.DISPONIBLE
                  : batch.status,
          },
        });

        await tx.stockMovementItem.create({
          data: {
            stockMovementId: movement.id,
            batchId: batch.id,
            quantity: deltaQty,
            unitCost: batch.costPrice,
          },
        });

        details.push({
          batch: {
            id: Number(updatedBatch.id),
            currentQuantity: Number(updatedBatch.currentQuantity),
          },
          action: item.action,
          quantity: item.quantity,
          reason: item.reason,
        });
      }

      return {
        movement: {
          id: Number(movement.id),
          referenceNumber: movement.referenceNumber,
        },
        details,
      };
    });
  }

  /**
   * Registro directo de Mermas (Roturas, Vencimientos, Mermas Operativas)
   */
  static async registerDirectWaste(data: DirectWasteDTO) {
    if (!data.wastes || data.wastes.length === 0) {
      throw new Error('Debe especificar al menos una merma a procesar.');
    }

    return prisma.$transaction(async (tx) => {
      const movementCount = await tx.stockMovement.count();
      const referenceNumber = `MERMA-${new Date().getFullYear()}-${String(
        movementCount + 1
      ).padStart(4, '0')}`;

      const movement = await tx.stockMovement.create({
        data: {
          referenceNumber,
          type: StockMovementType.DESCARTE_MERMA,
          notes: data.wastes.map((w) => w.reason).join(' | '),
          createdById: data.executedById,
        },
      });

      const details = [];

      for (const waste of data.wastes) {
        if (waste.quantity <= 0) {
          throw new Error('La cantidad a descartar debe ser mayor a 0');
        }

        const batch = await tx.stockBatch.findUnique({
          where: { id: BigInt(waste.batchId) },
        });

        if (!batch) {
          throw new Error(`El lote #${waste.batchId} no fue encontrado`);
        }

        const currentQty = Number(batch.currentQuantity);
        if (waste.quantity > currentQty) {
          throw new Error(
            `La merma solicitada (${waste.quantity}) supera la existencia disponible del lote (${currentQty})`
          );
        }

        const newQty = currentQty - waste.quantity;

        const updatedBatch = await tx.stockBatch.update({
          where: { id: batch.id },
          data: {
            currentQuantity: newQty,
            status: newQty === 0 ? BatchStatus.AGOTADO : batch.status,
          },
        });

        await tx.stockMovementItem.create({
          data: {
            stockMovementId: movement.id,
            batchId: batch.id,
            quantity: -waste.quantity,
            unitCost: batch.costPrice,
          },
        });

        details.push({
          batch: {
            id: Number(updatedBatch.id),
            currentQuantity: Number(updatedBatch.currentQuantity),
          },
          quantity: waste.quantity,
          reason: waste.reason,
        });
      }

      return {
        movement: {
          id: Number(movement.id),
          referenceNumber: movement.referenceNumber,
        },
        details,
      };
    });
  }
}
