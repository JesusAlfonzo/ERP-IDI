import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";
import type {
  InternalRequest,
  CreateInternalRequestPayload,
  DispatchRequestPayload,
  RequestWindowStatus,
  RequestWindowConfigData,
} from "@/types/requests";

export const RequestClientService = {
  /**
   * Obtiene las solicitudes internas con filtro opcional por estado y búsqueda
   */
  async getRequests(
    status?: string,
    search?: string
  ): Promise<InternalRequest[]> {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (search && search.trim() !== "") params.append("search", search.trim());

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const response = await apiClient.get<ApiResponse<InternalRequest[]>>(
      `/requests${queryString}`
    );
    return response.data.data || [];
  },

  /**
   * Obtiene el estado y ventana operativa actual de solicitudes
   */
  async getWindowStatus(): Promise<RequestWindowStatus> {
    const response = await apiClient.get<ApiResponse<RequestWindowStatus>>(
      "/requests/window-status"
    );
    if (!response.data.data) {
      throw new Error(
        response.data.message || "No se pudo consultar el estado de la ventana"
      );
    }
    return response.data.data;
  },

  /**
   * Obtiene la configuración de la ventana operativa (Solo Administrador)
   */
  async getWindowConfig(): Promise<RequestWindowConfigData> {
    const response = await apiClient.get<ApiResponse<RequestWindowConfigData>>(
      "/requests/window-config"
    );
    if (!response.data.data) {
      throw new Error(
        response.data.message ||
          "No se pudo consultar la configuración de la ventana"
      );
    }
    return response.data.data;
  },

  /**
   * Actualiza la configuración de la ventana operativa (Solo Administrador)
   */
  async updateWindowConfig(
    payload: Partial<RequestWindowConfigData>
  ): Promise<RequestWindowConfigData> {
    const response = await apiClient.put<ApiResponse<RequestWindowConfigData>>(
      "/requests/window-config",
      payload
    );
    if (!response.data.data) {
      throw new Error(
        response.data.message ||
          "Error al actualizar la configuración de la ventana"
      );
    }
    return response.data.data;
  },

  /**
   * Obtiene una solicitud por su ID con sus detalles y movimientos
   */
  async getRequestById(id: string | number): Promise<InternalRequest> {
    const response = await apiClient.get<ApiResponse<InternalRequest>>(
      `/requests/${id}`
    );
    if (!response.data.data) {
      throw new Error(response.data.message || "Solicitud no encontrada");
    }
    return response.data.data;
  },

  /**
   * Crea una nueva requisición de insumos
   */
  async createRequest(
    payload: CreateInternalRequestPayload
  ): Promise<InternalRequest> {
    const response = await apiClient.post<ApiResponse<InternalRequest>>(
      "/requests",
      payload
    );

    if (!response.data.data) {
      throw new Error(
        response.data.message || "Error al procesar la requisición"
      );
    }

    return response.data.data;
  },

  /**
   * Aprueba formalmente una solicitud
   */
  async approveRequest(
    requestId: number,
    items: { itemId: number; quantityApproved: number }[]
  ): Promise<InternalRequest> {
    const response = await apiClient.patch<ApiResponse<InternalRequest>>(
      `/requests/${requestId}/approve`,
      { items }
    );
    if (!response.data.data) {
      throw new Error(response.data.message || "Error al aprobar la solicitud");
    }
    return response.data.data;
  },

  /**
   * Despacha la solicitud asignando los lotes correspondientes y descontando stock
   * Soporta asignaciones multi-lote por ítem
   */
  async dispatchRequest(
    payload: DispatchRequestPayload
  ): Promise<InternalRequest> {
    const formattedItems = payload.items.map((item) => {
      if (item.allocations && item.allocations.length > 0) {
        return {
          itemId: Number(item.itemId),
          allocations: item.allocations.map((a) => ({
            batchId: Number(a.batchId),
            quantity: Number(a.quantity),
          })),
        };
      }
      return {
        itemId: Number(item.itemId),
        batchId: Number(item.batchId),
        dispatchedQuantity: Number(item.dispatchedQuantity),
      };
    });

    const response = await apiClient.post<ApiResponse<InternalRequest>>(
      `/requests/${payload.requestId}/dispatch`,
      {
        dispatchNotes: payload.dispatchNotes,
        items: formattedItems,
      }
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
    reason: string
  ): Promise<InternalRequest> {
    const response = await apiClient.post<ApiResponse<InternalRequest>>(
      `/requests/${requestId}/reject`,
      { reason }
    );

    if (!response.data.data) {
      throw new Error(
        response.data.message || "Error al rechazar la solicitud"
      );
    }

    return response.data.data;
  },
};
