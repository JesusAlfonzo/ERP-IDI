"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useTransition,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { RequestClientService } from "@/services/request.service";
import { AuthService } from "@/services/auth.service";
import { useDebounce } from "@/hooks/use-debounce";
import { TablePagination } from "@/components/common/TablePagination";
import type { InternalRequest, RequestPriority } from "@/types/requests";
import type { AuthUser } from "@/types/auth";
import { cn } from "@/lib/utils";
import {
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  X,
  Building2,
  Calendar,
  Layers,
  Clock,
  CheckCircle2,
  ArrowRight,
  Filter,
  Eye,
  Loader2,
  Check,
  Send,
  SlidersHorizontal,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DispatchTab = "PENDING" | "COMPLETED" | "PARTIAL" | "ALL";

function DispatchIndexContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id") || searchParams.get("requestId");

  // Redirección si se invoca con ID directo en la URL para crear/completar despacho
  useEffect(() => {
    if (queryId) {
      router.replace(`/requests/dispatch/new?requestId=${queryId}`);
    }
  }, [queryId, router]);

  const [currentUser] = useState<AuthUser | null>(() =>
    AuthService.getCurrentUser()
  );
  const userRoles = currentUser?.roles || [];
  const isWarehouseStaff =
    userRoles.includes("ADMINISTRADOR") || userRoles.includes("ALMACENISTA");

  const [requests, setRequests] = useState<InternalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros
  const [activeTab, setActiveTab] = useState<DispatchTab>("PENDING");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [, startTransition] = useTransition();

  const loadRequests = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const data = await RequestClientService.getRequests();
      setRequests(data);
    } catch (err) {
      console.error("Error al cargar solicitudes para despacho:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  // Lista de departamentos para el filtro
  const departmentsList = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => {
      const d = r.departmentSection || r.department?.name;
      if (d) set.add(d);
    });
    return Array.from(set).sort();
  }, [requests]);

  // Contadores para métricas y tabs
  const metrics = useMemo(() => {
    let pendingCount = 0;
    let completedCount = 0;
    let partialCount = 0;
    let totalDispatches = 0;

    requests.forEach((r) => {
      if (r.status === "APROBADA" || r.status === "DESPACHADA_PARCIAL") {
        pendingCount++;
      }
      if (r.status === "COMPLETADA") {
        completedCount++;
        totalDispatches++;
      }
      if (r.status === "DESPACHADA_PARCIAL") {
        partialCount++;
        totalDispatches++;
      }
    });

    return {
      pendingCount,
      completedCount,
      partialCount,
      totalDispatches,
    };
  }, [requests]);

  // Filtrado según Tab + Búsqueda + Filtros
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // Filtro por Tab
      if (activeTab === "PENDING") {
        if (r.status !== "APROBADA" && r.status !== "DESPACHADA_PARCIAL") {
          return false;
        }
      } else if (activeTab === "COMPLETED") {
        if (r.status !== "COMPLETADA") return false;
      } else if (activeTab === "PARTIAL") {
        if (r.status !== "DESPACHADA_PARCIAL") return false;
      } else {
        // ALL: solo las que tengan relevancia con despacho (Aprobadas, Parciales, Completadas)
        if (
          r.status !== "APROBADA" &&
          r.status !== "DESPACHADA_PARCIAL" &&
          r.status !== "COMPLETADA"
        ) {
          return false;
        }
      }

      // Filtro por Departamento
      if (selectedDept !== "ALL") {
        const d = r.departmentSection || r.department?.name;
        if (d !== selectedDept) return false;
      }

      // Filtro por Prioridad
      if (selectedPriority !== "ALL") {
        if (r.priority !== selectedPriority) return false;
      }

      // Búsqueda libre
      if (debouncedSearch.trim() !== "") {
        const q = debouncedSearch.toLowerCase().trim();
        const num = r.requestNumber.toLowerCase();
        const movRef = r.dispatchedMovement?.referenceNumber?.toLowerCase() || "";
        const dept = (r.departmentSection || r.department?.name || "").toLowerCase();
        const app = (r.applicant?.fullName || r.applicant?.username || "").toLowerCase();
        const hasItem = r.items.some(
          (i) =>
            i.product?.name?.toLowerCase().includes(q) ||
            i.product?.sku?.toLowerCase().includes(q)
        );

        if (
          !num.includes(q) &&
          !movRef.includes(q) &&
          !dept.includes(q) &&
          !app.includes(q) &&
          !hasItem
        ) {
          return false;
        }
      }

      return true;
    });
  }, [requests, activeTab, selectedDept, selectedPriority, debouncedSearch]);

  // Paginación
  const totalItems = filteredRequests.length;
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  const hasActiveFilters =
    debouncedSearch.trim() !== "" ||
    selectedDept !== "ALL" ||
    selectedPriority !== "ALL";

  const clearFilters = () => {
    setSearch("");
    setSelectedDept("ALL");
    setSelectedPriority("ALL");
    setCurrentPage(1);
  };

  if (queryId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Abriendo formulario de despacho...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-12">
      {/* ========================================================
          ENCABEZADO ESTANDARIZADO INSTITUCIONAL
         ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 shadow-2xs">
            <PackageCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Despachos
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gestión y control de salidas de almacén
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadRequests(true)}
            disabled={refreshing}
            className="h-8 text-xs gap-1.5 cursor-pointer"
            title="Actualizar datos"
          >
            <RefreshCw
              className={cn("w-3.5 h-3.5", refreshing && "animate-spin text-primary")}
            />
            <span>Actualizar</span>
          </Button>

          {isWarehouseStaff && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => router.push("/requests/dispatch/new")}
              className="h-8 text-xs gap-1.5 font-semibold cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Despacho</span>
            </Button>
          )}
        </div>
      </div>

      {/* ========================================================
          TARJETAS DE MÉTRICAS RÁPIDAS
         ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Despachos */}
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                Total Despachos
              </span>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {metrics.totalDispatches}
              </p>
              <span className="text-[10px] text-muted-foreground">
                Entregas procesadas
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        {/* Por Despachar */}
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                Por Despachar
              </span>
              <p className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                {metrics.pendingCount}
              </p>
              <span className="text-[10px] text-muted-foreground">
                En espera de salida
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        {/* Despachos Parciales */}
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                Despachos Parciales
              </span>
              <p className="text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
                {metrics.partialCount}
              </p>
              <span className="text-[10px] text-muted-foreground">
                Con saldo pendiente
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        {/* Completados */}
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                Completados
              </span>
              <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {metrics.completedCount}
              </p>
              <span className="text-[10px] text-muted-foreground">
                Entregas al 100%
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================
          PESTAÑAS DE FILTRO RÁPIDO
         ======================================================== */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val as DispatchTab);
          setCurrentPage(1);
        }}
        className="w-full"
      >
        <TabsList className="bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="PENDING" className="text-xs gap-1.5 cursor-pointer">
            <Clock className="w-3.5 h-3.5" />
            <span>Por Despachar</span>
            <Badge variant="secondary" className="ml-1 text-[10px] py-0 px-1.5 h-4">
              {metrics.pendingCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="COMPLETED" className="text-xs gap-1.5 cursor-pointer">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Completados</span>
            <Badge variant="secondary" className="ml-1 text-[10px] py-0 px-1.5 h-4">
              {metrics.completedCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="PARTIAL" className="text-xs gap-1.5 cursor-pointer">
            <Layers className="w-3.5 h-3.5" />
            <span>Parciales</span>
            <Badge variant="secondary" className="ml-1 text-[10px] py-0 px-1.5 h-4">
              {metrics.partialCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="ALL" className="text-xs gap-1.5 cursor-pointer">
            <PackageCheck className="w-3.5 h-3.5" />
            <span>Todos</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* ========================================================
          BARRA DE BÚSQUEDA Y FILTROS SECUNDARIOS
         ======================================================== */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Buscador */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por N° solicitud, comprobante, solicitante o insumo..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-8 pr-8 h-8 text-xs bg-card"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCurrentPage(1);
              }}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filtro por Departamento */}
        <div className="w-full sm:w-48">
          <Select
            value={selectedDept}
            onValueChange={(val) => {
              setSelectedDept(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-8 text-xs bg-card">
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              <SelectItem value="ALL" className="text-xs">
                Todos los deptos.
              </SelectItem>
              {departmentsList.map((d) => (
                <SelectItem key={d} value={d} className="text-xs">
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Filtro por Prioridad */}
        <div className="w-full sm:w-40">
          <Select
            value={selectedPriority}
            onValueChange={(val) => {
              setSelectedPriority(val);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="h-8 text-xs bg-card">
              <SelectValue placeholder="Prioridad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">
                Toda prioridad
              </SelectItem>
              <SelectItem value="URGENTE" className="text-xs">
                Urgente
              </SelectItem>
              <SelectItem value="RUTINA" className="text-xs">
                Rutina
              </SelectItem>
              <SelectItem value="BAJA" className="text-xs">
                Baja
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Limpiar filtros */}
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1 px-2.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>Limpiar</span>
          </Button>
        )}
      </div>

      {/* ========================================================
          TABLA DE REGISTROS DE DESPACHO
         ======================================================== */}
      <Card className="border-border shadow-2xs overflow-hidden">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">
              Cargando despachos...
            </span>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
              <PackageCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              No se encontraron despachos
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {hasActiveFilters
                ? "No hay resultados para los filtros seleccionados."
                : activeTab === "PENDING"
                ? "No hay solicitudes pendientes de despacho en este momento."
                : "No hay registros disponibles en esta sección."}
            </p>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="h-8 text-xs"
              >
                Limpiar filtros
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="text-xs font-semibold">N° Solicitud</TableHead>
                  <TableHead className="text-xs font-semibold">Comprobante</TableHead>
                  <TableHead className="text-xs font-semibold">Fecha</TableHead>
                  <TableHead className="text-xs font-semibold">Departamento</TableHead>
                  <TableHead className="text-xs font-semibold">Solicitante</TableHead>
                  <TableHead className="text-xs font-semibold">Prioridad</TableHead>
                  <TableHead className="text-xs font-semibold">Estado</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRequests.map((req) => {
                  const movRef = req.dispatchedMovement?.referenceNumber;
                  const canDispatchThis =
                    isWarehouseStaff &&
                    (req.status === "APROBADA" || req.status === "DESPACHADA_PARCIAL");
                  const hasViewableDispatch =
                    req.status === "COMPLETADA" ||
                    Boolean(req.dispatchedMovementId || req.dispatchedMovement);

                  return (
                    <TableRow key={req.id} className="hover:bg-muted/30">
                      {/* N° Solicitud */}
                      <TableCell className="text-xs font-mono font-bold">
                        <Link
                          href={`/requests/${req.id}`}
                          className="text-primary hover:underline"
                        >
                          #{req.requestNumber}
                        </Link>
                      </TableCell>

                      {/* Comprobante */}
                      <TableCell className="text-xs font-mono">
                        {movRef ? (
                          <span className="font-semibold text-foreground">
                            {movRef}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">
                            Pendiente
                          </span>
                        )}
                      </TableCell>

                      {/* Fecha */}
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(req.createdAt).toLocaleDateString("es-VE")}
                      </TableCell>

                      {/* Departamento */}
                      <TableCell className="text-xs font-medium text-foreground">
                        {req.departmentSection || req.department?.name || "—"}
                      </TableCell>

                      {/* Solicitante */}
                      <TableCell className="text-xs text-muted-foreground">
                        {req.applicant?.fullName || req.applicant?.username || "—"}
                      </TableCell>

                      {/* Prioridad */}
                      <TableCell>
                        <Badge
                          variant={
                            req.priority === "URGENTE"
                              ? "destructive"
                              : req.priority === "BAJA"
                              ? "secondary"
                              : "outline"
                          }
                          className="text-[10px]"
                        >
                          {req.priority}
                        </Badge>
                      </TableCell>

                      {/* Estado */}
                      <TableCell>
                        <Badge
                          variant={
                            req.status === "COMPLETADA"
                              ? "success"
                              : req.status === "DESPACHADA_PARCIAL"
                              ? "purple"
                              : "info"
                          }
                          className="text-[10px] font-semibold"
                        >
                          {req.status === "DESPACHADA_PARCIAL"
                            ? "Parcial"
                            : req.status === "APROBADA"
                            ? "Aprobada"
                            : req.status}
                        </Badge>
                      </TableCell>

                      {/* Acciones */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canDispatchThis && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() =>
                                router.push(`/requests/dispatch/new?requestId=${req.id}`)
                              }
                              className="h-7 px-2.5 text-xs font-semibold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-2xs"
                              title="Despachar materiales"
                            >
                              <Check className="w-3 h-3" />
                              <span>Despachar</span>
                            </Button>
                          )}

                          {hasViewableDispatch && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                router.push(`/requests/dispatch/${req.id}`)
                              }
                              className="h-7 px-2 text-xs gap-1 cursor-pointer"
                              title="Ver comprobante de entrega"
                            >
                              <Eye className="w-3 h-3 text-primary" />
                              <span>Detalle</span>
                            </Button>
                          )}

                          {!canDispatchThis && !hasViewableDispatch && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/requests/${req.id}`)}
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              <span>Ver</span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Paginación */}
        {filteredRequests.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalPages={Math.ceil(totalItems / pageSize) || 1}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={(page) => {
              startTransition(() => {
                setCurrentPage(page);
              });
            }}
            onPageSizeChange={(newSize) => {
              startTransition(() => {
                setPageSize(newSize);
                setCurrentPage(1);
              });
            }}
          />
        )}
      </Card>
    </div>
  );
}

export default function DispatchIndexPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando despachos...</p>
        </div>
      }
    >
      <DispatchIndexContent />
    </Suspense>
  );
}
