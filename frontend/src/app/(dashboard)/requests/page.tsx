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
import { ProductCombobox } from "@/components/requests/ProductCombobox";
import { RequestWindowAdminCard } from "@/components/requests/RequestWindowAdminCard";
import type {
  InternalRequest,
  RequestStatus,
  RequestWindowStatus,
  DispatchRequestItemPayload,
} from "@/types/requests";
import type { Product, StockBatch, Category } from "@/types/inventory";
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

const STATUS_CONFIG: Record<
  RequestStatus,
  { label: string; className: string }
> = {
  PENDIENTE: {
    label: "Pendiente",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  APROBADA: {
    label: "Aprobada (En espera / Standby)",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  DESPACHADA_PARCIAL: {
    label: "Despacho parcial",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  COMPLETADA: {
    label: "Completada",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  RECHAZADA: {
    label: "Rechazada",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

const SECTIONS = [
  "Inmunogenética",
  "Inmunología Celular",
  "Inmunopatología",
  "Alergia e Inmunología Clínica",
  "Laboratorio General",
  "Investigación",
];

interface FormItem {
  productId: number;
  requestedQuantity: number;
}

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
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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
    userRoles.includes("ANALISTA_LABORATORIO") ||
    userRoles.includes("COMPRAS");

  // Validación de ventana y cupo para creación
  const canCreate =
    canCreateRole && (isWarehouseStaff || (windowStatus?.canCreate ?? false));

  // Modal Nueva Solicitud
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [departmentSection, setDepartmentSection] = useState(SECTIONS[0]);
  const [justification, setJustification] = useState("");
  const [formItems, setFormItems] = useState<FormItem[]>([
    { productId: 0, requestedQuantity: 1 },
  ]);
  const [submitting, setSubmitting] = useState(false);

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
      const [reqs, prods, batches, cats, wStatus] = await Promise.all([
        RequestClientService.getRequests(statusFilter || undefined).catch(
          () => []
        ),
        InventoryClientService.getProducts().catch(() => []),
        isWarehouseStaff
          ? InventoryClientService.getActiveBatches().catch(() => [])
          : Promise.resolve([]),
        InventoryClientService.getCategories().catch(() => []),
        RequestClientService.getWindowStatus().catch(() => null),
      ]);
      setRequests(reqs);
      setProducts(prods);
      setAvailableBatches(batches);
      setCategories(cats);
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
          const [reqs, prods, batches, cats, wStatus] = await Promise.all([
            RequestClientService.getRequests(statusFilter || undefined).catch(
              () => []
            ),
            InventoryClientService.getProducts().catch(() => []),
            isWarehouseStaff
              ? InventoryClientService.getActiveBatches().catch(() => [])
              : Promise.resolve([]),
            InventoryClientService.getCategories().catch(() => []),
            RequestClientService.getWindowStatus().catch(() => null),
          ]);
          if (isMounted) {
            setRequests(reqs);
            setProducts(prods);
            setAvailableBatches(batches);
            setCategories(cats);
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

  const handleAddItem = () => {
    setFormItems((prev) => [...prev, { productId: 0, requestedQuantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (formItems.length === 1) return;
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index: number, productId: number) => {
    setFormItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], productId };
      return updated;
    });
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    setFormItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], requestedQuantity: quantity };
      return updated;
    });
  };

  const handleSubmitRequest = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const hasInvalid = formItems.some(
      (it) => !it.productId || it.requestedQuantity <= 0
    );
    if (hasInvalid || !justification.trim()) {
      setFeedback({
        status: "error",
        message: "Complete todos los insumos y justificación técnica.",
      });
      return;
    }

    setSubmitting(true);
    try {
      await RequestClientService.createRequest({
        departmentSection,
        justification: justification.trim(),
        items: formItems,
      });

      setFeedback({
        status: "success",
        message: "Solicitud enviada a almacén exitosamente.",
      });
      setIsNewModalOpen(false);
      setJustification("");
      setFormItems([{ productId: 0, requestedQuantity: 1 }]);
      await refreshData();
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Error al registrar la solicitud.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (req: InternalRequest) => {
    if (!isWarehouseStaff) return;
    setApprovingId(req.id);
    setFeedback(null);
    try {
      const itemsToApprove = req.items.map((it) => {
        const qty = Number(
          it.quantityRequested ?? it.requestedQuantity ?? 1
        );

        return {
          itemId: Number(it.id),
          quantityApproved: qty,
        };
      });

      await RequestClientService.approveRequest(req.id, itemsToApprove);
      setFeedback({
        status: "success",
        message: `Solicitud #${req.requestNumber} aprobada con éxito. Lista para despacho.`,
      });
      await refreshData();
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message:
          err instanceof Error ? err.message : "Error al aprobar la solicitud.",
      });
    } finally {
      setApprovingId(null);
    }
  };

  const handleAddBatchRow = (itemId: number) => {
    setDispatchItemAllocations((prev) => {
      const current = prev[itemId] || [];
      return {
        ...prev,
        [itemId]: [
          ...current.map((r) => ({ ...r })),
          { batchId: 0, quantity: "" },
        ],
      };
    });
  };

  const handleRemoveBatchRow = (itemId: number, index: number) => {
    setDispatchItemAllocations((prev) => {
      const current = prev[itemId] || [];
      if (current.length <= 1) return prev;
      return {
        ...prev,
        [itemId]: current
          .filter((_, i) => i !== index)
          .map((r) => ({ ...r })),
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
      const updated = current.map((row, i) => {
        if (i === index) {
          return { ...row, [field]: value };
        }
        return { ...row };
      });
      return {
        ...prev,
        [itemId]: updated,
      };
    });
  };

  const handleConfirmDispatch = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedForDispatch || !isWarehouseStaff) return;
    setDispatchFeedback(null);

    const allocationsPayload: DispatchRequestItemPayload[] = [];

    for (const [itemIdStr, allocs] of Object.entries(dispatchItemAllocations)) {
      const itemId = Number(itemIdStr);
      const validAllocs = allocs
        .filter((a) => a.batchId > 0 && Number(a.quantity) > 0)
        .map((a) => ({ batchId: Number(a.batchId), quantity: Number(a.quantity) }));

      if (validAllocs.length > 0) {
        allocationsPayload.push({
          itemId,
          allocations: validAllocs,
        });
      }
    }

    if (allocationsPayload.length === 0) {
      setDispatchFeedback({
        status: "error",
        message:
          "Indique al menos una cantidad mayor a 0 para despachar, o cierre el modal para mantener la solicitud en espera.",
      });
      return;
    }

    // Validar que ninguna asignación supere el saldo pendiente del renglón
    for (const itemAlloc of allocationsPayload) {
      const it = selectedForDispatch.items.find((i) => i.id === itemAlloc.itemId);
      if (!it) continue;
      const qtyApproved = Number(
        it.quantityApproved && it.quantityApproved > 0
          ? it.quantityApproved
          : it.quantityRequested ?? it.requestedQuantity ?? 0
      );
      const qtyDispatched = Number(
        it.quantityDispatched ?? it.dispatchedQuantity ?? 0
      );
      const pendingQuantity = Math.max(0, qtyApproved - qtyDispatched);
      const sessionAllocSum = (itemAlloc.allocations || []).reduce(
        (sum, a) => sum + a.quantity,
        0
      );
      if (sessionAllocSum > pendingQuantity) {
        setDispatchFeedback({
          status: "error",
          message: `La cantidad asignada (${sessionAllocSum}) excede el saldo pendiente (${pendingQuantity}) para el producto ${it.product?.name || ""}.`,
        });
        return;
      }
    }

    setDispatching(true);
    try {
      await RequestClientService.dispatchRequest({
        requestId: selectedForDispatch.id,
        items: allocationsPayload,
        dispatchNotes: dispatchNotes.trim() || undefined,
      });

      setFeedback({
        status: "success",
        message: "Insumos despachados y rebajados del inventario correctamente.",
      });
      handleCloseDispatchModal();
      await refreshData();
    } catch (err: unknown) {
      setDispatchFeedback({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Error al despachar los insumos.",
      });
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
      setFeedback({
        status: "error",
        message: "El motivo de rechazo debe tener al menos 5 caracteres.",
      });
      return;
    }
    setRejecting(true);
    try {
      await RequestClientService.rejectRequest(
        requestToReject.id,
        rejectReason.trim()
      );
      setFeedback({
        status: "success",
        message: `Solicitud #${requestToReject.requestNumber} rechazada.`,
      });
      setRequestToReject(null);
      setRejectReason("");
      await refreshData();
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message: err instanceof Error ? err.message : "Error al rechazar",
      });
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-600" />
            Solicitudes Internas de Material y Reactivos
          </h1>
          <p className="text-xs text-slate-500">
            {isWarehouseStaff
              ? "Gestión, aprobación y despacho de requisiciones institucionales"
              : "Mis requisiciones de material e insumos de laboratorio"}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {currentUser?.roles.includes("ADMINISTRADOR") && (
            <button
              type="button"
              onClick={() => setShowAdminConfig((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              title="Configurar ventana operativa semanal (Solo Administrador)"
            >
              <Sliders className="w-4 h-4 text-blue-600" />
              {showAdminConfig ? "Ocultar Config. Ventana" : "Configurar Ventana"}
            </button>
          )}

          {canCreateRole && (
            <button
              type="button"
              disabled={!canCreate}
              onClick={() => {
                setIsNewModalOpen(true);
                setFeedback(null);
              }}
              title={
                !canCreate
                  ? windowStatus?.message || "Ventana cerrada o cupo agotado"
                  : "Crear una nueva requisición"
              }
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer ${
                canCreate
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
              }`}
            >
              <Plus className="w-4 h-4" />
              Nueva Solicitud
            </button>
          )}
        </div>
      </div>

      {/* Panel Administrador: Configuración de la Ventana Operativa */}
      {showAdminConfig && currentUser?.roles.includes("ADMINISTRADOR") && (
        <RequestWindowAdminCard onConfigUpdated={refreshData} />
      )}

      {/* Banner Informativo de Ventana Operativa Semanal */}
      {windowStatus && (
        <div
          className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all ${
            windowStatus.isSuspended
              ? "bg-red-50 border-red-200 text-red-800"
              : windowStatus.isOpen
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-amber-50 border-amber-200 text-amber-900"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {windowStatus.isSuspended ? (
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
            ) : windowStatus.isOpen ? (
              <Clock className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
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
                    <span className="font-semibold text-emerald-700">
                      Dispones de 1 cupo activo esta semana.
                    </span>
                  ) : (
                    <span className="font-semibold text-red-700">
                      Ya consumiste tu cupo semanal correspondiente al ciclo{" "}
                      {windowStatus.currentCycle}.
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {isWarehouseStaff && (
            <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded bg-white/80 border border-current">
              Modo Almacén (Acceso 24/7)
            </span>
          )}
        </div>
      )}

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
            feedback.status === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {feedback.status === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda Avanzada */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Input de Búsqueda Libre en Tiempo Real */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por N° solicitud, área, solicitante o insumo..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-8 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Selector de Estado */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-blue-500"
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

        <button
          type="button"
          onClick={() => void refreshData()}
          className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors shadow-2xs cursor-pointer self-end sm:self-auto"
          title="Actualizar listado"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Tabla de Requisiciones */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">N° Solicitud</th>
                <th className="py-3 px-4">Área / Sección</th>
                <th className="py-3 px-4">Solicitante</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4 text-center">Renglones</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    Cargando requisiciones...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No se encontraron solicitudes con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const status = STATUS_CONFIG[req.status] || {
                    label: req.status,
                    className: "bg-slate-50 text-slate-700",
                  };

                  // REGLA ESTRICTA: Despachar SOLO si APROBADA o DESPACHADA_PARCIAL
                  const canDispatch =
                    req.status === "APROBADA" ||
                    req.status === "DESPACHADA_PARCIAL";

                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {req.requestNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {req.departmentSection}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {req.applicant?.fullName || req.applicant?.username}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap font-mono">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">
                        {req.items?.length || 0}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Botón Ver Comprobante */}
                          <button
                            type="button"
                            onClick={() => router.push(`/requests/${req.id}`)}
                            className="inline-flex items-center p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 cursor-pointer transition-colors"
                            title="Ver detalle del comprobante"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* ACCIONES EXCLUSIVAS DE ALMACÉN / ADMINISTRACIÓN */}
                          {isWarehouseStaff && (
                            <>
                              {req.status === "PENDIENTE" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => void handleApprove(req)}
                                    disabled={approvingId === req.id}
                                    className="inline-flex items-center gap-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
                                    title="Aprobar solicitud"
                                  >
                                    {approvingId === req.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <CheckCheck className="w-3.5 h-3.5" />
                                    )}
                                    Aprobar
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRequestToReject(req);
                                      setRejectReason("");
                                      setFeedback(null);
                                    }}
                                    className="inline-flex items-center bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 p-1.5 rounded-md transition-colors cursor-pointer"
                                    title="Rechazar solicitud"
                                  >
                                    <Ban className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              {canDispatch && (
                                <button
                                  type="button"
                                  onClick={() => openDispatchModal(req)}
                                  className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors shadow-2xs cursor-pointer"
                                  title="Despachar materiales"
                                >
                                  <Check className="w-3.5 h-3.5" /> Despachar
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Nueva Solicitud */}
      {isNewModalOpen && canCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[88vh] flex flex-col overflow-hidden">
            {/* Cabecera del modal fija */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    Crear Requisición Interna
                  </h3>
                  <p className="text-xs text-slate-500">
                    Complete la solicitud de insumos y reactivos para su departamento
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
                title="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmitRequest}
              className="flex flex-col flex-1 min-h-0"
            >
              {/* Cuerpo scrolleable */}
              <div className="p-6 overflow-y-auto pr-3 space-y-5 flex-1 scroll-smooth">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Área Solicitante
                  </label>
                  <select
                    value={departmentSection}
                    onChange={(e) => setDepartmentSection(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    {SECTIONS.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Insumos / Reactivos Requeridos ({formItems.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/70 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-blue-200"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar renglón
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formItems.map((item, idx) => {
                      const selectedProd = products.find(
                        (p) => p.id === item.productId
                      );
                      const unit =
                        selectedProd?.unitOfMeasure ||
                        selectedProd?.baseUnit?.abbreviation ||
                        "UND";

                      return (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs"
                        >
                          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white border border-slate-200 text-xs font-mono font-bold text-slate-600 shrink-0">
                            {idx + 1}
                          </div>

                          {/* Selector Combobox Avanzado con Búsqueda y Categorías */}
                          <div className="flex-1 min-w-0">
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Insumo / Reactivo
                            </label>
                            <ProductCombobox
                              products={products}
                              categories={categories}
                              selectedProductId={item.productId}
                              onSelect={(prodId) =>
                                handleProductSelect(idx, prodId)
                              }
                              placeholder="Buscar insumo por nombre o SKU..."
                            />
                          </div>

                          {/* Cantidad solicitada */}
                          <div className="w-full sm:w-36 shrink-0">
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Cantidad {selectedProd ? `(${unit})` : ""}
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="1"
                                placeholder="1"
                                value={item.requestedQuantity}
                                onChange={(e) =>
                                  handleQuantityChange(
                                    idx,
                                    Math.max(1, Number(e.target.value))
                                  )
                                }
                                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono font-bold focus:ring-2 focus:ring-blue-500"
                                required
                              />
                              {selectedProd && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-medium pointer-events-none">
                                  {unit}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Botón eliminar renglón */}
                          <div className="sm:self-end mb-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              disabled={formItems.length === 1}
                              className="text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 cursor-pointer p-2 rounded-lg border border-transparent hover:border-red-200 transition-colors"
                              title="Eliminar renglón"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Justificación de Uso / Protocolo
                  </label>
                  <textarea
                    rows={3}
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Explique el protocolo analítico, lote de producción o justificación del pedido..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 resize-none font-medium"
                    required
                  />
                </div>
              </div>

              {/* Pie de modal fijo */}
              <div className="flex items-center justify-between p-4 px-6 border-t border-slate-100 bg-slate-50/70 shrink-0">
                <span className="text-xs text-slate-500">
                  {formItems.length}{" "}
                  {formItems.length === 1
                    ? "renglón agregado"
                    : "renglones agregados"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNewModalOpen(false)}
                    className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-200/60 rounded-lg font-medium cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {submitting ? "Enviando..." : "Enviar Solicitud"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Despacho Multi-Lote y Despacho Parcial (Solo Almacén) */}
      {selectedForDispatch && isWarehouseStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[88vh] flex flex-col overflow-hidden">
            {/* Cabecera del modal fija */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0 bg-slate-50/70">
              <div>
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  Despachar Requisición #{selectedForDispatch.requestNumber}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Área: <strong className="text-slate-700">{selectedForDispatch.departmentSection}</strong> • Solicitado por:{" "}
                  <strong className="text-slate-700">
                    {selectedForDispatch.applicant?.fullName ||
                      selectedForDispatch.applicant?.username}
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseDispatchModal}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
                title="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario con cuerpo scrolleable y pie fijo */}
            <form onSubmit={handleConfirmDispatch} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 overflow-y-auto space-y-4 flex-1 scroll-smooth pr-3">
                {/* Alerta de feedback dentro del modal */}
                {dispatchFeedback && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                      dispatchFeedback.status === "success"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-red-50 border-red-200 text-red-800"
                    }`}
                  >
                    {dispatchFeedback.status === "success" ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    )}
                    <span className="font-medium">{dispatchFeedback.message}</span>
                  </div>
                )}

                {/* Información General de la Requisición */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl text-xs">
                  <div>
                    <span className="block text-[10px] uppercase text-slate-500 font-semibold tracking-wider">
                      Área solicitante
                    </span>
                    <span className="text-slate-800 font-semibold text-xs">
                      {selectedForDispatch.departmentSection}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-slate-500 font-semibold tracking-wider">
                      Solicitante
                    </span>
                    <span className="text-slate-800 font-semibold text-xs">
                      {selectedForDispatch.applicant?.fullName ||
                        selectedForDispatch.applicant?.username}
                    </span>
                  </div>
                  <div className="sm:col-span-2 border-t border-blue-100 pt-2 mt-0.5">
                    <span className="block text-[10px] uppercase text-slate-500 font-semibold tracking-wider">
                      Justificación Técnica
                    </span>
                    <p className="text-slate-700 mt-0.5 leading-relaxed">
                      {selectedForDispatch.justification ||
                        "Sin justificación registrada"}
                    </p>
                  </div>
                </div>

                {/* Renglones con Soporte Multi-Lote */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-blue-600" />
                      Asignación de Lotes Físicos por Renglón
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Asigne los lotes a despachar. Puede despachar parcialmente o mantener en espera (0).
                    </span>
                  </div>

                  {selectedForDispatch.items.map((it) => {
                    const itId = it.id as number;
                    const qtyRequested = Number(
                      it.requestedQuantity ?? it.quantityRequested ?? 0
                    );
                    const qtyApproved = Number(
                      it.quantityApproved && it.quantityApproved > 0
                        ? it.quantityApproved
                        : it.quantityRequested ?? it.requestedQuantity ?? 0
                    );
                    const qtyDispatched = Number(
                      it.quantityDispatched ?? it.dispatchedQuantity ?? 0
                    );
                    const pendingQuantity = Math.max(
                      0,
                      qtyApproved - qtyDispatched
                    );

                    const candidateBatches = availableBatches.filter(
                      (b) => (b.productId ?? b.product?.id) === it.productId
                    );

                    const rows = dispatchItemAllocations[itId] || [];
                    const allocatedSum = rows.reduce(
                      (sum, r) => sum + (Number(r.quantity) || 0),
                      0
                    );

                    const unit =
                      it.product?.unitOfMeasure ||
                      it.product?.baseUnit?.abbreviation ||
                      "UND";

                    return (
                      <div
                        key={itId}
                        className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3.5 shadow-xs"
                      >
                        {/* Cabecera del ítem */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm">
                              {it.product?.name}
                            </span>
                            {it.product?.sku && (
                              <span className="font-mono text-xs text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 font-medium">
                                SKU: {it.product.sku}
                              </span>
                            )}
                            <span className="text-xs font-semibold text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded">
                              {unit}
                            </span>
                          </div>

                          {/* Badges claros y legibles */}
                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              Solicitado:{" "}
                              <span className="font-mono font-bold text-slate-800">
                                {qtyRequested}
                              </span>{" "}
                              <span className="text-slate-500 font-normal text-[11px]">
                                {unit}
                              </span>
                            </span>
                            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              Aprobado:{" "}
                              <span className="font-mono font-bold text-blue-800">
                                {qtyApproved}
                              </span>{" "}
                              <span className="text-blue-600 font-normal text-[11px]">
                                {unit}
                              </span>
                            </span>
                            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                              Ya despachado:{" "}
                              <span className="font-mono font-bold text-purple-800">
                                {qtyDispatched}
                              </span>{" "}
                              <span className="text-purple-600 font-normal text-[11px]">
                                {unit}
                              </span>
                            </span>
                            <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
                              Remanente pendiente:{" "}
                              <span className="font-mono font-bold text-amber-900">
                                {pendingQuantity}
                              </span>{" "}
                              <span className="text-amber-700 font-normal text-[11px]">
                                {unit}
                              </span>
                            </span>
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
                                className="grid grid-cols-12 gap-3 items-center bg-white p-3 rounded-lg border border-slate-200 shadow-2xs"
                              >
                                <div className="col-span-12 sm:col-span-7">
                                  <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                                    Lote de Origen
                                  </label>
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
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                                  >
                                    <option value="0">
                                      -- Seleccione lote disponible (
                                      {candidateBatches.length} disponibles) --
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
                                  <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                                    Cantidad a entregar{" "}
                                    {currentBatch && (
                                      <span className="text-slate-400 font-normal">
                                        (máx: {maxStock})
                                      </span>
                                    )}
                                  </label>
                                  <input
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
                                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono font-bold focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>

                                <div className="col-span-2 sm:col-span-1 text-center pt-5">
                                  {rows.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRemoveBatchRow(itId, allocIdx)
                                      }
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                      title="Quitar este lote"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Botón para agregar otro lote para este renglón y aviso de total */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs pt-1 border-t border-slate-200/60">
                          <button
                            type="button"
                            onClick={() => handleAddBatchRow(itId)}
                            className="text-blue-600 hover:text-blue-800 font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer self-start"
                          >
                            <Plus className="w-3.5 h-3.5" /> + Agregar otro lote
                            a este renglón
                          </button>

                          <div className="text-xs">
                            <span className="text-slate-600">
                              Total asignado en esta entrega:
                            </span>{" "}
                            <strong
                              className={
                                allocatedSum > pendingQuantity
                                  ? "text-red-600 font-mono font-bold"
                                  : "text-slate-900 font-mono font-bold"
                              }
                            >
                              <span>{allocatedSum}</span> / <span>{pendingQuantity}</span>{" "}
                              <span className="text-slate-500 font-normal text-[11px]">
                                {unit}
                              </span>
                            </strong>
                            {allocatedSum > pendingQuantity && (
                              <span className="text-red-500 ml-1.5 font-semibold text-[11px]">
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
                      </div>
                    );
                  })}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Notas de Despacho (Opcional)
                  </label>
                  <input
                    type="text"
                    value={dispatchNotes}
                    onChange={(e) => setDispatchNotes(e.target.value)}
                    placeholder="N° de acta de entrega o nombre de quien recibe..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Pie de modal fijo */}
              <div className="p-4 border-t border-slate-100 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/70">
                <p className="text-[11px] text-slate-500">
                  Puede realizar despachos parciales. Si cancela o cierra, la
                  solicitud permanece aprobada en espera (Standby).
                </p>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={handleCloseDispatchModal}
                    className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-200/60 rounded-lg font-semibold transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={dispatching}
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {dispatching && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    {dispatching ? "Despachando..." : "Confirmar y Despachar"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Rechazo (Solo Almacén) */}
      {requestToReject && isWarehouseStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-slate-800">
                  Rechazar requisición #{requestToReject.requestNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRequestToReject(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-xs text-red-800 flex gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>
                Indique el motivo de rechazo técnico o administrativo.
              </span>
            </div>
            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Indique el motivo técnico o administrativo..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-red-500"
              autoFocus
            />
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setRequestToReject(null)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleReject()}
                disabled={rejecting || rejectReason.trim().length < 5}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                {rejecting && <Loader2 className="w-4 h-4 animate-spin" />}
                {rejecting ? "Rechazando..." : "Confirmar Rechazo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InternalRequestsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[70vh] flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          <span className="text-xs text-slate-500 font-medium">
            Cargando módulo de solicitudes...
          </span>
        </div>
      }
    >
      <RequestsContent />
    </Suspense>
  );
}
