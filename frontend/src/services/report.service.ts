import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";
import type { DashboardOverviewData } from "@/types/dashboard";

export interface CustomReportFilterParams {
  reportType?: 'KARDEX' | 'SUPPLIER_PAYMENTS' | 'DEPARTMENT_CONSUMPTION' | 'BATCH_EXPIRATION';
  startDate?: string;
  endDate?: string;
  productId?: number;
  categoryId?: number;
  supplierId?: number;
  departmentId?: number;
  movementType?: string;
  status?: string;
  search?: string;
}

export interface CustomReportData {
  reportType: 'KARDEX' | 'SUPPLIER_PAYMENTS' | 'DEPARTMENT_CONSUMPTION' | 'BATCH_EXPIRATION';
  generatedAt: string;
  totalRecords: number;
  summary: Record<string, any>;
  rows?: any[];
  orders?: any[];
  directPayments?: any[];
  supplierSummaries?: any[];
}

export const ReportClientService = {
  async getDashboard(): Promise<DashboardOverviewData> {
    const response =
      await apiClient.get<ApiResponse<DashboardOverviewData>>(
        "/reports/dashboard",
      );
    if (!response.data.data) {
      throw new Error(response.data.message || "Error al obtener dashboard");
    }
    return response.data.data;
  },

  async getCustomReport(filters: CustomReportFilterParams): Promise<CustomReportData> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") {
        params.append(k, String(v));
      }
    });
    const response = await apiClient.get<ApiResponse<CustomReportData>>(
      `/reports/custom?${params.toString()}`
    );
    if (!response.data.data) {
      throw new Error(response.data.message || "Error al generar reporte personalizado");
    }
    return response.data.data;
  },

  async downloadKardexCSV(): Promise<void> {
    const response = await apiClient.get("/exports/kardex", {
      responseType: "blob",
    });

    const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `kardex_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async downloadInventoryValuationCSV(): Promise<void> {
    const response = await apiClient.get("/exports/inventory-valuation", {
      responseType: "blob",
    });

    const blob = new Blob([response.data], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `valorizacion_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
