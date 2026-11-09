"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  type FormEvent,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RequestClientService } from "@/services/request.service";
import { InventoryClientService } from "@/services/inventory.service";
import { AuthService } from "@/services/auth.service";
import { toast } from "@/utils/toast";
import { cn } from "@/lib/utils";
import type {
  InternalRequest,
  InternalRequestItem,
  DispatchRequestItemPayload,
} from "@/types/requests";
import type { StockBatch } from "@/types/inventory";
import type { AuthUser } from "@/types/auth";
import {
  ArrowLeft,
  PackageCheck,
  Send,
  Layers,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Search,
  FilterX,
  Building2,
  Sparkles,
  Calendar,
  User,
  Plus,
  Trash2,
  Check,
  Clock,
  RotateCcw,
  Zap,
  Lock,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DispatchAllocationRow {
  batchId: number;
  quantity: number | "";
}

// Conceptos de justificación de 1 palabra para el despacho
interface DispatchReasonBadge {
  id: string;
  word: string;
  title: string;
  description: string;
  theme: {
    unselected: string;
    selected: string;
    dot: string;
  };
}

const DISPATCH_REASONS: DispatchReasonBadge[] = [
  {
    id: "completo",
    word: "Completo",
    title: "Entrega completa satisfactoria",
    description: "Despacho al 100% de las cantidades aprobadas sin saldo pendiente.",
    theme: {
      unselected:
        "bg-emerald-50/90 text-emerald-700 border-emerald-200/90 hover:bg-emerald-100/90 hover:border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/70",
      selected:
        "bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/30 font-semibold ring-2 ring-emerald-500/20",
      dot: "bg-emerald-500",
    },
  },
  {
    id: "parcial",
    word: "Parcial",
    title: "Despacho parcial por disponibilidad",
    description: "Entrega fraccionada según stock disponible en almacén, saldo en Standby.",
    theme: {
      unselected:
        "bg-amber-50/90 text-amber-700 border-amber-200/90 hover:bg-amber-100/90 hover:border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/70",
      selected:
        "bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-600/30 font-semibold ring-2 ring-amber-500/20",
      dot: "bg-amber-500",
    },
  },
  {
    id: "urgencia",
    word: "Urgencia",
    title: "Despacho prioritario de emergencia",
    description: "Atención prioritaria inmediata para área crítica de laboratorio o servicio.",
    theme: {
      unselected:
        "bg-rose-50/90 text-rose-700 border-rose-200/90 hover:bg-rose-100/90 hover:border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/70",
      selected:
        "bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-600/30 font-semibold ring-2 ring-rose-500/20",
      dot: "bg-rose-500",
    },
  },
  {
    id: "refrigerado",
    word: "Refrigerado",
    title: "Cadena de frío verificada",
    description: "Materiales y reactivos entregados en hielera con control térmico (2°C - 8°C).",
    theme: {
      unselected:
        "bg-sky-50/90 text-sky-700 border-sky-200/90 hover:bg-sky-100/90 hover:border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/70",
      selected:
        "bg-sky-600 text-white border-sky-600 shadow-sm shadow-sky-600/30 font-semibold ring-2 ring-sky-500/20",
      dot: "bg-sky-500",
    },
  },
  {
    id: "custodia",
    word: "Custodia",
    title: "Entrega bajo custodia y acta",
    description: "Recepción formal firmada en libro de control de materiales de almacén.",
    theme: {
      unselected:
        "bg-purple-50/90 text-purple-700 border-purple-200/90 hover:bg-purple-100/90 hover:border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/70",
      selected:
        "bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-600/30 font-semibold ring-2 ring-purple-500/20",
      dot: "bg-purple-500",
    },
  },
  {
    id: "rutinario",
    word: "Rutinario",
    title: "Despacho estándar programado",
    description: "Entrega regular del ciclo operativo semanal hacia departamento solicitante.",
    theme: {
      unselected:
        "bg-indigo-50/90 text-indigo-700 border-indigo-200/90 hover:bg-indigo-100/90 hover:border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/70",
      selected:
        "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/30 font-semibold ring-2 ring-indigo-500/20",
      dot: "bg-indigo-500",
    },
  },
];

function DispatchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryRequestId = searchParams.get("id") || searchParams.get("requestId");
  // Si vino con ID en la URL, el registro está bloqueado para ese despacho por seguridad
  const isFixedByQuery = Boolean(queryRequestId);

  const [currentUser] = useState<AuthUser | null>(() =>
    AuthService.getCurrentUser()
  );

  const [approvedRequests, setApprovedRequests] = useState<InternalRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<InternalRequest | null>(
    null
  );
  const [availableBatches, setAvailableBatches] = useState<
    (StockBatch & {
      productId?: number;
      product: {
        id?: number;
        name: string;
        sku: string;
        unitOfMeasure?: string;
      };
    })[]
  >([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Mapeo de ítems a sus asignaciones de lotes: Record<itemId, DispatchAllocationRow[]>
  const [allocations, setAllocations] = useState<
    Record<number, DispatchAllocationRow[]>
  >({});
  const [dispatchNotes, setDispatchNotes] = useState("");
  const [searchTermInRows, setSearchTermInRows] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);

  // Permisos
  const userRoles = currentUser?.roles || [];
  const isWarehouseStaff =
    userRoles.includes("ADMINISTRADOR") || userRoles.includes("ALMACENISTA");

  // Inicializar renglones de una solicitud
  const initializeForRequest = useCallback(
    (
      req: InternalRequest,
      batchesList: typeof availableBatches
    ) => {
      setSelectedRequest(req);
      const initialMap: Record<number, DispatchAllocationRow[]> = {};

      req.items.forEach((it) => {
        if (it.id) {
          const qtyApproved = Number(
            it.quantityApproved && it.quantityApproved > 0
              ? it.quantityApproved
              : it.quantityRequested ?? it.requestedQuantity ?? 0
          );
          const qtyDispatched = Number(
            it.quantityDispatched ?? it.dispatchedQuantity ?? 0
          );
          const pendingQuantity = Math.max(0, qtyApproved - qtyDispatched);

          // Buscar lotes candidatos para este producto
          const candidateBatches = batchesList.filter(
            (b) => (b.productId ?? b.product?.id) === it.productId
          );
          const firstBatch = candidateBatches[0];

          initialMap[it.id] = [
            {
              batchId: firstBatch ? firstBatch.id : 0,
              quantity: firstBatch
                ? Math.min(pendingQuantity, firstBatch.currentQuantity)
                : pendingQuantity > 0
                ? pendingQuantity
                : "",
            },
          ];
        }
      });

      setAllocations(initialMap);
    },
    []
  );

  // Carga inicial
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [allReqs, batches] = await Promise.all([
          RequestClientService.getRequests().catch(() => []),
          isWarehouseStaff
            ? InventoryClientService.getActiveBatches().catch(() => [])
            : Promise.resolve([]),
        ]);

        if (!isMounted) return;

        // Filtrar solicitudes listas para despacho: APROBADA o DESPACHADA_PARCIAL
        const dispatchable = allReqs.filter(
          (r) =>
            r.status === "APROBADA" || r.status === "DESPACHADA_PARCIAL"
        );
        setApprovedRequests(dispatchable);
        setAvailableBatches(batches);

        // Preseleccionar solicitud según query param o la primera disponible
        if (queryRequestId) {
          const match = dispatchable.find(
            (r) => String(r.id) === String(queryRequestId)
          );
          if (match) {
            initializeForRequest(match, batches);
          } else {
            // Intentar cargar por ID directamente si no vino en la lista general
            try {
              const directReq = await RequestClientService.getRequestById(
                queryRequestId
              );
              if (
                directReq &&
                (directReq.status === "APROBADA" ||
                  directReq.status === "DESPACHADA_PARCIAL")
              ) {
                initializeForRequest(directReq, batches);
              }
            } catch {
              toast.error("No se encontró la solicitud aprobada solicitada.");
            }
          }
        } else if (dispatchable.length > 0) {
          initializeForRequest(dispatchable[0], batches);
        }
      } catch (error) {
        console.error("Error al cargar datos de despacho:", error);
        toast.error("Error al cargar la información para despacho.");
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [queryRequestId, isWarehouseStaff, initializeForRequest]);

  // Manejo de cambio de solicitud seleccionada
  const handleSelectRequest = (reqId: string) => {
    const match = approvedRequests.find((r) => String(r.id) === reqId);
    if (match) {
      initializeForRequest(match, availableBatches);
    }
  };

  // Manejo de asignación de lotes
  const handleAllocationFieldChange = (
    itemId: number,
    index: number,
    field: "batchId" | "quantity",
    value: number | string
  ) => {
    setAllocations((prev) => {
      const currentRows = [...(prev[itemId] || [])];
      if (!currentRows[index]) return prev;

      currentRows[index] = {
        ...currentRows[index],
        [field]: value,
      };
      return {
        ...prev,
        [itemId]: currentRows,
      };
    });
  };

  const handleAddBatchRow = (itemId: number) => {
    setAllocations((prev) => {
      const current = prev[itemId] || [];
      return {
        ...prev,
        [itemId]: [...current, { batchId: 0, quantity: "" }],
      };
    });
  };

  const handleRemoveBatchRow = (itemId: number, index: number) => {
    setAllocations((prev) => {
      const current = prev[itemId] || [];
      if (current.length <= 1) return prev;
      return {
        ...prev,
        [itemId]: current.filter((_, idx) => idx !== index),
      };
    });
  };

  // Asignación automática FEFO inteligente (First Expired, First Out)
  const handleAutoAssignFEFO = () => {
    if (!selectedRequest) return;

    const newMap: Record<number, DispatchAllocationRow[]> = {};
    let totalAssignedItems = 0;

    selectedRequest.items.forEach((it) => {
      if (!it.id) return;

      const qtyApproved = Number(
        it.quantityApproved && it.quantityApproved > 0
          ? it.quantityApproved
          : it.quantityRequested ?? it.requestedQuantity ?? 0
      );
      const qtyDispatched = Number(
        it.quantityDispatched ?? it.dispatchedQuantity ?? 0
      );
      let remainingToDispatch = Math.max(0, qtyApproved - qtyDispatched);

      // Buscar y ordenar lotes por fecha de vencimiento ascendente (FEFO)
      const candidateBatches = availableBatches
        .filter((b) => (b.productId ?? b.product?.id) === it.productId && b.currentQuantity > 0)
        .sort((a, b) => {
          if (!a.expirationDate) return 1;
          if (!b.expirationDate) return -1;
          return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
        });

      const itemAllocations: DispatchAllocationRow[] = [];

      for (const batch of candidateBatches) {
        if (remainingToDispatch <= 0) break;
        const take = Math.min(remainingToDispatch, batch.currentQuantity);
        if (take > 0) {
          itemAllocations.push({
            batchId: batch.id,
            quantity: take,
          });
          remainingToDispatch -= take;
        }
      }

      if (itemAllocations.length === 0) {
        // Si no hay lotes con stock, dejar fila vacía con el primer lote
        const first = candidateBatches[0];
        itemAllocations.push({
          batchId: first ? first.id : 0,
          quantity: "",
        });
      } else {
        totalAssignedItems++;
      }

      newMap[it.id] = itemAllocations;
    });

    setAllocations(newMap);
    toast.success(`Asignación FEFO completada para los insumos disponibles.`);
  };

  // Limpiar todas las cantidades
  const handleClearAllocations = () => {
    if (!selectedRequest) return;
    const newMap: Record<number, DispatchAllocationRow[]> = {};
    selectedRequest.items.forEach((it) => {
      if (it.id) {
        newMap[it.id] = [{ batchId: 0, quantity: "" }];
      }
    });
    setAllocations(newMap);
    toast.info("Se han reseteado las cantidades a despachar.");
  };

  // Manejo de badges de justificación / motivo de despacho
  const isReasonSelected = (reason: DispatchReasonBadge) => {
    return dispatchNotes.toLowerCase().includes(reason.title.toLowerCase());
  };

  const handleToggleReason = (reason: DispatchReasonBadge) => {
    const isPresent = dispatchNotes
      .toLowerCase()
      .includes(reason.title.toLowerCase());

    if (isPresent) {
      const lines = dispatchNotes.split("\n");
      const filtered = lines.filter(
        (l) => !l.toLowerCase().includes(reason.title.toLowerCase())
      );
      setDispatchNotes(filtered.join("\n").replace(/\n{3,}/g, "\n\n").trim());
      toast.info(`Motivo "${reason.word}" removido.`);
    } else {
      const snippet = `• ${reason.title}: ${reason.description}`;
      setDispatchNotes((prev) =>
        prev.trim() ? `${prev.trim()}\n${snippet}` : snippet
      );
      toast.success(`Motivo "${reason.word}" aplicado a notas de entrega.`);
    }
  };

  // Cálculos estadísticos y validaciones
  const { totalUnitsToDispatch, validAllocatedCount, hasOverAllocation } =
    useMemo(() => {
      if (!selectedRequest) {
        return {
          totalUnitsToDispatch: 0,
          validAllocatedCount: 0,
          hasOverAllocation: false,
        };
      }

      let units = 0;
      let count = 0;
      let over = false;

      selectedRequest.items.forEach((it) => {
        if (!it.id) return;
        const itRows = allocations[it.id] || [];
        const itemSum = itRows.reduce(
          (sum, r) => sum + (Number(r.quantity) || 0),
          0
        );

        if (itemSum > 0) {
          count++;
          units += itemSum;
        }

        const qtyApproved = Number(
          it.quantityApproved && it.quantityApproved > 0
            ? it.quantityApproved
            : it.quantityRequested ?? it.requestedQuantity ?? 0
        );
        const qtyDispatched = Number(
          it.quantityDispatched ?? it.dispatchedQuantity ?? 0
        );
        const pending = Math.max(0, qtyApproved - qtyDispatched);

        if (itemSum > pending) {
          over = true;
        }
      });

      return {
        totalUnitsToDispatch: units,
        validAllocatedCount: count,
        hasOverAllocation: over,
      };
    }, [selectedRequest, allocations]);

  // Filtrado reactivo en los renglones
  const displayedItems = useMemo(() => {
    if (!selectedRequest) return [];
    if (!searchTermInRows.trim()) return selectedRequest.items;

    const term = searchTermInRows.toLowerCase();
    return selectedRequest.items.filter((it) => {
      const name = it.product?.name?.toLowerCase() || "";
      const sku = it.product?.sku?.toLowerCase() || "";
      return name.includes(term) || sku.includes(term);
    });
  }, [selectedRequest, searchTermInRows]);

  // Verificar estado dirty
  const isDirty = useMemo(() => {
    return totalUnitsToDispatch > 0 || dispatchNotes.trim().length > 0;
  }, [totalUnitsToDispatch, dispatchNotes]);

  const handleBackNavigation = () => {
    if (isDirty) {
      setConfirmLeaveOpen(true);
    } else {
      router.push("/requests");
    }
  };

  // Enviar Despacho
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedRequest) {
      toast.error("Debe seleccionar una solicitud para despachar.");
      return;
    }

    if (totalUnitsToDispatch <= 0) {
      toast.error("Debe asignar al menos una cantidad mayor a 0 para despachar.");
      return;
    }

    if (hasOverAllocation) {
      toast.error(
        "Uno o más renglones exceden el saldo pendiente por despachar. Corrija las cantidades antes de continuar."
      );
      return;
    }

    // Validar que cada asignación tenga un lote válido
    const payloadItems: DispatchRequestItemPayload[] = [];

    for (const it of selectedRequest.items) {
      if (!it.id) continue;
      const itRows = allocations[it.id] || [];
      const validRows = itRows.filter(
        (r) => r.batchId > 0 && Number(r.quantity) > 0
      );

      if (validRows.length > 0) {
        payloadItems.push({
          itemId: it.id,
          allocations: validRows.map((r) => ({
            batchId: r.batchId,
            quantity: Number(r.quantity),
          })),
        });
      }
    }

    if (payloadItems.length === 0) {
      toast.error("Debe seleccionar lotes válidos con cantidades mayores a 0.");
      return;
    }

    setSubmitting(true);
    try {
      await RequestClientService.dispatchRequest({
        requestId: selectedRequest.id,
        items: payloadItems,
        dispatchNotes: dispatchNotes.trim() || undefined,
      });

      toast.success(
        `Despacho de Solicitud #${selectedRequest.requestNumber} procesado y stock descontado exitosamente.`
      );
      router.push(`/requests/${selectedRequest.id}`);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Error al procesar el despacho";
      toast.error(errorMsg);
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Cargando solicitudes aprobadas y lotes activos de almacén...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Barra de Navegación y Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleBackNavigation}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground -ml-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a Solicitudes
            </Button>
            <span className="text-muted-foreground/40">•</span>
            <span className="text-xs text-muted-foreground font-mono">
              Salida Física de Inventario
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <PackageCheck className="w-5 h-5" />
            </div>
            Nuevo Despacho de Materiales
          </h1>
          <p className="text-xs text-muted-foreground">
            Asigne los lotes de almacén y confirme la salida física de insumos para
            la requisición aprobada.
          </p>
        </div>

        {/* Resumen Superior Rápido con badges estilizados y coloridos */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {selectedRequest && (
            <Badge variant="info" className="gap-1.5 py-1 px-3 text-xs shadow-2xs font-medium">
              <span className="font-mono font-bold">#{selectedRequest.requestNumber}</span>
            </Badge>
          )}
          <Badge variant="indigo" className="gap-1.5 py-1 px-3 text-xs shadow-2xs font-medium">
            <Layers className="w-3.5 h-3.5" />
            <span className="font-bold">{validAllocatedCount}</span>
            <span>
              {validAllocatedCount === 1 ? "renglón asignado" : "renglones asignados"}
            </span>
          </Badge>
          <Badge variant="purple" className="gap-1.5 py-1 px-3 text-xs shadow-2xs font-medium">
            <span className="font-bold">{totalUnitsToDispatch}</span>
            <span>unidades a entregar</span>
          </Badge>
          {selectedRequest && (
            <Badge
              variant={
                selectedRequest.status === "COMPLETADA"
                  ? "success"
                  : selectedRequest.status === "DESPACHADA_PARCIAL"
                  ? "purple"
                  : "info"
              }
              className="gap-1.5 py-1 px-3 text-xs shadow-2xs font-medium"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span>{selectedRequest.status}</span>
            </Badge>
          )}
        </div>
      </div>

      {/* Control de roles */}
      {!isWarehouseStaff && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Acceso Restringido</AlertTitle>
          <AlertDescription>
            Solo el personal de Almacén o Administración posee autorización para
            despachar materiales y descontar inventario físico.
          </AlertDescription>
        </Alert>
      )}

      {approvedRequests.length === 0 && !selectedRequest ? (
        <Card className="border-border p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
            <PackageCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            No hay solicitudes en espera de despacho
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Actualmente todas las solicitudes están completadas o pendientes de
            aprobación formal por el jefe de almacén.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/requests")}
          >
            Ir al listado de solicitudes
          </Button>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECCIÓN 1: INFORMACIÓN GENERAL DE LA REQUISICIÓN */}
          <Card className="border-border">
            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    1. Requisición y Área Destino
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Compruebe los datos del área receptora y el usuario solicitante.
                  </CardDescription>
                </div>

                {/* Selector de Solicitud en caso de cambio (Bloqueado si se abrió para un registro específico) */}
                {approvedRequests.length > 0 && (
                  <div className="w-full sm:w-80 space-y-1">
                    <Select
                      value={selectedRequest ? String(selectedRequest.id) : ""}
                      onValueChange={handleSelectRequest}
                      disabled={isFixedByQuery}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background disabled:opacity-85 disabled:cursor-not-allowed">
                        {isFixedByQuery && (
                          <Lock className="w-3.5 h-3.5 text-muted-foreground mr-1.5 shrink-0" />
                        )}
                        <SelectValue placeholder="Seleccione una solicitud..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-80">
                        {approvedRequests.map((r) => (
                          <SelectItem key={r.id} value={String(r.id)} className="text-xs">
                            <span className="font-mono font-bold text-primary mr-1">
                              #{r.requestNumber}
                            </span>{" "}
                            — {r.departmentSection || r.department?.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isFixedByQuery && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                        <Lock className="w-2.5 h-2.5 shrink-0 text-amber-600 dark:text-amber-400" />
                        Registro fijado por seguridad desde la solicitud
                      </span>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Solicitud */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  N° de Requisición
                </Label>
                <div className="h-9 rounded-lg border border-border/60 bg-muted/30 px-3 py-1 flex items-center justify-between text-xs font-medium">
                  <span className="font-mono font-bold text-foreground">
                    #{selectedRequest?.requestNumber || "—"}
                  </span>
                  <Badge variant="indigo" className="text-[10px] py-0 px-1.5 font-bold">
                    {selectedRequest?.items.length || 0} ítems
                  </Badge>
                </div>
              </div>

              {/* Área / Departamento */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Área Receptora
                </Label>
                <div className="h-9 rounded-lg border border-border/60 bg-muted/30 px-3 py-1 flex items-center gap-2 text-xs font-medium truncate">
                  <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">
                    {selectedRequest?.departmentSection ||
                      selectedRequest?.department?.name ||
                      "General"}
                  </span>
                </div>
              </div>

              {/* Solicitante */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Usuario Solicitante
                </Label>
                <div className="h-9 rounded-lg border border-border/60 bg-muted/30 px-3 py-1 flex items-center gap-2 text-xs font-medium truncate">
                  <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate">
                    {selectedRequest?.applicant?.fullName ||
                      selectedRequest?.applicant?.username ||
                      "Usuario"}
                  </span>
                </div>
              </div>

              {/* Almacenista Responsable */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Despachado Por (Almacén)
                </Label>
                <div className="h-9 rounded-lg border border-emerald-200/60 bg-emerald-50/40 dark:bg-emerald-950/20 px-3 py-1 flex items-center gap-2 text-xs font-medium text-emerald-800 dark:text-emerald-300">
                  <PackageCheck className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate font-semibold">
                    {currentUser?.fullName || currentUser?.username}
                  </span>
                </div>
              </div>
            </CardContent>

            {/* Justificación original de la solicitud (sin etiqueta y sin códigos [código]) */}
            {selectedRequest?.justification && (
              <div className="mx-6 mb-4 p-3.5 rounded-lg border border-border/50 bg-muted/20 text-xs">
                <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed font-normal">
                  {selectedRequest.justification
                    .replace(/\[[A-Za-z0-9_\-]+\]\s*/g, "")
                    .replace(/^•\s*/gm, "")
                    .trim()}
                </p>
              </div>
            )}
          </Card>

          {/* SECCIÓN 2: ASIGNACIÓN DE LOTES (MULTI-LOTE FEFO) */}
          <Card className="border-border">
            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    2. Insumos y Asignación de Lotes Físicos (FEFO)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Asigne el lote de donde se descontará cada reactivo. Puede añadir
                    más de un lote por renglón si la cantidad es grande.
                  </CardDescription>
                </div>

                {/* Herramientas de Despacho Rápido */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Buscador dentro de renglones */}
                  {selectedRequest && selectedRequest.items.length > 4 && (
                    <div className="relative w-full sm:w-52">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Filtrar insumo..."
                        value={searchTermInRows}
                        onChange={(e) => setSearchTermInRows(e.target.value)}
                        className="h-8 text-xs pl-8 pr-2 bg-background"
                      />
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAutoAssignFEFO}
                    className="h-8 text-xs gap-1.5 text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-300 dark:border-emerald-800/80 dark:bg-emerald-950/40"
                    title="Asigna automáticamente los lotes más próximos a vencer con stock disponible"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Auto-asignar (FEFO)
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAllocations}
                    className="h-8 text-xs text-muted-foreground hover:text-destructive gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Limpiar
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-4 bg-muted/5">
              {hasOverAllocation && (
                <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2.5 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>
                    Atención: La cantidad asignada en uno o más insumos excede el
                    saldo pendiente por entregar. Por favor ajuste las cantidades.
                  </span>
                </div>
              )}

              {/* LISTA DE RENGLONES ESPACIADOS Y LEGIBLES */}
              <div className="space-y-4">
                {displayedItems.map((item, index) => {
                  if (!item.id) return null;
                  const itId = item.id;
                  const itemAllocations = allocations[itId] || [];
                  const allocatedSum = itemAllocations.reduce(
                    (sum, r) => sum + (Number(r.quantity) || 0),
                    0
                  );

                  const qtyApproved = Number(
                    item.quantityApproved && item.quantityApproved > 0
                      ? item.quantityApproved
                      : item.quantityRequested ?? item.requestedQuantity ?? 0
                  );
                  const qtyDispatched = Number(
                    item.quantityDispatched ?? item.dispatchedQuantity ?? 0
                  );
                  const pendingQuantity = Math.max(0, qtyApproved - qtyDispatched);
                  const unit =
                    item.product?.unitOfMeasure ||
                    item.product?.baseUnit?.abbreviation ||
                    "UND";

                  // Lotes disponibles para este producto
                  const productBatches = availableBatches.filter(
                    (b) =>
                      (b.productId ?? b.product?.id) === item.productId &&
                      b.currentQuantity > 0
                  );

                  const isComplete = allocatedSum === pendingQuantity && pendingQuantity > 0;
                  const isPartial = allocatedSum > 0 && allocatedSum < pendingQuantity;
                  const isOver = allocatedSum > pendingQuantity;

                  return (
                    <div
                      key={itId}
                      className={cn(
                        "rounded-xl border p-4 sm:p-5 transition-all shadow-2xs space-y-4 bg-card",
                        isOver
                          ? "border-rose-300 bg-rose-50/15 dark:border-rose-900/60"
                          : isComplete
                          ? "border-emerald-300/80 bg-emerald-50/10 dark:border-emerald-900/60"
                          : isPartial
                          ? "border-amber-300/80 bg-amber-50/10 dark:border-amber-900/60"
                          : "border-border/80"
                      )}
                    >
                      {/* Cabecera del Insumo con nombre grande y métricas bien separadas */}
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 pb-3 border-b border-border/50">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-mono text-xs font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                              Renglón #{index + 1}
                            </span>
                            <h3 className="font-bold text-sm sm:text-base text-foreground tracking-tight">
                              {item.product?.name || `Producto #${item.productId}`}
                            </h3>
                            {item.product?.sku && (
                              <Badge
                                variant="outline"
                                className="font-mono text-[10px] text-muted-foreground border-border/60 bg-background"
                              >
                                SKU: {item.product.sku}
                              </Badge>
                            )}
                          </div>

                          {/* Métricas espaciadas y de fácil lectura */}
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                            <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-md border border-border/50">
                              <span className="text-[11px] text-muted-foreground">Aprobado:</span>
                              <span className="font-bold font-mono text-foreground">{qtyApproved} {unit}</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-muted/40 px-2.5 py-1 rounded-md border border-border/50">
                              <span className="text-[11px] text-muted-foreground">Ya despachado:</span>
                              <span className="font-bold font-mono text-foreground">{qtyDispatched} {unit}</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20 text-primary">
                              <span className="text-[11px] font-medium">Saldo por entregar:</span>
                              <span className="font-extrabold font-mono text-xs sm:text-sm">{pendingQuantity} {unit}</span>
                            </div>
                          </div>
                        </div>

                        {/* Badges de Estado del Renglón */}
                        <div className="self-start md:self-center shrink-0">
                          {isComplete && (
                            <Badge variant="success" className="gap-1.5 py-1 px-3 text-xs font-semibold">
                              <Check className="w-3.5 h-3.5" />
                              Completo ({allocatedSum} / {pendingQuantity})
                            </Badge>
                          )}
                          {isPartial && (
                            <Badge variant="warning" className="gap-1.5 py-1 px-3 text-xs font-semibold">
                              <Clock className="w-3.5 h-3.5" />
                              Parcial ({allocatedSum} / {pendingQuantity})
                            </Badge>
                          )}
                          {isOver && (
                            <Badge variant="rose" className="gap-1.5 py-1 px-3 text-xs font-bold animate-pulse">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Excede saldo ({allocatedSum} / {pendingQuantity})
                            </Badge>
                          )}
                          {allocatedSum === 0 && (
                            <Badge variant="outline" className="py-1 px-3 text-xs text-muted-foreground">
                              Sin asignar (0 / {pendingQuantity})
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Caja de Lotes y Asignación Física */}
                      <div className="space-y-3 pt-1">
                        {productBatches.length === 0 ? (
                          <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2.5 font-medium">
                            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                            <span>Sin stock disponible en almacén: No se encontraron lotes activos con existencia física positiva para este insumo.</span>
                          </div>
                        ) : (
                          <div className="space-y-3 bg-muted/20 rounded-xl p-3.5 border border-border/60">
                            {itemAllocations.map((allocRow, allocIdx) => {
                              const currentBatch = productBatches.find(
                                (b) => b.id === allocRow.batchId
                              );
                              const maxBatchStock = currentBatch?.currentQuantity ?? 0;

                              return (
                                <div
                                  key={allocIdx}
                                  className="grid grid-cols-12 gap-3 items-center"
                                >
                                  {/* Selector de Lote */}
                                  <div className="col-span-12 sm:col-span-7">
                                    <Label className="text-[11px] font-semibold text-foreground/80 mb-1.5 flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 text-primary" />
                                      Lote de Almacén (Vencimiento y Stock Disponible)
                                    </Label>
                                    <select
                                      aria-label="Seleccionar Lote de Almacén"
                                      value={allocRow.batchId}
                                      onChange={(e) =>
                                        handleAllocationFieldChange(
                                          itId,
                                          allocIdx,
                                          "batchId",
                                          Number(e.target.value)
                                        )
                                      }
                                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                                    >
                                      <option value={0}>
                                        -- Seleccione un lote disponible --
                                      </option>
                                      {productBatches.map((b) => (
                                        <option key={b.id} value={b.id}>
                                          Lote {b.lotNumber} • Existencia: {b.currentQuantity} {unit}
                                          {b.expirationDate
                                            ? ` • Vence: ${new Date(
                                                b.expirationDate
                                              ).toLocaleDateString()}`
                                            : ""}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Cantidad a Despachar */}
                                  <div className="col-span-10 sm:col-span-4">
                                    <Label className="text-[11px] font-semibold text-foreground/80 mb-1.5 flex items-center justify-between">
                                      <span>Cantidad a Despachar</span>
                                      {currentBatch && (
                                        <span className="text-[10px] text-muted-foreground font-normal">
                                          (Máx. lote: {maxBatchStock} {unit})
                                        </span>
                                      )}
                                    </Label>
                                    <div className="relative">
                                      <Input
                                        type="number"
                                        min="0"
                                        max={maxBatchStock || undefined}
                                        placeholder="0"
                                        value={allocRow.quantity}
                                        onChange={(e) =>
                                          handleAllocationFieldChange(
                                            itId,
                                            allocIdx,
                                            "quantity",
                                            e.target.value === ""
                                              ? ""
                                              : Math.max(0, Number(e.target.value))
                                          )
                                        }
                                        className="h-9 font-mono font-bold text-xs sm:text-sm text-center pr-12"
                                      />
                                      <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-mono font-medium pointer-events-none">
                                        {unit}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Botón Eliminar fila de lote si hay más de una */}
                                  <div className="col-span-2 sm:col-span-1 text-center pt-5">
                                    {itemAllocations.length > 1 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() =>
                                          handleRemoveBatchRow(itId, allocIdx)
                                        }
                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                        title="Quitar este lote"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            {/* Botón para añadir lote adicional para este ítem */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2.5 border-t border-border/40">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAddBatchRow(itId)}
                                className="text-primary hover:text-primary font-semibold text-xs h-7 px-2 gap-1.5 self-start"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                + Dividir entrega en otro lote
                              </Button>

                              <div className="text-xs bg-background px-3 py-1 rounded-md border border-border/40 self-end sm:self-auto">
                                <span className="text-muted-foreground mr-1.5">
                                  Total asignado en este insumo:
                                </span>
                                <strong
                                  className={
                                    isOver
                                      ? "text-rose-600 font-mono font-bold"
                                      : isComplete
                                      ? "text-emerald-700 dark:text-emerald-400 font-mono font-bold"
                                      : "text-foreground font-mono font-bold"
                                  }
                                >
                                  {allocatedSum} / {pendingQuantity} {unit}
                                </strong>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* SECCIÓN 3: JUSTIFICACIÓN DE SALIDA Y NOTAS DE ENTREGA */}
          <Card className="border-border">
            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                3. Motivo de Salida y Observaciones de Entrega
              </CardTitle>
              <CardDescription className="text-xs">
                Seleccione un badge de resumen de una palabra para la justificación de
                salida o ingrese el acta/persona que recibe.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Selector de Badges de 1 palabra para Despacho */}
              <div className="space-y-2.5 rounded-xl border border-border/60 bg-muted/20 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    Condiciones y Motivos Frecuentes de Despacho
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    (Haz clic para asociar a las notas)
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-0.5">
                  {DISPATCH_REASONS.map((reason) => {
                    const selected = isReasonSelected(reason);
                    return (
                      <button
                        key={reason.id}
                        type="button"
                        onClick={() => handleToggleReason(reason)}
                        className={cn(
                          "group inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all text-left shadow-2xs cursor-pointer border",
                          selected ? reason.theme.selected : reason.theme.unselected
                        )}
                        title={`${reason.title}: ${reason.description}`}
                      >
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full shrink-0 transition-transform group-hover:scale-125",
                            selected ? "bg-white" : reason.theme.dot
                          )}
                        />
                        <span className="font-bold tracking-tight">
                          {reason.word}
                        </span>
                        <span className="text-[11px] opacity-80 border-l border-current/20 pl-2 hidden sm:inline truncate max-w-[200px]">
                          {reason.title}
                        </span>
                        {selected && <Check className="w-3.5 h-3.5 shrink-0 ml-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detalle de Notas de Despacho */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Notas de Entrega / N° de Acta / Quien Recibe
                </Label>
                <Textarea
                  rows={3}
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="Ej. Entregado conforme a Lic. María Pérez con acta #048, verificado precinto de seguridad..."
                  className="text-xs font-medium resize-y"
                />
              </div>
            </CardContent>
          </Card>

          {/* BARRA FLOTANTE / INFERIOR DE ACCIONES */}
          <div className="sticky bottom-4 z-40 bg-card/95 backdrop-blur-md border border-border shadow-xl rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground w-full sm:w-auto justify-between sm:justify-start">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">
                  {validAllocatedCount}
                </span>
                <span>renglones configurados</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-foreground">
                  {totalUnitsToDispatch}
                </span>
                <span>piezas/unidades a entregar</span>
              </div>
              {hasOverAllocation && (
                <>
                  <span>•</span>
                  <span className="text-rose-600 font-semibold">
                    Error: Cantidad excede saldo
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBackNavigation}
                disabled={submitting}
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                size="sm"
                disabled={
                  submitting ||
                  !isWarehouseStaff ||
                  totalUnitsToDispatch === 0 ||
                  hasOverAllocation
                }
                className="gap-2 min-w-[170px] bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Procesando Despacho...
                  </>
                ) : (
                  <>
                    <PackageCheck className="w-4 h-4" />
                    Confirmar y Despachar
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* DIÁLOGO DE CONFIRMACIÓN AL SALIR CON CAMBIOS */}
      <Dialog open={confirmLeaveOpen} onOpenChange={setConfirmLeaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              ¿Descartar cambios de despacho?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Ha configurado cantidades o notas en este despacho. Si regresa a la
              lista, los cambios no confirmados se perderán.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmLeaveOpen(false)}
            >
              Continuar editando
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                setConfirmLeaveOpen(false);
                router.push("/requests");
              }}
            >
              Descartar y Salir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function DispatchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Cargando módulo de despacho...
          </p>
        </div>
      }
    >
      <DispatchContent />
    </Suspense>
  );
}
