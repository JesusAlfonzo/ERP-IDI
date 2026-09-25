import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { getAdminAuthToken } from './setup.js';

describe('Integración: Preórdenes de Compra y Soporte Fiscal SENIAT', () => {
  let adminToken = '';
  let testSupplier: any;
  let testCurrency: any;
  let testBaseUnit: any;
  let testPackageUnit: any;
  let taxableProduct: any;
  let exemptProduct: any;
  let testLocation: any;

  beforeAll(async () => {
    adminToken = getAdminAuthToken();

    // 1. Unidades de Medida: Base (Unidad) y Empaque (Caja x50)
    testBaseUnit = await prisma.unit.upsert({
      where: { abbreviation: 'UND_TEST_PO' },
      update: {},
      create: {
        name: 'Unidad de Prueba PO',
        abbreviation: 'UND_TEST_PO',
      },
    });

    testPackageUnit = await prisma.unit.upsert({
      where: { abbreviation: 'CAJA50_TEST' },
      update: {},
      create: {
        name: 'Caja x50 Unidades',
        abbreviation: 'CAJA50_TEST',
      },
    });

    // 2. Moneda de prueba (USD)
    testCurrency = await prisma.currency.upsert({
      where: { code: 'USD_TEST' },
      update: {},
      create: {
        code: 'USD_TEST',
        name: 'Dólar de Prueba',
        symbol: '$',
        isDefault: true,
      },
    });

    // 3. Proveedor de prueba
    testSupplier = await prisma.supplier.upsert({
      where: { rifOrId: 'J-99887766-0' },
      update: {},
      create: {
        rifOrId: 'J-99887766-0',
        name: 'Distribuidora Médica SENIAT C.A.',
        contactName: 'Lic. Andrés Silva',
        phone: '0414-5555555',
        email: 'ventas@medicaseniat.com',
      },
    });

    // 4. Ubicación para recepción
    testLocation = await prisma.location.upsert({
      where: { id: 999 },
      update: {},
      create: {
        id: 999,
        name: 'Almacén Prueba Compras',
        type: 'ALMACEN_GENERAL',
      },
    });

    // 5. Categoría
    const cat = await prisma.category.upsert({
      where: { name: 'Insumos Clínicos Compra' },
      update: {},
      create: {
        code: 'CAT-COMPRAS-TEST',
        name: 'Insumos Clínicos Compra',
      },
    });

    // 6. Producto Gravable con empaque (Caja x50)
    taxableProduct = await prisma.product.upsert({
      where: { sku: 'SKU-GRAVABLE-50' },
      update: {},
      create: {
        name: 'Kit Reactivo Gravable (Caja x50)',
        sku: 'SKU-GRAVABLE-50',
        categoryId: cat.id,
        baseUnitId: testBaseUnit.id,
        purchaseUnitId: testPackageUnit.id,
        conversionFactor: 50.0,
        isTaxExempt: false,
        isReagent: false,
      },
    });

    // 7. Producto Exento de IVA
    exemptProduct = await prisma.product.upsert({
      where: { sku: 'SKU-EXENTO-MED' },
      update: {},
      create: {
        name: 'Medicamento Esencial Exento',
        sku: 'SKU-EXENTO-MED',
        categoryId: cat.id,
        baseUnitId: testBaseUnit.id,
        conversionFactor: 1.0,
        isTaxExempt: true,
        isReagent: false,
      },
    });
  });

  afterAll(async () => {
    // Limpieza de datos creados en la prueba
    await prisma.orderItem.deleteMany({
      where: {
        productId: { in: [taxableProduct.id, exemptProduct.id] },
      },
    });
    await prisma.order.deleteMany({
      where: { supplierId: testSupplier.id },
    });
    await prisma.purchaseRequisitionItem.deleteMany({
      where: {
        productId: { in: [taxableProduct.id, exemptProduct.id] },
      },
    });
    await prisma.purchaseRequisition.deleteMany({
      where: { departmentSection: 'Inmunogenética Test' },
    });
  });

  it('1. Debe crear una Preorden de Compra con correlativo PRE-YYYY-XXXX y estado BORRADOR', async () => {
    const res = await request(app)
      .post('/api/purchase-requisitions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        departmentSection: 'Inmunogenética Test',
        justification: 'Reabastecimiento trimestral de insumos de extracción',
        notes: 'Urgente para protocolo de secuenciación',
        items: [
          {
            productId: Number(taxableProduct.id),
            unitId: testPackageUnit.id,
            quantityRequested: 10, // 10 Cajas
            estimatedPrice: 100.0,
          },
          {
            productId: Number(exemptProduct.id),
            unitId: testBaseUnit.id,
            quantityRequested: 20, // 20 Unidades
            estimatedPrice: 15.0,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('SUCCESS');
    expect(res.body.data.requisitionNumber).toMatch(/^PRE-\d{4}-\d{4}$/);
    expect(res.body.data.status).toBe('BORRADOR');
    expect(res.body.data.items.length).toBe(2);
  });

  it('2. Debe permitir listar y consultar la preorden por ID', async () => {
    const listRes = await request(app)
      .get('/api/purchase-requisitions?search=Inmunogenética')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);

    const reqId = listRes.body.data[0].id;

    const detailRes = await request(app)
      .get(`/api/purchase-requisitions/${reqId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.data.id).toBe(reqId);
  });

  it('3. Debe permitir transicionar estado a EN_COTIZACION', async () => {
    const listRes = await request(app)
      .get('/api/purchase-requisitions?search=Inmunogenética')
      .set('Authorization', `Bearer ${adminToken}`);

    const reqId = listRes.body.data[0].id;

    const patchRes = await request(app)
      .patch(`/api/purchase-requisitions/${reqId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'EN_COTIZACION' });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.status).toBe('EN_COTIZACION');
  });

  it('4. Debe adjudicar y convertir la preorden en orden de compra con cálculo fiscal SENIAT exacto (IVA 16% y exentos)', async () => {
    const listRes = await request(app)
      .get('/api/purchase-requisitions?search=Inmunogenética')
      .set('Authorization', `Bearer ${adminToken}`);

    const reqId = listRes.body.data[0].id;
    const requisition = listRes.body.data[0];

    const taxableItem = requisition.items.find(
      (it: any) => String(it.productId) === String(taxableProduct.id)
    );
    const exemptItem = requisition.items.find(
      (it: any) => String(it.productId) === String(exemptProduct.id)
    );

    // Tasa cambiaria oficial BCV de la fecha de prueba: 75.00 Bs/USD
    const exchangeRate = 75.0;

    // Ítem 1 (Gravable): 10 Cajas a $100 c/u = $1,000.00 Gravable
    // Ítem 2 (Exento): 20 Unidades a $15 c/u = $300.00 Exento
    // Subtotal Gravable = $1,000.00
    // Subtotal Exento = $300.00
    // IVA 16% = $160.00
    // Total USD = $1,460.00
    // Total Bs = $1,460.00 * 75.00 = 109,500.00 Bs.

    const convertRes = await request(app)
      .post(`/api/purchase-requisitions/${reqId}/convert-to-order`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplierId: testSupplier.id,
        currencyId: testCurrency.id,
        exchangeRate,
        notes: 'Adjudicado con Distribuidora Médica SENIAT',
        items: [
          {
            itemId: taxableItem.id,
            productId: Number(taxableProduct.id),
            unitId: testPackageUnit.id,
            quantityOrdered: 10,
            unitPrice: 100.0,
            isExempt: false,
          },
          {
            itemId: exemptItem.id,
            productId: Number(exemptProduct.id),
            unitId: testBaseUnit.id,
            quantityOrdered: 20,
            unitPrice: 15.0,
            isExempt: true,
          },
        ],
      });

    expect(convertRes.status).toBe(201);
    const order = convertRes.body.data;
    expect(order.orderNumber).toMatch(/^ORD-\d{4}-\d{4}$/);
    expect(Number(order.taxableAmountUsd)).toBe(1000.0);
    expect(Number(order.exemptAmountUsd)).toBe(300.0);
    expect(Number(order.taxAmountUsd)).toBe(160.0);
    expect(Number(order.totalAmountUsd)).toBe(1460.0);
    expect(Number(order.totalAmountBs)).toBe(109500.0);
    expect(Number(order.exchangeRate)).toBe(75.0);
    expect(String(order.requisitionId)).toBe(String(reqId));

    // Verificar que la preorden cambió a ADJUDICADA
    const verifyReq = await prisma.purchaseRequisition.findUnique({
      where: { id: BigInt(reqId) },
    });
    expect(verifyReq?.status).toBe('ADJUDICADA');
  });

  it('5. Debe aplicar el factor de conversión al recibir la orden (10 cajas x50 = 500 unidades en lote de inventario)', async () => {
    // Buscar la orden creada
    const order = await prisma.order.findFirst({
      where: { supplierId: testSupplier.id },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(order).toBeDefined();

    const taxableOrderItem = order!.items.find(
      (it) => it.productId === taxableProduct.id
    );
    expect(taxableOrderItem).toBeDefined();
    // Multiplier debe ser 50.0
    expect(Number(taxableOrderItem!.multiplier)).toBe(50.0);

    // Recibir 2 cajas del producto gravable
    const receiveRes = await request(app)
      .post(`/api/orders/${order!.id}/receive`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        notes: 'Recepción parcial de 2 cajas',
        items: [
          {
            orderItemId: Number(taxableOrderItem!.id),
            quantityReceived: 2, // 2 Cajas
            lotNumber: 'LOTE-BOX-TEST-1',
            expirationDate: new Date('2028-12-31').toISOString(),
            locationId: testLocation.id,
          },
        ],
      });

    expect(receiveRes.status).toBe(200);

    // Verificar que el lote físico tiene 2 * 50 = 100 unidades en stockBatch
    const batch = await prisma.stockBatch.findFirst({
      where: {
        productId: taxableProduct.id,
        lotNumber: 'LOTE-BOX-TEST-1',
      },
    });
    expect(batch).toBeDefined();
    expect(Number(batch!.currentQuantity)).toBe(100);
  });
});
