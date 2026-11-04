import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";
import type {
  LabArea,
  LabExam,
  LabInternalRequest,
  FefoSuggestionItem,
  LabWeeklyRun,
  QuarantineIncident,
} from "@/types/lab-workflow";
import type { LabFridge, LabReagentUnitItem } from "@/types/laboratory";

export const LabWorkflowService = {
  // Áreas
  async getMyLabAreas(): Promise<LabArea[]> {
    const res = await apiClient.get<ApiResponse<LabArea[]>>("/lab/my-areas");
    return res.data.data || [];
  },

  async getLabAreas(): Promise<LabArea[]> {
    const res = await apiClient.get<ApiResponse<LabArea[]>>("/lab/areas");
    return res.data.data || [];
  },

  // Exámenes
  async getLabExams(params?: { areaId?: number; search?: string }): Promise<LabExam[]> {
    const query = new URLSearchParams();
    if (params?.areaId) query.append("areaId", String(params.areaId));
    if (params?.search) query.append("search", params.search);
    const res = await apiClient.get<ApiResponse<LabExam[]>>(`/lab/exams?${query.toString()}`);
    return res.data.data || [];
  },

  async getLabExamById(id: number): Promise<LabExam | null> {
    const res = await apiClient.get<ApiResponse<LabExam>>(`/lab/exams/${id}`);
    return res.data.data || null;
  },

  // Neveras
  async getFridges(): Promise<LabFridge[]> {
    const res = await apiClient.get<ApiResponse<LabFridge[]>>("/lab/fridges");
    return res.data.data || [];
  },

  async getFridgeContents(id: number) {
    const res = await apiClient.get<ApiResponse<unknown>>(`/lab/fridges/${id}/contents`);
    return res.data.data;
  },

  // Unidades físicas / frascos
  async getLabUnits(params?: {
    search?: string;
    fridgeId?: number;
    labAreaId?: number;
    status?: string;
  }): Promise<LabReagentUnitItem[]> {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.fridgeId) query.append("fridgeId", String(params.fridgeId));
    if (params?.labAreaId) query.append("labAreaId", String(params.labAreaId));
    if (params?.status) query.append("status", params.status);
    const res = await apiClient.get<ApiResponse<LabReagentUnitItem[]>>(`/lab/units?${query.toString()}`);
    return res.data.data || [];
  },

  // Solicitudes Internas
  async getInternalRequests(params?: {
    labAreaId?: number;
    status?: string;
    search?: string;
  }): Promise<LabInternalRequest[]> {
    const query = new URLSearchParams();
    if (params?.labAreaId) query.append("labAreaId", String(params.labAreaId));
    if (params?.status) query.append("status", params.status);
    if (params?.search) query.append("search", params.search);
    const res = await apiClient.get<ApiResponse<LabInternalRequest[]>>(`/lab/requests?${query.toString()}`);
    return res.data.data || [];
  },

  async getInternalRequestById(id: number): Promise<LabInternalRequest> {
    const res = await apiClient.get<ApiResponse<LabInternalRequest>>(`/lab/requests/${id}`);
    if (!res.data.data) throw new Error("Solicitud no encontrada");
    return res.data.data;
  },

  async createInternalRequest(payload: {
    labAreaId: number;
    justification: string;
    items: Array<{ productId: string | number; requestedUsesOrUnits: number }>;
  }): Promise<LabInternalRequest> {
    const res = await apiClient.post<ApiResponse<LabInternalRequest>>("/lab/requests", {
      ...payload,
      items: payload.items.map((i) => ({
        productId: String(i.productId),
        requestedUsesOrUnits: Number(i.requestedUsesOrUnits),
      })),
    });
    if (!res.data.data) throw new Error(res.data.message || "Error al crear la solicitud");
    return res.data.data;
  },

  async suggestFefoForRequest(requestId: number): Promise<FefoSuggestionItem[]> {
    const res = await apiClient.get<ApiResponse<FefoSuggestionItem[]>>(`/lab/requests/${requestId}/suggest-fefo`);
    return res.data.data || [];
  },

  async approveInternalRequest(
    requestId: number,
    payload: {
      reviewNotes?: string;
      itemAssignments?: Array<{ itemId: number; assignedLabUnitId: string | number }>;
    }
  ): Promise<LabInternalRequest> {
    const res = await apiClient.post<ApiResponse<LabInternalRequest>>(
      `/lab/requests/${requestId}/approve`,
      {
        reviewNotes: payload.reviewNotes,
        itemAssignments: payload.itemAssignments?.map((a) => ({
          itemId: Number(a.itemId),
          assignedLabUnitId: String(a.assignedLabUnitId),
        })),
      }
    );
    if (!res.data.data) throw new Error(res.data.message || "Error al aprobar la solicitud");
    return res.data.data;
  },

  async deliverInternalRequest(requestId: number): Promise<LabInternalRequest> {
    const res = await apiClient.post<ApiResponse<LabInternalRequest>>(`/lab/requests/${requestId}/deliver`);
    if (!res.data.data) throw new Error(res.data.message || "Error al entregar los insumos");
    return res.data.data;
  },

  async rejectInternalRequest(
    requestId: number,
    payload: { reviewNotes: string }
  ): Promise<LabInternalRequest> {
    const res = await apiClient.post<ApiResponse<LabInternalRequest>>(
      `/lab/requests/${requestId}/reject`,
      payload
    );
    if (!res.data.data) throw new Error(res.data.message || "Error al rechazar la solicitud");
    return res.data.data;
  },

  // Corridas Semanales
  async getWeeklyRuns(params?: {
    labAreaId?: number;
    labExamId?: number;
    status?: string;
  }): Promise<LabWeeklyRun[]> {
    const query = new URLSearchParams();
    if (params?.labAreaId) query.append("labAreaId", String(params.labAreaId));
    if (params?.labExamId) query.append("labExamId", String(params.labExamId));
    if (params?.status) query.append("status", params.status);
    const res = await apiClient.get<ApiResponse<LabWeeklyRun[]>>(`/lab/runs?${query.toString()}`);
    return res.data.data || [];
  },

  async getWeeklyRunById(id: number): Promise<LabWeeklyRun> {
    const res = await apiClient.get<ApiResponse<LabWeeklyRun>>(`/lab/runs/${id}`);
    if (!res.data.data) throw new Error("Corrida semanal no encontrada");
    return res.data.data;
  },

  async createWeeklyRun(payload: {
    labAreaId: number;
    labExamId: number;
    weekStartDate: string;
    weekEndDate: string;
    notes?: string;
  }): Promise<LabWeeklyRun> {
    const res = await apiClient.post<ApiResponse<LabWeeklyRun>>("/lab/runs", payload);
    if (!res.data.data) throw new Error(res.data.message || "Error al aperturar la corrida");
    return res.data.data;
  },

  async closeWeeklyRun(
    id: number,
    payload: {
      totalValidPatientExams: number;
      notes?: string;
      consumptions: Array<{
        labReagentUnitId: string | number;
        externalCalibratorUnitId?: string | number | null;
        patientUses: number;
        repeatUses?: number;
        repeatReason?: string | null;
        repeatNotes?: string | null;
        calibratorUses?: number;
        calibratorNotes?: string | null;
        controlUses?: number;
        wasteUses?: number;
        isPrimaryKitDepleted?: boolean;
        primaryKitPhysicalRemainingUses?: number | null;
        calibratorPhysicalRemainingUses?: number | null;
      }>;
    }
  ): Promise<LabWeeklyRun> {
    const res = await apiClient.post<ApiResponse<LabWeeklyRun>>(`/lab/runs/${id}/close`, {
      ...payload,
      consumptions: payload.consumptions.map((c) => ({
        ...c,
        labReagentUnitId: String(c.labReagentUnitId),
        externalCalibratorUnitId: c.externalCalibratorUnitId ? String(c.externalCalibratorUnitId) : null,
      })),
    });
    if (!res.data.data) throw new Error(res.data.message || "Error al cerrar la corrida semanal");
    return res.data.data;
  },

  // Cuarentena e Incidencias
  async getQuarantineIncidents(params?: {
    instanceType?: string;
    resolutionStatus?: string;
    labAreaId?: number;
  }): Promise<QuarantineIncident[]> {
    const query = new URLSearchParams();
    if (params?.instanceType) query.append("instanceType", params.instanceType);
    if (params?.resolutionStatus) query.append("resolutionStatus", params.resolutionStatus);
    if (params?.labAreaId) query.append("labAreaId", String(params.labAreaId));
    const res = await apiClient.get<ApiResponse<QuarantineIncident[]>>(`/lab/quarantine?${query.toString()}`);
    return res.data.data || [];
  },

  async putUnitInQuarantine(
    unitId: string | number,
    payload: {
      quarantineReason: string;
      description: string;
      evidenceUrl?: string;
      labAreaId?: number | null;
    }
  ): Promise<unknown> {
    const res = await apiClient.post<ApiResponse<unknown>>(`/lab/units/${unitId}/quarantine`, payload);
    return res.data.data;
  },

  async resolveQuarantine(
    incidentId: string | number,
    payload: {
      resolutionStatus: string;
      resolutionNotes: string;
    }
  ): Promise<unknown> {
    const res = await apiClient.post<ApiResponse<unknown>>(`/lab/quarantine/${incidentId}/resolve`, payload);
    return res.data.data;
  },
};
