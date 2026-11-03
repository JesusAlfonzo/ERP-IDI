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

      // 2. Determinar moneda de la transacción y de la orden
      let txCurrency = (data.transactionCurrency || 'USD').toUpperCase();
      if (txCurrency === 'VES') txCurrency = 'VED';

      let orderCurrency = (order.currency || 'USD').trim().toUpperCase();
      if (orderCurrency === 'VES') orderCurrency = 'VED';

      // 3. Obtener o resolver tasas de cambio oficiales
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
      const bcvUsd = ves?.exchanges[0]?.rate ? Number(ves.exchanges[0].rate) : 75.0;
      const bcvEur = eur?.exchanges[0]?.rate ? Number(eur.exchanges[0].rate) : 81.5;

      let effectiveRate = data.exchangeRate !== undefined && data.exchangeRate !== null ? Number(data.exchangeRate) : null;
      if (!effectiveRate || effectiveRate <= 0) {
        if (txCurrency === 'VED') {
          effectiveRate = bcvUsd;
        } else if (txCurrency === 'EUR') {
          effectiveRate = bcvEur;
        } else {
          effectiveRate = 1.0;
        }
      }

      // 4. Calcular amortizedAgreed (en la moneda pactada de la orden) y amortizedAmountUsd (en USD)
      let amortizedAgreed = rawAmount;
      if (txCurrency === orderCurrency) {
        amortizedAgreed = rawAmount;
      } else if (orderCurrency === 'VED' && txCurrency === 'USD') {
        amortizedAgreed = effectiveRate > 0 ? rawAmount * effectiveRate : rawAmount * bcvUsd;
      } else if (orderCurrency === 'USD' && txCurrency === 'VED') {
        amortizedAgreed = effectiveRate > 0 ? rawAmount / effectiveRate : rawAmount / bcvUsd;
      } else if (orderCurrency === 'VED' && txCurrency === 'EUR') {
        const rateEur = effectiveRate > 0 ? effectiveRate : bcvEur;
        amortizedAgreed = rawAmount * rateEur;
      } else if (orderCurrency === 'EUR' && txCurrency === 'VED') {
        const rateEur = bcvEur > 0 ? bcvEur : (effectiveRate > 0 ? effectiveRate : 81.5);
        amortizedAgreed = rateEur > 0 ? rawAmount / rateEur : rawAmount;
      } else if (orderCurrency === 'EUR' && txCurrency === 'USD') {
        amortizedAgreed = bcvEur > 0 ? (rawAmount * bcvUsd) / bcvEur : rawAmount;
      } else if (orderCurrency === 'USD' && txCurrency === 'EUR') {
        const rateEur = effectiveRate > 0 ? effectiveRate : bcvEur;
        amortizedAgreed = bcvUsd > 0 ? (rawAmount * rateEur) / bcvUsd : rawAmount;
      }

      // Amortización en USD referencial (Tasa EUR es en Bs./EUR)
      let amortizedAmountUsd = rawAmount;
      if (txCurrency === 'VED') {
        amortizedAmountUsd = effectiveRate > 0 ? rawAmount / effectiveRate : rawAmount / bcvUsd;
      } else if (txCurrency === 'EUR') {
        const rateEur = effectiveRate > 0 ? effectiveRate : bcvEur;
        amortizedAmountUsd = bcvUsd > 0 ? (rawAmount * rateEur) / bcvUsd : rawAmount;
      } else {
        amortizedAmountUsd = rawAmount;
      }

      amortizedAgreed = Math.round(amortizedAgreed * 100) / 100;
      amortizedAmountUsd = Math.round(amortizedAmountUsd * 100) / 100;

      // 5. Determinar total contratado y acumulado abonado en la moneda de la orden
      const totalAgreed = Number(
        orderCurrency === 'VED'
          ? (Number(order.totalAmountBs) > 0 ? order.totalAmountBs : order.total)
          : orderCurrency === 'EUR'
            ? order.total
            : (Number(order.totalAmountUsd) > 0 ? order.totalAmountUsd : order.total)
      );

      const orderTotalUsd = Number(
        Number(order.totalAmountUsd) > 0
          ? order.totalAmountUsd
          : orderCurrency === 'USD'
            ? totalAgreed
            : bcvUsd > 0
              ? totalAgreed / bcvUsd
              : totalAgreed
      );

      let alreadyPaidAgreed = 0;
      let alreadyPaidUsd = 0;

      for (const p of order.payments) {
        let pCurr = (p.transactionCurrency || (p.currencyId === 1 ? 'USD' : 'VED')).trim().toUpperCase();
        if (pCurr === 'VES') pCurr = 'VED';

        const pAmt = Number(p.amountPaid ?? p.amount ?? 0);
        const pRate = Number(p.exchangeRate || 1.0);
        const pAmortUsd = Number(p.amortizedAmountUsd || 0);

        // En USD
        if (pAmortUsd > 0) {
          alreadyPaidUsd += pAmortUsd;
        } else if (pCurr === 'USD') {
          alreadyPaidUsd += pAmt;
        } else if (pCurr === 'VED' && pRate > 0) {
          alreadyPaidUsd += pAmt / pRate;
        } else if (pCurr === 'EUR') {
          alreadyPaidUsd += bcvUsd > 0 ? (pAmt * (pRate > 10 ? pRate : bcvEur)) / bcvUsd : pAmt;
        } else {
          alreadyPaidUsd += pAmt;
        }

        // En la moneda de la orden
        if (pCurr === orderCurrency) {
          alreadyPaidAgreed += pAmt;
        } else if (orderCurrency === 'VED' && pCurr === 'USD') {
          alreadyPaidAgreed += pRate > 0 ? pAmt * pRate : pAmt * bcvUsd;
        } else if (orderCurrency === 'USD' && pCurr === 'VED') {
          alreadyPaidAgreed += pRate > 0 ? pAmt / pRate : pAmt / bcvUsd;
        } else if (orderCurrency === 'VED' && pCurr === 'EUR') {
          alreadyPaidAgreed += pRate > 0 ? pAmt * pRate : pAmt * bcvEur;
        } else if (orderCurrency === 'EUR' && pCurr === 'VED') {
          alreadyPaidAgreed += pRate > 0 ? pAmt / pRate : pAmt / bcvEur;
        } else if (orderCurrency === 'EUR' && pCurr === 'USD') {
          alreadyPaidAgreed += bcvEur > 0 ? (pAmt * bcvUsd) / bcvEur : pAmt;
        } else if (orderCurrency === 'USD' && pCurr === 'EUR') {
          alreadyPaidAgreed += bcvUsd > 0 ? (pAmt * (pRate > 10 ? pRate : bcvEur)) / bcvUsd : pAmt;
        } else {
          alreadyPaidAgreed += pAmt;
        }
      }

      alreadyPaidAgreed = Math.round(alreadyPaidAgreed * 100) / 100;
      alreadyPaidUsd = Math.round(alreadyPaidUsd * 100) / 100;

      const remainingAgreed = Math.max(0, Math.round((totalAgreed - alreadyPaidAgreed) * 100) / 100);
      const tolerance = orderCurrency === 'VED' ? 1.0 : 0.05;

      // Validación de no sobrepasar la deuda
      if (amortizedAgreed > remainingAgreed + tolerance) {
        throw new Error(
          `El monto abonado (${amortizedAgreed.toFixed(2)} ${orderCurrency}) supera la deuda restante (${remainingAgreed.toFixed(2)} ${orderCurrency}) de la orden`
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
      const newTotalPaidAgreed = Math.round((alreadyPaidAgreed + amortizedAgreed) * 100) / 100;
      const isFull = newTotalPaidAgreed >= totalAgreed - tolerance;

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
          notes: `Abono a Proveedor ${order.supplier?.name ?? 'Orden #' + order.orderNumber}: ${txCurrency} ${rawAmount.toFixed(2)} (Amortiza ${amortizedAgreed.toFixed(2)} ${orderCurrency} / Equiv. $${amortizedAmountUsd.toFixed(2)}) - Ref: ${payment.referenceNumber ?? 'S/R'}`,
        },
      });

      const newTotalPaidUsd = Math.round((alreadyPaidUsd + amortizedAmountUsd) * 100) / 100;
      return {
        payment,
        orderCurrency,
        totalAgreed,
        alreadyPaidAgreed: newTotalPaidAgreed,
        remainingDebtAgreed: Math.max(0, Math.round((totalAgreed - newTotalPaidAgreed) * 100) / 100),
        orderTotalUsd,
        alreadyPaidUsd: newTotalPaidUsd,
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

    let orderCurrency = (order.currency || 'USD').trim().toUpperCase();
    if (orderCurrency === 'VES') orderCurrency = 'VED';

    const currencies = await prisma.currency.findMany({
      include: {
        exchanges: {
          orderBy: [{ effectiveDate: 'desc' }, { id: 'desc' }],
          take: 1,
        },
      },
    });
    const ves = currencies.find((c) => c.code === 'VES' || c.code === 'VED');
    const eur = currencies.find((c) => c.code === 'EUR');
    const bcvUsd = ves?.exchanges[0]?.rate ? Number(ves.exchanges[0].rate) : 75.0;
    const bcvEur = eur?.exchanges[0]?.rate ? Number(eur.exchanges[0].rate) : 81.5;

    const totalAgreed = Number(
      orderCurrency === 'VED'
        ? (Number(order.totalAmountBs) > 0 ? order.totalAmountBs : order.total)
        : orderCurrency === 'EUR'
          ? order.total
          : (Number(order.totalAmountUsd) > 0 ? order.totalAmountUsd : order.total)
    );

    const orderTotalUsd = Number(
      Number(order.totalAmountUsd) > 0
        ? order.totalAmountUsd
        : orderCurrency === 'USD'
          ? totalAgreed
          : orderCurrency === 'EUR'
            ? (bcvUsd > 0 ? (totalAgreed * bcvEur) / bcvUsd : totalAgreed)
            : bcvUsd > 0
              ? totalAgreed / bcvUsd
              : totalAgreed
    );

    let alreadyPaidAgreed = 0;
    let totalPaidUsd = 0;

    for (const p of order.payments) {
      let pCurr = (p.transactionCurrency || (p.currencyId === 1 ? 'USD' : 'VED')).trim().toUpperCase();
      if (pCurr === 'VES') pCurr = 'VED';

      const pAmt = Number(p.amountPaid ?? p.amount ?? 0);
      const pRate = Number(p.exchangeRate || 1.0);
      const pAmortUsd = Number(p.amortizedAmountUsd || 0);

      if (pAmortUsd > 0) {
        totalPaidUsd += pAmortUsd;
      } else if (pCurr === 'USD') {
        totalPaidUsd += pAmt;
      } else if (pCurr === 'VED' && pRate > 0) {
        totalPaidUsd += pAmt / pRate;
      } else if (pCurr === 'EUR') {
        const rateEur = pRate > 0 ? pRate : bcvEur;
        totalPaidUsd += bcvUsd > 0 ? (pAmt * rateEur) / bcvUsd : pAmt;
      } else {
        totalPaidUsd += pAmt;
      }

      if (pCurr === orderCurrency) {
        alreadyPaidAgreed += pAmt;
      } else if (orderCurrency === 'VED' && pCurr === 'USD') {
        alreadyPaidAgreed += pRate > 0 ? pAmt * pRate : pAmt * bcvUsd;
      } else if (orderCurrency === 'USD' && pCurr === 'VED') {
        alreadyPaidAgreed += pRate > 0 ? pAmt / pRate : pAmt / bcvUsd;
      } else if (orderCurrency === 'VED' && pCurr === 'EUR') {
        const rateEur = pRate > 0 ? pRate : bcvEur;
        alreadyPaidAgreed += pAmt * rateEur;
      } else if (orderCurrency === 'EUR' && pCurr === 'VED') {
        const rateEur = bcvEur > 0 ? bcvEur : (pRate > 0 ? pRate : 81.5);
        alreadyPaidAgreed += rateEur > 0 ? pAmt / rateEur : pAmt;
      } else if (orderCurrency === 'EUR' && pCurr === 'USD') {
        alreadyPaidAgreed += bcvEur > 0 ? (pAmt * bcvUsd) / bcvEur : pAmt;
      } else if (orderCurrency === 'USD' && pCurr === 'EUR') {
        const rateEur = pRate > 0 ? pRate : bcvEur;
        alreadyPaidAgreed += bcvUsd > 0 ? (pAmt * rateEur) / bcvUsd : pAmt;
      } else {
        alreadyPaidAgreed += pAmt;
      }
    }

    alreadyPaidAgreed = Math.round(alreadyPaidAgreed * 100) / 100;
    totalPaidUsd = Math.round(totalPaidUsd * 100) / 100;
    const remainingAgreed = Math.max(0, Math.round((totalAgreed - alreadyPaidAgreed) * 100) / 100);
    const remainingDebtUsd = Math.max(0, Math.round((orderTotalUsd - totalPaidUsd) * 100) / 100);

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      currency: orderCurrency,
      exchangeRate: Number(order.exchangeRate),
      totalAgreed,
      alreadyPaidAgreed,
      remainingAgreed,
      totalAmountUsd: orderTotalUsd,
      totalAmountBs: Number(order.totalAmountBs),
      totalPaidUsd,
      remainingDebtUsd,
      paymentStatus: order.paymentStatus,
      paymentsCount: order.payments.length,
      invoicesCount: order.invoices.length,
      payments: order.payments,
      invoices: order.invoices,
    };
  }
}
