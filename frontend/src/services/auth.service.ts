import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";
import type {
  AuthUser,
  LoginCredentials,
  LoginResponseData,
} from "@/types/auth";

export const AuthService = {
  async login(credentials: LoginCredentials): Promise<LoginResponseData> {
    const response = await apiClient.post<ApiResponse<LoginResponseData>>(
      "/auth/login",
      credentials,
    );

    if (!response.data.data) {
      throw new Error(response.data.message || "Error al iniciar sesión");
    }

    const { token, user } = response.data.data;
    localStorage.setItem("erp_token", token);
    localStorage.setItem("erp_user", JSON.stringify(user));

    return response.data.data;
  },

  logout(): void {
    localStorage.removeItem("erp_token");
    localStorage.removeItem("erp_user");
    window.location.replace("/login");
  },

  getCurrentUser(): AuthUser | null {
    if (typeof window === "undefined") return null;
    const rawUser = localStorage.getItem("erp_user");
    if (!rawUser) return null;
    try {
      return JSON.parse(rawUser) as AuthUser;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    if (typeof window === "undefined") return false;
    return Boolean(localStorage.getItem("erp_token"));
  },
};
