"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { LabWorkflowService } from "@/services/lab-workflow.service";
import { AuthService } from "@/services/auth.service";
import type { LabWeeklyRun, LabArea, LabExam } from "@/types/lab-workflow";
import type { LabReagentUnitItem } from "@/types/laboratory";
import { toast } from "@/utils/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  UniversalPdfDownloadButton,
  LabRunPdfDocument,
} from "@/components/pdf";
import {
  FlaskConical,
  PlusCircle,
  RefreshCw,
  Calendar,
  Activity,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle,
  Zap,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  XCircle,
  AlertTriangle,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Schema para Apertura de Corrida Semanal
const createRunSchema = z.object({
  labAreaId: z.string().min(1, "Seleccione el área operativa"),
  labExamId: z.string().min(1, "Seleccione el examen a procesar"),
  weekStartDate: z.string().min(1, "Fecha de inicio requerida"),
  weekEndDate: z.string().min(1, "Fecha de cierre requerida"),
  notes: z.string().optional(),
});

type CreateRunFormValues = z.infer<typeof createRunSchema>;

// Schema para Consumo Rápido / Prueba Individual (1 Clic)
const quickConsumeSchema = z.object({
  labAreaId: z.string().min(1, "Seleccione el área operativa"),
  examId: z.string().min(1, "Seleccione el examen realizado"),
  unitId: z.string().min(1, "Seleccione el frasco / kit utilizado"),
  validPatientsCount: z.number().min(1, "Debe registrar al menos 1 paciente"),
  controlUses: z.number().min(0),
  repeatUses: z.number().min(0),
  isPhysicallyExhausted: z.boolean(),
  notes: z.string().optional(),
});

type QuickConsumeFormValues = z.infer<typeof quickConsumeSchema>;

export default function LabRunsPage() {
  const [runs, setRuns] = useState<LabWeeklyRun[]>([]);
  const [userAreas, setUserAreas] = useState<LabArea[]>([]);
  const [exams, setExams] = useState<LabExam[]>([]);
  const [availableUnits, setAvailableUnits] = useState<LabReagentUnitItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros de la Tabla
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [areaFilter, setAreaFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Modales
  const [isNewRunOpen, setIsNewRunOpen] = useState<boolean>(false);
  const [isQuickConsumeOpen, setIsQuickConsumeOpen] = useState<boolean>(false);
  const [submittingRun, setSubmittingRun] = useState<boolean>(false);
  const [submittingQuick, setSubmittingQuick] = useState<boolean>(false);
  const [quickAdvancedOpen, setQuickAdvancedOpen] = useState<boolean>(false);

  // Usuario actual
  const currentUser = useMemo(() => AuthService.getCurrentUser(), []);
  const isSupervisor = useMemo(() => {
    const roles = currentUser?.roles || [];
    return roles.some((r) =>
      ["ADMINISTRADOR", "COORDINADOR_LABORATORIO", "COORDINADOR"].includes(r)
    );
  }, [currentUser]);

  // Fechas por defecto lunes a domingo
  const defaultDates = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    const sunday = new Date(now.setDate(diff + 6));
    return {
      start: monday.toISOString().split("T")[0],
      end: sunday.toISOString().split("T")[0],
    };
  }, []);

  // Formulario 1: Nueva Corrida Semanal
  const runForm = useForm<CreateRunFormValues>({
    resolver: zodResolver(createRunSchema),
    defaultValues: {
      labAreaId: "",
      labExamId: "",
      weekStartDate: defaultDates.start,
      weekEndDate: defaultDates.end,
      notes: "",
    },
  });

  // Formulario 2: Consumo Rápido
  const quickForm = useForm<QuickConsumeFormValues>({
    resolver: zodResolver(quickConsumeSchema),
    defaultValues: {
      labAreaId: "",
      examId: "",
      unitId: "",
      validPatientsCount: 1,
      controlUses: 0,
      repeatUses: 0,
      isPhysicallyExhausted: false,
      notes: "",
    },
  });

  const selectedRunAreaId = runForm.watch("labAreaId");
  const selectedQuickAreaId = quickForm.watch("labAreaId");
  const selectedQuickUnitId = quickForm.watch("unitId");

  // Carga de datos
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [runsData, myAreas, allAreas, examsData, unitsData] = await Promise.all([
        LabWorkflowService.getWeeklyRuns(),
        LabWorkflowService.getMyLabAreas(),
        LabWorkflowService.getLabAreas(),
        LabWorkflowService.getLabExams(),
        LabWorkflowService.getLabUnits(),
      ]);
      const areasData = myAreas.length > 0 ? myAreas : allAreas;
      setRuns(runsData);
      setUserAreas(areasData);
      setExams(examsData);
      setAvailableUnits(unitsData);

      if (areasData.length > 0) {
        if (!runForm.getValues("labAreaId")) {
          runForm.setValue("labAreaId", String(areasData[0].id));
        }
        if (!quickForm.getValues("labAreaId")) {
          quickForm.setValue("labAreaId", String(areasData[0].id));
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cargar corridas semanales";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [runForm, quickForm]);

  useEffect(() => {
    let active = true;
    Promise.all([
      LabWorkflowService.getWeeklyRuns(),
      LabWorkflowService.getMyLabAreas(),
      LabWorkflowService.getLabAreas(),
      LabWorkflowService.getLabExams(),
      LabWorkflowService.getLabUnits(),
    ])
      .then(([runsData, myAreas, allAreas, examsData, unitsData]) => {
        if (!active) return;
        const areasData = myAreas.length > 0 ? myAreas : allAreas;
        setRuns(runsData);
        setUserAreas(areasData);
        setExams(examsData);
        setAvailableUnits(unitsData);

        if (areasData.length > 0) {
          if (!runForm.getValues("labAreaId")) {
            runForm.setValue("labAreaId", String(areasData[0].id));
          }
          if (!quickForm.getValues("labAreaId")) {
            quickForm.setValue("labAreaId", String(areasData[0].id));
          }
        }
      })
      .catch((err: unknown) => {
        if (!active) return;
        const msg = err instanceof Error ? err.message : "Error al cargar corridas semanales";
        setError(msg);
        toast.error(msg);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [runForm, quickForm]);

  // Exámenes filtrados por área para el modal de nueva corrida
  const filteredExamsForRun = useMemo(() => {
    return exams.filter((e) => !selectedRunAreaId || String(e.areaId) === selectedRunAreaId);
  }, [exams, selectedRunAreaId]);

  // Exámenes filtrados por área para el modal de consumo rápido
  const filteredExamsForQuick = useMemo(() => {
    return exams.filter((e) => !selectedQuickAreaId || String(e.areaId) === selectedQuickAreaId);
  }, [exams, selectedQuickAreaId]);

  // Frascos aptos para consumo rápido en orden FEFO
  const fefoUnitsForQuick = useMemo(() => {
    const valid = availableUnits.filter((u) => {
      // Excluir reactivos agotados o en cuarentena
      if (u.status !== "EN_USO" && u.status !== "SELLADO") return false;
      // Excluir reactivos de investigación en rutina clínica
      if (u.ownershipType === "RESEARCH_PROJECT") return false;
      // Filtrar por área si está asignada
      if (selectedQuickAreaId && u.assignedLabAreaId && String(u.assignedLabAreaId) !== selectedQuickAreaId) {
        return false;
      }
      return true;
    });

    // Ordenamiento FEFO: EN_USO primero, luego expiración más próxima
    return [...valid].sort((a, b) => {
      if (a.status === "EN_USO" && b.status !== "EN_USO") return -1;
      if (b.status === "EN_USO" && a.status !== "EN_USO") return 1;
      const dateA = a.expirationDate ? new Date(a.expirationDate).getTime() : Infinity;
      const dateB = b.expirationDate ? new Date(b.expirationDate).getTime() : Infinity;
      return dateA - dateB;
    });
  }, [availableUnits, selectedQuickAreaId]);

  // Auto-seleccionar primer frasco FEFO al cambiar área o examen en consumo rápido
  useEffect(() => {
    if (fefoUnitsForQuick.length > 0 && !quickForm.getValues("unitId")) {
      quickForm.setValue("unitId", String(fefoUnitsForQuick[0].id));
    }
  }, [fefoUnitsForQuick, quickForm]);

  // Frasco seleccionado en consumo rápido
  const selectedQuickUnit = useMemo(() => {
    return availableUnits.find((u) => String(u.id) === selectedQuickUnitId) || null;
  }, [availableUnits, selectedQuickUnitId]);

  const isQuickUnitExpired = useMemo(() => {
    if (!selectedQuickUnit?.expirationDate) return false;
    const exp = new Date(selectedQuickUnit.expirationDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    exp.setHours(0, 0, 0, 0);
    return exp < today;
  }, [selectedQuickUnit]);

  // Envío Formulario 1: Nueva Corrida Semanal
  const onSubmitRun = async (values: CreateRunFormValues) => {
    setSubmittingRun(true);
    try {
      await LabWorkflowService.createWeeklyRun({
        labAreaId: Number(values.labAreaId),
        labExamId: Number(values.labExamId),
        weekStartDate: values.weekStartDate,
        weekEndDate: values.weekEndDate,
        notes: values.notes?.trim() || undefined,
      });

      toast.success("Corrida semanal aperturada exitosamente.");
      setIsNewRunOpen(false);
      runForm.reset({
        labAreaId: userAreas.length > 0 ? String(userAreas[0].id) : "",
        labExamId: "",
        weekStartDate: defaultDates.start,
        weekEndDate: defaultDates.end,
        notes: "",
      });
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al aperturar corrida semanal";
      toast.error(msg);
    } finally {
      setSubmittingRun(false);
    }
  };

  // Envío Formulario 2: Consumo Rápido (1 Clic)
  const onSubmitQuickConsume = async (values: QuickConsumeFormValues) => {
    if (!selectedQuickUnit) {
      toast.error("Seleccione un frasco de reactivo válido.");
      return;
    }

    if (isQuickUnitExpired && !isSupervisor) {
      toast.error("El reactivo seleccionado está vencido y requiere aprobación de supervisión.");
      return;
    }

    setSubmittingQuick(true);
    try {
      const closedRun = await LabWorkflowService.quickConsumeReagent({
        examId: Number(values.examId),
        labAreaId: Number(values.labAreaId),
        unitId: values.unitId,
        validPatientsCount: Number(values.validPatientsCount),
        controlUses: Number(values.controlUses || 0),
        repeatUses: Number(values.repeatUses || 0),
        isPhysicallyExhausted: values.isPhysicallyExhausted,
        notes: values.notes?.trim() || undefined,
      });

      const totalDeducted =
        closedRun.consumptions?.[0]?.totalDeductedUses ?? values.validPatientsCount;
      toast.success(
        `Prueba rápida liquidada exitosamente: ${totalDeducted} pozos descontados del lote.`
      );

      setIsQuickConsumeOpen(false);
      quickForm.reset({
        labAreaId: userAreas.length > 0 ? String(userAreas[0].id) : "",
        examId: "",
        unitId: "",
        validPatientsCount: 1,
        controlUses: 0,
        repeatUses: 0,
        isPhysicallyExhausted: false,
        notes: "",
      });
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar el consumo rápido";
      toast.error(msg);
    } finally {
      setSubmittingQuick(false);
    }
  };

  // Badge de Estado
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN_ACCUMULATING":
      case "IN_PROGRESS":
      case "PENDING_RECONCILIATION":
        return (
          <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-[11px] gap-1">
            <Clock className="w-3 h-3 animate-pulse" />
            Abierta / En Curso
          </Badge>
        );
      case "CLOSED_RECONCILED":
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Cerrada y Conciliada
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="destructive" className="font-medium text-[11px] gap-1">
            <AlertTriangle className="w-3 h-3" />
            Cancelada / Fallida
          </Badge>
        );
      default: {
        const translations: Record<string, string> = {
          OPEN_ACCUMULATING: "Abierta / En Curso",
          IN_PROGRESS: "En Curso",
          PENDING_RECONCILIATION: "Pendiente Conciliación",
          CLOSED_RECONCILED: "Cerrada y Conciliada",
          CANCELLED: "Cancelada / Fallida",
          LIQUIDATED: "Liquidada",
          FAILED: "Fallida",
        };
        return <Badge variant="outline">{translations[status] || status.replace(/_/g, " ")}</Badge>;
      }
    }
  };

  // Filtrado reactivo de la tabla de corridas
  const filteredRuns = useMemo(() => {
    return runs.filter((r) => {
      // Filtro de estado
      if (statusFilter === "OPEN" && r.status !== "OPEN_ACCUMULATING" && (r.status as string) !== "IN_PROGRESS" && (r.status as string) !== "PENDING_RECONCILIATION") return false;
      if (statusFilter === "CLOSED" && r.status !== "CLOSED_RECONCILED") return false;
      if (statusFilter === "CANCELLED" && r.status !== "CANCELLED") return false;

      // Filtro de área
      if (areaFilter !== "ALL" && String(r.labAreaId) !== areaFilter) return false;

      // Búsqueda por texto
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const codeMatch = r.code.toLowerCase().includes(q);
        const examMatch = r.labExam?.name?.toLowerCase().includes(q);
        const areaMatch = r.labArea?.name?.toLowerCase().includes(q);
        if (!codeMatch && !examMatch && !areaMatch) return false;
      }

      return true;
    });
  }, [runs, statusFilter, areaFilter, searchTerm]);

  return (
    <div className="space-y-6">
      {/* BARRA SUPERIOR DE ACCIONES */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-emerald-600" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Corridas de Laboratorio Clínico
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Apertura de bloques semanales, registros de consumo rápido y conciliación analítica 5D.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadData()}
            disabled={loading}
            className="text-xs gap-1.5 h-9"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Actualizar
          </Button>

          {/* BOTÓN FASE 3B: Consumo Rápido (Prueba Individual / Emergencia) */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsQuickConsumeOpen(true)}
            className="text-xs gap-1.5 h-9 border-emerald-400 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            Consumo Rápido (Prueba Individual)
          </Button>

          {/* Botón: Aperturar Corrida Semanal */}
          <Button
            size="sm"
            onClick={() => setIsNewRunOpen(true)}
            className="text-xs gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            <PlusCircle className="w-4 h-4" />
            Aperturar Corrida Semanal
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Error en el Módulo</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* FILTROS Y BÚSQUEDA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/20 p-3 rounded-xl border border-border/80">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {/* Tabs rápidas de Estado */}
          <div className="inline-flex items-center gap-1 bg-background p-1 rounded-lg border text-xs">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all font-medium",
                statusFilter === "ALL"
                  ? "bg-muted text-foreground font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Todas ({runs.length})
            </button>
            <button
              onClick={() => setStatusFilter("OPEN")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1",
                statusFilter === "OPEN"
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Abiertas
            </button>
            <button
              onClick={() => setStatusFilter("CLOSED")}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all font-medium",
                statusFilter === "CLOSED"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Cerradas
            </button>
          </div>

          {/* Filtro por Área */}
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="w-[180px] h-8 text-xs bg-background">
              <SelectValue placeholder="Todas las áreas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas las áreas</SelectItem>
              {userAreas.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Búsqueda por texto */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por código o examen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 pl-8 text-xs bg-background"
          />
        </div>
      </div>

      {/* TABLA PRINCIPAL DE CORRIDAS */}
      <Card className="border border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/60">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Listado de Corridas Analíticas</span>
            </CardTitle>
            <span className="text-xs text-muted-foreground">
              Mostrando {filteredRuns.length} de {runs.length} corridas
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="text-xs">
                  <TableHead className="w-[140px]">Código & Tipo</TableHead>
                  <TableHead>Examen Clínico</TableHead>
                  <TableHead>Área Operativa</TableHead>
                  <TableHead>Período / Fecha</TableHead>
                  <TableHead className="text-right">Pacientes</TableHead>
                  <TableHead className="text-right">Pozos Deducidos</TableHead>
                  <TableHead className="text-right">Costo / Examen ($)</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {filteredRuns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      No se encontraron corridas registradas con los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRuns.map((run) => {
                    const isQuick = run.code.startsWith("RUN-QC");
                    const isOpen =
                      run.status === "OPEN_ACCUMULATING" ||
                      (run.status as string) === "IN_PROGRESS" ||
                      (run.status as string) === "PENDING_RECONCILIATION";
                    const isClosed = run.status === "CLOSED_RECONCILED";

                    // Total de pozos deducidos
                    const totalDeducted = run.consumptions?.reduce(
                      (acc, c) => acc + Number(c.totalDeductedUses ?? c.totalUses ?? 0),
                      0
                    );

                    return (
                      <TableRow key={run.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="font-mono font-bold text-foreground flex items-center gap-1.5">
                            {run.code}
                          </div>
                          {isQuick ? (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] px-1.5 py-0 mt-0.5 border-amber-300">
                              Prueba Rápida
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-0.5 text-muted-foreground">
                              Semanal
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="font-semibold text-foreground">{run.labExam.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            Código: {run.labExam.code}
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {run.labArea.name}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {isQuick
                                ? new Date(run.weekStartDate).toLocaleDateString()
                                : `${new Date(run.weekStartDate).toLocaleDateString()} - ${new Date(
                                    run.weekEndDate
                                  ).toLocaleDateString()}`}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="text-right font-mono font-bold text-foreground">
                          {run.totalValidPatientExams}
                        </TableCell>

                        <TableCell className="text-right font-mono text-muted-foreground">
                          {totalDeducted && totalDeducted > 0 ? (
                            <strong className="text-foreground">{totalDeducted}</strong>
                          ) : (
                            "—"
                          )}
                        </TableCell>

                        <TableCell className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {run.effectiveCostPerExam
                            ? `$${Number(run.effectiveCostPerExam).toFixed(2)}`
                            : "—"}
                        </TableCell>

                        <TableCell>{getStatusBadge(run.status)}</TableCell>

                        <TableCell className="text-right">
                          {isOpen ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <UniversalPdfDownloadButton
                                document={<LabRunPdfDocument run={run} />}
                                fileName={`Ficha_Corrida_${String(run.code || run.id).replace(/[^a-zA-Z0-9_-]/g, "_")}`}
                                buttonLabel="Ficha PDF"
                                previewLabel="Ver"
                                size="sm"
                              />
                              <Button
                                asChild
                                size="sm"
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1 font-semibold"
                              >
                                <Link href={`/lab/runs/${run.id}/close`}>
                                  Cerrar y Descontar
                                  <ArrowRight className="w-3 h-3" />
                                </Link>
                              </Button>
                            </div>
                          ) : isClosed ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Liquidado
                              </span>
                              <UniversalPdfDownloadButton
                                document={<LabRunPdfDocument run={run} />}
                                fileName={`Corrida_${String(run.code || run.id).replace(/[^a-zA-Z0-9_-]/g, "_")}`}
                                buttonLabel="Reporte PDF"
                                previewLabel="Ver"
                                size="sm"
                              />
                            </div>
                          ) : (
                            <span className="text-[11px] text-rose-500 font-semibold flex items-center gap-1 justify-end">
                              <XCircle className="w-3.5 h-3.5" />
                              Fallida (E5)
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL 1: APERTURAR CORRIDA SEMANAL */}
      <Dialog open={isNewRunOpen} onOpenChange={setIsNewRunOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-foreground">
              <FlaskConical className="w-5 h-5 text-emerald-600" />
              <span>Aperturar Corrida Semanal de Pacientes</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Habilita el período de procesamiento del examen para acumular pacientes durante la semana epidemiológica.
            </DialogDescription>
          </DialogHeader>

          <Form {...runForm}>
            <form onSubmit={runForm.handleSubmit(onSubmitRun)} className="space-y-4 py-2">
              <FormField
                control={runForm.control}
                name="labAreaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Área Operativa</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val);
                        runForm.setValue("labExamId", "");
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="text-xs h-9">
                          <SelectValue placeholder="Seleccione tu área" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {userAreas.map((a) => (
                          <SelectItem key={a.id} value={String(a.id)}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={runForm.control}
                name="labExamId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Examen a Procesar</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="text-xs h-9">
                          <SelectValue placeholder="Seleccione el examen de catálogo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredExamsForRun.map((e) => (
                          <SelectItem key={e.id} value={String(e.id)}>
                            {e.code} &bull; {e.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={runForm.control}
                  name="weekStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">Inicio de Semana</FormLabel>
                      <FormControl>
                        <Input type="date" className="text-xs h-9 font-mono" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={runForm.control}
                  name="weekEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">Cierre de Semana</FormLabel>
                      <FormControl>
                        <Input type="date" className="text-xs h-9 font-mono" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={runForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Notas Iniciales (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observaciones de equipo, guardia o calibración inicial..."
                        className="text-xs min-h-[60px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNewRunOpen(false)}
                  disabled={submittingRun}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingRun}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-semibold"
                >
                  {submittingRun && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Aperturar Corrida
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: CONSUMO RÁPIDO / PRUEBA INDIVIDUAL (FASE 3B) */}
      <Dialog open={isQuickConsumeOpen} onOpenChange={setIsQuickConsumeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-foreground">
              <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span>Consumo Rápido (Prueba Individual / Urgencia)</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Liquida pruebas de cassette, tiras o emergencias en 1 clic manteniendo la trazabilidad 5D y el costo analítico.
            </DialogDescription>
          </DialogHeader>

          <Form {...quickForm}>
            <form onSubmit={quickForm.handleSubmit(onSubmitQuickConsume)} className="space-y-4 py-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Área */}
                <FormField
                  control={quickForm.control}
                  name="labAreaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">Área</FormLabel>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val);
                          quickForm.setValue("examId", "");
                          quickForm.setValue("unitId", "");
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="text-xs h-9">
                            <SelectValue placeholder="Seleccione área" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {userAreas.map((a) => (
                            <SelectItem key={a.id} value={String(a.id)}>
                              {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Examen */}
                <FormField
                  control={quickForm.control}
                  name="examId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold">Examen</FormLabel>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val);
                          quickForm.setValue("unitId", "");
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="text-xs h-9">
                            <SelectValue placeholder="Seleccione examen" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {filteredExamsForQuick.map((e) => (
                            <SelectItem key={e.id} value={String(e.id)}>
                              {e.code} &bull; {e.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Frasco / Kit en uso (FEFO) */}
              <FormField
                control={quickForm.control}
                name="unitId"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel className="text-xs font-semibold">Frasco / Kit en Nevera (FEFO)</FormLabel>
                      {selectedQuickUnit && (
                        <span className="text-[10px] text-muted-foreground font-mono">
                          Saldo:{" "}
                          <strong className="text-emerald-600">
                            {selectedQuickUnit.remainingUses ?? selectedQuickUnit.currentVolume} usos
                          </strong>
                        </span>
                      )}
                    </div>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="text-xs h-9 font-mono">
                          <SelectValue placeholder="Seleccione el frasco..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-60">
                        {fefoUnitsForQuick.map((u) => {
                          const rem = u.remainingUses ?? u.currentVolume;
                          const isEnUso = u.status === "EN_USO";
                          return (
                            <SelectItem key={String(u.id)} value={String(u.id)} className="text-xs font-mono">
                              {u.unitCode} &bull; {u.product.name} ({rem} disp.) &bull;{" "}
                              {isEnUso ? "EN USO" : "SELLADO"}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />

                    {isQuickUnitExpired && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1">
                        ⚠ Reactivo vencido. Solo un supervisor puede liquidar este frasco.
                      </p>
                    )}
                  </FormItem>
                )}
              />

              {/* Pacientes atendidos */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={quickForm.control}
                  name="validPatientsCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-foreground">Pacientes Válidos</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          className="h-9 text-base font-mono font-bold"
                          value={field.value ?? 1}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? 1 : Number(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Switch: ¿Se terminó el frasco? */}
                <FormField
                  control={quickForm.control}
                  name="isPhysicallyExhausted"
                  render={({ field }) => (
                    <FormItem className="flex flex-col justify-end">
                      <div className="flex items-center gap-2 p-2 rounded-lg border bg-muted/20 h-9">
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                        <span className="text-[11px] font-semibold text-foreground select-none">
                          ¿Se agotó el frasco?
                        </span>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              {/* Opciones Avanzadas Plegables */}
              <div className="border rounded-lg p-2.5 bg-muted/10 space-y-2">
                <button
                  type="button"
                  onClick={() => setQuickAdvancedOpen(!quickAdvancedOpen)}
                  className="w-full flex items-center justify-between text-xs text-muted-foreground hover:text-foreground font-medium select-none"
                >
                  <span className="flex items-center gap.1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Opciones adicionales (Controles, Repeticiones, Notas)
                  </span>
                  {quickAdvancedOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {quickAdvancedOpen && (
                  <div className="space-y-3 pt-2 border-t">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={quickForm.control}
                        name="controlUses"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px]">Controles gastados</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                className="h-8 text-xs font-mono"
                                value={field.value ?? 0}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value === "" ? 0 : Number(e.target.value)
                                  )
                                }
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={quickForm.control}
                        name="repeatUses"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px]">Repeticiones</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                className="h-8 text-xs font-mono"
                                value={field.value ?? 0}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value === "" ? 0 : Number(e.target.value)
                                  )
                                }
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={quickForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[11px]">Notas de Urgencia (Opcional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej. Paciente crítico en shock room..." className="h-8 text-xs" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsQuickConsumeOpen(false)}
                  disabled={submittingQuick}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingQuick || (isQuickUnitExpired && !isSupervisor)}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-semibold"
                >
                  {submittingQuick ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5 fill-current" />
                  )}
                  Registrar & Liquidar en 1 Clic
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
