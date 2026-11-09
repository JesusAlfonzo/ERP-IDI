"use client";

import { useState, useEffect, useCallback, useMemo, type FormEvent } from "react";
import { LabWorkflowService } from "@/services/lab-workflow.service";
import { FridgeAuditService } from "@/services/fridge-audit.service";
import { InventoryClientService } from "@/services/inventory.service";
import { AuthService } from "@/services/auth.service";
import type {
  LabFridge,
  FridgeContentsResponse,
  FridgeStatus,
  ReagentInFridge,
} from "@/types/laboratory";
import type { Location } from "@/types/inventory";
import type { FridgePhysicalAudit } from "@/types/lab-workflow";
import { toast } from "@/utils/toast";
import {
  UniversalPdfDownloadButton,
  LabFridgeAuditPdfDocument,
} from "@/components/pdf";
import {
  Thermometer,
  Snowflake,
  Plus,
  RefreshCw,
  Building,
  AlertTriangle,
  Package,
  ArrowRightLeft,
  Trash2,
  Calendar,
  Eye,
  SlidersHorizontal,
  CheckCheck,
  Search,
  ClipboardList,
  FlaskConical,
  FileCheck,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const FRIDGE_STATUS_CONFIG: Record<
  FridgeStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    colorClass: string;
  }
> = {
  OPERATIVO: {
    label: "Operativo",
    variant: "outline",
    colorClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
  },
  MANTENIMIENTO: {
    label: "En Mantenimiento",
    variant: "outline",
    colorClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
  },
  DEFECTUOSO: {
    label: "Falla Térmica",
    variant: "destructive",
    colorClass: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300",
  },
  FUERA_DE_SERVICIO: {
    label: "Fuera de Servicio",
    variant: "secondary",
    colorClass: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
  },
};

