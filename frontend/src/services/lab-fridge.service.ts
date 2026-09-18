import { apiClient } from "@/lib/api-client";

export interface LabFridge {
  id: number;
  locationId: number;
  code: string;
  name: string;
  targetTempCelsius: string | number | null;
  status: "OPERATIVO" | "MANTENIMIENTO" | "DEFECTUOSO" | "FUERA_DE_SERVICIO";
  description: string | null;
  location?: { id: number; name: string; type: string };
  _count?: { labReagentUnits: number };
}

export interface ReagentInFridge {
  id: string | number;
  productId: string | number;
  unitCode: string;
  initialVolume: string | number;
  currentVolume: string | number;
  status: "SELLADO" | "EN_USO" | "AGOTADO" | "DESCARTADO";
  expirationDate: string | null;
  product?: { name: string; sku: string; baseUnit?: { abbreviation: string } };
  batch?: { lotNumber: string; expirationDate: string | null };
}

export interface FridgeContentsResponse {
  id: number;
  code: string;
  name: string;
  labReagentUnits: ReagentInFridge[];
  location?: { id: number; name: string; type: string };
}

export interface AssignBatchResponse {
  batchId: string | number;
  fridgeId: number;
  assignedUnits: number;
}

export const LabFridgeService = {
  getFridges: async (): Promise<LabFridge[]> => {
    const res = await apiClient.get("/lab/fridges");
    return res.data?.data ?? res.data;
  },

  createFridge: async (data: {
    locationId: number;
    code: string;
    name: string;
    targetTempCelsius?: number | null;
    status?: string;
    description?: string | null;
  }): Promise<LabFridge> => {
    const res = await apiClient.post("/lab/fridges", data);
    return res.data?.data ?? res.data;
  },

  getFridgeContents: async (id: number): Promise<FridgeContentsResponse> => {
    const res = await apiClient.get(`/lab/fridges/${id}/contents`);
    return res.data?.data ?? res.data;
  },

  assignBatch: async (
    fridgeId: number,
    batchId: string | number,
  ): Promise<AssignBatchResponse> => {
    const res = await apiClient.post(`/lab/fridges/${fridgeId}/assign-batch`, {
      batchId,
    });
    return res.data?.data ?? res.data;
  },
};
