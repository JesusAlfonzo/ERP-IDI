import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { getAdminAuthToken, getAuthTokenForRoles } from './setup.js';
import { prisma } from '../src/config/prisma.js';
import { InventoryMasterService } from '../src/services/inventory-master.service.js';

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
  describe('Maestros de Inventario - RBAC 100% ADMINISTRADOR', () => {
    it('Debe listar las categorías del módulo maestro con conteo de productos', async () => {
      const res = await request(app)
        .get('/api/inventory/masters/categories')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data ?? res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty('_count');
    });

    it('Debe rechazar con 403 Forbidden a ALMACENISTA al intentar crear una categoría, marca, unidad o ubicación', async () => {
      const almacenistaToken = getAuthTokenForRoles(['ALMACENISTA']);

      const catRes = await request(app)
        .post('/api/inventory/masters/categories')
        .set('Authorization', `Bearer ${almacenistaToken}`)
        .send({ name: 'Categoría No Permitida', code: 'CAT-FAIL' });
      expect(catRes.status).toBe(403);
      expect(catRes.body.status).toBe('FORBIDDEN');

      const brandRes = await request(app)
        .post('/api/inventory/masters/brands')
        .set('Authorization', `Bearer ${almacenistaToken}`)
        .send({ name: 'Marca No Permitida' });
      expect(brandRes.status).toBe(403);
      expect(brandRes.body.status).toBe('FORBIDDEN');

      const unitRes = await request(app)
        .post('/api/inventory/masters/units')
        .set('Authorization', `Bearer ${almacenistaToken}`)
        .send({ name: 'Unidad No Permitida', abbreviation: 'UNP' });
      expect(unitRes.status).toBe(403);
      expect(unitRes.body.status).toBe('FORBIDDEN');

      const locRes = await request(app)
        .post('/api/inventory/masters/locations')
        .set('Authorization', `Bearer ${almacenistaToken}`)
        .send({ name: 'Ubicación No Permitida', type: 'DEPOSITO' });
      expect(locRes.status).toBe(403);
      expect(locRes.body.status).toBe('FORBIDDEN');
    });

    it('Debe rechazar con 403 Forbidden a SOLICITANTE al intentar crear o eliminar una categoría', async () => {
      const solicitanteToken = getAuthTokenForRoles(['SOLICITANTE']);
      const postRes = await request(app)
        .post('/api/inventory/masters/categories')
        .set('Authorization', `Bearer ${solicitanteToken}`)
        .send({
          name: 'Categoría No Autorizada',
        });

      expect(postRes.status).toBe(403);
      expect(postRes.body.status).toBe('FORBIDDEN');

      const delRes = await request(app)
        .delete('/api/inventory/masters/categories/1')
        .set('Authorization', `Bearer ${solicitanteToken}`);

      expect(delRes.status).toBe(403);
      expect(delRes.body.status).toBe('FORBIDDEN');
    });

    it('Debe permitir CRUD completo de Categoría con código a ADMINISTRADOR', async () => {
      // 1. Crear categoría con código
      const createRes = await request(app)
        .post('/api/inventory/masters/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Categoría Test Admin',
          code: 'CAT-ADM-01',
          description: 'Descripción de prueba admin',
        });

      expect(createRes.status).toBe(201);
      const createdCategory = createRes.body.data ?? createRes.body;
      expect(createdCategory.name).toBe('Categoría Test Admin');
      expect(createdCategory.code).toBe('CAT-ADM-01');
      const catId = createdCategory.id;

      // 2. Actualizar categoría incluyendo código
      const updateRes = await request(app)
        .put(`/api/inventory/masters/categories/${catId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Categoría Test Admin Editada',
          code: 'CAT-ADM-02',
          description: 'Nueva descripción editada',
        });

      expect(updateRes.status).toBe(200);
      const updatedCategory = updateRes.body.data ?? updateRes.body;
      expect(updatedCategory.name).toBe('Categoría Test Admin Editada');
      expect(updatedCategory.code).toBe('CAT-ADM-02');

      // 3. Eliminar categoría sin productos
      const deleteRes = await request(app)
        .delete(`/api/inventory/masters/categories/${catId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteRes.status).toBe(200);
    });

    it('Debe rechazar con 400 Bad Request la creación de categoría con código o nombre duplicado', async () => {
      // Crear primera categoría
      const res1 = await request(app)
        .post('/api/inventory/masters/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Categoría Unica A',
          code: 'CAT-UNIQ',
        });
      expect(res1.status).toBe(201);
      const id1 = (res1.body.data ?? res1.body).id;

      // Intentar crear otra con el mismo código
      const resDuplicateCode = await request(app)
        .post('/api/inventory/masters/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Categoría Unica B',
          code: 'CAT-UNIQ',
        });
      expect(resDuplicateCode.status).toBe(400);
      expect(resDuplicateCode.body.message).toMatch(/código/i);

      // Limpiar categoría creada
      await request(app)
        .delete(`/api/inventory/masters/categories/${id1}`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    it('Debe rechazar con 400 Bad Request la eliminación de una categoría con productos asignados', async () => {
      const category = await InventoryMasterService.createCategory({
        name: 'Categoría Con Productos Bloqueada Test ' + Date.now(),
      });
      const unit = await prisma.unit.findFirst();
      const product = await prisma.product.create({
        data: {
          name: 'Insumo Test Categoria Bloqueada',
          sku: 'SKU-TEST-CAT-' + Date.now(),
          categoryId: category.id,
          baseUnitId: unit!.id,
        },
      });

      const res = await request(app)
        .delete(`/api/inventory/masters/categories/${category.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/No se puede eliminar/i);

      // Limpieza
      await prisma.product.delete({ where: { id: product.id } });
      await prisma.category.delete({ where: { id: category.id } });
    });

    it('Debe permitir CRUD completo de Marca comercial a ADMINISTRADOR', async () => {
      // Crear marca
      const createRes = await request(app)
        .post('/api/inventory/masters/brands')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Marca Vitest Admin',
          description: 'Línea de reactivos vitest',
        });

      expect(createRes.status).toBe(201);
      const brand = createRes.body.data ?? createRes.body;
      const brandId = brand.id;

      // Actualizar marca
      const updateRes = await request(app)
        .patch(`/api/inventory/masters/brands/${brandId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Marca Vitest Admin Modificada',
        });
      expect(updateRes.status).toBe(200);

      // Eliminar marca
      const deleteRes = await request(app)
        .delete(`/api/inventory/masters/brands/${brandId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(deleteRes.status).toBe(200);
    });

    it('Debe rechazar con 400 Bad Request la eliminación de una marca con productos asignados', async () => {
      const brand = await InventoryMasterService.createBrand({
        name: 'Marca Con Productos Bloqueada Test',
      });
      const unit = await prisma.unit.findFirst();
      const category = await prisma.category.findFirst();
      const product = await prisma.product.create({
        data: {
          name: 'Insumo Test Marca Bloqueada',
          sku: 'SKU-TEST-BRAND-' + Date.now(),
          categoryId: category!.id,
          brandId: brand.id,
          baseUnitId: unit!.id,
        },
      });

      const res = await request(app)
        .delete(`/api/inventory/masters/brands/${brand.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/No se puede eliminar/i);

      // Limpieza
      await prisma.product.delete({ where: { id: product.id } });
      await prisma.brand.delete({ where: { id: brand.id } });
    });

    it('Debe permitir CRUD completo de Unidad de Medida a ADMINISTRADOR', async () => {
      // Crear unidad
      const createRes = await request(app)
        .post('/api/inventory/masters/units')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Unidad Vitest Test',
          abbreviation: 'UVT',
        });

      expect(createRes.status).toBe(201);
      const unit = createRes.body.data ?? createRes.body;
      const unitId = unit.id;

      // Actualizar unidad
      const updateRes = await request(app)
        .patch(`/api/inventory/masters/units/${unitId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Unidad Vitest Test Modificada',
          abbreviation: 'UVTM',
        });
      expect(updateRes.status).toBe(200);

      // Eliminar unidad
      const deleteRes = await request(app)
        .delete(`/api/inventory/masters/units/${unitId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(deleteRes.status).toBe(200);
    });

    it('Debe rechazar con 400 Bad Request la eliminación de una unidad con productos asignados', async () => {
      const unit = await prisma.unit.findFirst();
      const category = await prisma.category.findFirst();
      const product = await prisma.product.create({
        data: {
          name: 'Insumo Test Unidad Bloqueada',
          sku: 'SKU-TEST-UNIT-' + Date.now(),
          categoryId: category!.id,
          baseUnitId: unit!.id,
        },
      });

      const res = await request(app)
        .delete(`/api/inventory/masters/units/${unit!.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/No se puede eliminar/i);

      // Limpieza
      await prisma.product.delete({ where: { id: product.id } });
    });

    it('Debe permitir CRUD completo de Departamento / Área a ADMINISTRADOR', async () => {
      // 1. Crear departamento
      const createRes = await request(app)
        .post('/api/inventory/masters/departments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          code: 'DEP-VITEST',
          name: 'Departamento Vitest Test',
          description: 'Área de prueba automatizada',
          isActive: true,
        });

      expect(createRes.status).toBe(201);
      const dep = createRes.body.data ?? createRes.body;
      const depId = dep.id;
      expect(dep.code).toBe('DEP-VITEST');

      // 2. Listar departamentos
      const listRes = await request(app)
        .get('/api/inventory/masters/departments')
        .set('Authorization', `Bearer ${authToken}`);
      expect(listRes.status).toBe(200);
      const list = listRes.body.data ?? listRes.body;
      expect(Array.isArray(list)).toBe(true);

      // 3. Actualizar departamento
      const updateRes = await request(app)
        .patch(`/api/inventory/masters/departments/${depId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Departamento Vitest Test Modificado',
          isActive: false,
        });
      expect(updateRes.status).toBe(200);
      expect((updateRes.body.data ?? updateRes.body).isActive).toBe(false);

      // 4. Eliminar departamento
      const deleteRes = await request(app)
        .delete(`/api/inventory/masters/departments/${depId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(deleteRes.status).toBe(200);
    });

    it('Debe rechazar con 403 Forbidden a ALMACENISTA al intentar crear un departamento', async () => {
      const almacenistaToken = getAuthTokenForRoles(['ALMACENISTA']);
      const res = await request(app)
        .post('/api/inventory/masters/departments')
        .set('Authorization', `Bearer ${almacenistaToken}`)
        .send({
          code: 'DEP-FAIL',
          name: 'Departamento Bloqueado',
        });
      expect(res.status).toBe(403);
    });

    it('Debe permitir CRUD completo de Ubicación física a ADMINISTRADOR', async () => {
      // Crear ubicación
      const createRes = await request(app)
        .post('/api/inventory/masters/locations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Depósito Temporal Vitest',
          type: 'DEPOSITO',
          description: 'Ubicación de prueba',
        });

      expect(createRes.status).toBe(201);
      const loc = createRes.body.data ?? createRes.body;
      const locId = loc.id;

      // Actualizar ubicación
      const updateRes = await request(app)
        .patch(`/api/inventory/masters/locations/${locId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Depósito Temporal Vitest Modificado',
        });
      expect(updateRes.status).toBe(200);

      // Eliminar ubicación
      const deleteRes = await request(app)
        .delete(`/api/inventory/masters/locations/${locId}`)
        .set('Authorization', `Bearer ${authToken}`);
      expect(deleteRes.status).toBe(200);
    });

    it('Debe rechazar con 400 Bad Request la eliminación de una ubicación con stock o neveras asignadas', async () => {
      const loc = await InventoryMasterService.createLocation({
        name: 'Ubicacion Bloqueada Test ' + Date.now(),
        type: 'LABORATORIO',
      });
      const fridge = await prisma.fridge.create({
        data: {
          code: 'FRIDGE-LOCK-' + Date.now(),
          name: 'Nevera Bloqueada Test',
          locationId: loc.id,
          targetTempCelsius: 4,
        },
      });

      const res = await request(app)
        .delete(`/api/inventory/masters/locations/${loc.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/No se puede eliminar/i);

      // Limpieza
      await prisma.fridge.delete({ where: { id: fridge.id } });
      await prisma.location.delete({ where: { id: loc.id } });
    });
  });

  // --- Catálogo de Inventario (/api/inventory/catalog) ---
  describe('Catálogo de Inventario (/api/inventory/catalog)', () => {
    it('Debe devolver un listado de Product con category, brand, baseUnit, batches y totalStock calculado', async () => {
      // 1. Crear producto con lotes en distintos estados
      const category = await prisma.category.findFirst();
      const brand = await prisma.brand.findFirst();
      const unit = await prisma.unit.findFirst();
      const location = await prisma.location.findFirst();

      const product = await prisma.product.create({
        data: {
          name: 'Insumo Prueba Catálogo Integración',
          sku: 'SKU-CAT-TEST-' + Date.now(),
          categoryId: category!.id,
          brandId: brand!.id,
          baseUnitId: unit!.id,
          minStockAlert: 5,
        },
      });

      // Lote 1: DISPONIBLE (10 unidades)
      const batch1 = await prisma.stockBatch.create({
        data: {
          productId: product.id,
          locationId: location!.id,
          lotNumber: 'LOT-DISP-' + Date.now(),
          currentQuantity: 10,
          costPrice: 5.5,
          status: 'DISPONIBLE',
        },
      });

      // Lote 2: EN_CUARENTENA (5 unidades - NO debe sumarse al totalStock disponible)
      const batch2 = await prisma.stockBatch.create({
        data: {
          productId: product.id,
          locationId: location!.id,
          lotNumber: 'LOT-CUAR-' + Date.now(),
          currentQuantity: 5,
          costPrice: 5.5,
          status: 'EN_CUARENTENA',
        },
      });

      // 2. Consultar GET /api/inventory/catalog
      const res = await request(app)
        .get('/api/inventory/catalog')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data ?? res.body;
      expect(Array.isArray(data)).toBe(true);

      const found = data.find((p: any) => p.sku === product.sku);
      expect(found).toBeDefined();
      expect(found.name).toBe(product.name);
      expect(found.category).toBeDefined();
      expect(found.brand).toBeDefined();
      expect(found.baseUnit).toBeDefined();
      expect(Array.isArray(found.batches)).toBe(true);
      expect(found.batches.length).toBe(2);
      // El totalStock debe ser exactamente 10 (solo DISPONIBLE)
      expect(Number(found.totalStock)).toBe(10);

      // Limpieza
      await prisma.stockBatch.deleteMany({ where: { productId: product.id } });
      await prisma.product.delete({ where: { id: product.id } });
    });
  });

  // --- Laboratorio y Equipos de Frío (/api/lab/fridges) ---
  describe('Laboratorio: Cadena de Frío y RBAC Estricto', () => {
    it('Debe listar las neveras y cavas operativas sembradas', async () => {
      const res = await request(app)
        .get('/api/lab/fridges')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      const data = res.body.data ?? res.body;
      expect(Array.isArray(data)).toBe(true);
      expect(data.some((f: any) => f.code === 'NEV-01')).toBe(true);
    });

    it('Debe rechazar con 403 Forbidden a ALMACENISTA al intentar registrar consumos analíticos', async () => {
      const almacenistaToken = getAuthTokenForRoles(['ALMACENISTA']);
      const res = await request(app)
        .post('/api/lab/consumptions')
        .set('Authorization', `Bearer ${almacenistaToken}`)
        .send({
          batchId: 1,
          quantity: 10,
          diagnosticProtocol: 'Inmunoensayo',
          departmentSection: 'Inmunología',
        });

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('FORBIDDEN');
    });

    it('Debe rechazar con 403 Forbidden a COMPRAS al intentar abrir un vial sellado', async () => {
      const comprasToken = getAuthTokenForRoles(['COMPRAS']);
      const res = await request(app)
        .patch('/api/lab/units/1/open')
        .set('Authorization', `Bearer ${comprasToken}`);

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('FORBIDDEN');
    });

    it('Debe rechazar con 403 Forbidden a SOLICITANTE al intentar crear una nevera clínica', async () => {
      const solicitanteToken = getAuthTokenForRoles(['SOLICITANTE']);
      const res = await request(app)
        .post('/api/lab/fridges')
        .set('Authorization', `Bearer ${solicitanteToken}`)
        .send({
          locationId: 1,
          code: 'NEV-TEST',
          name: 'Nevera Test',
        });

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('FORBIDDEN');
    });
  });
});
