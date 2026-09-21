import { apiClient } from "@/lib/api-client";
import type { ApiResponse, PaginatedApiResponse } from "@/types/api";
import type {
  Product,
  Brand,
  Unit,
  Location,
  Category,
  ProductFilters,
  StockBatch,
  CatalogsResponse,
  CreateProductPayload,
} from "@/types/inventory";
import type { KardexItem, KardexFilters } from "@/types/kardex";
import type {
  InventoryAdjustmentPayload,
  AdjustmentResponseData,
} from "@/types/adjustments";

export const InventoryClientService = {
  /**
   * Obtiene la lista de productos
   * Endpoint backend: GET /api/products
   */
  // Dentro del objeto o clase InventoryClientService
  getMovementById: async (id: string | number) => {
    const res = await apiClient.get(`/inventory/movements/${id}`);
    return res.data?.data ?? res.data;
  },
  async getProducts(filters?: ProductFilters): Promise<Product[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.append("search", filters.search);
    if (filters?.categoryId)
      params.append("categoryId", String(filters.categoryId));
    if (filters?.isReagent !== undefined)
      params.append("isReagent", String(filters.isReagent));
    if (filters?.page) params.append("page", String(filters.page));
    if (filters?.limit) params.append("limit", String(filters.limit));

    const response = await apiClient.get<
      ApiResponse<Product[] | PaginatedApiResponse<Product>>
    >(`/products?${params.toString()}`);

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
   * Obtiene los catálogos combinados (categorías, marcas, unidades)
   * Endpoint backend: GET /api/products/catalogs
   */
  async getCatalogs(): Promise<CatalogsResponse> {
    const response =
      await apiClient.get<ApiResponse<CatalogsResponse>>("/products/catalogs");
    return response.data.data || { categories: [], brands: [], units: [] };
  },

  async getBrands() {
    const response =
      await apiClient.get<ApiResponse<Brand[]>>("/catalog/brands");
    return response.data.data || [];
  },

  async createBrand(payload: { name: string; description?: string }) {
    const response = await apiClient.post<ApiResponse<Brand>>(
      "/catalog/brands",
      payload,
    );
    if (!response.data.data)
      throw new Error(response.data.message || "No se pudo crear la marca");
    return response.data.data;
  },

  async updateBrand(
    id: number,
    payload: { name?: string; description?: string },
  ) {
    const response = await apiClient.patch<ApiResponse<Brand>>(
      `/catalog/brands/${id}`,
      payload,
    );
    if (!response.data.data)
      throw new Error(
        response.data.message || "No se pudo actualizar la marca",
      );
    return response.data.data;
  },

  async getUnits() {
    const response = await apiClient.get<ApiResponse<Unit[]>>("/catalog/units");
    return response.data.data || [];
  },

  async createUnit(payload: { name: string; abbreviation: string }) {
    const response = await apiClient.post<ApiResponse<Unit>>(
      "/catalog/units",
      payload,
    );
    if (!response.data.data)
      throw new Error(response.data.message || "No se pudo crear la unidad");
    return response.data.data;
  },

  async updateUnit(
    id: number,
    payload: { name?: string; abbreviation?: string },
  ) {
    const response = await apiClient.patch<ApiResponse<Unit>>(
      `/catalog/units/${id}`,
      payload,
    );
    if (!response.data.data)
      throw new Error(
        response.data.message || "No se pudo actualizar la unidad",
      );
    return response.data.data;
  },

  async getLocations() {
    const response =
      await apiClient.get<ApiResponse<Location[]>>("/catalog/locations");
    return response.data.data || [];
  },

  async createLocation(payload: {
    name: string;
    type: string;
    description?: string;
  }) {
    const response = await apiClient.post<ApiResponse<Location>>(
      "/catalog/locations",
      payload,
    );
    if (!response.data.data)
      throw new Error(response.data.message || "No se pudo crear la ubicación");
    return response.data.data;
  },

  async updateLocation(
    id: number,
    payload: { name?: string; type?: string; description?: string },
  ) {
    const response = await apiClient.patch<ApiResponse<Location>>(
      `/catalog/locations/${id}`,
      payload,
    );
    if (!response.data.data)
      throw new Error(
        response.data.message || "No se pudo actualizar la ubicación",
      );
    return response.data.data;
  },

  /**
   * Obtiene categorías individuales desde /catalog
   */
  async getCategories(): Promise<Category[]> {
    const response = await apiClient.get<ApiResponse<Category[]>>(
      "/catalog/categories",
    );
    return response.data.data || [];
  },

  /**
   * Registra un nuevo producto/insumo en el catálogo maestro
   * Endpoint backend: POST /api/products
   */
  async createProduct(payload: CreateProductPayload): Promise<Product> {
    const response = await apiClient.post<ApiResponse<Product>>(
      "/products",
      payload,
    );
    if (!response.data.data) {
      throw new Error(
        response.data.message || "Error al registrar el producto",
      );
    }
    return response.data.data;
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

    const response = await apiClient.get<
      PaginatedApiResponse<{
        id: string;
        createdAt: string;
        type: string;
        notes: string | null;
        createdBy: { fullName: string; username: string } | null;
        items: {
          id: string;
          quantity: number | string;
          unitCost: number | string | null;
          batch: {
            id: string;
            lotNumber: string;
            expirationDate: string | null;
            product: {
              id: string;
              name: string;
              sku: string;
              baseUnit: { abbreviation: string };
            };
          };
        }[];
      }>
    >(`/inventory/movements?${params.toString()}`);

    const rows: KardexItem[] = [];
    for (const movement of response.data.data || []) {
      for (const item of movement.items) {
        rows.push({
          id: Number(item.id),
          createdAt: movement.createdAt,
          type: movement.type as KardexItem["type"],
          quantity: Number(item.quantity),
          balanceAfter: null,
          unitCost: item.unitCost === null ? null : Number(item.unitCost),
          performedBy: movement.createdBy,
          reason: movement.notes,
          batch: {
            lotNumber: item.batch.lotNumber,
            expirationDate: item.batch.expirationDate,
            product: {
              name: item.batch.product.name,
              sku: item.batch.product.sku,
              unitOfMeasure: item.batch.product.baseUnit.abbreviation,
            },
          },
        });
      }
    }

    return { ...response.data, data: rows };
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
    >("/inventory/batches?status=DISPONIBLE&limit=30");
    return response.data.data || [];
  },

  async searchActiveBatches(search: string): Promise<
    (StockBatch & {
      product: { name: string; sku: string; unitOfMeasure: string };
    })[]
  > {
    const params = new URLSearchParams({ status: "DISPONIBLE", limit: "30" });
    if (search.trim()) params.set("search", search.trim());
    const response = await apiClient.get<
      ApiResponse<
        (StockBatch & {
          product: {
            name: string;
            sku: string;
            baseUnit?: { abbreviation: string };
          };
        })[]
      >
    >(`/inventory/batches?${params.toString()}`);
    return (response.data.data || []).map((batch) => ({
      ...batch,
      product: {
        name: batch.product.name,
        sku: batch.product.sku,
        unitOfMeasure: batch.product.baseUnit?.abbreviation || "Unid",
      },
    }));
  },

  /**
   * Registra un ajuste manual o merma en el inventario
   */
  async createAdjustment(
    payload: InventoryAdjustmentPayload,
  ): Promise<AdjustmentResponseData> {
    const response = await apiClient.post<
      ApiResponse<{
        movement: { id: number };
        details: { batch: { id: number; currentQuantity: number } }[];
      }>
    >("/inventory/adjustments", payload);

    if (!response.data.data) {
      throw new Error(
        response.data.message || "Error al procesar el ajuste de inventario",
      );
    }

    const result = response.data.data;
    const detail = result?.details?.[0];
    return {
      movementId: Number(result?.movement?.id ?? 0),
      batchId: Number(detail?.batch?.id ?? 0),
      newBalance: Number(detail?.batch?.currentQuantity ?? 0),
      message: response.data.message || "Ajuste aplicado correctamente",
    };
  },

  async registerDirectWaste(payload: {
    batchId: number;
    quantity: number;
    reason: string;
  }): Promise<AdjustmentResponseData> {
    const response = await apiClient.post<
      ApiResponse<{
        movement: { id: number };
        details: { batch: { id: number; currentQuantity: number } }[];
      }>
    >("/inventory/wastes", { wastes: [payload] });

    const result = response.data.data;
    const detail = result?.details?.[0];
    return {
      movementId: Number(result?.movement?.id ?? 0),
      batchId: Number(detail?.batch?.id ?? payload.batchId),
      newBalance: Number(detail?.batch?.currentQuantity ?? 0),
      message: response.data.message || "Merma registrada correctamente",
    };
  },
};
