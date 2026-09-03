import type { Request, Response, NextFunction } from 'express';

export const requireRoles = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        status: 'UNAUTHORIZED',
        message: 'No autenticado',
      });
      return;
    }

    const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));

    if (!hasRole) {
      res.status(403).json({
        status: 'FORBIDDEN',
        message: 'No posee los permisos necesarios para realizar esta acción',
      });
      return;
    }

    next();
  };
};
