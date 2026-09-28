import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { getAdminAuthToken, getAuthTokenForRoles } from './setup.js';
import { prisma } from '../src/config/prisma.js';

describe('Integración: Ajustes de Inventario y Validación Zod', () => {
  let authToken = '';

  beforeAll(async () => {
    authToken = await getAdminAuthToken();
  });

  // --- Validación de Esquemas Zod ---
  it('Debe interceptar un payload inválido con HTTP 400 y formato Zod', async () => {
    const res = await request(app)
      .post('/api/inventory/adjustments')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        notes: 'Test Zod Fail',
        items: [
          {
            batchId: 1,
            action: 'ACCION_INEXISTENTE',
            quantity: -10,
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('Debe rechazar mermas directas si falta el motivo o la cantidad es negativa', async () => {
    const res = await request(app)
      .post('/api/inventory/wastes')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        wastes: [
          {
            batchId: 1,
            quantity: 0,
            // reason omitido
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('VALIDATION_ERROR');
  });

  // --- Paginación y Consulta de Kardex ---
  it('Debe devolver el Kardex con metadata de paginación estándar', async () => {
    const res = await request(app)
      .get('/api/inventory/movements?page=1&limit=2')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('SUCCESS');
    expect(res.body).toHaveProperty('meta');
    expect(res.body.meta).toHaveProperty('currentPage', 1);
    expect(res.body.meta).toHaveProperty('itemsPerPage', 2);
    expect(res.body.meta).toHaveProperty('totalPages');
    expect(res.body.meta).toHaveProperty('totalItems');
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('Debe rechazar consultas al Kardex sin token con 401', async () => {
    const res = await request(app).get('/api/inventory/movements');
    expect(res.status).toBe(401);
  });

  // --- Creación de Lote en Ajuste de Entrada / Donación ---
  describe('Entradas por ajuste / donación con creación de lote', () => {
    it('Debe registrar una entrada creando un nuevo lote con su origen y reflejarlo en el Kardex', async () => {
      // Obtener un producto y ubicación existentes en la base de datos de prueba
      const product = await prisma.product.findFirst();
      const location = await prisma.location.findFirst();
      expect(product).toBeDefined();
      expect(location).toBeDefined();

      const uniqueLotNumber = `TEST-DONA-${Date.now()}`;
      const quantityToAdd = 15;

      const res = await request(app)
        .post('/api/inventory/adjustments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          notes: 'Ingreso extraordinario por donación humanitaria',
          items: [
            {
              newBatch: {
                productId: Number(product!.id),
                lotNumber: uniqueLotNumber,
                locationId: location!.id,
                expirationDate: '2028-12-31',
                costPrice: 0,
                origin: 'Donación',
              },
              action: 'INCREMENTO',
              quantity: quantityToAdd,
              reason: 'Donación recibida de ONG',
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('SUCCESS');
      expect(res.body.data).toHaveProperty('movement');
      expect(res.body.data.details).toHaveLength(1);
      expect(res.body.data.details[0].newQuantity).toBe(quantityToAdd);

      // Verificar en la BD que el lote se creó con origin = 'Donación'
      const createdBatch = await prisma.stockBatch.findFirst({
        where: {
          productId: product!.id,
          lotNumber: uniqueLotNumber,
        },
      });
      expect(createdBatch).not.toBeNull();
      expect(createdBatch?.origin).toBe('Donación');
      expect(Number(createdBatch?.currentQuantity)).toBe(quantityToAdd);
      expect(createdBatch?.status).toBe('DISPONIBLE');
    });

    it('Debe rechazar la creación si el lote ya existe en esa ubicación para el producto', async () => {
      const product = await prisma.product.findFirst();
      const location = await prisma.location.findFirst();
      const duplicateLot = `DUP-LOT-${Date.now()}`;

      // Primer ingreso
      await request(app)
        .post('/api/inventory/adjustments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          notes: 'Primer ingreso',
          items: [
            {
              newBatch: {
                productId: Number(product!.id),
                lotNumber: duplicateLot,
                locationId: location!.id,
                origin: 'Ajuste',
              },
              action: 'INCREMENTO',
              quantity: 10,
            },
          ],
        });

      // Segundo intento con mismo lote y ubicación
      const duplicateRes = await request(app)
        .post('/api/inventory/adjustments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          notes: 'Segundo intento duplicado',
          items: [
            {
              newBatch: {
                productId: Number(product!.id),
                lotNumber: duplicateLot,
                locationId: location!.id,
                origin: 'Ajuste',
              },
              action: 'INCREMENTO',
              quantity: 5,
            },
          ],
        });

      expect(duplicateRes.status).toBe(400);
      expect(duplicateRes.body.message).toMatch(/ya existe para este producto/i);
    });

    it('Debe rechazar la merma si la cantidad solicitada excede el stock disponible del lote', async () => {
      // Crear un lote con stock bajo para probar exceso
      const product = await prisma.product.findFirst();
      const location = await prisma.location.findFirst();
      const testLot = await prisma.stockBatch.create({
        data: {
          productId: product!.id,
          locationId: location!.id,
          lotNumber: `MERMA-TEST-${Date.now()}`,
          currentQuantity: 3,
          costPrice: 5,
          status: 'DISPONIBLE',
        },
      });

      const res = await request(app)
        .post('/api/inventory/wastes')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          wastes: [
            {
              batchId: Number(testLot.id),
              quantity: 10, // supera los 3 disponibles
              reason: 'Frascos rotos por caída en anaquel',
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/excede el stock actual/i);
    });
  });

  // --- Blindaje RBAC (Defensa en Profundidad) ---
  describe('RBAC Estricto: Exclusividad Almacén y Administración (403 Forbidden)', () => {
    it('Debe rechazar con 403 Forbidden a usuarios SOLICITANTE en /adjustments', async () => {
      const solicitanteToken = getAuthTokenForRoles(['SOLICITANTE']);
      const res = await request(app)
        .post('/api/inventory/adjustments')
        .set('Authorization', `Bearer ${solicitanteToken}`)
        .send({
          notes: 'Intento de ajuste no autorizado',
          items: [{ batchId: 1, action: 'INCREMENTO', quantity: 5 }],
        });

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('FORBIDDEN');
    });

    it('Debe rechazar con 403 Forbidden a usuarios COMPRAS en /wastes', async () => {
      const comprasToken = getAuthTokenForRoles(['COMPRAS']);
      const res = await request(app)
        .post('/api/inventory/wastes')
        .set('Authorization', `Bearer ${comprasToken}`)
        .send({
          wastes: [{ batchId: 1, quantity: 2, reason: 'Frasco roto' }],
        });

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('FORBIDDEN');
    });

    it('Debe rechazar con 403 Forbidden a ANALISTA_LABORATORIO en /batches/:id/status', async () => {
      const labToken = getAuthTokenForRoles(['ANALISTA_LABORATORIO']);
      const res = await request(app)
        .patch('/api/inventory/batches/1/status')
        .set('Authorization', `Bearer ${labToken}`)
        .send({
          status: 'DISPONIBLE',
          reason: 'Aprobación analítica no autorizada',
        });

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('FORBIDDEN');
    });
  });
});
