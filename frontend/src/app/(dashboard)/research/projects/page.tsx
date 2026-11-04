"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ResearchService } from "@/services/research.service";
import type { ResearchProject } from "@/types/research";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Microscope,
  PlusCircle,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  User,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const createProjectSchema = z.object({
  title: z.string().min(5, "Título de al menos 5 caracteres"),
  description: z.string().optional(),
  projectType: z.enum([
    "EXPERIMENTAL_DEVELOPMENT",
    "CLINICAL_VALIDATION",
    "ACADEMIC_THESIS",
    "PILOT_STUDY",
    "QUALITY_ASSURANCE",
  ]),
  budgetEstimated: z.number().min(0, "Presupuesto >= 0"),
  startDate: z.string().min(1, "Fecha de inicio requerida"),
  endDate: z.string().optional().or(z.literal("")),
});

type CreateProjectFormValues = z.infer<typeof createProjectSchema>;

export default function ResearchProjectsPage() {
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Nuevo Proyecto
  const [isNewProjectOpen, setIsNewProjectOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const form = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      title: "",
      description: "",
      projectType: "EXPERIMENTAL_DEVELOPMENT",
      budgetEstimated: 5000,
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
    },
  });

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ResearchService.getProjects();
      setProjects(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cargar proyectos de investigación";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const onSubmitProject = async (values: CreateProjectFormValues) => {
    setSubmitting(true);
    try {
      await ResearchService.createProject({
        title: values.title,
        description: values.description,
        projectType: values.projectType,
        budgetEstimated: values.budgetEstimated,
        startDate: values.startDate,
        endDate: values.endDate || undefined,
      });

      setIsNewProjectOpen(false);
      form.reset();
      await loadProjects();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar proyecto";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (val: number | string | undefined | null) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  const totalEstimated = projects.reduce((acc, p) => acc + Number(p.budgetEstimated || 0), 0);
  const totalExecuted = projects.reduce((acc, p) => acc + Number(p.budgetExecuted || 0), 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-emerald-600 hover:bg-emerald-700">Activo</Badge>;
      case "COMPLETED":
        return <Badge className="bg-blue-600 hover:bg-blue-700">Completado</Badge>;
      case "DRAFT":
        return <Badge variant="outline">Borrador</Badge>;
      case "PAUSED":
        return <Badge className="bg-amber-500 hover:bg-amber-600">Pausado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado y Acciones */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Líneas de Investigación, Proyectos & Presupuesto
          </h2>
          <p className="text-xs text-muted-foreground">
            Control de fondos, ejecución presupuestaria y ensayos científicos del instituto.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadProjects()}
            disabled={loading}
            className="text-xs gap-1.5 h-9"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Actualizar
          </Button>
          <Button
            size="sm"
            onClick={() => setIsNewProjectOpen(true)}
            className="text-xs gap-1.5 h-9 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <PlusCircle className="w-4 h-4" />
            Nuevo Proyecto
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tarjetas KPI Presupuesto */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Presupuesto Global Asignado</span>
              <DollarSign className="w-4 h-4 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-foreground font-mono">
              {formatCurrency(totalEstimated)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              En {projects.length} proyectos registrados
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Gasto Real Ejecutado</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-emerald-600 font-mono">
              {formatCurrency(totalExecuted)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Reactivos consumidos en ensayos
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs bg-indigo-50/50 dark:bg-indigo-950/20">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-medium text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
              <span>Ejecución Financiera</span>
              <Sparkles className="w-4 h-4 text-indigo-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 font-mono">
              {totalEstimated > 0 ? ((totalExecuted / totalEstimated) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-[11px] text-indigo-600/80 mt-0.5">
              Disponibilidad presupuestaria: {formatCurrency(totalEstimated - totalExecuted)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Proyectos */}
      <Card className="border border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/60">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Microscope className="w-4 h-4 text-indigo-600" />
            <span>Portafolio de Proyectos de Investigación</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="text-xs">
                  <TableHead className="w-[120px]">Código</TableHead>
                  <TableHead>Título del Proyecto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Investigador Líder</TableHead>
                  <TableHead className="text-right">Presupuesto ($)</TableHead>
                  <TableHead className="text-right">Ejecutado ($)</TableHead>
                  <TableHead className="text-center w-[120px]">Avance</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No hay proyectos registrados aún. Haz clic en &quot;Nuevo Proyecto&quot; para registrar uno.
                    </TableCell>
                  </TableRow>
                ) : (
                  projects.map((proj) => {
                    const est = Number(proj.budgetEstimated || 0);
                    const exec = Number(proj.budgetExecuted || 0);
                    const pct = est > 0 ? Math.min((exec / est) * 100, 100) : 0;

                    return (
                      <TableRow key={proj.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono font-bold text-foreground">
                          {proj.code}
                        </TableCell>
                        <TableCell className="font-semibold text-foreground max-w-[240px]">
                          <div>{proj.title}</div>
                          {proj.description && (
                            <div className="text-[10px] text-muted-foreground truncate font-normal">
                              {proj.description}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {proj.projectType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <User className="w-3.5 h-3.5" />
                            <span>{proj.leadInvestigator?.fullName || "Por Asignar"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {formatCurrency(proj.budgetEstimated)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-emerald-600">
                          {formatCurrency(proj.budgetExecuted)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-mono">
                              <span>{pct.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-indigo-600 h-1.5 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(proj.status)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL NUEVO PROYECTO */}
      <Dialog open={isNewProjectOpen} onOpenChange={setIsNewProjectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-foreground">
              <Microscope className="w-5 h-5 text-indigo-600" />
              <span>Registrar Proyecto de Investigación</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Crea una línea de investigación para asignarle presupuesto, reactivos donados y ensayos.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitProject)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Título del Proyecto</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej. Validación de Marcadores Tumorales en Suero..." className="text-xs h-9" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="projectType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Tipo de Proyecto</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="text-xs h-9">
                          <SelectValue placeholder="Seleccione tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EXPERIMENTAL_DEVELOPMENT">Desarrollo Experimental</SelectItem>
                        <SelectItem value="CLINICAL_VALIDATION">Validación Clínica</SelectItem>
                        <SelectItem value="ACADEMIC_THESIS">Tesis de Postgrado / Docencia</SelectItem>
                        <SelectItem value="PILOT_STUDY">Estudio Piloto</SelectItem>
                        <SelectItem value="QUALITY_ASSURANCE">Aseguramiento Metrológico de Calidad</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="budgetEstimated"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Presupuesto Estimado ($ USD)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} step={100} className="text-xs h-9 font-mono" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Fecha de Inicio</FormLabel>
                      <FormControl>
                        <Input type="date" className="text-xs h-9" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Fecha Fin (Estimada)</FormLabel>
                      <FormControl>
                        <Input type="date" className="text-xs h-9" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Descripción y Objetivos</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Detalla el alcance o hipótesis de trabajo..." className="text-xs min-h-[60px]" {...field} />
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
                  onClick={() => setIsNewProjectOpen(false)}
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
                  Crear Proyecto
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
