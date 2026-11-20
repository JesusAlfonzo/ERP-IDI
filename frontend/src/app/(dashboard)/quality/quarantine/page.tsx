"use client";

import { useState, useEffect, useCallback, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QualityClientService } from "@/services/quality.service";
import { AuthService } from "@/services/auth.service";
import { toast } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { usePagination } from "@/hooks/use-pagination";
import { TablePagination } from "@/components/common/TablePagination";
import type { AuthUser } from "@/types/auth";
import type {
  QuarantineBatch,
  QualityVerdict,
  IncidentType,
} from "@/types/quality";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  FileCheck,
  Package,
  AlertTriangle,
  Building,
  Search,
  X,
  Layers,
  ArchiveX,
  ExternalLink,
  ShoppingCart,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

const INCIDENT_LABELS: Record<IncidentType, string> = {
  FALLA_CONTROL_CALIDAD: "Falla de Control de Calidad / Reactividad",
  TEMPERATURA_FUERA_RANGO: "Ruptura de Cadena de Frío / Temperatura",
  ROTURA_EMPAQUE: "Rotura o Daño Físico de Empaque",
  CONTAMINACION: "Contaminación o Turbidez del Insumo",
  OTRO: "Otra no conformidad técnica",
};

export default function QualityQuarantinePage() {
  const router = useRouter();
  const [currentUser] = useState<AuthUser | null>(() =>
    AuthService.getCurrentUser(),
  );

  const userRoles = currentUser?.roles || [];
  const isAuthorized =
    userRoles.includes("ADMINISTRADOR") ||
    userRoles.includes("ALMACENISTA") ||
    userRoles.includes("COORDINADOR") ||
    userRoles.includes("COORDINADOR_LABORATORIO");

  // Datos en estado local
  const [quarantineBatches, setQuarantineBatches] = useState<QuarantineBatch[]>([]);
  const [defectiveBatches, setDefectiveBatches] = useState<QuarantineBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"en_cuarentena" | "defectuoso" | "todos">("en_cuarentena");

  // Filtros
  const [search, setSearch] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");

  // Modal de Dictamen Técnico
  const [selectedBatch, setSelectedBatch] = useState<QuarantineBatch | null>(null);
  const [verdict, setVerdict] = useState<QualityVerdict>("LIBERAR");
  const [incidentType, setIncidentType] = useState<IncidentType>("FALLA_CONTROL_CALIDAD");
  const [technicalNotes, setTechnicalNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Carga concurrente de lotes en cuarentena y defectuosos
  const loadBatches = useCallback(async () => {
    setLoading(true);
    try {
      const [quarantineData, defectiveData] = await Promise.all([
        QualityClientService.getBatchesByStatus("EN_CUARENTENA").catch(() => []),
        QualityClientService.getBatchesByStatus("DEFECTUOSO").catch(() => []),
      ]);
      setQuarantineBatches(quarantineData);
      setDefectiveBatches(defectiveData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al cargar la cuarentena";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!AuthService.isAuthenticated()) {
      router.replace("/login");
      return;
    }
    void loadBatches();
  }, [router, loadBatches]);

  // Cálculo de ubicaciones únicas para el filtro
  const availableLocations = useMemo(() => {
    const locSet = new Set<string>();
    [...quarantineBatches, ...defectiveBatches].forEach((b) => {
      if (b.location?.name) locSet.add(b.location.name);
    });
    return Array.from(locSet).sort();
  }, [quarantineBatches, defectiveBatches]);

  // Métricas rápidas de los KPI Cards
  const totalQuarantineUnits = useMemo(() => {
    return quarantineBatches.reduce((acc, b) => acc + (b.currentQuantity || 0), 0);
  }, [quarantineBatches]);

  const totalDefectiveUnits = useMemo(() => {
    return defectiveBatches.reduce((acc, b) => acc + (b.currentQuantity || 0), 0);
  }, [defectiveBatches]);

  // Selección de conjunto según pestaña
  const currentTabBatches = useMemo(() => {
    if (activeTab === "en_cuarentena") return quarantineBatches;
    if (activeTab === "defectuoso") return defectiveBatches;
    return [...quarantineBatches, ...defectiveBatches];
  }, [activeTab, quarantineBatches, defectiveBatches]);

  // Filtrado reactivo por texto y ubicación
  const filteredBatches = useMemo(() => {
    const q = search.toLowerCase().trim();
    return currentTabBatches.filter((b) => {
      // Filtro de ubicación
      if (selectedLocation !== "all" && b.location?.name !== selectedLocation) {
        return false;
      }

      // Filtro de texto
      if (!q) return true;
      const lot = b.lotNumber?.toLowerCase() || "";
      const prodName = b.product?.name?.toLowerCase() || "";
      const sku = b.product?.sku?.toLowerCase() || "";
      const loc = b.location?.name?.toLowerCase() || "";
      return lot.includes(q) || prodName.includes(q) || sku.includes(q) || loc.includes(q);
    });
  }, [currentTabBatches, search, selectedLocation]);

  // Paginación
  const pagination = usePagination(filteredBatches, { initialPageSize: 10 });
  const { resetPage } = pagination;

  useEffect(() => {
    resetPage();
  }, [search, selectedLocation, activeTab, resetPage]);

  // Gestión del Modal de Dictamen
  const handleOpenInspection = (batch: QuarantineBatch) => {
    if (!isAuthorized) return;
    setSelectedBatch(batch);
    setVerdict("LIBERAR");
    setIncidentType("FALLA_CONTROL_CALIDAD");
    setTechnicalNotes("");
  };

  const handleCloseInspection = () => {
    setSelectedBatch(null);
    setTechnicalNotes("");
  };

  const handleSubmitVerdict = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || !isAuthorized) return;

    if (technicalNotes.trim().length < 5) {
      toast.error("Debe ingresar una justificación técnica de al menos 5 caracteres.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await QualityClientService.submitVerdict({
        batchId: Number(selectedBatch.id),
        verdict,
        incidentType: verdict === "RECHAZAR" ? incidentType : undefined,
        technicalNotes: technicalNotes.trim(),
      });

      toast.success(res.message || (verdict === "LIBERAR" ? "Lote aprobado y liberado al inventario" : "Lote rechazado"));
      handleCloseInspection();
      void loadBatches();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al procesar el dictamen de calidad.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const hasActiveFilters = search.trim() !== "" || selectedLocation !== "all";

  const handleClearFilters = () => {
    setSearch("");
    setSelectedLocation("all");
  };

  return (
    <div className="space-y-6">
      {/* ========================================================
          ENCABEZADO PRINCIPAL
         ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Cuarentena
              </h1>
              <Badge variant="outline" className="text-[11px] font-mono bg-muted/20">
                Control de Calidad
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gestión y dictamen de calidad para lotes retenidos o no conformes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadBatches()}
            disabled={loading}
            className="h-9 gap-1.5 text-xs cursor-pointer shadow-2xs"
            title="Actualizar listado de lotes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amber-600" : ""}`} />
            <span>Actualizar</span>
          </Button>
        </div>
      </div>

      {/* Banner Informativo si el rol no tiene permisos de dictamen */}
      {!isAuthorized && (
        <Alert className="border-border bg-muted/20">
          <AlertCircle className="w-4 h-4 text-muted-foreground" />
          <AlertDescription className="text-xs text-muted-foreground">
            <strong>Modo de consulta:</strong> La liberación y el dictamen técnico de lotes retenidos corresponden exclusivamente al personal de Almacén, Coordinación o Administración.
          </AlertDescription>
        </Alert>
      )}

      {/* ========================================================
          TARJETAS KPI RÁPIDAS (ESTÁNDAR ERP)
         ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Lotes en Cuarentena */}
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                Lotes en Cuarentena
              </span>
              <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                {quarantineBatches.length}
              </div>
              <span className="text-[10px] text-muted-foreground block">
                Retenidos preventivamente
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Unidades en Cuarentena */}
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                Unidades Retenidas
              </span>
              <div className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400">
                {totalQuarantineUnits.toLocaleString()}
              </div>
              <span className="text-[10px] text-muted-foreground block">
                Pendientes de liberación
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Lotes Rechazados */}
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                Lotes Rechazados
              </span>
              <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
                {defectiveBatches.length}
              </div>
              <span className="text-[10px] text-muted-foreground block">
                No conformes declarados
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
              <XCircle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Unidades Defectuosas */}
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                Unidades Rechazadas
              </span>
              <div className="text-2xl font-bold font-mono text-foreground">
                {totalDefectiveUnits.toLocaleString()}
              </div>
              <span className="text-[10px] text-muted-foreground block">
                Bajas o inutilizados
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0">
              <ArchiveX className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================
          PESTAÑAS DE ESTADO
         ======================================================== */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "en_cuarentena" | "defectuoso" | "todos")}
        className="w-full"
      >
        <TabsList className="bg-muted/60 p-1">
          <TabsTrigger value="en_cuarentena" className="text-xs gap-1.5 cursor-pointer">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span>En Cuarentena</span>
            <Badge variant="outline" className="font-mono text-[10px] ml-1 bg-background/60">
              {quarantineBatches.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="defectuoso" className="text-xs gap-1.5 cursor-pointer">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Rechazados</span>
            <Badge variant="outline" className="font-mono text-[10px] ml-1 bg-background/60">
              {defectiveBatches.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="todos" className="text-xs gap-1.5 cursor-pointer">
            <Layers className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Todos</span>
            <Badge variant="outline" className="font-mono text-[10px] ml-1 bg-background/60">
              {quarantineBatches.length + defectiveBatches.length}
            </Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ========================================================
          BARRA DE BÚSQUEDA Y FILTROS
         ======================================================== */}
      <Card className="p-3.5 border-border shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
            {/* Input de Búsqueda */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por lote, insumo, SKU o almacén..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-8 text-xs h-9 bg-background"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Borrar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtro de Ubicación */}
            {availableLocations.length > 0 && (
              <div className="w-full sm:w-56 shrink-0">
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger className="h-9 text-xs font-medium cursor-pointer bg-background">
                    <SelectValue placeholder="Ubicación" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="all">Todas las ubicaciones</SelectItem>
                    {availableLocations.map((loc) => (
                      <SelectItem key={loc} value={loc} className="text-xs">
                        {loc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Botón de limpiar filtros */}
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
          TABLA DE LOTES RETENIDOS / DEFECTUOSOS
         ======================================================== */}
      <Card className="border-border shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40 text-[11px] uppercase tracking-wider">
              <TableRow>
                <TableHead className="w-32 py-3 px-4 font-semibold">Lote</TableHead>
                <TableHead className="min-w-[260px] py-3 px-4 font-semibold">Insumo</TableHead>
                <TableHead className="w-40 py-3 px-4 font-semibold">Ubicación</TableHead>
                <TableHead className="w-28 py-3 px-4 text-center font-semibold">Cantidad</TableHead>
                <TableHead className="w-28 py-3 px-4 text-center font-semibold">Vencimiento</TableHead>
                <TableHead className="w-28 py-3 px-4 text-center font-semibold">Ingreso</TableHead>
                <TableHead className="w-32 py-3 px-4 text-center font-semibold">Estado</TableHead>
                <TableHead className="w-24 py-3 px-4 text-right font-semibold">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground text-xs">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-600 mb-2" />
                    Cargando lotes en auditoría de calidad...
                  </TableCell>
                </TableRow>
              ) : filteredBatches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground text-xs">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                    {hasActiveFilters ? (
                      "No se encontraron lotes que coincidan con los filtros aplicados."
                    ) : activeTab === "en_cuarentena" ? (
                      "No hay lotes retenidos en cuarentena. Todo el inventario recibido se encuentra conforme."
                    ) : activeTab === "defectuoso" ? (
                      "No existen lotes declarados como defectuosos o inutilizados."
                    ) : (
                      "No hay registros de cuarentena en el sistema."
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                pagination.paginatedItems.map((batch) => {
                  const isBatchQuarantine = batch.status === "EN_CUARENTENA";
                  const isExpired = batch.expirationDate
                    ? new Date(batch.expirationDate) < new Date()
                    : false;

                  return (
                    <TableRow
                      key={String(batch.id)}
                      className="hover:bg-muted/40 transition-colors"
                    >
                      {/* Lote con enlace a la orden de compra original */}
                      <TableCell className="py-3 px-4 font-mono font-bold text-xs">
                        {batch.purchaseOrder ? (
                          <Link
                            href={`/purchasing/orders/${batch.purchaseOrder.id}`}
                            className="group inline-flex flex-col hover:underline cursor-pointer"
                            title={`Ver Orden de Compra #${batch.purchaseOrder.orderNumber}`}
                          >
                            <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-bold">
                              #{batch.lotNumber}
                              <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                            </span>
                            <span className="text-[10px] text-muted-foreground font-normal">
                              OC #{batch.purchaseOrder.orderNumber}
                            </span>
                          </Link>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-400">
                            #{batch.lotNumber}
                          </span>
                        )}
                      </TableCell>

                      {/* Insumo */}
                      <TableCell className="py-3 px-4">
                        <div className="font-semibold text-xs text-foreground">
                          {batch.product.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {batch.product.sku && (
                            <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded border border-border">
                              {batch.product.sku}
                            </span>
                          )}
                          {batch.product.category?.name && (
                            <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.2 rounded font-medium">
                              {batch.product.category.name}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Ubicación */}
                      <TableCell className="py-3 px-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{batch.location?.name ?? "Almacén Central"}</span>
                        </span>
                      </TableCell>

                      {/* Cantidad */}
                      <TableCell className="py-3 px-4 text-center font-mono font-bold text-xs text-foreground">
                        {batch.currentQuantity} {batch.product.unitOfMeasure}
                      </TableCell>

                      {/* Vencimiento */}
                      <TableCell className="py-3 px-4 text-center font-mono text-xs text-muted-foreground">
                        {batch.expirationDate ? (
                          <span className={isExpired ? "text-rose-600 dark:text-rose-400 font-bold" : undefined}>
                            {new Date(batch.expirationDate).toLocaleDateString("es-VE")}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>

                      {/* Fecha de Ingreso */}
                      <TableCell className="py-3 px-4 text-center text-xs text-muted-foreground">
                        {new Date(batch.createdAt).toLocaleDateString("es-VE")}
                      </TableCell>

                      {/* Estado */}
                      <TableCell className="py-3 px-4 text-center">
                        {isBatchQuarantine ? (
                          <Badge variant="warning" className="gap-1 text-[10px] font-semibold">
                            <ShieldAlert className="w-3 h-3" />
                            En Cuarentena
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1 text-[10px] font-semibold">
                            <XCircle className="w-3 h-3" />
                            Rechazado
                          </Badge>
                        )}
                      </TableCell>

                      {/* Acción */}
                      <TableCell className="py-3 px-4 text-right">
                        {isBatchQuarantine ? (
                          isAuthorized ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenInspection(batch)}
                              className="h-8 text-xs font-semibold gap-1.5 border-amber-300/70 bg-amber-50/70 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60 cursor-pointer shadow-2xs"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                              <span>Inspeccionar</span>
                            </Button>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Solo Lectura
                            </Badge>
                          )
                        ) : (
                          <span className="text-[11px] text-muted-foreground/60">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginación */}
        <TablePagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
          pageSizeOptions={[10, 25, 50]}
          entityName="lotes"
        />
      </Card>

      {/* ========================================================
          MODAL DE DICTAMEN DE CALIDAD (AMPLIADO Y MEJORADO)
         ======================================================== */}
      <Dialog
        open={Boolean(selectedBatch && isAuthorized)}
        onOpenChange={(open) => {
          if (!open) handleCloseInspection();
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto p-6">
          <DialogHeader className="pb-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  Dictamen de Calidad
                  {selectedBatch?.purchaseOrder && (
                    <Badge variant="outline" className="text-[11px] font-mono bg-muted/40 font-normal">
                      OC #{selectedBatch.purchaseOrder.orderNumber}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Evaluación técnica y destino para el lote retenido en cuarentena
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Ficha Resumen del Lote con enlace a la Orden de Compra */}
          {selectedBatch && (
            <div className="bg-muted/30 p-4 rounded-xl border border-border text-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Package className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-bold text-sm text-foreground truncate">
                    {selectedBatch.product.name}
                  </span>
                </div>
                {selectedBatch.purchaseOrder ? (
                  <Link
                    href={`/purchasing/orders/${selectedBatch.purchaseOrder.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 transition-colors shrink-0"
                    title="Ver orden de compra original en pestaña nueva"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Ver Orden #{selectedBatch.purchaseOrder.orderNumber}</span>
                    <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                  </Link>
                ) : (
                  <span className="font-mono text-xs text-amber-700 dark:text-amber-400 font-bold px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 shrink-0">
                    Lote #{selectedBatch.lotNumber}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                    N° Lote
                  </span>
                  {selectedBatch.purchaseOrder ? (
                    <Link
                      href={`/purchasing/orders/${selectedBatch.purchaseOrder.id}`}
                      target="_blank"
                      className="font-mono font-bold text-amber-700 dark:text-amber-400 hover:underline inline-flex items-center gap-1"
                    >
                      #{selectedBatch.lotNumber}
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </Link>
                  ) : (
                    <span className="font-mono font-bold text-foreground">
                      #{selectedBatch.lotNumber}
                    </span>
                  )}
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                    Cantidad Retenida
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {selectedBatch.currentQuantity} {selectedBatch.product.unitOfMeasure}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                    Ubicación
                  </span>
                  <span className="text-foreground truncate block">
                    {selectedBatch.location?.name ?? "Almacén Central"}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                    Vencimiento
                  </span>
                  <span className="font-mono text-foreground font-semibold">
                    {selectedBatch.expirationDate
                      ? new Date(selectedBatch.expirationDate).toLocaleDateString("es-VE")
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmitVerdict} className="space-y-4 pt-1">
            {/* Opciones de Dictamen Mejoradas */}
            <div className="space-y-2">
              <Label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Resolución del Dictamen *
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setVerdict("LIBERAR")}
                  className={cn(
                    "p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3",
                    verdict === "LIBERAR"
                      ? "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/20 shadow-2xs"
                      : "border-border hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      verdict === "LIBERAR" ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs block text-foreground">Aprobar y Liberar</span>
                    <span className="text-[11px] text-muted-foreground block leading-tight">
                      El insumo cumple especificaciones. Pasa directo a inventario disponible.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setVerdict("RECHAZAR")}
                  className={cn(
                    "p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3",
                    verdict === "RECHAZAR"
                      ? "border-rose-500 bg-rose-50/80 dark:bg-rose-950/30 text-rose-900 dark:text-rose-100 ring-2 ring-rose-500/20 shadow-2xs"
                      : "border-border hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      verdict === "RECHAZAR" ? "bg-rose-600 text-white" : "bg-muted text-muted-foreground"
                    )}
                  >
                    <XCircle className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs block text-foreground">Rechazar Lote</span>
                    <span className="text-[11px] text-muted-foreground block leading-tight">
                      No conforme. Se declara como merma, defecto o devolución al proveedor.
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Causa del Rechazo si se marca RECHAZAR */}
            {verdict === "RECHAZAR" && (
              <div className="p-3.5 bg-destructive/10 rounded-xl border border-destructive/20 space-y-2">
                <Label className="flex items-center gap-1.5 text-xs font-bold text-destructive uppercase tracking-wider">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Causa Técnica del Rechazo *
                </Label>
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value as IncidentType)}
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring cursor-pointer font-medium"
                  required
                >
                  {Object.entries(INCIDENT_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Justificación Técnica */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Justificación Técnica *
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Mínimo 5 caracteres • {technicalNotes.trim().length} ingresados
                </span>
              </div>
              <Textarea
                rows={3}
                value={technicalNotes}
                onChange={(e) => setTechnicalNotes(e.target.value)}
                placeholder="Detalles sobre temperatura de recepción, controles analíticos o motivo de la decisión técnica..."
                className="text-xs font-medium resize-none"
                required
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCloseInspection}
                disabled={submitting}
                className="cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting || technicalNotes.trim().length < 5}
                className="gap-2 cursor-pointer min-w-[150px]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  "Confirmar Dictamen"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
