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
import Link from "next/link";
import { RequestClientService } from "@/services/request.service";
import { InventoryClientService } from "@/services/inventory.service";
import { AuthService } from "@/services/auth.service";
import { toast } from "@/utils/toast";
import { cn } from "@/lib/utils";
import type {
  InternalRequest,
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
  Building2,
  Sparkles,
  Calendar,
  User,
  Plus,
  Trash2,
  Check,
  Clock,
  RotateCcw,
  Lock,
  Table as TableIcon,
  LayoutGrid,
  Zap,
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
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DispatchAllocationRow {
  batchId: number;
  quantity: number | "";
}

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
    description: "Entrega fraccionada según stock en almacén, saldo en Standby.",
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

type ItemFilter = "ALL" | "PENDING" | "COMPLETED" | "NO_STOCK";
type ViewMode = "table" | "cards";

function CreateDispatchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryRequestId = searchParams.get("requestId") || searchParams.get("id");
  const isFixedByQuery = Boolean(queryRequestId);

  const [currentUser] = useState<AuthUser | null>(() =>
    AuthService.getCurrentUser()
  );

  const [approvedRequests, setApprovedRequests] = useState<InternalRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<InternalRequest | null>(null);
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
  const [itemFilter, setItemFilter] = useState<ItemFilter>("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [submitting, setSubmitting] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);

  const userRoles = currentUser?.roles || [];
  const isWarehouseStaff =
    userRoles.includes("ADMINISTRADOR") || userRoles.includes("ALMACENISTA");

  // Inicializar asignación para una solicitud
  const initializeForRequest = useCallback(
    (req: InternalRequest, batchesList: typeof availableBatches) => {
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

          const candidateBatches = batchesList.filter(
            (b) => (b.productId ?? b.product?.id) === it.productId && b.currentQuantity > 0
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

      // Si tiene más de 3 insumos, seleccionar modo tabla por ergonomía
      if (req.items.length > 3) {
        setViewMode("table");
      }
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

        const dispatchable = allReqs.filter(
          (r) =>
            r.status === "APROBADA" || r.status === "DESPACHADA_PARCIAL"
        );
        setApprovedRequests(dispatchable);
        setAvailableBatches(batches);

        if (queryRequestId) {
          const match = dispatchable.find(
            (r) => String(r.id) === String(queryRequestId)
          );
          if (match) {
            initializeForRequest(match, batches);
          } else {
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
              toast.error("No se encontró la solicitud aprobada.");
            }
          }
        } else if (dispatchable.length === 1) {
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

  const handleSelectRequest = (reqId: string) => {
    const match = approvedRequests.find((r) => String(r.id) === reqId);
    if (match) {
      initializeForRequest(match, availableBatches);
    }
  };

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

  // Asignar el valor Máximo automático con un clic
  const handleFillMax = (itemId: number, allocIndex: number) => {
    if (!selectedRequest) return;
    const reqItem = selectedRequest.items.find((i) => i.id === itemId);
    if (!reqItem) return;

    const qtyApproved = Number(
      reqItem.quantityApproved && reqItem.quantityApproved > 0
        ? reqItem.quantityApproved
        : reqItem.quantityRequested ?? reqItem.requestedQuantity ?? 0
    );
    const qtyDispatched = Number(
      reqItem.quantityDispatched ?? reqItem.dispatchedQuantity ?? 0
    );
    const pendingTotal = Math.max(0, qtyApproved - qtyDispatched);

    const currentRows = allocations[itemId] || [];
    const otherAllocationsSum = currentRows.reduce(
      (sum, r, idx) => (idx !== allocIndex ? sum + (Number(r.quantity) || 0) : sum),
      0
    );

    const needed = Math.max(0, pendingTotal - otherAllocationsSum);
    const targetRow = currentRows[allocIndex];
    if (!targetRow) return;

    const candidateBatches = availableBatches.filter(
      (b) =>
        (b.productId ?? b.product?.id) === reqItem.productId &&
        b.currentQuantity > 0
    );

    let batchStock = 0;
    let selectedBatchId = targetRow.batchId;

    if (selectedBatchId > 0) {
      const b = candidateBatches.find((item) => item.id === selectedBatchId);
      batchStock = b ? b.currentQuantity : 0;
    } else if (candidateBatches.length > 0) {
      selectedBatchId = candidateBatches[0].id;
      batchStock = candidateBatches[0].currentQuantity;
      handleAllocationFieldChange(itemId, allocIndex, "batchId", selectedBatchId);
    }

    const fillAmount = Math.min(needed, batchStock);
    handleAllocationFieldChange(
      itemId,
      allocIndex,
      "quantity",
      fillAmount > 0 ? fillAmount : ""
    );
  };

  // Asignación FEFO Inteligente
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

      const candidateBatches = availableBatches
        .filter(
          (b) =>
            (b.productId ?? b.product?.id) === it.productId &&
            b.currentQuantity > 0
        )
        .sort((a, b) => {
          if (!a.expirationDate) return 1;
          if (!b.expirationDate) return -1;
          return (
            new Date(a.expirationDate).getTime() -
            new Date(b.expirationDate).getTime()
          );
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
    toast.success(`Asignación FEFO completada (${totalAssignedItems} insumos).`);
  };

  const handleClearAllocations = () => {
    if (!selectedRequest) return;
    const newMap: Record<number, DispatchAllocationRow[]> = {};
    selectedRequest.items.forEach((it) => {
      if (it.id) {
        newMap[it.id] = [{ batchId: 0, quantity: "" }];
      }
    });
    setAllocations(newMap);
    toast.info("Cantidades reseteadas.");
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
      toast.success(`Motivo "${reason.word}" agregado.`);
    }
  };

  // Cálculos estadísticos y de avance
  const {
    totalUnitsToDispatch,
    validAllocatedCount,
    hasOverAllocation,
    completedItemsCount,
    pendingItemsCount,
    noStockItemsCount,
    totalItemsCount,
    progressPercentage,
  } = useMemo(() => {
    if (!selectedRequest) {
      return {
        totalUnitsToDispatch: 0,
        validAllocatedCount: 0,
        hasOverAllocation: false,
        completedItemsCount: 0,
        pendingItemsCount: 0,
        noStockItemsCount: 0,
        totalItemsCount: 0,
        progressPercentage: 0,
      };
    }

    let units = 0;
    let count = 0;
    let over = false;
    let completed = 0;
    let pending = 0;
    let noStock = 0;

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
      const pendingQty = Math.max(0, qtyApproved - qtyDispatched);

      if (itemSum > pendingQty) {
        over = true;
      }

      const hasStock = availableBatches.some(
        (b) => (b.productId ?? b.product?.id) === it.productId && b.currentQuantity > 0
      );

      if (!hasStock) {
        noStock++;
      } else if (itemSum >= pendingQty && pendingQty > 0) {
        completed++;
      } else {
        pending++;
      }
    });

    const total = selectedRequest.items.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      totalUnitsToDispatch: units,
      validAllocatedCount: count,
      hasOverAllocation: over,
      completedItemsCount: completed,
      pendingItemsCount: pending,
      noStockItemsCount: noStock,
      totalItemsCount: total,
      progressPercentage: pct,
    };
  }, [selectedRequest, allocations, availableBatches]);

  // Filtrado de renglones para la vista activa
  const displayedItems = useMemo(() => {
    if (!selectedRequest) return [];

    let list = selectedRequest.items;

    // Filtro por pestaña interna de estado
    if (itemFilter === "PENDING") {
      list = list.filter((it) => {
        const itId = it.id || 0;
        const itRows = allocations[itId] || [];
        const itemSum = itRows.reduce(
          (sum, r) => sum + (Number(r.quantity) || 0),
          0
        );
        const qtyApproved = Number(
          it.quantityApproved && it.quantityApproved > 0
            ? it.quantityApproved
            : it.quantityRequested ?? it.requestedQuantity ?? 0
        );
        const qtyDispatched = Number(
          it.quantityDispatched ?? it.dispatchedQuantity ?? 0
        );
        const pendingQty = Math.max(0, qtyApproved - qtyDispatched);
        const hasStock = availableBatches.some(
          (b) => (b.productId ?? b.product?.id) === it.productId && b.currentQuantity > 0
        );
        return hasStock && itemSum < pendingQty;
      });
    } else if (itemFilter === "COMPLETED") {
      list = list.filter((it) => {
        const itId = it.id || 0;
        const itRows = allocations[itId] || [];
        const itemSum = itRows.reduce(
          (sum, r) => sum + (Number(r.quantity) || 0),
          0
        );
        const qtyApproved = Number(
          it.quantityApproved && it.quantityApproved > 0
            ? it.quantityApproved
            : it.quantityRequested ?? it.requestedQuantity ?? 0
        );
        const qtyDispatched = Number(
          it.quantityDispatched ?? it.dispatchedQuantity ?? 0
        );
        const pendingQty = Math.max(0, qtyApproved - qtyDispatched);
        return itemSum >= pendingQty && pendingQty > 0;
      });
    } else if (itemFilter === "NO_STOCK") {
      list = list.filter((it) => {
        return !availableBatches.some(
          (b) => (b.productId ?? b.product?.id) === it.productId && b.currentQuantity > 0
        );
      });
    }

    // Buscador libre dentro de los renglones
    if (searchTermInRows.trim()) {
      const term = searchTermInRows.toLowerCase();
      list = list.filter((it) => {
        const name = it.product?.name?.toLowerCase() || "";
        const sku = it.product?.sku?.toLowerCase() || "";
        return name.includes(term) || sku.includes(term);
      });
    }

    return list;
  }, [
    selectedRequest,
    itemFilter,
    searchTermInRows,
    allocations,
    availableBatches,
  ]);

  const isDirty = useMemo(() => {
    return totalUnitsToDispatch > 0 || dispatchNotes.trim().length > 0;
  }, [totalUnitsToDispatch, dispatchNotes]);

  const handleBackNavigation = () => {
    if (isDirty) {
      setConfirmLeaveOpen(true);
    } else {
      router.push("/requests/dispatch");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedRequest) {
      toast.error("Seleccione una solicitud para despachar.");
      return;
    }

    if (totalUnitsToDispatch <= 0) {
      toast.error("Asigne al menos una cantidad mayor a 0 para despachar.");
      return;
    }

    if (hasOverAllocation) {
      toast.error("Uno o más renglones exceden el saldo pendiente.");
      return;
    }

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
      toast.error("Seleccione lotes válidos con cantidades mayores a 0.");
      return;
    }

    setSubmitting(true);
    try {
      const updatedReq = await RequestClientService.dispatchRequest({
        requestId: selectedRequest.id,
        items: payloadItems,
        dispatchNotes: dispatchNotes.trim() || undefined,
      });

      toast.success(
        `Despacho de #${selectedRequest.requestNumber} procesado exitosamente.`
      );

      const targetRequestId = updatedReq?.id || selectedRequest.id;
      router.push(`/requests/dispatch/${targetRequestId}`);
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
          Cargando solicitudes y lotes de almacén...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto w-full">
      {/* ========================================================
          ENCABEZADO ESTANDARIZADO
         ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-start sm:items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleBackNavigation}
            className="shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Volver a Despachos"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 shadow-2xs">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Nuevo Despacho
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Asignación de lotes y salida física de almacén
            </p>
          </div>
        </div>

        {selectedRequest && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="info" className="font-mono text-xs font-bold py-1 px-2.5">
              #{selectedRequest.requestNumber}
            </Badge>
            <Badge variant="outline" className="text-xs py-1 px-2.5 gap-1.5 font-medium">
              <Layers className="w-3.5 h-3.5 text-primary" />
              <span>{selectedRequest.items.length} renglones</span>
            </Badge>
            <Badge variant="purple" className="text-xs py-1 px-2.5 font-bold">
              {totalUnitsToDispatch} unid.
            </Badge>
          </div>
        )}
      </div>

      {/* Control de rol */}
      {!isWarehouseStaff && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Acceso Restringido</AlertTitle>
          <AlertDescription>
            Solo el personal de Almacén o Administración puede despachar materiales.
          </AlertDescription>
        </Alert>
      )}

      {/* SIN SOLICITUDES EN ESPERA */}
      {approvedRequests.length === 0 && !selectedRequest ? (
        <Card className="border-border p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
            <PackageCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-foreground">
            No hay solicitudes en espera de despacho
          </h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Todas las solicitudes están completadas o pendientes de aprobación.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/requests/dispatch")}
          >
            Volver a Despachos
          </Button>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* TARJETA DE REQUISICIÓN DESTINO */}
          <Card className="border-border shadow-2xs">
            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    Solicitud Destino
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Área receptora y solicitante
                  </CardDescription>
                </div>

                {approvedRequests.length > 0 && (
                  <div className="w-full sm:w-80">
                    <Select
                      value={selectedRequest ? String(selectedRequest.id) : ""}
                      onValueChange={handleSelectRequest}
                      disabled={isFixedByQuery}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background">
                        {isFixedByQuery && (
                          <Lock className="w-3.5 h-3.5 text-muted-foreground mr-1.5 shrink-0" />
                        )}
                        <SelectValue placeholder="Seleccionar solicitud..." />
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
                  </div>
                )}
              </div>
            </CardHeader>

            {selectedRequest && (
              <CardContent className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px] font-medium">N° Solicitud</span>
                  <span className="font-mono font-bold text-foreground">#{selectedRequest.requestNumber}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px] font-medium">Departamento</span>
                  <span className="font-semibold text-foreground">
                    {selectedRequest.departmentSection || selectedRequest.department?.name || "Sin área"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px] font-medium">Solicitante</span>
                  <span className="font-medium text-foreground">
                    {selectedRequest.applicant?.fullName || selectedRequest.applicant?.username || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px] font-medium">Prioridad</span>
                  <Badge
                    variant={
                      selectedRequest.priority === "URGENTE"
                        ? "destructive"
                        : selectedRequest.priority === "BAJA"
                        ? "secondary"
                        : "outline"
                    }
                    className="text-[10px] mt-0.5"
                  >
                    {selectedRequest.priority}
                  </Badge>
                </div>
              </CardContent>
            )}
          </Card>

          {/* ========================================================
              BARRA FLOTANTE (STICKY) DE PROGRESO Y ACCIONES
             ======================================================== */}
          {selectedRequest && (
            <div className="sticky top-2 z-20 bg-card/95 backdrop-blur-md border border-border rounded-xl p-3 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Progreso del Pedido */}
              <div className="flex items-center gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-primary">
                      #{selectedRequest.requestNumber}
                    </span>
                    <span className="text-muted-foreground text-xs">•</span>
                    <span className="text-xs font-semibold text-foreground">
                      {completedItemsCount} de {totalItemsCount} insumos listos
                    </span>
                    <span className="text-xs font-mono font-bold text-muted-foreground">
                      ({progressPercentage}%)
                    </span>
                  </div>
                  {/* Barra de progreso */}
                  <div className="w-44 sm:w-56 h-2 rounded-full bg-muted overflow-hidden border border-border/60">
                    <div
                      className={cn(
                        "h-full transition-all duration-300",
                        progressPercentage === 100
                          ? "bg-emerald-500"
                          : progressPercentage > 50
                          ? "bg-primary"
                          : "bg-amber-500"
                      )}
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Botones de acción y cambio de vista */}
              <div className="flex items-center gap-2 flex-wrap justify-between md:justify-end">
                {/* Selector de Vista: Tabla Compacta vs Tarjetas */}
                <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/40">
                  <Button
                    type="button"
                    size="sm"
                    variant={viewMode === "table" ? "secondary" : "ghost"}
                    onClick={() => setViewMode("table")}
                    className="h-7 text-xs px-2.5 gap-1.5 cursor-pointer font-medium"
                    title="Vista de tabla compacta de alta densidad"
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Tabla</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={viewMode === "cards" ? "secondary" : "ghost"}
                    onClick={() => setViewMode("cards")}
                    className="h-7 text-xs px-2.5 gap-1.5 cursor-pointer font-medium"
                    title="Vista detallada en tarjetas"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Tarjetas</span>
                  </Button>
                </div>

                <Badge variant="purple" className="text-xs font-bold py-1 px-2.5">
                  {totalUnitsToDispatch} unid.
                </Badge>

                {/* Botón flotante para confirmar directamente */}
                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    submitting ||
                    totalUnitsToDispatch <= 0 ||
                    hasOverAllocation ||
                    !isWarehouseStaff
                  }
                  className="h-8 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>Despachar</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================
              CONTROLES DE RENGLONES Y PESTAÑAS DE FILTRADO
             ======================================================== */}
          {selectedRequest && (
            <Card className="border-border shadow-2xs">
              <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary" />
                      Insumos de la Solicitud
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Asigne el lote y la cantidad física para cada renglón
                    </CardDescription>
                  </div>

                  {/* Acciones Rápidas Globales */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAutoAssignFEFO}
                      className="h-8 text-xs gap-1.5 cursor-pointer"
                      title="Distribuye automáticamente según fecha de vencimiento"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Asignación FEFO</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleClearAllocations}
                      className="h-8 text-xs gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Limpiar</span>
                    </Button>
                  </div>
                </div>

                {/* FILTROS INTERNOS POR ESTADO Y BUSCADOR */}
                <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <Tabs
                    value={itemFilter}
                    onValueChange={(val) => setItemFilter(val as ItemFilter)}
                    className="w-full sm:w-auto"
                  >
                    <TabsList className="bg-background border border-border h-8 p-0.5">
                      <TabsTrigger value="ALL" className="text-xs px-2.5 h-7">
                        Todos ({totalItemsCount})
                      </TabsTrigger>
                      <TabsTrigger value="PENDING" className="text-xs px-2.5 h-7">
                        Pendientes ({pendingItemsCount})
                      </TabsTrigger>
                      <TabsTrigger value="COMPLETED" className="text-xs px-2.5 h-7">
                        Completos ({completedItemsCount})
                      </TabsTrigger>
                      {noStockItemsCount > 0 && (
                        <TabsTrigger
                          value="NO_STOCK"
                          className="text-xs px-2.5 h-7 text-rose-600 dark:text-rose-400"
                        >
                          Sin Stock ({noStockItemsCount})
                        </TabsTrigger>
                      )}
                    </TabsList>
                  </Tabs>

                  {/* Buscador de insumo */}
                  <div className="relative w-full sm:w-72">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Filtrar por nombre o código..."
                      value={searchTermInRows}
                      onChange={(e) => setSearchTermInRows(e.target.value)}
                      className="pl-8 h-8 text-xs bg-background"
                    />
                    {searchTermInRows && (
                      <button
                        type="button"
                        onClick={() => setSearchTermInRows("")}
                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                {displayedItems.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No hay insumos que coincidan con el filtro seleccionado.
                  </div>
                ) : viewMode === "table" ? (
                  /* ========================================================
                      MODO TABLA COMPACTA (ALTA DENSIDAD / SOLICITUDES GRANDES)
                     ======================================================== */
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                          <TableHead className="w-10 text-center font-semibold">#</TableHead>
                          <TableHead className="min-w-[220px] font-semibold">Insumo</TableHead>
                          <TableHead className="w-20 text-center font-semibold">Aprobado</TableHead>
                          <TableHead className="w-20 text-center font-semibold">Pendiente</TableHead>
                          <TableHead className="min-w-[280px] font-semibold">Lote</TableHead>
                          <TableHead className="w-48 text-center font-semibold">Cantidad</TableHead>
                          <TableHead className="w-28 text-center font-semibold">Estado</TableHead>
                          <TableHead className="w-12 text-center font-semibold">Dividir</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {displayedItems.map((item, index) => {
                          const itId = item.id ?? index;
                          const itemAllocations = allocations[itId] || [{ batchId: 0, quantity: "" }];
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

                          const productBatches = availableBatches.filter(
                            (b) =>
                              (b.productId ?? b.product?.id) === item.productId &&
                              b.currentQuantity > 0
                          );

                          const isComplete = allocatedSum === pendingQuantity && pendingQuantity > 0;
                          const isPartial = allocatedSum > 0 && allocatedSum < pendingQuantity;
                          const isOver = allocatedSum > pendingQuantity;

                          return (
                            <TableRow
                              key={itId}
                              className={cn(
                                "hover:bg-muted/20 transition-colors text-xs",
                                isOver
                                  ? "bg-rose-50/20 dark:bg-rose-950/20"
                                  : isComplete
                                  ? "bg-emerald-50/15 dark:bg-emerald-950/15"
                                  : isPartial
                                  ? "bg-amber-50/10 dark:bg-amber-950/10"
                                  : ""
                              )}
                            >
                              {/* Renglón # */}
                              <TableCell className="text-center font-mono font-bold text-muted-foreground py-2.5">
                                {index + 1}
                              </TableCell>

                              {/* Insumo */}
                              <TableCell className="py-2.5">
                                <div className="space-y-0.5">
                                  <span className="font-bold text-foreground block leading-tight">
                                    {item.product?.name || `Producto #${item.productId}`}
                                  </span>
                                  {item.product?.sku && (
                                    <span className="font-mono text-[10px] text-muted-foreground block">
                                      {item.product.sku}
                                    </span>
                                  )}
                                </div>
                              </TableCell>

                              {/* Aprobado */}
                              <TableCell className="text-center font-mono font-medium text-muted-foreground py-2.5">
                                {qtyApproved} {unit}
                              </TableCell>

                              {/* Pendiente */}
                              <TableCell className="text-center font-mono font-bold text-primary py-2.5">
                                {pendingQuantity} {unit}
                              </TableCell>

                              {/* Lote (Soporta múltiples filas por insumo) */}
                              <TableCell className="py-2.5">
                                {productBatches.length === 0 ? (
                                  <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5" />
                                    Sin stock
                                  </span>
                                ) : (
                                  <div className="space-y-1.5">
                                    {itemAllocations.map((allocRow, allocIdx) => (
                                      <select
                                        key={allocIdx}
                                        aria-label="Lote"
                                        value={allocRow.batchId}
                                        onChange={(e) =>
                                          handleAllocationFieldChange(
                                            itId,
                                            allocIdx,
                                            "batchId",
                                            Number(e.target.value)
                                          )
                                        }
                                        className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                                      >
                                        <option value={0}>-- Seleccione Lote --</option>
                                        {productBatches.map((b) => (
                                          <option key={b.id} value={b.id}>
                                            Lote {b.lotNumber} • Stock: {b.currentQuantity} {unit}
                                            {b.expirationDate
                                              ? ` • Vence: ${new Date(b.expirationDate).toLocaleDateString()}`
                                              : ""}
                                          </option>
                                        ))}
                                      </select>
                                    ))}
                                  </div>
                                )}
                              </TableCell>

                              {/* Cantidad con botón rápido [Máx] */}
                              <TableCell className="py-2.5">
                                {productBatches.length > 0 && (
                                  <div className="space-y-1.5">
                                    {itemAllocations.map((allocRow, allocIdx) => {
                                      const currentBatch = productBatches.find(
                                        (b) => b.id === allocRow.batchId
                                      );
                                      const maxStock = currentBatch?.currentQuantity ?? 0;

                                      return (
                                        <div
                                          key={allocIdx}
                                          className="flex items-center gap-1.5 justify-center"
                                        >
                                          <div className="relative flex-1">
                                            <Input
                                              type="number"
                                              min="0"
                                              max={maxStock || undefined}
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
                                              className="h-8 font-mono font-bold text-xs text-center pr-9"
                                            />
                                            <span className="absolute right-2 top-2 text-[10px] text-muted-foreground font-mono pointer-events-none">
                                              {unit}
                                            </span>
                                          </div>

                                          {/* Botón [Máx] para asignar saldo directo */}
                                          <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => handleFillMax(itId, allocIdx)}
                                            className="h-8 px-2 text-[10px] font-bold tracking-wider uppercase cursor-pointer"
                                            title="Asignar máximo disponible"
                                          >
                                            Máx
                                          </Button>

                                          {itemAllocations.length > 1 && (
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              onClick={() =>
                                                handleRemoveBatchRow(itId, allocIdx)
                                              }
                                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                              title="Eliminar lote"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </TableCell>

                              {/* Estado del Renglón */}
                              <TableCell className="text-center py-2.5">
                                {isComplete && (
                                  <Badge variant="success" className="gap-1 text-[11px] font-semibold">
                                    <Check className="w-3 h-3" />
                                    Completo
                                  </Badge>
                                )}
                                {isPartial && (
                                  <Badge variant="warning" className="gap-1 text-[11px] font-semibold">
                                    <Clock className="w-3 h-3" />
                                    {allocatedSum}/{pendingQuantity}
                                  </Badge>
                                )}
                                {isOver && (
                                  <Badge variant="destructive" className="gap-1 text-[11px] font-bold">
                                    <AlertTriangle className="w-3 h-3" />
                                    Excede
                                  </Badge>
                                )}
                                {allocatedSum === 0 && productBatches.length > 0 && (
                                  <Badge variant="outline" className="text-[11px] text-muted-foreground">
                                    0/{pendingQuantity}
                                  </Badge>
                                )}
                              </TableCell>

                              {/* Botón de división multi-lote */}
                              <TableCell className="text-center py-2.5">
                                {productBatches.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleAddBatchRow(itId)}
                                    className="h-7 w-7 text-primary hover:bg-primary/10 cursor-pointer"
                                    title="Dividir en otro lote"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  /* ========================================================
                      MODO TARJETAS (VISTA VISUAL ESPACIADA)
                     ======================================================== */
                  <div className="space-y-4">
                    {displayedItems.map((item, index) => {
                      const itId = item.id ?? index;
                      const itemAllocations = allocations[itId] || [{ batchId: 0, quantity: "" }];
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
                            "rounded-xl border p-4 transition-all shadow-2xs space-y-3 bg-card",
                            isOver
                              ? "border-rose-300 bg-rose-50/15 dark:border-rose-900/60"
                              : isComplete
                              ? "border-emerald-300/80 bg-emerald-50/10 dark:border-emerald-900/60"
                              : isPartial
                              ? "border-amber-300/80 bg-amber-50/10 dark:border-amber-900/60"
                              : "border-border/80"
                          )}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border/50">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-xs font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                                  #{index + 1}
                                </span>
                                <h3 className="font-bold text-sm text-foreground">
                                  {item.product?.name || `Producto #${item.productId}`}
                                </h3>
                                {item.product?.sku && (
                                  <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
                                    {item.product.sku}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs flex-wrap">
                                <span className="text-muted-foreground">
                                  Aprobado: <strong className="text-foreground">{qtyApproved} {unit}</strong>
                                </span>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-muted-foreground">
                                  Despachado: <strong className="text-foreground">{qtyDispatched} {unit}</strong>
                                </span>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-primary font-semibold">
                                  Pendiente: {pendingQuantity} {unit}
                                </span>
                              </div>
                            </div>

                            <div>
                              {isComplete && (
                                <Badge variant="success" className="gap-1 text-xs font-semibold">
                                  <Check className="w-3 h-3" />
                                  Completo ({allocatedSum}/{pendingQuantity})
                                </Badge>
                              )}
                              {isPartial && (
                                <Badge variant="warning" className="gap-1 text-xs font-semibold">
                                  <Clock className="w-3 h-3" />
                                  Parcial ({allocatedSum}/{pendingQuantity})
                                </Badge>
                              )}
                              {isOver && (
                                <Badge variant="destructive" className="gap-1 text-xs font-bold">
                                  <AlertTriangle className="w-3 h-3" />
                                  Excede ({allocatedSum}/{pendingQuantity})
                                </Badge>
                              )}
                              {allocatedSum === 0 && (
                                <Badge variant="outline" className="text-xs text-muted-foreground">
                                  Sin asignar (0/{pendingQuantity})
                                </Badge>
                              )}
                            </div>
                          </div>

                          {productBatches.length === 0 ? (
                            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                              <span>Sin stock en almacén para este insumo.</span>
                            </div>
                          ) : (
                            <div className="space-y-2 bg-muted/20 rounded-lg p-3 border border-border/60">
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
                                    <div className="col-span-12 sm:col-span-7">
                                      <Label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                                        Lote
                                      </Label>
                                      <select
                                        aria-label="Lote"
                                        value={allocRow.batchId}
                                        onChange={(e) =>
                                          handleAllocationFieldChange(
                                            itId,
                                            allocIdx,
                                            "batchId",
                                            Number(e.target.value)
                                          )
                                        }
                                        className="w-full h-8 rounded-md border border-input bg-background px-2.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                                      >
                                        <option value={0}>-- Seleccione un lote --</option>
                                        {productBatches.map((b) => (
                                          <option key={b.id} value={b.id}>
                                            Lote {b.lotNumber} • Stock: {b.currentQuantity} {unit}
                                            {b.expirationDate
                                              ? ` • Vence: ${new Date(b.expirationDate).toLocaleDateString()}`
                                              : ""}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div className="col-span-10 sm:col-span-4">
                                      <Label className="text-[11px] font-medium text-muted-foreground mb-1 flex items-center justify-between">
                                        <span>Cantidad</span>
                                        {currentBatch && (
                                          <span className="text-[10px] text-muted-foreground">
                                            (Máx. {maxBatchStock} {unit})
                                          </span>
                                        )}
                                      </Label>
                                      <div className="flex items-center gap-1.5">
                                        <div className="relative flex-1">
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
                                            className="h-8 font-mono font-bold text-xs text-center pr-9"
                                          />
                                          <span className="absolute right-2.5 top-2 text-[11px] text-muted-foreground font-mono pointer-events-none">
                                            {unit}
                                          </span>
                                        </div>
                                        <Button
                                          type="button"
                                          variant="secondary"
                                          size="sm"
                                          onClick={() => handleFillMax(itId, allocIdx)}
                                          className="h-8 px-2 text-[10px] font-bold tracking-wider uppercase cursor-pointer"
                                        >
                                          Máx
                                        </Button>
                                      </div>
                                    </div>

                                    <div className="col-span-2 sm:col-span-1 text-center pt-4">
                                      {itemAllocations.length > 1 && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon-sm"
                                          onClick={() => handleRemoveBatchRow(itId, allocIdx)}
                                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}

                              {productBatches.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAddBatchRow(itId)}
                                  className="h-7 text-xs text-primary gap-1 px-2 cursor-pointer mt-1"
                                >
                                  <Plus className="w-3 h-3" />
                                  <span>Dividir en otro lote</span>
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* MOTIVO Y NOTAS DE ENTREGA */}
          {selectedRequest && (
            <Card className="border-border shadow-2xs">
              <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Send className="w-4 h-4 text-primary" />
                  Motivo y Notas
                </CardTitle>
                <CardDescription className="text-xs">
                  Conceptos estandarizados de entrega y observaciones
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {DISPATCH_REASONS.map((reason) => {
                    const isSelected = dispatchNotes
                      .toLowerCase()
                      .includes(reason.title.toLowerCase());
                    return (
                      <button
                        key={reason.id}
                        type="button"
                        onClick={() => handleToggleReason(reason)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5",
                          isSelected ? reason.theme.selected : reason.theme.unselected
                        )}
                      >
                        <span className={cn("w-2 h-2 rounded-full", reason.theme.dot)} />
                        <span>{reason.word}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="dispatchNotes" className="text-xs font-medium text-muted-foreground">
                    Notas de entrega
                  </Label>
                  <Textarea
                    id="dispatchNotes"
                    rows={3}
                    placeholder="Observaciones de entrega, transporte o receptor..."
                    value={dispatchNotes}
                    onChange={(e) => setDispatchNotes(e.target.value)}
                    className="text-xs resize-none"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* BOTONES FINALES DE ACCIÓN */}
          {selectedRequest && (
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBackNavigation}
                disabled={submitting}
                className="h-9 px-4 text-xs cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={
                  submitting ||
                  totalUnitsToDispatch <= 0 ||
                  hasOverAllocation ||
                  !isWarehouseStaff
                }
                className="h-9 px-5 text-xs font-semibold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Procesando...</span>
                  </>
                ) : (
                  <>
                    <PackageCheck className="w-4 h-4" />
                    <span>Confirmar Despacho ({totalUnitsToDispatch} unid.)</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </form>
      )}

      {/* MODAL DESCARTAR CAMBIOS */}
      <Dialog open={confirmLeaveOpen} onOpenChange={setConfirmLeaveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">¿Descartar cambios?</DialogTitle>
            <DialogDescription className="text-xs">
              Tiene cantidades o notas asignadas que no han sido despachadas. Si sale ahora, se perderán los datos.
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
                router.push("/requests/dispatch");
              }}
            >
              Descartar y salir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CreateDispatchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </div>
      }
    >
      <CreateDispatchContent />
    </Suspense>
  );
}
