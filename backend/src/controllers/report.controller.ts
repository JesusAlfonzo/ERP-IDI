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

export const getCustomReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filters = {
      reportType: (req.query.reportType as any) || 'KARDEX',
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
      productId: req.query.productId ? Number(req.query.productId) : undefined,
      categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
      supplierId: req.query.supplierId ? Number(req.query.supplierId) : undefined,
      departmentId: req.query.departmentId ? Number(req.query.departmentId) : undefined,
      movementType: req.query.movementType as string | undefined,
      status: req.query.status as string | undefined,
      search: req.query.search as string | undefined,
    };

    const result = await ReportService.generateCustomReport(filters);

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(result),
    });
  } catch (error) {
    next(error);
  }
};

export const getCostRealByExamReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filter = {
      examId: req.query.examId ? Number(req.query.examId) : undefined,
      labAreaId: req.query.labAreaId ? Number(req.query.labAreaId) : undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    };

    const result = await ReportService.getCostRealByExam(filter);

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(result),
    });
  } catch (error) {
    next(error);
  }
};

export const getFinancialConsolidatedByAreaReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const filter = {
      labAreaId: req.query.labAreaId ? Number(req.query.labAreaId) : undefined,
      startDate: req.query.startDate as string | undefined,
      endDate: req.query.endDate as string | undefined,
    };

    const result = await ReportService.getFinancialConsolidatedByArea(filter);

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(result),
    });
  } catch (error) {
    next(error);
  }
};

export const getItemTraceabilityReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const batchId =
      req.params.batchId ||
      req.query.batchId ||
      (req.params.id && !isNaN(Number(req.params.id)) ? req.params.id : undefined);
    const productId = req.params.productId || req.query.productId;
    const lotNumber = (req.query.lotNumber || req.params.lotNumber) as string | undefined;

    const result = await ReportService.getItemTraceability({
      batchId: batchId ? BigInt(batchId as string) : undefined,
      productId: productId ? Number(productId) : undefined,
      lotNumber,
    });

    res.status(200).json({
      status: 'SUCCESS',
      data: serializeBigInt(result),
    });
  } catch (error) {
    next(error);
  }
};
