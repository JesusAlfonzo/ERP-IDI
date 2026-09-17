import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";
import type {
  PurchaseOrder,
  Supplier,
  CreatePurchaseOrderPayload,
  CreateSupplierPayload,
  RegisterPaymentPayload,
  SupplierPayment,
  ReceiveOrderPayload,
} from "@/types/purchasing";

export const PurchasingClientService = {
  async getOrders(status?: string): Promise<PurchaseOrder[]> {
    const params = status ? `?status=${status}` : "";
    const response = await apiClient.get<ApiResponse<PurchaseOrder[]>>(
      `/purchasing/orders${params}`,
    );
    return response.data.data || [];
  },

  async getSuppliers(): Promise<Supplier[]> {
    const response = await apiClient.get<ApiResponse<Supplier[]>>(
      "/purchasing/suppliers",
    );
    return response.data.data || [];
  },

  async createSupplier(payload: CreateSupplierPayload): Promise<Supplier> {
    const response = await apiClient.post<ApiResponse<Supplier>>(
      "/purchasing/suppliers",
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
      `/purchasing/suppliers/${payload.supplierId}/payments`,
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
      "/purchasing/orders",
      payload,
    );
    if (!response.data.data) {
      throw new Error(
        response.data.message || "Error al generar la orden de compra",
      );
    }
    return response.data.data;
  },

  /**
   * Obtiene el detalle completo de una orden de compra con sus ítems
   */
  async getOrderById(orderId: number): Promise<PurchaseOrder> {
    const response = await apiClient.get<ApiResponse<PurchaseOrder>>(
      `/purchasing/orders/${orderId}`,
    );
    if (!response.data.data) {
      throw new Error(response.data.message || "Orden no encontrada");
    }
    return response.data.data;
  },

  /**
   * Procesa la entrada física de mercancía generando lotes en cuarentena
   */
  async receiveOrder(payload: ReceiveOrderPayload): Promise<PurchaseOrder> {
    const response = await apiClient.post<ApiResponse<PurchaseOrder>>(
      `/purchasing/orders/${payload.orderId}/receive`,
      payload,
    );
    if (!response.data.data) {
      throw new Error(
        response.data.message || "Error al procesar la recepción",
      );
    }
    return response.data.data;
  },
};
