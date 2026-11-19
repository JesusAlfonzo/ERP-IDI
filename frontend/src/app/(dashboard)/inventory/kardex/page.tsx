"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { InventoryClientService } from "@/services/inventory.service";
import { downloadCsv } from "@/lib/csv";
import { AuthService } from "@/services/auth.service";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import type { KardexItem, MovementType } from "@/types/kardex";
import type { PaginationMeta } from "@/types/api";
import {
  FileSpreadsheet,
  RefreshCw,
  Search,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  FileText,
  Boxes,
  Layers,
  Wallet,
  SlidersHorizontal,
  ShieldAlert,
  ShoppingCart,
  ClipboardList,
  History,
  Clock,
  Tag,
  Package,
  ExternalLink,
  Printer,
  User,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TablePagination } from "@/components/common/TablePagination";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type KardexSubmodule =
  | "ALL"
  | "ALMACEN"
  | "COMPRAS"
  | "SOLICITUDES"
  | "PAGOS";

const SUBMODULE_CONFIG: Record<
  KardexSubmodule,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    types: MovementType[];
    activeClass: string;
  }
> = {
  ALL: {
    label: "Todos",
    icon: Boxes,
    types: [],
    activeClass: "data-[state=active]:text-primary",
  },
  ALMACEN: {
    label: "Almacén",
    icon: Layers,
    types: ["AJUSTE_INVENTARIO", "DESCARTE_MERMA"],
    activeClass:
      "data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400",
  },
  COMPRAS: {
    label: "Compras",
    icon: ShoppingCart,
    types: ["ENTRADA_COMPRA"],
    activeClass:
      "data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400",
  },
  SOLICITUDES: {
    label: "Solicitudes",
    icon: ClipboardList,
    types: ["DESPACHO_SOLICITUD"],
    activeClass:
      "data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400",
  },
  PAGOS: {
    label: "Pagos",
    icon: Wallet,
    types: ["PAGO_ORDEN", "EGRESO_DIRECTO"],
    activeClass:
      "data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400",
  },
};

const getMovementSubmodule = (
  type: MovementType,
): {
  name: string;
  variant: BadgeProps["variant"];
  Icon: React.ComponentType<{ className?: string }>;
} => {
  switch (type) {
    case "AJUSTE_INVENTARIO":
    case "DESCARTE_MERMA":
      return {
        name: "Almacén",
        variant: "warning",
        Icon: Layers,
      };
    case "ENTRADA_COMPRA":
      return {
        name: "Compras",
        variant: "info",
        Icon: ShoppingCart,
      };
    case "DESPACHO_SOLICITUD":
      return {
        name: "Solicitudes",
        variant: "purple",
        Icon: ClipboardList,
      };
    case "PAGO_ORDEN":
    case "EGRESO_DIRECTO":
      return {
        name: "Pagos",
        variant: "success",
        Icon: Wallet,
      };
    default:
      return {
        name: "General",
        variant: "outline",
        Icon: Boxes,
      };
  }
};

const MOVEMENT_LABELS: Record<
  MovementType,
  {
    label: string;
    variant: BadgeProps["variant"];
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  ENTRADA_COMPRA: {
    label: "Compra",
    variant: "success",
    icon: ArrowDownLeft,
  },
  TRASLADO_A_LABORATORIO: {
    label: "Traslado",
    variant: "purple",
    icon: ArrowUpRight,
  },
  DESPACHO_SOLICITUD: {
    label: "Despacho",
    variant: "warning",
    icon: ArrowUpRight,
  },
  AJUSTE_INVENTARIO: {
    label: "Ajuste",
    variant: "info",
    icon: SlidersHorizontal,
  },
  DESCARTE_MERMA: {
    label: "Merma",
    variant: "destructive",
    icon: ShieldAlert,
  },
  PAGO_ORDEN: {
    label: "Pago de Orden",
    variant: "success",
    icon: Wallet,
  },
  EGRESO_DIRECTO: {
    label: "Gasto Directo",
    variant: "rose",
    icon: Wallet,
  },
};

