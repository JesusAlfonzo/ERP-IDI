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

export const changePassword = async (
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
    const { currentPassword, newPassword } = req.body;
    if (
      !currentPassword ||
      typeof newPassword !== 'string' ||
      newPassword.length < 8
    ) {
      res
        .status(400)
        .json({
          status: 'BAD_REQUEST',
          message:
            'newPassword debe tener al menos 8 caracteres y currentPassword es obligatorio',
        });
      return;
    }
    await AuthService.changePassword(
      req.user.id,
      String(currentPassword),
      newPassword
    );
    res
      .status(200)
      .json({
        status: 'SUCCESS',
        message: 'Contraseña actualizada exitosamente',
      });
  } catch (error) {
    next(error);
  }
};
