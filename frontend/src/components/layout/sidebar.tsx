"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/types/auth";
import {
  LayoutDashboard,
  Package,
  FileText,
  FlaskConical,
  Snowflake,
  ShoppingCart,
  ShieldAlert,
  Settings,
  X,
  SlidersHorizontal,
  Building2,
  ClipboardList,
  Shield,
  ChevronDown,
  Wallet,
  BarChart3,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  History,
  FileSpreadsheet,
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
    label: "Solicitudes Internas",
    href: "/requests",
    icon: ClipboardList,
    roles: [
      "ADMINISTRADOR",
      "ALMACENISTA",
      "LABORATORIO",
      "SOLICITANTE",
    ],
  },
  {
    groupLabel: "OPERACIONES",
    label: "Inventario & Stock",
    icon: Package,
    roles: ["ADMINISTRADOR", "ALMACENISTA", "COMPRAS"],
    children: [
      {
        label: "Catálogo & Lotes",
        href: "/inventory/products",
        icon: Package,
        roles: ["ADMINISTRADOR", "ALMACENISTA", "COMPRAS"],
      },
      {
        label: "Ajustes & Mermas",
        href: "/inventory/adjustments",
        icon: SlidersHorizontal,
        roles: ["ADMINISTRADOR", "ALMACENISTA"],
      },
      {
        label: "Incidencias & Cuarentena",
        href: "/quality/quarantine",
        icon: ShieldAlert,
        roles: ["ADMINISTRADOR", "ALMACENISTA", "LABORATORIO"],
      },
    ],
  },
  {
    label: "Laboratorio Clínico",
    icon: FlaskConical,
    roles: ["ADMINISTRADOR", "LABORATORIO"],
    children: [
      {
        label: "Consumo de Reactivos",
        href: "/laboratory/consumption",
        icon: FlaskConical,
        roles: ["ADMINISTRADOR", "LABORATORIO"],
      },
      {
        label: "Cadena de Frío & Cavas",
        href: "/laboratory/fridges",
        icon: Snowflake,
        roles: ["ADMINISTRADOR", "LABORATORIO"],
      },
    ],
  },
  {
    groupLabel: "GESTIÓN & FINANZAS",
    label: "Compras",
    icon: ShoppingCart,
    roles: ["ADMINISTRADOR", "COMPRAS", "ADMINISTRACION"],
    children: [
      {
        label: "Órdenes de Compra",
        href: "/purchasing/orders",
        icon: ShoppingCart,
        roles: ["ADMINISTRADOR", "COMPRAS", "ADMINISTRACION"],
      },
      {
        label: "Preórdenes de Compra",
        href: "/purchasing/requisitions",
        icon: FileText,
        roles: ["ADMINISTRADOR", "COMPRAS", "ADMINISTRACION"],
      },
      {
        label: "Directorio de Proveedores",
        href: "/purchasing/suppliers",
        icon: Building2,
        roles: ["ADMINISTRADOR", "COMPRAS"],
      },
    ],
  },
  {
    label: "Finanzas & Tesorería",
    icon: Wallet,
    roles: ["ADMINISTRADOR", "COMPRAS", "ADMINISTRACION"],
    children: [
      {
        label: "Cuentas por Pagar & Deudas",
        href: "/purchasing/debts",
        icon: FileSpreadsheet,
        roles: ["ADMINISTRADOR", "COMPRAS", "ADMINISTRACION"],
      },
      {
        label: "Egresos & Pagos Directos",
        href: "/admin/financial/payments",
        icon: Wallet,
        roles: ["ADMINISTRADOR", "COMPRAS", "ADMINISTRACION"],
      },
    ],
  },
  {
    groupLabel: "ADMINISTRACIÓN",
    label: "Administración Empresarial",
    icon: BarChart3,
    roles: ["ADMINISTRADOR"],
    children: [
      {
        label: "Historial de Movimientos",
        href: "/inventory/kardex",
        icon: History,
        roles: ["ADMINISTRADOR"],
      },
      {
        label: "Reportes & Auditoría",
        href: "/inventory/reports",
        icon: BarChart3,
        roles: ["ADMINISTRADOR"],
      },
    ],
  },
  {
    label: "Configuración del Sistema",
    icon: Settings,
    roles: ["ADMINISTRADOR"],
    children: [
      {
        label: "Usuarios y Accesos",
        href: "/admin/users",
        icon: Users,
        roles: ["ADMINISTRADOR"],
      },
      {
        label: "Seguridad y Auditoría Técnica",
        href: "/admin/security",
        icon: Shield,
        roles: ["ADMINISTRADOR"],
      },
      {
        label: "Maestros del Sistema",
        href: "/inventory/settings",
        icon: SlidersHorizontal,
        roles: ["ADMINISTRADOR"],
      },
    ],
  },
];

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
  const groupActive = allowedChildren.some(
    (c) => pathname === c.href || pathname.startsWith(`${c.href}/`),
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <Tooltip open={open ? false : undefined}>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center transition-colors cursor-pointer relative",
                groupActive
                  ? "text-blue-400 bg-blue-950/50 border border-blue-500/30 shadow-xs"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200",
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {groupActive && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-slate-950" />
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
        sideOffset={14}
        className="w-60 bg-slate-950 border-slate-800 text-slate-200 shadow-2xl p-1.5 z-50"
      >
        <DropdownMenuLabel className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1.5 border-b border-slate-800/80 mb-1">
          {item.label}
        </DropdownMenuLabel>
        <div className="space-y-0.5">
          {allowedChildren.map((subItem) => {
            const SubIcon = subItem.icon;
            const subActive =
              pathname === subItem.href ||
              pathname.startsWith(`${subItem.href}/`);
            return (
              <DropdownMenuItem key={subItem.href} asChild>
                <Link
                  href={subItem.href}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors",
                    subActive
                      ? "bg-blue-600 text-white font-semibold shadow-xs"
                      : "text-slate-300 hover:bg-slate-900 hover:text-white",
                  )}
                >
                  <SubIcon className="w-3.5 h-3.5 shrink-0 opacity-80" />
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
  const isActive =
    pathname === item.href ||
    (item.href !== "/dashboard" && pathname.startsWith(`${item.href ?? ""}/`));

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={item.href ?? "#"}
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center transition-colors cursor-pointer relative",
            isActive
              ? "bg-blue-600 text-white shadow-xs font-semibold"
              : "text-slate-400 hover:bg-slate-900 hover:text-slate-200",
          )}
        >
          <Icon className="w-4 h-4 shrink-0" />
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

  const isAllowed = (itemRoles?: string[]) => {
    if (!itemRoles || itemRoles.length === 0) return true;
    if (!user?.roles) return false;
    return itemRoles.some((role) => user.roles.includes(role));
  };

  const isChildActive = (children?: SubItem[]) => {
    if (!children) return false;
    return children.some(
      (c) => pathname === c.href || pathname.startsWith(`${c.href}/`),
    );
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

  return (
    <TooltipProvider delayDuration={150}>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden no-print print:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 h-full shrink-0 bg-slate-950 text-slate-300 flex flex-col border-r border-slate-800/80 transition-all duration-300 ease-in-out lg:static lg:translate-x-0 overflow-x-hidden no-print print:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full",
          isCollapsed
            ? "w-[72px] min-w-[72px] max-w-[72px]"
            : "w-[270px] min-w-[270px] max-w-[270px]",
        )}
      >
        {/* Encabezado */}
        <div
          className={cn(
            "h-16 shrink-0 flex items-center border-b border-slate-800/80 bg-slate-950 transition-all",
            isCollapsed ? "justify-center px-2" : "justify-between px-5",
          )}
        >
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-800 flex items-center justify-center text-slate-300 hover:text-white transition-all cursor-pointer group"
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
                    <PanelLeftOpen className="w-4 h-4 text-blue-400 hidden group-hover:block" />
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="bg-slate-900 border-slate-800 text-slate-100 text-xs font-medium z-50"
              >
                Expandir barra lateral
              </TooltipContent>
            </Tooltip>
          ) : (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white p-1 flex items-center justify-center shadow-md shadow-blue-500/10 shrink-0">
                  <Image
                    src="/logo-icon.svg"
                    alt="Logo IDI"
                    width={24}
                    height={24}
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold tracking-wide text-white leading-tight truncate">
                    ERP-IDI
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono leading-none">
                    v2.0.0
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  title="Guardar barra lateral (Contraer)"
                  className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  title="Cerrar menú"
                  className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Menú de Navegación */}
        <nav
          className={cn(
            "flex-1 py-3 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar",
            isCollapsed ? "px-2" : "px-3",
          )}
        >
          {NAVIGATION_GROUPS.filter((item) => isAllowed(item.roles)).map(
            (item, index) => {
              const Icon = item.icon || Package;

              // Renderizado para Sidebar Colapsado / Compacto (Guardado)
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
                      <div className="flex justify-center">
                        <CollapsedGroupItem
                          item={item}
                          allowedChildren={allowedChildren}
                          pathname={pathname}
                        />
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={item.label} className="space-y-1">
                    {item.groupLabel && index > 0 && (
                      <div className="w-6 mx-auto my-2 border-t border-slate-800/80" />
                    )}
                    <div className="flex justify-center">
                      <CollapsedDirectItem item={item} pathname={pathname} />
                    </div>
                  </div>
                );
              }

              // Renderizado para Sidebar Expandido
              if (item.children) {
                const allowedChildren = item.children.filter((child) =>
                  isAllowed(child.roles),
                );
                if (allowedChildren.length === 0) return null;

                const groupActive = isChildActive(allowedChildren);
                const isExpanded = openGroups[item.label] ?? groupActive;

                return (
                  <div key={item.label} className="space-y-1">
                    {item.groupLabel && (
                      <div className="px-3 pt-3 pb-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                        {item.groupLabel}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleGroup(item.label)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors group cursor-pointer",
                        groupActive
                          ? "text-blue-400 bg-blue-950/30"
                          : "text-slate-400 hover:bg-slate-900 hover:text-slate-200",
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <ChevronDown
                        className={cn(
                          "w-3.5 h-3.5 shrink-0 text-slate-500 transition-transform duration-200",
                          isExpanded && "rotate-180 text-blue-400",
                        )}
                      />
                    </button>

                    {/* Submenú desplegable con guía visual */}
                    {isExpanded && (
                      <div className="pl-3 pr-1 py-1 space-y-0.5 border-l border-slate-800/80 ml-4 my-1">
                        {allowedChildren.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const subActive =
                            pathname === subItem.href ||
                            pathname.startsWith(`${subItem.href}/`);

                          return (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              onClick={() => onClose()}
                              className={cn(
                                "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                                subActive
                                  ? "bg-blue-600 text-white shadow-xs font-semibold"
                                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200",
                              )}
                            >
                              <SubIcon className="w-3.5 h-3.5 shrink-0 opacity-80" />
                              <span className="truncate">{subItem.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Enlace directo simple (Dashboard, Solicitudes Internas)
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(`${item.href ?? ""}/`));

              return (
                <div key={item.label}>
                  {item.groupLabel && (
                    <div className="px-3 pt-3 pb-1 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                      {item.groupLabel}
                    </div>
                  )}
                  <Link
                    href={item.href ?? "#"}
                    onClick={() => onClose()}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                      isActive
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-400 hover:bg-slate-900 hover:text-slate-200",
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </div>
              );
            },
          )}
        </nav>

        {/* Perfil del Usuario Activo */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950 shrink-0">
          {isCollapsed ? (
            <div className="flex justify-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-pointer">
                    <Avatar className="h-9 w-9 border border-blue-500/30">
                      <AvatarFallback className="bg-blue-600/20 text-blue-400 font-bold text-xs">
                        {user?.fullName?.charAt(0) ||
                          user?.username?.charAt(0) ||
                          "U"}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="bg-slate-900 border-slate-800 text-slate-100 p-2 shadow-xl z-50"
                >
                  <p className="text-xs font-bold text-slate-200">
                    {user?.fullName || user?.username || "Usuario"}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {user?.roles?.[0] ?? "Personal"} &bull;{" "}
                    {user?.department ?? "IDI"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/60 border border-slate-800/50">
              <Avatar className="h-8 w-8 border border-blue-500/20">
                <AvatarFallback className="bg-blue-600/20 text-blue-400 font-bold text-xs">
                  {user?.fullName?.charAt(0) ||
                    user?.username?.charAt(0) ||
                    "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-medium text-slate-200 truncate">
                  {user?.fullName || user?.username || "Usuario"}
                </span>
                <span className="text-[10px] text-slate-500 truncate">
                  {user?.roles?.[0] ?? "Personal"} &bull;{" "}
                  {user?.department ?? "IDI"}
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
