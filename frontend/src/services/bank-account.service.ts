import { apiClient } from "@/lib/api-client";
import type { DirectPayment } from "@/types/purchasing";

export interface BankAccountItem {
  id: number;
  bankName: string;
  accountNumber?: string | null;
  type: string; // 'CORRIENTE' | 'CUSTODIA' | 'EFECTIVO'
  currency: string; // 'USD' | 'EUR' | 'VED'
  holderName: string;
  holderId: string; // RIF / Cédula
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateBankAccountPayload {
  bankName: string;
  accountNumber?: string | null;
  type: string;
  currency: string;
  holderName: string;
  holderId: string;
  isActive?: boolean;
}

export interface UpdateBankAccountPayload {
  bankName?: string;
  accountNumber?: string | null;
  type?: string;
  currency?: string;
  holderName?: string;
  holderId?: string;
  isActive?: boolean;
}

export interface RegisterOrderPaymentPayload {
  method: "TRANSFERENCIA" | "PAGO_MOVIL" | "EFECTIVO" | "ZELLE" | string;
  sourceAccountId?: number | null;
  destinationAccount?: string | null;
  referenceNumber?: string | null;
  amountPaid: number;
  transactionCurrency: "USD" | "EUR" | "VED" | string;
  exchangeRate?: number | null;
  paymentDate?: string;
  bankName?: string | null;
  receiptImageUrl?: string | null;
  reviewedBy?: string | null;
  authorizedBy?: string | null;
  approvedBy?: string | null;
}

export interface CreateDirectPaymentPayload {
  concept: string;
  beneficiary: string;
  method: "TRANSFERENCIA" | "PAGO_MOVIL" | "EFECTIVO" | "ZELLE" | string;
  sourceAccountId?: number | null;
  destinationAccount?: string | null;
  referenceNumber?: string | null;
  paymentDate?: string;
  amountPaid: number;
  transactionCurrency: "USD" | "EUR" | "VED" | string;
  exchangeRate?: number | null;
  notes?: string | null;
  receiptImageUrl?: string | null;
  reviewedBy?: string | null;
  authorizedBy?: string | null;
  approvedBy?: string | null;
}

export interface OrderPaymentResult {
  payment: {
    id: string | number;
    orderId: string | number;
    method: string;
    amountPaid: number | string;
    transactionCurrency: string;
    exchangeRate: number | string;
    amortizedAmountUsd: number | string;
    referenceNumber?: string | null;
    bankName?: string | null;
    paymentDate: string;
    sourceAccount?: BankAccountItem | null;
  };
  orderTotalUsd: number;
  alreadyPaidUsd: number;
  remainingDebtUsd: number;
  paymentStatus: "PENDIENTE" | "PAGADO_PARCIAL" | "PAGADO" | "EXONERADO";
}

export interface OrderFinancialSummary {
  orderId: string | number;
  orderNumber?: string;
  currency: string;
  exchangeRate: number;
  totalAmountUsd: number;
  totalAmountBs: number;
  totalPaidUsd: number;
  remainingDebtUsd: number;
  paymentStatus: "PENDIENTE" | "PAGADO_PARCIAL" | "PAGADO";
  paymentsCount: number;
  invoicesCount: number;
  payments: Array<{
    id: string | number;
    orderId: string | number;
    method?: string;
    paymentMethod?: string;
    sourceAccountId?: number | null;
    sourceAccount?: BankAccountItem | null;
    destinationAccount?: string | null;
    bankName?: string | null;
    referenceNumber?: string | null;
    currencyId?: number;
    transactionCurrency?: string;
    exchangeRate?: number | string;
    amount?: number | string;
    amountPaid?: number | string;
    amortizedAmountUsd?: number | string;
    paymentDate: string;
    createdAt?: string;
  }>;
  invoices: Array<{
    id: string | number;
    invoiceNumber: string;
    controlNumber?: string | null;
    taxAmount?: number | string;
    totalAmount: number | string;
    invoiceDate?: string;
  }>;
}

export const BankAccountService = {
  getBankAccounts: async (activeOnly = false): Promise<BankAccountItem[]> => {
    const res = await apiClient.get<{ status: string; data: BankAccountItem[] }>(
      "/financial/bank-accounts",
      {
        params: { activeOnly, _t: Date.now() },
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      }
    );
    return res.data?.data ?? [];
  },

  getBankAccountById: async (id: number): Promise<BankAccountItem> => {
    const res = await apiClient.get<{ status: string; data: BankAccountItem }>(
      `/financial/bank-accounts/${id}`
    );
    return res.data?.data;
  },

  createBankAccount: async (
    payload: CreateBankAccountPayload
  ): Promise<BankAccountItem> => {
    const res = await apiClient.post<{ status: string; data: BankAccountItem }>(
      "/financial/bank-accounts",
      payload
    );
    return res.data?.data;
  },

  updateBankAccount: async (
    id: number,
    payload: UpdateBankAccountPayload
  ): Promise<BankAccountItem> => {
    const res = await apiClient.put<{ status: string; data: BankAccountItem }>(
      `/financial/bank-accounts/${id}`,
      payload
    );
    return res.data?.data;
  },

  deleteBankAccount: async (id: number): Promise<void> => {
    await apiClient.delete(`/financial/bank-accounts/${id}`);
  },

  // Motor de pagos para la Orden de Compra
  registerOrderPayment: async (
    orderId: string | number,
    payload: RegisterOrderPaymentPayload
  ): Promise<OrderPaymentResult> => {
    const res = await apiClient.post<{ status: string; data: OrderPaymentResult }>(
      `/orders/${orderId}/payments`,
      payload
    );
    return res.data?.data;
  },

  getOrderFinancialSummary: async (
    orderId: string | number
  ): Promise<OrderFinancialSummary> => {
    const res = await apiClient.get<{ status: string; data: OrderFinancialSummary }>(
      `/orders/${orderId}/finance`,
      {
        params: { _t: Date.now() },
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      }
    );
    return res.data?.data;
  },

  // Egresos / Pagos Directos sin Orden de Compra previa
  getDirectPayments: async (params?: {
    search?: string;
    method?: string;
    currency?: string;
    startDate?: string;
    endDate?: string;
    sourceAccountId?: number | string;
  }): Promise<DirectPayment[]> => {
    const res = await apiClient.get<{ status: string; data: DirectPayment[] }>(
      "/financial/direct-payments",
      {
        params: { ...params, _t: Date.now() },
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      }
    );
    return res.data?.data ?? [];
  },

  getDirectPaymentById: async (id: string | number): Promise<DirectPayment> => {
    const res = await apiClient.get<{ status: string; data: DirectPayment }>(
      `/financial/direct-payments/${id}`,
      {
        params: { _t: Date.now() },
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      }
    );
    return res.data?.data;
  },

  createDirectPayment: async (
    payload: CreateDirectPaymentPayload
  ): Promise<DirectPayment> => {
    const res = await apiClient.post<{ status: string; data: DirectPayment }>(
      "/financial/direct-payments",
      payload
    );
    return res.data?.data;
  },

  deleteDirectPayment: async (id: string | number): Promise<void> => {
    await apiClient.delete(`/financial/direct-payments/${id}`);
  },
};
