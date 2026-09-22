"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { InventoryClientService } from "@/services/inventory.service";
import { AuthService } from "@/services/auth.service";
import type { AdjustmentType } from "@/types/adjustments";
import {
  SlidersHorizontal,
  PlusCircle,
  MinusCircle,
  AlertOctagon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Package,
  Search,
  Calendar,
  Layers,
  ArrowRight,
} from "lucide-react";

interface ActiveBatchOption {
  id: number;
  lotNumber: string;
  currentQuantity: number;
  expirationDate: string | null;
  product: {
    name: string;
    sku: string;
    unitOfMeasure: string;
  };
}

const ADJUSTMENT_OPTIONS: {
  type: AdjustmentType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}[] = [
  {
    type: "ENTRADA_AJUSTE",
    label: "Entrada por Ajuste / Donación",
    icon: PlusCircle,
    description:
      "Incrementa el stock del lote (sobrantes de conteo, donaciones)",
  },
  {
    type: "SALIDA_AJUSTE",
    label: "Salida por Corrección",
    icon: MinusCircle,
    description: "Disminuye el stock por desajustes físicos de conteo",
  },
  {
    type: "MERMA_ROTURA",
    label: "Merma por Deterioro o Rotura",
    icon: AlertOctagon,
    description: "Baja formal por frasco roto, derrame o envase averiado",
  },
  {
    type: "MERMA_VENCIMIENTO",
    label: "Merma por Vencimiento",
    icon: AlertOctagon,
    description: "Baja obligatoria de reactivos que expiraron en almacén",
  },
];

