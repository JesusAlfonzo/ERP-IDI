import {
  PaymentOrderSourceType,
  PaymentOrderStatus,
  Prisma,
  ServiceOrderStatus,
} from '@prisma/client';
import { prisma } from '../config/prisma.js';
import {
  generateNextPaymentOrderNumber,
  normalizeCurrency,
} from './treasury.service.js';

export interface CreateDirectPaymentDTO {
  concept: string;
  beneficiary?: string;
  supplierId?: number | null;
  departmentId?: number | null;
  estimatedDate?: Date | null;
  supportUrl?: string | null;
  method?: string; // 'TRANSFERENCIA', 'PAGO_MOVIL', 'EFECTIVO', 'ZELLE'
  sourceAccountId?: number | null;
  destinationAccount?: string | null;
  referenceNumber?: string | null;
  paymentDate?: Date;
  amountPaid: number;
  transactionCurrency?: string; // 'USD', 'VED', 'EUR'
  exchangeRate?: number | null;
  notes?: string | null;
  receiptImageUrl?: string | null;
  reviewedBy?: string | null;
  authorizedBy?: string | null;
  approvedBy?: string | null;
  registeredById: number;
  immediateSettlement?: boolean;
}

export interface RegisterServicePaymentDTO {
  method?: string;
  sourceAccountId?: number | null;
  destinationAccount?: string | null;
  referenceNumber: string;
  paymentDate?: Date;
  amountPaid?: number;
  transactionCurrency?: string;
  exchangeRate?: number | null;
  receiptImageUrl?: string | null;
  notes?: string | null;
  reviewedBy?: string | null;
  authorizedBy?: string | null;
  approvedBy?: string | null;
}

const USER_BASIC_SELECT = {
  id: true,
  fullName: true,
  email: true,
  department: true,
};

