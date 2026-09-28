import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { getAdminAuthToken, getAuthTokenForRoles } from './setup.js';
import { prisma } from '../src/config/prisma.js';

describe('Integración: CRUD de Proveedores con Protección Referencial y RBAC', () => {
  let adminToken: string;
  let comprasToken: string;
  let supplierWithOrdersId: number;
  let supplierWithoutOrdersId: number;

  beforeAll(async () => {
    adminToken = getAdminAuthToken();
    comprasToken = getAuthTokenForRoles(['COMPRAS']);

    // 1. Crear o buscar un proveedor para asociar con orden de prueba
    const supWithOrders = await prisma.supplier.upsert({
      where: { rifOrId: 'J-99999991-1' },
      update: {},
      create: {
        rifOrId: 'J-99999991-1',
        name: 'PROVEEDOR TEST CON ÓRDENES C.A.',
        phone: '0212-9999991',
        email: 'conordenes@test.com',
        address: 'Caracas, Venezuela',
        isActive: true,
      },
    });
    supplierWithOrdersId = supWithOrders.id;

    // Crear orden asociada para simular historial de compras
    const testOrderNumber = `OC-TEST-REF-${Date.now()}`;
    await prisma.order.create({
      data: {
        orderNumber: testOrderNumber,
        supplierId: supplierWithOrdersId,
        currencyId: 1,
        exchangeRate: 1.0,
        subtotal: 100,
        taxTotal: 16,
        total: 116,
        createdById: 1,
      },
    });

    // 2. Crear un proveedor sin órdenes para probar eliminación exitosa
    const supWithoutOrders = await prisma.supplier.upsert({
      where: { rifOrId: 'J-99999992-2' },
      update: {},
      create: {
        rifOrId: 'J-99999992-2',
        name: 'PROVEEDOR TEST SIN ÓRDENES C.A.',
        phone: '0212-9999992',
        email: 'sinordenes@test.com',
        address: 'Miranda, Venezuela',
        isActive: true,
      },
    });
    supplierWithoutOrdersId = supWithoutOrders.id;
  });

  afterAll(async () => {
    // Limpieza de datos de prueba
    await prisma.order.deleteMany({
      where: { supplierId: supplierWithOrdersId },
    });
    await prisma.supplier.deleteMany({
      where: {
        id: { in: [supplierWithOrdersId, supplierWithoutOrdersId] },
      },
    });
  });

  describe('GET /api/suppliers/:id (Show)', () => {
    it('Debe retornar 404 si el proveedor no existe', async () => {
      const res = await request(app)
        .get('/api/suppliers/99999999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.status).toBe('NOT_FOUND');
    });

    it('Debe retornar el detalle del proveedor incluyendo órdenes y conteo', async () => {
      const res = await request(app)
        .get(`/api/suppliers/${supplierWithOrdersId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('SUCCESS');
      expect(res.body.data.id).toBe(supplierWithOrdersId);
      expect(res.body.data.name).toBe('PROVEEDOR TEST CON ÓRDENES C.A.');
      expect(res.body.data._count.orders).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(res.body.data.orders)).toBe(true);
      expect(res.body.data.orders.length).toBeGreaterThanOrEqual(1);
    });

    it('Debe funcionar a través del alias /api/purchasing/providers/:id', async () => {
      const res = await request(app)
        .get(`/api/purchasing/providers/${supplierWithOrdersId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(supplierWithOrdersId);
    });
  });

  describe('PUT /api/suppliers/:id (Edit)', () => {
    it('Debe permitir actualizar información y estado del proveedor', async () => {
      const res = await request(app)
        .put(`/api/suppliers/${supplierWithoutOrdersId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'PROVEEDOR SIN ORDENES ACTUALIZADO S.A.',
          phone: '0414-1112233',
          address: 'Nueva Dirección Actualizada',
          isActive: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('SUCCESS');
      expect(res.body.data.name).toBe('PROVEEDOR SIN ORDENES ACTUALIZADO S.A.');
      expect(res.body.data.phone).toBe('0414-1112233');
      expect(res.body.data.address).toBe('Nueva Dirección Actualizada');
      expect(res.body.data.isActive).toBe(false);
    });

    it('Debe rechazar con 409 si se intenta cambiar el RIF a uno ya existente', async () => {
      const res = await request(app)
        .put(`/api/suppliers/${supplierWithoutOrdersId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          rifOrId: 'J-99999991-1', // RIF del otro proveedor
        });

      expect(res.status).toBe(409);
      expect(res.body.status).toBe('CONFLICT');
    });
  });

  describe('DELETE /api/suppliers/:id (Delete con Protección Referencial)', () => {
    it('Debe denegar la eliminación con 403 si el rol no es ADMINISTRADOR', async () => {
      const res = await request(app)
        .delete(`/api/suppliers/${supplierWithoutOrdersId}`)
        .set('Authorization', `Bearer ${comprasToken}`);

      expect(res.status).toBe(403);
    });

    it('Debe cancelar la eliminación con 409 Conflict si el proveedor tiene órdenes asociadas', async () => {
      const res = await request(app)
        .delete(`/api/suppliers/${supplierWithOrdersId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(409);
      expect(res.body.status).toBe('CONFLICT');
      expect(res.body.message).toBe(
        'No se puede eliminar el proveedor porque tiene órdenes de compra en el historial. Inactívelo en su lugar.'
      );

      // Verificar que el registro aún existe en la base de datos
      const stillExists = await prisma.supplier.findUnique({
        where: { id: supplierWithOrdersId },
      });
      expect(stillExists).not.toBeNull();
    });

    it('Debe eliminar físicamente el proveedor si tiene 0 órdenes asociadas', async () => {
      const res = await request(app)
        .delete(`/api/suppliers/${supplierWithoutOrdersId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('SUCCESS');
      expect(res.body.message).toContain('eliminado correctamente');

      // Verificar que fue eliminado de la base de datos
      const deletedCheck = await prisma.supplier.findUnique({
        where: { id: supplierWithoutOrdersId },
      });
      expect(deletedCheck).toBeNull();
    });
  });
});
