"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { LabWorkflowService } from "@/services/lab-workflow.service";
import { AuthService } from "@/services/auth.service";
import type {
  LabInternalRequest,
  FefoSuggestionItem,
  LabArea,
} from "@/types/lab-workflow";
import { toast } from "@/utils/toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClipboardList,
  ClipboardCheck,
  PlusCircle,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  PackageCheck,
  Sparkles,
  Snowflake,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  UniversalPdfDownloadButton,
  RequestDispatchPdfDocument,
} from "@/components/pdf";

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
  const [currentUser] = useState(() => AuthService.getCurrentUser());
  const userRoles = currentUser?.roles || [];
  const isSupervisor =
    userRoles.includes("ADMINISTRADOR") ||
    userRoles.includes("COORDINADOR_LABORATORIO") ||
    userRoles.includes("COORDINADOR");

  const [activeTab, setActiveTab] = useState<string>("my-requests");
  const [requests, setRequests] = useState<LabInternalRequest[]>([]);
  const [userAreas, setUserAreas] = useState<LabArea[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Array<{ id: string | number; name: string; sku: string }>>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filtros
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [areaFilter, setAreaFilter] = useState<string>("ALL");

  // Modal Nueva Solicitud
  const [isNewRequestOpen, setIsNewRequestOpen] = useState<boolean>(false);
  const [submittingRequest, setSubmittingRequest] = useState<boolean>(false);

  // Modal Aprobación FEFO (Coordinación)
  const [selectedRequestForFefo, setSelectedRequestForFefo] = useState<LabInternalRequest | null>(null);
  const [fefoSuggestions, setFefoSuggestions] = useState<FefoSuggestionItem[]>([]);
  const [fefoLoading, setFefoLoading] = useState<boolean>(false);
  const [assignedUnits, setAssignedUnits] = useState<Record<number, string>>({});
  const [reviewNotes, setReviewNotes] = useState<string>("");
  const [isApproveOpen, setIsApproveOpen] = useState<boolean>(false);
  const [submittingApproval, setSubmittingApproval] = useState<boolean>(false);

  // Modal de Rechazo
  const [rejectRequestId, setRejectRequestId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState<string>("");
  const [isRejectOpen, setIsRejectOpen] = useState<boolean>(false);
  const [submittingReject, setSubmittingReject] = useState<boolean>(false);

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
    try {
      const apiStatus =
        statusFilter !== "ALL"
          ? statusFilter === "PENDING_REVIEW"
            ? "PENDING"
            : statusFilter
          : undefined;

      const [reqData, areasData, unitsData] = await Promise.all([
        LabWorkflowService.getInternalRequests({
          status: apiStatus,
          labAreaId: areaFilter !== "ALL" ? Number(areaFilter) : undefined,
        }),
        LabWorkflowService.getMyLabAreas(),
        LabWorkflowService.getLabUnits(),
      ]);
      setRequests(reqData);
      setUserAreas(areasData);

      // Extraer catálogo único de reactivos disponibles
      const prodMap = new Map<string, { id: string | number; name: string; sku: string }>();
      unitsData.forEach((u) => {
        const pId = String(u.productId);
        if (!prodMap.has(pId) && u.product) {
          prodMap.set(pId, { id: pId, name: u.product.name, sku: u.product.sku });
        }
      });
      setAvailableProducts(Array.from(prodMap.values()));

      if (areasData.length > 0 && !form.getValues("labAreaId")) {
        form.setValue("labAreaId", String(areasData[0].id));
      }
    } catch (err) {
      console.error("Error al cargar solicitudes internas:", err);
      toast.error("Error al cargar las solicitudes de reactivos");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, areaFilter, form]);

  useEffect(() => {
    let active = true;
    const apiStatus =
      statusFilter !== "ALL"
        ? statusFilter === "PENDING_REVIEW"
          ? "PENDING"
          : statusFilter
        : undefined;

    Promise.all([
      LabWorkflowService.getInternalRequests({
        status: apiStatus,
        labAreaId: areaFilter !== "ALL" ? Number(areaFilter) : undefined,
      }),
      LabWorkflowService.getMyLabAreas(),
      LabWorkflowService.getLabUnits(),
    ])
      .then(([reqData, areasData, unitsData]) => {
        if (!active) return;
        setRequests(reqData);
        setUserAreas(areasData);

        // Extraer catálogo único de reactivos disponibles
        const prodMap = new Map<string, { id: string | number; name: string; sku: string }>();
        unitsData.forEach((u) => {
          const pId = String(u.productId);
          if (!prodMap.has(pId) && u.product) {
            prodMap.set(pId, { id: pId, name: u.product.name, sku: u.product.sku });
          }
        });
        setAvailableProducts(Array.from(prodMap.values()));

        if (areasData.length > 0 && !form.getValues("labAreaId")) {
          form.setValue("labAreaId", String(areasData[0].id));
        }
      })
      .catch((err) => {
        if (!active) return;
        console.error("Error al cargar solicitudes internas:", err);
        toast.error("Error al cargar las solicitudes de reactivos");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [statusFilter, areaFilter, form]);

  // Enviar Nueva Solicitud
  const onSubmitRequest = async (values: CreateRequestFormValues) => {
    setSubmittingRequest(true);
    try {
      await LabWorkflowService.createInternalRequest({
        labAreaId: Number(values.labAreaId),
        justification: values.justification.trim(),
        items: values.items.map((i) => ({
          productId: i.productId,
          requestedUsesOrUnits: i.requestedUsesOrUnits,
        })),
      });

      toast.success("Requisición de reactivos enviada a coordinación.");
      setIsNewRequestOpen(false);
      form.reset({
        labAreaId: userAreas.length > 0 ? String(userAreas[0].id) : "",
        justification: "",
        items: [{ productId: "", requestedUsesOrUnits: 100 }],
      });
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar la solicitud";
      toast.error(msg);
    } finally {
      setSubmittingRequest(false);
    }
  };

  // Abrir Modal FEFO
  const handleOpenFefoModal = async (req: LabInternalRequest) => {
    setSelectedRequestForFefo(req);
    setIsApproveOpen(true);
    setFefoLoading(true);
    setReviewNotes("");
    setAssignedUnits({});

    try {
      const suggestions = await LabWorkflowService.suggestFefoForRequest(req.id);
      setFefoSuggestions(suggestions);

      // Pre-asignar la primera sugerencia automática (la más óptima según FEFO)
      const initialMap: Record<number, string> = {};
      suggestions.forEach((sug) => {
        if (sug.suggestedUnits.length > 0) {
          initialMap[sug.requestItemId] = String(sug.suggestedUnits[0].id);
        }
      });
      setAssignedUnits(initialMap);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al calcular asignación FEFO";
      toast.error(msg);
    } finally {
      setFefoLoading(false);
    }
  };

  // Confirmar Aprobación FEFO
  const handleConfirmApproval = async () => {
    if (!selectedRequestForFefo) return;
    setSubmittingApproval(true);
    try {
      const itemAssignments = Object.entries(assignedUnits).map(([itemId, unitId]) => ({
        itemId: Number(itemId),
        assignedLabUnitId: unitId,
      }));

      await LabWorkflowService.approveInternalRequest(selectedRequestForFefo.id, {
        reviewNotes: reviewNotes.trim() || "Aprobado con asignación algorítmica FEFO",
        itemAssignments,
      });

      toast.success("Solicitud aprobada y unidades reservadas bajo criterio FEFO");
      setIsApproveOpen(false);
      setSelectedRequestForFefo(null);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al aprobar la solicitud";
      toast.error(msg);
    } finally {
      setSubmittingApproval(false);
    }
  };

  // Confirmar Entrega / Recepción en Nevera
  const handleDeliver = async (requestId: number) => {
    if (!confirm("¿Confirmar recepción de los reactivos en la nevera del área?")) return;
    try {
      await LabWorkflowService.deliverInternalRequest(requestId);
      toast.success("Reactivos recibidos e incorporados a la nevera del área");
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al confirmar la entrega";
      toast.error(msg);
    }
  };

  // Rechazar Solicitud
  const handleConfirmReject = async () => {
    if (!rejectRequestId || !rejectReason.trim()) {
      toast.error("Debe indicar el motivo del rechazo");
      return;
    }
    setSubmittingReject(true);
    try {
      await LabWorkflowService.rejectInternalRequest(rejectRequestId, {
        reviewNotes: rejectReason.trim(),
      });

      toast.success("Solicitud rechazada");
      setIsRejectOpen(false);
      setRejectRequestId(null);
      setRejectReason("");
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al rechazar solicitud";
      toast.error(msg);
    } finally {
      setSubmittingReject(false);
    }
  };

  // Métricas
  const counts = useMemo(() => {
    const pending = requests.filter((r) => r.status === "PENDING_REVIEW" || r.status === "PENDING").length;
    const approved = requests.filter((r) => r.status === "APPROVED").length;
    const delivered = requests.filter((r) => r.status === "DELIVERED").length;
    return { pending, approved, delivered, total: requests.length };
  }, [requests]);

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
      case "PENDING_REVIEW":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 text-[10px] font-bold">
            <Clock className="w-2.5 h-2.5 mr-1" /> Pendiente / En Revisión
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 text-[10px] font-bold">
            <CheckCircle2 className="w-2.5 h-2.5 mr-1" /> Aprobada (Listo p/ Retiro)
          </Badge>
        );
      case "DELIVERED":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] font-bold">
            <PackageCheck className="w-2.5 h-2.5 mr-1" /> Entregada en Nevera
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive" className="text-[10px] font-bold">
            <XCircle className="w-2.5 h-2.5 mr-1" /> Rechazada
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="destructive" className="text-[10px] font-bold">
            <XCircle className="w-2.5 h-2.5 mr-1" /> Cancelada
          </Badge>
        );
      default: {
        const translations: Record<string, string> = {
          PENDING: "Pendiente",
          PENDING_REVIEW: "En Revisión",
          APPROVED: "Aprobada",
          DELIVERED: "Entregada",
          REJECTED: "Rechazada",
          CANCELLED: "Cancelada",
        };
        return <Badge variant="outline" className="text-[10px]">{translations[status] || status.replace(/_/g, " ")}</Badge>;
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Principal y Aclaratoria Conceptual */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
            <Snowflake className="w-3.5 h-3.5 text-blue-500" />
            <span>Cadena de Frío & Gobernanza FEFO</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mt-1">
            Requisición de Reactivos Refrigerados (Cadena de Frío - FEFO)
          </h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            <strong className="text-foreground">Exclusivo para kits diagnósticos y reactivos bajo control térmico.</strong>{" "}
            Para insumos secos, tubos o papelería general, utilice{" "}
            <Link href="/requests" className="text-blue-600 dark:text-blue-400 hover:underline font-semibold inline-flex items-center gap-0.5">
              Solicitudes Generales de Almacén <ArrowRight className="w-3 h-3" />
            </Link>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
            className="text-xs gap-1.5 h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            Nueva Requisición de Reactivos
          </Button>
        </div>
      </div>

      {/* Tabs Principales: Mis Solicitudes vs Bandeja FEFO */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/70 p-1 border border-border">
          <TabsTrigger value="my-requests" className="text-xs gap-2 font-medium">
            <ClipboardList className="w-4 h-4 text-blue-500" />
            <span>Mis Solicitudes de Área</span>
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
              {counts.total}
            </Badge>
          </TabsTrigger>

          {isSupervisor && (
            <TabsTrigger value="fefo-tray" className="text-xs gap-2 font-medium">
              <ClipboardCheck className="w-4 h-4 text-emerald-600" />
              <span>Bandeja de Aprobación & Asignación FEFO</span>
              {counts.pending > 0 && (
                <Badge className="ml-1 text-[10px] px-1.5 py-0 bg-amber-500 hover:bg-amber-600 text-white">
                  {counts.pending} pendientes
                </Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        {/* ========================================================================= */}
        {/* PESTAÑA 1: MIS SOLICITUDES DE ÁREA                                        */}
        {/* ========================================================================= */}
        <TabsContent value="my-requests" className="space-y-6 mt-4">
          {/* Tarjetas de Resumen */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border border-border bg-card">
              <CardContent className="p-3">
                <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                  Total Solicitudes
                </span>
                <span className="text-xl font-bold font-mono text-foreground">{counts.total}</span>
              </CardContent>
            </Card>

            <Card className="border border-amber-200 bg-amber-50/20 dark:bg-amber-950/10">
              <CardContent className="p-3">
                <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400 block">
                  En Revisión
                </span>
                <span className="text-xl font-bold font-mono text-foreground">{counts.pending}</span>
              </CardContent>
            </Card>

            <Card className="border border-blue-200 bg-blue-50/20 dark:bg-blue-950/10">
              <CardContent className="p-3">
                <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-400 block">
                  Listas para Retiro
                </span>
                <span className="text-xl font-bold font-mono text-foreground">{counts.approved}</span>
              </CardContent>
            </Card>

            <Card className="border border-emerald-200 bg-emerald-50/20 dark:bg-emerald-950/10">
              <CardContent className="p-3">
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400 block">
                  Entregadas en Nevera
                </span>
                <span className="text-xl font-bold font-mono text-foreground">{counts.delivered}</span>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de Solicitudes */}
          <Card className="border border-border">
            <CardHeader className="p-5 pb-3 border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base font-bold">
                    Historial de Requisiciones de Laboratorio
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Reactivos pedidos para la operatividad analítica del mesón y control térmico.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36 text-xs h-9">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos los Estados</SelectItem>
                      <SelectItem value="PENDING_REVIEW">En Revisión</SelectItem>
                      <SelectItem value="APPROVED">Aprobadas</SelectItem>
                      <SelectItem value="DELIVERED">Entregadas</SelectItem>
                      <SelectItem value="REJECTED">Rechazadas</SelectItem>
                    </SelectContent>
                  </Select>

                  {userAreas.length > 1 && (
                    <Select value={areaFilter} onValueChange={setAreaFilter}>
                      <SelectTrigger className="w-40 text-xs h-9">
                        <SelectValue placeholder="Área" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todas las Áreas</SelectItem>
                        {userAreas.map((a) => (
                          <SelectItem key={a.id} value={String(a.id)}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
                  Cargando solicitudes...
                </div>
              ) : requests.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-semibold">No hay solicitudes registradas</p>
                  <p className="text-xs mt-1">
                    Cree una requisición cuando requiera kits de reactivos para su mesón de trabajo.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="text-xs font-bold">Código</TableHead>
                        <TableHead className="text-xs font-bold">Fecha</TableHead>
                        <TableHead className="text-xs font-bold">Área Solicitante</TableHead>
                        <TableHead className="text-xs font-bold">Reactivos Solicitados</TableHead>
                        <TableHead className="text-xs font-bold">Justificación</TableHead>
                        <TableHead className="text-xs font-bold">Estado</TableHead>
                        <TableHead className="text-xs font-bold text-right">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((req) => {
                        const isApproved = req.status === "APPROVED";

                        return (
                          <TableRow key={req.id} className="hover:bg-muted/30">
                            <TableCell className="font-mono text-xs font-bold">
                              {req.code}
                            </TableCell>
                            <TableCell className="text-xs">
                              {new Date(req.createdAt).toLocaleDateString("es-ES", {
                                month: "short",
                                day: "numeric",
                              })}
                            </TableCell>
                            <TableCell className="text-xs">
                              <Badge variant="outline" className="text-[10px] py-0 font-medium">
                                {req.labArea?.name || "General"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              <div className="space-y-1">
                                {req.items?.map((it) => (
                                  <div key={it.id} className="flex items-center gap-2">
                                    <span className="font-semibold">{it.product?.name}</span>
                                    <span className="text-[11px] font-mono text-muted-foreground">
                                      ({it.requestedUsesOrUnits} usos)
                                    </span>
                                    {it.assignedLabUnit && (
                                      <Badge variant="outline" className="text-[9px] py-0 bg-blue-50 text-blue-700 border-blue-200">
                                        Asignado: {it.assignedLabUnit.unitCode}
                                      </Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                              {req.justification}
                            </TableCell>
                            <TableCell>{renderStatusBadge(req.status)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <UniversalPdfDownloadButton
                                  document={
                                    <RequestDispatchPdfDocument
                                      request={{
                                        id: req.id,
                                        requestNumber: req.code || `SOL-LAB-${req.id}`,
                                        departmentSection: req.labArea?.name || "Laboratorio Clínico",
                                        justification: req.justification || "Requisición de reactivos para determinación analítica",
                                        notes: req.reviewNotes || "Solicitud de abastecimiento en frío",
                                        status: req.status,
                                        createdAt: req.createdAt,
                                        dispatchedAt: req.updatedAt,
                                        applicant: { fullName: req.requestedBy?.fullName || "Bioanalista" },
                                        dispatchedBy: req.reviewedBy ? { fullName: req.reviewedBy.fullName } : null,
                                        items: (req.items || []).map((it) => ({
                                          id: it.id,
                                          quantityRequested: it.requestedUsesOrUnits,
                                          quantityDispatched: it.assignedLabUnit ? 1 : (it.requestedUsesOrUnits || 0),
                                          product: {
                                            name: it.product?.name || "Reactivo",
                                            sku: it.product?.sku || "S/S",
                                            unitOfMeasure: it.assignedLabUnit ? `Vial (${it.assignedLabUnit.unitCode})` : "USOS",
                                          },
                                          batch: it.assignedLabUnit?.batch ? {
                                            lotNumber: it.assignedLabUnit.batch.lotNumber,
                                            expirationDate: null,
                                          } : null,
                                        })),
                                      }}
                                    />
                                  }
                                  fileName={`Solicitud_${String(req.code || req.id).replace(/[^a-zA-Z0-9_-]/g, "_")}`}
                                  buttonLabel="Comprobante PDF"
                                  previewLabel="Ver"
                                  size="sm"
                                />

                                {isApproved && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleDeliver(req.id)}
                                    className="text-[11px] h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1"
                                  >
                                    <PackageCheck className="w-3.5 h-3.5" />
                                    Recibir en Nevera
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* PESTAÑA 2: BANDEJA DE APROBACIÓN & ASIGNACIÓN FEFO (COORDINACIÓN)         */}
        {/* ========================================================================= */}
        {isSupervisor && (
          <TabsContent value="fefo-tray" className="space-y-6 mt-4">
            <Card className="border border-border">
              <CardHeader className="p-5 pb-3 border-b border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4 text-emerald-600" />
                      Bandeja de Aprobación FEFO
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Evaluación de solicitudes internas con asignación algorítmica First-Expired, First-Out y blindaje I+D.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40 text-xs h-9">
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Todas las Solicitudes</SelectItem>
                        <SelectItem value="PENDING_REVIEW">Pendientes de Evaluación</SelectItem>
                        <SelectItem value="APPROVED">Aprobadas / En Espera</SelectItem>
                        <SelectItem value="DELIVERED">Completadas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {loading ? (
                  <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
                    Cargando bandeja de coordinación...
                  </div>
                ) : requests.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-500 opacity-50" />
                    <p className="text-sm font-semibold">Bandeja al día</p>
                    <p className="text-xs mt-1">
                      No hay solicitudes pendientes con los filtros seleccionados.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="text-xs font-bold">Código</TableHead>
                          <TableHead className="text-xs font-bold">Solicitante</TableHead>
                          <TableHead className="text-xs font-bold">Área Destino</TableHead>
                          <TableHead className="text-xs font-bold">Reactivos</TableHead>
                          <TableHead className="text-xs font-bold">Estado</TableHead>
                          <TableHead className="text-xs font-bold text-right">Acciones de Coordinación</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {requests.map((req) => {
                          const isPending = req.status === "PENDING_REVIEW" || req.status === "PENDING";
                          const isApproved = req.status === "APPROVED";

                          return (
                            <TableRow key={req.id} className="hover:bg-muted/30">
                              <TableCell className="font-mono text-xs font-bold">
                                {req.code}
                              </TableCell>
                              <TableCell className="text-xs font-medium">
                                {req.requestedBy?.fullName || "Bioanalista"}
                              </TableCell>
                              <TableCell className="text-xs">
                                <Badge variant="outline" className="text-[10px] py-0 font-medium">
                                  {req.labArea?.name || "General"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs">
                                <div className="space-y-1">
                                  {req.items?.map((it) => (
                                    <div key={it.id} className="flex items-center gap-1.5">
                                      <span className="font-semibold">{it.product?.name}</span>
                                      <span className="text-[10px] text-muted-foreground">
                                        x{it.requestedUsesOrUnits}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>{renderStatusBadge(req.status)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <UniversalPdfDownloadButton
                                    document={
                                      <RequestDispatchPdfDocument
                                        request={{
                                          id: req.id,
                                          requestNumber: req.code || `SOL-LAB-${req.id}`,
                                          departmentSection: req.labArea?.name || "Laboratorio Clínico",
                                          justification: req.justification || "Requisición de reactivos para determinación analítica",
                                          notes: req.reviewNotes || "Solicitud de abastecimiento en frío",
                                          status: req.status,
                                          createdAt: req.createdAt,
                                          dispatchedAt: req.updatedAt,
                                          applicant: { fullName: req.requestedBy?.fullName || "Bioanalista" },
                                          dispatchedBy: req.reviewedBy ? { fullName: req.reviewedBy.fullName } : null,
                                          items: (req.items || []).map((it) => ({
                                            id: it.id,
                                            quantityRequested: it.requestedUsesOrUnits,
                                            quantityDispatched: it.assignedLabUnit ? 1 : (it.requestedUsesOrUnits || 0),
                                            product: {
                                              name: it.product?.name || "Reactivo",
                                              sku: it.product?.sku || "S/S",
                                              unitOfMeasure: it.assignedLabUnit ? `Vial (${it.assignedLabUnit.unitCode})` : "USOS",
                                            },
                                            batch: it.assignedLabUnit?.batch ? {
                                              lotNumber: it.assignedLabUnit.batch.lotNumber,
                                              expirationDate: null,
                                            } : null,
                                          })),
                                        }}
                                      />
                                    }
                                    fileName={`Solicitud_${String(req.code || req.id).replace(/[^a-zA-Z0-9_-]/g, "_")}`}
                                    buttonLabel="Comprobante PDF"
                                    previewLabel="Ver"
                                    size="sm"
                                  />

                                  {isPending && (
                                    <>
                                      <Button
                                        size="sm"
                                        onClick={() => handleOpenFefoModal(req)}
                                        className="text-[11px] h-7 px-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1 shadow-xs"
                                      >
                                        <Sparkles className="w-3 h-3" />
                                        Asignar FEFO
                                      </Button>

                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setRejectRequestId(req.id);
                                          setRejectReason("");
                                          setIsRejectOpen(true);
                                        }}
                                        className="text-[11px] h-7 px-2 text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                      >
                                        Rechazar
                                      </Button>
                                    </>
                                  )}

                                  {isApproved && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleDeliver(req.id)}
                                      className="text-[11px] h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1"
                                    >
                                      <PackageCheck className="w-3.5 h-3.5" />
                                      Despachar a Nevera
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* ========================================================================= */}
      {/* MODAL: NUEVA REQUISICIÓN DE REACTIVOS                                     */}
      {/* ========================================================================= */}
      <Dialog open={isNewRequestOpen} onOpenChange={setIsNewRequestOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Snowflake className="w-4 h-4 text-blue-500" />
              Nueva Requisición de Reactivos Refrigerados
            </DialogTitle>
            <DialogDescription className="text-xs">
              Solicitud interna con despacho FEFO para kits y reactivos en cadena de frío.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitRequest)} className="space-y-4">
              <FormField
                control={form.control}
                name="labAreaId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Área de Laboratorio Destino *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Seleccione el área operativa" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {userAreas.map((area) => (
                          <SelectItem key={area.id} value={String(area.id)}>
                            {area.name} ({area.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Reactivos Requeridos *</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ productId: "", requestedUsesOrUnits: 100 })}
                    className="text-[11px] h-7 px-2 gap-1 text-blue-600"
                  >
                    <PlusCircle className="w-3 h-3" /> Agregar Ítem
                  </Button>
                </div>

                {fields.map((fieldItem, index) => (
                  <div
                    key={fieldItem.id}
                    className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/30"
                  >
                    <div className="flex-1">
                      <FormField
                        control={form.control}
                        name={`items.${index}.productId`}
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="text-xs">
                                  <SelectValue placeholder="Seleccionar kit de reactivo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {availableProducts.map((p) => (
                                  <SelectItem key={p.id} value={String(p.id)}>
                                    {p.name} ({p.sku})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="w-28">
                      <FormField
                        control={form.control}
                        name={`items.${index}.requestedUsesOrUnits`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                placeholder="Usos"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                className="text-xs font-mono text-right"
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                        className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <FormField
                control={form.control}
                name="justification"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Justificación Clínica / Operativa *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="ej. Reabastecimiento semanal para corrida de perfiles tiroideos..."
                        {...field}
                        className="text-xs resize-none h-18"
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNewRequestOpen(false)}
                  className="text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingRequest}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {submittingRequest ? "Enviando..." : "Enviar a Coordinación"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: APROBACIÓN FEFO & ASIGNACIÓN DE FRASCOS (COORDINACIÓN)             */}
      {/* ========================================================================= */}
      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Asignación Algorítmica FEFO & Aprobación
            </DialogTitle>
            <DialogDescription className="text-xs">
              El sistema prioriza automáticamente los lotes más próximos a vencer en nevera para minimizar mermas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            {fefoLoading ? (
              <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
                Calculando sugerencia FEFO sobre el stock de cavas...
              </div>
            ) : fefoSuggestions.length === 0 ? (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertTitle className="text-xs font-bold">Sin unidades disponibles</AlertTitle>
                <AlertDescription className="text-xs">
                  No se encontraron frascos operativos en stock para los reactivos solicitados.
                </AlertDescription>
              </Alert>
            ) : (
              fefoSuggestions.map((sug) => {
                const selectedUnitId = assignedUnits[sug.requestItemId];
                const selectedUnit = sug.suggestedUnits.find(
                  (u) => String(u.id) === selectedUnitId
                );
                const isResearch = selectedUnit?.ownershipType === "RESEARCH_PROJECT";

                return (
                  <Card key={sug.requestItemId} className="border border-border">
                    <CardHeader className="p-3 bg-muted/30 border-b border-border">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-foreground">
                          {sug.productName}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          Requerido: {sug.requestedUsesOrUnits} usos
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="p-3 space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Unidad Asignada (Criterio FEFO) *</Label>
                        <Select
                          value={selectedUnitId || ""}
                          onValueChange={(val) =>
                            setAssignedUnits((prev) => ({ ...prev, [sug.requestItemId]: val }))
                          }
                        >
                          <SelectTrigger className="text-xs">
                            <SelectValue placeholder="Seleccione frasco a asignar" />
                          </SelectTrigger>
                          <SelectContent>
                            {sug.suggestedUnits.map((u, idx) => (
                              <SelectItem key={u.id} value={String(u.id)}>
                                {idx === 0 ? "★ RECOMENDADO FEFO: " : ""}
                                {u.unitCode} &bull; Vence: {u.expirationDate ? new Date(u.expirationDate).toLocaleDateString("es-ES") : "N/D"} &bull; Saldo: {u.remainingUses ?? u.currentVolume} usos
                                {u.ownershipType === "RESEARCH_PROJECT" ? " [I+D]" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Advertencia Caso Borde E4: Blindaje I+D */}
                      {isResearch && (
                        <div className="bg-purple-50 dark:bg-purple-950/30 p-2.5 rounded-lg border border-purple-200 dark:border-purple-800 flex items-start gap-2 text-xs text-purple-900 dark:text-purple-200">
                          <ShieldAlert className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block">
                              Advertencia: Reactivo Blindado de Investigación (I+D)
                            </span>
                            <span className="text-[11px]">
                              Este lote pertenece a un proyecto de investigación académica. Asignarlo a una solicitud clínica restará presupuesto del ensayo asignado.
                            </span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}

            <div className="space-y-1">
              <Label className="text-xs">Notas de Aprobación de Coordinación</Label>
              <Textarea
                placeholder="Observaciones de despacho o instrucciones térmicas..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="text-xs resize-none h-16"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsApproveOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmApproval}
              disabled={submittingApproval || fefoSuggestions.length === 0}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {submittingApproval ? "Aprobando..." : "Confirmar Aprobación y Despacho"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: RECHAZAR SOLICITUD                                                 */}
      {/* ========================================================================= */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-500" />
              Rechazar Solicitud de Reactivos
            </DialogTitle>
            <DialogDescription className="text-xs">
              Indique el motivo técnico o administrativo del rechazo de la solicitud.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Motivo del Rechazo *</Label>
              <Textarea
                placeholder="ej. Stock agotado en almacén central, se espera arribo la próxima semana..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="text-xs resize-none h-20"
                required
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsRejectOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmReject}
              disabled={submittingReject || !rejectReason.trim()}
              className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
            >
              {submittingReject ? "Rechazando..." : "Confirmar Rechazo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
