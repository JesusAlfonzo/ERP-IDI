import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { getAdminAuthToken, getAuthTokenForRoles } from './setup.js';
import { prisma } from '../src/config/prisma.js';

describe('Actualización de Insumos y Factor de Conversión de Empaque', () => {
  let adminToken = '';
  let testProductId: bigint;
  let unitId1: number;
  let unitId2: number;

  beforeAll(async () => {
    adminToken = await getAdminAuthToken();

    // Obtener dos unidades del sistema (ej. Unidad y Caja)
    const units = await prisma.unit.findMany({ take: 2 });
    unitId1 = units[0].id;
    unitId2 = units[1].id;

    // Obtener un insumo existente o crear uno de prueba
    const category = await prisma.category.findFirst();
    const product = await prisma.product.create({
      data: {
        name: 'PRODUCTO TEST CONVERSION',
        sku: `TEST-CONV-${Date.now()}`,
        categoryId: category!.id,
        baseUnitId: unitId1,
        conversionFactor: 1.0,
      },
    });
    testProductId = product.id;
  });

  afterAll(async () => {
    if (testProductId) {
      await prisma.product.deleteMany({ where: { id: testProductId } });
    }
  });

  it('Debe actualizar baseUnit, purchaseUnit y conversionFactor exitosamente', async () => {
    const res = await request(app)
      .put(`/api/products/${testProductId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        baseUnitId: unitId1,
        purchaseUnitId: unitId2,
        conversionFactor: 50,
        minStockAlert: 10,
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('SUCCESS');
    expect(Number(res.body.data.conversionFactor)).toBe(50);
    expect(Number(res.body.data.purchaseUnitId)).toBe(unitId2);
    expect(Number(res.body.data.baseUnitId)).toBe(unitId1);
  });

  it('Debe poder consultarse el producto con las nuevas unidades', async () => {
    const res = await request(app)
      .get(`/api/products/${testProductId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Number(res.body.data.conversionFactor)).toBe(50);
    expect(res.body.data.purchaseUnit).toBeDefined();
    expect(res.body.data.purchaseUnit.id).toBe(unitId2);
  });

  it('Debe deshabilitar el producto, excluirlo de alertas/listados activos y bloquear nuevas operaciones', async () => {
    // 1. Verificar que antes de deshabilitar aparece en alertas de bajo stock (stock 0 <= minStockAlert 10)
    const alertsBefore = await request(app)
      .get('/api/inventory/alerts')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(alertsBefore.status).toBe(200);
    const inLowStockBefore = alertsBefore.body.data.lowStockProducts.some(
      (p: any) => String(p.productId) === String(testProductId)
    );
    expect(inLowStockBefore).toBe(true);

    // 2. Deshabilitar producto vía PATCH /api/products/:id/status
    const disableRes = await request(app)
      .patch(`/api/products/${testProductId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });
    expect(disableRes.status).toBe(200);
    expect(disableRes.body.status).toBe('SUCCESS');
    expect(disableRes.body.data.isActive).toBe(false);

    // 3. Debe desaparecer de /api/products y /api/inventory/catalog por defecto
    const [activeProductsRes, activeCatalogRes] = await Promise.all([
      request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${adminToken}`),
      request(app)
        .get('/api/inventory/catalog')
        .set('Authorization', `Bearer ${adminToken}`),
    ]);
    expect(activeProductsRes.status).toBe(200);
    expect(activeCatalogRes.status).toBe(200);
    expect(
      activeProductsRes.body.data.some(
        (p: any) => String(p.id) === String(testProductId)
      )
    ).toBe(false);
    expect(
      activeCatalogRes.body.data.some(
        (p: any) => String(p.id) === String(testProductId)
      )
    ).toBe(false);

    // 4. Debe aparecer cuando se consulta con includeInactive=true
    const [allProductsRes, allCatalogRes] = await Promise.all([
      request(app)
        .get('/api/products?includeInactive=true')
        .set('Authorization', `Bearer ${adminToken}`),
      request(app)
        .get('/api/inventory/catalog?includeInactive=true')
        .set('Authorization', `Bearer ${adminToken}`),
    ]);
    expect(allProductsRes.status).toBe(200);
    expect(allCatalogRes.status).toBe(200);
    const foundInAll = allCatalogRes.body.data.find(
      (p: any) => String(p.id) === String(testProductId)
    );
    expect(foundInAll).toBeDefined();
    expect(foundInAll.isActive).toBe(false);

    // 5. Debe desaparecer de alertas de bajo stock
    const alertsAfter = await request(app)
      .get('/api/inventory/alerts')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(alertsAfter.status).toBe(200);
    const inLowStockAfter = alertsAfter.body.data.lowStockProducts.some(
      (p: any) => String(p.productId) === String(testProductId)
    );
    expect(inLowStockAfter).toBe(false);

    // 6. Debe bloquearse en nuevas solicitudes internas y preórdenes de compra
    const department = await prisma.department.findFirst({
      where: { isActive: true },
    });
    const reqRes = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        departmentId: department?.id,
        justification: 'Prueba de producto deshabilitado',
        items: [{ productId: Number(testProductId), quantityRequested: 2 }],
      });
    expect(reqRes.status).toBeGreaterThanOrEqual(400);
    expect(reqRes.body.message).toMatch(/deshabilitado/i);

    const preOrderRes = await request(app)
      .post('/api/purchase-requisitions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        departmentId: department?.id,
        justification: 'Preorden con producto deshabilitado',
        items: [
          {
            productId: Number(testProductId),
            unitId: unitId1,
            quantityRequested: 5,
          },
        ],
      });
    expect(preOrderRes.status).toBeGreaterThanOrEqual(400);
    expect(preOrderRes.body.message).toMatch(/deshabilitado/i);

    const supplier = await prisma.supplier.findFirst({
      where: { isActive: true },
    });
    if (supplier) {
      const orderRes = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          supplierId: supplier.id,
          currency: 'USD',
          items: [
            {
              productId: Number(testProductId),
              unitId: unitId1,
              quantityOrdered: 3,
              unitPrice: 10,
            },
          ],
        });
      expect(orderRes.status).toBeGreaterThanOrEqual(400);
      expect(orderRes.body.message).toMatch(/deshabilitado/i);
    }

    // 7. Verificar restricción de roles (403 para SOLICITANTE)
    const requesterToken = getAuthTokenForRoles(['SOLICITANTE']);
    const forbiddenRes = await request(app)
      .patch(`/api/products/${testProductId}/status`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({ isActive: true });
    expect(forbiddenRes.status).toBe(403);

    // 8. Reactivar el producto y verificar que vuelve a estar activo
    const enableRes = await request(app)
      .patch(`/api/products/${testProductId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: true });
    expect(enableRes.status).toBe(200);
    expect(enableRes.body.data.isActive).toBe(true);

    const alertsRestored = await request(app)
      .get('/api/inventory/alerts')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(
      alertsRestored.body.data.lowStockProducts.some(
        (p: any) => String(p.productId) === String(testProductId)
      )
    ).toBe(true);
  });
});
