import { prisma } from '../config/prisma.js';
import {
  RequestStatus,
  OrderStatus,
  BatchStatus,
  StockMovementType,
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
    const notifications: SystemNotification[] = [];
    const isRequester =
      user.roles.includes('ADMINISTRADOR') ||
      user.roles.includes('SOLICITANTE');
    const isStaff =
      user.roles.includes('ADMINISTRADOR') ||
      user.roles.includes('ALMACENISTA');
    const isPurchasing =
      user.roles.includes('ADMINISTRADOR') || user.roles.includes('COMPRAS');
    const isLabStaff =
      user.roles.includes('ADMINISTRADOR') ||
      user.roles.includes('ANALISTA_LABORATORIO');

    // 1. Notificaciones personales de Solicitante
    if (isRequester) {
      // Extraemos los IDs de solicitudes que ya fueron descartadas por el usuario
      const excludedRequestIds: number[] = [];
      for (const rawId of dismissedIds) {
        if (
          rawId.startsWith('req-app-') ||
          rawId.startsWith('req-rej-') ||
          rawId.startsWith('req-cmp-')
        ) {
          const parts = rawId.split('-');
          const num = Number(parts[parts.length - 1]);
          if (!isNaN(num)) excludedRequestIds.push(num);
        }
      }

      // Buscamos hasta 30 solicitudes recientes EXCLUYENDO las ya leídas/descartadas
      const myRecentRequests = await prisma.request.findMany({
        where: {
          userId: user.id,
          status: {
            in: [
              RequestStatus.APROBADA,
              RequestStatus.RECHAZADA,
              RequestStatus.COMPLETADA,
            ],
          },
          id:
            excludedRequestIds.length > 0
              ? { notIn: excludedRequestIds }
              : undefined,
        },
        orderBy: { updatedAt: 'desc' },
        take: 30, // Ventana amplia para que el usuario no pierda ningún evento
      });

      for (const req of myRecentRequests) {
        if (req.status === RequestStatus.APROBADA) {
          notifications.push({
            id: `req-app-${req.id}`,
            type: 'SUCCESS',
            title: `Solicitud #${req.requestNumber} Aprobada`,
            message:
              'Tu requisición fue autorizada y está lista para despacho en almacén.',
            link: `/requests/${req.id}`,
            createdAt: req.updatedAt.toISOString(),
          });
        } else if (req.status === RequestStatus.RECHAZADA) {
          notifications.push({
            id: `req-rej-${req.id}`,
            type: 'ALERT',
            title: `Solicitud #${req.requestNumber} Rechazada`,
            message:
              req.notes ||
              'La requisición no fue aprobada por almacén o dirección.',
            link: `/requests/${req.id}`,
            createdAt: req.updatedAt.toISOString(),
          });
        } else if (req.status === RequestStatus.COMPLETADA) {
          notifications.push({
            id: `req-cmp-${req.id}`,
            type: 'INFO',
            title: `Solicitud #${req.requestNumber} Entregada`,
            message:
              'Los materiales e insumos ya fueron entregados formalmente.',
            link: `/requests/${req.id}`,
            createdAt: req.updatedAt.toISOString(),
          });
        }
      }
    }

    // 2. Notificaciones para Almacén (Condición física)
    if (isStaff) {
      const pendingCount = await prisma.request.count({
        where: { status: RequestStatus.PENDIENTE },
      });
      if (pendingCount > 0 && !dismissedIds.includes('alm-pending-requests')) {
        notifications.push({
          id: 'alm-pending-requests',
          type: 'WARNING',
          title: `${pendingCount} Requisición(es) en Espera`,
          message:
            'Existen solicitudes de salas esperando revisión y entrega física.',
          link: '/requests?status=PENDIENTE',
          createdAt: new Date().toISOString(),
        });
      }

      const quarantineCount = await prisma.stockBatch.count({
        where: {
          status: BatchStatus.EN_CUARENTENA,
          currentQuantity: { gt: 0 },
        },
      });
      if (
        quarantineCount > 0 &&
        !dismissedIds.includes('alm-quarantine-batches')
      ) {
        notifications.push({
          id: 'alm-quarantine-batches',
          type: 'ALERT',
          title: `${quarantineCount} Lote(s) en Cuarentena`,
          message:
            'Lotes retenidos bajo control de calidad esperando dictamen.',
          link: '/quality/quarantine',
          createdAt: new Date().toISOString(),
        });
      }

      const sixtyDays = new Date();
      sixtyDays.setDate(sixtyDays.getDate() + 60);
      const expiringCount = await prisma.stockBatch.count({
        where: {
          status: BatchStatus.DISPONIBLE,
          currentQuantity: { gt: 0 },
          expirationDate: { lte: sixtyDays },
        },
      });
      if (expiringCount > 0 && !dismissedIds.includes('alm-expiring-batches')) {
        notifications.push({
          id: 'alm-expiring-batches',
          type: 'WARNING',
          title: `${expiringCount} Lote(s) por Vencer (< 60 días)`,
          message: 'Priorizar consumo según regla FIFO para evitar mermas.',
          link: '/inventory/kardex',
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 3. Notificaciones para Compras
    if (isPurchasing) {
      const pendingOrdersCount = await prisma.order.count({
        where: { status: { in: [OrderStatus.ENVIADA, OrderStatus.PARCIAL] } },
      });
      if (
        pendingOrdersCount > 0 &&
        !dismissedIds.includes('pur-pending-orders')
      ) {
        notifications.push({
          id: 'pur-pending-orders',
          type: 'INFO',
          title: `${pendingOrdersCount} Compra(s) en Tránsito / Parcial`,
          message: 'Órdenes de compra con entregas pendientes de recepción.',
          link: '/purchasing/orders?status=PENDIENTE',
          createdAt: new Date().toISOString(),
        });
      }

      const products = await prisma.product.findMany({
        where: { isActive: true },
        select: {
          id: true,
          minStockAlert: true,
          stockBatches: {
            where: { status: BatchStatus.DISPONIBLE },
            select: { currentQuantity: true },
          },
        },
      });

      const lowStockCount = products.filter((p) => {
        const total = p.stockBatches.reduce(
          (acc, b) => acc + Number(b.currentQuantity),
          0
        );
        return total <= Number(p.minStockAlert);
      }).length;

      if (lowStockCount > 0 && !dismissedIds.includes('pur-low-stock-alert')) {
        notifications.push({
          id: 'pur-low-stock-alert',
          type: 'ALERT',
          title: `${lowStockCount} Producto(s) Bajo Stock Mínimo`,
          message:
            'Insumos que alcanzaron el umbral crítico. Requieren reposición inmediata.',
          link: '/inventory/products?lowStockOnly=true',
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 4. Notificaciones para Analista de Laboratorio
    if (isLabStaff) {
      const lowVolumeVials = await prisma.labReagentUnit.findMany({
        where: {
          status: 'EN_USO',
          currentVolume: { lte: 15 },
        },
        include: { product: true },
        take: 10,
      });

      for (const vial of lowVolumeVials) {
        const notifId = `lab-vial-${vial.id}`;
        if (!dismissedIds.includes(notifId)) {
          notifications.push({
            id: notifId,
            type: 'WARNING',
            title: `Vial por Agotarse: ${vial.product.name}`,
            message: `Código ${vial.unitCode} en uso con saldo crítico (${Number(vial.currentVolume)} remanente).`,
            link: '/laboratory/consumption',
            createdAt: vial.updatedAt.toISOString(),
          });
        }
      }
    }

    return notifications;
  }

  static async getDashboardMetrics(user: DashboardUserContext) {
    const roles = user.roles;
    const isRequester =
      roles.includes('ADMINISTRADOR') || roles.includes('SOLICITANTE');
    const isStaff =
      roles.includes('ADMINISTRADOR') || roles.includes('ALMACENISTA');
    const isPurchasing =
      roles.includes('ADMINISTRADOR') || roles.includes('COMPRAS');
    const isLabStaff =
      roles.includes('ADMINISTRADOR') || roles.includes('ANALISTA_LABORATORIO');
    const isAdmin = roles.includes('ADMINISTRADOR');

    const result: Record<string, unknown> = {};

    // 1. ÁREA CLÍNICA / SOLICITANTE
    if (isRequester) {
      const [
        totalMyRequests,
        pendingMyRequests,
        openVialsInLab,
        myRecentRequestsList,
      ] = await Promise.all([
        prisma.request.count({ where: { userId: user.id } }),
        prisma.request.count({
          where: { userId: user.id, status: RequestStatus.PENDIENTE },
        }),
        prisma.labReagentUnit.count({ where: { status: 'EN_USO' } }),
        prisma.request.findMany({
          where: { userId: user.id },
          include: {
            items: {
              include: { product: { include: { baseUnit: true } } },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
      ]);

      result.userSection = {
        totalMyRequests,
        pendingMyRequests,
        openVialsInLab,
        department: user.department || 'Área Solicitante',
        recentRequests: myRecentRequestsList.map((r) => ({
          id: Number(r.id),
          requestNumber: r.requestNumber,
          status: r.status,
          priority: r.priority,
          createdAt: r.createdAt.toISOString(),
          itemsCount: r.items.length,
        })),
      };
    }

    // 2. ÁREA DE ALMACÉN CENTRAL
    if (isStaff) {
      const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
      const ninetyDaysAhead = new Date();
      ninetyDaysAhead.setDate(ninetyDaysAhead.getDate() + 90);

      const [
        pendingRequests,
        quarantineBatches,
        movementsToday,
        activeBatches,
        expiringBatchesList,
      ] = await Promise.all([
        prisma.request.count({ where: { status: RequestStatus.PENDIENTE } }),
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
          take: 6,
        }),
      ]);

      result.warehouseSection = {
        pendingRequests,
        quarantineBatches,
        movementsToday,
        activeBatches,
        expiringBatches: expiringBatchesList.map((b) => ({
          id: Number(b.id),
          lotNumber: b.lotNumber,
          productName: b.product.name,
          sku: b.product.sku,
          unitOfMeasure: b.product.baseUnit.abbreviation,
          quantity: Number(b.currentQuantity),
          expirationDate: b.expirationDate
            ? b.expirationDate.toISOString()
            : null,
          location: b.location.name,
        })),
      };
    }

    // 3. ÁREA DE COMPRAS & PROVEEDORES
    if (isPurchasing) {
      const [
        activeOrders,
        completedOrders,
        ordersList,
        suppliersWithDebtsList,
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
        prisma.order.findMany({
          where: { status: { not: OrderStatus.CANCELADA } },
          include: {
            supplier: true,
            currency: true,
            payments: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 6,
        }),
        prisma.supplier.findMany({
          where: { isActive: true },
          include: {
            orders: {
              where: { status: { not: OrderStatus.CANCELADA } },
              include: { payments: true },
            },
          },
        }),
      ]);

      let totalDebtUsd = 0;
      const suppliersDebtSummary = suppliersWithDebtsList
        .map((sup) => {
          let supPurchased = 0;
          let supPaid = 0;
          for (const ord of sup.orders) {
            supPurchased += Number(ord.total);
            supPaid += ord.payments.reduce(
              (sum, p) => sum + Number(p.amount),
              0
            );
          }
          const balance = Math.max(0, supPurchased - supPaid);
          totalDebtUsd += balance;
          return {
            id: sup.id,
            name: sup.name,
            rifOrId: sup.rifOrId,
            balanceUsd: balance,
          };
        })
        .filter((s) => s.balanceUsd > 0.01)
        .sort((a, b) => b.balanceUsd - a.balanceUsd)
        .slice(0, 5);

      result.purchasingSection = {
        activeOrders,
        completedOrders,
        totalDebtUsd,
        topDebtors: suppliersDebtSummary,
        recentOrders: ordersList.map((o) => {
          const totalPaid = o.payments.reduce(
            (acc, p) => acc + Number(p.amount),
            0
          );
          return {
            id: Number(o.id),
            orderNumber: o.orderNumber,
            supplierName: o.supplier?.name || 'Proveedor General',
            currency: o.currency.code,
            totalAmount: Number(o.total),
            balancePending: Math.max(0, Number(o.total) - totalPaid),
            status: o.status,
            createdAt: o.createdAt.toISOString(),
          };
        }),
      };
    }

    // 4. ÁREA DE LABORATORIO CLÍNICO
    if (isLabStaff) {
      const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

      const [
        totalFridges,
        inUseUnits,
        sealedUnits,
        dispatchesToday,
        activeVialsList,
      ] = await Promise.all([
        prisma.fridge.count(),
        prisma.labReagentUnit.count({ where: { status: 'EN_USO' } }),
        prisma.labReagentUnit.count({ where: { status: 'SELLADO' } }),
        prisma.stockMovement.count({
          where: {
            type: {
              in: [
                StockMovementType.TRASLADO_A_LABORATORIO,
                StockMovementType.DESPACHO_SOLICITUD,
              ],
            },
            createdAt: { gte: todayStart },
          },
        }),
        prisma.labReagentUnit.findMany({
          where: { status: 'EN_USO' },
          include: {
            product: { include: { baseUnit: true } },
            fridge: true,
            openedBy: { select: { fullName: true, username: true } },
          },
          orderBy: { currentVolume: 'asc' },
          take: 6,
        }),
      ]);

      result.labSection = {
        totalFridges,
        inUseUnits,
        sealedUnits,
        consumptionsToday: dispatchesToday,
        activeVials: activeVialsList.map(
          (v: {
            id: bigint | number;
            unitCode: string;
            product: {
              name: string;
              sku: string;
              baseUnit: { abbreviation: string };
            };
            currentVolume: number | unknown;
            initialVolume: number | unknown;
            fridge: { name: string } | null;
            openedBy: { fullName: string | null; username: string } | null;
            openedAt: Date | null;
          }) => ({
            id: Number(v.id),
            unitCode: v.unitCode,
            productName: v.product.name,
            sku: v.product.sku,
            currentVolume: Number(v.currentVolume),
            initialVolume: Number(v.initialVolume),
            unitOfMeasure: v.product.baseUnit.abbreviation,
            fridgeName: v.fridge?.name || 'Nevera Principal',
            openedBy:
              v.openedBy?.fullName || v.openedBy?.username || 'Analista',
            openedAt: v.openedAt ? v.openedAt.toISOString() : null,
          })
        ),
      };
    }

    // 5. DIRECCIÓN EJECUTIVA & BALANCES
    if (isAdmin) {
      const allActiveBatches = await prisma.stockBatch.findMany({
        where: { status: BatchStatus.DISPONIBLE, currentQuantity: { gt: 0 } },
        select: { currentQuantity: true, costPrice: true },
      });

      const totalInventoryValueUsd = allActiveBatches.reduce(
        (sum, b) => sum + Number(b.currentQuantity) * Number(b.costPrice),
        0
      );

      const latestExchange = await prisma.currencyExchange.findFirst({
        where: { currency: { code: 'VES' } },
        orderBy: { effectiveDate: 'desc' },
      });

      const vesRate = latestExchange ? Number(latestExchange.rate) : 1.0;
      const totalInventoryValueBs = totalInventoryValueUsd * vesRate;

      const [totalProducts, openIncidents, topCategories] = await Promise.all([
        prisma.product.count({ where: { isActive: true } }),
        prisma.batchIncident.count({ where: { status: 'ABIERTA' } }),
        prisma.category.findMany({
          include: {
            products: {
              include: {
                stockBatches: {
                  where: { status: BatchStatus.DISPONIBLE },
                  select: { currentQuantity: true, costPrice: true },
                },
              },
            },
          },
        }),
      ]);

      const categoryValuation = topCategories
        .map((cat) => {
          let catTotal = 0;
          for (const prod of cat.products) {
            for (const b of prod.stockBatches) {
              catTotal += Number(b.currentQuantity) * Number(b.costPrice);
            }
          }
          return {
            name: cat.name,
            valueUsd: catTotal,
          };
        })
        .sort((a, b) => b.valueUsd - a.valueUsd)
        .slice(0, 5);

      result.executiveSection = {
        totalInventoryValueUsd,
        totalInventoryValueBs,
        totalProducts,
        openIncidents,
        categoryValuation,
      };
    }

    return result;
  }
}
