import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    let jsonStr = "";
    if (typeof atob === "function") {
      jsonStr = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
    } else if (typeof Buffer !== "undefined") {
      jsonStr = Buffer.from(base64, "base64").toString("utf-8");
    }
    const payload = JSON.parse(jsonStr);
    if (!payload.exp || typeof payload.exp !== "number") return false;
    return Date.now() >= (payload.exp - 5) * 1000;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redireccionar rutas de reportes de costos y trazabilidad hacia el generador de reportes
  if (pathname.startsWith("/admin/reports")) {
    return NextResponse.redirect(new URL("/inventory/reports", request.url));
  }

  if (pathname === "/login") {
    const token = request.cookies.get("erp_token")?.value;
    if (token) {
      if (isTokenExpired(token)) {
        // Token vencido: limpiar cookie y permitir acceso a /login
        const response = NextResponse.next();
        response.cookies.delete("erp_token");
        return response;
      }

      // Token válido: redirigir automáticamente a /dashboard o ruta previa
      const redirectParam = request.nextUrl.searchParams.get("redirect");
      const targetPath =
        redirectParam && !redirectParam.startsWith("/login")
          ? redirectParam
          : "/dashboard";
      return NextResponse.redirect(new URL(targetPath, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/admin/reports/:path*", "/admin/reports"],
};
