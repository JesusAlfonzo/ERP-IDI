"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ReportClientService } from "@/services/report.service";
import { AuthService } from "@/services/auth.service";
import type { DashboardOverviewData } from "@/types/dashboard";
import {
  DollarSign,
  AlertTriangle,
  Clock,
  FlaskConical,
  ShoppingCart,
  Download,
  RefreshCw,
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await ReportClientService.getDashboard();
      setData(result);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error al conectar con la API de reportes");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initDashboard = async () => {
      if (!AuthService.isAuthenticated()) {
        router.replace("/login");
        return;
      }
      await loadMetrics();
    };

    initDashboard();
  }, [router, loadMetrics]);

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center text-slate-500">
        <RefreshCw className="w-6 h-6 animate-spin mr-2 text-blue-600" />
        <span className="text-sm font-medium">
          Cargando analítica institucional...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado de sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Panel de Control Ejecutivo
          </h1>
          <p className="text-xs text-slate-500">
            Métricas de inventario, calidad y compras en tiempo real
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => ReportClientService.downloadKardexCSV()}
            className="flex items-center gap-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2 rounded-lg font-medium shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            CSV Kardex
          </button>
          <button
            onClick={() => ReportClientService.downloadInventoryValuationCSV()}
            className="flex items-center gap-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2 rounded-lg font-medium shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            CSV Valorización
          </button>
          <button
            onClick={() => loadMetrics()}
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg transition-colors shadow-2xs"
            title="Refrescar métricas"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Tarjetas KPI Superiores */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Valor Total Inventario
            </span>
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-800">
            $
            {data?.valuation.totalInventoryValueUsd.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </div>
          <span className="text-xs text-slate-600">
            Calculado en base a lotes activos
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Lotes en Cuarentena
            </span>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {data?.qualityAndStockAlerts.quarantinedBatches}
          </div>
          <span className="text-xs text-slate-600">
            Requieren dictamen técnico
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Lotes por Vencer (30d)
            </span>
            <Clock className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {data?.expirationMatrix.summary.within30DaysCount}
          </div>
          <span className="text-xs text-slate-600">
            {data?.expirationMatrix.summary.expiredCount} ya vencidos
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Deuda Pendiente Proveedores
            </span>
            <ShoppingCart className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-800">
            $
            {data?.purchasing.totalPendingDebtUsd.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </div>
          <span className="text-xs text-slate-600">
            {data?.purchasing.pendingOrders} órdenes activas
          </span>
        </div>
      </div>

      {/* Tablas Detalladas: Vencimientos y Laboratorio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Matriz Vencimientos Críticos */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-red-500" />
            Lotes Críticos (Próximos a vencer ≤ 30 días)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold text-slate-700">
                    Lote
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-slate-700">
                    Producto
                  </th>
                  <th className="py-2.5 px-3 text-right font-semibold text-slate-700">
                    Cant.
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-slate-700">
                    Vencimiento
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!data?.expirationMatrix.details.within30Days ||
                data.expirationMatrix.details.within30Days.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-slate-600">
                      No hay lotes próximos a vencer en los próximos 30 días
                    </td>
                  </tr>
                ) : (
                  data.expirationMatrix.details.within30Days
                    .slice(0, 5)
                    .map((item) => (
                      <tr key={item.batchId}>
                        <td className="py-2 px-3 font-mono font-medium text-slate-700">
                          {item.lotNumber}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-800">
                          {item.productName}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          {item.quantity}
                        </td>
                        <td className="py-2 px-3 text-red-600">
                          {new Date(item.expirationDate).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Reactivos Consumidos */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-purple-500" />
            Consumo de Reactivos en Laboratorio
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold text-slate-700">
                    Código
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-slate-700">
                    Reactivo
                  </th>
                  <th className="py-2.5 px-3 text-right font-semibold text-slate-700">
                    Total Consumido
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!data?.laboratory.topConsumedReagents ||
                data.laboratory.topConsumedReagents.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-slate-600">
                      No hay consumos registrados aún
                    </td>
                  </tr>
                ) : (
                  data.laboratory.topConsumedReagents.map((reagent) => (
                    <tr key={reagent.unitCode}>
                      <td className="py-2 px-3 font-mono font-medium text-slate-700">
                        {reagent.unitCode}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-800">
                        {reagent.productName}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-purple-800">
                        {reagent.totalConsumed}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
