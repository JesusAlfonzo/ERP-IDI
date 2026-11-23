"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PurchasingClientService } from "@/services/purchasing.service";
import { AuthService } from "@/services/auth.service";
import {
  normalizeCurrencyCode,
  formatCurrencyAmount,
} from "@/utils/currency";
import type {
  PurchaseOrder,
  PurchaseOrderStatus,
} from "@/types/purchasing";
import { usePagination } from "@/hooks/use-pagination";
import { TablePagination } from "@/components/common/TablePagination";
import { cn } from "@/lib/utils";
import {
  ShoppingCart,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Building2,
  Loader2,
  PackageCheck,
  Eye,
  Search,
  X,
  Edit3,
  Send,
  Truck,
  FileEdit,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

type ActiveTab = "todas" | "por_recibir" | "borradores" | "completadas" | "canceladas";

const RECENT_DAYS_WINDOW = 7;

function isWithinRecentDays(dateStr?: string | null, days = RECENT_DAYS_WINDOW): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr).getTime();
  if (Number.isNaN(date)) return false;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return date >= cutoff;
}

function isPendingReception(status: PurchaseOrderStatus): boolean {
  return (
    status === "ENVIADA" ||
    status === "PENDIENTE" ||
    status === "APROBADA" ||
    status === "EN_PROCESO" ||
    status === "PARCIAL"
  );
}

function isCompleted(status: PurchaseOrderStatus): boolean {
  return status === "COMPLETADA" || status === "RECIBIDO";
}

function isCancelled(status: PurchaseOrderStatus): boolean {
  return status === "CANCELADA" || status === "CANCELADO";
}

const STATUS_BADGES: Record<
  PurchaseOrderStatus,
  {
    label: string;
    variant:
      | "default"
      | "secondary"
      | "destructive"
      | "outline"
      | "success"
      | "warning"
      | "info"
      | "purple";
    className: string;
  }
