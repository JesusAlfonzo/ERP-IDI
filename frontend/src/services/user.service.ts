import { apiClient } from "@/lib/api-client";

export interface UserRole {
  id: number;
  name: string;
  description: string | null;
}

export interface UserItem {
  id: number;
  username: string;
  email: string;
  fullName: string;
  department: string | null;
  isActive: boolean;
  roles: string[];
  createdAt: string;
}

export const UserService = {
  getUsers: async (): Promise<UserItem[]> => {
    const res = await apiClient.get("/users");
    return res.data?.data ?? res.data;
  },

  getAvailableRoles: async (): Promise<UserRole[]> => {
    const res = await apiClient.get("/users/roles");
    return res.data?.data ?? res.data;
  },

  createUser: async (payload: {
    username: string;
    email: string;
    password: string;
    fullName: string;
    department: string;
    roleIds: number[];
  }): Promise<UserItem> => {
    const res = await apiClient.post("/users", payload);
    return res.data?.data ?? res.data;
  },

  updateUser: async (
    id: number,
    payload: Partial<{
      fullName: string;
      department: string;
      isActive: boolean;
    }>,
  ): Promise<UserItem> => {
    const res = await apiClient.patch(`/users/${id}`, payload);
    return res.data?.data ?? res.data;
  },

  syncUserRoles: async (id: number, roleIds: number[]): Promise<void> => {
    await apiClient.put(`/users/${id}/roles`, { roleIds });
  },

  resetPassword: async (id: number, newPassword: string): Promise<void> => {
    await apiClient.patch(`/users/${id}/reset-password`, { newPassword });
  },
};
