export type UserRole =
  | "ADMINISTRADOR"
  | "ALMACENISTA"
  | "ANALISTA_LABORATORIO"
  | "COMPRAS"
  | "SOLICITANTE";

export interface SystemUser {
  id: number;
  username: string;
  fullName: string;
  email: string;
  roles: UserRole[];
  department: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserPayload {
  username: string;
  fullName: string;
  email: string;
  password?: string;
  roles: UserRole[];
  department: string;
}

export interface UpdateUserPayload {
  fullName?: string;
  email?: string;
  roles?: UserRole[];
  roleIds?: number[];
  department?: string;
  isActive?: boolean;
}

export interface ResetPasswordPayload {
  newPassword: string;
}
