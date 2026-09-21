"use client";

import { usePathname, useRouter } from "next/navigation";
import type { AuthUser } from "@/types/auth";
import { ShieldAlert } from "lucide-react";

const ROUTE_PERMISSIONS: { prefix: string; roles: string[] }[] = [
  { prefix: "/admin", roles: ["ADMINISTRADOR"] },
  { prefix: "/settings/users", roles: ["ADMINISTRADOR"] },
  {
    prefix: "/inventory/settings",
    roles: ["ADMINISTRADOR", "ALMACENISTA"],
  },
  {
    prefix: "/inventory/adjustments",
    roles: ["ADMINISTRADOR", "ALMACENISTA"],
  },
  {
    prefix: "/inventory/kardex",
    roles: ["ADMINISTRADOR", "ALMACENISTA"],
  },
  {
    prefix: "/inventory/products",
    roles: [
      "ADMINISTRADOR",
      "ALMACENISTA",
      "COMPRAS",
      "ANALISTA_LABORATORIO",
      "SOLICITANTE",
    ],
  },
  {
    prefix: "/laboratory",
    roles: ["ADMINISTRADOR", "ANALISTA_LABORATORIO"],
  },
  {
    prefix: "/quality",
    roles: ["ADMINISTRADOR", "ANALISTA_LABORATORIO"],
  },
  {
    prefix: "/purchasing",
    roles: ["ADMINISTRADOR", "COMPRAS"],
  },
  {
    prefix: "/requests",
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

  const matchedRule = ROUTE_PERMISSIONS.find((rule) =>
    pathname.startsWith(rule.prefix),
  );

  // Si la ruta no está explícitamente restringida (ej. /dashboard), se permite
  if (!matchedRule) {
    return <>{children}</>;
  }

  const userRoles = user?.roles || [];
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
          <span className="font-semibold text-slate-700">{user?.username}</span>{" "}
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
