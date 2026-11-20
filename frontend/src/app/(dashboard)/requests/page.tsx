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
import type {
  InternalRequest,
  RequestPriority,
  RequestWindowStatus,
} from "@/types/requests";
import type { AuthUser } from "@/types/auth";
import { toast } from "@/utils/toast";
import { cn } from "@/lib/utils";
import {
  ClipboardList,
  Plus,
  RefreshCw,
  Search,
  X,
  Building2,
  Calendar,
  Layers,
  Clock,
  CheckCircle2,
  PackageCheck,
  Check,
  Ban,
  Eye,
  Pencil,
  Loader2,
  AlertCircle,
  XCircle,
  ShieldAlert,
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

type RequestsTab = "PENDING" | "APPROVED" | "DISPATCHED" | "REJECTED" | "ALL";

function RequestsIndexContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatchQueryId = searchParams.get("dispatch");

  // Redirección si se invoca con ?dispatch=ID
  useEffect(() => {
    if (dispatchQueryId) {
      router.replace(`/requests/dispatch/new?requestId=${dispatchQueryId}`);
    }
  }, [dispatchQueryId, router]);

  const [currentUser] = useState<AuthUser | null>(() =>
    AuthService.getCurrentUser()
  );
  const userRoles = currentUser?.roles || [];
  const isWarehouseStaff =
    userRoles.includes("ADMINISTRADOR") || userRoles.includes("ALMACENISTA");
  const canCreate =
    userRoles.includes("SOLICITANTE") ||
    userRoles.includes("ADMINISTRADOR") ||
    userRoles.includes("ALMACENISTA") ||
    userRoles.includes("LABORATORIO") ||
    userRoles.includes("COMPRAS") ||
    userRoles.includes("COORDINADOR") ||
    userRoles.includes("BIOANALISTA");

  const [requests, setRequests] = useState<InternalRequest[]>([]);
  const [windowStatus, setWindowStatus] = useState<RequestWindowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros
  const [activeTab, setActiveTab] = useState<RequestsTab>("PENDING");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 250);
  const [selectedDept, setSelectedDept] = useState<string>("ALL");
  const [selectedPriority, setSelectedPriority] = useState<string>("ALL");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [, startTransition] = useTransition();

  // Estados de Modales y Acciones
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [requestToReject, setRequestToReject] = useState<InternalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const [reqData, winData] = await Promise.all([
        RequestClientService.getRequests(),
        RequestClientService.getWindowStatus().catch(() => null),
      ]);
      setRequests(reqData);
      setWindowStatus(winData);
    } catch (err) {
      console.error("Error al cargar pedidos:", err);
      toast.error("Error al cargar pedidos");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Lista de departamentos para el selector de filtro
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
    let approvedCount = 0;
    let dispatchedCount = 0;
    let rejectedCount = 0;
    let totalCount = requests.length;

    requests.forEach((r) => {
      if (r.status === "PENDIENTE") pendingCount++;
      else if (r.status === "APROBADA") approvedCount++;
      else if (r.status === "COMPLETADA" || r.status === "DESPACHADA_PARCIAL") {
        dispatchedCount++;
      } else if (r.status === "RECHAZADA") {
        rejectedCount++;
      }
    });

    return {
      totalCount,
      pendingCount,
      approvedCount,
      dispatchedCount,
      rejectedCount,
    };
  }, [requests]);

  // Filtrado según Tab + Búsqueda + Filtros
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      // 1. Filtro por Tab
      if (activeTab === "PENDING") {
        if (r.status !== "PENDIENTE") return false;
      } else if (activeTab === "APPROVED") {
        if (r.status !== "APROBADA") return false;
      } else if (activeTab === "DISPATCHED") {
        if (r.status !== "COMPLETADA" && r.status !== "DESPACHADA_PARCIAL") {
          return false;
        }
      } else if (activeTab === "REJECTED") {
        if (r.status !== "RECHAZADA") return false;
      }

      // 2. Filtro por Departamento
      if (selectedDept !== "ALL") {
        const d = r.departmentSection || r.department?.name;
        if (d !== selectedDept) return false;
      }

      // 3. Filtro por Prioridad
      if (selectedPriority !== "ALL") {
        if (r.priority !== selectedPriority) return false;
      }

      // 4. Búsqueda libre
      if (debouncedSearch.trim() !== "") {
        const q = debouncedSearch.toLowerCase().trim();
        const num = r.requestNumber.toLowerCase();
        const dept = (r.departmentSection || r.department?.name || "").toLowerCase();
        const app = (r.applicant?.fullName || r.applicant?.username || "").toLowerCase();
        const hasItem = r.items.some(
          (i) =>
            i.product?.name?.toLowerCase().includes(q) ||
            i.product?.sku?.toLowerCase().includes(q)
        );

        if (!num.includes(q) && !dept.includes(q) && !app.includes(q) && !hasItem) {
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

  // Acción rápida Aprobar
  const handleApprove = async (req: InternalRequest) => {
    if (!isWarehouseStaff) return;
    setApprovingId(req.id);
    try {
      const itemsToApprove = req.items.map((it) => ({
        itemId: Number(it.id),
        quantityApproved: Number(
          it.quantityRequested ?? it.requestedQuantity ?? 1
        ),
      }));

      await RequestClientService.approveRequest(req.id, itemsToApprove);
      toast.success(`Pedido #${req.requestNumber} aprobado exitosamente.`);
      await loadData();
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Error al aprobar pedido";
      toast.error(errorMsg);
    } finally {
      setApprovingId(null);
    }
  };

  // Acción Rechazar
  const handleReject = async () => {
    if (!requestToReject || !isWarehouseStaff || rejectReason.trim().length < 5) {
      toast.error("El motivo de rechazo debe tener al menos 5 caracteres.");
      return;
    }
    setRejecting(true);
    try {
      await RequestClientService.rejectRequest(
        requestToReject.id,
        rejectReason.trim()
      );
      toast.success(`Pedido #${requestToReject.requestNumber} rechazado.`);
      setRequestToReject(null);
      setRejectReason("");
      await loadData();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Error al rechazar";
      toast.error(errorMsg);
    } finally {
      setRejecting(false);
    }
  };

  if (dispatchQueryId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Abriendo despacho...</p>
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
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Pedidos
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gestión y seguimiento de requisiciones internas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadData(true)}
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
              variant="outline"
              size="sm"
              onClick={() => router.push("/requests/dispatch")}
              className="h-8 text-xs gap-1.5 cursor-pointer border-emerald-300/80 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/70 dark:border-emerald-800 dark:text-emerald-300 dark:bg-emerald-950/30"
              title="Ir a gestión de despachos"
            >
              <PackageCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Despachos</span>
            </Button>
          )}

          {canCreate && (
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => router.push("/requests/new")}
              className="h-8 text-xs gap-1.5 font-semibold cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Pedido</span>
            </Button>
          )}
        </div>
      </div>

      {/* ========================================================
          BANNER DE VENTANA OPERATIVA (Si está cerrada)
         ======================================================== */}
      {windowStatus && !windowStatus.isOpen && (
        <div className="p-3.5 rounded-xl border border-amber-300/70 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/30 text-xs flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Horario de pedidos:</strong> {windowStatus.message || "La recepción de solicitudes se encuentra inactiva actualmente."}
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] bg-background/80 shrink-0">
            Cerrado
          </Badge>
        </div>
      )}

      {/* ========================================================
          TARJETAS DE MÉTRICAS RÁPIDAS
         ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pedidos */}
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                Total Pedidos
              </span>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {metrics.totalCount}
              </p>
              <span className="text-[10px] text-muted-foreground">
                Registrados en el ciclo
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <ClipboardList className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        {/* Pendientes */}
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                Pendientes
              </span>
              <p className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
                {metrics.pendingCount}
              </p>
              <span className="text-[10px] text-muted-foreground">
                Por revisar y aprobar
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        {/* Aprobadas */}
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                Aprobadas
              </span>
              <p className="text-2xl font-bold tracking-tight text-sky-600 dark:text-sky-400">
                {metrics.approvedCount}
              </p>
              <span className="text-[10px] text-muted-foreground">
                Listas para despacho
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        {/* Despachadas */}
        <Card className="border-border shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-medium text-muted-foreground">
                Despachadas
              </span>
              <p className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {metrics.dispatchedCount}
              </p>
              <span className="text-[10px] text-muted-foreground">
                Completas o parciales
              </span>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <PackageCheck className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================
          PESTAÑAS DE FILTRADO RÁPIDO
         ======================================================== */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val as RequestsTab);
          setCurrentPage(1);
        }}
        className="w-full"
      >
        <TabsList className="bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="PENDING" className="text-xs gap-1.5 cursor-pointer">
            <Clock className="w-3.5 h-3.5" />
            <span>Pendientes</span>
            <Badge variant="secondary" className="ml-1 text-[10px] py-0 px-1.5 h-4">
              {metrics.pendingCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="APPROVED" className="text-xs gap-1.5 cursor-pointer">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Aprobadas</span>
            <Badge variant="secondary" className="ml-1 text-[10px] py-0 px-1.5 h-4">
              {metrics.approvedCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="DISPATCHED" className="text-xs gap-1.5 cursor-pointer">
            <PackageCheck className="w-3.5 h-3.5" />
            <span>Despachadas</span>
            <Badge variant="secondary" className="ml-1 text-[10px] py-0 px-1.5 h-4">
              {metrics.dispatchedCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="REJECTED" className="text-xs gap-1.5 cursor-pointer">
            <Ban className="w-3.5 h-3.5" />
            <span>Rechazadas</span>
            <Badge variant="secondary" className="ml-1 text-[10px] py-0 px-1.5 h-4">
              {metrics.rejectedCount}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="ALL" className="text-xs gap-1.5 cursor-pointer">
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Todas</span>
            <Badge variant="secondary" className="ml-1 text-[10px] py-0 px-1.5 h-4">
              {metrics.totalCount}
            </Badge>
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
            placeholder="Buscar por N° pedido, solicitante, departamento o insumo..."
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
          TABLA DE PEDIDOS
         ======================================================== */}
      <Card className="border-border shadow-2xs overflow-hidden">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">
              Cargando pedidos...
            </span>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-muted/60 text-muted-foreground flex items-center justify-center mx-auto">
              <ClipboardList className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              No se encontraron pedidos
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {hasActiveFilters
                ? "No hay resultados para los filtros seleccionados."
                : activeTab === "PENDING"
                ? "No hay pedidos pendientes de aprobación."
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
                  <TableHead className="text-xs font-semibold">N° Pedido</TableHead>
                  <TableHead className="text-xs font-semibold">Fecha</TableHead>
                  <TableHead className="text-xs font-semibold">Departamento</TableHead>
                  <TableHead className="text-xs font-semibold">Solicitante</TableHead>
                  <TableHead className="text-xs font-semibold">Renglones</TableHead>
                  <TableHead className="text-xs font-semibold">Prioridad</TableHead>
                  <TableHead className="text-xs font-semibold">Estado</TableHead>
                  <TableHead className="text-right text-xs font-semibold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRequests.map((req) => {
                  const isAuthor =
                    currentUser &&
                    (req.applicant?.id === currentUser.id ||
                      (req as any).userId === currentUser.id);
                  const isPending = req.status === "PENDIENTE";
                  const canApproveReject = isWarehouseStaff && isPending;
                  const canEdit = isPending && (isAuthor || isWarehouseStaff);
                  const canDispatch =
                    isWarehouseStaff &&
                    (req.status === "APROBADA" || req.status === "DESPACHADA_PARCIAL");

                  return (
                    <TableRow key={req.id} className="hover:bg-muted/30">
                      {/* N° Pedido */}
                      <TableCell className="text-xs font-mono font-bold">
                        <Link
                          href={`/requests/${req.id}`}
                          className="text-primary hover:underline"
                        >
                          #{req.requestNumber}
                        </Link>
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

                      {/* Renglones */}
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {req.items.length} insumo(s)
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
                              : req.status === "APROBADA"
                              ? "info"
                              : req.status === "RECHAZADA"
                              ? "destructive"
                              : "warning"
                          }
                          className="text-[10px] font-semibold"
                        >
                          {req.status === "DESPACHADA_PARCIAL"
                            ? "Parcial"
                            : req.status === "PENDIENTE"
                            ? "Pendiente"
                            : req.status === "APROBADA"
                            ? "Aprobada"
                            : req.status === "COMPLETADA"
                            ? "Completada"
                            : "Rechazada"}
                        </Badge>
                      </TableCell>

                      {/* Acciones */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botón Aprobar rápido */}
                          {canApproveReject && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => void handleApprove(req)}
                              disabled={approvingId === req.id}
                              className="h-7 px-2 text-xs font-semibold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-2xs"
                              title="Aprobar pedido"
                            >
                              {approvingId === req.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                              <span>Aprobar</span>
                            </Button>
                          )}

                          {/* Botón Rechazar */}
                          {canApproveReject && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setRequestToReject(req);
                                setRejectReason("");
                              }}
                              className="h-7 px-2 text-xs gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                              title="Rechazar pedido"
                            >
                              <Ban className="w-3 h-3" />
                              <span>Rechazar</span>
                            </Button>
                          )}

                          {/* Botón Despachar */}
                          {canDispatch && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() =>
                                router.push(`/requests/dispatch/new?requestId=${req.id}`)
                              }
                              className="h-7 px-2 text-xs font-semibold gap-1 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-2xs"
                              title="Despachar pedido"
                            >
                              <PackageCheck className="w-3 h-3" />
                              <span>Despachar</span>
                            </Button>
                          )}

                          {/* Botón Editar */}
                          {canEdit && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/requests/${req.id}/edit`)}
                              className="h-7 px-2 text-xs gap-1 cursor-pointer"
                              title="Editar pedido"
                            >
                              <Pencil className="w-3 h-3 text-muted-foreground" />
                              <span>Editar</span>
                            </Button>
                          )}

                          {/* Botón Ver Detalle */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/requests/${req.id}`)}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Ver detalle del pedido"
                          >
                            <Eye className="w-3 h-3 text-primary" />
                            <span>Ver</span>
                          </Button>
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

      {/* ========================================================
          MODAL DE RECHAZO DE PEDIDO
         ======================================================== */}
      <Dialog
        open={Boolean(requestToReject)}
        onOpenChange={(open) => {
          if (!open) {
            setRequestToReject(null);
            setRejectReason("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <Ban className="w-4 h-4" />
              Rechazar Pedido #{requestToReject?.requestNumber}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Indique el motivo de rechazo institucional para notificar al solicitante.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="rejectReason" className="text-xs font-semibold text-foreground">
              Motivo de rechazo <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="rejectReason"
              rows={3}
              placeholder="Indique la causa del rechazo (mínimo 5 caracteres)..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setRequestToReject(null);
                setRejectReason("");
              }}
              disabled={rejecting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => void handleReject()}
              disabled={rejecting || rejectReason.trim().length < 5}
              className="gap-1.5"
            >
              {rejecting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Rechazando...</span>
                </>
              ) : (
                <>
                  <Ban className="w-3.5 h-3.5" />
                  <span>Confirmar Rechazo</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function RequestsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando pedidos...</p>
        </div>
      }
    >
      <RequestsIndexContent />
    </Suspense>
  );
}
