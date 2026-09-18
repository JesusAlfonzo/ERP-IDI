export interface Category {
  id: number;
  name: string;
  description?: string | null;
  _count?: { products: number };
}

export interface Brand {
  id: number;
  name: string;
  description?: string | null;
  _count?: { products: number };
}

export interface Unit {
  id: number;
  name: string;
  abbreviation: string;
  description?: string | null;
}

export interface Location {
  id: number;
  name: string;
  type: string;
  description?: string | null;
  _count?: { stockBatches: number };
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
  sku?: string | null;
  barcode?: string | null;
  description?: string | null;
  unitOfMeasure?: string;
  minStockAlert: number;
  isActive?: boolean;
  isTaxExempt?: boolean;
  isReagent?: boolean;
  conversionFactor?: number;
  categoryId: number;
  brandId?: number | null;
  baseUnitId?: number;
  purchaseUnitId?: number | null;
  category?: Category;
  brand?: Brand | null;
  baseUnit?: Unit;
  purchaseUnit?: Unit | null;
  batches?: StockBatch[];
  totalStock?: number;
}

export interface ProductFilters {
  search?: string;
  categoryId?: number;
  isReagent?: boolean;
  status?: string;
  page?: number;
  limit?: number;
}

export interface CatalogsResponse {
  categories: Category[];
  brands: Brand[];
  units: Unit[];
}

export interface CreateProductPayload {
  name: string;
  categoryId: number;
  baseUnitId: number;
  purchaseUnitId?: number | null;
  conversionFactor?: number;
  brandId?: number | null;
  barcode?: string | null;
  description?: string | null;
  isTaxExempt?: boolean;
  minStockAlert?: number;
  isReagent?: boolean;
}
