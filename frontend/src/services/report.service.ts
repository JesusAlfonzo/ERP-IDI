import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";
import type { DashboardOverviewData } from "@/types/dashboard";

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
