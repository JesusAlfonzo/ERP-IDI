import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { OrderStatus, PaymentStatus, ReceptionStatus, ServiceOrderStatus } from '@prisma/client';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'jwt_default_secret_key';

function signToken(userId: number, roles: string[]) {
  return jwt.sign(
    {
      id: userId,
      username: 'treasury_tester',
      email: 'treasury_tester@idi.ucv.ve',
      department: 'Tesorería',
      roles,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('Integración: Módulo de Pagos y Tesorería Unificada (OC + OS, Multimoneda, Parciales y Mixtos)', () => {
  const TEST_RATE_DATE = '2026-11-23';
  const MISSING_RATE_DATE = '2025-01-03';

  let testUserId: number;
  let adminToken: string;
  let comprasToken: string;
  let tesoreriaToken: string;

  let usdCurrencyId: number;
  let supplierId: number;

  let usdDivisasAccountId: number;
  let vesBankAccountId: number;
  let cajaChicaUsdAccountId: number;

  let poOrder1Id: bigint;
  let poOrder2Id: bigint;
  let serviceOrderId: bigint;

  let paymentOrder1Id: string;
  let paymentOrder2Id: string;
  let servicePaymentOrderId: string;

  beforeAll(async () => {
    const existingUser = await prisma.user.findFirst();
    if (existingUser) {
      testUserId = existingUser.id;
    } else {
      const created = await prisma.user.create({
        data: {
          username: `treasury_tester_${Date.now()}`,
          email: `treasury_tester_${Date.now()}@idi.ucv.ve`,
          fullName: 'Tester Tesorería',
          passwordHash: 'fakehash',
          department: 'Tesorería',
        },
      });
      testUserId = created.id;
    }

    adminToken = signToken(testUserId, ['ADMINISTRADOR']);
    comprasToken = signToken(testUserId, ['COMPRAS']);
    tesoreriaToken = signToken(testUserId, ['ADMINISTRACION']);

    // Asegurar monedas USD, VES y EUR
    const usdCurr =
      (await prisma.currency.findFirst({ where: { code: 'USD' } })) ||
      (await prisma.currency.create({
        data: { code: 'USD', name: 'Dólar', symbol: '$', isDefault: true },
      }));
    usdCurrencyId = usdCurr.id;

    const vesCurr =
      (await prisma.currency.findFirst({ where: { code: { in: ['VES', 'VED'] } } })) ||
      (await prisma.currency.create({
        data: { code: 'VES', name: 'Bolívar Digital', symbol: 'Bs.', isDefault: false },
      }));

    const eurCurr =
      (await prisma.currency.findFirst({ where: { code: 'EUR' } })) ||
      (await prisma.currency.create({
        data: { code: 'EUR', name: 'Euro', symbol: '€', isDefault: false },
      }));

    // Limpiar tasas en fecha MISSING_RATE_DATE para validar rechazo estricto
    await prisma.currencyExchange.deleteMany({
      where: {
        effectiveDate: new Date(`${MISSING_RATE_DATE}T00:00:00.000Z`),
      },
    });

    // Registrar tasas diarias exactas para TEST_RATE_DATE (USD=80.00, EUR=88.00)
    await prisma.currencyExchange.create({
      data: {
        currencyId: vesCurr.id,
        rate: 80.0,
        effectiveDate: new Date(`${TEST_RATE_DATE}T00:00:00.000Z`),
        createdById: testUserId,
      },
    });
    await prisma.currencyExchange.create({
      data: {
        currencyId: eurCurr.id,
        rate: 88.0,
        effectiveDate: new Date(`${TEST_RATE_DATE}T00:00:00.000Z`),
        createdById: testUserId,
      },
    });

    // Crear 3 cuentas maestras de tesorería
    const ts = String(Date.now()).slice(-5);
    const accUsd = await prisma.bankAccount.create({
      data: {
        bankName: `Cuenta Divisas USD ${ts}`,
        accountNumber: `USD-${ts}`,
        type: 'DIVISAS',
        currency: 'USD',
        holderName: 'IDI',
        holderId: 'J-30710739-1',
        isActive: true,
      },
    });
    usdDivisasAccountId = accUsd.id;

    const accVes = await prisma.bankAccount.create({
      data: {
        bankName: `Banco Nacional VES ${ts}`,
        accountNumber: `010200001122${ts}`,
        type: 'CORRIENTE',
        currency: 'VED',
        holderName: 'IDI',
        holderId: 'J-30710739-1',
        isActive: true,
      },
    });
    vesBankAccountId = accVes.id;

    const accCaja = await prisma.bankAccount.create({
      data: {
        bankName: `Caja Chica USD ${ts}`,
        accountNumber: null,
        type: 'CAJA_CHICA',
        currency: 'USD',
        holderName: 'IDI',
        holderId: 'J-30710739-1',
        isActive: true,
      },
    });
    cajaChicaUsdAccountId = accCaja.id;

    // Proveedor de prueba
    const supplier = await prisma.supplier.create({
      data: {
        rifOrId: `J-99${ts}11-0`,
        name: `Proveedor Tesorería Test ${ts}`,
      },
    });
    supplierId = supplier.id;

    // 2 Órdenes de Compra ENVIADAS de $100.00 USD cada una
    const order1 = await prisma.order.create({
      data: {
        orderNumber: `ORD-TES1-${ts}`,
        supplierId,
        currency: 'USD',
        currencyId: usdCurrencyId,
        exchangeRate: 80.0,
        status: OrderStatus.ENVIADA,
        paymentStatus: PaymentStatus.PENDIENTE,
        receptionStatus: ReceptionStatus.PENDIENTE,
        subtotal: 100,
        taxTotal: 0,
        total: 100,
        exemptAmount: 100,
        totalAmount: 100,
        totalAmountUsd: 100,
        totalAmountBs: 8000,
        createdById: testUserId,
      },
    });
    poOrder1Id = order1.id;

    const order2 = await prisma.order.create({
      data: {
        orderNumber: `ORD-TES2-${ts}`,
        supplierId,
        currency: 'USD',
        currencyId: usdCurrencyId,
        exchangeRate: 80.0,
        status: OrderStatus.ENVIADA,
        paymentStatus: PaymentStatus.PENDIENTE,
        receptionStatus: ReceptionStatus.PENDIENTE,
        subtotal: 100,
        taxTotal: 0,
        total: 100,
        exemptAmount: 100,
        totalAmount: 100,
        totalAmountUsd: 100,
        totalAmountBs: 8000,
        createdById: testUserId,
      },
    });
    poOrder2Id = order2.id;

    // Orden de Servicio APROBADA de $100.00 USD
    const svc = await prisma.directPayment.create({
      data: {
        serviceOrderNumber: `OS-TES-${ts}`,
        status: ServiceOrderStatus.APROBADA,
        concept: 'Calibración y mantenimiento de equipos de laboratorio',
        beneficiary: supplier.name,
        supplierId,
        amountPaid: 100,
        transactionCurrency: 'USD',
        exchangeRate: 1.0,
        equivalentAmountUsd: 100,
        registeredById: testUserId,
        approvedByUserId: testUserId,
        approvedAt: new Date(),
      },
    });
    serviceOrderId = svc.id;
  });

  // =========================================================================
  // ESCENARIO 1: Bloqueo de pago si la Orden de Pago no está aprobada
  // =========================================================================
  it('Escenario 1: Debe crear Orden de Pago en PENDIENTE_APROBACION y bloquear pagos hasta ser aprobada', async () => {
    const createRes = await request(app)
      .post('/api/treasury/payment-orders')
      .set('Authorization', `Bearer ${comprasToken}`)
      .send({
        sourceType: 'PURCHASE_ORDER',
        purchaseOrderId: poOrder1Id.toString(),
        notes: 'Solicitud de pago para compra de reactivos',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.status).toBe('PENDIENTE_APROBACION');
    expect(createRes.body.data.paymentOrderNumber).toMatch(/^OP-\d{4}-\d{4}$/);
    expect(Number(createRes.body.data.remainingBalance)).toBe(100);
    paymentOrder1Id = String(createRes.body.data.id);

    // Intentar pagar sin estar aprobada -> 400
    const blockedPay = await request(app)
      .post(`/api/treasury/payment-orders/${paymentOrder1Id}/payments`)
      .set('Authorization', `Bearer ${tesoreriaToken}`)
      .send({
        paymentDate: TEST_RATE_DATE,
        confirmImmediately: true,
        lines: [
          {
            sourceAccountId: usdDivisasAccountId,
            paymentMethod: 'TRANSFERENCIA',
            amountPaid: 50,
            referenceNumber: 'REF-BLOCKED-1',
          },
        ],
      });
    expect(blockedPay.status).toBe(400);
    expect(blockedPay.body.message).toMatch(/APROBADA/i);

    // RBAC: COMPRAS no puede aprobar (403)
    const forbiddenApprove = await request(app)
      .post(`/api/treasury/payment-orders/${paymentOrder1Id}/approve`)
      .set('Authorization', `Bearer ${comprasToken}`)
      .send({});
    expect(forbiddenApprove.status).toBe(403);

    // Rechazar con motivo y verificar que sigue bloqueada para pago
    const rejectRes = await request(app)
      .post(`/api/treasury/payment-orders/${paymentOrder1Id}/reject`)
      .set('Authorization', `Bearer ${tesoreriaToken}`)
      .send({ reason: 'Falta verificación de recepción parcial' });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.status).toBe('RECHAZADA');

    const blockedAfterReject = await request(app)
      .post(`/api/treasury/payment-orders/${paymentOrder1Id}/payments`)
      .set('Authorization', `Bearer ${tesoreriaToken}`)
      .send({
        paymentDate: TEST_RATE_DATE,
        confirmImmediately: true,
        lines: [{ sourceAccountId: usdDivisasAccountId, amountPaid: 50 }],
      });
    expect(blockedAfterReject.status).toBe(400);

    // Reenviar y aprobar
    const resubmitRes = await request(app)
      .post(`/api/treasury/payment-orders/${paymentOrder1Id}/resubmit`)
      .set('Authorization', `Bearer ${comprasToken}`);
    expect(resubmitRes.status).toBe(200);
    expect(resubmitRes.body.data.status).toBe('PENDIENTE_APROBACION');

    const approveRes = await request(app)
      .post(`/api/treasury/payment-orders/${paymentOrder1Id}/approve`)
      .set('Authorization', `Bearer ${tesoreriaToken}`)
      .send({ notes: 'Aprobada para pago en Tesorería' });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('APROBADA');
  });

  // =========================================================================
  // ESCENARIO 2: Pago parcial (borrador -> confirmación) y pago final en misma moneda
  // =========================================================================
  it('Escenario 2: Debe gestionar abono parcial en borrador, confirmar atómicamente, impedir sobrepago y liquidar saldo', async () => {
    // 1. Guardar abono parcial en BORRADOR ($40 USD) -> saldo NO debe descontarse todavía
    const draftRes = await request(app)
      .post(`/api/treasury/payment-orders/${paymentOrder1Id}/payments`)
      .set('Authorization', `Bearer ${tesoreriaToken}`)
      .send({
        paymentDate: TEST_RATE_DATE,
        confirmImmediately: false,
        notes: 'Primer abono parcial 40%',
        lines: [
          {
            sourceAccountId: usdDivisasAccountId,
            paymentMethod: 'TRANSFERENCIA',
            amountPaid: 40,
            referenceNumber: 'REF-PART-1',
          },
        ],
      });

    expect(draftRes.status).toBe(201);
    expect(draftRes.body.data.payment.status).toBe('BORRADOR');
    expect(Number(draftRes.body.data.paymentOrder.remainingBalance)).toBe(100);
    const draftPaymentId = String(draftRes.body.data.payment.id);

    // 2. Confirmar borrador -> saldo baja a $60, estado PAGADA_PARCIALMENTE y Order = PAGADO_PARCIAL
    const confirmRes = await request(app)
      .post(`/api/treasury/payments/${draftPaymentId}/confirm`)
      .set('Authorization', `Bearer ${tesoreriaToken}`);

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.data.payment.status).toBe('CONFIRMADO');
    expect(confirmRes.body.data.paymentOrder.status).toBe('PAGADA_PARCIALMENTE');
    expect(Number(confirmRes.body.data.paymentOrder.paidAmount)).toBe(40);
    expect(Number(confirmRes.body.data.paymentOrder.remainingBalance)).toBe(60);

    const orderAfterPartial = await prisma.order.findUnique({ where: { id: poOrder1Id } });
    expect(orderAfterPartial?.paymentStatus).toBe('PAGADO_PARCIAL');

    // 3. Intentar sobrepago de $65 USD (saldo es $60) -> debe rechazarse (400)
    const overpayRes = await request(app)
      .post(`/api/treasury/payment-orders/${paymentOrder1Id}/payments`)
      .set('Authorization', `Bearer ${tesoreriaToken}`)
      .send({
        paymentDate: TEST_RATE_DATE,
        confirmImmediately: true,
        lines: [
          {
            sourceAccountId: usdDivisasAccountId,
            paymentMethod: 'TRANSFERENCIA',
            amountPaid: 65,
            referenceNumber: 'REF-OVERPAY',
          },
        ],
      });
    expect(overpayRes.status).toBe(400);
    expect(overpayRes.body.message).toMatch(/supera el saldo pendiente/i);

    // 4. Registrar y confirmar pago final de $60 USD -> saldo 0, PAGADA y Order = PAGADO
    const finalRes = await request(app)
      .post(`/api/treasury/payment-orders/${paymentOrder1Id}/payments`)
      .set('Authorization', `Bearer ${tesoreriaToken}`)
      .send({
        paymentDate: TEST_RATE_DATE,
        confirmImmediately: true,
        notes: 'Cancelación de saldo restante',
        lines: [
          {
            sourceAccountId: usdDivisasAccountId,
            paymentMethod: 'TRANSFERENCIA',
            amountPaid: 60,
            referenceNumber: 'REF-FINAL-2',
          },
        ],
      });

    expect(finalRes.status).toBe(201);
    expect(finalRes.body.data.paymentOrder.status).toBe('PAGADA');
    expect(Number(finalRes.body.data.paymentOrder.paidAmount)).toBe(100);
    expect(Number(finalRes.body.data.paymentOrder.remainingBalance)).toBe(0);

    const orderAfterFull = await prisma.order.findUnique({
      where: { id: poOrder1Id },
      include: { payments: true },
    });
    expect(orderAfterFull?.paymentStatus).toBe('PAGADO');
    expect(orderAfterFull?.payments.length).toBe(2);
  });

  // =========================================================================
  // ESCENARIO 3: Pago en moneda distinta (USD -> VES) con tasa manual del día y validación estricta de fecha
  // =========================================================================
  it('Escenario 3: Debe exigir tasa manual registrada para la fecha exacta y convertir correctamente deuda USD pagada en VES', async () => {
    // Verificar endpoint GET /api/exchange-rates/by-date
    const rateCheckOk = await request(app)
      .get(`/api/exchange-rates/by-date?date=${TEST_RATE_DATE}`);
    expect(rateCheckOk.status).toBe(200);
    expect(rateCheckOk.body.data.hasUsdRate).toBe(true);
    expect(rateCheckOk.body.data.usdRate).toBe(80);

    const rateCheckMissing = await request(app)
      .get(`/api/exchange-rates/by-date?date=${MISSING_RATE_DATE}`);
    expect(rateCheckMissing.status).toBe(200);
    expect(rateCheckMissing.body.data.hasUsdRate).toBe(false);

    // Crear y aprobar Orden de Pago #2 ($100 USD)
    const createPo2 = await request(app)
      .post('/api/treasury/payment-orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        sourceType: 'PURCHASE_ORDER',
        purchaseOrderId: poOrder2Id.toString(),
      });
    expect(createPo2.status).toBe(201);
    paymentOrder2Id = String(createPo2.body.data.id);

    await request(app)
      .post(`/api/treasury/payment-orders/${paymentOrder2Id}/approve`)
      .set('Authorization', `Bearer ${tesoreriaToken}`)
      .send({});

    // Intentar pagar en VES en una fecha SIN tasa registrada -> debe rechazar (400)
    const missingRatePay = await request(app)
      .post(`/api/treasury/payment-orders/${paymentOrder2Id}/payments`)
      .set('Authorization', `Bearer ${tesoreriaToken}`)
      .send({
        paymentDate: MISSING_RATE_DATE,
        confirmImmediately: true,
        lines: [
          {
            sourceAccountId: vesBankAccountId,
            paymentMethod: 'TRANSFERENCIA',
            amountPaid: 8000,
            referenceNumber: 'REF-NO-RATE',
          },
        ],
      });
    expect(missingRatePay.status).toBe(400);
    expect(missingRatePay.body.message).toContain(MISSING_RATE_DATE);

    // Pagar Bs. 8.000,00 en fecha con tasa 80.00 -> equivale exactamente a $100.00 USD
    const vesPay = await request(app)
      .post(`/api/treasury/payment-orders/${paymentOrder2Id}/payments`)
      .set('Authorization', `Bearer ${tesoreriaToken}`)
      .send({
        paymentDate: TEST_RATE_DATE,
        confirmImmediately: true,
        lines: [
          {
            sourceAccountId: vesBankAccountId,
            paymentMethod: 'TRANSFERENCIA',
            amountPaid: 8000,
            referenceNumber: 'REF-VES-8000',
          },
        ],
      });

    expect(vesPay.status).toBe(201);
    expect(vesPay.body.data.paymentOrder.status).toBe('PAGADA');
    expect(Number(vesPay.body.data.paymentOrder.remainingBalance)).toBe(0);
    const line = vesPay.body.data.payment.lines[0];
    expect(line.currency).toBe('VED');
    expect(Number(line.amountPaid)).toBe(8000);
    expect(Number(line.exchangeRateValue)).toBe(80);
    expect(Number(line.equivalentDebtAmount)).toBe(100);
    expect(line.exchangeRateId).toBeTruthy();

    // Verificar movimiento de egreso en cuenta bancaria VES
    const movRes = await request(app)
      .get(`/api/treasury/bank-accounts/${vesBankAccountId}/movements`)
      .set('Authorization', `Bearer ${tesoreriaToken}`);
    expect(movRes.status).toBe(200);
    const vesMov = movRes.body.data.find(
      (m: { referenceNumber: string }) => m.referenceNumber === 'REF-VES-8000'
    );
    expect(vesMov).toBeDefined();
    expect(Number(vesMov.amount)).toBe(8000);
    expect(vesMov.currency).toBe('VED');
  });

  // =========================================================================
  // ESCENARIO 4: Pago Mixto / Split (múltiples cuentas y monedas en un solo pago) para Orden de Servicio
  // =========================================================================
  it('Escenario 4: Debe liquidar una Orden de Servicio de $100 USD con pago mixto desde 3 cuentas (USD + VES + Caja Chica)', async () => {
    // 1. Crear Orden de Pago para la Orden de Servicio y aprobarla
    const createSvcPo = await request(app)
      .post('/api/treasury/payment-orders')
      .set('Authorization', `Bearer ${comprasToken}`)
      .send({
        sourceType: 'SERVICE_ORDER',
        serviceOrderId: serviceOrderId.toString(),
      });
    expect(createSvcPo.status).toBe(201);
    expect(createSvcPo.body.data.status).toBe('PENDIENTE_APROBACION');
    servicePaymentOrderId = String(createSvcPo.body.data.id);

    const approveSvcPo = await request(app)
      .post(`/api/treasury/payment-orders/${servicePaymentOrderId}/approve`)
      .set('Authorization', `Bearer ${tesoreriaToken}`)
      .send({ notes: 'Aprobado pago mixto para servicio técnico' });
    expect(approveSvcPo.status).toBe(200);
    expect(approveSvcPo.body.data.status).toBe('APROBADA');

    // Verificar que la Orden de Servicio quedó en ORDEN_PAGO con el mismo correlativo OP
    const svcAfterApprove = await prisma.directPayment.findUnique({
      where: { id: serviceOrderId },
    });
    expect(svcAfterApprove?.status).toBe('ORDEN_PAGO');
    expect(svcAfterApprove?.paymentOrderNumber).toBe(
      approveSvcPo.body.data.paymentOrderNumber
    );

    // 2. Registrar y confirmar pago mixto en una sola operación:
    //    - $40.00 USD desde Cuenta Divisas USD
    //    - Bs. 3.600,00 VED (= $45.00 USD @ 80.00) desde Banco Nacional VES
    //    - $15.00 USD desde Caja Chica USD
    //    Total equivalente = $100.00 USD
    const splitRes = await request(app)
      .post(`/api/treasury/payment-orders/${servicePaymentOrderId}/payments`)
      .set('Authorization', `Bearer ${tesoreriaToken}`)
      .send({
        paymentDate: TEST_RATE_DATE,
        confirmImmediately: true,
        notes: 'Pago mixto: divisas + transferencia Bs + caja chica',
        lines: [
          {
            sourceAccountId: usdDivisasAccountId,
            paymentMethod: 'TRANSFERENCIA',
            amountPaid: 40,
            referenceNumber: 'SPLIT-USD-40',
          },
          {
            sourceAccountId: vesBankAccountId,
            paymentMethod: 'TRANSFERENCIA',
            amountPaid: 3600,
            referenceNumber: 'SPLIT-VES-3600',
          },
          {
            sourceAccountId: cajaChicaUsdAccountId,
            paymentMethod: 'EFECTIVO',
            amountPaid: 15,
            referenceNumber: 'SPLIT-CAJA-15',
          },
        ],
      });

    expect(splitRes.status).toBe(201);
    const payment = splitRes.body.data.payment;
    const po = splitRes.body.data.paymentOrder;

    expect(payment.status).toBe('CONFIRMADO');
    expect(Number(payment.totalEquivalentInDebtCurrency)).toBe(100);
    expect(payment.lines).toHaveLength(3);

    expect(Number(payment.lines[0].equivalentDebtAmount)).toBe(40);
    expect(Number(payment.lines[1].equivalentDebtAmount)).toBe(45);
    expect(Number(payment.lines[1].exchangeRateValue)).toBe(80);
    expect(Number(payment.lines[2].equivalentDebtAmount)).toBe(15);

    expect(po.status).toBe('PAGADA');
    expect(Number(po.paidAmount)).toBe(100);
    expect(Number(po.remainingBalance)).toBe(0);

    // Verificar movimientos registrados en cada una de las 3 cuentas maestras
    const lineIds = payment.lines.map((l: { id: string }) => BigInt(l.id));
    const movements = await prisma.bankAccountMovement.findMany({
      where: { paymentLineId: { in: lineIds } },
    });
    expect(movements).toHaveLength(3);
    const usdMov = movements.find((m) => m.bankAccountId === usdDivisasAccountId);
    const vesMov = movements.find((m) => m.bankAccountId === vesBankAccountId);
    const cajaMov = movements.find((m) => m.bankAccountId === cajaChicaUsdAccountId);
    expect(Number(usdMov?.amount)).toBe(40);
    expect(Number(vesMov?.amount)).toBe(3600);
    expect(Number(cajaMov?.amount)).toBe(15);

    // Verificar cierre atómico de la Orden de Servicio
    const svcFinal = await prisma.directPayment.findUnique({
      where: { id: serviceOrderId },
    });
    expect(svcFinal?.status).toBe('PAGADA');
  });
});
