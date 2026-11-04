"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { LabWorkflowService } from "@/services/lab-workflow.service";
import type { QuarantineIncident, LabArea } from "@/types/lab-workflow";
import type { LabReagentUnitItem } from "@/types/laboratory";
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
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  PlusCircle,
  RefreshCw,
  Search,
  Filter,
  Microscope,
  RotateCcw,
  Trash2,
  Send,
  User,
  Snowflake,
} from "lucide-react";
import { cn } from "@/lib/utils";

const quarantineFormSchema = z.object({
  unitId: z.string().min(1, "Debe seleccionar un frasco de reactivo"),
  quarantineReason: z.enum([
    "DEFECTIVE_KIT",
    "CONTAMINATION",
    "TEMPERATURE_BREACH",
    "RECALL",
    "EXPIRATION",
    "SUSPECTED_DEGRADATION",
    "PHYSICAL_DAMAGE",
    "OTHER",
  ]),
  description: z.string().min(10, "La descripción del defecto debe tener al menos 10 caracteres"),
  evidenceUrl: z.string().url("URL de evidencia inválida").optional().or(z.literal("")),
  labAreaId: z.string().optional(),
});

type QuarantineFormValues = z.infer<typeof quarantineFormSchema>;

export default function CoordinatorQuarantinePage() {
  const [incidents, setIncidents] = useState<QuarantineIncident[]>([]);
  const [areas, setAreas] = useState<LabArea[]>([]);
  const [activeUnits, setActiveUnits] = useState<LabReagentUnitItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [reasonFilter, setReasonFilter] = useState<string>("ALL");

  // Modales
  const [isNewQuarantineOpen, setIsNewQuarantineOpen] = useState<boolean>(false);
  const [selectedIncident, setSelectedIncident] = useState<QuarantineIncident | null>(null);
  const [isResolveOpen, setIsResolveOpen] = useState<boolean>(false);
  const [resolutionStatus, setResolutionStatus] = useState<string>("RETURNED_TO_INVENTORY");
  const [resolutionNotes, setResolutionNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const form = useForm<QuarantineFormValues>({
    resolver: zodResolver(quarantineFormSchema),
    defaultValues: {
      unitId: "",
      quarantineReason: "DEFECTIVE_KIT",
      description: "",
      evidenceUrl: "",
      labAreaId: "",
    },
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [incData, areaData, unitsData] = await Promise.all([
        LabWorkflowService.getQuarantineIncidents({
          resolutionStatus: statusFilter !== "ALL" ? statusFilter : undefined,
        }),
        LabWorkflowService.getLabAreas(),
        LabWorkflowService.getLabUnits(),
      ]);
      setIncidents(incData);
      setAreas(areaData);
      // Filtrar frascos que se encuentran operativos (SELLADO o EN_USO) para poner en cuarentena
      setActiveUnits(unitsData.filter((u) => u.status === "SELLADO" || u.status === "EN_USO"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cargar cuarentena";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Enviar Nuevo Aislamiento a Cuarentena
  const onSubmitNewQuarantine = async (values: QuarantineFormValues) => {
    setSubmitting(true);
    try {
      await LabWorkflowService.putUnitInQuarantine(values.unitId, {
        quarantineReason: values.quarantineReason,
        description: values.description,
        evidenceUrl: values.evidenceUrl || undefined,
        labAreaId: values.labAreaId ? Number(values.labAreaId) : null,
      });

      setIsNewQuarantineOpen(false);
      form.reset();
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al aislar unidad";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Resolver Cuarentena
  const handleResolveQuarantine = async () => {
    if (!selectedIncident || !resolutionNotes.trim()) return;
    setSubmitting(true);
    try {
      await LabWorkflowService.resolveQuarantine(selectedIncident.id, {
        resolutionStatus,
        resolutionNotes,
      });

      setIsResolveOpen(false);
      setSelectedIncident(null);
      setResolutionNotes("");
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al resolver cuarentena";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case "DEFECTIVE_KIT":
        return "Kit Defectuoso / Reactivo Inerte";
      case "CONTAMINATION":
        return "Contaminación / Turbidez";
      case "TEMPERATURE_BREACH":
        return "Quiebre de Cadena de Frío";
      case "RECALL":
        return "Retiro de Lote (Recall Fabricante)";
      case "EXPIRATION":
        return "Expiración de Lote";
      case "SUSPECTED_DEGRADATION":
        return "Sospecha de Degradación";
      case "PHYSICAL_DAMAGE":
        return "Frasco Roto / Fuga";
      default:
        return reason;
    }
  };

  const getResolutionBadge = (status: string) => {
    switch (status) {
      case "RETURNED_TO_INVENTORY":
        return <Badge className="bg-emerald-600">Reincorporado a Inventario</Badge>;
      case "RETURNED_TO_SUPPLIER":
        return <Badge className="bg-amber-600">Devuelto a Proveedor</Badge>;
      case "DISCARDED":
        return <Badge variant="destructive">Descarte / Merma</Badge>;
      case "DOWNGRADED_TO_RESEARCH":
        return <Badge className="bg-indigo-600">Degradado a Investigación</Badge>;
      default:
        return <Badge variant="outline">En Cuarentena Preventiva</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de Filtros y Acción Rápida */}
      <Card className="border border-border/80 shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-56">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Estado de resolución" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Todas las resoluciones</SelectItem>
                    <SelectItem value="RETURNED_TO_INVENTORY">Reincorporados</SelectItem>
                    <SelectItem value="RETURNED_TO_SUPPLIER">Devueltos a Proveedor</SelectItem>
                    <SelectItem value="DISCARDED">Descartados</SelectItem>
                    <SelectItem value="DOWNGRADED_TO_RESEARCH">Degradados a I+D</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
            </div>

            <Button
              size="sm"
              onClick={() => setIsNewQuarantineOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1.5 h-9 w-full sm:w-auto"
            >
              <AlertTriangle className="w-4 h-4" />
              Poner Reactivo en Cuarentena
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tabla de Incidencias */}
      <Card className="border border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/60">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Incidencias de Cuarentena y Control de Calidad Interno</span>
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Aislamiento de frascos que no cumplen con los controles biológicos o presentan anomalías en cadena de frío.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="text-xs">
                  <TableHead className="w-[120px]">Código</TableHead>
                  <TableHead>Frasco / Lote</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Reportado Por</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Resolución</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {incidents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay incidencias registradas en este período.
                    </TableCell>
                  </TableRow>
                ) : (
                  incidents.map((inc) => (
                    <TableRow key={String(inc.id)} className="hover:bg-muted/30">
                      <TableCell className="font-mono font-bold text-foreground">
                        {inc.code}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-foreground">
                          {inc.unit?.product?.name || "Reactivo"}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {inc.unit?.unitCode} &bull; Lote: {inc.unit?.batch?.lotNumber || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-300">
                          {getReasonLabel(inc.quarantineReason)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <span>{inc.reportedBy.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground" title={inc.description}>
                        {inc.description}
                      </TableCell>
                      <TableCell>{getResolutionBadge(inc.resolutionStatus)}</TableCell>
                      <TableCell className="text-right">
                        {!inc.resolvedAt ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedIncident(inc);
                              setIsResolveOpen(true);
                            }}
                            className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Resolver
                          </Button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(inc.resolvedAt).toLocaleDateString()}
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

      {/* MODAL PARA PONER EN CUARENTENA */}
      <Dialog open={isNewQuarantineOpen} onOpenChange={setIsNewQuarantineOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-amber-600">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span>Aislar Reactivo en Cuarentena Preventiva</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Bloquea de inmediato el frasco para evitar su empleo en corridas clínicas de pacientes.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitNewQuarantine)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="unitId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Frasco de Reactivo en Uso</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="text-xs h-9">
                          <SelectValue placeholder="Seleccione el frasco con falla o alerta..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeUnits.map((u) => (
                          <SelectItem key={String(u.id)} value={String(u.id)}>
                            {u.unitCode} &bull; {u.product.name} (Lote: {u.batch?.lotNumber}) &bull; {u.fridge?.name || "Sin Nevera"}
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
                name="quarantineReason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Motivo de Cuarentena</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="text-xs h-9">
                          <SelectValue placeholder="Seleccione motivo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DEFECTIVE_KIT">Kit Defectuoso / Reactivo Inerte</SelectItem>
                        <SelectItem value="CONTAMINATION">Contaminación / Turbidez</SelectItem>
                        <SelectItem value="TEMPERATURE_BREACH">Quiebre de Cadena de Frío (&gt; 8°C)</SelectItem>
                        <SelectItem value="RECALL">Retiro de Lote (Recall Fabricante)</SelectItem>
                        <SelectItem value="EXPIRATION">Expiración Prematura de Lote</SelectItem>
                        <SelectItem value="SUSPECTED_DEGRADATION">Sospecha de Degradación</SelectItem>
                        <SelectItem value="PHYSICAL_DAMAGE">Frasco Roto o Fuga</SelectItem>
                        <SelectItem value="OTHER">Otro Hallazgo Anómalo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Descripción Detallada de la Incidencia</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Indique lecturas de control de calidad fuera de rango, observaciones visuales, anomalías..."
                        className="text-xs min-h-[70px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNewQuarantineOpen(false)}
                  disabled={submitting}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                >
                  {submitting && <RefreshCw className="w-3 h-3 animate-spin" />}
                  Confirmar Cuarentena
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* MODAL DE RESOLUCIÓN TÉCNICA */}
      <Dialog open={isResolveOpen} onOpenChange={setIsResolveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-foreground">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Resolución Técnica de Incidencia {selectedIncident?.code}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Determina el destino final del reactivo tras la investigación del incidente de calidad.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-[11px] font-semibold text-foreground block mb-1">
                Disposición Final del Insumo:
              </label>
              <Select value={resolutionStatus} onValueChange={setResolutionStatus}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RETURNED_TO_INVENTORY">
                    Reincorporar a Inventario (Falsa alarma, pruebas conformes)
                  </SelectItem>
                  <SelectItem value="RETURNED_TO_SUPPLIER">
                    Devolver a Proveedor (Garantía comercial / Nota de crédito)
                  </SelectItem>
                  <SelectItem value="DISCARDED">
                    Descartar Definitivamente (Merma total por daño irreparable)
                  </SelectItem>
                  <SelectItem value="DOWNGRADED_TO_RESEARCH">
                    Degradar a Investigación (Apto para docencia / ensayos internos)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-foreground block mb-1">
                Dictamen Técnico / Justificación de Cierre (Obligatorio):
              </label>
              <Textarea
                placeholder="Detalla las pruebas realizadas o acuerdo con proveedor que sustentan la resolución..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="text-xs min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsResolveOpen(false)}
              disabled={submitting}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => void handleResolveQuarantine()}
              disabled={submitting || !resolutionNotes.trim()}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {submitting && <RefreshCw className="w-3 h-3 animate-spin" />}
              Aplicar Resolución
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
