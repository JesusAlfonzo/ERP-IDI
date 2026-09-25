import type { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service.js';
import { serializeBigInt } from '../utils/serializer.js';

export const getDashboardData = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = {
      id: req.user?.id || 1,
      roles: req.user?.roles || [],
      department: req.user?.department,
    };

    const metrics = await DashboardService.getDashboardMetrics(user);

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(metrics),
    });
  } catch (error) {
    next(error);
  }
};

export const getNotifications = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = {
      id: req.user?.id || 1,
      roles: req.user?.roles || [],
      department: req.user?.department,
    };

    const rawExclude = req.query.excludeIds;
    const dismissedIds: string[] =
      typeof rawExclude === 'string' && rawExclude.length > 0
        ? rawExclude.split(',')
        : [];

    const notifications = await DashboardService.getNotifications(
      user,
      dismissedIds
    );

    res.status(200).json({
      status: 'SUCCESS',
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};
