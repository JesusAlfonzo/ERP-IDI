"use client";

import {
  useState,
  useRef,
  useEffect,
  useTransition,
  useCallback,
  useMemo,
} from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AuthService } from "@/services/auth.service";
import { CurrencyService, CurrencyItem } from "@/services/currency.service";
import {
  DashboardClientService,
  SystemNotification,
} from "@/services/dashboard.service";
import { toast } from "@/utils/toast";
import type { AuthUser } from "@/types/auth";
import {
  LogOut,
  ChevronDown,
  ChevronRight,
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
  Menu,
  Pencil,
  LayoutDashboard,
  Package,
  SlidersHorizontal,
  ShieldAlert,
  ClipboardList,
  PackageCheck,
  FileText,
  ShoppingCart,
  Building2,
  FileSpreadsheet,
  Wallet,
  History,
  BarChart3,
  Users,
  Clock,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
  user: AuthUser | null;
  onOpenSidebar: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
}

interface LiveRateInfo {
  usd: number | null;
  eur: number | null;
  effectiveDate: string | null;
  lastUpdated: string | null;
  loading: boolean;
  error: boolean;
}

interface BreadcrumbSubModule {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

interface BreadcrumbGroup {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  subModules: BreadcrumbSubModule[];
}

const BREADCRUMB_GROUPS: BreadcrumbGroup[] = [
  {
    id: "inventario",
    label: "Inventario",
    icon: Package,
    roles: ["ADMINISTRADOR", "ALMACENISTA", "COMPRAS"],
    subModules: [
      {
        label: "Insumos y Lotes",
        href: "/inventory/products",
        icon: Package,
        roles: ["ADMINISTRADOR", "ALMACENISTA", "COMPRAS"],
      },
      {
        label: "Ajustes y Mermas",
        href: "/inventory/adjustments",
        icon: SlidersHorizontal,
        roles: ["ADMINISTRADOR", "ALMACENISTA"],
      },
      {
        label: "Cuarentena",
        href: "/quality/quarantine",
        icon: ShieldAlert,
        roles: ["ADMINISTRADOR", "ALMACENISTA", "LABORATORIO"],
      },
    ],
  },
  {
    id: "solicitudes",
    label: "Solicitudes",
    icon: ClipboardList,
    roles: [
      "ADMINISTRADOR",
      "ALMACENISTA",
      "LABORATORIO",
      "SOLICITANTE",
      "COMPRAS",
      "ADMINISTRACION",
      "COORDINADOR_LABORATORIO",
      "COORDINADOR",
      "BIOANALISTA",
      "INVESTIGACION",
      "DOCENCIA",
    ],
    subModules: [
      {
        label: "Pedidos",
        href: "/requests",
        icon: ClipboardList,
        roles: [
          "ADMINISTRADOR",
          "ALMACENISTA",
          "LABORATORIO",
          "SOLICITANTE",
          "COMPRAS",
          "ADMINISTRACION",
          "COORDINADOR_LABORATORIO",
          "COORDINADOR",
          "BIOANALISTA",
          "INVESTIGACION",
          "DOCENCIA",
        ],
      },
      {
        label: "Despachos",
        href: "/requests/dispatch",
        icon: PackageCheck,
        roles: ["ADMINISTRADOR", "ALMACENISTA"],
      },
    ],
  },
  {
    id: "compras",
    label: "Compras",
    icon: ShoppingCart,
    roles: ["ADMINISTRADOR", "COMPRAS", "ADMINISTRACION"],
    subModules: [
      {
        label: "Preórdenes",
        href: "/purchasing/requisitions",
        icon: FileText,
        roles: ["ADMINISTRADOR", "COMPRAS", "ADMINISTRACION"],
      },
      {
        label: "Órdenes",
        href: "/purchasing/orders",
        icon: ShoppingCart,
        roles: ["ADMINISTRADOR", "COMPRAS", "ADMINISTRACION"],
      },
      {
        label: "Proveedores",
        href: "/purchasing/suppliers",
        icon: Building2,
        roles: ["ADMINISTRADOR", "COMPRAS"],
      },
    ],
  },
  {
    id: "pagos",
    label: "Pagos",
    icon: Wallet,
    roles: ["ADMINISTRADOR", "COMPRAS", "ADMINISTRACION"],
    subModules: [
      {
        label: "Cuentas por Pagar",
        href: "/purchasing/debts",
        icon: FileSpreadsheet,
        roles: ["ADMINISTRADOR", "COMPRAS", "ADMINISTRACION"],
      },
      {
        label: "Pagos Directos",
        href: "/admin/financial/payments",
        icon: Wallet,
        roles: ["ADMINISTRADOR", "COMPRAS", "ADMINISTRACION"],
      },
    ],
  },
  {
    id: "auditoria",
    label: "Auditoría",
    icon: BarChart3,
    roles: ["ADMINISTRADOR", "ADMINISTRACION", "COORDINADOR"],
    subModules: [
      {
        label: "Movimientos",
        href: "/inventory/kardex",
        icon: History,
        roles: ["ADMINISTRADOR"],
      },
      {
        label: "Reportes",
        href: "/inventory/reports",
        icon: BarChart3,
        roles: ["ADMINISTRADOR", "COORDINADOR"],
      },
    ],
  },
  {
    id: "ajustes",
    label: "Ajustes",
    icon: SlidersHorizontal,
    roles: ["ADMINISTRADOR"],
    subModules: [
      {
        label: "Usuarios",
        href: "/admin/users",
        icon: Users,
        roles: ["ADMINISTRADOR"],
      },
      {
        label: "Horario de Solicitudes",
        href: "/admin/security",
        icon: Clock,
        roles: ["ADMINISTRADOR"],
      },
      {
        label: "Maestros",
        href: "/inventory/settings",
        icon: Database,
        roles: ["ADMINISTRADOR"],
      },
    ],
  },
];

function isSubModuleMatch(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/requests" && pathname.startsWith("/requests/dispatch")) {
    return false;
  }
  return pathname.startsWith(`${href}/`);
}

