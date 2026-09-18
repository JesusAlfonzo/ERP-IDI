"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { QualityClientService } from "@/services/quality.service";
import { AuthService } from "@/services/auth.service";
import type { QuarantineBatch, QualityVerdict } from "@/types/quality";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  FileCheck,
  Package,
} from "lucide-react";

export default function QualityQuarantinePage() {
  const router = useRouter();
  const [batches, setBatches] = useState<QuarantineBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStatus, setActiveStatus] = useState<
    "EN_CUARENTENA" | "DEFECTUOSO"
  >("EN_CUARENTENA");

  // Modal / Formulario de Dictamen
  const [selectedBatch, setSelectedBatch] = useState<QuarantineBatch | null>(
    null,
  );
  const [verdict, setVerdict] = useState<QualityVerdict>("LIBERAR");
  const [technicalNotes, setTechnicalNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  const loadQuarantine = useCallback(async () => {
    setLoading(true);
    try {
      const data = await QualityClientService.getBatchesByStatus(activeStatus);
      setBatches(data);
    } catch {
      // Manejado por interceptor global
    } finally {
      setLoading(false);
    }
  }, [activeStatus]);

  useEffect(() => {
    let isMounted = true;
    if (!AuthService.isAuthenticated()) {
      router.replace("/login");
      return;
    }

    const init = async () => {
      if (isMounted) {
        await loadQuarantine();
      }
    };
    init();

    return () => {
      isMounted = false;
    };
  }, [router, loadQuarantine]);

  const handleOpenInspection = (batch: QuarantineBatch) => {
    setSelectedBatch(batch);
    setVerdict("LIBERAR");
    setTechnicalNotes("");
    setFeedback(null);
  };

  const isQuarantine = activeStatus === "EN_CUARENTENA";

  const handleCloseInspection = () => {
    setSelectedBatch(null);
    setTechnicalNotes("");
    setFeedback(null);
  };

  const handleSubmitVerdict = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;

    if (!technicalNotes.trim()) {
      setFeedback({
        status: "error",
        message: "Debe ingresar una nota técnica que justifique el dictamen.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await QualityClientService.submitVerdict({
        batchId: selectedBatch.id,
        verdict,
        technicalNotes: technicalNotes.trim(),
      });

      setFeedback({
        status: "success",
        message: res.message || "Dictamen procesado correctamente.",
      });

      // Recargar lista y cerrar modal tras breve pausa
      await loadQuarantine();
      setTimeout(() => {
        handleCloseInspection();
      }, 1200);
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Ocurrió un error al procesar la inspección.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-amber-600" />
            Control de Calidad y Cuarentena
          </h1>
          <p className="text-xs text-slate-500">
            Inspección y dictamen técnico de reactivos e insumos retenidos
            preventivamente
          </p>
        </div>

        <button
          onClick={() => loadQuarantine()}
          className="p-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg transition-colors shadow-2xs self-start sm:self-auto"
          title="Actualizar lista"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveStatus("EN_CUARENTENA")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 ${
            isQuarantine
              ? "border-amber-500 text-amber-700"
              : "border-transparent text-slate-500"
          }`}
        >
          En cuarentena
        </button>
        <button
          onClick={() => setActiveStatus("DEFECTUOSO")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 ${
            !isQuarantine
              ? "border-red-500 text-red-700"
              : "border-transparent text-slate-500"
          }`}
        >
          Defectuosos
        </button>
      </div>

      {/* Tabla de Cuarentena */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Lote</th>
                <th className="py-3 px-4">Producto & SKU</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4 text-right">Cantidad Retenida</th>
                <th className="py-3 px-4">Fecha Vencimiento</th>
                <th className="py-3 px-4">Fecha Ingreso</th>
                <th className="py-3 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-600 mb-2" />
                    Consultando lotes en cuarentena...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    {isQuarantine
                      ? "No hay lotes retenidos en cuarentena en este momento."
                      : "No hay lotes defectuosos registrados."}
                  </td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr
                    key={batch.id}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-amber-800">
                      #{batch.lotNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">
                        {batch.product.name}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">
                        {batch.product.sku}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {batch.product.category?.name || "General"}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800">
                      {batch.currentQuantity} {batch.product.unitOfMeasure}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {batch.expirationDate
                        ? new Date(batch.expirationDate).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(batch.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isQuarantine ? (
                        <button
                          onClick={() => handleOpenInspection(batch)}
                          className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          Emitir Dictamen
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-red-700 font-semibold">
                          <XCircle className="w-3.5 h-3.5" />
                          Rechazado
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Diálogo de Inspección Técnica */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-800 text-base">
                  Dictamen de Control de Calidad
                </h3>
              </div>
              <button
                onClick={handleCloseInspection}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {/* Ficha rápida del lote inspeccionado */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-slate-400" />
                  {selectedBatch.product.name}
                </span>
                <span className="font-mono text-amber-800 font-bold">
                  Lote #{selectedBatch.lotNumber}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500 text-[11px]">
                <span>SKU: {selectedBatch.product.sku}</span>
                <span>
                  Cantidad: {selectedBatch.currentQuantity}{" "}
                  {selectedBatch.product.unitOfMeasure}
                </span>
              </div>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
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

            <form onSubmit={handleSubmitVerdict} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  Resolución Técnica
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setVerdict("LIBERAR")}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                      verdict === "LIBERAR"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Aprobar y Liberar
                  </button>

                  <button
                    type="button"
                    onClick={() => setVerdict("RECHAZAR")}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                      verdict === "RECHAZAR"
                        ? "bg-red-50 border-red-500 text-red-800 shadow-2xs"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <XCircle className="w-4 h-4 text-red-600" />
                    Declarar Defectuoso
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Justificación Técnica / Observaciones del Análisis
                </label>
                <textarea
                  rows={3}
                  value={technicalNotes}
                  onChange={(e) => setTechnicalNotes(e.target.value)}
                  placeholder="Detalles de integridad del empaque, cadena de frío, controles positivos/negativos o motivo de rechazo..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseInspection}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? "Procesando..." : "Confirmar Dictamen"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
