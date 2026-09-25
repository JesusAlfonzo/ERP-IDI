"use client";

import { useState } from "react";
import { AuthService } from "@/services/auth.service";
import type { AuthUser } from "@/types/auth";
import { RequestWindowAdminCard } from "@/components/requests/RequestWindowAdminCard";
import {
  ShieldCheck,
  Lock,
  Users,
  AlertTriangle,
  Building,
  KeyRound,
} from "lucide-react";
import Link from "next/link";

export default function AdminSecurityPage() {
  const [currentUser] = useState<AuthUser | null>(() =>
    AuthService.getCurrentUser()
  );
  const isAdmin = currentUser?.roles.includes("ADMINISTRADOR") ?? false;

  if (!isAdmin) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">Acceso Restringido</h2>
        <p className="text-xs text-slate-500">
          Esta sección está reservada exclusivamente para el personal con rol de
          Administrador del sistema.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs bg-slate-900 text-white rounded-lg font-semibold"
        >
          Volver al Inicio
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-blue-600" />
            Seguridad & Políticas Institucionales
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Administración centralizada de ventanas operativas, control de
            acceso y directrices del IDI
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
          >
            <Users className="w-4 h-4 text-slate-500" />
            Gestión de Usuarios & Roles
          </Link>
        </div>
      </div>

      {/* Tarjeta de Ventana Operativa de Requisiciones */}
      <RequestWindowAdminCard />

      {/* Información de Directrices de Seguridad y Control */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <KeyRound className="w-4 h-4 text-blue-600" />
            Control de Acceso RBAC
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Las políticas de seguridad restringen las acciones de aprobación y
            despacho exclusivamente a usuarios con roles{" "}
            <strong>ADMINISTRADOR</strong> o <strong>ALMACENISTA</strong>.
          </p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Lock className="w-4 h-4 text-emerald-600" />
            Auditoría de Kardex Físico
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Todo despacho genera correlativos inmutables y trazabilidad
            completa vinculando el usuario que autorizó y el número de lote
            afectado.
          </p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Building className="w-4 h-4 text-purple-600" />
            Regla de Ventana Semanal
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            La ventana operativa previene la saturación del almacén central,
            concentrando las solicitudes regulares en los primeros días hábiles
            de cada semana.
          </p>
        </div>
      </div>
    </div>
  );
}
