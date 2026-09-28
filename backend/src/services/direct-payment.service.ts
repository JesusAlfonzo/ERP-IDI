import { prisma } from '../config/prisma.js';

export interface CreateDirectPaymentDTO {
  concept: string;
  beneficiary: string;
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
}

export class DirectPaymentService {
  /**
   * Listar pagos directos / egresos con filtros
   */
  static async listDirectPayments(filters?: {
    search?: string;
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
        { concept: { contains: s, mode: 'insensitive' } },
        { beneficiary: { contains: s, mode: 'insensitive' } },
        { referenceNumber: { contains: s, mode: 'insensitive' } },
        { destinationAccount: { contains: s, mode: 'insensitive' } },
      ];
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
      where.paymentDate = dateFilter;
    }

    return prisma.directPayment.findMany({
      where,
      include: {
        sourceAccount: true,
        registeredBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });
  }

  /**
   * Obtener un pago directo por su ID
   */
  static async getDirectPaymentById(id: bigint) {
    return prisma.directPayment.findUnique({
      where: { id },
      include: {
        sourceAccount: true,
        registeredBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Crear un nuevo pago directo / egreso
   */
  static async createDirectPayment(data: CreateDirectPaymentDTO) {
    if (!data.concept || data.concept.trim() === '') {
      throw new Error('El concepto del pago o egreso es obligatorio');
    }

    if (!data.beneficiary || data.beneficiary.trim() === '') {
      throw new Error('El beneficiario del pago es obligatorio');
    }

    const amount = Number(data.amountPaid);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('El monto del pago debe ser mayor a 0');
    }

    let txCurrency = (data.transactionCurrency || 'USD').toUpperCase();
    if (txCurrency === 'VES') txCurrency = 'VED';

    let effectiveRate =
      data.exchangeRate != null && Number(data.exchangeRate) > 0
        ? Number(data.exchangeRate)
        : null;

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

    // Calcular equivalentAmountUsd para reporte financiero
    let equivalentAmountUsd = amount;
    if (txCurrency === 'VED') {
      equivalentAmountUsd = effectiveRate > 0 ? amount / effectiveRate : amount;
    } else if (txCurrency === 'EUR') {
      if (effectiveRate > 10) {
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
        equivalentAmountUsd =
          bcvUsd > 0 ? (amount * effectiveRate) / bcvUsd : amount;
      } else {
        equivalentAmountUsd = amount * effectiveRate;
      }
    } else {
      equivalentAmountUsd = amount;
    }
    equivalentAmountUsd = Math.round(equivalentAmountUsd * 100) / 100;

    let sourceAccountId: number | null = null;
    if (data.sourceAccountId) {
      const acc = await prisma.bankAccount.findUnique({
        where: { id: Number(data.sourceAccountId) },
      });
      if (acc) {
        sourceAccountId = acc.id;
      }
    }

    return prisma.$transaction(async (tx) => {
      const payment = await tx.directPayment.create({
        data: {
          concept: data.concept.trim(),
          beneficiary: data.beneficiary.trim(),
          method: (data.method || 'TRANSFERENCIA').toUpperCase(),
          sourceAccountId,
          destinationAccount: data.destinationAccount
            ? data.destinationAccount.trim()
            : null,
          referenceNumber: data.referenceNumber
            ? data.referenceNumber.trim()
            : null,
          paymentDate: data.paymentDate ?? new Date(),
          amountPaid: amount,
          transactionCurrency: txCurrency,
          exchangeRate: effectiveRate,
          equivalentAmountUsd,
          notes: data.notes ? data.notes.trim() : null,
          receiptImageUrl: data.receiptImageUrl
            ? data.receiptImageUrl.trim()
            : null,
          reviewedBy: data.reviewedBy ? data.reviewedBy.trim() : null,
          authorizedBy: data.authorizedBy ? data.authorizedBy.trim() : null,
          approvedBy: data.approvedBy ? data.approvedBy.trim() : null,
          registeredById: data.registeredById,
        },
        include: {
          sourceAccount: true,
          registeredBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      // Insertar asiento financiero en el Kardex General
      const movCount = await tx.stockMovement.count();
      const refNum = `EGRESO-${new Date().getFullYear()}-${String(movCount + 1).padStart(5, '0')}`;
      await tx.stockMovement.create({
        data: {
          referenceNumber: refNum,
          type: 'EGRESO_DIRECTO',
          createdById: data.registeredById,
          productId: null,
          notes: `Pago de Servicio / Egreso Directo: ${data.concept.trim()} (${data.beneficiary.trim()}) - ${txCurrency} ${amount.toFixed(2)} (Equiv. $${equivalentAmountUsd.toFixed(2)}) - Ref: ${data.referenceNumber ? data.referenceNumber.trim() : 'S/R'}`,
        },
      });

      return payment;
    });
  }

  /**
   * Eliminar un pago directo (solo Administrador)
   */
  static async deleteDirectPayment(id: bigint) {
    const payment = await prisma.directPayment.findUnique({
      where: { id },
    });
    if (!payment) {
      throw new Error('Pago directo no encontrado');
    }
    return prisma.directPayment.delete({
      where: { id },
    });
  }
}
