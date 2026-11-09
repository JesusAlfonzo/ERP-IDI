import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";
import type { FridgePhysicalAudit } from "@/types/lab-workflow";

export interface CreateFridgeAuditPayload {
  performedById?: number;
  notes?: string;
  items: Array<{
    labReagentUnitId: string | number;
    physicalRemainingUses: number;
    notes?: string;
  }>;
}

export const FridgeAuditService = {
  async listFridgeAudits(params?: {
    performedById?: number;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<FridgePhysicalAudit[]> {
    const query = new URLSearchParams();
    if (params?.performedById) query.append("performedById", String(params.performedById));
    if (params?.startDate) query.append("startDate", params.startDate);
    if (params?.endDate) query.append("endDate", params.endDate);
    if (params?.search) query.append("search", params.search);
    const res = await apiClient.get<ApiResponse<FridgePhysicalAudit[]>>(`/fridge-audits?${query.toString()}`);
    return res.data.data || [];
  },

  async getFridgeAuditById(id: number): Promise<FridgePhysicalAudit> {
    const res = await apiClient.get<ApiResponse<FridgePhysicalAudit>>(`/fridge-audits/${id}`);
    if (!res.data.data) throw new Error("Auditoría no encontrada");
    return res.data.data;
  },

  async createFridgeAudit(payload: CreateFridgeAuditPayload): Promise<FridgePhysicalAudit> {
    const res = await apiClient.post<ApiResponse<FridgePhysicalAudit>>("/fridge-audits", {
      ...payload,
      items: payload.items.map((i) => ({
        ...i,
        labReagentUnitId: String(i.labReagentUnitId),
      })),
    });
    if (!res.data.data) throw new Error(res.data.message || "Error al registrar arqueo físico");
    return res.data.data;
  },

  async reconcileFridgeAudit(auditId: number): Promise<FridgePhysicalAudit> {
    const res = await apiClient.post<ApiResponse<FridgePhysicalAudit>>(
      `/fridge-audits/${auditId}/reconcile`
    );
    if (!res.data.data) throw new Error(res.data.message || "Error al conciliar arqueo físico");
    return res.data.data;
  },
};
