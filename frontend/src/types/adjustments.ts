export type AdjustmentType =
  | "ENTRADA_AJUSTE"
  | "SALIDA_AJUSTE"
  | "MERMA_ROTURA"
  | "MERMA_VENCIMIENTO";

export interface InventoryAdjustmentPayload {
  notes?: string;
  items: {
    batchId: number;
    action: "INCREMENTO" | "DECREMENTO";
    quantity: number;
    reason?: string;
  }[];
}

export interface AdjustmentResponseData {
  movementId: number;
  batchId: number;
  newBalance: number;
  message: string;
}
