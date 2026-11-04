import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";
import type {
  ResearchProject,
  ResearchInvestor,
  ResearchDonation,
  ResearchTrial,
  ResearchFinding,
} from "@/types/research";

export const ResearchService = {
  // Proyectos
  async getProjects(params?: { status?: string; search?: string }): Promise<ResearchProject[]> {
    const query = new URLSearchParams();
    if (params?.status) query.append("status", params.status);
    if (params?.search) query.append("search", params.search);
    const res = await apiClient.get<ApiResponse<ResearchProject[]>>(`/research/projects?${query.toString()}`);
    return res.data.data || [];
  },

  async getProjectById(id: number): Promise<ResearchProject> {
    const res = await apiClient.get<ApiResponse<ResearchProject>>(`/research/projects/${id}`);
    if (!res.data.data) throw new Error("Proyecto no encontrado");
    return res.data.data;
  },

  async createProject(payload: {
    title: string;
    description?: string;
    projectType: string;
    budgetEstimated?: number;
    startDate: string;
    endDate?: string;
  }): Promise<ResearchProject> {
    const res = await apiClient.post<ApiResponse<ResearchProject>>("/research/projects", payload);
    if (!res.data.data) throw new Error(res.data.message || "Error al crear el proyecto");
    return res.data.data;
  },

  async updateProject(id: number, payload: Partial<ResearchProject>): Promise<ResearchProject> {
    const res = await apiClient.put<ApiResponse<ResearchProject>>(`/research/projects/${id}`, payload);
    if (!res.data.data) throw new Error(res.data.message || "Error al actualizar proyecto");
    return res.data.data;
  },

  // Inversores / Patrocinantes
  async getInvestors(): Promise<ResearchInvestor[]> {
    const res = await apiClient.get<ApiResponse<ResearchInvestor[]>>("/research/investors");
    return res.data.data || [];
  },

  async createInvestor(payload: {
    name: string;
    type: string;
    contactEmail?: string;
    contactPhone?: string;
  }): Promise<ResearchInvestor> {
    const res = await apiClient.post<ApiResponse<ResearchInvestor>>("/research/investors", payload);
    if (!res.data.data) throw new Error(res.data.message || "Error al registrar inversor");
    return res.data.data;
  },

  // Donaciones en Especie
  async getDonations(params?: { projectId?: number }): Promise<ResearchDonation[]> {
    const query = new URLSearchParams();
    if (params?.projectId) query.append("projectId", String(params.projectId));
    const res = await apiClient.get<ApiResponse<ResearchDonation[]>>(`/research/donations?${query.toString()}`);
    return res.data.data || [];
  },

  async recordDonation(payload: {
    projectId: number;
    investorId: number;
    donationDate?: string;
    locationId?: number;
    fridgeId?: number | null;
    notes?: string;
    items: Array<{
      productId: string | number;
      quantity: number;
      lotNumber: string;
      expirationDate?: string | null;
      estimatedUnitValue?: number;
      unitCode?: string;
    }>;
  }): Promise<ResearchDonation> {
    const res = await apiClient.post<ApiResponse<ResearchDonation>>("/research/donations", {
      ...payload,
      items: payload.items.map((i) => ({
        ...i,
        productId: String(i.productId),
      })),
    });
    if (!res.data.data) throw new Error(res.data.message || "Error al registrar donación");
    return res.data.data;
  },

  // Ensayos Experimentales
  async getTrials(params?: { projectId?: number; status?: string }): Promise<ResearchTrial[]> {
    const query = new URLSearchParams();
    if (params?.projectId) query.append("projectId", String(params.projectId));
    if (params?.status) query.append("status", params.status);
    const res = await apiClient.get<ApiResponse<ResearchTrial[]>>(`/research/trials?${query.toString()}`);
    return res.data.data || [];
  },

  async getTrialById(id: number): Promise<ResearchTrial> {
    const res = await apiClient.get<ApiResponse<ResearchTrial>>(`/research/trials/${id}`);
    if (!res.data.data) throw new Error("Ensayo no encontrado");
    return res.data.data;
  },

  async createTrial(payload: {
    projectId: number;
    title: string;
    objective?: string;
    trialDate?: string;
    notes?: string;
  }): Promise<ResearchTrial> {
    const res = await apiClient.post<ApiResponse<ResearchTrial>>("/research/trials", payload);
    if (!res.data.data) throw new Error(res.data.message || "Error al crear ensayo");
    return res.data.data;
  },

  async recordTrialExecution(
    trialId: number,
    payload: {
      totalSamplesTested: number;
      notes?: string;
      consumptions: Array<{
        labReagentUnitId: string | number;
        externalCalibratorUnitId?: string | number | null;
        sampleUses: number;
        repeatUses?: number;
        repeatReason?: string | null;
        calibratorUses?: number;
        calibratorNotes?: string | null;
        controlUses?: number;
      }>;
    }
  ): Promise<ResearchTrial> {
    const res = await apiClient.post<ApiResponse<ResearchTrial>>(`/research/trials/${trialId}/execute`, {
      ...payload,
      consumptions: payload.consumptions.map((c) => ({
        ...c,
        labReagentUnitId: String(c.labReagentUnitId),
        externalCalibratorUnitId: c.externalCalibratorUnitId ? String(c.externalCalibratorUnitId) : null,
      })),
    });
    if (!res.data.data) throw new Error(res.data.message || "Error al registrar ejecución de ensayo");
    return res.data.data;
  },

  // Hallazgos y Resultados
  async getFindings(params?: { projectId?: number; trialId?: number }): Promise<ResearchFinding[]> {
    const query = new URLSearchParams();
    if (params?.projectId) query.append("projectId", String(params.projectId));
    if (params?.trialId) query.append("trialId", String(params.trialId));
    const res = await apiClient.get<ApiResponse<ResearchFinding[]>>(`/research/findings?${query.toString()}`);
    return res.data.data || [];
  },

  async createFinding(payload: {
    projectId: number;
    trialId?: number | null;
    title: string;
    findingType: string;
    summary: string;
    conclusion?: string;
    attachmentUrl?: string;
    isPublished?: boolean;
  }): Promise<ResearchFinding> {
    const res = await apiClient.post<ApiResponse<ResearchFinding>>("/research/findings", payload);
    if (!res.data.data) throw new Error(res.data.message || "Error al registrar hallazgo");
    return res.data.data;
  },
};
