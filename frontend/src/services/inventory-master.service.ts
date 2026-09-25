import { apiClient } from "@/lib/api-client";

export type LocationAreaType =
  | "ALMACEN_GENERAL"
  | "LABORATORIO"
  | "OFICINA"
  | "DEPOSITO";

export interface CategoryItem {
  id: number;
  name: string;
  description: string | null;
  code?: string | null;
  _count?: { products: number };
}

export interface Brand {
  id: number;
  name: string;
  description: string | null;
  _count?: { products: number };
}

export interface Unit {
  id: number;
  name: string;
  abbreviation: string;
  _count?: { baseProducts: number; purchProducts?: number };
}

export interface LocationItem {
  id: number;
  name: string;
  type: LocationAreaType;
  description: string | null;
  _count?: { stockBatches: number; fridges: number };
}

export const InventoryMasterService = {
  // ==================== CATEGORÍAS ====================
  getCategories: async (): Promise<CategoryItem[]> => {
    const res = await apiClient.get("/inventory/masters/categories");
    return res.data;
  },
  createCategory: async (data: {
    name: string;
    description?: string;
    code?: string;
  }): Promise<CategoryItem> => {
    const res = await apiClient.post("/inventory/masters/categories", data);
    return res.data;
  },
  updateCategory: async (
    id: number,
    data: { name?: string; description?: string; code?: string },
  ): Promise<CategoryItem> => {
    const res = await apiClient.patch(
      `/inventory/masters/categories/${id}`,
      data,
    );
    return res.data;
  },
  deleteCategory: async (
    id: number,
  ): Promise<{ status: string; message: string }> => {
    const res = await apiClient.delete(`/inventory/masters/categories/${id}`);
    return res.data;
  },

  // ==================== MARCAS ====================
  getBrands: async (): Promise<Brand[]> => {
    const res = await apiClient.get("/inventory/masters/brands");
    return res.data;
  },
  createBrand: async (data: {
    name: string;
    description?: string;
  }): Promise<Brand> => {
    const res = await apiClient.post("/inventory/masters/brands", data);
    return res.data;
  },
  updateBrand: async (
    id: number,
    data: { name?: string; description?: string },
  ): Promise<Brand> => {
    const res = await apiClient.patch(`/inventory/masters/brands/${id}`, data);
    return res.data;
  },
  deleteBrand: async (
    id: number,
  ): Promise<{ status: string; message: string }> => {
    const res = await apiClient.delete(`/inventory/masters/brands/${id}`);
    return res.data;
  },

  // ==================== UNIDADES DE MEDIDA ====================
  getUnits: async (): Promise<Unit[]> => {
    const res = await apiClient.get("/inventory/masters/units");
    return res.data;
  },
  createUnit: async (data: {
    name: string;
    abbreviation: string;
  }): Promise<Unit> => {
    const res = await apiClient.post("/inventory/masters/units", data);
    return res.data;
  },
  updateUnit: async (
    id: number,
    data: { name?: string; abbreviation?: string },
  ): Promise<Unit> => {
    const res = await apiClient.patch(`/inventory/masters/units/${id}`, data);
    return res.data;
  },
  deleteUnit: async (
    id: number,
  ): Promise<{ status: string; message: string }> => {
    const res = await apiClient.delete(`/inventory/masters/units/${id}`);
    return res.data;
  },

  // ==================== UBICACIONES FÍSICAS ====================
  getLocations: async (): Promise<LocationItem[]> => {
    const res = await apiClient.get("/inventory/masters/locations");
    return res.data;
  },
  createLocation: async (data: {
    name: string;
    type: LocationAreaType;
    description?: string;
  }): Promise<LocationItem> => {
    const res = await apiClient.post("/inventory/masters/locations", data);
    return res.data;
  },
  updateLocation: async (
    id: number,
    data: { name?: string; type?: LocationAreaType; description?: string },
  ): Promise<LocationItem> => {
    const res = await apiClient.patch(
      `/inventory/masters/locations/${id}`,
      data,
    );
    return res.data;
  },
  deleteLocation: async (
    id: number,
  ): Promise<{ status: string; message: string }> => {
    const res = await apiClient.delete(`/inventory/masters/locations/${id}`);
    return res.data;
  },
};
