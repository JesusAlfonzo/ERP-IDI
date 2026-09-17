import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // 1. Errores de Validación de Zod
  if (err instanceof ZodError) {
    const formattedErrors = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));

    res.status(400).json({
      status: 'VALIDATION_ERROR',
      message: 'Los datos enviados en la solicitud no son válidos',
      errors: formattedErrors,
    });
    return;
  }

  // 2. Errores Conocidos de Prisma ORM
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const targets = Array.isArray(err.meta?.target)
          ? err.meta.target.join(', ')
          : String(err.meta?.target ?? 'campo');
        res.status(409).json({
          status: 'CONFLICT',
          message: `Conflicto de unicidad: ya existe un registro con el mismo valor en (${targets})`,
        });
        return;
      }
      case 'P2025': {
        res.status(404).json({
          status: 'NOT_FOUND',
          message:
            (err.meta?.cause as string) ||
            'El recurso solicitado no fue encontrado',
        });
        return;
      }
      case 'P2003': {
        res.status(400).json({
          status: 'FOREIGN_KEY_VIOLATION',
          message:
            'Operación no permitida: referencia a un registro inexistente o protegido por dependencias',
        });
        return;
      }
      default:
        res.status(400).json({
          status: 'DATABASE_ERROR',
          message: `Error en la base de datos [${err.code}]`,
        });
        return;
    }
  }

  // 3. Errores con mensaje estándar de la aplicación
  if (err instanceof Error) {
    res.status(400).json({
      status: 'BAD_REQUEST',
      message: err.message,
    });
    return;
  }

  // 4. Excepciones no controladas
  console.error('Unhandled internal error:', err);
  res.status(500).json({
    status: 'INTERNAL_SERVER_ERROR',
    message: 'Ocurrió un error inesperado en el servidor',
  });
};
