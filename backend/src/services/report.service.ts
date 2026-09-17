import { prisma } from '../config/prisma.js';
import {
  BatchStatus,
  LabUnitStatus,
  LabMovementType,
  OrderStatus,
} from '@prisma/client';

export class ReportService {
  static async getDashboardOverview() {
    const now = new Date();

    // ==========================================
    // 1. VALORIZACIÓN Y LOTES ACTIVOS
    // ==========================================
    const activeBatches = await prisma.stockBatch.findMany({
      where: {
        currentQuantity: { gt: 0 },
      },
      include: {
        product: {
          include: { category: true },
        },
      },
    });

    let totalInventoryValueUsd = 0;
    const categoryValuationMap = new Map<string, number>();

    for (const b of activeBatches) {
      const qty = Number(b.currentQuantity);
      const cost = Number(b.costPrice);
      const lineTotal = qty * cost;
      totalInventoryValueUsd += lineTotal;

      const catName = b.product.category.name;
      categoryValuationMap.set(
        catName,
        (categoryValuationMap.get(catName) ?? 0) + lineTotal
      );
    }

    const valuationByCategory = Array.from(categoryValuationMap.entries()).map(
      ([category, value]) => ({
        category,
        valueUsd: Number(value.toFixed(2)),
      })
    );

    // ==========================================
    // 2. CURVA DE VENCIMIENTOS (30, 60, 90 DÍAS)
    // ==========================================
    const day30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const day60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const day90 = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const expiringBatches = await prisma.stockBatch.findMany({
      where: {
        currentQuantity: { gt: 0 },
        status: { in: [BatchStatus.DISPONIBLE, BatchStatus.EN_CUARENTENA] },
        expirationDate: { not: null, lte: day90 },
      },
      include: {
        product: { select: { id: true, name: true, sku: true } },
      },
      orderBy: { expirationDate: 'asc' },
    });

    const expirationBuckets = {
      expired: [] as any[],
      within30Days: [] as any[],
      within60Days: [] as any[],
      within90Days: [] as any[],
    };

    for (const b of expiringBatches) {
      if (!b.expirationDate) continue;

      const item = {
        batchId: b.id,
        lotNumber: b.lotNumber,
        productName: b.product.name,
        sku: b.product.sku,
        quantity: Number(b.currentQuantity),
        expirationDate: b.expirationDate,
        status: b.status,
      };

      if (b.expirationDate < now) {
        expirationBuckets.expired.push(item);
      } else if (b.expirationDate <= day30) {
        expirationBuckets.within30Days.push(item);
      } else if (b.expirationDate <= day60) {
        expirationBuckets.within60Days.push(item);
      } else {
        expirationBuckets.within90Days.push(item);
      }
    }

    // ==========================================
    // 3. ALERTAS DE STOCK Y CALIDAD
    // ==========================================
    const totalQuarantinedBatches = await prisma.stockBatch.count({
      where: { status: BatchStatus.EN_CUARENTENA },
    });

    const totalDefectiveBatches = await prisma.stockBatch.count({
      where: { status: BatchStatus.DEFECTUOSO },
    });

    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        stockBatches: {
          where: { status: BatchStatus.DISPONIBLE },
          select: { currentQuantity: true },
        },
      },
    });

    const lowStockAlerts = products
      .map((p) => {
        const totalAvailable = p.stockBatches.reduce(
          (acc: number, b: { currentQuantity: any }) =>
            acc + Number(b.currentQuantity),
          0
        );
        return {
          productId: p.id,
          name: p.name,
          sku: p.sku,
          minStockAlert: p.minStockAlert,
          currentStock: totalAvailable,
        };
      })
      .filter((p) => p.currentStock <= p.minStockAlert);

    // ==========================================
    // 4. CONSUMO ANALÍTICO DE LABORATORIO
    // ==========================================
    const sealedUnitsCount = await prisma.labReagentUnit.count({
      where: { status: LabUnitStatus.SELLADO },
    });

    const inUseUnitsCount = await prisma.labReagentUnit.count({
      where: { status: LabUnitStatus.EN_USO },
    });

    const labMovements = await prisma.labStockMovement.findMany({
      where: { movementType: LabMovementType.CONSUMO_PRUEBAS },
      include: {
        labReagentUnit: {
          include: {
            product: true,
            fridge: true,
          },
        },
        executedBy: {
          select: { department: true },
        },
        fromFridge: true,
      },
    });

    const consumptionByDeptMap = new Map<string, number>();
    const consumptionByFridgeMap = new Map<string, number>();

    for (const mov of labMovements) {
      const used = Number(mov.amountUsed);
      const dept = mov.executedBy?.department ?? 'Inmunología';
      const fridgeName =
        mov.fromFridge?.name ??
        mov.labReagentUnit.fridge?.name ??
        'Nevera Principal';

      consumptionByDeptMap.set(
        dept,
        (consumptionByDeptMap.get(dept) ?? 0) + used
      );
      consumptionByFridgeMap.set(
        fridgeName,
        (consumptionByFridgeMap.get(fridgeName) ?? 0) + used
      );
    }

    const consumptionByDepartment = Array.from(
      consumptionByDeptMap.entries()
    ).map(([department, totalUsed]) => ({
      department,
      totalUsed: Number(totalUsed.toFixed(2)),
    }));

    const consumptionByFridge = Array.from(
      consumptionByFridgeMap.entries()
    ).map(([fridge, totalUsed]) => ({
      fridge,
      totalUsed: Number(totalUsed.toFixed(2)),
    }));

    // Top 5 reactivos consumidos
    const topConsumptions = await prisma.labStockMovement.groupBy({
      by: ['labReagentUnitId'],
      where: { movementType: LabMovementType.CONSUMO_PRUEBAS },
      _sum: { amountUsed: true },
      orderBy: { _sum: { amountUsed: 'desc' } },
      take: 5,
    });

    const topConsumedReagents = await Promise.all(
      topConsumptions.map(async (item) => {
        const unit = await prisma.labReagentUnit.findUnique({
          where: { id: item.labReagentUnitId },
          include: { product: true },
        });
        return {
          unitCode: unit?.unitCode ?? 'Desconocido',
          productName: unit?.product.name ?? 'Desconocido',
          totalConsumed: Number(item._sum.amountUsed ?? 0),
        };
      })
    );

    // ==========================================
    // 5. RESUMEN FINANCIERO Y DEUDA A PROVEEDORES
    // ==========================================
    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      include: {
        orders: {
          where: { status: { not: OrderStatus.CANCELADA } },
          select: {
            total: true,
            status: true,
            payments: {
              select: { amount: true, exchangeRate: true },
            },
          },
        },
      },
    });

    let globalInvoicedUsd = 0;
    let globalPaidUsd = 0;

    const supplierDebts = suppliers
      .map((sup) => {
        let invoiced = 0;
        let paid = 0;

        for (const ord of sup.orders) {
          invoiced += Number(ord.total);

          const ordPaid = ord.payments.reduce(
            (acc: number, p: { amount: any; exchangeRate: any }) => {
              const rate =
                Number(p.exchangeRate) > 0 ? Number(p.exchangeRate) : 1;
              return acc + Number(p.amount) / rate;
            },
            0
          );

          paid += ordPaid;
        }

        const pendingDebt = invoiced - paid;
        globalInvoicedUsd += invoiced;
        globalPaidUsd += paid;

        return {
          supplierId: sup.id,
          name: sup.name,
          rifOrId: sup.rifOrId,
          totalInvoicedUsd: Number(invoiced.toFixed(2)),
          totalPaidUsd: Number(paid.toFixed(2)),
          pendingDebtUsd: Number(
            (pendingDebt > 0 ? pendingDebt : 0).toFixed(2)
          ),
        };
      })
      .filter((s) => s.pendingDebtUsd > 0);

    const pendingOrdersCount = await prisma.order.count({
      where: {
        status: {
          in: [OrderStatus.BORRADOR, OrderStatus.ENVIADA, OrderStatus.PARCIAL],
        },
      },
    });

    return {
      valuation: {
        totalInventoryValueUsd: Number(totalInventoryValueUsd.toFixed(2)),
        byCategory: valuationByCategory,
      },
      expirationMatrix: {
        summary: {
          expiredCount: expirationBuckets.expired.length,
          within30DaysCount: expirationBuckets.within30Days.length,
          within60DaysCount: expirationBuckets.within60Days.length,
          within90DaysCount: expirationBuckets.within90Days.length,
        },
        details: expirationBuckets,
      },
      qualityAndStockAlerts: {
        quarantinedBatches: totalQuarantinedBatches,
        defectiveBatches: totalDefectiveBatches,
        lowStockCount: lowStockAlerts.length,
        lowStockItems: lowStockAlerts,
      },
      laboratory: {
        sealedUnits: sealedUnitsCount,
        inUseUnits: inUseUnitsCount,
        topConsumedReagents,
        consumptionByDepartment,
        consumptionByFridge,
      },
      purchasing: {
        pendingOrders: pendingOrdersCount,
        totalInvoicedUsd: Number(globalInvoicedUsd.toFixed(2)),
        totalPaidUsd: Number(globalPaidUsd.toFixed(2)),
        totalPendingDebtUsd: Number(
          (globalInvoicedUsd - globalPaidUsd > 0
            ? globalInvoicedUsd - globalPaidUsd
            : 0
          ).toFixed(2)
        ),
        suppliersWithDebt: supplierDebts,
      },
    };
  }
}
