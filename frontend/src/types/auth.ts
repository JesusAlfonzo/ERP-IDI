export interface AuthUser {
  id: number;
  username: string;
  email: string;
  fullName: string;
  department: string;
  roles: string[];
}

export interface LoginResponseData {
  token: string;
  user: AuthUser;
}

export interface LoginCredentials {
  identifier: string;
  password: string;
}
