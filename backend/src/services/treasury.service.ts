import {
  OrderStatus,
  PaymentMethod,
  PaymentOrderSourceType,
  PaymentOrderStatus,
  PaymentStatus,
  Prisma,
  ServiceOrderStatus,
  TreasuryPaymentStatus,
} from '@prisma/client';
import { prisma } from '../config/prisma.js';

export interface CreatePaymentOrderDTO {
  sourceType: PaymentOrderSourceType;
  purchaseOrderId?: bigint;
  serviceOrderId?: bigint;
  notes?: string | null;
  createdById: number;
}

export interface CreateTreasuryPaymentLineDTO {
  sourceAccountId: number;
  paymentMethod?: string;
  amountPaid: number;
  referenceNumber?: string | null;
  receiptUrl?: string | null;
}

export interface CreateTreasuryPaymentDTO {
  paymentDate: string; // YYYY-MM-DD
  notes?: string | null;
  confirmImmediately?: boolean;
  lines: CreateTreasuryPaymentLineDTO[];
}

const USER_BASIC_SELECT = {
  id: true,
  fullName: true,
  email: true,
  department: true,
};

const PAYMENT_ORDER_INCLUDE = {
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
  purchaseOrder: {
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      currency: true,
      total: true,
      totalAmount: true,
      totalAmountUsd: true,
      totalAmountBs: true,
      createdAt: true,
      supplier: {
        select: {
          id: true,
          name: true,
          rifOrId: true,
        },
      },
    },
  },
  serviceOrder: {
    select: {
      id: true,
      serviceOrderNumber: true,
      paymentOrderNumber: true,
      status: true,
      concept: true,
      beneficiary: true,
      amountPaid: true,
      transactionCurrency: true,
      equivalentAmountUsd: true,
      createdAt: true,
      department: {
        select: { id: true, code: true, name: true },
      },
      supplier: {
        select: { id: true, name: true, rifOrId: true },
      },
    },
  },
  createdBy: { select: USER_BASIC_SELECT },
  approvedBy: { select: USER_BASIC_SELECT },
  rejectedBy: { select: USER_BASIC_SELECT },
  payments: {
    include: {
      createdBy: { select: USER_BASIC_SELECT },
      confirmedBy: { select: USER_BASIC_SELECT },
      lines: {
        include: {
          sourceAccount: true,
          exchangeRate: {
            include: {
              currency: {
                select: { id: true, code: true, name: true, symbol: true },
              },
            },
          },
          accountMovement: true,
        },
        orderBy: { id: 'asc' as const },
      },
    },
    orderBy: [{ paymentDate: 'desc' as const }, { id: 'desc' as const }],
  },
};

export function normalizeCurrency(raw?: string | null): 'USD' | 'VED' | 'EUR' {
  const code = (raw || 'USD').trim().toUpperCase();
  if (code === 'VES' || code === 'VED' || code === 'BS') return 'VED';
  if (code === 'EUR') return 'EUR';
  return 'USD';
}

function currencySymbol(code: string): string {
  const c = normalizeCurrency(code);
  if (c === 'VED') return 'Bs.';
  if (c === 'EUR') return '€';
  return '$';
}

function parseDateOnlyUtc(dateInput: string): { dateStr: string; dateObj: Date } {
  const clean = (dateInput || '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    throw new Error('La fecha de pago es obligatoria y debe tener formato YYYY-MM-DD.');
  }
  const dateObj = new Date(`${clean}T00:00:00.000Z`);
  if (Number.isNaN(dateObj.getTime())) {
    throw new Error('La fecha de pago indicada no es válida.');
  }
  return { dateStr: clean, dateObj };
}

