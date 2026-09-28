import { z } from 'zod';
import { BatchStatus, IncidentType } from '@prisma/client';

export const AdjustmentNewBatchSchema = z.object({
  productId: z
    .union([z.number(), z.string()])
    .transform((val) => BigInt(val)),
  lotNumber: z
    .string()
    .trim()
    .min(1, 'El número de lote es obligatorio'),
  expirationDate: z
    .string()
    .nullish()
    .transform((val) => (val ? new Date(val) : null)),
  locationId: z
    .union([z.number(), z.string()])
    .transform((val) => Number(val))
    .refine((val) => Number.isInteger(val) && val > 0, {
      message: 'Debe especificar una ubicación válida',
    }),
  costPrice: z
    .union([z.number(), z.string()])
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val >= 0, {
      message: 'El costo no puede ser negativo',
    })
    .optional()
    .default(0),
  origin: z
    .string()
    .trim()
    .optional()
    .default('Ajuste'),
});

export const StockAdjustmentItemSchema = z
  .object({
    batchId: z
      .union([z.number(), z.string()])
      .transform((val) => BigInt(val))
      .optional(),
    newBatch: AdjustmentNewBatchSchema.optional(),
    action: z.enum(['INCREMENTO', 'DECREMENTO'], {
      message: 'La acción debe ser INCREMENTO o DECREMENTO',
    }),
    quantity: z
      .number()
      .positive('La cantidad a ajustar debe ser mayor a 0'),
    reason: z.string().trim().nullish(),
  })
  .superRefine((data, ctx) => {
    if (!data.batchId && !data.newBatch) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Debe indicar un lote existente o los datos para crear un nuevo lote',
        path: ['batchId'],
      });
    }
    if (data.newBatch && data.action !== 'INCREMENTO') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La creación de un lote nuevo solo está permitida en ajustes de INCREMENTO (entrada)',
        path: ['action'],
      });
    }
  });

export const StockAdjustmentSchema = z.object({
  notes: z
    .string()
    .trim()
    .min(3, 'El motivo o nota debe tener al menos 3 caracteres')
    .optional(),
  items: z
    .array(StockAdjustmentItemSchema)
    .min(1, 'Debe incluir al menos un ítem a ajustar'),
});

export const DirectWasteSchema = z.object({
  wastes: z
    .array(
      z.object({
        batchId: z
          .union([z.number(), z.string()])
          .transform((val) => BigInt(val)),
        quantity: z
          .number()
          .positive('La cantidad de merma debe ser mayor a 0'),
        reason: z
          .string()
          .trim()
          .min(
            5,
            'El motivo del descarte debe ser explícito (mín. 5 caracteres)'
          ),
      })
    )
    .min(1, 'Debe incluir al menos una merma'),
});

export const BatchStatusUpdateSchema = z
  .object({
    status: z.nativeEnum(BatchStatus, {
      message: `Estado inválido. Opciones: ${Object.values(BatchStatus).join(', ')}`,
    }),
    incidentType: z.nativeEnum(IncidentType).optional(),
    reason: z
      .string()
      .trim()
      .min(5, 'El motivo del cambio debe tener al menos 5 caracteres')
      .nullish(),
  })
  .superRefine((data, ctx) => {
    const requiresIncident =
      data.status === BatchStatus.EN_CUARENTENA ||
      data.status === BatchStatus.DEFECTUOSO;

    if (requiresIncident) {
      if (!data.incidentType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Debe especificar el tipo de incidente al bloquear o enviar a cuarentena',
          path: ['incidentType'],
        });
      }
      if (!data.reason || data.reason.trim().length < 5) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Debe justificar el motivo del bloqueo (mín. 5 caracteres)',
          path: ['reason'],
        });
      }
    }
  });

export type StockAdjustmentDTO = z.infer<typeof StockAdjustmentSchema>;
export type DirectWasteDTO = z.infer<typeof DirectWasteSchema>;
export type BatchStatusUpdateDTO = z.infer<typeof BatchStatusUpdateSchema>;
