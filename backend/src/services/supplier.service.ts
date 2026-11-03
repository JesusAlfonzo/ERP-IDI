import { prisma } from '../config/prisma.js';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { serializeBigInt } from '../utils/serializer.js';
import { PurchaseFinanceService } from './purchase-finance.service.js';

export interface CreateSupplierDTO {
  rifOrId: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export interface UpdateSupplierDTO {
  rifOrId?: string;
  name?: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive?: boolean;
}

export interface RegisterSupplierPaymentDTO {
  supplierId: number;
  amountUsd?: number;
  amount?: number;
  amountPaid?: number;
  method?: string;
  paymentMethod?: PaymentMethod | string;
  sourceAccountId?: number | null;
  transactionCurrency?: string;
  exchangeRate?: number | null;
  bankName?: string | null;
  referenceNumber?: string | null;
  paymentDate?: Date;
  notes?: string | null;
  receiptImageUrl?: string | null;
  reviewedBy?: string | null;
  authorizedBy?: string | null;
  approvedBy?: string | null;
  registeredById: number;
}

export class SupplierService {
  private static normalizePaymentToUsd(
    amount: number,
    currencyId: number | null,
    exchangeRate: number
  ) {
    const effectiveCurrencyId = currencyId ?? 1;
    return effectiveCurrencyId === 1
      ? amount
      : exchangeRate > 0
        ? amount / exchangeRate
        : amount;
  }

  private static summarizeOrder(order: {
    total: unknown;
    totalAmount?: unknown;
    totalAmountBs?: unknown;
    totalAmountUsd?: unknown;
    currency?: string | null;
    currencyId: number;
    exchangeRate: unknown;
    payments: {
      amount: unknown;
      amountPaid?: unknown;
      currencyId: number | null;
      transactionCurrency?: string | null;
      exchangeRate: unknown;
      paymentDate?: Date;
    }[];
  }) {
    let orderCurrency = (order.currency || 'USD').trim().toUpperCase();
    if (orderCurrency === 'VES') orderCurrency = 'VED';

    // Monto pactado en su propia moneda
    const totalAgreed = Number(
      orderCurrency === 'VED'
        ? (order.totalAmountBs ?? order.total ?? 0)
        : orderCurrency === 'EUR'
          ? (order.total ?? 0)
          : (order.totalAmountUsd ?? order.total ?? 0)
    );

    // Total en USD referencial
    const totalUsd = Number(
      order.totalAmountUsd != null && Number(order.totalAmountUsd) > 0
        ? order.totalAmountUsd
        : orderCurrency === 'USD'
          ? totalAgreed
          : Number(order.exchangeRate) > 0
            ? totalAgreed / Number(order.exchangeRate)
            : totalAgreed
    );

    // Calcular cuánto se ha abonado en la moneda pactada
    let paidAgreed = 0;
    let paidUsd = 0;

    for (const p of order.payments) {
      let pCurr = (p.transactionCurrency || (p.currencyId === 1 ? 'USD' : 'VED')).trim().toUpperCase();
      if (pCurr === 'VES') pCurr = 'VED';

      const pAmt = Number(p.amountPaid ?? p.amount ?? 0);
      const pRate = Number(p.exchangeRate || 1.0);

      // Conversión a la moneda de la orden
      if (pCurr === orderCurrency) {
        paidAgreed += pAmt;
      } else if (orderCurrency === 'VED' && pCurr === 'USD') {
        paidAgreed += pRate > 0 ? pAmt * pRate : pAmt;
      } else if (orderCurrency === 'USD' && pCurr === 'VED') {
        paidAgreed += pRate > 0 ? pAmt / pRate : pAmt;
      } else {
        paidAgreed += pAmt;
      }

      // Conversión a USD referencial
      if (pCurr === 'USD') {
        paidUsd += pAmt;
      } else if (pRate > 0) {
        paidUsd += pAmt / pRate;
      } else {
        paidUsd += pAmt;
      }
    }

    const balanceAgreed = Math.max(0, Math.round((totalAgreed - paidAgreed) * 100) / 100);
    const balanceUsd = Math.max(0, Math.round((totalUsd - paidUsd) * 100) / 100);

    return {
      orderCurrency,
      totalAgreed: Math.round(totalAgreed * 100) / 100,
      paidAgreed: Math.round(paidAgreed * 100) / 100,
      balanceAgreed,
      totalUsd: Math.round(totalUsd * 100) / 100,
      paidUsd: Math.round(paidUsd * 100) / 100,
      balanceUsd,
    };
  }

