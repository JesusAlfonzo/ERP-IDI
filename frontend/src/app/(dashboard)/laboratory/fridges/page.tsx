"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LabFridgeService } from "@/services/lab-fridge.service";
import { LaboratoryClientService } from "@/services/laboratory.service";
import { InventoryClientService } from "@/services/inventory.service";
import { AuthService } from "@/services/auth.service";
import type {
  LabFridge,
  FridgeContentsResponse,
  FridgeStatus,
  ReagentInFridge,
  ReagentBatchOption,
} from "@/types/laboratory";
import type { Location } from "@/types/inventory";
import {
  Thermometer,
  Snowflake,
  Plus,
  RefreshCw,
  Building,
  AlertTriangle,
  CheckCircle2,
  X,
  Package,
  ArrowRightLeft,
  Trash2,
  Loader2,
  Calendar,
  Eye,
  PlusCircle,
} from "lucide-react";

const FRIDGE_STATUS_CONFIG: Record<
  FridgeStatus,
  { label: string; className: string }
> = {
  OPERATIVO: {
    label: "Operativo",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  MANTENIMIENTO: {
    label: "En Mantenimiento",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  DEFECTUOSO: {
    label: "Falla Térmica / Defectuoso",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
  FUERA_DE_SERVICIO: {
    label: "Fuera de Servicio",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
};

export default function FridgesPage() {
  const router = useRouter();
  const [fridges, setFridges] = useState<LabFridge[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [availableReagents, setAvailableReagents] = useState<
    ReagentBatchOption[]
  >([]);
  const [loading, setLoading] = useState(true);

  // Modal Crear Nevera
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [locationId, setLocationId] = useState<number | "">("");
  const [targetTemp, setTargetTemp] = useState<number | "">(4);
  const [status, setStatus] = useState<FridgeStatus>("OPERATIVO");
  const [description, setDescription] = useState("");
  const [submittingFridge, setSubmittingFridge] = useState(false);

  // Modal Ingresar Lote a Nevera
  const [assignFridgeTarget, setAssignFridgeTarget] =
    useState<LabFridge | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [assigningBatch, setAssigningBatch] = useState(false);

  // Inspección rápida de Contenido (Drawer)
  const [selectedFridge, setSelectedFridge] =
    useState<FridgeContentsResponse | null>(null);
  const [loadingContents, setLoadingContents] = useState(false);

  // Transferencia de Frasco
  const [transferUnit, setTransferUnit] = useState<ReagentInFridge | null>(
    null,
  );
  const [targetFridgeId, setTargetFridgeId] = useState<number | "">("");
  const [transferReason, setTransferReason] = useState("");
  const [transferring, setTransferring] = useState(false);

  const [feedback, setFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fData, lData, rData] = await Promise.all([
        LabFridgeService.getFridges(),
        InventoryClientService.getLocations().catch(() => []),
        LaboratoryClientService.getAvailableReagents().catch(() => []),
      ]);
      setFridges(fData);
      setLocations(lData);
      setAvailableReagents(rData);
      if (lData.length > 0 && locationId === "") {
        setLocationId(Number(lData[0].id));
      }
    } catch {
      // Interceptor
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    let isMounted = true;
    if (!AuthService.isAuthenticated()) {
      router.replace("/login");
      return;
    }
    const init = async () => {
      if (isMounted) await loadData();
    };
    void init();
    return () => {
      isMounted = false;
    };
  }, [router, loadData]);

  const handleOpenFridgeContents = async (fridgeId: number) => {
    setLoadingContents(true);
    setFeedback(null);
    try {
      const contents = await LabFridgeService.getFridgeContents(fridgeId);
      setSelectedFridge(contents);
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "No se pudo cargar el contenido de la nevera.",
      });
    } finally {
      setLoadingContents(false);
    }
  };

  const handleCreateFridge = async (e: FormEvent) => {
    e.preventDefault();
    if (!locationId || !code.trim() || !name.trim()) return;

    setSubmittingFridge(true);
    setFeedback(null);
    try {
      await LabFridgeService.createFridge({
        locationId: Number(locationId),
        code: code.trim().toUpperCase(),
        name: name.trim(),
        targetTempCelsius: targetTemp === "" ? null : Number(targetTemp),
        status,
        description: description.trim() || null,
      });

      setFeedback({
        status: "success",
        message: "Equipo de refrigeración registrado exitosamente.",
      });
      setIsCreateModalOpen(false);
      setCode("");
      setName("");
      setDescription("");
      await loadData();
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message:
          err instanceof Error ? err.message : "Error al registrar el equipo.",
      });
    } finally {
      setSubmittingFridge(false);
    }
  };

  const handleAssignBatchToFridge = async (e: FormEvent) => {
    e.preventDefault();
    if (!assignFridgeTarget || !selectedBatchId) return;

    setAssigningBatch(true);
    setFeedback(null);
    try {
      await LaboratoryClientService.assignBatchToFridge(
        assignFridgeTarget.id,
        selectedBatchId,
      );

      setFeedback({
        status: "success",
        message: `Lote ingresado exitosamente en ${assignFridgeTarget.name}. Frascos unitarios generados.`,
      });
      setAssignFridgeTarget(null);
      setSelectedBatchId("");
      await loadData();
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Error al ingresar el lote a la nevera.",
      });
    } finally {
      setAssigningBatch(false);
    }
  };

  const handleExecuteTransfer = async (e: FormEvent) => {
    e.preventDefault();
    if (!transferUnit || !targetFridgeId) return;

    setTransferring(true);
    try {
      await LabFridgeService.transferUnit(
        transferUnit.id,
        Number(targetFridgeId),
        transferReason.trim() || undefined,
      );

      setTransferUnit(null);
      setTransferReason("");
      setTargetFridgeId("");
      if (selectedFridge) {
        await handleOpenFridgeContents(selectedFridge.id);
      }
      await loadData();
    } catch (err: unknown) {
      alert(
        err instanceof Error ? err.message : "Error al transferir reactivo.",
      );
    } finally {
      setTransferring(false);
    }
  };

  const handleOpenUnit = async (unitId: string | number) => {
    try {
      await LabFridgeService.openUnit(unitId);
      if (selectedFridge) {
        await handleOpenFridgeContents(selectedFridge.id);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al abrir frasco.");
    }
  };

  const handleDiscardUnit = async (unit: ReagentInFridge) => {
    const prodName = unit.product?.name ?? "Insumo";
    const reason = prompt(
      `Indique el motivo del descarte de ${prodName} (${unit.unitCode}):`,
    );
    if (!reason || !reason.trim()) return;

    try {
      await LabFridgeService.discardUnit(unit.id, reason.trim());
      if (selectedFridge) {
        await handleOpenFridgeContents(selectedFridge.id);
      }
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al descartar frasco.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Snowflake className="w-6 h-6 text-sky-600" />
            Cadena de Frío & Equipos de Laboratorio
          </h1>
          <p className="text-xs text-slate-500">
            Monitoreo térmico, cavas y trazabilidad de reactivos termosensibles
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadData()}
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors shadow-2xs cursor-pointer"
            title="Actualizar listado"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsCreateModalOpen(true);
              setFeedback(null);
            }}
            className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Registrar Nevera / Cava
          </button>
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
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Grid de Equipos de Frío */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 py-16 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-sky-600 mb-2" />
            Cargando estado de la cadena de frío...
          </div>
        ) : fridges.length === 0 ? (
          <div className="col-span-3 p-8 bg-white border border-slate-200 rounded-xl text-center space-y-2">
            <Snowflake className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-700 text-sm">
              No hay neveras o cavas registradas
            </h3>
            <p className="text-xs text-slate-500">
              Registre las neveras o congeladores donde se almacenan los
              reactivos de laboratorio.
            </p>
          </div>
        ) : (
          fridges.map((fridge) => {
            const statusConfig = FRIDGE_STATUS_CONFIG[fridge.status] || {
              label: fridge.status,
              className: "bg-slate-100 text-slate-700",
            };
            const temp =
              fridge.targetTempCelsius !== null
                ? Number(fridge.targetTempCelsius)
                : null;
            const isFreezer = temp !== null && temp < 0;

            return (
              <div
                key={fridge.id}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3 flex flex-col justify-between hover:border-sky-300 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                      {fridge.code}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusConfig.className}`}
                    >
                      {statusConfig.label}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {fridge.name}
                    </h3>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      {fridge.location?.name ?? "Laboratorio"}
                    </div>
                  </div>

                  {fridge.description && (
                    <p className="text-xs text-slate-600 line-clamp-2">
                      {fridge.description}
                    </p>
                  )}
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Thermometer
                        className={`w-4 h-4 ${
                          isFreezer ? "text-indigo-600" : "text-sky-600"
                        }`}
                      />
                      <span className="font-mono font-bold text-slate-800 text-sm">
                        {temp !== null ? `${temp}°C` : "N/D"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenFridgeContents(fridge.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-800 cursor-pointer"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>{fridge._count?.labReagentUnits ?? 0} frascos</span>
                    </button>
                  </div>

                  {/* Acciones principales de la Nevera */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setAssignFridgeTarget(fridge);
                        setSelectedBatchId("");
                      }}
                      className="inline-flex items-center justify-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 py-1.5 px-2 rounded-lg transition-colors cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Ingresar Lote
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/laboratory/fridges/${fridge.id}`)
                      }
                      className="inline-flex items-center justify-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 py-1.5 px-2 rounded-lg transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Ver Ficha
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Ingresar Lote de Reactivo a la Nevera */}
      {assignFridgeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
          <form
            onSubmit={handleAssignBatchToFridge}
            className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Snowflake className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-slate-800 text-sm">
                  Ingresar Lote a {assignFridgeTarget.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAssignFridgeTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Seleccione el reactivo disponible. El sistema generará los frascos
              físicos con sus códigos correlativos y los alojará en esta nevera
              (
              {assignFridgeTarget.targetTempCelsius !== null
                ? `${Number(assignFridgeTarget.targetTempCelsius)}°C`
                : "Ambiente"}
              ).
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Reactivo / Lote Disponible *
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">-- Seleccione un lote disponible --</option>
                {availableReagents.map((reagent) => (
                  <option key={reagent.id} value={reagent.id}>
                    {reagent.product.name} (Lote #{reagent.lotNumber}) - Disp:{" "}
                    {reagent.currentQuantity} {reagent.product.unitOfMeasure}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAssignFridgeTarget(null)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={assigningBatch || !selectedBatchId}
                className="px-4 py-2 text-xs bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-lg flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {assigningBatch && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                Ingresar Frascos a Nevera
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Lateral / Inspección de Contenido de la Nevera */}
      {selectedFridge && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-2xs">
          <div className="w-full max-w-2xl bg-white h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Snowflake className="w-5 h-5 text-sky-600" />
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">
                      {selectedFridge.name} ({selectedFridge.code})
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      Temperatura consigna:{" "}
                      <b className="text-slate-800 font-mono">
                        {selectedFridge.targetTempCelsius !== null &&
                        selectedFridge.targetTempCelsius !== undefined
                          ? `${Number(selectedFridge.targetTempCelsius)}°C`
                          : "Ambiente"}
                      </b>
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFridge(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingContents ? (
                <div className="py-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-sky-600 mb-2" />
                  Cargando frascos alojados...
                </div>
              ) : selectedFridge.labReagentUnits.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2 bg-slate-50 rounded-xl">
                  <Package className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="text-xs">
                    Esta nevera no tiene frascos de reactivos asignados en este
                    momento.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                    Frascos y Reactivos Almacenados (
                    {selectedFridge.labReagentUnits.length})
                  </span>

                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    {selectedFridge.labReagentUnits.map(
                      (unit: ReagentInFridge) => {
                        const initialVol = Number(unit.initialVolume);
                        const currentVol = Number(unit.currentVolume);
                        const percent =
                          initialVol > 0
                            ? Math.round((currentVol / initialVol) * 100)
                            : 0;

                        return (
                          <div
                            key={String(unit.id)}
                            className="p-3.5 bg-white hover:bg-slate-50/70 transition-colors space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-bold text-xs text-slate-900 block">
                                  {unit.product?.name ?? "Reactivo"}
                                </span>
                                <span className="font-mono text-[10px] text-slate-400">
                                  Código Frasco: {unit.unitCode} | Lote: #
                                  {unit.batch?.lotNumber ?? "N/D"}
                                </span>
                              </div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  unit.status === "SELLADO"
                                    ? "bg-slate-50 text-slate-700 border-slate-200"
                                    : unit.status === "EN_USO"
                                      ? "bg-sky-50 text-sky-700 border-sky-200"
                                      : "bg-red-50 text-red-700 border-red-200"
                                }`}
                              >
                                {unit.status}
                              </span>
                            </div>

                            {/* Barra de Volumen Disponible */}
                            <div className="space-y-1">
                              <div className="flex justify-between text-[11px] font-mono">
                                <span className="text-slate-500">
                                  Volumen disponible:
                                </span>
                                <span className="font-bold text-slate-800">
                                  {currentVol} / {initialVol}{" "}
                                  {unit.product?.baseUnit?.abbreviation ?? "ml"}{" "}
                                  ({percent}%)
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${
                                    percent > 40
                                      ? "bg-sky-600"
                                      : percent > 15
                                        ? "bg-amber-500"
                                        : "bg-red-500"
                                  }`}
                                  style={{
                                    width: `${Math.min(percent, 100)}%`,
                                  }}
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                              <span className="flex items-center gap-1 font-mono">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                Vence:{" "}
                                {unit.expirationDate
                                  ? new Date(
                                      unit.expirationDate,
                                    ).toLocaleDateString()
                                  : "N/D"}
                              </span>

                              <div className="flex items-center gap-2">
                                {unit.status === "SELLADO" && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenUnit(unit.id)}
                                    className="text-xs text-sky-600 hover:text-sky-800 font-semibold cursor-pointer"
                                  >
                                    Abrir frasco
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTransferUnit(unit);
                                    setTargetFridgeId("");
                                  }}
                                  className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-blue-600 cursor-pointer"
                                  title="Mover a otra nevera"
                                >
                                  <ArrowRightLeft className="w-3 h-3" />
                                  Mover
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDiscardUnit(unit)}
                                  className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-600 cursor-pointer"
                                  title="Descartar frasco"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedFridge(null)}
                className="px-4 py-2 text-xs bg-slate-900 text-white rounded-lg cursor-pointer"
              >
                Cerrar Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Transferir Frasco entre Neveras */}
      {transferUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
          <form
            onSubmit={handleExecuteTransfer}
            className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                <ArrowRightLeft className="w-4 h-4 text-sky-600" />
                Mover Reactivo de Nevera
              </h3>
              <button
                type="button"
                onClick={() => setTransferUnit(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div className="font-bold text-slate-900">
                {transferUnit.product?.name ?? "Reactivo"}
              </div>
              <div className="text-slate-500 font-mono text-[11px]">
                Código: {transferUnit.unitCode} | Vol:{" "}
                {transferUnit.currentVolume}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Nevera o Cava Destino *
              </label>
              <select
                value={targetFridgeId}
                onChange={(e) => setTargetFridgeId(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-sky-500"
                required
              >
                <option value="">-- Seleccionar equipo destino --</option>
                {fridges
                  .filter((f) => f.id !== selectedFridge?.id)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.code}) -{" "}
                      {f.targetTempCelsius !== null
                        ? `${Number(f.targetTempCelsius)}°C`
                        : "Ambiente"}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Motivo del Traslado
              </label>
              <input
                type="text"
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="Ej. Reorganización de anticuerpos monoclonales"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTransferUnit(null)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={transferring}
                className="px-4 py-2 text-xs bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {transferring && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                Confirmar Traslado
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Registrar Nueva Nevera */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
          <form
            onSubmit={handleCreateFridge}
            className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Snowflake className="w-5 h-5 text-sky-600" />
                Registrar Equipo de Refrigeración
              </h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Código Interno *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. NEV-01, CAVA-A"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full font-mono uppercase bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre del Equipo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Nevera Principal Inmunología"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Ubicación Física *
                </label>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-sky-500"
                  required
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Temperatura Consigna (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ej. 4, -20, -80"
                  value={targetTemp}
                  onChange={(e) =>
                    setTargetTemp(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  className="w-full font-mono bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Estado Operativo
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as FridgeStatus)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="OPERATIVO">Operativo</option>
                <option value="MANTENIMIENTO">En Mantenimiento</option>
                <option value="DEFECTUOSO">Defectuoso / Falla Térmica</option>
                <option value="FUERA_DE_SERVICIO">Fuera de Servicio</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Descripción / Notas Técnicas
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Marca, modelo, gas refrigerante, observaciones..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submittingFridge}
                className="px-4 py-2 text-xs bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-lg flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {submittingFridge && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                Registrar Equipo
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
