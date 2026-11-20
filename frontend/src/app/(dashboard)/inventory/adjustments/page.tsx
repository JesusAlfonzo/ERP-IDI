"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { InventoryClientService } from "@/services/inventory.service";
import { AuthService } from "@/services/auth.service";
import type { AuthUser } from "@/types/auth";
import type { StockMovementRecord } from "@/types/adjustments";
import { TablePagination } from "@/components/common/TablePagination";
import { usePagination } from "@/hooks/use-pagination";
import { cn } from "@/lib/utils";

import {
  SlidersHorizontal,
  PlusCircle,
  MinusCircle,
  AlertOctagon,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  X,
  Search,
  RefreshCw,
  Eye,
  FileText,
  ExternalLink,
  User,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ActiveTab = "todos" | "entradas" | "salidas" | "mermas";

function getMovementCategory(
  m: StockMovementRecord
): "ENTRADA" | "SALIDA" | "MERMA" {
  if (m.type === "DESCARTE_MERMA") return "MERMA";
  const netQty = (m.items || []).reduce(
    (acc, it) => acc + Number(it.quantity || 0),
    0
  );
  if (netQty > 0) return "ENTRADA";
  return "SALIDA";
}

function getMovementBadge(m: StockMovementRecord) {
  const cat = getMovementCategory(m);
  if (cat === "ENTRADA") {
    return {
      label: "Entrada Ajuste",
      variant: "success" as const,
      className:
        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
      icon: PlusCircle,
    };
  }
  if (cat === "SALIDA") {
    return {
      label: "Salida Corrección",
      variant: "warning" as const,
      className:
        "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
      icon: MinusCircle,
    };
  }
  const notesLower = (m.notes || "").toLowerCase();
  const isExpired = notesLower.includes("venc") || notesLower.includes("expir");
  return {
    label: isExpired ? "Merma Vencimiento" : "Merma Rotura",
    variant: "destructive" as const,
    className:
      "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
    icon: AlertOctagon,
  };
}

function AdjustmentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryProductId = searchParams.get("productId");
  const querySuccessMessage = searchParams.get("successMessage");

  const [currentUser] = useState<AuthUser | null>(() =>
    AuthService.getCurrentUser()
  );

  const userRoles = currentUser?.roles || [];
  const isAuthorized =
    userRoles.includes("ADMINISTRADOR") ||
    userRoles.includes("ALMACENISTA") ||
    userRoles.includes("COORDINADOR") ||
    userRoles.includes("COORDINADOR_LABORATORIO");

  const canCreate =
    userRoles.includes("ADMINISTRADOR") || userRoles.includes("ALMACENISTA");

  // Listado histórico de movimientos
  const [movements, setMovements] = useState<StockMovementRecord[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(true);

  // Filtros de la tabla
  const [activeTab, setActiveTab] = useState<ActiveTab>("todos");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("TODOS");

  // Modal de Detalle / Auditoría
  const [selectedMovementForDetail, setSelectedMovementForDetail] =
    useState<StockMovementRecord | null>(null);

  // Mensaje de feedback opcional
  const [feedback, setFeedback] = useState<string | null>(
    querySuccessMessage || null
  );

  // Cargar movimientos históricos de ajustes y mermas
  const loadMovementsData = useCallback(async () => {
    setLoadingMovements(true);
    try {
      const res = await InventoryClientService.getMovements({
        limit: 200,
        types: ["AJUSTE_INVENTARIO", "DESCARTE_MERMA"],
      });
      setMovements(res.data || []);
    } catch {
      // Manejado globalmente
    } finally {
      setLoadingMovements(false);
    }
  }, []);

  // Inicialización
  useEffect(() => {
    if (!AuthService.isAuthenticated()) {
      router.replace("/login");
      return;
    }

    if (!isAuthorized) {
      setLoadingMovements(false);
      return;
    }

    // Si viene con productId, redirigir a la nueva página de creación con ese parámetro
    if (queryProductId) {
      router.replace(`/inventory/adjustments/new?productId=${queryProductId}`);
      return;
    }

    void loadMovementsData();
  }, [router, isAuthorized, queryProductId, loadMovementsData]);

  // KPIs de resumen
  const totalEntries = useMemo(
    () => movements.filter((m) => getMovementCategory(m) === "ENTRADA"),
    [movements]
  );
  const totalExits = useMemo(
    () => movements.filter((m) => getMovementCategory(m) === "SALIDA"),
    [movements]
  );
  const totalWastes = useMemo(
    () => movements.filter((m) => getMovementCategory(m) === "MERMA"),
    [movements]
  );

  const totalEntryUnits = useMemo(() => {
    return totalEntries.reduce((acc, m) => {
      const sum = (m.items || []).reduce(
        (s, it) => s + Math.max(0, Number(it.quantity || 0)),
        0
      );
      return acc + sum;
    }, 0);
  }, [totalEntries]);

  const totalExitUnits = useMemo(() => {
    return totalExits.reduce((acc, m) => {
      const sum = (m.items || []).reduce(
        (s, it) => s + Math.abs(Math.min(0, Number(it.quantity || 0))),
        0
      );
      return acc + sum;
    }, 0);
  }, [totalExits]);

  const totalWasteUnits = useMemo(() => {
    return totalWastes.reduce((acc, m) => {
      const sum = (m.items || []).reduce(
        (s, it) => s + Math.abs(Number(it.quantity || 0)),
        0
      );
      return acc + sum;
    }, 0);
  }, [totalWastes]);

  // Filtrado reactivo por pestaña, buscador y tipo
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const cat = getMovementCategory(m);

      // Pestaña activa
      if (activeTab === "entradas" && cat !== "ENTRADA") return false;
      if (activeTab === "salidas" && cat !== "SALIDA") return false;
      if (activeTab === "mermas" && cat !== "MERMA") return false;

      // Filtro de Tipo específico
      if (typeFilter !== "TODOS") {
        if (typeFilter === "ENTRADA" && cat !== "ENTRADA") return false;
        if (typeFilter === "SALIDA" && cat !== "SALIDA") return false;
        if (typeFilter === "MERMA" && cat !== "MERMA") return false;
      }

      // Buscador
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const refMatch = m.referenceNumber.toLowerCase().includes(q);
        const notesMatch = (m.notes || "").toLowerCase().includes(q);
        const userMatch = (
          m.createdBy?.fullName ||
          m.createdBy?.username ||
          ""
        )
          .toLowerCase()
          .includes(q);
        const itemMatch = (m.items || []).some((it) => {
          const prodName = (it.batch?.product?.name || "").toLowerCase();
          const sku = (it.batch?.product?.sku || "").toLowerCase();
          const lot = (it.batch?.lotNumber || "").toLowerCase();
          const loc = (it.batch?.location?.name || "").toLowerCase();
          return (
            prodName.includes(q) ||
            sku.includes(q) ||
            lot.includes(q) ||
            loc.includes(q)
          );
        });

        if (!refMatch && !notesMatch && !userMatch && !itemMatch) return false;
      }

      return true;
    });
  }, [movements, activeTab, typeFilter, search]);

  const pagination = usePagination(filteredMovements, { initialPageSize: 10 });

  const hasActiveFilters = Boolean(search.trim() || typeFilter !== "TODOS");

  const handleClearFilters = () => {
    setSearch("");
    setTypeFilter("TODOS");
  };

  return (
    <div className="space-y-6">
      {/* ========================================================
          ENCABEZADO ESTANDARIZADO
         ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <SlidersHorizontal className="w-6 h-6 text-primary" />
            Ajustes y Mermas
          </h1>
          <p className="text-xs text-muted-foreground">
            Historial de variaciones de stock, correcciones físicas y bajas registradas
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadMovementsData}
            disabled={loadingMovements}
            className="h-9 gap-1.5 text-xs cursor-pointer shadow-2xs"
            title="Actualizar listado de movimientos"
          >
            <RefreshCw
              className={cn("w-3.5 h-3.5", loadingMovements && "animate-spin")}
            />
            <span>Actualizar</span>
          </Button>

          {canCreate && (
            <Button
              type="button"
              onClick={() => router.push("/inventory/adjustments/new")}
              className="h-9 gap-1.5 text-xs font-bold shadow-2xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Registrar Ajuste</span>
            </Button>
          )}
        </div>
      </div>

      {!isAuthorized ? (
        <Card className="border-amber-200 dark:border-amber-900/50 p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">
              Módulo Restringido
            </h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              La visualización y registro de ajustes manuales de stock,
              donaciones y mermas es de competencia exclusiva del personal de
              Almacén, Coordinación y Administración.
            </p>
          </div>
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/inventory/kardex")}
            >
              Consultar Kardex de Movimientos
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* Mensaje de feedback de confirmación */}
          {feedback && (
            <Alert
              variant="default"
              className="animate-in fade-in duration-200 border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <AlertDescription className="font-medium text-xs flex items-center justify-between">
                <span>{feedback}</span>
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
            {/* KPI 1: Total Operaciones */}
            <Card className="p-4 border-border shadow-2xs hover:border-primary/40 transition-all flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Total Operaciones
                </span>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {movements.length}
                </div>
                <span className="text-[11px] text-muted-foreground block">
                  Ajustes y mermas registrados
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 flex items-center justify-center shrink-0">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
            </Card>

            {/* KPI 2: Entradas por Ajuste */}
            <Card className="p-4 border-border shadow-2xs hover:border-emerald-500/40 transition-all flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Entradas por Ajuste
                </span>
                <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {totalEntries.length}
                </div>
                <span className="text-[11px] text-muted-foreground block font-mono">
                  +{totalEntryUnits} unidades ingresadas
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <PlusCircle className="w-5 h-5" />
              </div>
            </Card>

            {/* KPI 3: Salidas por Corrección */}
            <Card className="p-4 border-border shadow-2xs hover:border-amber-500/40 transition-all flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Salidas por Corrección
                </span>
                <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                  {totalExits.length}
                </div>
                <span className="text-[11px] text-muted-foreground block font-mono">
                  -{totalExitUnits} unidades descontadas
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <MinusCircle className="w-5 h-5" />
              </div>
            </Card>

            {/* KPI 4: Mermas y Descartes */}
            <Card className="p-4 border-border shadow-2xs hover:border-rose-500/40 transition-all flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Mermas y Descartes
                </span>
                <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
                  {totalWastes.length}
                </div>
                <span className="text-[11px] text-muted-foreground block font-mono">
                  -{totalWasteUnits} unidades de baja
                </span>
              </div>
              <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertOctagon className="w-5 h-5" />
              </div>
            </Card>
          </div>

          {/* ========================================================
              PESTAÑAS, BUSCADOR Y FILTROS
             ======================================================== */}
          <Card className="p-4 border-border shadow-2xs space-y-3.5">
            {/* Pestañas de estado */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("todos")}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0",
                  activeTab === "todos"
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <span>Todos</span>
                <Badge
                  variant={activeTab === "todos" ? "secondary" : "outline"}
                  className="text-[10px] px-1.5 py-0 font-mono"
                >
                  {movements.length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("entradas")}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0",
                  activeTab === "entradas"
                    ? "bg-emerald-600 text-white shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <span>Entradas</span>
                <Badge
                  variant={activeTab === "entradas" ? "secondary" : "outline"}
                  className="text-[10px] px-1.5 py-0 font-mono"
                >
                  {totalEntries.length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("salidas")}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0",
                  activeTab === "salidas"
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <span>Salidas</span>
                <Badge
                  variant={activeTab === "salidas" ? "secondary" : "outline"}
                  className="text-[10px] px-1.5 py-0 font-mono"
                >
                  {totalExits.length}
                </Badge>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("mermas")}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0",
                  activeTab === "mermas"
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <span>Mermas</span>
                <Badge
                  variant={activeTab === "mermas" ? "secondary" : "outline"}
                  className="text-[10px] px-1.5 py-0 font-mono"
                >
                  {totalWastes.length}
                </Badge>
              </button>
            </div>

            {/* Barra de Búsqueda y Filtros */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por N° movimiento, insumo, SKU, lote o justificación..."
                  className="pl-9 h-9 text-xs bg-background"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-9 bg-background border border-input rounded-md px-2.5 text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  <option value="TODOS">Todos los tipos</option>
                  <option value="ENTRADA">Entrada por Ajuste</option>
                  <option value="SALIDA">Salida por Corrección</option>
                  <option value="MERMA">Mermas y Descartes</option>
                </select>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFilters}
                    className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Limpiar filtros</span>
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* ========================================================
              TABLA DE HISTORIAL DE AJUSTES Y MERMAS
             ======================================================== */}
          <Card className="border-border shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40 text-[11px] uppercase tracking-wider">
                  <TableRow>
                    <TableHead className="w-36 py-3 px-4 font-semibold">
                      Operación
                    </TableHead>
                    <TableHead className="w-32 py-3 px-4 font-semibold">
                      Fecha
                    </TableHead>
                    <TableHead className="min-w-[240px] py-3 px-4 font-semibold">
                      Insumo
                    </TableHead>
                    <TableHead className="w-36 py-3 px-4 font-semibold">
                      Lote / Ubicación
                    </TableHead>
                    <TableHead className="w-36 py-3 px-4 text-center font-semibold">
                      Tipo
                    </TableHead>
                    <TableHead className="w-28 py-3 px-4 text-right font-semibold">
                      Cantidad
                    </TableHead>
                    <TableHead className="w-36 py-3 px-4 font-semibold">
                      Responsable
                    </TableHead>
                    <TableHead className="w-20 py-3 px-4 text-right font-semibold">
                      Acción
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingMovements ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-12 text-center text-muted-foreground text-xs"
                      >
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                        Cargando historial de ajustes y mermas...
                      </TableCell>
                    </TableRow>
                  ) : filteredMovements.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-12 text-center text-muted-foreground text-xs"
                      >
                        <SlidersHorizontal className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
                        {hasActiveFilters
                          ? "No se encontraron movimientos que coincidan con los filtros aplicados."
                          : "No hay movimientos registrados en esta categoría."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagination.paginatedItems.map((m) => {
                      const badgeInfo = getMovementBadge(m);
                      const BadgeIcon = badgeInfo.icon;
                      const firstItem = m.items?.[0];
                      const totalItemCount = m.items?.length || 0;
                      const netQty = (m.items || []).reduce(
                        (acc, it) => acc + Number(it.quantity || 0),
                        0
                      );
                      const isPositive = netQty > 0;
                      const productUnit =
                        firstItem?.batch?.product?.baseUnit?.abbreviation ||
                        "UND";

                      return (
                        <TableRow
                          key={String(m.id)}
                          className="hover:bg-muted/40 transition-colors"
                        >
                          {/* N° Operación */}
                          <TableCell className="py-3 px-4 font-mono font-bold text-xs">
                            <span className="text-foreground block truncate">
                              {m.referenceNumber}
                            </span>
                            {m.notes && (
                              <span className="text-[10px] text-muted-foreground font-sans font-normal line-clamp-1 block mt-0.5">
                                {m.notes}
                              </span>
                            )}
                          </TableCell>

                          {/* Fecha */}
                          <TableCell className="py-3 px-4 text-xs font-mono">
                            <span className="text-foreground block">
                              {new Date(m.createdAt).toLocaleDateString(
                                "es-VE"
                              )}
                            </span>
                            <span className="text-[10px] text-muted-foreground block">
                              {new Date(m.createdAt).toLocaleTimeString(
                                "es-VE",
                                { hour: "2-digit", minute: "2-digit" }
                              )}
                            </span>
                          </TableCell>

                          {/* Insumo */}
                          <TableCell className="py-3 px-4">
                            {firstItem?.batch?.product ? (
                              <div>
                                <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                                  <span>{firstItem.batch.product.name}</span>
                                  {totalItemCount > 1 && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[9px] px-1 py-0"
                                    >
                                      +{totalItemCount - 1} más
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {firstItem.batch.product.sku && (
                                    <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded border border-border">
                                      {firstItem.batch.product.sku}
                                    </span>
                                  )}
                                  {firstItem.batch.product.category?.name && (
                                    <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.2 rounded font-medium">
                                      {firstItem.batch.product.category.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Múltiples insumos ({totalItemCount})
                              </span>
                            )}
                          </TableCell>

                          {/* Lote y Ubicación */}
                          <TableCell className="py-3 px-4 text-xs">
                            {firstItem?.batch ? (
                              <div className="space-y-0.5">
                                <span className="font-mono font-bold text-amber-700 dark:text-amber-400 block text-[11px]">
                                  #{firstItem.batch.lotNumber}
                                </span>
                                <span className="text-[10px] text-muted-foreground block truncate">
                                  {firstItem.batch.location?.name ||
                                    "Almacén Central"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>

                          {/* Tipo */}
                          <TableCell className="py-3 px-4 text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                "gap-1 text-[11px] font-semibold py-0.5 px-2",
                                badgeInfo.className
                              )}
                            >
                              <BadgeIcon className="w-3 h-3" />
                              <span>{badgeInfo.label}</span>
                            </Badge>
                          </TableCell>

                          {/* Cantidad */}
                          <TableCell className="py-3 px-4 text-right font-mono font-bold text-xs">
                            <span
                              className={cn(
                                isPositive
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-rose-600 dark:text-rose-400"
                              )}
                            >
                              {isPositive ? "+" : ""}
                              {netQty} {productUnit}
                            </span>
                          </TableCell>

                          {/* Responsable */}
                          <TableCell className="py-3 px-4 text-xs">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <span className="text-foreground truncate font-medium">
                                {m.createdBy?.fullName ||
                                  m.createdBy?.username ||
                                  "Sistema"}
                              </span>
                            </div>
                          </TableCell>

                          {/* Acciones */}
                          <TableCell className="py-3 px-4 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedMovementForDetail(m)}
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
                              title="Ver detalle del movimiento"
                            >
                              <Eye className="w-3.5 h-3.5 text-primary" />
                              <span>Ver</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Paginación estandarizada al ras */}
            <TablePagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              pageSize={pagination.pageSize}
              totalItems={pagination.totalItems}
              onPageChange={pagination.onPageChange}
              onPageSizeChange={pagination.onPageSizeChange}
              pageSizeOptions={[10, 25, 50]}
              entityName="movimientos"
            />
          </Card>
        </>
      )}

      {/* ========================================================
          MODAL: DETALLE DE MOVIMIENTO / AUDITORÍA TÉCNICA
         ======================================================== */}
      <Dialog
        open={Boolean(selectedMovementForDetail)}
        onOpenChange={(open) => {
          if (!open) setSelectedMovementForDetail(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto p-6">
          <DialogHeader className="pb-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 shadow-2xs">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span>Auditoría de Movimiento</span>
                  <Badge variant="outline" className="font-mono text-xs font-normal">
                    {selectedMovementForDetail?.referenceNumber}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Detalle registrado en el Kardex institucional
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedMovementForDetail && (
            <div className="space-y-4 pt-1 text-xs">
              {/* Tarjeta de Metadatos */}
              <div className="bg-muted/30 p-4 rounded-xl border border-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                    N° Referencia
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {selectedMovementForDetail.referenceNumber}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                    Fecha y Hora
                  </span>
                  <span className="font-mono text-foreground font-semibold">
                    {new Date(
                      selectedMovementForDetail.createdAt
                    ).toLocaleDateString("es-VE")}{" "}
                    {new Date(
                      selectedMovementForDetail.createdAt
                    ).toLocaleTimeString("es-VE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                    Tipo de Operación
                  </span>
                  <div>
                    {(() => {
                      const badge = getMovementBadge(selectedMovementForDetail);
                      const Icon = badge.icon;
                      return (
                        <Badge
                          variant="outline"
                          className={cn(
                            "gap-1 text-[10px] font-semibold py-0.2",
                            badge.className
                          )}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </Badge>
                      );
                    })()}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                    Responsable
                  </span>
                  <span className="text-foreground font-medium truncate block">
                    {selectedMovementForDetail.createdBy?.fullName ||
                      selectedMovementForDetail.createdBy?.username ||
                      "Sistema"}
                  </span>
                </div>
              </div>

              {/* Justificación Técnica */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Justificación Técnica Registrada
                </Label>
                <div className="p-3 bg-muted/40 border border-border rounded-xl text-foreground font-sans leading-relaxed text-xs">
                  {selectedMovementForDetail.notes ||
                    "Sin justificación técnica adicional registrada."}
                </div>
              </div>

              {/* Renglones / Ítems Afectados */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Renglones de Inventario Modificados
                </Label>

                <div className="border border-border rounded-xl overflow-hidden shadow-2xs">
                  <Table>
                    <TableHeader className="bg-muted/40 text-[11px] uppercase tracking-wider">
                      <TableRow>
                        <TableHead className="py-2.5 px-3 font-semibold">
                          Insumo
                        </TableHead>
                        <TableHead className="py-2.5 px-3 font-semibold">
                          Lote
                        </TableHead>
                        <TableHead className="py-2.5 px-3 font-semibold">
                          Ubicación
                        </TableHead>
                        <TableHead className="py-2.5 px-3 text-right font-semibold">
                          Variación
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedMovementForDetail.items.map((it, idx) => {
                        const qtyNum = Number(it.quantity);
                        const isPos = qtyNum > 0;
                        const unitAbbr =
                          it.batch?.product?.baseUnit?.abbreviation || "UND";

                        return (
                          <TableRow key={it.id ? String(it.id) : idx}>
                            <TableCell className="py-2.5 px-3">
                              <div className="font-semibold text-xs text-foreground">
                                {it.batch?.product?.name || "Insumo"}
                              </div>
                              {it.batch?.product?.sku && (
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  SKU: {it.batch.product.sku}
                                </span>
                              )}
                            </TableCell>

                            <TableCell className="py-2.5 px-3 font-mono font-bold text-xs text-amber-700 dark:text-amber-400">
                              #{it.batch?.lotNumber || "N/A"}
                            </TableCell>

                            <TableCell className="py-2.5 px-3 text-xs text-muted-foreground">
                              {it.batch?.location?.name || "Almacén Central"}
                            </TableCell>

                            <TableCell className="py-2.5 px-3 text-right font-mono font-bold text-xs">
                              <span
                                className={cn(
                                  isPos
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-rose-600 dark:text-rose-400"
                                )}
                              >
                                {isPos ? "+" : ""}
                                {qtyNum} {unitAbbr}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <DialogFooter className="pt-3 border-b-0 flex items-center justify-between sm:justify-between w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    router.push(
                      `/inventory/kardex?search=${selectedMovementForDetail.referenceNumber}`
                    )
                  }
                  className="gap-1.5 text-xs cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Ver en Kardex</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => setSelectedMovementForDetail(null)}
                  className="cursor-pointer"
                >
                  Cerrar
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdjustmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[70vh] flex flex-col items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-primary mb-2" />
          <span className="text-xs text-muted-foreground font-medium">
            Cargando módulo de ajustes y mermas...
          </span>
        </div>
      }
    >
      <AdjustmentsContent />
    </Suspense>
  );
}
