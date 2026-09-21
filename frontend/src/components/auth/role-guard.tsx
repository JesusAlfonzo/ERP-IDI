"use client";

import { usePathname, useRouter } from "next/navigation";
import type { AuthUser } from "@/types/auth";
import { ShieldAlert, RefreshCw } from "lucide-react";

// Matriz de permisos ordenada por estricta especificidad (rutas hijas primero)
const ROUTE_PERMISSIONS: { pattern: RegExp | string; roles: string[] }[] = [
  // 1. Módulos Administrativos y Configuración
  { pattern: "/admin", roles: ["ADMINISTRADOR"] },
  { pattern: "/settings/users", roles: ["ADMINISTRADOR"] },

  // 2. Operaciones Críticas de Almacén y Kardex
  { pattern: "/inventory/settings", roles: ["ADMINISTRADOR", "ALMACENISTA"] },
  {
    pattern: "/inventory/adjustments",
    roles: ["ADMINISTRADOR", "ALMACENISTA"],
  },
  { pattern: "/inventory/kardex", roles: ["ADMINISTRADOR", "ALMACENISTA"] },

  // 3. Ficha Técnica / Detalle del Producto (Show [id])
  // Restringido para que SOLICITANTE no vea costos de lote ni auditoría profunda
  {
    pattern: /^\/inventory\/products\/[^/]+$/,
    roles: ["ADMINISTRADOR", "ALMACENISTA", "COMPRAS", "ANALISTA_LABORATORIO"],
  },

  // 4. Catálogo General de Productos (Listado base)
  {
    pattern: "/inventory/products",
    roles: [
      "ADMINISTRADOR",
      "ALMACENISTA",
      "COMPRAS",
      "ANALISTA_LABORATORIO",
      "SOLICITANTE",
    ],
  },

  // 5. Cadena de Frío y Calidad
  { pattern: "/laboratory", roles: ["ADMINISTRADOR", "ANALISTA_LABORATORIO"] },
  { pattern: "/quality", roles: ["ADMINISTRADOR", "ANALISTA_LABORATORIO"] },

  // 6. Compras y Proveedores
  { pattern: "/purchasing", roles: ["ADMINISTRADOR", "COMPRAS"] },

  // 7. Solicitudes Internas
  {
    pattern: "/requests",
    roles: [
      "ADMINISTRADOR",
      "ALMACENISTA",
      "ANALISTA_LABORATORIO",
      "SOLICITANTE",
    ],
  },
];

interface RoleGuardProps {
  user: AuthUser | null;
  children: React.ReactNode;
}

export function RoleGuard({ user, children }: RoleGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Si aún no se ha recibido el objeto de usuario desde AppLayout, esperamos
  if (!user) {
    return (
      <div className="h-[50vh] flex items-center justify-center text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-blue-600" />
        <span className="text-xs">Verificando autorizaciones de acceso...</span>
      </div>
    );
  }

  // Evaluar regla coincidente por Regex o Prefijo
  const matchedRule = ROUTE_PERMISSIONS.find((rule) => {
    if (typeof rule.pattern === "string") {
      return (
        pathname === rule.pattern || pathname.startsWith(`${rule.pattern}/`)
      );
    }
    return rule.pattern.test(pathname);
  });

  // Rutas sin restricción explícita (ej. /dashboard)
  if (!matchedRule) {
    return <>{children}</>;
  }

  const userRoles = user.roles || [];
  const isAuthorized = matchedRule.roles.some((role) =>
    userRoles.includes(role),
  );

  if (!isAuthorized) {
    return (
      <div className="h-[75vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100 shadow-xs">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          Acceso No Autorizado
        </h2>
        <p className="text-sm text-slate-500 max-w-md mt-2 leading-relaxed">
          Tu cuenta (
          <span className="font-semibold text-slate-700">{user.username}</span>{" "}
          &bull; {userRoles.join(", ")}) no tiene los permisos requeridos para
          ingresar al módulo{" "}
          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
            {pathname}
          </span>
          .
        </p>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
        >
          Volver al Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
