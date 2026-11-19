/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ReportClientService,
  type CustomReportFilterParams,
  type CustomReportData,
  type CustomReportType,
} from "@/services/report.service";
import { PurchasingClientService } from "@/services/purchasing.service";
import {
  InventoryMasterService,
  type DepartmentItem,
} from "@/services/inventory-master.service";
import { InventoryClientService } from "@/services/inventory.service";
import { UserService, type UserItem } from "@/services/user.service";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";
import type { Supplier } from "@/types/purchasing";
import type { Product, Category } from "@/types/inventory";
import {
  UniversalPdfDownloadButton,
  CustomReportPdfDocument,
} from "@/components/pdf";
import type { CustomReportColumn } from "@/components/pdf/documents/CustomReportPdfDocument";
import { TablePagination } from "@/components/common/TablePagination";
import {
  Search,
  RefreshCw,
  FileSpreadsheet,
  Building2,
  Layers,
  Wallet,
  Settings2,
  BarChart3,
  History,
  X,
  Calendar,
  Loader2,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
  Users,
  ClipboardList,
  Columns,
} from "lucide-react";

import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge, BadgeProps } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/utils/toast";

const REPORT_TYPE_CONFIG: Record<
  CustomReportType,
  {
    label: string;
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    defaultDocTitle: string;
    activeClass: string;
  }
> = {
  USER_ACTIVITY: {
    label: "Usuarios",
    title: "Usuarios",
    description: "Actividad y operaciones por usuario",
    icon: Users,
    defaultDocTitle: "REPORTE DE ACTIVIDAD POR USUARIO",
    activeClass: "data-[state=active]:text-primary",
  },
  KARDEX: {
    label: "Movimientos",
    title: "Movimientos",
    description: "Entradas, despachos, ajustes y mermas",
    icon: History,
    defaultDocTitle: "REPORTE DE MOVIMIENTOS",
    activeClass:
      "data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400",
  },
  DEPARTMENT_CONSUMPTION: {
    label: "Solicitudes",
    title: "Solicitudes",
    description: "Pedidos y entregas por departamento",
    icon: ClipboardList,
    defaultDocTitle: "REPORTE DE SOLICITUDES",
    activeClass:
      "data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400",
  },
  SUPPLIER_PAYMENTS: {
    label: "Compras",
    title: "Compras y Pagos",
    description: "Órdenes, proveedores y gastos directos",
    icon: Wallet,
    defaultDocTitle: "REPORTE DE COMPRAS Y PAGOS",
    activeClass:
      "data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400",
  },
  PREORDERS: {
    label: "Preórdenes",
    title: "Preórdenes",
    description: "Requerimientos y estado de cotización",
    icon: Building2,
    defaultDocTitle: "REPORTE DE PREÓRDENES",
    activeClass:
      "data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400",
  },
  BATCH_EXPIRATION: {
    label: "Lotes",
    title: "Lotes",
    description: "Stock actual y fechas de vencimiento",
    icon: Layers,
    defaultDocTitle: "REPORTE DE STOCK Y LOTES",
    activeClass:
      "data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400",
  },
};

const MOVEMENT_TYPE_LABELS: Record<
  string,
  { label: string; variant: BadgeProps["variant"]; isEntry: boolean }
> = {
  ENTRADA_COMPRA: { label: "Compra", variant: "success", isEntry: true },
  DESPACHO_SOLICITUD: { label: "Despacho", variant: "warning", isEntry: false },
  AJUSTE_INVENTARIO: { label: "Ajuste", variant: "info", isEntry: true },
  DESCARTE_MERMA: { label: "Merma", variant: "destructive", isEntry: false },
  TRASLADO_A_LABORATORIO: {
    label: "Traslado",
    variant: "purple",
    isEntry: false,
  },
  PAGO_ORDEN: { label: "Pago", variant: "success", isEntry: false },
  EGRESO_DIRECTO: { label: "Gasto", variant: "rose", isEntry: false },
};

interface ColumnDefinition {
  key: string;
  label: string;
  width: string;
  align?: "left" | "center" | "right";
  bold?: boolean;
}

const VIEW_COLUMNS_MAP: Record<string, ColumnDefinition[]> = {
  USER_SUMMARY: [
    { key: "usuario", label: "Usuario", width: "22%", bold: true },
    { key: "departamento", label: "Departamento", width: "16%" },
    { key: "solicitudes", label: "Solicitudes", width: "13%", align: "center" },
    { key: "unidades", label: "Unidades", width: "12%", align: "center" },
    { key: "almacen", label: "Almacén", width: "13%", align: "center" },
    { key: "ajustes", label: "Ajustes / Mermas", width: "11%", align: "center" },
    { key: "compras", label: "Compras", width: "13%", align: "right", bold: true },
  ],
  USER_TIMELINE: [
    { key: "fecha", label: "Fecha", width: "11%" },
    { key: "usuario", label: "Usuario", width: "18%", bold: true },
    { key: "modulo", label: "Módulo", width: "11%" },
    { key: "accion", label: "Acción", width: "14%", bold: true },
    { key: "referencia", label: "Referencia", width: "12%" },
    { key: "detalle", label: "Detalle", width: "18%" },
    {
      key: "cantidad",
      label: "Total",
      width: "9%",
      align: "right",
      bold: true,
    },
    { key: "estado", label: "Estado", width: "7%", align: "center" },
  ],
  KARDEX: [
    { key: "fecha", label: "Fecha", width: "11%" },
    { key: "referencia", label: "Referencia", width: "14%", bold: true },
    { key: "tipo", label: "Tipo", width: "12%" },
    { key: "insumo", label: "Insumo", width: "23%" },
    { key: "lote", label: "Lote", width: "11%" },
    {
      key: "cantidad",
      label: "Cantidad",
      width: "10%",
      align: "right",
      bold: true,
    },
    { key: "valor", label: "Valor ($)", width: "9%", align: "right" },
    { key: "responsable", label: "Usuario", width: "10%" },
  ],
  DEPARTMENT_CONSUMPTION: [
    { key: "solicitud", label: "Código", width: "11%", bold: true },
    { key: "fecha", label: "Fecha", width: "10%" },
    { key: "departamento", label: "Departamento", width: "16%" },
    { key: "solicitante", label: "Solicitante", width: "15%" },
    { key: "insumos", label: "Insumos", width: "28%" },
    {
      key: "unidades",
      label: "Unidades",
      width: "11%",
      align: "center",
      bold: true,
    },
    { key: "estado", label: "Estado", width: "9%", align: "center" },
  ],
  SUPPLIER_ORDERS: [
    { key: "orden", label: "Orden", width: "11%", bold: true },
    { key: "fecha", label: "Fecha", width: "10%" },
    { key: "proveedor", label: "Proveedor", width: "18%" },
    { key: "usuario", label: "Usuario", width: "13%" },
    { key: "insumos", label: "Insumos", width: "21%" },
    {
      key: "facturado",
      label: "Total ($)",
      width: "9%",
      align: "right",
      bold: true,
    },
    { key: "pagado", label: "Pagado ($)", width: "9%", align: "right" },
    { key: "estado", label: "Estado", width: "9%", align: "center" },
  ],
  SUPPLIER_SUMMARY: [
    { key: "proveedor", label: "Proveedor", width: "24%", bold: true },
    { key: "ordenes", label: "Órdenes", width: "10%", align: "center" },
    { key: "insumos", label: "Insumos", width: "30%" },
    {
      key: "facturado",
      label: "Total ($)",
      width: "12%",
      align: "right",
      bold: true,
    },
    { key: "pagado", label: "Pagado ($)", width: "12%", align: "right" },
    { key: "deuda", label: "Deuda ($)", width: "12%", align: "right" },
  ],
  SUPPLIER_DIRECT: [
    { key: "fecha", label: "Fecha", width: "12%" },
    { key: "beneficiario", label: "Beneficiario", width: "20%", bold: true },
    { key: "concepto", label: "Concepto", width: "24%" },
    { key: "metodo", label: "Método", width: "16%" },
    { key: "usuario", label: "Usuario", width: "14%" },
    {
      key: "montoUsd",
      label: "Monto ($)",
      width: "14%",
      align: "right",
      bold: true,
    },
  ],
  PREORDERS: [
    { key: "preorden", label: "Código", width: "12%", bold: true },
    { key: "fecha", label: "Fecha", width: "10%" },
    { key: "departamento", label: "Departamento", width: "17%" },
    { key: "usuario", label: "Solicitante", width: "15%" },
    { key: "insumos", label: "Insumos", width: "26%" },
    { key: "orden", label: "Orden", width: "10%", align: "center" },
    { key: "estado", label: "Estado", width: "10%", align: "center" },
  ],
  BATCH_EXPIRATION: [
    { key: "sku", label: "SKU", width: "13%", bold: true },
    { key: "insumo", label: "Insumo", width: "22%" },
    { key: "lote", label: "Lote", width: "12%", bold: true },
    { key: "ubicacion", label: "Ubicación", width: "13%" },
    { key: "stock", label: "Stock", width: "10%", align: "right", bold: true },
    { key: "costo", label: "Costo ($)", width: "9%", align: "right" },
    {
      key: "valor",
      label: "Valor ($)",
      width: "10%",
      align: "right",
      bold: true,
    },
    { key: "vencimiento", label: "Vencimiento", width: "11%", align: "center" },
  ],
};

/**
 * Resumen general de insumos con límite estricto (máx 2 nombres + contador general)
 * para evitar decenas o cientos de badges por fila.
 */
function summarizeItemsForPdf(
  items: any[],
  getName: (it: any) => string,
): string {
  if (!Array.isArray(items) || items.length === 0) return "Sin insumos";
  const count = items.length;
  const preview = items
    .slice(0, 2)
    .map(getName)
    .filter(Boolean)
    .join(", ");
  const extra = count > 2 ? ` (+${count - 2} más)` : "";
  return `${count} ${count === 1 ? "insumo" : "insumos"}: ${preview}${extra}`;
}

