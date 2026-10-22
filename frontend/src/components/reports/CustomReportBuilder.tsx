"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { ReportClientService, type CustomReportFilterParams, type CustomReportData } from "@/services/report.service";
import { PurchasingClientService } from "@/services/purchasing.service";
import { InventoryMasterService, type DepartmentItem } from "@/services/inventory-master.service";
import { InventoryClientService } from "@/services/inventory.service";
import { downloadCsv } from "@/lib/csv";
import type { Supplier } from "@/types/purchasing";
import type { Product, Category } from "@/types/inventory";
import {
  PrintableDocument,
  DocumentHeader,
  DocumentMetadataGrid,
  DocumentSignatures,
  DocumentFooter,
  PrintActionButton,
} from "@/components/common/PrintableDocument";
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  Calendar,
  Building,
  User,
  Package,
  Layers,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  Eye,
  Settings2,
} from "lucide-react";

type ReportType = "KARDEX" | "SUPPLIER_PAYMENTS" | "DEPARTMENT_CONSUMPTION" | "BATCH_EXPIRATION";

const REPORT_TYPE_CONFIG: Record<
  ReportType,
  {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    defaultDocTitle: string;
    accentColor: string;
  }
> = {
  KARDEX: {
    title: "Auditoría de Kardex y Movimientos",
    description: "Trazabilidad cronológica de entradas por compras, salidas a sala, mermas, ajustes y egresos.",
    icon: FileText,
    defaultDocTitle: "REPORTE DE TRAZABILIDAD Y MOVIMIENTOS DE KARDEX",
    accentColor: "blue",
  },
  SUPPLIER_PAYMENTS: {
    title: "Compras y Pagos a Proveedores",
    description: "Detalle de cuánto se pagó a proveedores, qué insumos se adquirieron, pagos en divisas/Bs. y saldo deudor.",
    icon: Wallet,
    defaultDocTitle: "REPORTE CONSOLIDADO DE COMPRAS Y PAGOS A PROVEEDORES",
    accentColor: "emerald",
  },
  DEPARTMENT_CONSUMPTION: {
    title: "Consumo por Departamentos y Protocolos",
    description: "Qué insumos se utilizaron por departamento o sala médica, según su justificación y ciclo de solicitud.",
    icon: Building,
    defaultDocTitle: "REPORTE DE CONSUMO DE INSUMOS POR SERVICIO Y PROTOCOLO",
    accentColor: "purple",
  },
  BATCH_EXPIRATION: {
    title: "Existencias, Lotes y Vencimientos",
    description: "Inventario valorizado, semáforo de caducidad (vencidos, 30/60/90 días) y estado de cuarentena.",
    icon: Layers,
    defaultDocTitle: "INVENTARIO VALORIZADO Y CONTROL DE CADUCIDAD DE LOTES",
    accentColor: "amber",
  },
};

