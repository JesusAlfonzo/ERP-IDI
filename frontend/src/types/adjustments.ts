export type AdjustmentType =
  | "ENTRADA_AJUSTE"
  | "SALIDA_AJUSTE"
  | "MERMA_ROTURA"
  | "MERMA_VENCIMIENTO";

export interface InventoryAdjustmentPayload {
  batchId: number;
  type: AdjustmentType;
  quantity: number;
  reason: string;
  referenceDoc?: string;
}

export interface AdjustmentResponseData {
  movementId: number;
  batchId: number;
  newBalance: number;
  message: string;
}
