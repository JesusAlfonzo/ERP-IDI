"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { QualityClientService } from "@/services/quality.service";
import { AuthService } from "@/services/auth.service";
import type {
  QuarantineBatch,
  QualityVerdict,
  IncidentType,
} from "@/types/quality";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  FileCheck,
  Package,
  AlertTriangle,
  Building,
} from "lucide-react";

const INCIDENT_LABELS: Record<IncidentType, string> = {
  FALLA_CONTROL_CALIDAD: "Falla de Control de Calidad / Reactividad",
  TEMPERATURA_FUERA_RANGO: "Ruptura de Cadena de Frío / Temperatura",
  ROTURA_EMPAQUE: "Rotura o Daño Físico de Empaque",
  CONTAMINACION: "Contaminación o Turbidez del Insumo",
  OTRO: "Otra no conformidad técnica",
};

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
  const [incidentType, setIncidentType] = useState<IncidentType>(
    "FALLA_CONTROL_CALIDAD",
  );
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
      // Interceptor global gestiona el error
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
    void init();

    return () => {
      isMounted = false;
    };
  }, [router, loadQuarantine]);

  const handleOpenInspection = (batch: QuarantineBatch) => {
    setSelectedBatch(batch);
    setVerdict("LIBERAR");
    setIncidentType("FALLA_CONTROL_CALIDAD");
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

    if (technicalNotes.trim().length < 5) {
      setFeedback({
        status: "error",
        message:
          "Debe ingresar una justificación técnica de al menos 5 caracteres.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await QualityClientService.submitVerdict({
        batchId: Number(selectedBatch.id),
        verdict,
        incidentType: verdict === "RECHAZAR" ? incidentType : undefined,
        technicalNotes: technicalNotes.trim(),
      });

      setFeedback({
        status: "success",
        message: res.message,
      });

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
            : "Ocurrió un error al procesar el dictamen de calidad.",
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
            Control de Calidad & Cuarentena
          </h1>
          <p className="text-xs text-slate-500">
            Inspección analítica, liberación y registro de no conformidades
            hospitalarias
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadQuarantine()}
          className="p-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
          title="Actualizar lista"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Selector de Pestaña */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveStatus("EN_CUARENTENA")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
            isQuarantine
              ? "border-amber-500 text-amber-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Retenidos en Cuarentena
        </button>
        <button
          type="button"
          onClick={() => setActiveStatus("DEFECTUOSO")}
          className={`px-4 py-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
            !isQuarantine
              ? "border-red-500 text-red-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Rechazados / Defectuosos
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
                <th className="py-3 px-4">Ubicación Actual</th>
                <th className="py-3 px-4 text-right">Cantidad</th>
                <th className="py-3 px-4">Vencimiento</th>
                <th className="py-3 px-4">Fecha Ingreso</th>
                <th className="py-3 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-600 mb-2" />
                    Consultando lotes en auditoría...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    {isQuarantine
                      ? "No hay lotes retenidos en cuarentena. El stock disponible está al día."
                      : "No existen lotes declarados como defectuosos."}
                  </td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr
                    key={String(batch.id)}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-amber-900">
                      #{batch.lotNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">
                        {batch.product.name}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">
                        SKU: {batch.product.sku}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        {batch.location?.name ?? "Almacén Central"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800 font-mono">
                      {batch.currentQuantity} {batch.product.unitOfMeasure}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
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
                          type="button"
                          onClick={() => handleOpenInspection(batch)}
                          className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          Inspeccionar
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-700 font-semibold text-[11px] bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3" /> Inutilizado
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

      {/* Modal de Dictamen Técnico */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-800 text-base">
                  Dictamen de Control de Calidad
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseInspection}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Ficha del Lote */}
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
                <span className="font-mono font-bold text-slate-700">
                  Existencia: {selectedBatch.currentQuantity}{" "}
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
                  Resolución del Análisis
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setVerdict("LIBERAR")}
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
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
                    className={`p-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all cursor-pointer ${
                      verdict === "RECHAZAR"
                        ? "bg-red-50 border-red-500 text-red-800 shadow-2xs"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <XCircle className="w-4 h-4 text-red-600" />
                    Rechazar Lote
                  </button>
                </div>
              </div>

              {/* Si se rechaza, desplegar selector de Incidente */}
              {verdict === "RECHAZAR" && (
                <div className="p-3 bg-red-50 rounded-xl border border-red-200 space-y-2">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-red-800 uppercase tracking-wider">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                    Causa del Rechazo (Incidente Sanitario) *
                  </label>
                  <select
                    value={incidentType}
                    onChange={(e) =>
                      setIncidentType(e.target.value as IncidentType)
                    }
                    className="w-full bg-white border border-red-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-red-500"
                    required
                  >
                    {Object.entries(INCIDENT_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Informe Técnico / Justificación del Dictamen *
                </label>
                <textarea
                  rows={3}
                  value={technicalNotes}
                  onChange={(e) => setTechnicalNotes(e.target.value)}
                  placeholder="Detalles sobre temperatura de llegada, controles analíticos o motivo del rechazo (mínimo 5 caracteres)..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseInspection}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
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
