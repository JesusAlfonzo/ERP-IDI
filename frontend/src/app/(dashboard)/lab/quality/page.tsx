"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { LabWorkflowService } from "@/services/lab-workflow.service";
import { AuthService } from "@/services/auth.service";
import type {
  QuarantineIncident,
  LabArea,
  LabConsumptionAuditLog,
  ConsumptionConcept,
  QuarantineReason,
} from "@/types/lab-workflow";
import type { LabReagentUnitItem } from "@/types/laboratory";
import { toast } from "@/utils/toast";
import {
  UniversalPdfDownloadButton,
  LabQualityIncidentPdfDocument,
  CustomReportPdfDocument,
} from "@/components/pdf";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Trash2,
  SlidersHorizontal,
  Activity,
  Layers,
  TrendingDown,
  TrendingUp,
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

const QUARANTINE_REASONS: Record<string, string> = {
  DEFECTIVE_KIT: "Kit Defectuoso de Fábrica",
  CONTAMINATION: "Sospecha de Contaminación / Precipitado",
  TEMPERATURE_BREACH: "Ruptura de Cadena de Frío",
  COLD_CHAIN_BREAK: "Ruptura de Cadena de Frío",
  RECALL: "Retiro de Lote por Proveedor (Recall)",
  EXPIRATION: "Vencimiento Alcanzado",
  EXPIRED: "Vencimiento Alcanzado",
  SUSPECTED_DEGRADATION: "Degradación / Pérdida de Sensibilidad",
  PHYSICAL_DAMAGE: "Frasco Roto o Dañado Físicamente",
  DAMAGED_PACKAGING: "Empaque Dañado / Físicamente Roto",
  CALIBRATION_FAILURE: "Falla en Control o Calibración",
  FALLA_CONTROL_CALIDAD: "Falla en Control de Calidad",
  CADENA_FRIO_ROTA: "Ruptura de Cadena de Frío",
  DANO_FISICO: "Daño Físico de Frasco / Vial",
  CONTAMINACION_PRECIPITADO: "Contaminación / Precipitado",
  VENCIMIENTO_PREMATURO: "Vencimiento Prematuro",
  OTRO: "Otra Incidencia Técnica",
  OTHER: "Otra Incidencia Técnica",
};

const CONCEPT_CONFIG: Record<
  ConsumptionConcept,
  { label: string; colorClass: string; icon: typeof Activity }
> = {
  PATIENT: {
    label: "Pacientes",
    colorClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
    icon: Activity,
  },
  CONTROL: {
    label: "Control de Calidad",
    colorClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
    icon: CheckCircle2,
  },
  CALIBRATION: {
    label: "Calibración",
    colorClass: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300",
    icon: SlidersHorizontal,
  },
  REPEAT: {
    label: "Repetición Técnica",
    colorClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
    icon: RefreshCw,
  },
  WASTE: {
    label: "Merma / Desperdicio",
    colorClass: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300",
    icon: TrendingDown,
  },
  YIELD_SURPLUS: {
    label: "Superávit de Rendimiento",
    colorClass: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300",
    icon: TrendingUp,
  },
  YIELD_DEFICIT: {
    label: "Déficit de Rendimiento",
    colorClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300",
    icon: TrendingDown,
  },
  QUARANTINE_LOCK: {
    label: "Bloqueo por Cuarentena",
    colorClass: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300",
    icon: ShieldAlert,
  },
  PHYSICAL_AUDIT_ADJUSTMENT: {
    label: "Ajuste por Arqueo Físico",
    colorClass: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300",
    icon: Layers,
  },
};

