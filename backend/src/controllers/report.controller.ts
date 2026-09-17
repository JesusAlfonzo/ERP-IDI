import type { Request, Response, NextFunction } from 'express';
import { ReportService } from '../services/report.service.js';
import { serializeBigInt } from '../utils/serializer.js';

export const getDashboardSummary = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const summary = await ReportService.getDashboardOverview();

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(summary),
    });
  } catch (error) {
    next(error);
  }
};
