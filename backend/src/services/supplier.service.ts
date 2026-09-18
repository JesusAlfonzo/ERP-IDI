import { prisma } from '../config/prisma.js';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

export interface CreateSupplierDTO {
  rifOrId: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
}

export interface UpdateSupplierDTO {
  name?: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  isActive?: boolean;
}

export interface RegisterSupplierPaymentDTO {
  supplierId: number;
  amountUsd: number;
  paymentMethod: PaymentMethod;
  referenceNumber?: string | null;
  paymentDate?: Date;
  notes?: string | null;
  registeredById: number;
}

export class SupplierService {
  private static normalizePaymentToUsd(
    amount: number,
    currencyId: number,
    exchangeRate: number
  ) {
    return currencyId === 1
      ? amount
      : exchangeRate > 0
        ? amount / exchangeRate
        : amount;
  }

  private static summarizeOrder(order: {
    total: unknown;
    currencyId: number;
    exchangeRate: unknown;
    payments: {
      amount: unknown;
      currencyId: number;
      exchangeRate: unknown;
      paymentDate?: Date;
    }[];
  }) {
    const totalUsd = this.normalizePaymentToUsd(
      Number(order.total),
      order.currencyId,
      Number(order.exchangeRate)
    );
    const paidUsd = order.payments.reduce(
      (sum, payment) =>
        sum +
        this.normalizePaymentToUsd(
          Number(payment.amount),
          payment.currencyId,
          Number(payment.exchangeRate)
        ),
      0
    );
    return { totalUsd, paidUsd, balanceUsd: Math.max(0, totalUsd - paidUsd) };
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
            total: true,
            currencyId: true,
            exchangeRate: true,
            paymentStatus: true,
            createdAt: true,
            payments: {
              select: {
                amount: true,
                currencyId: true,
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
      const orders = supplier.orders.map((order) => ({
        ...order,
        ...this.summarizeOrder(order),
      }));
      const totalPurchasedUsd = orders.reduce(
        (sum, order) => sum + order.totalUsd,
        0
      );
      const totalPaidUsd = orders.reduce(
        (sum, order) => sum + order.paidUsd,
        0
      );
      const now = new Date();
      const totalPaidThisMonthUsd = orders.reduce(
        (sum, order) =>
          sum +
          order.payments.reduce(
            (paymentSum, payment) =>
              paymentSum +
              (payment.paymentDate &&
              payment.paymentDate.getMonth() === now.getMonth() &&
              payment.paymentDate.getFullYear() === now.getFullYear()
                ? this.normalizePaymentToUsd(
                    Number(payment.amount),
                    payment.currencyId,
                    Number(payment.exchangeRate)
                  )
                : 0),
            0
          ),
        0
      );
      const balanceUsd = Math.max(0, totalPurchasedUsd - totalPaidUsd);
      return {
        id: supplier.id,
        name: supplier.name,
        rifOrId: supplier.rifOrId,
        totalPurchasedUsd,
        totalPaidUsd,
        totalPaidThisMonthUsd,
        balanceUsd,
        status: balanceUsd > 0.009 ? 'CON_DEUDA' : 'SOLVENTE',
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
            currency: true,
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
    const orders = supplier.orders.map((order) => ({
      ...order,
      ...this.summarizeOrder(order),
    }));
    return {
      supplier: {
        id: supplier.id,
        name: supplier.name,
        rifOrId: supplier.rifOrId,
      },
      orders,
      totalPurchasedUsd: orders.reduce((sum, order) => sum + order.totalUsd, 0),
      totalPaidUsd: orders.reduce((sum, order) => sum + order.paidUsd, 0),
      balanceUsd: Math.max(
        0,
        orders.reduce((sum, order) => sum + order.balanceUsd, 0)
      ),
    };
  }

  static async registerPayment(data: RegisterSupplierPaymentDTO) {
    if (data.amountUsd <= 0)
      throw new Error('El monto del pago debe ser mayor que 0');
    return prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findUnique({
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

      const target = supplier.orders.find(
        (order) => this.summarizeOrder(order).balanceUsd > 0.009
      );
      if (!target) throw new Error('El proveedor no tiene saldo pendiente');

      const ves = await tx.currency.findUnique({
        where: { code: 'VES' },
        include: { exchanges: { orderBy: { effectiveDate: 'desc' }, take: 1 } },
      });
      const rate =
        data.paymentMethod === PaymentMethod.TRANSFERENCIA_USD ||
        data.paymentMethod === PaymentMethod.EFECTIVO_USD
          ? 1
          : Number(ves?.exchanges[0]?.rate ?? 1);
      const currencyId =
        data.paymentMethod === PaymentMethod.TRANSFERENCIA_USD ||
        data.paymentMethod === PaymentMethod.EFECTIVO_USD
          ? 1
          : 2;
      const amount = currencyId === 1 ? data.amountUsd : data.amountUsd * rate;
      const payment = await tx.orderPayment.create({
        data: {
          orderId: target.id,
          paymentMethod: data.paymentMethod,
          currencyId,
          exchangeRate: rate,
          amount,
          referenceNumber: data.referenceNumber?.trim() || null,
          paymentDate: data.paymentDate ?? new Date(),
          receiptImageUrl: data.notes?.trim() || null,
          registeredById: data.registeredById,
        },
        include: { currency: true },
      });
      const allPayments = [...target.payments, payment];
      const paidUsd = allPayments.reduce(
        (sum, item) =>
          sum +
          this.normalizePaymentToUsd(
            Number(item.amount),
            item.currencyId,
            Number(item.exchangeRate)
          ),
        0
      );
      const totalUsd = this.summarizeOrder(target).totalUsd;
      await tx.order.update({
        where: { id: target.id },
        data: {
          paymentStatus:
            paidUsd >= totalUsd - 0.01
              ? PaymentStatus.PAGADO
              : PaymentStatus.PAGADO_PARCIAL,
        },
      });
      return payment;
    });
  }
  static async listSuppliers(search?: string) {
    return prisma.supplier.findMany({
      where: {
        isActive: true,
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
    });

    if (!supplier) {
      throw new Error('Proveedor no encontrado');
    }

    return supplier;
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
      throw new Error('Proveedor no encontrado');
    }

    return prisma.supplier.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.contactName !== undefined
          ? { contactName: data.contactName }
          : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.email !== undefined
          ? { email: data.email ? data.email.trim().toLowerCase() : null }
          : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
  }

  static async deleteSupplier(id: number) {
    const supplier = await prisma.supplier.findUnique({ where: { id } });

    if (!supplier) {
      throw new Error('Proveedor no encontrado');
    }

    // Desactivación lógica para no romper historial de órdenes
    return prisma.supplier.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
