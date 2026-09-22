import { apiClient } from "@/lib/api-client";
import type {
  LabFridge,
  FridgeContentsResponse,
  AssignBatchResponse,
  CreateFridgePayload,
  ReagentInFridge,
} from "@/types/laboratory";

export const LabFridgeService = {
  getFridges: async (locationId?: number): Promise<LabFridge[]> => {
    const query = locationId ? `?locationId=${locationId}` : "";
    const res = await apiClient.get(`/lab/fridges${query}`);
    return res.data?.data ?? res.data ?? [];
  },

  createFridge: async (data: CreateFridgePayload): Promise<LabFridge> => {
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

  transferUnit: async (
    unitId: string | number,
    toFridgeId: number,
    reason?: string,
  ): Promise<ReagentInFridge> => {
    const res = await apiClient.post(`/lab/units/${unitId}/transfer`, {
      toFridgeId,
      reason,
    });
    return res.data?.data ?? res.data;
  },

  openUnit: async (unitId: string | number): Promise<ReagentInFridge> => {
    const res = await apiClient.patch(`/lab/units/${unitId}/open`);
    return res.data?.data ?? res.data;
  },

  discardUnit: async (
    unitId: string | number,
    reason: string,
  ): Promise<ReagentInFridge> => {
    const res = await apiClient.post(`/lab/units/${unitId}/discard`, {
      reason,
    });
    return res.data?.data ?? res.data;
  },
};
