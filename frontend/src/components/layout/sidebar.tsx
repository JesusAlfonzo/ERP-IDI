"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/types/auth";
import {
  LayoutDashboard,
  Package,
  FileText,
  FlaskConical,
  ShoppingCart,
  ShieldAlert,
  Settings,
  X,
  SlidersHorizontal,
  Building2,
  ClipboardList,
  Shield,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const NAVIGATION_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Catálogo y Lotes",
    href: "/inventory/products",
    icon: Package,
    roles: ["ADMINISTRADOR", "ALMACEN"],
  },
  {
    label: "Kardex",
    href: "/inventory/kardex",
    icon: FileText,
    roles: ["ADMINISTRADOR", "ALMACEN"],
  },
  {
    label: "Ajustes & Mermas",
    href: "/inventory/adjustments",
    icon: SlidersHorizontal,
    roles: ["ADMINISTRADOR", "ALMACEN"],
  },
  {
    label: "Solicitudes Internas",
    href: "/requests",
    icon: ClipboardList,
    roles: ["ADMINISTRADOR", "ALMACEN", "LABORATORIO"],
  },
  {
    label: "Laboratorio",
    href: "/laboratory/consumption",
    icon: FlaskConical,
    roles: ["ADMINISTRADOR", "LABORATORIO"],
  },
  {
    label: "Compras & Proveedores",
    href: "/purchasing/orders",
    icon: ShoppingCart,
    roles: ["ADMINISTRADOR", "COMPRAS"],
  },
  {
    label: "Proveedores & Deuda",
    href: "/purchasing/suppliers",
    icon: Building2,
    roles: ["ADMINISTRADOR", "COMPRAS"],
  },
  {
    label: "Control de Calidad",
    href: "/quality/quarantine",
    icon: ShieldAlert,
    roles: ["ADMINISTRADOR", "ALMACEN", "LABORATORIO"],
  },
  {
    label: "Usuarios y Permisos",
    href: "/admin/users",
    icon: Shield,
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

  return (
    <>
      {/* Backdrop móvil */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Cabecera Sidebar */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
          <div className="flex items-center gap-2 font-bold text-white tracking-wide">
            <span className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-black">
              E
            </span>
            <span>ERP-IDI</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Links de Navegación */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAVIGATION_ITEMS.filter((item) => isAllowed(item.roles)).map(
            (item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onClose()}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors",
                    isActive
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200",
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            },
          )}
        </nav>

        {/* Info del usuario logueado */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-white truncate">
              {user?.fullName || user?.username || "Usuario"}
            </span>
            <span className="text-[10px] text-slate-400 truncate">
              {user?.department || "Personal IDI"} &bull; {user?.roles?.[0]}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
