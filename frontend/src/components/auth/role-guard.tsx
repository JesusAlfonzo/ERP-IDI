"use client";

import { usePathname, useRouter } from "next/navigation";
import type { AuthUser } from "@/types/auth";
import { ShieldAlert, RefreshCw } from "lucide-react";

// Matriz de permisos ordenada por estricta especificidad (rutas hijas primero)
const ROUTE_PERMISSIONS: { pattern: RegExp | string; roles: string[] }[] = [
  // 1. Módulo de Coordinación
  {
    pattern: "/coordinator/fridge-audit",
    roles: [
      "ADMINISTRADOR",
      "COORDINADOR_LABORATORIO",
      "COORDINADOR",
      "LABORATORIO",
      "BIOANALISTA",
      "ADMINISTRACION",
    ],
  },
  {
    pattern: "/coordinator",
    roles: [
      "ADMINISTRADOR",
      "COORDINADOR_LABORATORIO",
      "COORDINADOR",
      "LABORATORIO",
    ],
  },

  // 3. Módulo Operativo de Laboratorio (Bioanalista / Área Operativa)
  {
    pattern: "/lab",
    roles: [
      "ADMINISTRADOR",
      "LABORATORIO",
      "COORDINADOR_LABORATORIO",
      "COORDINADOR",
      "BIOANALISTA",
    ],
  },

  // 4. Módulo de Investigación y Docencia
  {
    pattern: "/research/trials",
    roles: [
      "ADMINISTRADOR",
      "INVESTIGACION",
      "DOCENCIA",
      "LABORATORIO",
      "COORDINADOR_LABORATORIO",
      "BIOANALISTA",
    ],
  },
  {
    pattern: "/research",
    roles: [
      "ADMINISTRADOR",
      "INVESTIGACION",
      "DOCENCIA",
      "LABORATORIO",
      "COORDINADOR_LABORATORIO",
    ],
  },

  // 5. Módulos Administrativos y Configuración
  { pattern: "/admin/financial/payments", roles: ["ADMINISTRADOR", "COMPRAS", "ADMINISTRACION"] },
  { pattern: "/admin", roles: ["ADMINISTRADOR"] },
  { pattern: "/settings/users", roles: ["ADMINISTRADOR"] },

  // 6. Operaciones Críticas de Almacén y Kardex
  { pattern: "/inventory/settings", roles: ["ADMINISTRADOR", "ALMACENISTA", "ADMINISTRACION"] },
  {
    pattern: "/inventory/adjustments",
    roles: ["ADMINISTRADOR", "ALMACENISTA"],
  },
  {
    pattern: /^\/inventory\/kardex\/[^/]+$/,
    roles: ["ADMINISTRADOR", "ALMACENISTA"],
  },
  { pattern: "/inventory/kardex", roles: ["ADMINISTRADOR", "ALMACENISTA"] },

  // 7. Ficha Técnica / Detalle del Producto (Show [id])
  {
    pattern: /^\/inventory\/products\/[^/]+$/,
    roles: ["ADMINISTRADOR", "ALMACENISTA", "COMPRAS", "LABORATORIO"],
  },
  {
    pattern: /^\/inventory\/catalog\/[^/]+$/,
    roles: ["ADMINISTRADOR", "ALMACENISTA", "COMPRAS", "LABORATORIO"],
  },

  // 8. Catálogo General de Productos
  {
    pattern: "/inventory/products",
    roles: [
      "ADMINISTRADOR",
      "ALMACENISTA",
      "COMPRAS",
      "LABORATORIO",
      "SOLICITANTE",
    ],
  },
  {
    pattern: "/inventory/catalog",
    roles: [
      "ADMINISTRADOR",
      "ALMACENISTA",
      "COMPRAS",
      "LABORATORIO",
      "SOLICITANTE",
    ],
  },

  // 9. Cadena de Frío y Calidad
  { pattern: "/laboratory", roles: ["ADMINISTRADOR", "LABORATORIO"] },
  { pattern: "/quality", roles: ["ADMINISTRADOR", "LABORATORIO", "ALMACENISTA"] },

  // 10. Compras y Proveedores
  { pattern: "/purchasing", roles: ["ADMINISTRADOR", "COMPRAS", "ADMINISTRACION"] },

  // 11. Solicitudes Internas Generales
  {
    pattern: "/requests",
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
];

interface RoleGuardProps {
  user: AuthUser | null;
  children: React.ReactNode;
}

export function RoleGuard({ user, children }: RoleGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  if (!user) {
    return (
      <div className="h-[50vh] flex items-center justify-center text-slate-400">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-blue-600" />
        <span className="text-xs">Verificando autorizaciones de acceso...</span>
      </div>
    );
  }

  const matchedRule = ROUTE_PERMISSIONS.find((rule) => {
    if (typeof rule.pattern === "string") {
      return (
        pathname === rule.pattern || pathname.startsWith(`${rule.pattern}/`)
      );
    }
    return rule.pattern.test(pathname);
  });

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
