import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";
import type {
  ReagentBatchOption,
  ReagentConsumptionPayload,
  ReagentConsumptionRecord,
  LabReagentUnitItem,
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
    const response = await apiClient.get<
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

  async assignBatchToFridge(fridgeId: number, batchId: number | string) {
    const response = await apiClient.post<
      ApiResponse<{ assignedUnits: number }>
    >(`/lab/fridges/${fridgeId}/assign-batch`, { batchId: Number(batchId) });
    if (!response.data.data) {
      throw new Error(
        response.data.message || "No se pudo asignar el lote a la nevera",
      );
    }
    return response.data.data;
  },

  /**
   * Obtiene los frascos reales en nevera disponibles para uso (SELLADO o EN_USO)
   */
  async getAvailableUnits(
    search?: string,
    fridgeId?: number,
  ): Promise<LabReagentUnitItem[]> {
    const params = new URLSearchParams();
    if (search?.trim()) params.append("search", search.trim());
    if (fridgeId) params.append("fridgeId", String(fridgeId));

    const response = await apiClient.get<ApiResponse<LabReagentUnitItem[]>>(
      `/lab/units?${params.toString()}`,
    );
    const units = response.data.data || [];
    return units.filter((u) => u.status === "SELLADO" || u.status === "EN_USO");
  },

  /**
   * Registra el gasto volumétrico sobre un frasco de nevera
   */
  async consumeUnit(
    unitId: string | number,
    amountUsed: number,
    reason?: string,
  ) {
    const response = await apiClient.post<ApiResponse<unknown>>(
      `/lab/units/${unitId}/consume`,
      { amountUsed, reason },
    );
    return response.data.data;
  },

  async getAvailableReagents(search?: string): Promise<ReagentBatchOption[]> {
    const query = search?.trim()
      ? `?search=${encodeURIComponent(search.trim())}`
      : "";
    const response = await apiClient.get<ApiResponse<ReagentBatchOption[]>>(
      `/lab/reagents${query}`,
    );
    return response.data.data || [];
  },

  async getRecentConsumptions(limit = 10): Promise<ReagentConsumptionRecord[]> {
    const response = await apiClient.get<
      ApiResponse<ReagentConsumptionRecord[]>
    >(`/lab/consumptions?limit=${limit}`);
    return response.data.data || [];
  },

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
