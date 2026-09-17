import type { Request, Response, NextFunction } from 'express';
import { ExportService } from '../services/export.service.js';

export const downloadInventoryValuationCSV = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const csvContent = await ExportService.exportInventoryValuationCSV();
    const filename = `valorizacion_inventario_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

export const downloadKardexCSV = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const csvContent = await ExportService.exportKardexCSV();
    const filename = `kardex_movimientos_${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};
