"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { LabWorkflowService } from "@/services/lab-workflow.service";
import { AuthService } from "@/services/auth.service";
import type { LabWeeklyRun } from "@/types/lab-workflow";
import type { LabReagentUnitItem } from "@/types/laboratory";
import { toast } from "@/utils/toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FlaskConical,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Calculator,
  SlidersHorizontal,
  Sparkles,
  ChevronDown,
  ChevronUp,
  XCircle,
  ShieldAlert,
  Layers,
  Info,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  UniversalPdfDownloadButton,
  LabRunPdfDocument,
} from "@/components/pdf";

const closeRunSchema = z.object({
  selectedUnitId: z.string().min(1, "Debe seleccionar un frasco de reactivo"),
  totalValidPatientExams: z.number().min(0, "Total de pacientes debe ser >= 0"),
  notes: z.string().optional(),
  isPhysicallyExhausted: z.boolean(),
  allowExpiredOverride: z.boolean(),
  rolloverMode: z.enum(["none", "rollover", "overyield"]),
  rolloverUnitId: z.string().optional().or(z.literal("")),
  // Opciones Avanzadas
  calibratorUses: z.number().min(0),
  controlUses: z.number().min(0),
  repeatUses: z.number().min(0),
  repeatReason: z.string().optional().or(z.literal("")),
  repeatNotes: z.string().optional(),
  wasteUses: z.number().min(0),
  externalCalibratorUnitId: z.string().optional().or(z.literal("")),
});

type CloseRunFormValues = z.infer<typeof closeRunSchema>;

