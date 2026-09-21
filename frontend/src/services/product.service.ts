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
  category?: { id: number; name: string };
  brand?: { id: number; name: string };
  baseUnit?: { id: number; name: string; abbreviation: string };
  purchaseUnit?: { id: number; name: string; abbreviation: string } | null;
  stockBatches?: BatchItem[];
}

// Dentro del objeto ProductService exportado:
export const ProductService = {
  // ... métodos existentes ...

  getProductById: async (id: string | number): Promise<ProductDetail> => {
    const res = await apiClient.get(`/products/${id}`);
    return res.data?.data ?? res.data;
  },
};
