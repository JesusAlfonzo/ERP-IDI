"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { InventoryClientService } from "@/services/inventory.service";
import { downloadCsv } from "@/lib/csv";
import { AuthService } from "@/services/auth.service";
import type { KardexItem, MovementType } from "@/types/kardex";
import type { PaginationMeta } from "@/types/api";
import {
  FileSpreadsheet,
  RefreshCw,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react";

const MOVEMENT_LABELS: Record<MovementType, { label: string; color: string }> =
  {
    ENTRADA_COMPRA: { label: "Entrada por Compra", color: "emerald" },
    TRASLADO_A_LABORATORIO: { label: "Salida a Laboratorio", color: "purple" },
    DESPACHO_SOLICITUD: { label: "Salida a Sala", color: "purple" },
    AJUSTE_INVENTARIO: { label: "Ajuste de Inventario", color: "blue" },
    DESCARTE_MERMA: { label: "Merma", color: "red" },
  };

export default function KardexPage() {
  const router = useRouter();
  const [items, setItems] = useState<KardexItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    currentPage: 1,
    itemsPerPage: 15,
    totalPages: 1,
    totalItems: 0,
  });
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Filtros de búsqueda
  const [selectedType, setSelectedType] = useState<MovementType | "">("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const loadKardex = useCallback(async () => {
    setLoading(true);
    try {
      const res = await InventoryClientService.getKardex({
        page,
        limit: 15,
        type: selectedType,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: searchTerm || undefined,
      });
      setItems(res.data || []);
      if (res.meta) {
        setMeta(res.meta);
      }
    } catch {
      // Interceptor global gestiona el error
    } finally {
      setLoading(false);
    }
  }, [page, selectedType, startDate, endDate, searchTerm]);

  useEffect(() => {
    const init = async () => {
      if (!AuthService.isAuthenticated()) {
        router.replace("/login");
        return;
      }
      await loadKardex();
    };
    init();
  }, [router, loadKardex]);

  const handleExportCSV = async () => {
    setDownloading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      downloadCsv(
        `kardex_inventario_${today}.csv`,
        [
          "Fecha",
          "Tipo",
          "Producto",
          "SKU",
          "Lote",
          "Cantidad",
          "Unidad",
          "Usuario",
          "Motivo",
        ],
        items.map((row) => [
          new Date(row.createdAt).toLocaleString("es-VE"),
          MOVEMENT_LABELS[row.type]?.label || row.type,
          row.batch.product.name,
          row.batch.product.sku,
          row.batch.lotNumber,
          row.quantity,
          row.batch.product.unitOfMeasure,
          row.performedBy?.fullName || row.performedBy?.username || "Sistema",
          row.reason,
        ]),
      );
    } finally {
      setDownloading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadKardex();
  };

  return (
    <div className="space-y-6">
      {/* Encabezado de la vista */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Kardex de Movimientos
          </h1>
          <p className="text-xs text-slate-500">
            Auditoría cronológica y trazabilidad de entradas, salidas y mermas
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={downloading}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4" />
          {downloading ? "Generando..." : "Exportar CSV"}
        </button>
      </div>

      {/* Panel de Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-4 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Buscar SKU, producto o lote..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Tipo de Movimiento */}
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value as MovementType | "");
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
          >
            <option value="">Todos los movimientos</option>
            {Object.entries(MOVEMENT_LABELS).map(([key, item]) => (
              <option key={key} value={key}>
                {item.label}
              </option>
            ))}
          </select>

          {/* Rango de Fechas */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="bg-transparent focus:outline-none text-slate-700"
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="bg-transparent focus:outline-none text-slate-700"
            />
          </div>

          <button
            onClick={() => loadKardex()}
            className="p-2 border border-slate-300 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors shadow-2xs"
            title="Recargar tabla"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Tabla de Movimientos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Fecha / Hora</th>
                <th className="py-3 px-4">Tipo Movimiento</th>
                <th className="py-3 px-4">Producto & SKU</th>
                <th className="py-3 px-4">Lote</th>
                <th className="py-3 px-4 text-right">Cantidad</th>
                <th className="py-3 px-4 text-right">Saldo Tras Mov.</th>
                <th className="py-3 px-4">Responsable</th>
                <th className="py-3 px-4">Observación</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    Cargando movimientos...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No se registraron movimientos con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const movement = MOVEMENT_LABELS[row.type];
                  const isPositive = row.quantity >= 0;
                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleString("es-VE", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold text-[10px] ${
                            movement?.color === "emerald"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : movement?.color === "purple"
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : movement?.color === "red"
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {isPositive ? (
                            <ArrowDownLeft className="w-3 h-3" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3" />
                          )}
                          {movement?.label || row.type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">
                          {row.batch.product.name}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          {row.batch.product.sku}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        #{row.batch.lotNumber}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-bold ${
                          isPositive ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        {row.quantity > 0 ? `+${row.quantity}` : row.quantity}
                        <span className="text-[10px] font-normal text-slate-500 ml-1">
                          {row.batch.product.unitOfMeasure}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-700">
                        {row.balanceAfter ?? "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {row.performedBy?.fullName ||
                          row.performedBy?.username ||
                          "Sistema"}
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {row.reason || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Mostrando página{" "}
            <span className="font-semibold">{meta.currentPage}</span> de{" "}
            <span className="font-semibold">{meta.totalPages || 1}</span> (
            {meta.totalItems} registros)
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-1.5 border border-slate-200 rounded-md bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= meta.totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="p-1.5 border border-slate-200 rounded-md bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
