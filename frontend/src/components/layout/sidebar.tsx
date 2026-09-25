"use client";

import { useState } from "react";
import Link from "next/link";
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
} from "lucide-react";

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
      "ANALISTA_LABORATORIO",
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
        label: "Kardex de Movimientos",
        href: "/inventory/kardex",
        icon: FileText,
        roles: ["ADMINISTRADOR", "ALMACENISTA"],
      },
      {
        label: "Ajustes & Mermas",
        href: "/inventory/adjustments",
        icon: SlidersHorizontal,
        roles: ["ADMINISTRADOR", "ALMACENISTA"],
      },
      {
        label: "Maestros del Almacén",
        href: "/inventory/settings",
        icon: Settings,
        roles: ["ADMINISTRADOR", "ALMACENISTA"],
      },
    ],
  },
  {
    label: "Laboratorio Clínico",
    icon: FlaskConical,
    roles: ["ADMINISTRADOR", "ANALISTA_LABORATORIO"],
    children: [
      {
        label: "Consumo de Reactivos",
        href: "/laboratory/consumption",
        icon: FlaskConical,
        roles: ["ADMINISTRADOR", "ANALISTA_LABORATORIO"],
      },
      {
        label: "Cadena de Frío & Cavas",
        href: "/laboratory/fridges",
        icon: Snowflake,
        roles: ["ADMINISTRADOR", "ANALISTA_LABORATORIO"],
      },
      {
        label: "Lotes en Cuarentena",
        href: "/quality/quarantine",
        icon: ShieldAlert,
        roles: ["ADMINISTRADOR", "ANALISTA_LABORATORIO"],
      },
    ],
  },
  {
    groupLabel: "GESTIÓN",
    label: "Compras & Finanzas",
    icon: ShoppingCart,
    roles: ["ADMINISTRADOR", "COMPRAS"],
    children: [
      {
        label: "Preórdenes de Compra",
        href: "/purchasing/requisitions",
        icon: FileText,
        roles: ["ADMINISTRADOR", "COMPRAS"],
      },
      {
        label: "Órdenes de Compra",
        href: "/purchasing/orders",
        icon: ShoppingCart,
        roles: ["ADMINISTRADOR", "COMPRAS"],
      },
      {
        label: "Pagos & Cuentas",
        href: "/purchasing/debts",
        icon: Building2,
        roles: ["ADMINISTRADOR", "COMPRAS"],
      },
      {
        label: "Proveedores & Contactos",
        href: "/purchasing/suppliers",
        icon: ClipboardList,
        roles: ["ADMINISTRADOR", "COMPRAS"],
      },
    ],
  },
  {
    groupLabel: "SISTEMA",
    label: "Seguridad & Usuarios",
    href: "/admin/users",
    icon: Shield,
    roles: ["ADMINISTRADOR"],
  },
  {
    label: "Políticas & Ventana",
    href: "/admin/security",
    icon: SlidersHorizontal,
    roles: ["ADMINISTRADOR"],
  },
];

interface SidebarProps {
  user: AuthUser | null;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ user, isOpen, onClose }: SidebarProps) {
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
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-slate-950 text-slate-300 flex flex-col border-r border-slate-800/80 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Encabezado */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800/80 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-black shadow-md shadow-blue-600/20">
              E
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-wide text-white leading-tight">
                ERP-IDI
              </span>
              <span className="text-[10px] text-slate-500 font-mono leading-none">
                v2.0.0
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menú de Navegación */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {NAVIGATION_GROUPS.filter((item) => isAllowed(item.roles)).map(
            (item) => {
              const Icon = item.icon;

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
                        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors group",
                        groupActive
                          ? "text-blue-400 bg-blue-950/30"
                          : "text-slate-400 hover:bg-slate-900 hover:text-slate-200",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronDown
                        className={cn(
                          "w-3.5 h-3.5 text-slate-500 transition-transform duration-200",
                          isExpanded && "rotate-180 text-blue-400",
                        )}
                      />
                    </button>

                    {/* Submenú desplegable con guía visual */}
                    {isExpanded && (
                      <div className="pl-4 pr-1 py-1 space-y-1 border-l border-slate-800/80 ml-5 my-0.5">
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
                              <span>{subItem.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Enlace directo simple (Dashboard, Solicitudes, Usuarios)
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
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
                      isActive
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-400 hover:bg-slate-900 hover:text-slate-200",
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </div>
              );
            },
          )}
        </nav>

        {/* Perfil del Usuario Activo */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950">
          <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/60 border border-slate-800/50">
            <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 border border-blue-500/20">
              {user?.fullName?.charAt(0) || user?.username?.charAt(0) || "U"}
            </div>
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
        </div>
      </aside>
    </>
  );
}
