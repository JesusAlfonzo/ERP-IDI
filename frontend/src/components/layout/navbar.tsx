"use client";

import { AuthService } from "@/services/auth.service";
import type { AuthUser } from "@/types/auth";
import { Menu, LogOut, UserCircle } from "lucide-react";

interface NavbarProps {
  user: AuthUser | null;
  onOpenSidebar: () => void;
}

export function Navbar({ user, onOpenSidebar }: NavbarProps) {
  const handleLogout = () => {
    AuthService.logout();
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold text-slate-700 hidden sm:inline-block">
          Instituto de Inmunología Dr. Nicolás E. Bianco Colmenares
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
          <UserCircle className="w-4 h-4 text-slate-400" />
          <span className="font-medium text-slate-800">{user?.username}</span>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg font-medium transition-colors"
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </header>
  );
}
