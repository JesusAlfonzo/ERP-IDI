import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { getAdminAuthToken, getAuthTokenForRoles } from './setup.js';

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
