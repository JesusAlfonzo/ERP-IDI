export type PurchaseOrderStatus =
  | "BORRADOR"
  | "PENDIENTE"
  | "APROBADA"
  | "PARCIAL"
  | "COMPLETADA"
  | "CANCELADA"
  | "EN_PROCESO"
  | "RECIBIDO"
  | "CANCELADO";

export type PaymentStatus = "PENDIENTE" | "PARCIAL" | "PAGADO_PARCIAL" | "PAGADO";
export type ReceptionStatus = "PENDIENTE" | "PARCIAL" | "COMPLETO";

export interface Currency {
  id: number;
  code: string;
  name: string;
  symbol: string;
  isDefault?: boolean;
}

export interface SupplierPayment {
  id: number | string;
  amountUsd?: number | string;
  amount?: number | string;
  amountPaid?: number | string;
  amortizedAmountUsd?: number | string;
  paymentMethod?:
    | "TRANSFERENCIA_USD"
    | "TRANSFERENCIA_BS"
    | "EFECTIVO_USD"
    | "EFECTIVO_BS"
    | "PAGO_MOVIL"
    | string;
  method?: string;
  sourceAccountId?: number | null;
  sourceAccount?: {
    id: number;
    bankName: string;
    accountNumber?: string | null;
    type?: string;
    currency?: string;
  } | null;
  destinationAccount?: string | null;
  bankName?: string | null;
  referenceNumber?: string | null;
  reference?: string | null;
  transactionCurrency?: string;
  exchangeRate?: number | string;
  paymentDate?: string;
  receiptImageUrl?: string | null;
  notes?: string | null;
  reviewedBy?: string | null;
  authorizedBy?: string | null;
  approvedBy?: string | null;
  createdAt?: string;
}

export interface DirectPayment {
  id: string | number;
  concept: string;
  beneficiary: string;
  method: string;
  sourceAccountId?: number | null;
  sourceAccount?: {
    id: number;
    bankName: string;
    accountNumber?: string | null;
    type: string;
    currency: string;
    holderName?: string | null;
    holderId?: string | null;
  } | null;
  destinationAccount?: string | null;
  referenceNumber?: string | null;
  paymentDate: string;
  amountPaid: number | string;
  transactionCurrency: string;
  exchangeRate: number | string;
  equivalentAmountUsd: number | string;
  notes?: string | null;
  receiptImageUrl?: string | null;
  reviewedBy?: string | null;
  authorizedBy?: string | null;
  approvedBy?: string | null;
  registeredById?: number;
  registeredBy?: {
    id: number;
    fullName: string;
    email: string;
  };
  createdAt?: string;
}

