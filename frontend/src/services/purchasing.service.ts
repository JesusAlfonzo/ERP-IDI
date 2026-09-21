import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";
import type {
  PurchaseOrder,
  Supplier,
  SupplierDebt,
  SupplierStatement,
  SupplierPayment,
  Currency,
  CreateSupplierPayload,
  RegisterPaymentPayload,
  CreatePurchaseOrderPayload,
  ReceiveOrderPayload,
} from "@/types/purchasing";

export interface OrderItemDetail {
  id: string | number;
  productId: string | number;
  unitId: number;
  quantityOrdered: number | string;
  quantityReceived: number | string;
  quantityRejected: number | string;
  multiplier: number | string;
  baseQuantity: number | string;
  unitPrice: number | string;
  taxRate: number | string;
  totalLine: number | string;
  product?: {
    id: string | number;
    name: string;
    sku: string;
    isReagent: boolean;
    baseUnit?: { abbreviation: string };
  };
  unit?: {
    id: number;
    name: string;
    abbreviation: string;
  };
}

export interface OrderDetail {
  id: string | number;
  orderNumber: string;
  supplierId: number | null;
  currencyId: number;
  exchangeRate: number | string;
  status:
    | "BORRADOR"
    | "PENDIENTE"
    | "APROBADA"
    | "PARCIAL"
    | "COMPLETADA"
    | "CANCELADA";
  paymentStatus: "PENDIENTE" | "PARCIAL" | "PAGADO";
  receptionStatus: "PENDIENTE" | "PARCIAL" | "COMPLETO";
  subtotal: number | string;
  taxTotal: number | string;
  total: number | string;
  notes: string | null;
  createdAt: string;
  supplier?: {
    id: number;
    name: string;
    rif: string;
    contactName?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  currency?: {
    id: number;
    code: string;
    name: string;
    symbol: string;
  };
  createdBy?: {
    id: number;
    fullName: string | null;
    email: string;
  };
  items: OrderItemDetail[];
  payments?: {
    id: number;
    amount: number | string;
    paymentMethod: string;
    reference: string | null;
    createdAt: string;
  }[];
  invoices?: {
    id: number;
    invoiceNumber: string;
    controlNumber: string | null;
    total: number | string;
    createdAt: string;
  }[];
}

export const PurchasingClientService = {
  // --- Órdenes de Compra ---
  getOrders: async (
    filters?: { search?: string; status?: string } | string,
  ): Promise<PurchaseOrder[]> => {
    let query = "";
    if (typeof filters === "string" && filters.trim() !== "") {
      query = `?status=${encodeURIComponent(filters.trim())}`;
    } else if (typeof filters === "object" && filters !== null) {
      const params = new URLSearchParams();
      if (filters.search) params.append("search", filters.search);
      if (filters.status) params.append("status", filters.status);
      const str = params.toString();
      if (str) query = `?${str}`;
    }

    const res = await apiClient.get<ApiResponse<PurchaseOrder[]>>(
      `/orders${query}`,
    );
    return res.data.data || [];
  },

  getOrderById: async (id: string | number): Promise<PurchaseOrder> => {
    const res = await apiClient.get<ApiResponse<PurchaseOrder>>(
      `/orders/${id}`,
    );
    const data = res.data.data;
    if (!data) throw new Error("Orden no encontrada");
    return data;
  },

  createOrder: async (
    payload:
      | CreatePurchaseOrderPayload
      | {
          supplierId?: number | null;
          currencyId: number;
          notes?: string | null;
          items: {
            productId: string | number;
            unitId: number;
            quantityOrdered: number;
            unitPrice: number;
          }[];
        },
  ): Promise<PurchaseOrder> => {
    const res = await apiClient.post<ApiResponse<PurchaseOrder>>(
      "/orders",
      payload,
    );
    const data = res.data.data;
    if (!data) throw new Error("Error al registrar orden de compra");
    return data;
  },

  receiveOrder: async (
    payloadOrOrderId: ReceiveOrderPayload | string | number,
    maybePayload?: {
      notes?: string;
      items: {
        orderItemId: string | number;
        quantityReceived: number;
        lotNumber: string;
        expirationDate: string;
        locationId?: number;
      }[];
    },
  ): Promise<PurchaseOrder> => {
    if (typeof payloadOrOrderId === "object") {
      const { orderId, ...body } = payloadOrOrderId;
      const res = await apiClient.post<ApiResponse<PurchaseOrder>>(
        `/orders/${orderId}/receive`,
        body,
      );
      const data = res.data.data;
      if (!data) throw new Error("Error al registrar recepción de orden");
      return data;
    }

    const res = await apiClient.post<ApiResponse<PurchaseOrder>>(
      `/orders/${payloadOrOrderId}/receive`,
      maybePayload,
    );
    const data = res.data.data;
    if (!data) throw new Error("Error al registrar recepción de orden");
    return data;
  },

  // --- Monedas ---
  getCurrencies: async (): Promise<Currency[]> => {
    const res = await apiClient.get<ApiResponse<Currency[]>>("/currencies");
    return res.data.data || [];
  },

  // --- Proveedores y Cartera de Pagos ---
  getSuppliers: async (): Promise<Supplier[]> => {
    const res = await apiClient.get<ApiResponse<Supplier[]>>("/suppliers");
    return res.data.data || [];
  },

  createSupplier: async (payload: CreateSupplierPayload): Promise<Supplier> => {
    const res = await apiClient.post<ApiResponse<Supplier>>(
      "/suppliers",
      payload,
    );
    const data = res.data.data;
    if (!data) throw new Error("Error al registrar proveedor");
    return data;
  },

  getSupplierDebts: async (): Promise<SupplierDebt[]> => {
    const res =
      await apiClient.get<ApiResponse<SupplierDebt[]>>("/suppliers/debts");
    return res.data.data || [];
  },

  getSupplierStatement: async (
    supplierId: number | string,
  ): Promise<SupplierStatement> => {
    const res = await apiClient.get<ApiResponse<SupplierStatement>>(
      `/suppliers/${supplierId}/statement`,
    );
    const data = res.data.data;
    if (!data) throw new Error("Estado de cuenta no disponible");
    return data;
  },

  registerPayment: async (
    payload: RegisterPaymentPayload,
  ): Promise<SupplierPayment> => {
    const res = await apiClient.post<ApiResponse<SupplierPayment>>(
      "/suppliers/payments",
      payload,
    );
    const data = res.data.data;
    if (!data) throw new Error("Error al registrar el pago");
    return data;
  },
};

export const PurchaseService = PurchasingClientService;
