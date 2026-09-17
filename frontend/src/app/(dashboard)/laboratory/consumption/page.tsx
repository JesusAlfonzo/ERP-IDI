"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LaboratoryClientService } from "@/services/laboratory.service";
import { AuthService } from "@/services/auth.service";
import type {
  ReagentBatchOption,
  ReagentConsumptionRecord,
} from "@/types/laboratory";
import {
  FlaskConical,
  TestTube,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  History,
  Package,
} from "lucide-react";

const COMMON_PROTOCOLS = [
  "ELISA Diagnóstica",
  "Citometría de Flujo",
  "Western Blot",
  "PCR en Tiempo Real",
  "Inmunohistoquímica",
  "Electroforesis de Proteínas",
  "Control de Calidad Interno",
];

const SECTIONS = [
  "Inmunogenética",
  "Inmunología Celular",
  "Inmunopatología",
  "Alergia e Inmunología Clínica",
  "Laboratorio General",
];

export default function ReagentConsumptionPage() {
  const router = useRouter();
  const [reagents, setReagents] = useState<ReagentBatchOption[]>([]);
  const [history, setHistory] = useState<ReagentConsumptionRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Estado del formulario
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [diagnosticProtocol, setDiagnosticProtocol] = useState<string>("");
  const [departmentSection, setDepartmentSection] = useState<string>(
    "Laboratorio General",
  );
  const [notes, setNotes] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [reagentsData, historyData] = await Promise.all([
        LaboratoryClientService.getAvailableReagents().catch(() => []),
        LaboratoryClientService.getRecentConsumptions().catch(() => []),
      ]);
      setReagents(reagentsData);
      setHistory(historyData);
    } catch {
      // Manejado por interceptor global
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!AuthService.isAuthenticated()) {
        router.replace("/login");
        return;
      }
      await loadData();
    };
    init();
  }, [router, loadData]);

  const selectedReagent = reagents.find(
    (r) => r.id === Number(selectedBatchId),
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (
      !selectedBatchId ||
      !quantity ||
      Number(quantity) <= 0 ||
      !diagnosticProtocol.trim()
    ) {
      setFeedback({
        status: "error",
        message:
          "Por favor complete todos los campos obligatorios del protocolo.",
      });
      return;
    }

    if (selectedReagent && Number(quantity) > selectedReagent.currentQuantity) {
      setFeedback({
        status: "error",
        message: `La cantidad solicitada supera el volumen actual del lote (${selectedReagent.currentQuantity} ${selectedReagent.product.unitOfMeasure}).`,
      });
      return;
    }

    setSubmitting(true);
    try {
      await LaboratoryClientService.registerConsumption({
        batchId: Number(selectedBatchId),
        quantity: Number(quantity),
        diagnosticProtocol: diagnosticProtocol.trim(),
        departmentSection,
        notes: notes.trim() || undefined,
      });

      setFeedback({
        status: "success",
        message:
          "Consumo registrado exitosamente e impactado en el Kardex institucional.",
      });

      // Resetear campos variables
      setQuantity("");
      setNotes("");
      await loadData();
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Error al registrar el gasto de reactivo.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-purple-600" />
          Registro de Consumo en Laboratorio
        </h1>
        <p className="text-xs text-slate-500">
          Descargo de viales y reactivos asociados a rutinas diagnósticas e
          investigación
        </p>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 border ${
            feedback.status === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {feedback.status === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Formulario de Registro */}
        <div className="lg:col-span-7">
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5"
          >
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
              <TestTube className="w-4 h-4 text-purple-600" />
              Datos del Análisis o Ensayo
            </h2>

            {/* Selector de Reactivo */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Reactivo / Lote Activo
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                disabled={loadingData}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800"
                required
              >
                <option value="">
                  {loadingData
                    ? "Cargando reactivos..."
                    : "-- Seleccionar reactivo en uso --"}
                </option>
                {reagents.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.product.name} - Lote #{r.lotNumber} | Disp:{" "}
                    {r.currentQuantity} {r.product.unitOfMeasure}
                  </option>
                ))}
              </select>

              {selectedReagent && (
                <div className="mt-2.5 p-3 bg-purple-50/50 border border-purple-100 rounded-lg flex items-center justify-between text-xs text-purple-900">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-purple-500" />
                    <span>SKU: {selectedReagent.product.sku}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>
                      Vencimiento:{" "}
                      {selectedReagent.expirationDate
                        ? new Date(
                            selectedReagent.expirationDate,
                          ).toLocaleDateString()
                        : "N/A"}
                    </span>
                    <span className="font-bold">
                      Saldo: {selectedReagent.currentQuantity}{" "}
                      {selectedReagent.product.unitOfMeasure}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Protocolo y Cantidad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Protocolo / Ensayo
                </label>
                <input
                  type="text"
                  list="protocol-suggestions"
                  value={diagnosticProtocol}
                  onChange={(e) => setDiagnosticProtocol(e.target.value)}
                  placeholder="Ej: ELISA Diagnóstica"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800"
                  required
                />
                <datalist id="protocol-suggestions">
                  {COMMON_PROTOCOLS.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Cantidad a Deducir
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    placeholder="Ej: 1"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-3 pr-12 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800"
                    required
                  />
                  <span className="absolute inset-y-0 right-3 flex items-center text-[10px] text-slate-400">
                    {selectedReagent?.product.unitOfMeasure || "Unid"}
                  </span>
                </div>
              </div>
            </div>

            {/* Sección o Departamento */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Sección / Unidad Solicitante
              </label>
              <select
                value={departmentSection}
                onChange={(e) => setDepartmentSection(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800"
              >
                {SECTIONS.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
            </div>

            {/* Notas / Observaciones */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Observaciones / Muestras procesadas (Opcional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="N° de serie de muestras o incidencias en la corrida analítica..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-xs disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? "Procesando descargo..." : "Registrar Consumo"}
              </button>
            </div>
          </form>
        </div>

        {/* Historial Reciente de Consumo */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <History className="w-4 h-4 text-slate-400" />
              Últimos Consumos Registrados
            </h2>

            {loadingData ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-600" />
                Cargando historial...
              </div>
            ) : history.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6 italic">
                No hay consumos recientes anotados en laboratorio.
              </p>
            ) : (
              <div className="space-y-3">
                {history.map((record) => (
                  <div
                    key={record.id}
                    className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">
                        {record.batch.product.name}
                      </span>
                      <span className="font-mono text-purple-700 font-bold">
                        -{record.quantity} {record.batch.product.unitOfMeasure}
                      </span>
                    </div>

                    <div className="text-slate-500 flex items-center justify-between text-[11px]">
                      <span>{record.diagnosticProtocol}</span>
                      <span className="text-slate-400">
                        Lote #{record.batch.lotNumber}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                      <span>
                        {record.analyst.fullName || record.analyst.username}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(record.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
