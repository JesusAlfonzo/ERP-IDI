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
  method?: string; // 'TRANSFERENCIA', 'PAGO_MOVIL', 'EFECTIVO', 'ZELLE'
  paymentMethod?: PaymentMethod;
  sourceAccountId?: number | null;
  destinationAccount?: string | null;
  currencyId?: number;
  amount?: number;
  amountPaid?: number;
  transactionCurrency?: string;
  exchangeRate?: number | null;
  bankName?: string | null;
  referenceNumber?: string | null;
  paymentDate?: Date;
  receiptImageUrl?: string | null;
  reviewedBy?: string | null;
  authorizedBy?: string | null;
  approvedBy?: string | null;
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
   * Registro de Pago / Abono con recalculo atómico de PaymentStatus y soporte multi-moneda / multi-método
   */
  static async registerPayment(data: RegisterPaymentDTO) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: data.orderId },
        include: {
          currencyRel: true,
          supplier: true,
          payments: {
            include: {
              currency: true,
              sourceAccount: true,
            },
          },
        },
      });

      if (!order) {
        throw new Error('Orden de compra no encontrada');
      }

      if (order.paymentStatus === PaymentStatus.PAGADO) {
        throw new Error('Esta orden ya se encuentra totalmente pagada');
      }

      // 1. Determinar monto pagado
      const rawAmount =
        data.amountPaid !== undefined && data.amountPaid !== null
          ? Number(data.amountPaid)
          : Number(data.amount || 0);

      if (rawAmount <= 0) {
        throw new Error('El monto del pago debe ser mayor a 0');
      }

      // 2. Determinar moneda de la transacción
      let txCurrency = (data.transactionCurrency || 'USD').toUpperCase();
      if (txCurrency === 'VES') txCurrency = 'VED';

      // 3. Obtener o resolver tasa de cambio aplicada
      let effectiveRate = data.exchangeRate !== undefined && data.exchangeRate !== null ? Number(data.exchangeRate) : null;
      if (!effectiveRate || effectiveRate <= 0) {
        const currencies = await tx.currency.findMany({
          include: {
            exchanges: {
              orderBy: [{ effectiveDate: 'desc' }, { id: 'desc' }],
              take: 1,
            },
          },
        });
        const ves = currencies.find((c) => c.code === 'VES' || c.code === 'VED');
        const eur = currencies.find((c) => c.code === 'EUR');

        if (txCurrency === 'VED') {
          effectiveRate = ves?.exchanges[0]?.rate ? Number(ves.exchanges[0].rate) : 75.0;
        } else if (txCurrency === 'EUR') {
          effectiveRate = eur?.exchanges[0]?.rate ? Number(eur.exchanges[0].rate) : 81.5;
        } else {
          effectiveRate = 1.0;
        }
      }

      // 4. Calcular amortizedAmountUsd (cuánto descuenta de la deuda en USD)
      let amortizedAmountUsd = rawAmount;
      if (txCurrency === 'VED') {
        amortizedAmountUsd = effectiveRate > 0 ? rawAmount / effectiveRate : rawAmount;
      } else if (txCurrency === 'EUR') {
        // Si la tasa viene en Bs./EUR (ej. 81.5) y BCV USD es 75: amortized = rawAmount * (81.5 / 75.0)
        if (effectiveRate > 10) {
          const vesCurrency = await tx.currency.findFirst({
            where: { code: { in: ['VES', 'VED'] } },
            include: { exchanges: { orderBy: [{ effectiveDate: 'desc' }, { id: 'desc' }], take: 1 } },
          });
          const bcvUsd = vesCurrency?.exchanges[0]?.rate ? Number(vesCurrency.exchanges[0].rate) : 75.0;
          amortizedAmountUsd = bcvUsd > 0 ? (rawAmount * effectiveRate) / bcvUsd : rawAmount;
        } else {
          amortizedAmountUsd = rawAmount * effectiveRate;
        }
      } else {
        // USD
        amortizedAmountUsd = rawAmount;
      }

      // Redondear a 2 decimales para evitar desbordes por coma flotante
      amortizedAmountUsd = Math.round(amortizedAmountUsd * 100) / 100;

      // 5. Validar que no supere la deuda restante en USD
      const orderTotalUsd = Number(order.totalAmountUsd > 0 ? order.totalAmountUsd : order.total);
      const alreadyPaidUsd = order.payments.reduce((acc, p) => {
        const pAmortized = Number(p.amortizedAmountUsd || 0);
        if (pAmortized > 0) return acc + pAmortized;

        const pAmount = Number(p.amount);
        const pRate = Number(p.exchangeRate || 1.0);
        const pCurr = p.transactionCurrency || (p.currencyId === 1 ? 'USD' : 'VED');
        if (pCurr === 'VED' && pRate > 0) return acc + pAmount / pRate;
        return acc + pAmount;
      }, 0);

      const remainingDebtUsd = Math.max(0, orderTotalUsd - alreadyPaidUsd);

      // Margen de tolerancia de $0.05 para redondeos de tasas
      if (amortizedAmountUsd > remainingDebtUsd + 0.05) {
        throw new Error(
          `El monto amortizado ($${amortizedAmountUsd.toFixed(2)} USD) supera la deuda restante ($${remainingDebtUsd.toFixed(2)} USD) de la orden`
        );
      }

      // 6. Mapear método de pago
      const cleanMethod = (data.method || 'TRANSFERENCIA').toUpperCase();
      let mappedPaymentMethod: PaymentMethod = PaymentMethod.TRANSFERENCIA_NACIONAL;

      if (data.paymentMethod && Object.values(PaymentMethod).includes(data.paymentMethod)) {
        mappedPaymentMethod = data.paymentMethod;
      } else if (cleanMethod === 'TRANSFERENCIA') {
        mappedPaymentMethod =
          txCurrency === 'USD'
            ? PaymentMethod.TRANSFERENCIA_USD
            : PaymentMethod.TRANSFERENCIA_BS;
      } else if (cleanMethod === 'PAGO_MOVIL') {
        mappedPaymentMethod = PaymentMethod.PAGO_MOVIL;
      } else if (cleanMethod === 'EFECTIVO') {
        mappedPaymentMethod =
          txCurrency === 'USD'
            ? PaymentMethod.EFECTIVO_USD
            : PaymentMethod.EFECTIVO_BS;
      } else if (cleanMethod === 'ZELLE') {
        mappedPaymentMethod = PaymentMethod.TRANSFERENCIA_USD;
      }

      // 7. Resolver cuenta bancaria origen si se suministró
      let resolvedBankName = data.bankName ? data.bankName.trim() : null;
      let sourceAccountId: number | null = null;
      if (data.sourceAccountId) {
        const sourceAcc = await tx.bankAccount.findUnique({
          where: { id: Number(data.sourceAccountId) },
        });
        if (sourceAcc) {
          sourceAccountId = sourceAcc.id;
          if (!resolvedBankName) resolvedBankName = sourceAcc.bankName;
        }
      }

      // 8. Resolver currencyId
      let currencyId = data.currencyId ? Number(data.currencyId) : null;
      if (!currencyId) {
        const targetCurr = await tx.currency.findFirst({
          where: { code: txCurrency === 'VED' ? { in: ['VES', 'VED'] } : txCurrency },
        });
        currencyId = targetCurr?.id ?? 1;
      }

      // 9. Crear el registro en OrderPayment
      const payment = await tx.orderPayment.create({
        data: {
          orderId: data.orderId,
          method: cleanMethod,
          paymentMethod: mappedPaymentMethod,
          sourceAccountId,
          destinationAccount: data.destinationAccount ? data.destinationAccount.trim() : null,
          bankName: resolvedBankName,
          referenceNumber: data.referenceNumber ? data.referenceNumber.trim() : null,
          currencyId,
          transactionCurrency: txCurrency,
          exchangeRate: effectiveRate,
          amount: rawAmount,
          amountPaid: rawAmount,
          amortizedAmountUsd,
          paymentDate: data.paymentDate ?? new Date(),
          receiptImageUrl: data.receiptImageUrl ?? null,
          reviewedBy: data.reviewedBy ? data.reviewedBy.trim() : null,
          authorizedBy: data.authorizedBy ? data.authorizedBy.trim() : null,
          approvedBy: data.approvedBy ? data.approvedBy.trim() : null,
          registeredById: data.registeredById,
        },
        include: {
          currency: true,
          sourceAccount: true,
        },
      });

      // 10. Actualizar PaymentStatus de la Orden
      const newTotalPaidUsd = alreadyPaidUsd + amortizedAmountUsd;
      const isFull = newTotalPaidUsd >= orderTotalUsd - 0.05;

      const nextPaymentStatus = isFull
        ? PaymentStatus.PAGADO
        : PaymentStatus.PAGADO_PARCIAL;

      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: nextPaymentStatus,
        },
      });

      // 11. Asentar registro en el Kardex General (PAGO_ORDEN)
      const movCount = await tx.stockMovement.count();
      const refNum = `PAGO-OC-${order.orderNumber ?? order.id}-${String(movCount + 1).padStart(4, '0')}`;
      await tx.stockMovement.create({
        data: {
          referenceNumber: refNum,
          type: 'PAGO_ORDEN',
          orderId: data.orderId,
          createdById: data.registeredById,
          productId: null,
          notes: `Abono a Proveedor ${order.supplier?.name ?? 'Orden #' + order.orderNumber}: ${txCurrency} ${rawAmount.toFixed(2)} (Equiv. $${amortizedAmountUsd.toFixed(2)}) - Ref: ${payment.referenceNumber ?? 'S/R'}`,
        },
      });

      return {
        payment,
        orderTotalUsd,
        alreadyPaidUsd: Math.round(newTotalPaidUsd * 100) / 100,
        remainingDebtUsd: Math.max(0, Math.round((orderTotalUsd - newTotalPaidUsd) * 100) / 100),
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
        invoices: true,
        currencyRel: true,
        payments: {
          include: {
            currency: true,
            sourceAccount: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new Error('Orden de compra no encontrada');
    }

    const orderTotalUsd = Number(order.totalAmountUsd > 0 ? order.totalAmountUsd : order.total);

    const totalPaidUsd = order.payments.reduce((acc, p) => {
      const pAmortized = Number(p.amortizedAmountUsd || 0);
      if (pAmortized > 0) return acc + pAmortized;

      const pAmount = Number(p.amount);
      const pRate = Number(p.exchangeRate || 1.0);
      const pCurr = p.transactionCurrency || (p.currencyId === 1 ? 'USD' : 'VED');
      if (pCurr === 'VED' && pRate > 0) return acc + pAmount / pRate;
      return acc + pAmount;
    }, 0);

    const remainingDebtUsd = Math.max(0, orderTotalUsd - totalPaidUsd);

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      currency: order.currency,
      exchangeRate: Number(order.exchangeRate),
      totalAmountUsd: orderTotalUsd,
      totalAmountBs: Number(order.totalAmountBs),
      totalPaidUsd: Math.round(totalPaidUsd * 100) / 100,
      remainingDebtUsd: Math.round(remainingDebtUsd * 100) / 100,
      paymentStatus: order.paymentStatus,
      paymentsCount: order.payments.length,
      invoicesCount: order.invoices.length,
      payments: order.payments,
      invoices: order.invoices,
    };
  }
}
