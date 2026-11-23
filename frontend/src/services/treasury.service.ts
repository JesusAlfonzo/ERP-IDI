import { apiClient } from "@/lib/api-client";
import type {
  CreatePaymentOrderPayload,
  CreateTreasuryPaymentPayload,
  EligibleSourcesResponse,
  PaymentOrder,
  TreasuryPayment,
} from "@/types/treasury";

export const TreasuryService = {
  getEligibleSources: async (): Promise<EligibleSourcesResponse> => {
    const res = await apiClient.get<{
      status: string;
      data: EligibleSourcesResponse;
    }>("/treasury/eligible-sources", {
      params: { _t: Date.now() },
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    });
    return res.data?.data ?? { purchaseOrders: [], serviceOrders: [] };
  },

  getPaymentOrders: async (params?: {
    search?: string;
    status?: string;
    sourceType?: string;
    supplierId?: number | string;
  }): Promise<PaymentOrder[]> => {
    const res = await apiClient.get<{ status: string; data: PaymentOrder[] }>(
      "/treasury/payment-orders",
      {
        params: { ...params, _t: Date.now() },
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      }
    );
    return res.data?.data ?? [];
  },

  getPaymentOrderById: async (id: string | number): Promise<PaymentOrder> => {
    const res = await apiClient.get<{ status: string; data: PaymentOrder }>(
      `/treasury/payment-orders/${id}`,
      {
        params: { _t: Date.now() },
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      }
    );
    return res.data?.data;
  },

  createPaymentOrder: async (
    payload: CreatePaymentOrderPayload
  ): Promise<PaymentOrder> => {
    const res = await apiClient.post<{ status: string; data: PaymentOrder }>(
      "/treasury/payment-orders",
      payload
    );
    return res.data?.data;
  },

  approvePaymentOrder: async (
    id: string | number,
    notes?: string
  ): Promise<PaymentOrder> => {
    const res = await apiClient.post<{ status: string; data: PaymentOrder }>(
      `/treasury/payment-orders/${id}/approve`,
      { notes }
    );
    return res.data?.data;
  },

  rejectPaymentOrder: async (
    id: string | number,
    reason: string
  ): Promise<PaymentOrder> => {
    const res = await apiClient.post<{ status: string; data: PaymentOrder }>(
      `/treasury/payment-orders/${id}/reject`,
      { reason }
    );
    return res.data?.data;
  },

  resubmitPaymentOrder: async (id: string | number): Promise<PaymentOrder> => {
    const res = await apiClient.post<{ status: string; data: PaymentOrder }>(
      `/treasury/payment-orders/${id}/resubmit`
    );
    return res.data?.data;
  },

  cancelPaymentOrder: async (
    id: string | number,
    reason?: string
  ): Promise<PaymentOrder> => {
    const res = await apiClient.post<{ status: string; data: PaymentOrder }>(
      `/treasury/payment-orders/${id}/cancel`,
      { reason }
    );
    return res.data?.data;
  },

  createTreasuryPayment: async (
    paymentOrderId: string | number,
    payload: CreateTreasuryPaymentPayload
  ): Promise<{ payment: TreasuryPayment; paymentOrder: PaymentOrder }> => {
    const res = await apiClient.post<{
      status: string;
      data: { payment: TreasuryPayment; paymentOrder: PaymentOrder };
    }>(`/treasury/payment-orders/${paymentOrderId}/payments`, payload);
    return res.data?.data;
  },

  confirmTreasuryPayment: async (
    paymentId: string | number
  ): Promise<{ payment: TreasuryPayment; paymentOrder: PaymentOrder }> => {
    const res = await apiClient.post<{
      status: string;
      data: { payment: TreasuryPayment; paymentOrder: PaymentOrder };
    }>(`/treasury/payments/${paymentId}/confirm`);
    return res.data?.data;
  },

  voidTreasuryPayment: async (
    paymentId: string | number
  ): Promise<PaymentOrder> => {
    const res = await apiClient.post<{ status: string; data: PaymentOrder }>(
      `/treasury/payments/${paymentId}/void`
    );
    return res.data?.data;
  },
};
