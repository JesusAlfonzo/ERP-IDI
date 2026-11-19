"use client";

import { useEffect, useState, useTransition, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/services/auth.service";
import {
  DashboardClientService,
  DashboardMetricsResponse,
  SystemNotification,
} from "@/services/dashboard.service";
import type { AuthUser } from "@/types/auth";
import { cn } from "@/lib/utils";
import {
  Activity,
  ClipboardList,
  AlertTriangle,
  Package,
  ShoppingCart,
  Banknote,
  DollarSign,
  Boxes,
  Truck,
  ShieldAlert,
  Loader2,
  ArrowRight,
  TrendingUp,
  Building,
  Building2,
  Calendar,
  Layers,
  CheckCircle2,
  CheckCheck,
  X,
  ChevronDown,
  RefreshCw,
  Plus,
  PackageCheck,
  SlidersHorizontal,
  History,
  Wallet,
  FileText,
  Clock,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  Coins,
  BarChart3,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert } from "@/components/ui/alert";

type ActiveTab = "SOLICITUDES" | "ALMACEN" | "COMPRAS" | "PAGOS" | "EJECUTIVO";

const DAY_NAMES: Record<number, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
};

const MOVEMENT_TYPE_LABELS: Record<
  string,
  {
    label: string;
    variant: "success" | "warning" | "info" | "purple" | "destructive" | "outline";
    isEntry: boolean;
  }
> = {
  ENTRADA_COMPRA: { label: "Compra", variant: "success", isEntry: true },
  DESPACHO_SOLICITUD: { label: "Despacho", variant: "warning", isEntry: false },
  AJUSTE_INVENTARIO: { label: "Ajuste", variant: "info", isEntry: true },
  DESCARTE_MERMA: { label: "Merma", variant: "destructive", isEntry: false },
  TRASLADO_A_LABORATORIO: { label: "Traslado", variant: "purple", isEntry: false },
};

