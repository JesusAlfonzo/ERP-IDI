import { prisma } from '../config/prisma.js';
import { BatchStatus } from '@prisma/client';

export interface InventoryFilterDTO {
  categoryId?: number;
  locationId?: number;
  search?: string;
  lowStockOnly?: boolean;
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
  }) {
    return prisma.stockBatch.findMany({
      where: {
        ...(filter?.productId !== undefined
          ? { productId: filter.productId }
          : {}),
        ...(filter?.locationId !== undefined
          ? { locationId: filter.locationId }
          : {}),
        ...(filter?.status !== undefined ? { status: filter.status } : {}),
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
   * Kardex general / Historial de movimientos de inventario
   */
  static async listMovements(filter?: { orderId?: bigint; take?: number }) {
    return prisma.stockMovement.findMany({
      where: {
        ...(filter?.orderId !== undefined ? { orderId: filter.orderId } : {}),
      },
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
      take: filter?.take ?? 50,
    });
  }
}
