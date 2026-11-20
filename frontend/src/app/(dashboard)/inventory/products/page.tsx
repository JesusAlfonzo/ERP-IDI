"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  Suspense,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { InventoryClientService } from "@/services/inventory.service";
import { AuthService } from "@/services/auth.service";
import { usePagination } from "@/hooks/use-pagination";
import { TablePagination } from "@/components/common/TablePagination";
import type { Product, Category, Brand, Unit, StockBatch } from "@/types/inventory";
import { cn } from "@/lib/utils";

import {
  Package,
  Plus,
  Search,
  RefreshCw,
  FlaskConical,
  Layers,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  AlertOctagon,
  Boxes,
  Calendar,
  MapPin,
  ExternalLink,
  SlidersHorizontal,
} from "lucide-react";

import { Card, CardTitle } from "@/components/ui/card";
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

type ActiveTab = "todos" | "disponibles" | "bajo_stock" | "agotados" | "reactivos";

export default function ProductsPage() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [activeTab, setActiveTab] = useState<ActiveTab>("todos");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Slide-Over Drawer (Nivel 2: Ficha Técnica y Lotes)
  const [selectedProductForDetail, setSelectedProductForDetail] =
    useState<Product | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [catalogsData, productsData] = await Promise.all([
        InventoryClientService.getCatalogs().catch(() => ({
          categories: [],
          brands: [],
          units: [],
        })),
        InventoryClientService.getCatalog().catch(() => []),
      ]);

      setCategories(catalogsData.categories || []);
      setProducts(productsData || []);
    } catch {
      // Manejado globalmente
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (!AuthService.isAuthenticated()) {
      router.replace("/login");
      return;
    }
    const init = async () => {
      if (isMounted) await loadData();
    };
    void init();
    return () => {
      isMounted = false;
    };
  }, [router, loadData]);

  // Métricas rápidas para KPIs y Tabs
  const totalProducts = products.length;
  const availableCount = useMemo(
    () =>
      products.filter(
        (p) => Number(p.totalStock ?? 0) > Number(p.minStockAlert ?? 0)
      ).length,
    [products]
  );
  const lowStockCount = useMemo(
    () =>
      products.filter(
        (p) =>
          Number(p.totalStock ?? 0) > 0 &&
          Number(p.totalStock ?? 0) <= Number(p.minStockAlert ?? 0)
      ).length,
    [products]
  );
  const depletedCount = useMemo(
    () => products.filter((p) => Number(p.totalStock ?? 0) <= 0).length,
    [products]
  );
  const reagentsCount = useMemo(
    () => products.filter((p) => Boolean(p.isReagent)).length,
    [products]
  );

  // Filtrado reactivo en memoria (0ms lag)
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const total = Number(p.totalStock ?? 0);
      const minAlert = Number(p.minStockAlert ?? 0);

      // Pestaña
      if (activeTab === "disponibles" && !(total > minAlert)) return false;
      if (activeTab === "bajo_stock" && !(total > 0 && total <= minAlert))
        return false;
      if (activeTab === "agotados" && !(total <= 0)) return false;
      if (activeTab === "reactivos" && !p.isReagent) return false;

      // Categoría
      if (
        categoryFilter &&
        String(p.categoryId || p.category?.id) !== categoryFilter
      ) {
        return false;
      }

      // Buscador
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const nameMatch = (p.name || "").toLowerCase().includes(q);
        const skuMatch = (p.sku || "").toLowerCase().includes(q);
        const barMatch = (p.barcode || "").toLowerCase().includes(q);
        const descMatch = (p.description || "").toLowerCase().includes(q);
        if (!nameMatch && !skuMatch && !barMatch && !descMatch) return false;
      }

      return true;
    });
  }, [products, activeTab, categoryFilter, search]);

  const pagination = usePagination(filteredProducts, { initialPageSize: 10 });

  const hasActiveFilters = Boolean(search.trim() || categoryFilter);

  const handleClearFilters = () => {
    setSearch("");
    setCategoryFilter("");
  };

  const getStockBadge = (
    totalStock: number = 0,
    minStockAlert: number = 0
  ) => {
    if (totalStock <= 0) {
      return {
        label: "Agotado",
        variant: "destructive" as const,
        className:
          "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
      };
    }
    if (totalStock <= minStockAlert) {
      return {
        label: "Bajo Stock",
        variant: "warning" as const,
        className:
          "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
      };
    }
    return {
      label: "Disponible",
      variant: "success" as const,
      className:
        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    };
  };

  const getBatchStatusVariant = (
    status: string
  ): "success" | "warning" | "destructive" | "secondary" | "default" => {
    switch (status) {
      case "DISPONIBLE":
        return "success";
      case "EN_CUARENTENA":
      case "CUARENTENA":
        return "warning";
      case "DEFECTUOSO":
      case "RECHAZADO":
      case "VENCIDO":
        return "destructive";
      case "AGOTADO":
        return "secondary";
      default:
        return "default";
    }
  };

  const formatExpirationDate = (dateStr: string | null) => {
    if (!dateStr) return "Sin expiración";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("es-VE", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const handleOpenDetail = (product: Product) => {
    setSelectedProductForDetail(product);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* ========================================================
          ENCABEZADO ESTANDARIZADO
         ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            Inventario
          </h1>
          <p className="text-xs text-muted-foreground">
            Control de existencias físicas, reactivos clínicos y trazabilidad de lotes
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-9 gap-1.5 text-xs cursor-pointer shadow-2xs"
            title="Actualizar listado de productos"
          >
            <RefreshCw
              className={cn("w-3.5 h-3.5", loading && "animate-spin")}
            />
            <span>Actualizar</span>
          </Button>

          <Button
            asChild
            className="h-9 gap-1.5 text-xs font-bold shadow-2xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link href="/inventory/products/new">
              <Plus className="w-4 h-4" />
              <span>Registrar Insumo</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* ========================================================
          4 TARJETAS KPI ESTANDARIZADAS
         ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Insumos */}
        <Card className="p-4 border-border shadow-2xs hover:border-primary/40 transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Total Insumos
            </span>
            <div className="text-2xl font-bold font-mono text-foreground">
              {totalProducts}
            </div>
            <span className="text-[11px] text-muted-foreground block">
              Ítems catalogados en sistema
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
        </Card>

        {/* KPI 2: Stock Disponible */}
        <Card className="p-4 border-border shadow-2xs hover:border-emerald-500/40 transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Stock Disponible
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {availableCount}
            </div>
            <span className="text-[11px] text-muted-foreground block">
              Existencias sobre el mínimo
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>

        {/* KPI 3: Bajo Stock */}
        <Card className="p-4 border-border shadow-2xs hover:border-amber-500/40 transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Bajo Stock
            </span>
            <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {lowStockCount}
            </div>
            <span className="text-[11px] text-muted-foreground block">
              En punto de reposición
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </Card>

        {/* KPI 4: Agotados */}
        <Card className="p-4 border-border shadow-2xs hover:border-rose-500/40 transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Agotados
            </span>
            <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
              {depletedCount}
            </div>
            <span className="text-[11px] text-muted-foreground block">
              Sin existencias físicas (0)
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
              {totalProducts}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("disponibles")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0",
              activeTab === "disponibles"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <span>Disponibles</span>
            <Badge
              variant={activeTab === "disponibles" ? "secondary" : "outline"}
              className="text-[10px] px-1.5 py-0 font-mono"
            >
              {availableCount}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("bajo_stock")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0",
              activeTab === "bajo_stock"
                ? "bg-amber-600 text-white shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <span>Bajo Stock</span>
            <Badge
              variant={activeTab === "bajo_stock" ? "secondary" : "outline"}
              className="text-[10px] px-1.5 py-0 font-mono"
            >
              {lowStockCount}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("agotados")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0",
              activeTab === "agotados"
                ? "bg-rose-600 text-white shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <span>Agotados</span>
            <Badge
              variant={activeTab === "agotados" ? "secondary" : "outline"}
              className="text-[10px] px-1.5 py-0 font-mono"
            >
              {depletedCount}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("reactivos")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0",
              activeTab === "reactivos"
                ? "bg-purple-600 text-white shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Reactivos</span>
            <Badge
              variant={activeTab === "reactivos" ? "secondary" : "outline"}
              className="text-[10px] px-1.5 py-0 font-mono"
            >
              {reagentsCount}
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
              placeholder="Buscar por SKU, nombre, descripción o código de barras..."
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
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 bg-background border border-input rounded-md px-2.5 text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring cursor-pointer"
            >
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
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
          TABLA PRINCIPAL DE INVENTARIO
         ======================================================== */}
      <Card className="border-border shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40 text-[11px] uppercase tracking-wider">
              <TableRow>
                <TableHead className="w-32 py-3 px-4 font-semibold">SKU</TableHead>
                <TableHead className="min-w-[260px] py-3 px-4 font-semibold">
                  Insumo / Reactivo
                </TableHead>
                <TableHead className="w-40 py-3 px-4 font-semibold">
                  Categoría
                </TableHead>
                <TableHead className="w-24 py-3 px-4 text-center font-semibold">
                  Unidad
                </TableHead>
                <TableHead className="w-36 py-3 px-4 text-right font-semibold">
                  Stock Total
                </TableHead>
                <TableHead className="w-24 py-3 px-4 text-center font-semibold">
                  Lotes
                </TableHead>
                <TableHead className="w-32 py-3 px-4 text-center font-semibold">
                  Estado
                </TableHead>
                <TableHead className="w-32 py-3 px-4 text-right font-semibold">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-12 text-center text-muted-foreground text-xs"
                  >
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                    Cargando existencias del inventario...
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-12 text-center text-muted-foreground text-xs"
                  >
                    <Package className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
                    {hasActiveFilters
                      ? "No se encontraron insumos que coincidan con los filtros aplicados."
                      : "No hay insumos registrados en esta categoría."}
                  </TableCell>
                </TableRow>
              ) : (
                pagination.paginatedItems.map((p, index) => {
                  const totalStock = Number(p.totalStock ?? 0);
                  const minAlert = Number(p.minStockAlert ?? 0);
                  const badge = getStockBadge(totalStock, minAlert);
                  const unitAbbr =
                    p.baseUnit?.abbreviation || p.baseUnit?.name || "UND";
                  const batchesCount = p.batches?.length ?? 0;

                  return (
                    <TableRow
                      key={`${p.id}-${index}`}
                      className="hover:bg-muted/40 transition-colors"
                    >
                      {/* SKU */}
                      <TableCell className="py-3 px-4 font-mono font-bold text-xs text-foreground whitespace-nowrap">
                        {p.sku || `#${p.id}`}
                      </TableCell>

                      {/* Insumo */}
                      <TableCell className="py-3 px-4 max-w-xs sm:max-w-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-foreground">
                            {p.name}
                          </span>
                          {p.isReagent && (
                            <Badge
                              variant="purple"
                              className="text-[10px] gap-1 shrink-0 py-0 px-1.5"
                            >
                              <FlaskConical className="w-2.5 h-2.5" />
                              Reactivo
                            </Badge>
                          )}
                        </div>
                        {p.description && (
                          <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {p.description}
                          </div>
                        )}
                      </TableCell>

                      {/* Categoría */}
                      <TableCell className="py-3 px-4 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                          <span>{p.category?.name || "Sin categoría"}</span>
                        </span>
                      </TableCell>

                      {/* Unidad Base */}
                      <TableCell className="py-3 px-4 text-center font-semibold text-xs text-foreground">
                        {unitAbbr}
                      </TableCell>

                      {/* Stock Físico Total */}
                      <TableCell className="py-3 px-4 text-right font-mono font-bold text-xs text-foreground">
                        {totalStock}{" "}
                        <span className="text-[10px] font-normal text-muted-foreground font-sans">
                          {unitAbbr}
                        </span>
                      </TableCell>

                      {/* Lotes */}
                      <TableCell className="py-3 px-4 text-center">
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] bg-muted/30"
                        >
                          {batchesCount} {batchesCount === 1 ? "lote" : "lotes"}
                        </Badge>
                      </TableCell>

                      {/* Estado */}
                      <TableCell className="py-3 px-4 text-center">
                        <Badge
                          variant="outline"
                          className={cn("text-[11px] font-semibold py-0.5", badge.className)}
                        >
                          {badge.label}
                        </Badge>
                      </TableCell>

                      {/* Acciones */}
                      <TableCell className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDetail(p)}
                            className="h-7 text-xs font-semibold gap-1.5 bg-indigo-50/80 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/50 cursor-pointer shadow-2xs"
                            title="Ver Ficha y Lotes Físicos"
                          >
                            <Boxes className="w-3.5 h-3.5" />
                            <span>Ver Lotes</span>
                          </Button>

                          <Button
                            asChild
                            variant="ghost"
                            size="icon-sm"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Ir a página técnica del insumo"
                          >
                            <Link href={`/inventory/products/${p.id}`}>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginación Estandarizada al Ras */}
        <TablePagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
          pageSizeOptions={[10, 25, 50, 100]}
          entityName="insumos"
        />
      </Card>

      {/* ========================================================
          NIVEL 2: FICHA DETALLADA / LOTES (DRAWER SLIDE-OVER)
         ======================================================== */}
      {isDetailOpen && selectedProductForDetail && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-3xl bg-background border-l border-border h-full shadow-2xl flex flex-col overflow-y-auto animate-in slide-in-from-right duration-200">
            {/* Header del Drawer */}
            <div className="p-5 border-b border-border bg-muted/30 flex items-start justify-between gap-4 sticky top-0 z-10 backdrop-blur-xs">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="indigo" className="font-mono text-xs font-bold">
                    {selectedProductForDetail.sku ||
                      `#${selectedProductForDetail.id}`}
                  </Badge>
                  {selectedProductForDetail.isReagent ? (
                    <Badge variant="purple" className="gap-1 text-xs">
                      <FlaskConical className="w-3 h-3" /> Reactivo Clínico
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-border/60 bg-muted/20 text-muted-foreground text-xs"
                    >
                      Insumo General
                    </Badge>
                  )}
                </div>
                <h2 className="text-lg font-bold text-foreground leading-tight truncate">
                  {selectedProductForDetail.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Ficha de existencias físicas y auditoría de lotes
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs font-semibold shadow-2xs"
                >
                  <Link
                    href={`/inventory/adjustments/new?productId=${selectedProductForDetail.id}`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                    <span>Ajustar Stock</span>
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                >
                  <Link
                    href={`/inventory/products/${selectedProductForDetail.id}`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Página Completa</span>
                  </Link>
                </Button>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setIsDetailOpen(false)}
                  className="cursor-pointer"
                  title="Cerrar ficha"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Contenido del Drawer */}
            <div className="p-6 space-y-6 flex-1 text-xs">
              {/* Tarjetas de Métricas Rápidas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="p-3.5 shadow-2xs border-border space-y-1">
                  <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block">
                    Stock Físico
                  </span>
                  <span className="text-xl font-bold font-mono text-foreground block">
                    {Number(selectedProductForDetail.totalStock ?? 0)}{" "}
                    <span className="text-xs font-sans text-muted-foreground font-normal">
                      {selectedProductForDetail.baseUnit?.abbreviation}
                    </span>
                  </span>
                </Card>

                <Card className="p-3.5 shadow-2xs border-border space-y-1">
                  <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block">
                    Estado Actual
                  </span>
                  <div>
                    {(() => {
                      const total = Number(
                        selectedProductForDetail.totalStock ?? 0
                      );
                      const minAlert = Number(
                        selectedProductForDetail.minStockAlert ?? 0
                      );
                      const b = getStockBadge(total, minAlert);
                      return (
                        <Badge
                          variant="outline"
                          className={cn("text-xs font-semibold py-0.5", b.className)}
                        >
                          {b.label}
                        </Badge>
                      );
                    })()}
                  </div>
                </Card>

                <Card className="p-3.5 shadow-2xs border-border space-y-1">
                  <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block">
                    Stock Mínimo
                  </span>
                  <span className="text-xl font-bold font-mono text-foreground block">
                    {selectedProductForDetail.minStockAlert ?? 0}{" "}
                    <span className="text-xs font-sans text-muted-foreground font-normal">
                      {selectedProductForDetail.baseUnit?.abbreviation}
                    </span>
                  </span>
                </Card>

                <Card className="p-3.5 shadow-2xs border-border space-y-1">
                  <span className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider block">
                    Lotes Activos
                  </span>
                  <span className="text-xl font-bold font-mono text-primary block">
                    {selectedProductForDetail.batches?.length ?? 0}
                  </span>
                </Card>
              </div>

              {/* Ficha Maestra: Parámetros Técnicos */}
              <Card className="p-4 space-y-3 shadow-2xs border-border">
                <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border pb-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <span>Especificaciones del Insumo</span>
                </CardTitle>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Categoría:</span>
                    <span className="font-semibold text-foreground">
                      {selectedProductForDetail.category?.name ||
                        "Sin categoría"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">
                      Marca Comercial:
                    </span>
                    <span className="font-semibold text-foreground">
                      {selectedProductForDetail.brand?.name || "Genérico"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">
                      Unidad de Consumo:
                    </span>
                    <span className="font-semibold text-foreground">
                      {selectedProductForDetail.baseUnit?.name} (
                      {selectedProductForDetail.baseUnit?.abbreviation})
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">
                      Empaque de Compra:
                    </span>
                    <span className="font-semibold text-foreground">
                      {selectedProductForDetail.purchaseUnit &&
                      (selectedProductForDetail.purchaseUnitId ||
                        selectedProductForDetail.purchaseUnit?.id) !==
                        (selectedProductForDetail.baseUnitId ||
                          selectedProductForDetail.baseUnit?.id)
                        ? `${selectedProductForDetail.purchaseUnit.name} (${selectedProductForDetail.purchaseUnit.abbreviation})`
                        : "Sin empaque secundario (1:1)"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">
                      Código de Barras / Ref:
                    </span>
                    <span className="font-mono text-foreground font-semibold">
                      {selectedProductForDetail.barcode || "No asignado"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">
                      Régimen Fiscal:
                    </span>
                    <span className="font-semibold text-foreground">
                      {selectedProductForDetail.isTaxExempt
                        ? "Exento de IVA"
                        : "Gravable con IVA"}
                    </span>
                  </div>

                  {selectedProductForDetail.description && (
                    <div className="sm:col-span-2 pt-1">
                      <span className="text-muted-foreground block mb-1 font-semibold">
                        Descripción Técnica:
                      </span>
                      <p className="p-3 bg-muted/30 rounded-lg text-foreground leading-relaxed border border-border">
                        {selectedProductForDetail.description}
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Sub-tabla: Lotes Físicos */}
              <Card className="overflow-hidden shadow-2xs border-border">
                <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-primary" />
                    <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Lotes Físicos en Existencia
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs bg-muted">
                    {selectedProductForDetail.batches?.length ?? 0} lote(s)
                  </Badge>
                </div>

                {!selectedProductForDetail.batches ||
                selectedProductForDetail.batches.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground space-y-2">
                    <Boxes className="w-8 h-8 mx-auto stroke-[1.5] text-muted-foreground/60" />
                    <p className="text-xs font-medium">
                      No hay lotes físicos registrados para este insumo.
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Los lotes se crean automáticamente al recibir órdenes de compra o registrar entradas de inventario.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-muted/40 text-[11px] uppercase tracking-wider">
                      <TableRow>
                        <TableHead className="py-2.5 px-3 font-semibold">
                          N° de Lote
                        </TableHead>
                        <TableHead className="py-2.5 px-3 font-semibold">
                          Vencimiento
                        </TableHead>
                        <TableHead className="py-2.5 px-3 font-semibold">
                          Ubicación
                        </TableHead>
                        <TableHead className="py-2.5 px-3 text-center font-semibold">
                          Estado
                        </TableHead>
                        <TableHead className="py-2.5 px-3 text-right font-semibold">
                          Saldo
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedProductForDetail.batches.map(
                        (batch: StockBatch, index: number) => {
                          const variant = getBatchStatusVariant(batch.status);
                          return (
                            <TableRow
                              key={`${batch.id ?? "batch"}-${index}`}
                              className="hover:bg-muted/40 transition-colors"
                            >
                              {/* N° Lote */}
                              <TableCell className="py-2.5 px-3 font-mono font-bold text-xs text-amber-700 dark:text-amber-400">
                                #{batch.lotNumber}
                              </TableCell>

                              {/* Vencimiento */}
                              <TableCell className="py-2.5 px-3 text-muted-foreground whitespace-nowrap text-xs">
                                <span className="inline-flex items-center gap-1 font-mono">
                                  <Calendar className="w-3 h-3 text-muted-foreground/70" />
                                  {formatExpirationDate(batch.expirationDate)}
                                </span>
                              </TableCell>

                              {/* Ubicación Física */}
                              <TableCell className="py-2.5 px-3 text-foreground text-xs">
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                                  <span>
                                    {batch.location?.name || "Sin asignar"}
                                  </span>
                                </span>
                              </TableCell>

                              {/* Estado */}
                              <TableCell className="py-2.5 px-3 text-center whitespace-nowrap">
                                <Badge variant={variant} className="text-[10px]">
                                  {batch.status}
                                </Badge>
                              </TableCell>

                              {/* Cantidad */}
                              <TableCell className="py-2.5 px-3 text-right font-mono font-bold text-xs text-foreground">
                                {Number(batch.currentQuantity)}{" "}
                                <span className="text-[10px] font-normal text-muted-foreground font-sans">
                                  {
                                    selectedProductForDetail.baseUnit
                                      ?.abbreviation
                                  }
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        }
                      )}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </div>

            {/* Footer del Drawer */}
            <div className="p-4 border-t border-border bg-muted/20 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDetailOpen(false)}
                className="cursor-pointer text-xs"
              >
                Cerrar Ficha
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