export default function LabFridgesPage() {
  const [currentUser] = useState(() => AuthService.getCurrentUser());
  const userRoles = currentUser?.roles || [];
  const isSupervisor =
    userRoles.includes("ADMINISTRADOR") ||
    userRoles.includes("COORDINADOR_LABORATORIO") ||
    userRoles.includes("COORDINADOR");
  const isLabStaff = isSupervisor || userRoles.includes("BIOANALISTA") || userRoles.includes("LABORATORIO");

  const [activeTab, setActiveTab] = useState<string>("fridges");
  const [fridges, setFridges] = useState<LabFridge[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  // Nevera seleccionada y sus contenidos
  const [selectedFridge, setSelectedFridge] = useState<FridgeContentsResponse | null>(null);
  const [loadingContents, setLoadingContents] = useState(false);
  const [fridgeSearch, setFridgeSearch] = useState("");
  const [fridgeStatusFilter, setFridgeStatusFilter] = useState<string>("ALL");

  // Modal: Crear Nevera
  const [isCreateFridgeOpen, setIsCreateFridgeOpen] = useState(false);
  const [createFridgeLoading, setCreateFridgeLoading] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    code: "",
    name: "",
    locationId: "",
    targetTempCelsius: "4",
    description: "",
  });

  // Modal: Transferir Frasco
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [selectedUnitForTransfer, setSelectedUnitForTransfer] = useState<ReagentInFridge | null>(null);
  const [targetFridgeId, setTargetFridgeId] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [transferring, setTransferring] = useState(false);

  // Arqueos Físicos (Pestaña 2)
  const [audits, setAudits] = useState<FridgePhysicalAudit[]>([]);
  const [loadingAudits, setLoadingAudits] = useState(false);
  const [selectedAuditForDetail, setSelectedAuditForDetail] = useState<FridgePhysicalAudit | null>(null);
  const [isDetailAuditOpen, setIsDetailAuditOpen] = useState(false);
  const [reconcilingId, setReconcilingId] = useState<number | null>(null);

  // Modal: Iniciar Nuevo Arqueo
  const [isNewAuditOpen, setIsNewAuditOpen] = useState(false);
  const [auditFridgeId, setAuditFridgeId] = useState("");
  const [auditNotes, setAuditNotes] = useState("");
  const [auditItems, setAuditItems] = useState<
    Array<{
      labReagentUnitId: string | number;
      unitCode: string;
      productName: string;
      lotNumber: string;
      systemUsesBefore: number;
      physicalRemainingUses: number;
      notes?: string;
    }>
  >([]);
  const [loadingAuditUnits, setLoadingAuditUnits] = useState(false);
  const [submittingAudit, setSubmittingAudit] = useState(false);

  // Cargar contenidos de una nevera
  const handleSelectFridge = useCallback(async (fridgeId: number) => {
    setLoadingContents(true);
    try {
      const contents = await LabWorkflowService.getFridgeContents(fridgeId);
      setSelectedFridge(contents);
    } catch (err) {
      console.error("Error al cargar contenido de la nevera:", err);
      toast.error("Error al obtener los frascos alojados en la nevera");
    } finally {
      setLoadingContents(false);
    }
  }, []);

  // Carga inicial de neveras y ubicaciones
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [fridgesData, locsData] = await Promise.all([
        LabWorkflowService.getFridges(),
        InventoryClientService.getLocations(),
      ]);
      setFridges(fridgesData);
      setLocations(locsData);

      // Si no hay nevera seleccionada o la seleccionada ya no existe, seleccionar la primera
      if (fridgesData.length > 0) {
        const targetId = selectedFridge ? selectedFridge.id : fridgesData[0].id;
        await handleSelectFridge(targetId);
      } else {
        setSelectedFridge(null);
      }
    } catch (err) {
      console.error("Error al cargar neveras:", err);
      toast.error("Error al cargar la lista de neveras");
    } finally {
      setLoading(false);
    }
  }, [selectedFridge, handleSelectFridge]);

  const loadAudits = useCallback(async () => {
    setLoadingAudits(true);
    try {
      const data = await FridgeAuditService.listFridgeAudits();
      setAudits(data);
    } catch (err) {
      console.error("Error al cargar arqueos físicos:", err);
      toast.error("Error al cargar los arqueos físicos");
    } finally {
      setLoadingAudits(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const fetchInitial = async () => {
      try {
        const [fridgesData, locsData, auditsData] = await Promise.all([
          LabWorkflowService.getFridges(),
          InventoryClientService.getLocations(),
          FridgeAuditService.listFridgeAudits(),
        ]);
        if (active) {
          setFridges(fridgesData);
          setLocations(locsData);
          setAudits(auditsData);
          if (fridgesData.length > 0) {
            const contents = await LabWorkflowService.getFridgeContents(fridgesData[0].id);
            if (active) setSelectedFridge(contents);
          }
          setLoading(false);
          setLoadingAudits(false);
        }
      } catch (err) {
        if (active) {
          console.error("Error al cargar datos iniciales de neveras:", err);
          setLoading(false);
          setLoadingAudits(false);
        }
      }
    };
    void fetchInitial();
    return () => {
      active = false;
    };
  }, []);

  // Acción Rápida: Abrir Frasco en Mesón (SELLADO -> EN_USO)
  const handleOpenUnit = async (unitId: string | number) => {
    if (!isLabStaff) return;
    try {
      await LabWorkflowService.openUnit(unitId);
      toast.success("Frasco abierto exitosamente. Pasa a estado EN USO en mesón.");
      if (selectedFridge) {
        await handleSelectFridge(selectedFridge.id);
      }
      void loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al abrir el frasco";
      toast.error(msg);
    }
  };

  // Acción: Descartar Frasco
  const handleDiscardUnit = async (unit: ReagentInFridge) => {
    if (!isSupervisor) {
      toast.error("Solo los Coordinadores y Administradores pueden descartar frascos de laboratorio.");
      return;
    }
    const prodName = unit.product?.name ?? "Insumo";
    const reason = prompt(`Indique el motivo técnico del descarte de ${prodName} (${unit.unitCode}):`);
    if (!reason || !reason.trim()) return;

    try {
      await LabWorkflowService.discardUnit(unit.id, reason.trim());
      toast.success(`Frasco ${unit.unitCode} descartado correctamente.`);
      if (selectedFridge) {
        await handleSelectFridge(selectedFridge.id);
      }
      void loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al descartar el frasco";
      toast.error(msg);
    }
  };

  // Crear Nevera
  const handleCreateFridge = async (e: FormEvent) => {
    e.preventDefault();
    if (!createFormData.name.trim() || !createFormData.code.trim() || !createFormData.locationId) {
      toast.error("Complete todos los campos obligatorios");
      return;
    }

    setCreateFridgeLoading(true);
    try {
      await LabWorkflowService.createFridge({
        locationId: Number(createFormData.locationId),
        code: createFormData.code.trim().toUpperCase(),
        name: createFormData.name.trim(),
        targetTempCelsius: createFormData.targetTempCelsius
          ? parseFloat(createFormData.targetTempCelsius)
          : null,
        description: createFormData.description.trim() || null,
        status: "OPERATIVO",
      });

      toast.success("Nevera / Cava registrada exitosamente");
      setIsCreateFridgeOpen(false);
      setCreateFormData({
        code: "",
        name: "",
        locationId: "",
        targetTempCelsius: "4",
        description: "",
      });
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al crear la nevera";
      toast.error(msg);
    } finally {
      setCreateFridgeLoading(false);
    }
  };

  // Transferencia de Frasco
  const handleExecuteTransfer = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedUnitForTransfer || !targetFridgeId || !transferReason.trim()) {
      toast.error("Indique la nevera destino y el motivo de transferencia");
      return;
    }

    setTransferring(true);
    try {
      await LabWorkflowService.transferUnit(
        selectedUnitForTransfer.id,
        Number(targetFridgeId),
        transferReason.trim()
      );
      toast.success(`Frasco transferido a nueva nevera`);
      setIsTransferOpen(false);
      setSelectedUnitForTransfer(null);
      setTransferReason("");
      setTargetFridgeId("");
      if (selectedFridge) {
        await handleSelectFridge(selectedFridge.id);
      }
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al transferir el frasco";
      toast.error(msg);
    } finally {
      setTransferring(false);
    }
  };

  // Selección de nevera en el modal de Arqueo
  const handleAuditFridgeChange = async (fridgeIdStr: string) => {
    setAuditFridgeId(fridgeIdStr);
    if (!fridgeIdStr) {
      setAuditItems([]);
      return;
    }

    setLoadingAuditUnits(true);
    try {
      const contents = await LabWorkflowService.getFridgeContents(Number(fridgeIdStr));
      const items = (contents.labReagentUnits || [])
        .filter((u) => u.status === "SELLADO" || u.status === "EN_USO")
        .map((u) => ({
          labReagentUnitId: u.id,
          unitCode: u.unitCode,
          productName: u.product?.name || "Reactivo",
          lotNumber: u.batch?.lotNumber || "N/A",
          systemUsesBefore: Number(u.remainingUses ?? u.currentVolume ?? 0),
          physicalRemainingUses: Number(u.remainingUses ?? u.currentVolume ?? 0),
          notes: "",
        }));

      setAuditItems(items);
    } catch (err) {
      console.error("Error al cargar frascos para arqueo:", err);
      toast.error("Error al obtener reactivos de la nevera");
    } finally {
      setLoadingAuditUnits(false);
    }
  };

  // Guardar Arqueo Físico
  const handleSaveAudit = async (e: FormEvent) => {
    e.preventDefault();
    if (!auditFridgeId) {
      toast.error("Seleccione una nevera para el arqueo");
      return;
    }
    if (auditItems.length === 0) {
      toast.error("La nevera seleccionada no contiene frascos activos para auditar");
      return;
    }

    setSubmittingAudit(true);
    try {
      await FridgeAuditService.createFridgeAudit({
        notes: auditNotes.trim() || undefined,
        items: auditItems.map((item) => ({
          labReagentUnitId: String(item.labReagentUnitId),
          physicalRemainingUses: Number(item.physicalRemainingUses),
          notes: item.notes?.trim() || undefined,
        })),
      });

      toast.success("Arqueo físico registrado exitosamente.");
      setIsNewAuditOpen(false);
      setAuditFridgeId("");
      setAuditNotes("");
      setAuditItems([]);
      await loadAudits();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar el arqueo físico";
      toast.error(msg);
    } finally {
      setSubmittingAudit(false);
    }
  };

  // Reconciliación 1-Clic de Arqueo (Caso Borde E6)
  const handleReconcileAudit = async (auditId: number) => {
    if (!isSupervisor) {
      toast.error("Solo los Coordinadores y Administradores pueden regularizar discrepancias de arqueo.");
      return;
    }
    if (!confirm("¿Desea conciliar este arqueo físico y aplicar los ajustes de inventario en 1 clic?")) {
      return;
    }

    setReconcilingId(auditId);
    try {
      await LabWorkflowService.reconcileFridgeAudit(auditId);
      toast.success("Arqueo conciliado. Ajustes asentados en inventario y bitácora de auditoría.");
      await loadAudits();
      if (selectedAuditForDetail?.id === auditId) {
        setIsDetailAuditOpen(false);
        setSelectedAuditForDetail(null);
      }
      if (selectedFridge) {
        await handleSelectFridge(selectedFridge.id);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al conciliar el arqueo";
      toast.error(msg);
    } finally {
      setReconcilingId(null);
    }
  };

  // Filtrado de frascos en la nevera seleccionada
  const filteredReagents = useMemo(() => {
    if (!selectedFridge?.labReagentUnits) return [];
    return selectedFridge.labReagentUnits.filter((u) => {
      if (fridgeStatusFilter !== "ALL" && u.status !== fridgeStatusFilter) return false;
      if (fridgeSearch.trim()) {
        const q = fridgeSearch.toLowerCase();
        const codeMatch = u.unitCode.toLowerCase().includes(q);
        const prodMatch = (u.product?.name ?? "").toLowerCase().includes(q);
        const lotMatch = (u.batch?.lotNumber ?? "").toLowerCase().includes(q);
        if (!codeMatch && !prodMatch && !lotMatch) return false;
      }
      return true;
    });
  }, [selectedFridge, fridgeStatusFilter, fridgeSearch]);

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
            <Snowflake className="w-3.5 h-3.5 text-blue-500" />
            <span>Control Térmico & Inventario en Cava</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
            Neveras & Cadena de Frío
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitoreo térmico, gestión de frascos alojados en cava y auditoría física con reconciliación 1-clic.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void loadData();
              void loadAudits();
            }}
            disabled={loading || loadingAudits}
            className="text-xs gap-1.5 h-9"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", (loading || loadingAudits) && "animate-spin")} />
            Actualizar
          </Button>

          {isSupervisor && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCreateFridgeOpen(true)}
              className="text-xs gap-1.5 h-9"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva Nevera
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => {
              setAuditFridgeId("");
              setAuditNotes("");
              setAuditItems([]);
              setIsNewAuditOpen(true);
            }}
            className="text-xs gap-1.5 h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Iniciar Arqueo Físico
          </Button>
        </div>
      </div>

      {/* Tabs Principales: Neveras vs Arqueo Físico */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/70 p-1 border border-border">
          <TabsTrigger value="fridges" className="text-xs gap-2 font-medium">
            <Snowflake className="w-4 h-4 text-blue-500" />
            <span>Neveras & Frascos Alojados</span>
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
              {fridges.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="audits" className="text-xs gap-2 font-medium">
            <ClipboardList className="w-4 h-4 text-emerald-600" />
            <span>Arqueo Físico & Reconciliación 1-Clic</span>
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
              {audits.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* PESTAÑA 1: VISUALIZADOR DE NEVERAS Y FRASCOS ALOJADOS                      */}
        {/* ========================================================================= */}
        <TabsContent value="fridges" className="space-y-6 mt-4">
          {/* Grid de Tarjetas de Neveras */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 rounded-xl border border-border bg-card animate-pulse p-4" />
              ))
            ) : fridges.length === 0 ? (
              <div className="col-span-full py-12 text-center border rounded-xl bg-card">
                <Snowflake className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                <p className="text-sm font-semibold">No se encontraron neveras configuradas</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Registre una nueva cava o nevera para comenzar el seguimiento térmico.
                </p>
              </div>
            ) : (
              fridges.map((fridge) => {
                const isSelected = selectedFridge?.id === fridge.id;
                const statusCfg = FRIDGE_STATUS_CONFIG[fridge.status] ?? FRIDGE_STATUS_CONFIG.OPERATIVO;
                const hasThermalBreach =
                  fridge.status === "DEFECTUOSO" || Number((fridge as { activeIncidentCount?: number }).activeIncidentCount || 0) > 0;

                return (
                  <Card
                    key={fridge.id}
                    onClick={() => handleSelectFridge(fridge.id)}
                    className={cn(
                      "cursor-pointer transition-all border-2 relative overflow-hidden hover:border-blue-400 hover:shadow-xs",
                      isSelected
                        ? "border-blue-600 dark:border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 shadow-xs"
                        : "border-border bg-card"
                    )}
                  >
                    {hasThermalBreach && (
                      <div className="absolute top-0 right-0 left-0 bg-red-600 text-white text-[10px] font-bold text-center py-0.5 uppercase tracking-wider flex items-center justify-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Falla Térmica / Incidencia Activa
                      </div>
                    )}

                    <CardHeader className={cn("p-4 pb-2", hasThermalBreach && "pt-6")}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-mono text-xs text-muted-foreground font-semibold">
                            {fridge.code}
                          </div>
                          <CardTitle className="text-base font-bold text-foreground">
                            {fridge.name}
                          </CardTitle>
                        </div>
                        <Badge variant={statusCfg.variant} className={cn("text-[10px] font-semibold", statusCfg.colorClass)}>
                          {statusCfg.label}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 pt-2 space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Thermometer className="w-3.5 h-3.5 text-blue-500" />
                          Temp. Objetivo:
                        </span>
                        <span className="font-mono font-bold text-foreground">
                          {fridge.targetTempCelsius !== null ? `${fridge.targetTempCelsius}°C` : "N/D"}
                        </span>
                      </div>

                      {fridge.location && (
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-slate-400" />
                            Ubicación:
                          </span>
                          <span className="truncate max-w-[160px] font-medium text-foreground">
                            {fridge.location.name}
                          </span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-muted-foreground">
                          {isSelected ? "Seleccionada actualmente" : "Haga clic para ver frascos"}
                        </span>
                        {isSelected && (
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 text-[10px]">
                            Activa
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          {/* Panel Detallado de la Nevera Seleccionada */}
          {selectedFridge && (
            <Card className="border border-border">
              <CardHeader className="p-5 pb-3 border-b border-border">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Snowflake className="w-4 h-4 text-blue-600" />
                      <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                        {selectedFridge.code}
                      </span>
                    </div>
                    <CardTitle className="text-xl font-bold mt-0.5">
                      Frascos y Reactivos en: {selectedFridge.name}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Lista completa de reactivos físicos alojados con trazabilidad de saldo, vencimiento y propiedad.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative w-48 sm:w-60">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Buscar frasco, reactivo, lote..."
                        value={fridgeSearch}
                        onChange={(e) => setFridgeSearch(e.target.value)}
                        className="pl-8 text-xs h-9"
                      />
                    </div>
                    <Select value={fridgeStatusFilter} onValueChange={setFridgeStatusFilter}>
                      <SelectTrigger className="w-36 text-xs h-9">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todos los Estados</SelectItem>
                        <SelectItem value="SELLADO">Sellados</SelectItem>
                        <SelectItem value="EN_USO">En Uso (Abiertos)</SelectItem>
                        <SelectItem value="INTERNAL_QUARANTINE">Cuarentena</SelectItem>
                        <SelectItem value="AGOTADO">Agotados</SelectItem>
                      </SelectContent>
                    </Select>

                    <UniversalPdfDownloadButton
                      document={
                        <LabFridgeAuditPdfDocument
                          auditData={{
                            fridgeId: selectedFridge.id,
                            fridgeName: selectedFridge.name,
                            fridgeCode: selectedFridge.code,
                            location: selectedFridge.location?.name,
                            targetTemperature: selectedFridge.targetTempCelsius,
                            currentTemperature: selectedFridge.targetTempCelsius,
                            units: (selectedFridge.labReagentUnits || []).map((u) => ({
                              id: u.id,
                              unitCode: u.unitCode,
                              lotNumber: u.batch?.lotNumber || "S/L",
                              expirationDate: u.expirationDate,
                              status: u.status,
                              currentVolume: u.currentVolume,
                              initialVolume: u.initialVolume,
                              product: { name: u.product?.name || "Reactivo", sku: u.product?.sku },
                            })),
                          }}
                        />
                      }
                      fileName={`Arqueo_Nevera_${String(selectedFridge.code || selectedFridge.id).replace(/[^a-zA-Z0-9_-]/g, "_")}`}
                      buttonLabel="Acta de Arqueo PDF"
                      previewLabel="Vista Previa"
                      size="sm"
                    />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {loadingContents ? (
                  <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
                    Cargando frascos alojados en la nevera...
                  </div>
                ) : filteredReagents.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-semibold">No se encontraron frascos en esta nevera</p>
                    <p className="text-xs mt-1">
                      {fridgeSearch || fridgeStatusFilter !== "ALL"
                        ? "Ningún reactivo coincide con los filtros aplicados."
                        : "Esta nevera no tiene viales asignados actualmente."}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="text-xs font-bold">Código de Frasco</TableHead>
                          <TableHead className="text-xs font-bold">Reactivo / Insumo</TableHead>
                          <TableHead className="text-xs font-bold">Lote</TableHead>
                          <TableHead className="text-xs font-bold">Área Asignada</TableHead>
                          <TableHead className="text-xs font-bold text-right">Saldo en Frasco</TableHead>
                          <TableHead className="text-xs font-bold">Vencimiento</TableHead>
                          <TableHead className="text-xs font-bold">Régimen</TableHead>
                          <TableHead className="text-xs font-bold">Estado</TableHead>
                          <TableHead className="text-xs font-bold text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredReagents.map((unit) => {
                          const isExpired = unit.expirationDate
                            ? new Date(unit.expirationDate) < new Date()
                            : false;
                          const isResearch = unit.ownershipType === "RESEARCH_PROJECT";
                          const isSealed = unit.status === "SELLADO";
                          const isInUse = unit.status === "EN_USO";
                          const isQuarantined = unit.status === "INTERNAL_QUARANTINE";
                          const isDepleted = unit.status === "AGOTADO";

                          const currentVol = unit.remainingUses !== undefined && unit.remainingUses !== null
                            ? Number(unit.remainingUses)
                            : Number(unit.currentVolume ?? 0);
                          const initVol = unit.initialTheoreticalUses
                            ? Number(unit.initialTheoreticalUses)
                            : Number(unit.initialVolume ?? 1);
                          const pct = Math.max(0, Math.min(100, Math.round((currentVol / initVol) * 100)));

                          return (
                            <TableRow key={unit.id} className="hover:bg-muted/30">
                              <TableCell className="font-mono text-xs font-bold">
                                {unit.unitCode}
                              </TableCell>
                              <TableCell>
                                <div className="font-semibold text-xs text-foreground">
                                  {unit.product?.name || "Reactivo no especificado"}
                                </div>
                                <div className="text-[10px] text-muted-foreground font-mono">
                                  SKU: {unit.product?.sku || "N/A"}
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {unit.batch?.lotNumber || "N/A"}
                              </TableCell>
                              <TableCell className="text-xs">
                                {unit.assignedLabArea ? (
                                  <Badge variant="outline" className="text-[10px] py-0 font-medium">
                                    {unit.assignedLabArea.name}
                                  </Badge>
                                ) : (
                                  <span className="text-[10px] text-muted-foreground italic">
                                    Sin área fija
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="font-mono font-bold text-xs">
                                  {currentVol} / {initVol}{" "}
                                  <span className="text-[10px] font-normal text-muted-foreground">
                                    {unit.product?.baseUnit?.abbreviation || "usos"}
                                  </span>
                                </div>
                                <div className="w-24 ml-auto bg-muted rounded-full h-1.5 mt-1 overflow-hidden">
                                  <div
                                    className={cn(
                                      "h-full rounded-full transition-all",
                                      pct > 40
                                        ? "bg-emerald-500"
                                        : pct > 15
                                        ? "bg-amber-500"
                                        : "bg-red-500"
                                    )}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1 text-xs">
                                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span>
                                    {unit.expirationDate
                                      ? new Date(unit.expirationDate).toLocaleDateString("es-ES")
                                      : "N/A"}
                                  </span>
                                </div>
                                {isExpired && (
                                  <Badge
                                    variant="destructive"
                                    className="text-[9px] px-1 py-0 mt-0.5 flex items-center gap-1 font-semibold"
                                  >
                                    <AlertTriangle className="w-2.5 h-2.5" /> VENCIDO
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {isResearch ? (
                                  <Badge
                                    variant="outline"
                                    className="bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 text-[10px] font-semibold"
                                  >
                                    Investigación I+D
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 text-[10px] font-semibold"
                                  >
                                    Rutina Clínica
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {isSealed && (
                                  <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 text-[10px]">
                                    Sellado
                                  </Badge>
                                )}
                                {isInUse && (
                                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-semibold">
                                    En Uso
                                  </Badge>
                                )}
                                {isQuarantined && (
                                  <Badge variant="destructive" className="text-[10px]">
                                    En Cuarentena
                                  </Badge>
                                )}
                                {isDepleted && (
                                  <Badge variant="outline" className="bg-neutral-100 text-neutral-600 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-400 text-[10px] font-semibold">
                                    Agotado
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {/* Acción rápida: Abrir Frasco con blindaje por vencimiento y cuarentena */}
                                  {isSealed && isExpired ? (
                                    <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-300 font-medium whitespace-nowrap">
                                      Bloqueado por vencimiento
                                    </Badge>
                                  ) : isSealed && isQuarantined ? (
                                    <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 font-medium whitespace-nowrap">
                                      Bloqueado en cuarentena
                                    </Badge>
                                  ) : isSealed && isLabStaff ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleOpenUnit(unit.id)}
                                      className="text-[11px] h-7 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/60 dark:text-emerald-300"
                                    >
                                      <FlaskConical className="w-3 h-3 mr-1" />
                                      Abrir en Mesón
                                    </Button>
                                  ) : null}

                                  {/* Transferir Frasco */}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setSelectedUnitForTransfer(unit);
                                      setTargetFridgeId("");
                                      setTransferReason("");
                                      setIsTransferOpen(true);
                                    }}
                                    className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground"
                                    title="Transferir a otra nevera"
                                  >
                                    <ArrowRightLeft className="w-3.5 h-3.5" />
                                  </Button>

                                  {/* Descartar Frasco (Supervisor o Vencido) */}
                                  {isSupervisor && (
                                    <Button
                                      size="sm"
                                      variant={isExpired ? "destructive" : "ghost"}
                                      onClick={() => handleDiscardUnit(unit)}
                                      className={cn(
                                        "text-[11px] h-7 px-2",
                                        isExpired
                                          ? "bg-red-600 hover:bg-red-700 text-white font-medium"
                                          : "text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                                      )}
                                      title="Descartar frasco"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                                      {isExpired ? "Descartar" : ""}
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ========================================================================= */}
        {/* PESTAÑA 2: ARQUEO FÍSICO DE SALDO Y RECONCILIACIÓN 1-CLIC (CASO BORDE E6)  */}
        {/* ========================================================================= */}
        <TabsContent value="audits" className="space-y-6 mt-4">
          <Card className="border border-border">
            <CardHeader className="p-5 pb-3 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                    <ClipboardList className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Auditoría de Neveras & Balance Físico</span>
                  </div>
                  <CardTitle className="text-xl font-bold mt-0.5">
                    Historial de Arqueos Físicos de Cava
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Inspección y cotejo del volumen real en frasco vs usos teóricos registrados. Conciliación en 1-clic con ajuste automático.
                  </CardDescription>
                </div>

                <Button
                  size="sm"
                  onClick={() => {
                    setAuditFridgeId("");
                    setAuditNotes("");
                    setAuditItems([]);
                    setIsNewAuditOpen(true);
                  }}
                  className="text-xs gap-1.5 h-9 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Iniciar Nuevo Arqueo
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loadingAudits ? (
                <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
                  Cargando arqueos físicos registrados...
                </div>
              ) : audits.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold">No se han realizado arqueos físicos</p>
                  <p className="text-xs mt-1">
                    Haga clic en &quot;Iniciar Nuevo Arqueo&quot; para registrar el conteo físico de una nevera.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="text-xs font-bold">Código de Arqueo</TableHead>
                        <TableHead className="text-xs font-bold">Fecha</TableHead>
                        <TableHead className="text-xs font-bold">Responsable</TableHead>
                        <TableHead className="text-xs font-bold">Ítems Auditados</TableHead>
                        <TableHead className="text-xs font-bold">Discrepancias</TableHead>
                        <TableHead className="text-xs font-bold">Estado</TableHead>
                        <TableHead className="text-xs font-bold text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {audits.map((audit) => {
                        const totalItems = audit.items?.length || 0;
                        const hasPendingDiscrepancies = audit.items?.some(
                          (item) => item.adjustmentStatus === "PENDING_ADJUSTMENT"
                        );
                        const discrepancyCount = audit.items?.filter(
                          (i) => (i.variance ?? (i.physicalRemainingUses - (i.systemRemainingUses ?? i.systemUsesBefore ?? 0))) !== 0
                        ).length || 0;

                        return (
                          <TableRow key={audit.id} className="hover:bg-muted/30">
                            <TableCell className="font-mono text-xs font-bold">
                              {audit.code}
                            </TableCell>
                            <TableCell className="text-xs">
                              {new Date(audit.auditDate || audit.createdAt).toLocaleDateString("es-ES", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </TableCell>
                            <TableCell className="text-xs font-medium">
                              {audit.performedBy?.fullName || "Usuario"}
                            </TableCell>
                            <TableCell className="text-xs font-mono">
                              {totalItems} frascos
                            </TableCell>
                            <TableCell>
                              {discrepancyCount > 0 ? (
                                <Badge
                                  variant="outline"
                                  className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-semibold"
                                >
                                  {discrepancyCount} con diferencia
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px]"
                                >
                                  Sin discrepancia
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {hasPendingDiscrepancies ? (
                                <Badge
                                  variant="outline"
                                  className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200 text-[10px] font-bold"
                                >
                                  Pendiente de Ajuste
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 text-[10px] font-bold"
                                >
                                  Conciliado
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <UniversalPdfDownloadButton
                                  document={
                                    <LabFridgeAuditPdfDocument
                                      auditData={{
                                        fridgeId: audit.id,
                                        fridgeName: audit.items?.[0]?.labReagentUnit?.fridge?.name || "Nevera de Laboratorio",
                                        fridgeCode: audit.items?.[0]?.labReagentUnit?.fridge?.code || audit.code,
                                        location: "Laboratorio Clínico",
                                        auditDate: audit.auditDate || audit.createdAt,
                                        auditorName: audit.performedBy?.fullName || "Auditor",
                                        notes: audit.notes,
                                        units: (audit.items || []).map((item) => ({
                                          id: item.id,
                                          unitCode: item.labReagentUnit?.unitCode || `ID-${item.labReagentUnitId}`,
                                          lotNumber: item.labReagentUnit?.batch?.lotNumber || "S/L",
                                          expirationDate: item.labReagentUnit?.expirationDate || null,
                                          status: item.adjustmentStatus || "AUDITADO",
                                          currentVolume: item.physicalRemainingUses,
                                          initialVolume: item.systemRemainingUses ?? item.systemUsesBefore ?? item.physicalRemainingUses,
                                          product: {
                                            name: item.labReagentUnit?.product?.name || "Reactivo",
                                            sku: item.labReagentUnit?.product?.sku || null,
                                          },
                                        })),
                                      }}
                                    />
                                  }
                                  fileName={`Acta_Arqueo_${String(audit.code || audit.id).replace(/[^a-zA-Z0-9_-]/g, "_")}`}
                                  buttonLabel="Acta PDF"
                                  previewLabel="Ver"
                                  size="sm"
                                />

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedAuditForDetail(audit);
                                    setIsDetailAuditOpen(true);
                                  }}
                                  className="text-[11px] h-7 px-2.5 gap-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  Ver Cotejo
                                </Button>

                                {/* Botón 1-Clic para Regularizar Discrepancias */}
                                {hasPendingDiscrepancies && isSupervisor && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleReconcileAudit(audit.id)}
                                    disabled={reconcilingId === audit.id}
                                    className="text-[11px] h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1 shadow-xs"
                                  >
                                    <CheckCheck className={cn("w-3.5 h-3.5", reconcilingId === audit.id && "animate-spin")} />
                                    Aplicar Ajustes (1-Clic)
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* MODAL: REGISTRAR NUEVA NEVERA                                              */}
      {/* ========================================================================= */}
      <Dialog open={isCreateFridgeOpen} onOpenChange={setIsCreateFridgeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Snowflake className="w-4 h-4 text-blue-500" />
              Nueva Nevera o Cava de Reactivos
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure los parámetros de control térmico y ubicación de la unidad de refrigeración.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateFridge} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Código Identificador *</Label>
                <Input
                  placeholder="ej. CAVA-LAB-01"
                  value={createFormData.code}
                  onChange={(e) => setCreateFormData({ ...createFormData, code: e.target.value })}
                  className="text-xs uppercase font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Temp. Objetivo (°C) *</Label>
                <Input
                  type="number"
                  step="0.5"
                  placeholder="4"
                  value={createFormData.targetTempCelsius}
                  onChange={(e) =>
                    setCreateFormData({ ...createFormData, targetTempCelsius: e.target.value })
                  }
                  className="text-xs font-mono"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Nombre Descriptivo *</Label>
              <Input
                placeholder="ej. Nevera Principal de Bioquímica y Pruebas Especiales"
                value={createFormData.name}
                onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                className="text-xs"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Ubicación Física *</Label>
              <Select
                value={createFormData.locationId}
                onValueChange={(val) => setCreateFormData({ ...createFormData, locationId: val })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Seleccione ubicación física" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc.id} value={String(loc.id)}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Notas Adicionales</Label>
              <Textarea
                placeholder="Marca, modelo, sensor térmico o detalles de calibración..."
                value={createFormData.description}
                onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                className="text-xs resize-none h-16"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateFridgeOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createFridgeLoading}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
              >
                {createFridgeLoading ? "Guardando..." : "Guardar Nevera"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: TRANSFERIR FRASCO ENTRE NEVERAS                                    */}
      {/* ========================================================================= */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-blue-600" />
              Transferir Frasco de Reactivo
            </DialogTitle>
            <DialogDescription className="text-xs">
              Mueva el frasco a otra nevera o cava garantizando la continuidad de la cadena de frío.
            </DialogDescription>
          </DialogHeader>

          {selectedUnitForTransfer && (
            <form onSubmit={handleExecuteTransfer} className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg border border-border space-y-1 text-xs">
                <div className="font-semibold text-foreground">
                  {selectedUnitForTransfer.product?.name}
                </div>
                <div className="font-mono text-muted-foreground flex items-center gap-2">
                  <span>Código: {selectedUnitForTransfer.unitCode}</span>
                  <span>&bull;</span>
                  <span>Lote: {selectedUnitForTransfer.batch?.lotNumber}</span>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Nevera de Destino *</Label>
                <Select value={targetFridgeId} onValueChange={setTargetFridgeId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Seleccione la nevera destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {fridges
                      .filter((f) => f.id !== selectedFridge?.id && f.status === "OPERATIVO")
                      .map((f) => (
                        <SelectItem key={f.id} value={String(f.id)}>
                          {f.name} ({f.code}) &bull; {f.targetTempCelsius}°C
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Motivo de Transferencia *</Label>
                <Textarea
                  placeholder="ej. Reubicación por mantenimiento preventivo o asignación a mesa de trabajo..."
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="text-xs resize-none h-16"
                  required
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTransferOpen(false)}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={transferring}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {transferring ? "Transfiriendo..." : "Confirmar Transferencia"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: INICIAR NUEVO ARQUEO FÍSICO                                         */}
      {/* ========================================================================= */}
      <Dialog open={isNewAuditOpen} onOpenChange={setIsNewAuditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-emerald-600" />
              Nuevo Arqueo Físico de Nevera
            </DialogTitle>
            <DialogDescription className="text-xs">
              Seleccione la nevera a inspeccionar e ingrese el conteo físico real observado en cada frasco.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAudit} className="space-y-4 flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nevera a Auditar *</Label>
                <Select value={auditFridgeId} onValueChange={handleAuditFridgeChange}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Seleccione una nevera" />
                  </SelectTrigger>
                  <SelectContent>
                    {fridges.map((f) => (
                      <SelectItem key={f.id} value={String(f.id)}>
                        {f.name} ({f.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Observaciones Generales</Label>
                <Input
                  placeholder="ej. Arqueo quincenal ordinario..."
                  value={auditNotes}
                  onChange={(e) => setAuditNotes(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            {loadingAuditUnits ? (
              <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
                Cargando frascos y saldo teórico en nevera...
              </div>
            ) : auditItems.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border rounded-lg bg-muted/20">
                Seleccione una nevera con reactivos para iniciar el cotejo.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    Frascos Activos a Cotejar ({auditItems.length})
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Modifique el valor en &quot;Conteo Físico&quot; si difiere del sistema
                  </span>
                </div>

                <div className="border rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0">
                      <TableRow>
                        <TableHead className="text-xs font-bold">Código / Reactivo</TableHead>
                        <TableHead className="text-xs font-bold">Lote</TableHead>
                        <TableHead className="text-xs font-bold text-right">Saldo Sistema</TableHead>
                        <TableHead className="text-xs font-bold text-right w-32">Conteo Físico</TableHead>
                        <TableHead className="text-xs font-bold text-right">Diferencia</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditItems.map((item, idx) => {
                        const diff = item.physicalRemainingUses - item.systemUsesBefore;
                        return (
                          <TableRow key={item.labReagentUnitId}>
                            <TableCell>
                              <div className="font-mono text-xs font-bold">{item.unitCode}</div>
                              <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                                {item.productName}
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{item.lotNumber}</TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {item.systemUsesBefore}
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                min={0}
                                value={item.physicalRemainingUses}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  setAuditItems((prev) =>
                                    prev.map((it, i) =>
                                      i === idx ? { ...it, physicalRemainingUses: val } : it
                                    )
                                  );
                                }}
                                className="text-xs font-mono text-right h-8"
                                required
                              />
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs font-bold">
                              {diff === 0 ? (
                                <span className="text-muted-foreground">0</span>
                              ) : diff > 0 ? (
                                <span className="text-blue-600">+{diff}</span>
                              ) : (
                                <span className="text-red-600">{diff}</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewAuditOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingAudit || auditItems.length === 0}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submittingAudit ? "Registrando..." : "Guardar Arqueo Físico"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: VER DETALLE DE COTEJO DE ARQUEO                                     */}
      {/* ========================================================================= */}
      <Dialog open={isDetailAuditOpen} onOpenChange={setIsDetailAuditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  Cotejo de Arqueo Físico: {selectedAuditForDetail?.code}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Realizado por {selectedAuditForDetail?.performedBy?.fullName} el{" "}
                  {selectedAuditForDetail &&
                    new Date(
                      selectedAuditForDetail.auditDate || selectedAuditForDetail.createdAt
                    ).toLocaleDateString("es-ES")}
                </DialogDescription>
              </div>

              <div className="flex items-center gap-2">
                {selectedAuditForDetail && (
                  <UniversalPdfDownloadButton
                    document={
                      <LabFridgeAuditPdfDocument
                        auditData={{
                          fridgeId: selectedAuditForDetail.id,
                          fridgeName: selectedAuditForDetail.items?.[0]?.labReagentUnit?.fridge?.name || "Nevera de Laboratorio",
                          fridgeCode: selectedAuditForDetail.items?.[0]?.labReagentUnit?.fridge?.code || selectedAuditForDetail.code,
                          location: "Laboratorio Clínico",
                          auditDate: selectedAuditForDetail.auditDate || selectedAuditForDetail.createdAt,
                          auditorName: selectedAuditForDetail.performedBy?.fullName || "Auditor",
                          notes: selectedAuditForDetail.notes,
                          units: (selectedAuditForDetail.items || []).map((item) => ({
                            id: item.id,
                            unitCode: item.labReagentUnit?.unitCode || `ID-${item.labReagentUnitId}`,
                            lotNumber: item.labReagentUnit?.batch?.lotNumber || "S/L",
                            expirationDate: item.labReagentUnit?.expirationDate || null,
                            status: item.adjustmentStatus || "AUDITADO",
                            currentVolume: item.physicalRemainingUses,
                            initialVolume: item.systemRemainingUses ?? item.systemUsesBefore ?? item.physicalRemainingUses,
                            product: {
                              name: item.labReagentUnit?.product?.name || "Reactivo",
                              sku: item.labReagentUnit?.product?.sku || null,
                            },
                          })),
                        }}
                      />
                    }
                    fileName={`Acta_Arqueo_${String(selectedAuditForDetail.code || selectedAuditForDetail.id).replace(/[^a-zA-Z0-9_-]/g, "_")}`}
                    buttonLabel="Acta PDF"
                    previewLabel="Ver PDF"
                    size="sm"
                  />
                )}

                {selectedAuditForDetail?.items.some(
                  (i) => i.adjustmentStatus === "PENDING_ADJUSTMENT"
                ) && isSupervisor && (
                  <Button
                    size="sm"
                    onClick={() => selectedAuditForDetail && handleReconcileAudit(selectedAuditForDetail.id)}
                    disabled={reconcilingId === selectedAuditForDetail?.id}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                  >
                    <CheckCheck className={cn("w-3.5 h-3.5", reconcilingId === selectedAuditForDetail?.id && "animate-spin")} />
                    Aplicar Ajustes (1-Clic)
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {selectedAuditForDetail && (
            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
              {selectedAuditForDetail.notes && (
                <div className="bg-muted/40 p-3 rounded-lg text-xs border border-border">
                  <span className="font-semibold block text-[11px] text-muted-foreground uppercase">
                    Notas de Auditoría
                  </span>
                  <p className="mt-0.5">{selectedAuditForDetail.notes}</p>
                </div>
              )}

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-xs font-bold">Código</TableHead>
                      <TableHead className="text-xs font-bold">Reactivo</TableHead>
                      <TableHead className="text-xs font-bold text-right">Saldo Sistema</TableHead>
                      <TableHead className="text-xs font-bold text-right">Físico</TableHead>
                      <TableHead className="text-xs font-bold text-right">Diferencia</TableHead>
                      <TableHead className="text-xs font-bold">Estado Ajuste</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedAuditForDetail.items.map((item) => {
                      const sysBefore = item.systemRemainingUses ?? item.systemUsesBefore ?? 0;
                      const diff = item.variance ?? (item.physicalRemainingUses - sysBefore);

                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-mono text-xs font-bold">
                            {item.labReagentUnit?.unitCode || `ID-${item.labReagentUnitId}`}
                          </TableCell>
                          <TableCell className="text-xs">
                            {item.labReagentUnit?.product?.name || "Reactivo"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {sysBefore}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold">
                            {item.physicalRemainingUses}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold">
                            {diff === 0 ? (
                              <span className="text-muted-foreground">0</span>
                            ) : diff > 0 ? (
                              <span className="text-blue-600">+{diff}</span>
                            ) : (
                              <span className="text-red-600">{diff}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.adjustmentStatus === "PENDING_ADJUSTMENT" ? (
                              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300">
                                Pendiente
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300">
                                Conciliado
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsDetailAuditOpen(false)}
              className="text-xs"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
