"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AuthService } from "@/services/auth.service";
import type { AuthUser } from "@/types/auth";
import {
  LayoutDashboard,
  Package,
  FileText,
  ShoppingCart,
  ShieldAlert,
  Settings,
  X,
  SlidersHorizontal,
  Building2,
  ClipboardList,
  ChevronDown,
  Wallet,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  History,
  FileSpreadsheet,
  PackageCheck,
  Clock,
  Database,
  LogOut,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface SubItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

interface NavGroup {
  groupLabel?: string;
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  children?: SubItem[];
}

const NAVIGATION_GROUPS: NavGroup[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    groupLabel: "ALMACÉN",
    label: "Inventario",
    icon: Package,
    roles: ["ADMINISTRADOR", "ALMACENISTA", "COMPRAS"],
    children: [
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
    children: [
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
    groupLabel: "COMPRAS Y PAGOS",
    label: "Compras",
    icon: ShoppingCart,
    roles: ["ADMINISTRADOR", "COMPRAS", "ADMINISTRACION"],
    children: [
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
    label: "Pagos",
    icon: Wallet,
    roles: ["ADMINISTRADOR", "COMPRAS", "ADMINISTRACION"],
    children: [
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
    groupLabel: "ADMINISTRACIÓN",
    label: "Auditoría",
    icon: BarChart3,
    roles: ["ADMINISTRADOR", "ADMINISTRACION", "COORDINADOR"],
    children: [
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
    label: "Ajustes",
    icon: Settings,
    roles: ["ADMINISTRADOR"],
    children: [
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

// Evita que "/requests" se marque activo cuando estamos en "/requests/dispatch"
function isHrefActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/dashboard") return false;
  if (href === "/requests" && pathname.startsWith("/requests/dispatch")) {
    return false;
  }
  return pathname.startsWith(`${href}/`);
}

interface SidebarProps {
  user: AuthUser | null;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface CollapsedGroupItemProps {
  item: NavGroup;
  allowedChildren: SubItem[];
  pathname: string;
}

function CollapsedGroupItem({
  item,
  allowedChildren,
  pathname,
}: CollapsedGroupItemProps) {
  const [open, setOpen] = useState(false);
  const Icon = item.icon || Package;
  const groupActive = allowedChildren.some((c) => isHrefActive(pathname, c.href));

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <Tooltip open={open ? false : undefined}>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "w-10 h-10 mx-auto rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer relative group",
                groupActive
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-semibold"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-100 hover:scale-105",
              )}
            >
              <Icon className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-105" />
              {groupActive && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-white" />
              )}
            </button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          className="bg-slate-900 border-slate-800 text-slate-100 text-xs font-medium z-50"
        >
          {item.label}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        side="right"
        align="start"
        sideOffset={8}
        className="w-52 bg-slate-950 border-slate-800 text-slate-200 p-1.5 shadow-xl z-50"
      >
        <DropdownMenuLabel className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
          {item.label}
        </DropdownMenuLabel>
        <div className="space-y-0.5">
          {allowedChildren.map((subItem) => {
            const SubIcon = subItem.icon;
            const subActive = isHrefActive(pathname, subItem.href);
            return (
              <DropdownMenuItem key={subItem.href} asChild>
                <Link
                  href={subItem.href}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-150",
                    subActive
                      ? "bg-blue-600 text-white font-semibold shadow-xs"
                      : "text-slate-300 hover:bg-slate-900 hover:text-white hover:translate-x-0.5",
                  )}
                >
                  <SubIcon className="w-3.5 h-3.5 shrink-0 opacity-85" />
                  <span>{subItem.label}</span>
                </Link>
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface CollapsedDirectItemProps {
  item: NavGroup;
  pathname: string;
}

function CollapsedDirectItem({ item, pathname }: CollapsedDirectItemProps) {
  const Icon = item.icon || Package;
  const isActive = isHrefActive(pathname, item.href ?? "");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={item.href ?? "#"}
          className={cn(
            "w-10 h-10 mx-auto rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer relative group",
            isActive
              ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-semibold"
              : "text-slate-400 hover:bg-slate-900 hover:text-slate-100 hover:scale-105",
          )}
        >
          <Icon className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-105" />
        </Link>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        className="bg-slate-900 border-slate-800 text-slate-100 text-xs font-medium z-50"
      >
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}

export function Sidebar({
  user,
  isOpen,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const pathname = usePathname();

  const isBioanalystOnly =
    Boolean(user?.roles?.includes("BIOANALISTA")) &&
    !user?.roles?.includes("ADMINISTRADOR") &&
    !user?.roles?.includes("COORDINADOR") &&
    !user?.roles?.includes("COORDINADOR_LABORATORIO");

  const isAllowed = (itemRoles?: string[]) => {
    if (!itemRoles || itemRoles.length === 0) return true;
    if (!user?.roles) return false;
    return itemRoles.some((role) => user.roles.includes(role));
  };

  const isGroupAllowedForUser = (group: NavGroup) => {
    if (isBioanalystOnly) {
      if (
        group.groupLabel === "COMPRAS Y PAGOS" ||
        group.groupLabel === "ADMINISTRACIÓN" ||
        group.label === "Ajustes"
      ) {
        return false;
      }
    }
    return isAllowed(group.roles);
  };

  const isChildActive = (children?: SubItem[]) => {
    if (!children) return false;
    return children.some((c) => isHrefActive(pathname, c.href));
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    NAVIGATION_GROUPS.forEach((item) => {
      if (item.children) {
        initialState[item.label] = isChildActive(item.children);
      }
    });
    return initialState;
  });

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const primaryRoleLabel = () => {
    if (isBioanalystOnly) return "Bioanalista";
    if (!user?.roles || user.roles.length === 0) return "Usuario";
    if (user.roles.includes("ADMINISTRADOR")) return "Administrador";
    if (user.roles.includes("COORDINADOR")) return "Coordinador";
    if (user.roles.includes("ALMACENISTA")) return "Almacén";
    if (user.roles.includes("COMPRAS")) return "Compras";
    if (user.roles.includes("ADMINISTRACION")) return "Pagos";
    return user.department || "Solicitante";
  };

  return (
    <TooltipProvider delayDuration={150}>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden no-print print:hidden animate-in fade-in duration-200"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 h-full shrink-0 bg-slate-950 text-slate-300 flex flex-col border-r border-slate-800/80 transition-all duration-300 ease-in-out lg:static lg:translate-x-0 overflow-x-hidden no-print print:hidden select-none",
          isOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed
            ? "w-[72px] min-w-[72px] max-w-[72px]"
            : "w-[256px] min-w-[256px] max-w-[256px]",
        )}
      >
        {/* ========================================================
            ENCABEZADO
           ======================================================== */}
        <div
          className={cn(
            "h-15 shrink-0 flex items-center border-b border-slate-800/80 bg-slate-950 transition-all",
            isCollapsed ? "justify-center px-2" : "justify-between px-4",
          )}
        >
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-all duration-200 cursor-pointer group"
                >
                  <div className="relative flex items-center justify-center w-full h-full">
                    <div className="w-6 h-6 rounded-md bg-white p-0.5 flex items-center justify-center shadow-xs group-hover:hidden">
                      <Image
                        src="/logo-icon.svg"
                        alt="Logo IDI"
                        width={20}
                        height={20}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <PanelLeftOpen className="w-4 h-4 text-blue-400 hidden group-hover:block animate-in zoom-in-75 duration-150" />
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="bg-slate-900 border-slate-800 text-slate-100 text-xs font-medium z-50"
              >
                Expandir menú (Ctrl+B)
              </TooltipContent>
            </Tooltip>
          ) : (
            <>
              <Link
                href="/dashboard"
                className="flex items-center gap-2.5 min-w-0 group"
              >
                <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shadow-md shadow-blue-500/10 shrink-0 transition-transform duration-200 group-hover:scale-105">
                  <Image
                    src="/logo-icon.svg"
                    alt="Logo IDI"
                    width={24}
                    height={24}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold tracking-tight text-white leading-tight truncate">
                    ERP-IDI
                  </span>
                  <span className="text-[11px] text-slate-400 leading-none mt-0.5 truncate">
                    Sistema de Gestión
                  </span>
                </div>
              </Link>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  title="Contraer menú (Ctrl+B)"
                  className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  title="Cerrar menú"
                  className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* ========================================================
            MENÚ DE NAVEGACIÓN CON ACORDEONES ANIMADOS
           ======================================================== */}
        <nav
          className={cn(
            "flex-1 py-3 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar",
            isCollapsed ? "px-2" : "px-3",
          )}
        >
          {NAVIGATION_GROUPS.filter((item) => isGroupAllowedForUser(item)).map(
            (item, index) => {
              const Icon = item.icon || Package;

              // Sidebar Contraído
              if (isCollapsed) {
                if (item.children) {
                  const allowedChildren = item.children.filter((child) =>
                    isAllowed(child.roles),
                  );
                  if (allowedChildren.length === 0) return null;

                  return (
                    <div key={item.label} className="space-y-1">
                      {item.groupLabel && index > 0 && (
                        <div className="w-6 mx-auto my-2 border-t border-slate-800/80" />
                      )}
                      <CollapsedGroupItem
                        item={item}
                        allowedChildren={allowedChildren}
                        pathname={pathname}
                      />
                    </div>
                  );
                }

                return (
                  <div key={item.label} className="space-y-1">
                    {item.groupLabel && index > 0 && (
                      <div className="w-6 mx-auto my-2 border-t border-slate-800/80" />
                    )}
                    <CollapsedDirectItem item={item} pathname={pathname} />
                  </div>
                );
              }

              // Sidebar Expandido con Acordeón Animado
              if (item.children) {
                const allowedChildren = item.children.filter((child) =>
                  isAllowed(child.roles),
                );
                if (allowedChildren.length === 0) return null;

                const isOpenGroup = Boolean(openGroups[item.label]);
                const groupActive = isChildActive(allowedChildren);

                return (
                  <div key={item.label} className="space-y-0.5">
                    {item.groupLabel && (
                      <div className="px-3 pt-3.5 pb-1 text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono">
                        {item.groupLabel}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleGroup(item.label)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer select-none group",
                        groupActive
                          ? "text-blue-400 bg-blue-950/30 font-semibold"
                          : "text-slate-300 hover:bg-slate-900/90 hover:text-white",
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={cn(
                            "w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-105",
                            groupActive
                              ? "text-blue-400"
                              : "text-slate-400 group-hover:text-slate-200",
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <ChevronDown
                        className={cn(
                          "w-3.5 h-3.5 shrink-0 transition-transform duration-250 ease-out text-slate-400",
                          isOpenGroup && "rotate-180 text-white",
                        )}
                      />
                    </button>

                    {/* Acordeón con animación suave de despliegue */}
                    <div
                      className={cn(
                        "grid transition-all duration-250 ease-out",
                        isOpenGroup
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0 pointer-events-none",
                      )}
                    >
                      <div className="overflow-hidden">
                        <div className="pl-5 pr-1 py-1 space-y-0.5 border-l border-slate-800/80 ml-5 my-0.5">
                          {allowedChildren.map((subItem) => {
                            const SubIcon = subItem.icon;
                            const subActive = isHrefActive(
                              pathname,
                              subItem.href,
                            );
                            return (
                              <Link
                                key={subItem.href}
                                href={subItem.href}
                                onClick={() => {
                                  if (isOpen) onClose();
                                }}
                                className={cn(
                                  "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer group/sub",
                                  subActive
                                    ? "bg-blue-600 text-white font-semibold shadow-xs"
                                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/90 hover:translate-x-0.5",
                                )}
                              >
                                <SubIcon
                                  className={cn(
                                    "w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover/sub:scale-105",
                                    subActive
                                      ? "text-white"
                                      : "opacity-80 group-hover/sub:opacity-100",
                                  )}
                                />
                                <span className="truncate">
                                  {subItem.label}
                                </span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }

              const isActive = isHrefActive(pathname, item.href ?? "");

              return (
                <div key={item.label} className="space-y-0.5">
                  {item.groupLabel && (
                    <div className="px-3 pt-3.5 pb-1 text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono">
                      {item.groupLabel}
                    </div>
                  )}
                  <Link
                    href={item.href ?? "#"}
                    onClick={() => {
                      if (isOpen) onClose();
                    }}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 cursor-pointer group",
                      isActive
                        ? "bg-blue-600 text-white font-semibold shadow-xs"
                        : "text-slate-300 hover:bg-slate-900/90 hover:text-white",
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-105" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </div>
              );
            },
          )}
        </nav>

        {/* ========================================================
            PIE DE USUARIO + CIERRE DE SESIÓN
           ======================================================== */}
        <div
          className={cn(
            "p-3 border-t border-slate-800/80 bg-slate-950/90 shrink-0",
            isCollapsed && "flex justify-center p-2",
          )}
        >
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => AuthService.logout()}
                  className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 hover:bg-rose-950/30 text-slate-300 hover:text-rose-300 flex items-center justify-center transition-all duration-200 cursor-pointer group"
                >
                  <span className="text-xs font-bold group-hover:hidden">
                    {user?.fullName?.charAt(0) || "U"}
                  </span>
                  <LogOut className="w-4 h-4 hidden group-hover:block animate-in zoom-in-75 duration-150" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="bg-slate-900 border-slate-800 text-slate-100 text-xs z-50"
              >
                <div className="font-semibold">{user?.fullName}</div>
                <div className="text-[11px] text-rose-400">Cerrar sesión</div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar className="w-8 h-8 border border-slate-700 shrink-0">
                  <AvatarFallback className="bg-blue-600 text-white text-xs font-bold">
                    {user?.fullName?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-slate-100 truncate">
                    {user?.fullName || "Usuario"}
                  </span>
                  <span className="text-[11px] text-slate-400 truncate">
                    {primaryRoleLabel()}
                  </span>
                </div>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => AuthService.logout()}
                    className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer shrink-0"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="bg-slate-900 border-slate-800 text-slate-100 text-xs z-50"
                >
                  Cerrar sesión
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
