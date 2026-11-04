import { prisma } from '../config/prisma.js';
import {
  BatchStatus,
  LabUnitStatus,
  LabMovementType,
  OrderStatus,
  StockMovementType,
  RequestStatus,
  PaymentStatus,
  LabWeeklyRunStatus,
  RepeatReason,
  ConsumptionConcept,
  StockOwnership,
  Prisma,
} from '@prisma/client';

export interface CustomReportFilter {
  reportType?: 'KARDEX' | 'SUPPLIER_PAYMENTS' | 'DEPARTMENT_CONSUMPTION' | 'BATCH_EXPIRATION';
  startDate?: string;
  endDate?: string;
  productId?: number;
  categoryId?: number;
  supplierId?: number;
  departmentId?: number;
  movementType?: string;
  status?: string;
  search?: string;
}

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

  // ==========================================
  // GENERADOR DE REPORTES PERSONALIZADOS
  // ==========================================
  static async generateCustomReport(filters: CustomReportFilter) {
    const reportType = filters.reportType || 'KARDEX';
    const now = new Date();

    // 1. REPORTE DE MOVIMIENTOS Y KARDEX
    if (reportType === 'KARDEX') {
      const where: any = {};
      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
        if (filters.endDate) {
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          where.createdAt.lte = end;
        }
      }
      if (filters.movementType && Object.values(StockMovementType).includes(filters.movementType as any)) {
        where.type = filters.movementType as StockMovementType;
      }
      if (filters.productId) {
        where.items = { some: { batch: { productId: BigInt(filters.productId) } } };
      } else if (filters.categoryId) {
        where.items = { some: { batch: { product: { categoryId: filters.categoryId } } } };
      }
      if (filters.search) {
        where.OR = [
          { referenceNumber: { contains: filters.search, mode: 'insensitive' } },
          { notes: { contains: filters.search, mode: 'insensitive' } },
          {
            items: {
              some: {
                batch: {
                  product: {
                    name: { contains: filters.search, mode: 'insensitive' },
                  },
                },
              },
            },
          },
        ];
      }

      const movements = await prisma.stockMovement.findMany({
        where,
        include: {
          createdBy: {
            select: { id: true, fullName: true, username: true, department: true },
          },
          originLocation: true,
          destinationLocation: true,
          order: {
            include: { supplier: true },
          },
          items: {
            include: {
              batch: {
                include: {
                  product: {
                    include: { category: true, baseUnit: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      });

      let totalEntries = 0;
      let totalExits = 0;
      let totalValueUsd = 0;

      const rows = movements.flatMap((m) => {
        if (!m.items || m.items.length === 0) {
          return [
            {
              id: Number(m.id),
              referenceNumber: m.referenceNumber,
              type: m.type,
              createdAt: m.createdAt,
              user: m.createdBy.fullName || m.createdBy.username,
              department: m.createdBy.department || 'N/A',
              notes: m.notes || '-',
              origin: m.originLocation?.name || 'N/A',
              destination: m.destinationLocation?.name || 'N/A',
              supplier: m.order?.supplier?.name || null,
              productName:
                m.type === 'PAGO_ORDEN'
                  ? 'Asiento Tesorería (Pago de Orden)'
                  : m.type === 'EGRESO_DIRECTO'
                  ? 'Asiento Tesorería (Egreso Directo)'
                  : 'Sin insumo asociado',
              sku: m.order ? `ORD-${m.order.orderNumber}` : 'N/A',
              category: 'Financiero',
              lotNumber: 'N/A',
              expirationDate: null,
              quantity: 0,
              unit: '-',
              unitCost: 0,
              totalCost: 0,
            },
          ];
        }

        return m.items.map((it) => {
          const qty = Number(it.quantity);
          const cost = Number(it.unitCost || it.batch?.costPrice || 0);
          const lineCost = qty * cost;
          const isPositive =
            m.type === StockMovementType.ENTRADA_COMPRA ||
            m.type === StockMovementType.AJUSTE_INVENTARIO;

          if (isPositive) {
            totalEntries += Math.abs(qty);
          } else {
            totalExits += Math.abs(qty);
          }
          totalValueUsd += lineCost;

          return {
            id: Number(m.id),
            referenceNumber: m.referenceNumber,
            type: m.type,
            createdAt: m.createdAt,
            user: m.createdBy.fullName || m.createdBy.username,
            department: m.createdBy.department || 'N/A',
            notes: m.notes || '-',
            origin: m.originLocation?.name || 'N/A',
            destination: m.destinationLocation?.name || 'N/A',
            supplier: m.order?.supplier?.name || null,
            productName: it.batch?.product?.name || 'Desconocido',
            sku: it.batch?.product?.sku || 'N/A',
            category: it.batch?.product?.category?.name || 'N/A',
            lotNumber: it.batch?.lotNumber || 'N/A',
            expirationDate: it.batch?.expirationDate || null,
            quantity: qty,
            unit:
              it.batch?.product?.baseUnit?.abbreviation ||
              it.batch?.product?.baseUnit?.name ||
              '-',
            unitCost: Number(cost.toFixed(2)),
            totalCost: Number(lineCost.toFixed(2)),
          };
        });
      });

      return {
        reportType: 'KARDEX',
        generatedAt: now,
        totalRecords: rows.length,
        summary: {
          totalMovements: movements.length,
          totalEntries: Number(totalEntries.toFixed(2)),
          totalExits: Number(totalExits.toFixed(2)),
          totalValueUsd: Number(totalValueUsd.toFixed(2)),
        },
        rows,
      };
    }

    // 2. REPORTE DE COMPRAS Y PAGOS A PROVEEDORES (DETALLE DE GASTOS Y PRODUCTOS USADOS)
    if (reportType === 'SUPPLIER_PAYMENTS') {
      const orderWhere: any = {};
      if (filters.supplierId) {
        orderWhere.supplierId = filters.supplierId;
      }
      if (filters.status && Object.values(OrderStatus).includes(filters.status as any)) {
        orderWhere.status = filters.status as OrderStatus;
      }
      if (filters.startDate || filters.endDate) {
        orderWhere.createdAt = {};
        if (filters.startDate) orderWhere.createdAt.gte = new Date(filters.startDate);
        if (filters.endDate) {
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          orderWhere.createdAt.lte = end;
        }
      }
      if (filters.productId) {
        orderWhere.items = { some: { productId: BigInt(filters.productId) } };
      }
      if (filters.search) {
        orderWhere.OR = [
          { orderNumber: { contains: filters.search, mode: 'insensitive' } },
          { supplier: { name: { contains: filters.search, mode: 'insensitive' } } },
          { supplier: { rifOrId: { contains: filters.search, mode: 'insensitive' } } },
          { notes: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const orders = await prisma.order.findMany({
        where: orderWhere,
        include: {
          supplier: true,
          currencyRel: true,
          createdBy: { select: { fullName: true, username: true } },
          items: {
            include: {
              product: { include: { category: true, baseUnit: true } },
              unit: true,
            },
          },
          payments: {
            include: {
              sourceAccount: true,
              currency: true,
              registeredBy: { select: { fullName: true, username: true } },
            },
            orderBy: { paymentDate: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 500,
      });

      // También consultar pagos directos si no hay filtro de proveedor específico o coincide
      const directPaymentsWhere: any = {};
      if (filters.startDate || filters.endDate) {
        directPaymentsWhere.paymentDate = {};
        if (filters.startDate) directPaymentsWhere.paymentDate.gte = new Date(filters.startDate);
        if (filters.endDate) {
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          directPaymentsWhere.paymentDate.lte = end;
        }
      }
      if (filters.search) {
        directPaymentsWhere.OR = [
          { concept: { contains: filters.search, mode: 'insensitive' } },
          { beneficiary: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      const directPayments = !filters.supplierId
        ? await prisma.directPayment.findMany({
            where: directPaymentsWhere,
            include: {
              sourceAccount: true,
              registeredBy: { select: { fullName: true, username: true } },
            },
            orderBy: { paymentDate: 'desc' },
            take: 200,
          })
        : [];

      let totalInvoicedUsd = 0;
      let totalPaidUsd = 0;
      let totalDirectPaymentsUsd = 0;

      const supplierMap = new Map<
        number,
        {
          supplierId: number;
          supplierName: string;
          rif: string;
          totalOrders: number;
          totalInvoicedUsd: number;
          totalPaidUsd: number;
          pendingDebtUsd: number;
          productsBought: Map<string, { name: string; sku: string; quantity: number; unit: string; totalUsd: number }>;
        }
      >();

      const orderRows = orders.map((ord) => {
        const invoicedUsd = Number(ord.total);
        const rate = Number(ord.exchangeRate) > 0 ? Number(ord.exchangeRate) : 1;
        const invoicedBs = Number(ord.totalAmountBs) > 0 ? Number(ord.totalAmountBs) : invoicedUsd * rate;

        let ordPaidUsd = 0;
        let ordPaidBs = 0;

        ord.payments.forEach((p) => {
          const pAmount = Number(p.amountPaid);
          const pRate = Number(p.exchangeRate) > 0 ? Number(p.exchangeRate) : 1;
          const pAmortized = Number(p.amortizedAmountUsd) > 0 ? Number(p.amortizedAmountUsd) : pAmount / pRate;
          ordPaidUsd += pAmortized;
          ordPaidBs += p.transactionCurrency === 'VED' || p.transactionCurrency === 'VES' ? pAmount : pAmount * pRate;
        });

        const pendingDebtUsd = Math.max(0, invoicedUsd - ordPaidUsd);

        totalInvoicedUsd += invoicedUsd;
        totalPaidUsd += ordPaidUsd;

        // Estadísticas agregadas por proveedor
        if (ord.supplier) {
          const supId = ord.supplier.id;
          if (!supplierMap.has(supId)) {
            supplierMap.set(supId, {
              supplierId: supId,
              supplierName: ord.supplier.name,
              rif: ord.supplier.rifOrId,
              totalOrders: 0,
              totalInvoicedUsd: 0,
              totalPaidUsd: 0,
              pendingDebtUsd: 0,
              productsBought: new Map(),
            });
          }
          const sEntry = supplierMap.get(supId)!;
          sEntry.totalOrders += 1;
          sEntry.totalInvoicedUsd += invoicedUsd;
          sEntry.totalPaidUsd += ordPaidUsd;
          sEntry.pendingDebtUsd += pendingDebtUsd;

          ord.items.forEach((it) => {
            const pKey = String(it.productId);
            const lineUsd = Number(it.totalLine);
            const qtyRec = Number(it.quantityReceived || it.quantityOrdered);
            if (!sEntry.productsBought.has(pKey)) {
              sEntry.productsBought.set(pKey, {
                name: it.product.name,
                sku: it.product.sku,
                quantity: qtyRec,
                unit: it.unit.abbreviation,
                totalUsd: lineUsd,
              });
            } else {
              const pItem = sEntry.productsBought.get(pKey)!;
              pItem.quantity += qtyRec;
              pItem.totalUsd += lineUsd;
            }
          });
        }

        return {
          orderId: Number(ord.id),
          orderNumber: ord.orderNumber,
          createdAt: ord.createdAt,
          supplierName: ord.supplier?.name || 'Proveedor General',
          supplierRif: ord.supplier?.rifOrId || 'N/A',
          status: ord.status,
          paymentStatus: ord.paymentStatus,
          receptionStatus: ord.receptionStatus,
          currency: ord.currency,
          exchangeRate: rate,
          invoicedUsd: Number(invoicedUsd.toFixed(2)),
          invoicedBs: Number(invoicedBs.toFixed(2)),
          paidUsd: Number(ordPaidUsd.toFixed(2)),
          paidBs: Number(ordPaidBs.toFixed(2)),
          pendingDebtUsd: Number(pendingDebtUsd.toFixed(2)),
          items: ord.items.map((it) => ({
            productId: Number(it.productId),
            name: it.product.name,
            sku: it.product.sku,
            category: it.product.category?.name || 'General',
            unit: it.unit.abbreviation,
            quantityOrdered: Number(it.quantityOrdered),
            quantityReceived: Number(it.quantityReceived),
            unitPrice: Number(it.unitPrice),
            totalLine: Number(it.totalLine),
          })),
          payments: ord.payments.map((p) => ({
            id: Number(p.id),
            paymentDate: p.paymentDate,
            method: p.paymentMethod || p.method,
            bankName: p.bankName || p.sourceAccount?.bankName || 'Banco Registrado',
            referenceNumber: p.referenceNumber || '-',
            amountPaid: Number(p.amountPaid),
            transactionCurrency: p.transactionCurrency,
            exchangeRate: Number(p.exchangeRate),
            amortizedUsd: Number(p.amortizedAmountUsd),
          })),
        };
      });

      const directPaymentRows = directPayments.map((dp) => {
        const eqUsd = Number(dp.equivalentAmountUsd) > 0 ? Number(dp.equivalentAmountUsd) : Number(dp.amountPaid) / Number(dp.exchangeRate);
        totalDirectPaymentsUsd += eqUsd;
        totalPaidUsd += eqUsd;

        return {
          id: Number(dp.id),
          paymentDate: dp.paymentDate,
          concept: dp.concept,
          beneficiary: dp.beneficiary,
          method: dp.method,
          bankName: dp.sourceAccount?.bankName || 'Cuenta Origen',
          referenceNumber: dp.referenceNumber || '-',
          amountPaid: Number(dp.amountPaid),
          currency: dp.transactionCurrency,
          exchangeRate: Number(dp.exchangeRate),
          equivalentAmountUsd: Number(eqUsd.toFixed(2)),
          registeredBy: dp.registeredBy.fullName || dp.registeredBy.username,
        };
      });

      const supplierSummaries = Array.from(supplierMap.values()).map((s) => ({
        supplierId: s.supplierId,
        supplierName: s.supplierName,
        rif: s.rif,
        totalOrders: s.totalOrders,
        totalInvoicedUsd: Number(s.totalInvoicedUsd.toFixed(2)),
        totalPaidUsd: Number(s.totalPaidUsd.toFixed(2)),
        pendingDebtUsd: Number(s.pendingDebtUsd.toFixed(2)),
        topProductsPurchased: Array.from(s.productsBought.values()).map((p) => ({
          name: p.name,
          sku: p.sku,
          quantity: Number(p.quantity.toFixed(2)),
          unit: p.unit,
          totalUsd: Number(p.totalUsd.toFixed(2)),
        })),
      }));

      return {
        reportType: 'SUPPLIER_PAYMENTS',
        generatedAt: now,
        totalRecords: orderRows.length + directPaymentRows.length,
        summary: {
          totalOrdersCount: orderRows.length,
          totalDirectPaymentsCount: directPaymentRows.length,
          totalInvoicedUsd: Number(totalInvoicedUsd.toFixed(2)),
          totalPaidUsd: Number(totalPaidUsd.toFixed(2)),
          totalDirectPaymentsUsd: Number(totalDirectPaymentsUsd.toFixed(2)),
          totalPendingDebtUsd: Number(Math.max(0, totalInvoicedUsd - (totalPaidUsd - totalDirectPaymentsUsd)).toFixed(2)),
        },
        supplierSummaries,
        orders: orderRows,
        directPayments: directPaymentRows,
      };
    }

    // 3. REPORTE DE CONSUMO POR DEPARTAMENTO / SALA Y PROTOCOLOS
    if (reportType === 'DEPARTMENT_CONSUMPTION') {
      const reqWhere: any = {};
      if (filters.departmentId) {
        reqWhere.departmentId = filters.departmentId;
      }
      if (filters.status && Object.values(RequestStatus).includes(filters.status as any)) {
        reqWhere.status = filters.status as RequestStatus;
      }
      if (filters.startDate || filters.endDate) {
        reqWhere.createdAt = {};
        if (filters.startDate) reqWhere.createdAt.gte = new Date(filters.startDate);
        if (filters.endDate) {
          const end = new Date(filters.endDate);
          end.setHours(23, 59, 59, 999);
          reqWhere.createdAt.lte = end;
        }
      }
      if (filters.productId) {
        reqWhere.items = { some: { productId: BigInt(filters.productId) } };
      }
      if (filters.search) {
        reqWhere.OR = [
          { requestNumber: { contains: filters.search, mode: 'insensitive' } },
          { justification: { contains: filters.search, mode: 'insensitive' } },
          { departmentSection: { contains: filters.search, mode: 'insensitive' } },
          { department: { name: { contains: filters.search, mode: 'insensitive' } } },
        ];
      }

      const requests = await prisma.request.findMany({
        where: reqWhere,
        include: {
          department: true,
          user: { select: { id: true, fullName: true, username: true, department: true } },
          approvedBy: { select: { id: true, fullName: true, username: true } },
          items: {
            include: {
              product: { include: { category: true, baseUnit: true } },
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
        orderBy: { createdAt: 'desc' },
        take: 500,
      });

      let totalItemsDispatched = 0;
      const deptMap = new Map<string, { totalRequests: number; totalDispatched: number }>();

      const rows = requests.map((req) => {
        const deptName = req.department.name;
        if (!deptMap.has(deptName)) {
          deptMap.set(deptName, { totalRequests: 0, totalDispatched: 0 });
        }
        const dEntry = deptMap.get(deptName)!;
        dEntry.totalRequests += 1;

        const itemsList = req.items.map((it) => {
          const qtyReq = Number(it.quantityRequested);
          const qtyApp = Number(it.quantityApproved || 0);
          const qtyDisp = Number(it.quantityDispatched || 0);
          totalItemsDispatched += qtyDisp;
          dEntry.totalDispatched += qtyDisp;

          return {
            productId: Number(it.productId),
            productName: it.product.name,
            sku: it.product.sku,
            category: it.product.category?.name || 'General',
            unit: it.product.baseUnit?.abbreviation || it.product.baseUnit?.name || '-',
            quantityRequested: qtyReq,
            quantityApproved: qtyApp,
            quantityDispatched: qtyDisp,
          };
        });

        return {
          id: Number(req.id),
          requestNumber: req.requestNumber,
          createdAt: req.createdAt,
          departmentName: deptName,
          section: req.departmentSection || 'General',
          requester: req.user.fullName || req.user.username,
          approvedBy: req.approvedBy ? req.approvedBy.fullName || req.approvedBy.username : 'Pendiente',
          status: req.status,
          priority: req.priority,
          justification: req.justification,
          weeklyTokenCycle: req.weeklyTokenCycle,
          items: itemsList,
        };
      });

      return {
        reportType: 'DEPARTMENT_CONSUMPTION',
        generatedAt: now,
        totalRecords: rows.length,
        summary: {
          totalRequests: requests.length,
          totalItemsDispatched: Number(totalItemsDispatched.toFixed(2)),
          departmentBreakdown: Array.from(deptMap.entries()).map(([dept, data]) => ({
            department: dept,
            totalRequests: data.totalRequests,
            totalDispatched: Number(data.totalDispatched.toFixed(2)),
          })),
        },
        rows,
      };
    }

    // 4. REPORTE DE EXISTENCIAS, LOTES Y VENCIMIENTOS
    const batchWhere: any = {};
    if (filters.status && Object.values(BatchStatus).includes(filters.status as any)) {
      batchWhere.status = filters.status as BatchStatus;
    }
    if (filters.productId) {
      batchWhere.productId = BigInt(filters.productId);
    }
    if (filters.categoryId) {
      batchWhere.product = { categoryId: filters.categoryId };
    }
    if (filters.search) {
      batchWhere.OR = [
        { lotNumber: { contains: filters.search, mode: 'insensitive' } },
        { product: { name: { contains: filters.search, mode: 'insensitive' } } },
        { product: { sku: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const batches = await prisma.stockBatch.findMany({
      where: batchWhere,
      include: {
        product: { include: { category: true, baseUnit: true } },
        location: true,
      },
      orderBy: [{ expirationDate: 'asc' }, { createdAt: 'desc' }],
      take: 1000,
    });

    let totalBatches = 0;
    let totalStockValueUsd = 0;
    let expiredCount = 0;
    let within30DaysCount = 0;
    let within60DaysCount = 0;
    let within90DaysCount = 0;

    const rows = batches.map((b) => {
      totalBatches += 1;
      const qty = Number(b.currentQuantity);
      const cost = Number(b.costPrice);
      const lineValue = qty * cost;
      totalStockValueUsd += lineValue;

      let daysToExpiration: number | null = null;
      let expirationCategory = 'OPTIMO';

      if (b.expirationDate) {
        const diffMs = new Date(b.expirationDate).getTime() - now.getTime();
        daysToExpiration = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (daysToExpiration < 0) {
          expirationCategory = 'VENCIDO';
          expiredCount += 1;
        } else if (daysToExpiration <= 30) {
          expirationCategory = 'DENTRO_DE_30_DIAS';
          within30DaysCount += 1;
        } else if (daysToExpiration <= 60) {
          expirationCategory = 'DENTRO_DE_60_DIAS';
          within60DaysCount += 1;
        } else if (daysToExpiration <= 90) {
          expirationCategory = 'DENTRO_DE_90_DIAS';
          within90DaysCount += 1;
        }
      }

      return {
        id: Number(b.id),
        lotNumber: b.lotNumber,
        productName: b.product.name,
        sku: b.product.sku,
        category: b.product.category?.name || 'General',
        unit: b.product.baseUnit?.abbreviation || b.product.baseUnit?.name || '-',
        location: b.location.name,
        currentQuantity: qty,
        costPrice: Number(cost.toFixed(2)),
        totalValueUsd: Number(lineValue.toFixed(2)),
        expirationDate: b.expirationDate,
        daysToExpiration,
        expirationCategory,
        status: b.status,
      };
    });

    return {
      reportType: 'BATCH_EXPIRATION',
      generatedAt: now,
      totalRecords: rows.length,
      summary: {
        totalBatches,
        totalStockValueUsd: Number(totalStockValueUsd.toFixed(2)),
        expiredCount,
        within30DaysCount,
        within60DaysCount,
        within90DaysCount,
      },
      rows,
    };
  }

  // ==========================================
  // 17. COSTO REAL POR EXAMEN (FASE 4)
  // ==========================================

  static async getCostRealByExam(filter?: {
    startDate?: Date | string;
    endDate?: Date | string;
    labExamId?: number;
  }) {
    const where: any = {
      status: LabWeeklyRunStatus.CLOSED_RECONCILED,
    };

    if (filter?.labExamId) {
      where.labExamId = Number(filter.labExamId);
    }

    if (filter?.startDate || filter?.endDate) {
      where.weekStartDate = {
        ...(filter?.startDate ? { gte: new Date(filter.startDate) } : {}),
      };
      where.weekEndDate = {
        ...(filter?.endDate ? { lte: new Date(filter.endDate) } : {}),
      };
    }

    const runs = await prisma.labWeeklyRun.findMany({
      where,
      include: {
        labExam: { include: { area: true } },
        labArea: true,
        consumptions: {
          include: {
            labReagentUnit: { include: { product: true } },
            externalCalibratorUnit: { include: { product: true } },
          },
        },
      },
      orderBy: { weekStartDate: 'asc' },
    });

    const examMap = new Map<number, any>();

    let grandTotalCost = new Prisma.Decimal(0);
    let grandTotalPatientExams = 0;

    for (const run of runs) {
      const examId = run.labExamId;
      if (!examMap.has(examId)) {
        examMap.set(examId, {
          examId: run.labExam.id,
          examCode: run.labExam.code,
          examName: run.labExam.name,
          areaId: run.labArea.id,
          areaName: run.labArea.name,
          totalRuns: 0,
          totalValidPatientExams: 0,
          totalRunCost: new Prisma.Decimal(0),
          effectiveCostPerExam: new Prisma.Decimal(0),
          usesBreakdown: {
            patientUses: 0,
            repeatUses: 0,
            calibratorUses: 0,
            controlUses: 0,
            wasteUses: 0,
            totalDeductedUses: 0,
          },
          repeatReasons: {} as Record<string, number>,
          runs: [] as any[],
        });
      }

      const examStat = examMap.get(examId);
      examStat.totalRuns += 1;
      examStat.totalValidPatientExams += run.totalValidPatientExams;
      examStat.totalRunCost = examStat.totalRunCost.add(run.totalRunCost);

      grandTotalCost = grandTotalCost.add(run.totalRunCost);
      grandTotalPatientExams += run.totalValidPatientExams;

      for (const c of run.consumptions) {
        examStat.usesBreakdown.patientUses += c.patientUses;
        examStat.usesBreakdown.repeatUses += c.repeatUses;
        examStat.usesBreakdown.calibratorUses += c.calibratorUses;
        examStat.usesBreakdown.controlUses += c.controlUses;
        examStat.usesBreakdown.wasteUses += c.wasteUses;
        examStat.usesBreakdown.totalDeductedUses += c.totalDeductedUses;

        if (c.repeatReason) {
          examStat.repeatReasons[c.repeatReason] =
            (examStat.repeatReasons[c.repeatReason] || 0) + c.repeatUses;
        }
      }

      examStat.runs.push({
        id: run.id,
        code: run.code,
        weekStartDate: run.weekStartDate,
        weekEndDate: run.weekEndDate,
        totalValidPatientExams: run.totalValidPatientExams,
        totalRunCost: run.totalRunCost,
        effectiveCostPerExam: run.effectiveCostPerExam,
      });
    }

    const exams = Array.from(examMap.values()).map((e) => {
      const avgCost =
        e.totalValidPatientExams > 0
          ? e.totalRunCost.div(e.totalValidPatientExams)
          : new Prisma.Decimal(0);
      return {
        ...e,
        effectiveCostPerExam: Number(avgCost.toFixed(4)),
        totalRunCost: Number(e.totalRunCost.toFixed(4)),
      };
    });

    const overallAverageCost =
      grandTotalPatientExams > 0
        ? grandTotalCost.div(grandTotalPatientExams)
        : new Prisma.Decimal(0);

    return {
      reportType: 'REAL_COST_BY_EXAM',
      generatedAt: new Date(),
      filter: {
        startDate: filter?.startDate ?? null,
        endDate: filter?.endDate ?? null,
        labExamId: filter?.labExamId ?? null,
      },
      summary: {
        totalExamsEvaluated: exams.length,
        totalRunsProcessed: runs.length,
        grandTotalPatientExams,
        grandTotalCost: Number(grandTotalCost.toFixed(4)),
        overallAverageCostPerExam: Number(overallAverageCost.toFixed(4)),
      },
      exams,
    };
  }

  // ==========================================
  // 18. CONSOLIDADO FINANCIERO POR ÁREA (FASE 4)
  // ==========================================

  static async getFinancialConsolidatedByArea(filter?: {
    startDate?: Date | string;
    endDate?: Date | string;
    labAreaId?: number;
  }) {
    const areas = await prisma.labArea.findMany({
      where: {
        ...(filter?.labAreaId ? { id: Number(filter.labAreaId) } : {}),
      },
      orderBy: { name: 'asc' },
    });

    const dateFilterRuns: any = {};
    if (filter?.startDate || filter?.endDate) {
      dateFilterRuns.weekStartDate = {
        ...(filter?.startDate ? { gte: new Date(filter.startDate) } : {}),
      };
      dateFilterRuns.weekEndDate = {
        ...(filter?.endDate ? { lte: new Date(filter.endDate) } : {}),
      };
    }

    let overallClinicalExpenditure = new Prisma.Decimal(0);
    let overallResearchExpenditure = new Prisma.Decimal(0);

    const consolidatedAreas = [];

    for (const area of areas) {
      // 1. Corridas clínicas cerradas en esta área
      const closedRuns = await prisma.labWeeklyRun.findMany({
        where: {
          labAreaId: area.id,
          status: LabWeeklyRunStatus.CLOSED_RECONCILED,
          ...dateFilterRuns,
        },
        include: {
          labExam: true,
        },
      });

      let clinicalAreaCost = new Prisma.Decimal(0);
      let clinicalAreaPatientExams = 0;
      const examDistributionMap = new Map<string, { examName: string; runsCount: number; cost: Prisma.Decimal }>();

      for (const run of closedRuns) {
        clinicalAreaCost = clinicalAreaCost.add(run.totalRunCost);
        clinicalAreaPatientExams += run.totalValidPatientExams;

        const examCode = run.labExam.code;
        if (!examDistributionMap.has(examCode)) {
          examDistributionMap.set(examCode, {
            examName: run.labExam.name,
            runsCount: 0,
            cost: new Prisma.Decimal(0),
          });
        }
        const dist = examDistributionMap.get(examCode)!;
        dist.runsCount += 1;
        dist.cost = dist.cost.add(run.totalRunCost);
      }

      // 2. Inventario activo en nevera para esta área
      const activeUnits = await prisma.labReagentUnit.findMany({
        where: {
          assignedLabAreaId: area.id,
          status: { in: [LabUnitStatus.SELLADO, LabUnitStatus.EN_USO] },
        },
      });

      let activeUnitsRemainingUses = 0;
      let activeUnitsEstimatedValue = new Prisma.Decimal(0);
      for (const u of activeUnits) {
        activeUnitsRemainingUses += u.remainingUses;
        const val = new Prisma.Decimal(u.remainingUses).mul(u.unitCostPerUse);
        activeUnitsEstimatedValue = activeUnitsEstimatedValue.add(val);
      }

      // 3. Investigación vinculada o ejecutada
      // Consumo de materiales en ensayos de investigación (LabConsumptionAuditLog)
      const auditDateFilter =
        filter?.startDate || filter?.endDate
          ? {
              createdAt: {
                ...(filter?.startDate ? { gte: new Date(filter.startDate) } : {}),
                ...(filter?.endDate ? { lte: new Date(filter.endDate) } : {}),
              },
            }
          : {};

      const researchAuditLogs = await prisma.labConsumptionAuditLog.findMany({
        where: {
          researchTrialId: { not: null },
          ...auditDateFilter,
        },
      });

      let researchMaterialsCost = new Prisma.Decimal(0);
      for (const log of researchAuditLogs) {
        researchMaterialsCost = researchMaterialsCost.add(log.costImpact);
      }

      overallClinicalExpenditure = overallClinicalExpenditure.add(clinicalAreaCost);
      overallResearchExpenditure = overallResearchExpenditure.add(researchMaterialsCost);

      consolidatedAreas.push({
        areaId: area.id,
        areaCode: area.code,
        areaName: area.name,
        clinical: {
          closedRunsCount: closedRuns.length,
          totalValidPatientExams: clinicalAreaPatientExams,
          totalCost: Number(clinicalAreaCost.toFixed(4)),
          examDistribution: Array.from(examDistributionMap.entries()).map(([code, d]) => ({
            examCode: code,
            examName: d.examName,
            runsCount: d.runsCount,
            cost: Number(d.cost.toFixed(4)),
          })),
          activeFridgeStock: {
            unitsCount: activeUnits.length,
            remainingUses: activeUnitsRemainingUses,
            estimatedValueUsd: Number(activeUnitsEstimatedValue.toFixed(2)),
          },
        },
        research: {
          consumedMaterialsValueUsd: Number(researchMaterialsCost.toFixed(4)),
        },
        totalOperatingCost: Number(clinicalAreaCost.add(researchMaterialsCost).toFixed(4)),
      });
    }

    return {
      reportType: 'FINANCIAL_CONSOLIDATED_BY_AREA',
      generatedAt: new Date(),
      totals: {
        clinicalExpenditure: Number(overallClinicalExpenditure.toFixed(4)),
        researchExpenditure: Number(overallResearchExpenditure.toFixed(4)),
        grandTotalExpenditure: Number(overallClinicalExpenditure.add(overallResearchExpenditure).toFixed(4)),
      },
      areas: consolidatedAreas,
    };
  }

  // ==========================================
  // 19. TRAZABILIDAD PUNTA A PUNTA (FASE 4)
  // ==========================================

  static async getItemTraceability(identifier: {
    batchId?: bigint | number | string;
    productId?: bigint | number | string;
    lotNumber?: string;
  }) {
    const where: any = {};
    if (identifier.batchId) {
      where.id = BigInt(identifier.batchId);
    } else if (identifier.lotNumber) {
      where.lotNumber = String(identifier.lotNumber);
    } else if (identifier.productId) {
      where.productId = BigInt(identifier.productId);
    } else {
      throw new Error('Debe proporcionar batchId, productId o lotNumber para la trazabilidad');
    }

    const batches = await prisma.stockBatch.findMany({
      where,
      include: {
        product: {
          include: {
            baseUnit: true,
            category: true,
            brand: true,
          },
        },
        location: true,
        movementItems: {
          include: {
            stockMovement: {
              include: {
                order: {
                  include: {
                    supplier: true,
                    requisition: true,
                    invoices: true,
                    payments: true,
                  },
                },
                createdBy: { select: { id: true, fullName: true, username: true } },
              },
            },
          },
        },
        labReagentUnits: {
          include: {
            fridge: true,
            assignedLabArea: true,
            researchProject: true,
            internalRequestItems: {
              include: {
                request: {
                  include: {
                    labArea: true,
                    requestedBy: { select: { id: true, fullName: true, username: true } },
                    reviewedBy: { select: { id: true, fullName: true, username: true } },
                  },
                },
              },
            },
            runConsumptionsAsPrimary: {
              include: {
                run: {
                  include: {
                    labExam: true,
                    labArea: true,
                    bioanalyst: { select: { id: true, fullName: true, username: true } },
                  },
                },
              },
            },
            runConsumptionsAsCalibrator: {
              include: {
                run: {
                  include: {
                    labExam: true,
                    labArea: true,
                    bioanalyst: { select: { id: true, fullName: true, username: true } },
                  },
                },
              },
            },
            trialConsumptionsAsPrimary: {
              include: {
                trial: {
                  include: {
                    project: true,
                    executedBy: { select: { id: true, fullName: true, username: true } },
                  },
                },
              },
            },
            trialConsumptionsAsCalibrator: {
              include: {
                trial: {
                  include: {
                    project: true,
                    executedBy: { select: { id: true, fullName: true, username: true } },
                  },
                },
              },
            },
            consumptionAuditLogs: {
              include: {
                user: { select: { id: true, fullName: true, username: true } },
                labArea: true,
                labExam: true,
                weeklyRun: true,
                researchTrial: true,
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        incidents: {
          include: {
            reportedBy: { select: { id: true, fullName: true, username: true } },
            resolvedBy: { select: { id: true, fullName: true, username: true } },
          },
        },
      },
    });

    if (!batches || batches.length === 0) {
      throw new Error('No se encontró información de trazabilidad para el criterio especificado');
    }

    const batch = batches[0];
    if (!batch) {
      throw new Error('No se encontró información de trazabilidad para el criterio especificado');
    }

    // 1. Lo que se pidió (Requisiciones y Órdenes)
    const procurementMovements = batch.movementItems.filter(
      (m) => m.stockMovement.order !== null
    );

    const procurement = procurementMovements.map((pm) => {
      const order = pm.stockMovement.order!;
      return {
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderStatus: order.status,
        supplierName: order.supplier?.name || 'Proveedor no especificado',
        supplierTaxId: order.supplier?.rifOrId || null,
        requisitionNumber: order.requisition?.requisitionNumber || null,
        requisitionJustification: order.requisition?.justification || null,
        currency: order.currency,
        unitPricePaid: pm.unitCost,
        quantityOrdered: pm.quantity,
        invoices: order.invoices.map((inv) => ({
          invoiceNumber: inv.invoiceNumber,
          issueDate: inv.invoiceDate,
          totalAmount: inv.totalAmount,
        })),
        payments: order.payments.map((p) => ({
          method: p.method,
          amountPaid: p.amountPaid,
          paymentDate: p.paymentDate,
        })),
      };
    });

    // 2. Lo que se compró / recibió en almacén central
    const warehouseReception = {
      batchId: batch.id,
      lotNumber: batch.lotNumber,
      productName: batch.product.name,
      sku: batch.product.sku,
      category: batch.product.category?.name || 'General',
      currentStockQuantity: batch.currentQuantity,
      unitCostPrice: batch.costPrice,
      origin: batch.origin,
      ownershipType: batch.ownershipType,
      receptionLocation: batch.location.name,
      expirationDate: batch.expirationDate,
      status: batch.status,
    };

    // 3. Lo que se solicitó a nevera (Solicitudes Internas)
    const internalRequests: any[] = [];
    const requestSet = new Set<string>();

    for (const unit of batch.labReagentUnits) {
      for (const reqItem of unit.internalRequestItems) {
        const req = reqItem.request;
        if (!requestSet.has(req.code)) {
          requestSet.add(req.code);
          internalRequests.push({
            requestCode: req.code,
            status: req.status,
            labArea: req.labArea.name,
            requestedBy: req.requestedBy.fullName,
            reviewedBy: req.reviewedBy?.fullName || null,
            justification: req.justification,
            createdAt: req.createdAt,
            resolvedAt: req.resolvedAt,
          });
        }
      }
    }

    // 4. Lo que se usó y justificó en laboratorio / investigación
    const labUnitsDetail = batch.labReagentUnits.map((u) => ({
      unitId: u.id,
      unitCode: u.unitCode,
      fridge: u.fridge ? `${u.fridge.name} (${u.fridge.code})` : 'Sin nevera asignada',
      assignedArea: u.assignedLabArea?.name || 'Sin área asignada',
      researchProject: u.researchProject ? `${u.researchProject.code} - ${u.researchProject.title}` : null,
      initialTheoreticalUses: u.initialTheoreticalUses,
      remainingUses: u.remainingUses,
      consumedUses: u.consumedUses,
      yieldVariance: u.yieldVariance,
      unitCostPerUse: u.unitCostPerUse,
      referenceCostPerUse: u.referenceCostPerUse,
      status: u.status,
    }));

    const weeklyRunsList: any[] = [];
    const researchTrialsList: any[] = [];
    const auditEvents: any[] = [];

    for (const unit of batch.labReagentUnits) {
      for (const rc of [...unit.runConsumptionsAsPrimary, ...unit.runConsumptionsAsCalibrator]) {
        weeklyRunsList.push({
          runCode: rc.run.code,
          examName: rc.run.labExam.name,
          labArea: rc.run.labArea.name,
          bioanalyst: rc.run.bioanalyst.fullName,
          status: rc.run.status,
          weekStartDate: rc.run.weekStartDate,
          weekEndDate: rc.run.weekEndDate,
          totalDeductedUses: rc.totalDeductedUses,
          patientUses: rc.patientUses,
          repeatUses: rc.repeatUses,
          repeatReason: rc.repeatReason,
          calibratorUses: rc.calibratorUses,
          controlUses: rc.controlUses,
          wasteUses: rc.wasteUses,
          calculatedCost: rc.calculatedCost,
        });
      }

      for (const tc of [...unit.trialConsumptionsAsPrimary, ...unit.trialConsumptionsAsCalibrator]) {
        researchTrialsList.push({
          trialCode: tc.trial.code,
          trialTitle: tc.trial.title,
          projectCode: tc.trial.project.code,
          executedBy: tc.trial.executedBy.fullName,
          status: tc.trial.status,
          trialDate: tc.trial.trialDate,
          totalDeductedUses: tc.totalDeductedUses,
          sampleUses: tc.sampleUses,
          repeatUses: tc.repeatUses,
          repeatReason: tc.repeatReason,
          calibratorUses: tc.calibratorUses,
          controlUses: tc.controlUses,
          wasteUses: tc.wasteUses,
          calculatedCost: tc.calculatedCost,
          calculatedReferenceValue: tc.calculatedReferenceValue,
        });
      }

      for (const log of unit.consumptionAuditLogs) {
        auditEvents.push({
          auditId: log.id,
          createdAt: log.createdAt,
          concept: log.concept,
          usesCount: log.usesCount,
          costImpact: log.costImpact,
          performedBy: log.user.fullName,
          context: log.weeklyRun
            ? `Corrida ${log.weeklyRun.code}`
            : log.researchTrial
            ? `Ensayo ${log.researchTrial.code}`
            : 'Ajuste / Recuento',
          notes: log.notes,
        });
      }
    }

    return {
      reportType: 'END_TO_END_TRACEABILITY',
      generatedAt: new Date(),
      product: {
        id: batch.product.id,
        name: batch.product.name,
        sku: batch.product.sku,
        theoreticalYield: batch.product.theoreticalYield,
        unitOfMeasure: batch.product.baseUnit.abbreviation,
      },
      lifecycle: {
        phase1_procurement: procurement,
        phase2_warehouseReception: warehouseReception,
        phase3_internalRequests: internalRequests,
        phase4_consumptionAndExecution: {
          units: labUnitsDetail,
          weeklyRuns: weeklyRunsList,
          researchTrials: researchTrialsList,
          auditHistory: auditEvents,
        },
      },
    };
  }
}
