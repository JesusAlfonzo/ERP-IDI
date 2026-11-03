"use client";

import { useEffect, useState, useCallback } from "react";
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
  ChevronLeft,
  ChevronRight,
  FileText,
  Eye,
  Boxes,
  Layers,
  Wallet,
  SlidersHorizontal,
  ShieldAlert,
  ShoppingCart,
  FlaskConical,
  ClipboardList,
  History,
  Clock,
  Tag,
  Package,
  ExternalLink,
  Printer,
  User,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CustomReportBuilder } from "@/components/reports/CustomReportBuilder";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type KardexSubmodule =
  | "ALL"
  | "ALMACEN"
  | "COMPRAS"
  | "LABORATORIO"
  | "SOLICITUDES"
  | "TESORERIA";

const SUBMODULE_CONFIG: Record<
  KardexSubmodule,
  {
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    types: MovementType[];
    badgeClass: string;
  }
> = {
  ALL: {
    label: "Todos los Módulos",
    description: "Trazabilidad completa en todo el sistema",
    icon: Boxes,
    types: [],
    badgeClass: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-border",
  },
  ALMACEN: {
    label: "Almacén",
    description: "Ajustes físicos, conteos y mermas",
    icon: Layers,
    types: ["AJUSTE_INVENTARIO", "DESCARTE_MERMA"],
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
  },
  COMPRAS: {
    label: "Compras",
    description: "Entradas por recepción a proveedores",
    icon: ShoppingCart,
    types: ["ENTRADA_COMPRA"],
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300",
  },
  LABORATORIO: {
    label: "Laboratorio",
    description: "Traslados a cavas, neveras y reactivos",
    icon: FlaskConical,
    types: ["TRASLADO_A_LABORATORIO"],
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300",
  },
  SOLICITUDES: {
    label: "Solicitudes",
    description: "Despachos a salas y departamentos clínicos",
    icon: ClipboardList,
    types: ["DESPACHO_SOLICITUD"],
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300",
  },
  TESORERIA: {
    label: "Tesorería",
    description: "Pagos de órdenes y egresos directos",
    icon: Wallet,
    types: ["PAGO_ORDEN", "EGRESO_DIRECTO"],
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300",
  },
};

const getMovementSubmodule = (
  type: MovementType,
): {
  name: string;
  badgeClass: string;
  Icon: React.ComponentType<{ className?: string }>;
} => {
  switch (type) {
    case "AJUSTE_INVENTARIO":
    case "DESCARTE_MERMA":
      return {
        name: "Almacén",
        badgeClass:
          "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/40",
        Icon: Layers,
      };
    case "ENTRADA_COMPRA":
      return {
        name: "Compras",
        badgeClass:
          "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/40",
        Icon: ShoppingCart,
      };
    case "TRASLADO_A_LABORATORIO":
      return {
        name: "Laboratorio",
        badgeClass:
          "bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/40",
        Icon: FlaskConical,
      };
    case "DESPACHO_SOLICITUD":
      return {
        name: "Solicitudes",
        badgeClass:
          "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/40",
        Icon: ClipboardList,
      };
    case "PAGO_ORDEN":
    case "EGRESO_DIRECTO":
      return {
        name: "Tesorería",
        badgeClass:
          "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/40",
        Icon: Wallet,
      };
    default:
      return {
        name: "General",
        badgeClass: "bg-slate-50 text-slate-700 border-slate-200",
        Icon: Boxes,
      };
  }
};

