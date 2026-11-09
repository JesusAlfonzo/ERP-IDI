import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";
import type {
  LabArea,
  LabExam,
  LabInternalRequest,
  FefoSuggestionItem,
  LabWeeklyRun,
  QuarantineIncident,
  FridgePhysicalAudit,
  LabConsumptionAuditLog,
} from "@/types/lab-workflow";
import type {
  LabFridge,
  LabReagentUnitItem,
  ReagentBatchOption,
  ReagentConsumptionPayload,
  ReagentConsumptionRecord,
  FridgeContentsResponse,
  AssignBatchResponse,
  CreateFridgePayload,
  ReagentInFridge,
} from "@/types/laboratory";

/**
 * Servicio Unificado de Laboratorio Clínico (ERP-IDI)
 * Consolida todas las operaciones analíticas, cadena de frío, inventario de reactivos,
 * solicitudes internas FEFO, corridas semanales y control de calidad.
 */
export const LabWorkflowService = {
  // ==========================================
  // 1. ÁREAS DE LABORATORIO
  // ==========================================
  async getMyLabAreas(): Promise<LabArea[]> {
    const res = await apiClient.get<ApiResponse<(LabArea | { labArea: LabArea })[]>>("/lab/my-areas");
    const raw = res.data.data || [];
    return raw.map((item) => ("labArea" in item ? item.labArea : item));
  },

  async getLabAreas(): Promise<LabArea[]> {
    const res = await apiClient.get<ApiResponse<LabArea[]>>("/lab/areas");
    return res.data.data || [];
  },

  // ==========================================
  // 2. CATÁLOGO DE EXÁMENES
  // ==========================================
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

  async createLabExam(payload: {
    code: string;
    name: string;
    description?: string | null;
    areaId?: number | null;
    defaultCalibratorUses?: number;
    defaultControlUses?: number;
    compatibleProductIds?: Array<string | number>;
  }): Promise<LabExam> {
    const res = await apiClient.post<ApiResponse<LabExam>>("/lab/exams", payload);
    if (!res.data.data) throw new Error(res.data.message || "Error al crear el examen");
    return res.data.data;
  },

  async updateLabExam(
    id: number,
    payload: {
      name?: string;
      description?: string | null;
      areaId?: number | null;
      isActive?: boolean;
      defaultCalibratorUses?: number;
      defaultControlUses?: number;
      compatibleProductIds?: Array<string | number>;
    }
  ): Promise<LabExam> {
    const res = await apiClient.put<ApiResponse<LabExam>>(`/lab/exams/${id}`, payload);
    if (!res.data.data) throw new Error(res.data.message || "Error al actualizar el examen");
    return res.data.data;
  },

  // ==========================================
  // 3. NEVERAS, CAVAS Y CADENA DE FRÍO
  // ==========================================
  async getFridges(locationId?: number): Promise<LabFridge[]> {
    const query = locationId ? `?locationId=${locationId}` : "";
    const res = await apiClient.get<ApiResponse<LabFridge[]>>(`/lab/fridges${query}`);
    return res.data.data || [];
  },

  async createFridge(data: CreateFridgePayload): Promise<LabFridge> {
    const res = await apiClient.post<ApiResponse<LabFridge>>("/lab/fridges", data);
    if (!res.data.data) {
      throw new Error(res.data.message || "Error al registrar la nevera");
    }
    return res.data.data;
  },

  async getFridgeContents(id: number): Promise<FridgeContentsResponse> {
    const res = await apiClient.get<ApiResponse<FridgeContentsResponse>>(
      `/lab/fridges/${id}/contents`
    );
    if (!res.data.data) {
      throw new Error(res.data.message || "Contenido de nevera no encontrado");
    }
    return res.data.data;
  },

  async assignBatchToFridge(
    fridgeId: number,
    batchId: number | string,
    options?: {
      quantityBoxes?: number;
      ownershipType?: string;
      researchProjectId?: number;
      isDonation?: boolean;
      notes?: string;
    }
  ): Promise<AssignBatchResponse> {
    const res = await apiClient.post<ApiResponse<AssignBatchResponse>>(
      `/lab/fridges/${fridgeId}/assign-batch`,
      { batchId: Number(batchId), ...options }
    );
    if (!res.data.data) {
      throw new Error(res.data.message || "No se pudo asignar el lote a la nevera");
    }
    return res.data.data;
  },

  /** Alias para compatibilidad con código existente */
  async assignBatch(fridgeId: number, batchId: string | number): Promise<AssignBatchResponse> {
    return this.assignBatchToFridge(fridgeId, batchId);
  },

  // ==========================================
  // 4. UNIDADES FÍSICAS / FRASCOS EN FRÍO
  // ==========================================
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

  /**
   * Obtiene los frascos reales en nevera listos para uso analítico (SELLADO o EN_USO)
   */
  async getAvailableUnits(
    search?: string,
    fridgeId?: number
  ): Promise<LabReagentUnitItem[]> {
    const params = new URLSearchParams();
    if (search?.trim()) params.append("search", search.trim());
    if (fridgeId) params.append("fridgeId", String(fridgeId));

    const res = await apiClient.get<ApiResponse<LabReagentUnitItem[]>>(
      `/lab/units?${params.toString()}`
    );
    const units = res.data.data || [];
    return units.filter((u) => u.status === "SELLADO" || u.status === "EN_USO");
  },

  /**
   * Apertura formal de un frasco sellado en mesón de trabajo (SELLADO -> EN_USO)
   */
  async openUnit(unitId: string | number): Promise<ReagentInFridge> {
    const res = await apiClient.patch<ApiResponse<ReagentInFridge>>(`/lab/units/${unitId}/open`);
    if (!res.data.data) {
      throw new Error(res.data.message || "Error al abrir la unidad de reactivo");
    }
    return res.data.data;
  },

  /**
   * Reubicación o traslado físico de un frasco a otra nevera
   */
  async transferUnit(
    unitId: string | number,
    toFridgeId: number,
    reason?: string
  ): Promise<ReagentInFridge> {
    const res = await apiClient.post<ApiResponse<ReagentInFridge>>(
      `/lab/units/${unitId}/transfer`,
      { toFridgeId, reason }
    );
    if (!res.data.data) {
      throw new Error(res.data.message || "Error al trasladar la unidad de nevera");
    }
    return res.data.data;
  },

  /**
   * Descarte formal de un frasco por agotamiento, vencimiento o merma
   */
  async discardUnit(
    unitId: string | number,
    reason: string
  ): Promise<ReagentInFridge> {
    const res = await apiClient.post<ApiResponse<ReagentInFridge>>(
      `/lab/units/${unitId}/discard`,
      { reason }
    );
    if (!res.data.data) {
      throw new Error(res.data.message || "Error al descartar la unidad de reactivo");
    }
    return res.data.data;
  },

  // ==========================================
  // 5. CONSUMOS VOLUMÉTRICOS Y REACTIVOS DISPONIBLES
  // ==========================================
  async getAvailableReagents(search?: string): Promise<ReagentBatchOption[]> {
    const query = search?.trim()
      ? `?search=${encodeURIComponent(search.trim())}`
      : "";
    const res = await apiClient.get<ApiResponse<ReagentBatchOption[]>>(
      `/lab/reagents${query}`
    );
    return res.data.data || [];
  },

  async consumeUnit(
    unitId: string | number,
    amountUsed: number,
    reason?: string
  ): Promise<unknown> {
    const res = await apiClient.post<ApiResponse<unknown>>(
      `/lab/units/${unitId}/consume`,
      { amountUsed, reason }
    );
    return res.data.data;
  },

  async getRecentConsumptions(limit = 10): Promise<ReagentConsumptionRecord[]> {
    const res = await apiClient.get<ApiResponse<ReagentConsumptionRecord[]>>(
      `/lab/consumptions?limit=${limit}`
    );
    return res.data.data || [];
  },

  async registerConsumption(
    payload: ReagentConsumptionPayload
  ): Promise<ReagentConsumptionRecord> {
    const res = await apiClient.post<ApiResponse<ReagentConsumptionRecord>>(
      "/lab/consumptions",
      payload
    );
    if (!res.data.data) {
      throw new Error(
        res.data.message || "Error al registrar el consumo del reactivo"
      );
    }
    return res.data.data;
  },

  // ==========================================
  // 6. SOLICITUDES INTERNAS Y DESPACHO FEFO
  // ==========================================
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

  // ==========================================
  // 7. MOTOR DE CORRIDAS SEMANALES
  // ==========================================
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
      allowExpiredOverride?: boolean;
      consumptions: Array<{
        labReagentUnitId: string | number;
        rolloverUnitId?: string | number | null;
        allowExpiredOverride?: boolean;
        externalCalibratorUnitId?: string | number | null;
        patientUses: number;
        repeatUses?: number;
        repeatReason?: string | null;
        repeatNotes?: string | null;
        calibratorUses?: number;
        calibratorNotes?: string | null;
        controlUses?: number;
        wasteUses?: number;
        isPhysicallyExhausted?: boolean;
        reportedRemainingUses?: number | null;
        isPrimaryKitDepleted?: boolean;
        primaryKitPhysicalRemainingUses?: number | null;
        calibratorPhysicalRemainingUses?: number | null;
        isExternalCalibratorDepleted?: boolean;
        externalCalibratorPhysicalRemainingUses?: number | null;
      }>;
    }
  ): Promise<LabWeeklyRun> {
    const res = await apiClient.post<ApiResponse<LabWeeklyRun>>(`/lab/runs/${id}/close`, {
      ...payload,
      consumptions: payload.consumptions.map((c) => ({
        ...c,
        labReagentUnitId: String(c.labReagentUnitId),
        rolloverUnitId: c.rolloverUnitId ? String(c.rolloverUnitId) : undefined,
        externalCalibratorUnitId: c.externalCalibratorUnitId ? String(c.externalCalibratorUnitId) : null,
      })),
    });
    if (!res.data.data) throw new Error(res.data.message || "Error al cerrar la corrida semanal");
    return res.data.data;
  },

  async quickConsumeReagent(payload: {
    examId: number;
    labAreaId: number;
    unitId: string | number;
    validPatientsCount: number;
    repeatUses?: number;
    repeatReason?: string | null;
    repeatNotes?: string | null;
    wasteUses?: number;
    isPhysicallyExhausted?: boolean;
    reportedRemainingUses?: number | null;
    allowExpiredOverride?: boolean;
    calibratorUses?: number;
    controlUses?: number;
    notes?: string;
  }): Promise<LabWeeklyRun> {
    const res = await apiClient.post<ApiResponse<LabWeeklyRun>>("/lab/runs/quick-consume", {
      ...payload,
      unitId: String(payload.unitId),
    });
    if (!res.data.data) throw new Error(res.data.message || "Error al registrar el consumo rápido");
    return res.data.data;
  },

  async failRunByCalibration(
    runId: number,
    payload: {
      unitId: string | number;
      totalWellsWasted: number;
      calibratorUses?: number;
      controlUses?: number;
      isPhysicallyExhausted?: boolean;
      reportedRemainingUses?: number | null;
      allowExpiredOverride?: boolean;
      notes?: string;
      autoCloneNewRun?: boolean;
    }
  ): Promise<{ failedRun: LabWeeklyRun; clonedRun: LabWeeklyRun | null }> {
    const res = await apiClient.post<
      ApiResponse<{ failedRun: LabWeeklyRun; clonedRun: LabWeeklyRun | null }>
    >(`/lab/runs/${runId}/fail-calibration`, {
      ...payload,
      unitId: String(payload.unitId),
    });
    if (!res.data.data) throw new Error(res.data.message || "Error al registrar la falla de calibración");
    return res.data.data;
  },

  async reconcileFridgeAudit(auditId: number): Promise<FridgePhysicalAudit> {
    const res = await apiClient.post<ApiResponse<FridgePhysicalAudit>>(
      `/lab/fridge-audits/${auditId}/reconcile`
    );
    if (!res.data.data) throw new Error(res.data.message || "Error al conciliar arqueo físico");
    return res.data.data;
  },

  // ==========================================
  // 8. CUARENTENA TÉCNICA E INCIDENCIAS
  // ==========================================
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

  // ==========================================
  // 9. AUDITORÍA INMUTABLE DE CONSUMOS (5D)
  // ==========================================
  async getConsumptionAuditLogs(params?: {
    labAreaId?: number;
    labExamId?: number;
    weeklyRunId?: number;
    concept?: string;
    labReagentUnitId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<LabConsumptionAuditLog[]> {
    const query = new URLSearchParams();
    if (params?.labAreaId) query.append("labAreaId", String(params.labAreaId));
    if (params?.labExamId) query.append("labExamId", String(params.labExamId));
    if (params?.weeklyRunId) query.append("weeklyRunId", String(params.weeklyRunId));
    if (params?.concept) query.append("concept", params.concept);
    if (params?.labReagentUnitId) query.append("labReagentUnitId", params.labReagentUnitId);
    if (params?.startDate) query.append("startDate", params.startDate);
    if (params?.endDate) query.append("endDate", params.endDate);
    const res = await apiClient.get<ApiResponse<LabConsumptionAuditLog[]>>(`/lab/audit-logs?${query.toString()}`);
    return res.data.data || [];
  },
};