"use client";

import { useEffect, useState, useCallback, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { LabFridgeService } from "@/services/lab-fridge.service";
import type {
  FridgeContentsResponse,
  ReagentInFridge,
} from "@/types/laboratory";
import {
  Snowflake,
  ArrowLeft,
  Thermometer,
  Building,
  Package,
  Layers,
  Trash2,
  Printer,
  Loader2,
} from "lucide-react";

export default function FridgeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const fridgeId = params?.id as string;

  const [fridge, setFridge] = useState<FridgeContentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  const loadFridge = useCallback(async () => {
    if (!fridgeId) return;
    try {
      const data = await LabFridgeService.getFridgeContents(Number(fridgeId));
      setFridge(data);
    } catch (err) {
      console.error("Error cargando inventario de nevera", err);
    } finally {
      setLoading(false);
    }
  }, [fridgeId]);

  useEffect(() => {
    startTransition(() => {
      void loadFridge();
    });
  }, [loadFridge]);

  const handleOpenUnit = async (unitId: string | number) => {
    try {
      await LabFridgeService.openUnit(unitId);
      await loadFridge();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al abrir reactivo");
    }
  };

  const handleDiscardUnit = async (unit: ReagentInFridge) => {
    const reason = prompt(
      `Motivo de descarte de ${unit.product?.name ?? "reactivo"} (${unit.unitCode}):`,
    );
    if (!reason || !reason.trim()) return;

    try {
      await LabFridgeService.discardUnit(unit.id, reason.trim());
      await loadFridge();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al descartar");
    }
  };

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600 mb-2" />
        <span className="text-xs text-slate-500 font-medium">
          Auditando existencias en frío...
        </span>
      </div>
    );
  }

  if (!fridge) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-lg font-bold text-slate-800">
          Equipo de refrigeración no encontrado
        </h2>
        <button
          type="button"
          onClick={() => router.push("/laboratory/fridges")}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs bg-slate-900 text-white rounded-lg cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a equipos
        </button>
      </div>
    );
  }

  const units = fridge.labReagentUnits || [];
  const sealedCount = units.filter((u) => u.status === "SELLADO").length;
  const inUseCount = units.filter((u) => u.status === "EN_USO").length;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/laboratory/fridges")}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer"
            title="Volver"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                {fridge.code}
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                Inventario Operativo
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
              <Snowflake className="w-5 h-5 text-sky-600" />
              {fridge.name}
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" /> Imprimir Inventario Físico
        </button>
      </div>

      {/* Resumen de Capacidad y Estado */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <Thermometer className="w-4 h-4 text-sky-600" />
            Consigna Térmica
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {fridge.targetTempCelsius !== null &&
            fridge.targetTempCelsius !== undefined
              ? `${Number(fridge.targetTempCelsius)}°C`
              : "Ambiente"}
          </div>
          <span className="text-[10px] text-slate-400">
            Temperatura controlada
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <Building className="w-4 h-4 text-purple-600" />
            Ubicación
          </div>
          <div className="text-sm font-bold text-slate-800 truncate">
            {fridge.location?.name ?? "Laboratorio"}
          </div>
          <span className="text-[10px] text-slate-400">Sala técnica</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-600" />
            Frascos Sellados
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700">
            {sealedCount}
          </div>
          <span className="text-[10px] text-slate-400">Stock de reserva</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <Package className="w-4 h-4 text-amber-600" />
            Frascos En Uso
          </div>
          <div className="text-2xl font-bold font-mono text-amber-700">
            {inUseCount}
          </div>
          <span className="text-[10px] text-slate-400">
            En banco de trabajo
          </span>
        </div>
      </div>

      {/* Tabla de Frascos / Reactivos en Frío */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Package className="w-4 h-4 text-sky-600" />
            Frascos y Lotes Almacenados en el Equipo ({units.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Código Frasco</th>
                <th className="py-3 px-4">Reactivo / Insumo</th>
                <th className="py-3 px-4">Lote</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Volumen</th>
                <th className="py-3 px-4">Caducidad</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {units.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No se registran reactivos en esta nevera. Use el botón
                    &quot;Asignar lote&quot; en Consumo o traslade frascos desde
                    otra cava.
                  </td>
                </tr>
              ) : (
                units.map((unit) => (
                  <tr key={String(unit.id)} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {unit.unitCode}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {unit.product?.name}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">
                        SKU: {unit.product?.sku}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-purple-700 font-bold">
                      #{unit.batch?.lotNumber ?? "N/D"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                          unit.status === "SELLADO"
                            ? "bg-slate-50 text-slate-700 border-slate-200"
                            : unit.status === "EN_USO"
                              ? "bg-sky-50 text-sky-700 border-sky-200"
                              : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        {unit.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                      {Number(unit.currentVolume)} /{" "}
                      {Number(unit.initialVolume)}{" "}
                      {unit.product?.baseUnit?.abbreviation ?? "ml"}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {unit.expirationDate
                        ? new Date(unit.expirationDate).toLocaleDateString()
                        : "N/D"}
                    </td>
                    <td className="py-3 px-4 text-center space-x-2">
                      {unit.status === "SELLADO" && (
                        <button
                          type="button"
                          onClick={() => handleOpenUnit(unit.id)}
                          className="text-xs text-sky-600 hover:text-sky-800 font-semibold cursor-pointer"
                        >
                          Abrir
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDiscardUnit(unit)}
                        className="text-slate-400 hover:text-red-600 cursor-pointer"
                        title="Descartar frasco"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