const MOVEMENT_LABELS: Record<
  MovementType,
  {
    label: string;
    shortLabel: string;
    badgeClass: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  ENTRADA_COMPRA: {
    label: "Entrada por Compra",
    shortLabel: "Entrada Compra",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40",
    icon: ArrowDownLeft,
  },
  TRASLADO_A_LABORATORIO: {
    label: "Salida a Laboratorio",
    shortLabel: "Salida Laboratorio",
    badgeClass:
      "bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/40",
    icon: ArrowUpRight,
  },
  DESPACHO_SOLICITUD: {
    label: "Despacho a Sala",
    shortLabel: "Despacho Sala",
    badgeClass:
      "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40",
    icon: ArrowUpRight,
  },
  AJUSTE_INVENTARIO: {
    label: "Ajuste de Inventario",
    shortLabel: "Ajuste Stock",
    badgeClass:
      "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/40",
    icon: SlidersHorizontal,
  },
  DESCARTE_MERMA: {
    label: "Merma / Descarte",
    shortLabel: "Merma / Baja",
    badgeClass:
      "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40",
    icon: ShieldAlert,
  },
  PAGO_ORDEN: {
    label: "Pago de Orden de Compra",
    shortLabel: "Pago de Orden",
    badgeClass:
      "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40",
    icon: Wallet,
  },
  EGRESO_DIRECTO: {
    label: "Egreso Directo Institucional",
    shortLabel: "Egreso Directo",
    badgeClass:
      "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40",
    icon: Wallet,
  },
};

