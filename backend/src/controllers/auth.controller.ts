import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      res.status(400).json({
        status: 'BAD_REQUEST',
        message: 'Debe ingresar usuario/correo y contraseña',
      });
      return;
    }

    const data = await AuthService.login(identifier, password);

    res.status(200).json({
      status: 'SUCCESS',
      data,
    });
  } catch (error) {
    res.status(401).json({
      status: 'UNAUTHORIZED',
      message: (error as Error).message,
    });
  }
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user?.id) {
      res
        .status(401)
        .json({ status: 'UNAUTHORIZED', message: 'No autenticado' });
      return;
    }

    const userData = await AuthService.getMe(req.user.id);

    res.status(200).json({
      status: 'SUCCESS',
      data: userData,
    });
  } catch (error) {
    next(error);
  }
};
