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

export interface DepartmentItem {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  _count?: { requests: number; purchaseRequisitions: number };
}

export interface PaymentMethodItem {
  id: number;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface JustificationConceptItem {
  id: number;
  code: string;
  title: string;
  description: string | null;
  category: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const InventoryMasterService = {
  // ==================== ÁREAS / DEPARTAMENTOS ====================
  getDepartments: async (activeOnly?: boolean): Promise<DepartmentItem[]> => {
    const res = await apiClient.get("/inventory/masters/departments", {
      params: activeOnly ? { activeOnly: "true" } : undefined,
    });
    return res.data;
  },
  createDepartment: async (data: {
    code: string;
    name: string;
    description?: string;
    isActive?: boolean;
  }): Promise<DepartmentItem> => {
    const res = await apiClient.post("/inventory/masters/departments", data);
    return res.data;
  },
  updateDepartment: async (
    id: number,
    data: {
      code?: string;
      name?: string;
      description?: string;
      isActive?: boolean;
    },
  ): Promise<DepartmentItem> => {
    const res = await apiClient.patch(
      `/inventory/masters/departments/${id}`,
      data,
    );
    return res.data;
  },
  deleteDepartment: async (
    id: number,
  ): Promise<{ status: string; message: string }> => {
    const res = await apiClient.delete(`/inventory/masters/departments/${id}`);
    return res.data;
  },

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

  // ==================== MÉTODOS DE PAGO ====================
  getPaymentMethods: async (activeOnly?: boolean): Promise<PaymentMethodItem[]> => {
    const res = await apiClient.get("/inventory/masters/payment-methods", {
      params: activeOnly ? { activeOnly: "true" } : undefined,
    });
    return res.data;
  },
  createPaymentMethod: async (data: {
    code: string;
    name: string;
    description?: string;
    isActive?: boolean;
  }): Promise<PaymentMethodItem> => {
    const res = await apiClient.post("/inventory/masters/payment-methods", data);
    return res.data;
  },
  updatePaymentMethod: async (
    id: number,
    data: {
      code?: string;
      name?: string;
      description?: string;
      isActive?: boolean;
    },
  ): Promise<PaymentMethodItem> => {
    const res = await apiClient.patch(`/inventory/masters/payment-methods/${id}`, data);
    return res.data;
  },
  deletePaymentMethod: async (id: number): Promise<{ status: string; message: string }> => {
    const res = await apiClient.delete(`/inventory/masters/payment-methods/${id}`);
    return res.data;
  },

  // ==================== CONCEPTOS DE JUSTIFICACIÓN Y PROTOCOLOS ====================
  getJustificationConcepts: async (
    category?: string,
    activeOnly?: boolean,
  ): Promise<JustificationConceptItem[]> => {
    const res = await apiClient.get("/inventory/masters/justification-concepts", {
      params: {
        ...(activeOnly ? { activeOnly: "true" } : {}),
        ...(category ? { category } : {}),
      },
    });
    return res.data;
  },
  createJustificationConcept: async (data: {
    code: string;
    title: string;
    description?: string;
    category?: string;
    isActive?: boolean;
  }): Promise<JustificationConceptItem> => {
    const res = await apiClient.post("/inventory/masters/justification-concepts", data);
    return res.data;
  },
  updateJustificationConcept: async (
    id: number,
    data: {
      code?: string;
      title?: string;
      description?: string;
      category?: string;
      isActive?: boolean;
    },
  ): Promise<JustificationConceptItem> => {
    const res = await apiClient.patch(`/inventory/masters/justification-concepts/${id}`, data);
    return res.data;
  },
  deleteJustificationConcept: async (id: number): Promise<{ status: string; message: string }> => {
    const res = await apiClient.delete(`/inventory/masters/justification-concepts/${id}`);
    return res.data;
  },
};
