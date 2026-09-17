export type UserRole =
  | "ADMINISTRADOR"
  | "ALMACEN"
  | "LABORATORIO"
  | "COMPRAS"
  | "CALIDAD";

export interface SystemUser {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  department: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserPayload {
  username: string;
  fullName: string;
  email: string;
  password?: string;
  role: UserRole;
  department: string;
}

export interface UpdateUserPayload {
  fullName?: string;
  email?: string;
  role?: UserRole;
  department?: string;
  isActive?: boolean;
}

export interface ResetPasswordPayload {
  newPassword: string;
}