function ItemsSummaryCell({
  items,
  getName,
  getQtyText,
}: {
  items: any[];
  getName: (it: any) => string;
  getQtyText?: (it: any) => string;
}) {
  if (!Array.isArray(items) || items.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const count = items.length;
  const previewItems = items.slice(0, 2);
  const extraCount = Math.max(0, count - 2);

  return (
    <div className="space-y-1 max-w-md">
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="secondary" className="text-[11px] font-mono font-bold">
          {count} {count === 1 ? "insumo" : "insumos"}
        </Badge>
        {extraCount > 0 && (
          <span className="text-[11px] font-mono text-muted-foreground">
            +{extraCount} más
          </span>
        )}
      </div>
      <div className="text-xs text-muted-foreground truncate">
        {previewItems
          .map((it) => {
            const name = getName(it);
            const qty = getQtyText ? ` (${getQtyText(it)})` : "";
            return `${name}${qty}`;
          })
          .join(" · ")}
      </div>
    </div>
  );
}

export function CustomReportBuilder() {
  const [reportType, setReportType] =
    useState<CustomReportType>("USER_ACTIVITY");

  // Sub-vistas
  const [userSubView, setUserSubView] = useState<"SUMMARY" | "TIMELINE">(
    "SUMMARY",
  );
  const [paymentsSubView, setPaymentsSubView] = useState<
    "ORDERS" | "SUPPLIERS" | "DIRECT"
  >("ORDERS");

  // Filtros
  const [activeDatePreset, setActiveDatePreset] = useState<
    "today" | "week" | "month" | "last_month" | "year" | "all" | "custom"
  >("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedMovementType, setSelectedMovementType] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Paginación
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  // Columnas visibles "a dedo"
  const [hiddenColumns, setHiddenColumns] = useState<Record<string, string[]>>(
    {},
  );
  const [showColumnsModal, setShowColumnsModal] = useState<boolean>(false);

  // Modales de detalle directo al hacer clic en una fila
  const [selectedUserDetail, setSelectedUserDetail] = useState<any | null>(
    null,
  );
  const [selectedRowDetail, setSelectedRowDetail] = useState<{
    type: "REQUEST" | "ORDER" | "SUPPLIER" | "PREORDER";
    data: any;
  } | null>(null);

  // Configuración del PDF
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [customTitle, setCustomTitle] = useState<string>(
    REPORT_TYPE_CONFIG.USER_ACTIVITY.defaultDocTitle,
  );
  const [customSubtitle, setCustomSubtitle] = useState<string>(
    "Reporte Oficial · ERP-IDI",
  );
  const [customDocNumber, setCustomDocNumber] = useState<string>("REP-IDI-001");
  const [customBadge, setCustomBadge] = useState<string>("REPORTE OFICIAL");
  const [customFooterNotes, setCustomFooterNotes] = useState<string>("");
  const [pdfOrientation, setPdfOrientation] = useState<
    "landscape" | "portrait"
  >("landscape");
  const [includeSummaryMetrics, setIncludeSummaryMetrics] =
    useState<boolean>(true);
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);
  const [sig1Role, setSig1Role] = useState<string>("Elaborado por");
  const [sig1Name, setSig1Name] = useState<string>("");
  const [sig1Dept, setSig1Dept] = useState<string>("Control y Auditoría");
  const [sig2Role, setSig2Role] = useState<string>("Revisado por");
  const [sig2Name, setSig2Name] = useState<string>("");
  const [sig2Dept, setSig2Dept] = useState<string>("Coordinación");
  const [sig3Role, setSig3Role] = useState<string>("Aprobado por");
  const [sig3Name, setSig3Name] = useState<string>("");
  const [sig3Dept, setSig3Dept] = useState<string>("Dirección Ejecutiva");

  // Maestros
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Datos del reporte
  const [reportData, setReportData] = useState<CustomReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [downloadingCsv, setDownloadingCsv] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const loadMasters = async () => {
      try {
        const [usrs, sups, deps, prods, cats] = await Promise.all([
          UserService.getUsers().catch(() => []),
          PurchasingClientService.getSuppliers().catch(() => []),
          InventoryMasterService.getDepartments(true).catch(() => []),
          InventoryClientService.getProducts().catch(() => []),
          InventoryClientService.getCategories().catch(() => []),
        ]);
        if (isMounted) {
          setUsersList(usrs);
          setSuppliers(sups);
          setDepartments(deps);
          setProducts(prods);
          setCategories(cats);
        }
      } catch {
        // Silencioso
      }
    };
    void loadMasters();
    return () => {
      isMounted = false;
    };
  }, []);

  const currentViewKey = useMemo(() => {
    if (reportType === "USER_ACTIVITY") {
      return userSubView === "TIMELINE" ? "USER_TIMELINE" : "USER_SUMMARY";
    }
    if (reportType === "SUPPLIER_PAYMENTS") {
      return paymentsSubView === "SUPPLIERS"
        ? "SUPPLIER_SUMMARY"
        : paymentsSubView === "DIRECT"
          ? "SUPPLIER_DIRECT"
          : "SUPPLIER_ORDERS";
    }
    return reportType;
  }, [reportType, userSubView, paymentsSubView]);

  const availableColumnsForView = useMemo(
    () => VIEW_COLUMNS_MAP[currentViewKey] || [],
    [currentViewKey],
  );

  const visibleColumnsForView = useMemo(() => {
    const hidden = hiddenColumns[currentViewKey] || [];
    const filtered = availableColumnsForView.filter(
      (c) => !hidden.includes(c.key),
    );
    return filtered.length > 0 ? filtered : availableColumnsForView;
  }, [availableColumnsForView, hiddenColumns, currentViewKey]);

  const isColVisible = useCallback(
    (colKey: string) => {
      return visibleColumnsForView.some((c) => c.key === colKey);
    },
    [visibleColumnsForView],
  );

  const toggleColumnVisibility = (colKey: string) => {
    setHiddenColumns((prev) => {
      const currentHidden = prev[currentViewKey] || [];
      const isCurrentlyHidden = currentHidden.includes(colKey);
      if (!isCurrentlyHidden && visibleColumnsForView.length <= 2) {
        toast.error("Mantén al menos 2 columnas activas");
        return prev;
      }
      const nextHidden = isCurrentlyHidden
        ? currentHidden.filter((k) => k !== colKey)
        : [...currentHidden, colKey];
      return { ...prev, [currentViewKey]: nextHidden };
    });
  };

  // Cambiar de pestaña limpiando datos previos para evitar desincronización de keys
  const handleReportTypeChange = (type: CustomReportType) => {
    if (type === reportType) return;
    setLoading(true);
    setReportData(null);
    setReportType(type);
    setCustomTitle(REPORT_TYPE_CONFIG[type].defaultDocTitle);
    setSelectedStatus("");
    setSelectedMovementType("");
    setCurrentPage(1);
  };

  const setDatePreset = (
    preset: "today" | "week" | "month" | "last_month" | "year" | "all",
  ) => {
    setActiveDatePreset(preset);
    setCurrentPage(1);
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();

    if (preset === "today") {
      const dStr = today.toISOString().slice(0, 10);
      setStartDate(dStr);
      setEndDate(dStr);
    } else if (preset === "week") {
      const prev7 = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(prev7.toISOString().slice(0, 10));
      setEndDate(today.toISOString().slice(0, 10));
    } else if (preset === "month") {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      setStartDate(start.toISOString().slice(0, 10));
      setEndDate(end.toISOString().slice(0, 10));
    } else if (preset === "last_month") {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      setStartDate(start.toISOString().slice(0, 10));
      setEndDate(end.toISOString().slice(0, 10));
    } else if (preset === "year") {
      const start = new Date(y, 0, 1);
      const end = new Date(y, 11, 31);
      setStartDate(start.toISOString().slice(0, 10));
      setEndDate(end.toISOString().slice(0, 10));
    } else {
      setStartDate("");
      setEndDate("");
    }
  };

  const handleClearFilters = () => {
    setStartDate("");
    setEndDate("");
    setActiveDatePreset("all");
    setSelectedUserId("");
    setSelectedSupplierId("");
    setSelectedDepartmentId("");
    setSelectedProductId("");
    setSelectedCategoryId("");
    setSelectedStatus("");
    setSelectedMovementType("");
    setSearchTerm("");
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(
    startDate ||
      endDate ||
      selectedUserId ||
      selectedSupplierId ||
      selectedDepartmentId ||
      selectedProductId ||
      selectedCategoryId ||
      selectedStatus ||
      selectedMovementType ||
      searchTerm,
  );

  const handleGenerateReport = useCallback(async () => {
    setLoading(true);
    try {
      const filters: CustomReportFilterParams = {
        reportType,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        userId: selectedUserId ? Number(selectedUserId) : undefined,
        supplierId: selectedSupplierId ? Number(selectedSupplierId) : undefined,
        departmentId: selectedDepartmentId
          ? Number(selectedDepartmentId)
          : undefined,
        productId: selectedProductId ? Number(selectedProductId) : undefined,
        categoryId: selectedCategoryId ? Number(selectedCategoryId) : undefined,
        movementType: selectedMovementType || undefined,
        status: selectedStatus || undefined,
        search: searchTerm || undefined,
      };

      const data = await ReportClientService.getCustomReport(filters);
      setReportData(data);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error al generar el reporte",
      );
    } finally {
      setLoading(false);
    }
  }, [
    reportType,
    startDate,
    endDate,
    selectedUserId,
    selectedSupplierId,
    selectedDepartmentId,
    selectedProductId,
    selectedCategoryId,
    selectedMovementType,
    selectedStatus,
    searchTerm,
  ]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const loadInitial = async () => {
      try {
        const filters: CustomReportFilterParams = {
          reportType,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          userId: selectedUserId ? Number(selectedUserId) : undefined,
          supplierId: selectedSupplierId
            ? Number(selectedSupplierId)
            : undefined,
          departmentId: selectedDepartmentId
            ? Number(selectedDepartmentId)
            : undefined,
          productId: selectedProductId ? Number(selectedProductId) : undefined,
          categoryId: selectedCategoryId
            ? Number(selectedCategoryId)
            : undefined,
          movementType: selectedMovementType || undefined,
          status: selectedStatus || undefined,
          search: searchTerm || undefined,
        };
        const data = await ReportClientService.getCustomReport(filters);
        if (active) {
          setReportData(data);
        }
      } catch (err: unknown) {
        if (active) {
          toast.error(
            err instanceof Error ? err.message : "Error al cargar el reporte",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    void loadInitial();
    return () => {
      active = false;
    };
  }, [
    reportType,
    startDate,
    endDate,
    selectedUserId,
    selectedSupplierId,
    selectedDepartmentId,
    selectedProductId,
    selectedCategoryId,
    selectedMovementType,
    selectedStatus,
    searchTerm,
  ]);

  // Asegurar que solo usamos datos si corresponden al reportType actual
  const activeRows = useMemo(() => {
    if (!reportData || reportData.reportType !== reportType) return [];
    if (reportType === "USER_ACTIVITY") {
      if (userSubView === "TIMELINE") {
        let logs = reportData.userActionLogs || [];
        if (selectedMovementType) {
          logs = logs.filter((l: any) => l.module === selectedMovementType);
        }
        return logs;
      }
      return reportData.rows || [];
    }
    if (reportType === "SUPPLIER_PAYMENTS") {
      if (paymentsSubView === "SUPPLIERS") {
        return reportData.supplierSummaries || [];
      }
      if (paymentsSubView === "DIRECT") {
        return reportData.directPayments || [];
      }
      return reportData.orders || [];
    }
    return reportData.rows || [];
  }, [
    reportData,
    reportType,
    userSubView,
    paymentsSubView,
    selectedMovementType,
  ]);

  const totalPages = Math.max(1, Math.ceil(activeRows.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return activeRows.slice(start, start + pageSize);
  }, [activeRows, safeCurrentPage, pageSize]);

  // Acciones recientes del usuario seleccionado en el modal
  const selectedUserLogs = useMemo(() => {
    if (!selectedUserDetail || !reportData?.userActionLogs) return [];
    return reportData.userActionLogs
      .filter((l: any) => Number(l.userId) === Number(selectedUserDetail.userId))
      .slice(0, 8);
  }, [selectedUserDetail, reportData]);

  // Formateo de filas para PDF / CSV con resumen general de insumos
  const formatRowForExport = useCallback(
    (row: any): Record<string, any> => {
      if (currentViewKey === "USER_SUMMARY") {
        const totalAlm =
          Number(row.dispatchesExecuted || 0) +
          Number(row.receptionsExecuted || 0);
        const totalAj =
          Number(row.adjustmentsExecuted || 0) +
          Number(row.wastesExecuted || 0);
        const totalComp =
          Number(row.preordersCreated || 0) +
          Number(row.ordersCreated || 0) +
          Number(row.paymentsRegistered || 0);

        return {
          usuario: `${row.fullName} (@${row.username})`,
          departamento: row.department || "General",
          solicitudes:
            row.requestsCreated > 0
              ? `${row.requestsCreated} (${row.requestsApproved + row.requestsCompleted} aprob / ${row.requestsRejected} rech)`
              : "—",
          unidades:
            row.unitsRequested > 0
              ? `${row.unitsReceived} / ${row.unitsRequested}`
              : "—",
          almacen:
            totalAlm > 0
              ? `${row.dispatchesExecuted} desp · ${row.receptionsExecuted} ent`
              : "—",
          ajustes:
            totalAj > 0
              ? `${row.adjustmentsExecuted} aj · ${row.wastesExecuted} mer`
              : "—",
          compras:
            totalComp > 0
              ? `${row.preordersCreated} pre · ${row.ordersCreated} órd · $${Number(row.paymentsTotalUsd || 0).toFixed(2)}`
              : "—",
        };
      }
      if (currentViewKey === "USER_TIMELINE") {
        return {
          fecha: row.date
            ? new Date(row.date).toLocaleDateString("es-VE")
            : "---",
          usuario: row.userName || "---",
          modulo: row.module || "---",
          accion: row.actionType || "---",
          referencia: row.reference || "---",
          detalle: row.detail || "---",
          cantidad: row.quantityOrAmount || "---",
          estado: row.status || "---",
        };
      }
      if (currentViewKey === "KARDEX") {
        return {
          fecha: row.createdAt
            ? new Date(row.createdAt).toLocaleDateString("es-VE")
            : "---",
          referencia: row.referenceNumber || "S/R",
          tipo: MOVEMENT_TYPE_LABELS[row.type]?.label || row.type || "",
          insumo: row.productName || row.sku || "Insumo",
          lote: row.lotNumber || "---",
          cantidad: `${row.quantity} ${row.unit || "UND"}`,
          valor: `$${Number(row.totalCost || 0).toFixed(2)}`,
          responsable: row.user || "Sistema",
        };
      }
      if (currentViewKey === "DEPARTMENT_CONSUMPTION") {
        const totalReq = (row.items || []).reduce(
          (a: number, b: any) => a + Number(b.quantityRequested || 0),
          0,
        );
        const totalDisp = (row.items || []).reduce(
          (a: number, b: any) => a + Number(b.quantityDispatched || 0),
          0,
        );
        return {
          solicitud: `#${row.requestNumber || row.id}`,
          fecha: row.createdAt
            ? new Date(row.createdAt).toLocaleDateString("es-VE")
            : "---",
          departamento: row.departmentName || "---",
          solicitante: row.requester || "---",
          insumos: summarizeItemsForPdf(
            row.items || [],
            (it) => it.productName || it.name,
          ),
          unidades: `${totalDisp} / ${totalReq}`,
          estado: row.status || "---",
        };
      }
      if (currentViewKey === "SUPPLIER_ORDERS") {
        return {
          orden: `#${row.orderNumber || row.orderId}`,
          fecha: row.createdAt
            ? new Date(row.createdAt).toLocaleDateString("es-VE")
            : "---",
          proveedor: row.supplierName || "---",
          usuario: row.createdBy || "Sistema",
          insumos: summarizeItemsForPdf(row.items || [], (it) => it.name),
          facturado: `$${Number(row.invoicedUsd || 0).toFixed(2)}`,
          pagado: `$${Number(row.paidUsd || 0).toFixed(2)}`,
          estado: row.status || "---",
        };
      }
      if (currentViewKey === "SUPPLIER_SUMMARY") {
        return {
          proveedor: `${row.supplierName} (${row.rif})`,
          ordenes: row.totalOrders,
          insumos: summarizeItemsForPdf(
            row.topProductsPurchased || [],
            (p) => p.name,
          ),
          facturado: `$${Number(row.totalInvoicedUsd || 0).toFixed(2)}`,
          pagado: `$${Number(row.totalPaidUsd || 0).toFixed(2)}`,
          deuda: `$${Number(row.pendingDebtUsd || 0).toFixed(2)}`,
        };
      }
      if (currentViewKey === "SUPPLIER_DIRECT") {
        return {
          fecha: row.paymentDate
            ? new Date(row.paymentDate).toLocaleDateString("es-VE")
            : "---",
          beneficiario: row.beneficiary || "---",
          concepto: row.concept || "---",
          metodo: `${row.method} (Ref: ${row.referenceNumber})`,
          usuario: row.registeredBy || "---",
          montoUsd: `$${Number(row.equivalentAmountUsd || 0).toFixed(2)}`,
        };
      }
      if (currentViewKey === "PREORDERS") {
        return {
          preorden: `#${row.requisitionNumber}`,
          fecha: row.createdAt
            ? new Date(row.createdAt).toLocaleDateString("es-VE")
            : "---",
          departamento: row.departmentName || "---",
          usuario: row.createdBy || "---",
          insumos: summarizeItemsForPdf(
            row.items || [],
            (it) => it.productName,
          ),
          orden: row.linkedOrders || "Sin orden",
          estado: row.status || "---",
        };
      }
      return {
        sku: row.sku || "---",
        insumo: row.productName || "---",
        lote: `#${row.lotNumber || "---"}`,
        ubicacion: row.location || "---",
        stock: `${row.currentQuantity ?? 0} ${row.unit || "UND"}`,
        costo: `$${Number(row.costPrice || 0).toFixed(2)}`,
        valor: `$${Number(row.totalValueUsd || 0).toFixed(2)}`,
        vencimiento: row.expirationDate
          ? new Date(row.expirationDate).toLocaleDateString("es-VE")
          : "N/A",
      };
    },
    [currentViewKey],
  );

  const handleExportCSV = () => {
    if (!reportData) return;
    setDownloadingCsv(true);
    try {
      const dateTag = new Date().toISOString().slice(0, 10);
      const headers = visibleColumnsForView.map((c) => c.label);
      const csvRows = activeRows.map((r: any) => {
        const formatted = formatRowForExport(r);
        return visibleColumnsForView.map((c) => formatted[c.key] ?? "");
      });
      downloadCsv(
        `reporte_${currentViewKey.toLowerCase()}_${dateTag}.csv`,
        headers,
        csvRows,
      );
    } finally {
      setDownloadingCsv(false);
    }
  };

  const pdfConfig = useMemo(() => {
    if (!reportData || reportData.reportType !== reportType) return null;
    const config = REPORT_TYPE_CONFIG[reportType];

    const rawCols = visibleColumnsForView;
    const totalRawWidth = rawCols.reduce(
      (acc, c) => acc + (parseFloat(c.width) || 10),
      0,
    );
    const normalizedColumns: CustomReportColumn[] = rawCols.map((c) => ({
      ...c,
      width: `${Math.round(((parseFloat(c.width) || 10) / Math.max(1, totalRawWidth)) * 100)}%`,
    }));

    const formattedRows = activeRows.map((r: any) => formatRowForExport(r));

    let summaryItems: Array<{ label: string; value: string | number }> = [];
    const s = reportData.summary || {};

    if (reportType === "USER_ACTIVITY") {
      summaryItems = [
        { label: "Usuarios", value: s.totalUsers ?? 0 },
        { label: "Solicitudes", value: s.totalRequestsCreated ?? 0 },
        { label: "Despachos", value: s.totalDispatchesExecuted ?? 0 },
        {
          label: "Preórdenes / Órdenes",
          value: `${s.totalPreordersCreated ?? 0} / ${s.totalOrdersCreated ?? 0}`,
        },
        { label: "Ajustes / Mermas", value: s.totalAdjustmentsAndWastes ?? 0 },
        { label: "Pagos", value: s.totalPaymentsRegistered ?? 0 },
      ];
    } else if (reportType === "KARDEX") {
      summaryItems = [
        { label: "Movimientos", value: s.totalMovements ?? 0 },
        { label: "Entradas", value: s.purchasesCount ?? 0 },
        { label: "Despachos", value: s.dispatchesCount ?? 0 },
        {
          label: "Ajustes / Mermas",
          value: `${s.adjustmentsCount ?? 0} / ${s.wastesCount ?? 0}`,
        },
        {
          label: "Valor",
          value: `$${Number(s.totalValueUsd ?? 0).toFixed(2)}`,
        },
      ];
    } else if (reportType === "DEPARTMENT_CONSUMPTION") {
      summaryItems = [
        { label: "Solicitudes", value: s.totalRequests ?? 0 },
        {
          label: "Aprobadas / Completadas",
          value: `${s.approvedCount ?? 0} / ${s.completedCount ?? 0}`,
        },
        {
          label: "Pendientes / Rechazadas",
          value: `${s.pendingCount ?? 0} / ${s.rejectedCount ?? 0}`,
        },
        {
          label: "Unidades (Ent / Sol)",
          value: `${s.totalItemsDispatched ?? 0} / ${s.totalItemsRequested ?? 0}`,
        },
      ];
    } else if (reportType === "SUPPLIER_PAYMENTS") {
      summaryItems = [
        { label: "Órdenes", value: s.totalOrdersCount ?? 0 },
        {
          label: "Recibidas / Activas",
          value: `${s.completedOrdersCount ?? 0} / ${s.activeOrdersCount ?? 0}`,
        },
        {
          label: "Facturado",
          value: `$${Number(s.totalInvoicedUsd ?? 0).toFixed(2)}`,
        },
        {
          label: "Pagado",
          value: `$${Number(s.totalPaidUsd ?? 0).toFixed(2)}`,
        },
        {
          label: "Deuda",
          value: `$${Number(s.totalPendingDebtUsd ?? 0).toFixed(2)}`,
        },
      ];
    } else if (reportType === "PREORDERS") {
      summaryItems = [
        { label: "Preórdenes", value: s.totalPreorders ?? 0 },
        { label: "Cotizando", value: s.quotingCount ?? 0 },
        { label: "Adjudicadas", value: s.awardedCount ?? 0 },
        { label: "Canceladas", value: s.cancelledCount ?? 0 },
      ];
    } else if (reportType === "BATCH_EXPIRATION") {
      summaryItems = [
        { label: "Lotes", value: s.totalBatches ?? 0 },
        {
          label: "Valor Stock",
          value: `$${Number(s.totalStockValueUsd ?? 0).toFixed(2)}`,
        },
        { label: "Vencidos", value: s.expiredCount ?? 0 },
        { label: "Por Vencer", value: s.within30DaysCount ?? 0 },
      ];
    }

    const activeFilterParts: string[] = [];
    if (selectedUserId) {
      const u = usersList.find((x) => String(x.id) === selectedUserId);
      if (u) activeFilterParts.push(`Usuario: ${u.fullName}`);
    }
    if (selectedDepartmentId) {
      const d = departments.find((x) => String(x.id) === selectedDepartmentId);
      if (d) activeFilterParts.push(`Depto: ${d.name}`);
    }
    if (selectedSupplierId) {
      const sup = suppliers.find((x) => String(x.id) === selectedSupplierId);
      if (sup) activeFilterParts.push(`Proveedor: ${sup.name}`);
    }
    if (selectedStatus) activeFilterParts.push(`Estado: ${selectedStatus}`);
    if (selectedMovementType)
      activeFilterParts.push(`Tipo: ${selectedMovementType}`);

    return {
      title: customTitle || config.title,
      subtitle: customSubtitle || config.description,
      columns: normalizedColumns,
      rows: formattedRows,
      summaryItems,
      filterSummary:
        activeFilterParts.length > 0
          ? activeFilterParts.join(" · ")
          : "Todos los registros",
    };
  }, [
    reportData,
    reportType,
    visibleColumnsForView,
    activeRows,
    formatRowForExport,
    customTitle,
    customSubtitle,
    selectedUserId,
    selectedDepartmentId,
    selectedSupplierId,
    selectedStatus,
    selectedMovementType,
    usersList,
    departments,
    suppliers,
  ]);

  return (
    <div className="space-y-5 w-full pb-12">
      {/* ========================================================
          ENCABEZADO SIMPLE Y DIRECTO
         ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 shadow-2xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Reportes
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Usuarios, movimientos, solicitudes, compras, preórdenes y lotes
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleGenerateReport()}
            disabled={loading}
            className="h-8 text-xs gap-1.5 cursor-pointer"
          >
            <RefreshCw
              className={cn(
                "w-3.5 h-3.5",
                loading && "animate-spin text-primary",
              )}
            />
            Actualizar
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowColumnsModal(true)}
            className="h-8 text-xs gap-1.5 cursor-pointer"
          >
            <Columns className="w-3.5 h-3.5 text-primary" />
            Columnas ({visibleColumnsForView.length}/
            {availableColumnsForView.length})
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowConfigModal(true)}
            className="h-8 text-xs gap-1.5 cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
            Configurar PDF
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={downloadingCsv || !reportData}
            className="h-8 text-xs gap-1.5 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 bg-emerald-500/10 hover:bg-emerald-500/20 cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            {downloadingCsv ? "Exportando..." : "CSV"}
          </Button>

          {pdfConfig ? (
            <UniversalPdfDownloadButton
              document={
                <CustomReportPdfDocument
                  title={pdfConfig.title}
                  subtitle={pdfConfig.subtitle}
                  documentNumber={customDocNumber || "REP-IDI"}
                  badge={customBadge || "REPORTE OFICIAL"}
                  dateRange={
                    startDate && endDate
                      ? `${startDate} al ${endDate}`
                      : "Histórico Completo"
                  }
                  filterSummary={pdfConfig.filterSummary}
                  footerNotes={customFooterNotes}
                  columns={pdfConfig.columns}
                  rows={pdfConfig.rows}
                  summaryItems={pdfConfig.summaryItems}
                  includeSummaryMetrics={includeSummaryMetrics}
                  includeSignatures={includeSignatures}
                  orientation={pdfOrientation}
                  customSignatures={[
                    {
                      role: sig1Role || "Elaborado por",
                      name: sig1Name || undefined,
                      department: sig1Dept || "Control y Auditoría",
                    },
                    {
                      role: sig2Role || "Revisado por",
                      name: sig2Name || undefined,
                      department: sig2Dept || "Coordinación",
                    },
                    {
                      role: sig3Role || "Aprobado por",
                      name: sig3Name || undefined,
                      department: sig3Dept || "Dirección Ejecutiva",
                    },
                  ]}
                />
              }
              fileName={`reporte_${currentViewKey.toLowerCase()}_${new Date().toISOString().slice(0, 10)}`}
              buttonLabel="Descargar PDF"
              previewLabel="Vista PDF"
              dialogTitle={pdfConfig.title}
            />
          ) : (
            <UniversalPdfDownloadButton
              document={
                <CustomReportPdfDocument
                  title="Reporte ERP-IDI"
                  columns={[]}
                  rows={[]}
                />
              }
              fileName="reporte_erp_idi"
              buttonLabel="Descargar PDF"
              previewLabel="Vista PDF"
            />
          )}
        </div>
      </div>

      {/* ========================================================
          SELECTOR DE MÓDULO (6 TABS) + FECHAS RÁPIDAS
         ======================================================== */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <Tabs
          value={reportType}
          onValueChange={(val) =>
            handleReportTypeChange(val as CustomReportType)
          }
          className="w-full xl:w-auto"
        >
          <TabsList className="bg-muted/70 p-1 rounded-xl h-auto flex flex-wrap gap-1 justify-start border border-border/60">
            {(Object.keys(REPORT_TYPE_CONFIG) as CustomReportType[]).map(
              (key) => {
                const cfg = REPORT_TYPE_CONFIG[key];
                const Icon = cfg.icon;
                return (
                  <TabsTrigger
                    key={key}
                    value={key}
                    className={cn(
                      "gap-1.5 py-1.5 px-3.5 text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs cursor-pointer",
                      cfg.activeClass,
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cfg.label}</span>
                  </TabsTrigger>
                );
              },
            )}
          </TabsList>
        </Tabs>

        <div className="inline-flex items-center rounded-xl p-1 bg-muted/70 border border-border/60 text-xs font-semibold flex-wrap gap-0.5 self-start xl:self-auto">
          {(
            [
              ["all", "Todo"],
              ["today", "Hoy"],
              ["week", "7 días"],
              ["month", "Este Mes"],
              ["last_month", "Mes Pasado"],
              ["year", "Este Año"],
            ] as const
          ).map(([presetKey, label]) => (
            <button
              key={presetKey}
              type="button"
              onClick={() => setDatePreset(presetKey)}
              className={cn(
                "px-2.5 py-1 rounded-lg transition-all cursor-pointer",
                activeDatePreset === presetKey
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================
          BARRA DE FILTROS
         ======================================================== */}
      <Card className="border-border/80 shadow-2xs">
        <CardContent className="p-3.5 flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar usuario, código, insumo o proveedor..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 pr-8 h-9 text-xs bg-background border-border/80 rounded-xl"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setCurrentPage(1);
                }}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-background border border-border/80 rounded-xl px-2.5 h-9">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setActiveDatePreset("custom");
                setCurrentPage(1);
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
                setActiveDatePreset("custom");
                setCurrentPage(1);
              }}
              className="bg-transparent focus:outline-none text-foreground text-xs cursor-pointer"
              title="Hasta"
            />
          </div>

          {reportType !== "BATCH_EXPIRATION" && usersList.length > 0 && (
            <select
              value={selectedUserId}
              onChange={(e) => {
                setSelectedUserId(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 bg-background border border-border/80 rounded-xl px-3 text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring outline-none cursor-pointer max-w-[200px]"
            >
              <option value="">Todos los usuarios</option>
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </select>
          )}

          {(reportType === "USER_ACTIVITY" ||
            reportType === "DEPARTMENT_CONSUMPTION" ||
            reportType === "PREORDERS" ||
            reportType === "KARDEX") && (
            <select
              value={selectedDepartmentId}
              onChange={(e) => {
                setSelectedDepartmentId(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 bg-background border border-border/80 rounded-xl px-3 text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring outline-none cursor-pointer max-w-[190px]"
            >
              <option value="">Todos los departamentos</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}

          {(reportType === "SUPPLIER_PAYMENTS" || reportType === "KARDEX") && (
            <select
              value={selectedSupplierId}
              onChange={(e) => {
                setSelectedSupplierId(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 bg-background border border-border/80 rounded-xl px-3 text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring outline-none cursor-pointer max-w-[190px]"
            >
              <option value="">Todos los proveedores</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          {reportType === "USER_ACTIVITY" && userSubView === "TIMELINE" && (
            <select
              value={selectedMovementType}
              onChange={(e) => {
                setSelectedMovementType(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 bg-background border border-border/80 rounded-xl px-3 text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring outline-none cursor-pointer"
            >
              <option value="">Todos los módulos</option>
              <option value="Solicitudes">Solicitudes</option>
              <option value="Almacén">Almacén</option>
              <option value="Compras">Compras</option>
              <option value="Pagos">Pagos</option>
            </select>
          )}

          {reportType === "KARDEX" && (
            <select
              value={selectedMovementType}
              onChange={(e) => {
                setSelectedMovementType(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 bg-background border border-border/80 rounded-xl px-3 text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring outline-none cursor-pointer"
            >
              <option value="">Todos los tipos</option>
              <option value="ENTRADA_COMPRA">Entradas</option>
              <option value="DESPACHO_SOLICITUD">Despachos</option>
              <option value="AJUSTE_INVENTARIO">Ajustes</option>
              <option value="DESCARTE_MERMA">Mermas</option>
            </select>
          )}

          {reportType === "DEPARTMENT_CONSUMPTION" && (
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 bg-background border border-border/80 rounded-xl px-3 text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring outline-none cursor-pointer"
            >
              <option value="">Todos los estados</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="APROBADA">Aprobadas</option>
              <option value="DESPACHADA_PARCIAL">Parciales</option>
              <option value="COMPLETADA">Completadas</option>
              <option value="RECHAZADA">Rechazadas</option>
            </select>
          )}

          {reportType === "SUPPLIER_PAYMENTS" && (
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 bg-background border border-border/80 rounded-xl px-3 text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring outline-none cursor-pointer"
            >
              <option value="">Todos los estados</option>
              <option value="BORRADOR">Borrador</option>
              <option value="ENVIADA">Enviadas</option>
              <option value="PARCIAL">Parciales</option>
              <option value="COMPLETADA">Completadas</option>
              <option value="CANCELADA">Canceladas</option>
            </select>
          )}

          {reportType === "PREORDERS" && (
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 bg-background border border-border/80 rounded-xl px-3 text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring outline-none cursor-pointer"
            >
              <option value="">Todos los estados</option>
              <option value="BORRADOR">Borrador</option>
              <option value="EN_COTIZACION">Cotizando</option>
              <option value="ADJUDICADA">Adjudicadas</option>
              <option value="CANCELADA">Canceladas</option>
            </select>
          )}

          {reportType === "BATCH_EXPIRATION" && (
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 bg-background border border-border/80 rounded-xl px-3 text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring outline-none cursor-pointer"
            >
              <option value="">Todos los estados</option>
              <option value="DISPONIBLE">Disponibles</option>
              <option value="EN_CUARENTENA">Cuarentena</option>
              <option value="AGOTADO">Agotados</option>
              <option value="VENCIDO">Vencidos</option>
            </select>
          )}

          {reportType !== "USER_ACTIVITY" && (
            <>
              <select
                value={selectedCategoryId}
                onChange={(e) => {
                  setSelectedCategoryId(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 bg-background border border-border/80 rounded-xl px-3 text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring outline-none cursor-pointer max-w-[175px]"
              >
                <option value="">Todas las categorías</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-9 bg-background border border-border/80 rounded-xl px-3 text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring outline-none cursor-pointer max-w-[190px]"
              >
                <option value="">Todos los insumos</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </>
          )}

          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Limpiar
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ========================================================
          TABLA PRINCIPAL
         ======================================================== */}
      <Card className="overflow-hidden border-border/80 shadow-2xs">
        <div className="p-4 border-b border-border bg-muted/30 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold text-foreground">
              {REPORT_TYPE_CONFIG[reportType].title}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {REPORT_TYPE_CONFIG[reportType].description}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* 1. USUARIOS */}
            {reportType === "USER_ACTIVITY" &&
              reportData?.reportType === "USER_ACTIVITY" &&
              reportData.summary && (
                <>
                  <div className="inline-flex rounded-lg p-0.5 bg-muted border border-border/60 text-xs font-semibold mr-1">
                    <button
                      type="button"
                      onClick={() => {
                        setUserSubView("SUMMARY");
                        setCurrentPage(1);
                      }}
                      className={cn(
                        "px-3 py-1 rounded-md transition-all cursor-pointer",
                        userSubView === "SUMMARY"
                          ? "bg-background text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      Usuarios ({reportData.rows?.length ?? 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUserSubView("TIMELINE");
                        setCurrentPage(1);
                      }}
                      className={cn(
                        "px-3 py-1 rounded-md transition-all cursor-pointer",
                        userSubView === "TIMELINE"
                          ? "bg-background text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      Acciones ({reportData.userActionLogs?.length ?? 0})
                    </button>
                  </div>

                  <Badge variant="purple" className="font-mono text-xs">
                    Solicitudes: {reportData.summary.totalRequestsCreated ?? 0}
                  </Badge>
                  <Badge variant="warning" className="font-mono text-xs">
                    Despachos: {reportData.summary.totalDispatchesExecuted ?? 0}
                  </Badge>
                  <Badge variant="info" className="font-mono text-xs">
                    Órdenes: {reportData.summary.totalOrdersCreated ?? 0}
                  </Badge>
                  <Badge variant="success" className="font-mono text-xs">
                    Pagos: {reportData.summary.totalPaymentsRegistered ?? 0}
                  </Badge>
                </>
              )}

            {/* 2. MOVIMIENTOS */}
            {reportType === "KARDEX" &&
              reportData?.reportType === "KARDEX" &&
              reportData.summary && (
                <>
                  <Badge variant="outline" className="font-mono text-xs">
                    {reportData.rows?.length ?? 0} registros
                  </Badge>
                  <Badge variant="success" className="font-mono text-xs">
                    Compras: {reportData.summary.purchasesCount ?? 0} (+
                    {reportData.summary.totalEntries ?? 0} u.)
                  </Badge>
                  <Badge variant="warning" className="font-mono text-xs">
                    Despachos: {reportData.summary.dispatchesCount ?? 0} (-
                    {reportData.summary.totalExits ?? 0} u.)
                  </Badge>
                  <Badge variant="info" className="font-mono text-xs">
                    Ajustes: {reportData.summary.adjustmentsCount ?? 0}
                  </Badge>
                  <Badge variant="destructive" className="font-mono text-xs">
                    Mermas: {reportData.summary.wastesCount ?? 0}
                  </Badge>
                </>
              )}

            {/* 3. SOLICITUDES */}
            {reportType === "DEPARTMENT_CONSUMPTION" &&
              reportData?.reportType === "DEPARTMENT_CONSUMPTION" &&
              reportData.summary && (
                <>
                  <Badge variant="outline" className="font-mono text-xs">
                    Total: {reportData.summary.totalRequests ?? 0}
                  </Badge>
                  <Badge variant="warning" className="font-mono text-xs">
                    Pendientes: {reportData.summary.pendingCount ?? 0}
                  </Badge>
                  <Badge variant="info" className="font-mono text-xs">
                    Aprobadas: {reportData.summary.approvedCount ?? 0}
                  </Badge>
                  <Badge variant="success" className="font-mono text-xs">
                    Completadas: {reportData.summary.completedCount ?? 0}
                  </Badge>
                  <Badge variant="destructive" className="font-mono text-xs">
                    Rechazadas: {reportData.summary.rejectedCount ?? 0}
                  </Badge>
                </>
              )}

            {/* 4. COMPRAS Y PAGOS */}
            {reportType === "SUPPLIER_PAYMENTS" &&
              reportData?.reportType === "SUPPLIER_PAYMENTS" &&
              reportData.summary && (
                <>
                  <div className="inline-flex rounded-lg p-0.5 bg-muted border border-border/60 text-xs font-semibold mr-1">
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentsSubView("ORDERS");
                        setCurrentPage(1);
                      }}
                      className={cn(
                        "px-3 py-1 rounded-md transition-all cursor-pointer",
                        paymentsSubView === "ORDERS"
                          ? "bg-background text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      Órdenes ({reportData.orders?.length ?? 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentsSubView("SUPPLIERS");
                        setCurrentPage(1);
                      }}
                      className={cn(
                        "px-3 py-1 rounded-md transition-all cursor-pointer",
                        paymentsSubView === "SUPPLIERS"
                          ? "bg-background text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      Proveedores ({reportData.supplierSummaries?.length ?? 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentsSubView("DIRECT");
                        setCurrentPage(1);
                      }}
                      className={cn(
                        "px-3 py-1 rounded-md transition-all cursor-pointer",
                        paymentsSubView === "DIRECT"
                          ? "bg-background text-foreground shadow-2xs"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      Gastos ({reportData.directPayments?.length ?? 0})
                    </button>
                  </div>

                  <Badge variant="info" className="font-mono text-xs">
                    Facturado: $
                    {Number(
                      reportData.summary.totalInvoicedUsd ?? 0,
                    ).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Badge>
                  <Badge variant="success" className="font-mono text-xs">
                    Pagado: $
                    {Number(
                      reportData.summary.totalPaidUsd ?? 0,
                    ).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Badge>
                  <Badge variant="destructive" className="font-mono text-xs">
                    Deuda: $
                    {Number(
                      reportData.summary.totalPendingDebtUsd ?? 0,
                    ).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Badge>
                </>
              )}

            {/* 5. PREÓRDENES */}
            {reportType === "PREORDERS" &&
              reportData?.reportType === "PREORDERS" &&
              reportData.summary && (
                <>
                  <Badge variant="outline" className="font-mono text-xs">
                    Total: {reportData.summary.totalPreorders ?? 0}
                  </Badge>
                  <Badge variant="warning" className="font-mono text-xs">
                    Cotizando: {reportData.summary.quotingCount ?? 0}
                  </Badge>
                  <Badge variant="success" className="font-mono text-xs">
                    Adjudicadas: {reportData.summary.awardedCount ?? 0}
                  </Badge>
                  <Badge variant="destructive" className="font-mono text-xs">
                    Canceladas: {reportData.summary.cancelledCount ?? 0}
                  </Badge>
                </>
              )}

            {/* 6. LOTES */}
            {reportType === "BATCH_EXPIRATION" &&
              reportData?.reportType === "BATCH_EXPIRATION" &&
              reportData.summary && (
                <>
                  <Badge variant="outline" className="font-mono text-xs">
                    {reportData.summary.totalBatches ?? 0} lotes
                  </Badge>
                  <Badge variant="info" className="font-mono text-xs">
                    Valor: $
                    {Number(
                      reportData.summary.totalStockValueUsd ?? 0,
                    ).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </Badge>
                  <Badge variant="destructive" className="font-mono text-xs">
                    Vencidos: {reportData.summary.expiredCount ?? 0}
                  </Badge>
                  <Badge variant="warning" className="font-mono text-xs">
                    Por Vencer: {reportData.summary.within30DaysCount ?? 0}
                  </Badge>
                </>
              )}
          </div>
        </div>

        {/* Contenido de Tabla */}
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">
              Cargando datos...
            </span>
          </div>
        ) : activeRows.length === 0 ? (
          <div className="py-14 text-center text-muted-foreground space-y-1.5">
            <FileText className="w-8 h-8 text-muted-foreground/50 mx-auto" />
            <p className="text-xs font-semibold text-foreground">
              Sin resultados para los filtros seleccionados
            </p>
          </div>
        ) : (
          <>
            {/* 1A. TABLA: USUARIOS (DISEÑO LIMPIO, SIN ROLES, ESPACIADO Y DIRECTO) */}
            {reportType === "USER_ACTIVITY" && userSubView === "SUMMARY" && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    {isColVisible("usuario") && (
                      <TableHead className="py-3.5 px-5 font-bold">
                        Usuario
                      </TableHead>
                    )}
                    {isColVisible("departamento") && (
                      <TableHead className="py-3.5 px-5 font-bold">
                        Departamento
                      </TableHead>
                    )}
                    {isColVisible("solicitudes") && (
                      <TableHead className="py-3.5 px-5 text-center font-bold">
                        Solicitudes
                      </TableHead>
                    )}
                    {isColVisible("unidades") && (
                      <TableHead className="py-3.5 px-5 text-center font-bold">
                        Unidades
                      </TableHead>
                    )}
                    {isColVisible("almacen") && (
                      <TableHead className="py-3.5 px-5 text-center font-bold">
                        Almacén
                      </TableHead>
                    )}
                    {isColVisible("ajustes") && (
                      <TableHead className="py-3.5 px-5 text-center font-bold">
                        Ajustes / Mermas
                      </TableHead>
                    )}
                    {isColVisible("compras") && (
                      <TableHead className="py-3.5 px-5 text-right font-bold">
                        Compras y Pagos
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRows.map((u: any, idx: number) => {
                    const approvedCount =
                      Number(u.requestsApproved || 0) +
                      Number(u.requestsCompleted || 0);
                    const totalAlm =
                      Number(u.dispatchesExecuted || 0) +
                      Number(u.receptionsExecuted || 0);
                    const totalAj =
                      Number(u.adjustmentsExecuted || 0) +
                      Number(u.wastesExecuted || 0);
                    const totalComp =
                      Number(u.preordersCreated || 0) +
                      Number(u.ordersCreated || 0) +
                      Number(u.paymentsRegistered || 0);

                    return (
                      <TableRow
                        key={`usr-${u.userId ?? idx}-${idx}`}
                        onClick={() => setSelectedUserDetail(u)}
                        className="hover:bg-muted/40 cursor-pointer transition-colors"
                      >
                        {isColVisible("usuario") && (
                          <TableCell className="py-4 px-5">
                            <div className="font-bold text-foreground">
                              {u.fullName}
                            </div>
                            <span className="text-xs font-mono text-muted-foreground">
                              @{u.username}
                            </span>
                          </TableCell>
                        )}
                        {isColVisible("departamento") && (
                          <TableCell className="py-4 px-5 text-muted-foreground">
                            {u.department || "General"}
                          </TableCell>
                        )}
                        {isColVisible("solicitudes") && (
                          <TableCell className="py-4 px-5 text-center">
                            {u.requestsCreated > 0 ? (
                              <div className="inline-flex flex-col items-center gap-1">
                                <span className="font-bold font-mono text-foreground">
                                  {u.requestsCreated}{" "}
                                  {u.requestsCreated === 1
                                    ? "pedido"
                                    : "pedidos"}
                                </span>
                                <div className="flex items-center gap-1.5 text-xs font-mono">
                                  {approvedCount > 0 && (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                      {approvedCount} aprob
                                    </span>
                                  )}
                                  {u.requestsRejected > 0 && (
                                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                                      {u.requestsRejected} rech
                                    </span>
                                  )}
                                  {u.requestsPending > 0 && (
                                    <span className="text-amber-600 dark:text-amber-400">
                                      {u.requestsPending} pend
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/40">
                                —
                              </span>
                            )}
                          </TableCell>
                        )}
                        {isColVisible("unidades") && (
                          <TableCell className="py-4 px-5 text-center font-mono">
                            {u.unitsRequested > 0 ? (
                              <div>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  {u.unitsReceived}
                                </span>{" "}
                                <span className="text-muted-foreground">
                                  / {u.unitsRequested}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/40">
                                —
                              </span>
                            )}
                          </TableCell>
                        )}
                        {isColVisible("almacen") && (
                          <TableCell className="py-4 px-5 text-center font-mono">
                            {totalAlm > 0 ? (
                              <div className="inline-flex items-center gap-2 text-xs">
                                {u.dispatchesExecuted > 0 && (
                                  <Badge variant="warning" className="text-xs">
                                    {u.dispatchesExecuted} desp
                                  </Badge>
                                )}
                                {u.receptionsExecuted > 0 && (
                                  <Badge variant="success" className="text-xs">
                                    {u.receptionsExecuted} ent
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground/40">
                                —
                              </span>
                            )}
                          </TableCell>
                        )}
                        {isColVisible("ajustes") && (
                          <TableCell className="py-4 px-5 text-center font-mono">
                            {totalAj > 0 ? (
                              <div className="inline-flex items-center gap-2 text-xs">
                                {u.adjustmentsExecuted > 0 && (
                                  <span className="font-bold text-blue-600 dark:text-blue-400">
                                    {u.adjustmentsExecuted} aj
                                  </span>
                                )}
                                {u.wastesExecuted > 0 && (
                                  <span className="font-bold text-rose-600 dark:text-rose-400">
                                    {u.wastesExecuted} mer
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground/40">
                                —
                              </span>
                            )}
                          </TableCell>
                        )}
                        {isColVisible("compras") && (
                          <TableCell className="py-4 px-5 text-right font-mono">
                            {totalComp > 0 ? (
                              <div className="space-y-0.5">
                                <div className="font-bold text-foreground text-xs">
                                  {u.preordersCreated > 0 &&
                                    `${u.preordersCreated} pre`}
                                  {u.preordersCreated > 0 &&
                                    u.ordersCreated > 0 &&
                                    " · "}
                                  {u.ordersCreated > 0 &&
                                    `${u.ordersCreated} órd`}
                                </div>
                                {u.paymentsRegistered > 0 && (
                                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    ${Number(u.paymentsTotalUsd || 0).toFixed(2)}{" "}
                                    ({u.paymentsRegistered} pagos)
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground/40">
                                —
                              </span>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {/* 1B. TABLA: USUARIOS -> ACCIONES */}
            {reportType === "USER_ACTIVITY" && userSubView === "TIMELINE" && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    {isColVisible("fecha") && (
                      <TableHead className="py-3.5 px-4 font-bold">
                        Fecha
                      </TableHead>
                    )}
                    {isColVisible("usuario") && (
                      <TableHead className="py-3.5 px-4 font-bold">
                        Usuario
                      </TableHead>
                    )}
                    {isColVisible("modulo") && (
                      <TableHead className="py-3.5 px-4 font-bold">
                        Módulo
                      </TableHead>
                    )}
                    {isColVisible("accion") && (
                      <TableHead className="py-3.5 px-4 font-bold">
                        Acción
                      </TableHead>
                    )}
                    {isColVisible("referencia") && (
                      <TableHead className="py-3.5 px-4 font-bold">
                        Referencia
                      </TableHead>
                    )}
                    {isColVisible("detalle") && (
                      <TableHead className="py-3.5 px-4 font-bold">
                        Detalle
                      </TableHead>
                    )}
                    {isColVisible("cantidad") && (
                      <TableHead className="py-3.5 px-4 text-right font-bold">
                        Total
                      </TableHead>
                    )}
                    {isColVisible("estado") && (
                      <TableHead className="py-3.5 px-4 text-center font-bold">
                        Estado
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRows.map((log: any, idx: number) => (
                    <TableRow
                      key={`log-${log.id ?? idx}-${idx}`}
                      className="hover:bg-muted/40"
                    >
                      {isColVisible("fecha") && (
                        <TableCell className="py-3.5 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {log.date
                            ? new Date(log.date).toLocaleDateString("es-VE")
                            : "---"}
                        </TableCell>
                      )}
                      {isColVisible("usuario") && (
                        <TableCell className="py-3.5 px-4">
                          <div className="font-bold text-foreground">
                            {log.userName}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {log.department}
                          </span>
                        </TableCell>
                      )}
                      {isColVisible("modulo") && (
                        <TableCell className="py-3.5 px-4">
                          <Badge
                            variant={
                              log.module === "Solicitudes"
                                ? "purple"
                                : log.module === "Almacén"
                                  ? "warning"
                                  : log.module === "Compras"
                                    ? "info"
                                    : "success"
                            }
                            className="text-[11px]"
                          >
                            {log.module}
                          </Badge>
                        </TableCell>
                      )}
                      {isColVisible("accion") && (
                        <TableCell className="py-3.5 px-4 font-semibold text-foreground whitespace-nowrap">
                          {log.actionType}
                        </TableCell>
                      )}
                      {isColVisible("referencia") && (
                        <TableCell className="py-3.5 px-4 font-mono font-bold text-primary whitespace-nowrap">
                          {log.reference}
                        </TableCell>
                      )}
                      {isColVisible("detalle") && (
                        <TableCell className="py-3.5 px-4 text-muted-foreground max-w-md truncate">
                          {log.detail}
                        </TableCell>
                      )}
                      {isColVisible("cantidad") && (
                        <TableCell className="py-3.5 px-4 text-right font-mono font-bold text-foreground whitespace-nowrap">
                          {log.quantityOrAmount}
                        </TableCell>
                      )}
                      {isColVisible("estado") && (
                        <TableCell className="py-3.5 px-4 text-center whitespace-nowrap">
                          <Badge
                            variant={
                              log.status === "COMPLETADA" ||
                              log.status === "PAGADO" ||
                              log.status === "PROCESADO" ||
                              log.status === "ADJUDICADA"
                                ? "success"
                                : log.status === "RECHAZADA" ||
                                    log.status === "CANCELADA"
                                  ? "destructive"
                                  : "info"
                            }
                            className="text-[11px]"
                          >
                            {log.status}
                          </Badge>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* 2. TABLA: MOVIMIENTOS */}
            {reportType === "KARDEX" && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    {isColVisible("fecha") && (
                      <TableHead className="py-3.5 px-4 font-bold">
                        Fecha
                      </TableHead>
                    )}
                    {isColVisible("referencia") && (
                      <TableHead className="py-3.5 px-4 font-bold">
                        Referencia
                      </TableHead>
                    )}
                    {isColVisible("tipo") && (
                      <TableHead className="py-3.5 px-4 font-bold">
                        Tipo
                      </TableHead>
                    )}
                    {isColVisible("insumo") && (
                      <TableHead className="py-3.5 px-4 font-bold">
                        Insumo
                      </TableHead>
                    )}
                    {isColVisible("lote") && (
                      <TableHead className="py-3.5 px-4 font-bold">
                        Lote
                      </TableHead>
                    )}
                    {isColVisible("cantidad") && (
                      <TableHead className="py-3.5 px-4 text-right font-bold">
                        Cantidad
                      </TableHead>
                    )}
                    {isColVisible("valor") && (
                      <TableHead className="py-3.5 px-4 text-right font-bold">
                        Valor ($)
                      </TableHead>
                    )}
                    {isColVisible("responsable") && (
                      <TableHead className="py-3.5 px-4 font-bold">
                        Usuario
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRows.map((row: any, idx: number) => {
                    const cfg = MOVEMENT_TYPE_LABELS[row.type] || {
                      label: (row.type || "MOVIMIENTO").replace(/_/g, " "),
                      variant: "outline" as const,
                      isEntry: true,
                    };
                    const isPos =
                      row.type === "ENTRADA_COMPRA" ||
                      (row.type === "AJUSTE_INVENTARIO" &&
                        Number(row.quantity) >= 0);

                    return (
                      <TableRow
                        key={`kardex-${row.referenceNumber ?? idx}-${idx}`}
                        className="hover:bg-muted/40"
                      >
                        {isColVisible("fecha") && (
                          <TableCell className="py-3.5 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {row.createdAt
                              ? new Date(row.createdAt).toLocaleDateString(
                                  "es-VE",
                                )
                              : "---"}
                          </TableCell>
                        )}
                        {isColVisible("referencia") && (
                          <TableCell className="py-3.5 px-4 font-mono font-bold text-primary whitespace-nowrap">
                            {row.referenceNumber}
                          </TableCell>
                        )}
                        {isColVisible("tipo") && (
                          <TableCell className="py-3.5 px-4 whitespace-nowrap">
                            <Badge variant={cfg.variant} className="text-[11px]">
                              {cfg.label}
                            </Badge>
                          </TableCell>
                        )}
                        {isColVisible("insumo") && (
                          <TableCell className="py-3.5 px-4">
                            <div className="font-semibold text-foreground truncate max-w-xs">
                              {row.productName}
                            </div>
                            <span className="text-xs font-mono text-muted-foreground">
                              {row.sku}
                            </span>
                          </TableCell>
                        )}
                        {isColVisible("lote") && (
                          <TableCell className="py-3.5 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {row.lotNumber || "N/A"}
                          </TableCell>
                        )}
                        {isColVisible("cantidad") && (
                          <TableCell className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                            <span
                              className={cn(
                                "inline-flex items-center gap-0.5",
                                isPos
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-rose-600 dark:text-rose-400",
                              )}
                            >
                              {isPos ? (
                                <ArrowDownLeft className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              )}
                              {isPos ? `+${row.quantity}` : row.quantity}{" "}
                              {row.unit}
                            </span>
                          </TableCell>
                        )}
                        {isColVisible("valor") && (
                          <TableCell className="py-3.5 px-4 text-right font-mono font-bold text-foreground whitespace-nowrap">
                            ${Number(row.totalCost || 0).toFixed(2)}
                          </TableCell>
                        )}
                        {isColVisible("responsable") && (
                          <TableCell className="py-3.5 px-4 text-xs text-muted-foreground truncate max-w-40">
                            {row.user}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {/* 3. TABLA: SOLICITUDES (RESUMEN GENERAL DE INSUMOS + MODAL AL HACER CLIC) */}
            {reportType === "DEPARTMENT_CONSUMPTION" && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    {isColVisible("solicitud") && (
                      <TableHead className="py-3.5 px-4 font-bold">
                        Código
                      </TableHead>
                    )}
                    {isColVisible("fecha") && (
                      <TableHead className="py-3.5 px-4 font-bold">
                        Fecha
                      </TableHead>
                    )}
                    {isColVisible("departamento") && (
                      <TableHead className="py-3.5 px-4 font-bold">
                        Departamento
                      </TableHead>
                    )}
                    {isColVisible("solicitante") && (
                      <TableHead className="py-3.5 px-4 font-bold">
                        Solicitante
                      </TableHead>
                    )}
                    {isColVisible("insumos") && (
                      <TableHead className="py-3.5 px-4 font-bold">
                        Insumos
                      </TableHead>
                    )}
                    {isColVisible("unidades") && (
                      <TableHead className="py-3.5 px-4 text-center font-bold">
                        Entregado / Pedido
                      </TableHead>
                    )}
                    {isColVisible("estado") && (
                      <TableHead className="py-3.5 px-4 text-center font-bold">
                        Estado
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRows.map((req: any, idx: number) => {
                    const totalReq = (req.items || []).reduce(
                      (a: number, b: any) => a + Number(b.quantityRequested || 0),
                      0,
                    );
                    const totalDisp = (req.items || []).reduce(
                      (a: number, b: any) =>
                        a + Number(b.quantityDispatched || 0),
                      0,
                    );
                    return (
                      <TableRow
                        key={`req-${req.id ?? idx}-${idx}`}
                        onClick={() =>
                          setSelectedRowDetail({ type: "REQUEST", data: req })
                        }
                        className="hover:bg-muted/40 cursor-pointer transition-colors"
                      >
                        {isColVisible("solicitud") && (
                          <TableCell className="py-3.5 px-4 font-mono font-bold text-primary whitespace-nowrap">
                            #{req.requestNumber}
                          </TableCell>
                        )}
                        {isColVisible("fecha") && (
                          <TableCell className="py-3.5 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {req.createdAt
                              ? new Date(req.createdAt).toLocaleDateString(
                                  "es-VE",
                                )
                              : "---"}
                          </TableCell>
                        )}
                        {isColVisible("departamento") && (
                          <TableCell className="py-3.5 px-4 font-semibold text-foreground">
                            {req.departmentName}
                          </TableCell>
                        )}
                        {isColVisible("solicitante") && (
                          <TableCell className="py-3.5 px-4 text-foreground whitespace-nowrap">
                            {req.requester}
                          </TableCell>
                        )}
                        {isColVisible("insumos") && (
                          <TableCell className="py-3.5 px-4">
                            <ItemsSummaryCell
                              items={req.items || []}
                              getName={(it) => it.productName || it.name}
                              getQtyText={(it) =>
                                `${it.quantityDispatched ?? 0}/${it.quantityRequested ?? 0}`
                              }
                            />
                          </TableCell>
                        )}
                        {isColVisible("unidades") && (
                          <TableCell className="py-3.5 px-4 text-center font-mono">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
                              {totalDisp}
                            </span>{" "}
                            <span className="text-muted-foreground">
                              / {totalReq}
                            </span>
                          </TableCell>
                        )}
                        {isColVisible("estado") && (
                          <TableCell className="py-3.5 px-4 text-center">
                            <Badge
                              variant={
                                req.status === "COMPLETADA"
                                  ? "success"
                                  : req.status === "APROBADA"
                                    ? "info"
                                    : req.status === "DESPACHADA_PARCIAL"
                                      ? "purple"
                                      : req.status === "RECHAZADA"
                                        ? "destructive"
                                        : "warning"
                              }
                              className="text-[11px]"
                            >
                              {req.status}
                            </Badge>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {/* 4A. TABLA: COMPRAS -> ÓRDENES (RESUMEN GENERAL DE INSUMOS + MODAL AL HACER CLIC) */}
            {reportType === "SUPPLIER_PAYMENTS" &&
              paymentsSubView === "ORDERS" && (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      {isColVisible("orden") && (
                        <TableHead className="py-3.5 px-4 font-bold">
                          Orden
                        </TableHead>
                      )}
                      {isColVisible("fecha") && (
                        <TableHead className="py-3.5 px-4 font-bold">
                          Fecha
                        </TableHead>
                      )}
                      {isColVisible("proveedor") && (
                        <TableHead className="py-3.5 px-4 font-bold">
                          Proveedor
                        </TableHead>
                      )}
                      {isColVisible("usuario") && (
                        <TableHead className="py-3.5 px-4 font-bold">
                          Usuario
                        </TableHead>
                      )}
                      {isColVisible("insumos") && (
                        <TableHead className="py-3.5 px-4 font-bold">
                          Insumos
                        </TableHead>
                      )}
                      {isColVisible("facturado") && (
                        <TableHead className="py-3.5 px-4 text-right font-bold">
                          Total ($)
                        </TableHead>
                      )}
                      {isColVisible("pagado") && (
                        <TableHead className="py-3.5 px-4 text-right font-bold">
                          Pagado ($)
                        </TableHead>
                      )}
                      {isColVisible("estado") && (
                        <TableHead className="py-3.5 px-4 text-center font-bold">
                          Estado
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRows.map((ord: any, idx: number) => (
                      <TableRow
                        key={`ord-${ord.orderId ?? idx}-${idx}`}
                        onClick={() =>
                          setSelectedRowDetail({ type: "ORDER", data: ord })
                        }
                        className="hover:bg-muted/40 cursor-pointer transition-colors"
                      >
                        {isColVisible("orden") && (
                          <TableCell className="py-3.5 px-4 font-mono font-bold text-primary whitespace-nowrap">
                            #{ord.orderNumber}
                          </TableCell>
                        )}
                        {isColVisible("fecha") && (
                          <TableCell className="py-3.5 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {ord.createdAt
                              ? new Date(ord.createdAt).toLocaleDateString(
                                  "es-VE",
                                )
                              : "---"}
                          </TableCell>
                        )}
                        {isColVisible("proveedor") && (
                          <TableCell className="py-3.5 px-4">
                            <div className="font-semibold text-foreground">
                              {ord.supplierName}
                            </div>
                            <span className="text-xs font-mono text-muted-foreground">
                              {ord.supplierRif}
                            </span>
                          </TableCell>
                        )}
                        {isColVisible("usuario") && (
                          <TableCell className="py-3.5 px-4 text-muted-foreground">
                            {ord.createdBy || "Sistema"}
                          </TableCell>
                        )}
                        {isColVisible("insumos") && (
                          <TableCell className="py-3.5 px-4">
                            <ItemsSummaryCell
                              items={ord.items || []}
                              getName={(it) => it.name}
                              getQtyText={(it) =>
                                `${it.quantityReceived || it.quantityOrdered} ${it.unit || ""}`
                              }
                            />
                          </TableCell>
                        )}
                        {isColVisible("facturado") && (
                          <TableCell className="py-3.5 px-4 text-right font-mono font-bold text-foreground whitespace-nowrap">
                            ${Number(ord.invoicedUsd || 0).toFixed(2)}
                          </TableCell>
                        )}
                        {isColVisible("pagado") && (
                          <TableCell className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            ${Number(ord.paidUsd || 0).toFixed(2)}
                          </TableCell>
                        )}
                        {isColVisible("estado") && (
                          <TableCell className="py-3.5 px-4 text-center whitespace-nowrap">
                            <Badge
                              variant={
                                ord.status === "COMPLETADA"
                                  ? "success"
                                  : ord.status === "CANCELADA"
                                    ? "destructive"
                                    : "info"
                              }
                              className="text-[11px]"
                            >
                              {ord.status}
                            </Badge>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

            {/* 4B. TABLA: COMPRAS -> PROVEEDORES (RESUMEN GENERAL DE INSUMOS + MODAL AL HACER CLIC) */}
            {reportType === "SUPPLIER_PAYMENTS" &&
              paymentsSubView === "SUPPLIERS" && (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      {isColVisible("proveedor") && (
                        <TableHead className="py-3.5 px-4 font-bold">
                          Proveedor
                        </TableHead>
                      )}
                      {isColVisible("ordenes") && (
                        <TableHead className="py-3.5 px-4 text-center font-bold">
                          Órdenes
                        </TableHead>
                      )}
                      {isColVisible("insumos") && (
                        <TableHead className="py-3.5 px-4 font-bold">
                          Insumos
                        </TableHead>
                      )}
                      {isColVisible("facturado") && (
                        <TableHead className="py-3.5 px-4 text-right font-bold">
                          Total ($)
                        </TableHead>
                      )}
                      {isColVisible("pagado") && (
                        <TableHead className="py-3.5 px-4 text-right font-bold">
                          Pagado ($)
                        </TableHead>
                      )}
                      {isColVisible("deuda") && (
                        <TableHead className="py-3.5 px-4 text-right font-bold">
                          Deuda ($)
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRows.map((s: any, idx: number) => (
                      <TableRow
                        key={`sup-${s.supplierId ?? idx}-${idx}`}
                        onClick={() =>
                          setSelectedRowDetail({ type: "SUPPLIER", data: s })
                        }
                        className="hover:bg-muted/40 cursor-pointer transition-colors"
                      >
                        {isColVisible("proveedor") && (
                          <TableCell className="py-3.5 px-4">
                            <div className="font-semibold text-foreground">
                              {s.supplierName}
                            </div>
                            <span className="text-xs font-mono text-muted-foreground">
                              {s.rif}
                            </span>
                          </TableCell>
                        )}
                        {isColVisible("ordenes") && (
                          <TableCell className="py-3.5 px-4 text-center font-mono font-bold">
                            {s.totalOrders}
                          </TableCell>
                        )}
                        {isColVisible("insumos") && (
                          <TableCell className="py-3.5 px-4">
                            <ItemsSummaryCell
                              items={s.topProductsPurchased || []}
                              getName={(p) => p.name}
                              getQtyText={(p) => `${p.quantity} ${p.unit || ""}`}
                            />
                          </TableCell>
                        )}
                        {isColVisible("facturado") && (
                          <TableCell className="py-3.5 px-4 text-right font-mono font-bold text-foreground">
                            ${Number(s.totalInvoicedUsd || 0).toFixed(2)}
                          </TableCell>
                        )}
                        {isColVisible("pagado") && (
                          <TableCell className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ${Number(s.totalPaidUsd || 0).toFixed(2)}
                          </TableCell>
                        )}
                        {isColVisible("deuda") && (
                          <TableCell className="py-3.5 px-4 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                            ${Number(s.pendingDebtUsd || 0).toFixed(2)}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

            {/* 4C. TABLA: COMPRAS -> GASTOS DIRECTOS */}
            {reportType === "SUPPLIER_PAYMENTS" &&
              paymentsSubView === "DIRECT" && (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      {isColVisible("fecha") && (
                        <TableHead className="py-3.5 px-4 font-bold">
                          Fecha
                        </TableHead>
                      )}
                      {isColVisible("beneficiario") && (
                        <TableHead className="py-3.5 px-4 font-bold">
                          Beneficiario
                        </TableHead>
                      )}
                      {isColVisible("concepto") && (
                        <TableHead className="py-3.5 px-4 font-bold">
                          Concepto
                        </TableHead>
                      )}
                      {isColVisible("metodo") && (
                        <TableHead className="py-3.5 px-4 font-bold">
                          Método
                        </TableHead>
                      )}
                      {isColVisible("usuario") && (
                        <TableHead className="py-3.5 px-4 font-bold">
                          Usuario
                        </TableHead>
                      )}
                      {isColVisible("montoUsd") && (
                        <TableHead className="py-3.5 px-4 text-right font-bold">
                          Monto ($)
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRows.map((dp: any, idx: number) => (
                      <TableRow
                        key={`dp-${dp.id ?? idx}-${idx}`}
                        className="hover:bg-muted/40"
                      >
                        {isColVisible("fecha") && (
                          <TableCell className="py-3.5 px-4 font-mono text-xs text-muted-foreground">
                            {dp.paymentDate
                              ? new Date(dp.paymentDate).toLocaleDateString(
                                  "es-VE",
                                )
                              : "---"}
                          </TableCell>
                        )}
                        {isColVisible("beneficiario") && (
                          <TableCell className="py-3.5 px-4 font-semibold text-foreground">
                            {dp.beneficiary}
                          </TableCell>
                        )}
                        {isColVisible("concepto") && (
                          <TableCell className="py-3.5 px-4 text-muted-foreground">
                            {dp.concept}
                          </TableCell>
                        )}
                        {isColVisible("metodo") && (
                          <TableCell className="py-3.5 px-4 font-mono text-xs">
                            <Badge variant="outline" className="text-[11px]">
                              {dp.method}
                            </Badge>{" "}
                            <span className="text-muted-foreground">
                              Ref: {dp.referenceNumber}
                            </span>
                          </TableCell>
                        )}
                        {isColVisible("usuario") && (
                          <TableCell className="py-3.5 px-4 text-muted-foreground">
                            {dp.registeredBy}
                          </TableCell>
                        )}
                        {isColVisible("montoUsd") && (
                          <TableCell className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            ${Number(dp.equivalentAmountUsd || 0).toFixed(2)}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

            {/* 5. TABLA: PREÓRDENES (RESUMEN GENERAL DE INSUMOS + MODAL AL HACER CLIC) */}
            {reportType === "PREORDERS" && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    {isColVisible("preorden") && (
                      <TableHead className="py-3.5 px-4 font-bold">
                        Código
                      </TableHead>
                    )}
                    {isColVisible("fecha") && (
                      <TableHead className="py-3.5 px-4 font-bold">
                        Fecha
                      </TableHead>
                    )}
                    {isColVisible("departamento") && (
                      <TableHead className="py-3.5 px-4 font-bold">
                        Departamento
                      </TableHead>
                    )}
                    {isColVisible("usuario") && (
                      <TableHead className="py-3.5 px-4 font-bold">
                        Solicitante
                      </TableHead>
                    )}
                    {isColVisible("insumos") && (
                      <TableHead className="py-3.5 px-4 font-bold">
                        Insumos
                      </TableHead>
                    )}
                    {isColVisible("orden") && (
                      <TableHead className="py-3.5 px-4 text-center font-bold">
                        Orden
                      </TableHead>
                    )}
                    {isColVisible("estado") && (
                      <TableHead className="py-3.5 px-4 text-center font-bold">
                        Estado
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRows.map((pr: any, idx: number) => (
                    <TableRow
                      key={`pr-${pr.id ?? idx}-${idx}`}
                      onClick={() =>
                        setSelectedRowDetail({ type: "PREORDER", data: pr })
                      }
                      className="hover:bg-muted/40 cursor-pointer transition-colors"
                    >
                      {isColVisible("preorden") && (
                        <TableCell className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                          #{pr.requisitionNumber}
                        </TableCell>
                      )}
                      {isColVisible("fecha") && (
                        <TableCell className="py-3.5 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {pr.createdAt
                            ? new Date(pr.createdAt).toLocaleDateString("es-VE")
                            : "---"}
                        </TableCell>
                      )}
                      {isColVisible("departamento") && (
                        <TableCell className="py-3.5 px-4 font-semibold text-foreground">
                          {pr.departmentName}
                        </TableCell>
                      )}
                      {isColVisible("usuario") && (
                        <TableCell className="py-3.5 px-4 text-foreground">
                          {pr.createdBy}
                        </TableCell>
                      )}
                      {isColVisible("insumos") && (
                        <TableCell className="py-3.5 px-4">
                          <ItemsSummaryCell
                            items={pr.items || []}
                            getName={(it) => it.productName}
                            getQtyText={(it) =>
                              `${it.quantityRequested} ${it.unit || ""}`
                            }
                          />
                        </TableCell>
                      )}
                      {isColVisible("orden") && (
                        <TableCell className="py-3.5 px-4 text-center font-mono text-xs text-primary font-bold">
                          {pr.linkedOrders}
                        </TableCell>
                      )}
                      {isColVisible("estado") && (
                        <TableCell className="py-3.5 px-4 text-center">
                          <Badge
                            variant={
                              pr.status === "ADJUDICADA"
                                ? "success"
                                : pr.status === "EN_COTIZACION"
                                  ? "warning"
                                  : pr.status === "CANCELADA"
                                    ? "destructive"
                                    : "outline"
                            }
                            className="text-[11px]"
                          >
                            {pr.status}
                          </Badge>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* 6. TABLA: LOTES */}
            {reportType === "BATCH_EXPIRATION" && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    {isColVisible("sku") && (
                      <TableHead className="py-3.5 px-4 font-bold">
                        SKU
                      </TableHead>
                    )}
                    {isColVisible("insumo") && (
                      <TableHead className="py-3.5 px-4 font-bold">
                        Insumo
                      </TableHead>
                    )}
                    {isColVisible("lote") && (
                      <TableHead className="py-3.5 px-4 font-bold">
                        Lote
                      </TableHead>
                    )}
                    {isColVisible("ubicacion") && (
                      <TableHead className="py-3.5 px-4 font-bold">
                        Ubicación
                      </TableHead>
                    )}
                    {isColVisible("stock") && (
                      <TableHead className="py-3.5 px-4 text-right font-bold">
                        Stock
                      </TableHead>
                    )}
                    {isColVisible("costo") && (
                      <TableHead className="py-3.5 px-4 text-right font-bold">
                        Costo ($)
                      </TableHead>
                    )}
                    {isColVisible("valor") && (
                      <TableHead className="py-3.5 px-4 text-right font-bold">
                        Valor ($)
                      </TableHead>
                    )}
                    {isColVisible("vencimiento") && (
                      <TableHead className="py-3.5 px-4 text-center font-bold">
                        Vencimiento
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRows.map((b: any, idx: number) => {
                    const isExpired = b.expirationCategory === "VENCIDO";
                    const isSoon =
                      b.expirationCategory === "DENTRO_DE_30_DIAS" ||
                      b.expirationCategory === "DENTRO_DE_60_DIAS";

                    return (
                      <TableRow
                        key={`batch-${b.batchId ?? idx}-${idx}`}
                        className="hover:bg-muted/40"
                      >
                        {isColVisible("sku") && (
                          <TableCell className="py-3.5 px-4 font-mono font-bold text-xs text-muted-foreground">
                            {b.sku}
                          </TableCell>
                        )}
                        {isColVisible("insumo") && (
                          <TableCell className="py-3.5 px-4 font-semibold text-foreground">
                            {b.productName}
                          </TableCell>
                        )}
                        {isColVisible("lote") && (
                          <TableCell className="py-3.5 px-4 font-mono font-bold text-xs text-primary">
                            #{b.lotNumber}
                          </TableCell>
                        )}
                        {isColVisible("ubicacion") && (
                          <TableCell className="py-3.5 px-4 text-xs text-muted-foreground">
                            {b.location}
                          </TableCell>
                        )}
                        {isColVisible("stock") && (
                          <TableCell className="py-3.5 px-4 text-right font-mono font-bold text-foreground">
                            {b.currentQuantity} {b.unit}
                          </TableCell>
                        )}
                        {isColVisible("costo") && (
                          <TableCell className="py-3.5 px-4 text-right font-mono text-muted-foreground">
                            ${Number(b.costPrice || 0).toFixed(2)}
                          </TableCell>
                        )}
                        {isColVisible("valor") && (
                          <TableCell className="py-3.5 px-4 text-right font-mono font-bold text-foreground">
                            ${Number(b.totalValueUsd || 0).toFixed(2)}
                          </TableCell>
                        )}
                        {isColVisible("vencimiento") && (
                          <TableCell className="py-3.5 px-4 text-center whitespace-nowrap">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="font-mono text-xs text-foreground">
                                {b.expirationDate
                                  ? new Date(
                                      b.expirationDate,
                                    ).toLocaleDateString("es-VE")
                                  : "N/A"}
                              </span>
                              <Badge
                                variant={
                                  isExpired
                                    ? "destructive"
                                    : isSoon
                                      ? "warning"
                                      : "success"
                                }
                                className="font-mono text-[10px]"
                              >
                                {isExpired
                                  ? `Vencido (${Math.abs(b.daysToExpiration)}d)`
                                  : b.daysToExpiration !== null
                                    ? `${b.daysToExpiration} días`
                                    : "Activo"}
                              </Badge>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            <TablePagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={activeRows.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              pageSizeOptions={[10, 15, 30, 50]}
              entityName="registros"
            />
          </>
        )}
      </Card>

      {/* ========================================================
          MODAL: COLUMNAS
         ======================================================== */}
      <Dialog open={showColumnsModal} onOpenChange={setShowColumnsModal}>
        <DialogContent className="sm:max-w-md max-w-md p-6 rounded-2xl border-border/80 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Columnas
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Elige las columnas para la tabla, PDF y CSV
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {availableColumnsForView.map((col) => {
              const checked = isColVisible(col.key);
              return (
                <label
                  key={col.key}
                  className={cn(
                    "flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-colors text-xs font-semibold",
                    checked
                      ? "bg-primary/5 border-primary text-foreground"
                      : "bg-card border-border/60 text-muted-foreground hover:bg-muted/40",
                  )}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleColumnVisibility(col.key)}
                  />
                  <span className="truncate">{col.label}</span>
                </label>
              );
            })}
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setHiddenColumns((prev) => ({ ...prev, [currentViewKey]: [] }))
              }
              className="h-8 text-xs cursor-pointer"
            >
              Mostrar todas
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => setShowColumnsModal(false)}
              className="h-8 text-xs cursor-pointer"
            >
              Listo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          MODAL: CONFIGURAR PDF
         ======================================================== */}
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent className="sm:max-w-xl max-w-xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl border-border/80 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              Configurar PDF
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Título, orientación, notas y firmas del documento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="block text-xs font-bold text-foreground">
                  Título
                </Label>
                <Input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="h-9 text-xs bg-card border-border/80 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="block text-xs font-bold text-foreground">
                  Subtítulo
                </Label>
                <Input
                  type="text"
                  value={customSubtitle}
                  onChange={(e) => setCustomSubtitle(e.target.value)}
                  className="h-9 text-xs bg-card border-border/80 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="block text-xs font-bold text-foreground">
                    Código
                  </Label>
                  <Input
                    type="text"
                    value={customDocNumber}
                    onChange={(e) => setCustomDocNumber(e.target.value)}
                    className="h-9 text-xs font-mono bg-card border-border/80 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="block text-xs font-bold text-foreground">
                    Orientación
                  </Label>
                  <select
                    value={pdfOrientation}
                    onChange={(e) =>
                      setPdfOrientation(
                        e.target.value as "landscape" | "portrait",
                      )
                    }
                    className="w-full h-9 bg-card border border-border/80 rounded-xl px-2.5 text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring outline-none cursor-pointer"
                  >
                    <option value="landscape">Horizontal</option>
                    <option value="portrait">Vertical</option>
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label className="block text-xs font-bold text-foreground">
                  Notas al Pie (Opcional)
                </Label>
                <Textarea
                  value={customFooterNotes}
                  onChange={(e) => setCustomFooterNotes(e.target.value)}
                  placeholder="Observaciones adicionales al final del PDF..."
                  className="text-xs bg-card border-border/80 rounded-xl"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border/60">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="pdf-summary"
                  checked={includeSummaryMetrics}
                  onCheckedChange={(checked) =>
                    setIncludeSummaryMetrics(Boolean(checked))
                  }
                />
                <Label
                  htmlFor="pdf-summary"
                  className="text-xs font-medium text-foreground cursor-pointer"
                >
                  Incluir totales
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="pdf-signatures"
                  checked={includeSignatures}
                  onCheckedChange={(checked) =>
                    setIncludeSignatures(Boolean(checked))
                  }
                />
                <Label
                  htmlFor="pdf-signatures"
                  className="text-xs font-medium text-foreground cursor-pointer"
                >
                  Incluir firmas
                </Label>
              </div>
            </div>

            {includeSignatures && (
              <div className="space-y-2.5 pt-2 border-t border-border/60">
                <span className="text-xs font-bold text-foreground block">
                  Firmas
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-2.5 rounded-xl border border-border/80 bg-muted/15 space-y-1.5">
                    <Input
                      type="text"
                      value={sig1Role}
                      onChange={(e) => setSig1Role(e.target.value)}
                      placeholder="Cargo 1"
                      className="h-8 text-xs font-bold bg-card"
                    />
                    <Input
                      type="text"
                      value={sig1Name}
                      onChange={(e) => setSig1Name(e.target.value)}
                      placeholder="Nombre (opcional)"
                      className="h-8 text-xs bg-card"
                    />
                    <Input
                      type="text"
                      value={sig1Dept}
                      onChange={(e) => setSig1Dept(e.target.value)}
                      placeholder="Departamento"
                      className="h-8 text-xs bg-card"
                    />
                  </div>

                  <div className="p-2.5 rounded-xl border border-border/80 bg-muted/15 space-y-1.5">
                    <Input
                      type="text"
                      value={sig2Role}
                      onChange={(e) => setSig2Role(e.target.value)}
                      placeholder="Cargo 2"
                      className="h-8 text-xs font-bold bg-card"
                    />
                    <Input
                      type="text"
                      value={sig2Name}
                      onChange={(e) => setSig2Name(e.target.value)}
                      placeholder="Nombre (opcional)"
                      className="h-8 text-xs bg-card"
                    />
                    <Input
                      type="text"
                      value={sig2Dept}
                      onChange={(e) => setSig2Dept(e.target.value)}
                      placeholder="Departamento"
                      className="h-8 text-xs bg-card"
                    />
                  </div>

                  <div className="p-2.5 rounded-xl border border-border/80 bg-muted/15 space-y-1.5">
                    <Input
                      type="text"
                      value={sig3Role}
                      onChange={(e) => setSig3Role(e.target.value)}
                      placeholder="Cargo 3"
                      className="h-8 text-xs font-bold bg-card"
                    />
                    <Input
                      type="text"
                      value={sig3Name}
                      onChange={(e) => setSig3Name(e.target.value)}
                      placeholder="Nombre (opcional)"
                      className="h-8 text-xs bg-card"
                    />
                    <Input
                      type="text"
                      value={sig3Dept}
                      onChange={(e) => setSig3Dept(e.target.value)}
                      placeholder="Departamento"
                      className="h-8 text-xs bg-card"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 border-t border-border/60">
            <Button
              type="button"
              size="sm"
              onClick={() => setShowConfigModal(false)}
              className="h-8 text-xs cursor-pointer"
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          MODAL: DETALLE DIRECTO DE USUARIO (CON HISTORIAL DE ACCIONES)
         ======================================================== */}
      <Dialog
        open={Boolean(selectedUserDetail)}
        onOpenChange={(open) => {
          if (!open) setSelectedUserDetail(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl max-w-2xl max-h-[88vh] overflow-y-auto p-6 rounded-2xl border-border/80 space-y-5">
          {selectedUserDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-foreground">
                  {selectedUserDetail.fullName}
                </DialogTitle>
                <DialogDescription className="text-xs font-mono text-muted-foreground">
                  @{selectedUserDetail.username} ·{" "}
                  {selectedUserDetail.department || "General"}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-xl border border-border/80 bg-muted/15 space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground">
                    Solicitudes
                  </span>
                  <div className="text-xl font-bold font-mono text-foreground">
                    {selectedUserDetail.requestsCreated}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedUserDetail.requestsApproved +
                      selectedUserDetail.requestsCompleted}{" "}
                    aprob · {selectedUserDetail.requestsRejected} rech
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border/80 bg-muted/15 space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground">
                    Unidades
                  </span>
                  <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    {selectedUserDetail.unitsReceived} /{" "}
                    {selectedUserDetail.unitsRequested}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Recibidas / Pedidas
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border/80 bg-muted/15 space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground">
                    Almacén
                  </span>
                  <div className="text-base font-bold font-mono text-foreground">
                    {selectedUserDetail.dispatchesExecuted} desp ·{" "}
                    {selectedUserDetail.receptionsExecuted} ent
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {selectedUserDetail.adjustmentsExecuted} aj ·{" "}
                    {selectedUserDetail.wastesExecuted} mer
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border border-border/80 bg-muted/15 space-y-1">
                  <span className="text-[11px] font-bold text-muted-foreground">
                    Compras y Pagos
                  </span>
                  <div className="text-base font-bold font-mono text-foreground">
                    {selectedUserDetail.preordersCreated} pre ·{" "}
                    {selectedUserDetail.ordersCreated} órd
                  </div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                    ${Number(selectedUserDetail.paymentsTotalUsd || 0).toFixed(2)}{" "}
                    ({selectedUserDetail.paymentsRegistered})
                  </div>
                </div>
              </div>

              {/* Últimas acciones del usuario directo en el modal */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    Últimas Acciones
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {selectedUserLogs.length} recientes
                  </span>
                </div>

                {selectedUserLogs.length === 0 ? (
                  <div className="p-6 rounded-xl border border-border/60 text-center text-xs text-muted-foreground">
                    Sin acciones registradas en este período
                  </div>
                ) : (
                  <div className="rounded-xl border border-border/80 overflow-hidden divide-y divide-border/60">
                    {selectedUserLogs.map((log: any, i: number) => (
                      <div
                        key={`ulog-${log.id ?? i}-${i}`}
                        className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-muted/20"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">
                              {log.actionType}
                            </span>
                            <span className="font-mono font-bold text-primary">
                              {log.reference}
                            </span>
                            <span className="font-mono text-muted-foreground">
                              {log.date
                                ? new Date(log.date).toLocaleDateString("es-VE")
                                : ""}
                            </span>
                          </div>
                          <p className="text-muted-foreground truncate max-w-md">
                            {log.detail}
                          </p>
                        </div>
                        <div className="text-right shrink-0 space-y-0.5">
                          <div className="font-mono font-bold text-foreground">
                            {log.quantityOrAmount}
                          </div>
                          <Badge variant="outline" className="text-[10px]">
                            {log.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="flex items-center justify-between sm:justify-between pt-3 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedUserId(String(selectedUserDetail.userId));
                    setUserSubView("TIMELINE");
                    setSelectedUserDetail(null);
                    setCurrentPage(1);
                  }}
                  className="h-8 text-xs cursor-pointer"
                >
                  Ver historial completo
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setSelectedUserDetail(null)}
                  className="h-8 text-xs cursor-pointer"
                >
                  Cerrar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================
          MODAL: DETALLE DE SOLICITUD / ORDEN / PROVEEDOR / PREORDEN
         ======================================================== */}
      <Dialog
        open={Boolean(selectedRowDetail)}
        onOpenChange={(open) => {
          if (!open) setSelectedRowDetail(null);
        }}
      >
        <DialogContent className="sm:max-w-xl max-w-xl max-h-[85vh] overflow-y-auto p-6 rounded-2xl border-border/80 space-y-4">
          {selectedRowDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-foreground">
                  {selectedRowDetail.type === "REQUEST" &&
                    `Solicitud #${selectedRowDetail.data.requestNumber}`}
                  {selectedRowDetail.type === "ORDER" &&
                    `Orden #${selectedRowDetail.data.orderNumber}`}
                  {selectedRowDetail.type === "SUPPLIER" &&
                    selectedRowDetail.data.supplierName}
                  {selectedRowDetail.type === "PREORDER" &&
                    `Preorden #${selectedRowDetail.data.requisitionNumber}`}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {selectedRowDetail.type === "REQUEST" &&
                    `${selectedRowDetail.data.departmentName} · Solicitado por ${selectedRowDetail.data.requester}`}
                  {selectedRowDetail.type === "ORDER" &&
                    `${selectedRowDetail.data.supplierName} (${selectedRowDetail.data.supplierRif || "S/R"}) · Creado por ${selectedRowDetail.data.createdBy || "Sistema"}`}
                  {selectedRowDetail.type === "SUPPLIER" &&
                    `RIF: ${selectedRowDetail.data.rif} · ${selectedRowDetail.data.totalOrders} órdenes registradas`}
                  {selectedRowDetail.type === "PREORDER" &&
                    `${selectedRowDetail.data.departmentName} · Solicitado por ${selectedRowDetail.data.createdBy}`}
                </DialogDescription>
              </DialogHeader>

              {selectedRowDetail.data.justification && (
                <div className="p-3 rounded-xl bg-muted/20 border border-border/60 text-xs">
                  <span className="font-bold text-foreground block mb-0.5">
                    Motivo
                  </span>
                  <span className="text-muted-foreground">
                    {selectedRowDetail.data.justification}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-foreground">
                  <span>Insumos</span>
                  <span className="font-mono text-muted-foreground">
                    {
                      (selectedRowDetail.data.items ||
                        selectedRowDetail.data.topProductsPurchased ||
                        [])?.length
                    }{" "}
                    renglones
                  </span>
                </div>

                <div className="rounded-xl border border-border/80 divide-y divide-border/60 max-h-80 overflow-y-auto">
                  {(
                    selectedRowDetail.data.items ||
                    selectedRowDetail.data.topProductsPurchased ||
                    []
                  ).map((it: any, idx: number) => (
                    <div
                      key={`det-item-${idx}`}
                      className="p-3 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-foreground truncate">
                          {it.productName || it.name}
                        </div>
                        {it.sku && (
                          <span className="text-[11px] font-mono text-muted-foreground">
                            {it.sku}
                          </span>
                        )}
                      </div>
                      <div className="text-right font-mono font-bold text-foreground shrink-0">
                        {selectedRowDetail.type === "REQUEST" &&
                          `${it.quantityDispatched ?? 0} / ${it.quantityRequested ?? 0} ${it.unit || ""}`}
                        {selectedRowDetail.type === "ORDER" &&
                          `${it.quantityReceived ?? it.quantityOrdered} ${it.unit || ""} · $${Number(it.subtotalUsd || 0).toFixed(2)}`}
                        {selectedRowDetail.type === "SUPPLIER" &&
                          `${it.quantity} ${it.unit || ""} · $${Number(it.totalUsd || 0).toFixed(2)}`}
                        {selectedRowDetail.type === "PREORDER" &&
                          `${it.quantityRequested} ${it.unit || ""}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter className="pt-2 border-t border-border/60">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setSelectedRowDetail(null)}
                  className="h-8 text-xs cursor-pointer"
                >
                  Cerrar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
