import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";
import type {
  Supplier,
  SupplierDetail,
  CreateSupplierPayload,
  UpdateSupplierPayload,
  Provider,
  ProviderDetail,
  CreateProviderPayload,
  UpdateProviderPayload,
} from "@/types/purchasing";

export const ProviderService = {
  /**
   * Obtiene la lista de proveedores comerciales
   */
  getProviders: async (params?: {
    search?: string;
    includeInactive?: boolean;
  }): Promise<Provider[]> => {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.includeInactive) query.append("includeInactive", "true");
    const qs = query.toString();

    const res = await apiClient.get<ApiResponse<Provider[]>>(
      `/suppliers${qs ? `?${qs}` : ""}`
    );
    return res.data.data || [];
  },

  /**
   * Consulta los detalles de un proveedor por ID, incluyendo conteo y órdenes recientes
   */
  getProviderById: async (id: number | string): Promise<ProviderDetail> => {
    const res = await apiClient.get<ApiResponse<ProviderDetail>>(
      `/suppliers/${id}`
    );
    const data = res.data.data;
    if (!data) throw new Error("Proveedor no encontrado");
    return data;
  },

  /**
   * Registra un nuevo proveedor comercial
   */
  createProvider: async (
    payload: CreateProviderPayload
  ): Promise<Provider> => {
    const res = await apiClient.post<ApiResponse<Provider>>(
      "/suppliers",
      payload
    );
    const data = res.data.data;
    if (!data) throw new Error("Error al registrar proveedor");
    return data;
  },

  /**
   * Actualiza los datos de un proveedor comercial
   */
  updateProvider: async (
    id: number | string,
    payload: UpdateProviderPayload
  ): Promise<Provider> => {
    const res = await apiClient.put<ApiResponse<Provider>>(
      `/suppliers/${id}`,
      payload
    );
    const data = res.data.data;
    if (!data) throw new Error("Error al actualizar proveedor");
    return data;
  },

  /**
   * Elimina permanentemente un proveedor (Solo rol ADMINISTRADOR)
   * Si tiene órdenes asociadas devuelve error 409
   */
  deleteProvider: async (
    id: number | string
  ): Promise<{ message: string }> => {
    const res = await apiClient.delete<ApiResponse<null>>(`/suppliers/${id}`);
    return {
      message: res.data.message || "Proveedor eliminado correctamente",
    };
  },

  // Aliases Supplier / Provider
  getSuppliers: async (params?: {
    search?: string;
    includeInactive?: boolean;
  }): Promise<Supplier[]> => {
    return ProviderService.getProviders(params);
  },

  getSupplierById: async (id: number | string): Promise<SupplierDetail> => {
    return ProviderService.getProviderById(id);
  },

  createSupplier: async (
    payload: CreateSupplierPayload
  ): Promise<Supplier> => {
    return ProviderService.createProvider(payload);
  },

  updateSupplier: async (
    id: number | string,
    payload: UpdateSupplierPayload
  ): Promise<Supplier> => {
    return ProviderService.updateProvider(id, payload);
  },

  deleteSupplier: async (
    id: number | string
  ): Promise<{ message: string }> => {
    return ProviderService.deleteProvider(id);
  },
};

export const getProviders = ProviderService.getProviders;
export const getProviderById = ProviderService.getProviderById;
export const createProvider = ProviderService.createProvider;
export const updateProvider = ProviderService.updateProvider;
export const deleteProvider = ProviderService.deleteProvider;

export const getSuppliers = ProviderService.getSuppliers;
export const getSupplierById = ProviderService.getSupplierById;
export const createSupplier = ProviderService.createSupplier;
export const updateSupplier = ProviderService.updateSupplier;
export const deleteSupplier = ProviderService.deleteSupplier;

export default ProviderService;
