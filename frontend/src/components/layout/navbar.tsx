"use client";

import { useState, useRef, useEffect, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AuthService } from "@/services/auth.service";
import { CurrencyService, CurrencyItem } from "@/services/currency.service";
import {
  DashboardClientService,
  SystemNotification,
} from "@/services/dashboard.service";
import type { AuthUser } from "@/types/auth";
import {
  Menu,
  LogOut,
  ChevronDown,
  Building,
  ShieldCheck,
  User,
  Coins,
  RefreshCw,
  Loader2,
  Bell,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Info,
  X,
  CheckCheck,
} from "lucide-react";

interface NavbarProps {
  user: AuthUser | null;
  onOpenSidebar: () => void;
}

export function Navbar({ user, onOpenSidebar }: NavbarProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyItem[]>([]);
  const [showRateModal, setShowRateModal] = useState(false);
  const [selectedCurrencyId, setSelectedCurrencyId] = useState<number | "">("");
  const [newRate, setNewRate] = useState("");
  const [submittingRate, setSubmittingRate] = useState(false);
  const [, startTransition] = useTransition();

  const storageKey = user ? `idi_dismissed_alerts_${user.id}` : null;

  // Inicialización perezosa de IDs descartados
  const [dismissedNotifIds, setDismissedNotifIds] = useState<string[]>(() => {
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

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const canEditRate =
    user?.roles?.includes("ADMINISTRADOR") || user?.roles?.includes("COMPRAS");

  const loadCurrencies = async () => {
    try {
      const data = await CurrencyService.getCurrencies();
      setCurrencies(data);
    } catch (err) {
      console.error("Error al cargar monedas", err);
    }
  };

  const loadNotifications = useCallback(async (excluded: string[]) => {
    try {
      const data = await DashboardClientService.getNotifications(excluded);
      setNotifications(data);
    } catch (err) {
      console.error("Error cargando notificaciones", err);
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void loadCurrencies();
      void loadNotifications(dismissedNotifIds);
    });

    const interval = window.setInterval(() => {
      void loadNotifications(dismissedNotifIds);
    }, 45000);

    return () => window.clearInterval(interval);
  }, [loadNotifications, dismissedNotifIds]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
      if (
        notifRef.current &&
        !notifRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const persistDismissed = (ids: string[]) => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(ids));
      } catch (err) {
        console.error("Error al guardar alertas descartadas", err);
      }
    }
  };

  // Descartar una notificación y traer la siguiente pendiente en cola
  const handleDismissNotification = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated = Array.from(new Set([...dismissedNotifIds, id]));
    setDismissedNotifIds(updated);
    persistDismissed(updated);
    void loadNotifications(updated);
  };

  // Marcar todas como leídas
  const handleDismissAll = () => {
    const allCurrentIds = notifications.map((n) => n.id);
    const updated = Array.from(
      new Set([...dismissedNotifIds, ...allCurrentIds]),
    );
    setDismissedNotifIds(updated);
    persistDismissed(updated);
    void loadNotifications(updated);
  };

  // Navegar al comprobante y retirar la notificación
  const handleSelectNotification = (notif: SystemNotification) => {
    handleDismissNotification(notif.id);
    setNotificationsOpen(false);
    router.push(notif.link);
  };

  const handleLogout = () => {
    AuthService.logout();
  };

  const vesItem = currencies.find((c) => c.code === "VES");
  const eurItem = currencies.find((c) => c.code === "EUR");
  const vesRate = vesItem?.latestRate ? Number(vesItem.latestRate) : null;
  const eurRate = eurItem?.latestRate ? Number(eurItem.latestRate) : null;

  const handleOpenRateModal = () => {
    if (vesItem) {
      setSelectedCurrencyId(vesItem.id);
      setNewRate(vesRate ? String(vesRate) : "");
    }
    setShowRateModal(true);
  };

  const handleCurrencySelectionChange = (currId: number) => {
    setSelectedCurrencyId(currId);
    const curr = currencies.find((c) => c.id === currId);
    setNewRate(curr?.latestRate ? String(curr.latestRate) : "");
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCurrencyId || !newRate) return;
    setSubmittingRate(true);
    try {
      await CurrencyService.registerRate({
        currencyId: Number(selectedCurrencyId),
        rate: parseFloat(newRate),
      });
      await loadCurrencies();
      setShowRateModal(false);
      setNewRate("");
    } catch (err) {
      console.error("Error guardando tasa", err);
      alert("Error al actualizar la tasa de cambio");
    } finally {
      setSubmittingRate(false);
    }
  };

  const primaryRole = user?.roles?.[0] ?? "PERSONAL";
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMINISTRADOR":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "ANALISTA_LABORATORIO":
        return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "ALMACENISTA":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "COMPRAS":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "SOLICITANTE":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getNotifIcon = (type: SystemNotification["type"]) => {
    switch (type) {
      case "SUCCESS":
        return (
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
        );
      case "WARNING":
        return (
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        );
      case "ALERT":
        return (
          <AlertOctagon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
        );
      default:
        return <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />;
    }
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200/80 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSidebar}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden transition-colors cursor-pointer"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex w-7 h-7 rounded-md bg-slate-100 items-center justify-center text-slate-600 border border-slate-200">
              <Building className="w-3.5 h-3.5 text-slate-700" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                Instituto de Inmunología
              </span>
              <span className="text-[11px] text-slate-500 hidden sm:inline leading-tight">
                Dr. Nicolás E. Bianco Colmenares &bull; UCV
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Widget Multimoneda */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <Coins className="w-3.5 h-3.5 text-emerald-600 shrink-0" />

            <div className="flex items-center gap-1 font-mono">
              <span className="text-slate-400 font-sans font-medium text-[11px]">
                BCV:
              </span>
              <span className="font-bold text-slate-800">
                {vesRate ? `${vesRate.toFixed(2)} Bs.` : "---"}
              </span>
            </div>

            <span className="text-slate-300">|</span>

            <div className="flex items-center gap-1 font-mono">
              <span className="text-slate-400 font-sans font-medium text-[11px]">
                EUR:
              </span>
              <span className="font-bold text-slate-800">
                {eurRate ? `${eurRate.toFixed(2)}` : "---"}
              </span>
            </div>

            {canEditRate && (
              <button
                type="button"
                onClick={handleOpenRateModal}
                className="ml-1 p-0.5 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                title="Actualizar tasas de cambio"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            )}
          </div>

          <span
            className={`hidden md:inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${getRoleBadgeColor(
              primaryRole,
            )}`}
          >
            <ShieldCheck className="w-3 h-3" />
            {primaryRole.replace("_", " ")}
          </span>

          {/* Centro de Notificaciones */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotificationsOpen((prev) => !prev)}
              className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
              title="Notificaciones y Alertas"
            >
              <Bell className="w-4 h-4" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden flex flex-col">
                {/* Cabecera del Panel */}
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800">
                      Notificaciones & Alertas
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                      {notifications.length}
                    </span>
                  </div>

                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDismissAll}
                      className="text-[11px] text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Marcar todas como leídas"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Marcar leídas
                    </button>
                  )}
                </div>

                {/* Lista con Scroll Completo */}
                <div className="max-h-95 overflow-y-auto divide-y divide-slate-100 overscroll-contain">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 space-y-1.5">
                      <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto opacity-80" />
                      <p className="font-semibold text-slate-700">
                        ¡Bandeja al día!
                      </p>
                      <p className="text-[11px] text-slate-400">
                        No tienes avisos ni notificaciones pendientes.
                      </p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleSelectNotification(notif)}
                        className="group relative w-full text-left p-3.5 hover:bg-slate-50 transition-colors flex items-start gap-3 cursor-pointer"
                      >
                        {getNotifIcon(notif.type)}

                        <div className="flex-1 min-w-0 pr-6">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {notif.title}
                          </p>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                            {notif.message}
                          </p>
                        </div>

                        {/* Botón descartar individual */}
                        <button
                          type="button"
                          onClick={(e) =>
                            handleDismissNotification(notif.id, e)
                          }
                          className="absolute right-3 top-3 p-1 text-slate-300 hover:text-slate-600 rounded-md hover:bg-slate-200/60 transition-colors cursor-pointer"
                          title="Descartar"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="hidden md:block w-px h-6 bg-slate-200" />

          {/* Dropdown de usuario */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all text-left cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {user?.fullName?.charAt(0) || user?.username?.charAt(0) || "U"}
              </div>
              <div className="hidden sm:flex flex-col leading-tight pr-1">
                <span className="text-xs font-semibold text-slate-800 truncate max-w-32.5">
                  {user?.fullName || user?.username}
                </span>
                <span className="text-[10px] text-slate-400 truncate max-w-32.5">
                  {user?.department ?? "Personal IDI"}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  dropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200/80 py-1.5 z-50">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {user?.fullName || user?.username}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {user?.email}
                  </p>
                </div>

                <div className="py-1">
                  <div className="px-4 py-1.5 flex items-center gap-2 text-xs text-slate-600">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Dpto: {user?.department ?? "Sin asignar"}</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 font-medium transition-colors text-left cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modal para actualizar tasa de cambio */}
      {showRateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <Coins className="w-5 h-5 text-emerald-600" />
              <span>Ajustar Tasa Oficial de Cambio</span>
            </div>
            <p className="text-xs text-slate-500">
              Selecciona la divisa a actualizar contra el Dólar Estadounidense
              ($1 USD base).
            </p>

            <form onSubmit={handleSaveRate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Moneda a Actualizar
                </label>
                <select
                  value={selectedCurrencyId}
                  onChange={(e) =>
                    handleCurrencySelectionChange(Number(e.target.value))
                  }
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 outline-none text-slate-700 bg-white"
                >
                  {currencies
                    .filter((c) => !c.isDefault && c.code !== "USD")
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code} - {c.symbol})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tasa de Cambio (Valor de 1 USD en esta divisa)
                </label>
                <input
                  type="number"
                  step="0.0001"
                  required
                  placeholder="Ej: 45.2500"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  className="w-full text-sm font-mono border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-600 outline-none text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRateModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingRate}
                  className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {submittingRate && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Guardar Tasa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
