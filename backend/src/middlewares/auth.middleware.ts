import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { AuthUserPayload } from '../types/express.js';

const JWT_SECRET = process.env.JWT_SECRET || 'jwt_default_secret_key';

export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      status: 'UNAUTHORIZED',
      message: 'Token de autorización ausente o inválido',
    });
    return;
  }

  const parts = authHeader.split(' ');
  const token = parts[1];

  if (!token) {
    res.status(401).json({
      status: 'UNAUTHORIZED',
      message: 'Token de autorización con formato incorrecto',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as AuthUserPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({
      status: 'UNAUTHORIZED',
      message: 'Token expirado o inválido',
    });
  }
};
