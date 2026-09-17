import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { getAdminAuthToken } from './setup.js';

describe('Integración: Catálogos y Autenticación', () => {
  let authToken = '';

  beforeAll(() => {
    authToken = getAdminAuthToken();
  });

  it('Debe rechazar peticiones no autenticadas con 401', async () => {
    const res = await request(app).get('/api/catalog/categories');
    expect(res.status).toBe(401);
  });

  it('Debe listar ubicaciones físicas y sus neveras vinculadas', async () => {
    const res = await request(app)
      .get('/api/catalog/locations')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('SUCCESS');
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