export default function DashboardPage() {
  const router = useRouter();
  const [user] = useState<AuthUser | null>(() => AuthService.getCurrentUser());
  const [metrics, setMetrics] = useState<DashboardMetricsResponse>({});
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  // Inicialización perezosa: Carga desde localStorage sin provocar renders en cascada
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) return [];
    try {
      const saved = localStorage.getItem(
        `idi_dismissed_alerts_${currentUser.id}`,
      );
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  const roles = user?.roles || [];
  const isAdmin = roles.includes("ADMINISTRADOR");
  const isExecutive = isAdmin || roles.includes("COORDINADOR");
  const isWarehouse = roles.includes("ALMACENISTA") || isAdmin;
  const isPurchasing =
    roles.includes("COMPRAS") || roles.includes("ADMINISTRACION") || isAdmin;
  const isPayments =
    roles.includes("COMPRAS") || roles.includes("ADMINISTRACION") || isAdmin;
  const isRequester =
    roles.includes("SOLICITANTE") ||
    roles.includes("LABORATORIO") ||
    roles.includes("BIOANALISTA") ||
    roles.includes("COORDINADOR") ||
    roles.includes("COORDINADOR_LABORATORIO") ||
    roles.includes("INVESTIGACION") ||
    roles.includes("DOCENCIA") ||
    isAdmin;

  // Calculamos los tabs que el usuario tiene realmente permitidos según RBAC
  const availableTabs: ActiveTab[] = [];
  if (isExecutive) availableTabs.push("EJECUTIVO");
  if (isWarehouse) availableTabs.push("ALMACEN");
  if (isPurchasing) availableTabs.push("COMPRAS");
  if (isPayments) availableTabs.push("PAGOS");
  if (isRequester) availableTabs.push("SOLICITUDES");

  // Tab activo inicial
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    return availableTabs[0] || "SOLICITUDES";
  });

  const storageKey = user ? `idi_dismissed_alerts_${user.id}` : null;

  const fetchDashboardData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const [metricsData, notifsData] = await Promise.all([
        DashboardClientService.getMetrics(),
        DashboardClientService.getNotifications(),
      ]);
      setMetrics(metricsData);
      setNotifications(notifsData);
      setLastUpdatedAt(new Date());
    } catch (err) {
      console.error("Error al cargar dashboard", err);
    } finally {
      setLoading(false);
      if (isManualRefresh) {
        setTimeout(() => setRefreshing(false), 350);
      }
    }
  }, []);

  useEffect(() => {
    if (!AuthService.isAuthenticated()) {
      router.replace("/login");
      return;
    }

    startTransition(() => {
      void fetchDashboardData(false);
    });
  }, [router, fetchDashboardData]);

  // Manejador para descartar una alerta
  const handleDismissAlert = (id: string) => {
    setDismissedAlertIds((prev) => {
      const updated = Array.from(new Set([...prev, id]));
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch (err) {
          console.error("Error guardando alerta descartada", err);
        }
      }
      return updated;
    });
  };

  // Manejador al hacer clic en "Ver detalle": descarta la alerta y navega
  const handleResolveAlert = (alert: SystemNotification) => {
    if (alert.id.startsWith("req-") || alert.id.startsWith("lab-vial-")) {
      handleDismissAlert(alert.id);
    }
    router.push(alert.link);
  };

  // Filtrar solo las alertas urgentes que NO han sido descartadas por el usuario
  const visibleUrgentAlerts = useMemo(() => {
    return notifications.filter((n) => {
      const isUrgent = n.type === "ALERT" || n.type === "WARNING";
      const isDismissed = dismissedAlertIds.includes(n.id);
      return isUrgent && !isDismissed;
    });
  }, [notifications, dismissedAlertIds]);

  // Control del desplegable de alertas (persistido por usuario para no empujar el contenido)
  const [isAlertsExpanded, setIsAlertsExpanded] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = localStorage.getItem("idi_dashboard_alerts_expanded");
      if (saved !== null) return saved === "true";
    } catch {
      // fallback
    }
    return true;
  });

  const toggleAlertsExpanded = () => {
    setIsAlertsExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("idi_dashboard_alerts_expanded", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const criticalCount = useMemo(() => {
    return visibleUrgentAlerts.filter((a) => a.type === "ALERT").length;
  }, [visibleUrgentAlerts]);

  const warningCount = useMemo(() => {
    return visibleUrgentAlerts.filter((a) => a.type === "WARNING").length;
  }, [visibleUrgentAlerts]);

  const hasDismissable = useMemo(() => {
    return visibleUrgentAlerts.some(
      (a) => a.id.startsWith("req-") || a.id.startsWith("lab-vial-"),
    );
  }, [visibleUrgentAlerts]);

  const handleDismissAllDismissable = () => {
    const dismissableIds = visibleUrgentAlerts
      .filter((a) => a.id.startsWith("req-") || a.id.startsWith("lab-vial-"))
      .map((a) => a.id);
    if (dismissableIds.length === 0) return;
    setDismissedAlertIds((prev) => {
      const updated = Array.from(new Set([...prev, ...dismissableIds]));
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch (err) {
          console.error("Error guardando alertas descartadas", err);
        }
      }
      return updated;
    });
  };

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-medium">
          Cargando panel...
        </span>
      </div>
    );
  }

  if (availableTabs.length === 0) {
    return (
      <Card className="p-8 text-center space-y-4 max-w-md mx-auto mt-12 shadow-2xs border-border/80">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-foreground">
          Sin módulos asignados
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Tu cuenta no tiene permisos asignados. Contacta al administrador.
        </p>
      </Card>
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
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Panel Principal
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hola,{" "}
              <strong className="text-foreground font-semibold">
                {user?.fullName || user?.username}
              </strong>
            </p>
          </div>
        </div>

        {/* Controles Superiores y Estado de Sincronización */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {lastUpdatedAt && (
            <span className="text-[11px] text-muted-foreground font-mono hidden md:inline-flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-lg border border-border/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {lastUpdatedAt.toLocaleTimeString("es-VE", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void fetchDashboardData(true)}
            disabled={refreshing}
            className="h-8 text-xs gap-1.5 cursor-pointer"
            title="Actualizar datos"
          >
            <RefreshCw
              className={cn("w-3.5 h-3.5", refreshing && "animate-spin text-primary")}
            />
            <span>Actualizar</span>
          </Button>
        </div>
      </div>

      {/* ========================================================
          SELECTOR DE VISTA POR ROL (RBAC) + ACCIONES RÁPIDAS
         ======================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {availableTabs.length > 1 ? (
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as ActiveTab)}
            className="w-full lg:w-auto"
          >
            <TabsList className="bg-muted/70 p-1 rounded-xl h-auto flex flex-wrap gap-1 justify-start border border-border/60">
              {isExecutive && (
                <TabsTrigger
                  value="EJECUTIVO"
                  className="gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs cursor-pointer"
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  Dirección Ejecutiva
                </TabsTrigger>
              )}

              {isWarehouse && (
                <TabsTrigger
                  value="ALMACEN"
                  className="gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:text-amber-600 dark:data-[state=active]:text-amber-400 data-[state=active]:shadow-xs cursor-pointer"
                >
                  <Boxes className="w-3.5 h-3.5" />
                  Almacén
                  {(metrics.warehouseSection?.pendingRequests ?? 0) > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                      {metrics.warehouseSection?.pendingRequests}
                    </span>
                  )}
                </TabsTrigger>
              )}

              {isPurchasing && (
                <TabsTrigger
                  value="COMPRAS"
                  className="gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-xs cursor-pointer"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Compras
                  {(metrics.purchasingSection?.pendingRequisitionsCount ?? 0) > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300">
                      {metrics.purchasingSection?.pendingRequisitionsCount}
                    </span>
                  )}
                </TabsTrigger>
              )}

              {isPayments && (
                <TabsTrigger
                  value="PAGOS"
                  className="gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-xs cursor-pointer"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  Pagos
                  {(metrics.paymentsSection?.pendingSuppliersWithDebtCount ?? 0) > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 text-[10px] font-mono font-bold rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300">
                      {metrics.paymentsSection?.pendingSuppliersWithDebtCount}
                    </span>
                  )}
                </TabsTrigger>
              )}

              {isRequester && (
                <TabsTrigger
                  value="SOLICITUDES"
                  className="gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 data-[state=active]:shadow-xs cursor-pointer"
                >
                  <ClipboardList className="w-3.5 h-3.5" />
                  Solicitudes
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/60 border border-border/60 text-xs font-semibold text-foreground self-start">
            <ClipboardList className="w-3.5 h-3.5 text-primary" />
            <span>
              {activeTab === "EJECUTIVO"
                ? "Dirección Ejecutiva"
                : activeTab === "ALMACEN"
                  ? "Almacén"
                  : activeTab === "COMPRAS"
                    ? "Compras"
                    : activeTab === "PAGOS"
                      ? "Pagos"
                      : "Solicitudes"}
            </span>
          </div>
        )}

        {/* Barra de Atajos Operativos Contextual según Pestaña Activa */}
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === "EJECUTIVO" && isExecutive && (
            <>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/inventory/kardex")}
                  className="h-8 text-xs gap-1.5 cursor-pointer"
                >
                  <History className="w-3.5 h-3.5 text-primary" />
                  Movimientos
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/inventory/reports")}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <BarChart3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Reportes
              </Button>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/admin/users")}
                  className="h-8 text-xs gap-1.5 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Usuarios
                </Button>
              )}
            </>
          )}

          {activeTab === "ALMACEN" && isWarehouse && (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={() => router.push("/requests/dispatch")}
                className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              >
                <PackageCheck className="w-3.5 h-3.5" />
                Despachar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/inventory/products")}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <Package className="w-3.5 h-3.5 text-primary" />
                Catálogo
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/inventory/adjustments")}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Ajustes
              </Button>
            </>
          )}

          {activeTab === "COMPRAS" && isPurchasing && (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={() => router.push("/purchasing/orders/new")}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Nueva Orden
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/purchasing/requisitions/new")}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                Nueva Preorden
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/purchasing/suppliers")}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                Proveedores
              </Button>
            </>
          )}

          {activeTab === "PAGOS" && isPayments && (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={() => router.push("/purchasing/debts")}
                className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              >
                <Banknote className="w-3.5 h-3.5" />
                Deudas
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/admin/financial/payments/new")}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-primary" />
                Nuevo Egreso
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/admin/financial/payments")}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Egresos
              </Button>
            </>
          )}

          {activeTab === "SOLICITUDES" && isRequester && (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={() => router.push("/requests/new")}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Nueva Solicitud
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/requests")}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <ClipboardList className="w-3.5 h-3.5 text-primary" />
                Mis Solicitudes
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ========================================================
          PANEL DESPLEGABLE DE ALERTAS Y AVISOS CRÍTICOS
         ======================================================== */}
      {visibleUrgentAlerts.length > 0 && (
        <Card className="shadow-2xs border border-amber-200/90 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/20 overflow-hidden transition-all">
          <div
            onClick={toggleAlertsExpanded}
            className="p-3 sm:px-4 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-amber-100/30 dark:hover:bg-amber-900/20 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border",
                  criticalCount > 0
                    ? "bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300"
                    : "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300",
                )}
              >
                <AlertTriangle className="w-4 h-4" />
              </div>

              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="text-xs font-bold text-foreground">
                  Alertas
                </span>
                <Badge
                  variant={criticalCount > 0 ? "destructive" : "warning"}
                  className="text-[11px] font-bold font-mono px-2 py-0.5"
                >
                  {visibleUrgentAlerts.length}{" "}
                  {visibleUrgentAlerts.length === 1
                    ? "pendiente"
                    : "pendientes"}
                </Badge>
                {criticalCount > 0 && warningCount > 0 && (
                  <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline">
                    ({criticalCount}{" "}
                    {criticalCount === 1 ? "crítica" : "críticas"} &bull;{" "}
                    {warningCount}{" "}
                    {warningCount === 1 ? "aviso" : "avisos"})
                  </span>
                )}
                {!isAlertsExpanded && (
                  <span className="text-xs text-muted-foreground truncate hidden lg:inline max-w-md">
                    &bull; {visibleUrgentAlerts[0]?.title}:{" "}
                    {visibleUrgentAlerts[0]?.message}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {hasDismissable && isAlertsExpanded && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismissAllDismissable();
                  }}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 hidden sm:inline-flex cursor-pointer"
                  title="Limpiar avisos leídos"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Limpiar</span>
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleAlertsExpanded();
                }}
                className="h-7 text-xs font-semibold gap-1 bg-background hover:bg-muted border-amber-200 dark:border-amber-800/60 cursor-pointer shadow-2xs"
              >
                <span>{isAlertsExpanded ? "Ocultar" : "Ver"}</span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 transition-transform duration-200",
                    isAlertsExpanded && "rotate-180",
                  )}
                />
              </Button>
            </div>
          </div>

          {isAlertsExpanded && (
            <div className="px-3.5 pb-3.5 pt-1.5 border-t border-amber-200/60 dark:border-amber-800/40 bg-card/70 space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar">
              {visibleUrgentAlerts.map((alert) => {
                const isDismissable =
                  alert.id.startsWith("req-") || alert.id.startsWith("lab-vial-");

                return (
                  <Alert
                    key={alert.id}
                    variant={alert.type === "ALERT" ? "destructive" : "warning"}
                    className="flex items-center justify-between py-2 px-3 shadow-2xs bg-card border"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <div className="truncate text-xs">
                        <strong className="font-bold">{alert.title}: </strong>
                        <span className="opacity-90">{alert.message}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResolveAlert(alert)}
                        className="h-7 text-xs font-semibold gap-1 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                      >
                        Atender <ArrowRight className="w-3.5 h-3.5" />
                      </Button>

                      {isDismissable && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleDismissAlert(alert.id)}
                          className="text-muted-foreground hover:text-foreground cursor-pointer"
                          title="Descartar aviso"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </Alert>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ========================================================
          1. PESTAÑA: DIRECCIÓN EJECUTIVA (PANEL CENTRAL DIRECTIVO)
         ======================================================== */}
      {activeTab === "EJECUTIVO" && isExecutive && metrics.executiveSection && (
        <div className="space-y-6">
          {/* BLOQUE 1: 4 KPIs ESTRATÉGICOS Y FINANCIEROS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Valor de Inventario */}
            <Card
              onClick={() => router.push("/inventory/products")}
              className="border-border/80 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Valor de Inventario
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono text-foreground">
                  $
                  {metrics.executiveSection.totalInventoryValueUsd.toLocaleString(
                    "en-US",
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                  <span className="font-mono">
                    {metrics.executiveSection.totalInventoryValueBs.toLocaleString(
                      "es-VE",
                      { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                    )}{" "}
                    Bs.
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono py-0">
                    BCV: {metrics.executiveSection.bcvRate.toFixed(2)}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* KPI 2: Deuda a Proveedores */}
            <Card
              onClick={() => router.push("/purchasing/debts")}
              className="border-border/80 shadow-2xs hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Deuda a Proveedores
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <Banknote className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
                  $
                  {metrics.executiveSection.totalDebtUsd.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50">
                  <span>
                    Compras: $
                    {metrics.executiveSection.totalPurchasedUsd.toLocaleString(
                      "en-US",
                      { minimumFractionDigits: 0, maximumFractionDigits: 0 },
                    )}
                  </span>
                  <span className="text-primary font-semibold flex items-center gap-0.5">
                    Deudas <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* KPI 3: Pagos del Mes */}
            <Card
              onClick={() => router.push("/admin/financial/payments")}
              className="border-border/80 shadow-2xs hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Pagos del Mes
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono text-foreground">
                  $
                  {metrics.executiveSection.monthlyOutflowUsd.toLocaleString(
                    "en-US",
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                  )}
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/50 font-mono">
                  <span>
                    Órdenes: ${metrics.executiveSection.monthlyOrderPaymentsUsd.toFixed(0)}
                  </span>
                  <span>
                    Directos: $
                    {metrics.executiveSection.monthlyDirectPaymentsUsd.toFixed(0)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* KPI 4: Catálogo */}
            <Card
              onClick={() => router.push("/inventory/products")}
              className="border-border/80 shadow-2xs hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Catálogo
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Boxes className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-foreground">
                    {metrics.executiveSection.totalProducts}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    insumos ({metrics.executiveSection.totalActiveBatches} lotes)
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/50">
                  {metrics.executiveSection.openIncidents > 0 ? (
                    <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3" />
                      {metrics.executiveSection.openIncidents} incidencia(s)
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      0 incidencias
                    </span>
                  )}
                  <span className="text-muted-foreground font-mono">
                    {metrics.executiveSection.activeUsersCount} usuarios
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* BLOQUE 2: RESUMEN POR ÁREA (4 TARJETAS SIMPLES) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Resumen 1: Almacén */}
            <Card
              onClick={() =>
                isWarehouse
                  ? setActiveTab("ALMACEN")
                  : router.push("/inventory/products")
              }
              className="border-border/80 bg-muted/15 shadow-2xs hover:border-amber-400 dark:hover:border-amber-600 hover:bg-card transition-all cursor-pointer group"
            >
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Almacén
                  </span>
                  <span className="text-[10px] font-semibold text-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    Ver <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="p-2 rounded-lg bg-background border border-border/60">
                    <div className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400">
                      {metrics.warehouseSection?.lowStockCount ?? 0}
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      Críticos
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-background border border-border/60">
                    <div className="text-sm font-bold font-mono text-purple-600 dark:text-purple-400">
                      {metrics.warehouseSection?.quarantineBatches ?? 0}
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      Cuarentena
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-background border border-border/60">
                    <div className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400">
                      {metrics.warehouseSection?.expiringBatches.length ?? 0}
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      Por vencer
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resumen 2: Compras */}
            <Card
              onClick={() =>
                isPurchasing
                  ? setActiveTab("COMPRAS")
                  : router.push("/purchasing/orders")
              }
              className="border-border/80 bg-muted/15 shadow-2xs hover:border-blue-400 dark:hover:border-blue-600 hover:bg-card transition-all cursor-pointer group"
            >
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ShoppingCart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Compras
                  </span>
                  <span className="text-[10px] font-semibold text-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    Ver <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="p-2 rounded-lg bg-background border border-border/60">
                    <div className="text-sm font-bold font-mono text-indigo-600 dark:text-indigo-400">
                      {metrics.purchasingSection?.pendingRequisitionsCount ?? 0}
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      Preórdenes
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-background border border-border/60">
                    <div className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">
                      {metrics.purchasingSection?.activeOrders ?? 0}
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      En curso
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-background border border-border/60">
                    <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {metrics.purchasingSection?.completedOrders ?? 0}
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      Recibidas
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resumen 3: Pagos */}
            <Card
              onClick={() =>
                isPayments
                  ? setActiveTab("PAGOS")
                  : router.push("/purchasing/debts")
              }
              className="border-border/80 bg-muted/15 shadow-2xs hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-card transition-all cursor-pointer group"
            >
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    Pagos
                  </span>
                  <span className="text-[10px] font-semibold text-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    Ver <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="p-2 rounded-lg bg-background border border-border/60">
                    <div className="text-sm font-bold font-mono text-rose-600 dark:text-rose-400">
                      {metrics.paymentsSection?.pendingSuppliersWithDebtCount ?? 0}
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      Proveedores
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-background border border-border/60">
                    <div className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400">
                      {metrics.paymentsSection?.pendingOrdersWithDebtCount ?? 0}
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      Órdenes
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-background border border-border/60">
                    <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {metrics.paymentsSection?.activeBankAccountsCount ?? 0}
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      Bancos
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resumen 4: Solicitudes */}
            <Card
              onClick={() => router.push("/requests")}
              className="border-border/80 bg-muted/15 shadow-2xs hover:border-purple-400 dark:hover:border-purple-600 hover:bg-card transition-all cursor-pointer group"
            >
              <CardContent className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ClipboardList className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    Solicitudes
                  </span>
                  <span className="text-[10px] font-semibold text-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    Ver <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="p-2 rounded-lg bg-background border border-border/60">
                    <div className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400">
                      {metrics.warehouseSection?.pendingRequests ?? 0}
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      Pendientes
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-background border border-border/60">
                    <div className="text-sm font-bold font-mono text-sky-600 dark:text-sky-400">
                      {metrics.warehouseSection?.readyToDispatchRequests ?? 0}
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      Aprobadas
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-background border border-border/60">
                    <div className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {metrics.executiveSection.completedRequestsGlobal}
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      Completadas
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* BLOQUE 3: INVENTARIO POR CATEGORÍA + SOLICITUDES POR DEPARTAMENTO */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Panel Izquierdo (7 cols): Inventario por Categoría */}
            <Card className="lg:col-span-7 overflow-hidden border-border/80 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center gap-2">
                  <div>
                    <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary" />
                      Inventario por Categoría
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Valor en stock por grupo de insumos
                    </p>
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => router.push("/inventory/products")}
                    className="text-xs h-auto p-0 text-primary shrink-0 cursor-pointer"
                  >
                    Ver catálogo &rarr;
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="py-3 px-4 text-xs font-bold">
                        Categoría
                      </TableHead>
                      <TableHead className="py-3 px-4 text-center text-xs font-bold">
                        Existencias
                      </TableHead>
                      <TableHead className="py-3 px-4 text-right text-xs font-bold">
                        Valor (USD)
                      </TableHead>
                      <TableHead className="py-3 px-4 w-36 text-xs font-bold">
                        Porcentaje
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.executiveSection.categoryValuation.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="py-10 text-center text-xs text-muted-foreground"
                        >
                          Sin lotes disponibles.
                        </TableCell>
                      </TableRow>
                    ) : (
                      metrics.executiveSection.categoryValuation.map((cat, idx) => (
                        <TableRow
                          key={idx}
                          onClick={() => router.push("/inventory/products")}
                          className="hover:bg-muted/40 transition-colors cursor-pointer"
                        >
                          <TableCell className="py-3 px-4">
                            <div className="font-semibold text-xs text-foreground">
                              {cat.name}
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {cat.unitsCount.toLocaleString("es-VE")} unid.
                            </span>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center">
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {cat.productsCount} prod &bull; {cat.batchesCount} lotes
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right">
                            <div className="font-mono font-bold text-xs text-foreground">
                              $
                              {cat.valueUsd.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </div>
                            <div className="font-mono text-[10px] text-muted-foreground">
                              {cat.valueBs.toLocaleString("es-VE", {
                                maximumFractionDigits: 0,
                              })}{" "}
                              Bs.
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-4">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-mono">
                                <span className="font-bold text-foreground">
                                  {cat.percentage.toFixed(1)}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{
                                    width: `${Math.min(100, Math.max(2, cat.percentage))}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="p-3 bg-muted/20 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  Tasa BCV: 1 USD ={" "}
                  <strong className="font-mono text-foreground">
                    {metrics.executiveSection.bcvRate.toFixed(2)} Bs.
                  </strong>{" "}
                  | EUR ={" "}
                  <strong className="font-mono text-foreground">
                    {metrics.executiveSection.eurRate.toFixed(2)} Bs.
                  </strong>
                </span>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/inventory/settings")}
                    className="h-6 text-[11px] px-2 text-primary cursor-pointer"
                  >
                    Maestros &rarr;
                  </Button>
                )}
              </div>
            </Card>

            {/* Panel Derecho (5 cols): Solicitudes por Departamento */}
            <Card className="lg:col-span-5 overflow-hidden border-border/80 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center gap-2">
                  <div>
                    <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Solicitudes por Departamento
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Pedidos y unidades entregadas por área
                    </p>
                  </div>
                  <Badge variant="indigo" className="font-mono text-[10px]">
                    {metrics.executiveSection.totalRequestsGlobal} totales
                  </Badge>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="py-3 px-4 text-xs font-bold">
                        Departamento
                      </TableHead>
                      <TableHead className="py-3 px-4 text-center text-xs font-bold">
                        Pedidos
                      </TableHead>
                      <TableHead className="py-3 px-4 text-right text-xs font-bold">
                        Entregado
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.executiveSection.departmentActivity.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="py-10 text-center text-xs text-muted-foreground"
                        >
                          Sin solicitudes registradas.
                        </TableCell>
                      </TableRow>
                    ) : (
                      metrics.executiveSection.departmentActivity.map((dep) => (
                        <TableRow
                          key={dep.id}
                          onClick={() => router.push("/requests")}
                          className="hover:bg-muted/40 transition-colors cursor-pointer"
                        >
                          <TableCell className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                {dep.code}
                              </span>
                              <span className="text-xs font-semibold text-foreground truncate max-w-[160px]">
                                {dep.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5 font-mono text-xs">
                              <span className="font-bold text-foreground">
                                {dep.totalRequests}
                              </span>
                              {dep.pendingRequests > 0 && (
                                <Badge
                                  variant="warning"
                                  className="text-[10px] px-1.5 py-0"
                                  title="Solicitudes activas"
                                >
                                  {dep.pendingRequests} act.
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            {dep.dispatchedUnits.toLocaleString("es-VE")}{" "}
                            <span className="text-[10px] font-normal text-muted-foreground">
                              unid.
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="p-3 bg-muted/20 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  Completadas:{" "}
                  <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                    {metrics.executiveSection.completedRequestsGlobal}
                  </strong>{" "}
                  &bull; Activas:{" "}
                  <strong className="text-amber-600 dark:text-amber-400 font-mono">
                    {metrics.executiveSection.pendingRequestsGlobal}
                  </strong>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/inventory/reports")}
                  className="h-6 text-[11px] px-2 text-primary cursor-pointer"
                >
                  Reportes &rarr;
                </Button>
              </div>
            </Card>
          </div>

          {/* BLOQUE 4: RESUMEN DE LAS 3 ÁREAS (ALMACÉN, COMPRAS Y PAGOS) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna 1: Stock Bajo */}
            <Card className="overflow-hidden border-border/80 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="p-3.5 border-b border-border bg-muted/30 flex justify-between items-center gap-2">
                  <div>
                    <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      Stock Bajo
                    </CardTitle>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Insumos por reponer
                    </p>
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() =>
                      isWarehouse
                        ? setActiveTab("ALMACEN")
                        : router.push("/inventory/products")
                    }
                    className="text-[11px] h-auto p-0 text-primary cursor-pointer"
                  >
                    Almacén &rarr;
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="py-2 px-3 text-[11px] font-bold">
                        Insumo
                      </TableHead>
                      <TableHead className="py-2 px-3 text-right text-[11px] font-bold">
                        Stock
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!metrics.warehouseSection ||
                    metrics.warehouseSection.lowStockItems.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={2}
                          className="py-8 text-center text-xs text-muted-foreground"
                        >
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1 opacity-80" />
                          Stock completo.
                        </TableCell>
                      </TableRow>
                    ) : (
                      metrics.warehouseSection.lowStockItems
                        .slice(0, 5)
                        .map((item) => (
                          <TableRow
                            key={item.id}
                            onClick={() =>
                              router.push(`/inventory/products/${item.id}`)
                            }
                            className="hover:bg-muted/40 cursor-pointer"
                          >
                            <TableCell className="py-2 px-3">
                              <div className="text-xs font-semibold text-foreground truncate max-w-[160px]">
                                {item.name}
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {item.sku}
                              </span>
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right">
                              <Badge
                                variant={
                                  item.isOutOfStock ? "destructive" : "warning"
                                }
                                className="font-mono text-[10px]"
                              >
                                {item.currentStock} / {item.minStock}{" "}
                                {item.unitOfMeasure}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="p-2.5 bg-muted/20 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>
                  Movimientos hoy:{" "}
                  <strong className="font-mono text-foreground">
                    {metrics.warehouseSection?.movementsToday ?? 0}
                  </strong>
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => router.push("/inventory/kardex")}
                    className="text-primary font-semibold hover:underline cursor-pointer"
                  >
                    Movimientos &rarr;
                  </button>
                )}
              </div>
            </Card>

            {/* Columna 2: Órdenes de Compra */}
            <Card className="overflow-hidden border-border/80 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="p-3.5 border-b border-border bg-muted/30 flex justify-between items-center gap-2">
                  <div>
                    <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <ShoppingCart className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      Órdenes de Compra
                    </CardTitle>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Últimas compras emitidas
                    </p>
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() =>
                      isPurchasing
                        ? setActiveTab("COMPRAS")
                        : router.push("/purchasing/orders")
                    }
                    className="text-[11px] h-auto p-0 text-primary cursor-pointer"
                  >
                    Compras &rarr;
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="py-2 px-3 text-[11px] font-bold">
                        Orden
                      </TableHead>
                      <TableHead className="py-2 px-3 text-right text-[11px] font-bold">
                        Estado
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!metrics.purchasingSection ||
                    metrics.purchasingSection.recentOrders.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={2}
                          className="py-8 text-center text-xs text-muted-foreground"
                        >
                          Sin órdenes recientes.
                        </TableCell>
                      </TableRow>
                    ) : (
                      metrics.purchasingSection.recentOrders
                        .slice(0, 5)
                        .map((ord) => (
                          <TableRow
                            key={ord.id}
                            onClick={() =>
                              router.push(`/purchasing/orders/${ord.id}`)
                            }
                            className="hover:bg-muted/40 cursor-pointer"
                          >
                            <TableCell className="py-2 px-3">
                              <div className="text-xs font-semibold text-foreground truncate max-w-[160px]">
                                <span className="font-mono text-primary font-bold">
                                  #{ord.orderNumber}
                                </span>{" "}
                                &bull; {ord.supplierName}
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground">
                                ${ord.totalAmountUsd.toFixed(2)} &bull;{" "}
                                {ord.receptionPercent}% recibido
                              </span>
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right">
                              <Badge
                                variant={
                                  ord.status === "COMPLETADA"
                                    ? "success"
                                    : ord.status === "PARCIAL"
                                      ? "purple"
                                      : "info"
                                }
                                className="text-[10px]"
                              >
                                {ord.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="p-2.5 bg-muted/20 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>
                  Proveedores:{" "}
                  <strong className="font-mono text-foreground">
                    {metrics.purchasingSection?.activeSuppliersCount ?? 0}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => router.push("/purchasing/orders")}
                  className="text-primary font-semibold hover:underline cursor-pointer"
                >
                  Ver órdenes &rarr;
                </button>
              </div>
            </Card>

            {/* Columna 3: Últimos Pagos */}
            <Card className="overflow-hidden border-border/80 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="p-3.5 border-b border-border bg-muted/30 flex justify-between items-center gap-2">
                  <div>
                    <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Últimos Pagos
                    </CardTitle>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Pagos a proveedores y egresos
                    </p>
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() =>
                      isPayments
                        ? setActiveTab("PAGOS")
                        : router.push("/admin/financial/payments")
                    }
                    className="text-[11px] h-auto p-0 text-primary cursor-pointer"
                  >
                    Pagos &rarr;
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="py-2 px-3 text-[11px] font-bold">
                        Beneficiario
                      </TableHead>
                      <TableHead className="py-2 px-3 text-right text-[11px] font-bold">
                        Monto
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!metrics.paymentsSection ||
                    metrics.paymentsSection.recentPayments.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={2}
                          className="py-8 text-center text-xs text-muted-foreground"
                        >
                          Sin pagos recientes.
                        </TableCell>
                      </TableRow>
                    ) : (
                      metrics.paymentsSection.recentPayments
                        .slice(0, 5)
                        .map((pay) => (
                          <TableRow
                            key={pay.id}
                            onClick={() => router.push(pay.link)}
                            className="hover:bg-muted/40 cursor-pointer"
                          >
                            <TableCell className="py-2 px-3">
                              <div className="text-xs font-semibold text-foreground truncate max-w-[160px]">
                                {pay.beneficiary}
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {pay.concept} &bull;{" "}
                                {new Date(pay.paymentDate).toLocaleDateString(
                                  "es-VE",
                                )}
                              </span>
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono">
                              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                ${pay.amountUsd.toFixed(2)}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="p-2.5 bg-muted/20 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>
                  Bancos:{" "}
                  <strong className="font-mono text-foreground">
                    {metrics.paymentsSection?.activeBankAccountsCount ?? 0}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => router.push("/admin/financial/payments")}
                  className="text-primary font-semibold hover:underline cursor-pointer"
                >
                  Ver pagos &rarr;
                </button>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================
          2. PESTAÑA: ALMACÉN
         ======================================================== */}
      {activeTab === "ALMACEN" && isWarehouse && metrics.warehouseSection && (
        <div className="space-y-6">
          {/* Fila de 5 KPIs de Almacén */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* KPI 1: Por Aprobar */}
            <Card
              onClick={() => router.push("/requests?status=PENDIENTE")}
              className="border-border/80 shadow-2xs hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Por Aprobar
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <ClipboardList className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                  {metrics.warehouseSection.pendingRequests}
                </div>
                <span className="text-[10px] text-primary font-semibold flex items-center gap-1 pt-1 border-t border-border/50">
                  Ver pendientes <ArrowRight className="w-3 h-3" />
                </span>
              </CardContent>
            </Card>

            {/* KPI 2: Por Despachar */}
            <Card
              onClick={() => router.push("/requests/dispatch")}
              className="border-border/80 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Por Despachar
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <PackageCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {metrics.warehouseSection.readyToDispatchRequests}
                </div>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 pt-1 border-t border-border/50">
                  Entregar insumos <ArrowRight className="w-3 h-3" />
                </span>
              </CardContent>
            </Card>

            {/* KPI 3: Stock Bajo */}
            <Card
              onClick={() => router.push("/inventory/products")}
              className="border-border/80 shadow-2xs hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Stock Bajo
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
                    {metrics.warehouseSection.lowStockCount}
                  </span>
                  {metrics.warehouseSection.outOfStockCount > 0 && (
                    <Badge variant="destructive" className="text-[10px] font-mono py-0">
                      {metrics.warehouseSection.outOfStockCount} agotados
                    </Badge>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1 border-t border-border/50">
                  Por debajo del mínimo
                </span>
              </CardContent>
            </Card>

            {/* KPI 4: Cuarentena */}
            <Card
              onClick={() => router.push("/quality/quarantine")}
              className="border-border/80 shadow-2xs hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Cuarentena
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono text-purple-600 dark:text-purple-400">
                  {metrics.warehouseSection.quarantineBatches}
                </div>
                <span className="text-[10px] text-primary font-semibold flex items-center gap-1 pt-1 border-t border-border/50">
                  Revisar lotes <ArrowRight className="w-3 h-3" />
                </span>
              </CardContent>
            </Card>

            {/* KPI 5: Lotes Disponibles */}
            <Card
              onClick={() => router.push("/inventory/adjustments")}
              className="border-border/80 shadow-2xs hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Lotes Disponibles
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Boxes className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {metrics.warehouseSection.activeBatches}
                </div>
                <span className="text-[10px] text-muted-foreground font-mono flex items-center justify-between pt-1 border-t border-border/50">
                  <span>Hoy: {metrics.warehouseSection.movementsToday} mov.</span>
                  <span className="text-primary font-sans font-semibold">Ajustes &rarr;</span>
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Fila Principal de Almacén: Solicitudes Pendientes + Stock Bajo */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Solicitudes Pendientes (7 cols) */}
            <Card className="lg:col-span-7 overflow-hidden border-border/80 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center gap-2">
                  <div>
                    <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      Solicitudes Pendientes
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Pedidos por aprobar o entregar
                    </p>
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => router.push("/requests")}
                    className="text-xs h-auto p-0 text-primary shrink-0 cursor-pointer"
                  >
                    Ver todas &rarr;
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="py-3 px-4 text-xs font-bold">
                        Solicitud
                      </TableHead>
                      <TableHead className="py-3 px-4 text-xs font-bold">
                        Departamento
                      </TableHead>
                      <TableHead className="py-3 px-4 text-center text-xs font-bold">
                        Insumos
                      </TableHead>
                      <TableHead className="py-3 px-4 text-center text-xs font-bold">
                        Estado
                      </TableHead>
                      <TableHead className="py-3 px-4 text-right text-xs font-bold">
                        Acción
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.warehouseSection.actionableRequests.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-10 text-center text-muted-foreground"
                        >
                          <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                          <p className="text-xs font-semibold text-foreground">
                            Almacén al día
                          </p>
                          <p className="text-[11px]">
                            No hay solicitudes pendientes.
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      metrics.warehouseSection.actionableRequests.map((req) => {
                        const canDispatch =
                          req.status === "APROBADA" ||
                          req.status === "DESPACHADA_PARCIAL";
                        return (
                          <TableRow
                            key={req.id}
                            className="hover:bg-muted/40 transition-colors"
                          >
                            <TableCell className="py-3 px-4">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold text-xs text-primary">
                                  #{req.requestNumber}
                                </span>
                                {req.priority === "URGENTE" && (
                                  <Badge
                                    variant="destructive"
                                    className="text-[9px] px-1.5 py-0"
                                  >
                                    URGENTE
                                  </Badge>
                                )}
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground">
                                {new Date(req.createdAt).toLocaleDateString("es-VE")}
                              </span>
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <div className="text-xs font-semibold text-foreground truncate max-w-[180px]">
                                {req.departmentName}
                              </div>
                              <span className="text-[11px] text-muted-foreground">
                                {req.requesterName}
                              </span>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-center font-mono text-xs">
                              <span className="font-bold text-foreground">
                                {req.itemsCount}
                              </span>{" "}
                              <span className="text-[10px] text-muted-foreground">
                                ({req.totalUnitsRequested} u.)
                              </span>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-center">
                              <Badge
                                variant={
                                  req.status === "PENDIENTE"
                                    ? "warning"
                                    : req.status === "DESPACHADA_PARCIAL"
                                      ? "purple"
                                      : "info"
                                }
                                className="text-[10px]"
                              >
                                {req.status === "PENDIENTE"
                                  ? "Pendiente"
                                  : req.status === "DESPACHADA_PARCIAL"
                                    ? "Parcial"
                                    : "Aprobada"}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-right">
                              {canDispatch ? (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() =>
                                    router.push(`/requests/dispatch?id=${req.id}`)
                                  }
                                  className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1 cursor-pointer"
                                >
                                  <PackageCheck className="w-3 h-3" />
                                  Despachar
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => router.push(`/requests/${req.id}`)}
                                  className="h-7 text-[11px] gap-1 cursor-pointer"
                                >
                                  Revisar <ArrowRight className="w-3 h-3" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Stock Bajo (5 cols) */}
            <Card className="lg:col-span-5 overflow-hidden border-border/80 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center gap-2">
                  <div>
                    <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      Stock Bajo
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Productos con pocas unidades
                    </p>
                  </div>
                  <Badge
                    variant={
                      metrics.warehouseSection.lowStockCount > 0
                        ? "destructive"
                        : "success"
                    }
                    className="font-mono text-[10px]"
                  >
                    {metrics.warehouseSection.lowStockCount} productos
                  </Badge>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="py-3 px-4 text-xs font-bold">
                        Insumo
                      </TableHead>
                      <TableHead className="py-3 px-4 text-center text-xs font-bold">
                        Stock
                      </TableHead>
                      <TableHead className="py-3 px-4 text-right text-xs font-bold">
                        Estado
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.warehouseSection.lowStockItems.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="py-10 text-center text-muted-foreground"
                        >
                          <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                          <p className="text-xs font-semibold text-foreground">
                            Stock completo
                          </p>
                          <p className="text-[11px]">
                            Todos los insumos superan el mínimo.
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      metrics.warehouseSection.lowStockItems.map((prod) => (
                        <TableRow
                          key={prod.id}
                          onClick={() =>
                            router.push(`/inventory/products/${prod.id}`)
                          }
                          className="hover:bg-muted/40 transition-colors cursor-pointer"
                        >
                          <TableCell className="py-2.5 px-4">
                            <div className="text-xs font-semibold text-foreground truncate max-w-[180px]">
                              {prod.name}
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {prod.sku} &bull; {prod.categoryName}
                            </span>
                          </TableCell>
                          <TableCell className="py-2.5 px-4 text-center font-mono text-xs">
                            <span
                              className={cn(
                                "font-bold",
                                prod.isOutOfStock
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-amber-600 dark:text-amber-400",
                              )}
                            >
                              {prod.currentStock}
                            </span>{" "}
                            <span className="text-muted-foreground">
                              / {prod.minStock} {prod.unitOfMeasure}
                            </span>
                          </TableCell>
                          <TableCell className="py-2.5 px-4 text-right">
                            <Badge
                              variant={prod.isOutOfStock ? "destructive" : "warning"}
                              className="text-[10px]"
                            >
                              {prod.isOutOfStock
                                ? "AGOTADO"
                                : `Faltan ${prod.deficit}`}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="p-3 bg-muted/20 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Crear preorden en Compras</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/inventory/products")}
                  className="h-6 text-[11px] px-2 text-primary cursor-pointer"
                >
                  Catálogo &rarr;
                </Button>
              </div>
            </Card>
          </div>

          {/* Tercera Fila de Almacén: Lotes por Vencer + Últimos Movimientos */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Lotes por Vencer (7 cols) */}
            <Card className="lg:col-span-7 overflow-hidden border-border/80 shadow-2xs">
              <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center gap-2">
                <div>
                  <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Lotes por Vencer
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Vencen en los próximos 90 días
                  </p>
                </div>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => router.push("/inventory/adjustments")}
                  className="text-xs h-auto p-0 text-primary cursor-pointer"
                >
                  Ajustes &rarr;
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead className="py-3 px-4 text-xs font-bold">Lote</TableHead>
                    <TableHead className="py-3 px-4 text-xs font-bold">
                      Insumo
                    </TableHead>
                    <TableHead className="py-3 px-4 text-right text-xs font-bold">
                      Cantidad
                    </TableHead>
                    <TableHead className="py-3 px-4 text-center text-xs font-bold">
                      Vencimiento
                    </TableHead>
                    <TableHead className="py-3 px-4 text-right text-xs font-bold">
                      Acción
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.warehouseSection.expiringBatches.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="py-8 text-center text-muted-foreground"
                      >
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1 opacity-80" />
                        <p className="text-xs">
                          Sin lotes próximos a vencer.
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    metrics.warehouseSection.expiringBatches.map((batch) => {
                      const days = batch.daysRemaining ?? 999;
                      const isExpired = days <= 0;
                      const isCritical = days > 0 && days <= 30;

                      return (
                        <TableRow key={batch.id} className="hover:bg-muted/40">
                          <TableCell className="py-3 px-4 font-mono font-bold text-xs text-primary">
                            #{batch.lotNumber}
                          </TableCell>
                          <TableCell className="py-3 px-4">
                            <div className="text-xs font-semibold text-foreground">
                              {batch.productName}
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {batch.sku} &bull; {batch.location}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right font-mono font-bold text-xs text-foreground">
                            {batch.quantity} {batch.unitOfMeasure}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center">
                            <Badge
                              variant={
                                isExpired
                                  ? "destructive"
                                  : isCritical
                                    ? "warning"
                                    : "info"
                              }
                              className="font-mono text-[10px]"
                            >
                              {isExpired
                                ? `VENCIDO (${Math.abs(days)}d)`
                                : `${days} días (${
                                    batch.expirationDate
                                      ? new Date(
                                          batch.expirationDate,
                                        ).toLocaleDateString("es-VE")
                                      : ""
                                  })`}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push("/inventory/adjustments")}
                              className="text-amber-700 dark:text-amber-300 hover:underline font-semibold text-[11px] h-7 px-2 cursor-pointer"
                            >
                              Ajustar
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>

            {/* Últimos Movimientos (5 cols) */}
            <Card className="lg:col-span-5 overflow-hidden border-border/80 shadow-2xs">
              <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center gap-2">
                <div>
                  <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Últimos Movimientos
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Entradas, entregas y ajustes
                  </p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead className="py-3 px-4 text-xs font-bold">
                      Tipo
                    </TableHead>
                    <TableHead className="py-3 px-4 text-xs font-bold">
                      Insumo
                    </TableHead>
                    <TableHead className="py-3 px-4 text-right text-xs font-bold">
                      Cantidad
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.warehouseSection.recentMovements.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="py-8 text-center text-xs text-muted-foreground"
                      >
                        Sin movimientos recientes.
                      </TableCell>
                    </TableRow>
                  ) : (
                    metrics.warehouseSection.recentMovements.map((mov) => {
                      const cfg = MOVEMENT_TYPE_LABELS[mov.type] || {
                        label: mov.type,
                        variant: "outline" as const,
                        isEntry: true,
                      };
                      return (
                        <TableRow key={mov.id} className="hover:bg-muted/40">
                          <TableCell className="py-2.5 px-4">
                            <Badge variant={cfg.variant} className="text-[10px]">
                              {cfg.label}
                            </Badge>
                            <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                              {new Date(mov.createdAt).toLocaleDateString("es-VE")}{" "}
                              &bull; {mov.performedBy}
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5 px-4">
                            <div className="text-xs font-semibold text-foreground truncate max-w-[150px]">
                              {mov.productName}
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {mov.lotNumber ? `Lote #${mov.lotNumber}` : mov.sku}
                            </span>
                          </TableCell>
                          <TableCell className="py-2.5 px-4 text-right font-mono text-xs font-bold">
                            <span
                              className={cn(
                                "inline-flex items-center gap-0.5",
                                cfg.isEntry
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-amber-600 dark:text-amber-400",
                              )}
                            >
                              {cfg.isEntry ? (
                                <ArrowDownLeft className="w-3 h-3" />
                              ) : (
                                <ArrowUpRight className="w-3 h-3" />
                              )}
                              {mov.quantity} {mov.unitOfMeasure}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================
          3. PESTAÑA: COMPRAS
         ======================================================== */}
      {activeTab === "COMPRAS" && isPurchasing && metrics.purchasingSection && (
        <div className="space-y-6">
          {/* Fila de 4 KPIs de Compras */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Preórdenes */}
            <Card
              onClick={() => router.push("/purchasing/requisitions")}
              className="border-border/80 shadow-2xs hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Preórdenes
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
                  {metrics.purchasingSection.pendingRequisitionsCount}
                </div>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 pt-1 border-t border-border/50">
                  Pendientes por procesar <ArrowRight className="w-3 h-3" />
                </span>
              </CardContent>
            </Card>

            {/* KPI 2: Órdenes Activas */}
            <Card
              onClick={() => router.push("/purchasing/orders")}
              className="border-border/80 shadow-2xs hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Órdenes Activas
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
                  {metrics.purchasingSection.activeOrders}
                </div>
                <span className="text-[10px] text-primary font-semibold flex items-center gap-1 pt-1 border-t border-border/50">
                  Pendientes por recibir <ArrowRight className="w-3 h-3" />
                </span>
              </CardContent>
            </Card>

            {/* KPI 3: Órdenes Recibidas */}
            <Card
              onClick={() =>
                router.push("/purchasing/orders?status=COMPLETADA")
              }
              className="border-border/80 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Órdenes Recibidas
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Truck className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {metrics.purchasingSection.completedOrders}
                </div>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1 border-t border-border/50">
                  Entregadas en almacén
                </span>
              </CardContent>
            </Card>

            {/* KPI 4: Proveedores */}
            <Card
              onClick={() => router.push("/purchasing/suppliers")}
              className="border-border/80 shadow-2xs hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Proveedores
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {metrics.purchasingSection.activeSuppliersCount}
                </div>
                <span className="text-[10px] text-primary font-semibold flex items-center gap-1 pt-1 border-t border-border/50">
                  Ver listado <ArrowRight className="w-3 h-3" />
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Fila Principal de Compras: Órdenes de Compra + Preórdenes y Proveedores */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Órdenes de Compra (7 cols) */}
            <Card className="lg:col-span-7 overflow-hidden border-border/80 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center gap-2">
                  <div>
                    <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <Truck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      Órdenes de Compra
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Estado de entrega de proveedores
                    </p>
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => router.push("/purchasing/orders")}
                    className="text-xs h-auto p-0 text-primary cursor-pointer"
                  >
                    Ver todas &rarr;
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="py-3 px-4 text-xs font-bold">
                        Orden
                      </TableHead>
                      <TableHead className="py-3 px-4 text-xs font-bold">
                        Proveedor
                      </TableHead>
                      <TableHead className="py-3 px-4 text-center text-xs font-bold">
                        Recibido
                      </TableHead>
                      <TableHead className="py-3 px-4 text-center text-xs font-bold">
                        Avance
                      </TableHead>
                      <TableHead className="py-3 px-4 text-right text-xs font-bold">
                        Acción
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.purchasingSection.recentOrders.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-10 text-center text-xs text-muted-foreground"
                        >
                          Sin órdenes de compra.
                        </TableCell>
                      </TableRow>
                    ) : (
                      metrics.purchasingSection.recentOrders.map((ord) => (
                        <TableRow
                          key={ord.id}
                          onClick={() =>
                            router.push(`/purchasing/orders/${ord.id}`)
                          }
                          className="hover:bg-muted/40 transition-colors cursor-pointer"
                        >
                          <TableCell className="py-3 px-4">
                            <div className="font-mono font-bold text-xs text-primary">
                              #{ord.orderNumber}
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {new Date(ord.createdAt).toLocaleDateString("es-VE")}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 px-4">
                            <div className="text-xs font-semibold text-foreground truncate max-w-[160px]">
                              {ord.supplierName}
                            </div>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {ord.itemsCount} insumos &bull; $
                              {ord.totalAmountUsd.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center font-mono text-xs">
                            <span className="font-bold text-foreground">
                              {ord.totalReceivedUnits}
                            </span>{" "}
                            <span className="text-muted-foreground">
                              / {ord.totalOrderedUnits}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center">
                            <div className="w-24 mx-auto space-y-1">
                              <div className="flex justify-between text-[10px] font-mono">
                                <span>{ord.status}</span>
                                <span className="font-bold">
                                  {ord.receptionPercent}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full",
                                    ord.receptionPercent >= 100
                                      ? "bg-emerald-500"
                                      : ord.receptionPercent > 0
                                        ? "bg-purple-500"
                                        : "bg-amber-500",
                                  )}
                                  style={{
                                    width: `${Math.max(6, ord.receptionPercent)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell
                            className="py-3 px-4 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {ord.status === "ENVIADA" || ord.status === "PARCIAL" ? (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() =>
                                  router.push(
                                    `/purchasing/orders/${ord.id}/receive`,
                                  )
                                }
                                className="h-7 text-[11px] bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
                              >
                                Recibir
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  router.push(`/purchasing/orders/${ord.id}`)
                                }
                                className="h-7 text-[11px] text-primary cursor-pointer"
                              >
                                Ver
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Preórdenes + Proveedores (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Preórdenes */}
              <Card className="overflow-hidden border-border/80 shadow-2xs">
                <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center gap-2">
                  <div>
                    <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Preórdenes
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Solicitudes de compra pendientes
                    </p>
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => router.push("/purchasing/requisitions")}
                    className="text-xs h-auto p-0 text-primary cursor-pointer"
                  >
                    Ver todas &rarr;
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="py-2.5 px-4 text-xs font-bold">
                        Preorden
                      </TableHead>
                      <TableHead className="py-2.5 px-4 text-center text-xs font-bold">
                        Estado
                      </TableHead>
                      <TableHead className="py-2.5 px-4 text-right text-xs font-bold">
                        Insumos
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.purchasingSection.recentRequisitions.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="py-8 text-center text-xs text-muted-foreground"
                        >
                          <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1 opacity-80" />
                          Sin preórdenes pendientes.
                        </TableCell>
                      </TableRow>
                    ) : (
                      metrics.purchasingSection.recentRequisitions.map((pr) => (
                        <TableRow
                          key={pr.id}
                          onClick={() => router.push("/purchasing/requisitions")}
                          className="hover:bg-muted/40 cursor-pointer"
                        >
                          <TableCell className="py-2.5 px-4">
                            <div className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                              #{pr.requisitionNumber}
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {pr.departmentName} &bull;{" "}
                              {new Date(pr.createdAt).toLocaleDateString("es-VE")}
                            </span>
                          </TableCell>
                          <TableCell className="py-2.5 px-4 text-center">
                            <Badge variant="info" className="text-[10px]">
                              {pr.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2.5 px-4 text-right font-mono text-xs font-bold text-foreground">
                            {pr.itemsCount} insumos
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>

              {/* Proveedores */}
              <Card className="overflow-hidden border-border/80 shadow-2xs">
                <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center gap-2">
                  <div>
                    <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      Proveedores
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Proveedores con más pedidos
                    </p>
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => router.push("/purchasing/suppliers")}
                    className="text-xs h-auto p-0 text-primary cursor-pointer"
                  >
                    Ver todos &rarr;
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="py-2.5 px-4 text-xs font-bold">
                        Proveedor
                      </TableHead>
                      <TableHead className="py-2.5 px-4 text-center text-xs font-bold">
                        Órdenes
                      </TableHead>
                      <TableHead className="py-2.5 px-4 text-right text-xs font-bold">
                        Activas
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.purchasingSection.topSuppliers.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="py-6 text-center text-xs text-muted-foreground"
                        >
                          Sin proveedores registrados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      metrics.purchasingSection.topSuppliers.map((sup) => (
                        <TableRow
                          key={sup.id}
                          onClick={() =>
                            router.push(`/purchasing/suppliers/${sup.id}`)
                          }
                          className="hover:bg-muted/40 cursor-pointer"
                        >
                          <TableCell className="py-2.5 px-4">
                            <div className="text-xs font-semibold text-foreground truncate max-w-[160px]">
                              {sup.name}
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {sup.rifOrId}
                            </span>
                          </TableCell>
                          <TableCell className="py-2.5 px-4 text-center font-mono text-xs font-bold text-foreground">
                            {sup.totalOrders}
                          </TableCell>
                          <TableCell className="py-2.5 px-4 text-right">
                            {sup.activeOrdersCount > 0 ? (
                              <Badge variant="warning" className="text-[10px] font-mono">
                                {sup.activeOrdersCount} act.
                              </Badge>
                            ) : (
                              <Badge variant="success" className="text-[10px] font-mono">
                                Al día
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          4. PESTAÑA: PAGOS
         ======================================================== */}
      {activeTab === "PAGOS" && isPayments && metrics.paymentsSection && (
        <div className="space-y-6">
          {/* Fila de 4 KPIs de Pagos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Deuda Total */}
            <Card
              onClick={() => router.push("/purchasing/debts")}
              className="border-border/80 shadow-2xs hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Deuda Total
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <Banknote className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400">
                  $
                  {metrics.paymentsSection.totalDebtUsd.toLocaleString(
                    "en-US",
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground font-mono flex items-center justify-between pt-1 border-t border-border/50">
                  <span>
                    {metrics.paymentsSection.pendingSuppliersWithDebtCount}{" "}
                    proveedores ({metrics.paymentsSection.pendingOrdersWithDebtCount}{" "}
                    órdenes)
                  </span>
                  <span className="text-primary font-sans font-semibold">
                    Pagar &rarr;
                  </span>
                </span>
              </CardContent>
            </Card>

            {/* KPI 2: Pagos de Órdenes (Mes) */}
            <Card
              onClick={() => router.push("/purchasing/debts")}
              className="border-border/80 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Pagos de Órdenes (Mes)
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Coins className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  $
                  {metrics.paymentsSection.paidOrdersMonthUsd.toLocaleString(
                    "en-US",
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground font-mono flex items-center justify-between pt-1 border-t border-border/50">
                  <span>
                    Total histórico: $
                    {metrics.paymentsSection.totalHistoricalPaidUsd.toLocaleString(
                      "en-US",
                      { maximumFractionDigits: 0 },
                    )}
                  </span>
                </span>
              </CardContent>
            </Card>

            {/* KPI 3: Gastos Directos (Mes) */}
            <Card
              onClick={() => router.push("/admin/financial/payments")}
              className="border-border/80 shadow-2xs hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Gastos Directos (Mes)
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono text-foreground">
                  $
                  {metrics.paymentsSection.directPaymentsMonthUsd.toLocaleString(
                    "en-US",
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                  )}
                </div>
                <span className="text-[10px] text-primary font-semibold flex items-center gap-1 pt-1 border-t border-border/50">
                  Nuevo pago <ArrowRight className="w-3 h-3" />
                </span>
              </CardContent>
            </Card>

            {/* KPI 4: Total Pagado (Mes) */}
            <Card
              onClick={() => router.push("/inventory/settings")}
              className="border-border/80 shadow-2xs hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Total Pagado (Mes)
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono text-foreground">
                  $
                  {metrics.paymentsSection.paidThisMonthUsd.toLocaleString(
                    "en-US",
                    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground font-mono flex items-center justify-between pt-1 border-t border-border/50">
                  <span>
                    {metrics.paymentsSection.activeBankAccountsCount} bancos
                  </span>
                  <span className="text-primary font-sans font-semibold">
                    Bancos &rarr;
                  </span>
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Fila Principal de Pagos: Deudas por Proveedor + Últimos Pagos */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Deudas por Proveedor (6 cols) */}
            <Card className="lg:col-span-6 overflow-hidden border-border/80 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center gap-2">
                  <div>
                    <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <Building className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      Deudas por Proveedor
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Facturas pendientes de pago
                    </p>
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => router.push("/purchasing/debts")}
                    className="text-xs h-auto p-0 text-primary cursor-pointer"
                  >
                    Ver deudas &rarr;
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="py-3 px-4 text-xs font-bold">
                        Proveedor
                      </TableHead>
                      <TableHead className="py-3 px-4 text-right text-xs font-bold">
                        Total
                      </TableHead>
                      <TableHead className="py-3 px-4 text-right text-xs font-bold">
                        Deuda (USD)
                      </TableHead>
                      <TableHead className="py-3 px-4 text-right text-xs font-bold">
                        Acción
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.paymentsSection.topDebtors.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="py-10 text-center text-muted-foreground"
                        >
                          <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1 opacity-80" />
                          <p className="text-xs font-semibold text-foreground">
                            Sin deudas pendientes
                          </p>
                          <p className="text-[11px]">
                            Todos los proveedores están al día.
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      metrics.paymentsSection.topDebtors.map((debtor) => (
                        <TableRow key={debtor.id} className="hover:bg-muted/40">
                          <TableCell className="py-3 px-4">
                            <div className="text-xs font-semibold text-foreground truncate max-w-[160px]">
                              {debtor.name}
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {debtor.rifOrId} &bull; {debtor.pendingOrdersCount} órdenes
                            </span>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right font-mono text-[11px]">
                            <div className="text-foreground font-semibold">
                              ${debtor.totalPurchasedUsd.toFixed(2)}
                            </div>
                            <span className="text-emerald-600 dark:text-emerald-400">
                              Pagado: ${debtor.totalPaidUsd.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right font-mono">
                            <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
                              ${debtor.balanceUsd.toFixed(2)}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => router.push("/purchasing/debts")}
                              className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 h-7 text-[11px] font-semibold cursor-pointer"
                            >
                              Pagar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Últimos Pagos (6 cols) */}
            <Card className="lg:col-span-6 overflow-hidden border-border/80 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center gap-2">
                  <div>
                    <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      Últimos Pagos
                    </CardTitle>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Pagos de órdenes y gastos directos
                    </p>
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => router.push("/admin/financial/payments")}
                    className="text-xs h-auto p-0 text-primary cursor-pointer"
                  >
                    Ver todos &rarr;
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="py-3 px-4 text-xs font-bold">
                        Tipo
                      </TableHead>
                      <TableHead className="py-3 px-4 text-xs font-bold">
                        Beneficiario
                      </TableHead>
                      <TableHead className="py-3 px-4 text-right text-xs font-bold">
                        Monto (USD)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.paymentsSection.recentPayments.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="py-10 text-center text-xs text-muted-foreground"
                        >
                          Sin pagos recientes.
                        </TableCell>
                      </TableRow>
                    ) : (
                      metrics.paymentsSection.recentPayments.map((pay) => (
                        <TableRow
                          key={pay.id}
                          onClick={() => router.push(pay.link)}
                          className="hover:bg-muted/40 transition-colors cursor-pointer"
                        >
                          <TableCell className="py-2.5 px-4">
                            <Badge
                              variant={
                                pay.paymentType === "ABONO_ORDEN"
                                  ? "success"
                                  : "info"
                              }
                              className="text-[10px]"
                            >
                              {pay.paymentType === "ABONO_ORDEN"
                                ? "Orden"
                                : "Directo"}
                            </Badge>
                            <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
                              {new Date(pay.paymentDate).toLocaleDateString(
                                "es-VE",
                              )}{" "}
                              &bull; {pay.method}
                            </div>
                          </TableCell>
                          <TableCell className="py-2.5 px-4">
                            <div className="text-xs font-semibold text-foreground truncate max-w-[180px]">
                              {pay.beneficiary}
                            </div>
                            <span className="text-[10px] text-muted-foreground truncate block max-w-[180px]">
                              {pay.concept} &bull; Ref: {pay.reference}
                            </span>
                          </TableCell>
                          <TableCell className="py-2.5 px-4 text-right font-mono">
                            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              ${pay.amountUsd.toFixed(2)}
                            </div>
                            {pay.currency !== "USD" && (
                              <span className="text-[10px] text-muted-foreground">
                                {pay.amountPaid.toLocaleString("es-VE", {
                                  maximumFractionDigits: 2,
                                })}{" "}
                                {pay.currency === "VED" ? "Bs." : pay.currency}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================
          5. PESTAÑA: SOLICITUDES
         ======================================================== */}
      {activeTab === "SOLICITUDES" && isRequester && metrics.userSection && (
        <div className="space-y-6">
          {/* Banner de Horario de Solicitudes */}
          {metrics.userSection.windowConfig && (
            <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border",
                    metrics.userSection.windowConfig.isSuspended
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                      : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                  )}
                >
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-foreground">
                      Horario de Solicitudes
                    </span>
                    <Badge
                      variant={
                        metrics.userSection.windowConfig.isSuspended
                          ? "warning"
                          : "success"
                      }
                      className="text-[10px]"
                    >
                      {metrics.userSection.windowConfig.isSuspended
                        ? "Pausado"
                        : "Abierto"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Horario:{" "}
                    <strong className="text-foreground">
                      {DAY_NAMES[metrics.userSection.windowConfig.startDay] || "Lunes"}{" "}
                      ({String(metrics.userSection.windowConfig.startHour).padStart(2, "0")}
                      :00h) a{" "}
                      {DAY_NAMES[metrics.userSection.windowConfig.endDay] || "Miércoles"}{" "}
                      ({String(metrics.userSection.windowConfig.endHour).padStart(2, "0")}
                      :00h)
                    </strong>
                  </p>
                </div>
              </div>

              <Button
                variant="default"
                size="sm"
                onClick={() => router.push("/requests/new")}
                className="h-8 text-xs gap-1.5 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Nueva Solicitud
              </Button>
            </div>
          )}

          {/* Fila de 4 KPIs de Solicitudes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card
              onClick={() => router.push("/requests")}
              className="border-border/80 shadow-2xs hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Mis Solicitudes
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <ClipboardList className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {metrics.userSection.totalMyRequests}
                </div>
                <span className="text-[10px] text-primary font-semibold flex items-center gap-1 pt-1 border-t border-border/50">
                  Ver todas <ArrowRight className="w-3 h-3" />
                </span>
              </CardContent>
            </Card>

            <Card
              onClick={() => router.push("/requests?status=PENDIENTE")}
              className="border-border/80 shadow-2xs hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Pendientes
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                  {metrics.userSection.pendingMyRequests}
                </div>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1 border-t border-border/50">
                  En revisión de almacén
                </span>
              </CardContent>
            </Card>

            <Card
              onClick={() => router.push("/requests?status=APROBADA")}
              className="border-border/80 shadow-2xs hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Aprobadas
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                    <CheckCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400">
                  {metrics.userSection.approvedMyRequests}
                </div>
                <span className="text-[10px] text-sky-600 dark:text-sky-400 font-semibold flex items-center gap-1 pt-1 border-t border-border/50">
                  Listas para retirar
                </span>
              </CardContent>
            </Card>

            <Card
              onClick={() => router.push("/requests?status=COMPLETADA")}
              className="border-border/80 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Completadas
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <PackageCheck className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {metrics.userSection.completedMyRequests}
                </div>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1 border-t border-border/50">
                  Entregadas
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de Mis Últimas 8 Solicitudes */}
          <Card className="overflow-hidden border-border/80 shadow-2xs">
            <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center gap-2">
              <div>
                <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-primary" />
                  Mis Últimas 8 Solicitudes
                </CardTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Pedidos recientes a almacén
                </p>
              </div>
              <Button
                variant="link"
                size="sm"
                onClick={() => router.push("/requests")}
                className="text-xs h-auto p-0 text-primary cursor-pointer"
              >
                Ver todas &rarr;
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20">
                  <TableHead className="py-3 px-4 text-xs font-bold">
                    Solicitud
                  </TableHead>
                  <TableHead className="py-3 px-4 text-xs font-bold">
                    Departamento
                  </TableHead>
                  <TableHead className="py-3 px-4 text-xs font-bold">
                    Insumos
                  </TableHead>
                  <TableHead className="py-3 px-4 text-center text-xs font-bold">
                    Entregado
                  </TableHead>
                  <TableHead className="py-3 px-4 text-center text-xs font-bold">
                    Estado
                  </TableHead>
                  <TableHead className="py-3 px-4 text-right text-xs font-bold">
                    Acción
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.userSection.recentRequests.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-12 text-center text-muted-foreground space-y-2"
                    >
                      <ClipboardList className="w-8 h-8 text-muted-foreground/50 mx-auto" />
                      <p className="text-xs font-semibold text-foreground">
                        Sin solicitudes recientes
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push("/requests/new")}
                        className="mt-1 h-8 text-xs gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Nueva solicitud
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  metrics.userSection.recentRequests.map((req) => (
                    <TableRow
                      key={req.id}
                      onClick={() => router.push(`/requests/${req.id}`)}
                      className="hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      <TableCell className="py-3 px-4">
                        <div className="font-mono font-bold text-xs text-primary">
                          #{req.requestNumber}
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {new Date(req.createdAt).toLocaleDateString("es-VE")}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <div className="text-xs font-semibold text-foreground">
                          {req.departmentName}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                          {req.justification}
                        </p>
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[260px]">
                          {req.itemsPreview.map((it, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-[10px] font-normal py-0 truncate max-w-[180px]"
                            >
                              {it.name} ({it.requested} {it.unit})
                            </Badge>
                          ))}
                          {req.itemsCount > 3 && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-mono py-0"
                            >
                              +{req.itemsCount - 3} más
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center font-mono text-xs">
                        <span className="font-bold text-foreground">
                          {req.totalDispatchedUnits}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          / {req.totalRequestedUnits}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center">
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
                          className="text-[10px]"
                        >
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/requests/${req.id}`);
                          }}
                          className="text-primary hover:underline font-semibold text-[11px] h-7 px-2 cursor-pointer"
                        >
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
}
