import type { Request, Response, NextFunction } from 'express';
import { checkSystemHealth } from '../services/health.service.js';

export const getHealth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const systemStatus = checkSystemHealth();
    res.status(200).json(systemStatus);
  } catch (error) {
    next(error);
  }
};
