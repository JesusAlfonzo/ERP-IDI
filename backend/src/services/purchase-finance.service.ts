import { prisma } from '../config/prisma.js';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

export interface RegisterInvoiceDTO {
  orderId: bigint;
  invoiceNumber: string;
  controlNumber?: string | null;
  invoiceDate: Date;
  taxAmount: number;
  totalAmount: number;
  fileUrl?: string | null;
}

export interface RegisterPaymentDTO {
  orderId: bigint;
  paymentMethod: PaymentMethod;
  currencyId: number;
  amount: number;
  exchangeRate?: number | null;
  bankName?: string | null;
  referenceNumber?: string | null;
  paymentDate?: Date;
  receiptImageUrl?: string | null;
  registeredById: number;
}

export class PurchaseFinanceService {
  /**
   * Registro de Factura Fiscal asociada a una Orden
   */
  static async registerInvoice(data: RegisterInvoiceDTO) {
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
    });

    if (!order) {
      throw new Error('Orden de compra no encontrada');
    }

    return prisma.orderInvoice.create({
      data: {
        orderId: data.orderId,
        invoiceNumber: data.invoiceNumber.trim(),
        controlNumber: data.controlNumber ? data.controlNumber.trim() : null,
        invoiceDate: data.invoiceDate,
        taxAmount: data.taxAmount,
        totalAmount: data.totalAmount,
        fileUrl: data.fileUrl ?? null,
      },
    });
  }

  /**
   * Registro de Pago / Abono con recalculo atómico de PaymentStatus
   */
  static async registerPayment(data: RegisterPaymentDTO) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: data.orderId },
        include: {
          currency: true,
          payments: true,
        },
      });

      if (!order) {
        throw new Error('Orden de compra no encontrada');
      }

      if (order.paymentStatus === PaymentStatus.PAGADO) {
        throw new Error('Esta orden ya se encuentra totalmente pagada');
      }

      // Determinar tasa de cambio aplicada al pago
      let effectiveRate = data.exchangeRate;
      if (!effectiveRate) {
        const currency = await tx.currency.findUnique({
          where: { id: data.currencyId },
          include: {
            exchanges: {
              orderBy: { effectiveDate: 'desc' },
              take: 1,
            },
          },
        });

        effectiveRate = currency?.isDefault
          ? 1.0
          : currency?.exchanges[0]?.rate
            ? Number(currency.exchanges[0].rate)
            : 1.0;
      }

      // Registrar el pago
      const payment = await tx.orderPayment.create({
        data: {
          orderId: data.orderId,
          paymentMethod: data.paymentMethod,
          currencyId: data.currencyId,
          exchangeRate: effectiveRate,
          amount: data.amount,
          bankName: data.bankName ? data.bankName.trim() : null,
          referenceNumber: data.referenceNumber
            ? data.referenceNumber.trim()
            : null,
          paymentDate: data.paymentDate ?? new Date(),
          receiptImageUrl: data.receiptImageUrl ?? null,
          registeredById: data.registeredById,
        },
        include: {
          currency: true,
        },
      });

      // Calcular total pagado normalizado a la moneda de la orden
      // Si el pago es en otra moneda, se convierte según la tasa
      const allPayments = [...order.payments, payment];

      let totalPaidNormalized = 0;
      for (const p of allPayments) {
        const pAmount = Number(p.amount);
        const pRate = Number(p.exchangeRate);

        if (p.currencyId === order.currencyId) {
          totalPaidNormalized += pAmount;
        } else if (order.currencyId === 1) {
          // Si la orden es en USD (moneda 1) y el pago es en otra moneda (ej. VES)
          totalPaidNormalized += pRate > 0 ? pAmount / pRate : pAmount;
        } else {
          // Si la orden es en VES y el pago es en USD
          totalPaidNormalized += pAmount * pRate;
        }
      }

      const orderTotal = Number(order.total);
      const isFull = totalPaidNormalized >= orderTotal - 0.01; // Margen de redondeo

      const nextPaymentStatus = isFull
        ? PaymentStatus.PAGADO
        : PaymentStatus.PAGADO_PARCIAL;

      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: nextPaymentStatus,
        },
      });

      return {
        payment,
        orderTotal,
        totalPaidNormalized,
        paymentStatus: nextPaymentStatus,
      };
    });
  }

  /**
   * Resumen financiero de una Orden (facturas, pagos y saldo pendiente)
   */
  static async getOrderFinancialSummary(orderId: bigint) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        currency: true,
        invoices: true,
        payments: {
          include: {
            currency: true,
            registeredBy: {
              select: { id: true, fullName: true, username: true },
            },
          },
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!order) {
      throw new Error('Orden no encontrada');
    }

    let totalPaidNormalized = 0;
    for (const p of order.payments) {
      const pAmount = Number(p.amount);
      const pRate = Number(p.exchangeRate);

      if (p.currencyId === order.currencyId) {
        totalPaidNormalized += pAmount;
      } else if (order.currencyId === 1) {
        totalPaidNormalized += pRate > 0 ? pAmount / pRate : pAmount;
      } else {
        totalPaidNormalized += pAmount * pRate;
      }
    }

    const orderTotal = Number(order.total);
    const balanceDue = Math.max(0, orderTotal - totalPaidNormalized);

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      currency: order.currency.code,
      orderTotal,
      totalPaid: totalPaidNormalized,
      balanceDue,
      paymentStatus: order.paymentStatus,
      invoices: order.invoices,
      payments: order.payments,
    };
  }
}
