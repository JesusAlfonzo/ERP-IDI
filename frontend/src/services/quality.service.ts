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
   * Endpoint backend: GET /api/inventory/batches?status=EN_CUARENTENA
   */
  async getQuarantineBatches(): Promise<QuarantineBatch[]> {
    return this.getBatchesByStatus("EN_CUARENTENA");
  },

  async getDefectiveBatches(): Promise<QuarantineBatch[]> {
    return this.getBatchesByStatus("DEFECTUOSO");
  },

  async getBatchesByStatus(
    status: "EN_CUARENTENA" | "DEFECTUOSO",
  ): Promise<QuarantineBatch[]> {
    const response = await apiClient.get<ApiResponse<QuarantineBatch[]>>(
      `/inventory/batches?status=${status}`,
    );
    return response.data.data || [];
  },

  /**
   * Emite el dictamen técnico actualizando el estado del lote en el inventario
   * Endpoint backend: PATCH /api/inventory/batches/:id/status
   */
  async submitVerdict(
    payload: QualityInspectionPayload,
  ): Promise<QualityInspectionResponse> {
    const targetStatus =
      payload.verdict === "LIBERAR" ? "DISPONIBLE" : "DEFECTUOSO";

    const response = await apiClient.patch<ApiResponse<QuarantineBatch>>(
      `/inventory/batches/${payload.batchId}/status`,
      {
        status: targetStatus,
        reason: payload.technicalNotes.trim(),
      },
    );

    return {
      batchId: payload.batchId,
      newStatus: targetStatus,
      message:
        response.data.message ||
        (targetStatus === "DISPONIBLE"
          ? "Lote liberado e integrado al inventario disponible."
          : "Lote declarado defectuoso y apartado de operaciones."),
    };
  },
};
