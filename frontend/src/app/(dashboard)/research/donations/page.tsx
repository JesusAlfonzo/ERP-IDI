"use client";

import { useEffect, useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ResearchService } from "@/services/research.service";
import { LabWorkflowService } from "@/services/lab-workflow.service";
import type { ResearchDonation, ResearchProject, ResearchInvestor } from "@/types/research";
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
  Package,
  PlusCircle,
  RefreshCw,
  DollarSign,
  ShieldCheck,
  Calendar,
  Building,
  AlertCircle,
  Trash2,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const donationItemSchema = z.object({
  productId: z.string().min(1, "Seleccione el producto"),
  quantity: z.number().min(1, "Cantidad mínima de 1"),
  lotNumber: z.string().min(1, "Indique el número de lote"),
  expirationDate: z.string().optional().or(z.literal("")),
  estimatedUnitValue: z.number().min(0, "Valor estimado >= 0"),
});

const createDonationSchema = z.object({
  projectId: z.string().min(1, "Debe seleccionar el proyecto destino"),
  investorId: z.string().min(1, "Debe seleccionar el donante o patrocinante"),
  donationDate: z.string().min(1, "Fecha requerida"),
  notes: z.string().optional(),
  items: z.array(donationItemSchema).min(1, "Debe registrar al menos un ítem donado"),
});

type CreateDonationFormValues = z.infer<typeof createDonationSchema>;

