export interface DashboardValuation {
  totalInventoryValueUsd: number;
  byCategory: Array<{
    category: string;
    valueUsd: number;
  }>;
}

export interface ExpirationItem {
  batchId: number;
  lotNumber: string;
  productName: string;
  sku: string;
  quantity: number;
  expirationDate: string;
  status: string;
}

export interface ExpirationMatrix {
  summary: {
    expiredCount: number;
    within30DaysCount: number;
    within60DaysCount: number;
    within90DaysCount: number;
  };
  details: {
    expired: ExpirationItem[];
    within30Days: ExpirationItem[];
    within60Days: ExpirationItem[];
    within90Days: ExpirationItem[];
  };
}

export interface LowStockItem {
  productId: string;
  name: string;
  sku: string;
  minStockAlert: number;
  currentStock: number;
}

export interface QualityAndStockAlerts {
  quarantinedBatches: number;
  defectiveBatches: number;
  lowStockCount: number;
  lowStockItems: LowStockItem[];
}

export interface LaboratoryMetrics {
  sealedUnits: number;
  inUseUnits: number;
  topConsumedReagents: Array<{
    unitCode: string;
    productName: string;
    totalConsumed: number;
  }>;
  consumptionByDepartment: Array<{
    department: string;
    totalUsed: number;
  }>;
  consumptionByFridge: Array<{
    fridge: string;
    totalUsed: number;
  }>;
}

export interface PurchasingMetrics {
  pendingOrders: number;
  totalInvoicedUsd: number;
  totalPaidUsd: number;
  totalPendingDebtUsd: number;
  suppliersWithDebt: Array<{
    supplierId: number;
    name: string;
    rifOrId: string;
    totalInvoicedUsd: number;
    totalPaidUsd: number;
    pendingDebtUsd: number;
  }>;
}

export interface DashboardOverviewData {
  valuation: DashboardValuation;
  expirationMatrix: ExpirationMatrix;
  qualityAndStockAlerts: QualityAndStockAlerts;
  laboratory: LaboratoryMetrics;
  purchasing: PurchasingMetrics;
}