export function CustomReportBuilder() {
  const [reportType, setReportType] = useState<ReportType>("KARDEX");

  // Filtros
  const [activeDatePreset, setActiveDatePreset] = useState<
    "today" | "week" | "month" | "last_month" | "year" | "all" | "custom"
  >("month");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedMovementType, setSelectedMovementType] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Opciones de personalización del documento
  const [customTitle, setCustomTitle] = useState<string>(
    REPORT_TYPE_CONFIG.KARDEX.defaultDocTitle
  );
  const [customSubtitle, setCustomSubtitle] = useState<string>(
    "Auditoría y Gestión de Inventarios · ERP-IDI"
  );
  const [customNotes, setCustomNotes] = useState<string>(
    "Documento oficial generado con datos consolidados y verificados del sistema institucional."
  );
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true);
  const [includeSummaryMetrics, setIncludeSummaryMetrics] = useState<boolean>(true);
  const [showConfigPanel, setShowConfigPanel] = useState<boolean>(false);

  // Datos maestros auxiliares
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Estado del reporte
  const [reportData, setReportData] = useState<CustomReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [downloadingCsv, setDownloadingCsv] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Carga de maestros
  useEffect(() => {
    let isMounted = true;
    const loadMasters = async () => {
      try {
        const [sups, deps, prods, cats] = await Promise.all([
          PurchasingClientService.getSuppliers().catch(() => []),
          InventoryMasterService.getDepartments(true).catch(() => []),
          InventoryClientService.getProducts().catch(() => []),
          InventoryClientService.getCategories().catch(() => []),
        ]);
        if (isMounted) {
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

  // Al cambiar tipo de reporte, actualizar título por defecto
  const handleReportTypeChange = (type: ReportType) => {
    // Si ya está seleccionado el mismo card, no reiniciar datos para evitar borrar el reporte
    if (type === reportType) return;

    setReportType(type);
    setCustomTitle(REPORT_TYPE_CONFIG[type].defaultDocTitle);
    setReportData(null);

    // Limpiar filtros específicos no aplicables al nuevo reporte
    if (type === "BATCH_EXPIRATION") {
      setSelectedSupplierId("");
      setSelectedDepartmentId("");
      setSelectedMovementType("");
    } else if (type === "SUPPLIER_PAYMENTS") {
      setSelectedDepartmentId("");
      setSelectedMovementType("");
    } else if (type === "DEPARTMENT_CONSUMPTION") {
      setSelectedSupplierId("");
      setSelectedMovementType("");
    }
  };

  // Atajos de fechas
  const setDatePreset = (preset: "today" | "week" | "month" | "last_month" | "year" | "all") => {
    setActiveDatePreset(preset);
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

  // Consulta de reporte
  const handleGenerateReport = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const filters: CustomReportFilterParams = {
        reportType,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        supplierId: selectedSupplierId ? Number(selectedSupplierId) : undefined,
        departmentId: selectedDepartmentId ? Number(selectedDepartmentId) : undefined,
        productId: selectedProductId ? Number(selectedProductId) : undefined,
        categoryId: selectedCategoryId ? Number(selectedCategoryId) : undefined,
        movementType: selectedMovementType || undefined,
        status: selectedStatus || undefined,
        search: searchTerm || undefined,
      };

      const data = await ReportClientService.getCustomReport(filters);
      setReportData(data);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error al procesar el reporte personalizado"
      );
    } finally {
      setLoading(false);
    }
  }, [
    reportType,
    startDate,
    endDate,
    selectedSupplierId,
    selectedDepartmentId,
    selectedProductId,
    selectedCategoryId,
    selectedMovementType,
    selectedStatus,
    searchTerm,
  ]);

  // Carga automática inicial
  useEffect(() => {
    void handleGenerateReport();
  }, [handleGenerateReport]);

  // Exportar a CSV
  const handleExportCSV = () => {
    if (!reportData) return;
    setDownloadingCsv(true);
    try {
      const dateTag = new Date().toISOString().slice(0, 10);

      if (reportType === "KARDEX" && reportData.rows) {
        downloadCsv(
          `reporte_kardex_${dateTag}.csv`,
          [
            "Fecha",
            "Referencia",
            "Tipo",
            "SKU",
            "Producto",
            "Categoría",
            "Lote",
            "Vencimiento",
            "Cantidad",
            "Unidad",
            "Costo Unit USD",
            "Total USD",
            "Responsable",
            "Origen",
            "Destino",
            "Notas",
          ],
          reportData.rows.map((r: any) => [
            new Date(r.createdAt).toLocaleString("es-VE"),
            r.referenceNumber,
            r.type,
            r.sku,
            r.productName,
            r.category,
            r.lotNumber,
            r.expirationDate ? new Date(r.expirationDate).toLocaleDateString("es-VE") : "N/A",
            r.quantity,
            r.unit,
            r.unitCost,
            r.totalCost,
            r.user,
            r.origin,
            r.destination,
            r.notes,
          ])
        );
      } else if (reportType === "SUPPLIER_PAYMENTS") {
        const orderRows = (reportData.orders || []).flatMap((ord: any) =>
          ord.items.map((it: any) => [
            ord.orderNumber,
            new Date(ord.createdAt).toLocaleDateString("es-VE"),
            ord.supplierName,
            ord.supplierRif,
            ord.status,
            ord.paymentStatus,
            it.sku,
            it.name,
            it.quantityOrdered,
            it.quantityReceived,
            it.unit,
            it.unitPrice,
            it.totalLine,
            ord.invoicedUsd,
            ord.paidUsd,
            ord.pendingDebtUsd,
          ])
        );
        downloadCsv(
          `reporte_compras_proveedores_${dateTag}.csv`,
          [
            "Orden",
            "Fecha",
            "Proveedor",
            "RIF",
            "Estado Orden",
            "Estado Pago",
            "SKU",
            "Insumo Adquirido",
            "Cant. Ordenada",
            "Cant. Recibida",
            "Unidad",
            "Precio Unit USD",
            "Total Renglón USD",
            "Total Orden USD",
            "Abonado USD",
            "Deuda Pendiente USD",
          ],
          orderRows
        );
      } else if (reportType === "DEPARTMENT_CONSUMPTION" && reportData.rows) {
        const reqRows = reportData.rows.flatMap((r: any) =>
          r.items.map((it: any) => [
            r.requestNumber,
            new Date(r.createdAt).toLocaleDateString("es-VE"),
            r.departmentName,
            r.section,
            r.requester,
            r.status,
            r.justification,
            it.sku,
            it.productName,
            it.category,
            it.quantityRequested,
            it.quantityApproved,
            it.quantityDispatched,
            it.unit,
          ])
        );
        downloadCsv(
          `reporte_consumo_departamentos_${dateTag}.csv`,
          [
            "Solicitud",
            "Fecha",
            "Departamento",
            "Sala / Sección",
            "Solicitante",
            "Estado",
            "Justificación / Protocolo",
            "SKU",
            "Insumo",
            "Categoría",
            "Cant. Solicitada",
            "Cant. Aprobada",
            "Cant. Despachada",
            "Unidad",
          ],
          reqRows
        );
      } else if (reportType === "BATCH_EXPIRATION" && reportData.rows) {
        downloadCsv(
          `reporte_lotes_vencimientos_${dateTag}.csv`,
          [
            "SKU",
            "Producto",
            "Categoría",
            "Lote",
            "Ubicación",
            "Existencia Actual",
            "Unidad",
            "Costo Unit USD",
            "Valor Total USD",
            "Vencimiento",
            "Días Restantes",
            "Estado Caducidad",
            "Estado Lote",
          ],
          reportData.rows.map((b: any) => [
            b.sku,
            b.productName,
            b.category,
            b.lotNumber,
            b.location,
            b.currentQuantity,
            b.unit,
            b.costPrice,
            b.totalValueUsd,
            b.expirationDate ? new Date(b.expirationDate).toLocaleDateString("es-VE") : "N/A",
            b.daysToExpiration ?? "N/A",
            b.expirationCategory,
            b.status,
          ])
        );
      }
    } finally {
      setDownloadingCsv(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Selector de Tipo de Reporte (Pantalla) */}
      <div className="no-print print:hidden space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-primary" />
              Generador de Reportes Personalizados
            </h2>
            <p className="text-xs text-muted-foreground">
              Auditoría y trazabilidad avanzada de compras, insumos consumidos por sala y pagos a proveedores
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowConfigPanel((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-foreground bg-card border border-border rounded-lg hover:bg-muted shadow-2xs transition-colors cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{showConfigPanel ? "Ocultar Encabezado" : "Personalizar Documento"}</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={downloadingCsv || !reportData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{downloadingCsv ? "Exportando..." : "Exportar CSV"}</span>
            </button>
            <PrintActionButton label="Imprimir / PDF Íntegro" />
          </div>
        </div>

        {/* Pestañas de Tipo de Reporte */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {(Object.keys(REPORT_TYPE_CONFIG) as ReportType[]).map((typeKey) => {
            const config = REPORT_TYPE_CONFIG[typeKey];
            const Icon = config.icon;
            const isSelected = reportType === typeKey;

            return (
              <button
                key={typeKey}
                type="button"
                onClick={() => handleReportTypeChange(typeKey)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20"
                    : "bg-card text-card-foreground border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div
                    className={`p-1.5 rounded-lg ${
                      isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <ChevronRight
                    className={`w-3.5 h-3.5 ${
                      isSelected ? "text-primary-foreground" : "text-muted-foreground"
                    }`}
                  />
                </div>
                <div>
                  <h4 className="text-xs font-bold leading-tight">{config.title}</h4>
                  <p
                    className={`text-[10px] mt-0.5 line-clamp-2 ${
                      isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                    }`}
                  >
                    {config.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Panel de Personalización de Encabezados (Colapsable) */}
        {showConfigPanel && (
          <div className="p-4 bg-card text-card-foreground border border-border rounded-xl shadow-xs space-y-3 transition-all animate-fadeIn">
            <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-primary" />
              Opciones de Membrete y Salida del Documento Institucional
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  Título Principal del Documento
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground font-medium focus:ring-2 focus:ring-ring outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  Subtítulo / Referencia Interna
                </label>
                <input
                  type="text"
                  value={customSubtitle}
                  onChange={(e) => setCustomSubtitle(e.target.value)}
                  className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground font-medium focus:ring-2 focus:ring-ring outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                  Nota u Observación al Pie
                </label>
                <input
                  type="text"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground font-medium focus:ring-2 focus:ring-ring outline-none"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-border text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={includeSignatures}
                  onChange={(e) => setIncludeSignatures(e.target.checked)}
                  className="rounded text-primary focus:ring-primary w-3.5 h-3.5"
                />
                <span>Incluir casillas de firmas institucionales al imprimir</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={includeSummaryMetrics}
                  onChange={(e) => setIncludeSummaryMetrics(e.target.checked)}
                  className="rounded text-primary focus:ring-primary w-3.5 h-3.5"
                />
                <span>Incluir tarjetas resumen de métricas en el reporte</span>
              </label>
            </div>
          </div>
        )}

        {/* Barra de Filtros Multi-Criterio */}
        <div className="bg-card text-card-foreground p-4 rounded-xl border border-border shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
            <span className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              Filtros de Búsqueda
            </span>
            {/* Presets de Fechas */}
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] text-muted-foreground font-medium mr-1">Rango rápido:</span>
              <button
                type="button"
                onClick={() => setDatePreset("today")}
                className={`text-[10px] px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                  activeDatePreset === "today"
                    ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                }`}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("week")}
                className={`text-[10px] px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                  activeDatePreset === "week"
                    ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                }`}
              >
                7 días
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("month")}
                className={`text-[10px] px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                  activeDatePreset === "month"
                    ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                }`}
              >
                Este Mes
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("last_month")}
                className={`text-[10px] px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                  activeDatePreset === "last_month"
                    ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                }`}
              >
                Mes Pasado
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("year")}
                className={`text-[10px] px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                  activeDatePreset === "year"
                    ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                }`}
              >
                Año Actual
              </button>
              <button
                type="button"
                onClick={() => setDatePreset("all")}
                className={`text-[10px] px-2 py-0.5 rounded font-medium cursor-pointer transition-colors ${
                  activeDatePreset === "all"
                    ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                }`}
              >
                Todo
              </button>
            </div>
          </div>

          {/* Filtros dinámicos adaptados según el tipo de reporte activo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {/* 1. Rango de Fechas (Para Kardex, Compras y Consumo son fechas de operación; para Lotes son fechas de vencimiento) */}
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {reportType === "BATCH_EXPIRATION" ? "Vence Desde" : "Desde"}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setActiveDatePreset("custom");
                }}
                className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:ring-2 focus:ring-ring outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {reportType === "BATCH_EXPIRATION" ? "Vence Hasta" : "Hasta"}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setActiveDatePreset("custom");
                }}
                className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:ring-2 focus:ring-ring outline-none"
              />
            </div>

            {/* 2. Filtro Proveedor: Relevante EXCLUSIVAMENTE para Compras/Pagos y Kardex (NO en Lotes ni Consumo) */}
            {(reportType === "SUPPLIER_PAYMENTS" || reportType === "KARDEX") && (
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Proveedor
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:ring-2 focus:ring-ring outline-none font-medium"
                >
                  <option value="">Todos los proveedores</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 3. Filtro Departamento: Relevante EXCLUSIVAMENTE para Consumo y Kardex (NO en Lotes ni Proveedores) */}
            {(reportType === "DEPARTMENT_CONSUMPTION" || reportType === "KARDEX") && (
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Departamento / Sala
                </label>
                <select
                  value={selectedDepartmentId}
                  onChange={(e) => setSelectedDepartmentId(e.target.value)}
                  className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:ring-2 focus:ring-ring outline-none font-medium"
                >
                  <option value="">Todos los departamentos</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 4. Filtro Específico: Tipo de Movimiento para Kardex */}
            {reportType === "KARDEX" && (
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Tipo de Movimiento
                </label>
                <select
                  value={selectedMovementType}
                  onChange={(e) => setSelectedMovementType(e.target.value)}
                  className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:ring-2 focus:ring-ring outline-none"
                >
                  <option value="">Todos los movimientos</option>
                  <option value="ENTRADA_COMPRA">Entrada por Compra</option>
                  <option value="TRASLADO_A_LABORATORIO">Traslado a Laboratorio</option>
                  <option value="DESPACHO_SOLICITUD">Despacho a Sala</option>
                  <option value="AJUSTE_INVENTARIO">Ajuste de Inventario</option>
                  <option value="DESCARTE_MERMA">Descarte / Merma</option>
                </select>
              </div>
            )}

            {/* 5. Filtro Específico: Estado de Lote para Existencias y Vencimientos */}
            {reportType === "BATCH_EXPIRATION" && (
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Estado del Lote
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:ring-2 focus:ring-ring outline-none font-medium"
                >
                  <option value="">Todos los estados</option>
                  <option value="DISPONIBLE">Disponibles / Activos</option>
                  <option value="CUARENTENA">En Cuarentena</option>
                  <option value="AGOTADO">Agotados</option>
                  <option value="VENCIDO">Vencidos</option>
                </select>
              </div>
            )}

            {/* 6. Filtro Insumo / Producto (Aplica a todos los reportes) */}
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Insumo / Reactivo
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:ring-2 focus:ring-ring outline-none"
              >
                <option value="">Todos los insumos</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 7. Filtro Categoría (Aplica a todos los reportes) */}
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Categoría
              </label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:ring-2 focus:ring-ring outline-none"
              >
                <option value="">Todas las categorías</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por código, número, justificación o texto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-background border border-input rounded-lg pl-8.5 pr-3 py-1.5 text-xs text-foreground focus:ring-2 focus:ring-ring outline-none"
              />
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleGenerateReport}
                disabled={loading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>{loading ? "Generando..." : "Actualizar Reporte"}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Manejo de Error */}
      {errorMessage && (
        <div className="no-print print:hidden p-3 bg-destructive/10 border border-destructive/20 text-destructive rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-destructive" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Documento Institucional (Pantalla + Impresión Limpia PDF) */}
      <PrintableDocument>
        {/* Membrete Oficial */}
        <DocumentHeader
          title={customTitle}
          subtitle={customSubtitle}
          documentNumber={`REP-${reportType.slice(0, 3)}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`}
          badge={REPORT_TYPE_CONFIG[reportType].title}
          status={{
            label: `${reportData?.totalRecords ?? 0} Registros`,
            className: "bg-blue-50 text-blue-800 border-blue-200",
          }}
          date={new Date().toLocaleDateString("es-VE")}
        />

        {/* Metadatos del Filtro Aplicado */}
        <DocumentMetadataGrid
          columns={4}
          items={[
            {
              label: "Tipo de Consulta",
              value: REPORT_TYPE_CONFIG[reportType].title,
            },
            {
              label: "Rango de Fechas",
              value:
                startDate || endDate
                  ? `${startDate || "Inicio"} al ${endDate || "Actualidad"}`
                  : "Histórico Completo",
            },
            {
              label: "Filtro Seleccionado",
              value:
                selectedSupplierId
                  ? `Proveedor: ${suppliers.find((s) => String(s.id) === selectedSupplierId)?.name}`
                  : selectedDepartmentId
                  ? `Dpto: ${departments.find((d) => String(d.id) === selectedDepartmentId)?.name}`
                  : selectedProductId
                  ? `Insumo: ${products.find((p) => String(p.id) === selectedProductId)?.name}`
                  : "Todos los Criterios",
            },
            {
              label: "Emisión y Auditoría",
              value: `Fecha: ${new Date().toLocaleDateString("es-VE")} · ERP-IDI`,
            },
          ]}
        />

        {/* Tarjetas de Métricas Resumen */}
        {includeSummaryMetrics && reportData && reportData.summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {reportType === "KARDEX" && (
              <>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg print:border-black">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Total Asientos
                  </span>
                  <span className="text-base font-black font-mono text-slate-900 print:text-black">
                    {reportData.summary.totalMovements ?? 0}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg print:border-black">
                  <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                    Entradas / Compras
                  </span>
                  <span className="text-base font-black font-mono text-emerald-700 print:text-black">
                    +{reportData.summary.totalEntries ?? 0}
                  </span>
                </div>
                <div className="p-3 bg-rose-50/50 border border-rose-200 rounded-lg print:border-black">
                  <span className="block text-[10px] font-bold text-rose-800 uppercase tracking-wider">
                    Salidas / Mermas
                  </span>
                  <span className="text-base font-black font-mono text-rose-700 print:text-black">
                    -{reportData.summary.totalExits ?? 0}
                  </span>
                </div>
                <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg print:border-black">
                  <span className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                    Valoración Movilizada
                  </span>
                  <span className="text-base font-black font-mono text-blue-800 print:text-black">
                    ${Number(reportData.summary.totalValueUsd ?? 0).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            )}

            {reportType === "SUPPLIER_PAYMENTS" && (
              <>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg print:border-black">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Órdenes Evaluadas
                  </span>
                  <span className="text-base font-black font-mono text-slate-900 print:text-black">
                    {reportData.summary.totalOrdersCount ?? 0}
                  </span>
                </div>
                <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg print:border-black">
                  <span className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                    Total Facturado (USD)
                  </span>
                  <span className="text-base font-black font-mono text-blue-800 print:text-black">
                    ${Number(reportData.summary.totalInvoicedUsd ?? 0).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg print:border-black">
                  <span className="block text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                    Total Pagado (USD)
                  </span>
                  <span className="text-base font-black font-mono text-emerald-700 print:text-black">
                    ${Number(reportData.summary.totalPaidUsd ?? 0).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-lg print:border-black">
                  <span className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                    Deuda Pendiente (USD)
                  </span>
                  <span className="text-base font-black font-mono text-amber-800 print:text-black">
                    ${Number(reportData.summary.totalPendingDebtUsd ?? 0).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </>
            )}

            {reportType === "DEPARTMENT_CONSUMPTION" && (
              <>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg print:border-black">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Solicitudes Procesadas
                  </span>
                  <span className="text-base font-black font-mono text-slate-900 print:text-black">
                    {reportData.summary.totalRequests ?? 0}
                  </span>
                </div>
                <div className="p-3 bg-purple-50/50 border border-purple-200 rounded-lg print:border-black col-span-3">
                  <span className="block text-[10px] font-bold text-purple-800 uppercase tracking-wider">
                    Unidades Totales Despachadas a Salas
                  </span>
                  <span className="text-base font-black font-mono text-purple-800 print:text-black">
                    {Number(reportData.summary.totalItemsDispatched ?? 0).toLocaleString("es-VE", { minimumFractionDigits: 2 })} unidades
                  </span>
                </div>
              </>
            )}

            {reportType === "BATCH_EXPIRATION" && (
              <>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg print:border-black">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Lotes en Almacén
                  </span>
                  <span className="text-base font-black font-mono text-slate-900 print:text-black">
                    {reportData.summary.totalBatches ?? 0}
                  </span>
                </div>
                <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-lg print:border-black">
                  <span className="block text-[10px] font-bold text-blue-800 uppercase tracking-wider">
                    Valor Stock (USD)
                  </span>
                  <span className="text-base font-black font-mono text-blue-800 print:text-black">
                    ${Number(reportData.summary.totalStockValueUsd ?? 0).toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="p-3 bg-red-50/50 border border-red-200 rounded-lg print:border-black">
                  <span className="block text-[10px] font-bold text-red-800 uppercase tracking-wider">
                    Lotes Vencidos
                  </span>
                  <span className="text-base font-black font-mono text-red-700 print:text-black">
                    {reportData.summary.expiredCount ?? 0}
                  </span>
                </div>
                <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-lg print:border-black">
                  <span className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                    Por Vencer (≤30 días)
                  </span>
                  <span className="text-base font-black font-mono text-amber-800 print:text-black">
                    {reportData.summary.within30DaysCount ?? 0}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* TABLA PRINCIPAL DEL REPORTE */}

        {/* 1. KARDEX */}
        {reportType === "KARDEX" && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
              Detalle Cronológico de Movimientos y Asientos de Almacén
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-lg print:border-black">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 print:bg-slate-100 text-slate-700 print:text-black">
                  <tr>
                    <th className="py-2 px-2.5 text-left font-bold uppercase text-[10px]">Fecha</th>
                    <th className="py-2 px-2.5 text-left font-bold uppercase text-[10px]">Referencia</th>
                    <th className="py-2 px-2.5 text-left font-bold uppercase text-[10px]">Tipo</th>
                    <th className="py-2 px-2.5 text-left font-bold uppercase text-[10px]">Insumo / Reactivo</th>
                    <th className="py-2 px-2.5 text-left font-bold uppercase text-[10px]">Lote</th>
                    <th className="py-2 px-2.5 text-right font-bold uppercase text-[10px]">Cantidad</th>
                    <th className="py-2 px-2.5 text-right font-bold uppercase text-[10px]">Total ($)</th>
                    <th className="py-2 px-2.5 text-left font-bold uppercase text-[10px]">Responsable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                  {(!reportData?.rows || reportData.rows.length === 0) ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-slate-400">
                        No se encontraron movimientos para el filtro seleccionado.
                      </td>
                    </tr>
                  ) : (
                    reportData.rows.map((row: any, idx: number) => {
                      const isPos =
                        row.type === "ENTRADA_COMPRA" || row.type === "AJUSTE_INVENTARIO";
                      return (
                        <tr key={idx} className="hover:bg-slate-50/70 print:hover:bg-transparent">
                          <td className="py-1.5 px-2.5 font-mono text-[11px] text-slate-600 print:text-black whitespace-nowrap">
                            {new Date(row.createdAt).toLocaleDateString("es-VE")}
                          </td>
                          <td className="py-1.5 px-2.5 font-mono font-bold text-slate-800 print:text-black whitespace-nowrap">
                            {row.referenceNumber}
                          </td>
                          <td className="py-1.5 px-2.5 whitespace-nowrap">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 print:text-black print:bg-white print:border print:border-black">
                              {row.type.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="py-1.5 px-2.5">
                            <div className="font-semibold text-slate-900 print:text-black truncate max-w-xs">
                              {row.productName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">{row.sku}</div>
                          </td>
                          <td className="py-1.5 px-2.5 font-mono text-[11px] text-slate-600 print:text-black whitespace-nowrap">
                            {row.lotNumber}
                          </td>
                          <td
                            className={`py-1.5 px-2.5 text-right font-mono font-bold whitespace-nowrap ${
                              isPos ? "text-emerald-700 print:text-black" : "text-rose-700 print:text-black"
                            }`}
                          >
                            {isPos ? `+${row.quantity}` : row.quantity} {row.unit}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-800 print:text-black whitespace-nowrap">
                            ${Number(row.totalCost || 0).toFixed(2)}
                          </td>
                          <td className="py-1.5 px-2.5 text-[11px] text-slate-600 print:text-black truncate max-w-32">
                            {row.user}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. COMPRAS Y PAGOS A PROVEEDORES */}
        {reportType === "SUPPLIER_PAYMENTS" && (
          <div className="space-y-4">
            {/* Resumen por Proveedor e Insumos Adquiridos */}
            {reportData?.supplierSummaries && reportData.supplierSummaries.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                  Resumen de Compras por Proveedor e Insumos Adquiridos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {reportData.supplierSummaries.map((s: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50/70 border border-slate-200 rounded-lg print:border-black break-inside-avoid space-y-2"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                        <div>
                          <div className="font-bold text-slate-900 print:text-black text-xs">
                            {s.supplierName}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">RIF: {s.rif}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block">Deuda Pendiente:</span>
                          <span className="text-xs font-bold font-mono text-amber-700 print:text-black">
                            ${Number(s.pendingDebtUsd).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
                        <div>
                          <span className="text-slate-400 block">Órdenes:</span>
                          <span className="font-bold text-slate-800">{s.totalOrders}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Facturado:</span>
                          <span className="font-bold text-slate-800">${Number(s.totalInvoicedUsd).toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Pagado:</span>
                          <span className="font-bold text-emerald-700">${Number(s.totalPaidUsd).toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Insumos adquiridos a este proveedor */}
                      {s.topProductsPurchased && s.topProductsPurchased.length > 0 && (
                        <div className="pt-1 border-t border-slate-200/60">
                          <span className="text-[9px] font-bold uppercase text-slate-500 block mb-0.5">
                            Insumos y Reactivos Suministrados:
                          </span>
                          <div className="space-y-0.5">
                            {s.topProductsPurchased.map((p: any, pIdx: number) => (
                              <div
                                key={pIdx}
                                className="flex items-center justify-between text-[10px] text-slate-700 print:text-black"
                              >
                                <span className="truncate pr-2 font-medium">• {p.name}</span>
                                <span className="font-mono shrink-0">
                                  {p.quantity} {p.unit} (${Number(p.totalUsd).toFixed(2)})
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Listado de Órdenes y Pagos Registrados */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                Órdenes de Compra y Estado de Cuentas por Pagar
              </h3>
              <div className="overflow-x-auto border border-slate-200 rounded-lg print:border-black">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-slate-50 print:bg-slate-100 text-slate-700 print:text-black">
                    <tr>
                      <th className="py-2 px-2.5 text-left font-bold uppercase text-[10px]">Orden</th>
                      <th className="py-2 px-2.5 text-left font-bold uppercase text-[10px]">Fecha</th>
                      <th className="py-2 px-2.5 text-left font-bold uppercase text-[10px]">Proveedor</th>
                      <th className="py-2 px-2.5 text-left font-bold uppercase text-[10px]">Insumos Incluidos</th>
                      <th className="py-2 px-2.5 text-right font-bold uppercase text-[10px]">Facturado ($)</th>
                      <th className="py-2 px-2.5 text-right font-bold uppercase text-[10px]">Pagado ($)</th>
                      <th className="py-2 px-2.5 text-right font-bold uppercase text-[10px]">Deuda ($)</th>
                      <th className="py-2 px-2.5 text-center font-bold uppercase text-[10px]">Estado Pago</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                    {(!reportData?.orders || reportData.orders.length === 0) ? (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-slate-400">
                          No se encontraron órdenes de compra en el periodo.
                        </td>
                      </tr>
                    ) : (
                      reportData.orders.map((ord: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/70 print:hover:bg-transparent">
                          <td className="py-2 px-2.5 font-mono font-bold text-slate-900 print:text-black whitespace-nowrap">
                            #{ord.orderNumber}
                          </td>
                          <td className="py-2 px-2.5 font-mono text-[11px] text-slate-600 print:text-black whitespace-nowrap">
                            {new Date(ord.createdAt).toLocaleDateString("es-VE")}
                          </td>
                          <td className="py-2 px-2.5">
                            <div className="font-semibold text-slate-900 print:text-black">{ord.supplierName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">RIF: {ord.supplierRif}</div>
                          </td>
                          <td className="py-2 px-2.5 text-[11px] text-slate-700 print:text-black">
                            <ul className="list-disc pl-3 space-y-0.5">
                              {ord.items.map((it: any, iIdx: number) => (
                                <li key={iIdx}>
                                  <span className="font-medium">{it.name}</span>: {it.quantityReceived || it.quantityOrdered} {it.unit}
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900 print:text-black whitespace-nowrap">
                            ${Number(ord.invoicedUsd).toFixed(2)}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-700 print:text-black whitespace-nowrap">
                            ${Number(ord.paidUsd).toFixed(2)}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono font-bold text-amber-800 print:text-black whitespace-nowrap">
                            ${Number(ord.pendingDebtUsd).toFixed(2)}
                          </td>
                          <td className="py-2 px-2.5 text-center whitespace-nowrap">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                ord.paymentStatus === "PAGADO"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : ord.paymentStatus === "PARCIAL"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                              }`}
                            >
                              {ord.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Egresos / Pagos Directos */}
            {reportData?.directPayments && reportData.directPayments.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
                  Egresos y Pagos Directos de Tesorería
                </h3>
                <div className="overflow-x-auto border border-slate-200 rounded-lg print:border-black">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50 print:bg-slate-100 text-slate-700 print:text-black">
                      <tr>
                        <th className="py-1.5 px-2.5 text-left font-bold uppercase text-[10px]">Fecha</th>
                        <th className="py-1.5 px-2.5 text-left font-bold uppercase text-[10px]">Beneficiario</th>
                        <th className="py-1.5 px-2.5 text-left font-bold uppercase text-[10px]">Concepto</th>
                        <th className="py-1.5 px-2.5 text-left font-bold uppercase text-[10px]">Método / Ref</th>
                        <th className="py-1.5 px-2.5 text-right font-bold uppercase text-[10px]">Monto Transacción</th>
                        <th className="py-1.5 px-2.5 text-right font-bold uppercase text-[10px]">Equivalente ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {reportData.directPayments.map((dp: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="py-1.5 px-2.5 font-mono text-[11px] text-slate-600">
                            {new Date(dp.paymentDate).toLocaleDateString("es-VE")}
                          </td>
                          <td className="py-1.5 px-2.5 font-bold text-slate-900">{dp.beneficiary}</td>
                          <td className="py-1.5 px-2.5 text-slate-700">{dp.concept}</td>
                          <td className="py-1.5 px-2.5 font-mono text-[11px] text-slate-600">
                            {dp.method} ({dp.referenceNumber})
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-800">
                            {Number(dp.amountPaid).toFixed(2)} {dp.currency}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono font-bold text-emerald-700">
                            ${Number(dp.equivalentAmountUsd).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. CONSUMO POR DEPARTAMENTO Y PROTOCOLO */}
        {reportType === "DEPARTMENT_CONSUMPTION" && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
              Registro de Insumos y Reactivos Despachados a Departamentos
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-lg print:border-black">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 print:bg-slate-100 text-slate-700 print:text-black">
                  <tr>
                    <th className="py-2 px-2.5 text-left font-bold uppercase text-[10px]">Solicitud</th>
                    <th className="py-2 px-2.5 text-left font-bold uppercase text-[10px]">Fecha</th>
                    <th className="py-2 px-2.5 text-left font-bold uppercase text-[10px]">Departamento / Sala</th>
                    <th className="py-2 px-2.5 text-left font-bold uppercase text-[10px]">Justificación / Protocolo</th>
                    <th className="py-2 px-2.5 text-left font-bold uppercase text-[10px]">Insumos Despachados</th>
                    <th className="py-2 px-2.5 text-left font-bold uppercase text-[10px]">Solicitante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                  {(!reportData?.rows || reportData.rows.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        No se encontraron registros de consumo de insumos.
                      </td>
                    </tr>
                  ) : (
                    reportData.rows.map((req: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/70 print:hover:bg-transparent">
                        <td className="py-2 px-2.5 font-mono font-bold text-slate-900 print:text-black whitespace-nowrap">
                          #{req.requestNumber}
                        </td>
                        <td className="py-2 px-2.5 font-mono text-[11px] text-slate-600 print:text-black whitespace-nowrap">
                          {new Date(req.createdAt).toLocaleDateString("es-VE")}
                        </td>
                        <td className="py-2 px-2.5">
                          <div className="font-bold text-slate-900 print:text-black">{req.departmentName}</div>
                          <div className="text-[10px] text-slate-500">{req.section}</div>
                        </td>
                        <td className="py-2 px-2.5 text-slate-700 print:text-black text-[11px] max-w-xs">
                          {req.justification || "Uso clínico general"}
                        </td>
                        <td className="py-2 px-2.5 text-[11px] text-slate-800 print:text-black">
                          <ul className="list-disc pl-3 space-y-0.5">
                            {req.items.map((it: any, iIdx: number) => (
                              <li key={iIdx}>
                                <span className="font-semibold">{it.productName}</span>: {it.quantityDispatched} {it.unit}
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="py-2 px-2.5 text-[11px] text-slate-600 print:text-black whitespace-nowrap">
                          {req.requester}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. EXISTENCIAS, LOTES Y VENCIMIENTOS */}
        {reportType === "BATCH_EXPIRATION" && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-300 pb-1">
              Inventario Físico Valorizado y Matriz de Caducidad de Lotes
            </h3>
            <div className="overflow-x-auto border border-slate-200 rounded-lg print:border-black">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 print:bg-slate-100 text-slate-700 print:text-black">
                  <tr>
                    <th className="py-2 px-2.5 text-left font-bold uppercase text-[10px]">SKU</th>
                    <th className="py-2 px-2.5 text-left font-bold uppercase text-[10px]">Producto / Reactivo</th>
                    <th className="py-2 px-2.5 text-left font-bold uppercase text-[10px]">Lote</th>
                    <th className="py-2 px-2.5 text-left font-bold uppercase text-[10px]">Ubicación</th>
                    <th className="py-2 px-2.5 text-right font-bold uppercase text-[10px]">Existencia</th>
                    <th className="py-2 px-2.5 text-right font-bold uppercase text-[10px]">Costo Unit ($)</th>
                    <th className="py-2 px-2.5 text-right font-bold uppercase text-[10px]">Valor Total ($)</th>
                    <th className="py-2 px-2.5 text-left font-bold uppercase text-[10px]">Vencimiento</th>
                    <th className="py-2 px-2.5 text-center font-bold uppercase text-[10px]">Estado Caducidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                  {(!reportData?.rows || reportData.rows.length === 0) ? (
                    <tr>
                      <td colSpan={9} className="py-6 text-center text-slate-400">
                        No se encontraron lotes con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    reportData.rows.map((b: any, idx: number) => {
                      const isExpired = b.expirationCategory === "VENCIDO";
                      const isSoon =
                        b.expirationCategory === "DENTRO_DE_30_DIAS" ||
                        b.expirationCategory === "DENTRO_DE_60_DIAS";

                      return (
                        <tr key={idx} className="hover:bg-slate-50/70 print:hover:bg-transparent">
                          <td className="py-1.5 px-2.5 font-mono font-bold text-slate-800 print:text-black">
                            {b.sku}
                          </td>
                          <td className="py-1.5 px-2.5 font-semibold text-slate-900 print:text-black">
                            {b.productName}
                          </td>
                          <td className="py-1.5 px-2.5 font-mono text-[11px] text-slate-700 print:text-black">
                            {b.lotNumber}
                          </td>
                          <td className="py-1.5 px-2.5 text-[11px] text-slate-600 print:text-black">
                            {b.location}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900 print:text-black">
                            {b.currentQuantity} {b.unit}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono text-slate-700 print:text-black">
                            ${Number(b.costPrice).toFixed(2)}
                          </td>
                          <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900 print:text-black">
                            ${Number(b.totalValueUsd).toFixed(2)}
                          </td>
                          <td className="py-1.5 px-2.5 font-mono text-[11px] text-slate-600 print:text-black whitespace-nowrap">
                            {b.expirationDate ? new Date(b.expirationDate).toLocaleDateString("es-VE") : "N/A"}
                          </td>
                          <td className="py-1.5 px-2.5 text-center whitespace-nowrap">
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                                isExpired
                                  ? "bg-red-100 text-red-800 border-red-300"
                                  : isSoon
                                  ? "bg-amber-100 text-amber-800 border-amber-300"
                                  : "bg-emerald-100 text-emerald-800 border-emerald-300"
                              }`}
                            >
                              {isExpired
                                ? `VENCIDO (${Math.abs(b.daysToExpiration)}d)`
                                : b.daysToExpiration !== null
                                ? `${b.daysToExpiration}d restantes`
                                : "SIN CADUCIDAD"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Firmas Institucionales */}
        {includeSignatures && (
          <DocumentSignatures
            signatures={[
              {
                role: "Elaborado por",
                name: "Auditor de Almacén",
                department: "Control de Inventarios & Stock",
                date: new Date().toLocaleDateString("es-VE"),
                stampText: "Firma Responsable",
              },
              {
                role: "Revisado por",
                name: "Jefatura de Operaciones",
                department: "Coordinación Médica / Compras",
                date: new Date().toLocaleDateString("es-VE"),
                stampText: "Firma y Sello",
              },
              {
                role: "Aprobado por",
                name: "Dirección General / Administración",
                department: "Instituto de Inmunología Clínica",
                date: new Date().toLocaleDateString("es-VE"),
                stampText: "Sello Institucional IAC",
              },
            ]}
          />
        )}

        {/* Pie Oficial */}
        <DocumentFooter
          notes={customNotes}
          institutionText="INMUNOLOGIA ASOCIACION CIVIL · RIF: J-30710739-1"
          systemSignature="ERP-IDI v2.0 · Módulo de Reportes Personalizados e Inteligencia Operativa"
        />
      </PrintableDocument>
    </div>
  );
}
