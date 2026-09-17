import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";
import type {
  QuarantineBatch,
  QualityInspectionPayload,
  QualityInspectionResponse,
} from "@/types/quality";

export const QualityClientService = {
  /**
   * Obtiene todos los lotes retenidos en cuarentena
   */
  async getQuarantineBatches(): Promise<QuarantineBatch[]> {
    const response = await apiClient.get<ApiResponse<QuarantineBatch[]>>(
      "/quality/quarantine",
    );
    return response.data.data || [];
  },

  /**
   * Emite el dictamen técnico para liberar a DISPONIBLE o marcar como DEFECTUOSO
   */
  async submitVerdict(
    payload: QualityInspectionPayload,
  ): Promise<QualityInspectionResponse> {
    const response = await apiClient.post<
      ApiResponse<QualityInspectionResponse>
    >("/quality/inspection", payload);

    if (!response.data.data) {
      throw new Error(
        response.data.message || "Error al procesar el dictamen de calidad",
      );
    }

    return response.data.data;
  },
};
