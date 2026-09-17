export type PurchaseOrderStatus =
  | "PENDIENTE"
  | "EN_PROCESO"
  | "RECIBIDO"
  | "CANCELADO";

export interface SupplierPayment {
  id: number;
  amountUsd: number;
  paymentMethod:
    | "TRANSFERENCIA_USD"
    | "TRANSFERENCIA_BS"
    | "EFECTIVO_USD"
    | "PAGO_MOVIL";
  referenceNumber: string;
  paymentDate: string;
  notes?: string | null;
}

export interface Supplier {
  id: number;
  name: string;
  rif: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  paymentTermsDays?: number;
  isActive: boolean;
  totalPurchasedUsd?: number;
  totalDebtUsd?: number;
  payments?: SupplierPayment[];
}

export interface CreateSupplierPayload {
  name: string;
  rif: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  paymentTermsDays?: number;
}

export interface RegisterPaymentPayload {
  supplierId: number;
  amountUsd: number;
  paymentMethod:
    | "TRANSFERENCIA_USD"
    | "TRANSFERENCIA_BS"
    | "EFECTIVO_USD"
    | "PAGO_MOVIL";
  referenceNumber: string;
  notes?: string;
}

export interface PurchaseOrderItem {
  id?: number;
  productId: number;
  quantity: number;
  unitPriceUsd: number;
  totalPriceUsd?: number;
  product?: {
    id: number;
    name: string;
    sku: string;
    unitOfMeasure: string;
  };
}

export interface PurchaseOrder {
  id: number;
  orderNumber: string;
  status: PurchaseOrderStatus;
  supplierId: number;
  supplier: Supplier;
  totalAmountUsd: number;
  notes?: string | null;
  expectedDeliveryDate?: string | null;
  createdAt: string;
  items: PurchaseOrderItem[];
}

export interface CreatePurchaseOrderPayload {
  supplierId: number;
  expectedDeliveryDate?: string;
  notes?: string;
  items: {
    productId: number;
    quantity: number;
    unitPriceUsd: number;
  }[];
}

export interface ReceiveOrderItemPayload {
  productId: number;
  lotNumber: string;
  expirationDate?: string;
  receivedQuantity: number;
}

export interface ReceiveOrderPayload {
  orderId: number;
  deliveryNoteNumber?: string;
  items: ReceiveOrderItemPayload[];
}
