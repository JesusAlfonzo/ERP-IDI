"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { InventoryClientService } from "@/services/inventory.service";
import { downloadCsv } from "@/lib/csv";
import { AuthService } from "@/services/auth.service";
import { cn } from "@/lib/utils";
import type { KardexItem, MovementType } from "@/types/kardex";
import type { PaginationMeta } from "@/types/api";
import {
  FileSpreadsheet,
  RefreshCw,
  Search,
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
} from "lucide-react";
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
  const [page, setPage] = useState<number>(1);

  const loadKardex = useCallback(async () => {
    setLoading(true);
    try {
      const res = await InventoryClientService.getKardex({
        page,
        limit: 15,
        type: selectedType,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: searchTerm || undefined,
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
  }, [page, selectedType, startDate, endDate, searchTerm]);

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
              className="pl-9 text-xs h-9"
            />
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

      {/* Tabla de Movimientos Reestructurada */}
      <Card className="overflow-hidden border border-border/80 shadow-xs">
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader className="bg-slate-50/80 dark:bg-slate-900/60 border-b border-border">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-32 py-3 px-3 text-left font-bold text-xs text-slate-700 dark:text-slate-300">
                  Fecha & Hora
                </TableHead>
                <TableHead className="w-28 py-3 px-3 text-center font-bold text-xs text-slate-700 dark:text-slate-300">
                  Módulo
                </TableHead>
                <TableHead className="w-40 py-3 px-3 text-left font-bold text-xs text-slate-700 dark:text-slate-300">
                  Operación
                </TableHead>
                <TableHead className="min-w-[200px] py-3 px-3 text-left font-bold text-xs text-slate-700 dark:text-slate-300">
                  Insumo / Concepto
                </TableHead>
                <TableHead className="w-28 py-3 px-3 text-center font-bold text-xs text-slate-700 dark:text-slate-300">
                  Lote
                </TableHead>
                <TableHead className="w-28 py-3 px-3 text-right font-bold text-xs text-slate-700 dark:text-slate-300">
                  Cantidad
                </TableHead>
                <TableHead className="w-28 py-3 px-3 text-right font-bold text-xs text-slate-700 dark:text-slate-300">
                  Saldo Stock
                </TableHead>
                <TableHead className="w-36 py-3 px-3 text-left font-bold text-xs text-slate-700 dark:text-slate-300">
                  Responsable
                </TableHead>
                <TableHead className="min-w-[150px] max-w-[200px] py-3 px-3 text-left font-bold text-xs text-slate-700 dark:text-slate-300">
                  Observación
                </TableHead>
                <TableHead className="w-20 py-3 px-3 text-center font-bold text-xs text-slate-700 dark:text-slate-300">
                  Detalle
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-14 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                    <span className="text-xs font-medium">Cargando historial de movimientos...</span>
                  </TableCell>
                </TableRow>
              ) : displayedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-14 text-center text-muted-foreground">
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
                      className="hover:bg-muted/40 transition-colors"
                    >
                      {/* 1. Fecha & Hora (Centrada en dos líneas legibles) */}
                      <TableCell className="py-2.5 px-3 text-left whitespace-nowrap">
                        <div className="text-xs font-semibold text-foreground">
                          {new Date(row.createdAt).toLocaleDateString("es-VE", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {new Date(row.createdAt).toLocaleTimeString("es-VE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </TableCell>

                      {/* 2. Submódulo (Pill centrado y compacto) */}
                      <TableCell className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-2xs",
                            submod.badgeClass
                          )}
                        >
                          <SubmodIcon className="w-3 h-3 shrink-0" />
                          <span>{submod.name}</span>
                        </span>
                      </TableCell>

                      {/* 3. Operación / Tipo Movimiento (Insignia compacta) */}
                      <TableCell className="py-2.5 px-3 text-left whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border",
                            movement?.badgeClass || "bg-slate-100 text-slate-700 border-slate-200"
                          )}
                          title={movement?.label || row.type}
                        >
                          <MoveIcon className="w-3 h-3 shrink-0" />
                          <span>{movement?.shortLabel || row.type}</span>
                        </span>
                      </TableCell>

                      {/* 4. Insumo / Concepto */}
                      <TableCell className="py-2.5 px-3 text-left">
                        {row.batch ? (
                          <div className="flex flex-col min-w-0">
                            <span
                              className="font-semibold text-xs text-foreground truncate max-w-[240px]"
                              title={row.batch.product.name}
                            >
                              {row.batch.product.name}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground">
                              SKU: {row.batch.product.sku}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-xs text-foreground truncate max-w-[240px]">
                              {row.type === "PAGO_ORDEN"
                                ? "Pago de Orden de Compra"
                                : "Egreso Directo Institucional"}
                            </span>
                            <span className="font-mono text-[10px] text-amber-600 font-semibold">
                              Ref: {row.referenceDoc || "ASIENTO-FINANCIERO"}
                            </span>
                          </div>
                        )}
                      </TableCell>

                      {/* 5. Lote (Centrado en cápsula monospace) */}
                      <TableCell className="py-2.5 px-3 text-center whitespace-nowrap">
                        {row.batch ? (
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] font-semibold border border-slate-200/60 dark:border-slate-700/60 shadow-2xs">
                            #{row.batch.lotNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs font-mono">—</span>
                        )}
                      </TableCell>

                      {/* 6. Cantidad (Alineada a la derecha con signo claro) */}
                      <TableCell className="py-2.5 px-3 text-right whitespace-nowrap">
                        {isFinancial ? (
                          <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300">
                            Financiero
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1 font-mono">
                            <span
                              className={cn(
                                "text-xs font-bold",
                                isPositive ? "text-emerald-600" : "text-rose-600"
                              )}
                            >
                              {isPositive ? `+${row.quantity}` : row.quantity}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-normal">
                              {row.batch?.product.unitOfMeasure || "UND"}
                            </span>
                          </div>
                        )}
                      </TableCell>

                      {/* 7. Saldo Stock Tras Movimiento */}
                      <TableCell className="py-2.5 px-3 text-right whitespace-nowrap font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {row.balanceAfter !== null ? (
                          <span>{Number(row.balanceAfter).toLocaleString("es-VE")}</span>
                        ) : (
                          <span className="text-slate-400 font-normal">—</span>
                        )}
                      </TableCell>

                      {/* 8. Responsable */}
                      <TableCell className="py-2.5 px-3 text-left">
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-medium text-foreground truncate max-w-[130px]">
                            {row.performedBy?.fullName ||
                              row.performedBy?.username ||
                              "Sistema"}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {row.performedBy?.department ?? "IDI"}
                          </span>
                        </div>
                      </TableCell>

                      {/* 9. Observación */}
                      <TableCell className="py-2.5 px-3 text-left">
                        <span
                          className="text-xs text-muted-foreground block truncate max-w-[190px]"
                          title={row.reason || "Sin observación"}
                        >
                          {row.reason || "—"}
                        </span>
                      </TableCell>

                      {/* 10. Detalle / Acción (Centrado) */}
                      <TableCell className="py-2.5 px-3 text-center whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="h-7 px-2.5 text-[11px] font-semibold gap-1 rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                        >
                          <Link
                            href={`/inventory/kardex/${row.id}`}
                            title="Ver comprobante de asiento"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Ver</span>
                          </Link>
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
    </div>
  );
}
