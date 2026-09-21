"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthService } from "@/services/auth.service";
import type { AuthUser } from "@/types/auth";
import { ShieldAlert, Loader2 } from "lucide-react";

// Matriz estricta de rutas protegidas
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

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const currentUser = await AuthService.getCurrentUser();
        if (!isMounted) return;

        if (!currentUser) {
          router.replace("/login");
          return;
        }

        setUser(currentUser);

        // Verificar si la ruta actual exige permisos específicos
        const matchedRule = ROUTE_PERMISSIONS.find((rule) =>
          pathname.startsWith(rule.prefix),
        );

        if (!matchedRule) {
          // Rutas abiertas autenticadas (ej. /dashboard)
          setAuthorized(true);
        } else {
          const userRoles = currentUser.roles || [];
          const hasPermission = matchedRule.roles.some((r) =>
            userRoles.includes(r),
          );
          setAuthorized(hasPermission);
        }
      } catch (err) {
        console.error("Error verificando permisos", err);
        router.replace("/login");
      } finally {
        if (isMounted) setChecking(false);
      }
    };

    void checkAuth();

    return () => {
      isMounted = false;
    };
  }, [pathname, router]);

  if (checking) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 border border-rose-100 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          Acceso No Autorizado
        </h2>
        <p className="text-sm text-slate-500 max-w-md mt-2">
          Tu cuenta ({user?.username} &bull; {user?.roles?.join(", ")}) no
          cuenta con los permisos necesarios para acceder al módulo{" "}
          <span className="font-mono font-semibold text-slate-700">
            {pathname}
          </span>
          .
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          Volver al Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