export default function AdjustmentsPage() {
  const router = useRouter();
  const [batches, setBatches] = useState<ActiveBatchOption[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(true);
  const [batchSearch, setBatchSearch] = useState("");

  // Estado del Formulario
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [selectedBatchData, setSelectedBatchData] =
    useState<ActiveBatchOption | null>(null);
  const [adjustmentType, setAdjustmentType] =
    useState<AdjustmentType>("ENTRADA_AJUSTE");
  const [quantity, setQuantity] = useState<number | "">("");
  const [reason, setReason] = useState<string>("");
  const [referenceDoc, setReferenceDoc] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  const loadBatches = useCallback(async () => {
    setLoadingBatches(true);
    try {
      const data =
        await InventoryClientService.searchActiveBatches(batchSearch);
      setBatches(data);
    } catch {
      // Manejado por interceptor global
    } finally {
      setLoadingBatches(false);
    }
  }, [batchSearch]);

  useEffect(() => {
    const init = async () => {
      if (!AuthService.isAuthenticated()) {
        router.replace("/login");
        return;
      }
      await loadBatches();
    };
    init();
  }, [router, loadBatches]);

  useEffect(() => {
    const timer = window.setTimeout(() => loadBatches(), 300);
    return () => window.clearTimeout(timer);
  }, [batchSearch, loadBatches]);

  const activeBatch =
    selectedBatchData || batches.find((b) => b.id === Number(selectedBatchId));

  // Cálculo del stock proyectado posterior a la acción
  const currentStock = activeBatch ? Number(activeBatch.currentQuantity) : 0;
  const numQuantity = Number(quantity) || 0;
  const isIncrement = adjustmentType === "ENTRADA_AJUSTE";
  const projectedStock = isIncrement
    ? currentStock + numQuantity
    : Math.max(0, currentStock - numQuantity);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (
      !selectedBatchId ||
      !quantity ||
      Number(quantity) <= 0 ||
      !reason.trim() ||
      ((adjustmentType === "MERMA_ROTURA" ||
        adjustmentType === "MERMA_VENCIMIENTO") &&
        reason.trim().length < 5)
    ) {
      setFeedback({
        status: "error",
        message:
          adjustmentType === "MERMA_ROTURA" ||
          adjustmentType === "MERMA_VENCIMIENTO"
            ? "Complete los campos obligatorios y use un motivo de merma de al menos 5 caracteres."
            : "Complete todos los campos obligatorios con valores válidos.",
      });
      return;
    }

    if (
      adjustmentType !== "ENTRADA_AJUSTE" &&
      activeBatch &&
      Number(quantity) > activeBatch.currentQuantity
    ) {
      setFeedback({
        status: "error",
        message: `La cantidad a descontar (${quantity}) no puede superar el stock actual del lote (${activeBatch.currentQuantity} ${activeBatch.product.unitOfMeasure}).`,
      });
      return;
    }

    setSubmitting(true);
    try {
      const res =
        adjustmentType === "MERMA_ROTURA" ||
        adjustmentType === "MERMA_VENCIMIENTO"
          ? await InventoryClientService.registerDirectWaste({
              batchId: Number(selectedBatchId),
              quantity: Number(quantity),
              reason: reason.trim(),
            })
          : await InventoryClientService.createAdjustment({
              notes: referenceDoc.trim() || undefined,
              items: [
                {
                  batchId: Number(selectedBatchId),
                  action:
                    adjustmentType === "ENTRADA_AJUSTE"
                      ? "INCREMENTO"
                      : "DECREMENTO",
                  quantity: Number(quantity),
                  reason: reason.trim(),
                },
              ],
            });

      setFeedback({
        status: "success",
        message: `${res.message || "Ajuste aplicado exitosamente."} Saldo actualizado: ${res.newBalance} ${activeBatch?.product.unitOfMeasure || ""}`,
      });

      // Limpiar formulario y recargar stock de lotes
      setQuantity("");
      setReason("");
      setReferenceDoc("");
      setSelectedBatchId("");
      setSelectedBatchData(null);
      setBatchSearch("");
      await loadBatches();
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message:
          err instanceof Error ? err.message : "Error al procesar el ajuste.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <SlidersHorizontal className="w-6 h-6 text-blue-600" />
          Ajustes de Inventario y Mermas
        </h1>
        <p className="text-xs text-slate-500">
          Modificaciones directas al stock físico con justificación técnica para
          el Kardex
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

      {/* Formulario de Ajuste */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6"
      >
        {/* Selección del Tipo de Ajuste */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Tipo de Operación
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ADJUSTMENT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = adjustmentType === opt.type;
              return (
                <div
                  key={opt.type}
                  onClick={() => setAdjustmentType(opt.type)}
                  className={`cursor-pointer border rounded-lg p-3 transition-all flex flex-col justify-between ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/40 text-blue-900 shadow-2xs"
                      : "border-slate-200 hover:border-slate-300 text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-xs mb-1">
                    <Icon
                      className={`w-4 h-4 ${isSelected ? "text-blue-600" : "text-slate-400"}`}
                    />
                    {opt.label}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {opt.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selección de Lote y Producto */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Lote Afectado *
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              value={batchSearch}
              onChange={(e) => {
                setBatchSearch(e.target.value);
                setSelectedBatchId("");
                setSelectedBatchData(null);
              }}
              placeholder="Buscar por insumo, SKU o número de lote..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
              required={!selectedBatchId}
            />
            {(batchSearch || batches.length > 0) && !selectedBatchId && (
              <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                {loadingBatches ? (
                  <div className="p-3 text-xs text-slate-500">
                    Buscando lotes...
                  </div>
                ) : batches.length === 0 ? (
                  <div className="p-3 text-xs text-slate-500">
                    No se encontraron lotes disponibles.
                  </div>
                ) : (
                  batches.map((batch) => (
                    <button
                      type="button"
                      key={batch.id}
                      onClick={() => {
                        setSelectedBatchId(String(batch.id));
                        setSelectedBatchData(batch);
                        setBatchSearch(
                          `${batch.product.name} · #${batch.lotNumber}`,
                        );
                      }}
                      className="w-full text-left px-3 py-2.5 border-b border-slate-100 hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <strong className="text-xs text-slate-800 truncate">
                          {batch.product.name}
                        </strong>
                        <span className="text-[10px] font-mono font-bold text-blue-700">
                          #{batch.lotNumber}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                        <span>{batch.product.sku}</span>
                        <span className="font-semibold text-emerald-700">
                          Stock: {batch.currentQuantity}{" "}
                          {batch.product.unitOfMeasure}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {batch.expirationDate
                            ? new Date(
                                batch.expirationDate,
                              ).toLocaleDateString()
                            : "Sin vencimiento"}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Ficha Visual Ampliada del Lote Seleccionado con Stock */}
          {activeBatch && (
            <div className="mt-3 p-3.5 bg-blue-50/50 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-bold text-slate-900 text-sm">
                    {activeBatch.product.name}
                  </span>
                  <span className="font-mono text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">
                    SKU: {activeBatch.product.sku}
                  </span>
                </div>
                <div className="text-slate-500 text-[11px] flex items-center gap-3 font-mono">
                  <span>
                    Lote:{" "}
                    <strong className="text-slate-800">
                      #{activeBatch.lotNumber}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Vence:{" "}
                    {activeBatch.expirationDate
                      ? new Date(
                          activeBatch.expirationDate,
                        ).toLocaleDateString()
                      : "Sin vencimiento"}
                  </span>
                </div>
              </div>

              {/* Indicador de Stock Físico */}
              <div className="flex items-center gap-2 sm:self-center bg-white border border-blue-200 px-3.5 py-2 rounded-lg shadow-2xs">
                <Layers className="w-4 h-4 text-blue-600" />
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Stock en Sistema
                  </span>
                  <span className="text-base font-bold font-mono text-blue-900">
                    {activeBatch.currentQuantity}{" "}
                    <span className="text-xs font-normal text-slate-600">
                      {activeBatch.product.unitOfMeasure}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cantidad y Documento de Referencia */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Cantidad a Ajustar *
              </label>
              {activeBatch && Number(quantity) > 0 && (
                <span className="text-[11px] font-mono flex items-center gap-1 text-slate-600">
                  <span>Saldo:</span>
                  <span className="font-semibold text-slate-800">
                    {currentStock}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span
                    className={`font-bold ${
                      isIncrement
                        ? "text-emerald-600"
                        : projectedStock === 0
                          ? "text-red-600"
                          : "text-blue-600"
                    }`}
                  >
                    {projectedStock} {activeBatch.product.unitOfMeasure}
                  </span>
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="number"
                min="0.01"
                step="any"
                value={quantity}
                onChange={(e) =>
                  setQuantity(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
                placeholder="Ej: 5"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-3 pr-14 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-mono"
                required
              />
              <span className="absolute inset-y-0 right-3 flex items-center text-[10px] font-semibold text-slate-400 pointer-events-none">
                {activeBatch?.product.unitOfMeasure || "Unid"}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Documento o N° Acta (Opcional)
            </label>
            <input
              type="text"
              value={referenceDoc}
              onChange={(e) => setReferenceDoc(e.target.value)}
              placeholder="Ej: ACTA-MERMA-2026-04"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            />
          </div>
        </div>

        {/* Motivo / Justificación */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Motivo / Justificación Técnica *
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describa detalladamente la causa del ajuste o de la merma..."
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            required
          />
        </div>

        {/* Botón Guardar */}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? "Aplicando ajuste..." : "Confirmar y Guardar Ajuste"}
          </button>
        </div>
      </form>
    </div>
  );
}
