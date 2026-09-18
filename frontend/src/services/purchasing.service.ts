import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";
import type {
  PurchaseOrder,
  Supplier,
  Currency,
  CreatePurchaseOrderPayload,
  CreateSupplierPayload,
  RegisterPaymentPayload,
  SupplierPayment,
  ReceiveOrderPayload,
  SupplierDebt,
  SupplierStatement,
} from "@/types/purchasing";

export const PurchasingClientService = {
  /**
   * Obtiene la lista de monedas configuradas
   * Endpoint backend: GET /api/currencies
   */
  async getCurrencies(): Promise<Currency[]> {
    const response =
      await apiClient.get<ApiResponse<Currency[]>>("/currencies");
    return response.data.data || [];
  },

  async getOrders(status?: string): Promise<PurchaseOrder[]> {
    const params = status ? `?status=${status}` : "";
    const response = await apiClient.get<ApiResponse<PurchaseOrder[]>>(
      `/orders${params}`,
    );
    return response.data.data || [];
  },

  async getOrderById(orderId: number): Promise<PurchaseOrder> {
    const response = await apiClient.get<ApiResponse<PurchaseOrder>>(
      `/orders/${orderId}`,
    );
    if (!response.data.data) {
      throw new Error(response.data.message || "Orden no encontrada");
    }
    return response.data.data;
  },

  async getSuppliers(): Promise<Supplier[]> {
    const response = await apiClient.get<ApiResponse<Supplier[]>>("/suppliers");
    return response.data.data || [];
  },

  async getSupplierDebts(): Promise<SupplierDebt[]> {
    const response =
      await apiClient.get<ApiResponse<SupplierDebt[]>>("/suppliers/debts");
    return response.data.data || [];
  },

  async getSupplierStatement(id: number): Promise<SupplierStatement> {
    const response = await apiClient.get<ApiResponse<SupplierStatement>>(
      `/suppliers/${id}/statement`,
    );
    if (!response.data.data) {
      throw new Error(
        response.data.message || "Estado de cuenta no disponible",
      );
    }
    return response.data.data;
  },

  async createSupplier(payload: CreateSupplierPayload): Promise<Supplier> {
    const response = await apiClient.post<ApiResponse<Supplier>>(
      "/suppliers",
      payload,
    );
    if (!response.data.data) {
      throw new Error(response.data.message || "Error al crear el proveedor");
    }
    return response.data.data;
  },

  async registerPayment(
    payload: RegisterPaymentPayload,
  ): Promise<SupplierPayment> {
    const response = await apiClient.post<ApiResponse<SupplierPayment>>(
      `/suppliers/${payload.supplierId}/payments`,
      payload,
    );
    if (!response.data.data) {
      throw new Error(response.data.message || "Error al registrar el pago");
    }
    return response.data.data;
  },

  async createOrder(
    payload: CreatePurchaseOrderPayload,
  ): Promise<PurchaseOrder> {
    const response = await apiClient.post<ApiResponse<PurchaseOrder>>(
      "/orders",
      payload,
    );
    if (!response.data.data) {
      throw new Error(
        response.data.message || "Error al generar la orden de compra",
      );
    }
    return response.data.data;
  },

  async receiveOrder(payload: ReceiveOrderPayload): Promise<PurchaseOrder> {
    const response = await apiClient.post<ApiResponse<PurchaseOrder>>(
      `/orders/${payload.orderId}/receive`,
      {
        notes: payload.notes,
        items: payload.items,
      },
    );
    if (!response.data.data) {
      throw new Error(
        response.data.message || "Error al procesar la recepción",
      );
    }
    return response.data.data;
  },
};
