import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";
import type {
  CostRealByExamReport,
  FinancialConsolidatedByAreaReport,
  ItemTraceabilityReport,
} from "@/types/financial-reports";

export const FinancialReportsService = {
  async getCostRealByExam(params?: {
    examId?: number;
    labAreaId?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<CostRealByExamReport> {
    const query = new URLSearchParams();
    if (params?.examId) query.append("examId", String(params.examId));
    if (params?.labAreaId) query.append("labAreaId", String(params.labAreaId));
    if (params?.startDate) query.append("startDate", params.startDate);
    if (params?.endDate) query.append("endDate", params.endDate);
    const res = await apiClient.get<ApiResponse<CostRealByExamReport>>(
      `/reports/financial/by-exam?${query.toString()}`
    );
    if (!res.data.data) throw new Error("No se pudo cargar el reporte de costo por examen");
    return res.data.data;
  },

  async getFinancialConsolidatedByArea(params?: {
    labAreaId?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<FinancialConsolidatedByAreaReport> {
    const query = new URLSearchParams();
    if (params?.labAreaId) query.append("labAreaId", String(params.labAreaId));
    if (params?.startDate) query.append("startDate", params.startDate);
    if (params?.endDate) query.append("endDate", params.endDate);
    const res = await apiClient.get<ApiResponse<FinancialConsolidatedByAreaReport>>(
      `/reports/financial/by-area?${query.toString()}`
    );
    if (!res.data.data) throw new Error("No se pudo cargar el reporte consolidado por área");
    return res.data.data;
  },

  async getItemTraceability(params: {
    batchId?: string | number;
    productId?: string | number;
    lotNumber?: string;
  }): Promise<ItemTraceabilityReport> {
    const query = new URLSearchParams();
    if (params.batchId) query.append("batchId", String(params.batchId));
    if (params.productId) query.append("productId", String(params.productId));
    if (params.lotNumber) query.append("lotNumber", params.lotNumber);
    const res = await apiClient.get<ApiResponse<ItemTraceabilityReport>>(
      `/reports/traceability?${query.toString()}`
    );
    if (!res.data.data) throw new Error("No se pudo cargar la trazabilidad del lote");
    return res.data.data;
  },
};
