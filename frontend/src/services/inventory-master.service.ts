import { apiClient } from "@/lib/api-client";

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
  _count?: { baseProducts: number };
}

export interface LocationItem {
  id: number;
  name: string;
  type: "ALMACEN_GENERAL" | "LABORATORIO" | "OFICINA" | "DEPOSITO";
  description: string | null;
  _count?: { stockBatches: number; fridges: number };
}

export const InventoryMasterService = {
  // Marcas
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

  // Unidades
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

  // Ubicaciones
  getLocations: async (): Promise<LocationItem[]> => {
    const res = await apiClient.get("/inventory/masters/locations");
    return res.data;
  },
  createLocation: async (data: {
    name: string;
    type: string;
    description?: string;
  }): Promise<LocationItem> => {
    const res = await apiClient.post("/inventory/masters/locations", data);
    return res.data;
  },
};