const DIRECT_PAYMENT_INCLUDE = {
  supplier: {
    select: {
      id: true,
      name: true,
      rifOrId: true,
      contactName: true,
      phone: true,
      email: true,
    },
  },
  department: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  sourceAccount: true,
  registeredBy: { select: USER_BASIC_SELECT },
  approvedByUser: { select: USER_BASIC_SELECT },
  rejectedByUser: { select: USER_BASIC_SELECT },
  paymentOrderIssuedBy: { select: USER_BASIC_SELECT },
  paymentOrders: {
    select: {
      id: true,
      paymentOrderNumber: true,
      status: true,
      debtCurrency: true,
      totalDebtAmount: true,
      paidAmount: true,
      remainingBalance: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' as const },
  },
};

async function computeExchangeAndUsd(
  amount: number,
  rawCurrency?: string,
  rawRate?: number | null
): Promise<{ txCurrency: string; effectiveRate: number; equivalentAmountUsd: number }> {
  let txCurrency = (rawCurrency || 'USD').toUpperCase();
  if (txCurrency === 'VES') txCurrency = 'VED';

  let effectiveRate =
    rawRate != null && Number(rawRate) > 0 ? Number(rawRate) : null;

  if (!effectiveRate) {
    if (txCurrency === 'VED') {
      const vesCurrency = await prisma.currency.findFirst({
        where: { code: { in: ['VES', 'VED'] } },
        include: {
          exchanges: {
            orderBy: [{ effectiveDate: 'desc' }, { id: 'desc' }],
            take: 1,
          },
        },
      });
      effectiveRate = vesCurrency?.exchanges[0]?.rate
        ? Number(vesCurrency.exchanges[0].rate)
        : 75.0;
    } else if (txCurrency === 'EUR') {
      const eurCurrency = await prisma.currency.findFirst({
        where: { code: 'EUR' },
        include: {
          exchanges: {
            orderBy: [{ effectiveDate: 'desc' }, { id: 'desc' }],
            take: 1,
          },
        },
      });
      effectiveRate = eurCurrency?.exchanges[0]?.rate
        ? Number(eurCurrency.exchanges[0].rate)
        : 81.5;
    } else {
      effectiveRate = 1.0;
    }
  }

  let equivalentAmountUsd = amount;
  if (txCurrency === 'VED') {
    equivalentAmountUsd = effectiveRate > 0 ? amount / effectiveRate : amount;
  } else if (txCurrency === 'EUR') {
    const vesCurrency = await prisma.currency.findFirst({
      where: { code: { in: ['VES', 'VED'] } },
      include: {
        exchanges: {
          orderBy: [{ effectiveDate: 'desc' }, { id: 'desc' }],
          take: 1,
        },
      },
    });
    const bcvUsd = vesCurrency?.exchanges[0]?.rate
      ? Number(vesCurrency.exchanges[0].rate)
      : 75.0;
    equivalentAmountUsd = bcvUsd > 0 ? (amount * effectiveRate) / bcvUsd : amount;
  }

  equivalentAmountUsd = Math.round(equivalentAmountUsd * 100) / 100;
  return { txCurrency, effectiveRate, equivalentAmountUsd };
}

export class DirectPaymentService {
  /**
   * Listar órdenes de servicio / pagos directos con filtros
   */
  static async listDirectPayments(filters?: {
    search?: string;
    status?: string;
    departmentId?: number;
    supplierId?: number;
    method?: string;
    currency?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    sourceAccountId?: number;
  }) {
    const where: Record<string, unknown> = {};

    if (filters?.search && filters.search.trim() !== '') {
      const s = filters.search.trim();
      where.OR = [
        { serviceOrderNumber: { contains: s, mode: 'insensitive' } },
        { paymentOrderNumber: { contains: s, mode: 'insensitive' } },
        { concept: { contains: s, mode: 'insensitive' } },
        { beneficiary: { contains: s, mode: 'insensitive' } },
        { referenceNumber: { contains: s, mode: 'insensitive' } },
        { destinationAccount: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (filters?.status && filters.status.trim() !== '') {
      where.status = filters.status.trim().toUpperCase() as ServiceOrderStatus;
    }

    if (filters?.departmentId) {
      where.departmentId = Number(filters.departmentId);
    }

    if (filters?.supplierId) {
      where.supplierId = Number(filters.supplierId);
    }

    if (filters?.method && filters.method.trim() !== '') {
      where.method = filters.method.trim().toUpperCase();
    }

    if (filters?.currency && filters.currency.trim() !== '') {
      let c = filters.currency.trim().toUpperCase();
      if (c === 'VES') c = 'VED';
      where.transactionCurrency = c;
    }

    if (filters?.sourceAccountId) {
      where.sourceAccountId = filters.sourceAccountId;
    }

    if (filters?.startDate || filters?.endDate) {
      const dateFilter: Record<string, Date> = {};
      if (filters.startDate) {
        dateFilter.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
      where.createdAt = dateFilter;
    }

    return prisma.directPayment.findMany({
      where,
      include: DIRECT_PAYMENT_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  /**
   * Obtener una orden de servicio por su ID
   */
  static async getDirectPaymentById(id: bigint) {
    return prisma.directPayment.findUnique({
      where: { id },
      include: DIRECT_PAYMENT_INCLUDE,
    });
  }

  /**
   * Etapa 1: Crear una nueva Orden de Servicio (inicia en BORRADOR)
   * Mantiene soporte para `immediateSettlement: true` en casos legados.
   */
  static async createDirectPayment(data: CreateDirectPaymentDTO) {
    if (!data.concept || data.concept.trim() === '') {
      throw new Error('El concepto del servicio o egreso es obligatorio');
    }

    let resolvedBeneficiary = (data.beneficiary || '').trim();
    let resolvedSupplierId: number | null = null;

    if (data.supplierId) {
      const supplier = await prisma.supplier.findUnique({
        where: { id: Number(data.supplierId) },
      });
      if (!supplier) {
        throw new Error('El proveedor seleccionado no existe');
      }
      resolvedSupplierId = supplier.id;
      if (!resolvedBeneficiary) {
        resolvedBeneficiary = `${supplier.name} (${supplier.rifOrId})`;
      }
    } else {
      if (!resolvedBeneficiary) {
        throw new Error('El beneficiario o proveedor del servicio es obligatorio');
      }

      const rifPattern = /[JVEGPjvegp]-?\d{6,9}(-?\d)?/i;
      const hasRif = rifPattern.test(resolvedBeneficiary);

      if (!hasRif) {
        const registeredSupplier = await prisma.supplier.findFirst({
          where: {
            OR: [
              { name: { equals: resolvedBeneficiary, mode: 'insensitive' } },
              { contactName: { equals: resolvedBeneficiary, mode: 'insensitive' } },
            ],
          },
        });

        if (registeredSupplier) {
          resolvedSupplierId = registeredSupplier.id;
        } else {
          throw new Error(
            'Para beneficiarios o proveedores no registrados, es obligatorio suministrar el RIF o documento de identidad fiscal (ej. J-12345678-9, V-12345678, G-20000000-1).'
          );
        }
      }
    }

    let resolvedDepartmentId: number | null = null;
    if (data.departmentId) {
      const dept = await prisma.department.findUnique({
        where: { id: Number(data.departmentId) },
      });
      if (!dept) {
        throw new Error('El departamento o área solicitante no existe');
      }
      resolvedDepartmentId = dept.id;
    }

    const amount = Number(data.amountPaid);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('El monto del servicio debe ser mayor a 0');
    }

    const { txCurrency, effectiveRate, equivalentAmountUsd } =
      await computeExchangeAndUsd(amount, data.transactionCurrency, data.exchangeRate);

    let sourceAccountId: number | null = null;
    if (data.sourceAccountId) {
      const acc = await prisma.bankAccount.findUnique({
        where: { id: Number(data.sourceAccountId) },
      });
      if (acc) {
        sourceAccountId = acc.id;
      }
    }

    const isImmediate = Boolean(data.immediateSettlement);

    return prisma.$transaction(async (tx) => {
      const currentYear = new Date().getFullYear();
      const latest = await tx.directPayment.findFirst({
        where: { serviceOrderNumber: { startsWith: `OS-${currentYear}-` } },
        orderBy: { serviceOrderNumber: 'desc' },
      });

      let nextNum = 1;
      if (latest?.serviceOrderNumber) {
        const parts = latest.serviceOrderNumber.split('-');
        const lastSeq = Number(parts[2]);
        if (!Number.isNaN(lastSeq)) nextNum = lastSeq + 1;
      }
      const serviceOrderNumber = `OS-${currentYear}-${String(nextNum).padStart(4, '0')}`;

      const record = await tx.directPayment.create({
        data: {
          serviceOrderNumber,
          status: isImmediate ? ServiceOrderStatus.PAGADA : ServiceOrderStatus.BORRADOR,
          concept: data.concept.trim(),
          beneficiary: resolvedBeneficiary,
          supplierId: resolvedSupplierId,
          departmentId: resolvedDepartmentId,
          estimatedDate: data.estimatedDate ?? null,
          supportUrl: data.supportUrl ? data.supportUrl.trim() : null,
          method: (data.method || 'TRANSFERENCIA').toUpperCase(),
          sourceAccountId,
          destinationAccount: data.destinationAccount
            ? data.destinationAccount.trim()
            : null,
          referenceNumber: data.referenceNumber ? data.referenceNumber.trim() : null,
          paymentDate: data.paymentDate ?? new Date(),
          amountPaid: amount,
          transactionCurrency: txCurrency,
          exchangeRate: effectiveRate,
          equivalentAmountUsd,
          notes: data.notes ? data.notes.trim() : null,
          receiptImageUrl: data.receiptImageUrl ? data.receiptImageUrl.trim() : null,
          reviewedBy: data.reviewedBy ? data.reviewedBy.trim() : null,
          authorizedBy: data.authorizedBy ? data.authorizedBy.trim() : null,
          approvedBy: data.approvedBy ? data.approvedBy.trim() : null,
          registeredById: data.registeredById,
        },
        include: DIRECT_PAYMENT_INCLUDE,
      });

      if (isImmediate) {
        const refCode = `EGR-${Date.now()}-${record.id}`;
        const symbol = txCurrency === 'VED' ? 'Bs.' : txCurrency === 'EUR' ? '€' : '$';
        await tx.stockMovement.create({
          data: {
            referenceNumber: refCode,
            type: 'EGRESO_DIRECTO',
            notes: `Egreso Directo (${record.serviceOrderNumber}): ${record.concept} | Beneficiario: ${record.beneficiary} | Monto: ${symbol} ${amount.toFixed(2)} ${txCurrency} (Eq. $${equivalentAmountUsd.toFixed(2)} USD) | Ref: ${record.referenceNumber || 'S/R'}`,
            createdById: data.registeredById,
          },
        });
      }

      return record;
    });
  }

  /**
   * Etapa 1 -> 2: Enviar Orden de Servicio a Aprobación (BORRADOR / RECHAZADA -> EN_APROBACION)
   */
  static async submitForApproval(id: bigint) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.directPayment.findUnique({ where: { id } });
      if (!existing) {
        throw new Error('Orden de servicio no encontrada');
      }

      if (
        existing.status !== ServiceOrderStatus.BORRADOR &&
        existing.status !== ServiceOrderStatus.RECHAZADA
      ) {
        throw new Error(
          `Solo se pueden enviar a aprobación órdenes en estado BORRADOR o RECHAZADA. Estado actual: ${existing.status}.`
        );
      }

      return tx.directPayment.update({
        where: { id },
        data: {
          status: ServiceOrderStatus.EN_APROBACION,
          rejectedByUserId: null,
          rejectedAt: null,
          rejectionReason: null,
        },
        include: DIRECT_PAYMENT_INCLUDE,
      });
    });
  }

  /**
   * Etapa 2: Aprobar Orden de Servicio (EN_APROBACION -> APROBADA)
   */
  static async approveServiceOrder(id: bigint, userId: number, notes?: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.directPayment.findUnique({ where: { id } });
      if (!existing) {
        throw new Error('Orden de servicio no encontrada');
      }

      if (existing.status !== ServiceOrderStatus.EN_APROBACION) {
        throw new Error(
          `Solo se pueden aprobar órdenes en estado EN_APROBACION. Estado actual: ${existing.status}.`
        );
      }

      const approver = await tx.user.findUnique({
        where: { id: userId },
        select: { fullName: true },
      });

      return tx.directPayment.update({
        where: { id },
        data: {
          status: ServiceOrderStatus.APROBADA,
          approvedByUserId: userId,
          approvedAt: new Date(),
          approvalNotes: notes?.trim() || null,
          approvedBy: approver?.fullName || existing.approvedBy,
        },
        include: DIRECT_PAYMENT_INCLUDE,
      });
    });
  }

  /**
   * Etapa 2 (alterna): Rechazar Orden de Servicio (EN_APROBACION -> RECHAZADA)
   */
  static async rejectServiceOrder(id: bigint, userId: number, reason: string) {
    if (!reason || reason.trim().length < 5) {
      throw new Error('El motivo de rechazo es obligatorio y debe tener al menos 5 caracteres.');
    }

    return prisma.$transaction(async (tx) => {
      const existing = await tx.directPayment.findUnique({ where: { id } });
      if (!existing) {
        throw new Error('Orden de servicio no encontrada');
      }

      if (existing.status !== ServiceOrderStatus.EN_APROBACION) {
        throw new Error(
          `Solo se pueden rechazar órdenes en estado EN_APROBACION. Estado actual: ${existing.status}.`
        );
      }

      return tx.directPayment.update({
        where: { id },
        data: {
          status: ServiceOrderStatus.RECHAZADA,
          rejectedByUserId: userId,
          rejectedAt: new Date(),
          rejectionReason: reason.trim(),
        },
        include: DIRECT_PAYMENT_INCLUDE,
      });
    });
  }

  /**
   * Etapa 3: Generar Orden de Pago (APROBADA -> ORDEN_PAGO) con correlativo OP-YYYY-XXXX
   * Crea y vincula la entidad unificada PaymentOrder en Tesorería en estado APROBADA.
   */
  static async generatePaymentOrder(id: bigint, userId: number, notes?: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.directPayment.findUnique({
        where: { id },
        include: { supplier: true },
      });
      if (!existing) {
        throw new Error('Orden de servicio no encontrada');
      }

      if (existing.status !== ServiceOrderStatus.APROBADA) {
        throw new Error(
          `Solo se puede generar Orden de Pago para órdenes en estado APROBADA. Estado actual: ${existing.status}.`
        );
      }

      const paymentOrderNumber = await generateNextPaymentOrderNumber(tx);

      const issuer = await tx.user.findUnique({
        where: { id: userId },
        select: { fullName: true },
      });

      const debtCurrency = normalizeCurrency(existing.transactionCurrency);
      const totalDebt = new Prisma.Decimal(existing.amountPaid).toDecimalPlaces(
        2,
        Prisma.Decimal.ROUND_HALF_UP
      );

      // Crear la Orden de Pago unificada en Tesorería (lista para pagar)
      await tx.paymentOrder.create({
        data: {
          paymentOrderNumber,
          sourceType: PaymentOrderSourceType.SERVICE_ORDER,
          serviceOrderId: existing.id,
          supplierId: existing.supplierId,
          beneficiaryName: existing.supplier?.name || existing.beneficiary,
          concept: existing.concept,
          debtCurrency,
          totalDebtAmount: totalDebt,
          paidAmount: new Prisma.Decimal(0),
          remainingBalance: totalDebt,
          status: PaymentOrderStatus.APROBADA,
          notes: notes?.trim() || null,
          createdById: userId,
          approvedById: userId,
          approvedAt: new Date(),
          approvalNotes: notes?.trim() || 'Emitida desde Orden de Servicio aprobada',
        },
      });

      return tx.directPayment.update({
        where: { id },
        data: {
          status: ServiceOrderStatus.ORDEN_PAGO,
          paymentOrderNumber,
          paymentOrderIssuedAt: new Date(),
          paymentOrderIssuedById: userId,
          paymentOrderNotes: notes?.trim() || null,
          authorizedBy: issuer?.fullName || existing.authorizedBy,
        },
        include: DIRECT_PAYMENT_INCLUDE,
      });
    });
  }

  /**
   * Etapa 4: Registrar Pago efectivo contra Orden de Pago (ORDEN_PAGO -> PAGADA)
   */
  static async registerServicePayment(
    id: bigint,
    userId: number,
    payload: RegisterServicePaymentDTO
  ) {
    if (!payload.referenceNumber || payload.referenceNumber.trim() === '') {
      throw new Error('El número de referencia o comprobante de pago es obligatorio');
    }

    return prisma.$transaction(async (tx) => {
      const existing = await tx.directPayment.findUnique({ where: { id } });
      if (!existing) {
        throw new Error('Orden de servicio no encontrada');
      }

      if (existing.status !== ServiceOrderStatus.ORDEN_PAGO) {
        throw new Error(
          `Solo se puede registrar pago para órdenes en estado ORDEN_PAGO. Estado actual: ${existing.status}.`
        );
      }

      const amount =
        payload.amountPaid != null && Number(payload.amountPaid) > 0
          ? Number(payload.amountPaid)
          : Number(existing.amountPaid);

      if (isNaN(amount) || amount <= 0) {
        throw new Error('El monto pagado debe ser mayor a 0');
      }

      const { txCurrency, effectiveRate, equivalentAmountUsd } =
        await computeExchangeAndUsd(
          amount,
          payload.transactionCurrency || existing.transactionCurrency,
          payload.exchangeRate ?? Number(existing.exchangeRate)
        );

      let sourceAccountId: number | null = existing.sourceAccountId;
      if (payload.sourceAccountId !== undefined) {
        if (payload.sourceAccountId) {
          const acc = await tx.bankAccount.findUnique({
            where: { id: Number(payload.sourceAccountId) },
          });
          if (!acc) {
            throw new Error('La cuenta bancaria de origen seleccionada no existe');
          }
          sourceAccountId = acc.id;
        } else {
          sourceAccountId = null;
        }
      }

      const method = (payload.method || existing.method || 'TRANSFERENCIA').toUpperCase();

      const updated = await tx.directPayment.update({
        where: { id },
        data: {
          status: ServiceOrderStatus.PAGADA,
          method,
          sourceAccountId,
          destinationAccount:
            payload.destinationAccount !== undefined
              ? payload.destinationAccount?.trim() || null
              : existing.destinationAccount,
          referenceNumber: payload.referenceNumber.trim(),
          paymentDate: payload.paymentDate ?? new Date(),
          amountPaid: amount,
          transactionCurrency: txCurrency,
          exchangeRate: effectiveRate,
          equivalentAmountUsd,
          receiptImageUrl:
            payload.receiptImageUrl !== undefined
              ? payload.receiptImageUrl?.trim() || null
              : existing.receiptImageUrl,
          notes:
            payload.notes && payload.notes.trim()
              ? existing.notes
                ? `${existing.notes}\n[Pago]: ${payload.notes.trim()}`
                : payload.notes.trim()
              : existing.notes,
          reviewedBy: payload.reviewedBy?.trim() || existing.reviewedBy,
          authorizedBy: payload.authorizedBy?.trim() || existing.authorizedBy,
          approvedBy: payload.approvedBy?.trim() || existing.approvedBy,
        },
        include: DIRECT_PAYMENT_INCLUDE,
      });

      // Sincronizar Orden de Pago unificada en Tesorería si existe
      await tx.paymentOrder.updateMany({
        where: {
          serviceOrderId: id,
          status: {
            in: [
              PaymentOrderStatus.APROBADA,
              PaymentOrderStatus.PAGADA_PARCIALMENTE,
              PaymentOrderStatus.PENDIENTE_APROBACION,
            ],
          },
        },
        data: {
          paidAmount: existing.amountPaid,
          remainingBalance: new Prisma.Decimal(0),
          status: PaymentOrderStatus.PAGADA,
        },
      });

      // Asentar egreso financiero en Kardex General (StockMovement)
      const refCode = `EGR-${Date.now()}-${updated.id}`;
      const symbol = txCurrency === 'VED' ? 'Bs.' : txCurrency === 'EUR' ? '€' : '$';
      await tx.stockMovement.create({
        data: {
          referenceNumber: refCode,
          type: 'EGRESO_DIRECTO',
          notes: `Egreso Directo (${updated.serviceOrderNumber || `#${updated.id}`} / ${updated.paymentOrderNumber || 'OP'}): ${updated.concept} | Beneficiario: ${updated.beneficiary} | Monto: ${symbol} ${amount.toFixed(2)} ${txCurrency} (Eq. $${equivalentAmountUsd.toFixed(2)} USD) | Ref: ${updated.referenceNumber || 'S/R'}`,
          createdById: userId,
        },
      });

      return updated;
    });
  }

  /**
   * Cancelar Orden de Servicio (antes de ser pagada)
   */
  static async cancelServiceOrder(id: bigint, userId: number, reason?: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.directPayment.findUnique({ where: { id } });
      if (!existing) {
        throw new Error('Orden de servicio no encontrada');
      }

      if (
        existing.status === ServiceOrderStatus.PAGADA ||
        existing.status === ServiceOrderStatus.CANCELADA
      ) {
        throw new Error(
          `No se puede cancelar una orden de servicio en estado ${existing.status}.`
        );
      }

      await tx.paymentOrder.updateMany({
        where: {
          serviceOrderId: id,
          status: {
            in: [
              PaymentOrderStatus.BORRADOR,
              PaymentOrderStatus.PENDIENTE_APROBACION,
              PaymentOrderStatus.APROBADA,
            ],
          },
          paidAmount: { lte: 0 },
        },
        data: {
          status: PaymentOrderStatus.ANULADA,
          rejectedById: userId,
          rejectedAt: new Date(),
          rejectionReason: reason?.trim() || 'Orden de servicio cancelada',
        },
      });

      return tx.directPayment.update({
        where: { id },
        data: {
          status: ServiceOrderStatus.CANCELADA,
          rejectedByUserId: userId,
          rejectedAt: new Date(),
          rejectionReason: reason?.trim() || 'Cancelada por usuario autorizado',
        },
        include: DIRECT_PAYMENT_INCLUDE,
      });
    });
  }

  /**
   * Eliminar una orden de servicio / pago directo (Solo ADMINISTRADOR)
   */
  static async deleteDirectPayment(id: bigint, deletedByUserId?: number, reason?: string) {
    const existing = await prisma.directPayment.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Orden de servicio no encontrada');
    }

    return prisma.$transaction(async (tx) => {
      if (existing.status === ServiceOrderStatus.PAGADA) {
        const symbol =
          existing.transactionCurrency === 'VED'
            ? 'Bs.'
            : existing.transactionCurrency === 'EUR'
              ? '€'
              : '$';

        await tx.stockMovement.create({
          data: {
            referenceNumber: `REV-EGR-${Date.now()}-${existing.id}`,
            type: 'EGRESO_DIRECTO',
            notes: `ANULACIÓN Y REVERSO de Orden de Servicio #${existing.serviceOrderNumber || existing.id} | Concepto: ${existing.concept} | Beneficiario: ${existing.beneficiary} | Monto Revertido: ${symbol} ${Number(existing.amountPaid).toFixed(2)} ${existing.transactionCurrency} (Eq. $${Number(existing.equivalentAmountUsd).toFixed(2)} USD) | Ref: ${existing.referenceNumber || 'S/R'}${reason ? ` | Motivo: ${reason.trim()}` : ''}`,
            createdById: deletedByUserId || existing.registeredById,
          },
        });
      }

      return tx.directPayment.delete({
        where: { id },
      });
    });
  }
}
