"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { BankAccountService } from "@/services/bank-account.service";
import { AuthService } from "@/services/auth.service";
import type { AuthUser } from "@/types/auth";
import { usePagination } from "@/hooks/use-pagination";
import { TablePagination } from "@/components/common/TablePagination";
import type { DirectPayment, ServiceOrderStatus } from "@/types/purchasing";
import { cn } from "@/lib/utils";
import { toast } from "@/utils/toast";
import {
  Wallet,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  Loader2,
  Building2,
  Eye,
  X,
  Send,
  Clock,
  CheckCircle2,
  FileCheck2,
  AlertTriangle,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type ActiveTab =
  | "todas"
  | "en_aprobacion"
  | "borradores"
  | "por_pagar"
  | "pagadas"
  | "cerradas_no_pagadas";

const RECENT_DAYS_WINDOW = 7;

function isWithinRecentDays(dateStr?: string | null, days = RECENT_DAYS_WINDOW): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr).getTime();
  if (Number.isNaN(date)) return false;
  return date >= Date.now() - days * 24 * 60 * 60 * 1000;
}

const STATUS_BADGES: Record<
  ServiceOrderStatus,
  {
    label: string;
    variant: "secondary" | "warning" | "info" | "purple" | "success" | "destructive";
    className: string;
  }
