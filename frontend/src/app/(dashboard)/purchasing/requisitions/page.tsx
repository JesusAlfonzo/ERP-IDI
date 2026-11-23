"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { PurchasingClientService } from "@/services/purchasing.service";
import type {
  PurchaseRequisition,
  PurchaseRequisitionStatus,
} from "@/types/purchasing";
import { usePagination } from "@/hooks/use-pagination";
import { TablePagination } from "@/components/common/TablePagination";
import { cn } from "@/lib/utils";
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Eye,
  ArrowRight,
  Send,
  Clock,
  FileEdit,
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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

type ActiveTab = "todas" | "en_cotizacion" | "borradores" | "adjudicadas" | "canceladas";

const RECENT_DAYS_WINDOW = 7;

function isWithinRecentDays(dateStr?: string | null, days = RECENT_DAYS_WINDOW): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr).getTime();
  if (Number.isNaN(date)) return false;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return date >= cutoff;
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message) return res.data.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

const STATUS_BADGES: Record<
  PurchaseRequisitionStatus,
  {
    label: string;
    variant: "secondary" | "warning" | "success" | "destructive";
    className: string;
  }
> = {
  BORRADOR: {
    label: "Borrador",
    variant: "secondary",
    className:
      "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  },
  EN_COTIZACION: {
    label: "En Cotización",
    variant: "warning",
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  ADJUDICADA: {
    label: "Adjudicada",
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
};

export default function PurchaseRequisitionsPage() {
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros reactivos en memoria
  const [activeTab, setActiveTab] = useState<ActiveTab>("todas");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("TODOS");
  const [showFullHistory, setShowFullHistory] = useState<boolean>(false);

  // Feedback
  const [feedback, setFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const reqs = await PurchasingClientService.getRequisitions().catch(() => []);
      setRequisitions(reqs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Métricas KPI y contadores de pestañas
  const metrics = useMemo(() => {
    let quotingCount = 0;
    let draftCount = 0;
    let adjudicatedRecentCount = 0;
    let adjudicatedTotalCount = 0;
    let cancelledRecentCount = 0;
    let cancelledTotalCount = 0;

    requisitions.forEach((r) => {
      const refDate = r.updatedAt || r.createdAt;
      if (r.status === "EN_COTIZACION") quotingCount++;
      else if (r.status === "BORRADOR") draftCount++;
      else if (r.status === "ADJUDICADA") {
        adjudicatedTotalCount++;
        if (isWithinRecentDays(refDate)) adjudicatedRecentCount++;
      } else if (r.status === "CANCELADA") {
        cancelledTotalCount++;
        if (isWithinRecentDays(refDate)) cancelledRecentCount++;
      }
    });

    return {
      total: requisitions.length,
      quotingCount,
      draftCount,
      adjudicatedRecentCount,
      adjudicatedTotalCount,
      cancelledRecentCount,
      cancelledTotalCount,
    };
  }, [requisitions]);

  // Lista única de departamentos para el filtro
  const departmentsList = useMemo(() => {
    const set = new Set<string>();
    requisitions.forEach((r) => {
      if (r.departmentSection) set.add(r.departmentSection);
    });
    return Array.from(set).sort();
  }, [requisitions]);

  // Filtrado reactivo en memoria
  const filteredRequisitions = useMemo(() => {
    return requisitions.filter((req) => {
      const refDate = req.updatedAt || req.createdAt;
      if (activeTab === "en_cotizacion" && req.status !== "EN_COTIZACION") return false;
      if (activeTab === "borradores" && req.status !== "BORRADOR") return false;
      if (activeTab === "adjudicadas") {
        if (req.status !== "ADJUDICADA") return false;
        if (!showFullHistory && !searchFilter.trim() && !isWithinRecentDays(refDate)) {
          return false;
        }
      }
      if (activeTab === "canceladas") {
        if (req.status !== "CANCELADA") return false;
        if (!showFullHistory && !searchFilter.trim() && !isWithinRecentDays(refDate)) {
          return false;
        }
      }

      if (departmentFilter !== "TODOS" && req.departmentSection !== departmentFilter) {
        return false;
      }

      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase().trim();
        const numMatch = (req.requisitionNumber || "").toLowerCase().includes(q);
        const deptMatch = (req.departmentSection || "").toLowerCase().includes(q);
        const justMatch = (req.justification || "").toLowerCase().includes(q);
        const itemMatch = (req.items || []).some(
          (it) =>
            (it.product?.name || "").toLowerCase().includes(q) ||
            (it.product?.sku || "").toLowerCase().includes(q)
        );
        if (!numMatch && !deptMatch && !justMatch && !itemMatch) return false;
      }

      return true;
    });
  }, [requisitions, activeTab, departmentFilter, searchFilter, showFullHistory]);

  // Paginación
  const pagination = usePagination(filteredRequisitions, { initialPageSize: 10 });
  const { resetPage } = pagination;

  useEffect(() => {
    resetPage();
  }, [activeTab, departmentFilter, searchFilter, showFullHistory, resetPage]);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    setShowFullHistory(false);
  };

  const hasActiveFilters = Boolean(searchFilter.trim() || departmentFilter !== "TODOS");

  const handleClearFilters = () => {
    setSearchFilter("");
    setDepartmentFilter("TODOS");
  };

  // Pasar a Cotización
  const handleMoveToQuote = async (req: PurchaseRequisition) => {
    try {
      await PurchasingClientService.updateRequisitionStatus(req.id, "EN_COTIZACION");
      setFeedback({
        status: "success",
        message: `Preorden #${req.requisitionNumber} actualizada a En Cotización.`,
      });
      void loadData();
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message: getErrorMessage(err, "Error al actualizar estado."),
      });
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
            <FileText className="w-6 h-6 text-primary" />
            Preórdenes
          </h1>
          <p className="text-xs text-muted-foreground">
            Gestión de requisiciones internas, cotizaciones y adjudicación a órdenes de compra
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
            title="Actualizar listado de preórdenes"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            <span>Actualizar</span>
          </Button>

          <Button
            asChild
            className="h-9 gap-1.5 text-xs font-bold shadow-2xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link href="/purchasing/requisitions/new">
              <Plus className="w-4 h-4" />
              <span>Nueva Preorden</span>
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
          <AlertTitle>{feedback.status === "success" ? "Operación Exitosa" : "Error"}</AlertTitle>
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
        {/* KPI 1: Total Preórdenes */}
        <Card className="p-4 border-border shadow-2xs hover:border-primary/40 transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Total Preórdenes
            </span>
            <div className="text-2xl font-bold font-mono text-foreground">
              {metrics.total}
            </div>
            <span className="text-[11px] text-muted-foreground block">
              Historial completo
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </Card>

        {/* KPI 2: En Cotización */}
        <Card className="p-4 border-border shadow-2xs hover:border-amber-500/40 transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              En Cotización
            </span>
            <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {metrics.quotingCount}
            </div>
            <span className="text-[11px] text-muted-foreground block">
              Esperando ofertas
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
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
              Pendientes de cotizar
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-500/10 border border-slate-500/20 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
            <FileEdit className="w-5 h-5" />
          </div>
        </Card>

        {/* KPI 4: Adjudicadas (7 días) */}
        <Card className="p-4 border-border shadow-2xs hover:border-emerald-500/40 transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Adjudicadas (7d)
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {metrics.adjudicatedRecentCount}
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
              onClick={() => handleTabChange("en_cotizacion")}
              className={cn(
                "px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0",
                activeTab === "en_cotizacion"
                  ? "bg-amber-600 text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <span>En Cotización</span>
              <Badge
                variant={activeTab === "en_cotizacion" ? "secondary" : "outline"}
                className="text-[10px] px-1.5 py-0 font-mono"
              >
                {metrics.quotingCount}
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
              onClick={() => handleTabChange("adjudicadas")}
              title={`Adjudicadas en los últimos ${RECENT_DAYS_WINDOW} días`}
              className={cn(
                "px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0",
                activeTab === "adjudicadas"
                  ? "bg-emerald-600 text-white shadow-2xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <span>Adjudicadas (7d)</span>
              <Badge
                variant={activeTab === "adjudicadas" ? "secondary" : "outline"}
                className="text-[10px] px-1.5 py-0 font-mono"
              >
                {metrics.adjudicatedRecentCount}
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

          {(activeTab === "adjudicadas" || activeTab === "canceladas") &&
            !searchFilter.trim() && (
              <button
                type="button"
                onClick={() => setShowFullHistory((prev) => !prev)}
                className="text-[11px] font-medium text-primary hover:underline shrink-0 cursor-pointer px-1"
              >
                {showFullHistory
                  ? `Solo últimos ${RECENT_DAYS_WINDOW} días`
                  : `Ver historial completo (${
                      activeTab === "adjudicadas"
                        ? metrics.adjudicatedTotalCount
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
              placeholder="Buscar por N° preorden, departamento, insumo o justificación..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs bg-background"
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter("")}
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
                <option value="TODOS">Todos los departamentos</option>
                {departmentsList.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
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
          TABLA DE PREÓRDENES
         ======================================================== */}
      <Card className="overflow-hidden border-border shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="py-3 px-4 font-semibold text-xs">N° Preorden</TableHead>
              <TableHead className="py-3 px-4 font-semibold text-xs">Departamento</TableHead>
              <TableHead className="py-3 px-4 font-semibold text-xs">Fecha</TableHead>
              <TableHead className="py-3 px-4 text-center font-semibold text-xs">Renglones</TableHead>
              <TableHead className="py-3 px-4 text-center font-semibold text-xs">Estado</TableHead>
              <TableHead className="py-3 px-4 text-center font-semibold text-xs">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
                  Cargando preórdenes...
                </TableCell>
              </TableRow>
            ) : filteredRequisitions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground text-xs">
                  No se encontraron preórdenes registradas.
                </TableCell>
              </TableRow>
            ) : (
              pagination.paginatedItems.map((req) => {
                const badge = STATUS_BADGES[req.status] || {
                  label: req.status,
                  variant: "secondary" as const,
                  className: "",
                };
                const canAdjudicate = req.status === "EN_COTIZACION";
                const canMoveToQuote = req.status === "BORRADOR";

                return (
                  <TableRow
                    key={String(req.id)}
                    className="hover:bg-muted/40 transition-colors text-xs"
                  >
                    <TableCell className="py-3 px-4 font-mono font-bold text-foreground">
                      {req.requisitionNumber}
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <div className="font-semibold text-foreground">
                        {req.departmentSection}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                        {req.justification}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      {req.createdAt
                        ? new Date(req.createdAt).toLocaleDateString("es-VE")
                        : "-"}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center font-mono font-semibold text-foreground">
                      {req.items?.length || 0}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center">
                      <Badge variant={badge.variant} className={cn("text-[11px]", badge.className)}>
                        {badge.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="gap-1 h-7 text-xs font-semibold cursor-pointer"
                          title="Ver detalle de la preorden"
                        >
                          <Link href={`/purchasing/requisitions/${req.id}`}>
                            <Eye className="w-3.5 h-3.5" /> Ver
                          </Link>
                        </Button>

                        {canMoveToQuote && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleMoveToQuote(req)}
                            className="gap-1 h-7 text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/20 cursor-pointer"
                            title="Pasar a En Cotización"
                          >
                            <Send className="w-3.5 h-3.5" /> Cotizar
                          </Button>
                        )}

                        {canAdjudicate && (
                          <Button
                            asChild
                            variant="default"
                            size="sm"
                            className="gap-1 h-7 text-xs font-semibold cursor-pointer"
                            title="Adjudicar y Convertir en Orden de Compra"
                          >
                            <Link href={`/purchasing/requisitions/${req.id}/adjudicate`}>
                              <ArrowRight className="w-3.5 h-3.5" /> Adjudicar
                            </Link>
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
        <TablePagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
          pageSizeOptions={[10, 25, 50, 100]}
          entityName="preórdenes"
        />
      </Card>
    </div>
  );
}
