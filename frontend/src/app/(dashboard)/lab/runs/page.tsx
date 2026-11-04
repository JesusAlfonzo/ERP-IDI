"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { LabWorkflowService } from "@/services/lab-workflow.service";
import type { LabWeeklyRun, LabArea, LabExam } from "@/types/lab-workflow";
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
  FlaskConical,
  PlusCircle,
  RefreshCw,
  Calendar,
  Activity,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle,
  Building,
} from "lucide-react";
import { cn } from "@/lib/utils";

const createRunSchema = z.object({
  labAreaId: z.string().min(1, "Seleccione el área operativa"),
  labExamId: z.string().min(1, "Seleccione el examen a procesar"),
  weekStartDate: z.string().min(1, "Fecha de inicio requerida"),
  weekEndDate: z.string().min(1, "Fecha de cierre requerida"),
  notes: z.string().optional(),
});

type CreateRunFormValues = z.infer<typeof createRunSchema>;

export default function LabRunsPage() {
  const [runs, setRuns] = useState<LabWeeklyRun[]>([]);
  const [userAreas, setUserAreas] = useState<LabArea[]>([]);
  const [exams, setExams] = useState<LabExam[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Nueva Corrida
  const [isNewRunOpen, setIsNewRunOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Obtener fechas por defecto de lunes a domingo de la semana actual
  const getDefaultDates = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    const sunday = new Date(now.setDate(diff + 6));
    return {
      start: monday.toISOString().split("T")[0],
      end: sunday.toISOString().split("T")[0],
    };
  };

  const defaultDates = getDefaultDates();

  const form = useForm<CreateRunFormValues>({
    resolver: zodResolver(createRunSchema),
    defaultValues: {
      labAreaId: "",
      labExamId: "",
      weekStartDate: defaultDates.start,
      weekEndDate: defaultDates.end,
      notes: "",
    },
  });

  const selectedAreaId = form.watch("labAreaId");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [runsData, areasData, examsData] = await Promise.all([
        LabWorkflowService.getWeeklyRuns(),
        LabWorkflowService.getMyLabAreas(),
        LabWorkflowService.getLabExams(),
      ]);
      setRuns(runsData);
      setUserAreas(areasData);
      setExams(examsData);

      if (areasData.length > 0 && !form.getValues("labAreaId")) {
        form.setValue("labAreaId", String(areasData[0].id));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cargar corridas semanales";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onSubmitRun = async (values: CreateRunFormValues) => {
    setSubmitting(true);
    try {
      await LabWorkflowService.createWeeklyRun({
        labAreaId: Number(values.labAreaId),
        labExamId: Number(values.labExamId),
        weekStartDate: values.weekStartDate,
        weekEndDate: values.weekEndDate,
        notes: values.notes,
      });

      setIsNewRunOpen(false);
      form.reset({
        labAreaId: userAreas.length > 0 ? String(userAreas[0].id) : "",
        labExamId: "",
        weekStartDate: defaultDates.start,
        weekEndDate: defaultDates.end,
        notes: "",
      });
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al aperturar corrida semanal";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "IN_PROGRESS":
        return <Badge className="bg-indigo-600 hover:bg-indigo-700">En Proceso</Badge>;
      case "PENDING_RECONCILIATION":
        return <Badge className="bg-amber-500 hover:bg-amber-600">Pendiente Conciliación</Badge>;
      case "CLOSED_RECONCILED":
        return <Badge className="bg-emerald-600 hover:bg-emerald-700">Cerrada y Conciliada</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredExams = exams.filter(
    (e) => !selectedAreaId || String(e.areaId) === selectedAreaId
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Corridas Semanales Clínicas
          </h2>
          <p className="text-xs text-muted-foreground">
            Apertura y conciliación de pruebas por bloque semanal con doble absorción de calibrador.
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
          <Button
            size="sm"
            onClick={() => setIsNewRunOpen(true)}
            className="text-xs gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <PlusCircle className="w-4 h-4" />
            Aperturar Corrida Semanal
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabla de Corridas */}
      <Card className="border border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/60">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-emerald-600" />
            <span>Listado de Corridas Semanales de Pacientes</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="text-xs">
                  <TableHead className="w-[130px]">Código</TableHead>
                  <TableHead>Examen Clínico</TableHead>
                  <TableHead>Área Operativa</TableHead>
                  <TableHead>Semana de Ejecución</TableHead>
                  <TableHead className="text-right">Pruebas Válidas</TableHead>
                  <TableHead className="text-right">Costo / Examen ($)</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {runs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No hay corridas registradas. Haz clic en &quot;Aperturar Corrida Semanal&quot; para iniciar una.
                    </TableCell>
                  </TableRow>
                ) : (
                  runs.map((run) => (
                    <TableRow key={run.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono font-bold text-foreground">
                        {run.code}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-foreground">
                          {run.labExam.name}
                        </div>
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
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {new Date(run.weekStartDate).toLocaleDateString()} -{" "}
                            {new Date(run.weekEndDate).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-foreground">
                        {run.totalValidPatientExams}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-primary">
                        {run.effectiveCostPerExam
                          ? `$${Number(run.effectiveCostPerExam).toFixed(4)}`
                          : "—"}
                      </TableCell>
                      <TableCell>{getStatusBadge(run.status)}</TableCell>
                      <TableCell className="text-right">
                        {run.status === "IN_PROGRESS" || run.status === "PENDING_RECONCILIATION" ? (
                          <Button
                            asChild
                            size="sm"
                            className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1"
                          >
                            <Link href={`/lab/runs/${run.id}/close`}>
                              Cerrar & Conciliar
                              <ArrowRight className="w-3 h-3" />
                            </Link>
                          </Button>
                        ) : (
                          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 justify-end">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Conciliado
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

      {/* MODAL APERTURAR CORRIDA */}
      <Dialog open={isNewRunOpen} onOpenChange={setIsNewRunOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-foreground">
              <FlaskConical className="w-5 h-5 text-emerald-600" />
              <span>Aperturar Corrida Semanal de Pacientes</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Habilita el período de procesamiento del examen para registrar consumos de calibrador y pacientes.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitRun)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="labAreaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Área Operativa</FormLabel>
                    <Select
                      onValueChange={(val) => {
                        field.onChange(val);
                        form.setValue("labExamId", "");
                      }}
                      defaultValue={field.value}
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
                control={form.control}
                name="labExamId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Examen a Procesar</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="text-xs h-9">
                          <SelectValue placeholder="Seleccione el examen de catálogo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredExams.map((e) => (
                          <SelectItem key={e.id} value={String(e.id)}>
                            {e.code} - {e.name}
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
                  control={form.control}
                  name="weekStartDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Inicio de Semana</FormLabel>
                      <FormControl>
                        <Input type="date" className="text-xs h-9" {...field} />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="weekEndDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Cierre de Semana</FormLabel>
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
                  disabled={submitting}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3 h-3 animate-spin" />}
                  Aperturar Corrida
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