function toDecimal2(value: Prisma.Decimal | number | string): Prisma.Decimal {
  return new Prisma.Decimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

function toDecimal4(value: Prisma.Decimal | number | string): Prisma.Decimal {
  return new Prisma.Decimal(value).toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
}

function mapOrderPaymentMethod(method: string, currency: string): PaymentMethod {
  const m = method.toUpperCase();
  if (m === 'PAGO_MOVIL') return PaymentMethod.PAGO_MOVIL;
  if (m === 'EFECTIVO' || m === 'CAJA_CHICA') {
    return currency === 'USD' ? PaymentMethod.EFECTIVO_USD : PaymentMethod.EFECTIVO_BS;
  }
  if (m === 'ZELLE') return PaymentMethod.TRANSFERENCIA_USD;
  return currency === 'USD'
    ? PaymentMethod.TRANSFERENCIA_USD
    : PaymentMethod.TRANSFERENCIA_BS;
}

/**
 * Genera el próximo número correlativo OP-YYYY-XXXX evitando colisiones entre
 * payment_orders y direct_payments.
 */
export async function generateNextPaymentOrderNumber(
  tx: Prisma.TransactionClient
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `OP-${currentYear}-`;

  const [latestPo, latestDp] = await Promise.all([
    tx.paymentOrder.findFirst({
      where: { paymentOrderNumber: { startsWith: prefix } },
      orderBy: { paymentOrderNumber: 'desc' },
      select: { paymentOrderNumber: true },
    }),
    tx.directPayment.findFirst({
      where: { paymentOrderNumber: { startsWith: prefix } },
      orderBy: { paymentOrderNumber: 'desc' },
      select: { paymentOrderNumber: true },
    }),
  ]);

  const extractSeq = (code?: string | null): number => {
    if (!code) return 0;
    const parts = code.split('-');
    const n = Number(parts[2]);
    return Number.isNaN(n) ? 0 : n;
  };

  const nextSeq = Math.max(
    extractSeq(latestPo?.paymentOrderNumber),
    extractSeq(latestDp?.paymentOrderNumber)
  ) + 1;

  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

async function generateNextPaymentNumber(tx: Prisma.TransactionClient): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `PAG-${currentYear}-`;
  const latest = await tx.treasuryPayment.findFirst({
    where: { paymentNumber: { startsWith: prefix } },
    orderBy: { paymentNumber: 'desc' },
    select: { paymentNumber: true },
  });

  let nextSeq = 1;
  if (latest?.paymentNumber) {
    const parts = latest.paymentNumber.split('-');
    const lastSeq = Number(parts[2]);
    if (!Number.isNaN(lastSeq)) nextSeq = lastSeq + 1;
  }
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

/**
 * Busca tasas de cambio exactas para la fecha indicada (validación estricta).
 */
async function lookupDailyRatesStrict(
  tx: Prisma.TransactionClient,
  dateObj: Date
): Promise<{
  usdExchange: { id: bigint; rate: Prisma.Decimal } | null;
  eurExchange: { id: bigint; rate: Prisma.Decimal } | null;
}> {
  const currencies = await tx.currency.findMany({
    where: { code: { in: ['VES', 'VED', 'EUR'] } },
  });

  const vesCurr = currencies.find((c) => c.code === 'VES' || c.code === 'VED');
  const eurCurr = currencies.find((c) => c.code === 'EUR');

  const [exactUsd, exactEur] = await Promise.all([
    vesCurr
      ? tx.currencyExchange.findFirst({
          where: { currencyId: vesCurr.id, effectiveDate: dateObj },
          orderBy: { id: 'desc' },
        })
      : null,
    eurCurr
      ? tx.currencyExchange.findFirst({
          where: { currencyId: eurCurr.id, effectiveDate: dateObj },
          orderBy: { id: 'desc' },
        })
      : null,
  ]);

  return {
    usdExchange: exactUsd ? { id: exactUsd.id, rate: exactUsd.rate } : null,
    eurExchange: exactEur ? { id: exactEur.id, rate: exactEur.rate } : null,
  };
}

/**
 * Convierte el monto pagado en `lineCurrency` a `debtCurrency` usando exclusivamente
 * la tasa manual registrada en `currency_exchanges` para la fecha exacta del pago.
 */
function convertLineAmountToDebtCurrency(params: {
  amountPaid: Prisma.Decimal;
  lineCurrency: 'USD' | 'VED' | 'EUR';
  debtCurrency: 'USD' | 'VED' | 'EUR';
  dateStr: string;
  usdExchange: { id: bigint; rate: Prisma.Decimal } | null;
  eurExchange: { id: bigint; rate: Prisma.Decimal } | null;
}): {
  exchangeRateId: bigint | null;
  exchangeRateValue: Prisma.Decimal;
  equivalentDebtAmount: Prisma.Decimal;
  equivalentUsdAmount: Prisma.Decimal;
} {
  const { amountPaid, lineCurrency, debtCurrency, dateStr, usdExchange, eurExchange } =
    params;

  const ensureUsd = () => {
    if (!usdExchange || usdExchange.rate.lte(0)) {
      throw new Error(
        `No existe tasa de cambio USD/Bs. registrada para la fecha ${dateStr}. Regístrela primero en el maestro de tasas de cambio.`
      );
    }
    return usdExchange;
  };

  const ensureEur = () => {
    if (!eurExchange || eurExchange.rate.lte(0)) {
      throw new Error(
        `No existe tasa de cambio EUR/Bs. registrada para la fecha ${dateStr}. Regístrela primero en el maestro de tasas de cambio.`
      );
    }
    return eurExchange;
  };

  // 1. Misma moneda: tasa 1.0000 sin exigir tasa diaria
  if (lineCurrency === debtCurrency) {
    let equivalentUsdAmount = amountPaid;
    if (lineCurrency === 'VED' && usdExchange && usdExchange.rate.gt(0)) {
      equivalentUsdAmount = toDecimal2(amountPaid.div(usdExchange.rate));
    } else if (
      lineCurrency === 'EUR' &&
      eurExchange &&
      eurExchange.rate.gt(0) &&
      usdExchange &&
      usdExchange.rate.gt(0)
    ) {
      equivalentUsdAmount = toDecimal2(
        amountPaid.mul(eurExchange.rate).div(usdExchange.rate)
      );
    }
    return {
      exchangeRateId: null,
      exchangeRateValue: toDecimal4(1),
      equivalentDebtAmount: toDecimal2(amountPaid),
      equivalentUsdAmount,
    };
  }

  // 2. Deuda en USD, pago en VED (Bs.)
  if (debtCurrency === 'USD' && lineCurrency === 'VED') {
    const usd = ensureUsd();
    const eq = toDecimal2(amountPaid.div(usd.rate));
    return {
      exchangeRateId: usd.id,
      exchangeRateValue: toDecimal4(usd.rate),
      equivalentDebtAmount: eq,
      equivalentUsdAmount: eq,
    };
  }

  // 3. Deuda en VED (Bs.), pago en USD
  if (debtCurrency === 'VED' && lineCurrency === 'USD') {
    const usd = ensureUsd();
    const eq = toDecimal2(amountPaid.mul(usd.rate));
    return {
      exchangeRateId: usd.id,
      exchangeRateValue: toDecimal4(usd.rate),
      equivalentDebtAmount: eq,
      equivalentUsdAmount: toDecimal2(amountPaid),
    };
  }

  // 4. Deuda en EUR, pago en VED (Bs.)
  if (debtCurrency === 'EUR' && lineCurrency === 'VED') {
    const eur = ensureEur();
    const eq = toDecimal2(amountPaid.div(eur.rate));
    const eqUsd =
      usdExchange && usdExchange.rate.gt(0)
        ? toDecimal2(amountPaid.div(usdExchange.rate))
        : eq;
    return {
      exchangeRateId: eur.id,
      exchangeRateValue: toDecimal4(eur.rate),
      equivalentDebtAmount: eq,
      equivalentUsdAmount: eqUsd,
    };
  }

  // 5. Deuda en VED (Bs.), pago en EUR
  if (debtCurrency === 'VED' && lineCurrency === 'EUR') {
    const eur = ensureEur();
    const eq = toDecimal2(amountPaid.mul(eur.rate));
    const eqUsd =
      usdExchange && usdExchange.rate.gt(0)
        ? toDecimal2(eq.div(usdExchange.rate))
        : toDecimal2(amountPaid);
    return {
      exchangeRateId: eur.id,
      exchangeRateValue: toDecimal4(eur.rate),
      equivalentDebtAmount: eq,
      equivalentUsdAmount: eqUsd,
    };
  }

  // 6. Deuda en USD, pago en EUR (cruce vía Bs.: (EUR * Bs/EUR) / (Bs/USD))
  if (debtCurrency === 'USD' && lineCurrency === 'EUR') {
    const eur = ensureEur();
    const usd = ensureUsd();
    const crossRate = toDecimal4(eur.rate.div(usd.rate));
    const eq = toDecimal2(amountPaid.mul(eur.rate).div(usd.rate));
    return {
      exchangeRateId: eur.id,
      exchangeRateValue: crossRate,
      equivalentDebtAmount: eq,
      equivalentUsdAmount: eq,
    };
  }

  // 7. Deuda en EUR, pago en USD (cruce vía Bs.: (USD * Bs/USD) / (Bs/EUR))
  const eur = ensureEur();
  const usd = ensureUsd();
  const crossRate = toDecimal4(eur.rate.div(usd.rate));
  const eq = toDecimal2(amountPaid.mul(usd.rate).div(eur.rate));
  return {
    exchangeRateId: eur.id,
    exchangeRateValue: crossRate,
    equivalentDebtAmount: eq,
    equivalentUsdAmount: toDecimal2(amountPaid),
  };
}

/**
 * Calcula lo ya abonado en la moneda pactada de una Orden de Compra (para compatibilidad con pagos legados)
 */
function computeOrderLegacyPaidAgreed(order: {
  currency: string;
  exchangeRate: Prisma.Decimal;
  payments: Array<{
    amount: Prisma.Decimal;
    amountPaid: Prisma.Decimal;
    transactionCurrency: string;
    exchangeRate: Prisma.Decimal;
    currencyId: number | null;
  }>;
}): Prisma.Decimal {
  const orderCurrency = normalizeCurrency(order.currency);
  let paid = new Prisma.Decimal(0);

  for (const p of order.payments) {
    const pCurr = normalizeCurrency(
      p.transactionCurrency || (p.currencyId === 1 ? 'USD' : 'VED')
    );
    const pAmt = p.amountPaid.gt(0) ? p.amountPaid : p.amount;
    const pRate = p.exchangeRate.gt(0) ? p.exchangeRate : new Prisma.Decimal(1);

    if (pCurr === orderCurrency) {
      paid = paid.plus(pAmt);
    } else if (orderCurrency === 'VED' && pCurr === 'USD') {
      paid = paid.plus(pAmt.mul(pRate));
    } else if (orderCurrency === 'USD' && pCurr === 'VED') {
      paid = paid.plus(pAmt.div(pRate));
    } else {
      paid = paid.plus(pAmt);
    }
  }

  return toDecimal2(paid);
}

/**
 * Lógica interna de confirmación atómica de un TreasuryPayment dentro de una transacción Prisma.
 */
async function executeConfirmPaymentTx(
  tx: Prisma.TransactionClient,
  paymentId: bigint,
  userId: number
) {
  const payment = await tx.treasuryPayment.findUnique({
    where: { id: paymentId },
    include: {
      lines: {
        include: { sourceAccount: true },
        orderBy: { id: 'asc' },
      },
      paymentOrder: {
        include: {
          purchaseOrder: {
            include: { supplier: true },
          },
          serviceOrder: true,
        },
      },
    },
  });

  if (!payment) {
    throw new Error('Registro de pago no encontrado.');
  }

  if (payment.status !== TreasuryPaymentStatus.BORRADOR) {
    throw new Error(
      `Solo se pueden confirmar pagos en estado BORRADOR. Estado actual: ${payment.status}.`
    );
  }

  const po = payment.paymentOrder;
  if (
    po.status !== PaymentOrderStatus.APROBADA &&
    po.status !== PaymentOrderStatus.PAGADA_PARCIALMENTE
  ) {
    throw new Error(
      `No se puede confirmar un pago contra una Orden de Pago en estado ${po.status}. La Orden de Pago debe estar APROBADA.`
    );
  }

  if (payment.lines.length === 0) {
    throw new Error('El pago debe contener al menos una línea de pago válida.');
  }

  const totalEquivalent = toDecimal2(
    payment.lines.reduce(
      (acc, l) => acc.plus(l.equivalentDebtAmount),
      new Prisma.Decimal(0)
    )
  );

  if (totalEquivalent.lte(0)) {
    throw new Error('El monto total equivalente del pago debe ser mayor a 0.');
  }

  const currentRemaining = toDecimal2(po.remainingBalance);
  if (totalEquivalent.gt(currentRemaining)) {
    throw new Error(
      `El monto equivalente (${currencySymbol(po.debtCurrency)} ${totalEquivalent.toFixed(2)} ${po.debtCurrency}) supera el saldo pendiente (${currencySymbol(po.debtCurrency)} ${currentRemaining.toFixed(2)} ${po.debtCurrency}) de la Orden de Pago ${po.paymentOrderNumber}.`
    );
  }

  // 1. Confirmar cabecera TreasuryPayment
  await tx.treasuryPayment.update({
    where: { id: payment.id },
    data: {
      status: TreasuryPaymentStatus.CONFIRMADO,
      totalEquivalentInDebtCurrency: totalEquivalent,
      confirmedById: userId,
      confirmedAt: new Date(),
    },
  });

  // 2. Actualizar saldo y estado de PaymentOrder
  const newPaid = toDecimal2(po.paidAmount.plus(totalEquivalent));
  const rawRemaining = po.totalDebtAmount.minus(newPaid);
  const newRemaining = rawRemaining.lte(0)
    ? new Prisma.Decimal(0)
    : toDecimal2(rawRemaining);

  const nextPoStatus = newRemaining.eq(0)
    ? PaymentOrderStatus.PAGADA
    : PaymentOrderStatus.PAGADA_PARCIALMENTE;

  await tx.paymentOrder.update({
    where: { id: po.id },
    data: {
      paidAmount: newPaid,
      remainingBalance: newRemaining,
      status: nextPoStatus,
    },
  });

  // 3. Registrar movimientos de egreso por cada cuenta origen
  const currencies = await tx.currency.findMany();
  const findCurrencyId = (code: string) => {
    const norm = normalizeCurrency(code);
    const match = currencies.find((c) =>
      norm === 'VED' ? c.code === 'VES' || c.code === 'VED' : c.code === norm
    );
    return match?.id ?? 1;
  };

  // Tasa referencial USD para amortizedAmountUsd cuando deuda no es USD
  const vesCurr = currencies.find((c) => c.code === 'VES' || c.code === 'VED');
  const latestVes = vesCurr
    ? await tx.currencyExchange.findFirst({
        where: { currencyId: vesCurr.id },
        orderBy: [{ effectiveDate: 'desc' }, { id: 'desc' }],
      })
    : null;
  const fallbackBcvUsd = latestVes?.rate ?? new Prisma.Decimal(75);

  const summaryParts: string[] = [];

  for (const line of payment.lines) {
    const lineSym = currencySymbol(line.currency);
    const debtSym = currencySymbol(po.debtCurrency);
    const desc = `Pago ${payment.paymentNumber} (${po.paymentOrderNumber}) a ${po.beneficiaryName}: ${lineSym} ${line.amountPaid.toFixed(2)} ${line.currency} (Eq. ${debtSym} ${line.equivalentDebtAmount.toFixed(2)} ${po.debtCurrency}, Tasa ${line.exchangeRateValue.toFixed(4)})`;

    await tx.bankAccountMovement.create({
      data: {
        bankAccountId: line.sourceAccountId,
        paymentLineId: line.id,
        movementDate: payment.paymentDate,
        type: 'EGRESO',
        currency: line.currency,
        amount: line.amountPaid,
        exchangeRateValue: line.exchangeRateValue,
        equivalentDebtAmount: line.equivalentDebtAmount,
        referenceNumber: line.referenceNumber,
        description: desc,
        createdById: userId,
      },
    });

    summaryParts.push(
      `${lineSym} ${line.amountPaid.toFixed(2)} ${line.sourceAccount.bankName}${line.currency !== po.debtCurrency ? ` @ ${Number(line.exchangeRateValue).toFixed(2)}` : ''}`
    );

    // 4a. Sincronización con OrderPayment si el origen es Orden de Compra
    if (
      po.sourceType === PaymentOrderSourceType.PURCHASE_ORDER &&
      po.purchaseOrderId
    ) {
      let amortizedUsd = line.equivalentDebtAmount;
      if (normalizeCurrency(po.debtCurrency) === 'VED') {
        amortizedUsd =
          normalizeCurrency(line.currency) === 'USD'
            ? line.amountPaid
            : toDecimal2(line.equivalentDebtAmount.div(fallbackBcvUsd));
      } else if (normalizeCurrency(po.debtCurrency) === 'EUR') {
        amortizedUsd =
          normalizeCurrency(line.currency) === 'USD'
            ? line.amountPaid
            : line.equivalentDebtAmount;
      }

      await tx.orderPayment.create({
        data: {
          orderId: po.purchaseOrderId,
          method: line.paymentMethod,
          paymentMethod: mapOrderPaymentMethod(line.paymentMethod, line.currency),
          sourceAccountId: line.sourceAccountId,
          bankName: line.sourceAccount.bankName,
          referenceNumber:
            line.referenceNumber || `${payment.paymentNumber}-L${line.id}`,
          currencyId: findCurrencyId(line.currency),
          transactionCurrency: line.currency,
          exchangeRate: line.exchangeRateValue,
          amount: line.amountPaid,
          amountPaid: line.amountPaid,
          amortizedAmountUsd: toDecimal2(amortizedUsd),
          paymentDate: payment.paymentDate,
          receiptImageUrl: line.receiptUrl,
          registeredById: userId,
        },
      });
    }
  }

  // 4b. Actualizar estado financiero del documento origen + Kardex general
  if (
    po.sourceType === PaymentOrderSourceType.PURCHASE_ORDER &&
    po.purchaseOrderId
  ) {
    const nextOrderPaymentStatus =
      nextPoStatus === PaymentOrderStatus.PAGADA
        ? PaymentStatus.PAGADO
        : PaymentStatus.PAGADO_PARCIAL;

    await tx.order.update({
      where: { id: po.purchaseOrderId },
      data: { paymentStatus: nextOrderPaymentStatus },
    });

    const refCode = `TES-OC-${payment.paymentNumber}-${Date.now()}`;
    await tx.stockMovement.create({
      data: {
        referenceNumber: refCode,
        type: 'PAGO_ORDEN',
        orderId: po.purchaseOrderId,
        createdById: userId,
        productId: null,
        notes: `Tesorería ${payment.paymentNumber} (${po.paymentOrderNumber}) · ${po.beneficiaryName}: ${currencySymbol(po.debtCurrency)} ${totalEquivalent.toFixed(2)} ${po.debtCurrency} [${summaryParts.join(' + ')}]`,
      },
    });
  } else if (
    po.sourceType === PaymentOrderSourceType.SERVICE_ORDER &&
    po.serviceOrderId
  ) {
    const primaryLine = payment.lines[0];
    const isNowPaid = nextPoStatus === PaymentOrderStatus.PAGADA;

    await tx.directPayment.update({
      where: { id: po.serviceOrderId },
      data: {
        paymentOrderNumber: po.paymentOrderNumber,
        status: isNowPaid ? ServiceOrderStatus.PAGADA : ServiceOrderStatus.ORDEN_PAGO,
        method: primaryLine?.paymentMethod || 'TRANSFERENCIA',
        sourceAccountId: primaryLine?.sourceAccountId ?? null,
        referenceNumber:
          primaryLine?.referenceNumber || payment.paymentNumber,
        paymentDate: payment.paymentDate,
      },
    });

    if (isNowPaid) {
      const refCode = `TES-OS-${payment.paymentNumber}-${Date.now()}`;
      await tx.stockMovement.create({
        data: {
          referenceNumber: refCode,
          type: 'EGRESO_DIRECTO',
          createdById: userId,
          productId: null,
          notes: `Liquidación Tesorería ${payment.paymentNumber} (${po.paymentOrderNumber}) · ${po.concept} | Beneficiario: ${po.beneficiaryName} | Total: ${currencySymbol(po.debtCurrency)} ${po.totalDebtAmount.toFixed(2)} ${po.debtCurrency} [${summaryParts.join(' + ')}]`,
        },
      });
    }
  }

  return tx.paymentOrder.findUnique({
    where: { id: po.id },
    include: PAYMENT_ORDER_INCLUDE,
  });
}

export class TreasuryService {
  /**
   * Lista documentos elegibles (OC y OS aprobadas/enviadas con saldo pendiente)
   * que todavía no tienen una Orden de Pago activa.
   */
  static async listEligibleSources() {
    const [orders, serviceOrders] = await Promise.all([
      prisma.order.findMany({
        where: {
          status: {
            in: [OrderStatus.ENVIADA, OrderStatus.PARCIAL, OrderStatus.COMPLETADA],
          },
          paymentStatus: { notIn: [PaymentStatus.PAGADO, PaymentStatus.EXONERADO] },
          paymentOrders: {
            none: {
              status: {
                in: [
                  PaymentOrderStatus.BORRADOR,
                  PaymentOrderStatus.PENDIENTE_APROBACION,
                  PaymentOrderStatus.APROBADA,
                  PaymentOrderStatus.PAGADA_PARCIALMENTE,
                ],
              },
            },
          },
        },
        include: {
          supplier: { select: { id: true, name: true, rifOrId: true } },
          payments: {
            select: {
              amount: true,
              amountPaid: true,
              transactionCurrency: true,
              exchangeRate: true,
              currencyId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.directPayment.findMany({
        where: {
          status: ServiceOrderStatus.APROBADA,
          paymentOrders: {
            none: {
              status: {
                in: [
                  PaymentOrderStatus.BORRADOR,
                  PaymentOrderStatus.PENDIENTE_APROBACION,
                  PaymentOrderStatus.APROBADA,
                  PaymentOrderStatus.PAGADA_PARCIALMENTE,
                ],
              },
            },
          },
        },
        include: {
          supplier: { select: { id: true, name: true, rifOrId: true } },
          department: { select: { id: true, code: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const purchaseOrders = orders
      .map((o) => {
        const debtCurrency = normalizeCurrency(o.currency);
        const totalAgreed = toDecimal2(
          debtCurrency === 'VED'
            ? o.totalAmountBs.gt(0)
              ? o.totalAmountBs
              : o.total
            : debtCurrency === 'EUR'
              ? o.total
              : o.totalAmountUsd.gt(0)
                ? o.totalAmountUsd
                : o.total
        );
        const legacyPaid = computeOrderLegacyPaidAgreed(o);
        const remaining = toDecimal2(
          totalAgreed.minus(legacyPaid).gt(0)
            ? totalAgreed.minus(legacyPaid)
            : new Prisma.Decimal(0)
        );
        return {
          id: o.id,
          code: o.orderNumber,
          sourceType: PaymentOrderSourceType.PURCHASE_ORDER,
          beneficiaryName: o.supplier?.name || 'Proveedor',
          rifOrId: o.supplier?.rifOrId || null,
          concept: `Orden de Compra ${o.orderNumber}`,
          debtCurrency,
          totalDebtAmount: Number(totalAgreed),
          paidAmount: Number(legacyPaid),
          remainingBalance: Number(remaining),
          createdAt: o.createdAt,
        };
      })
      .filter((o) => o.remainingBalance > 0.009);

    const eligibleServiceOrders = serviceOrders.map((s) => ({
      id: s.id,
      code: s.serviceOrderNumber || `OS-${s.id}`,
      sourceType: PaymentOrderSourceType.SERVICE_ORDER,
      beneficiaryName: s.supplier?.name || s.beneficiary,
      rifOrId: s.supplier?.rifOrId || null,
      concept: s.concept,
      debtCurrency: normalizeCurrency(s.transactionCurrency),
      totalDebtAmount: Number(toDecimal2(s.amountPaid)),
      paidAmount: 0,
      remainingBalance: Number(toDecimal2(s.amountPaid)),
      departmentName: s.department?.name || null,
      createdAt: s.createdAt,
    }));

    return {
      purchaseOrders,
      serviceOrders: eligibleServiceOrders,
    };
  }

  /**
   * Listar Órdenes de Pago unificadas (OC + OS)
   */
  static async listPaymentOrders(filters?: {
    search?: string;
    status?: string;
    sourceType?: string;
    supplierId?: number;
  }) {
    const where: Prisma.PaymentOrderWhereInput = {};

    if (filters?.status && filters.status.trim() !== '') {
      const st = filters.status.trim().toUpperCase();
      if (Object.values(PaymentOrderStatus).includes(st as PaymentOrderStatus)) {
        where.status = st as PaymentOrderStatus;
      }
    }

    if (filters?.sourceType && filters.sourceType.trim() !== '') {
      const src = filters.sourceType.trim().toUpperCase();
      if (
        Object.values(PaymentOrderSourceType).includes(src as PaymentOrderSourceType)
      ) {
        where.sourceType = src as PaymentOrderSourceType;
      }
    }

    if (filters?.supplierId) {
      where.supplierId = Number(filters.supplierId);
    }

    if (filters?.search && filters.search.trim() !== '') {
      const q = filters.search.trim();
      where.OR = [
        { paymentOrderNumber: { contains: q, mode: 'insensitive' } },
        { beneficiaryName: { contains: q, mode: 'insensitive' } },
        { concept: { contains: q, mode: 'insensitive' } },
        {
          purchaseOrder: {
            orderNumber: { contains: q, mode: 'insensitive' },
          },
        },
        {
          serviceOrder: {
            serviceOrderNumber: { contains: q, mode: 'insensitive' },
          },
        },
      ];
    }

    return prisma.paymentOrder.findMany({
      where,
      include: PAYMENT_ORDER_INCLUDE,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }

  /**
   * Obtener detalle completo de una Orden de Pago (incluye pagos y desglose por cuenta)
   */
  static async getPaymentOrderById(id: bigint) {
    const po = await prisma.paymentOrder.findUnique({
      where: { id },
      include: PAYMENT_ORDER_INCLUDE,
    });
    if (!po) {
      throw new Error('Orden de Pago no encontrada.');
    }
    return po;
  }

  /**
   * Crear una Orden de Pago unificada desde una Orden de Compra u Orden de Servicio.
   * Inicia en PENDIENTE_APROBACION (requiere aprobación previa antes de pagar).
   */
  static async createPaymentOrder(dto: CreatePaymentOrderDTO) {
    return prisma.$transaction(async (tx) => {
      if (dto.sourceType === PaymentOrderSourceType.PURCHASE_ORDER) {
        if (!dto.purchaseOrderId) {
          throw new Error('Debe indicar el ID de la Orden de Compra.');
        }

        const order = await tx.order.findUnique({
          where: { id: dto.purchaseOrderId },
          include: {
            supplier: true,
            payments: true,
          },
        });

        if (!order) {
          throw new Error('Orden de Compra no encontrada.');
        }

        if (
          order.status === OrderStatus.BORRADOR ||
          order.status === OrderStatus.CANCELADA
        ) {
          throw new Error(
            `No se puede generar Orden de Pago para una Orden de Compra en estado ${order.status}. Debe estar ENVIADA, PARCIAL o COMPLETADA.`
          );
        }

        if (order.paymentStatus === PaymentStatus.PAGADO) {
          throw new Error('Esta Orden de Compra ya se encuentra totalmente pagada.');
        }

        const existingActive = await tx.paymentOrder.findFirst({
          where: {
            purchaseOrderId: order.id,
            status: {
              in: [
                PaymentOrderStatus.BORRADOR,
                PaymentOrderStatus.PENDIENTE_APROBACION,
                PaymentOrderStatus.APROBADA,
                PaymentOrderStatus.PAGADA_PARCIALMENTE,
              ],
            },
          },
        });

        if (existingActive) {
          throw new Error(
            `Ya existe una Orden de Pago activa (${existingActive.paymentOrderNumber}) para la Orden de Compra ${order.orderNumber}.`
          );
        }

        const debtCurrency = normalizeCurrency(order.currency);
        const totalDebt = toDecimal2(
          debtCurrency === 'VED'
            ? order.totalAmountBs.gt(0)
              ? order.totalAmountBs
              : order.total
            : debtCurrency === 'EUR'
              ? order.total
              : order.totalAmountUsd.gt(0)
                ? order.totalAmountUsd
                : order.total
        );

        const legacyPaid = computeOrderLegacyPaidAgreed(order);
        const remaining = toDecimal2(totalDebt.minus(legacyPaid));
        if (remaining.lte(0)) {
          throw new Error('La Orden de Compra no posee saldo pendiente por pagar.');
        }

        const paymentOrderNumber = await generateNextPaymentOrderNumber(tx);

        return tx.paymentOrder.create({
          data: {
            paymentOrderNumber,
            sourceType: PaymentOrderSourceType.PURCHASE_ORDER,
            purchaseOrderId: order.id,
            supplierId: order.supplierId,
            beneficiaryName: order.supplier?.name || 'Proveedor',
            concept: `Orden de Compra ${order.orderNumber}`,
            debtCurrency,
            totalDebtAmount: totalDebt,
            paidAmount: legacyPaid,
            remainingBalance: remaining,
            status: PaymentOrderStatus.PENDIENTE_APROBACION,
            notes: dto.notes?.trim() || null,
            createdById: dto.createdById,
          },
          include: PAYMENT_ORDER_INCLUDE,
        });
      }

      // SERVICE_ORDER
      if (!dto.serviceOrderId) {
        throw new Error('Debe indicar el ID de la Orden de Servicio.');
      }

      const serviceOrder = await tx.directPayment.findUnique({
        where: { id: dto.serviceOrderId },
        include: { supplier: true },
      });

      if (!serviceOrder) {
        throw new Error('Orden de Servicio no encontrada.');
      }

      if (serviceOrder.status !== ServiceOrderStatus.APROBADA) {
        throw new Error(
          `Solo se puede generar Orden de Pago para Órdenes de Servicio en estado APROBADA. Estado actual: ${serviceOrder.status}.`
        );
      }

      const existingActive = await tx.paymentOrder.findFirst({
        where: {
          serviceOrderId: serviceOrder.id,
          status: {
            in: [
              PaymentOrderStatus.BORRADOR,
              PaymentOrderStatus.PENDIENTE_APROBACION,
              PaymentOrderStatus.APROBADA,
              PaymentOrderStatus.PAGADA_PARCIALMENTE,
            ],
          },
        },
      });

      if (existingActive) {
        throw new Error(
          `Ya existe una Orden de Pago activa (${existingActive.paymentOrderNumber}) para la Orden de Servicio ${serviceOrder.serviceOrderNumber || `#${serviceOrder.id}`}.`
        );
      }

      const debtCurrency = normalizeCurrency(serviceOrder.transactionCurrency);
      const totalDebt = toDecimal2(serviceOrder.amountPaid);
      if (totalDebt.lte(0)) {
        throw new Error('El monto de la Orden de Servicio debe ser mayor a 0.');
      }

      const paymentOrderNumber = await generateNextPaymentOrderNumber(tx);

      return tx.paymentOrder.create({
        data: {
          paymentOrderNumber,
          sourceType: PaymentOrderSourceType.SERVICE_ORDER,
          serviceOrderId: serviceOrder.id,
          supplierId: serviceOrder.supplierId,
          beneficiaryName: serviceOrder.supplier?.name || serviceOrder.beneficiary,
          concept: serviceOrder.concept,
          debtCurrency,
          totalDebtAmount: totalDebt,
          paidAmount: new Prisma.Decimal(0),
          remainingBalance: totalDebt,
          status: PaymentOrderStatus.PENDIENTE_APROBACION,
          notes: dto.notes?.trim() || null,
          createdById: dto.createdById,
        },
        include: PAYMENT_ORDER_INCLUDE,
      });
    });
  }

  /**
   * Aprobar Orden de Pago (PENDIENTE_APROBACION / BORRADOR -> APROBADA)
   */
  static async approvePaymentOrder(id: bigint, userId: number, notes?: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.paymentOrder.findUnique({ where: { id } });
      if (!existing) {
        throw new Error('Orden de Pago no encontrada.');
      }

      if (
        existing.status !== PaymentOrderStatus.PENDIENTE_APROBACION &&
        existing.status !== PaymentOrderStatus.BORRADOR
      ) {
        throw new Error(
          `Solo se pueden aprobar Órdenes de Pago en estado PENDIENTE_APROBACION o BORRADOR. Estado actual: ${existing.status}.`
        );
      }

      const approver = await tx.user.findUnique({
        where: { id: userId },
        select: { fullName: true },
      });

      const updated = await tx.paymentOrder.update({
        where: { id },
        data: {
          status: PaymentOrderStatus.APROBADA,
          approvedById: userId,
          approvedAt: new Date(),
          approvalNotes: notes?.trim() || null,
          rejectedById: null,
          rejectedAt: null,
          rejectionReason: null,
        },
        include: PAYMENT_ORDER_INCLUDE,
      });

      // Si proviene de Orden de Servicio, sincronizarla a estado ORDEN_PAGO con el correlativo OP
      if (
        existing.sourceType === PaymentOrderSourceType.SERVICE_ORDER &&
        existing.serviceOrderId
      ) {
        await tx.directPayment.update({
          where: { id: existing.serviceOrderId },
          data: {
            status: ServiceOrderStatus.ORDEN_PAGO,
            paymentOrderNumber: existing.paymentOrderNumber,
            paymentOrderIssuedAt: new Date(),
            paymentOrderIssuedById: userId,
            paymentOrderNotes: notes?.trim() || existing.notes,
            authorizedBy: approver?.fullName || undefined,
          },
        });
      }

      return updated;
    });
  }

  /**
   * Rechazar Orden de Pago (PENDIENTE_APROBACION -> RECHAZADA)
   */
  static async rejectPaymentOrder(id: bigint, userId: number, reason: string) {
    if (!reason || reason.trim().length < 5) {
      throw new Error(
        'El motivo de rechazo es obligatorio y debe tener al menos 5 caracteres.'
      );
    }

    return prisma.$transaction(async (tx) => {
      const existing = await tx.paymentOrder.findUnique({ where: { id } });
      if (!existing) {
        throw new Error('Orden de Pago no encontrada.');
      }

      if (existing.status !== PaymentOrderStatus.PENDIENTE_APROBACION) {
        throw new Error(
          `Solo se pueden rechazar Órdenes de Pago en estado PENDIENTE_APROBACION. Estado actual: ${existing.status}.`
        );
      }

      return tx.paymentOrder.update({
        where: { id },
        data: {
          status: PaymentOrderStatus.RECHAZADA,
          rejectedById: userId,
          rejectedAt: new Date(),
          rejectionReason: reason.trim(),
        },
        include: PAYMENT_ORDER_INCLUDE,
      });
    });
  }

  /**
   * Reenviar a aprobación una Orden de Pago rechazada
   */
  static async resubmitPaymentOrder(id: bigint) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.paymentOrder.findUnique({ where: { id } });
      if (!existing) {
        throw new Error('Orden de Pago no encontrada.');
      }

      if (existing.status !== PaymentOrderStatus.RECHAZADA) {
        throw new Error(
          `Solo se pueden reenviar Órdenes de Pago en estado RECHAZADA. Estado actual: ${existing.status}.`
        );
      }

      return tx.paymentOrder.update({
        where: { id },
        data: {
          status: PaymentOrderStatus.PENDIENTE_APROBACION,
          rejectedById: null,
          rejectedAt: null,
          rejectionReason: null,
        },
        include: PAYMENT_ORDER_INCLUDE,
      });
    });
  }

  /**
   * Anular una Orden de Pago (solo si no tiene pagos confirmados)
   */
  static async cancelPaymentOrder(id: bigint, userId: number, reason?: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.paymentOrder.findUnique({
        where: { id },
        include: { payments: true },
      });
      if (!existing) {
        throw new Error('Orden de Pago no encontrada.');
      }

      if (
        existing.status === PaymentOrderStatus.PAGADA ||
        existing.status === PaymentOrderStatus.ANULADA
      ) {
        throw new Error(
          `No se puede anular una Orden de Pago en estado ${existing.status}.`
        );
      }

      const hasConfirmed = existing.payments.some(
        (p) => p.status === TreasuryPaymentStatus.CONFIRMADO
      );
      if (hasConfirmed || existing.paidAmount.gt(0)) {
        throw new Error(
          'No se puede anular una Orden de Pago que ya tiene pagos confirmados aplicados.'
        );
      }

      await tx.treasuryPayment.updateMany({
        where: {
          paymentOrderId: id,
          status: TreasuryPaymentStatus.BORRADOR,
        },
        data: { status: TreasuryPaymentStatus.ANULADO },
      });

      return tx.paymentOrder.update({
        where: { id },
        data: {
          status: PaymentOrderStatus.ANULADA,
          rejectedById: userId,
          rejectedAt: new Date(),
          rejectionReason: reason?.trim() || 'Anulada por usuario autorizado',
        },
        include: PAYMENT_ORDER_INCLUDE,
      });
    });
  }

  /**
   * Registrar un Pago (simple, parcial o mixto/split desde 1..N cuentas y monedas)
   * contra una Orden de Pago APROBADA o PAGADA_PARCIALMENTE.
   * Si `confirmImmediately: true`, se confirma y descuenta saldo atómicamente en la misma transacción.
   */
  static async createTreasuryPayment(
    paymentOrderId: bigint,
    userId: number,
    dto: CreateTreasuryPaymentDTO
  ) {
    if (!dto.lines || !Array.isArray(dto.lines) || dto.lines.length === 0) {
      throw new Error('Debe incluir al menos una línea de pago.');
    }

    const { dateStr, dateObj } = parseDateOnlyUtc(dto.paymentDate);

    return prisma.$transaction(async (tx) => {
      const po = await tx.paymentOrder.findUnique({
        where: { id: paymentOrderId },
      });

      if (!po) {
        throw new Error('Orden de Pago no encontrada.');
      }

      if (
        po.status !== PaymentOrderStatus.APROBADA &&
        po.status !== PaymentOrderStatus.PAGADA_PARCIALMENTE
      ) {
        throw new Error(
          `No se puede registrar un pago porque la Orden de Pago ${po.paymentOrderNumber} está en estado ${po.status}. Debe estar APROBADA antes de pagar.`
        );
      }

      const debtCurrency = normalizeCurrency(po.debtCurrency);
      const { usdExchange, eurExchange } = await lookupDailyRatesStrict(tx, dateObj);

      const resolvedLines: Array<{
        sourceAccountId: number;
        paymentMethod: string;
        currency: 'USD' | 'VED' | 'EUR';
        amountPaid: Prisma.Decimal;
        exchangeRateId: bigint | null;
        exchangeRateValue: Prisma.Decimal;
        equivalentDebtAmount: Prisma.Decimal;
        referenceNumber: string | null;
        receiptUrl: string | null;
      }> = [];

      let totalEquivalent = new Prisma.Decimal(0);

      for (let i = 0; i < dto.lines.length; i++) {
        const rawLine = dto.lines[i]!;
        const accId = Number(rawLine.sourceAccountId);
        if (!accId || Number.isNaN(accId)) {
          throw new Error(`La línea #${i + 1} debe indicar una cuenta de origen válida.`);
        }

        const account = await tx.bankAccount.findUnique({
          where: { id: accId },
        });

        if (!account || !account.isActive) {
          throw new Error(
            `La cuenta de origen seleccionada en la línea #${i + 1} no existe o está inactiva.`
          );
        }

        const rawAmt = Number(rawLine.amountPaid);
        if (Number.isNaN(rawAmt) || rawAmt <= 0) {
          throw new Error(`El monto de la línea #${i + 1} debe ser mayor a 0.`);
        }

        const amountPaid = toDecimal2(rawAmt);
        const lineCurrency = normalizeCurrency(account.currency);

        const converted = convertLineAmountToDebtCurrency({
          amountPaid,
          lineCurrency,
          debtCurrency,
          dateStr,
          usdExchange,
          eurExchange,
        });

        if (converted.equivalentDebtAmount.lte(0)) {
          throw new Error(
            `El equivalente en ${debtCurrency} de la línea #${i + 1} resulta en 0.00. Verifique el monto y la tasa.`
          );
        }

        totalEquivalent = totalEquivalent.plus(converted.equivalentDebtAmount);

        const defaultMethod =
          account.type === 'EFECTIVO' || account.type === 'CAJA_CHICA'
            ? 'EFECTIVO'
            : 'TRANSFERENCIA';

        resolvedLines.push({
          sourceAccountId: account.id,
          paymentMethod: (rawLine.paymentMethod || defaultMethod).trim().toUpperCase(),
          currency: lineCurrency,
          amountPaid,
          exchangeRateId: converted.exchangeRateId,
          exchangeRateValue: converted.exchangeRateValue,
          equivalentDebtAmount: converted.equivalentDebtAmount,
          referenceNumber: rawLine.referenceNumber?.trim() || null,
          receiptUrl: rawLine.receiptUrl?.trim() || null,
        });
      }

      totalEquivalent = toDecimal2(totalEquivalent);
      const remainingBalance = toDecimal2(po.remainingBalance);

      if (totalEquivalent.gt(remainingBalance)) {
        throw new Error(
          `El total equivalente del pago (${currencySymbol(debtCurrency)} ${totalEquivalent.toFixed(2)} ${debtCurrency}) supera el saldo pendiente (${currencySymbol(debtCurrency)} ${remainingBalance.toFixed(2)} ${debtCurrency}).`
        );
      }

      const paymentNumber = await generateNextPaymentNumber(tx);

      const createdPayment = await tx.treasuryPayment.create({
        data: {
          paymentNumber,
          paymentOrderId: po.id,
          paymentDate: dateObj,
          status: TreasuryPaymentStatus.BORRADOR,
          totalEquivalentInDebtCurrency: totalEquivalent,
          notes: dto.notes?.trim() || null,
          createdById: userId,
          lines: {
            create: resolvedLines.map((l) => ({
              sourceAccountId: l.sourceAccountId,
              paymentMethod: l.paymentMethod,
              currency: l.currency,
              amountPaid: l.amountPaid,
              exchangeRateId: l.exchangeRateId,
              exchangeRateValue: l.exchangeRateValue,
              equivalentDebtAmount: l.equivalentDebtAmount,
              referenceNumber: l.referenceNumber,
              receiptUrl: l.receiptUrl,
            })),
          },
        },
        include: {
          lines: {
            include: {
              sourceAccount: true,
              exchangeRate: true,
            },
          },
        },
      });

      if (dto.confirmImmediately) {
        const updatedPo = await executeConfirmPaymentTx(tx, createdPayment.id, userId);
        const confirmedPayment = updatedPo?.payments.find(
          (p) => p.id === createdPayment.id
        );
        return {
          payment: confirmedPayment || createdPayment,
          paymentOrder: updatedPo,
        };
      }

      const refreshedPo = await tx.paymentOrder.findUnique({
        where: { id: po.id },
        include: PAYMENT_ORDER_INCLUDE,
      });

      return {
        payment: createdPayment,
        paymentOrder: refreshedPo,
      };
    });
  }

  /**
   * Confirmar un pago previamente guardado en BORRADOR (operación atómica)
   */
  static async confirmTreasuryPayment(paymentId: bigint, userId: number) {
    return prisma.$transaction(async (tx) => {
      const updatedPo = await executeConfirmPaymentTx(tx, paymentId, userId);
      const confirmedPayment = updatedPo?.payments.find((p) => p.id === paymentId);
      return {
        payment: confirmedPayment,
        paymentOrder: updatedPo,
      };
    });
  }

  /**
   * Anular un pago en estado BORRADOR
   */
  static async voidTreasuryPayment(paymentId: bigint) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.treasuryPayment.findUnique({
        where: { id: paymentId },
      });

      if (!existing) {
        throw new Error('Registro de pago no encontrado.');
      }

      if (existing.status !== TreasuryPaymentStatus.BORRADOR) {
        throw new Error(
          `Solo se pueden anular pagos en estado BORRADOR. Estado actual: ${existing.status}.`
        );
      }

      await tx.treasuryPayment.update({
        where: { id: paymentId },
        data: { status: TreasuryPaymentStatus.ANULADO },
      });

      return tx.paymentOrder.findUnique({
        where: { id: existing.paymentOrderId },
        include: PAYMENT_ORDER_INCLUDE,
      });
    });
  }

  /**
   * Consultar movimientos de egreso de una cuenta bancaria / caja maestra
   */
  static async listAccountMovements(bankAccountId: number, limit = 50) {
    return prisma.bankAccountMovement.findMany({
      where: { bankAccountId },
      include: {
        bankAccount: true,
        createdBy: { select: USER_BASIC_SELECT },
        paymentLine: {
          include: {
            payment: {
              include: {
                paymentOrder: {
                  select: {
                    id: true,
                    paymentOrderNumber: true,
                    beneficiaryName: true,
                    sourceType: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: [{ movementDate: 'desc' }, { id: 'desc' }],
      take: limit,
    });
  }
}
