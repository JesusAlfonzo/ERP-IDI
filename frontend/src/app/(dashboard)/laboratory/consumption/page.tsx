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
  ShieldAlert,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const [currentUser] = useState(() => AuthService.getCurrentUser());
  const userRoles = currentUser?.roles || [];
  const isLabStaff =
    userRoles.includes("ADMINISTRADOR") ||
    userRoles.includes("LABORATORIO");

  const [units, setUnits] = useState<LabReagentUnitItem[]>([]);
  const [history, setHistory] = useState<ReagentConsumptionRecord[]>([]);
  const [loadingData, setLoadingData] = useState(() => isLabStaff);
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
    if (!isLabStaff) {
      return;
    }
    const init = async () => {
      if (isMounted) await loadData();
    };
    void init();
    return () => {
      isMounted = false;
    };
  }, [router, isLabStaff, loadData]);

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
    if (!isLabStaff) return;
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
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <FlaskConical className="w-6 h-6 text-primary" />
          Registro de Consumo en Laboratorio
        </h1>
        <p className="text-xs text-muted-foreground">
          Descargo volumétrico directo de frascos alojados en cadena de frío
        </p>
      </div>

      {!isLabStaff ? (
        <Card className="border-amber-200 p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">
              Acceso Restringido a Consumo de Reactivos
            </h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              El registro de consumos volumétricos y la apertura de reactivos en sala analítica son competencia exclusiva del personal de <strong>Laboratorio Clínico</strong> o <strong>Administración</strong>.
            </p>
          </div>
          <div className="pt-2">
            <Button
              type="button"
              onClick={() => router.push("/dashboard")}
            >
              Volver al Dashboard
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {feedback && (
            <Alert
              variant={feedback.status === "success" ? "default" : "destructive"}
              className={feedback.status === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : ""}
            >
              {feedback.status === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <AlertDescription>{feedback.message}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Formulario de Registro */}
            <div className="lg:col-span-7">
              <Card>
                <CardHeader className="pb-3 border-b border-border">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TestTube className="w-4 h-4 text-primary" />
                    Selección de Frasco y Ensayo
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Filtro rápido de Nevera */}
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1 text-xs font-semibold text-foreground uppercase tracking-wider">
                        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                        Filtrar por Nevera (Opcional)
                      </Label>
                      <select
                        value={filterFridgeId}
                        onChange={(e) => {
                          setFilterFridgeId(e.target.value);
                          setSelectedUnitId("");
                          setSelectedUnit(null);
                        }}
                        className="w-full bg-background border border-input rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
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
                    <div ref={dropdownRef} className="space-y-1.5">
                      <Label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                        Frasco de Reactivo en Frío *
                      </Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                        <Input
                          value={unitSearch}
                          onFocus={() => setIsDropdownOpen(true)}
                          onChange={(e) => {
                            setUnitSearch(e.target.value);
                            setSelectedUnitId("");
                            setSelectedUnit(null);
                            setIsDropdownOpen(true);
                          }}
                          placeholder="Buscar por reactivo, código de frasco (#LOT-F01) o lote..."
                          className="pl-9 text-xs"
                          required={!selectedUnitId}
                        />

                        {isDropdownOpen && !selectedUnitId && (
                          <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-popover border border-border rounded-md shadow-lg">
                            {loadingData ? (
                              <div className="p-3 text-xs text-muted-foreground flex items-center gap-2">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                                Buscando frascos en nevera...
                              </div>
                            ) : units.length === 0 ? (
                              <div className="p-3 text-xs text-muted-foreground">
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
                                  className="w-full text-left px-3 py-2.5 border-b border-border hover:bg-accent transition-colors cursor-pointer"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <strong className="text-xs text-foreground truncate">
                                      {unit.product.name}
                                    </strong>
                                    <Badge variant="purple" className="font-mono text-[10px]">
                                      {unit.unitCode}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
                                    <span>Lote: #{unit.batch?.lotNumber ?? "N/D"}</span>
                                    <span className="font-semibold text-emerald-700">
                                      Volumen: {Number(unit.currentVolume)} /{" "}
                                      {Number(unit.initialVolume)}{" "}
                                      {unit.product.baseUnit?.abbreviation ?? "ml"}
                                    </span>
                                    <Badge
                                      variant={unit.status === "EN_USO" ? "info" : "secondary"}
                                      className="text-[9px]"
                                    >
                                      {unit.status}
                                    </Badge>
                                  </div>
                                  <div className="mt-1 text-[10px] font-medium text-muted-foreground flex items-center gap-1">
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
                        <div className="mt-2.5 p-3 bg-muted/60 border border-border rounded-lg flex items-center justify-between text-xs text-foreground">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-primary" />
                            <span>
                              Código: <b>{selectedUnit.unitCode}</b> (
                              {selectedUnit.status})
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-[11px] text-muted-foreground">
                              Nevera: {selectedUnit.fridge?.name ?? "General"}
                            </span>
                            <span className="font-bold font-mono text-primary">
                              Saldo: {Number(selectedUnit.currentVolume)}{" "}
                              {selectedUnit.product.baseUnit?.abbreviation ?? "ml"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Protocolo y Cantidad */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                          Protocolo / Ensayo *
                        </Label>
                        <Input
                          type="text"
                          list="protocol-suggestions"
                          value={diagnosticProtocol}
                          onChange={(e) => setDiagnosticProtocol(e.target.value)}
                          placeholder="Ej: ELISA Diagnóstica"
                          required
                        />
                        <datalist id="protocol-suggestions">
                          {COMMON_PROTOCOLS.map((p) => (
                            <option key={p} value={p} />
                          ))}
                        </datalist>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                          Cantidad / Volumen a Deducir *
                        </Label>
                        <div className="relative">
                          <Input
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
                            className="pr-12"
                            required
                          />
                          <span className="absolute inset-y-0 right-3 flex items-center text-[10px] font-semibold text-muted-foreground">
                            {selectedUnit?.product.baseUnit?.abbreviation ?? "ml"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sección o Unidad Solicitante */}
                    <div className="space-y-1.5">
                      <Label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                        Sección / Unidad Solicitante
                      </Label>
                      <select
                        value={departmentSection}
                        onChange={(e) => setDepartmentSection(e.target.value)}
                        className="w-full bg-background border border-input rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                      >
                        {SECTIONS.map((sec) => (
                          <option key={sec} value={sec}>
                            {sec}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Observaciones */}
                    <div className="space-y-1.5">
                      <Label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                        Observaciones / Muestras procesadas (Opcional)
                      </Label>
                      <Textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Identificador de corrida analítica o incidencias de pipeteo..."
                        className="resize-none"
                      />
                    </div>

                    <div className="pt-2 border-t border-border flex justify-end">
                      <Button
                        type="submit"
                        disabled={submitting}
                        className="gap-2"
                      >
                        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                        {submitting ? "Procesando descargo..." : "Deducir de Nevera"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Historial Reciente de Consumo */}
            <div className="lg:col-span-5 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-4 h-4 text-muted-foreground" />
                    Últimos Consumos Registrados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingData ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                      Cargando historial...
                    </div>
                  ) : history.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6 italic">
                      No hay consumos recientes anotados en laboratorio.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {history.map((record) => (
                        <div
                          key={record.id}
                          className="p-3 bg-muted/40 border border-border rounded-lg text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">
                              {record.batch.product.name}
                            </span>
                            <span className="font-mono text-primary font-bold">
                              -{record.quantity} {record.batch.product.unitOfMeasure}
                            </span>
                          </div>

                          <div className="text-muted-foreground flex items-center justify-between text-[11px]">
                            <span>{record.diagnosticProtocol}</span>
                            <span className="font-mono text-[10px]">
                              Lote #{record.batch.lotNumber}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border">
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
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