  static async listDebts() {
    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      include: {
        orders: {
          where: { status: { not: OrderStatus.CANCELADA } },
          select: {
            id: true,
            orderNumber: true,
            currency: true,
            total: true,
            totalAmount: true,
            totalAmountBs: true,
            totalAmountUsd: true,
            currencyId: true,
            exchangeRate: true,
            paymentStatus: true,
            createdAt: true,
            payments: {
              select: {
                amount: true,
                amountPaid: true,
                currencyId: true,
                transactionCurrency: true,
                exchangeRate: true,
                paymentDate: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return suppliers.map((supplier) => {
      let totalPurchasedBs = 0;
      let totalPaidBs = 0;
      let balanceBs = 0;

      let totalPurchasedUsd = 0;
      let totalPaidUsd = 0;
      let balanceUsd = 0;

      let totalPurchasedEur = 0;
      let totalPaidEur = 0;
      let balanceEur = 0;

      const orders = supplier.orders.map((order) => {
        const sum = this.summarizeOrder(order);
        if (sum.orderCurrency === 'VED') {
          totalPurchasedBs += sum.totalAgreed;
          totalPaidBs += sum.paidAgreed;
          balanceBs += sum.balanceAgreed;
        } else if (sum.orderCurrency === 'EUR') {
          totalPurchasedEur += sum.totalAgreed;
          totalPaidEur += sum.paidAgreed;
          balanceEur += sum.balanceAgreed;
        } else {
          totalPurchasedUsd += sum.totalAgreed;
          totalPaidUsd += sum.paidAgreed;
          balanceUsd += sum.balanceAgreed;
        }
        return {
          ...order,
          ...sum,
        };
      });

      const hasDebt = balanceBs > 0.01 || balanceUsd > 0.01 || balanceEur > 0.01;

      return {
        id: supplier.id,
        name: supplier.name,
        rifOrId: supplier.rifOrId,
        // Balances separados en las 3 Monedas
        balanceBs: Math.round(balanceBs * 100) / 100,
        balanceUsd: Math.round(balanceUsd * 100) / 100,
        balanceEur: Math.round(balanceEur * 100) / 100,
        totalPurchasedBs: Math.round(totalPurchasedBs * 100) / 100,
        totalPaidBs: Math.round(totalPaidBs * 100) / 100,
        totalPurchasedUsd: Math.round(totalPurchasedUsd * 100) / 100,
        totalPaidUsd: Math.round(totalPaidUsd * 100) / 100,
        totalPurchasedEur: Math.round(totalPurchasedEur * 100) / 100,
        totalPaidEur: Math.round(totalPaidEur * 100) / 100,
        totalPaidThisMonthUsd: 0,
        status: hasDebt ? 'CON_DEUDA' : 'SOLVENTE',
      };
    });
  }

  static async getStatement(id: number) {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        orders: {
          where: { status: { not: OrderStatus.CANCELADA } },
          include: {
            currencyRel: true,
            payments: {
              include: {
                currency: true,
                registeredBy: { select: { fullName: true, username: true } },
              },
              orderBy: { paymentDate: 'desc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!supplier) throw new Error('Proveedor no encontrado');

    let totalPurchasedBs = 0;
    let totalPaidBs = 0;
    let balanceBs = 0;

    let totalPurchasedUsd = 0;
    let totalPaidUsd = 0;
    let balanceUsd = 0;

    let totalPurchasedEur = 0;
    let totalPaidEur = 0;
    let balanceEur = 0;

    const orders = supplier.orders.map((order) => {
      const sum = this.summarizeOrder(order);
      if (sum.orderCurrency === 'VED') {
        totalPurchasedBs += sum.totalAgreed;
        totalPaidBs += sum.paidAgreed;
        balanceBs += sum.balanceAgreed;
      } else if (sum.orderCurrency === 'EUR') {
        totalPurchasedEur += sum.totalAgreed;
        totalPaidEur += sum.paidAgreed;
        balanceEur += sum.balanceAgreed;
      } else {
        totalPurchasedUsd += sum.totalAgreed;
        totalPaidUsd += sum.paidAgreed;
        balanceUsd += sum.balanceAgreed;
      }
      return {
        ...order,
        ...sum,
      };
    });

    return {
      supplier: {
        id: supplier.id,
        name: supplier.name,
        rifOrId: supplier.rifOrId,
      },
      orders,
      balanceBs: Math.round(balanceBs * 100) / 100,
      balanceUsd: Math.round(balanceUsd * 100) / 100,
      balanceEur: Math.round(balanceEur * 100) / 100,
      totalPurchasedBs: Math.round(totalPurchasedBs * 100) / 100,
      totalPaidBs: Math.round(totalPaidBs * 100) / 100,
      totalPurchasedUsd: Math.round(totalPurchasedUsd * 100) / 100,
      totalPaidUsd: Math.round(totalPaidUsd * 100) / 100,
      totalPurchasedEur: Math.round(totalPurchasedEur * 100) / 100,
      totalPaidEur: Math.round(totalPaidEur * 100) / 100,
    };
  }

  static async registerPayment(data: RegisterSupplierPaymentDTO) {
    const rawAmount =
      data.amountPaid !== undefined && data.amountPaid !== null
        ? Number(data.amountPaid)
        : data.amount !== undefined && data.amount !== null
          ? Number(data.amount)
          : Number(data.amountUsd || 0);

    if (rawAmount <= 0) {
      throw new Error('El monto del pago debe ser mayor que 0');
    }

    const supplier = await prisma.supplier.findUnique({
      where: { id: data.supplierId },
      include: {
        orders: {
          where: { status: { not: OrderStatus.CANCELADA } },
          include: { payments: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!supplier) throw new Error('Proveedor no encontrado');

    const targetCurr = (data.transactionCurrency || 'USD').trim().toUpperCase() === 'VES' ? 'VED' : (data.transactionCurrency || 'USD').trim().toUpperCase();

    // Buscar primero una orden pendiente en la misma moneda del pago
    let target = supplier.orders.find((order) => {
      const summary = this.summarizeOrder(order);
      return summary.orderCurrency === targetCurr && summary.balanceAgreed > 0.009;
    });

    // Si no hay en la misma moneda, tomar la primera con saldo pendiente
    if (!target) {
      target = supplier.orders.find((order) => {
        const summary = this.summarizeOrder(order);
        return summary.balanceAgreed > 0.009;
      });
    }
    if (!target) throw new Error('El proveedor no tiene saldo pendiente');

    return PurchaseFinanceService.registerPayment({
      orderId: target.id,
      method: data.method,
      paymentMethod: data.paymentMethod as any,
      sourceAccountId: data.sourceAccountId,
      amount: rawAmount,
      amountPaid: rawAmount,
      transactionCurrency: data.transactionCurrency || 'USD',
      exchangeRate: data.exchangeRate,
      bankName: data.bankName,
      referenceNumber: data.referenceNumber,
      paymentDate: data.paymentDate ?? new Date(),
      receiptImageUrl: data.receiptImageUrl ?? data.notes,
      reviewedBy: data.reviewedBy,
      authorizedBy: data.authorizedBy,
      approvedBy: data.approvedBy,
      registeredById: data.registeredById,
    });
  }
  static async listSuppliers(search?: string, includeInactive = false) {
    return prisma.supplier.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(search
          ? {
              OR: [
                { rifOrId: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
                { contactName: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  static async getSupplierById(id: number) {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orders: true },
        },
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            receptionStatus: true,
            total: true,
            totalAmountUsd: true,
            totalAmountBs: true,
            currency: true,
            createdAt: true,
          },
        },
      },
    });

    if (!supplier) {
      const error: any = new Error('Proveedor no encontrado');
      error.statusCode = 404;
      error.status = 'NOT_FOUND';
      throw error;
    }

    return serializeBigInt({
      ...supplier,
      rif: supplier.rifOrId,
    });
  }

  static async createSupplier(data: CreateSupplierDTO) {
    const existing = await prisma.supplier.findUnique({
      where: { rifOrId: data.rifOrId.trim().toUpperCase() },
    });

    if (existing) {
      throw new Error(
        'Ya existe un proveedor registrado con este RIF o identificación'
      );
    }

    return prisma.supplier.create({
      data: {
        rifOrId: data.rifOrId.trim().toUpperCase(),
        name: data.name.trim(),
        contactName: data.contactName ?? null,
        phone: data.phone ?? null,
        email: data.email ? data.email.trim().toLowerCase() : null,
        address: data.address ?? null,
      },
    });
  }

  static async updateSupplier(id: number, data: UpdateSupplierDTO) {
    const supplier = await prisma.supplier.findUnique({ where: { id } });

    if (!supplier) {
      const error: any = new Error('Proveedor no encontrado');
      error.statusCode = 404;
      error.status = 'NOT_FOUND';
      throw error;
    }

    if (data.rifOrId !== undefined) {
      const cleanRif = data.rifOrId.trim().toUpperCase();
      const duplicate = await prisma.supplier.findFirst({
        where: {
          rifOrId: cleanRif,
          id: { not: id },
        },
      });

      if (duplicate) {
        const error: any = new Error(
          'Ya existe otro proveedor registrado con este RIF o identificación'
        );
        error.statusCode = 409;
        error.status = 'CONFLICT';
        throw error;
      }
    }

    const updated = await prisma.supplier.update({
      where: { id },
      data: {
        ...(data.rifOrId !== undefined ? { rifOrId: data.rifOrId.trim().toUpperCase() } : {}),
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.contactName !== undefined
          ? { contactName: data.contactName ? data.contactName.trim() : null }
          : {}),
        ...(data.phone !== undefined ? { phone: data.phone ? data.phone.trim() : null } : {}),
        ...(data.email !== undefined
          ? { email: data.email ? data.email.trim().toLowerCase() : null }
          : {}),
        ...(data.address !== undefined ? { address: data.address ? data.address.trim() : null } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    return serializeBigInt({
      ...updated,
      rif: updated.rifOrId,
    });
  }

  static async deleteSupplier(id: number) {
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!supplier) {
      const error: any = new Error('Proveedor no encontrado');
      error.statusCode = 404;
      error.status = 'NOT_FOUND';
      throw error;
    }

    if (supplier._count.orders > 0) {
      const error: any = new Error(
        'No se puede eliminar el proveedor porque tiene órdenes de compra en el historial. Inactívelo en su lugar.'
      );
      error.statusCode = 409;
      error.status = 'CONFLICT';
      throw error;
    }

    return prisma.supplier.delete({
      where: { id },
    });
  }
}
