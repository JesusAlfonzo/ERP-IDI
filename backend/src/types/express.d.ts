export interface AuthUserPayload {
  id: number;
  username: string;
  email: string;
  department: string;
  roles: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}
