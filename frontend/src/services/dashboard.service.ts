import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";

export interface SystemNotification {
  id: string;
  type: "INFO" | "WARNING" | "ALERT" | "SUCCESS";
  title: string;
  message: string;
  link: string;
  createdAt: string;
}

export interface DashboardMetricsResponse {
  userSection?: {
    totalMyRequests: number;
    pendingMyRequests: number;
    approvedMyRequests: number;
    completedMyRequests: number;
    rejectedMyRequests: number;
    openVialsInLab: number;
    department: string;
    windowConfig: {
      isSuspended: boolean;
      startDay: number;
      startHour: number;
      endDay: number;
      endHour: number;
      maxWeeklyRequestsPerUser: number;
    } | null;
    recentRequests: Array<{
      id: number;
      requestNumber: string;
      departmentName: string;
      justification: string;
      status: string;
      priority: string;
      createdAt: string;
      itemsCount: number;
      totalRequestedUnits: number;
      totalDispatchedUnits: number;
      itemsPreview: Array<{
        name: string;
        sku: string;
        requested: number;
        dispatched: number;
        unit: string;
      }>;
    }>;
  };
  warehouseSection?: {
    pendingRequests: number;
    readyToDispatchRequests: number;
    quarantineBatches: number;
    openQuarantineIncidents: number;
    movementsToday: number;
    activeBatches: number;
    lowStockCount: number;
    outOfStockCount: number;
    lowStockItems: Array<{
      id: number;
      name: string;
      sku: string;
      categoryName: string;
      unitOfMeasure: string;
      currentStock: number;
      minStock: number;
      deficit: number;
      isOutOfStock: boolean;
    }>;
    actionableRequests: Array<{
      id: number;
      requestNumber: string;
      departmentName: string;
      requesterName: string;
      status: string;
      priority: string;
      itemsCount: number;
      totalUnitsRequested: number;
      createdAt: string;
    }>;
    expiringBatches: Array<{
      id: number;
      lotNumber: string;
      productName: string;
      sku: string;
      unitOfMeasure: string;
      quantity: number;
      expirationDate: string | null;
      daysRemaining: number | null;
      location: string;
    }>;
    recentMovements: Array<{
      id: number;
      referenceNumber: string;
      type: string;
      productName: string;
      sku: string;
      unitOfMeasure: string;
      lotNumber: string | null;
      quantity: number;
      performedBy: string;
      createdAt: string;
    }>;
  };
  purchasingSection?: {
    activeOrders: number;
    completedOrders: number;
    pendingRequisitionsCount: number;
    activeSuppliersCount: number;
    topSuppliers: Array<{
      id: number;
      name: string;
      rifOrId: string;
      contactName: string;
      phone: string;
      totalOrders: number;
      activeOrdersCount: number;
      completedOrdersCount: number;
    }>;
    recentRequisitions: Array<{
      id: number;
      requisitionNumber: string;
      departmentName: string;
      createdBy: string;
      status: string;
      itemsCount: number;
      createdAt: string;
    }>;
    recentOrders: Array<{
      id: number;
      orderNumber: string;
      supplierName: string;
      currency: string;
      totalAmount: number;
      totalAmountUsd: number;
      status: string;
      receptionStatus: string;
      receptionPercent: number;
      itemsCount: number;
      totalOrderedUnits: number;
      totalReceivedUnits: number;
      createdAt: string;
    }>;
  };
  paymentsSection?: {
    totalDebtUsd: number;
    pendingSuppliersWithDebtCount: number;
    pendingOrdersWithDebtCount: number;
    totalHistoricalPurchasedUsd: number;
    totalHistoricalPaidUsd: number;
    paidThisMonthUsd: number;
    paidOrdersMonthUsd: number;
    directPaymentsMonthUsd: number;
    activeBankAccountsCount: number;
    topDebtors: Array<{
      id: number;
      name: string;
      rifOrId: string;
      totalPurchasedUsd: number;
      totalPaidUsd: number;
      balanceUsd: number;
      pendingOrdersCount: number;
    }>;
    recentPayments: Array<{
      id: string;
      paymentType: "ABONO_ORDEN" | "EGRESO_DIRECTO";
      reference: string;
      beneficiary: string;
      concept: string;
      method: string;
      bankName: string;
      currency: string;
      amountPaid: number;
      amountUsd: number;
      paymentDate: string;
      registeredBy: string;
      link: string;
    }>;
  };
  labSection?: {
    totalFridges: number;
    inUseUnits: number;
    sealedUnits: number;
    consumptionsToday: number;
    activeVials: Array<{
      id: number;
      unitCode: string;
      productName: string;
      sku: string;
      currentVolume: number;
      initialVolume: number;
      unitOfMeasure: string;
      fridgeName: string;
      openedBy: string;
      openedAt: string | null;
    }>;
  };
  executiveSection?: {
    totalInventoryValueUsd: number;
    totalInventoryValueBs: number;
    bcvRate: number;
    eurRate: number;
    totalProducts: number;
    totalActiveBatches: number;
    openIncidents: number;
    activeUsersCount: number;
    totalDebtUsd: number;
    totalPurchasedUsd: number;
    monthlyOutflowUsd: number;
    monthlyOrderPaymentsUsd: number;
    monthlyDirectPaymentsUsd: number;
    totalRequestsGlobal: number;
    completedRequestsGlobal: number;
    pendingRequestsGlobal: number;
    categoryValuation: Array<{
      name: string;
      code: string;
      productsCount: number;
      batchesCount: number;
      unitsCount: number;
      valueUsd: number;
      valueBs: number;
      percentage: number;
    }>;
    departmentActivity: Array<{
      id: number;
      code: string;
      name: string;
      totalRequests: number;
      pendingRequests: number;
      completedRequests: number;
      dispatchedUnits: number;
    }>;
  };
}

export const DashboardClientService = {
  async getMetrics(): Promise<DashboardMetricsResponse> {
    const res =
      await apiClient.get<ApiResponse<DashboardMetricsResponse>>(
        "/dashboard/metrics",
      );
    return res.data.data || {};
  },

  async getNotifications(
    excludeIds: string[] = [],
  ): Promise<SystemNotification[]> {
    const params =
      excludeIds.length > 0 ? { excludeIds: excludeIds.join(",") } : {};
    const res = await apiClient.get<ApiResponse<SystemNotification[]>>(
      "/dashboard/notifications",
      { params },
    );
    return res.data.data || [];
  },
};
