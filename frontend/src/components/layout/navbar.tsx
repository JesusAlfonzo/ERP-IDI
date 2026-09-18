"use client";

import { useState, useRef, useEffect } from "react";
import { AuthService } from "@/services/auth.service";
import type { AuthUser } from "@/types/auth";
import {
  Menu,
  LogOut,
  ChevronDown,
  Building,
  ShieldCheck,
  User,
} from "lucide-react";

interface NavbarProps {
  user: AuthUser | null;
  onOpenSidebar: () => void;
}

export function Navbar({ user, onOpenSidebar }: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    AuthService.logout();
  };

  // Rol principal y color temático
  const primaryRole = user?.roles?.[0] ?? "PERSONAL";
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMINISTRADOR":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "ANALISTA_LABORATORIO":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "ALMACENISTA":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "COMPRAS":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Lado izquierdo: Botón móvil + Identificador institucional */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden transition-colors"
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

      {/* Lado derecho: Perfil + Dropdown */}
      <div className="flex items-center gap-3">
        {/* Badge de Rol */}
        <span
          className={`hidden md:inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${getRoleBadgeColor(
            primaryRole,
          )}`}
        >
          <ShieldCheck className="w-3 h-3" />
          {primaryRole.replace("_", " ")}
        </span>

        {/* Separador */}
        <div className="hidden md:block w-px h-6 bg-slate-200" />

        {/* Dropdown de usuario */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all text-left"
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

          {/* Menú Desplegable */}
          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200/80 py-1.5 z-50 animate-in fade-in-50 zoom-in-95">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {user?.fullName || user?.username}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {user?.email}
                </p>
                <div className="mt-1.5 sm:hidden">
                  <span
                    className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getRoleBadgeColor(
                      primaryRole,
                    )}`}
                  >
                    {primaryRole.replace("_", " ")}
                  </span>
                </div>
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
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 font-medium transition-colors text-left"
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
  );
}
