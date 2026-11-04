"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { LabWorkflowService } from "@/services/lab-workflow.service";
import type { LabInternalRequest, LabArea } from "@/types/lab-workflow";
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
  ClipboardList,
  PlusCircle,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  PackageCheck,
  Send,
  Building,
} from "lucide-react";
import { cn } from "@/lib/utils";

const requestItemSchema = z.object({
  productId: z.string().min(1, "Seleccione un reactivo"),
  requestedUsesOrUnits: z.number().min(1, "Cantidad mínima de 1 uso o prueba"),
});

const createRequestSchema = z.object({
  labAreaId: z.string().min(1, "Debe seleccionar el área de laboratorio"),
  justification: z.string().min(5, "Indique la justificación de la solicitud"),
  items: z.array(requestItemSchema).min(1, "Debe solicitar al menos un reactivo"),
});

type CreateRequestFormValues = z.infer<typeof createRequestSchema>;

export default function LabRequestsPage() {
  const [requests, setRequests] = useState<LabInternalRequest[]>([]);
  const [userAreas, setUserAreas] = useState<LabArea[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Array<{ id: string | number; name: string; sku: string }>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Nueva Solicitud
  const [isNewRequestOpen, setIsNewRequestOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const form = useForm<CreateRequestFormValues>({
    resolver: zodResolver(createRequestSchema),
    defaultValues: {
      labAreaId: "",
      justification: "",
      items: [{ productId: "", requestedUsesOrUnits: 100 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [reqData, areasData, unitsData] = await Promise.all([
        LabWorkflowService.getInternalRequests(),
        LabWorkflowService.getMyLabAreas(),
        LabWorkflowService.getLabUnits(),
      ]);
      setRequests(reqData);
      setUserAreas(areasData);

      // Extraer catálogo único de productos disponibles
      const prodMap = new Map<string, { id: string | number; name: string; sku: string }>();
      unitsData.forEach((u) => {
        const pId = String(u.productId);
        if (!prodMap.has(pId) && u.product) {
          prodMap.set(pId, { id: pId, name: u.product.name, sku: u.product.sku });
        }
      });
      setAvailableProducts(Array.from(prodMap.values()));

      // Si tiene al menos un área asignada, pre-seleccionarla
      if (areasData.length > 0 && !form.getValues("labAreaId")) {
        form.setValue("labAreaId", String(areasData[0].id));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cargar solicitudes internas";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [form]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onSubmitRequest = async (values: CreateRequestFormValues) => {
    setSubmitting(true);
    try {
      await LabWorkflowService.createInternalRequest({
        labAreaId: Number(values.labAreaId),
        justification: values.justification,
        items: values.items.map((i) => ({
          productId: i.productId,
          requestedUsesOrUnits: i.requestedUsesOrUnits,
        })),
      });

      setIsNewRequestOpen(false);
      form.reset({
        labAreaId: userAreas.length > 0 ? String(userAreas[0].id) : "",
        justification: "",
        items: [{ productId: "", requestedUsesOrUnits: 100 }],
      });
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al crear solicitud interna";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING_REVIEW":
        return <Badge className="bg-amber-500 hover:bg-amber-600">Pendiente Coordinación</Badge>;
      case "APPROVED":
        return <Badge className="bg-blue-600 hover:bg-blue-700">Lote Asignado por FEFO</Badge>;
      case "DELIVERED":
        return <Badge className="bg-emerald-600 hover:bg-emerald-700">Disponible en Nevera</Badge>;
      case "REJECTED":
        return <Badge variant="destructive">Rechazado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Mis Solicitudes Internas de Insumos
          </h2>
          <p className="text-xs text-muted-foreground">
            Requisición directa a Coordinación para reposición de reactivos de trabajo en tu área asignada.
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
            onClick={() => setIsNewRequestOpen(true)}
            className="text-xs gap-1.5 h-9 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <PlusCircle className="w-4 h-4" />
            Nueva Solicitud de Insumos
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

      {/* Tabla de Solicitudes */}
      <Card className="border border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/60">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-emerald-600" />
            <span>Historial de Solicitudes de Insumos</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="text-xs">
                  <TableHead className="w-[120px]">Código</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Área Destino</TableHead>
                  <TableHead>Reactivos Solicitados</TableHead>
                  <TableHead>Justificación</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Notas del Coordinador</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No has realizado solicitudes de insumos recientemente.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((req) => (
                    <TableRow key={req.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono font-bold text-foreground">
                        {req.code}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {req.labArea.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {req.items.map((i) => (
                            <div key={i.id} className="text-[11px] font-medium text-foreground">
                              &bull; {i.product?.name || "Reactivo"} ({i.requestedUsesOrUnits} usos)
                              {i.assignedLabUnit && (
                                <Badge variant="secondary" className="ml-1 text-[9px] font-mono py-0">
                                  Frasco: {i.assignedLabUnit.unitCode} (Lote: {i.assignedLabUnit.batch?.lotNumber})
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground" title={req.justification}>
                        {req.justification}
                      </TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell className="text-[11px] text-muted-foreground italic">
                        {req.reviewNotes || "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL CREAR SOLICITUD */}
      <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-foreground">
              <ClipboardList className="w-5 h-5 text-emerald-600" />
              <span>Solicitar Reactivos para el Área de Trabajo</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              La solicitud será canalizada al coordinador para asignación automática por lote FEFO.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitRequest)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="labAreaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Área Solicitante</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="text-xs h-9">
                          <SelectValue placeholder="Seleccione tu área asignada" />
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
                name="justification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Justificación de la Solicitud</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ej. Reposición semanal de reactivos para corrida de coagulación y química sanguínea..."
                        className="text-xs min-h-[60px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Lista dinámica de productos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    Reactivos e Insumos Requeridos
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => append({ productId: "", requestedUsesOrUnits: 100 })}
                    className="text-xs text-emerald-600 h-7 px-2 gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Añadir Otro Reactivo
                  </Button>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/20">
                      <div className="flex-1">
                        <Select
                          value={form.watch(`items.${index}.productId`)}
                          onValueChange={(val) => form.setValue(`items.${index}.productId`, val)}
                        >
                          <SelectTrigger className="text-xs h-8">
                            <SelectValue placeholder="Seleccionar producto" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableProducts.map((p) => (
                              <SelectItem key={String(p.id)} value={String(p.id)}>
                                {p.name} ({p.sku})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-28">
                        <Input
                          type="number"
                          min={1}
                          placeholder="Usos"
                          {...form.register(`items.${index}.requestedUsesOrUnits` as const, {
                            valueAsNumber: true,
                          })}
                          className="h-8 text-xs text-right"
                        />
                      </div>

                      {fields.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNewRequestOpen(false)}
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
                  Enviar Solicitud a Coordinación
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