function getSubPageTrailingLabel(
  pathname: string,
  subModuleHref: string,
): string | null {
  if (pathname === subModuleHref) return null;
  const rest = pathname.slice(subModuleHref.length).replace(/^\/+/, "");
  if (!rest) return null;
  if (rest === "new") return "Nuevo";
  const parts = rest.split("/");
  if (parts[0] && /^\d+$/.test(parts[0])) {
    return `Detalle #${parts[0]}`;
  }
  return "Detalle";
}

function formatRelativeTime(isoDate: string): string {
  if (!isoDate) return "";
  const ts = new Date(isoDate).getTime();
  if (isNaN(ts)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return "Hace instantes";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return new Date(isoDate).toLocaleDateString("es-VE");
}

export function Navbar({ user, onOpenSidebar }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname() || "/dashboard";
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [bellPulse, setBellPulse] = useState(false);
  const [currencies, setCurrencies] = useState<CurrencyItem[]>([]);
  const [liveRates, setLiveRates] = useState<LiveRateInfo>({
    usd: null,
    eur: null,
    effectiveDate: null,
    lastUpdated: null,
    loading: true,
    error: false,
  });
  const [refreshingRates, setRefreshingRates] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [selectedCurrencyId, setSelectedCurrencyId] = useState<number | "">("");
  const [newRate, setNewRate] = useState("");
  const [submittingRate, setSubmittingRate] = useState(false);
  const [, startTransition] = useTransition();

  // Permisos para filtrar grupos y submódulos en el breadcrumb interactivo
  const isBioanalystOnly =
    Boolean(user?.roles?.includes("BIOANALISTA")) &&
    !user?.roles?.includes("ADMINISTRADOR") &&
    !user?.roles?.includes("COORDINADOR") &&
    !user?.roles?.includes("COORDINADOR_LABORATORIO");

  const isRoleAllowed = useCallback(
    (roles?: string[]) => {
      if (!roles || roles.length === 0) return true;
      if (!user?.roles) return false;
      return roles.some((r) => user.roles.includes(r));
    },
    [user],
  );

  const allowedGroups = useMemo(() => {
    return BREADCRUMB_GROUPS.filter((g) => {
      if (isBioanalystOnly) {
        if (["compras", "pagos", "auditoria", "ajustes"].includes(g.id)) {
          return false;
        }
      }
      if (!isRoleAllowed(g.roles)) return false;
      return g.subModules.some((sm) => isRoleAllowed(sm.roles));
    }).map((g) => ({
      ...g,
      subModules: g.subModules.filter((sm) => isRoleAllowed(sm.roles)),
    }));
  }, [isBioanalystOnly, isRoleAllowed]);

  // Detectar grupo activo, submódulo activo y sub-página (ej. /new o /[id])
  const activeNavigation = useMemo(() => {
    for (const group of allowedGroups) {
      // Buscar coincidencia más específica primero (ej. /requests/dispatch antes que /requests)
      const sortedSubs = [...group.subModules].sort(
        (a, b) => b.href.length - a.href.length,
      );
      for (const sub of sortedSubs) {
        if (isSubModuleMatch(pathname, sub.href)) {
          return {
            group,
            subModule: sub,
            trailingLabel: getSubPageTrailingLabel(pathname, sub.href),
          };
        }
      }
    }
    return null;
  }, [allowedGroups, pathname]);

  const storageKey = user ? `idi_dismissed_alerts_${user.id}` : null;
  const seenToastKey = user ? `idi_seen_toast_notifs_${user.id}` : null;

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

  const seenNotifIdsRef = useRef<Set<string> | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const canEditRate =
    user?.roles?.includes("ADMINISTRADOR") || user?.roles?.includes("COMPRAS");

  const loadCurrencies = useCallback(async () => {
    try {
      const data = await CurrencyService.getCurrencies();
      setCurrencies(data);
      return data;
    } catch (err) {
      console.error("Error al cargar monedas", err);
      return [];
    }
  }, []);

  const loadLiveRates = useCallback(async () => {
    try {
      const data = await CurrencyService.getCurrentRates();
      if (data) {
        const usd =
          Number(
            data.usdRate ??
              data.bcvRate ??
              data.rate ??
              data.USD ??
              data.rates?.USD ??
              data.VES ??
              0,
          ) || null;

        const eur =
          Number(data.eurRate ?? data.EUR ?? data.rates?.EUR ?? 0) || null;

        const effectiveDate = data.effectiveDate || data.date || null;
        const lastUpdated = data.lastUpdated || null;

        setLiveRates({
          usd,
          eur,
          effectiveDate,
          lastUpdated,
          loading: false,
          error: false,
        });
        return;
      }
    } catch (err) {
      console.error("Error al cargar tasas de cambio en vivo en Navbar", err);
    }

    try {
      const currs = await CurrencyService.getCurrencies();
      setCurrencies(currs);
      const ves = currs.find((c) => c.code === "VES" || c.code === "VED");
      const eur = currs.find((c) => c.code === "EUR");
      const usdVal = ves?.latestRate ? Number(ves.latestRate) : null;
      const eurVal = eur?.latestRate ? Number(eur.latestRate) : null;

      setLiveRates((prev) => ({
        usd: usdVal ?? prev.usd,
        eur: eurVal ?? prev.eur,
        effectiveDate: ves?.effectiveDate
          ? String(ves.effectiveDate).split("T")[0]
          : prev.effectiveDate,
        lastUpdated: ves?.effectiveDate
          ? String(ves.effectiveDate)
          : prev.lastUpdated,
        loading: false,
        error: !usdVal && !prev.usd,
      }));
    } catch (fallbackErr) {
      console.error("Error en fallback de tasas de Navbar", fallbackErr);
      setLiveRates((prev) => ({ ...prev, loading: false, error: true }));
    }
  }, []);

  const handleManualRefresh = async () => {
    setRefreshingRates(true);
    try {
      await Promise.all([loadLiveRates(), loadCurrencies()]);
    } finally {
      setTimeout(() => setRefreshingRates(false), 500);
    }
  };

  const loadNotifications = useCallback(
    async (excluded: string[]) => {
      try {
        const data = await DashboardClientService.getNotifications(excluded);
        setNotifications(data);

        if (typeof window === "undefined" || !seenToastKey) return;

        // Inicializar conjunto de notificaciones ya anunciadas por Toast
        if (seenNotifIdsRef.current === null) {
          try {
            const rawSeen = localStorage.getItem(seenToastKey);
            if (rawSeen) {
              seenNotifIdsRef.current = new Set<string>(JSON.parse(rawSeen));
            } else {
              // Primera vez en el navegador: sembrar con las existentes (> 90 seg de antigüedad)
              // y anunciar solo si hay una alerta recién creada (< 90 seg)
              const nowMs = Date.now();
              const initialSeen = new Set<string>();
              const brandNewOnFirstLoad: SystemNotification[] = [];

              for (const n of data) {
                const ageMs = nowMs - new Date(n.createdAt).getTime();
                if (
                  !isNaN(ageMs) &&
                  ageMs >= 0 &&
                  ageMs <= 90_000 &&
                  !n.id.startsWith("pur-low-stock-") &&
                  !n.id.startsWith("alm-quarantine-") &&
                  !n.id.startsWith("alm-expiring-")
                ) {
                  brandNewOnFirstLoad.push(n);
                }
                initialSeen.add(n.id);
              }

              seenNotifIdsRef.current = initialSeen;
              localStorage.setItem(
                seenToastKey,
                JSON.stringify(Array.from(initialSeen)),
              );

              if (brandNewOnFirstLoad.length > 0) {
                setBellPulse(true);
                window.setTimeout(() => setBellPulse(false), 4500);
                brandNewOnFirstLoad.slice(0, 2).forEach((notif) => {
                  toast.notification({
                    title: notif.title,
                    message: notif.message,
                    type: notif.type,
                    onClick: () => router.push(notif.link),
                  });
                });
              }
              return;
            }
          } catch {
            seenNotifIdsRef.current = new Set<string>(data.map((d) => d.id));
            return;
          }
        }

        // Detectar notificaciones nuevas que acaban de llegar en tiempo real
        const newlyArrived: SystemNotification[] = [];
        for (const n of data) {
          if (!seenNotifIdsRef.current.has(n.id)) {
            seenNotifIdsRef.current.add(n.id);
            newlyArrived.push(n);
          }
        }

        if (newlyArrived.length > 0) {
          try {
            localStorage.setItem(
              seenToastKey,
              JSON.stringify(Array.from(seenNotifIdsRef.current).slice(-250)),
            );
          } catch {
            // Ignorar cuota de localStorage
          }

          setBellPulse(true);
          window.setTimeout(() => setBellPulse(false), 4500);

          // Disparar hasta 3 toasts simultáneos para no saturar la pantalla
          newlyArrived.slice(0, 3).forEach((notif) => {
            toast.notification({
              title: notif.title,
              message: notif.message,
              type: notif.type,
              onClick: () => router.push(notif.link),
            });
          });
        }
      } catch (err) {
        console.error("Error cargando notificaciones", err);
      }
    },
    [seenToastKey, router],
  );

  useEffect(() => {
    let isMounted = true;
    startTransition(() => {
      void loadCurrencies();
      void loadLiveRates();
      void loadNotifications(dismissedNotifIds);
    });

    // Polling rápido cada 5 segundos cuando la pestaña está activa
    const notifInterval = window.setInterval(() => {
      if (
        isMounted &&
        (typeof document === "undefined" ||
          document.visibilityState === "visible")
      ) {
        void loadNotifications(dismissedNotifIds);
      }
    }, 5000);

    const ratesInterval = window.setInterval(() => {
      if (isMounted) {
        void loadLiveRates();
      }
    }, 60000);

    const handleExternalRateUpdate = () => {
      if (isMounted) {
        void loadLiveRates();
        void loadCurrencies();
      }
    };

    const handleImmediateNotifRefresh = () => {
      if (isMounted) {
        void loadNotifications(dismissedNotifIds);
      }
    };

    const handleVisibilityOrFocus = () => {
      if (
        isMounted &&
        (typeof document === "undefined" ||
          document.visibilityState === "visible")
      ) {
        void loadNotifications(dismissedNotifIds);
      }
    };

    window.addEventListener(
      "idi:exchange-rate-updated",
      handleExternalRateUpdate,
    );
    window.addEventListener(
      "idi:notifications-refresh",
      handleImmediateNotifRefresh,
    );
    window.addEventListener("focus", handleVisibilityOrFocus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("idi_realtime_notifications");
      bc.onmessage = () => {
        if (isMounted) {
          void loadNotifications(dismissedNotifIds);
        }
      };
    } catch {
      // BroadcastChannel no disponible
    }

    return () => {
      isMounted = false;
      window.clearInterval(notifInterval);
      window.clearInterval(ratesInterval);
      window.removeEventListener(
        "idi:exchange-rate-updated",
        handleExternalRateUpdate,
      );
      window.removeEventListener(
        "idi:notifications-refresh",
        handleImmediateNotifRefresh,
      );
      window.removeEventListener("focus", handleVisibilityOrFocus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      if (bc) {
        bc.close();
      }
    };
  }, [loadCurrencies, loadLiveRates, loadNotifications, dismissedNotifIds]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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

  const handleDismissNotification = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const updated = Array.from(new Set([...dismissedNotifIds, id]));
    setDismissedNotifIds(updated);
    persistDismissed(updated);
    void loadNotifications(updated);
  };

  const handleDismissAll = () => {
    const allCurrentIds = notifications.map((n) => n.id);
    const updated = Array.from(
      new Set([...dismissedNotifIds, ...allCurrentIds]),
    );
    setDismissedNotifIds(updated);
    persistDismissed(updated);
    void loadNotifications(updated);
  };

  const handleSelectNotification = (notif: SystemNotification) => {
    handleDismissNotification(notif.id);
    setNotificationsOpen(false);
    router.push(notif.link);
  };

  const handleLogout = () => {
    AuthService.logout();
  };

  const vesItem = currencies.find((c) => c.code === "VES" || c.code === "VED");
  const eurItem = currencies.find((c) => c.code === "EUR");
  const vesRate =
    liveRates.usd ?? (vesItem?.latestRate ? Number(vesItem.latestRate) : null);
  const eurRate =
    liveRates.eur ?? (eurItem?.latestRate ? Number(eurItem.latestRate) : null);

  const handleOpenRateModal = async () => {
    let currList = currencies;
    if (currList.length === 0) {
      currList = await loadCurrencies();
    }

    if (!currList || currList.length === 0) {
      currList = [
        {
          id: 2,
          code: "VES",
          name: "Bolívar Digital",
          symbol: "Bs.",
          isDefault: false,
          latestRate: liveRates.usd ?? 75.0,
          effectiveDate: liveRates.effectiveDate,
        },
        {
          id: 3,
          code: "EUR",
          name: "Euro",
          symbol: "€",
          isDefault: false,
          latestRate: liveRates.eur ?? 81.5,
          effectiveDate: liveRates.effectiveDate,
        },
      ];
      setCurrencies(currList);
    }

    const target =
      currList.find((c) => c.code === "VES" || c.code === "VED") ||
      currList.find((c) => !c.isDefault && c.code !== "USD") ||
      currList[0];

    if (target) {
      setSelectedCurrencyId(target.id);
      const initialVal =
        (target.code === "VES" || target.code === "VED") && liveRates.usd
          ? String(liveRates.usd)
          : target.code === "EUR" && liveRates.eur
            ? String(liveRates.eur)
            : target.latestRate
              ? String(target.latestRate)
              : "";
      setNewRate(initialVal);
    }
    setShowRateModal(true);
  };

  const handleCurrencySelectionChange = (currId: number) => {
    setSelectedCurrencyId(currId);
    const curr = currencies.find((c) => c.id === currId);
    if (curr) {
      if ((curr.code === "VES" || curr.code === "VED") && liveRates.usd) {
        setNewRate(String(liveRates.usd));
      } else if (curr.code === "EUR" && liveRates.eur) {
        setNewRate(String(liveRates.eur));
      } else {
        setNewRate(curr.latestRate ? String(curr.latestRate) : "");
      }
    }
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedRate = parseFloat(newRate);
    if (!newRate || isNaN(parsedRate) || parsedRate <= 0) {
      toast.error("Ingresa una tasa válida mayor a 0.");
      return;
    }

    const targetCurr =
      currencies.find((c) => c.id === Number(selectedCurrencyId)) ||
      currencies.find((c) => c.code === "VES" || c.code === "VED") ||
      currencies[0];

    const currencyId = targetCurr ? targetCurr.id : Number(selectedCurrencyId);
    const currencyCode = targetCurr?.code ?? "VES";

    setSubmittingRate(true);
    try {
      const payload = {
        currencyId: currencyId ? Number(currencyId) : undefined,
        code: currencyCode,
        rate: parsedRate,
        ...(currencyCode === "VES" || currencyCode === "VED"
          ? { usdRate: parsedRate }
          : currencyCode === "EUR"
            ? { eurRate: parsedRate }
            : {}),
      };

      await CurrencyService.registerRate(payload);

      setShowRateModal(false);
      setNewRate("");

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("idi:exchange-rate-updated", {
            detail: {
              currencyId,
              code: currencyCode,
              rate: parsedRate,
            },
          }),
        );
      }

      toast.success("Tasa de cambio actualizada.");
      void Promise.all([loadCurrencies(), loadLiveRates()]);
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error
          ? err.message
          : "Error al actualizar la tasa de cambio.";
      toast.error(errMsg);
    } finally {
      setSubmittingRate(false);
    }
  };

  const primaryRole = user?.roles?.[0] ?? "PERSONAL";

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

  const isDashboard =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  return (
    <>
      <header className="h-15 bg-card/90 backdrop-blur-md border-b border-border px-3 sm:px-4 lg:px-6 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30">
        {/* ========================================================
            IZQUIERDA: BREADCRUMB COMPACTO, 100% RESPONSIVE E INTERACTIVO
           ======================================================== */}
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 max-w-[62%] sm:max-w-[68%] lg:max-w-[72%]">
          {/* Botón móvil para abrir sidebar */}
          <button
            type="button"
            onClick={onOpenSidebar}
            className="lg:hidden p-1.5 sm:p-2 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer shrink-0"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>

          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1 sm:gap-1.5 min-w-0 text-xs overflow-hidden"
          >
            {/* 1. Raíz: Dashboard */}
            <Link
              href="/dashboard"
              title="Dashboard"
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg font-semibold transition-all cursor-pointer shrink-0",
                isDashboard
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/70",
              )}
            >
              <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline">Dashboard</span>
            </Link>

            {/* En Dashboard: selector rápido para saltar a cualquier módulo */}
            {isDashboard && allowedGroups.length > 0 && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      title="Módulos del Sistema"
                      className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer shrink-0"
                    >
                      <Package className="w-3.5 h-3.5 shrink-0 text-primary/80" />
                      <span className="hidden lg:inline">Módulos</span>
                      <ChevronDown className="w-3 h-3 opacity-70 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    sideOffset={6}
                    className="w-52 rounded-2xl p-1.5 border-border/80 shadow-xl"
                  >
                    <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                      Módulos del Sistema
                    </DropdownMenuLabel>
                    {allowedGroups.map((g) => {
                      const GroupIcon = g.icon;
                      const firstHref = g.subModules[0]?.href || "/dashboard";
                      return (
                        <DropdownMenuItem key={g.id} asChild>
                          <Link
                            href={firstHref}
                            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer"
                          >
                            <GroupIcon className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>{g.label}</span>
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}

            {/* 2. Módulo Padre + Submódulo interactivo */}
            {activeNavigation && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />

                {/* Dropdown Módulo Padre: en responsive es solo ÍCONO + chevron */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors cursor-pointer shrink-0"
                      title={`Área: ${activeNavigation.group.label}`}
                    >
                      <activeNavigation.group.icon className="w-3.5 h-3.5 text-primary/80 shrink-0" />
                      <span className="hidden lg:inline truncate">{activeNavigation.group.label}</span>
                      <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    sideOffset={6}
                    className="w-52 rounded-2xl p-1.5 border-border/80 shadow-xl"
                  >
                    <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                      Cambiar Área
                    </DropdownMenuLabel>
                    {allowedGroups.map((g) => {
                      const GroupIcon = g.icon;
                      const isCurrentGroup =
                        g.id === activeNavigation.group.id;
                      const firstHref = g.subModules[0]?.href || "/dashboard";
                      return (
                        <DropdownMenuItem key={g.id} asChild>
                          <Link
                            href={firstHref}
                            className={cn(
                              "flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer",
                              isCurrentGroup &&
                                "bg-primary/10 text-primary font-bold",
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <GroupIcon className="w-3.5 h-3.5 shrink-0" />
                              <span>{g.label}</span>
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {g.subModules.length}
                            </span>
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>

                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />

                {/* Submódulo actual (en azul): en responsive es solo ÍCONO + chevron */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 lg:gap-1.5 px-2 lg:px-2.5 py-1 rounded-xl bg-primary/10 text-primary border border-primary/20 font-bold hover:bg-primary/15 transition-colors cursor-pointer shrink-0"
                      title={`Submódulo: ${activeNavigation.subModule.label}`}
                    >
                      <activeNavigation.subModule.icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden lg:inline truncate">{activeNavigation.subModule.label}</span>
                      <ChevronDown className="w-3 h-3 opacity-75 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    sideOffset={6}
                    className="w-54 rounded-2xl p-1.5 border-border/80 shadow-xl"
                  >
                    <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                      {activeNavigation.group.label}
                    </DropdownMenuLabel>
                    {activeNavigation.group.subModules.map((sub) => {
                      const SubIcon = sub.icon;
                      const isActiveSub =
                        sub.href === activeNavigation.subModule.href;
                      return (
                        <DropdownMenuItem key={sub.href} asChild>
                          <Link
                            href={sub.href}
                            className={cn(
                              "flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors",
                              isActiveSub
                                ? "bg-primary/10 text-primary font-bold"
                                : "text-muted-foreground hover:text-foreground",
                            )}
                          >
                            <SubIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{sub.label}</span>
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* 3. Nivel de Sub-página (ej. "Nuevo" o "Detalle #12"): en responsive muestra solo el ícono/código */}
                {activeNavigation.trailingLabel && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                    <span
                      title={activeNavigation.trailingLabel}
                      className="px-2 py-0.5 rounded-lg bg-muted/60 border border-border/60 font-semibold text-foreground text-xs shrink-0 inline-flex items-center gap-1"
                    >
                      {activeNavigation.trailingLabel === "Nuevo" ? (
                        <>
                          <Pencil className="w-3 h-3 lg:hidden text-primary shrink-0" />
                          <span className="hidden lg:inline">Nuevo</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-3 h-3 lg:hidden text-muted-foreground shrink-0" />
                          <span className="lg:hidden font-mono text-[11px]">
                            {activeNavigation.trailingLabel.replace(/Detalle\s*/i, "#")}
                          </span>
                          <span className="hidden lg:inline">{activeNavigation.trailingLabel}</span>
                        </>
                      )}
                    </span>
                  </>
                )}
              </>
            )}
          </nav>
        </div>

        {/* ========================================================
            DERECHA: TASAS BCV/EUR + NOTIFICACIONES + USUARIO
           ======================================================== */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 ml-auto">
          {/* Tasas BCV y EUR (Adaptables: solo ícono en responsive) */}
          <div
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 bg-muted/40 border border-border/80 rounded-xl text-xs"
            title={
              liveRates.effectiveDate
                ? `Tasa BCV vigente: ${vesRate ? `${vesRate.toFixed(2)} Bs.` : "---"} (${liveRates.effectiveDate})`
                : "Tasas de cambio"
            }
          >
            <Coins className="w-3.5 h-3.5 text-emerald-600 shrink-0" />

            <div className="hidden sm:flex items-center gap-1 font-mono">
              <span className="text-muted-foreground font-sans font-medium text-[11px]">
                BCV:
              </span>
              <span className="font-bold text-foreground">
                {vesRate ? `${vesRate.toFixed(2)} Bs.` : "---"}
              </span>
            </div>

            <div className="hidden xl:flex items-center gap-2">
              <span className="text-border">|</span>
              <div className="flex items-center gap-1 font-mono">
                <span className="text-muted-foreground font-sans font-medium text-[11px]">
                  EUR:
                </span>
                <span className="font-bold text-foreground">
                  {eurRate ? `${eurRate.toFixed(2)}` : "---"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-0.5 ml-0.5 sm:pl-1.5 sm:border-l border-border/80">
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={refreshingRates}
                className="p-1 text-muted-foreground hover:text-primary rounded-md hover:bg-background transition-colors cursor-pointer disabled:opacity-50"
                title="Actualizar tasas"
              >
                <RefreshCw
                  className={`w-3 h-3 ${refreshingRates ? "animate-spin text-primary" : ""}`}
                />
              </button>

              {canEditRate && (
                <button
                  type="button"
                  onClick={handleOpenRateModal}
                  className="p-1 text-muted-foreground hover:text-emerald-600 rounded-md hover:bg-background transition-colors cursor-pointer"
                  title="Editar tasa manualmente"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Notificaciones en Tiempo Real */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen((prev) => !prev);
                setBellPulse(false);
              }}
              className={cn(
                "relative p-2 rounded-xl transition-all cursor-pointer",
                bellPulse
                  ? "bg-primary/15 text-primary ring-2 ring-primary/30"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
              title="Notificaciones en tiempo real"
            >
              <Bell className={cn("w-4 h-4", bellPulse && "animate-bounce")} />
              {notifications.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold font-mono flex items-center justify-center shadow-xs">
                  {notifications.length > 9 ? "9+" : notifications.length}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-card rounded-2xl shadow-xl border border-border z-50 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/40">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-foreground">
                      Notificaciones
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                      {notifications.length}
                    </span>
                  </div>

                  {notifications.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDismissAll}
                      className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Limpiar
                    </button>
                  )}
                </div>

                <div className="max-h-95 overflow-y-auto divide-y divide-border overscroll-contain">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground space-y-1.5">
                      <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto opacity-80" />
                      <p className="font-semibold text-foreground">
                        Sin notificaciones
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Todo está al día.
                      </p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleSelectNotification(notif)}
                        className="group relative w-full text-left p-3.5 hover:bg-muted/50 transition-colors flex items-start gap-3 cursor-pointer"
                      >
                        {getNotifIcon(notif.type)}

                        <div className="flex-1 min-w-0 pr-6">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-bold text-foreground truncate">
                              {notif.title}
                            </p>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                            {notif.message}
                          </p>
                          {notif.createdAt && (
                            <span className="inline-block text-[10px] font-mono text-muted-foreground/80 mt-1">
                              {formatRelativeTime(notif.createdAt)}
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) =>
                            handleDismissNotification(notif.id, e)
                          }
                          className="absolute right-3 top-3 p-1 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors cursor-pointer"
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

          <div className="hidden md:block w-px h-5 bg-border" />

          {/* Menú de Usuario */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-accent/80 border-0 outline-none focus:outline-none transition-all text-left cursor-pointer"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xs">
                    {user?.fullName?.charAt(0) ||
                      user?.username?.charAt(0) ||
                      "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col leading-tight pr-0.5">
                  <span className="text-xs font-semibold text-foreground truncate max-w-36">
                    {user?.fullName || user?.username}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate max-w-36">
                    {user?.department ?? primaryRole.replace(/_/g, " ")}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-56 border border-border/80 shadow-xl bg-card rounded-2xl p-1.5"
            >
              <DropdownMenuLabel className="font-normal px-2.5 py-2">
                <p className="text-xs font-bold text-foreground truncate">
                  {user?.fullName || user?.username}
                </p>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {user?.email}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-1" />
              <div className="px-2.5 py-1.5 space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {user?.department ?? "General"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate font-medium text-foreground">
                    {primaryRole.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 focus:text-rose-700 focus:bg-rose-50 font-semibold cursor-pointer rounded-xl px-2.5 py-2 transition-colors text-xs"
              >
                <LogOut className="w-3.5 h-3.5 mr-2 shrink-0" />
                <span>Cerrar sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Modal para actualizar tasa de cambio */}
      <Dialog open={showRateModal} onOpenChange={setShowRateModal}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Coins className="w-5 h-5 text-emerald-600" />
              <span>Ajustar Tasa de Cambio</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Actualiza el valor oficial con respecto a $1 USD.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRate} className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">
                Moneda
              </label>
              <select
                value={selectedCurrencyId}
                onChange={(e) =>
                  handleCurrencySelectionChange(Number(e.target.value))
                }
                className="w-full text-xs border border-input rounded-xl p-2.5 focus:ring-2 focus:ring-primary outline-none text-foreground bg-background"
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
              <label className="block text-xs font-semibold text-foreground mb-1">
                Tasa por 1 USD
              </label>
              <Input
                type="number"
                step="0.0001"
                required
                placeholder="Ej: 75.0000"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                className="font-mono text-xs rounded-xl"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowRateModal(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="success"
                size="sm"
                disabled={submittingRate}
              >
                {submittingRate && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>Guardar</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