> = {
  BORRADOR: {
    label: "Borrador",
    variant: "secondary",
    className:
      "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  },
  EN_APROBACION: {
    label: "En Aprobación",
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
  ORDEN_PAGO: {
    label: "Orden de Pago",
    variant: "purple",
    className:
      "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
  },
  PAGADA: {
    label: "Pagada",
    variant: "success",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  RECHAZADA: {
    label: "Rechazada",
    variant: "destructive",
    className:
      "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  },
  CANCELADA: {
    label: "Cancelada",
    variant: "destructive",
    className:
      "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  },
};

export default function ServiceOrdersPage() {
  const [orders, setOrders] = useState<DirectPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentUser] = useState<AuthUser | null>(() => AuthService.getCurrentUser());
  const userRoles = currentUser?.roles || [];
  const isAdmin = userRoles.includes("ADMINISTRADOR");

  // Filtros reactivos en memoria
  const [activeTab, setActiveTab] = useState<ActiveTab>("todas");
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("TODOS");
  const [currencyFilter, setCurrencyFilter] = useState("TODAS");
  const [showFullHistory, setShowFullHistory] = useState(false);

  // Acciones rápidas
  const [submittingId, setSubmittingId] = useState<string | number | null>(null);

  // Modal de eliminación (solo Admin)
  const [orderToDelete, setOrderToDelete] = useState<DirectPayment | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await BankAccountService.getDirectPayments();
      setOrders(data);
    } catch (err) {
      console.error("Error al cargar órdenes de servicio:", err);
      toast.error("No se pudo cargar el listado de órdenes de servicio.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    void (async () => {
      try {
        const data = await BankAccountService.getDirectPayments();
        if (!ignore) setOrders(data);
      } catch (err) {
        console.error("Error al cargar órdenes de servicio:", err);
        if (!ignore) toast.error("No se pudo cargar el listado de órdenes de servicio.");
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  // Métricas KPI y contadores
  const metrics = useMemo(() => {
    let inApprovalCount = 0;
    let draftCount = 0;
    let pendingPaymentCount = 0;
    let paidRecentCount = 0;
    let paidTotalCount = 0;
    let rejectedCancelledRecentCount = 0;
    let rejectedCancelledTotalCount = 0;

    orders.forEach((o) => {
      const refDate = o.updatedAt || o.paymentDate || o.createdAt;
      if (o.status === "EN_APROBACION") inApprovalCount++;
      else if (o.status === "BORRADOR") draftCount++;
      else if (o.status === "APROBADA" || o.status === "ORDEN_PAGO") pendingPaymentCount++;
      else if (o.status === "PAGADA") {
        paidTotalCount++;
        if (isWithinRecentDays(refDate)) paidRecentCount++;
      } else if (o.status === "RECHAZADA" || o.status === "CANCELADA") {
        rejectedCancelledTotalCount++;
        if (isWithinRecentDays(refDate)) rejectedCancelledRecentCount++;
      }
    });

    return {
      total: orders.length,
      inApprovalCount,
      draftCount,
      pendingPaymentCount,
      paidRecentCount,
      paidTotalCount,
      rejectedCancelledRecentCount,
      rejectedCancelledTotalCount,
    };
  }, [orders]);

  // Lista única de departamentos
  const departmentsList = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.department?.name) set.add(o.department.name);
    });
    return Array.from(set).sort();
  }, [orders]);

  // Filtrado reactivo
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const refDate = o.updatedAt || o.paymentDate || o.createdAt;
      if (activeTab === "en_aprobacion" && o.status !== "EN_APROBACION") return false;
      if (activeTab === "borradores" && o.status !== "BORRADOR") return false;
      if (
        activeTab === "por_pagar" &&
        o.status !== "APROBADA" &&
        o.status !== "ORDEN_PAGO"
      ) {
        return false;
      }
      if (activeTab === "pagadas") {
        if (o.status !== "PAGADA") return false;
        if (!showFullHistory && !search.trim() && !isWithinRecentDays(refDate)) {
          return false;
        }
      }
      if (activeTab === "cerradas_no_pagadas") {
        if (o.status !== "RECHAZADA" && o.status !== "CANCELADA") return false;
        if (!showFullHistory && !search.trim() && !isWithinRecentDays(refDate)) {
          return false;
        }
      }

      if (departmentFilter !== "TODOS" && o.department?.name !== departmentFilter) {
        return false;
      }

      if (currencyFilter !== "TODAS" && o.transactionCurrency !== currencyFilter) {
        return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const osNum = (o.serviceOrderNumber || "").toLowerCase();
        const opNum = (o.paymentOrderNumber || "").toLowerCase();
        const concept = (o.concept || "").toLowerCase();
        const ben = (o.beneficiary || "").toLowerCase();
        const ref = (o.referenceNumber || "").toLowerCase();
        const dept = (o.department?.name || "").toLowerCase();
        if (
          !osNum.includes(q) &&
          !opNum.includes(q) &&
          !concept.includes(q) &&
          !ben.includes(q) &&
          !ref.includes(q) &&
          !dept.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [orders, activeTab, departmentFilter, currencyFilter, search, showFullHistory]);

  const pagination = usePagination(filteredOrders, { initialPageSize: 10 });
  const { resetPage } = pagination;

  useEffect(() => {
    resetPage();
  }, [activeTab, departmentFilter, currencyFilter, search, showFullHistory, resetPage]);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    setShowFullHistory(false);
  };

  const hasActiveFilters = Boolean(
    search.trim() || departmentFilter !== "TODOS" || currencyFilter !== "TODAS"
  );

  const handleClearFilters = () => {
    setSearch("");
    setDepartmentFilter("TODOS");
    setCurrencyFilter("TODAS");
  };

  const handleQuickSubmit = async (order: DirectPayment) => {
    setSubmittingId(order.id);
    try {
      await BankAccountService.submitServiceOrder(order.id);
      toast.success(
        `Orden ${order.serviceOrderNumber || `#${order.id}`} enviada a aprobación.`
      );
      await loadData();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error al enviar a aprobación."
      );
    } finally {
      setSubmittingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    setDeleting(true);
    try {
      await BankAccountService.deleteDirectPayment(
        orderToDelete.id,
        deleteReason.trim() || undefined
      );
      toast.success("Orden de servicio eliminada.");
      setOrderToDelete(null);
      setDeleteReason("");
      await loadData();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error al eliminar la orden de servicio."
      );
    } finally {
      setDeleting(false);
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
            <Wallet className="w-6 h-6 text-primary" />
            Órdenes de Servicio
          </h1>
          <p className="text-xs text-muted-foreground">
            Solicitud, aprobación, emisión de orden de pago y liquidación de servicios
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
            title="Actualizar listado"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            <span>Actualizar</span>
          </Button>

          <Button
            asChild
            className="h-9 gap-1.5 text-xs font-bold shadow-2xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link href="/admin/financial/payments/new">
              <Plus className="w-4 h-4" />
              <span>Nueva Orden de Servicio</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* ========================================================
          4 TARJETAS KPI ESTANDARIZADAS
         ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <Wallet className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 border-border shadow-2xs hover:border-amber-500/40 transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              En Aprobación
            </span>
            <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {metrics.inApprovalCount}
            </div>
            <span className="text-[11px] text-muted-foreground block">
              Pendientes de revisión
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 border-border shadow-2xs hover:border-sky-500/40 transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Por Pagar
            </span>
            <div className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400">
              {metrics.pendingPaymentCount}
            </div>
            <span className="text-[11px] text-muted-foreground block">
              Aprobadas u Orden de Pago
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
            <FileCheck2 className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 border-border shadow-2xs hover:border-emerald-500/40 transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Pagadas (7d)
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {metrics.paidRecentCount}
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
              onClick={() => handleTabChange("en_aprobacion")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0",
                activeTab === "en_aprobacion"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <span>En Aprobación</span>
              <Badge
                variant={activeTab === "en_aprobacion" ? "secondary" : "outline"}
                className="text-[10px] px-1.5 py-0 font-mono"
              >
                {metrics.inApprovalCount}
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
              onClick={() => handleTabChange("por_pagar")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0",
                activeTab === "por_pagar"
                  ? "bg-sky-600 text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <span>Por Pagar</span>
              <Badge
                variant={activeTab === "por_pagar" ? "secondary" : "outline"}
                className="text-[10px] px-1.5 py-0 font-mono"
              >
                {metrics.pendingPaymentCount}
              </Badge>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("pagadas")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0",
                activeTab === "pagadas"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <span>Pagadas (7d)</span>
              <Badge
                variant={activeTab === "pagadas" ? "secondary" : "outline"}
                className="text-[10px] px-1.5 py-0 font-mono"
              >
                {metrics.paidRecentCount}
              </Badge>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("cerradas_no_pagadas")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0",
                activeTab === "cerradas_no_pagadas"
                  ? "bg-rose-600 text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <span>Rechazadas (7d)</span>
              <Badge
                variant={
                  activeTab === "cerradas_no_pagadas" ? "secondary" : "outline"
                }
                className="text-[10px] px-1.5 py-0 font-mono"
              >
                {metrics.rejectedCancelledRecentCount}
              </Badge>
            </button>
          </div>

          {(activeTab === "pagadas" || activeTab === "cerradas_no_pagadas") &&
            !search.trim() && (
              <button
                type="button"
                onClick={() => setShowFullHistory((prev) => !prev)}
                className="text-[11px] font-medium text-primary hover:underline shrink-0 cursor-pointer px-1"
              >
                {showFullHistory
                  ? `Solo últimos ${RECENT_DAYS_WINDOW} días`
                  : `Ver historial completo (${
                      activeTab === "pagadas"
                        ? metrics.paidTotalCount
                        : metrics.rejectedCancelledTotalCount
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
              placeholder="Buscar por N° OS, N° OP, concepto, proveedor o referencia..."
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
            {departmentsList.length > 0 && (
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="h-9 bg-background border border-input rounded-md px-2.5 text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring cursor-pointer"
              >
                <option value="TODOS">Todas las áreas</option>
                {departmentsList.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            )}

            <select
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value)}
              className="h-9 bg-background border border-input rounded-md px-2.5 text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring cursor-pointer"
            >
              <option value="TODAS">Todas las monedas</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="VED">VED (Bs.)</option>
            </select>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpiar</span>
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* ========================================================
          TABLA DE ÓRDENES DE SERVICIO
         ======================================================== */}
      <Card className="overflow-hidden border-border shadow-2xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="py-3 px-4 font-semibold text-xs">N° Orden</TableHead>
                <TableHead className="py-3 px-4 font-semibold text-xs">Proveedor / Concepto</TableHead>
                <TableHead className="py-3 px-4 font-semibold text-xs">Área</TableHead>
                <TableHead className="py-3 px-4 font-semibold text-xs">Fecha</TableHead>
                <TableHead className="py-3 px-4 text-right font-semibold text-xs">Monto</TableHead>
                <TableHead className="py-3 px-4 text-center font-semibold text-xs">Estado</TableHead>
                <TableHead className="py-3 px-4 text-center font-semibold text-xs">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground text-xs">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
                    Cargando órdenes de servicio...
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground text-xs">
                    No se encontraron órdenes de servicio registradas.
                  </TableCell>
                </TableRow>
              ) : (
                pagination.paginatedItems.map((order) => {
                  const status = order.status || "PAGADA";
                  const badge = STATUS_BADGES[status] || STATUS_BADGES.PAGADA;
                  const symbol =
                    order.transactionCurrency === "VED"
                      ? "Bs."
                      : order.transactionCurrency === "EUR"
                        ? "€"
                        : "$";
                  const amount = Number(order.amountPaid || 0);
                  const equivUsd = Number(order.equivalentAmountUsd || 0);
                  const canSubmit = status === "BORRADOR";

                  return (
                    <TableRow
                      key={String(order.id)}
                      className="hover:bg-muted/40 transition-colors text-xs"
                    >
                      <TableCell className="py-3 px-4 font-mono font-bold text-foreground whitespace-nowrap">
                        <div>
                          {order.serviceOrderNumber ||
                            `VOUCHER-${String(order.id).padStart(6, "0")}`}
                        </div>
                        {order.paymentOrderNumber && (
                          <div className="text-[10px] text-primary font-normal">
                            OP: {order.paymentOrderNumber}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <div className="font-semibold text-foreground flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span>{order.supplier?.name || order.beneficiary}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                          {order.concept}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {order.department?.name || "-"}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-muted-foreground whitespace-nowrap font-mono">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleDateString("es-VE")
                          : "-"}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right font-mono whitespace-nowrap">
                        <div className="font-bold text-foreground">
                          {symbol}{" "}
                          {amount.toLocaleString("es-VE", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        {order.transactionCurrency !== "USD" && equivUsd > 0 && (
                          <div className="text-[10px] text-muted-foreground">
                            ≈ ${equivUsd.toFixed(2)} USD
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center whitespace-nowrap">
                        <Badge
                          variant={badge.variant}
                          className={cn("text-[11px]", badge.className)}
                        >
                          {badge.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs font-semibold gap-1 cursor-pointer"
                            title="Ver detalle y gestionar flujo"
                          >
                            <Link href={`/admin/financial/payments/${order.id}`}>
                              <Eye className="w-3.5 h-3.5" />
                              Ver
                            </Link>
                          </Button>

                          {canSubmit && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={submittingId === order.id}
                              onClick={() => void handleQuickSubmit(order)}
                              className="h-7 text-xs font-semibold gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/20 cursor-pointer"
                              title="Enviar a aprobación"
                            >
                              {submittingId === order.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Send className="w-3 h-3" />
                              )}
                              Enviar
                            </Button>
                          )}

                          {isAdmin && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setOrderToDelete(order);
                                setDeleteReason("");
                              }}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                              title="Eliminar orden (Admin)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
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
          entityName="órdenes de servicio"
        />
      </Card>

      {/* Modal: Eliminar (Solo Admin) */}
      <Dialog
        open={Boolean(orderToDelete)}
        onOpenChange={(open) => {
          if (!open) setOrderToDelete(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 text-destructive rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Eliminar Orden de Servicio
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {orderToDelete?.serviceOrderNumber || `#${orderToDelete?.id}`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <p className="text-muted-foreground">
              ¿Desea eliminar permanentemente la orden{" "}
              <strong className="text-foreground">{orderToDelete?.concept}</strong>?
              {orderToDelete?.status === "PAGADA" &&
                " Al estar pagada, se registrará un asiento de reverso en el Kardex General."}
            </p>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase font-semibold text-muted-foreground">
                Motivo (Opcional)
              </Label>
              <Textarea
                rows={2}
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="Motivo de eliminación o anulación..."
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOrderToDelete(null)}
              disabled={deleting}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => void handleConfirmDelete()}
              disabled={deleting}
              className="gap-1.5 cursor-pointer"
            >
              {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Confirmar Eliminación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
