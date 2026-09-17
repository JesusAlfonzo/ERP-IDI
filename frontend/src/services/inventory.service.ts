import { apiClient } from "@/lib/api-client";
import type { ApiResponse, PaginatedApiResponse } from "@/types/api";
import type {
  Product,
  Category,
  ProductFilters,
  StockBatch,
} from "@/types/inventory";
import type { KardexItem, KardexFilters } from "@/types/kardex";
import type {
  InventoryAdjustmentPayload,
  AdjustmentResponseData,
} from "@/types/adjustments";

export const InventoryClientService = {
  /**
   * Obtiene la lista de productos con sus lotes y categorías
   */
  async getProducts(filters?: ProductFilters): Promise<Product[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.append("search", filters.search);
    if (filters?.categoryId)
      params.append("categoryId", String(filters.categoryId));
    if (filters?.status) params.append("status", filters.status);
    if (filters?.page) params.append("page", String(filters.page));
    if (filters?.limit) params.append("limit", String(filters.limit));

    const response = await apiClient.get<
      ApiResponse<Product[] | PaginatedApiResponse<Product>>
    >(`/catalog/products?${params.toString()}`);

    // Soporta tanto array directo como respuesta paginada estándar
    const rawData = response.data.data;
    if (Array.isArray(rawData)) {
      return rawData;
    }
    if (
      rawData &&
      "data" in rawData &&
      Array.isArray((rawData as PaginatedApiResponse<Product>).data)
    ) {
      return (rawData as PaginatedApiResponse<Product>).data;
    }
    return [];
  },

  /**
   * Obtiene las categorías para los filtros del catálogo
   */
  async getCategories(): Promise<Category[]> {
    const response = await apiClient.get<ApiResponse<Category[]>>(
      "/catalog/categories",
    );
    return response.data.data || [];
  },

  /**
   * Consulta el registro de movimientos del Kardex
   */
  async getKardex(
    filters?: KardexFilters,
  ): Promise<PaginatedApiResponse<KardexItem>> {
    const params = new URLSearchParams();
    if (filters?.page) params.append("page", String(filters.page));
    if (filters?.limit) params.append("limit", String(filters.limit));
    if (filters?.type) params.append("type", filters.type);
    if (filters?.batchId) params.append("batchId", String(filters.batchId));
    if (filters?.startDate) params.append("startDate", filters.startDate);
    if (filters?.endDate) params.append("endDate", filters.endDate);
    if (filters?.search) params.append("search", filters.search);

    const response = await apiClient.get<PaginatedApiResponse<KardexItem>>(
      `/inventory/kardex?${params.toString()}`,
    );

    return response.data;
  },

  /**
   * Obtiene todos los lotes disponibles/activos para el selector del formulario
   */
  async getActiveBatches(): Promise<
    (StockBatch & {
      product: { name: string; sku: string; unitOfMeasure: string };
    })[]
  > {
    const response = await apiClient.get<
      ApiResponse<
        (StockBatch & {
          product: { name: string; sku: string; unitOfMeasure: string };
        })[]
      >
    >("/inventory/batches?status=DISPONIBLE");
    return response.data.data || [];
  },

  /**
   * Registra un ajuste manual o merma en el inventario
   */
  async createAdjustment(
    payload: InventoryAdjustmentPayload,
  ): Promise<AdjustmentResponseData> {
    const response = await apiClient.post<ApiResponse<AdjustmentResponseData>>(
      "/inventory/adjustments",
      payload,
    );

    if (!response.data.data) {
      throw new Error(
        response.data.message || "Error al procesar el ajuste de inventario",
      );
    }

    return response.data.data;
  },
};