export default function ResearchDonationsPage() {
  const [donations, setDonations] = useState<ResearchDonation[]>([]);
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [investors, setInvestors] = useState<ResearchInvestor[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Array<{ id: string | number; name: string; sku: string }>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Nueva Donación
  const [isNewDonationOpen, setIsNewDonationOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const form = useForm<CreateDonationFormValues>({
    resolver: zodResolver(createDonationSchema),
    defaultValues: {
      projectId: "",
      investorId: "",
      donationDate: new Date().toISOString().split("T")[0],
      notes: "",
      items: [
        {
          productId: "",
          quantity: 5,
          lotNumber: "",
          expirationDate: "",
          estimatedUnitValue: 50,
        },
      ],
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
      const [donationsData, projectsData, investorsData, unitsData] = await Promise.all([
        ResearchService.getDonations(),
        ResearchService.getProjects(),
        ResearchService.getInvestors(),
        LabWorkflowService.getLabUnits(),
      ]);
      setDonations(donationsData);
      setProjects(projectsData);
      setInvestors(investorsData);

      const prodMap = new Map<string, { id: string | number; name: string; sku: string }>();
      unitsData.forEach((u) => {
        const pId = String(u.productId);
        if (!prodMap.has(pId) && u.product) {
          prodMap.set(pId, { id: pId, name: u.product.name, sku: u.product.sku });
        }
      });
      setAvailableProducts(Array.from(prodMap.values()));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cargar donaciones";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onSubmitDonation = async (values: CreateDonationFormValues) => {
    setSubmitting(true);
    try {
      await ResearchService.recordDonation({
        projectId: Number(values.projectId),
        investorId: Number(values.investorId),
        donationDate: values.donationDate,
        notes: values.notes,
        items: values.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          lotNumber: i.lotNumber,
          expirationDate: i.expirationDate || null,
          estimatedUnitValue: i.estimatedUnitValue,
        })),
      });

      setIsNewDonationOpen(false);
      form.reset();
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar donación en especie";
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

  const totalDonatedValue = donations.reduce(
    (acc, d) => acc + Number(d.totalMonetaryValue || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Encabezado y Acciones */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Donaciones en Especie & Stock Blindado
          </h2>
          <p className="text-xs text-muted-foreground">
            Entrada de reactivos con asignación exclusiva para proyectos de investigación (no comercializables).
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
            onClick={() => setIsNewDonationOpen(true)}
            className="text-xs gap-1.5 h-9 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <PlusCircle className="w-4 h-4" />
            Registrar Donación
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

      {/* KPI de Donaciones */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Valor Total Donado en Especie</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-emerald-600 font-mono">
              {formatCurrency(totalDonatedValue)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Valorización estimada de insumos
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
              <span>Donaciones Registradas</span>
              <Package className="w-4 h-4 text-indigo-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-2xl font-bold text-foreground font-mono">
              {donations.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Recepciones formales de patrocinio
            </p>
          </CardContent>
        </Card>

        <Card className="border border-border/80 shadow-xs bg-indigo-50/50 dark:bg-indigo-950/20">
          <CardHeader className="p-4 pb-1">
            <CardTitle className="text-xs font-medium text-indigo-700 dark:text-indigo-300 flex items-center justify-between">
              <span>Blindaje de Propiedad</span>
              <Lock className="w-4 h-4 text-indigo-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="text-xs text-indigo-900 dark:text-indigo-200 font-medium">
              100% Stock Vinculado
            </div>
            <p className="text-[11px] text-indigo-700/80 mt-1 leading-relaxed">
              Insumos etiquetados estrictamente con titularidad institucional para I+D.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Donaciones */}
      <Card className="border border-border/80 shadow-xs overflow-hidden">
        <CardHeader className="py-3 px-4 bg-muted/20 border-b border-border/60">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Package className="w-4 h-4 text-indigo-600" />
            <span>Historial de Recepciones de Insumos Donados</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="text-xs">
                  <TableHead className="w-[120px]">Código</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Proyecto Destino</TableHead>
                  <TableHead>Donante / Patrocinante</TableHead>
                  <TableHead>Ítems Donados (Lotes)</TableHead>
                  <TableHead className="text-right">Valor Total ($)</TableHead>
                  <TableHead>Recibido Por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {donations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No hay donaciones en especie registradas aún.
                    </TableCell>
                  </TableRow>
                ) : (
                  donations.map((don) => (
                    <TableRow key={don.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono font-bold text-foreground">
                        {don.code}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(don.donationDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {don.project?.code}: {don.project?.title}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        {don.investor?.name}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {don.items.map((i) => (
                            <div key={i.id} className="text-[11px] font-medium text-foreground">
                              &bull; {i.product?.name || "Reactivo"} x{i.quantity} uds
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-emerald-600">
                        {formatCurrency(don.totalMonetaryValue)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {don.receivedBy?.fullName || "Almacén I+D"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL REGISTRAR DONACIÓN */}
      <Dialog open={isNewDonationOpen} onOpenChange={setIsNewDonationOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-foreground">
              <Package className="w-5 h-5 text-indigo-600" />
              <span>Registrar Donación en Especie & Stock Blindado</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Los lotes ingresados se etiquetan como stock blindado exclusivo para el proyecto seleccionado.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitDonation)} className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Proyecto de Investigación Destino</FormLabel>
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
                  control={form.control}
                  name="investorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Donante / Patrocinante</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="text-xs h-9">
                            <SelectValue placeholder="Seleccione donante..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {investors.map((inv) => (
                            <SelectItem key={inv.id} value={String(inv.id)}>
                              {inv.name} ({inv.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="donationDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Fecha de Recepción</FormLabel>
                    <FormControl>
                      <Input type="date" className="text-xs h-9" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* Ítems Donados */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    Reactivos e Insumos Donados
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      append({
                        productId: "",
                        quantity: 1,
                        lotNumber: "",
                        expirationDate: "",
                        estimatedUnitValue: 50,
                      })
                    }
                    className="text-xs text-indigo-600 h-7 px-2 gap-1"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Añadir Ítem
                  </Button>
                </div>

                <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="p-3 rounded-lg border border-border bg-muted/20 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">Ítem #{index + 1}</span>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                            className="h-6 w-6 p-0 text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-0.5">Producto</label>
                          <Select
                            value={form.watch(`items.${index}.productId`)}
                            onValueChange={(val) => form.setValue(`items.${index}.productId`, val)}
                          >
                            <SelectTrigger className="text-xs h-8">
                              <SelectValue placeholder="Seleccione producto..." />
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

                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-0.5">Lote</label>
                          <Input
                            placeholder="Ej. DON-2026-X1"
                            {...form.register(`items.${index}.lotNumber` as const)}
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-0.5">Cantidad</label>
                          <Input
                            type="number"
                            min={1}
                            {...form.register(`items.${index}.quantity` as const, {
                              valueAsNumber: true,
                            })}
                            className="h-8 text-xs font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-0.5">Vencimiento</label>
                          <Input
                            type="date"
                            {...form.register(`items.${index}.expirationDate` as const)}
                            className="h-8 text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-0.5">Valor Unit. ($)</label>
                          <Input
                            type="number"
                            min={0}
                            step={0.5}
                            {...form.register(`items.${index}.estimatedUnitValue` as const, {
                              valueAsNumber: true,
                            })}
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Observaciones de la Donación</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Convenio de patrocinio, términos de uso..." className="text-xs min-h-[50px]" {...field} />
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
                  onClick={() => setIsNewDonationOpen(false)}
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
                  Confirmar Ingreso de Donación
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
