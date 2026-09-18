import { apiClient } from "@/lib/api-client";
import type { ApiResponse } from "@/types/api";
import type {
  SystemUser,
  CreateUserPayload,
  UpdateUserPayload,
  ResetPasswordPayload,
} from "@/types/users";

export const UserClientService = {
  async getUsers(): Promise<SystemUser[]> {
    const response = await apiClient.get<ApiResponse<SystemUser[]>>("/users");
    return response.data.data || [];
  },

  async createUser(payload: CreateUserPayload): Promise<SystemUser> {
    const response = await apiClient.post<ApiResponse<SystemUser>>(
      "/users",
      payload,
    );
    if (!response.data.data) {
      throw new Error(response.data.message || "Error al registrar el usuario");
    }
    return response.data.data;
  },

  async updateUser(
    userId: number,
    payload: UpdateUserPayload,
  ): Promise<SystemUser> {
    const response = await apiClient.patch<ApiResponse<SystemUser>>(
      `/users/${userId}`,
      payload,
    );
    if (!response.data.data) {
      throw new Error(
        response.data.message || "Error al actualizar el usuario",
      );
    }
    return response.data.data;
  },

  async toggleUserStatus(
    userId: number,
    isActive: boolean,
  ): Promise<SystemUser> {
    return this.updateUser(userId, { isActive });
  },

  async resetPassword(
    userId: number,
    payload: ResetPasswordPayload,
  ): Promise<{ message: string }> {
    const response = await apiClient.patch<ApiResponse<{ message: string }>>(
      `/users/${userId}/reset-password`,
      payload,
    );
    return (
      response.data.data || { message: "Contraseña restablecida con éxito" }
    );
  },
};
