export type MovementType =
  | "ENTRADA_COMPRA"
  | "TRASLADO_A_LABORATORIO"
  | "DESPACHO_SOLICITUD"
  | "AJUSTE_INVENTARIO"
  | "DESCARTE_MERMA"
  | "PAGO_ORDEN"
  | "EGRESO_DIRECTO";

export interface KardexItem {
  id: number;
  batchId?: number;
  createdAt: string;
  type: MovementType;
  quantity: number;
  balanceAfter: number | null;
  unitCost: number | null;
  reason?: string | null;
  referenceDoc?: string | null;
  performedBy: {
    fullName: string;
    username: string;
  } | null;
  batch?: {
    lotNumber: string;
    expirationDate: string | null;
    product: {
      sku: string;
      name: string;
      unitOfMeasure: string;
    };
  } | null;
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
