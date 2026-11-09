import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";
import type {
  AuthUser,
  LoginCredentials,
  LoginResponseData,
} from "@/types/auth";

const TOKEN_KEY = "erp_token";
const USER_KEY = "erp_user";
const COOKIE_KEY = "erp_token";

function decodeJwtPayload(token: string): { exp?: number; [key: string]: unknown } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    let jsonStr = "";
    if (typeof window !== "undefined" && typeof atob === "function") {
      jsonStr = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
    } else if (typeof Buffer !== "undefined") {
      jsonStr = Buffer.from(base64, "base64").toString("utf-8");
    }
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== "number") return false;
  // Margen de 5 segundos para prevenir inconsistencias menores de reloj
  return Date.now() >= (payload.exp - 5) * 1000;
}

export const AuthService = {
  setAuthCookie(token: string): void {
    if (typeof document === "undefined") return;
    const payload = decodeJwtPayload(token);
    let maxAgeSeconds = 28800; // 8 horas por defecto
    if (payload?.exp && typeof payload.exp === "number") {
      const remainingSeconds = Math.floor(payload.exp - Date.now() / 1000);
      if (remainingSeconds > 0) {
        maxAgeSeconds = remainingSeconds;
      }
    }
    const secureFlag =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? "; Secure"
        : "";
    document.cookie = `${COOKIE_KEY}=${encodeURIComponent(token)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax${secureFlag}`;
  },

  removeAuthCookie(): void {
    if (typeof document === "undefined") return;
    document.cookie = `${COOKIE_KEY}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
  },

  async login(credentials: LoginCredentials): Promise<LoginResponseData> {
    const response = await apiClient.post<ApiResponse<LoginResponseData>>(
      "/auth/login",
      credentials,
    );

    if (!response.data.data) {
      throw new Error(response.data.message || "Error al iniciar sesión");
    }

    const { token, user } = response.data.data;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.setAuthCookie(token);

    return response.data.data;
  },

  logout(): void {
    this.removeAuthCookie();
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.location.replace("/login");
    }
  },

  getCurrentUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    const rawUser = localStorage.getItem(USER_KEY);
    if (!rawUser) return null;
    try {
      return JSON.parse(rawUser) as AuthUser;
    } catch {
      return null;
    }
  },

  getToken(): string | null {
    if (typeof window === "undefined") return null;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    if (isTokenExpired(token)) {
      this.clearSession();
      return null;
    }
    return token;
  },

  clearSession(): void {
    this.removeAuthCookie();
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  },

  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return false;
    if (isTokenExpired(token)) {
      this.clearSession();
      return false;
    }
    return true;
  },
};
