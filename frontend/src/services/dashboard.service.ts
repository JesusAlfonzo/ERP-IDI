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
    openVialsInLab: number;
    department: string;
    recentRequests: Array<{
      id: number;
      requestNumber: string;
      status: string;
      priority: string;
      createdAt: string;
      itemsCount: number;
    }>;
  };
  warehouseSection?: {
    pendingRequests: number;
    quarantineBatches: number;
    movementsToday: number;
    activeBatches: number;
    expiringBatches: Array<{
      id: number;
      lotNumber: string;
      productName: string;
      sku: string;
      unitOfMeasure: string;
      quantity: number;
      expirationDate: string | null;
      location: string;
    }>;
  };
  purchasingSection?: {
    activeOrders: number;
    completedOrders: number;
    totalDebtUsd: number;
    topDebtors: Array<{
      id: number;
      name: string;
      rifOrId: string;
      balanceUsd: number;
    }>;
    recentOrders: Array<{
      id: number;
      orderNumber: string;
      supplierName: string;
      currency: string;
      totalAmount: number;
      balancePending: number;
      status: string;
      createdAt: string;
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
    totalProducts: number;
    openIncidents: number;
    categoryValuation: Array<{
      name: string;
      valueUsd: number;
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
