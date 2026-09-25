import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import { getAdminAuthToken } from './setup.js';
import { RequestWindowService } from '../src/services/request-window.service.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'jwt_default_secret_key';

describe('Integración: Reingeniería del Módulo de Solicitudes (Requests)', () => {
  let adminToken = '';
  let solicitanteToken = '';
  let solicitanteUser: any;
  let testProduct: any;
  let testBatch1: any;
  let testBatch2: any;
  let testLocation: any;

  beforeAll(async () => {
    adminToken = getAdminAuthToken();

    // Crear o recuperar usuario solicitante
    solicitanteUser = await prisma.user.upsert({
      where: { username: 'solicitante_test' },
      update: {},
      create: {
        username: 'solicitante_test',
        email: 'solicitante_test@idi.ucv.ve',
        fullName: 'Dr. Solicitante Pruebas',
        department: 'Inmunogenética',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuv',
      },
    });

    // Limpiar solicitudes previas de prueba para asegurar idempotencia
    await prisma.request.deleteMany({
      where: { userId: solicitanteUser.id },
    });

    solicitanteToken = jwt.sign(
      {
        id: solicitanteUser.id,
        username: solicitanteUser.username,
        email: solicitanteUser.email,
        department: solicitanteUser.department,
        roles: ['SOLICITANTE'],
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Asegurar categoría y unidad base
    const category = await prisma.category.upsert({
      where: { name: 'Reactivos Test Solicitudes' },
      update: {},
      create: {
        code: 'CAT-REQ-TEST',
        name: 'Reactivos Test Solicitudes',
        description: 'Categoría para pruebas automatizadas de requisiciones',
      },
    });

    const unit = await prisma.unit.upsert({
      where: { abbreviation: 'fco_test' },
      update: {},
      create: {
        name: 'Frasco Test',
        abbreviation: 'fco_test',
      },
    });

    testLocation = await prisma.location.upsert({
      where: { id: 9999 },
      update: {},
      create: {
        id: 9999,
        name: 'Almacén Central Pruebas',
        type: 'ALMACEN_GENERAL',
      },
    });

    // Producto de prueba
    testProduct = await prisma.product.create({
      data: {
        name: 'Buffer Salino PBS 10X Test',
        sku: `PBS-TEST-${Date.now()}`,
        categoryId: category.id,
        baseUnitId: unit.id,
        minStockAlert: 5,
        isReagent: true,
      },
    });

    // Lotes de prueba para despacho multi-lote
    testBatch1 = await prisma.stockBatch.create({
      data: {
        productId: testProduct.id,
        locationId: testLocation.id,
        lotNumber: `LOT-A-${Date.now()}`,
        currentQuantity: 50,
        costPrice: 15.5,
        status: 'DISPONIBLE',
      },
    });

    testBatch2 = await prisma.stockBatch.create({
      data: {
        productId: testProduct.id,
        locationId: testLocation.id,
        lotNumber: `LOT-B-${Date.now()}`,
        currentQuantity: 30,
        costPrice: 16.0,
        status: 'DISPONIBLE',
      },
    });

    // Asegurar que la ventana operativa esté abierta para las pruebas
    await RequestWindowService.updateConfig({
      startDay: 0, // Domingo
      startHour: 0,
      startMinute: 0,
      endDay: 6, // Sábado
      endHour: 23,
      endMinute: 59,
      isSuspended: false,
      maxWeeklyRequestsPerUser: 1,
    });
  });

  afterAll(async () => {
    // Restaurar configuración estándar de ventana (Lunes 05:00 a Miércoles 16:00)
    await RequestWindowService.updateConfig({
      startDay: 1,
      startHour: 5,
      startMinute: 0,
      endDay: 3,
      endHour: 16,
      endMinute: 0,
      isSuspended: false,
      maxWeeklyRequestsPerUser: 1,
    });
  });

  describe('1. Consulta de Estado de Ventana Operativa (/window-status)', () => {
    it('Debe devolver el estado de la ventana y el ciclo semanal para usuarios autenticados', async () => {
      const res = await request(app)
        .get('/api/requests/window-status')
        .set('Authorization', `Bearer ${solicitanteToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('SUCCESS');
      expect(res.body.data).toHaveProperty('isOpen');
      expect(res.body.data).toHaveProperty('currentCycle');
      expect(res.body.data).toHaveProperty('canCreate');
      expect(typeof res.body.data.isOpen).toBe('boolean');
    });
  });

  describe('2. Creación de Solicitudes y Omisión de Prioridad en UI', () => {
    it('Debe crear una solicitud asignando prioridad RUTINA por defecto si no se envía', async () => {
      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          departmentSection: 'Inmunogenética',
          justification: 'Reactivo requerido para protocolo de extracción de ADN',
          items: [
            {
              productId: Number(testProduct.id),
              requestedQuantity: 20,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('SUCCESS');
      expect(res.body.data.priority).toBe('RUTINA');
      expect(res.body.data.status).toBe('PENDIENTE');

      // Verificación de serialización numérica
      const item = res.body.data.items[0];
      expect(item.quantityRequested).toBe(20);
      expect(item.requestedQuantity).toBe(20);
      expect(item.quantityApproved).toBe(0);
      expect(item.quantityDispatched).toBe(0);
    });
  });

  describe('3. Flujo Estricto: NO Despachar sin Aprobación Previa (Bloqueo PENDIENTE)', () => {
    it('Debe rechazar con HTTP 400 Bad Request el intento de despachar una solicitud PENDIENTE', async () => {
      // 1. Crear solicitud en PENDIENTE
      const createRes = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          departmentSection: 'Laboratorio General',
          justification: 'Material para pruebas urgentes',
          items: [
            {
              productId: Number(testProduct.id),
              requestedQuantity: 10,
            },
          ],
        });

      const reqId = createRes.body.data.id;

      // 2. Intentar despachar directamente estando en PENDIENTE
      const dispatchRes = await request(app)
        .post(`/api/requests/${reqId}/dispatch`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [
            {
              itemId: createRes.body.data.items[0].id,
              batchId: Number(testBatch1.id),
              dispatchedQuantity: 10,
            },
          ],
        });

      expect(dispatchRes.status).toBe(400);
      expect(dispatchRes.body.message).toBe(
        'La solicitud debe ser aprobada antes de proceder al despacho'
      );
    });
  });

  describe('4. Aprobación y Despacho Multi-Lote con Soporte de Despacho Parcial', () => {
    it('Debe aprobar la solicitud y permitir despacho multi-lote parcial pasando a DESPACHADA_PARCIAL', async () => {
      // 1. Crear solicitud de 25 unidades
      const createRes = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          departmentSection: 'Investigación',
          justification: 'Pruebas de citometría',
          items: [
            {
              productId: Number(testProduct.id),
              requestedQuantity: 25,
            },
          ],
        });

      const reqId = createRes.body.data.id;
      const itemId = createRes.body.data.items[0].id;

      // 2. Aprobar la solicitud
      const approveRes = await request(app)
        .patch(`/api/requests/${reqId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [
            {
              itemId,
              quantityApproved: 25,
            },
          ],
        });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.status).toBe('APROBADA');
      expect(approveRes.body.data.items[0].quantityApproved).toBe(25);

      // 3. Despacho Multi-Lote Parcial: 10 unidades de Lote 1 + 5 unidades de Lote 2 = 15 unidades (faltan 10)
      const dispatchRes = await request(app)
        .post(`/api/requests/${reqId}/dispatch`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          dispatchNotes: 'Entrega parcial en sala',
          items: [
            {
              itemId,
              allocations: [
                { batchId: Number(testBatch1.id), quantity: 10 },
                { batchId: Number(testBatch2.id), quantity: 5 },
              ],
            },
          ],
        });

      expect(dispatchRes.status).toBe(200);
      expect(dispatchRes.body.data.status).toBe('DESPACHADA_PARCIAL');

      const dispatchedItem = dispatchRes.body.data.items[0];
      expect(dispatchedItem.quantityDispatched).toBe(15);
      expect(dispatchedItem.quantityApproved).toBe(25);
      expect(dispatchedItem.requestedQuantity).toBe(25);

      // 4. Completar el despacho de las 10 unidades restantes
      const completeRes = await request(app)
        .post(`/api/requests/${reqId}/dispatch`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          dispatchNotes: 'Entrega de saldo restante',
          items: [
            {
              itemId,
              allocations: [{ batchId: Number(testBatch1.id), quantity: 10 }],
            },
          ],
        });

      expect(completeRes.status).toBe(200);
      expect(completeRes.body.data.status).toBe('COMPLETADA');
      expect(completeRes.body.data.items[0].quantityDispatched).toBe(25);
    });
  });

  describe('5. Consistencia en Serialización de Cantidad Solicitada en Show/List', () => {
    it('Tanto getRequestById como listRequests deben incluir quantityRequested y requestedQuantity numéricos', async () => {
      // 1. Crear solicitud
      const createRes = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          departmentSection: 'Alergia e Inmunología',
          justification: 'Pruebas clínicas de alergia',
          items: [
            {
              productId: Number(testProduct.id),
              requestedQuantity: 7,
            },
          ],
        });

      const reqId = createRes.body.data.id;

      // 2. Verificar en getRequestById
      const showRes = await request(app)
        .get(`/api/requests/${reqId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(showRes.status).toBe(200);
      const showItem = showRes.body.data.items[0];
      expect(showItem.quantityRequested).toBe(7);
      expect(showItem.requestedQuantity).toBe(7);
      expect(typeof showItem.quantityRequested).toBe('number');
      expect(typeof showItem.requestedQuantity).toBe('number');

      // 3. Verificar en listRequests
      const listRes = await request(app)
        .get('/api/requests')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      const targetReq = listRes.body.data.find(
        (r: any) => String(r.id) === String(reqId)
      );
      expect(targetReq).toBeDefined();
      const listItem = targetReq.items[0];
      expect(listItem.quantityRequested).toBe(7);
      expect(listItem.requestedQuantity).toBe(7);
    });
  });

  describe('6. Token Semanal y Ventana Operativa para Solicitantes', () => {
    it('Debe bloquear con HTTP 400 el intento de un solicitante de registrar una segunda solicitud en la misma semana', async () => {
      // Primera solicitud del solicitante esta semana (permitida)
      const firstRes = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${solicitanteToken}`)
        .send({
          departmentSection: 'Inmunogenética',
          justification: 'Primera requisición de la semana',
          items: [
            {
              productId: Number(testProduct.id),
              requestedQuantity: 3,
            },
          ],
        });

      expect(firstRes.status).toBe(201);

      // Segunda solicitud del solicitante en la misma semana (bloqueada por política institucional)
      const secondRes = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${solicitanteToken}`)
        .send({
          departmentSection: 'Inmunogenética',
          justification: 'Intento de segunda requisición semanal',
          items: [
            {
              productId: Number(testProduct.id),
              requestedQuantity: 5,
            },
          ],
        });

      expect(secondRes.status).toBe(400);
      expect(secondRes.body.message).toBe(
        'Ya utilizaste tu cupo de solicitud correspondiente a esta semana.'
      );
    });

    it('El administrador no tiene límite de cupo y puede crear múltiples solicitudes en la misma semana', async () => {
      const adminReq1 = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          departmentSection: 'Dirección',
          justification: 'Solicitud admin 1',
          items: [
            {
              productId: Number(testProduct.id),
              requestedQuantity: 2,
            },
          ],
        });

      expect(adminReq1.status).toBe(201);

      const adminReq2 = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          departmentSection: 'Dirección',
          justification: 'Solicitud admin 2',
          items: [
            {
              productId: Number(testProduct.id),
              requestedQuantity: 2,
            },
          ],
        });

      expect(adminReq2.status).toBe(201);
    });

    it('Debe bloquear solicitudes de solicitantes cuando la ventana está suspendida por administración', async () => {
      // Suspender ventana
      await RequestWindowService.updateConfig({ isSuspended: true });

      const res = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${solicitanteToken}`)
        .send({
          departmentSection: 'Inmunogenética',
          justification: 'Intento durante suspensión',
          items: [
            {
              productId: Number(testProduct.id),
              requestedQuantity: 2,
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('suspendida');

      // Restaurar ventana abierta
      await RequestWindowService.updateConfig({ isSuspended: false });
    });
  });

  describe('7. Soporte Explícito de Standby y Validación Amigable de Despacho con Cantidad Cero', () => {
    it('Una solicitud aprobada permanece en APROBADA (Standby) sin obligar a despachar', async () => {
      // 1. Crear solicitud
      const createRes = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          departmentSection: 'Laboratorio General',
          justification: 'Pruebas standby',
          items: [{ productId: Number(testProduct.id), requestedQuantity: 10 }],
        });

      const reqId = createRes.body.data.id;
      const itemId = createRes.body.data.items[0].id;

      // 2. Aprobar solicitud
      const approveRes = await request(app)
        .patch(`/api/requests/${reqId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [{ itemId, quantityApproved: 10 }],
        });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.data.status).toBe('APROBADA');

      // 3. Consultar solicitud: permanece en APROBADA (en espera de despacho)
      const getRes = await request(app)
        .get(`/api/requests/${reqId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.status).toBe('APROBADA');
      expect(getRes.body.data.items[0].quantityDispatched).toBe(0);
    });

    it('Debe rechazar con mensaje amigable cuando todos los renglones tienen cantidad asignada 0', async () => {
      // 1. Crear y aprobar solicitud
      const createRes = await request(app)
        .post('/api/requests')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          departmentSection: 'Laboratorio General',
          justification: 'Pruebas asignación cero',
          items: [{ productId: Number(testProduct.id), requestedQuantity: 6 }],
        });

      const reqId = createRes.body.data.id;
      const itemId = createRes.body.data.items[0].id;

      await request(app)
        .patch(`/api/requests/${reqId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [{ itemId, quantityApproved: 6 }],
        });

      // 2. Intentar despachar con asignación de cantidad 0
      const dispatchZeroRes = await request(app)
        .post(`/api/requests/${reqId}/dispatch`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [
            {
              itemId,
              allocations: [{ batchId: Number(testBatch1.id), quantity: 0 }],
            },
          ],
        });

      expect(dispatchZeroRes.status).toBe(400);
      expect(dispatchZeroRes.body.message).toBe(
        'Indique al menos una cantidad mayor a 0 para despachar, o cierre el modal para mantener la solicitud en espera.'
      );
    });
  });

  describe('8. Administración de Configuración de Ventana Semanal (/window-config)', () => {
    it('Solo el ADMINISTRADOR puede consultar y actualizar la configuración de ventana semanal', async () => {
      // 1. Solicitante no puede consultar configuración de administración (403 Forbidden)
      const forbiddenGet = await request(app)
        .get('/api/requests/window-config')
        .set('Authorization', `Bearer ${solicitanteToken}`);

      expect(forbiddenGet.status).toBe(403);

      // 2. Administrador puede consultar configuración (200 OK)
      const adminGet = await request(app)
        .get('/api/requests/window-config')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminGet.status).toBe(200);
      expect(adminGet.body.status).toBe('SUCCESS');
      expect(adminGet.body.data).toHaveProperty('startDay');
      expect(adminGet.body.data).toHaveProperty('startHour');
      expect(adminGet.body.data).toHaveProperty('endDay');
      expect(adminGet.body.data).toHaveProperty('endHour');
      expect(adminGet.body.data).toHaveProperty('maxWeeklyRequestsPerUser');

      // 3. Administrador puede actualizar la configuración (200 OK)
      const updateRes = await request(app)
        .put('/api/requests/window-config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          startDay: 1, // Lunes
          startHour: 5,
          startMinute: 0,
          endDay: 3, // Miércoles
          endHour: 16,
          endMinute: 0,
          isSuspended: false,
          maxWeeklyRequestsPerUser: 2,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.status).toBe('SUCCESS');
      expect(updateRes.body.data.maxWeeklyRequestsPerUser).toBe(2);
      expect(updateRes.body.data.endDay).toBe(3);
      expect(updateRes.body.data.endHour).toBe(16);

      // 4. Solicitante no puede actualizar (403 Forbidden)
      const forbiddenPut = await request(app)
        .put('/api/requests/window-config')
        .set('Authorization', `Bearer ${solicitanteToken}`)
        .send({
          isSuspended: true,
        });

      expect(forbiddenPut.status).toBe(403);
    });
  });
});