export default function LabQualityPage() {
  const [currentUser] = useState(() => AuthService.getCurrentUser());
  const userRoles = currentUser?.roles || [];
  const isSupervisor =
    userRoles.includes("ADMINISTRADOR") ||
    userRoles.includes("COORDINADOR_LABORATORIO") ||
    userRoles.includes("COORDINADOR");

  const [activeTab, setActiveTab] = useState<string>("quarantine");
  const [loading, setLoading] = useState<boolean>(true);
  const [areas, setAreas] = useState<LabArea[]>([]);

  // 1. Cuarentena
  const [incidents, setIncidents] = useState<QuarantineIncident[]>([]);
  const [activeUnits, setActiveUnits] = useState<LabReagentUnitItem[]>([]);
  const [quarantineStatusFilter, setQuarantineStatusFilter] = useState<string>("ALL");
  const [quarantineSearch, setQuarantineSearch] = useState<string>("");

  // Modal: Aislar a Cuarentena
  const [isNewQuarantineOpen, setIsNewQuarantineOpen] = useState<boolean>(false);
  const [newQuarantineData, setNewQuarantineData] = useState({
    unitId: "",
    quarantineReason: "DEFECTIVE_KIT" as QuarantineReason,
    description: "",
    evidenceUrl: "",
    labAreaId: "",
  });
  const [submittingQuarantine, setSubmittingQuarantine] = useState<boolean>(false);

  // Modal: Resolver Cuarentena
  const [selectedIncidentForResolve, setSelectedIncidentForResolve] = useState<QuarantineIncident | null>(null);
  const [resolveStatus, setResolveStatus] = useState<string>("RETURNED_TO_INVENTORY");
  const [resolveNotes, setResolveNotes] = useState<string>("");
  const [submittingResolve, setSubmittingResolve] = useState<boolean>(false);

  // 2. Bitácora de Auditoría 5D
  const [auditLogs, setAuditLogs] = useState<LabConsumptionAuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [conceptFilter, setConceptFilter] = useState<string>("ALL");
  const [areaFilter, setAreaFilter] = useState<string>("ALL");
  const [logSearch, setLogSearch] = useState<string>("");

  // Carga de datos de cuarentena
  const loadQuarantineData = useCallback(async () => {
    setLoading(true);
    try {
      const [incData, areaData, unitsData] = await Promise.all([
        LabWorkflowService.getQuarantineIncidents({
          resolutionStatus: quarantineStatusFilter !== "ALL" ? quarantineStatusFilter : undefined,
        }),
        LabWorkflowService.getLabAreas(),
        LabWorkflowService.getLabUnits(),
      ]);
      setIncidents(incData);
      setAreas(areaData);
      setActiveUnits(
        unitsData.filter((u) => u.status === "SELLADO" || u.status === "EN_USO")
      );
    } catch (err) {
      console.error("Error al cargar incidentes de cuarentena:", err);
      toast.error("Error al cargar el panel de cuarentena");
    } finally {
      setLoading(false);
    }
  }, [quarantineStatusFilter]);

  // Carga de logs de auditoría 5D
  const loadAuditLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const data = await LabWorkflowService.getConsumptionAuditLogs({
        concept: conceptFilter !== "ALL" ? conceptFilter : undefined,
        labAreaId: areaFilter !== "ALL" ? Number(areaFilter) : undefined,
      });
      setAuditLogs(data);
    } catch (err) {
      console.error("Error al cargar bitácora de auditoría 5D:", err);
      toast.error("Error al cargar la bitácora de auditoría 5D");
    } finally {
      setLoadingLogs(false);
    }
  }, [conceptFilter, areaFilter]);

  useEffect(() => {
    let active = true;
    LabWorkflowService.getQuarantineIncidents({
      resolutionStatus: quarantineStatusFilter !== "ALL" ? quarantineStatusFilter : undefined,
    })
      .then(async (incData) => {
        if (!active) return;
        const [areaData, unitsData] = await Promise.all([
          LabWorkflowService.getLabAreas(),
          LabWorkflowService.getLabUnits(),
        ]);
        if (!active) return;
        setIncidents(incData);
        setAreas(areaData);
        setActiveUnits(
          unitsData.filter((u) => u.status === "SELLADO" || u.status === "EN_USO")
        );
      })
      .catch((err) => {
        if (!active) return;
        console.error("Error al cargar incidentes de cuarentena:", err);
        toast.error("Error al cargar el panel de cuarentena");
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [quarantineStatusFilter]);

  useEffect(() => {
    if (activeTab !== "audit5d") return;
    let active = true;
    LabWorkflowService.getConsumptionAuditLogs({
      concept: conceptFilter !== "ALL" ? conceptFilter : undefined,
      labAreaId: areaFilter !== "ALL" ? Number(areaFilter) : undefined,
    })
      .then((data) => {
        if (!active) return;
        setAuditLogs(data);
      })
      .catch((err) => {
        if (!active) return;
        console.error("Error al cargar bitácora de auditoría 5D:", err);
        toast.error("Error al cargar la bitácora de auditoría 5D");
      })
      .finally(() => {
        if (active) {
          setLoadingLogs(false);
        }
      });

    return () => {
      active = false;
    };
  }, [activeTab, conceptFilter, areaFilter]);

  // Acción: Aislar frasco a cuarentena
  const handleCreateQuarantine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuarantineData.unitId || !newQuarantineData.description.trim()) {
      toast.error("Seleccione un frasco e indique el motivo detallado");
      return;
    }
    if (newQuarantineData.description.trim().length < 10) {
      toast.error("La descripción debe tener al menos 10 caracteres");
      return;
    }

    setSubmittingQuarantine(true);
    try {
      await LabWorkflowService.putUnitInQuarantine(newQuarantineData.unitId, {
        quarantineReason: newQuarantineData.quarantineReason,
        description: newQuarantineData.description.trim(),
        evidenceUrl: newQuarantineData.evidenceUrl.trim() || undefined,
        labAreaId: newQuarantineData.labAreaId ? Number(newQuarantineData.labAreaId) : null,
      });

      toast.success("Frasco aislado en cuarentena preventiva");
      setIsNewQuarantineOpen(false);
      setNewQuarantineData({
        unitId: "",
        quarantineReason: "DEFECTIVE_KIT",
        description: "",
        evidenceUrl: "",
        labAreaId: "",
      });
      await loadQuarantineData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al enviar frasco a cuarentena";
      toast.error(msg);
    } finally {
      setSubmittingQuarantine(false);
    }
  };

  // Acción: Resolver cuarentena
  const handleResolveQuarantine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncidentForResolve || !resolveNotes.trim()) {
      toast.error("Ingrese una justificación de la resolución técnica");
      return;
    }

    setSubmittingResolve(true);
    try {
      await LabWorkflowService.resolveQuarantine(selectedIncidentForResolve.id, {
        resolutionStatus: resolveStatus,
        resolutionNotes: resolveNotes.trim(),
      });

      toast.success(
        resolveStatus === "RETURNED_TO_INVENTORY"
          ? "Frasco liberado y retornado a inventario operativo"
          : "Frasco descartado definitivamente por daño o falla técnica"
      );

      setSelectedIncidentForResolve(null);
      setResolveNotes("");
      await loadQuarantineData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al resolver la cuarentena";
      toast.error(msg);
    } finally {
      setSubmittingResolve(false);
    }
  };

  // Filtrado de incidentes
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      if (quarantineStatusFilter !== "ALL") {
        if (quarantineStatusFilter === "PENDING" && inc.resolutionStatus !== "PENDING") return false;
        if (
          quarantineStatusFilter === "RETURNED_TO_INVENTORY" &&
          inc.resolutionStatus !== "RETURNED_TO_INVENTORY" &&
          inc.resolutionStatus !== "REINTEGRATED_TO_STOCK"
        )
          return false;
        if (
          quarantineStatusFilter === "DISCARDED" &&
          inc.resolutionStatus !== "DISCARDED" &&
          inc.resolutionStatus !== "WRITTEN_OFF_AS_LOSS" &&
          inc.resolutionStatus !== "RETURNED_TO_SUPPLIER"
        )
          return false;
      }
      if (quarantineSearch.trim()) {
        const q = quarantineSearch.toLowerCase();
        const code = (inc.unit?.unitCode ?? "").toLowerCase();
        const prod = (inc.unit?.product?.name ?? "").toLowerCase();
        const desc = (inc.description ?? "").toLowerCase();
        if (!code.includes(q) && !prod.includes(q) && !desc.includes(q)) return false;
      }
      return true;
    });
  }, [incidents, quarantineSearch, quarantineStatusFilter]);

  // Filtrado de logs de auditoría 5D
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (logSearch.trim()) {
        const q = logSearch.toLowerCase();
        const code = (log.labReagentUnit?.unitCode ?? "").toLowerCase();
        const prod = (log.labReagentUnit?.product?.name ?? "").toLowerCase();
        const user = (log.user?.fullName ?? "").toLowerCase();
        const notes = (log.notes ?? "").toLowerCase();
        if (!code.includes(q) && !prod.includes(q) && !user.includes(q) && !notes.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [auditLogs, logSearch]);

  // Métricas agregadas de Auditoría 5D
  const auditMetrics = useMemo(() => {
    let patientUses = 0;
    let controlUses = 0;
    let calibUses = 0;
    let repeatUses = 0;
    let wasteUses = 0;
    let totalCost = 0;

    filteredAuditLogs.forEach((l) => {
      const count = Number(l.usesCount ?? 0);
      const cost = Number(l.costImpact ?? 0);
      totalCost += cost;

      if (l.concept === "PATIENT") patientUses += count;
      else if (l.concept === "CONTROL") controlUses += count;
      else if (l.concept === "CALIBRATION") calibUses += count;
      else if (l.concept === "REPEAT") repeatUses += count;
      else if (l.concept === "WASTE" || l.concept === "YIELD_DEFICIT") wasteUses += count;
    });

    const totalAnalytic = patientUses + controlUses + calibUses + repeatUses + wasteUses;
    return {
      patientUses,
      controlUses,
      calibUses,
      repeatUses,
      wasteUses,
      totalAnalytic,
      totalCost,
    };
  }, [filteredAuditLogs]);

  // Contadores de cuarentena
  const quarantineCounts = useMemo(() => {
    const pending = incidents.filter((i) => i.resolutionStatus === "PENDING").length;
    const returned = incidents.filter(
      (i) =>
        i.resolutionStatus === "RETURNED_TO_INVENTORY" ||
        i.resolutionStatus === "REINTEGRATED_TO_STOCK"
    ).length;
    const discarded = incidents.filter(
      (i) =>
        i.resolutionStatus === "DISCARDED" ||
        i.resolutionStatus === "WRITTEN_OFF_AS_LOSS" ||
        i.resolutionStatus === "RETURNED_TO_SUPPLIER"
    ).length;
    return { pending, returned, discarded };
  }, [incidents]);

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            <span>Control de Calidad & Trazabilidad Inmutable</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
            Calidad, Cuarentena & Auditoría 5D
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Aislamiento de reactivos por sospecha técnica y bitácora analítica inmutable desglosada en 5 dimensiones.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void loadQuarantineData();
              if (activeTab === "audit5d") void loadAuditLogs();
            }}
            disabled={loading || loadingLogs}
            className="text-xs gap-1.5 h-9"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", (loading || loadingLogs) && "animate-spin")} />
            Actualizar
          </Button>

          {isSupervisor && (
            <Button
              size="sm"
              onClick={() => setIsNewQuarantineOpen(true)}
              className="text-xs gap-1.5 h-9 bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Aislar a Cuarentena
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Principales: Cuarentena vs Auditoría 5D */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val);
          if (val === "audit5d" && auditLogs.length === 0) {
            setLoadingLogs(true);
          }
        }}
        className="w-full"
      >
        <TabsList className="bg-muted/70 p-1 border border-border">
          <TabsTrigger value="quarantine" className="text-xs gap-2 font-medium">
            <ShieldAlert className="w-4 h-4 text-rose-500" />
            <span>Gestión de Cuarentena</span>
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
              {quarantineCounts.pending} activos
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="audit5d" className="text-xs gap-2 font-medium">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Bitácora de Auditoría 5D</span>
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
              {auditLogs.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* PESTAÑA 1: GESTIÓN DE CUARENTENA TÉCNICA                                  */}
        {/* ========================================================================= */}
        <TabsContent value="quarantine" className="space-y-6 mt-4">
          {/* Tarjetas de Resumen */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border border-amber-200 bg-amber-50/20 dark:bg-amber-950/10 dark:border-amber-900/40">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase text-amber-700 dark:text-amber-400">
                    En Cuarentena Activa
                  </p>
                  <p className="text-2xl font-bold font-mono text-foreground mt-0.5">
                    {quarantineCounts.pending}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Viales bloqueados de uso</p>
                </div>
                <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-amber-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-emerald-200 bg-emerald-50/20 dark:bg-emerald-950/10 dark:border-emerald-900/40">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase text-emerald-700 dark:text-emerald-400">
                    Liberados a Operativo
                  </p>
                  <p className="text-2xl font-bold font-mono text-foreground mt-0.5">
                    {quarantineCounts.returned}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Retornados a mesón/nevera</p>
                </div>
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border border-red-200 bg-red-50/20 dark:bg-red-950/10 dark:border-red-900/40">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase text-red-700 dark:text-red-400">
                    Descartados por Daño
                  </p>
                  <p className="text-2xl font-bold font-mono text-foreground mt-0.5">
                    {quarantineCounts.discarded}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Bajas definitivas del sistema</p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-600">
                  <Trash2 className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de Frascos en Cuarentena */}
          <Card className="border border-border">
            <CardHeader className="p-5 pb-3 border-b border-border">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    Incidencias y Frascos Aislados
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Viales retenidos temporalmente por sospecha de alteración, falla térmica o reporte de fábrica.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative w-48 sm:w-60">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar frasco, reactivo, motivo..."
                      value={quarantineSearch}
                      onChange={(e) => setQuarantineSearch(e.target.value)}
                      className="pl-8 text-xs h-9"
                    />
                  </div>
                  <Select value={quarantineStatusFilter} onValueChange={setQuarantineStatusFilter}>
                    <SelectTrigger className="w-36 text-xs h-9">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos los Estados</SelectItem>
                      <SelectItem value="PENDING">Pendientes</SelectItem>
                      <SelectItem value="RETURNED_TO_INVENTORY">Liberados</SelectItem>
                      <SelectItem value="DISCARDED">Descartados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
                  Cargando incidentes de cuarentena...
                </div>
              ) : filteredIncidents.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-60" />
                  <p className="text-sm font-semibold">No hay frascos en cuarentena</p>
                  <p className="text-xs mt-1">
                    Todos los reactivos se encuentran operativos o no coinciden con los filtros aplicados.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="text-xs font-bold">Código de Frasco</TableHead>
                        <TableHead className="text-xs font-bold">Reactivo / Insumo</TableHead>
                        <TableHead className="text-xs font-bold">Lote / Cava</TableHead>
                        <TableHead className="text-xs font-bold">Motivo del Bloqueo</TableHead>
                        <TableHead className="text-xs font-bold">Reportado Por</TableHead>
                        <TableHead className="text-xs font-bold">Estado</TableHead>
                        <TableHead className="text-xs font-bold text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIncidents.map((inc) => {
                        const isPending = inc.resolutionStatus === "PENDING";
                        const isReturned =
                          inc.resolutionStatus === "RETURNED_TO_INVENTORY" ||
                          inc.resolutionStatus === "REINTEGRATED_TO_STOCK";
                        const isDiscarded =
                          inc.resolutionStatus === "DISCARDED" ||
                          inc.resolutionStatus === "WRITTEN_OFF_AS_LOSS";
                        const isSupplierReturn = inc.resolutionStatus === "RETURNED_TO_SUPPLIER";

                        return (
                          <TableRow key={inc.id} className="hover:bg-muted/30">
                            <TableCell className="font-mono text-xs font-bold">
                              {inc.unit?.unitCode || "N/A"}
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-xs text-foreground">
                                {inc.unit?.product?.name || "Reactivo"}
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate max-w-xs">
                                {inc.description}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="font-mono text-[11px]">
                                {inc.unit?.batch?.lotNumber || "N/A"}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {inc.unit?.fridge?.name || "Sin nevera"}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300">
                                {(inc.quarantineReason && QUARANTINE_REASONS[inc.quarantineReason]) ||
                                  (inc.incidentType && QUARANTINE_REASONS[inc.incidentType]) ||
                                  inc.incidentType ||
                                  inc.quarantineReason ||
                                  "Incidencia Técnica"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="font-medium text-foreground">
                                {inc.reportedBy?.fullName || "Personal"}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {new Date(inc.createdAt).toLocaleDateString("es-ES")}
                              </div>
                            </TableCell>
                            <TableCell>
                              {isPending && (
                                <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200 text-[10px] font-bold">
                                  En Cuarentena
                                </Badge>
                              )}
                              {isReturned && (
                                <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 text-[10px] font-bold">
                                  Liberado / Reintegrado
                                </Badge>
                              )}
                              {isDiscarded && (
                                <Badge variant="destructive" className="text-[10px] font-bold">
                                  Descartado (Baja)
                                </Badge>
                              )}
                              {isSupplierReturn && (
                                <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-200 text-[10px] font-bold">
                                  Devuelto a Proveedor
                                </Badge>
                              )}
                              {!isPending && !isReturned && !isDiscarded && !isSupplierReturn && (
                                <Badge variant="outline" className="text-[10px]">
                                  {String(inc.resolutionStatus || "Registrada").replace(/_/g, " ")}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <UniversalPdfDownloadButton
                                  document={
                                    <LabQualityIncidentPdfDocument
                                      incident={{
                                        incidentId: inc.code || inc.id,
                                        incidentType:
                                          (inc.quarantineReason && QUARANTINE_REASONS[inc.quarantineReason]) ||
                                          (inc.incidentType && QUARANTINE_REASONS[inc.incidentType]) ||
                                          inc.incidentType ||
                                          inc.quarantineReason ||
                                          "Incidencia Técnica de Calidad",
                                        date: inc.createdAt,
                                        equipmentName: inc.unit?.fridge?.name || inc.batch?.location?.name || "Nevera de Laboratorio",
                                        reportedBy: inc.reportedBy?.fullName || "Personal IDI",
                                        rootCause: inc.description || "Retención preventiva en cuarentena interna",
                                        correctiveAction: inc.resolutionNotes || "Aislamiento preventivo en cuarentena interna",
                                        disposition: inc.resolutionStatus || "PENDING",
                                        status: inc.resolutionStatus === "PENDING" ? "EN CUARENTENA" : (inc.resolutionStatus || "REGISTRADA"),
                                        items: [
                                          {
                                            id: inc.unit?.id || inc.batch?.id || inc.id,
                                            productName: inc.unit?.product?.name || inc.batch?.product?.name || "Insumo / Reactivo",
                                            sku: inc.unit?.product?.sku || inc.batch?.product?.sku || "S/S",
                                            lotNumber: inc.unit?.batch?.lotNumber || inc.batch?.lotNumber || "S/L",
                                            serialNumber: inc.unit?.unitCode || (inc.batch?.lotNumber ? `Lote ${inc.batch.lotNumber}` : "S/N"),
                                            volumeOrUnits: inc.unit?.unitCode ? `Vial ${inc.unit.unitCode}` : (inc.affectedUses ? `${inc.affectedUses} usos` : "1 frasco"),
                                            reason:
                                              (inc.quarantineReason && QUARANTINE_REASONS[inc.quarantineReason]) ||
                                              (inc.incidentType && QUARANTINE_REASONS[inc.incidentType]) ||
                                              inc.description ||
                                              "Retención preventiva",
                                          },
                                        ],
                                      }}
                                    />
                                  }
                                  fileName={`Acta_Incidencia_${String(inc.code || inc.id).replace(/[^a-zA-Z0-9_-]/g, "_")}`}
                                  buttonLabel="Acta"
                                  previewLabel="Ver"
                                  size="sm"
                                />

                                {isPending && isSupervisor && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedIncidentForResolve(inc);
                                        setResolveStatus("RETURNED_TO_INVENTORY");
                                        setResolveNotes("");
                                      }}
                                      className="text-[11px] h-7 px-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                    >
                                      <CheckCircle2 className="w-3 h-3 mr-1" />
                                      Liberar
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedIncidentForResolve(inc);
                                        setResolveStatus("DISCARDED");
                                        setResolveNotes("");
                                      }}
                                      className="text-[11px] h-7 px-2 text-rose-700 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                    >
                                      <Trash2 className="w-3 h-3 mr-1" />
                                      Descartar
                                    </Button>
                                  </>
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

        {/* ========================================================================= */}
        {/* PESTAÑA 2: BITÁCORA DE AUDITORÍA 5D & RENDIMIENTO INMUTABLE               */}
        {/* ========================================================================= */}
        <TabsContent value="audit5d" className="space-y-6 mt-4">
          {/* Métricas de 5 Dimensiones */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Card className="border border-blue-200 bg-blue-50/20 dark:bg-blue-950/10">
              <CardContent className="p-3">
                <span className="text-[10px] uppercase font-bold text-blue-600 block">
                  1. Pacientes
                </span>
                <span className="text-xl font-bold font-mono text-foreground">
                  {auditMetrics.patientUses}
                </span>
                <span className="text-[10px] text-muted-foreground block">determinaciones</span>
              </CardContent>
            </Card>

            <Card className="border border-emerald-200 bg-emerald-50/20 dark:bg-emerald-950/10">
              <CardContent className="p-3">
                <span className="text-[10px] uppercase font-bold text-emerald-600 block">
                  2. Controles (QC)
                </span>
                <span className="text-xl font-bold font-mono text-foreground">
                  {auditMetrics.controlUses}
                </span>
                <span className="text-[10px] text-muted-foreground block">pozos gastados</span>
              </CardContent>
            </Card>

            <Card className="border border-cyan-200 bg-cyan-50/20 dark:bg-cyan-950/10">
              <CardContent className="p-3">
                <span className="text-[10px] uppercase font-bold text-cyan-600 block">
                  3. Calibraciones
                </span>
                <span className="text-xl font-bold font-mono text-foreground">
                  {auditMetrics.calibUses}
                </span>
                <span className="text-[10px] text-muted-foreground block">pozos de curva</span>
              </CardContent>
            </Card>

            <Card className="border border-amber-200 bg-amber-50/20 dark:bg-amber-950/10">
              <CardContent className="p-3">
                <span className="text-[10px] uppercase font-bold text-amber-600 block">
                  4. Repeticiones
                </span>
                <span className="text-xl font-bold font-mono text-foreground">
                  {auditMetrics.repeatUses}
                </span>
                <span className="text-[10px] text-muted-foreground block">reensayos técnicos</span>
              </CardContent>
            </Card>

            <Card className="border border-red-200 bg-red-50/20 dark:bg-red-950/10">
              <CardContent className="p-3">
                <span className="text-[10px] uppercase font-bold text-red-600 block">
                  5. Mermas / Desperdicio
                </span>
                <span className="text-xl font-bold font-mono text-foreground">
                  {auditMetrics.wasteUses}
                </span>
                <span className="text-[10px] text-muted-foreground block">pérdidas operativas</span>
              </CardContent>
            </Card>

            <Card className="border border-border bg-card">
              <CardContent className="p-3">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Impacto Costo Total
                </span>
                <span className="text-xl font-bold font-mono text-foreground">
                  ${auditMetrics.totalCost.toFixed(2)}
                </span>
                <span className="text-[10px] text-muted-foreground block">USD consumido</span>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de Bitácora Inmutable */}
          <Card className="border border-border">
            <CardHeader className="p-5 pb-3 border-b border-border">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    Bitácora Inmutable de Consumos (5 Dimensiones)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Registro auditable de cada pozo y determinación consumida en el laboratorio clínico.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative w-48 sm:w-56">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar frasco, usuario..."
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      className="pl-8 text-xs h-9"
                    />
                  </div>

                  <Select value={conceptFilter} onValueChange={setConceptFilter}>
                    <SelectTrigger className="w-40 text-xs h-9">
                      <SelectValue placeholder="Concepto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todas las Dimensiones</SelectItem>
                      <SelectItem value="PATIENT">Pacientes</SelectItem>
                      <SelectItem value="CONTROL">Control de Calidad</SelectItem>
                      <SelectItem value="CALIBRATION">Calibración</SelectItem>
                      <SelectItem value="REPEAT">Repetición</SelectItem>
                      <SelectItem value="WASTE">Merma / Desperdicio</SelectItem>
                      <SelectItem value="PHYSICAL_AUDIT_ADJUSTMENT">Ajuste de Arqueo</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={areaFilter} onValueChange={setAreaFilter}>
                    <SelectTrigger className="w-36 text-xs h-9">
                      <SelectValue placeholder="Área" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todas las Áreas</SelectItem>
                      {areas.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <UniversalPdfDownloadButton
                    document={
                      <CustomReportPdfDocument
                        title="BITÁCORA INMUTABLE DE CONSUMO ANALÍTICO (5D)"
                        subtitle="TRAZABILIDAD DE CONSUMOS 5D (PACIENTES, CONTROL, CALIBRACIÓN, REPETICIÓN Y MERMA)"
                        documentNumber={`AUD-5D-${new Date().toISOString().slice(0, 10)}`}
                        orientation="landscape"
                        columns={[
                          { key: "date", label: "Fecha", width: "12%" },
                          { key: "unit", label: "Vial / Frasco", width: "18%", bold: true },
                          { key: "product", label: "Reactivo", width: "26%" },
                          { key: "concept", label: "Dimensión 5D", width: "16%" },
                          { key: "uses", label: "Usos", width: "10%", align: "right" },
                          { key: "cost", label: "Costo ($)", width: "10%", align: "right" },
                          { key: "user", label: "Operador", width: "8%", align: "center" },
                        ]}
                        rows={filteredAuditLogs.map((log) => ({
                          date: new Date(log.createdAt).toLocaleDateString("es-VE"),
                          unit: log.labReagentUnit?.unitCode || "S/C",
                          product: log.labReagentUnit?.product?.name || "Reactivo",
                          concept: CONCEPT_CONFIG[log.concept]?.label || log.concept,
                          uses: log.usesCount || 0,
                          cost: `$${Number(log.costImpact || 0).toFixed(2)}`,
                          user: log.user?.fullName?.split(" ")[0] || "Sistema",
                        }))}
                        summaryItems={[
                          { label: "Total Registros", value: filteredAuditLogs.length },
                          { label: "Determinaciones Pacientes", value: auditMetrics.patientUses },
                          { label: "Controles y Calibración", value: auditMetrics.controlUses + auditMetrics.calibUses },
                          { label: "Mermas y Repeticiones", value: auditMetrics.wasteUses + auditMetrics.repeatUses },
                          { label: "Impacto Costo Total", value: `$${auditMetrics.totalCost.toFixed(2)} USD` },
                        ]}
                      />
                    }
                    fileName={`Bitacora_Auditoria_5D_${new Date().toISOString().slice(0, 10)}`}
                    buttonLabel="Bitácora PDF"
                    previewLabel="Vista Previa"
                    size="sm"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loadingLogs ? (
                <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
                  Cargando bitácora inmutable de consumos...
                </div>
              ) : filteredAuditLogs.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <Layers className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold">No hay registros de consumo en la bitácora</p>
                  <p className="text-xs mt-1">
                    Los registros se generan automáticamente al cerrar corridas, ejecutar consumos rápidos o reconciliar arqueos.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="text-xs font-bold">Fecha / Hora</TableHead>
                        <TableHead className="text-xs font-bold">Operador</TableHead>
                        <TableHead className="text-xs font-bold">Corrida / Examen</TableHead>
                        <TableHead className="text-xs font-bold">Frasco / Reactivo</TableHead>
                        <TableHead className="text-xs font-bold">Dimensión 5D</TableHead>
                        <TableHead className="text-xs font-bold text-right">Pozos / Usos</TableHead>
                        <TableHead className="text-xs font-bold text-right">Impacto Costo</TableHead>
                        <TableHead className="text-xs font-bold">Notas / Justificación</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAuditLogs.map((log) => {
                        const conceptCfg = CONCEPT_CONFIG[log.concept] ?? CONCEPT_CONFIG.PATIENT;
                        const Icon = conceptCfg.icon;

                        return (
                          <TableRow key={log.id} className="hover:bg-muted/30">
                            <TableCell className="text-xs font-mono">
                              {new Date(log.createdAt).toLocaleDateString("es-ES", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </TableCell>
                            <TableCell className="text-xs font-medium">
                              {log.user?.fullName || "Personal"}
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="font-mono text-[11px] font-semibold text-foreground">
                                {log.weeklyRun?.code || "Consumo Directo"}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {log.labExam?.name || log.labArea?.name || "General"}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="font-mono text-xs font-bold">
                                {log.labReagentUnit?.unitCode || "N/A"}
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                                {log.labReagentUnit?.product?.name || "Reactivo"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn("text-[10px] font-semibold flex items-center gap-1 w-fit", conceptCfg.colorClass)}
                              >
                                <Icon className="w-2.5 h-2.5" />
                                {conceptCfg.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs font-bold">
                              {log.usesCount}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              ${Number(log.costImpact ?? 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                              {log.notes || "-"}
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
      {/* MODAL: AISLAR FRASCO A CUARENTENA                                          */}
      {/* ========================================================================= */}
      <Dialog open={isNewQuarantineOpen} onOpenChange={setIsNewQuarantineOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              Aislar Frasco a Cuarentena Preventiva
            </DialogTitle>
            <DialogDescription className="text-xs">
              Bloquee el frasco para impedir su uso en corridas analíticas hasta que se evalúe técnicamente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateQuarantine} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs">Frasco Activo a Bloquear *</Label>
              <Select
                value={newQuarantineData.unitId}
                onValueChange={(val) => setNewQuarantineData({ ...newQuarantineData, unitId: val })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Seleccione frasco operativo" />
                </SelectTrigger>
                <SelectContent>
                  {activeUnits.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.unitCode} &bull; {u.product?.name} (Lote: {u.batch?.lotNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Motivo de Cuarentena *</Label>
              <Select
                value={newQuarantineData.quarantineReason}
                onValueChange={(val) =>
                  setNewQuarantineData({
                    ...newQuarantineData,
                    quarantineReason: val as QuarantineReason,
                  })
                }
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Seleccione motivo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(QUARANTINE_REASONS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Área Afectada (Opcional)</Label>
              <Select
                value={newQuarantineData.labAreaId}
                onValueChange={(val) =>
                  setNewQuarantineData({ ...newQuarantineData, labAreaId: val })
                }
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Seleccione área de laboratorio" />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Descripción y Hallazgos * (mínimo 10 caracteres)</Label>
              <Textarea
                placeholder="Describa el comportamiento anormal, turbidez, temperatura registrada o alarma de equipo..."
                value={newQuarantineData.description}
                onChange={(e) =>
                  setNewQuarantineData({ ...newQuarantineData, description: e.target.value })
                }
                className="text-xs resize-none h-20"
                required
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewQuarantineOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingQuarantine}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
              >
                {submittingQuarantine ? "Bloqueando..." : "Confirmar Bloqueo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: RESOLVER CUARENTENA TÉCNICA                                        */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(selectedIncidentForResolve)}
        onOpenChange={(open) => !open && setSelectedIncidentForResolve(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Resolución Técnica de Cuarentena
            </DialogTitle>
            <DialogDescription className="text-xs">
              Determine el dictamen de calidad para el frasco {selectedIncidentForResolve?.unit?.unitCode}.
            </DialogDescription>
          </DialogHeader>

          {selectedIncidentForResolve && (
            <form onSubmit={handleResolveQuarantine} className="space-y-4">
              <div className="bg-muted/50 p-3 rounded-lg border border-border space-y-1 text-xs">
                <div className="font-semibold text-foreground">
                  {selectedIncidentForResolve.unit?.product?.name}
                </div>
                <div className="text-muted-foreground">
                  Motivo original:{" "}
                  {(selectedIncidentForResolve.quarantineReason &&
                    QUARANTINE_REASONS[selectedIncidentForResolve.quarantineReason]) ||
                    (selectedIncidentForResolve.incidentType &&
                      QUARANTINE_REASONS[selectedIncidentForResolve.incidentType]) ||
                    selectedIncidentForResolve.incidentType ||
                    selectedIncidentForResolve.quarantineReason ||
                    "N/A"}
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Dictamen de Calidad *</Label>
                <Select value={resolveStatus} onValueChange={setResolveStatus}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Seleccione dictamen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RETURNED_TO_INVENTORY">
                      Liberar y Retornar a Inventario Operativo
                    </SelectItem>
                    <SelectItem value="DISCARDED">
                      Confirmar Daño y Descartar Definitivamente
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Justificación Técnica del Dictamen *</Label>
                <Textarea
                  placeholder="Detalle las pruebas de control realizadas o la confirmación de alteración irrecuperable..."
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  className="text-xs resize-none h-20"
                  required
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedIncidentForResolve(null)}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingResolve}
                  className={cn(
                    "text-xs text-white",
                    resolveStatus === "RETURNED_TO_INVENTORY"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-rose-600 hover:bg-rose-700"
                  )}
                >
                  {submittingResolve
                    ? "Guardando..."
                    : resolveStatus === "RETURNED_TO_INVENTORY"
                    ? "Liberar Frasco"
                    : "Confirmar Descarte"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
