import type { Request, Response, NextFunction } from 'express';
import { checkSystemStatus } from '../services/health.service.js';

export const getHealth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const systemStatus = await checkSystemStatus();

    // Si la base de datos falló devolvemos 503 (Servicio degradado), si no, 200 (OK)
    const statusCode = systemStatus.status === 'OK' ? 200 : 503;
    res.status(statusCode).json(systemStatus);
  } catch (error) {
    next(error);
  }
};
