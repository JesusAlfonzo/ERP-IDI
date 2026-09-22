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
}
