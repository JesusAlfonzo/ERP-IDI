"use client";

import { useState, useEffect, useCallback, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LabFridgeService } from "@/services/lab-fridge.service";
import { LaboratoryClientService } from "@/services/laboratory.service";
import { InventoryClientService } from "@/services/inventory.service";
import { AuthService } from "@/services/auth.service";
import {
  SearchableSelect,
  type SearchableOption,
} from "@/components/common/SearchableSelect";
import type {
  LabFridge,
  FridgeContentsResponse,
  FridgeStatus,
  ReagentInFridge,
  ReagentBatchOption,
} from "@/types/laboratory";
import type { Location, Category } from "@/types/inventory";
import {
  Thermometer,
  Snowflake,
  Plus,
  RefreshCw,
  Building,
  AlertTriangle,
  AlertCircle,
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

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

const FRIDGE_STATUS_CONFIG: Record<
  FridgeStatus,
  {
    label: string;
    variant:
      | "default"
      | "secondary"
      | "destructive"
      | "outline"
      | "success"
      | "warning"
      | "info"
      | "purple";
  }
> = {
  OPERATIVO: { label: "Operativo", variant: "success" },
  MANTENIMIENTO: { label: "En Mantenimiento", variant: "warning" },
  DEFECTUOSO: { label: "Falla Térmica / Defectuoso", variant: "destructive" },
  FUERA_DE_SERVICIO: { label: "Fuera de Servicio", variant: "secondary" },
};

export default function FridgesPage() {
  const router = useRouter();
  const [currentUser] = useState(() => AuthService.getCurrentUser());
  const userRoles = currentUser?.roles || [];
  const isLabStaff =
    userRoles.includes("ADMINISTRADOR") ||
    userRoles.includes("LABORATORIO");

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
  const [reagentCategoryFilter, setReagentCategoryFilter] =
    useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
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
      const [fData, lData, rData, cData] = await Promise.all([
        LabFridgeService.getFridges(),
        InventoryClientService.getLocations().catch(() => []),
        LaboratoryClientService.getAvailableReagents().catch(() => []),
        InventoryClientService.getCategories().catch(() => []),
      ]);
      setFridges(fData);
      setLocations(lData);
      setAvailableReagents(rData);
      setCategories(cData);
      if (lData.length > 0 && locationId === "") {
        setLocationId(Number(lData[0].id));
      }
    } catch {
      // Interceptor
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  // Categorías presentes en los reactivos disponibles
  const availableReagentCategories = useMemo(() => {
    const catMap = new Map<string, { id: string | number; name: string }>();

    for (const r of availableReagents) {
      const cid = r.product?.categoryId ?? r.product?.category?.id;
      const cname = r.product?.category?.name;
      if (cid !== undefined && cid !== null) {
        const key = String(cid);
        if (!catMap.has(key)) {
          const matchingCat = categories.find((c) => String(c.id) === key);
          catMap.set(key, {
            id: cid,
            name: matchingCat?.name || cname || `Categoría #${cid}`,
          });
        }
      }
    }

    return Array.from(catMap.values());
  }, [availableReagents, categories]);

  // Opciones formateadas para el combobox de reactivos con estándar de dos líneas
  const reagentOptions = useMemo<SearchableOption<ReagentBatchOption>[]>(() => {
    return availableReagents.map((r) => {
      const unit = r.product?.unitOfMeasure || "UND";
      const exp = r.expirationDate
        ? new Date(r.expirationDate).toLocaleDateString()
        : null;
      const subParts: string[] = [];
      if (r.lotNumber) subParts.push(`Lote #${r.lotNumber}`);
      if (r.product?.sku) subParts.push(r.product.sku);
      subParts.push(`Disp: ${r.currentQuantity} ${unit}`);
      if (exp) subParts.push(`Vence: ${exp}`);

      const categoryVal = r.product?.categoryId ?? r.product?.category?.id;

      return {
        value: String(r.id),
        label: r.product?.name || "Reactivo",
        sublabel: subParts.join(" · "),
        searchTerms: [
          r.product?.name || "",
          r.product?.sku || "",
          r.lotNumber || "",
          r.product?.barcode || "",
          r.product?.description || "",
        ].filter(Boolean),
        category: categoryVal !== undefined ? String(categoryVal) : undefined,
        data: r,
      };
    });
  }, [availableReagents]);

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
    if (!isLabStaff || !locationId || !code.trim() || !name.trim()) return;

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
    if (!isLabStaff || !assignFridgeTarget || !selectedBatchId) return;

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
      setReagentCategoryFilter("");
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
    if (!isLabStaff || !transferUnit || !targetFridgeId) return;

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
    if (!isLabStaff) return;
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
    if (!isLabStaff) return;
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Snowflake className="w-6 h-6 text-primary" />
            Cadena de Frío & Equipos de Laboratorio
          </h1>
          <p className="text-xs text-muted-foreground">
            Monitoreo térmico, cavas y trazabilidad de reactivos termosensibles
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => void loadData()}
            title="Actualizar listado"
          >
            <RefreshCw
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
          </Button>
          {isLabStaff && (
            <Button
              type="button"
              onClick={() => {
                setIsCreateModalOpen(true);
                setFeedback(null);
              }}
              className="gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Registrar Nevera / Cava
            </Button>
          )}
        </div>
      </div>

      {!isLabStaff && (
        <Alert>
          <AlertCircle className="w-4 h-4 text-muted-foreground" />
          <AlertDescription>
            Modo de consulta (solo lectura): El registro de neveras, ingreso de reactivos, apertura de frascos y traslados son competencia exclusiva del personal de <strong>Laboratorio Clínico</strong> o <strong>Administración</strong>.
          </AlertDescription>
        </Alert>
      )}

      {feedback && (
        <Alert
          variant={feedback.status === "success" ? "default" : "destructive"}
          className={feedback.status === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : ""}
        >
          {feedback.status === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}

      {/* Grid de Equipos de Frío */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 py-16 text-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
            Cargando estado de la cadena de frío...
          </div>
        ) : fridges.length === 0 ? (
          <Card className="col-span-3 p-8 text-center space-y-2">
            <Snowflake className="w-8 h-8 text-muted-foreground mx-auto" />
            <h3 className="font-bold text-foreground text-sm">
              No hay neveras o cavas registradas
            </h3>
            <p className="text-xs text-muted-foreground">
              Registre las neveras o congeladores donde se almacenan los
              reactivos de laboratorio.
            </p>
          </Card>
        ) : (
          fridges.map((fridge) => {
            const statusConfig = FRIDGE_STATUS_CONFIG[fridge.status] || {
              label: fridge.status,
              variant: "secondary" as const,
            };
            const temp =
              fridge.targetTempCelsius !== null
                ? Number(fridge.targetTempCelsius)
                : null;
            const isFreezer = temp !== null && temp < 0;

            return (
              <Card
                key={fridge.id}
                className="p-4 space-y-3 flex flex-col justify-between hover:border-primary/50 transition-colors"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      {fridge.code}
                    </span>
                    <Badge variant={statusConfig.variant}>
                      {statusConfig.label}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="font-bold text-foreground text-sm">
                      {fridge.name}
                    </h3>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Building className="w-3.5 h-3.5 text-muted-foreground" />
                      {fridge.location?.name ?? "Laboratorio"}
                    </div>
                  </div>

                  {fridge.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {fridge.description}
                    </p>
                  )}
                </div>

                <div className="space-y-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Thermometer
                        className={`w-4 h-4 ${
                          isFreezer ? "text-indigo-600" : "text-sky-600"
                        }`}
                      />
                      <span className="font-mono font-bold text-foreground text-sm">
                        {temp !== null ? `${temp}°C` : "N/D"}
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenFridgeContents(fridge.id)}
                      className="h-7 text-xs font-semibold gap-1 text-primary"
                    >
                      <Package className="w-3.5 h-3.5" />
                      <span>{fridge._count?.labReagentUnits ?? 0} frascos</span>
                    </Button>
                  </div>

                  {/* Acciones principales de la Nevera */}
                  <div
                    className={`grid gap-2 pt-1 border-t border-border ${
                      isLabStaff ? "grid-cols-2" : "grid-cols-1"
                    }`}
                  >
                    {isLabStaff && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAssignFridgeTarget(fridge);
                          setSelectedBatchId("");
                          setReagentCategoryFilter("");
                        }}
                        className="h-7 text-[11px] font-semibold gap-1"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Ingresar Lote
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        router.push(`/laboratory/fridges/${fridge.id}`)
                      }
                      className="h-7 text-[11px] font-semibold gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Ver Ficha
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Modal Ingresar Lote de Reactivo a la Nevera */}
      <Dialog
        open={Boolean(assignFridgeTarget && isLabStaff)}
        onOpenChange={(open) => {
          if (!open) {
            setAssignFridgeTarget(null);
            setSelectedBatchId("");
            setReagentCategoryFilter("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Snowflake className="w-5 h-5 text-primary" />
              <DialogTitle className="text-sm font-bold text-foreground">
                Ingresar Lote a {assignFridgeTarget?.name}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Seleccione el reactivo disponible. El sistema generará los frascos
              físicos con sus códigos correlativos y los alojará en esta nevera
              (
              {assignFridgeTarget?.targetTempCelsius !== null && assignFridgeTarget?.targetTempCelsius !== undefined
                ? `${Number(assignFridgeTarget.targetTempCelsius)}°C`
                : "Ambiente"}
              ).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignBatchToFridge} className="space-y-4">
            {/* Filtro por Categoría */}
            {availableReagentCategories.length > 0 && (
              <div className="space-y-1.5">
                <Label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  Filtrar por Categoría
                </Label>
                <select
                  value={reagentCategoryFilter}
                  onChange={(e) => setReagentCategoryFilter(e.target.value)}
                  className="w-full bg-background border border-input rounded-md p-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Todas las categorías</option>
                  {availableReagentCategories.map((cat) => (
                    <option key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                Reactivo / Lote Disponible *
              </Label>
              <SearchableSelect
                options={reagentOptions}
                value={selectedBatchId}
                onChange={(val) => setSelectedBatchId(String(val))}
                categoryFilter={reagentCategoryFilter}
                placeholder="Buscar reactivo por nombre, SKU o lote..."
                emptyMessage="No hay lotes disponibles para el filtro actual."
                itemTypeLabel="lote(s)"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAssignFridgeTarget(null);
                  setSelectedBatchId("");
                  setReagentCategoryFilter("");
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={assigningBatch || !selectedBatchId}
                className="gap-1.5"
              >
                {assigningBatch && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                Ingresar Frascos a Nevera
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal / Inspección de Contenido de la Nevera */}
      <Dialog
        open={Boolean(selectedFridge)}
        onOpenChange={(open) => {
          if (!open) setSelectedFridge(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Snowflake className="w-5 h-5 text-primary" />
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {selectedFridge?.name} ({selectedFridge?.code})
                </DialogTitle>
                <DialogDescription className="text-[11px] text-muted-foreground">
                  Temperatura consigna:{" "}
                  <b className="text-foreground font-mono">
                    {selectedFridge?.targetTempCelsius !== null &&
                    selectedFridge?.targetTempCelsius !== undefined
                      ? `${Number(selectedFridge.targetTempCelsius)}°C`
                      : "Ambiente"}
                  </b>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {loadingContents ? (
              <div className="py-12 text-center text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                Cargando frascos alojados...
              </div>
            ) : !selectedFridge || selectedFridge.labReagentUnits.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground space-y-2 bg-muted/40 rounded-xl">
                <Package className="w-8 h-8 mx-auto text-muted-foreground/60" />
                <p className="text-xs">
                  Esta nevera no tiene frascos de reactivos asignados en este momento.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <span className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                  Frascos y Reactivos Almacenados ({selectedFridge.labReagentUnits.length})
                </span>

                <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                  {selectedFridge.labReagentUnits.map((unit: ReagentInFridge) => {
                    const initialVol = Number(unit.initialVolume);
                    const currentVol = Number(unit.currentVolume);
                    const percent =
                      initialVol > 0
                        ? Math.round((currentVol / initialVol) * 100)
                        : 0;

                    return (
                      <div
                        key={String(unit.id)}
                        className="p-3.5 bg-card hover:bg-muted/50 transition-colors space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-bold text-xs text-foreground block">
                              {unit.product?.name ?? "Reactivo"}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              Código Frasco: {unit.unitCode} | Lote: #{unit.batch?.lotNumber ?? "N/D"}
                            </span>
                          </div>
                          <Badge
                            variant={
                              unit.status === "SELLADO"
                                ? "secondary"
                                : unit.status === "EN_USO"
                                  ? "info"
                                  : "destructive"
                            }
                            className="text-[10px]"
                          >
                            {unit.status}
                          </Badge>
                        </div>

                        {/* Barra de Volumen Disponible */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-mono">
                            <span className="text-muted-foreground">
                              Volumen disponible:
                            </span>
                            <span className="font-bold text-foreground">
                              {currentVol} / {initialVol}{" "}
                              {unit.product?.baseUnit?.abbreviation ?? "ml"}{" "}
                              ({percent}%)
                            </span>
                          </div>
                          <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                percent > 40
                                  ? "bg-primary"
                                  : percent > 15
                                    ? "bg-amber-500"
                                    : "bg-destructive"
                              }`}
                              style={{
                                width: `${Math.min(percent, 100)}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            Vence:{" "}
                            {unit.expirationDate
                              ? new Date(unit.expirationDate).toLocaleDateString()
                              : "N/D"}
                          </span>

                          <div className="flex items-center gap-2">
                            {isLabStaff ? (
                              <>
                                {unit.status === "SELLADO" && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleOpenUnit(unit.id)}
                                    className="h-6 text-xs text-primary font-semibold"
                                  >
                                    Abrir frasco
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setTransferUnit(unit);
                                    setTargetFridgeId("");
                                  }}
                                  className="h-6 text-xs gap-1"
                                  title="Mover a otra nevera"
                                >
                                  <ArrowRightLeft className="w-3 h-3" />
                                  Mover
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDiscardUnit(unit)}
                                  className="h-6 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  title="Descartar frasco"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </>
                            ) : (
                              <span className="text-[10px] text-muted-foreground italic">
                                Solo lectura
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSelectedFridge(null)}
            >
              Cerrar Panel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Transferir Frasco entre Neveras */}
      <Dialog
        open={Boolean(transferUnit && isLabStaff)}
        onOpenChange={(open) => {
          if (!open) setTransferUnit(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <ArrowRightLeft className="w-4 h-4 text-primary" />
              Mover Reactivo de Nevera
            </DialogTitle>
          </DialogHeader>

          {transferUnit && (
            <form onSubmit={handleExecuteTransfer} className="space-y-4">
              <div className="p-3 bg-muted/50 rounded-xl text-xs space-y-1">
                <div className="font-bold text-foreground">
                  {transferUnit.product?.name ?? "Reactivo"}
                </div>
                <div className="text-muted-foreground font-mono text-[11px]">
                  Código: {transferUnit.unitCode} | Vol: {transferUnit.currentVolume}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  Nevera o Cava Destino *
                </Label>
                <select
                  value={targetFridgeId}
                  onChange={(e) => setTargetFridgeId(Number(e.target.value))}
                  className="w-full bg-background border border-input rounded-md p-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
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

              <div className="space-y-1.5">
                <Label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  Motivo del Traslado
                </Label>
                <Input
                  type="text"
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="Ej. Reorganización de anticuerpos monoclonales"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTransferUnit(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={transferring}
                  className="gap-1.5"
                >
                  {transferring && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Confirmar Traslado
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Registrar Nueva Nevera */}
      <Dialog
        open={Boolean(isCreateModalOpen && isLabStaff)}
        onOpenChange={(open) => {
          if (!open) setIsCreateModalOpen(false);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Snowflake className="w-5 h-5 text-primary" />
              <DialogTitle className="text-base font-bold text-foreground">
                Registrar Equipo de Refrigeración
              </DialogTitle>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateFridge} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  Código Interno *
                </Label>
                <Input
                  type="text"
                  required
                  placeholder="Ej. NEV-01, CAVA-A"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="font-mono uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  Nombre del Equipo *
                </Label>
                <Input
                  type="text"
                  required
                  placeholder="Ej. Nevera Principal Inmunología"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  Ubicación Física *
                </Label>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(Number(e.target.value))}
                  className="w-full bg-background border border-input rounded-md p-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                  Temperatura Consigna (°C)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Ej. 4, -20, -80"
                  value={targetTemp}
                  onChange={(e) =>
                    setTargetTemp(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                Estado Operativo
              </Label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as FridgeStatus)}
                className="w-full bg-background border border-input rounded-md p-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="OPERATIVO">Operativo</option>
                <option value="MANTENIMIENTO">En Mantenimiento</option>
                <option value="DEFECTUOSO">Defectuoso / Falla Térmica</option>
                <option value="FUERA_DE_SERVICIO">Fuera de Servicio</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="block text-xs font-semibold text-foreground uppercase tracking-wider">
                Descripción / Notas Técnicas
              </Label>
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Marca, modelo, gas refrigerante, observaciones..."
                className="resize-none"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submittingFridge}
                className="gap-1.5"
              >
                {submittingFridge && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                Registrar Equipo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
