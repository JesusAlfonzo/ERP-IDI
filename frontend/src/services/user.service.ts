import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";
import type {
  SystemUser,
  CreateUserPayload,
  UpdateUserPayload,
  ResetPasswordPayload,
} from "@/types/users";

export const UserClientService = {
  /**
   * Obtiene la lista completa de usuarios
   */
  async getUsers(): Promise<SystemUser[]> {
    const response =
      await apiClient.get<ApiResponse<SystemUser[]>>("/admin/users");
    return response.data.data || [];
  },

  /**
   * Crea una nueva cuenta institucional
   */
  async createUser(payload: CreateUserPayload): Promise<SystemUser> {
    const response = await apiClient.post<ApiResponse<SystemUser>>(
      "/admin/users",
      payload,
    );
    if (!response.data.data) {
      throw new Error(response.data.message || "Error al registrar el usuario");
    }
    return response.data.data;
  },

  /**
   * Actualiza datos o rol del usuario
   */
  async updateUser(
    userId: number,
    payload: UpdateUserPayload,
  ): Promise<SystemUser> {
    const response = await apiClient.patch<ApiResponse<SystemUser>>(
      `/admin/users/${userId}`,
      payload,
    );
    if (!response.data.data) {
      throw new Error(
        response.data.message || "Error al actualizar el usuario",
      );
    }
    return response.data.data;
  },

  /**
   * Cambia el estado de activación del usuario
   */
  async toggleUserStatus(
    userId: number,
    isActive: boolean,
  ): Promise<SystemUser> {
    return this.updateUser(userId, { isActive });
  },

  /**
   * Reseteo administrativo de contraseña
   */
  async resetPassword(
    userId: number,
    payload: ResetPasswordPayload,
  ): Promise<{ message: string }> {
    const response = await apiClient.post<ApiResponse<{ message: string }>>(
      `/admin/users/${userId}/reset-password`,
      payload,
    );
    return (
      response.data.data || { message: "Contraseña restablecida con éxito" }
    );
  },
};
