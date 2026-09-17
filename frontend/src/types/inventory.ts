export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface StockBatch {
  id: number;
  lotNumber: string;
  initialQuantity: number;
  currentQuantity: number;
  costPrice: number;
  expirationDate: string | null;
  status: "DISPONIBLE" | "EN_CUARENTENA" | "DEFECTUOSO" | "AGOTADO";
  createdAt: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  description?: string;
  unitOfMeasure: string;
  minStockAlert: number;
  isActive: boolean;
  categoryId: number;
  category: Category;
  batches: StockBatch[];
  totalStock?: number;
}

export interface ProductFilters {
  search?: string;
  categoryId?: number;
  status?: string;
  page?: number;
  limit?: number;
}
