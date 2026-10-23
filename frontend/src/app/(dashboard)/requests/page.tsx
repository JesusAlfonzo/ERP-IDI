"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useTransition,
  useRef,
  Suspense,
  type FormEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RequestClientService } from "@/services/request.service";
import { InventoryClientService } from "@/services/inventory.service";
import { AuthService } from "@/services/auth.service";
import { toast } from "@/utils/toast";
import { RequestWindowAdminCard } from "@/components/requests/RequestWindowAdminCard";
import type {
  InternalRequest,
  RequestStatus,
  RequestWindowStatus,
  DispatchRequestItemPayload,
} from "@/types/requests";
import type { StockBatch } from "@/types/inventory";
import type { AuthUser } from "@/types/auth";
import {
  ClipboardList,
  Plus,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Trash2,
  Loader2,
  Check,
  Ban,
  AlertTriangle,
  XCircle,
  Eye,
  CheckCheck,
  Search,
  Clock,
  ShieldAlert,
  Layers,
  Sliders,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const STATUS_CONFIG: Record<
  RequestStatus,
  { label: string; variant: "warning" | "info" | "purple" | "success" | "destructive" }
> = {
  PENDIENTE: {
    label: "Pendiente",
    variant: "warning",
  },
  APROBADA: {
    label: "Aprobada (Standby)",
    variant: "info",
  },
  DESPACHADA_PARCIAL: {
    label: "Despacho parcial",
    variant: "purple",
  },
  COMPLETADA: {
    label: "Completada",
    variant: "success",
  },
  RECHAZADA: {
    label: "Rechazada",
    variant: "destructive",
  },
};

interface DispatchAllocationRow {
  batchId: number;
  quantity: number | "";
}

function RequestsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatchQueryId = searchParams.get("dispatch");

  const [currentUser] = useState<AuthUser | null>(() =>
    AuthService.getCurrentUser()
  );
  const [requests, setRequests] = useState<InternalRequest[]>([]);
  const [windowStatus, setWindowStatus] = useState<RequestWindowStatus | null>(
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
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [, startTransition] = useTransition();

  // Permisos basados en Roles (RBAC estricto)
  const userRoles = currentUser?.roles || [];
  const isWarehouseStaff =
    userRoles.includes("ADMINISTRADOR") || userRoles.includes("ALMACENISTA");
  const canCreateRole =
    userRoles.includes("SOLICITANTE") ||
    userRoles.includes("ADMINISTRADOR") ||
    userRoles.includes("ALMACENISTA") ||
    userRoles.includes("LABORATORIO") ||
    userRoles.includes("COMPRAS");

  // Validación de ventana y cupo para creación
  const canCreate =
    canCreateRole && (isWarehouseStaff || (windowStatus?.canCreate ?? false));

  // Modal Despacho Multi-Lote (Solo Almacén)
  const [selectedForDispatch, setSelectedForDispatch] =
    useState<InternalRequest | null>(null);
  const [dispatchItemAllocations, setDispatchItemAllocations] = useState<
    Record<number, DispatchAllocationRow[]>
  >({});
  const [dispatchNotes, setDispatchNotes] = useState("");
  const [dispatching, setDispatching] = useState(false);
  const [dispatchFeedback, setDispatchFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  // Panel de administración de ventana para Administradores
  const [showAdminConfig, setShowAdminConfig] = useState(false);

  // Referencias para evitar re-renders y bucles infinitos
  const batchesRef = useRef(availableBatches);
  const openedDispatchIdRef = useRef<string | null>(null);

  useEffect(() => {
    batchesRef.current = availableBatches;
  }, [availableBatches]);

  // Modal Rechazo (Solo Almacén)
  const [requestToReject, setRequestToReject] =
    useState<InternalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Acción rápida Aprobar
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const [feedback, setFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  const handleCloseDispatchModal = useCallback(() => {
    setSelectedForDispatch(null);
    setDispatchFeedback(null);
    openedDispatchIdRef.current = null;
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("dispatch")) {
        url.searchParams.delete("dispatch");
        window.history.replaceState(
          {},
          "",
          url.pathname + (url.search ? url.search : "")
        );
      }
    }
  }, []);

  const openDispatchModal = useCallback(
    (req: InternalRequest, batchesList?: typeof availableBatches) => {
      if (!isWarehouseStaff) return;
      setSelectedForDispatch(req);
      const batches = batchesList ?? batchesRef.current;
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

          const candidateBatches = batches.filter(
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

      setDispatchItemAllocations(initialMap);
      setDispatchNotes("");
      setDispatchFeedback(null);
    },
    [isWarehouseStaff]
  );

  // Función reutilizable para recargar datos manualmente tras una acción
  const refreshData = async () => {
    setLoading(true);
    try {
      const [reqs, batches, wStatus] = await Promise.all([
        RequestClientService.getRequests(statusFilter || undefined).catch(
          () => []
        ),
        isWarehouseStaff
          ? InventoryClientService.getActiveBatches().catch(() => [])
          : Promise.resolve([]),
        RequestClientService.getWindowStatus().catch(() => null),
      ]);
      setRequests(reqs);
      setAvailableBatches(batches);
      setWindowStatus(wStatus);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!AuthService.isAuthenticated()) {
      router.replace("/login");
      return;
    }

    let isMounted = true;

    startTransition(() => {
      void (async () => {
        try {
          const [reqs, batches, wStatus] = await Promise.all([
            RequestClientService.getRequests(statusFilter || undefined).catch(
              () => []
            ),
            isWarehouseStaff
              ? InventoryClientService.getActiveBatches().catch(() => [])
              : Promise.resolve([]),
            RequestClientService.getWindowStatus().catch(() => null),
          ]);
          if (isMounted) {
            setRequests(reqs);
            setAvailableBatches(batches);
            setWindowStatus(wStatus);
            setLoading(false);

            // Si vino query param de despacho y es personal de almacén, abrir modal
            if (
              dispatchQueryId &&
              isWarehouseStaff &&
              openedDispatchIdRef.current !== dispatchQueryId
            ) {
              const target = reqs.find((r) => String(r.id) === dispatchQueryId);
              if (
                target &&
                (target.status === "APROBADA" ||
                  target.status === "DESPACHADA_PARCIAL")
              ) {
                openedDispatchIdRef.current = dispatchQueryId;
                openDispatchModal(target, batches);
              }
            }
          }
        } catch {
          if (isMounted) {
            setLoading(false);
          }
        }
      })();
    });

    return () => {
      isMounted = false;
    };
  }, [router, statusFilter, isWarehouseStaff, dispatchQueryId, openDispatchModal]);

  // Filtrado reactivo en cliente (Búsqueda libre + Filtro de Estado)
  const filteredRequests = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return requests.filter((req) => {
      if (statusFilter && req.status !== statusFilter) {
        return false;
      }
      if (!term) return true;

      const reqNum = req.requestNumber?.toLowerCase() || "";
      const dept = req.departmentSection?.toLowerCase() || "";
      const applicant = (
        req.applicant?.fullName ||
        req.applicant?.username ||
        ""
      ).toLowerCase();
      const itemsMatch = req.items?.some(
        (it) =>
          it.product?.name?.toLowerCase().includes(term) ||
          it.product?.sku?.toLowerCase().includes(term)
      );
      const justification = req.justification?.toLowerCase() || "";

      return (
        reqNum.includes(term) ||
        dept.includes(term) ||
        applicant.includes(term) ||
        itemsMatch ||
        justification.includes(term)
      );
    });
  }, [requests, statusFilter, searchTerm]);

  const handleApprove = async (req: InternalRequest) => {
    if (!isWarehouseStaff) return;
    setApprovingId(req.id);
    setFeedback(null);
    try {
      const itemsPayload = (req.items || [])
        .filter((it) => it && (it.id !== undefined && it.id !== null))
        .map((it) => ({
          itemId: Number(it.id),
          quantityApproved: Number(
            it.quantityRequested ?? it.requestedQuantity ?? 1,
          ),
        }));

      if (itemsPayload.length === 0) {
        throw new Error("La solicitud no contiene renglones válidos para ser aprobados.");
      }

      await RequestClientService.approveRequest(req.id, itemsPayload);
      const successMsg = `Solicitud #${req.requestNumber} aprobada exitosamente y puesta en espera para retiro.`;
      setFeedback({
        status: "success",
        message: successMsg,
      });
      toast.success(successMsg);
      await refreshData();
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Error al aprobar la requisición.";
      setFeedback({
        status: "error",
        message: errorMsg,
      });
      toast.error(errorMsg);
    } finally {
      setApprovingId(null);
    }
  };

  const handleAddBatchRow = (itemId: number) => {
    setDispatchItemAllocations((prev) => {
      const current = prev[itemId] || [];
      return {
        ...prev,
        [itemId]: [...current, { batchId: 0, quantity: "" }],
      };
    });
  };

  const handleRemoveBatchRow = (itemId: number, index: number) => {
    setDispatchItemAllocations((prev) => {
      const current = prev[itemId] || [];
      return {
        ...prev,
        [itemId]: current.filter((_, i) => i !== index),
      };
    });
  };

  const handleAllocationFieldChange = (
    itemId: number,
    index: number,
    field: "batchId" | "quantity",
    value: number | ""
  ) => {
    setDispatchItemAllocations((prev) => {
      const current = prev[itemId] || [];
      const updated = [...current];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return {
        ...prev,
        [itemId]: updated,
      };
    });
  };

  const handleConfirmDispatch = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedForDispatch) return;

    setDispatchFeedback(null);
    const allocationsPayload: DispatchRequestItemPayload[] = [];

    for (const item of selectedForDispatch.items) {
      const itId = item.id;
      if (!itId) continue;
      const rows = dispatchItemAllocations[itId] || [];

      const qtyApproved = Number(
        item.quantityApproved && item.quantityApproved > 0
          ? item.quantityApproved
          : item.quantityRequested ?? item.requestedQuantity ?? 0
      );
      const qtyDispatched = Number(
        item.quantityDispatched ?? item.dispatchedQuantity ?? 0
      );
      const pendingQuantity = Math.max(0, qtyApproved - qtyDispatched);

      let itemTotalAllocated = 0;
      const batchEntries: { batchId: number; quantity: number }[] = [];

      for (const row of rows) {
        const qtyNum = Number(row.quantity) || 0;
        if (qtyNum > 0) {
          if (!row.batchId || row.batchId === 0) {
            setDispatchFeedback({
              status: "error",
              message: `Debe seleccionar un lote válido para "${item.product?.name}".`,
            });
            return;
          }
          itemTotalAllocated += qtyNum;
          batchEntries.push({ batchId: row.batchId, quantity: qtyNum });
        }
      }

      if (itemTotalAllocated > pendingQuantity) {
        setDispatchFeedback({
          status: "error",
          message: `La cantidad a despachar para "${item.product?.name}" (${itemTotalAllocated}) excede el saldo pendiente (${pendingQuantity}).`,
        });
        return;
      }

      if (batchEntries.length > 0) {
        allocationsPayload.push({
          itemId: itId,
          allocations: batchEntries,
        });
      }
    }

    if (allocationsPayload.length === 0) {
      setDispatchFeedback({
        status: "error",
        message:
          "Debe asignar cantidad mayor a cero en al menos un renglón para efectuar un despacho.",
      });
      return;
    }

    setDispatching(true);
    try {
      await RequestClientService.dispatchRequest({
        requestId: selectedForDispatch.id,
        items: allocationsPayload,
        dispatchNotes: dispatchNotes.trim() || undefined,
      });

      const successMsg = "Insumos despachados y rebajados del inventario correctamente.";
      setFeedback({
        status: "success",
        message: successMsg,
      });
      toast.success(successMsg);
      handleCloseDispatchModal();
      await refreshData();
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Error al despachar los insumos.";
      setDispatchFeedback({
        status: "error",
        message: errorMsg,
      });
      toast.error(errorMsg);
    } finally {
      setDispatching(false);
    }
  };

  const handleReject = async () => {
    if (
      !requestToReject ||
      !isWarehouseStaff ||
      rejectReason.trim().length < 5
    ) {
      const valMsg = "El motivo de rechazo debe tener al menos 5 caracteres.";
      setFeedback({
        status: "error",
        message: valMsg,
      });
      toast.error(valMsg);
      return;
    }
    setRejecting(true);
    try {
      await RequestClientService.rejectRequest(
        requestToReject.id,
        rejectReason.trim()
      );
      const successMsg = `Solicitud #${requestToReject.requestNumber} rechazada.`;
      setFeedback({
        status: "success",
        message: successMsg,
      });
      toast.success(successMsg);
      setRequestToReject(null);
      setRejectReason("");
      await refreshData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error al rechazar";
      setFeedback({
        status: "error",
        message: errorMsg,
      });
      toast.error(errorMsg);
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            Solicitudes Internas
          </h1>
          <p className="text-xs text-muted-foreground">
            {isWarehouseStaff
              ? "Gestión, aprobación y despacho de requisiciones institucionales"
              : "Mis requisiciones de material e insumos de laboratorio"}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {currentUser?.roles.includes("ADMINISTRADOR") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdminConfig((prev) => !prev)}
              className="gap-1.5"
              title="Configurar ventana operativa semanal (Solo Administrador)"
            >
              <Sliders className="w-4 h-4 text-primary" />
              {showAdminConfig ? "Ocultar Config. Ventana" : "Configurar Ventana"}
            </Button>
          )}

          {canCreateRole && (
            <Button
              disabled={!canCreate}
              onClick={() => router.push("/requests/new")}
              title={
                !canCreate
                  ? windowStatus?.message || "Ventana cerrada o cupo agotado"
                  : "Crear una nueva requisición"
              }
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Nueva Solicitud
            </Button>
          )}
        </div>
      </div>

      {/* Panel Administrador: Configuración de la Ventana Operativa */}
      {showAdminConfig && currentUser?.roles.includes("ADMINISTRADOR") && (
        <RequestWindowAdminCard onConfigUpdated={refreshData} />
      )}

      {/* Banner Informativo de Ventana Operativa Semanal */}
      {windowStatus && (
        <Alert
          variant={
            windowStatus.isSuspended
              ? "destructive"
              : windowStatus.isOpen
                ? "success"
                : "warning"
          }
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
        >
          <div className="flex items-center gap-2.5">
            {windowStatus.isSuspended ? (
              <ShieldAlert className="w-5 h-5 shrink-0" />
            ) : windowStatus.isOpen ? (
              <Clock className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <div>
              <span className="font-bold">
                {windowStatus.isSuspended
                  ? "Ventana Suspendida: "
                  : windowStatus.isOpen
                    ? "Ventana Operativa Abierta: "
                    : "Ventana Operativa Cerrada: "}
              </span>
              <span>{windowStatus.message}</span>
              {!isWarehouseStaff && (
                <div className="mt-0.5 text-[11px] opacity-85">
                  Política institucional: 1 solicitud por semana por usuario
                  (Lunes 05:00 AM - Miércoles 04:00 PM).{" "}
                  {windowStatus.hasQuota ? (
                    <strong className="font-semibold text-emerald-700">
                      Dispones de 1 cupo activo esta semana.
                    </strong>
                  ) : (
                    <strong className="font-semibold text-destructive">
                      Ya consumiste tu cupo semanal correspondiente al ciclo{" "}
                      {windowStatus.currentCycle}.
                    </strong>
                  )}
                </div>
              )}
            </div>
          </div>

          {isWarehouseStaff && (
            <Badge variant="outline" className="shrink-0 text-[10px] font-bold">
              Modo Almacén (Acceso 24/7)
            </Badge>
          )}
        </Alert>
      )}

      {feedback && (
        <Alert variant={feedback.status === "success" ? "success" : "destructive"}>
          {feedback.status === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <AlertTitle>{feedback.status === "success" ? "Operación Exitosa" : "Atención"}</AlertTitle>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}

      {/* Barra de Filtros y Búsqueda Avanzada */}
      <Card className="p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Input de Búsqueda Libre en Tiempo Real */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por N° solicitud, área, solicitante o insumo..."
                className="pl-9 pr-8 text-xs"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-1 top-1 text-muted-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>

            {/* Selector de Estado */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 bg-background border border-input rounded-lg px-3 py-1 text-xs text-foreground focus:ring-2 focus:ring-ring focus:outline-none cursor-pointer"
              >
                <option value="">Todos los estados</option>
                <option value="PENDIENTE">Pendientes</option>
                <option value="APROBADA">Aprobadas</option>
                <option value="DESPACHADA_PARCIAL">Despacho parcial</option>
                <option value="COMPLETADA">Completadas</option>
                <option value="RECHAZADA">Rechazadas</option>
              </select>
            </div>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => void refreshData()}
            title="Actualizar listado"
            className="self-end sm:self-auto"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </Card>

      {/* Tabla de Requisiciones */}
      <Card className="overflow-hidden shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="py-3 px-4 font-semibold">N° Solicitud</TableHead>
              <TableHead className="py-3 px-4 font-semibold">Área / Sección</TableHead>
              <TableHead className="py-3 px-4 font-semibold">Solicitante</TableHead>
              <TableHead className="py-3 px-4 font-semibold">Fecha</TableHead>
              <TableHead className="py-3 px-4 text-center font-semibold">Renglones</TableHead>
              <TableHead className="py-3 px-4 text-center font-semibold">Estado</TableHead>
              <TableHead className="py-3 px-4 text-center font-semibold">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                  Cargando requisiciones...
                </TableCell>
              </TableRow>
            ) : filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  No se encontraron solicitudes con los filtros aplicados.
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((req) => {
                const status = STATUS_CONFIG[req.status] || {
                  label: req.status,
                  variant: "default" as const,
                };

                // REGLA ESTRICTA: Despachar SOLO si APROBADA o DESPACHADA_PARCIAL
                const canDispatch =
                  req.status === "APROBADA" ||
                  req.status === "DESPACHADA_PARCIAL";

                return (
                  <TableRow
                    key={req.id}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    <TableCell className="py-3 px-4 font-mono font-bold text-foreground">
                      {req.requestNumber}
                    </TableCell>
                    <TableCell className="py-3 px-4 font-semibold text-foreground">
                      {req.departmentSection}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-muted-foreground">
                      {req.applicant?.fullName || req.applicant?.username}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-muted-foreground whitespace-nowrap font-mono">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center font-bold text-foreground">
                      {req.items?.length || 0}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center">
                      <Badge variant={status.variant}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Botón Ver Comprobante */}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => router.push(`/requests/${req.id}`)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Ver detalle del comprobante"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>

                        {/* ACCIONES EXCLUSIVAS DE ALMACÉN / ADMINISTRACIÓN */}
                        {isWarehouseStaff && (
                          <>
                            {req.status === "PENDIENTE" && (
                              <>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => void handleApprove(req)}
                                  disabled={approvingId === req.id}
                                  className="h-7 text-[11px] gap-1 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200"
                                  title="Aprobar solicitud"
                                >
                                  {approvingId === req.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <CheckCheck className="w-3.5 h-3.5" />
                                  )}
                                  Aprobar
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => {
                                    setRequestToReject(req);
                                    setRejectReason("");
                                    setFeedback(null);
                                  }}
                                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                  title="Rechazar solicitud"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}

                            {canDispatch && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => openDispatchModal(req)}
                                className="h-7 text-[11px] gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-semibold"
                                title="Despachar materiales"
                              >
                                <Check className="w-3.5 h-3.5" /> Despachar
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modal: Despacho Multi-Lote y Despacho Parcial (Solo Almacén) */}
      <Dialog
        open={!!selectedForDispatch && isWarehouseStaff}
        onOpenChange={(open) => {
          if (!open) handleCloseDispatchModal();
        }}
      >
        <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-5 border-b border-border bg-muted/30">
            <div>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                Despachar Requisición #{selectedForDispatch?.requestNumber}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Área: <strong className="text-foreground">{selectedForDispatch?.departmentSection}</strong> • Solicitado por:{" "}
                <strong className="text-foreground">
                  {selectedForDispatch?.applicant?.fullName ||
                    selectedForDispatch?.applicant?.username}
                </strong>
              </p>
            </div>
          </DialogHeader>

          <form onSubmit={handleConfirmDispatch} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-5 overflow-y-auto space-y-4 flex-1 scroll-smooth pr-3">
              {dispatchFeedback && (
                <Alert variant={dispatchFeedback.status === "success" ? "success" : "destructive"}>
                  {dispatchFeedback.status === "success" ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <AlertTitle>{dispatchFeedback.status === "success" ? "Éxito" : "Atención"}</AlertTitle>
                  <AlertDescription>{dispatchFeedback.message}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                {selectedForDispatch?.items.map((item) => {
                  const itId = item.id;
                  if (!itId) return null;
                  const unit =
                    item.product?.unitOfMeasure ||
                    item.product?.baseUnit?.abbreviation ||
                    "UND";

                  const qtyRequested = Number(
                    item.quantityRequested ?? item.requestedQuantity ?? 0
                  );
                  const qtyApproved = Number(
                    item.quantityApproved && item.quantityApproved > 0
                      ? item.quantityApproved
                      : qtyRequested
                  );
                  const qtyDispatched = Number(
                    item.quantityDispatched ?? item.dispatchedQuantity ?? 0
                  );
                  const pendingQuantity = Math.max(0, qtyApproved - qtyDispatched);

                  const candidateBatches = availableBatches.filter(
                    (b) => (b.productId ?? b.product?.id) === item.productId
                  );

                  const rows = dispatchItemAllocations[itId] || [];
                  const allocatedSum = rows.reduce(
                    (acc, r) => acc + (Number(r.quantity) || 0),
                    0
                  );

                  return (
                    <Card
                      key={itId}
                      className="p-4 bg-muted/20 border-border space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-2.5">
                        <div>
                          <span className="font-bold text-foreground text-sm">
                            {item.product?.name}
                          </span>
                          <span className="ml-2 font-mono text-xs text-muted-foreground">
                            [{item.product?.sku}]
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <Badge variant="outline">
                            Solicitado: {qtyRequested} {unit}
                          </Badge>
                          <Badge variant="info">
                            Aprobado: {qtyApproved} {unit}
                          </Badge>
                          <Badge variant="purple">
                            Ya despachado: {qtyDispatched} {unit}
                          </Badge>
                          <Badge variant="warning">
                            Remanente: {pendingQuantity} {unit}
                          </Badge>
                        </div>
                      </div>

                      {/* Filas de lotes asignados */}
                      <div className="space-y-2.5">
                        {rows.map((row, allocIdx) => {
                          const currentBatch = candidateBatches.find(
                            (b) => b.id === row.batchId
                          );
                          const maxStock = currentBatch
                            ? currentBatch.currentQuantity
                            : 0;

                          return (
                            <div
                              key={allocIdx}
                              className="grid grid-cols-12 gap-3 items-center bg-background p-3 rounded-lg border border-border shadow-2xs"
                            >
                              <div className="col-span-12 sm:col-span-7">
                                <Label className="text-[11px] mb-1 block">
                                  Lote de Origen
                                </Label>
                                <select
                                  value={row.batchId}
                                  onChange={(e) => {
                                    const bId = Number(e.target.value);
                                    handleAllocationFieldChange(
                                      itId,
                                      allocIdx,
                                      "batchId",
                                      bId
                                    );
                                    const match = candidateBatches.find(
                                      (b) => b.id === bId
                                    );
                                    if (
                                      match &&
                                      (row.quantity === "" ||
                                        row.quantity === 0)
                                    ) {
                                      handleAllocationFieldChange(
                                        itId,
                                        allocIdx,
                                        "quantity",
                                        Math.min(
                                          pendingQuantity,
                                          match.currentQuantity
                                        )
                                      );
                                    }
                                  }}
                                  className="w-full h-8 bg-background border border-input rounded-md px-2.5 text-xs text-foreground focus:ring-2 focus:ring-ring focus:outline-none cursor-pointer"
                                >
                                  <option value="0">
                                    -- Seleccione lote disponible ({candidateBatches.length} disp.) --
                                  </option>
                                  {candidateBatches.map((b) => (
                                    <option key={b.id} value={b.id}>
                                      Lote #{b.lotNumber} | Stock Disp:{" "}
                                      {b.currentQuantity} {unit}
                                      {b.expirationDate
                                        ? ` (Vence: ${new Date(
                                            b.expirationDate
                                          ).toLocaleDateString()})`
                                        : ""}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="col-span-10 sm:col-span-4">
                                <Label className="text-[11px] mb-1 block">
                                  Cantidad a entregar{" "}
                                  {currentBatch && (
                                    <span className="text-muted-foreground font-normal">
                                      (máx: {maxStock})
                                    </span>
                                  )}
                                </Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max={maxStock || undefined}
                                  placeholder="0"
                                  value={row.quantity}
                                  onChange={(e) =>
                                    handleAllocationFieldChange(
                                      itId,
                                      allocIdx,
                                      "quantity",
                                      e.target.value === ""
                                        ? ""
                                        : Math.max(
                                            0,
                                            Number(e.target.value)
                                          )
                                    )
                                  }
                                  className="h-8 font-mono font-bold text-xs"
                                />
                              </div>

                              <div className="col-span-2 sm:col-span-1 text-center pt-5">
                                {rows.length > 1 && (
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
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-1 border-t border-border">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddBatchRow(itId)}
                          className="text-primary hover:text-primary font-semibold text-xs h-7 px-2 gap-1.5 self-start"
                        >
                          <Plus className="w-3.5 h-3.5" /> + Agregar otro lote
                        </Button>

                        <div className="text-xs">
                          <span className="text-muted-foreground">
                            Total asignado en esta entrega:
                          </span>{" "}
                          <strong
                            className={
                              allocatedSum > pendingQuantity
                                ? "text-destructive font-mono font-bold"
                                : "text-foreground font-mono font-bold"
                            }
                          >
                            <span>{allocatedSum}</span> / <span>{pendingQuantity}</span>{" "}
                            <span className="text-muted-foreground font-normal text-[11px]">
                              {unit}
                            </span>
                          </strong>
                          {allocatedSum > pendingQuantity && (
                            <span className="text-destructive ml-1.5 font-semibold text-[11px]">
                              (Excede saldo pendiente)
                            </span>
                          )}
                          {allocatedSum === 0 && (
                            <span className="text-amber-600 ml-1.5 text-[11px] font-medium">
                              (Se mantendrá pendiente en Standby)
                            </span>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider">
                  Notas de Despacho (Opcional)
                </Label>
                <Input
                  type="text"
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="N° de acta de entrega o nombre de quien recibe..."
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="p-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[11px] text-muted-foreground">
                Puede realizar despachos parciales. Si cancela o cierra, la
                solicitud permanece aprobada en espera (Standby).
              </p>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCloseDispatchModal}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="success"
                  disabled={dispatching}
                  className="gap-2"
                >
                  {dispatching && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {dispatching ? "Despachando..." : "Confirmar y Despachar"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Rechazo (Solo Almacén) con shadcn Dialog */}
      <Dialog
        open={!!requestToReject && isWarehouseStaff}
        onOpenChange={(open) => {
          if (!open) setRequestToReject(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Rechazar requisición #{requestToReject?.requestNumber}
            </DialogTitle>
          </DialogHeader>

          <Alert variant="destructive">
            <XCircle className="w-4 h-4" />
            <AlertDescription>
              Indique el motivo de rechazo técnico o administrativo.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Indique el motivo técnico o administrativo..."
              className="text-xs"
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRequestToReject(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => void handleReject()}
              disabled={rejecting || rejectReason.trim().length < 5}
              className="gap-2"
            >
              {rejecting && <Loader2 className="w-4 h-4 animate-spin" />}
              {rejecting ? "Rechazando..." : "Confirmar Rechazo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function InternalRequestsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[70vh] flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
          <span className="text-xs text-muted-foreground font-medium">
            Cargando módulo de solicitudes...
          </span>
        </div>
      }
    >
      <RequestsContent />
    </Suspense>
  );
}