export interface Supplier {
  id: number;
  rifOrId?: string;
  rif?: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSupplierPayload {
  rifOrId: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface RegisterPaymentPayload {
  supplierId: number;
  amountUsd: number;
  paymentMethod:
    | "TRANSFERENCIA_USD"
    | "TRANSFERENCIA_BS"
    | "EFECTIVO_USD"
    | "EFECTIVO_BS"
    | "PAGO_MOVIL";
  referenceNumber: string;
  paymentDate?: string;
  notes?: string;
}

export interface SupplierDebt {
  id: number;
  name: string;
  rifOrId: string;
  totalPurchasedUsd: number;
  totalPaidUsd: number;
  totalPaidThisMonthUsd: number;
  balanceUsd: number;
  status: "SOLVENTE" | "CON_DEUDA";
}

export interface SupplierStatement {
  supplier: { id: number; name: string; rifOrId: string };
  orders: Array<
    PurchaseOrder & {
      totalUsd: number;
      paidUsd: number;
      balanceUsd: number;
      payments?: Array<{
        id: number;
        paymentDate: string;
        paymentMethod: string;
        amount: number;
      }>;
    }
  >;
  totalPurchasedUsd: number;
  totalPaidUsd: number;
  balanceUsd: number;
}

export interface PurchaseOrderItem {
  id: number;
  orderId?: number;
  productId: number;
  unitId?: number;
  quantityOrdered: number;
  quantityReceived?: number;
  quantityRejected?: number;
  multiplier?: number;
  baseQuantity?: number;
  unitPrice: number;
  taxRate?: number;
  totalLine?: number;
  product?: {
    id: number;
    name: string;
    sku?: string | null;
    isReagent?: boolean;
    unitOfMeasure?: string;
    baseUnit?: {
      id?: number;
      name?: string;
      abbreviation: string;
    };
  };
  unit?: {
    id: number;
    name: string;
    abbreviation: string;
  };
  isExempt?: boolean;
}

export type PurchaseRequisitionStatus =
  | "BORRADOR"
  | "EN_COTIZACION"
  | "ADJUDICADA"
  | "CANCELADA";

export interface PurchaseRequisitionItem {
  id: number;
  requisitionId: number;
  productId: number;
  unitId: number;
  quantityRequested: number;
  estimatedPrice?: number | null;
  product?: {
    id: number;
    name: string;
    sku?: string | null;
    isTaxExempt?: boolean;
    conversionFactor?: number;
    baseUnitId?: number;
    purchaseUnitId?: number | null;
    baseUnit?: { id?: number; name?: string; abbreviation: string };
    purchaseUnit?: { id?: number; name?: string; abbreviation: string } | null;
  };
  unit?: {
    id: number;
    name: string;
    abbreviation: string;
  };
}

export interface PurchaseRequisition {
  id: number;
  requisitionNumber: string;
  departmentId?: number;
  department?: {
    id: number;
    code: string;
    name: string;
  };
  departmentSection?: string;
  justification: string;
  status: PurchaseRequisitionStatus;
  notes?: string | null;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: number;
    fullName: string;
    email: string;
  };
  items: PurchaseRequisitionItem[];
  orders?: Array<{
    id: number;
    orderNumber: string;
    status: string;
    totalAmountUsd?: number;
    createdAt: string;
  }>;
}

export interface CreatePurchaseRequisitionItemPayload {
  productId: number;
  unitId: number;
  quantityRequested: number;
  estimatedPrice?: number | null;
}

export interface CreatePurchaseRequisitionPayload {
  departmentId?: number;
  departmentSection?: string;
  justification: string;
  notes?: string | null;
  items: CreatePurchaseRequisitionItemPayload[];
}

export interface ConvertRequisitionToOrderPayload {
  supplierId: number;
  currencyId?: number;
  currency?: string;
  exchangeRate?: number;
  notes?: string | null;
  items: Array<{
    itemId?: number;
    productId: number;
    unitId: number;
    quantityOrdered: number;
    unitPrice: number;
    isExempt: boolean;
  }>;
}

export interface PurchaseOrder {
  id: number;
  orderNumber?: string;
  status: PurchaseOrderStatus;
  paymentStatus?: PaymentStatus;
  receptionStatus?: ReceptionStatus;
  supplierId?: number | null;
  currencyId?: number;
  currency?: string | Currency;
  currencyRel?: Currency;
  exchangeRate?: number;
  supplier?: Supplier | null;
  subtotal?: number;
  taxTotal?: number;
  total?: number;
  taxableAmount?: number;
  exemptAmount?: number;
  taxAmount?: number;
  totalAmount?: number;
  totalAmountUsd?: number;
  taxableAmountUsd?: number;
  exemptAmountUsd?: number;
  taxAmountUsd?: number;
  totalAmountBs?: number;
  requisitionId?: number | null;
  requisition?: {
    id: number;
    requisitionNumber: string;
    departmentSection?: string;
  } | null;
  notes?: string | null;
  expectedDeliveryDate?: string | null;
  createdAt: string;
  items: PurchaseOrderItem[];
  payments?: SupplierPayment[];
  invoices?: Array<{
    id: number;
    invoiceNumber: string;
    controlNumber?: string | null;
    total: number;
    createdAt: string;
  }>;
}

export interface CreateOrderItemPayload {
  productId: number;
  unitId: number;
  quantityOrdered: number;
  unitPrice: number;
  isExempt?: boolean;
}

export interface CreatePurchaseOrderPayload {
  supplierId?: number | null;
  currencyId?: number;
  currency?: string;
  exchangeRate?: number;
  requisitionId?: number | null;
  notes?: string | null;
  expectedDeliveryDate?: string;
  items: CreateOrderItemPayload[];
}

export interface ReceiveOrderItemPayload {
  orderItemId: number;
  quantityReceived: number;
  lotNumber: string;
  expirationDate: string;
  locationId?: number;
  requiresQuarantine?: boolean;
}

export interface ReceiveOrderPayload {
  orderId: number;
  notes?: string | null;
  items: ReceiveOrderItemPayload[];
}
