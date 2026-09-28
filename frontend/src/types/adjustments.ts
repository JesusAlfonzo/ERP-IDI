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
