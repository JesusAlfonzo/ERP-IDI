"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { LabWorkflowService } from "@/services/lab-workflow.service";
import type { LabWeeklyRun } from "@/types/lab-workflow";
import type { LabReagentUnitItem } from "@/types/laboratory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import {
  FlaskConical,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  PlusCircle,
  Trash2,
  Calculator,
  SlidersHorizontal,
  Layers,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const consumptionItemSchema = z.object({
  labReagentUnitId: z.string().min(1, "Seleccione el kit o reactivo primario"),
  externalCalibratorUnitId: z.string().optional().or(z.literal("")),
  patientUses: z.number().min(0, "Usos de pacientes >= 0"),
  repeatUses: z.number().min(0, "Repeticiones >= 0"),
  repeatReason: z.string().optional().or(z.literal("")),
  repeatNotes: z.string().optional(),
  calibratorUses: z.number().min(0, "Usos de calibrador >= 0"),
  calibratorNotes: z.string().optional(),
  controlUses: z.number().min(0, "Usos de control >= 0"),
  wasteUses: z.number().min(0, "Mermas / descartes >= 0"),
  isPrimaryKitDepleted: z.boolean(),
  primaryKitPhysicalRemainingUses: z.number().min(0).optional().nullable(),
  calibratorPhysicalRemainingUses: z.number().min(0).optional().nullable(),
});

const closeRunSchema = z.object({
  totalValidPatientExams: z.number().min(0, "Total de exámenes válidos >= 0"),
  notes: z.string().optional(),
  consumptions: z.array(consumptionItemSchema).min(1, "Debe registrar al menos un kit consumido"),
});

type CloseRunFormValues = z.infer<typeof closeRunSchema>;

