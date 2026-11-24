import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'jwt_default_secret_key';

function signToken(userId: number, roles: string[]) {
  return jwt.sign(
    {
      id: userId,
      username: 'supplier_types_tester',
      email: 'supplier_types_tester@idi.ucv.ve',
      department: 'Administración',
      roles,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('Integración: Validación RIF/Teléfono, Tipo de Proveedor y Registro Automático en Órdenes de Servicio', () => {
  let testUserId: number;
  let adminToken: string;
  let adminisToken: string;
  let testDepartmentId: number;

  const createdSupplierIds: number[] = [];
  const createdDirectPaymentIds: bigint[] = [];

  const uniqueSuffix = String(Date.now()).slice(-6);
  const ventasRifRaw = `j50${uniqueSuffix}1`; // -> J-50XXXXXX-1
  const ventasRifFormatted = `J-50${uniqueSuffix}-1`;
  const serviceRifRaw = `v24${uniqueSuffix}`; // -> V-24XXXXXX (8 dígitos)
  const serviceRifFormatted = `V-24${uniqueSuffix}`;
  const autoServiceRifRaw = `j41${uniqueSuffix}9`; // -> J-41XXXXXX-9
  const autoServiceRifFormatted = `J-41${uniqueSuffix}-9`;

  beforeAll(async () => {
    const existingUser = await prisma.user.findFirst();
    if (!existingUser) {
      throw new Error('Se requiere al menos un usuario en BD para pruebas');
    }
    testUserId = existingUser.id;
    adminToken = signToken(testUserId, ['ADMINISTRADOR']);
    adminisToken = signToken(testUserId, ['ADMINISTRACION']);

    const dept = await prisma.department.findFirst({
      where: { isActive: true },
    });
    if (!dept) {
      throw new Error('Se requiere al menos un departamento activo en BD');
    }
    testDepartmentId = dept.id;
  });

  afterAll(async () => {
    if (createdDirectPaymentIds.length > 0) {
      await prisma.directPayment.deleteMany({
        where: { id: { in: createdDirectPaymentIds } },
      });
    }
    if (createdSupplierIds.length > 0) {
      await prisma.supplier.deleteMany({
        where: { id: { in: createdSupplierIds } },
      });
    }
  });

  it('Debe rechazar RIF y teléfonos con formato inválido (400)', async () => {
    const badRifRes = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        rifOrId: 'Z-12345',
        name: 'Proveedor RIF Malo',
      });
    expect(badRifRes.status).toBe(400);

    const badPhoneRes = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        rifOrId: 'J-12345678-9',
        name: 'Proveedor Telefono Malo',
        phone: '9999-123',
      });
    expect(badPhoneRes.status).toBe(400);
  });

  it('Debe normalizar automáticamente RIF/Cédula y Teléfono, y clasificar por SupplierType', async () => {
    // 1. Crear proveedor de VENTAS
    const ventasRes = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        rifOrId: ventasRifRaw,
        name: 'Distribuidora Insumos Test C.A.',
        supplierType: 'VENTAS',
        phone: '+58 414 5551234',
      });
    expect(ventasRes.status).toBe(201);
    expect(ventasRes.body.data.rifOrId).toBe(ventasRifFormatted);
    expect(ventasRes.body.data.phone).toBe('0414-5551234');
    expect(ventasRes.body.data.supplierType).toBe('VENTAS');
    createdSupplierIds.push(ventasRes.body.data.id);

    // 2. Crear proveedor de SERVICIOS usando rol ADMINISTRACION
    const serviceRes = await request(app)
      .post('/api/suppliers')
      .set('Authorization', `Bearer ${adminisToken}`)
      .send({
        rifOrId: serviceRifRaw,
        name: 'Técnico Biomédico Test',
        supplierType: 'SERVICIOS',
        phone: '0212-555-6789',
      });
    expect(serviceRes.status).toBe(201);
    expect(serviceRes.body.data.rifOrId).toBe(serviceRifFormatted);
    expect(serviceRes.body.data.phone).toBe('0212-5556789');
    expect(serviceRes.body.data.supplierType).toBe('SERVICIOS');
    createdSupplierIds.push(serviceRes.body.data.id);

    // 3. Validar filtrado separado por type=VENTAS y type=SERVICIOS
    const [onlyVentasRes, onlyServicesRes] = await Promise.all([
      request(app)
        .get('/api/suppliers?type=VENTAS')
        .set('Authorization', `Bearer ${adminisToken}`),
      request(app)
        .get('/api/suppliers?type=SERVICIOS')
        .set('Authorization', `Bearer ${adminisToken}`),
    ]);

    expect(onlyVentasRes.status).toBe(200);
    expect(onlyServicesRes.status).toBe(200);

    const ventasIds = onlyVentasRes.body.data.map((s: any) => s.id);
    const serviceIds = onlyServicesRes.body.data.map((s: any) => s.id);

    expect(ventasIds).toContain(ventasRes.body.data.id);
    expect(ventasIds).not.toContain(serviceRes.body.data.id);

    expect(serviceIds).toContain(serviceRes.body.data.id);
    expect(serviceIds).not.toContain(ventasRes.body.data.id);
  });

  it('Debe registrar automáticamente un nuevo Proveedor de Servicio al crear una Orden de Servicio', async () => {
    const res = await request(app)
      .post('/api/financial/direct-payments')
      .set('Authorization', `Bearer ${adminisToken}`)
      .send({
        concept: 'Reparación de microscopio óptico',
        departmentId: testDepartmentId,
        amountPaid: 180,
        transactionCurrency: 'USD',
        newSupplier: {
          rifOrId: autoServiceRifRaw,
          name: 'Óptica y Mantenimiento Test S.R.L.',
          contactName: 'Ing. Carlos Ruiz',
          phone: '0412-987-6543',
          email: 'soporte@optica-test.ve',
          address: 'Caracas, Los Chaguaramos',
          supplierType: 'SERVICIOS',
        },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.supplierId).toBeTruthy();
    expect(res.body.data.supplier?.rifOrId).toBe(autoServiceRifFormatted);
    expect(res.body.data.supplier?.supplierType).toBe('SERVICIOS');
    expect(res.body.data.supplier?.phone).toBe('0412-9876543');

    createdDirectPaymentIds.push(BigInt(res.body.data.id));
    createdSupplierIds.push(res.body.data.supplierId);

    // Verificar que quedó guardado permanentemente en suppliers como SERVICIOS
    const dbSup = await prisma.supplier.findUnique({
      where: { rifOrId: autoServiceRifFormatted },
    });
    expect(dbSup).not.toBeNull();
    expect(dbSup?.supplierType).toBe('SERVICIOS');
    expect(dbSup?.address).toBe('Caracas, Los Chaguaramos');
  });

  it('Debe retornar 409 con existingSupplier si el RIF ya existe en VENTAS, y promover a AMBOS si promoteIfExists=true', async () => {
    // 1. Intento sin promoteIfExists -> 409 Conflict con datos del proveedor existente
    const conflictRes = await request(app)
      .post('/api/financial/direct-payments')
      .set('Authorization', `Bearer ${adminisToken}`)
      .send({
        concept: 'Mantenimiento de equipo vendido por proveedor de ventas',
        departmentId: testDepartmentId,
        amountPaid: 120,
        transactionCurrency: 'USD',
        newSupplier: {
          rifOrId: ventasRifFormatted,
          name: 'Distribuidora Insumos Test C.A.',
        },
      });

    expect(conflictRes.status).toBe(409);
    expect(conflictRes.body.status).toBe('CONFLICT');
    expect(conflictRes.body.existingSupplier).toBeDefined();
    expect(conflictRes.body.existingSupplier.rifOrId).toBe(ventasRifFormatted);

    // 2. Confirmando vinculación (promoteIfExists: true) -> promueve VENTAS -> AMBOS
    const promotedRes = await request(app)
      .post('/api/financial/direct-payments')
      .set('Authorization', `Bearer ${adminisToken}`)
      .send({
        concept: 'Mantenimiento de equipo vendido por proveedor de ventas',
        departmentId: testDepartmentId,
        amountPaid: 120,
        transactionCurrency: 'USD',
        newSupplier: {
          rifOrId: ventasRifFormatted,
          name: 'Distribuidora Insumos Test C.A.',
          promoteIfExists: true,
        },
      });

    expect(promotedRes.status).toBe(201);
    expect(promotedRes.body.data.supplier?.supplierType).toBe('AMBOS');
    createdDirectPaymentIds.push(BigInt(promotedRes.body.data.id));

    // Ahora debe aparecer tanto en type=VENTAS como en type=SERVICIOS
    const [ventasCheck, servCheck] = await Promise.all([
      request(app)
        .get('/api/suppliers?type=VENTAS')
        .set('Authorization', `Bearer ${adminisToken}`),
      request(app)
        .get('/api/suppliers?type=SERVICIOS')
        .set('Authorization', `Bearer ${adminisToken}`),
    ]);
    expect(
      ventasCheck.body.data.some((s: any) => s.rifOrId === ventasRifFormatted)
    ).toBe(true);
    expect(
      servCheck.body.data.some((s: any) => s.rifOrId === ventasRifFormatted)
    ).toBe(true);
  });
});
