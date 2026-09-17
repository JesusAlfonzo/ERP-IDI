export type MovementType =
  | "ENTRADA_COMPRA"
  | "ENTRADA_AJUSTE"
  | "SALIDA_CONSUMO"
  | "SALIDA_AJUSTE"
  | "TRANSFERENCIA"
  | "MERMA_VENCIMIENTO"
  | "MERMA_ROTURA";

export interface KardexItem {
  id: number;
  createdAt: string;
  type: MovementType;
  quantity: number;
  balanceAfter: number;
  unitCostUsd: number;
  totalCostUsd: number;
  reason?: string | null;
  referenceDoc?: string | null;
  performedBy: {
    fullName: string;
    username: string;
  };
  batch: {
    lotNumber: string;
    expirationDate: string | null;
    product: {
      sku: string;
      name: string;
      unitOfMeasure: string;
    };
  };
}

export interface KardexFilters {
  page?: number;
  limit?: number;
  type?: MovementType | "";
  batchId?: number;
  startDate?: string;
  endDate?: string;
  search?: string;
}
