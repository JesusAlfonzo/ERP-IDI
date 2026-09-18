export type MovementType =
  | "ENTRADA_COMPRA"
  | "TRASLADO_A_LABORATORIO"
  | "DESPACHO_SOLICITUD"
  | "AJUSTE_INVENTARIO"
  | "DESCARTE_MERMA";

export interface KardexItem {
  id: number;
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
