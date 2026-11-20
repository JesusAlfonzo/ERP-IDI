export type AdjustmentType =
  | "ENTRADA_AJUSTE"
  | "SALIDA_AJUSTE"
  | "MERMA_ROTURA"
  | "MERMA_VENCIMIENTO";

export interface InventoryAdjustmentItemPayload {
  batchId?: number;
  newBatch?: {
    productId: number;
    lotNumber: string;
    expirationDate?: string | null;
    locationId: number;
    costPrice?: number;
    origin?: string;
  };
  action: "INCREMENTO" | "DECREMENTO";
  quantity: number;
  reason?: string;
}

export interface InventoryAdjustmentPayload {
  notes?: string;
  items: InventoryAdjustmentItemPayload[];
}

export interface AdjustmentResponseData {
  movementId: number;
  batchId: number;
  newBalance: number;
  message: string;
}

export interface StockMovementItemDetail {
  id: number;
  quantity: number;
  unitCost?: number | null;
  batch?: {
    id: number;
    lotNumber: string;
    currentQuantity: number;
    expirationDate?: string | null;
    location?: { id: number; name: string; type?: string } | null;
    product: {
      id: number;
      name: string;
      sku?: string;
      baseUnit?: { abbreviation: string };
      category?: { id: number; name: string } | null;
    };
  } | null;
}

export interface StockMovementRecord {
  id: number;
  referenceNumber: string;
  type: string;
  notes?: string | null;
  createdAt: string;
  createdBy?: { id: number; fullName: string; username: string } | null;
  items: StockMovementItemDetail[];
}