export default function KardexPage() {
  const router = useRouter();
  const [currentUser] = useState(() => AuthService.getCurrentUser());
  const isAdmin = currentUser?.roles?.includes("ADMINISTRADOR");

  const [items, setItems] = useState<KardexItem[]>([]);
  const [submoduleTab, setSubmoduleTab] = useState<KardexSubmodule>("ALL");
  const [meta, setMeta] = useState<PaginationMeta>({
    currentPage: 1,
    itemsPerPage: 15,
    totalPages: 1,
    totalItems: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Filtros de búsqueda
  const [selectedType, setSelectedType] = useState<MovementType | "">("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const debouncedSearchTerm = useDebounce(searchTerm, 350);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Modal de Detalle de Movimiento
  const [selectedItemForDetail, setSelectedItemForDetail] =
    useState<KardexItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleOpenDetail = (item: KardexItem) => {
    setSelectedItemForDetail(item);
    setIsDetailModalOpen(true);
  };

  const loadKardex = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await InventoryClientService.getKardex({
          page,
          limit: pageSize,
          type: selectedType,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          search: debouncedSearchTerm || undefined,
        });
        setItems(res.data || []);
        if (res.meta) {
          setMeta(res.meta);
        }
      } catch {
        // Interceptor global gestiona el error
      } finally {
        setLoading(false);
        if (isManualRefresh) {
          setTimeout(() => setRefreshing(false), 300);
        }
      }
    },
    [page, pageSize, selectedType, startDate, endDate, debouncedSearchTerm],
  );

  useEffect(() => {
    const init = async () => {
      if (!AuthService.isAuthenticated()) {
        router.replace("/login");
        return;
      }
      if (!isAdmin) {
        router.replace("/dashboard");
        return;
      }
      await loadKardex(false);
    };
    void init();
  }, [router, isAdmin, loadKardex]);

  const handleExportCSV = async () => {
    setDownloading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      downloadCsv(
        `movimientos_${today}.csv`,
        [
          "Fecha",
          "Tipo",
          "Módulo",
          "Detalle",
          "SKU",
          "Lote",
          "Cantidad",
          "Unidad",
          "Responsable",
          "Observación",
        ],
        displayedItems.map((row) => [
          new Date(row.createdAt).toLocaleString("es-VE"),
          MOVEMENT_LABELS[row.type]?.label || row.type,
          getMovementSubmodule(row.type).name,
          row.batch?.product?.name ||
            (row.type === "PAGO_ORDEN" ? "Pago de Orden" : "Gasto Directo"),
          row.batch?.product?.sku || (row.referenceDoc ?? "PAGO"),
          row.batch?.lotNumber || "N/A",
          row.quantity,
          row.batch?.product?.unitOfMeasure || "-",
          row.performedBy?.fullName || row.performedBy?.username || "Sistema",
          row.reason || "-",
        ]),
      );
    } finally {
      setDownloading(false);
    }
  };

  const displayedItems = useMemo(() => {
    return items.filter((row) => {
      if (submoduleTab === "ALL") return true;
      const allowed = SUBMODULE_CONFIG[submoduleTab]?.types || [];
      return allowed.includes(row.type);
    });
  }, [items, submoduleTab]);

  if (!isAdmin) {
    return (
      <div className="p-8 text-center max-w-md mx-auto mt-12">
        <Card className="border-border/80 shadow-2xs">
          <CardContent className="p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-foreground">
              Acceso Restringido
            </h2>
            <p className="text-xs text-muted-foreground">
              Solo los administradores pueden ver el historial de movimientos.
            </p>
            <Button
              onClick={() => router.push("/dashboard")}
              variant="default"
              size="sm"
              className="h-8 text-xs cursor-pointer"
            >
              Ir al Panel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-12">
      {/* ========================================================
          ENCABEZADO ESTANDARIZADO
         ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 shadow-2xs">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Movimientos
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Entradas, salidas, ajustes y pagos registrados
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/inventory/reports")}
            className="h-8 text-xs gap-1.5 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
            Reportes
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadKardex(true)}
            disabled={refreshing}
            className="h-8 text-xs gap-1.5 cursor-pointer"
          >
            <RefreshCw
              className={cn(
                "w-3.5 h-3.5",
                refreshing && "animate-spin text-primary",
              )}
            />
            Actualizar
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={() => void handleExportCSV()}
            disabled={downloading}
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs font-semibold cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {downloading ? "Exportando..." : "Exportar CSV"}
          </Button>
        </div>
      </div>

      {/* ========================================================
          PESTAÑAS POR MÓDULO + FILTROS
         ======================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <Tabs
          value={submoduleTab}
          onValueChange={(val) => setSubmoduleTab(val as KardexSubmodule)}
          className="w-full lg:w-auto"
        >
          <TabsList className="bg-muted/70 p-1 rounded-xl h-auto flex flex-wrap gap-1 justify-start border border-border/60">
            {Object.entries(SUBMODULE_CONFIG).map(([key, config]) => {
              const Icon = config.icon;
              const count =
                key === "ALL"
                  ? items.length
                  : items.filter((it) => config.types.includes(it.type)).length;
              return (
                <TabsTrigger
                  key={key}
                  value={key}
                  className={cn(
                    "gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs cursor-pointer",
                    config.activeClass,
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>
                    {config.label} ({count})
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          {/* Buscador */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar insumo, lote o código..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-8 text-xs h-9 bg-card border-border/80 rounded-xl shadow-2xs"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setPage(1);
                }}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Limpiar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro por tipo */}
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value as MovementType | "");
              setPage(1);
            }}
            className="h-9 bg-card border border-border/80 rounded-xl px-3 text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring outline-none cursor-pointer shadow-2xs"
          >
            <option value="">Todos los tipos</option>
            <option value="ENTRADA_COMPRA">Compra</option>
            <option value="DESPACHO_SOLICITUD">Despacho</option>
            <option value="AJUSTE_INVENTARIO">Ajuste</option>
            <option value="DESCARTE_MERMA">Merma</option>
            <option value="PAGO_ORDEN">Pago de Orden</option>
            <option value="EGRESO_DIRECTO">Gasto Directo</option>
          </select>

          {/* Rango de fechas */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card border border-border/80 rounded-xl px-2.5 h-9 shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="bg-transparent focus:outline-none text-foreground text-xs cursor-pointer"
              title="Desde"
            />
            <span className="text-muted-foreground">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="bg-transparent focus:outline-none text-foreground text-xs cursor-pointer"
              title="Hasta"
            />
          </div>

          {(searchTerm ||
            selectedType ||
            startDate ||
            endDate ||
            submoduleTab !== "ALL") && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setSelectedType("");
                setStartDate("");
                setEndDate("");
                setSubmoduleTab("ALL");
                setPage(1);
              }}
              className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* ========================================================
          TABLA DE MOVIMIENTOS
         ======================================================== */}
      <Card className="overflow-hidden border-border/80 shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20">
              <TableHead className="py-3 px-4 text-xs font-bold">
                Fecha
              </TableHead>
              <TableHead className="py-3 px-4 text-xs font-bold">
                Tipo
              </TableHead>
              <TableHead className="py-3 px-4 text-xs font-bold">
                Módulo
              </TableHead>
              <TableHead className="py-3 px-4 text-xs font-bold">
                Detalle
              </TableHead>
              <TableHead className="py-3 px-4 text-right text-xs font-bold">
                Cantidad
              </TableHead>
              <TableHead className="py-3 px-4 text-xs font-bold">
                Responsable
              </TableHead>
              <TableHead className="py-3 px-4 text-right text-xs font-bold">
                Acción
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-14 text-center text-muted-foreground"
                >
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                  <span className="text-xs">Cargando movimientos...</span>
                </TableCell>
              </TableRow>
            ) : displayedItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-14 text-center text-muted-foreground"
                >
                  <FileText className="w-7 h-7 text-muted-foreground/50 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-foreground">
                    Sin movimientos encontrados
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              displayedItems.map((row, index) => {
                const movement = MOVEMENT_LABELS[row.type];
                const submod = getMovementSubmodule(row.type);
                const isFinancial =
                  row.type === "PAGO_ORDEN" || row.type === "EGRESO_DIRECTO";
                const isPositive = row.quantity >= 0;

                return (
                  <TableRow
                    key={`${row.id ?? "mov"}-${row.batchId ?? ""}-${index}`}
                    onClick={() => handleOpenDetail(row)}
                    className="hover:bg-muted/40 transition-colors cursor-pointer"
                  >
                    {/* 1. Fecha */}
                    <TableCell className="py-3 px-4 whitespace-nowrap">
                      <div className="text-xs font-semibold text-foreground">
                        {new Date(row.createdAt).toLocaleDateString("es-VE")}
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {new Date(row.createdAt).toLocaleTimeString("es-VE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </TableCell>

                    {/* 2. Tipo */}
                    <TableCell className="py-3 px-4 whitespace-nowrap">
                      <Badge
                        variant={movement?.variant || "outline"}
                        className="text-[10px]"
                      >
                        {movement?.label || row.type}
                      </Badge>
                    </TableCell>

                    {/* 3. Módulo */}
                    <TableCell className="py-3 px-4 whitespace-nowrap">
                      <Badge
                        variant={submod.variant}
                        className="text-[10px]"
                      >
                        {submod.name}
                      </Badge>
                    </TableCell>

                    {/* 4. Detalle */}
                    <TableCell className="py-3 px-4">
                      {row.batch ? (
                        <div>
                          <div className="text-xs font-semibold text-foreground truncate max-w-[260px]">
                            {row.batch.product.name}
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            Lote #{row.batch.lotNumber} &bull;{" "}
                            {row.batch.product.sku}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <div className="text-xs font-semibold text-foreground">
                            {row.type === "PAGO_ORDEN"
                              ? "Pago de Orden"
                              : "Gasto Directo"}
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            Ref: {row.referenceDoc || "Sin referencia"}
                          </span>
                        </div>
                      )}
                    </TableCell>

                    {/* 5. Cantidad */}
                    <TableCell className="py-3 px-4 text-right whitespace-nowrap font-mono">
                      {isFinancial ? (
                        <Badge variant="outline" className="text-[10px]">
                          Pago
                        </Badge>
                      ) : (
                        <div>
                          <span
                            className={cn(
                              "text-xs font-bold inline-flex items-center gap-0.5",
                              isPositive
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400",
                            )}
                          >
                            {isPositive ? (
                              <ArrowDownLeft className="w-3 h-3" />
                            ) : (
                              <ArrowUpRight className="w-3 h-3" />
                            )}
                            {isPositive ? `+${row.quantity}` : row.quantity}{" "}
                            {row.batch?.product.unitOfMeasure || "UND"}
                          </span>
                          {row.balanceAfter !== null && (
                            <div className="text-[10px] text-muted-foreground">
                              Stock:{" "}
                              <strong className="text-foreground">
                                {Number(row.balanceAfter).toLocaleString("es-VE")}
                              </strong>
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>

                    {/* 6. Responsable */}
                    <TableCell className="py-3 px-4">
                      <div className="text-xs font-semibold text-foreground truncate max-w-[140px]">
                        {row.performedBy?.fullName ||
                          row.performedBy?.username ||
                          "Sistema"}
                      </div>
                      <span className="text-[10px] text-muted-foreground truncate block">
                        {row.performedBy?.department || "General"}
                      </span>
                    </TableCell>

                    {/* 7. Acción */}
                    <TableCell
                      className="py-3 px-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDetail(row)}
                        className="h-7 px-2.5 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                      >
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <TablePagination
          currentPage={meta.currentPage || page}
          totalPages={meta.totalPages || 1}
          pageSize={pageSize}
          totalItems={meta.totalItems}
          onPageChange={setPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(1);
          }}
          pageSizeOptions={[10, 15, 30, 50]}
          entityName="movimientos"
        />
      </Card>

      {/* ========================================================
          MODAL DE DETALLE DEL MOVIMIENTO
         ======================================================== */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-lg max-w-lg p-6 rounded-2xl border-border/80 space-y-4">
          {selectedItemForDetail &&
            (() => {
              const item = selectedItemForDetail;
              const movement = MOVEMENT_LABELS[item.type];
              const submod = getMovementSubmodule(item.type);
              const isPositive = item.quantity >= 0;
              const isFinancial =
                item.type === "PAGO_ORDEN" || item.type === "EGRESO_DIRECTO";

              return (
                <>
                  <DialogHeader>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge
                        variant={movement?.variant || "outline"}
                        className="text-[10px]"
                      >
                        {movement?.label || item.type}
                      </Badge>
                      <Badge variant={submod.variant} className="text-[10px]">
                        {submod.name}
                      </Badge>
                    </div>
                    <DialogTitle className="text-base font-bold text-foreground">
                      Movimiento #{item.id}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {new Date(item.createdAt).toLocaleDateString("es-VE")} a
                        las{" "}
                        {new Date(item.createdAt).toLocaleTimeString("es-VE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-3">
                    {/* Tarjeta 1: Insumo / Concepto */}
                    <div className="p-3.5 rounded-xl border border-border/80 bg-muted/15 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-primary" />
                          Detalle
                        </span>
                        {item.batch?.lotNumber && (
                          <Badge
                            variant="outline"
                            className="font-mono text-[10px]"
                          >
                            <Tag className="w-3 h-3 mr-1" />
                            Lote #{item.batch.lotNumber}
                          </Badge>
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-foreground">
                          {item.batch?.product?.name ||
                            (item.type === "PAGO_ORDEN"
                              ? "Pago de Orden"
                              : "Gasto Directo")}
                        </h3>
                        {item.batch?.product?.sku && (
                          <span className="text-[11px] font-mono text-muted-foreground">
                            SKU: {item.batch.product.sku}
                          </span>
                        )}
                      </div>

                      {item.batch?.expirationDate && (
                        <div className="flex items-center gap-1.5 pt-2 border-t border-border/50 text-xs text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Vencimiento:</span>
                          <strong className="font-mono text-foreground">
                            {new Date(
                              item.batch.expirationDate,
                            ).toLocaleDateString("es-VE")}
                          </strong>
                        </div>
                      )}
                    </div>

                    {/* Tarjeta 2: Cantidad y Stock Resultante */}
                    {!isFinancial && (
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                            Cantidad
                          </span>
                          <div
                            className={cn(
                              "text-xl font-bold font-mono flex items-baseline gap-1",
                              isPositive
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400",
                            )}
                          >
                            <span>
                              {isPositive ? `+${item.quantity}` : item.quantity}
                            </span>
                            <span className="text-xs font-normal text-muted-foreground">
                              {item.batch?.product?.unitOfMeasure || "UND"}
                            </span>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                            Stock Resultante
                          </span>
                          <div className="text-xl font-bold font-mono text-foreground flex items-baseline gap-1">
                            {item.balanceAfter !== null ? (
                              <>
                                <span>
                                  {Number(item.balanceAfter).toLocaleString(
                                    "es-VE",
                                  )}
                                </span>
                                <span className="text-xs font-normal text-muted-foreground">
                                  {item.batch?.product?.unitOfMeasure || "UND"}
                                </span>
                              </>
                            ) : (
                              <span className="text-xs font-normal text-muted-foreground">
                                No aplica
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tarjeta 3: Responsable y Referencia */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5" />
                          Responsable
                        </span>
                        <p className="text-xs font-bold text-foreground">
                          {item.performedBy?.fullName ||
                            item.performedBy?.username ||
                            "Sistema"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {item.performedBy?.department || "General"}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" />
                          Referencia
                        </span>
                        <p className="text-xs font-mono font-bold text-foreground">
                          {item.referenceDoc || "Sin referencia"}
                        </p>
                        {item.unitCost !== null &&
                          item.unitCost !== undefined && (
                            <p className="text-[11px] font-mono text-muted-foreground">
                              Costo: ${Number(item.unitCost).toFixed(2)}
                            </p>
                          )}
                      </div>
                    </div>

                    {/* Tarjeta 4: Observación */}
                    <div className="p-3.5 rounded-xl border border-border/80 bg-muted/15 space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Observación
                      </span>
                      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                        {item.reason || "Sin observaciones."}
                      </p>
                    </div>
                  </div>

                  <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 pt-3 border-t border-border/60">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="h-8 text-xs gap-1.5 cursor-pointer"
                    >
                      <Link
                        href={`/inventory/kardex/${item.id}`}
                        target="_blank"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Comprobante
                        <ExternalLink className="w-3 h-3 text-muted-foreground" />
                      </Link>
                    </Button>

                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setIsDetailModalOpen(false)}
                      className="h-8 text-xs cursor-pointer"
                    >
                      Cerrar
                    </Button>
                  </DialogFooter>
                </>
              );
            })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
