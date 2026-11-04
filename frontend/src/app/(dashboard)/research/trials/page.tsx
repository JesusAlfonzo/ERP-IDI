"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ResearchService } from "@/services/research.service";
import { LabWorkflowService } from "@/services/lab-workflow.service";
import type {
  ResearchTrial,
  ResearchFinding,
  ResearchProject,
} from "@/types/research";
import type { LabReagentUnitItem } from "@/types/laboratory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  FileText,
  PlusCircle,
  RefreshCw,
  FlaskConical,
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  Play,
  Share2,
  AlertCircle,
  User,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Schema para Crear Ensayo
const createTrialSchema = z.object({
  projectId: z.string().min(1, "Seleccione el proyecto"),
  title: z.string().min(5, "Título de al menos 5 caracteres"),
  objective: z.string().optional(),
  trialDate: z.string().min(1, "Fecha del ensayo requerida"),
  notes: z.string().optional(),
});

type CreateTrialFormValues = z.infer<typeof createTrialSchema>;

// Schema para Ejecutar Ensayo
const executeTrialSchema = z.object({
  totalSamplesTested: z.number().min(1, "Al menos 1 muestra evaluada"),
  notes: z.string().optional(),
  consumptions: z.array(
    z.object({
      labReagentUnitId: z.string().min(1, "Seleccione un frasco de reactivo"),
      sampleUses: z.number().min(0),
      repeatUses: z.number().min(0),
      calibratorUses: z.number().min(0),
      controlUses: z.number().min(0),
    })
  ).min(1, "Debe registrar al menos un reactivo consumido"),
});

type ExecuteTrialFormValues = z.infer<typeof executeTrialSchema>;

// Schema para Crear Hallazgo
const createFindingSchema = z.object({
  projectId: z.string().min(1, "Seleccione el proyecto"),
  trialId: z.string().optional().or(z.literal("")),
  title: z.string().min(5, "Título de al menos 5 caracteres"),
  findingType: z.enum([
    "PRELIMINARY_RESULT",
    "PROTOCOL_OPTIMIZATION",
    "ACCURACY_VALIDATION",
    "ANOMALY_DETECTED",
    "FINAL_CONCLUSION",
  ]),
  summary: z.string().min(10, "Resumen analítico requerido"),
  conclusion: z.string().optional(),
  isPublished: z.boolean(),
});

type CreateFindingFormValues = z.infer<typeof createFindingSchema>;

