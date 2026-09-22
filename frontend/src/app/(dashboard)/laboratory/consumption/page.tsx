"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { LaboratoryClientService } from "@/services/laboratory.service";
import { AuthService } from "@/services/auth.service";
import type {
  LabReagentUnitItem,
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
  Search,
  Snowflake,
  Filter,
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
  const [units, setUnits] = useState<LabReagentUnitItem[]>([]);
  const [history, setHistory] = useState<ReagentConsumptionRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [unitSearch, setUnitSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [fridges, setFridges] = useState<
    Array<{
      id: number;
      name: string;
      code: string;
      targetTempCelsius: number | string | null;
    }>
  >([]);
  const [filterFridgeId, setFilterFridgeId] = useState<string>("");

  // Estado del formulario
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [selectedUnit, setSelectedUnit] = useState<LabReagentUnitItem | null>(
    null,
  );
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
      const [unitsData, historyData, fridgesData] = await Promise.all([
        LaboratoryClientService.getAvailableUnits(
          unitSearch,
          filterFridgeId ? Number(filterFridgeId) : undefined,
        ).catch(() => []),
        LaboratoryClientService.getRecentConsumptions().catch(() => []),
        LaboratoryClientService.getFridges().catch(() => []),
      ]);
      setUnits(unitsData);
      setHistory(historyData);
      setFridges(fridgesData);
    } catch {
      // Manejado por interceptor
    } finally {
      setLoadingData(false);
    }
  }, [unitSearch, filterFridgeId]);

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

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (
      !selectedUnitId ||
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

    if (selectedUnit && Number(quantity) > Number(selectedUnit.currentVolume)) {
      setFeedback({
        status: "error",
        message: `La cantidad solicitada supera el volumen disponible en este frasco (${selectedUnit.currentVolume} ${selectedUnit.product.baseUnit?.abbreviation ?? "ml"}).`,
      });
      return;
    }

    // Captura exacta del código del frasco antes de limpiar
    const unitCodeToDisplay = selectedUnit?.unitCode || "desconocido";

    setSubmitting(true);
    try {
      const reasonDetail = `${diagnosticProtocol.trim()} | ${departmentSection}${
        notes.trim() ? ` | ${notes.trim()}` : ""
      }`;

      await LaboratoryClientService.consumeUnit(
        selectedUnitId,
        Number(quantity),
        reasonDetail,
      );

      setFeedback({
        status: "success",
        message: `Consumo registrado exitosamente. Se descontó del frasco #${unitCodeToDisplay} en la nevera.`,
      });

      // Limpiar campos para el siguiente descargo
      setSelectedUnitId("");
      setSelectedUnit(null);
      setUnitSearch("");
      setQuantity("");
      setNotes("");
      await loadData();
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Error al registrar el consumo del reactivo.",
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
          Descargo volumétrico directo de frascos alojados en cadena de frío
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
              Selección de Frasco y Ensayo
            </h2>

            {/* Filtro rápido de Nevera */}
            <div>
              <label className="flex items-center gap-1 text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                Filtrar por Nevera (Opcional)
              </label>
              <select
                value={filterFridgeId}
                onChange={(e) => {
                  setFilterFridgeId(e.target.value);
                  setSelectedUnitId("");
                  setSelectedUnit(null);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800"
              >
                <option value="">Todas las neveras / cavas</option>
                {fridges.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Buscador de Frascos */}
            <div ref={dropdownRef}>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Frasco de Reactivo en Frío *
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  value={unitSearch}
                  onFocus={() => setIsDropdownOpen(true)}
                  onChange={(e) => {
                    setUnitSearch(e.target.value);
                    setSelectedUnitId("");
                    setSelectedUnit(null);
                    setIsDropdownOpen(true);
                  }}
                  placeholder="Buscar por reactivo, código de frasco (#LOT-F01) o lote..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800"
                  required={!selectedUnitId}
                />

                {isDropdownOpen && !selectedUnitId && (
                  <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg">
                    {loadingData ? (
                      <div className="p-3 text-xs text-slate-500 flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                        Buscando frascos en nevera...
                      </div>
                    ) : units.length === 0 ? (
                      <div className="p-3 text-xs text-slate-500">
                        No hay frascos disponibles en las neveras.
                      </div>
                    ) : (
                      units.map((unit) => (
                        <button
                          key={String(unit.id)}
                          type="button"
                          onClick={() => {
                            setSelectedUnitId(String(unit.id));
                            setSelectedUnit(unit);
                            setUnitSearch(
                              `${unit.product.name} · ${unit.unitCode}`,
                            );
                            setIsDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2.5 border-b border-slate-100 hover:bg-purple-50 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <strong className="text-xs text-slate-800 truncate">
                              {unit.product.name}
                            </strong>
                            <span className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                              {unit.unitCode}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
                            <span>Lote: #{unit.batch?.lotNumber ?? "N/D"}</span>
                            <span className="font-semibold text-emerald-700">
                              Volumen: {Number(unit.currentVolume)} /{" "}
                              {Number(unit.initialVolume)}{" "}
                              {unit.product.baseUnit?.abbreviation ?? "ml"}
                            </span>
                            <span
                              className={`font-bold px-1.5 py-0.5 rounded ${
                                unit.status === "EN_USO"
                                  ? "text-sky-700 bg-sky-50"
                                  : "text-slate-600 bg-slate-100"
                              }`}
                            >
                              {unit.status}
                            </span>
                          </div>
                          <div className="mt-1 text-[10px] font-medium text-slate-500 flex items-center gap-1">
                            <Snowflake className="w-3 h-3 text-sky-600" />
                            Nevera: {unit.fridge?.name ?? "Laboratorio"}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Ficha rápida del frasco elegido */}
              {selectedUnit && (
                <div className="mt-2.5 p-3 bg-purple-50/60 border border-purple-200 rounded-lg flex items-center justify-between text-xs text-purple-900">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-purple-600" />
                    <span>
                      Código: <b>{selectedUnit.unitCode}</b> (
                      {selectedUnit.status})
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px]">
                      Nevera: {selectedUnit.fridge?.name ?? "General"}
                    </span>
                    <span className="font-bold font-mono">
                      Saldo: {Number(selectedUnit.currentVolume)}{" "}
                      {selectedUnit.product.baseUnit?.abbreviation ?? "ml"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Protocolo y Cantidad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Protocolo / Ensayo *
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
                  Cantidad / Volumen a Deducir *
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
                    placeholder="Ej: 0.5"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-3 pr-12 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800"
                    required
                  />
                  <span className="absolute inset-y-0 right-3 flex items-center text-[10px] font-semibold text-slate-400">
                    {selectedUnit?.product.baseUnit?.abbreviation ?? "ml"}
                  </span>
                </div>
              </div>
            </div>

            {/* Sección o Unidad Solicitante */}
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

            {/* Observaciones */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Observaciones / Muestras procesadas (Opcional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Identificador de corrida analítica o incidencias de pipeteo..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? "Procesando descargo..." : "Deducir de Nevera"}
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
                      <span className="text-slate-400 font-mono">
                        Lote #{record.batch.lotNumber}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/60">
                      <span>
                        {record.analyst.fullName || record.analyst.username}
                      </span>
                      <span className="flex items-center gap-1 font-mono">
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