export default function CloseWeeklyRunPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const runId = params?.id ? Number(params.id) : 0;

  // Estado del usuario autenticado para matriz RBAC
  const currentUser = useMemo(() => AuthService.getCurrentUser(), []);
  const isSupervisor = useMemo(() => {
    const roles = currentUser?.roles || [];
    return roles.some((r) =>
      ["ADMINISTRADOR", "COORDINADOR_LABORATORIO", "COORDINADOR"].includes(r)
    );
  }, [currentUser]);

  // Datos de corrida y unidades
  const [run, setRun] = useState<LabWeeklyRun | null>(null);
  const [availableUnits, setAvailableUnits] = useState<LabReagentUnitItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Control de interfaz colapsable (Modo Avanzado)
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(false);

  // Modal de Acción Rápida: Corrida Fallida por Calibración (Caso Borde E5)
  const [failDialogOpen, setFailDialogOpen] = useState<boolean>(false);
  const [failWastedWells, setFailWastedWells] = useState<number>(24);
  const [failExhausted, setFailExhausted] = useState<boolean>(false);
  const [failNotes, setFailNotes] = useState<string>("");
  const [failAutoClone, setFailAutoClone] = useState<boolean>(true);
  const [failingRun, setFailingRun] = useState<boolean>(false);

  const form = useForm<CloseRunFormValues>({
    resolver: zodResolver(closeRunSchema),
    defaultValues: {
      selectedUnitId: "",
      totalValidPatientExams: 0,
      notes: "",
      isPhysicallyExhausted: false,
      allowExpiredOverride: false,
      rolloverMode: "none",
      rolloverUnitId: "",
      calibratorUses: 0,
      controlUses: 0,
      repeatUses: 0,
      repeatReason: "",
      repeatNotes: "",
      wasteUses: 0,
      externalCalibratorUnitId: "",
    },
  });

  // Carga de Corrida y Unidades disponibles (ordenadas por FEFO)
  const loadRunData = useCallback(async () => {
    if (!runId) return;
    setLoading(true);
    setError(null);
    try {
      const [runData, unitsData] = await Promise.all([
        LabWorkflowService.getWeeklyRunById(runId),
        LabWorkflowService.getLabUnits(),
      ]);
      setRun(runData);

      // Filtrar frascos aptos para Mesón Analítico: EN_USO o SELLADO
      // Excluir Cuarentena, Descartados o Agotados
      const validUnits = unitsData.filter(
        (u) =>
          u.status === "EN_USO" ||
          u.status === "SELLADO"
      );

      // Algoritmo de Priorización FEFO:
      // 1. Frasco en estado EN_USO en el área primero
      // 2. Frasco SELLADO con vencimiento más próximo primero
      const sortedUnits = [...validUnits].sort((a, b) => {
        if (a.status === "EN_USO" && b.status !== "EN_USO") return -1;
        if (b.status === "EN_USO" && a.status !== "EN_USO") return 1;
        const dateA = a.expirationDate ? new Date(a.expirationDate).getTime() : Infinity;
        const dateB = b.expirationDate ? new Date(b.expirationDate).getTime() : Infinity;
        return dateA - dateB;
      });

      setAvailableUnits(sortedUnits);

      // Smart Defaults del Examen
      const defaultCalibrator = runData.labExam.defaultCalibratorUses ?? 0;
      const defaultControl = runData.labExam.defaultControlUses ?? 0;

      form.setValue("calibratorUses", defaultCalibrator);
      form.setValue("controlUses", defaultControl);
      form.setValue("totalValidPatientExams", runData.totalValidPatientExams || 0);

      // Pre-seleccionar el mejor candidato FEFO si no hay uno seleccionado
      if (sortedUnits.length > 0) {
        // Preferir un frasco que no sea de investigación en corrida clínica
        const bestCandidate =
          sortedUnits.find((u) => u.ownershipType !== "RESEARCH_PROJECT") || sortedUnits[0];
        form.setValue("selectedUnitId", String(bestCandidate.id));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cargar la corrida semanal";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [runId, form]);

  useEffect(() => {
    void loadRunData();
  }, [loadRunData]);

  // Observadores reactivos del formulario
  const selectedUnitId = form.watch("selectedUnitId");
  const validPatients = form.watch("totalValidPatientExams") || 0;
  const calibratorUses = form.watch("calibratorUses") || 0;
  const controlUses = form.watch("controlUses") || 0;
  const repeatUses = form.watch("repeatUses") || 0;
  const wasteUses = form.watch("wasteUses") || 0;
  const isPhysicallyExhausted = form.watch("isPhysicallyExhausted");
  const rolloverMode = form.watch("rolloverMode");
  const rolloverUnitId = form.watch("rolloverUnitId");
  const allowExpiredOverride = form.watch("allowExpiredOverride");

  // Frasco primario seleccionado
  const selectedUnit = useMemo(() => {
    return availableUnits.find((u) => String(u.id) === selectedUnitId) || null;
  }, [availableUnits, selectedUnitId]);

  // Cálculos en Tiempo Real
  const remainingInUnit = useMemo(() => {
    if (!selectedUnit) return 0;
    return Number(selectedUnit.remainingUses ?? selectedUnit.currentVolume ?? 0);
  }, [selectedUnit]);

  const unitCostPerUse = useMemo(() => {
    if (!selectedUnit) return 0;
    return Number(selectedUnit.unitCostPerUse || 0);
  }, [selectedUnit]);

  // Total a descontar = Pacientes + Calibradores + Controles + Repeticiones + Mermas
  const totalDeductedUses = useMemo(() => {
    return Math.max(0, validPatients + calibratorUses + controlUses + repeatUses + wasteUses);
  }, [validPatients, calibratorUses, controlUses, repeatUses, wasteUses]);

  // Estimación de Costo Efectivo por Paciente
  const totalRunCostEstimate = useMemo(() => {
    return totalDeductedUses * unitCostPerUse;
  }, [totalDeductedUses, unitCostPerUse]);

  const costPerPatientEstimate = useMemo(() => {
    if (validPatients <= 0) return 0;
    return totalRunCostEstimate / validPatients;
  }, [totalRunCostEstimate, validPatients]);

  // Detección automática de Frasco Insuficiente (Caso Borde E1)
  const isDeficitDetected = useMemo(() => {
    return selectedUnit !== null && totalDeductedUses > remainingInUnit;
  }, [selectedUnit, totalDeductedUses, remainingInUnit]);

  const missingUsesCount = useMemo(() => {
    return Math.max(0, totalDeductedUses - remainingInUnit);
  }, [totalDeductedUses, remainingInUnit]);

  // Frascos candidatos para Rollover (excluyendo el primario y en orden FEFO)
  const rolloverCandidateUnits = useMemo(() => {
    return availableUnits.filter(
      (u) =>
        String(u.id) !== selectedUnitId &&
        u.ownershipType !== "RESEARCH_PROJECT"
    );
  }, [availableUnits, selectedUnitId]);

  // Frasco B de Rollover seleccionado
  const selectedRolloverUnit = useMemo(() => {
    return availableUnits.find((u) => String(u.id) === rolloverUnitId) || null;
  }, [availableUnits, rolloverUnitId]);

  // Detección de Reactivo Vencido (Caso Borde E2)
  const isUnitExpired = useMemo(() => {
    if (!selectedUnit?.expirationDate) return false;
    const exp = new Date(selectedUnit.expirationDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    exp.setHours(0, 0, 0, 0);
    return exp < today;
  }, [selectedUnit]);

  // Detección de Reactivo I+D (Caso Borde E4)
  const isResearchUnit = useMemo(() => {
    return selectedUnit?.ownershipType === "RESEARCH_PROJECT";
  }, [selectedUnit]);

  // Cuenta de excepciones activas para el badge del acordeón
  const activeExceptionsCount = useMemo(() => {
    let count = 0;
    const defaultCal = run?.labExam.defaultCalibratorUses ?? 0;
    const defaultCtrl = run?.labExam.defaultControlUses ?? 0;
    if (calibratorUses !== defaultCal) count++;
    if (controlUses !== defaultCtrl) count++;
    if (repeatUses > 0) count++;
    if (wasteUses > 0) count++;
    if (form.watch("externalCalibratorUnitId")) count++;
    return count;
  }, [calibratorUses, controlUses, repeatUses, wasteUses, run, form]);

  // Envío del Formulario Principal
  const onSubmit = async (values: CloseRunFormValues) => {
    if (!runId || !selectedUnit) return;

    // Validación E4 (Bloqueo de reactivos I+D)
    if (isResearchUnit) {
      toast.error(
        "El reactivo seleccionado pertenece a Investigación (I+D) y está bloqueado para diagnóstico de rutina clínica."
      );
      return;
    }

    // Validación E2 (Reactivo vencido)
    if (isUnitExpired && !values.allowExpiredOverride) {
      toast.error(
        "El reactivo se encuentra VENCIDO. Debe contar con autorización explícita de supervisión para continuar."
      );
      return;
    }

    if (totalDeductedUses <= 0) {
      toast.error("La corrida debe descontar al menos 1 uso de reactivo.");
      return;
    }

    setSubmitting(true);
    try {
      await LabWorkflowService.closeWeeklyRun(runId, {
        totalValidPatientExams: values.totalValidPatientExams,
        notes: values.notes?.trim() || undefined,
        allowExpiredOverride: values.allowExpiredOverride,
        consumptions: [
          {
            labReagentUnitId: values.selectedUnitId,
            rolloverUnitId:
              values.rolloverMode === "rollover" && values.rolloverUnitId
                ? values.rolloverUnitId
                : undefined,
            allowExpiredOverride: values.allowExpiredOverride,
            externalCalibratorUnitId: values.externalCalibratorUnitId || null,
            patientUses: values.totalValidPatientExams,
            repeatUses: values.repeatUses,
            repeatReason: values.repeatReason || null,
            repeatNotes: values.repeatNotes || null,
            calibratorUses: values.calibratorUses,
            controlUses: values.controlUses,
            wasteUses: values.wasteUses,
            isPhysicallyExhausted: values.isPhysicallyExhausted,
          },
        ],
      });

      toast.success("Corrida semanal cerrada, stock conciliado y costos analíticos liquidados.");
      router.push("/lab/runs");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cerrar la corrida semanal";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Manejo de Acción de Emergencia: Corrida Fallida por Calibración (Caso Borde E5)
  const handleFailCalibrationConfirm = async () => {
    if (!runId || !selectedUnitId) {
      toast.error("Seleccione un frasco de reactivo válido");
      return;
    }

    if (failWastedWells <= 0) {
      toast.error("Indique la cantidad de pozos totales que se desperdiciaron");
      return;
    }

    setFailingRun(true);
    try {
      const res = await LabWorkflowService.failRunByCalibration(runId, {
        unitId: selectedUnitId,
        totalWellsWasted: Number(failWastedWells),
        calibratorUses,
        controlUses,
        isPhysicallyExhausted: failExhausted,
        notes: failNotes.trim() || undefined,
        autoCloneNewRun: failAutoClone,
        allowExpiredOverride,
      });

      toast.success(
        "Falla de calibración registrada exitosamente. Se ha generado una nueva corrida acumulativa para los pacientes."
      );
      setFailDialogOpen(false);
      router.push("/lab/runs");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al reportar la falla de calibración";
      toast.error(msg);
    } finally {
      setFailingRun(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-7 h-7 animate-spin text-emerald-600" />
        <span className="font-medium text-sm">Cargando Mesón Analítico y reactivos FEFO...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* 1. BARRA SUPERIOR DE ACCIONES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="text-xs gap-1.5 w-fit">
            <Link href="/lab/runs">
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver al Listado de Corridas
            </Link>
          </Button>

          {run && (
            <UniversalPdfDownloadButton
              document={<LabRunPdfDocument run={run} />}
              fileName={`Ficha_Corrida_${String(run.code || run.id).replace(/[^a-zA-Z0-9_-]/g, "_")}`}
              buttonLabel="Ficha de Corrida PDF"
              previewLabel="Ver Ficha"
              size="sm"
            />
          )}
        </div>

        {/* Botón de Emergencia: Corrida Fallida (Caso E5) */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setFailWastedWells(totalDeductedUses > 0 ? totalDeductedUses : 24);
            setFailDialogOpen(true);
          }}
          className="text-xs text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-1.5"
        >
          <XCircle className="w-3.5 h-3.5" />
          Reportar Corrida Fallida (Falla de Curva / Calibración)
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Error en Corrida</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 2. RESUMEN DE LA CORRIDA EN PROCESO */}
      <Card className="border border-border/80 shadow-xs bg-muted/20">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                  {run?.code}
                </span>
                <Badge variant="outline" className="text-xs font-semibold">
                  {run?.labArea.name}
                </Badge>
                <Badge className="text-xs bg-blue-600 hover:bg-blue-600 text-white">
                  Semanal
                </Badge>
              </div>
              <h1 className="text-xl font-bold text-foreground mt-1.5">
                {run?.labExam.name}
              </h1>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                Código Examen: {run?.labExam.code} &bull; Bioanalista: {run?.bioanalyst.fullName}
              </p>
            </div>

            <div className="text-xs text-muted-foreground bg-background/90 p-3.5 rounded-xl border space-y-1.5 min-w-[220px]">
              <div className="flex justify-between items-center">
                <span>Período:</span>
                <strong className="text-foreground font-medium">
                  {run?.weekStartDate ? new Date(run.weekStartDate).toLocaleDateString() : ""} al{" "}
                  {run?.weekEndDate ? new Date(run.weekEndDate).toLocaleDateString() : ""}
                </strong>
              </div>
              <div className="flex justify-between items-center">
                <span>Smart Defaults:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                  {run?.labExam.defaultCalibratorUses ?? 0} Cal &bull; {run?.labExam.defaultControlUses ?? 0} Ctrl
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* 3. SELECCIÓN INTELIGENTE DEL FRASCO PRINCIPAL (FEFO) */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="py-3 px-5 bg-muted/30 border-b border-border/60">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-emerald-600" />
                  <span>1. Frasco Principal de Reactivo (Priorización FEFO)</span>
                </div>
                {selectedUnit && (
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[11px] font-mono",
                      selectedUnit.status === "EN_USO"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300"
                        : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-300"
                    )}
                  >
                    Estado: {selectedUnit.status === "EN_USO" ? "Abierto (En Uso)" : "Sellado (Reserva)"}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                El sistema sugiere automáticamente el frasco en uso o el sellado más próximo a vencer.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <FormField
                control={form.control}
                name="selectedUnitId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-foreground">
                      Seleccionar Frasco en Nevera
                    </FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(val) => {
                        field.onChange(val);
                        // Resetear rollover si cambia el frasco primario
                        form.setValue("rolloverMode", "none");
                        form.setValue("rolloverUnitId", "");
                      }}
                    >
                      <FormControl>
                        <SelectTrigger className="text-xs h-10 bg-background font-mono">
                          <SelectValue placeholder="Seleccione el frasco a consumir..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-80">
                        {availableUnits.map((u) => {
                          const isEnUso = u.status === "EN_USO";
                          const isResearch = u.ownershipType === "RESEARCH_PROJECT";
                          const rem = u.remainingUses ?? u.currentVolume;
                          const init = u.initialTheoreticalUses ?? u.initialVolume;
                          const expStr = u.expirationDate
                            ? new Date(u.expirationDate).toLocaleDateString()
                            : "S/F";

                          return (
                            <SelectItem
                              key={String(u.id)}
                              value={String(u.id)}
                              className="text-xs cursor-pointer py-2 font-mono"
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-foreground">{u.unitCode}</span>
                                <span>&bull;</span>
                                <span className="text-muted-foreground">{u.product.name}</span>
                                <span>&bull;</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                  {rem}/{init} usos
                                </span>
                                <span>&bull;</span>
                                <span className="text-xs text-muted-foreground">
                                  Vence: {expStr}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "text-[10px] px-1.5 py-0",
                                    isEnUso ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-800"
                                  )}
                                >
                                  {isEnUso ? "EN USO" : "SELLADO"}
                                </Badge>
                                {isResearch && (
                                  <Badge className="bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0 border-purple-200">
                                    I+D
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Tarjeta Detallada del Frasco Seleccionado */}
              {selectedUnit && (
                <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-foreground">
                        {selectedUnit.unitCode}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px]",
                          selectedUnit.ownershipType === "RESEARCH_PROJECT"
                            ? "bg-purple-50 text-purple-700 border-purple-300"
                            : "bg-emerald-50 text-emerald-700 border-emerald-300"
                        )}
                      >
                        {selectedUnit.ownershipType === "RESEARCH_PROJECT"
                          ? "Proyecto I+D"
                          : "Rutina Clínica"}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        Lote: {selectedUnit.batch?.lotNumber || "N/A"}
                      </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground flex items-center gap-3">
                      <span>
                        Nevera: <strong className="text-foreground">{selectedUnit.fridge?.name || "General"}</strong>
                      </span>
                      <span>
                        Vence:{" "}
                        <strong
                          className={cn(
                            isUnitExpired ? "text-rose-600 font-bold" : "text-foreground"
                          )}
                        >
                          {selectedUnit.expirationDate
                            ? new Date(selectedUnit.expirationDate).toLocaleDateString()
                            : "Sin fecha"}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Barra de progreso de saldo remanente */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-muted-foreground">Saldo Remanente:</span>
                      <span className="font-bold text-foreground">
                        {remainingInUnit} / {selectedUnit.initialTheoreticalUses ?? selectedUnit.initialVolume} usos disponibles
                      </span>
                    </div>
                    <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-300",
                          remainingInUnit === 0
                            ? "bg-rose-500"
                            : remainingInUnit < 20
                            ? "bg-amber-500"
                            : "bg-emerald-600"
                        )}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(
                              0,
                              (remainingInUnit /
                                Number(
                                  selectedUnit.initialTheoreticalUses ??
                                    selectedUnit.initialVolume ??
                                    1
                                )) *
                                100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* ALERTA CASO BORDE E4: Reactivo de Investigación */}
                  {isResearchUnit && (
                    <Alert className="bg-purple-50 dark:bg-purple-950/30 border-purple-300 dark:border-purple-800 text-purple-900 dark:text-purple-200 py-2.5">
                      <ShieldAlert className="w-4 h-4 text-purple-600" />
                      <AlertTitle className="text-xs font-bold">Bloqueo de Segregación I+D (Caso E4)</AlertTitle>
                      <AlertDescription className="text-xs">
                        Este frasco pertenece a un Proyecto de Investigación y no puede ser liquidado en corridas clínicas de rutina. Selecciona un frasco institucional.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* ALERTA CASO BORDE E2: Reactivo Vencido */}
                  {isUnitExpired && (
                    <Alert variant="destructive" className="py-2.5 space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        <AlertTitle className="text-xs font-bold">
                          Reactivo Vencido en Tiempo Real (Caso E2)
                        </AlertTitle>
                      </div>
                      <AlertDescription className="text-xs">
                        Este frasco expiró el{" "}
                        <strong>
                          {selectedUnit.expirationDate
                            ? new Date(selectedUnit.expirationDate).toLocaleDateString()
                            : ""}
                        </strong>
                        . Su uso para diagnóstico clínico está restringido por control de calidad.
                      </AlertDescription>

                      {isSupervisor ? (
                        <div className="pt-2 border-t border-rose-300/40 flex items-center gap-2">
                          <FormField
                            control={form.control}
                            name="allowExpiredOverride"
                            render={({ field }) => (
                              <FormItem className="flex items-center gap-2 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="text-xs font-semibold cursor-pointer text-rose-950 dark:text-rose-100">
                                  Autorizo como Supervisor/Coordinador el uso excepcional de este lote vencido
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                      ) : (
                        <p className="text-[11px] text-rose-800 dark:text-rose-300 italic pt-1">
                          Solo un usuario con rol de Coordinador de Laboratorio o Administrador puede autorizar el uso de reactivos vencidos.
                        </p>
                      )}
                    </Alert>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4. MODO SIMPLE: PRODUCCIÓN ANALÍTICA Y SMART DEFAULTS (90% DE CASOS) */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="py-3 px-5 bg-muted/30 border-b border-border/60">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <span>2. Modo Simple: Pacientes y Smart Defaults</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Ingresa los pacientes válidos diagnosticados. El sistema calcula calibradores y controles por defecto.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              {/* Input Principal: Pacientes Válidos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="totalValidPatientExams"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-foreground">
                        Pacientes Válidos Diagnosticados
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="Ej. 90"
                          className="text-lg font-mono font-bold h-11 bg-background"
                          value={field.value ?? 0}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value === "" ? 0 : Number(e.target.value)
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Switch: Kit Físicamente Agotado */}
                <FormField
                  control={form.control}
                  name="isPhysicallyExhausted"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-xl border p-3.5 bg-muted/20">
                      <div className="space-y-0.5 pr-2">
                        <FormLabel className="text-xs font-bold text-foreground block">
                          ¿El frasco se agotó físicamente en esta corrida?
                        </FormLabel>
                        <span className="text-[11px] text-muted-foreground block">
                          Si no queda volumen aprovechable, llevará el saldo a 0 y registrará merma técnica.
                        </span>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Pildoritas de Smart Defaults y Cálculo en Vivo */}
              <div className="p-4 rounded-xl border bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      Smart Defaults Activos para {run?.labExam.name}
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-300">
                    Calculado automáticamente por protocolo
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                  <div className="bg-background/80 p-2.5 rounded-lg border">
                    <span className="text-muted-foreground block text-[10px]">Pacientes:</span>
                    <strong className="text-foreground text-sm font-bold">{validPatients}</strong>
                  </div>
                  <div className="bg-background/80 p-2.5 rounded-lg border">
                    <span className="text-muted-foreground block text-[10px]">Calibradores fijos:</span>
                    <strong className="text-blue-600 dark:text-blue-400 text-sm font-bold">
                      +{calibratorUses}
                    </strong>
                  </div>
                  <div className="bg-background/80 p-2.5 rounded-lg border">
                    <span className="text-muted-foreground block text-[10px]">Controles fijos:</span>
                    <strong className="text-indigo-600 dark:text-indigo-400 text-sm font-bold">
                      +{controlUses}
                    </strong>
                  </div>
                  <div className="bg-emerald-100 dark:bg-emerald-900/60 p-2.5 rounded-lg border border-emerald-300">
                    <span className="text-emerald-800 dark:text-emerald-200 block text-[10px] font-bold">
                      Total a Descontar:
                    </span>
                    <strong className="text-emerald-900 dark:text-emerald-100 text-base font-bold">
                      {totalDeductedUses} pozos/usos
                    </strong>
                  </div>
                </div>

                {/* Costo Efectivo Estimado */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                    Costo unitario por pozo: <strong>${unitCostPerUse.toFixed(4)}</strong>
                  </span>
                  <span className="text-foreground font-mono font-bold">
                    Costo Efectivo Estimado:{" "}
                    <span className="text-emerald-700 dark:text-emerald-300 text-sm">
                      ${costPerPatientEstimate.toFixed(2)} / paciente
                    </span>
                  </span>
                </div>
              </div>

              {/* ALERTA Y GESTIÓN DE CASO BORDE E1: FRASCO AGOTADO A MITAD DE CORRIDA */}
              {isDeficitDetected && (
                <div className="p-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        Capacidad insuficiente en el frasco actual (Caso Borde E1)
                      </h4>
                      <p className="text-xs text-amber-800 dark:text-amber-300">
                        El frasco actual solo cuenta con <strong>{remainingInUnit} usos</strong> y la corrida
                        requiere descontar <strong>{totalDeductedUses} usos</strong> (faltan{" "}
                        <strong className="font-mono">{missingUsesCount} usos</strong>).
                      </p>
                    </div>
                  </div>

                  {/* Selector de modo de resolución: Rollover vs Over-yield */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        form.setValue("rolloverMode", "rollover");
                        if (rolloverCandidateUnits.length > 0 && !rolloverUnitId) {
                          form.setValue("rolloverUnitId", String(rolloverCandidateUnits[0].id));
                        }
                      }}
                      className={cn(
                        "p-3 rounded-lg border text-left transition-all text-xs cursor-pointer",
                        rolloverMode === "rollover"
                          ? "bg-amber-100 dark:bg-amber-900/40 border-amber-500 font-bold"
                          : "bg-background/80 hover:bg-background border-border"
                      )}
                    >
                      <span className="block text-amber-950 dark:text-amber-100 font-semibold mb-0.5">
                        1. Rollover FEFO (Segundo Frasco)
                      </span>
                      <span className="text-[11px] text-muted-foreground block font-normal">
                        Agotar el Frasco A ({remainingInUnit} usos) y deducir los {missingUsesCount} restantes de un Frasco B.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        form.setValue("rolloverMode", "overyield");
                        form.setValue("rolloverUnitId", "");
                      }}
                      className={cn(
                        "p-3 rounded-lg border text-left transition-all text-xs cursor-pointer",
                        rolloverMode === "overyield"
                          ? "bg-amber-100 dark:bg-amber-900/40 border-amber-500 font-bold"
                          : "bg-background/80 hover:bg-background border-border"
                      )}
                    >
                      <span className="block text-amber-950 dark:text-amber-100 font-semibold mb-0.5">
                        2. Sobre-Rendimiento (Over-yield)
                      </span>
                      <span className="text-[11px] text-muted-foreground block font-normal">
                        El mismo frasco rindió físicamente más de lo estimado. Absorber el excedente sin cambiar de frasco.
                      </span>
                    </button>
                  </div>

                  {/* Despliegue de Selector de Frasco B si eligió Rollover */}
                  {rolloverMode === "rollover" && (
                    <div className="p-3.5 bg-background rounded-lg border space-y-2 mt-2">
                      <label className="text-xs font-semibold text-foreground block">
                        Seleccionar Frasco B de Relevo (Rollover Unit):
                      </label>
                      <Select
                        value={form.watch("rolloverUnitId") || ""}
                        onValueChange={(val) => form.setValue("rolloverUnitId", val)}
                      >
                        <SelectTrigger className="text-xs h-9 font-mono">
                          <SelectValue placeholder="Seleccione el frasco de relevo..." />
                        </SelectTrigger>
                        <SelectContent>
                          {rolloverCandidateUnits.map((u) => (
                            <SelectItem key={String(u.id)} value={String(u.id)} className="text-xs font-mono">
                              {u.unitCode} &bull; {u.product.name} (Lote: {u.batch?.lotNumber}) &bull;{" "}
                              {u.remainingUses ?? u.currentVolume} usos disp. &bull; {u.status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {selectedRolloverUnit && (
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono mt-1">
                          ✓ División automática: Frasco {selectedUnit?.unitCode} consumirá {remainingInUnit} usos (quedando AGOTADO) y Frasco {selectedRolloverUnit.unitCode} consumirá {missingUsesCount} usos (quedando en EN_USO).
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 5. ACORDEÓN: MODO AVANZADO / EXCEPCIONES TÉCNICAS */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader
              className="py-3 px-5 bg-muted/30 cursor-pointer select-none border-b border-border/60 hover:bg-muted/40 transition-colors"
              onClick={() => setAdvancedOpen(!advancedOpen)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-foreground">
                    3. Modo Avanzado: Ajustar calibradores, repeticiones o mermas
                  </span>
                  {activeExceptionsCount > 0 && (
                    <Badge className="bg-amber-600 text-white text-[10px] px-1.5 py-0">
                      {activeExceptionsCount} {activeExceptionsCount === 1 ? "excepción" : "excepciones"}
                    </Badge>
                  )}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground"
                >
                  {advancedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>
            </CardHeader>

            {advancedOpen && (
              <CardContent className="p-5 space-y-5 animate-in fade-in-50 duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Calibrador Manual */}
                  <FormField
                    control={form.control}
                    name="calibratorUses"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between items-center mb-1">
                          <FormLabel className="text-xs font-semibold text-foreground">
                            Pozos Usados en Calibración
                          </FormLabel>
                          <button
                            type="button"
                            onClick={() => form.setValue("calibratorUses", run?.labExam.defaultCalibratorUses ?? 0)}
                            className="text-[10px] text-emerald-600 hover:underline"
                          >
                            Restablecer ({run?.labExam.defaultCalibratorUses ?? 0})
                          </button>
                        </div>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            className="h-9 text-xs font-mono"
                            value={field.value ?? 0}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === "" ? 0 : Number(e.target.value)
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Control Manual */}
                  <FormField
                    control={form.control}
                    name="controlUses"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between items-center mb-1">
                          <FormLabel className="text-xs font-semibold text-foreground">
                            Pozos Usados en Controles
                          </FormLabel>
                          <button
                            type="button"
                            onClick={() => form.setValue("controlUses", run?.labExam.defaultControlUses ?? 0)}
                            className="text-[10px] text-emerald-600 hover:underline"
                          >
                            Restablecer ({run?.labExam.defaultControlUses ?? 0})
                          </button>
                        </div>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            className="h-9 text-xs font-mono"
                            value={field.value ?? 0}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === "" ? 0 : Number(e.target.value)
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  {/* Repeticiones */}
                  <FormField
                    control={form.control}
                    name="repeatUses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-foreground">
                          Repeticiones de Muestras
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            className="h-9 text-xs font-mono"
                            value={field.value ?? 0}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === "" ? 0 : Number(e.target.value)
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Motivo de Repetición */}
                  <FormField
                    control={form.control}
                    name="repeatReason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-foreground">
                          Causa de Repetición
                        </FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue placeholder="Seleccione motivo..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="CALIBRATION_FAILURE">Falla en Curva de Calibración</SelectItem>
                            <SelectItem value="CRITICAL_VALUE_CONFIRMATION">Confirmación Valor Crítico</SelectItem>
                            <SelectItem value="COMPLEX_SAMPLE">Muestra Compleja / Lipemia</SelectItem>
                            <SelectItem value="OPERATOR_ERROR">Error Técnico / Pipeteo</SelectItem>
                            <SelectItem value="OTHER">Otro Motivo</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  {/* Mermas Técnicas */}
                  <FormField
                    control={form.control}
                    name="wasteUses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                          Mermas Técnicas / Purga
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            className="h-9 text-xs font-mono border-rose-300"
                            value={field.value ?? 0}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value === "" ? 0 : Number(e.target.value)
                              )
                            }
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Calibrador Externo Standalone Opcional */}
                <FormField
                  control={form.control}
                  name="externalCalibratorUnitId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <span>Vial de Calibrador Externo Opcional (Doble Absorción)</span>
                        <Sparkles className="w-3 h-3 text-blue-500" />
                      </FormLabel>
                      <Select
                        value={field.value || "NONE"}
                        onValueChange={(val) => field.onChange(val === "NONE" ? "" : val)}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9 text-xs font-mono">
                            <SelectValue placeholder="Sin kit calibrador externo adicional" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="NONE">Sin vial externo (Calibrador incluido o no aplica)</SelectItem>
                          {availableUnits
                            .filter((u) => String(u.id) !== selectedUnitId)
                            .map((u) => (
                              <SelectItem key={String(u.id)} value={String(u.id)} className="text-xs font-mono">
                                {u.unitCode} &bull; {u.product.name} (Lote: {u.batch?.lotNumber}) &bull;{" "}
                                {u.remainingUses ?? u.currentVolume} usos disp.
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Observaciones de la Corrida */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-foreground">
                        Observaciones de Cierre y Trazabilidad
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej. Se re-calibró equipo post-mantenimiento preventivo..."
                          className="h-9 text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </CardContent>
            )}
          </Card>

          {/* 6. BOTONES FINALES DE CONFIRMACIÓN */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-600" />
              <span>
                Al confirmar, se descontarán <strong>{totalDeductedUses} pozos</strong> y se liquidará el costo efectivo
                en la auditoría 5D.
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button asChild variant="outline" size="sm" className="text-xs flex-1 sm:flex-none">
                <Link href="/lab/runs">Cancelar</Link>
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting || isResearchUnit || (isUnitExpired && !allowExpiredOverride)}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-10 px-6 font-semibold flex-1 sm:flex-none"
              >
                {submitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Cerrar Corrida & Liquidar Costos
              </Button>
            </div>
          </div>
        </form>
      </Form>

      {/* DIÁLOGO MODAL: ACCIÓN DE EMERGENCIA PARA CORRIDA FALLIDA POR CALIBRACIÓN (CASO BORDE E5) */}
      <Dialog open={failDialogOpen} onOpenChange={setFailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-rose-600 flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              Declarar Corrida Fallida por Calibración (Caso E5)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Esta acción descontará los pozos desperdiciados del reactivo, asignará 0 pacientes válidos, registrará las
              muestras bajo repetición analítica y aperturará una nueva corrida para re-procesar los pacientes.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Pozos Totales Desperdiciados en el Ensayo
              </label>
              <Input
                type="number"
                min={1}
                value={failWastedWells}
                onChange={(e) => setFailWastedWells(Number(e.target.value))}
                className="text-base font-mono font-bold h-10"
              />
              <span className="text-[11px] text-muted-foreground block mt-1">
                Incluye calibradores, controles y micropozos de muestras perdidas.
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
              <div>
                <span className="text-xs font-semibold text-foreground block">
                  ¿El frasco se agotó por completo con este ensayo?
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Marcar si no queda reactivo restante en el frasco.
                </span>
              </div>
              <Switch checked={failExhausted} onCheckedChange={setFailExhausted} />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200">
              <div>
                <span className="text-xs font-semibold text-foreground block">
                  Aperturar automáticamente nueva corrida acumulativa
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Crea de inmediato una corrida en estado OPEN para procesar a los pacientes sin perder trazabilidad.
                </span>
              </div>
              <Switch checked={failAutoClone} onCheckedChange={setFailAutoClone} />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Justificación Técnica / Motivo de Falla
              </label>
              <Textarea
                rows={3}
                placeholder="Ej. Curva de calibración R2 = 0.81 fuera de rango, controles alto y bajo fuera de +/- 2 DE..."
                value={failNotes}
                onChange={(e) => setFailNotes(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFailDialogOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={failingRun}
              onClick={handleFailCalibrationConfirm}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold gap-1.5"
            >
              {failingRun ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
              Confirmar Falla de Corrida
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