> = {
  BORRADOR: {
    label: "Borrador",
    variant: "secondary",
    className:
      "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  },
  ENVIADA: {
    label: "Enviada",
    variant: "info",
    className:
      "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  },
  PENDIENTE: {
    label: "Pendiente",
    variant: "warning",
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  APROBADA: {
    label: "Aprobada",
    variant: "info",
    className:
      "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
  },
  EN_PROCESO: {
    label: "En Tránsito",
    variant: "purple",
    className:
      "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  },
  PARCIAL: {
    label: "Parcial",
    variant: "warning",
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  COMPLETADA: {
    label: "Completada",
    variant: "success",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  RECIBIDO: {
    label: "Recibida",
    variant: "success",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  CANCELADA: {
    label: "Cancelada",
    variant: "destructive",
    className:
      "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  },
  CANCELADO: {
    label: "Cancelada",
    variant: "destructive",
    className:
      "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  },
};

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros reactivos en memoria
  const [activeTab, setActiveTab] = useState<ActiveTab>("todas");
  const [search, setSearch] = useState<string>("");
  const [supplierFilter, setSupplierFilter] = useState<string>("TODOS");
  const [showFullHistory, setShowFullHistory] = useState<boolean>(false);

  const [sendingOrderId, setSendingOrderId] = useState<string | number | null>(null);
  const [feedback, setFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const ordersData = await PurchasingClientService.getOrders().catch(() => []);
      setOrders(ordersData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!AuthService.isAuthenticated()) {
      router.replace("/login");
      return;
    }
    void loadData();
  }, [router, loadData]);

  // Métricas KPI y contadores de pestañas
  const metrics = useMemo(() => {
    let pendingReceptionCount = 0;
    let draftCount = 0;
    let completedRecentCount = 0;
    let completedTotalCount = 0;
    let cancelledRecentCount = 0;
    let cancelledTotalCount = 0;

    orders.forEach((o) => {
      const refDate = o.createdAt;
      if (isPendingReception(o.status)) pendingReceptionCount++;
      else if (o.status === "BORRADOR") draftCount++;
      else if (isCompleted(o.status)) {
        completedTotalCount++;
        if (isWithinRecentDays(refDate)) completedRecentCount++;
      } else if (isCancelled(o.status)) {
        cancelledTotalCount++;
        if (isWithinRecentDays(refDate)) cancelledRecentCount++;
      }
    });

    return {
      total: orders.length,
      pendingReceptionCount,
      draftCount,
      completedRecentCount,
      completedTotalCount,
      cancelledRecentCount,
      cancelledTotalCount,
    };
  }, [orders]);

  // Lista única de proveedores presentes en las órdenes
  const suppliersList = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.supplier?.name) set.add(o.supplier.name);
    });
    return Array.from(set).sort();
  }, [orders]);

  // Filtrado reactivo en memoria
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const refDate = order.createdAt;
      if (activeTab === "por_recibir" && !isPendingReception(order.status)) return false;
      if (activeTab === "borradores" && order.status !== "BORRADOR") return false;
      if (activeTab === "completadas") {
        if (!isCompleted(order.status)) return false;
        if (!showFullHistory && !search.trim() && !isWithinRecentDays(refDate)) {
          return false;
        }
      }
      if (activeTab === "canceladas") {
        if (!isCancelled(order.status)) return false;
        if (!showFullHistory && !search.trim() && !isWithinRecentDays(refDate)) {
          return false;
        }
      }

      if (supplierFilter !== "TODOS" && order.supplier?.name !== supplierFilter) {
        return false;
      }

      if (search.trim()) {
        const term = search.toLowerCase().trim();
        const num = order.orderNumber?.toLowerCase() || "";
        const sup = order.supplier?.name?.toLowerCase() || "";
        const rif = (order.supplier?.rifOrId || order.supplier?.rif || "").toLowerCase();
        const reqNum = order.requisition?.requisitionNumber?.toLowerCase() || "";
        const notes = order.notes?.toLowerCase() || "";
        if (
          !num.includes(term) &&
          !sup.includes(term) &&
          !rif.includes(term) &&
          !reqNum.includes(term) &&
          !notes.includes(term)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [orders, activeTab, supplierFilter, search, showFullHistory]);

  // Paginación
  const pagination = usePagination(filteredOrders, { initialPageSize: 10 });
  const { resetPage } = pagination;

  useEffect(() => {
    resetPage();
  }, [activeTab, supplierFilter, search, showFullHistory, resetPage]);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    setShowFullHistory(false);
  };

  const hasActiveFilters = Boolean(search.trim() || supplierFilter !== "TODOS");

  const handleClearFilters = () => {
    setSearch("");
    setSupplierFilter("TODOS");
  };

  const handleSendOrder = async (order: PurchaseOrder) => {
    if (
      !confirm(
        `¿Desea formalizar y marcar la Orden de Compra #${order.orderNumber || order.id} como ENVIADA al proveedor? Una vez enviada, los renglones y precios quedan formalizados para proceder a recibir mercancía.`
      )
    ) {
      return;
    }
    setSendingOrderId(order.id);
    setFeedback(null);
    try {
      await PurchasingClientService.sendOrder(order.id);
      setFeedback({
        status: "success",
        message: `Orden #${order.orderNumber || order.id} enviada exitosamente al proveedor.`,
      });
      await loadData();
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Error al enviar la orden al proveedor.",
      });
    } finally {
      setSendingOrderId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* ========================================================
          ENCABEZADO ESTANDARIZADO
         ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary" />
            Órdenes de Compra
          </h1>
          <p className="text-xs text-muted-foreground">
            Control de adquisiciones, envíos a proveedores y recepción de mercancía
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadData()}
            disabled={loading}
            className="h-9 gap-1.5 text-xs cursor-pointer shadow-2xs"
            title="Actualizar listado de órdenes"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            <span>Actualizar</span>
          </Button>

          <Button
            asChild
            className="h-9 gap-1.5 text-xs font-bold shadow-2xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link href="/purchasing/orders/new">
              <Plus className="w-4 h-4" />
              <span>Nueva Orden</span>
            </Link>
          </Button>
        </div>
      </div>

      {feedback && (
        <Alert
          variant={feedback.status === "success" ? "success" : "destructive"}
          className="animate-in fade-in duration-200"
        >
          {feedback.status === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <AlertTitle>
            {feedback.status === "success" ? "Operación Exitosa" : "Error"}
          </AlertTitle>
          <AlertDescription className="flex items-center justify-between text-xs">
            <span>{feedback.message}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="opacity-70 hover:opacity-100 cursor-pointer ml-3"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* ========================================================
          4 TARJETAS KPI ESTANDARIZADAS
         ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Órdenes */}
        <Card className="p-4 border-border shadow-2xs hover:border-primary/40 transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Total Órdenes
            </span>
            <div className="text-2xl font-bold font-mono text-foreground">
              {metrics.total}
            </div>
            <span className="text-[11px] text-muted-foreground block">
              Historial completo
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </div>
        </Card>

        {/* KPI 2: Por Recibir */}
        <Card className="p-4 border-border shadow-2xs hover:border-amber-500/40 transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Por Recibir
            </span>
            <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {metrics.pendingReceptionCount}
            </div>
            <span className="text-[11px] text-muted-foreground block">
              Enviadas o parciales
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Truck className="w-5 h-5" />
          </div>
        </Card>

        {/* KPI 3: Borradores */}
        <Card className="p-4 border-border shadow-2xs hover:border-slate-500/40 transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Borradores
            </span>
            <div className="text-2xl font-bold font-mono text-slate-600 dark:text-slate-300">
              {metrics.draftCount}
            </div>
            <span className="text-[11px] text-muted-foreground block">
              Pendientes de enviar
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-500/10 border border-slate-500/20 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
            <FileEdit className="w-5 h-5" />
          </div>
        </Card>

        {/* KPI 4: Completadas (7d) */}
        <Card className="p-4 border-border shadow-2xs hover:border-emerald-500/40 transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Completadas (7d)
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {metrics.completedRecentCount}
            </div>
            <span className="text-[11px] text-muted-foreground block">
              Últimos {RECENT_DAYS_WINDOW} días
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* ========================================================
          PESTAÑAS, BUSCADOR Y FILTROS
         ======================================================== */}
      <Card className="p-4 border-border shadow-2xs space-y-3.5">
        {/* Pestañas de estado (Jerarquía operativa) */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 border-b border-border text-xs">
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleTabChange("todas")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0",
                activeTab === "todas"
                  ? "bg-primary text-primary-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <span>Todas</span>
              <Badge
                variant={activeTab === "todas" ? "secondary" : "outline"}
                className="text-[10px] px-1.5 py-0 font-mono"
              >
                {metrics.total}
              </Badge>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("por_recibir")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0",
                activeTab === "por_recibir"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <span>Por Recibir</span>
              <Badge
                variant={activeTab === "por_recibir" ? "secondary" : "outline"}
                className="text-[10px] px-1.5 py-0 font-mono"
              >
                {metrics.pendingReceptionCount}
              </Badge>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("borradores")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0",
                activeTab === "borradores"
                  ? "bg-slate-600 text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <span>Borradores</span>
              <Badge
                variant={activeTab === "borradores" ? "secondary" : "outline"}
                className="text-[10px] px-1.5 py-0 font-mono"
              >
                {metrics.draftCount}
              </Badge>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("completadas")}
              title={`Completadas en los últimos ${RECENT_DAYS_WINDOW} días`}
              className={cn(
                "px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0",
                activeTab === "completadas"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <span>Completadas (7d)</span>
              <Badge
                variant={activeTab === "completadas" ? "secondary" : "outline"}
                className="text-[10px] px-1.5 py-0 font-mono"
              >
                {metrics.completedRecentCount}
              </Badge>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("canceladas")}
              title={`Canceladas en los últimos ${RECENT_DAYS_WINDOW} días`}
              className={cn(
                "px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0",
                activeTab === "canceladas"
                  ? "bg-rose-600 text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <span>Canceladas (7d)</span>
              <Badge
                variant={activeTab === "canceladas" ? "secondary" : "outline"}
                className="text-[10px] px-1.5 py-0 font-mono"
              >
                {metrics.cancelledRecentCount}
              </Badge>
            </button>
          </div>

          {(activeTab === "completadas" || activeTab === "canceladas") &&
            !search.trim() && (
              <button
                type="button"
                onClick={() => setShowFullHistory((prev) => !prev)}
                className="text-[11px] font-medium text-primary hover:underline shrink-0 cursor-pointer px-1"
              >
                {showFullHistory
                  ? `Solo últimos ${RECENT_DAYS_WINDOW} días`
                  : `Ver historial completo (${
                      activeTab === "completadas"
                        ? metrics.completedTotalCount
                        : metrics.cancelledTotalCount
                    })`}
              </button>
            )}
        </div>

        {/* Barra de Búsqueda y Filtros */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por N° orden, proveedor, RIF o preorden..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs bg-background"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Borrar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {suppliersList.length > 0 && (
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="h-9 bg-background border border-input rounded-md px-2.5 text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring cursor-pointer"
              >
                <option value="TODOS">Todos los proveedores</option>
                {suppliersList.map((sup) => (
                  <option key={sup} value={sup}>
                    {sup}
                  </option>
                ))}
              </select>
            )}

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer"
                title="Limpiar filtros"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpiar</span>
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* ========================================================
          TABLA DE ÓRDENES DE COMPRA
         ======================================================== */}
      <Card className="overflow-hidden border-border shadow-2xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="py-3 px-4 font-semibold text-xs">N° Orden</TableHead>
                <TableHead className="py-3 px-4 font-semibold text-xs">Proveedor</TableHead>
                <TableHead className="py-3 px-4 font-semibold text-xs">Fecha</TableHead>
                <TableHead className="py-3 px-4 text-center font-semibold text-xs">Moneda / Tasa</TableHead>
                <TableHead className="py-3 px-4 text-right font-semibold text-xs">Total</TableHead>
                <TableHead className="py-3 px-4 text-center font-semibold text-xs">Insumos</TableHead>
                <TableHead className="py-3 px-4 text-center font-semibold text-xs">Estado</TableHead>
                <TableHead className="py-3 px-4 text-center font-semibold text-xs">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground text-xs">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
                    Cargando órdenes de compra...
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground text-xs">
                    No se encontraron órdenes de compra registradas.
                  </TableCell>
                </TableRow>
              ) : (
                pagination.paginatedItems.map((order) => {
                  const badge = STATUS_BADGES[order.status] || {
                    label: order.status,
                    variant: "secondary" as const,
                    className: "",
                  };
                  const isDraft = order.status === "BORRADOR";
                  const canReceive = isPendingReception(order.status);

                  return (
                    <TableRow
                      key={String(order.id)}
                      className="hover:bg-muted/40 transition-colors text-xs"
                    >
                      <TableCell className="py-3 px-4 font-mono font-bold text-foreground">
                        <div>{order.orderNumber || `#${order.id}`}</div>
                        {order.requisition && (
                          <Link
                            href={`/purchasing/requisitions/${order.requisition.id}`}
                            className="text-[10px] text-primary font-mono font-normal hover:underline inline-block"
                            title="Ver detalle de la preorden"
                          >
                            Preorden: {order.requisition.requisitionNumber}
                          </Link>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span>{order.supplier?.name || "Proveedor General"}</span>
                        </div>
                        {(order.supplier?.rifOrId || order.supplier?.rif) && (
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {order.supplier.rifOrId || order.supplier.rif}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleDateString("es-VE")
                          : "-"}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center font-mono text-foreground">
                        <span className="font-bold">
                          {normalizeCurrencyCode(order.currency)}
                        </span>
                        {normalizeCurrencyCode(order.currency) !== "VED" &&
                          Number(order.exchangeRate || 1) > 1 && (
                            <div className="text-[10px] text-muted-foreground">
                              {Number(order.exchangeRate).toFixed(2)} Bs/
                              {normalizeCurrencyCode(order.currency) === "EUR" ? "€" : "$"}
                            </div>
                          )}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right font-mono font-bold text-foreground whitespace-nowrap">
                        {formatCurrencyAmount(
                          order.totalAmount ?? order.totalAmountUsd ?? order.total ?? 0,
                          order.currency
                        )}
                        {normalizeCurrencyCode(order.currency) !== "VED" &&
                          order.totalAmountBs && (
                            <div className="text-[10px] text-muted-foreground font-normal">
                              Bs.{" "}
                              {Number(order.totalAmountBs).toLocaleString("es-VE", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </div>
                          )}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center font-mono font-semibold text-foreground">
                        {order.items?.length || 0}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center">
                        <Badge
                          variant={badge.variant}
                          className={cn("text-[11px]", badge.className)}
                        >
                          {badge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="h-7 text-xs font-semibold gap-1 cursor-pointer"
                            title="Ver detalle de la orden"
                          >
                            <Link href={`/purchasing/orders/${order.id}`}>
                              <Eye className="w-3.5 h-3.5" />
                              Ver
                            </Link>
                          </Button>

                          {isDraft ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="h-7 text-xs font-semibold gap-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border-indigo-500/20 cursor-pointer"
                                title="Editar borrador de orden"
                              >
                                <Link href={`/purchasing/orders/${order.id}/edit`}>
                                  <Edit3 className="w-3 h-3" />
                                  Editar
                                </Link>
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleSendOrder(order)}
                                disabled={sendingOrderId === order.id}
                                className="h-7 text-xs font-semibold gap-1 cursor-pointer shadow-2xs"
                                title="Marcar orden como enviada al proveedor"
                              >
                                {sendingOrderId === order.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Send className="w-3 h-3" />
                                )}
                                Enviar
                              </Button>
                            </>
                          ) : (
                            canReceive && (
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="h-7 text-xs font-semibold gap-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 cursor-pointer"
                                title="Registrar recepción de mercancía"
                              >
                                <Link href={`/purchasing/orders/${order.id}/receive`}>
                                  <PackageCheck className="w-3.5 h-3.5" />
                                  Recibir
                                </Link>
                              </Button>
                            )
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        <TablePagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
          pageSizeOptions={[10, 25, 50, 100]}
          entityName="órdenes de compra"
        />
      </Card>
    </div>
  );
}