export default function KardexPage() {
  const router = useRouter();
  const [currentUser] = useState(() => AuthService.getCurrentUser());
  const isAdmin = currentUser?.roles?.includes("ADMINISTRADOR");

  const [mainView, setMainView] = useState<"TIMELINE" | "REPORTS">("TIMELINE");
  const [items, setItems] = useState<KardexItem[]>([]);
  const [submoduleTab, setSubmoduleTab] = useState<KardexSubmodule>("ALL");
  const [meta, setMeta] = useState<PaginationMeta>({
    currentPage: 1,
    itemsPerPage: 15,
    totalPages: 1,
    totalItems: 0,
  });
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  // Filtros de búsqueda
  const [selectedType, setSelectedType] = useState<MovementType | "">("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const debouncedSearchTerm = useDebounce(searchTerm, 400);
  const [page, setPage] = useState<number>(1);

  // Modal de Detalle de Movimiento
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<KardexItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleOpenDetail = (item: KardexItem) => {
    setSelectedItemForDetail(item);
    setIsDetailModalOpen(true);
  };

  const loadKardex = useCallback(async () => {
    setLoading(true);
    try {
      const res = await InventoryClientService.getKardex({
        page,
        limit: 15,
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
    }
  }, [page, selectedType, startDate, endDate, debouncedSearchTerm]);

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
      await loadKardex();
    };
    init();
  }, [router, isAdmin, loadKardex]);

  const handleExportCSV = async () => {
    setDownloading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      downloadCsv(
        `historial_movimientos_${today}.csv`,
        [
          "Fecha",
          "Tipo",
          "Producto",
          "SKU",
          "Lote",
          "Cantidad",
          "Unidad",
          "Usuario",
          "Motivo",
        ],
        items.map((row) => [
          new Date(row.createdAt).toLocaleString("es-VE"),
          MOVEMENT_LABELS[row.type]?.label || row.type,
          row.batch?.product?.name || (row.type === "PAGO_ORDEN" ? "Abono / Pago de Orden" : "Egreso Directo"),
          row.batch?.product?.sku || (row.referenceDoc ?? "FINANCIERO"),
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadKardex();
  };

  const displayedItems = items.filter((row) => {
    if (submoduleTab === "ALL") return true;
    const allowed = SUBMODULE_CONFIG[submoduleTab]?.types || [];
    return allowed.includes(row.type);
  });

  if (!isAdmin) {
    return (
      <div className="p-8 text-center bg-card rounded-2xl border border-border space-y-3 max-w-md mx-auto my-12 shadow-xs">
        <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-foreground">Acceso Administrativo Exclusivo</h2>
        <p className="text-xs text-muted-foreground">
          El módulo de historial y movimientos integrales se encuentra restringido exclusivamente para el perfil de Administración Empresarial.
        </p>
        <Button onClick={() => router.push("/dashboard")} variant="outline" size="sm">
          Volver al Inicio
        </Button>
      </div>
    );
  }

  if (mainView === "REPORTS") {
    return (
      <div className="space-y-6">
        {/* Selector de Vistas Superior */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border no-print print:hidden">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <History className="w-6 h-6 text-primary" />
              Historial de Movimientos & Reportes
            </h1>
            <p className="text-xs text-muted-foreground">
              Módulo integral de auditoría, trazabilidad física y reportes institucionales personalizados
            </p>
          </div>

          <div className="flex bg-muted p-1 rounded-xl border border-border self-start sm:self-auto shrink-0 shadow-2xs gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMainView("TIMELINE")}
              className="gap-1.5 h-8 text-xs font-semibold cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span>Movimientos</span>
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setMainView("REPORTS")}
              className="gap-1.5 h-8 text-xs font-semibold cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Reportes Personalizados</span>
            </Button>
          </div>
        </div>

        <CustomReportBuilder />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Encabezado de la vista con selector de módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <History className="w-6 h-6 text-primary" />
              Historial de Movimientos
            </h1>
            <Badge variant="purple" className="text-[10px] font-mono">
              Auditoría & Trazabilidad
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Registro unificado y cronológico de entradas, salidas y despachos en todas las áreas del instituto
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Selector de Vistas Movimientos vs Reportes */}
          <div className="flex bg-muted p-1 rounded-xl border border-border shadow-2xs gap-1">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setMainView("TIMELINE")}
              className="gap-1.5 h-8 text-xs font-semibold cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span>Movimientos</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMainView("REPORTS")}
              className="gap-1.5 h-8 text-xs font-semibold cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Reportes Personalizados</span>
            </Button>
          </div>

          <Button
            type="button"
            variant="default"
            onClick={handleExportCSV}
            disabled={downloading}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs font-semibold cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{downloading ? "Exportando..." : "Exportar CSV"}</span>
          </Button>
        </div>
      </div>

      {/* Selector de Submódulos del Sistema */}
      <Tabs
        value={submoduleTab}
        onValueChange={(val) => setSubmoduleTab(val as KardexSubmodule)}
        className="w-full"
      >
        <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 bg-muted/60 flex-wrap gap-1 rounded-xl border border-border/60">
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
                className="gap-1.5 py-1.5 px-3 text-xs cursor-pointer font-medium rounded-lg"
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

      {/* Panel de Filtros */}
      <Card className="border border-border/80 shadow-2xs">
        <CardContent className="p-3.5 flex flex-wrap gap-3 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar insumo, SKU, lote o documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-8 text-xs h-9"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setPage(1);
                }}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Borrar término de búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Tipo de Operación */}
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value as MovementType | "");
                setPage(1);
              }}
              className="bg-background border border-input rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground h-9 cursor-pointer"
            >
              <option value="">Todas las operaciones</option>
              {Object.entries(MOVEMENT_LABELS).map(([key, item]) => (
                <option key={key} value={key}>
                  {item.label}
                </option>
              ))}
            </select>

            {/* Rango de Fechas */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background border border-input rounded-lg px-2.5 h-9">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="bg-transparent focus:outline-none text-foreground text-xs cursor-pointer"
                title="Fecha inicial"
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
                title="Fecha final"
              />
            </div>

            {(searchTerm || selectedType || startDate || endDate || submoduleTab !== "ALL") && (
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
                className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                title="Restablecer todos los filtros"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpiar filtros</span>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => loadKardex()}
              title="Recargar tabla"
              className="h-9 w-9 shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Movimientos Optimizada y Amigable */}
      <Card className="overflow-hidden border border-border/80 shadow-xs">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-border">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-36 py-3.5 px-4 text-left font-bold text-xs text-slate-700 dark:text-slate-300">
                  Fecha & Hora
                </TableHead>
                <TableHead className="w-48 py-3.5 px-4 text-left font-bold text-xs text-slate-700 dark:text-slate-300">
                  Operación & Módulo
                </TableHead>
                <TableHead className="min-w-[220px] py-3.5 px-4 text-left font-bold text-xs text-slate-700 dark:text-slate-300">
                  Insumo & Lote
                </TableHead>
                <TableHead className="w-36 py-3.5 px-4 text-right font-bold text-xs text-slate-700 dark:text-slate-300">
                  Variación & Saldo
                </TableHead>
                <TableHead className="w-40 py-3.5 px-4 text-left font-bold text-xs text-slate-700 dark:text-slate-300">
                  Responsable
                </TableHead>
                <TableHead className="w-24 py-3.5 px-4 text-center font-bold text-xs text-slate-700 dark:text-slate-300">
                  Acción
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-14 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                    <span className="text-xs font-medium">Cargando historial de movimientos...</span>
                  </TableCell>
                </TableRow>
              ) : displayedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-14 text-center text-muted-foreground">
                    <FileText className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-foreground">Sin registros coincidentes</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      No se encontraron movimientos con los filtros aplicados en este submódulo.
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
                  const MoveIcon = movement?.icon || ArrowUpRight;
                  const SubmodIcon = submod.Icon;

                  return (
                    <TableRow
                      key={`${row.id ?? "mov"}-${row.batchId ?? ""}-${index}`}
                      onClick={() => handleOpenDetail(row)}
                      className="hover:bg-muted/40 transition-colors cursor-pointer group"
                    >
                      {/* 1. Fecha & Hora */}
                      <TableCell className="py-3 px-4 text-left whitespace-nowrap">
                        <div className="text-xs font-semibold text-foreground">
                          {new Date(row.createdAt).toLocaleDateString("es-VE", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-muted-foreground/70" />
                          <span>
                            {new Date(row.createdAt).toLocaleTimeString("es-VE", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </TableCell>

                      {/* 2. Operación & Módulo */}
                      <TableCell className="py-3 px-4 text-left whitespace-nowrap">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-md border shadow-2xs",
                              movement?.badgeClass || "bg-slate-100 text-slate-700 border-slate-200"
                            )}
                            title={movement?.label || row.type}
                          >
                            <MoveIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{movement?.shortLabel || row.type}</span>
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border",
                              submod.badgeClass
                            )}
                          >
                            <SubmodIcon className="w-2.5 h-2.5 shrink-0" />
                            <span>{submod.name}</span>
                          </span>
                        </div>
                      </TableCell>

                      {/* 3. Insumo & Lote */}
                      <TableCell className="py-3 px-4 text-left">
                        {row.batch ? (
                          <div className="flex flex-col gap-1 min-w-0">
                            <span
                              className="font-semibold text-xs text-foreground truncate max-w-[280px] group-hover:text-primary transition-colors"
                              title={row.batch.product.name}
                            >
                              {row.batch.product.name}
                            </span>
                            <div className="flex items-center gap-2 flex-wrap text-[11px]">
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted text-foreground font-mono font-medium border border-border/60">
                                <Tag className="w-2.5 h-2.5 text-muted-foreground" />
                                #{row.batch.lotNumber}
                              </span>
                              <span className="font-mono text-muted-foreground">
                                SKU: {row.batch.product.sku}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1 min-w-0">
                            <span className="font-semibold text-xs text-foreground truncate max-w-[280px] group-hover:text-primary transition-colors">
                              {row.type === "PAGO_ORDEN"
                                ? "Pago de Orden de Compra"
                                : "Egreso Directo Institucional"}
                            </span>
                            <span className="font-mono text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                              Ref: {row.referenceDoc || "ASIENTO-FINANCIERO"}
                            </span>
                          </div>
                        )}
                      </TableCell>

                      {/* 4. Variación & Saldo */}
                      <TableCell className="py-3 px-4 text-right whitespace-nowrap">
                        {isFinancial ? (
                          <div className="flex flex-col items-end">
                            <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300">
                              Financiero
                            </span>
                            <span className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                              Tesorería
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end">
                            <div className="flex items-center justify-end gap-1 font-mono">
                              <span
                                className={cn(
                                  "text-xs font-bold",
                                  isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                )}
                              >
                                {isPositive ? `+${row.quantity}` : row.quantity}
                              </span>
                              <span className="text-[11px] text-muted-foreground font-normal">
                                {row.batch?.product.unitOfMeasure || "UND"}
                              </span>
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                              {row.balanceAfter !== null ? (
                                <span>
                                  Saldo: <strong className="text-foreground">{Number(row.balanceAfter).toLocaleString("es-VE")}</strong>
                                </span>
                              ) : (
                                <span>Saldo: —</span>
                              )}
                            </div>
                          </div>
                        )}
                      </TableCell>

                      {/* 5. Responsable */}
                      <TableCell className="py-3 px-4 text-left">
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold text-foreground truncate max-w-[140px]">
                            {row.performedBy?.fullName ||
                              row.performedBy?.username ||
                              "Sistema"}
                          </span>
                          <span className="text-[11px] text-muted-foreground truncate">
                            {row.performedBy?.department ?? "IDI"}
                          </span>
                        </div>
                      </TableCell>

                      {/* 6. Acción */}
                      <TableCell
                        className="py-3 px-4 text-center whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDetail(row)}
                          className="h-8 px-2.5 text-xs font-semibold gap-1.5 rounded-lg border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all cursor-pointer shadow-2xs"
                          title="Ver todos los detalles del movimiento"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detalle</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginación */}
        <div className="bg-muted/30 px-4 py-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <div>
            Mostrando página{" "}
            <span className="font-semibold text-foreground">{meta.currentPage}</span> de{" "}
            <span className="font-semibold text-foreground">{meta.totalPages || 1}</span> (
            <span className="font-semibold text-foreground">{meta.totalItems}</span> registros registrados)
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 w-8 cursor-pointer"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={page >= meta.totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 w-8 cursor-pointer"
              title="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Modal de Detalle Completo de Movimiento */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-xl sm:max-w-2xl p-0 overflow-hidden sm:rounded-2xl border-border bg-card">
          {selectedItemForDetail && (() => {
            const item = selectedItemForDetail;
            const movement = MOVEMENT_LABELS[item.type];
            const submod = getMovementSubmodule(item.type);
            const MoveIcon = movement?.icon || ArrowUpRight;
            const SubmodIcon = submod.Icon;
            const isPositive = item.quantity >= 0;
            const isFinancial = item.type === "PAGO_ORDEN" || item.type === "EGRESO_DIRECTO";

            return (
              <div className="flex flex-col max-h-[90vh]">
                {/* Header del Modal */}
                <div className="p-5 border-b border-border bg-muted/40">
                  <div className="flex items-start justify-between gap-3 pr-6">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md border shadow-2xs",
                            movement?.badgeClass || "bg-slate-100 text-slate-700 border-slate-200"
                          )}
                        >
                          <MoveIcon className="w-3.5 h-3.5" />
                          <span>{movement?.label || item.type}</span>
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border",
                            submod.badgeClass
                          )}
                        >
                          <SubmodIcon className="w-3 h-3" />
                          <span>{submod.name}</span>
                        </span>
                      </div>
                      <DialogTitle className="text-lg font-bold text-foreground">
                        Comprobante de Movimiento #{item.id}
                      </DialogTitle>
                      <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>
                          {new Date(item.createdAt).toLocaleDateString("es-VE", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}{" "}
                          a las{" "}
                          {new Date(item.createdAt).toLocaleTimeString("es-VE", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      </DialogDescription>
                    </div>
                  </div>
                </div>

                {/* Cuerpo del Modal con Scroll si es necesario */}
                <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
                  {/* Tarjeta 1: Insumo y Lote */}
                  <div className="rounded-xl border border-border p-4 bg-background shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" />
                        Insumo / Concepto
                      </span>
                      {item.batch?.lotNumber && (
                        <Badge variant="outline" className="font-mono text-xs font-semibold bg-muted/60">
                          Lote #{item.batch.lotNumber}
                        </Badge>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-foreground">
                        {item.batch?.product?.name ||
                          (item.type === "PAGO_ORDEN"
                            ? "Pago de Orden de Compra"
                            : "Egreso Directo Institucional")}
                      </h3>
                      {item.batch?.product?.sku && (
                        <p className="text-xs font-mono text-muted-foreground mt-0.5">
                          SKU: {item.batch.product.sku}
                        </p>
                      )}
                    </div>

                    {item.batch?.expirationDate && (
                      <div className="flex items-center gap-2 pt-2 border-t border-border/60 text-xs">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Vencimiento del Lote:</span>
                        <span className="font-semibold text-foreground font-mono">
                          {new Date(item.batch.expirationDate).toLocaleDateString("es-VE", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Tarjeta 2: Balance & Stock */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border p-4 bg-background shadow-2xs space-y-1">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Variación de Cantidad
                      </span>
                      {isFinancial ? (
                        <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                          Movimiento Financiero
                        </div>
                      ) : (
                        <div
                          className={cn(
                            "text-2xl font-black font-mono flex items-baseline gap-1.5",
                            isPositive
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          )}
                        >
                          <span>{isPositive ? `+${item.quantity}` : item.quantity}</span>
                          <span className="text-xs font-medium text-muted-foreground">
                            {item.batch?.product?.unitOfMeasure || "UND"}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-border p-4 bg-background shadow-2xs space-y-1">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Saldo Resultante en Stock
                      </span>
                      <div className="text-2xl font-black font-mono text-foreground flex items-baseline gap-1.5">
                        {item.balanceAfter !== null ? (
                          <>
                            <span>{Number(item.balanceAfter).toLocaleString("es-VE")}</span>
                            <span className="text-xs font-medium text-muted-foreground">
                              {item.batch?.product?.unitOfMeasure || "UND"}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm font-normal text-muted-foreground">No aplica</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tarjeta 3: Auditoría & Documento de Referencia */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border p-3.5 bg-background shadow-2xs space-y-1">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        Registrado Por
                      </span>
                      <p className="text-xs font-bold text-foreground">
                        {item.performedBy?.fullName || item.performedBy?.username || "Sistema IDI"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Departamento: {item.performedBy?.department || "No especificado"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-border p-3.5 bg-background shadow-2xs space-y-1">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        Documento de Referencia
                      </span>
                      <p className="text-xs font-mono font-semibold text-foreground">
                        {item.referenceDoc || "Sin documento vinculado"}
                      </p>
                      {item.unitCost !== null && item.unitCost !== undefined && (
                        <p className="text-[11px] text-muted-foreground font-mono">
                          Costo unitario: ${Number(item.unitCost).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Tarjeta 4: Observación / Motivo Completo */}
                  <div className="rounded-xl border border-border p-4 bg-muted/20 space-y-1.5">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Observación o Justificación
                    </span>
                    <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                      {item.reason ? item.reason : "Sin observaciones adicionales registradas para este movimiento."}
                    </p>
                  </div>
                </div>

                {/* Footer del Modal */}
                <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className="gap-2 text-xs font-semibold h-9 rounded-xl border-border cursor-pointer hover:bg-muted"
                  >
                    <Link href={`/inventory/kardex/${item.id}`} target="_blank">
                      <Printer className="w-3.5 h-3.5" />
                      <span>Ver Comprobante Oficial</span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground" />
                    </Link>
                  </Button>

                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setIsDetailModalOpen(false)}
                    className="text-xs font-semibold h-9 px-5 rounded-xl cursor-pointer"
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}