"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { FridgeAuditService } from "@/services/fridge-audit.service";
import { LabWorkflowService } from "@/services/lab-workflow.service";
import type { FridgePhysicalAudit } from "@/types/lab-workflow";
import type { LabFridge, LabReagentUnitItem } from "@/types/laboratory";
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
import { Separator } from "@/components/ui/separator";
import {
  Snowflake,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  RefreshCw,
  Eye,
  Calendar,
  User,
  SlidersHorizontal,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const fridgeAuditItemSchema = z.object({
  labReagentUnitId: z.string().min(1, "ID de frasco requerido"),
  unitCode: z.string(),
  productName: z.string(),
  lotNumber: z.string(),
  systemUsesBefore: z.number(),
  physicalRemainingUses: z.number().min(0, "Los usos no pueden ser negativos"),
  notes: z.string().optional(),
});

const fridgeAuditSchema = z.object({
  fridgeId: z.string().min(1, "Debe seleccionar una nevera para auditar"),
  notes: z.string().optional(),
  items: z.array(fridgeAuditItemSchema).min(1, "La nevera seleccionada no contiene frascos para auditar"),
});

type FridgeAuditFormValues = z.infer<typeof fridgeAuditSchema>;

export default function CoordinatorFridgeAuditPage() {
  const [audits, setAudits] = useState<FridgePhysicalAudit[]>([]);
  const [fridges, setFridges] = useState<LabFridge[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Nuevo Arqueo
  const [isNewAuditOpen, setIsNewAuditOpen] = useState<boolean>(false);
  const [loadingFridgeUnits, setLoadingFridgeUnits] = useState<boolean>(false);
  const [submittingAudit, setSubmittingAudit] = useState<boolean>(false);

  // Modal Ver Detalle de Arqueo
  const [selectedAudit, setSelectedAudit] = useState<FridgePhysicalAudit | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState<boolean>(false);

  const form = useForm<FridgeAuditFormValues>({
    resolver: zodResolver(fridgeAuditSchema),
    defaultValues: {
      fridgeId: "",
      notes: "",
      items: [],
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const loadAudits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [auditData, fridgeData] = await Promise.all([
        FridgeAuditService.listFridgeAudits(),
        LabWorkflowService.getFridges(),
      ]);
      setAudits(auditData);
      setFridges(fridgeData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cargar arqueos de neveras";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAudits();
  }, [loadAudits]);

  // Al seleccionar una nevera en el formulario, cargar sus frascos activos
  const handleFridgeSelect = async (fridgeIdStr: string) => {
    form.setValue("fridgeId", fridgeIdStr);
    if (!fridgeIdStr) {
      replace([]);
      return;
    }

    setLoadingFridgeUnits(true);
    try {
      const units = await LabWorkflowService.getLabUnits({
        fridgeId: Number(fridgeIdStr),
      });

      const auditItems = units
        .filter((u) => u.status === "SELLADO" || u.status === "EN_USO")
        .map((u) => ({
          labReagentUnitId: String(u.id),
          unitCode: u.unitCode,
          productName: u.product.name,
          lotNumber: u.batch?.lotNumber || "N/A",
          systemUsesBefore: Number(u.currentVolume),
          physicalRemainingUses: Number(u.currentVolume), // Default al valor del sistema
          notes: "",
        }));

      replace(auditItems);
    } catch (err) {
      console.error("Error al cargar frascos de la nevera:", err);
    } finally {
      setLoadingFridgeUnits(false);
    }
  };

  // Enviar Arqueo Físico
  const onSubmitAudit = async (values: FridgeAuditFormValues) => {
    setSubmittingAudit(true);
    try {
      await FridgeAuditService.createFridgeAudit({
        notes: values.notes,
        items: values.items.map((i) => ({
          labReagentUnitId: i.labReagentUnitId,
          physicalRemainingUses: i.physicalRemainingUses,
          notes: i.notes || undefined,
        })),
      });

      setIsNewAuditOpen(false);
      form.reset({ fridgeId: "", notes: "", items: [] });
      await loadAudits();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al guardar arqueo";
      alert(msg);
    } finally {
      setSubmittingAudit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de Acciones */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">
            Auditoría Físcia & Cotejo de Cavas / Neveras
          </h2>
          <p className="text-xs text-muted-foreground">
            Inspección periódica del volumen físico en frasco vs usos teóricos restantes en sistema.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadAudits()}
            disabled={loading}
            className="text-xs gap-1.5 h-9"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            Actualizar
          </Button>
          <Button
            size="sm"
            onClick={() => {
              form.reset({ fridgeId: "", notes: "", items: [] });
              setIsNewAuditOpen(true);
            }}
            className="text-xs gap-1.5 h-9 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <PlusCircle className="w-4 h-4" />
            Iniciar Arqueo de Nevera
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Historial de Arqueos Realizados */}
      <Card className="border border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/60">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-600" />
            <span>Historial de Arqueos Físicos Registrados</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="text-xs">
                  <TableHead className="w-[150px]">Código Arqueo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Auditor Responsable</TableHead>
                  <TableHead className="text-center">Ítems Auditados</TableHead>
                  <TableHead>Observaciones</TableHead>
                  <TableHead className="text-right">Detalle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {audits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No se han registrado arqueos físicos aún.
                    </TableCell>
                  </TableRow>
                ) : (
                  audits.map((audit) => (
                    <TableRow key={audit.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono font-bold text-foreground">
                        {audit.code}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{new Date(audit.createdAt).toLocaleDateString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <User className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{audit.performedBy.fullName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-mono text-[11px]">
                          {audit.items.length} frascos
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[250px] truncate text-muted-foreground">
                        {audit.notes || "Sin observaciones adicionales"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedAudit(audit);
                            setIsDetailOpen(true);
                          }}
                          className="h-7 text-xs gap-1 text-primary hover:text-primary"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver Cotejo
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL INICIAR NUEVO ARQUEO */}
      <Dialog open={isNewAuditOpen} onOpenChange={setIsNewAuditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-foreground">
              <Snowflake className="w-5 h-5 text-blue-600" />
              <span>Arqueo Físico de Nevera / Cava</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Compara el conteo físico real contra los usos registrados en sistema para detectar mermas o sobrantes.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitAudit)} className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fridgeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Nevera / Equipo a Auditar</FormLabel>
                      <Select
                        onValueChange={(val) => void handleFridgeSelect(val)}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="text-xs h-9">
                            <SelectValue placeholder="Seleccione una nevera..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {fridges.map((f) => (
                            <SelectItem key={f.id} value={String(f.id)}>
                              [{f.code}] {f.name} &bull; {f.targetTempCelsius ? `${f.targetTempCelsius}°C` : "Ambiente"}
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
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Observaciones Generales</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej. Arqueo mensual rutinario, revisión post-guardia..."
                          className="text-xs h-9"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              {/* Lista de Frascos a Auditar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Frascos Contenidos ({fields.length})
                  </span>
                  {loadingFridgeUnits && (
                    <span className="text-xs text-blue-600 flex items-center gap-1 animate-pulse">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      Cargando frascos...
                    </span>
                  )}
                </div>

                {fields.length === 0 && !loadingFridgeUnits && (
                  <p className="text-xs text-muted-foreground p-4 bg-muted/20 border border-dashed rounded text-center">
                    Seleccione una nevera con reactivos para desplegar la grilla de conteo físico.
                  </p>
                )}

                {fields.length > 0 && (
                  <div className="border rounded-lg overflow-x-auto max-h-[350px]">
                    <Table>
                      <TableHeader className="bg-muted/40 sticky top-0 z-10">
                        <TableRow className="text-xs">
                          <TableHead>Frasco / Lote</TableHead>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-right">Sistema (Usos)</TableHead>
                          <TableHead className="w-[140px] text-right">Físico Real (Usos)</TableHead>
                          <TableHead className="text-center">Desviación</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="text-xs">
                        {fields.map((field, index) => {
                          const currentPhysical = form.watch(`items.${index}.physicalRemainingUses`);
                          const systemUses = field.systemUsesBefore;
                          const diff = (Number(currentPhysical) || 0) - systemUses;

                          return (
                            <TableRow key={field.id} className="hover:bg-muted/20">
                              <TableCell className="font-mono">
                                <span className="font-bold text-foreground block">{field.unitCode}</span>
                                <span className="text-[10px] text-muted-foreground">Lote: {field.lotNumber}</span>
                              </TableCell>
                              <TableCell className="font-medium text-foreground">
                                {field.productName}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold text-foreground">
                                {systemUses}
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  min={0}
                                  {...form.register(`items.${index}.physicalRemainingUses` as const, {
                                    valueAsNumber: true,
                                  })}
                                  className="h-8 text-right font-mono font-bold text-xs"
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                {diff === 0 ? (
                                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                                    Conforme (0)
                                  </Badge>
                                ) : diff > 0 ? (
                                  <Badge className="text-[10px] bg-blue-600">
                                    +{diff} Sobrante
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-[10px]">
                                    {diff} Merma
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNewAuditOpen(false)}
                  disabled={submittingAudit}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingAudit || fields.length === 0}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                >
                  {submittingAudit && <RefreshCw className="w-3 h-3 animate-spin" />}
                  Registrar Arqueo & Ajustar Kardex
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* MODAL DETALLE DE ARQUEO */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FileCheck className="w-5 h-5 text-emerald-600" />
              <span>Cotejo Físico de Arqueo {selectedAudit?.code}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Auditado por {selectedAudit?.performedBy.fullName} el{" "}
              {selectedAudit?.createdAt ? new Date(selectedAudit.createdAt).toLocaleString() : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {selectedAudit?.notes && (
              <div className="text-xs bg-muted/30 p-2.5 rounded border border-border">
                <strong className="text-foreground">Observaciones:</strong> {selectedAudit.notes}
              </div>
            )}

            <div className="border rounded-lg overflow-x-auto max-h-[350px]">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="text-xs">
                    <TableHead>Frasco</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Sistema Antes</TableHead>
                    <TableHead className="text-right">Conteo Físico</TableHead>
                    <TableHead className="text-right">Ajuste Aplicado</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {selectedAudit?.items.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/20">
                      <TableCell className="font-mono font-bold">
                        {item.labReagentUnit?.unitCode || "Unidad"}
                      </TableCell>
                      <TableCell>
                        {item.labReagentUnit?.product.name || "Reactivo"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.systemUsesBefore}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {item.physicalRemainingUses}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {item.adjustmentUses > 0
                          ? `+${item.adjustmentUses}`
                          : item.adjustmentUses}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            item.adjustmentStatus === "RECONCILED_MATCH"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : item.adjustmentStatus === "SURPLUS_DETECTED"
                              ? "bg-blue-50 text-blue-700 border-blue-300"
                              : "bg-rose-50 text-rose-700 border-rose-300"
                          }
                        >
                          {item.adjustmentStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDetailOpen(false)}
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
