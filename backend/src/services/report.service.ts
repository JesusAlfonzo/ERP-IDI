import { prisma } from '../config/prisma.js';
import {
  BatchStatus,
  LabUnitStatus,
  LabMovementType,
  OrderStatus,
  StockMovementType,
  RequestStatus,
  PaymentStatus,
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
}
