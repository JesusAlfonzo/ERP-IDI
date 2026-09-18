import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";
import type {
  ReagentBatchOption,
  ReagentConsumptionPayload,
  ReagentConsumptionRecord,
} from "@/types/laboratory";

export const LaboratoryClientService = {
  async getFridges(): Promise<
    Array<{
      id: number;
      name: string;
      code: string;
      targetTempCelsius: number | string | null;
    }>
  > {
    const response =
      await apiClient.get<
        ApiResponse<
          Array<{
            id: number;
            name: string;
            code: string;
            targetTempCelsius: number | string | null;
          }>
        >
      >("/lab/fridges");
    return response.data.data || [];
  },

  async assignBatchToFridge(fridgeId: number, batchId: number) {
    const response = await apiClient.post<
      ApiResponse<{ assignedUnits: number }>
    >(`/lab/fridges/${fridgeId}/assign-batch`, { batchId });
    if (!response.data.data)
      throw new Error(
        response.data.message || "No se pudo asignar el lote a la nevera",
      );
    return response.data.data;
  },
  /**
   * Obtiene los reactivos/lotes disponibles para consumo en laboratorio
   */
  async getAvailableReagents(search?: string): Promise<ReagentBatchOption[]> {
    const query = search?.trim()
      ? `?search=${encodeURIComponent(search.trim())}`
      : "";
    const response = await apiClient.get<ApiResponse<ReagentBatchOption[]>>(
      `/lab/reagents${query}`,
    );
    return response.data.data || [];
  },

  /**
   * Consulta el historial de los consumos más recientes realizados en laboratorio
   */
  async getRecentConsumptions(limit = 10): Promise<ReagentConsumptionRecord[]> {
    const response = await apiClient.get<
      ApiResponse<ReagentConsumptionRecord[]>
    >(`/lab/consumptions?limit=${limit}`);
    return response.data.data || [];
  },

  /**
   * Registra el gasto de un reactivo asociado a una prueba diagnóstica
   */
  async registerConsumption(
    payload: ReagentConsumptionPayload,
  ): Promise<ReagentConsumptionRecord> {
    const response = await apiClient.post<
      ApiResponse<ReagentConsumptionRecord>
    >("/lab/consumptions", payload);

    if (!response.data.data) {
      throw new Error(
        response.data.message || "Error al registrar el consumo del reactivo",
      );
    }

    return response.data.data;
  },
};