export default function ResearchTrialsPage() {
  const [activeTab, setActiveTab] = useState<"trials" | "findings">("trials");
  const [trials, setTrials] = useState<ResearchTrial[]>([]);
  const [findings, setFindings] = useState<ResearchFinding[]>([]);
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [availableUnits, setAvailableUnits] = useState<LabReagentUnitItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modales
  const [isNewTrialOpen, setIsNewTrialOpen] = useState<boolean>(false);
  const [isExecuteTrialOpen, setIsExecuteTrialOpen] = useState<boolean>(false);
  const [executingTrial, setExecutingTrial] = useState<ResearchTrial | null>(null);
  const [isNewFindingOpen, setIsNewFindingOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const trialForm = useForm<CreateTrialFormValues>({
    resolver: zodResolver(createTrialSchema),
    defaultValues: {
      projectId: "",
      title: "",
      objective: "",
      trialDate: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  const executeForm = useForm<ExecuteTrialFormValues>({
    resolver: zodResolver(executeTrialSchema),
    defaultValues: {
      totalSamplesTested: 10,
      notes: "",
      consumptions: [
        {
          labReagentUnitId: "",
          sampleUses: 10,
          repeatUses: 0,
          calibratorUses: 1,
          controlUses: 1,
        },
      ],
    },
  });

  const {
    fields: execFields,
    append: appendExec,
    remove: removeExec,
  } = useFieldArray({
    control: executeForm.control,
    name: "consumptions",
  });

  const findingForm = useForm<CreateFindingFormValues>({
    resolver: zodResolver(createFindingSchema),
    defaultValues: {
      projectId: "",
      trialId: "",
      title: "",
      findingType: "PRELIMINARY_RESULT",
      summary: "",
      conclusion: "",
      isPublished: true,
    },
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [trialsData, findingsData, projectsData, unitsData] = await Promise.all([
        ResearchService.getTrials(),
        ResearchService.getFindings(),
        ResearchService.getProjects(),
        LabWorkflowService.getLabUnits(),
      ]);
      setTrials(trialsData);
      setFindings(findingsData);
      setProjects(projectsData);
      setAvailableUnits(unitsData.filter((u) => u.status === "EN_USO" || u.status === "SELLADO"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cargar bitácora";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Crear Ensayo
  const onSubmitTrial = async (values: CreateTrialFormValues) => {
    setSubmitting(true);
    try {
      await ResearchService.createTrial({
        projectId: Number(values.projectId),
        title: values.title,
        objective: values.objective,
        trialDate: values.trialDate,
        notes: values.notes,
      });

      setIsNewTrialOpen(false);
      trialForm.reset();
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al programar ensayo";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Abrir Modal Ejecutar
  const handleOpenExecute = (trial: ResearchTrial) => {
    setExecutingTrial(trial);
    executeForm.reset({
      totalSamplesTested: 10,
      notes: "",
      consumptions: [
        {
          labReagentUnitId: "",
          sampleUses: 10,
          repeatUses: 0,
          calibratorUses: 1,
          controlUses: 1,
        },
      ],
    });
    setIsExecuteTrialOpen(true);
  };

  // Enviar Ejecución de Ensayo
  const onSubmitExecute = async (values: ExecuteTrialFormValues) => {
    if (!executingTrial) return;
    setSubmitting(true);
    try {
      await ResearchService.recordTrialExecution(executingTrial.id, {
        totalSamplesTested: values.totalSamplesTested,
        notes: values.notes,
        consumptions: values.consumptions.map((c) => ({
          labReagentUnitId: c.labReagentUnitId,
          sampleUses: c.sampleUses,
          repeatUses: c.repeatUses,
          calibratorUses: c.calibratorUses,
          controlUses: c.controlUses,
        })),
      });

      setIsExecuteTrialOpen(false);
      setExecutingTrial(null);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar ejecución de ensayo";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Crear Hallazgo
  const onSubmitFinding = async (values: CreateFindingFormValues) => {
    setSubmitting(true);
    try {
      await ResearchService.createFinding({
        projectId: Number(values.projectId),
        trialId: values.trialId ? Number(values.trialId) : null,
        title: values.title,
        findingType: values.findingType,
        summary: values.summary,
        conclusion: values.conclusion,
        isPublished: values.isPublished,
      });

      setIsNewFindingOpen(false);
      findingForm.reset();
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar hallazgo";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y Acciones */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Bitácora de Ensayos Experimentales & Hallazgos
          </h2>
          <p className="text-xs text-muted-foreground">
            Protocolos de experimentación, consumo de reactivos de investigación y registro de evidencias científicas.
          </p>
        </div>

        <div className="flex items-center gap-2">
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

          {activeTab === "trials" ? (
            <Button
              size="sm"
              onClick={() => setIsNewTrialOpen(true)}
              className="text-xs gap-1.5 h-9 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <PlusCircle className="w-4 h-4" />
              Programar Ensayo
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => setIsNewFindingOpen(true)}
              className="text-xs gap-1.5 h-9 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Sparkles className="w-4 h-4" />
              Registrar Hallazgo
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabs Principales */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "trials" | "findings")}
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 max-w-md mb-4">
          <TabsTrigger value="trials" className="text-xs">
            Bitácora de Ensayos ({trials.length})
          </TabsTrigger>
          <TabsTrigger value="findings" className="text-xs">
            Hallazgos & Resultados ({findings.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: ENSAYOS */}
        <TabsContent value="trials" className="space-y-4">
          <Card className="border border-border/80 shadow-xs overflow-hidden">
            <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/60">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-indigo-600" />
                <span>Ensayos Experimentales Programados y Ejecutados</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="text-xs">
                      <TableHead className="w-[120px]">Código</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Proyecto</TableHead>
                      <TableHead>Título del Ensayo</TableHead>
                      <TableHead className="text-right">Muestras</TableHead>
                      <TableHead className="text-right">Costo Incurrido</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {trials.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No hay ensayos registrados. Haz clic en &quot;Programar Ensayo&quot; para registrar uno.
                        </TableCell>
                      </TableRow>
                    ) : (
                      trials.map((trial) => (
                        <TableRow key={trial.id} className="hover:bg-muted/30">
                          <TableCell className="font-mono font-bold text-foreground">
                            {trial.code}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(trial.trialDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {trial.project?.code}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-foreground max-w-[220px]">
                            <div>{trial.title}</div>
                            {trial.objective && (
                              <div className="text-[10px] text-muted-foreground font-normal truncate">
                                {trial.objective}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold">
                            {trial.totalSamplesTested}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-emerald-600">
                            {trial.trialCost ? `$${Number(trial.trialCost).toFixed(2)}` : "$0.00"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                trial.status === "COMPLETED"
                                  ? "bg-emerald-600"
                                  : trial.status === "IN_PROGRESS"
                                  ? "bg-indigo-600"
                                  : "bg-amber-500"
                              }
                            >
                              {trial.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {trial.status !== "COMPLETED" ? (
                              <Button
                                size="sm"
                                onClick={() => handleOpenExecute(trial)}
                                className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
                              >
                                <Play className="w-3 h-3" />
                                Registrar Ejecución
                              </Button>
                            ) : (
                              <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 justify-end">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Concluido
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: HALLAZGOS */}
        <TabsContent value="findings" className="space-y-4">
          <Card className="border border-border/80 shadow-xs overflow-hidden">
            <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/60">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Hallazgos, Optimizaciones y Conclusiones Científicas</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="text-xs">
                      <TableHead>Fecha</TableHead>
                      <TableHead>Proyecto</TableHead>
                      <TableHead>Tipo de Hallazgo</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Resumen Científico</TableHead>
                      <TableHead>Registrado Por</TableHead>
                      <TableHead className="text-center">Publicado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {findings.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No se han reportado hallazgos aún. Haz clic en &quot;Registrar Hallazgo&quot; para añadir uno.
                        </TableCell>
                      </TableRow>
                    ) : (
                      findings.map((finding) => (
                        <TableRow key={finding.id} className="hover:bg-muted/30">
                          <TableCell className="text-muted-foreground font-mono">
                            {new Date(finding.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {finding.project?.code}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-[10px]">
                              {finding.findingType}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-foreground">
                            {finding.title}
                          </TableCell>
                          <TableCell className="max-w-[280px] text-muted-foreground text-xs leading-relaxed">
                            {finding.summary}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {finding.recordedBy?.fullName || "Investigador"}
                          </TableCell>
                          <TableCell className="text-center">
                            {finding.isPublished ? (
                              <Badge className="bg-emerald-600 text-[10px]">Público I+D</Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">Borrador</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL CREAR ENSAYO */}
      <Dialog open={isNewTrialOpen} onOpenChange={setIsNewTrialOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-foreground">
              <FlaskConical className="w-5 h-5 text-indigo-600" />
              <span>Programar Ensayo Experimental</span>
            </DialogTitle>
          </DialogHeader>

          <Form {...trialForm}>
            <form onSubmit={trialForm.handleSubmit(onSubmitTrial)} className="space-y-4 py-2">
              <FormField
                control={trialForm.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Proyecto de Investigación</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="text-xs h-9">
                          <SelectValue placeholder="Seleccione proyecto..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            [{p.code}] {p.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={trialForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Título del Ensayo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Ensayo de Especificidad Analítica..." className="text-xs h-9" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={trialForm.control}
                name="trialDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Fecha Programada</FormLabel>
                    <FormControl>
                      <Input type="date" className="text-xs h-9" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={trialForm.control}
                name="objective"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Objetivo Experimental</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Indique la hipótesis o variable que se evalúa..." className="text-xs min-h-[60px]" {...field} />
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
                  onClick={() => setIsNewTrialOpen(false)}
                  disabled={submitting}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3 h-3 animate-spin" />}
                  Guardar Ensayo
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* MODAL REGISTRAR EJECUCIÓN CON CONSUMO DE REACTIVOS */}
      <Dialog open={isExecuteTrialOpen} onOpenChange={setIsExecuteTrialOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-foreground">
              <Play className="w-5 h-5 text-indigo-600" />
              <span>Registrar Ejecución de Ensayo {executingTrial?.code}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Liquida el consumo de reactivos utilizados y calcula el costo absorbido por el proyecto.
            </DialogDescription>
          </DialogHeader>

          <Form {...executeForm}>
            <form onSubmit={executeForm.handleSubmit(onSubmitExecute)} className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={executeForm.control}
                  name="totalSamplesTested"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Total Muestras Ensayadas</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} className="text-xs h-9 font-mono font-bold" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={executeForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Observaciones del Ensayo</FormLabel>
                      <FormControl>
                        <Input placeholder="Comportamiento cinético, lecturas ópticas..." className="text-xs h-9" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Reactivos consumidos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Reactivos Utilizados</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      appendExec({
                        labReagentUnitId: "",
                        sampleUses: 10,
                        repeatUses: 0,
                        calibratorUses: 1,
                        controlUses: 1,
                      })
                    }
                    className="text-xs text-indigo-600 h-7 px-2 gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Añadir Frasco
                  </Button>
                </div>

                <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                  {execFields.map((field, index) => (
                    <div key={field.id} className="p-3 rounded-lg border bg-muted/20 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">Reactivo #{index + 1}</span>
                        {execFields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeExec(index)}
                            className="h-6 w-6 p-0 text-rose-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>

                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-0.5">
                          Frasco de Reactivo
                        </label>
                        <Select
                          value={executeForm.watch(`consumptions.${index}.labReagentUnitId`)}
                          onValueChange={(val) =>
                            executeForm.setValue(`consumptions.${index}.labReagentUnitId`, val)
                          }
                        >
                          <SelectTrigger className="text-xs h-8">
                            <SelectValue placeholder="Seleccione frasco..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableUnits.map((u) => (
                              <SelectItem key={String(u.id)} value={String(u.id)}>
                                {u.unitCode} &bull; {u.product.name} (Lote: {u.batch?.lotNumber}) &bull; {u.currentVolume} usos
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-0.5">Usos Muestra</label>
                          <Input
                            type="number"
                            min={0}
                            {...executeForm.register(`consumptions.${index}.sampleUses` as const, {
                              valueAsNumber: true,
                            })}
                            className="h-7 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-0.5">Repeticiones</label>
                          <Input
                            type="number"
                            min={0}
                            {...executeForm.register(`consumptions.${index}.repeatUses` as const, {
                              valueAsNumber: true,
                            })}
                            className="h-7 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-0.5">Calibrador</label>
                          <Input
                            type="number"
                            min={0}
                            {...executeForm.register(`consumptions.${index}.calibratorUses` as const, {
                              valueAsNumber: true,
                            })}
                            className="h-7 text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-0.5">Controles</label>
                          <Input
                            type="number"
                            min={0}
                            {...executeForm.register(`consumptions.${index}.controlUses` as const, {
                              valueAsNumber: true,
                            })}
                            className="h-7 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExecuteTrialOpen(false)}
                  disabled={submitting}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3 h-3 animate-spin" />}
                  Liquidary Cerrar Ensayo
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* MODAL REGISTRAR HALLAZGO */}
      <Dialog open={isNewFindingOpen} onOpenChange={setIsNewFindingOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-foreground">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              <span>Registrar Hallazgo o Resultado Científico</span>
            </DialogTitle>
          </DialogHeader>

          <Form {...findingForm}>
            <form onSubmit={findingForm.handleSubmit(onSubmitFinding)} className="space-y-4 py-2">
              <FormField
                control={findingForm.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Proyecto Asociado</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="text-xs h-9">
                          <SelectValue placeholder="Seleccione proyecto..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            [{p.code}] {p.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={findingForm.control}
                name="findingType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Tipo de Hallazgo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="text-xs h-9">
                          <SelectValue placeholder="Seleccione tipo..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PRELIMINARY_RESULT">Resultado Preliminar</SelectItem>
                        <SelectItem value="PROTOCOL_OPTIMIZATION">Optimización de Protocolo</SelectItem>
                        <SelectItem value="ACCURACY_VALIDATION">Validación de Exactitud</SelectItem>
                        <SelectItem value="ANOMALY_DETECTED">Anomalía Detectada</SelectItem>
                        <SelectItem value="FINAL_CONCLUSION">Conclusión Final</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={findingForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Título del Hallazgo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Reducción del 40% en volumen muerto con micro-cubetas..." className="text-xs h-9" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={findingForm.control}
                name="summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Resumen del Resultado</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe las observaciones cuantitativas y cualitativas..." className="text-xs min-h-[70px]" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={findingForm.control}
                name="isPublished"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-xs font-semibold">Publicar en Bitácora Institucional</FormLabel>
                      <div className="text-[10px] text-muted-foreground">
                        Permite que el equipo de I+D consulte las conclusiones.
                      </div>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNewFindingOpen(false)}
                  disabled={submitting}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3 h-3 animate-spin" />}
                  Publicar Hallazgo
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
