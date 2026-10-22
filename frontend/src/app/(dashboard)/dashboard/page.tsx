"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/services/auth.service";
import {
  DashboardClientService,
  DashboardMetricsResponse,
  SystemNotification,
} from "@/services/dashboard.service";
import type { AuthUser } from "@/types/auth";
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
  Calendar,
  Layers,
  CheckCircle2,
  CheckCheck,
  FlaskConical,
  Thermometer,
  TestTube,
  X,
  ChevronDown,
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

type ActiveTab =
  | "SOLICITUDES"
  | "ALMACEN"
  | "COMPRAS"
  | "LABORATORIO"
  | "EJECUTIVO";

export default function DashboardPage() {
  const router = useRouter();
  const [user] = useState<AuthUser | null>(() => AuthService.getCurrentUser());
  const [metrics, setMetrics] = useState<DashboardMetricsResponse>({});
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);

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
  const isWarehouse = roles.includes("ALMACENISTA") || isAdmin;
  const isPurchasing = roles.includes("COMPRAS") || isAdmin;
  const isRequester = roles.includes("SOLICITANTE") || isAdmin;
  const isLabStaff = roles.includes("LABORATORIO") || isAdmin;

  // Calculamos los tabs que el usuario tiene realmente permitidos según RBAC
  const availableTabs: ActiveTab[] = [];
  if (isAdmin) availableTabs.push("EJECUTIVO");
  if (isLabStaff) availableTabs.push("LABORATORIO");
  if (isWarehouse) availableTabs.push("ALMACEN");
  if (isPurchasing) availableTabs.push("COMPRAS");
  if (isRequester) availableTabs.push("SOLICITUDES");

  // Tab activo inicial
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    return availableTabs[0] || "SOLICITUDES";
  });

  const storageKey = user ? `idi_dismissed_alerts_${user.id}` : null;

  useEffect(() => {
    if (!AuthService.isAuthenticated()) {
      router.replace("/login");
      return;
    }

    let isMounted = true;

    startTransition(() => {
      void (async () => {
        try {
          const [metricsData, notifsData] = await Promise.all([
            DashboardClientService.getMetrics(),
            DashboardClientService.getNotifications(),
          ]);
          if (isMounted) {
            setMetrics(metricsData);
            setNotifications(notifsData);
            setLoading(false);
          }
        } catch (err) {
          console.error("Error al cargar dashboard", err);
          if (isMounted) {
            setLoading(false);
          }
        }
      })();
    });

    return () => {
      isMounted = false;
    };
  }, [router]);

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
    return visibleUrgentAlerts.some((a) => a.id.startsWith("req-") || a.id.startsWith("lab-vial-"));
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
      <div className="h-[70vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
        <span className="text-xs text-muted-foreground font-medium">
          Cargando panel de control institucional...
        </span>
      </div>
    );
  }

  if (availableTabs.length === 0) {
    return (
      <Card className="p-8 text-center space-y-4 max-w-md mx-auto mt-12 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-800">
          Sin módulos asignados
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Tu cuenta no tiene roles operativos ni permisos asignados para
          visualizar el panel de control. Contacta al administrador del sistema
          para que configure tus accesos.
        </p>
      </Card>
    );
  }

  const myApprovedCount =
    metrics.userSection?.recentRequests?.filter((r) => r.status === "APROBADA")
      .length ?? 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="w-6 h-6 text-primary" />
            Panel de Control Operativo
          </h1>
          <p className="text-xs text-muted-foreground">
            Bienvenido,{" "}
            <strong className="text-foreground">
              {user?.fullName || user?.username}
            </strong>{" "}
            &bull; {user?.department || "Instituto de Inmunología"}
          </p>
        </div>
      </div>

      {/* Selector de Pestañas con shadcn Tabs */}
      {availableTabs.length > 1 && (
        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as ActiveTab)}
          className="w-full"
        >
          <TabsList className="bg-muted/70 p-1 rounded-xl h-auto flex flex-wrap gap-1 justify-start">
            {isAdmin && (
              <TabsTrigger
                value="EJECUTIVO"
                className="gap-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Dirección Ejecutiva
              </TabsTrigger>
            )}

            {isLabStaff && (
              <TabsTrigger
                value="LABORATORIO"
                className="gap-1.5 data-[state=active]:bg-background data-[state=active]:text-indigo-600 data-[state=active]:shadow-xs"
              >
                <FlaskConical className="w-3.5 h-3.5" />
                Laboratorio Clínico
              </TabsTrigger>
            )}

            {isWarehouse && (
              <TabsTrigger
                value="ALMACEN"
                className="gap-1.5 data-[state=active]:bg-background data-[state=active]:text-amber-600 data-[state=active]:shadow-xs"
              >
                <Boxes className="w-3.5 h-3.5" />
                Almacén & Cuarentena
              </TabsTrigger>
            )}

            {isPurchasing && (
              <TabsTrigger
                value="COMPRAS"
                className="gap-1.5 data-[state=active]:bg-background data-[state=active]:text-emerald-600 data-[state=active]:shadow-xs"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Compras & Proveedores
              </TabsTrigger>
            )}

            {isRequester && (
              <TabsTrigger
                value="SOLICITUDES"
                className="gap-1.5 data-[state=active]:bg-background data-[state=active]:text-purple-600 data-[state=active]:shadow-xs"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                Mi Área / Requisiciones
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>
      )}

      {/* Contenedor Desplegable de Alertas con Contador Numérico y Control de Usuario */}
      {visibleUrgentAlerts.length > 0 && (
        <Card className="shadow-xs border border-amber-200/90 bg-amber-50/30 overflow-hidden transition-all">
          {/* Cabecera / Barra Controladora del Desplegable */}
          <div
            onClick={toggleAlertsExpanded}
            className="p-3 sm:px-4 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-amber-100/30 transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                  criticalCount > 0
                    ? "bg-rose-500/15 border-rose-500/30 text-rose-700"
                    : "bg-amber-500/15 border-amber-500/30 text-amber-700"
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
              </div>

              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <span className="text-xs font-bold text-slate-800">
                  Avisos y Alertas del Sistema
                </span>
                <Badge
                  variant={criticalCount > 0 ? "destructive" : "warning"}
                  className="text-[11px] font-bold font-mono px-2 py-0.5"
                >
                  {visibleUrgentAlerts.length}{" "}
                  {visibleUrgentAlerts.length === 1 ? "alerta pendiente" : "alertas pendientes"}
                </Badge>
                {criticalCount > 0 && warningCount > 0 && (
                  <span className="text-[10px] text-muted-foreground font-medium hidden sm:inline">
                    ({criticalCount} {criticalCount === 1 ? "crítica" : "críticas"} &bull; {warningCount} {warningCount === 1 ? "advertencia" : "advertencias"})
                  </span>
                )}
                {!isAlertsExpanded && (
                  <span className="text-xs text-muted-foreground truncate hidden lg:inline max-w-md">
                    &bull; {visibleUrgentAlerts[0]?.title}: {visibleUrgentAlerts[0]?.message}
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
                  title="Descartar todos los avisos informativos leídos"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Limpiar leídas</span>
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleAlertsExpanded();
                }}
                className="h-7 text-xs font-semibold gap-1 bg-white hover:bg-slate-50 border-amber-200 cursor-pointer shadow-2xs"
              >
                <span>{isAlertsExpanded ? "Plegar" : "Desplegar"}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isAlertsExpanded ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </div>
          </div>

          {/* Panel Desplegable con Lista de Alertas (con scroll limitado para no empujar contenido) */}
          {isAlertsExpanded && (
            <div className="px-3.5 pb-3.5 pt-1.5 border-t border-amber-200/60 bg-white/70 space-y-2 max-h-[340px] overflow-y-auto">
              {visibleUrgentAlerts.map((alert) => {
                const isDismissable =
                  alert.id.startsWith("req-") || alert.id.startsWith("lab-vial-");

                return (
                  <Alert
                    key={alert.id}
                    variant={alert.type === "ALERT" ? "destructive" : "warning"}
                    className="flex items-center justify-between py-2 px-3 shadow-2xs bg-white border"
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
                        className="h-7 text-xs font-semibold gap-1 hover:bg-black/5 cursor-pointer"
                      >
                        Ver detalle <ArrowRight className="w-3.5 h-3.5" />
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
          PESTAÑA: LABORATORIO CLÍNICO & REACTIVOS EN SALA
         ======================================================== */}
      {activeTab === "LABORATORIO" && isLabStaff && metrics.labSection && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card
              onClick={() => router.push("/laboratory/fridges")}
              className="hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Thermometer className="w-4 h-4 text-blue-600" />
                  Neveras & Cadena de Frío
                </span>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {metrics.labSection.totalFridges}{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    activas
                  </span>
                </div>
                <span className="text-[10px] text-primary font-medium flex items-center gap-1 pt-1">
                  Monitoreo de salas <ArrowRight className="w-3 h-3" />
                </span>
              </CardContent>
            </Card>

            <Card
              onClick={() => router.push("/laboratory/consumption")}
              className="hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <TestTube className="w-4 h-4 text-emerald-600" />
                  Viales Abiertos en Uso
                </span>
                <div className="text-2xl font-bold font-mono text-emerald-700">
                  {metrics.labSection.inUseUnits}
                </div>
                <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1 pt-1">
                  Registrar consumo <ArrowRight className="w-3 h-3" />
                </span>
              </CardContent>
            </Card>

            <Card
              onClick={() => router.push("/laboratory/reagents")}
              className="hover:border-indigo-300 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-indigo-600" />
                  Unidades Selladas en Sala
                </span>
                <div className="text-2xl font-bold font-mono text-indigo-900">
                  {metrics.labSection.sealedUnits}
                </div>
                <span className="text-[10px] text-indigo-600 font-medium flex items-center gap-1 pt-1">
                  Apertura de viales <ArrowRight className="w-3 h-3" />
                </span>
              </CardContent>
            </Card>

            <Card
              onClick={() => router.push("/laboratory/consumption")}
              className="hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-purple-600" />
                  Consumos Registrados Hoy
                </span>
                <div className="text-2xl font-bold font-mono text-purple-700">
                  {metrics.labSection.consumptionsToday}
                </div>
                <span className="text-[10px] text-purple-600 font-medium flex items-center gap-1 pt-1">
                  Historial de pruebas <ArrowRight className="w-3 h-3" />
                </span>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de Viales Abiertos con Nivel de Volumen Remanente */}
          <Card className="overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/40 flex justify-between items-center">
              <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <TestTube className="w-4 h-4 text-emerald-600" />
                Viales y Reactivos Abiertos en Neveras
              </CardTitle>
              <Button
                variant="link"
                size="sm"
                onClick={() => router.push("/laboratory/consumption")}
                className="text-xs h-auto p-0 text-primary"
              >
                Nuevo consumo volumétrico &rarr;
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="py-3 px-4">Código Vial</TableHead>
                  <TableHead className="py-3 px-4">Reactivo & Insumo</TableHead>
                  <TableHead className="py-3 px-4">Ubicación / Nevera</TableHead>
                  <TableHead className="py-3 px-4 text-center">Nivel Remanente</TableHead>
                  <TableHead className="py-3 px-4">Abierto Por</TableHead>
                  <TableHead className="py-3 px-4 text-center">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.labSection.activeVials.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-muted-foreground"
                    >
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1 opacity-80" />
                      No hay viales abiertos actualmente en las neveras.
                    </TableCell>
                  </TableRow>
                ) : (
                  metrics.labSection.activeVials.map((vial) => {
                    const percentage = Math.round(
                      (vial.currentVolume / (vial.initialVolume || 100)) *
                        100,
                    );
                    const barColor =
                      percentage <= 15
                        ? "bg-red-500"
                        : percentage <= 50
                          ? "bg-amber-500"
                          : "bg-emerald-500";

                    return (
                      <TableRow key={vial.id}>
                        <TableCell className="py-3 px-4 font-mono font-bold text-foreground">
                          {vial.unitCode}
                        </TableCell>
                        <TableCell className="py-3 px-4 font-semibold text-foreground">
                          {vial.productName} ({vial.sku})
                        </TableCell>
                        <TableCell className="py-3 px-4 text-muted-foreground">
                          <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                            <Thermometer className="w-3 h-3 text-blue-500" />
                            {vial.fridgeName}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center">
                          <div className="w-28 mx-auto space-y-1">
                            <div className="flex justify-between text-[10px] font-mono">
                              <span>
                                {vial.currentVolume} {vial.unitOfMeasure}
                              </span>
                              <span className="font-bold">{percentage}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${barColor}`}
                                style={{
                                  width: `${Math.min(100, Math.max(0, percentage))}%`,
                                }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-muted-foreground">
                          {vial.openedBy}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              router.push("/laboratory/consumption")
                            }
                            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 h-7 text-[11px]"
                          >
                            Consumir
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* ========================================================
          PESTAÑA: DIRECCIÓN EJECUTIVA & BALANCES
         ======================================================== */}
      {activeTab === "EJECUTIVO" && isAdmin && metrics.executiveSection && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Valor Inventario USD
              </span>
              <div className="text-2xl font-bold font-mono text-foreground">
                $
                {metrics.executiveSection.totalInventoryValueUsd.toLocaleString(
                  "en-US",
                  { minimumFractionDigits: 2 },
                )}
              </div>
            </Card>

            <Card className="p-4 space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Valor Inventario Bs.
              </span>
              <div className="text-2xl font-bold font-mono text-foreground">
                {metrics.executiveSection.totalInventoryValueBs.toLocaleString(
                  "en-US",
                  { minimumFractionDigits: 2 },
                )}
                {" Bs."}
              </div>
            </Card>

            <Card className="p-4 space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-purple-600" />
                Catálogo Activo
              </span>
              <div className="text-2xl font-bold font-mono text-foreground">
                {metrics.executiveSection.totalProducts}{" "}
                <span className="text-xs text-muted-foreground font-normal">
                  productos
                </span>
              </div>
            </Card>

            <Card className="p-4 space-y-1 shadow-2xs">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                Incidencias Abiertas
              </span>
              <div className="text-2xl font-bold font-mono text-red-700">
                {metrics.executiveSection.openIncidents}
              </div>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/40 flex justify-between items-center">
              <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                Valorización de Inventario por Categoría
              </CardTitle>
              <Button
                variant="link"
                size="sm"
                onClick={() => router.push("/inventory/products")}
                className="text-xs h-auto p-0 text-primary"
              >
                Ver inventario completo &rarr;
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="py-3 px-4">Categoría</TableHead>
                  <TableHead className="py-3 px-4 text-right">
                    Valor Estimado (USD)
                  </TableHead>
                  <TableHead className="py-3 px-4 text-center">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.executiveSection.categoryValuation.map(
                  (cat, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="py-3 px-4 font-semibold text-foreground">
                        {cat.name}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right font-mono font-bold text-foreground">
                        $
                        {cat.valueUsd.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push("/inventory/products")}
                          className="text-primary hover:underline font-semibold text-[11px] h-7 px-2"
                        >
                          Ver insumos
                        </Button>
                      </TableCell>
                    </TableRow>
                  ),
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* ========================================================
          PESTAÑA: ALMACÉN CENTRAL & CADENA DE FRÍO
         ======================================================== */}
      {activeTab === "ALMACEN" && isWarehouse && metrics.warehouseSection && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card
              onClick={() => router.push("/requests?status=PENDIENTE")}
              className="hover:border-amber-300 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4 text-amber-600" />
                  Pedidos por Despachar
                </span>
                <div className="text-2xl font-bold font-mono text-amber-700">
                  {metrics.warehouseSection.pendingRequests}
                </div>
                <span className="text-[10px] text-primary font-medium flex items-center gap-1 pt-1">
                  Atender solicitudes <ArrowRight className="w-3 h-3" />
                </span>
              </CardContent>
            </Card>

            <Card
              onClick={() => router.push("/quality/quarantine")}
              className="hover:border-amber-300 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-amber-600" />
                  Lotes en Cuarentena
                </span>
                <div className="text-2xl font-bold font-mono text-amber-800">
                  {metrics.warehouseSection.quarantineBatches}
                </div>
                <span className="text-[10px] text-primary font-medium flex items-center gap-1 pt-1">
                  Dictamen técnico <ArrowRight className="w-3 h-3" />
                </span>
              </CardContent>
            </Card>

            <Card
              onClick={() => router.push("/inventory/kardex")}
              className="hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-blue-600" />
                  Movimientos Hoy
                </span>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {metrics.warehouseSection.movementsToday}
                </div>
                <span className="text-[10px] text-primary font-medium flex items-center gap-1 pt-1">
                  Ver Kardex del día <ArrowRight className="w-3 h-3" />
                </span>
              </CardContent>
            </Card>

            <Card
              onClick={() => router.push("/inventory/adjustments")}
              className="hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-emerald-600" />
                  Lotes Disponibles
                </span>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {metrics.warehouseSection.activeBatches}
                </div>
                <span className="text-[10px] text-primary font-medium flex items-center gap-1 pt-1">
                  Registrar ajuste / merma <ArrowRight className="w-3 h-3" />
                </span>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/40 flex justify-between items-center">
              <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                Lotes Próximos a Vencer (&le; 90 Días)
              </CardTitle>
              <Button
                variant="link"
                size="sm"
                onClick={() => router.push("/inventory/kardex")}
                className="text-xs h-auto p-0 text-primary"
              >
                Ver trazabilidad &rarr;
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="py-3 px-4">Lote</TableHead>
                  <TableHead className="py-3 px-4">Producto & SKU</TableHead>
                  <TableHead className="py-3 px-4">Ubicación</TableHead>
                  <TableHead className="py-3 px-4 text-right">Existencia</TableHead>
                  <TableHead className="py-3 px-4">Caducidad</TableHead>
                  <TableHead className="py-3 px-4 text-center">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.warehouseSection.expiringBatches.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-muted-foreground"
                    >
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1 opacity-80" />
                      No hay lotes con vencimiento próximo a 90 días.
                    </TableCell>
                  </TableRow>
                ) : (
                  metrics.warehouseSection.expiringBatches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="py-3 px-4 font-mono font-bold text-primary">
                        #{batch.lotNumber}
                      </TableCell>
                      <TableCell className="py-3 px-4 font-semibold text-foreground">
                        {batch.productName} ({batch.sku})
                      </TableCell>
                      <TableCell className="py-3 px-4 text-muted-foreground">
                        {batch.location}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right font-mono font-bold text-foreground">
                        {batch.quantity} {batch.unitOfMeasure}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-amber-700 font-mono font-semibold">
                        {batch.expirationDate
                          ? new Date(
                              batch.expirationDate,
                            ).toLocaleDateString()
                          : "Sin fecha"}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push("/inventory/adjustments")
                          }
                          className="text-amber-700 hover:underline font-semibold text-[11px] h-7 px-2"
                        >
                          Merma/Ajuste
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

      {/* ========================================================
          PESTAÑA: COMPRAS & PROVEEDORES
         ======================================================== */}
      {activeTab === "COMPRAS" && isPurchasing && metrics.purchasingSection && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card
              onClick={() => router.push("/purchasing/orders")}
              className="hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-blue-600" />
                  Órdenes en Tránsito / Borrador
                </span>
                <div className="text-2xl font-bold font-mono text-blue-700">
                  {metrics.purchasingSection.activeOrders}
                </div>
              </CardContent>
            </Card>

            <Card
              onClick={() =>
                router.push("/purchasing/orders?status=COMPLETADA")
              }
              className="hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  Compras Completadas
                </span>
                <div className="text-2xl font-bold font-mono text-emerald-700">
                  {metrics.purchasingSection.completedOrders}
                </div>
              </CardContent>
            </Card>

            <Card
              onClick={() => router.push("/purchasing/debts")}
              className="hover:border-red-300 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-red-600" />
                  Deuda Comercial Estimada
                </span>
                <div className="text-2xl font-bold font-mono text-red-700">
                  $
                  {metrics.purchasingSection.totalDebtUsd.toLocaleString(
                    "en-US",
                    { minimumFractionDigits: 2 },
                  )}
                </div>
                <span className="text-[10px] text-primary font-medium flex items-center gap-1 pt-1">
                  Ver cuentas por pagar <ArrowRight className="w-3 h-3" />
                </span>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/40 flex justify-between items-center">
              <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Building className="w-4 h-4 text-red-600" />
                Saldos Pendientes por Proveedor
              </CardTitle>
              <Button
                variant="link"
                size="sm"
                onClick={() => router.push("/purchasing/debts")}
                className="text-xs h-auto p-0 text-primary"
              >
                Gestionar pagos &rarr;
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="py-3 px-4">Proveedor</TableHead>
                  <TableHead className="py-3 px-4">RIF / ID Fiscal</TableHead>
                  <TableHead className="py-3 px-4 text-right">Saldo Deudor (USD)</TableHead>
                  <TableHead className="py-3 px-4 text-center">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.purchasingSection.topDebtors.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-8 text-center text-muted-foreground"
                    >
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1 opacity-80" />
                      No existen deudas pendientes con proveedores.
                    </TableCell>
                  </TableRow>
                ) : (
                  metrics.purchasingSection.topDebtors.map((debtor) => (
                    <TableRow key={debtor.id}>
                      <TableCell className="py-3 px-4 font-semibold text-foreground">
                        {debtor.name}
                      </TableCell>
                      <TableCell className="py-3 px-4 font-mono text-muted-foreground">
                        {debtor.rifOrId}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right font-mono font-bold text-destructive">
                        ${debtor.balanceUsd.toFixed(2)}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => router.push("/purchasing/debts")}
                          className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 h-7 text-[11px] font-semibold"
                        >
                          Pagar
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

      {/* ========================================================
          PESTAÑA: MI ÁREA / REQUISICIONES
         ======================================================== */}
      {activeTab === "SOLICITUDES" && isRequester && metrics.userSection && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card
              onClick={() => router.push("/requests")}
              className="hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4 text-blue-600" />
                  Mis Requisiciones Totales
                </span>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {metrics.userSection.totalMyRequests}
                </div>
                <span className="text-[10px] text-primary font-medium flex items-center gap-1 pt-1">
                  Ver historial completo <ArrowRight className="w-3 h-3" />
                </span>
              </CardContent>
            </Card>

            <Card
              onClick={() => router.push("/requests?status=PENDIENTE")}
              className="hover:border-amber-300 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Mis Solicitudes en Espera
                </span>
                <div className="text-2xl font-bold font-mono text-amber-700">
                  {metrics.userSection.pendingMyRequests}
                </div>
                <span className="text-[10px] text-amber-700 font-medium flex items-center gap-1 pt-1">
                  Pendientes por autorizar
                </span>
              </CardContent>
            </Card>

            <Card
              onClick={() => router.push("/requests?status=APROBADA")}
              className="hover:border-emerald-300 hover:shadow-xs transition-all cursor-pointer"
            >
              <CardContent className="p-4 space-y-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase flex items-center gap-1.5">
                  <CheckCheck className="w-4 h-4 text-emerald-600" />
                  Requisiciones Aprobadas
                </span>
                <div className="text-2xl font-bold font-mono text-emerald-700">
                  {myApprovedCount}
                </div>
                <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1 pt-1">
                  Listas para retiro en almacén
                </span>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/40 flex justify-between items-center">
              <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-blue-600" />
                Historial de Mis Requisiciones Recientes
              </CardTitle>
              <Button
                variant="link"
                size="sm"
                onClick={() => router.push("/requests")}
                className="text-xs h-auto p-0 text-primary"
              >
                Nueva solicitud &rarr;
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="py-3 px-4">N° Solicitud</TableHead>
                  <TableHead className="py-3 px-4">Fecha</TableHead>
                  <TableHead className="py-3 px-4 text-center">Prioridad</TableHead>
                  <TableHead className="py-3 px-4 text-center">Renglones</TableHead>
                  <TableHead className="py-3 px-4 text-center">Estado</TableHead>
                  <TableHead className="py-3 px-4 text-center">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.userSection.recentRequests.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No has registrado solicitudes de material recientemente.
                    </TableCell>
                  </TableRow>
                ) : (
                  metrics.userSection.recentRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="py-3 px-4 font-mono font-bold text-foreground">
                        {req.requestNumber}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-muted-foreground">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center">
                        <span className="font-semibold text-foreground">
                          {req.priority}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center font-bold text-foreground">
                        {req.itemsCount}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center">
                        <Badge
                          variant={
                            req.status === "APROBADA"
                              ? "success"
                              : req.status === "RECHAZADA"
                                ? "destructive"
                                : "info"
                          }
                        >
                          {req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/requests/${req.id}`)}
                          className="text-primary hover:underline font-semibold text-[11px] h-7 px-2"
                        >
                          Ver comprobante
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
