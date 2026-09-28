import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { getAdminAuthToken, getAuthTokenForRoles } from './setup.js';

describe('Integración FASE 4: Maestro de Cuentas Bancarias y Motor de Pagos Multi-Método', () => {
  let adminToken: string;
  let comprasToken: string;
  let solicitanteToken: string;
  let testOrder: any;
  let testBankAccount: any;

  beforeAll(async () => {
    adminToken = getAdminAuthToken();
    comprasToken = getAuthTokenForRoles(['COMPRAS']);
    solicitanteToken = getAuthTokenForRoles(['SOLICITANTE']);

    // Asegurar usuario admin en la base de datos
    await prisma.user.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        username: 'admin',
        email: 'admin@idi.ucv.ve',
        fullName: 'Administrador General',
        passwordHash: 'fakehash',
        department: 'Sistemas',
      },
    });

    // Asegurar moneda USD y VES
    await prisma.currency.upsert({
      where: { code: 'USD' },
      update: {},
      create: { code: 'USD', name: 'Dólar', symbol: '$', isDefault: true },
    });
    const ves = await prisma.currency.upsert({
      where: { code: 'VES' },
      update: {},
      create: { code: 'VES', name: 'Bolívar', symbol: 'Bs.', isDefault: false },
    });

    // Asegurar tasa de cambio para VES
    await prisma.currencyExchange.create({
      data: {
        currencyId: ves.id,
        rate: 80.0,
        effectiveDate: new Date(),
        createdById: 1,
      },
    });

    // Crear una orden de prueba para pagos
    testOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-TEST-F4-${Date.now()}`,
        currency: 'USD',
        currencyId: 1,
        exchangeRate: 80.0,
        subtotal: 100.0,
        taxTotal: 16.0,
        total: 116.0,
        totalAmountUsd: 116.0,
        totalAmountBs: 9280.0,
        paymentStatus: 'PENDIENTE',
        createdById: 1,
      },
    });
  });

  describe('1. CRUD de Cuentas Bancarias Institucionales (/api/financial/bank-accounts)', () => {
    it('Debe rechazar la creación sin autenticación (401)', async () => {
      const res = await request(app)
        .post('/api/financial/bank-accounts')
        .send({
          bankName: 'Banesco',
          type: 'CORRIENTE',
          currency: 'VED',
          holderName: 'IDI',
          holderId: 'J-12345678-0',
        });
      expect(res.status).toBe(401);
    });

    it('Debe rechazar la creación a usuarios sin rol ADMINISTRADOR (403)', async () => {
      const res = await request(app)
        .post('/api/financial/bank-accounts')
        .set('Authorization', `Bearer ${comprasToken}`)
        .send({
          bankName: 'Banesco',
          type: 'CORRIENTE',
          currency: 'VED',
          holderName: 'IDI',
          holderId: 'J-12345678-0',
        });
      expect(res.status).toBe(403);
    });

    it('Debe permitir a ADMINISTRADOR crear una cuenta bancaria institucional', async () => {
      const res = await request(app)
        .post('/api/financial/bank-accounts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          bankName: 'Banco Provincial Institucional',
          accountNumber: '0108-0001-00-1122334455',
          type: 'CORRIENTE',
          currency: 'VED',
          holderName: 'INSTITUTO DE INMUNOLOGÍA CLÍNICA IDI C.A.',
          holderId: 'J-30589123-4',
          isActive: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('SUCCESS');
      expect(res.body.data.bankName).toBe('Banco Provincial Institucional');
      testBankAccount = res.body.data;
    });

    it('Debe listar las cuentas bancarias para ADMINISTRADOR y COMPRAS', async () => {
      const res = await request(app)
        .get('/api/financial/bank-accounts')
        .set('Authorization', `Bearer ${comprasToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('Debe permitir a ADMINISTRADOR actualizar una cuenta bancaria', async () => {
      const res = await request(app)
        .put(`/api/financial/bank-accounts/${testBankAccount.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          type: 'CUSTODIA',
          bankName: 'Banco Provincial - Cuenta Custodia',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.type).toBe('CUSTODIA');
      expect(res.body.data.bankName).toBe('Banco Provincial - Cuenta Custodia');
    });
  });

  describe('2. Motor de Pagos Multi-Método en Órdenes de Compra (/api/orders/:orderId/payments)', () => {
    it('Debe registrar un abono parcial en VED calculando amortizedAmountUsd', async () => {
      // Orden total: $116 USD.
      // Pagamos 4000 VED a tasa 80 = $50 USD amortizados.
      const res = await request(app)
        .post(`/api/orders/${testOrder.id}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          method: 'TRANSFERENCIA',
          sourceAccountId: testBankAccount.id,
          destinationAccount: '0134-9999-00-0000000000',
          amountPaid: 4000,
          transactionCurrency: 'VED',
          exchangeRate: 80.0,
          referenceNumber: 'REF-VED-001',
          paymentDate: new Date().toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('SUCCESS');
      expect(res.body.data.payment.amountPaid).toBe('4000');
      expect(Number(res.body.data.payment.amortizedAmountUsd)).toBe(50.0);
      expect(res.body.data.paymentStatus).toBe('PAGADO_PARCIAL');
      expect(res.body.data.remainingDebtUsd).toBe(66.0);
    });

    it('Debe rechazar un pago cuyo monto amortizado exceda la deuda restante', async () => {
      // Deuda restante: $66 USD.
      // Intentamos pagar $100 USD
      const res = await request(app)
        .post(`/api/orders/${testOrder.id}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          method: 'ZELLE',
          amountPaid: 100,
          transactionCurrency: 'USD',
          referenceNumber: 'ZELLE-OVERPAY',
          paymentDate: new Date().toISOString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('supera la deuda restante');
    });

    it('Debe liquidar la orden completamente con pago en USD y actualizar a PAGADO', async () => {
      // Deuda restante: $66 USD. Pagamos exactamente $66 USD
      const res = await request(app)
        .post(`/api/orders/${testOrder.id}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          method: 'EFECTIVO',
          amountPaid: 66.0,
          transactionCurrency: 'USD',
          referenceNumber: 'CASH-USD-001',
          paymentDate: new Date().toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.data.paymentStatus).toBe('PAGADO');
      expect(res.body.data.remainingDebtUsd).toBe(0);

      // Verificar estado en la orden
      const updatedOrder = await prisma.order.findUnique({ where: { id: testOrder.id } });
      expect(updatedOrder?.paymentStatus).toBe('PAGADO');
    });

    it('Debe registrar y persistir las firmas de autorización (reviewedBy, authorizedBy, approvedBy) en el pago', async () => {
      // Crear otra orden para probar firmas
      const orderWithSignatures = await prisma.order.create({
        data: {
          orderNumber: `ORD-SIG-${Date.now()}`,
          currency: 'USD',
          currencyId: 1,
          exchangeRate: 80.0,
          subtotal: 50.0,
          taxTotal: 0.0,
          total: 50.0,
          totalAmountUsd: 50.0,
          totalAmountBs: 4000.0,
          createdById: 1,
          status: 'ENVIADA',
          paymentStatus: 'PENDIENTE',
        },
      });

      const res = await request(app)
        .post(`/api/orders/${orderWithSignatures.id}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          method: 'TRANSFERENCIA',
          sourceAccountId: testBankAccount.id,
          amountPaid: 50.0,
          transactionCurrency: 'USD',
          referenceNumber: 'REF-SIG-001',
          reviewedBy: 'Lic. Ana Martínez (Contraloría)',
          authorizedBy: 'Dr. Roberto Mendoza (Dirección)',
          approvedBy: 'Dra. Carmen Silva (Decanato)',
          paymentDate: new Date().toISOString(),
        });

      expect(res.status).toBe(201);
      const paymentInDb = await prisma.orderPayment.findUnique({
        where: { id: BigInt(res.body.data.payment.id) },
      });
      expect(paymentInDb?.reviewedBy).toBe('Lic. Ana Martínez (Contraloría)');
      expect(paymentInDb?.authorizedBy).toBe('Dr. Roberto Mendoza (Dirección)');
      expect(paymentInDb?.approvedBy).toBe('Dra. Carmen Silva (Decanato)');
    });
  });

  describe('3. Módulo de Pagos Directos (Servicios / Otros Egresos sin Orden)', () => {
    let createdDirectPaymentId: string;

    it('Debe rechazar la creación de un pago directo sin concepto o beneficiario (400)', async () => {
      const res = await request(app)
        .post('/api/financial/direct-payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          concept: '',
          beneficiary: '',
          amountPaid: 150,
          transactionCurrency: 'USD',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('concepto');
    });

    it('Debe crear un pago directo en Bolívares calculando equivalentAmountUsd y guardando firmas', async () => {
      // 1600 Bs a tasa 80 = 20 USD
      const res = await request(app)
        .post('/api/financial/direct-payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          concept: 'Mantenimiento Preventivo de Aire Acondicionado en Lab Central',
          beneficiary: 'Refrigeración Técnica R.L. (RIF J-40112233-4)',
          method: 'TRANSFERENCIA',
          sourceAccountId: testBankAccount.id,
          destinationAccount: '0102-0001-00-1234567890',
          referenceNumber: 'DIR-REF-7788',
          amountPaid: 1600,
          transactionCurrency: 'VED',
          exchangeRate: 80.0,
          reviewedBy: 'Ing. Pedro Páez (Mantenimiento)',
          authorizedBy: 'Lic. Sofía Ramos (Administración)',
          approvedBy: 'Prof. Carlos Delgado (Dirección)',
          notes: 'Servicio ejecutado a satisfacción en cavas de reactivos',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.concept).toContain('Mantenimiento Preventivo');
      expect(res.body.data.beneficiary).toContain('Refrigeración Técnica');
      expect(Number(res.body.data.equivalentAmountUsd)).toBe(20.0);
      expect(res.body.data.reviewedBy).toBe('Ing. Pedro Páez (Mantenimiento)');
      expect(res.body.data.authorizedBy).toBe('Lic. Sofía Ramos (Administración)');
      expect(res.body.data.approvedBy).toBe('Prof. Carlos Delgado (Dirección)');

      createdDirectPaymentId = res.body.data.id;
    });

    it('Debe listar los pagos directos registrados', async () => {
      const res = await request(app)
        .get('/api/financial/direct-payments')
        .set('Authorization', `Bearer ${comprasToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      const found = res.body.data.find((p: any) => String(p.id) === String(createdDirectPaymentId));
      expect(found).toBeDefined();
      expect(found.sourceAccount).toBeDefined();
      expect(found.sourceAccount.id).toBe(testBankAccount.id);
    });

    it('Debe eliminar un pago directo existente como ADMINISTRADOR', async () => {
      const res = await request(app)
        .delete(`/api/financial/direct-payments/${createdDirectPaymentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      // Verificar que ya no existe
      const verify = await request(app)
        .get(`/api/financial/direct-payments/${createdDirectPaymentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(verify.status).toBe(404);
    });

    it('Debe prohibir con 403 la eliminación de un pago directo a un usuario con rol ADMINISTRACION', async () => {
      const adminisToken = getAuthTokenForRoles(['ADMINISTRACION']);
      const res = await request(app)
        .delete(`/api/financial/direct-payments/999`)
        .set('Authorization', `Bearer ${adminisToken}`);

      expect(res.status).toBe(403);
    });

    it('Debe asentar un movimiento en el Kardex General (StockMovement) con productId nulo al registrar egreso directo', async () => {
      const kardexMovement = await prisma.stockMovement.findFirst({
        where: { type: 'EGRESO_DIRECTO' },
        orderBy: { id: 'desc' },
      });

      expect(kardexMovement).toBeDefined();
      expect(kardexMovement?.productId).toBeNull();
      expect(kardexMovement?.notes).toContain('Egreso Directo');
    });

    it('Debe asentar un movimiento en el Kardex General (StockMovement) con productId nulo al registrar pago de orden', async () => {
      const kardexPayment = await prisma.stockMovement.findFirst({
        where: { type: 'PAGO_ORDEN' },
        orderBy: { id: 'desc' },
      });

      expect(kardexPayment).toBeDefined();
      expect(kardexPayment?.productId).toBeNull();
      expect(kardexPayment?.notes).toContain('Abono a Proveedor');
    });
  });
});
