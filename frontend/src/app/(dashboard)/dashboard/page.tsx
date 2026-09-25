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
} from "lucide-react";

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
  const isLabStaff = roles.includes("ANALISTA_LABORATORIO") || isAdmin;

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

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <span className="text-xs text-slate-500 font-medium">
          Cargando panel de control institucional...
        </span>
      </div>
    );
  }

  if (availableTabs.length === 0) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto bg-white border border-slate-200 rounded-2xl shadow-xs mt-12">
        <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-slate-800">
          Sin módulos asignados
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Tu cuenta no tiene roles operativos ni permisos asignados para
          visualizar el panel de control. Contacta al administrador del sistema
          para que configure tus accesos.
        </p>
      </div>
    );
  }

  const myApprovedCount =
    metrics.userSection?.recentRequests?.filter((r) => r.status === "APROBADA")
      .length ?? 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" />
            Panel de Control Operativo
          </h1>
          <p className="text-xs text-slate-500">
            Bienvenido,{" "}
            <strong className="text-slate-800">
              {user?.fullName || user?.username}
            </strong>{" "}
            &bull; {user?.department || "Instituto de Inmunología"}
          </p>
        </div>
      </div>

      {/* Selector de Pestañas (Solo si tiene más de un módulo habilitado) */}
      {availableTabs.length > 1 && (
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-px">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab("EJECUTIVO")}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === "EJECUTIVO"
                  ? "border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Dirección Ejecutiva
            </button>
          )}

          {isLabStaff && (
            <button
              type="button"
              onClick={() => setActiveTab("LABORATORIO")}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === "LABORATORIO"
                  ? "border-indigo-600 text-indigo-800 bg-indigo-50/50 rounded-t-lg"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              Laboratorio Clínico
            </button>
          )}

          {isWarehouse && (
            <button
              type="button"
              onClick={() => setActiveTab("ALMACEN")}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === "ALMACEN"
                  ? "border-amber-600 text-amber-800 bg-amber-50/50 rounded-t-lg"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              Almacén & Cuarentena
            </button>
          )}

          {isPurchasing && (
            <button
              type="button"
              onClick={() => setActiveTab("COMPRAS")}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === "COMPRAS"
                  ? "border-emerald-600 text-emerald-800 bg-emerald-50/50 rounded-t-lg"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Compras & Proveedores
            </button>
          )}

          {isRequester && (
            <button
              type="button"
              onClick={() => setActiveTab("SOLICITUDES")}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                activeTab === "SOLICITUDES"
                  ? "border-purple-600 text-purple-800 bg-purple-50/50 rounded-t-lg"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Mi Área / Requisiciones
            </button>
          )}
        </div>
      )}

      {/* Banners de Alertas Críticas Efímeras / Descartables */}
      {visibleUrgentAlerts.length > 0 && (
        <div className="space-y-2">
          {visibleUrgentAlerts.map((alert) => {
            const isDismissable =
              alert.id.startsWith("req-") || alert.id.startsWith("lab-vial-");

            return (
              <div
                key={alert.id}
                className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                  alert.type === "ALERT"
                    ? "bg-red-50/80 border-red-200 text-red-900"
                    : "bg-amber-50/80 border-amber-200 text-amber-900"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <AlertTriangle
                    className={`w-4 h-4 shrink-0 ${
                      alert.type === "ALERT" ? "text-red-600" : "text-amber-600"
                    }`}
                  />
                  <div className="truncate">
                    <strong className="font-bold">{alert.title}: </strong>
                    <span className="text-slate-700">{alert.message}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleResolveAlert(alert)}
                    className="inline-flex items-center gap-1 font-bold underline hover:no-underline cursor-pointer"
                  >
                    Ver detalle <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Botón de descartar manual para alertas de eventos */}
                  {isDismissable && (
                    <button
                      type="button"
                      onClick={() => handleDismissAlert(alert.id)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer"
                      title="Descartar aviso"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================
          PESTAÑA: LABORATORIO CLÍNICO & REACTIVOS EN SALA
         ======================================================== */}
      {activeTab === "LABORATORIO" && isLabStaff && metrics.labSection && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => router.push("/laboratory/fridges")}
              className="p-4 bg-white border border-slate-200 hover:border-blue-300 rounded-xl shadow-xs space-y-1 text-left transition-all cursor-pointer"
            >
              <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                <Thermometer className="w-4 h-4 text-blue-600" />
                Neveras & Cadena de Frío
              </span>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {metrics.labSection.totalFridges}{" "}
                <span className="text-xs text-slate-500 font-normal">
                  activas
                </span>
              </div>
              <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1 pt-1">
                Monitoreo de salas <ArrowRight className="w-3 h-3" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => router.push("/laboratory/consumption")}
              className="p-4 bg-white border border-slate-200 hover:border-emerald-300 rounded-xl shadow-xs space-y-1 text-left transition-all cursor-pointer"
            >
              <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                <TestTube className="w-4 h-4 text-emerald-600" />
                Viales Abiertos en Uso
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-700">
                {metrics.labSection.inUseUnits}
              </div>
              <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1 pt-1">
                Registrar consumo <ArrowRight className="w-3 h-3" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => router.push("/laboratory/reagents")}
              className="p-4 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl shadow-xs space-y-1 text-left transition-all cursor-pointer"
            >
              <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                <Package className="w-4 h-4 text-indigo-600" />
                Unidades Selladas en Sala
              </span>
              <div className="text-2xl font-bold font-mono text-indigo-900">
                {metrics.labSection.sealedUnits}
              </div>
              <span className="text-[10px] text-indigo-600 font-medium flex items-center gap-1 pt-1">
                Apertura de viales <ArrowRight className="w-3 h-3" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => router.push("/laboratory/consumption")}
              className="p-4 bg-white border border-slate-200 hover:border-purple-300 rounded-xl shadow-xs space-y-1 text-left transition-all cursor-pointer"
            >
              <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-purple-600" />
                Consumos Registrados Hoy
              </span>
              <div className="text-2xl font-bold font-mono text-purple-700">
                {metrics.labSection.consumptionsToday}
              </div>
              <span className="text-[10px] text-purple-600 font-medium flex items-center gap-1 pt-1">
                Historial de pruebas <ArrowRight className="w-3 h-3" />
              </span>
            </button>
          </div>

          {/* Tabla de Viales Abiertos con Nivel de Volumen Remanente */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <TestTube className="w-4 h-4 text-emerald-600" />
                Viales y Reactivos Abiertos en Neveras
              </h3>
              <button
                type="button"
                onClick={() => router.push("/laboratory/consumption")}
                className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
              >
                Nuevo consumo volumétrico &rarr;
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Código Vial</th>
                    <th className="py-3 px-4">Reactivo & Insumo</th>
                    <th className="py-3 px-4">Ubicación / Nevera</th>
                    <th className="py-3 px-4 text-center">Nivel Remanente</th>
                    <th className="py-3 px-4">Abierto Por</th>
                    <th className="py-3 px-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.labSection.activeVials.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-slate-400"
                      >
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1 opacity-80" />
                        No hay viales abiertos actualmente en las neveras.
                      </td>
                    </tr>
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
                        <tr key={vial.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {vial.unitCode}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            {vial.productName} ({vial.sku})
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                              <Thermometer className="w-3 h-3 text-blue-500" />
                              {vial.fridgeName}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="w-28 mx-auto space-y-1">
                              <div className="flex justify-between text-[10px] font-mono">
                                <span>
                                  {vial.currentVolume} {vial.unitOfMeasure}
                                </span>
                                <span className="font-bold">{percentage}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${barColor}`}
                                  style={{
                                    width: `${Math.min(100, Math.max(0, percentage))}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-500">
                            {vial.openedBy}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                router.push("/laboratory/consumption")
                              }
                              className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded text-[11px] font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
                            >
                              Consumir
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          PESTAÑA: DIRECCIÓN EJECUTIVA & BALANCES
         ======================================================== */}
      {activeTab === "EJECUTIVO" && isAdmin && metrics.executiveSection && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Valor Inventario USD
              </span>
              <div className="text-2xl font-bold font-mono text-slate-900">
                $
                {metrics.executiveSection.totalInventoryValueUsd.toLocaleString(
                  "en-US",
                  { minimumFractionDigits: 2 },
                )}
              </div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Valor Inventario Bs.
              </span>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {metrics.executiveSection.totalInventoryValueBs.toLocaleString(
                  "en-US",
                  { minimumFractionDigits: 2 },
                )}
                {" Bs."}
              </div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-purple-600" />
                Catálogo Activo
              </span>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {metrics.executiveSection.totalProducts}{" "}
                <span className="text-xs text-slate-500 font-normal">
                  productos
                </span>
              </div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                Incidencias Abiertas
              </span>
              <div className="text-2xl font-bold font-mono text-red-700">
                {metrics.executiveSection.openIncidents}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                Valorización de Inventario por Categoría
              </h3>
              <button
                type="button"
                onClick={() => router.push("/inventory/products")}
                className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
              >
                Ver inventario completo &rarr;
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Categoría</th>
                    <th className="py-3 px-4 text-right">
                      Valor Estimado (USD)
                    </th>
                    <th className="py-3 px-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.executiveSection.categoryValuation.map(
                    (cat, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {cat.name}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          $
                          {cat.valueUsd.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => router.push("/inventory/products")}
                            className="text-blue-600 hover:underline font-semibold text-[11px] cursor-pointer"
                          >
                            Ver insumos
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          PESTAÑA: ALMACÉN CENTRAL & CADENA DE FRÍO
         ======================================================== */}
      {activeTab === "ALMACEN" && isWarehouse && metrics.warehouseSection && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => router.push("/requests?status=PENDIENTE")}
              className="p-4 bg-white border border-slate-200 hover:border-amber-300 rounded-xl shadow-xs space-y-1 text-left transition-all cursor-pointer"
            >
              <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-amber-600" />
                Pedidos por Despachar
              </span>
              <div className="text-2xl font-bold font-mono text-amber-700">
                {metrics.warehouseSection.pendingRequests}
              </div>
              <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1 pt-1">
                Atender solicitudes <ArrowRight className="w-3 h-3" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => router.push("/quality/quarantine")}
              className="p-4 bg-white border border-slate-200 hover:border-amber-300 rounded-xl shadow-xs space-y-1 text-left transition-all cursor-pointer"
            >
              <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                <Package className="w-4 h-4 text-amber-600" />
                Lotes en Cuarentena
              </span>
              <div className="text-2xl font-bold font-mono text-amber-800">
                {metrics.warehouseSection.quarantineBatches}
              </div>
              <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1 pt-1">
                Dictamen técnico <ArrowRight className="w-3 h-3" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => router.push("/inventory/kardex")}
              className="p-4 bg-white border border-slate-200 hover:border-blue-300 rounded-xl shadow-xs space-y-1 text-left transition-all cursor-pointer"
            >
              <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-blue-600" />
                Movimientos Hoy
              </span>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {metrics.warehouseSection.movementsToday}
              </div>
              <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1 pt-1">
                Ver Kardex del día <ArrowRight className="w-3 h-3" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => router.push("/inventory/adjustments")}
              className="p-4 bg-white border border-slate-200 hover:border-emerald-300 rounded-xl shadow-xs space-y-1 text-left transition-all cursor-pointer"
            >
              <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-emerald-600" />
                Lotes Disponibles
              </span>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {metrics.warehouseSection.activeBatches}
              </div>
              <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1 pt-1">
                Registrar ajuste / merma <ArrowRight className="w-3 h-3" />
              </span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-600" />
                Lotes Próximos a Vencer (&le; 90 Días)
              </h3>
              <button
                type="button"
                onClick={() => router.push("/inventory/kardex")}
                className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
              >
                Ver trazabilidad &rarr;
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Lote</th>
                    <th className="py-3 px-4">Producto & SKU</th>
                    <th className="py-3 px-4">Ubicación</th>
                    <th className="py-3 px-4 text-right">Existencia</th>
                    <th className="py-3 px-4">Caducidad</th>
                    <th className="py-3 px-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.warehouseSection.expiringBatches.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-slate-400"
                      >
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1 opacity-80" />
                        No hay lotes con vencimiento próximo a 90 días.
                      </td>
                    </tr>
                  ) : (
                    metrics.warehouseSection.expiringBatches.map((batch) => (
                      <tr key={batch.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">
                          #{batch.lotNumber}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {batch.productName} ({batch.sku})
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {batch.location}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {batch.quantity} {batch.unitOfMeasure}
                        </td>
                        <td className="py-3 px-4 text-amber-700 font-mono font-semibold">
                          {batch.expirationDate
                            ? new Date(
                                batch.expirationDate,
                              ).toLocaleDateString()
                            : "Sin fecha"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              router.push("/inventory/adjustments")
                            }
                            className="text-amber-700 hover:underline font-semibold text-[11px] cursor-pointer"
                          >
                            Merma/Ajuste
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          PESTAÑA: COMPRAS & PROVEEDORES
         ======================================================== */}
      {activeTab === "COMPRAS" && isPurchasing && metrics.purchasingSection && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => router.push("/purchasing/orders")}
              className="p-4 bg-white border border-slate-200 hover:border-blue-300 rounded-xl shadow-xs space-y-1 text-left transition-all cursor-pointer"
            >
              <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
                Órdenes en Tránsito / Borrador
              </span>
              <div className="text-2xl font-bold font-mono text-blue-700">
                {metrics.purchasingSection.activeOrders}
              </div>
            </button>

            <button
              type="button"
              onClick={() =>
                router.push("/purchasing/orders?status=COMPLETADA")
              }
              className="p-4 bg-white border border-slate-200 hover:border-emerald-300 rounded-xl shadow-xs space-y-1 text-left transition-all cursor-pointer"
            >
              <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-emerald-600" />
                Compras Completadas
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-700">
                {metrics.purchasingSection.completedOrders}
              </div>
            </button>

            <button
              type="button"
              onClick={() => router.push("/purchasing/debts")}
              className="p-4 bg-white border border-slate-200 hover:border-red-300 rounded-xl shadow-xs space-y-1 text-left transition-all cursor-pointer"
            >
              <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
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
              <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1 pt-1">
                Ver cuentas por pagar <ArrowRight className="w-3 h-3" />
              </span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Building className="w-4 h-4 text-red-600" />
                Saldos Pendientes por Proveedor
              </h3>
              <button
                type="button"
                onClick={() => router.push("/purchasing/debts")}
                className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
              >
                Gestionar pagos &rarr;
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Proveedor</th>
                    <th className="py-3 px-4">RIF / ID Fiscal</th>
                    <th className="py-3 px-4 text-right">Saldo Deudor (USD)</th>
                    <th className="py-3 px-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.purchasingSection.topDebtors.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-8 text-center text-slate-400"
                      >
                        <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1 opacity-80" />
                        No existen deudas pendientes con proveedores.
                      </td>
                    </tr>
                  ) : (
                    metrics.purchasingSection.topDebtors.map((debtor) => (
                      <tr key={debtor.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {debtor.name}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">
                          {debtor.rifOrId}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-red-700">
                          ${debtor.balanceUsd.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => router.push("/purchasing/debts")}
                            className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded text-[11px] font-semibold hover:bg-emerald-100 transition-colors cursor-pointer"
                          >
                            Pagar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          PESTAÑA: MI ÁREA / REQUISICIONES
         ======================================================== */}
      {activeTab === "SOLICITUDES" && isRequester && metrics.userSection && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => router.push("/requests")}
              className="p-4 bg-white border border-slate-200 hover:border-blue-300 rounded-xl shadow-xs space-y-1 text-left transition-all cursor-pointer"
            >
              <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                <ClipboardList className="w-4 h-4 text-blue-600" />
                Mis Requisiciones Totales
              </span>
              <div className="text-2xl font-bold font-mono text-slate-900">
                {metrics.userSection.totalMyRequests}
              </div>
              <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1 pt-1">
                Ver historial completo <ArrowRight className="w-3 h-3" />
              </span>
            </button>

            <button
              type="button"
              onClick={() => router.push("/requests?status=PENDIENTE")}
              className="p-4 bg-white border border-slate-200 hover:border-amber-300 rounded-xl shadow-xs space-y-1 text-left transition-all cursor-pointer"
            >
              <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Mis Solicitudes en Espera
              </span>
              <div className="text-2xl font-bold font-mono text-amber-700">
                {metrics.userSection.pendingMyRequests}
              </div>
              <span className="text-[10px] text-amber-700 font-medium flex items-center gap-1 pt-1">
                Pendientes por autorizar
              </span>
            </button>

            <button
              type="button"
              onClick={() => router.push("/requests?status=APROBADA")}
              className="p-4 bg-white border border-slate-200 hover:border-emerald-300 rounded-xl shadow-xs space-y-1 text-left transition-all cursor-pointer"
            >
              <span className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1.5">
                <CheckCheck className="w-4 h-4 text-emerald-600" />
                Requisiciones Aprobadas
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-700">
                {myApprovedCount}
              </div>
              <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1 pt-1">
                Listas para retiro en almacén
              </span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-blue-600" />
                Historial de Mis Requisiciones Recientes
              </h3>
              <button
                type="button"
                onClick={() => router.push("/requests")}
                className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
              >
                Nueva solicitud &rarr;
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">N° Solicitud</th>
                    <th className="py-3 px-4">Fecha</th>
                    <th className="py-3 px-4 text-center">Prioridad</th>
                    <th className="py-3 px-4 text-center">Renglones</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.userSection.recentRequests.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-slate-400"
                      >
                        No has registrado solicitudes de material recientemente.
                      </td>
                    </tr>
                  ) : (
                    metrics.userSection.recentRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {req.requestNumber}
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-semibold text-slate-700">
                            {req.priority}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">
                          {req.itemsCount}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold border bg-blue-50 text-blue-700 border-blue-200">
                            {req.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => router.push(`/requests/${req.id}`)}
                            className="text-blue-600 hover:underline font-semibold text-[11px] cursor-pointer"
                          >
                            Ver comprobante
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
