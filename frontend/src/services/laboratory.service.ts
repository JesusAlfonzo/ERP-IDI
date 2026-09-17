import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";
import type {
  ReagentBatchOption,
  ReagentConsumptionPayload,
  ReagentConsumptionRecord,
} from "@/types/laboratory";

export const LaboratoryClientService = {
  /**
   * Obtiene los reactivos/lotes disponibles para consumo en laboratorio
   */
  async getAvailableReagents(): Promise<ReagentBatchOption[]> {
    const response = await apiClient.get<ApiResponse<ReagentBatchOption[]>>(
      "/laboratory/reagents",
    );
    return response.data.data || [];
  },

  /**
   * Consulta el historial de los consumos más recientes realizados en laboratorio
   */
  async getRecentConsumptions(limit = 10): Promise<ReagentConsumptionRecord[]> {
    const response = await apiClient.get<
      ApiResponse<ReagentConsumptionRecord[]>
    >(`/laboratory/consumptions?limit=${limit}`);
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
    >("/laboratory/consumptions", payload);

    if (!response.data.data) {
      throw new Error(
        response.data.message || "Error al registrar el consumo del reactivo",
      );
    }

    return response.data.data;
  },
};
