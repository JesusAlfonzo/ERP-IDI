import { prisma } from '../config/prisma.js';
import {
  RequestStatus,
  OrderStatus,
  BatchStatus,
  StockMovementType,
  PaymentStatus,
  PurchaseRequisitionStatus,
} from '@prisma/client';

export interface DashboardUserContext {
  id: number;
  roles: string[];
  department?: string;
}

export interface SystemNotification {
  id: string;
  type: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
  title: string;
  message: string;
  link: string;
  createdAt: string;
}

export class DashboardService {
  static async getNotifications(
    user: DashboardUserContext,
    dismissedIds: string[] = []
  ): Promise<SystemNotification[]> {
    const notificationsMap = new Map<string, SystemNotification>();
    const addNotif = (notif: SystemNotification) => {
      if (!dismissedIds.includes(notif.id) && !notificationsMap.has(notif.id)) {
        notificationsMap.set(notif.id, notif);
      }
    };

    const isExecutive =
      user.roles.includes('ADMINISTRADOR') ||
      user.roles.includes('COORDINADOR');
    const isStaff = isExecutive || user.roles.includes('ALMACENISTA');
    const isPurchasing = isExecutive || user.roles.includes('COMPRAS');
    const isFinance = isExecutive || user.roles.includes('ADMINISTRACION');

    // Ventana de eventos recientes (últimos 14 días) para notificaciones de eventos individuales
    const recentCutoff = new Date();
    recentCutoff.setDate(recentCutoff.getDate() - 14);

    // 1. Notificaciones personales del propio usuario (Solicitudes y Preórdenes creadas por él)
    const [myRecentRequests, myRecentPreorders] = await Promise.all([
      prisma.request.findMany({
        where: {
          userId: user.id,
          status: {
            in: [
              RequestStatus.APROBADA,
              RequestStatus.DESPACHADA_PARCIAL,
              RequestStatus.RECHAZADA,
              RequestStatus.COMPLETADA,
            ],
          },
          updatedAt: { gte: recentCutoff },
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
      prisma.purchaseRequisition.findMany({
        where: {
          createdById: user.id,
          status: {
            in: [
              PurchaseRequisitionStatus.EN_COTIZACION,
              PurchaseRequisitionStatus.ADJUDICADA,
              PurchaseRequisitionStatus.CANCELADA,
            ],
          },
          updatedAt: { gte: recentCutoff },
        },
        include: { department: true },
        orderBy: { updatedAt: 'desc' },
        take: 15,
      }),
    ]);

    for (const req of myRecentRequests) {
      if (req.status === RequestStatus.APROBADA) {
        addNotif({
          id: `req-app-${req.id}`,
          type: 'SUCCESS',
          title: `Solicitud #${req.requestNumber} Aprobada`,
          message:
            'Tu solicitud fue autorizada y está lista para despacho en almacén.',
          link: `/requests/${req.id}`,
          createdAt: req.updatedAt.toISOString(),
        });
      } else if (req.status === RequestStatus.DESPACHADA_PARCIAL) {
        addNotif({
          id: `req-par-${req.id}`,
          type: 'INFO',
          title: `Despacho Parcial · #${req.requestNumber}`,
          message: 'Se realizó una entrega parcial de los insumos solicitados.',
          link: `/requests/${req.id}`,
          createdAt: req.updatedAt.toISOString(),
        });
      } else if (req.status === RequestStatus.RECHAZADA) {
        addNotif({
          id: `req-rej-${req.id}`,
          type: 'ALERT',
          title: `Solicitud #${req.requestNumber} Rechazada`,
          message:
            req.notes || 'La solicitud no fue aprobada por almacén o dirección.',
          link: `/requests/${req.id}`,
          createdAt: req.updatedAt.toISOString(),
        });
      } else if (req.status === RequestStatus.COMPLETADA) {
        addNotif({
          id: `req-cmp-${req.id}`,
          type: 'SUCCESS',
          title: `Solicitud #${req.requestNumber} Entregada`,
          message: 'Los insumos solicitados ya fueron despachados.',
          link: `/requests/${req.id}`,
          createdAt: req.updatedAt.toISOString(),
        });
      }
    }

    for (const pr of myRecentPreorders) {
      const statusLabel =
        pr.status === 'ADJUDICADA'
          ? 'Adjudicada'
          : pr.status === 'EN_COTIZACION'
            ? 'En Cotización'
            : 'Cancelada';
      addNotif({
        id: `my-pre-${pr.id}-${pr.status}`,
        type:
          pr.status === 'ADJUDICADA'
            ? 'SUCCESS'
            : pr.status === 'CANCELADA'
              ? 'ALERT'
              : 'INFO',
        title: `Preorden #${pr.requisitionNumber} ${statusLabel}`,
        message: `Tu requerimiento de compra (${pr.department.name}) cambió a estado ${statusLabel}.`,
        link: `/purchasing/requisitions/${pr.id}`,
        createdAt: pr.updatedAt.toISOString(),
      });
    }

    // 2. Notificaciones en tiempo real para COMPRAS (Nuevas Preórdenes, Recepciones y Stock Crítico)
    if (isPurchasing) {
      const [activePreorders, receivedOrders, products] = await Promise.all([
        prisma.purchaseRequisition.findMany({
          where: {
            status: {
              in: [
                PurchaseRequisitionStatus.BORRADOR,
                PurchaseRequisitionStatus.EN_COTIZACION,
              ],
            },
            createdAt: { gte: recentCutoff },
          },
          include: {
            department: true,
            createdBy: { select: { id: true, fullName: true, username: true } },
            items: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),
        prisma.order.findMany({
          where: {
            status: { in: [OrderStatus.PARCIAL, OrderStatus.COMPLETADA] },
            updatedAt: { gte: recentCutoff },
          },
          include: { supplier: true },
          orderBy: { updatedAt: 'desc' },
          take: 12,
        }),
        prisma.product.findMany({
          where: { isActive: true },
          select: {
            id: true,
            minStockAlert: true,
            stockBatches: {
              where: { status: BatchStatus.DISPONIBLE },
              select: { currentQuantity: true },
            },
          },
        }),
      ]);

      for (const pr of activePreorders) {
        const creatorName =
          pr.createdBy.fullName || pr.createdBy.username || 'Usuario';
        const isQuoting = pr.status === 'EN_COTIZACION';
        addNotif({
          id: `pre-buy-${pr.id}-${pr.status}`,
          type: isQuoting ? 'INFO' : 'WARNING',
          title: isQuoting
            ? `Preorden #${pr.requisitionNumber} en Cotización`
            : `Nueva Preorden #${pr.requisitionNumber}`,
          message: `${creatorName} (${pr.department.name}) solicitó ${pr.items.length} insumo(s): ${pr.justification}`,
          link: `/purchasing/requisitions/${pr.id}`,
          createdAt: pr.updatedAt.toISOString(),
        });
      }

      for (const ord of receivedOrders) {
        addNotif({
          id: `ord-rec-${ord.id}-${ord.status}`,
          type: 'SUCCESS',
          title: `Orden #${ord.orderNumber} Recibida (${ord.status})`,
          message: `Almacén registró la recepción de ${ord.supplier?.name || 'Proveedor'}.`,
          link: `/purchasing/orders/${ord.id}`,
          createdAt: ord.updatedAt.toISOString(),
        });
      }

      const lowStockCount = products.filter((p) => {
        const total = p.stockBatches.reduce(
          (acc, b) => acc + Number(b.currentQuantity),
          0
        );
        return total <= Number(p.minStockAlert);
      }).length;

      if (lowStockCount > 0) {
        addNotif({
          id: `pur-low-stock-${lowStockCount}`,
          type: 'ALERT',
          title: `${lowStockCount} Insumo(s) en Stock Crítico`,
          message:
            'Alcanzaron el stock mínimo y requieren reposición o preorden.',
          link: '/inventory/products?lowStockOnly=true',
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 3. Notificaciones en tiempo real para ALMACÉN (Nuevas Solicitudes, Despachos, Órdenes por Recibir, Lotes)
    if (isStaff) {
      const sixtyDays = new Date();
      sixtyDays.setDate(sixtyDays.getDate() + 60);

      const [
        pendingRequests,
        approvedForDispatch,
        incomingOrders,
        quarantineCount,
        expiringCount,
      ] = await Promise.all([
        prisma.request.findMany({
          where: {
            status: RequestStatus.PENDIENTE,
            createdAt: { gte: recentCutoff },
          },
          include: {
            department: true,
            user: { select: { fullName: true, username: true } },
            items: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 15,
        }),
        prisma.request.findMany({
          where: {
            status: {
              in: [RequestStatus.APROBADA, RequestStatus.DESPACHADA_PARCIAL],
            },
            updatedAt: { gte: recentCutoff },
          },
          include: { department: true, items: true },
          orderBy: { updatedAt: 'desc' },
          take: 12,
        }),
        prisma.order.findMany({
          where: {
            status: OrderStatus.ENVIADA,
            updatedAt: { gte: recentCutoff },
          },
          include: { supplier: true, items: true },
          orderBy: { updatedAt: 'desc' },
          take: 10,
        }),
        prisma.stockBatch.count({
          where: {
            status: BatchStatus.EN_CUARENTENA,
            currentQuantity: { gt: 0 },
          },
        }),
        prisma.stockBatch.count({
          where: {
            status: BatchStatus.DISPONIBLE,
            currentQuantity: { gt: 0 },
            expirationDate: { lte: sixtyDays },
          },
        }),
      ]);

      for (const req of pendingRequests) {
        const reqUser = req.user.fullName || req.user.username;
        addNotif({
          id: `req-new-${req.id}`,
          type: 'WARNING',
          title: `Nueva Solicitud #${req.requestNumber}`,
          message: `${reqUser} (${req.department.name}) solicitó ${req.items.length} insumo(s).`,
          link: `/requests/${req.id}`,
          createdAt: req.createdAt.toISOString(),
        });
      }

      for (const req of approvedForDispatch) {
        addNotif({
          id: `req-disp-${req.id}-${req.status}`,
          type: 'INFO',
          title: `Por Despachar · #${req.requestNumber}`,
          message: `Pedido de ${req.department.name} (${req.items.length} renglones) listo para entrega.`,
          link: '/requests/dispatch',
          createdAt: req.updatedAt.toISOString(),
        });
      }

      for (const ord of incomingOrders) {
        addNotif({
          id: `ord-inc-${ord.id}`,
          type: 'INFO',
          title: `Orden #${ord.orderNumber} por Recibir`,
          message: `Proveedor: ${ord.supplier?.name || 'General'} (${ord.items.length} insumos en tránsito).`,
          link: `/purchasing/orders/${ord.id}`,
          createdAt: ord.updatedAt.toISOString(),
        });
      }

      if (quarantineCount > 0) {
        addNotif({
          id: `alm-quarantine-${quarantineCount}`,
          type: 'ALERT',
          title: `${quarantineCount} Lote(s) en Cuarentena`,
          message: 'Lotes retenidos esperando revisión y dictamen.',
          link: '/quality/quarantine',
          createdAt: new Date().toISOString(),
        });
      }

      if (expiringCount > 0) {
        addNotif({
          id: `alm-expiring-${expiringCount}`,
          type: 'WARNING',
          title: `${expiringCount} Lote(s) por Vencer (< 60 días)`,
          message: 'Priorizar despacho FIFO para evitar vencimientos.',
          link: '/inventory/kardex',
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 4. Notificaciones en tiempo real para PAGOS / FINANZAS (Nuevas Órdenes por Pagar y Preórdenes Adjudicadas)
    if (isFinance) {
      const [unpaidOrders, awardedPreorders] = await Promise.all([
        prisma.order.findMany({
          where: {
            status: {
              in: [
                OrderStatus.ENVIADA,
                OrderStatus.PARCIAL,
                OrderStatus.COMPLETADA,
              ],
            },
            paymentStatus: {
              in: [PaymentStatus.PENDIENTE, PaymentStatus.PAGADO_PARCIAL],
            },
            createdAt: { gte: recentCutoff },
          },
          include: { supplier: true },
          orderBy: { createdAt: 'desc' },
          take: 12,
        }),
        prisma.purchaseRequisition.findMany({
          where: {
            status: PurchaseRequisitionStatus.ADJUDICADA,
            updatedAt: { gte: recentCutoff },
          },
          include: { department: true },
          orderBy: { updatedAt: 'desc' },
          take: 10,
        }),
      ]);

      for (const ord of unpaidOrders) {
        addNotif({
          id: `fin-debt-${ord.id}-${ord.paymentStatus}`,
          type: 'WARNING',
          title: `Cuenta por Pagar · OC #${ord.orderNumber}`,
          message: `Proveedor: ${ord.supplier?.name || 'General'} · Total: $${Number(ord.total || 0).toFixed(2)} USD (${ord.paymentStatus}).`,
          link: '/purchasing/debts',
          createdAt: ord.updatedAt.toISOString(),
        });
      }

      for (const pr of awardedPreorders) {
        addNotif({
          id: `fin-pre-adj-${pr.id}`,
          type: 'INFO',
          title: `Preorden #${pr.requisitionNumber} Adjudicada`,
          message: `Requerimiento de ${pr.department.name} convertido en orden de compra.`,
          link: `/purchasing/requisitions/${pr.id}`,
          createdAt: pr.updatedAt.toISOString(),
        });
      }
    }

    return Array.from(notificationsMap.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  static async getDashboardMetrics(user: DashboardUserContext) {
    const roles = user.roles;
    const isExecutive =
      roles.includes('ADMINISTRADOR') || roles.includes('COORDINADOR');
    const isRequester =
      isExecutive ||
      roles.includes('SOLICITANTE') ||
      roles.includes('LABORATORIO') ||
      roles.includes('BIOANALISTA') ||
      roles.includes('COORDINADOR_LABORATORIO') ||
      roles.includes('INVESTIGACION') ||
      roles.includes('DOCENCIA');
    const isStaff = isExecutive || roles.includes('ALMACENISTA');
    const isPurchasing =
      isExecutive ||
      roles.includes('COMPRAS') ||
      roles.includes('ADMINISTRACION');

    const result: Record<string, unknown> = {};

    // Obtener tasas oficiales para cálculos multimoneda
    const currencies = await prisma.currency.findMany({
      include: {
        exchanges: {
          orderBy: [{ effectiveDate: 'desc' }, { id: 'desc' }],
          take: 1,
        },
      },
    });
    const vesCurr = currencies.find((c) => c.code === 'VES' || c.code === 'VED');
    const eurCurr = currencies.find((c) => c.code === 'EUR');
    const bcvUsd = vesCurr?.exchanges[0]?.rate
      ? Number(vesCurr.exchanges[0].rate)
      : 75.0;
    const bcvEur = eurCurr?.exchanges[0]?.rate
      ? Number(eurCurr.exchanges[0].rate)
      : 81.5;

    // Función auxiliar para calcular compra y deuda en USD de una orden
    const computeOrderUsd = (ord: {
      currency: string | null;
      total: unknown;
      totalAmountUsd: unknown;
      totalAmountBs: unknown;
      payments: Array<{
        transactionCurrency: string | null;
        currencyId: number | null;
        amountPaid: unknown;
        amount: unknown;
        exchangeRate: unknown;
        amortizedAmountUsd: unknown;
      }>;
    }) => {
      let orderCurrency = (ord.currency || 'USD').trim().toUpperCase();
      if (orderCurrency === 'VES') orderCurrency = 'VED';

      const totalAgreed = Number(
        orderCurrency === 'VED'
          ? Number(ord.totalAmountBs) > 0
            ? ord.totalAmountBs
            : ord.total
          : orderCurrency === 'EUR'
            ? ord.total
            : Number(ord.totalAmountUsd) > 0
              ? ord.totalAmountUsd
              : ord.total
      );

      const orderTotalUsd = Number(
        Number(ord.totalAmountUsd) > 0
          ? ord.totalAmountUsd
          : orderCurrency === 'USD'
            ? totalAgreed
            : orderCurrency === 'EUR'
              ? bcvUsd > 0
                ? (totalAgreed * bcvEur) / bcvUsd
                : totalAgreed
              : bcvUsd > 0
                ? totalAgreed / bcvUsd
                : totalAgreed
      );

      let paidUsd = 0;
      for (const p of ord.payments) {
        let pCurr = (
          p.transactionCurrency || (p.currencyId === 1 ? 'USD' : 'VED')
        )
          .trim()
          .toUpperCase();
        if (pCurr === 'VES') pCurr = 'VED';

        const pAmt = Number(p.amountPaid ?? p.amount ?? 0);
        const pRate = Number(p.exchangeRate || 1.0);
        const pAmortUsd = Number(p.amortizedAmountUsd || 0);

        if (pAmortUsd > 0) {
          paidUsd += pAmortUsd;
        } else if (pCurr === 'USD') {
          paidUsd += pAmt;
        } else if (pCurr === 'VED' && pRate > 0) {
          paidUsd += pAmt / pRate;
        } else if (pCurr === 'EUR') {
          const rateEur = pRate > 0 ? pRate : bcvEur;
          paidUsd += bcvUsd > 0 ? (pAmt * rateEur) / bcvUsd : pAmt;
        } else {
          paidUsd += pAmt;
        }
      }

      paidUsd = Math.round(paidUsd * 100) / 100;
      const totalUsdRounded = Math.round(orderTotalUsd * 100) / 100;
      const pendingUsd = Math.max(
        0,
        Math.round((totalUsdRounded - paidUsd) * 100) / 100
      );

      return {
        orderCurrency,
        totalAgreed,
        totalUsd: totalUsdRounded,
        paidUsd,
        pendingUsd,
      };
    };

    // 1. ÁREA CLÍNICA / SOLICITANTE
    if (isRequester) {
      const [
        myStatusGroups,
        myRecentRequestsList,
        windowConfig,
      ] = await Promise.all([
        prisma.request.groupBy({
          by: ['status'],
          where: { userId: user.id },
          _count: { _all: true },
        }),
        prisma.request.findMany({
          where: { userId: user.id },
          include: {
            department: true,
            items: {
              include: { product: { include: { baseUnit: true } } },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 8,
        }),
        prisma.requestWindowConfig.findFirst(),
      ]);

      const countsByStatus: Record<string, number> = {
        PENDIENTE: 0,
        APROBADA: 0,
        DESPACHADA_PARCIAL: 0,
        COMPLETADA: 0,
        RECHAZADA: 0,
      };
      let totalMyRequests = 0;
      for (const grp of myStatusGroups) {
        countsByStatus[grp.status] = grp._count._all;
        totalMyRequests += grp._count._all;
      }

      result.userSection = {
        totalMyRequests,
        pendingMyRequests: countsByStatus.PENDIENTE ?? 0,
        approvedMyRequests:
          (countsByStatus.APROBADA ?? 0) +
          (countsByStatus.DESPACHADA_PARCIAL ?? 0),
        completedMyRequests: countsByStatus.COMPLETADA ?? 0,
        rejectedMyRequests: countsByStatus.RECHAZADA ?? 0,
        openVialsInLab: 0,
        department: user.department || 'Área Solicitante',
        windowConfig: windowConfig
          ? {
              isSuspended: windowConfig.isSuspended,
              startDay: windowConfig.startDay,
              startHour: windowConfig.startHour,
              endDay: windowConfig.endDay,
              endHour: windowConfig.endHour,
              maxWeeklyRequestsPerUser: windowConfig.maxWeeklyRequestsPerUser,
            }
          : null,
        recentRequests: myRecentRequestsList.map((r) => {
          const totalRequestedUnits = r.items.reduce(
            (acc, it) => acc + Number(it.quantityRequested),
            0
          );
          const totalDispatchedUnits = r.items.reduce(
            (acc, it) => acc + Number(it.quantityDispatched),
            0
          );
          return {
            id: Number(r.id),
            requestNumber: r.requestNumber,
            departmentName:
              r.departmentSection || r.department?.name || user.department || 'General',
            justification: r.justification,
            status: r.status,
            priority: r.priority,
            createdAt: r.createdAt.toISOString(),
            itemsCount: r.items.length,
            totalRequestedUnits,
            totalDispatchedUnits,
            itemsPreview: r.items.slice(0, 3).map((it) => ({
              name: it.product.name,
              sku: it.product.sku,
              requested: Number(it.quantityRequested),
              dispatched: Number(it.quantityDispatched),
              unit: it.product.baseUnit.abbreviation,
            })),
          };
        }),
      };
    }

    // 2. ÁREA DE ALMACÉN CENTRAL & CALIDAD
    if (isStaff) {
      const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
      const ninetyDaysAhead = new Date();
      ninetyDaysAhead.setDate(ninetyDaysAhead.getDate() + 90);

      const [
        pendingRequests,
        readyToDispatchRequests,
        quarantineBatches,
        movementsToday,
        activeBatches,
        expiringBatchesList,
        allActiveProducts,
        actionableRequestsList,
        recentMovementsList,
        openQuarantineIncidents,
      ] = await Promise.all([
        prisma.request.count({ where: { status: RequestStatus.PENDIENTE } }),
        prisma.request.count({
          where: {
            status: {
              in: [RequestStatus.APROBADA, RequestStatus.DESPACHADA_PARCIAL],
            },
          },
        }),
        prisma.stockBatch.count({
          where: {
            status: BatchStatus.EN_CUARENTENA,
            currentQuantity: { gt: 0 },
          },
        }),
        prisma.stockMovement.count({
          where: { createdAt: { gte: todayStart } },
        }),
        prisma.stockBatch.count({
          where: { status: BatchStatus.DISPONIBLE, currentQuantity: { gt: 0 } },
        }),
        prisma.stockBatch.findMany({
          where: {
            status: BatchStatus.DISPONIBLE,
            currentQuantity: { gt: 0 },
            expirationDate: { lte: ninetyDaysAhead },
          },
          include: {
            product: { include: { baseUnit: true } },
            location: true,
          },
          orderBy: { expirationDate: 'asc' },
          take: 8,
        }),
        prisma.product.findMany({
          where: { isActive: true },
          include: {
            category: true,
            baseUnit: true,
            stockBatches: {
              where: {
                status: BatchStatus.DISPONIBLE,
                currentQuantity: { gt: 0 },
              },
              select: { currentQuantity: true },
            },
          },
        }),
        prisma.request.findMany({
          where: {
            status: {
              in: [
                RequestStatus.PENDIENTE,
                RequestStatus.APROBADA,
                RequestStatus.DESPACHADA_PARCIAL,
              ],
            },
          },
          include: {
            department: true,
            user: { select: { fullName: true, username: true } },
            items: true,
          },
          orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
          take: 7,
        }),
        prisma.stockMovement.findMany({
          where: {
            type: {
              in: [
                StockMovementType.ENTRADA_COMPRA,
                StockMovementType.DESPACHO_SOLICITUD,
                StockMovementType.AJUSTE_INVENTARIO,
                StockMovementType.DESCARTE_MERMA,
              ],
            },
          },
          include: {
            createdBy: { select: { fullName: true, username: true } },
            product: { include: { baseUnit: true } },
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
          orderBy: { createdAt: 'desc' },
          take: 6,
        }),
        prisma.batchIncident.count({ where: { status: 'ABIERTA' } }),
      ]);

      // Clasificación de productos con stock bajo o agotado
      const lowStockProducts = allActiveProducts
        .map((p) => {
          const currentStock = p.stockBatches.reduce(
            (acc, b) => acc + Number(b.currentQuantity),
            0
          );
          const minStock = Number(p.minStockAlert);
          return {
            id: Number(p.id),
            name: p.name,
            sku: p.sku,
            categoryName: p.category.name,
            unitOfMeasure: p.baseUnit.abbreviation,
            currentStock,
            minStock,
            deficit: Math.max(0, minStock - currentStock),
            isOutOfStock: currentStock <= 0,
          };
        })
        .filter((p) => p.currentStock <= p.minStock)
        .sort((a, b) => a.currentStock - b.currentStock);

      const outOfStockCount = lowStockProducts.filter(
        (p) => p.isOutOfStock
      ).length;

      const nowMs = Date.now();

      result.warehouseSection = {
        pendingRequests,
        readyToDispatchRequests,
        quarantineBatches,
        openQuarantineIncidents,
        movementsToday,
        activeBatches,
        lowStockCount: lowStockProducts.length,
        outOfStockCount,
        lowStockItems: lowStockProducts.slice(0, 7),
        actionableRequests: actionableRequestsList.map((r) => ({
          id: Number(r.id),
          requestNumber: r.requestNumber,
          departmentName:
            r.departmentSection || r.department?.name || 'General',
          requesterName: r.user?.fullName || r.user?.username || 'Solicitante',
          status: r.status,
          priority: r.priority,
          itemsCount: r.items.length,
          totalUnitsRequested: r.items.reduce(
            (acc, it) => acc + Number(it.quantityRequested),
            0
          ),
          createdAt: r.createdAt.toISOString(),
        })),
        expiringBatches: expiringBatchesList.map((b) => {
          const expDate = b.expirationDate;
          const daysRemaining = expDate
            ? Math.ceil((expDate.getTime() - nowMs) / (1000 * 60 * 60 * 24))
            : null;
          return {
            id: Number(b.id),
            lotNumber: b.lotNumber,
            productName: b.product.name,
            sku: b.product.sku,
            unitOfMeasure: b.product.baseUnit.abbreviation,
            quantity: Number(b.currentQuantity),
            expirationDate: expDate ? expDate.toISOString() : null,
            daysRemaining,
            location: b.location.name,
          };
        }),
        recentMovements: recentMovementsList.map((m) => {
          const firstItem = m.items[0];
          const prod = firstItem?.batch?.product || m.product;
          const totalQty = m.items.reduce(
            (acc, it) => acc + Number(it.quantity),
            0
          );
          return {
            id: Number(m.id),
            referenceNumber: m.referenceNumber,
            type: m.type,
            productName: prod?.name || 'Movimiento General',
            sku: prod?.sku || '---',
            unitOfMeasure: prod?.baseUnit?.abbreviation || 'UND',
            lotNumber: firstItem?.batch?.lotNumber || null,
            quantity: totalQty,
            performedBy:
              m.createdBy?.fullName || m.createdBy?.username || 'Sistema',
            createdAt: m.createdAt.toISOString(),
          };
        }),
      };
    }

    // 3. ÁREA DE COMPRAS (ABASTECIMIENTO, PREÓRDENES, ÓRDENES Y PROVEEDORES)
    if (isPurchasing) {
      const [
        activeOrders,
        completedOrders,
        pendingRequisitionsCount,
        activeSuppliersCount,
        recentRequisitionsList,
        ordersList,
        suppliersActivityList,
      ] = await Promise.all([
        prisma.order.count({
          where: {
            status: {
              in: [
                OrderStatus.ENVIADA,
                OrderStatus.PARCIAL,
                OrderStatus.BORRADOR,
              ],
            },
          },
        }),
        prisma.order.count({ where: { status: OrderStatus.COMPLETADA } }),
        prisma.purchaseRequisition.count({
          where: { status: { in: ['BORRADOR', 'EN_COTIZACION'] } },
        }),
        prisma.supplier.count({ where: { isActive: true } }),
        prisma.purchaseRequisition.findMany({
          where: { status: { in: ['BORRADOR', 'EN_COTIZACION'] } },
          include: {
            department: true,
            createdBy: { select: { fullName: true, username: true } },
            items: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 6,
        }),
        prisma.order.findMany({
          where: { status: { not: OrderStatus.CANCELADA } },
          include: {
            supplier: true,
            payments: true,
            items: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 8,
        }),
        prisma.supplier.findMany({
          where: { isActive: true },
          include: {
            orders: {
              where: { status: { not: OrderStatus.CANCELADA } },
              select: { id: true, status: true, createdAt: true },
            },
          },
        }),
      ]);

      const topSuppliers = suppliersActivityList
        .map((sup) => {
          const totalOrders = sup.orders.length;
          const activeOrdersCount = sup.orders.filter(
            (o) =>
              o.status === OrderStatus.ENVIADA ||
              o.status === OrderStatus.PARCIAL ||
              o.status === OrderStatus.BORRADOR
          ).length;
          const completedOrdersCount = sup.orders.filter(
            (o) => o.status === OrderStatus.COMPLETADA
          ).length;
          return {
            id: sup.id,
            name: sup.name,
            rifOrId: sup.rifOrId,
            contactName: sup.contactName || 'Contacto General',
            phone: sup.phone || '---',
            totalOrders,
            activeOrdersCount,
            completedOrdersCount,
          };
        })
        .sort((a, b) => b.totalOrders - a.totalOrders)
        .slice(0, 5);

      result.purchasingSection = {
        activeOrders,
        completedOrders,
        pendingRequisitionsCount,
        activeSuppliersCount,
        topSuppliers,
        recentRequisitions: recentRequisitionsList.map((pr) => ({
          id: Number(pr.id),
          requisitionNumber: pr.requisitionNumber,
          departmentName:
            pr.departmentSection || pr.department?.name || 'General',
          createdBy:
            pr.createdBy?.fullName || pr.createdBy?.username || 'Usuario',
          status: pr.status,
          itemsCount: pr.items.length,
          createdAt: pr.createdAt.toISOString(),
        })),
        recentOrders: ordersList.map((o) => {
          const calc = computeOrderUsd(o);
          const totalOrdered = o.items.reduce(
            (acc, it) => acc + Number(it.quantityOrdered),
            0
          );
          const totalReceived = o.items.reduce(
            (acc, it) => acc + Number(it.quantityReceived),
            0
          );
          const receptionPercent =
            totalOrdered > 0
              ? Math.min(100, Math.round((totalReceived / totalOrdered) * 100))
              : 0;

          return {
            id: Number(o.id),
            orderNumber: o.orderNumber,
            supplierName: o.supplier?.name || 'Proveedor General',
            currency: calc.orderCurrency,
            totalAmount: calc.totalAgreed,
            totalAmountUsd: calc.totalUsd,
            status: o.status,
            receptionStatus: o.receptionStatus,
            receptionPercent,
            itemsCount: o.items.length,
            totalOrderedUnits: totalOrdered,
            totalReceivedUnits: totalReceived,
            createdAt: o.createdAt.toISOString(),
          };
        }),
      };

      // 4. ÁREA DE PAGOS (CUENTAS POR PAGAR, ABONOS, EGRESOS DIRECTOS Y CUENTAS BANCARIAS)
      const monthStart = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      );

      const [
        suppliersWithDebtsList,
        orderPaymentsThisMonth,
        directPaymentsThisMonth,
        recentOrderPaymentsList,
        recentDirectPaymentsList,
        activeBankAccountsCount,
      ] = await Promise.all([
        prisma.supplier.findMany({
          where: { isActive: true },
          include: {
            orders: {
              where: { status: { not: OrderStatus.CANCELADA } },
              include: { payments: true },
            },
          },
        }),
        prisma.orderPayment.findMany({
          where: { paymentDate: { gte: monthStart } },
        }),
        prisma.directPayment.findMany({
          where: { paymentDate: { gte: monthStart } },
        }),
        prisma.orderPayment.findMany({
          include: {
            order: { include: { supplier: true } },
            sourceAccount: true,
            registeredBy: { select: { fullName: true, username: true } },
          },
          orderBy: { paymentDate: 'desc' },
          take: 6,
        }),
        prisma.directPayment.findMany({
          include: {
            sourceAccount: true,
            registeredBy: { select: { fullName: true, username: true } },
          },
          orderBy: { paymentDate: 'desc' },
          take: 6,
        }),
        prisma.bankAccount.count({ where: { isActive: true } }),
      ]);

      let totalDebtUsd = 0;
      let totalHistoricalPurchasedUsd = 0;
      let totalHistoricalPaidUsd = 0;
      let pendingOrdersWithDebtCount = 0;

      const suppliersDebtSummary = suppliersWithDebtsList
        .map((sup) => {
          let supPurchasedUsd = 0;
          let supPaidUsd = 0;
          let pendingOrdersCount = 0;

          for (const ord of sup.orders) {
            const calc = computeOrderUsd(ord);
            supPurchasedUsd += calc.totalUsd;
            supPaidUsd += calc.paidUsd;
            if (calc.pendingUsd > 0.05) {
              pendingOrdersCount++;
              pendingOrdersWithDebtCount++;
            }
          }

          const balance = Math.max(
            0,
            Math.round((supPurchasedUsd - supPaidUsd) * 100) / 100
          );
          totalDebtUsd += balance;
          totalHistoricalPurchasedUsd += supPurchasedUsd;
          totalHistoricalPaidUsd += supPaidUsd;

          return {
            id: sup.id,
            name: sup.name,
            rifOrId: sup.rifOrId,
            totalPurchasedUsd: Math.round(supPurchasedUsd * 100) / 100,
            totalPaidUsd: Math.round(supPaidUsd * 100) / 100,
            balanceUsd: balance,
            pendingOrdersCount,
          };
        })
        .filter((s) => s.balanceUsd > 0.05)
        .sort((a, b) => b.balanceUsd - a.balanceUsd)
        .slice(0, 7);

      const paidOrdersMonthUsd = orderPaymentsThisMonth.reduce(
        (acc, p) => acc + Number(p.amortizedAmountUsd || p.amount || 0),
        0
      );
      const directPaymentsMonthUsd = directPaymentsThisMonth.reduce(
        (acc, dp) => acc + Number(dp.equivalentAmountUsd || dp.amountPaid || 0),
        0
      );

      // Unificar bitácora de últimos pagos (Abonos a OC + Egresos Directos)
      const combinedPayments = [
        ...recentOrderPaymentsList.map((op) => {
          let curr = (op.transactionCurrency || 'USD').toUpperCase();
          if (curr === 'VES') curr = 'VED';
          const rawAmt = Number(op.amountPaid ?? op.amount ?? 0);
          const usdAmt =
            Number(op.amortizedAmountUsd) > 0
              ? Number(op.amortizedAmountUsd)
              : curr === 'VED' && Number(op.exchangeRate) > 0
                ? rawAmt / Number(op.exchangeRate)
                : rawAmt;
          return {
            id: `op-${op.id}`,
            paymentType: 'ABONO_ORDEN' as const,
            reference: op.referenceNumber || `OC-${op.order.orderNumber}`,
            beneficiary: op.order.supplier?.name || 'Proveedor',
            concept: `Orden #${op.order.orderNumber}`,
            method: op.method,
            bankName: op.sourceAccount?.bankName || op.bankName || 'Tesorería',
            currency: curr,
            amountPaid: Math.round(rawAmt * 100) / 100,
            amountUsd: Math.round(usdAmt * 100) / 100,
            paymentDate: op.paymentDate.toISOString(),
            registeredBy:
              op.registeredBy?.fullName ||
              op.registeredBy?.username ||
              'Sistema',
            link: `/purchasing/orders/${op.orderId}`,
          };
        }),
        ...recentDirectPaymentsList.map((dp) => {
          let curr = (dp.transactionCurrency || 'USD').toUpperCase();
          if (curr === 'VES') curr = 'VED';
          const rawAmt = Number(dp.amountPaid ?? 0);
          const usdAmt =
            Number(dp.equivalentAmountUsd) > 0
              ? Number(dp.equivalentAmountUsd)
              : curr === 'VED' && Number(dp.exchangeRate) > 0
                ? rawAmt / Number(dp.exchangeRate)
                : rawAmt;
          return {
            id: `dp-${dp.id}`,
            paymentType: 'EGRESO_DIRECTO' as const,
            reference: dp.referenceNumber || `ED-${dp.id}`,
            beneficiary: dp.beneficiary,
            concept: dp.concept,
            method: dp.method,
            bankName: dp.sourceAccount?.bankName || 'Tesorería',
            currency: curr,
            amountPaid: Math.round(rawAmt * 100) / 100,
            amountUsd: Math.round(usdAmt * 100) / 100,
            paymentDate: dp.paymentDate.toISOString(),
            registeredBy:
              dp.registeredBy?.fullName ||
              dp.registeredBy?.username ||
              'Sistema',
            link: `/admin/financial/payments/${dp.id}`,
          };
        }),
      ]
        .sort(
          (a, b) =>
            new Date(b.paymentDate).getTime() -
            new Date(a.paymentDate).getTime()
        )
        .slice(0, 7);

      result.paymentsSection = {
        totalDebtUsd: Math.round(totalDebtUsd * 100) / 100,
        pendingSuppliersWithDebtCount: suppliersDebtSummary.length,
        pendingOrdersWithDebtCount,
        totalHistoricalPurchasedUsd:
          Math.round(totalHistoricalPurchasedUsd * 100) / 100,
        totalHistoricalPaidUsd: Math.round(totalHistoricalPaidUsd * 100) / 100,
        paidThisMonthUsd:
          Math.round((paidOrdersMonthUsd + directPaymentsMonthUsd) * 100) / 100,
        paidOrdersMonthUsd: Math.round(paidOrdersMonthUsd * 100) / 100,
        directPaymentsMonthUsd: Math.round(directPaymentsMonthUsd * 100) / 100,
        activeBankAccountsCount,
        topDebtors: suppliersDebtSummary,
        recentPayments: combinedPayments,
      };
    }

    // 5. DIRECCIÓN EJECUTIVA & BALANCES INTEGRALES
    if (isExecutive) {
      const monthStart = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      );

      const [
        allActiveBatches,
        totalProducts,
        openIncidents,
        topCategories,
        allSuppliersOrders,
        directPaymentsMonth,
        orderPaymentsMonth,
        requestsByDepartment,
        requestsStatusSummary,
        activeUsersCount,
      ] = await Promise.all([
        prisma.stockBatch.findMany({
          where: { status: BatchStatus.DISPONIBLE, currentQuantity: { gt: 0 } },
          select: { currentQuantity: true, costPrice: true },
        }),
        prisma.product.count({ where: { isActive: true } }),
        prisma.batchIncident.count({ where: { status: 'ABIERTA' } }),
        prisma.category.findMany({
          include: {
            products: {
              where: { isActive: true },
              include: {
                stockBatches: {
                  where: {
                    status: BatchStatus.DISPONIBLE,
                    currentQuantity: { gt: 0 },
                  },
                  select: { currentQuantity: true, costPrice: true },
                },
              },
            },
          },
        }),
        prisma.order.findMany({
          where: { status: { not: OrderStatus.CANCELADA } },
          include: { payments: true },
        }),
        prisma.directPayment.findMany({
          where: { paymentDate: { gte: monthStart } },
        }),
        prisma.orderPayment.findMany({
          where: { paymentDate: { gte: monthStart } },
        }),
        prisma.department.findMany({
          where: { isActive: true },
          include: {
            requests: {
              include: { items: true },
            },
          },
        }),
        prisma.request.groupBy({
          by: ['status'],
          _count: { _all: true },
        }),
        prisma.user.count({ where: { isActive: true } }),
      ]);

      const totalInventoryValueUsd = allActiveBatches.reduce(
        (sum, b) => sum + Number(b.currentQuantity) * Number(b.costPrice),
        0
      );
      const totalInventoryValueBs = totalInventoryValueUsd * bcvUsd;

      let execTotalDebtUsd = 0;
      let execTotalPurchasedUsd = 0;
      for (const ord of allSuppliersOrders) {
        const calc = computeOrderUsd(ord);
        execTotalDebtUsd += calc.pendingUsd;
        execTotalPurchasedUsd += calc.totalUsd;
      }

      const execDirectPaymentsMonthUsd = directPaymentsMonth.reduce(
        (acc, dp) => acc + Number(dp.equivalentAmountUsd || dp.amountPaid || 0),
        0
      );
      const execOrderPaymentsMonthUsd = orderPaymentsMonth.reduce(
        (acc, op) => acc + Number(op.amortizedAmountUsd || op.amount || 0),
        0
      );

      const categoryValuation = topCategories
        .map((cat) => {
          let catTotal = 0;
          let batchesCount = 0;
          let unitsCount = 0;
          for (const prod of cat.products) {
            for (const b of prod.stockBatches) {
              const qty = Number(b.currentQuantity);
              catTotal += qty * Number(b.costPrice);
              batchesCount++;
              unitsCount += qty;
            }
          }
          const percentage =
            totalInventoryValueUsd > 0
              ? Math.round((catTotal / totalInventoryValueUsd) * 1000) / 10
              : 0;
          return {
            name: cat.name,
            code: cat.code || 'CAT',
            productsCount: cat.products.length,
            batchesCount,
            unitsCount,
            valueUsd: Math.round(catTotal * 100) / 100,
            valueBs: Math.round(catTotal * bcvUsd * 100) / 100,
            percentage,
          };
        })
        .sort((a, b) => b.valueUsd - a.valueUsd)
        .slice(0, 6);

      const departmentActivity = requestsByDepartment
        .map((dep) => {
          const totalReqs = dep.requests.length;
          const pendingReqs = dep.requests.filter(
            (r) =>
              r.status === RequestStatus.PENDIENTE ||
              r.status === RequestStatus.APROBADA ||
              r.status === RequestStatus.DESPACHADA_PARCIAL
          ).length;
          const completedReqs = dep.requests.filter(
            (r) => r.status === RequestStatus.COMPLETADA
          ).length;
          const dispatchedUnits = dep.requests.reduce(
            (acc, r) =>
              acc +
              r.items.reduce(
                (iAcc, it) => iAcc + Number(it.quantityDispatched),
                0
              ),
            0
          );
          return {
            id: dep.id,
            code: dep.code,
            name: dep.name,
            totalRequests: totalReqs,
            pendingRequests: pendingReqs,
            completedRequests: completedReqs,
            dispatchedUnits,
          };
        })
        .filter((d) => d.totalRequests > 0)
        .sort((a, b) => b.totalRequests - a.totalRequests)
        .slice(0, 6);

      let totalRequestsGlobal = 0;
      let completedRequestsGlobal = 0;
      let pendingRequestsGlobal = 0;
      for (const grp of requestsStatusSummary) {
        totalRequestsGlobal += grp._count._all;
        if (grp.status === RequestStatus.COMPLETADA) {
          completedRequestsGlobal += grp._count._all;
        } else if (
          grp.status === RequestStatus.PENDIENTE ||
          grp.status === RequestStatus.APROBADA ||
          grp.status === RequestStatus.DESPACHADA_PARCIAL
        ) {
          pendingRequestsGlobal += grp._count._all;
        }
      }

      result.executiveSection = {
        totalInventoryValueUsd: Math.round(totalInventoryValueUsd * 100) / 100,
        totalInventoryValueBs: Math.round(totalInventoryValueBs * 100) / 100,
        bcvRate: bcvUsd,
        eurRate: bcvEur,
        totalProducts,
        totalActiveBatches: allActiveBatches.length,
        openIncidents,
        activeUsersCount,
        totalDebtUsd: Math.round(execTotalDebtUsd * 100) / 100,
        totalPurchasedUsd: Math.round(execTotalPurchasedUsd * 100) / 100,
        monthlyOutflowUsd:
          Math.round(
            (execDirectPaymentsMonthUsd + execOrderPaymentsMonthUsd) * 100
          ) / 100,
        monthlyOrderPaymentsUsd:
          Math.round(execOrderPaymentsMonthUsd * 100) / 100,
        monthlyDirectPaymentsUsd:
          Math.round(execDirectPaymentsMonthUsd * 100) / 100,
        totalRequestsGlobal,
        completedRequestsGlobal,
        pendingRequestsGlobal,
        categoryValuation,
        departmentActivity,
      };
    }

    return result;
  }
}
