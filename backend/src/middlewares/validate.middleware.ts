import type { Request, Response, NextFunction } from 'express';
import { type ZodType } from 'zod';

export const validateRequest = (schema: ZodType) => {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
};
