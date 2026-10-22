import { apiClient } from "@/lib/api-client";

export interface BatchItem {
  id: string | number;
  lotNumber: string;
  initialQuantity: string | number;
  currentQuantity: string | number;
  unitCostUsd: string | number;
  expirationDate: string | null;
  status: "DISPONIBLE" | "EN_CUARENTENA" | "DEFECTUOSO" | "AGOTADO" | "VENCIDO";
  location?: {
    id: number;
    name: string;
    type: string;
  };
}

export interface ProductDetail {
  id: string | number;
  sku: string;
  name: string;
  barcode: string | null;
  description: string | null;
  conversionFactor: string | number;
  isTaxExempt: boolean;
  minStockAlert: number;
  isReagent: boolean;
  isActive: boolean;
  totalStock: number;
  categoryId?: number;
  brandId?: number | null;
  baseUnitId?: number;
  purchaseUnitId?: number | null;
  category?: { id: number; name: string };
  brand?: { id: number; name: string };
  baseUnit?: { id: number; name: string; abbreviation: string };
  purchaseUnit?: { id: number; name: string; abbreviation: string } | null;
  stockBatches?: BatchItem[];
  batches?: BatchItem[];
}

export interface UpdateProductPayload {
  name?: string;
  categoryId?: number;
  brandId?: number | null;
  baseUnitId?: number;
  purchaseUnitId?: number | null;
  conversionFactor?: number;
  barcode?: string | null;
  description?: string | null;
  minStockAlert?: number;
  isReagent?: boolean;
  isTaxExempt?: boolean;
}

export const ProductService = {
  getProductById: async (id: string | number): Promise<ProductDetail> => {
    const res = await apiClient.get(`/products/${id}`);
    return res.data?.data ?? res.data;
  },

  updateProduct: async (
    id: string | number,
    payload: UpdateProductPayload
  ): Promise<ProductDetail> => {
    const res = await apiClient.put(`/products/${id}`, payload);
    return res.data?.data ?? res.data;
  },
};