export default function CloseWeeklyRunPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const runId = params?.id ? Number(params.id) : 0;

  const [run, setRun] = useState<LabWeeklyRun | null>(null);
  const [availableUnits, setAvailableUnits] = useState<LabReagentUnitItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const form = useForm<CloseRunFormValues>({
    resolver: zodResolver(closeRunSchema),
    defaultValues: {
      totalValidPatientExams: 0,
      notes: "",
      consumptions: [
        {
          labReagentUnitId: "",
          externalCalibratorUnitId: "",
          patientUses: 0,
          repeatUses: 0,
          repeatReason: "",
          repeatNotes: "",
          calibratorUses: 0,
          calibratorNotes: "",
          controlUses: 0,
          wasteUses: 0,
          isPrimaryKitDepleted: false,
          primaryKitPhysicalRemainingUses: 0,
          calibratorPhysicalRemainingUses: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "consumptions",
  });

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

      // Filtrar frascos disponibles (en uso o sellados)
      const validUnits = unitsData.filter(
        (u) => u.status === "EN_USO" || u.status === "SELLADO"
      );
      setAvailableUnits(validUnits);

      form.setValue("totalValidPatientExams", runData.totalValidPatientExams || 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cargar la corrida semanal";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [runId, form]);

  useEffect(() => {
    void loadRunData();
  }, [loadRunData]);

  // Al seleccionar un kit primario, actualizar conteo físico inicial con su volumen actual
  const handleKitSelect = (index: number, unitId: string) => {
    form.setValue(`consumptions.${index}.labReagentUnitId`, unitId);
    const unit = availableUnits.find((u) => String(u.id) === unitId);
    if (unit) {
      const vol = Number(unit.currentVolume);
      form.setValue(`consumptions.${index}.primaryKitPhysicalRemainingUses`, vol);
    }
  };

  const onSubmit = async (values: CloseRunFormValues) => {
    setSubmitting(true);
    try {
      await LabWorkflowService.closeWeeklyRun(runId, {
        totalValidPatientExams: values.totalValidPatientExams,
        notes: values.notes,
        consumptions: values.consumptions.map((c) => ({
          labReagentUnitId: c.labReagentUnitId,
          externalCalibratorUnitId: c.externalCalibratorUnitId || null,
          patientUses: c.patientUses,
          repeatUses: c.repeatUses,
          repeatReason: c.repeatReason || null,
          repeatNotes: c.repeatNotes || null,
          calibratorUses: c.calibratorUses,
          calibratorNotes: c.calibratorNotes || null,
          controlUses: c.controlUses,
          wasteUses: c.wasteUses,
          isPrimaryKitDepleted: c.isPrimaryKitDepleted,
          primaryKitPhysicalRemainingUses: c.primaryKitPhysicalRemainingUses ?? null,
          calibratorPhysicalRemainingUses: c.calibratorPhysicalRemainingUses ?? null,
        })),
      });

      alert("Corrida semanal cerrada y conciliada exitosamente con doble absorción de calibrador.");
      router.push("/lab/runs");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cerrar la corrida semanal";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
        <span>Cargando datos de la corrida semanal...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Botón Volver y Encabezado */}
      <div className="flex items-center justify-between gap-4">
        <Button asChild variant="ghost" size="sm" className="text-xs gap-1.5">
          <Link href="/lab/runs">
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver a Corridas
          </Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Ficha Resumen de la Corrida */}
      <Card className="border border-border/80 shadow-xs bg-muted/20">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  {run?.code}
                </span>
                <Badge variant="outline" className="text-xs">
                  {run?.labArea.name}
                </Badge>
              </div>
              <h2 className="text-xl font-bold text-foreground mt-1">
                {run?.labExam.name}
              </h2>
              <p className="text-xs text-muted-foreground font-mono">
                Código Examen: {run?.labExam.code} &bull; Bioanalista Responsable: {run?.bioanalyst.fullName}
              </p>
            </div>

            <div className="text-xs text-muted-foreground bg-background p-3 rounded-xl border space-y-1">
              <div>
                <span>Semana: </span>
                <strong className="text-foreground">
                  {run?.weekStartDate ? new Date(run.weekStartDate).toLocaleDateString() : ""} al{" "}
                  {run?.weekEndDate ? new Date(run.weekEndDate).toLocaleDateString() : ""}
                </strong>
              </div>
              <div>
                <span>Estado Actual: </span>
                <strong className="text-indigo-600">{run?.status}</strong>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FORMULARIO CRÍTICO DE CIERRE CON DOBLE DESCUENTO */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="py-3 px-5 bg-muted/30 border-b border-border/60">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <span>1. Resultados de Producción Analítica Semanal</span>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Indica la cantidad real de pacientes atendidos con resultados validados entregados.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="totalValidPatientExams"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-foreground">
                        Total Exámenes Válidos de Pacientes
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="Ej. 145"
                          className="text-base font-mono font-bold h-10"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Observaciones Generales de la Corrida</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej. Calibración efectuada el martes post-mantenimiento..."
                          className="text-xs h-10"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* 2. REGISTRO DE REACTIVOS Y DOBLE DESCUENTO DE CALIBRADORES */}
          <Card className="border border-border/80 shadow-xs">
            <CardHeader className="py-3 px-5 bg-muted/30 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
                    <span>2. Desglose de Consumo con Doble Descuento y Conciliación Física</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    El sistema descuenta automáticamente los usos del kit primario y absorbe el costo del calibrador.
                  </CardDescription>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    append({
                      labReagentUnitId: "",
                      externalCalibratorUnitId: "",
                      patientUses: 0,
                      repeatUses: 0,
                      repeatReason: "",
                      repeatNotes: "",
                      calibratorUses: 0,
                      calibratorNotes: "",
                      controlUses: 0,
                      wasteUses: 0,
                      isPrimaryKitDepleted: false,
                      primaryKitPhysicalRemainingUses: 0,
                      calibratorPhysicalRemainingUses: 0,
                    })
                  }
                  className="text-xs gap-1.5 h-8 border-emerald-300 text-emerald-700 dark:text-emerald-400"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Agregar Otro Frasco
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-5 space-y-6">
              {fields.map((field, index) => {
                const isDepleted = form.watch(`consumptions.${index}.isPrimaryKitDepleted`);
                const currentUnitId = form.watch(`consumptions.${index}.labReagentUnitId`);
                const selectedUnit = availableUnits.find((u) => String(u.id) === currentUnitId);

                return (
                  <div
                    key={field.id}
                    className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-4"
                  >
                    <div className="flex items-center justify-between border-b pb-2">
                      <span className="text-xs font-bold text-foreground flex items-center gap-2">
                        <FlaskConical className="w-4 h-4 text-emerald-600" />
                        Frasco / Kit #{index + 1}
                        {selectedUnit && (
                          <span className="text-muted-foreground font-mono font-normal">
                            ({selectedUnit.unitCode} &bull; Lote: {selectedUnit.batch?.lotNumber} &bull; Stock en sistema: {selectedUnit.currentVolume} usos)
                          </span>
                        )}
                      </span>

                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          className="h-7 text-xs text-rose-500 hover:text-rose-700 gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Quitar
                        </Button>
                      )}
                    </div>

                    {/* Selección de Frascos (Primario y Calibrador Externo) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-foreground block mb-1">
                          Kit / Frasco Primario en Nevera
                        </label>
                        <Select
                          value={form.watch(`consumptions.${index}.labReagentUnitId`)}
                          onValueChange={(val) => handleKitSelect(index, val)}
                        >
                          <SelectTrigger className="text-xs h-9">
                            <SelectValue placeholder="Seleccione el frasco principal consumido..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableUnits.map((u) => (
                              <SelectItem key={String(u.id)} value={String(u.id)}>
                                {u.unitCode} &bull; {u.product.name} (Lote: {u.batch?.lotNumber}) &bull; {u.currentVolume} usos &bull; {u.fridge?.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-foreground block mb-1 flex items-center gap-1.5">
                          <span>Kit Calibrador Externo (Opcional - Doble Descuento)</span>
                          <Sparkles className="w-3 h-3 text-blue-500" />
                        </label>
                        <Select
                          value={form.watch(`consumptions.${index}.externalCalibratorUnitId`) || "NONE"}
                          onValueChange={(val) =>
                            form.setValue(
                              `consumptions.${index}.externalCalibratorUnitId`,
                              val === "NONE" ? "" : val
                            )
                          }
                        >
                          <SelectTrigger className="text-xs h-9">
                            <SelectValue placeholder="Sin kit calibrador externo adicional" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">Sin kit externo (Calibrador incluido o no aplica)</SelectItem>
                            {availableUnits
                              .filter((u) => String(u.id) !== currentUnitId)
                              .map((u) => (
                                <SelectItem key={String(u.id)} value={String(u.id)}>
                                  {u.unitCode} &bull; {u.product.name} (Lote: {u.batch?.lotNumber}) &bull; {u.currentVolume} usos
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Desglose de Usos */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                      <div>
                        <label className="text-[11px] font-semibold text-foreground block mb-1">
                          Usos Pacientes
                        </label>
                        <Input
                          type="number"
                          min={0}
                          {...form.register(`consumptions.${index}.patientUses` as const, {
                            valueAsNumber: true,
                          })}
                          className="h-8 text-xs font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-foreground block mb-1">
                          Repeticiones
                        </label>
                        <Input
                          type="number"
                          min={0}
                          {...form.register(`consumptions.${index}.repeatUses` as const, {
                            valueAsNumber: true,
                          })}
                          className="h-8 text-xs font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-foreground block mb-1 text-blue-600">
                          Usos Calibrador
                        </label>
                        <Input
                          type="number"
                          min={0}
                          {...form.register(`consumptions.${index}.calibratorUses` as const, {
                            valueAsNumber: true,
                          })}
                          className="h-8 text-xs font-mono border-blue-300"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-foreground block mb-1">
                          Usos Controles
                        </label>
                        <Input
                          type="number"
                          min={0}
                          {...form.register(`consumptions.${index}.controlUses` as const, {
                            valueAsNumber: true,
                          })}
                          className="h-8 text-xs font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-foreground block mb-1 text-rose-600">
                          Mermas / Descarte
                        </label>
                        <Input
                          type="number"
                          min={0}
                          {...form.register(`consumptions.${index}.wasteUses` as const, {
                            valueAsNumber: true,
                          })}
                          className="h-8 text-xs font-mono border-rose-300"
                        />
                      </div>
                    </div>

                    {/* Motivo de Repetición si se registraron repeticiones */}
                    {Number(form.watch(`consumptions.${index}.repeatUses`)) > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg text-xs">
                        <div>
                          <label className="text-[11px] font-bold text-amber-800 dark:text-amber-200 block mb-1">
                            Motivo Obligatorio de Repetición:
                          </label>
                          <Select
                            value={form.watch(`consumptions.${index}.repeatReason`) || ""}
                            onValueChange={(val) => form.setValue(`consumptions.${index}.repeatReason`, val)}
                          >
                            <SelectTrigger className="text-xs h-8 bg-background">
                              <SelectValue placeholder="Seleccione causa de repetición..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="QUALITY_CONTROL_FAILED">Falla en Control de Calidad</SelectItem>
                              <SelectItem value="TECHNICAL_ERROR">Error Técnico / Pipeteo</SelectItem>
                              <SelectItem value="EQUIPMENT_ALARM">Alarma del Equipo Analizador</SelectItem>
                              <SelectItem value="SAMPLE_HEMOLYSIS_LIPEMIA">Muestra Hemolizada / Lipémica</SelectItem>
                              <SelectItem value="DILUTION_REQUIRED">Dilución Requerida (Fuera de Escala)</SelectItem>
                              <SelectItem value="PATHOLOGICAL_CONFIRMATION">Confirmación Patológica Crítica</SelectItem>
                              <SelectItem value="OTHER">Otro Motivo Analítico</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-amber-800 dark:text-amber-200 block mb-1">
                            Detalles de la Repetición:
                          </label>
                          <Input
                            placeholder="Ej. Muestra diluida al 1:5, control patológico re-ensayado..."
                            {...form.register(`consumptions.${index}.repeatNotes` as const)}
                            className="text-xs h-8 bg-background"
                          />
                        </div>
                      </div>
                    )}

                    {/* Conciliación Física de Frasco */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={isDepleted}
                          onCheckedChange={(checked) =>
                            form.setValue(`consumptions.${index}.isPrimaryKitDepleted`, checked)
                          }
                        />
                        <div>
                          <span className="text-xs font-semibold text-foreground block">
                            Frasco Totalmente Agotado
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            Marcar si el frasco se consumió por completo y debe pasar a estado AGOTADO.
                          </span>
                        </div>
                      </div>

                      {!isDepleted && (
                        <div>
                          <label className="text-[11px] font-semibold text-foreground block mb-1">
                            Conciliación Física: Usos Restantes Reales en Frasco
                          </label>
                          <Input
                            type="number"
                            min={0}
                            placeholder="Conteo restante real"
                            {...form.register(`consumptions.${index}.primaryKitPhysicalRemainingUses` as const, {
                              valueAsNumber: true,
                            })}
                            className="h-8 text-xs font-mono font-bold"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Botones Finales */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button asChild variant="outline" size="sm" className="text-xs">
              <Link href="/lab/runs">Cancelar</Link>
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-10 px-6 font-semibold"
            >
              {submitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Cerrar Corrida & Liquidar Costos
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
