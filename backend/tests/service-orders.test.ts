import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'jwt_default_secret_key';

function signToken(userId: number, roles: string[]) {
  return jwt.sign(
    {
      id: userId,
      username: 'service_order_tester',
      email: 'service_order_tester@idi.ucv.ve',
      department: 'Administración',
      roles,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('Integración: Flujo Completo de Órdenes de Servicio (4 Etapas)', () => {
  let testUserId: number;
  let adminToken: string;
  let comprasToken: string;
  let coordinadorToken: string;
  let adminisToken: string;
  let testDepartmentId: number;
  let testBankAccountId: number;
  let serviceOrderId: string;

  beforeAll(async () => {
    const existingUser = await prisma.user.findFirst();
    if (existingUser) {
      testUserId = existingUser.id;
    } else {
      const created = await prisma.user.create({
        data: {
          username: 'service_order_tester',
          email: 'service_order_tester@idi.ucv.ve',
          fullName: 'Tester Órdenes de Servicio',
          passwordHash: 'fakehash',
          department: 'Administración',
        },
      });
      testUserId = created.id;
    }

    adminToken = signToken(testUserId, ['ADMINISTRADOR']);
    comprasToken = signToken(testUserId, ['COMPRAS']);
    coordinadorToken = signToken(testUserId, ['COORDINADOR']);
    adminisToken = signToken(testUserId, ['ADMINISTRACION']);

    const dept = await prisma.department.upsert({
      where: { code: 'OS-TEST-DEPT' },
      update: {},
      create: {
        code: 'OS-TEST-DEPT',
        name: 'Departamento Pruebas Servicios',
      },
    });
    testDepartmentId = dept.id;

    const bank = await prisma.bankAccount.create({
      data: {
        bankName: 'Banesco Servicios Test',
        accountNumber: `0134000011223344${String(Date.now()).slice(-4)}`,
        type: 'CORRIENTE',
        currency: 'VED',
        holderName: 'IDI',
        holderId: 'J-30710739-1',
        isActive: true,
      },
    });
    testBankAccountId = bank.id;
  });

  it('Etapa 1: Debe crear una Orden de Servicio en estado BORRADOR con correlativo OS-YYYY-XXXX', async () => {
    const res = await request(app)
      .post('/api/financial/direct-payments')
      .set('Authorization', `Bearer ${comprasToken}`)
      .send({
        concept: 'Mantenimiento preventivo de centrífugas refrigeradas',
        beneficiary: 'Servicios Biomédicos IDI C.A. (J-40123456-7)',
        departmentId: testDepartmentId,
        amountPaid: 250,
        transactionCurrency: 'USD',
        estimatedDate: new Date().toISOString(),
        supportUrl: 'https://example.com/cotizacion-001.pdf',
        notes: 'Requiere calibración certificada',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('BORRADOR');
    expect(res.body.data.serviceOrderNumber).toMatch(/^OS-\d{4}-\d{4}$/);
    expect(res.body.data.departmentId).toBe(testDepartmentId);
    serviceOrderId = String(res.body.data.id);
  });

  it('Debe rechazar aprobar o generar OP cuando aún está en BORRADOR', async () => {
    const approveRes = await request(app)
      .post(`/api/financial/direct-payments/${serviceOrderId}/approve`)
      .set('Authorization', `Bearer ${coordinadorToken}`)
      .send({});
    expect(approveRes.status).toBe(400);

    const opRes = await request(app)
      .post(`/api/financial/direct-payments/${serviceOrderId}/payment-order`)
      .set('Authorization', `Bearer ${adminisToken}`)
      .send({});
    expect(opRes.status).toBe(400);
  });

  it('Etapa 1 -> 2: Debe enviar la Orden de Servicio a aprobación (BORRADOR -> EN_APROBACION)', async () => {
    const res = await request(app)
      .post(`/api/financial/direct-payments/${serviceOrderId}/submit`)
      .set('Authorization', `Bearer ${comprasToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('EN_APROBACION');
  });

  it('RBAC: Debe impedir que rol COMPRAS apruebe o rechace (403)', async () => {
    const res = await request(app)
      .post(`/api/financial/direct-payments/${serviceOrderId}/approve`)
      .set('Authorization', `Bearer ${comprasToken}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it('Etapa 2 (Rechazo): Debe exigir motivo obligatorio y transicionar a RECHAZADA', async () => {
    const invalidRes = await request(app)
      .post(`/api/financial/direct-payments/${serviceOrderId}/reject`)
      .set('Authorization', `Bearer ${coordinadorToken}`)
      .send({ reason: 'No' });
    expect(invalidRes.status).toBe(400);

    const validRes = await request(app)
      .post(`/api/financial/direct-payments/${serviceOrderId}/reject`)
      .set('Authorization', `Bearer ${coordinadorToken}`)
      .send({ reason: 'Falta adjuntar segunda cotización comparativa.' });

    expect(validRes.status).toBe(200);
    expect(validRes.body.data.status).toBe('RECHAZADA');
    expect(validRes.body.data.rejectionReason).toContain('segunda cotización');
    expect(validRes.body.data.rejectedByUserId).toBe(testUserId);
    expect(validRes.body.data.rejectedAt).toBeTruthy();
  });

  it('Etapa 2 (Reenvío y Aprobación): Debe reenviar y aprobar con auditoría (RECHAZADA -> EN_APROBACION -> APROBADA)', async () => {
    const resubmit = await request(app)
      .post(`/api/financial/direct-payments/${serviceOrderId}/submit`)
      .set('Authorization', `Bearer ${comprasToken}`);
    expect(resubmit.status).toBe(200);
    expect(resubmit.body.data.status).toBe('EN_APROBACION');
    expect(resubmit.body.data.rejectionReason).toBeNull();

    const approve = await request(app)
      .post(`/api/financial/direct-payments/${serviceOrderId}/approve`)
      .set('Authorization', `Bearer ${coordinadorToken}`)
      .send({ notes: 'Aprobado tras revisión de presupuesto' });

    expect(approve.status).toBe(200);
    expect(approve.body.data.status).toBe('APROBADA');
    expect(approve.body.data.approvedByUserId).toBe(testUserId);
    expect(approve.body.data.approvedAt).toBeTruthy();
    expect(approve.body.data.approvalNotes).toContain('revisión de presupuesto');
  });

  it('RBAC: Debe impedir que rol COORDINADOR genere Orden de Pago (403)', async () => {
    const res = await request(app)
      .post(`/api/financial/direct-payments/${serviceOrderId}/payment-order`)
      .set('Authorization', `Bearer ${coordinadorToken}`)
      .send({});
    expect(res.status).toBe(403);
  });

  it('Etapa 3: Debe generar Orden de Pago (APROBADA -> ORDEN_PAGO) con correlativo OP-YYYY-XXXX', async () => {
    const res = await request(app)
      .post(`/api/financial/direct-payments/${serviceOrderId}/payment-order`)
      .set('Authorization', `Bearer ${adminisToken}`)
      .send({ notes: 'Autorizado desembolso vía transferencia Banesco' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ORDEN_PAGO');
    expect(res.body.data.paymentOrderNumber).toMatch(/^OP-\d{4}-\d{4}$/);
    expect(res.body.data.paymentOrderIssuedAt).toBeTruthy();
  });

  it('Etapa 4: Debe registrar pago efectivo (ORDEN_PAGO -> PAGADA) y asentar EGRESO_DIRECTO en Kardex', async () => {
    const payRes = await request(app)
      .post(`/api/financial/direct-payments/${serviceOrderId}/pay`)
      .set('Authorization', `Bearer ${adminisToken}`)
      .send({
        method: 'TRANSFERENCIA',
        sourceAccountId: testBankAccountId,
        referenceNumber: `REF-OS-${Date.now()}`,
        amountPaid: 20000,
        transactionCurrency: 'VED',
        exchangeRate: 80.0,
        paymentDate: new Date().toISOString(),
        receiptImageUrl: 'https://example.com/comprobante-pago.png',
      });

    expect(payRes.status).toBe(200);
    expect(payRes.body.data.status).toBe('PAGADA');
    expect(Number(payRes.body.data.equivalentAmountUsd)).toBe(250);
    expect(payRes.body.data.sourceAccount?.id).toBe(testBankAccountId);

    const kardex = await prisma.stockMovement.findFirst({
      where: {
        type: 'EGRESO_DIRECTO',
        notes: { contains: payRes.body.data.serviceOrderNumber },
      },
    });
    expect(kardex).toBeDefined();
    expect(kardex?.productId).toBeNull();
  });

  it('Debe impedir cancelar una orden ya PAGADA (400)', async () => {
    const res = await request(app)
      .post(`/api/financial/direct-payments/${serviceOrderId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Intento cancelar ya pagada' });
    expect(res.status).toBe(400);
  });
});
