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
  Microscope,
  GitCommit,
  ClipboardCheck,
  TrendingUp,
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
    groupLabel: "LABORATORIO OPERATIVO",
    label: "Área Operativa",
    icon: FlaskConical,
    roles: [
      "ADMINISTRADOR",
      "LABORATORIO",
      "COORDINADOR_LABORATORIO",
      "COORDINADOR",
      "BIOANALISTA",
    ],
    children: [
      {
        label: "Dashboard de Neveras",
        href: "/lab/dashboard",
        icon: Snowflake,
        roles: ["ADMINISTRADOR", "LABORATORIO", "COORDINADOR_LABORATORIO", "COORDINADOR", "BIOANALISTA"],
      },
      {
        label: "Mis Solicitudes de Insumos",
        href: "/lab/requests",
        icon: ClipboardList,
        roles: ["ADMINISTRADOR", "LABORATORIO", "COORDINADOR_LABORATORIO", "COORDINADOR", "BIOANALISTA"],
      },
      {
        label: "Corridas Semanales",
        href: "/lab/runs",
        icon: FlaskConical,
        roles: ["ADMINISTRADOR", "LABORATORIO", "COORDINADOR_LABORATORIO", "COORDINADOR", "BIOANALISTA"],
      },
      {
        label: "Consumo de Reactivos",
        href: "/laboratory/consumption",
        icon: SlidersHorizontal,
        roles: ["ADMINISTRADOR", "LABORATORIO"],
      },
    ],
  },
  {
    groupLabel: "COORDINACIÓN CLÍNICA",
    label: "Coordinación",
    icon: ClipboardCheck,
    roles: ["ADMINISTRADOR", "COORDINADOR_LABORATORIO", "COORDINADOR", "LABORATORIO"],
    children: [
      {
        label: "Bandeja FEFO de Solicitudes",
        href: "/coordinator/requests",
        icon: ClipboardList,
        roles: ["ADMINISTRADOR", "COORDINADOR_LABORATORIO", "COORDINADOR", "LABORATORIO"],
      },
      {
        label: "Gestión de Cuarentena",
        href: "/coordinator/quarantine",
        icon: ShieldAlert,
        roles: ["ADMINISTRADOR", "COORDINADOR_LABORATORIO", "COORDINADOR", "LABORATORIO"],
      },
      {
        label: "Arqueo Físico de Neveras",
        href: "/coordinator/fridge-audit",
        icon: Snowflake,
        roles: ["ADMINISTRADOR", "COORDINADOR_LABORATORIO", "COORDINADOR", "LABORATORIO", "BIOANALISTA"],
      },
    ],
  },
  {
    groupLabel: "INVESTIGACIÓN & DOCENCIA",
    label: "Investigación",
    icon: Microscope,
    roles: ["ADMINISTRADOR", "INVESTIGACION", "DOCENCIA", "COORDINADOR_LABORATORIO"],
    children: [
      {
        label: "Proyectos & Presupuesto",
        href: "/research/projects",
        icon: Microscope,
        roles: ["ADMINISTRADOR", "INVESTIGACION", "DOCENCIA", "COORDINADOR_LABORATORIO"],
      },
      {
        label: "Donaciones & Stock Blindado",
        href: "/research/donations",
        icon: Package,
        roles: ["ADMINISTRADOR", "INVESTIGACION", "DOCENCIA", "COORDINADOR_LABORATORIO"],
      },
      {
        label: "Bitácora Ensayos & Hallazgos",
        href: "/research/trials",
        icon: FileText,
        roles: ["ADMINISTRADOR", "INVESTIGACION", "DOCENCIA", "COORDINADOR_LABORATORIO", "BIOANALISTA"],
      },
    ],
  },
  {
    groupLabel: "OPERACIONES & ALMACÉN",
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
        label: "Preórdenes de Compra",
        href: "/purchasing/requisitions",
        icon: FileText,
        roles: ["ADMINISTRADOR", "COMPRAS", "ADMINISTRACION"],
      },
      {
        label: "Órdenes de Compra",
        href: "/purchasing/orders",
        icon: ShoppingCart,
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
    groupLabel: "ADMINISTRACIÓN & AUDITORÍA",
    label: "Reportes & Finanzas",
    icon: BarChart3,
    roles: ["ADMINISTRADOR", "ADMINISTRACION", "COORDINADOR_LABORATORIO"],
    children: [
      {
        label: "Costos y Consolidado Financiero",
        href: "/admin/reports",
        icon: TrendingUp,
        roles: ["ADMINISTRADOR", "ADMINISTRACION", "COORDINADOR_LABORATORIO"],
      },
      {
        label: "Trazabilidad Punta a Punta",
        href: "/admin/reports/traceability",
        icon: GitCommit,
        roles: ["ADMINISTRADOR", "ADMINISTRACION", "COORDINADOR_LABORATORIO"],
      },
      {
        label: "Kardex de Movimientos",
        href: "/inventory/kardex",
        icon: History,
        roles: ["ADMINISTRADOR"],
      },
      {
        label: "Auditoría General",
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
                  ? "bg-blue-600 text-white shadow-xs font-semibold"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200",
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {groupActive && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white" />
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
        className="w-56 bg-slate-950 border-slate-800 text-slate-200 p-1.5 shadow-xl z-50"
      >
        <DropdownMenuLabel className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
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

  // Aislamiento por rol: si el usuario es Bioanalista estricto (no Administrador ni Coordinador),
  // se ocultan los módulos financieros y de investigación general
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
        group.groupLabel === "GESTIÓN & FINANZAS" ||
        group.groupLabel === "ADMINISTRACIÓN & AUDITORÍA" ||
        group.groupLabel === "INVESTIGACIÓN & DOCENCIA" ||
        group.label === "Configuración del Sistema"
      ) {
        return false;
      }
    }
    return isAllowed(group.roles);
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
                    v2.5 &bull; Laboratorio & I+D
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
          {NAVIGATION_GROUPS.filter((item) => isGroupAllowedForUser(item)).map(
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

              // Renderizado para Sidebar Expandido
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
                      <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono">
                        {item.groupLabel}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleGroup(item.label)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer select-none",
                        groupActive
                          ? "text-blue-400 bg-blue-950/20 font-semibold"
                          : "text-slate-300 hover:bg-slate-900 hover:text-white",
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <ChevronDown
                        className={cn(
                          "w-3.5 h-3.5 shrink-0 transition-transform duration-200 text-slate-400",
                          isOpenGroup && "rotate-180 text-white",
                        )}
                      />
                    </button>
                    {isOpenGroup && (
                      <div className="pl-6 pr-1 py-0.5 space-y-0.5 border-l border-slate-800/80 ml-5 my-0.5">
                        {allowedChildren.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const subActive =
                            pathname === subItem.href ||
                            pathname.startsWith(`${subItem.href}/`);
                          return (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              className={cn(
                                "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer",
                                subActive
                                  ? "bg-blue-600 text-white font-semibold shadow-xs"
                                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900",
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

              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" &&
                  pathname.startsWith(`${item.href ?? ""}/`));

              return (
                <div key={item.label} className="space-y-0.5">
                  {item.groupLabel && (
                    <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-slate-400 tracking-wider uppercase font-mono">
                      {item.groupLabel}
                    </div>
                  )}
                  <Link
                    href={item.href ?? "#"}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                      isActive
                        ? "bg-blue-600 text-white font-semibold shadow-xs"
                        : "text-slate-300 hover:bg-slate-900 hover:text-white",
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

        {/* Pie de Página de Usuario */}
        <div
          className={cn(
            "p-3 border-t border-slate-800/80 bg-slate-950/80 shrink-0",
            isCollapsed && "flex justify-center p-2",
          )}
        >
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="w-9 h-9 border border-slate-700 cursor-pointer">
                  <AvatarFallback className="bg-slate-800 text-slate-200 text-xs font-semibold">
                    {user?.fullName?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="bg-slate-900 border-slate-800 text-slate-100 text-xs z-50"
              >
                <div className="font-semibold">{user?.fullName}</div>
                <div className="text-[10px] text-slate-400">
                  {user?.roles?.join(", ")}
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-2.5">
              <Avatar className="w-8 h-8 border border-slate-700 shrink-0">
                <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold">
                  {user?.fullName?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-slate-200 truncate">
                  {user?.fullName || "Usuario"}
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  {isBioanalystOnly ? "Bioanalista Clínico" : user?.roles?.join(", ") || "Operador"}
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
