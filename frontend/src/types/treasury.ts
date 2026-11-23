export type PaymentOrderSourceType = "PURCHASE_ORDER" | "SERVICE_ORDER";

export type PaymentOrderStatus =
  | "BORRADOR"
  | "PENDIENTE_APROBACION"
  | "APROBADA"
  | "RECHAZADA"
  | "PAGADA_PARCIALMENTE"
  | "PAGADA"
  | "ANULADA";

export type TreasuryPaymentStatus = "BORRADOR" | "CONFIRMADO" | "ANULADO";

export interface TreasuryUserRef {
  id: number;
  fullName: string;
  email: string;
  department?: string | null;
}

export interface TreasuryPaymentLine {
  id: string | number;
  paymentId: string | number;
  sourceAccountId: number;
  paymentMethod: string;
  currency: "USD" | "VED" | "EUR" | string;
  amountPaid: number | string;
  exchangeRateId?: string | number | null;
  exchangeRateValue: number | string;
  equivalentDebtAmount: number | string;
  referenceNumber?: string | null;
  receiptUrl?: string | null;
  createdAt?: string;
  sourceAccount?: {
    id: number;
    bankName: string;
    accountNumber?: string | null;
    type: string;
    currency: string;
    holderName?: string;
    holderId?: string;
  } | null;
  exchangeRate?: {
    id: string | number;
    rate: number | string;
    effectiveDate: string;
    currency?: {
      id: number;
      code: string;
      name: string;
      symbol: string;
    };
  } | null;
}

export interface TreasuryPayment {
  id: string | number;
  paymentNumber: string;
  paymentOrderId: string | number;
  paymentDate: string;
  status: TreasuryPaymentStatus;
  totalEquivalentInDebtCurrency: number | string;
  notes?: string | null;
  createdById: number;
  confirmedById?: number | null;
  confirmedAt?: string | null;
  createdAt: string;
  createdBy?: TreasuryUserRef | null;
  confirmedBy?: TreasuryUserRef | null;
  lines: TreasuryPaymentLine[];
}

export interface PaymentOrder {
  id: string | number;
  paymentOrderNumber: string;
  sourceType: PaymentOrderSourceType;
  purchaseOrderId?: string | number | null;
  serviceOrderId?: string | number | null;
  supplierId?: number | null;
  beneficiaryName: string;
  concept: string;
  debtCurrency: "USD" | "VED" | "EUR" | string;
  totalDebtAmount: number | string;
  paidAmount: number | string;
  remainingBalance: number | string;
  status: PaymentOrderStatus;
  notes?: string | null;
  createdById: number;
  approvedById?: number | null;
  approvedAt?: string | null;
  approvalNotes?: string | null;
  rejectedById?: number | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt?: string;
  supplier?: {
    id: number;
    name: string;
    rifOrId: string;
    contactName?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  purchaseOrder?: {
    id: string | number;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    currency: string;
    total: number | string;
    totalAmount?: number | string;
    totalAmountUsd?: number | string;
    totalAmountBs?: number | string;
    createdAt?: string;
  } | null;
  serviceOrder?: {
    id: string | number;
    serviceOrderNumber?: string | null;
    paymentOrderNumber?: string | null;
    status: string;
    concept: string;
    beneficiary: string;
    amountPaid: number | string;
    transactionCurrency: string;
    equivalentAmountUsd?: number | string;
    createdAt?: string;
    department?: {
      id: number;
      code: string;
      name: string;
    } | null;
  } | null;
  createdBy?: TreasuryUserRef | null;
  approvedBy?: TreasuryUserRef | null;
  rejectedBy?: TreasuryUserRef | null;
  payments?: TreasuryPayment[];
}

export interface EligiblePaymentSource {
  id: string | number;
  code: string;
  sourceType: PaymentOrderSourceType;
  beneficiaryName: string;
  rifOrId?: string | null;
  concept: string;
  debtCurrency: "USD" | "VED" | "EUR" | string;
  totalDebtAmount: number;
  paidAmount: number;
  remainingBalance: number;
  departmentName?: string | null;
  createdAt: string;
}

export interface EligibleSourcesResponse {
  purchaseOrders: EligiblePaymentSource[];
  serviceOrders: EligiblePaymentSource[];
}

export interface CreatePaymentOrderPayload {
  sourceType: PaymentOrderSourceType;
  purchaseOrderId?: string | number;
  serviceOrderId?: string | number;
  notes?: string | null;
}

export interface CreateTreasuryPaymentLinePayload {
  sourceAccountId: number;
  paymentMethod?: string;
  amountPaid: number;
  referenceNumber?: string | null;
  receiptUrl?: string | null;
}

export interface CreateTreasuryPaymentPayload {
  paymentDate: string;
  notes?: string | null;
  confirmImmediately?: boolean;
  lines: CreateTreasuryPaymentLinePayload[];
}

export interface DailyExchangeRateLookup {
  date: string;
  hasUsdRate: boolean;
  hasEurRate: boolean;
  usdRate: number | null;
  usdRateId: string | null;
  eurRate: number | null;
  eurRateId: string | null;
  vesCurrencyId?: number | null;
  eurCurrencyId?: number | null;
  latestFallback: {
    USD: number | null;
    EUR: number | null;
    effectiveDate: string | null;
  };
}
