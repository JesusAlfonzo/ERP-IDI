import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { getAdminAuthToken } from './setup.js';

describe('Integración: Catálogos, Maestros y Autenticación', () => {
  let authToken = '';

  beforeAll(async () => {
    authToken = await getAdminAuthToken();
  });

  // --- Seguridad y Autenticación Base ---
  it('Debe rechazar peticiones no autenticadas con 401', async () => {
    const res = await request(app).get('/api/catalog/categories');
    expect(res.status).toBe(401);
  });

  // --- Catálogos Organizacionales Base ---
  it('Debe listar categorías con respuesta formateada', async () => {
    const res = await request(app)
      .get('/api/catalog/categories')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data ?? res.body)).toBe(true);
  });

  it('Debe listar ubicaciones físicas del catálogo base', async () => {
    const res = await request(app)
      .get('/api/catalog/locations')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    const data = res.body.data ?? res.body;
    expect(Array.isArray(data)).toBe(true);
  });

  // --- Maestros de Inventario (/api/inventory/masters) ---
  describe('Maestros de Inventario', () => {
    it('Debe listar las marcas comerciales sembradas', async () => {
      const res = await request(app)
        .get('/api/inventory/masters/brands')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data ?? res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });

    it('Debe listar las unidades de medida sembradas', async () => {
      const res = await request(app)
        .get('/api/inventory/masters/units')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data ?? res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
    });

    it('Debe listar las ubicaciones físicas del módulo maestro', async () => {
      const res = await request(app)
        .get('/api/inventory/masters/locations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data ?? res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.some((l: any) => l.name === 'Almacén Central')).toBe(true);
    });
  });

  // --- Laboratorio y Equipos de Frío (/api/lab/fridges) ---
  describe('Laboratorio: Cadena de Frío', () => {
    it('Debe listar las neveras y cavas operativas sembradas', async () => {
      const res = await request(app)
        .get('/api/lab/fridges')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data ?? res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.some((f: any) => f.code === 'NEV-01')).toBe(true);
    });
  });
});
