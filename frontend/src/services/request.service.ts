import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";
import type {
  InternalRequest,
  CreateInternalRequestPayload,
  DispatchRequestPayload,
} from "@/types/requests";

export const RequestClientService = {
  /**
   * Obtiene las solicitudes internas con filtro opcional por estado
   */
  async getRequests(status?: string): Promise<InternalRequest[]> {
    const params = status ? `?status=${status}` : "";
    const response = await apiClient.get<ApiResponse<InternalRequest[]>>(
      `/requests${params}`,
    );
    return response.data.data || [];
  },

  /**
   * Crea una nueva requisición de insumos
   */
  async createRequest(
    payload: CreateInternalRequestPayload,
  ): Promise<InternalRequest> {
    const response = await apiClient.post<ApiResponse<InternalRequest>>(
      "/requests",
      payload,
    );

    if (!response.data.data) {
      throw new Error(
        response.data.message || "Error al procesar la requisición",
      );
    }

    return response.data.data;
  },

  /**
   * Despacha la solicitud asignando los lotes correspondientes y descontando stock
   */
  async dispatchRequest(
    payload: DispatchRequestPayload,
  ): Promise<InternalRequest> {
    const response = await apiClient.post<ApiResponse<InternalRequest>>(
      `/requests/${payload.requestId}/dispatch`,
      payload,
    );

    if (!response.data.data) {
      throw new Error(response.data.message || "Error al procesar el despacho");
    }

    return response.data.data;
  },

  /**
   * Rechaza formalmente una solicitud
   */
  async rejectRequest(
    requestId: number,
    reason: string,
  ): Promise<InternalRequest> {
    const response = await apiClient.post<ApiResponse<InternalRequest>>(
      `/requests/${requestId}/reject`,
      { reason },
    );

    if (!response.data.data) {
      throw new Error(
        response.data.message || "Error al rechazar la solicitud",
      );
    }

    return response.data.data;
  },
};
