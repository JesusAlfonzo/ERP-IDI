import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { getAdminAuthToken } from './setup.js';
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
});
