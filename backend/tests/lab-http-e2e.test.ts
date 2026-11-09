import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import {
  StockOwnership,
  LabUnitStatus,
  LabWeeklyRunStatus,
  LocationType,
  QuarantineReason,
  FridgeAuditAdjustmentStatus,
} from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'jwt_default_secret_key';

function createToken(user: { id: number; username: string; email: string; roles: string[] }) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
      department: 'Laboratorio',
      roles: user.roles,
    },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

describe('SUITE E2E: Capa HTTP, Contratos y Matriz RBAC de Laboratorio Clínico', () => {
  let bioUser: any;
  let coordUser: any;
  let bioToken: string;
  let coordToken: string;

  let testArea: any;
  let testFridge: any;
  let testExam: any;
  let testProduct: any;
  let testBatch: any;

  let validSealedUnit: any;
  let expiredUnit: any;
  let inUseUnit: any;
  let unitForQuarantine: any;

  let testInternalRequest: any;
  let testWeeklyRun: any;
  let testAudit: any;

  const PREFIX = 'HTTP-E2E-';

  beforeAll(async () => {
    // 1. Limpieza de datos previos con prefijo HTTP-E2E-
    await prisma.labConsumptionAuditLog.deleteMany({
      where: {
        OR: [
          { notes: { contains: PREFIX } },
          { labReagentUnit: { unitCode: { startsWith: PREFIX } } },
        ],
      },
    });
    await prisma.labStockMovement.deleteMany({
      where: {
        OR: [
          { reason: { contains: PREFIX } },
          { labReagentUnit: { unitCode: { startsWith: PREFIX } } },
        ],
      },
    });
    await prisma.batchIncident.deleteMany({
      where: {
        OR: [
          { description: { contains: PREFIX } },
          { labReagentUnit: { unitCode: { startsWith: PREFIX } } },
        ],
      },
    });
    await prisma.fridgePhysicalAuditItem.deleteMany({
      where: {
        OR: [
          { notes: { contains: PREFIX } },
          { labReagentUnit: { unitCode: { startsWith: PREFIX } } },
        ],
      },
    });
    await prisma.fridgePhysicalAudit.deleteMany({
      where: { notes: { contains: PREFIX } },
    });
    await prisma.labRunConsumption.deleteMany({
      where: {
        OR: [
          { run: { notes: { contains: PREFIX } } },
          { labReagentUnit: { unitCode: { startsWith: PREFIX } } },
        ],
      },
    });
    await prisma.labWeeklyRun.deleteMany({
      where: { notes: { contains: PREFIX } },
    });
    await prisma.labInternalRequestItem.deleteMany({
      where: { product: { sku: `${PREFIX}PROD-01` } },
    });
    await prisma.labInternalRequest.deleteMany({
      where: { justification: { contains: PREFIX } },
    });
    await prisma.labReagentUnit.deleteMany({
      where: { unitCode: { startsWith: PREFIX } },
    });
    await prisma.stockBatch.deleteMany({
      where: { lotNumber: { startsWith: PREFIX } },
    });
    await prisma.labExamProduct.deleteMany({
      where: { labExam: { code: `${PREFIX}EXAM-01` } },
    });
    await prisma.labExam.deleteMany({
      where: { code: `${PREFIX}EXAM-01` },
    });
    await prisma.labAreaProduct.deleteMany({
      where: { product: { sku: `${PREFIX}PROD-01` } },
    });
    await prisma.product.deleteMany({
      where: { sku: `${PREFIX}PROD-01` },
    });
    await prisma.userLabArea.deleteMany({
      where: { labArea: { code: `${PREFIX}AREA-01` } },
    });
    await prisma.fridge.deleteMany({
      where: { code: `${PREFIX}FRIDGE-01` },
    });
    await prisma.location.deleteMany({
      where: { name: 'Depósito Refrigerado HTTP' },
    });
    await prisma.labArea.deleteMany({
      where: { code: `${PREFIX}AREA-01` },
    });
    await prisma.userRole.deleteMany({
      where: { user: { username: { in: [`${PREFIX.toLowerCase()}bio`, `${PREFIX.toLowerCase()}coord`] } } },
    });
    await prisma.userRole.deleteMany({
      where: { user: { username: { in: [`${PREFIX.toLowerCase()}bio`, `${PREFIX.toLowerCase()}coord`] } } },
    });
    await prisma.user.deleteMany({
      where: { username: { in: [`${PREFIX.toLowerCase()}bio`, `${PREFIX.toLowerCase()}coord`] } },
    });

    const bioRole = await prisma.role.findFirst({ where: { name: 'BIOANALISTA' } });
    const coordRole = await prisma.role.findFirst({ where: { name: 'COORDINADOR_LABORATORIO' } });

    // 2. Usuarios con RBAC diferenciado
    bioUser = await prisma.user.create({
      data: {
        username: `${PREFIX.toLowerCase()}bio`,
        email: 'bio_http@idi.ucv.ve',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456789',
        fullName: 'Bioanalista HTTP E2E',
        department: 'Laboratorio Clínico',
        isActive: true,
      },
    });
    if (bioRole) {
      await prisma.userRole.create({
        data: { userId: bioUser.id, roleId: bioRole.id },
      });
    }

    coordUser = await prisma.user.create({
      data: {
        username: `${PREFIX.toLowerCase()}coord`,
        email: 'coord_http@idi.ucv.ve',
        passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz012345678901234567890123456789',
        fullName: 'Coordinador HTTP E2E',
        department: 'Laboratorio Clínico',
        isActive: true,
      },
    });
    if (coordRole) {
      await prisma.userRole.create({
        data: { userId: coordUser.id, roleId: coordRole.id },
      });
    }

    bioToken = createToken({ ...bioUser, roles: ['BIOANALISTA'] });
    coordToken = createToken({ ...coordUser, roles: ['COORDINADOR_LABORATORIO'] });

    // 3. Infraestructura de Laboratorio
    testArea = await prisma.labArea.create({
      data: {
        code: `${PREFIX}AREA-01`,
        name: 'Área Inmuno HTTP E2E',
        description: 'Área para pruebas de integración HTTP',
        isActive: true,
      },
    });

    await prisma.userLabArea.createMany({
      data: [
        { userId: bioUser.id, labAreaId: testArea.id },
        { userId: coordUser.id, labAreaId: testArea.id },
      ],
    });

    const category = await prisma.category.findFirst();
    const unitMeasure = await prisma.unit.findFirst();

    const loc = await prisma.location.create({
      data: {
        name: 'Depósito Refrigerado HTTP',
        type: LocationType.LABORATORIO,
        description: 'Ubicación física HTTP',
      },
    });

    testFridge = await prisma.fridge.create({
      data: {
        code: `${PREFIX}FRIDGE-01`,
        name: 'Nevera HTTP E2E 01',
        targetTempCelsius: 4.0,
        status: 'OPERATIVO',
        locationId: loc.id,
      },
    });

    // 4. Catálogo: Producto y Examen con Smart Defaults
    testProduct = await prisma.product.create({
      data: {
        sku: `${PREFIX}PROD-01`,
        name: 'Kit ELISA Anti-DNA (HTTP Test)',
        isLabReagent: true,
        isReagent: true,
        theoreticalYield: 96,
        categoryId: category!.id,
        baseUnitId: unitMeasure!.id,
      },
    });

    testBatch = await prisma.stockBatch.create({
      data: {
        productId: testProduct.id,
        lotNumber: `${PREFIX}LOT-01`,
        locationId: loc.id,
        currentQuantity: 10,
        costPrice: 240.0,
        expirationDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      },
    });

    testExam = await prisma.labExam.create({
      data: {
        code: `${PREFIX}EXAM-01`,
        name: 'ELISA Anti-DNA (HTTP)',
        areaId: testArea.id,
        defaultCalibratorUses: 4,
        defaultControlUses: 2,
        compatibleProducts: {
          create: [{ productId: testProduct.id }],
        },
      },
    });

    // 5. Frascos de Prueba
    validSealedUnit = await prisma.labReagentUnit.create({
      data: {
        unitCode: `${PREFIX}UNIT-SEALED`,
        productId: testProduct.id,
        batchId: testBatch.id,
        fridgeId: testFridge.id,
        assignedLabAreaId: testArea.id,
        initialVolume: 96,
        currentVolume: 96,
        initialTheoreticalUses: 96,
        remainingUses: 96,
        status: LabUnitStatus.SELLADO,
        ownershipType: StockOwnership.CLINICAL_ROUTINE,
        unitCostPerUse: 2.5,
        expirationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });

    expiredUnit = await prisma.labReagentUnit.create({
      data: {
        unitCode: `${PREFIX}UNIT-EXPIRED`,
        productId: testProduct.id,
        batchId: testBatch.id,
        fridgeId: testFridge.id,
        assignedLabAreaId: testArea.id,
        initialVolume: 96,
        currentVolume: 96,
        initialTheoreticalUses: 96,
        remainingUses: 96,
        status: LabUnitStatus.SELLADO,
        ownershipType: StockOwnership.CLINICAL_ROUTINE,
        unitCostPerUse: 2.5,
        expirationDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Venció ayer
      },
    });

    inUseUnit = await prisma.labReagentUnit.create({
      data: {
        unitCode: `${PREFIX}UNIT-INUSE`,
        productId: testProduct.id,
        batchId: testBatch.id,
        fridgeId: testFridge.id,
        assignedLabAreaId: testArea.id,
        initialVolume: 96,
        currentVolume: 80,
        initialTheoreticalUses: 96,
        remainingUses: 80,
        status: LabUnitStatus.EN_USO,
        openedAt: new Date(),
        openedById: bioUser.id,
        ownershipType: StockOwnership.CLINICAL_ROUTINE,
        unitCostPerUse: 2.5,
        expirationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });

    unitForQuarantine = await prisma.labReagentUnit.create({
      data: {
        unitCode: `${PREFIX}UNIT-QUARANTINE`,
        productId: testProduct.id,
        batchId: testBatch.id,
        fridgeId: testFridge.id,
        assignedLabAreaId: testArea.id,
        initialVolume: 96,
        currentVolume: 96,
        initialTheoreticalUses: 96,
        remainingUses: 96,
        status: LabUnitStatus.EN_USO,
        ownershipType: StockOwnership.CLINICAL_ROUTINE,
        unitCostPerUse: 2.5,
        expirationDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    });

    // 6. Solicitud Interna de prueba
    testInternalRequest = await prisma.labInternalRequest.create({
      data: {
        code: `REQ-${PREFIX}001`,
        labAreaId: testArea.id,
        requestedById: bioUser.id,
        justification: `${PREFIX}Solicitud interna para verificación de aprobación HTTP`,
        items: {
          create: [
            {
              productId: testProduct.id,
              requestedUsesOrUnits: 96,
            },
          ],
        },
      },
      include: { items: true },
    });

    // 7. Corrida semanal para pruebas de cierre
    testWeeklyRun = await prisma.labWeeklyRun.create({
      data: {
        code: `RUN-${PREFIX}001`,
        labAreaId: testArea.id,
        labExamId: testExam.id,
        bioanalystId: bioUser.id,
        weekStartDate: new Date(),
        weekEndDate: new Date(),
        status: LabWeeklyRunStatus.OPEN_ACCUMULATING,
        notes: `${PREFIX}Corrida abierta para pruebas de cierre HTTP`,
      },
    });

    // 8. Arqueo físico pendiente para conciliación
    testAudit = await prisma.fridgePhysicalAudit.create({
      data: {
        code: `AUD-${PREFIX}001`,
        performedById: coordUser.id,
        notes: `${PREFIX}Arqueo físico para prueba de reconciliación HTTP`,
        items: {
          create: [
            {
              labReagentUnitId: inUseUnit.id,
              systemRemainingUses: 80,
              physicalRemainingUses: 65,
              variance: -15,
              adjustmentStatus: FridgeAuditAdjustmentStatus.PENDING_ADJUSTMENT,
              notes: `${PREFIX}Merma por evaporación observada`,
            },
          ],
        },
      },
      include: { items: true },
    });
  });

  afterAll(async () => {
    // Limpieza de datos creados en este test
    await prisma.labConsumptionAuditLog.deleteMany({
      where: {
        OR: [
          { notes: { contains: PREFIX } },
          { labReagentUnit: { unitCode: { startsWith: PREFIX } } },
        ],
      },
    });
    await prisma.labStockMovement.deleteMany({
      where: {
        OR: [
          { reason: { contains: PREFIX } },
          { labReagentUnit: { unitCode: { startsWith: PREFIX } } },
        ],
      },
    });
    await prisma.batchIncident.deleteMany({
      where: {
        OR: [
          { description: { contains: PREFIX } },
          { labReagentUnit: { unitCode: { startsWith: PREFIX } } },
        ],
      },
    });
    await prisma.fridgePhysicalAuditItem.deleteMany({
      where: {
        OR: [
          { notes: { contains: PREFIX } },
          { labReagentUnit: { unitCode: { startsWith: PREFIX } } },
        ],
      },
    });
    await prisma.fridgePhysicalAudit.deleteMany({
      where: { notes: { contains: PREFIX } },
    });
    await prisma.labRunConsumption.deleteMany({
      where: {
        OR: [
          { run: { notes: { contains: PREFIX } } },
          { labReagentUnit: { unitCode: { startsWith: PREFIX } } },
        ],
      },
    });
    await prisma.labWeeklyRun.deleteMany({
      where: { notes: { contains: PREFIX } },
    });
    await prisma.labInternalRequestItem.deleteMany({
      where: { product: { sku: `${PREFIX}PROD-01` } },
    });
    await prisma.labInternalRequest.deleteMany({
      where: { justification: { contains: PREFIX } },
    });
    await prisma.labReagentUnit.deleteMany({
      where: { unitCode: { startsWith: PREFIX } },
    });
    await prisma.stockBatch.deleteMany({
      where: { lotNumber: { startsWith: PREFIX } },
    });
    await prisma.labExamProduct.deleteMany({
      where: { labExam: { code: `${PREFIX}EXAM-01` } },
    });
    await prisma.labExam.deleteMany({
      where: { code: `${PREFIX}EXAM-01` },
    });
    await prisma.labAreaProduct.deleteMany({
      where: { product: { sku: `${PREFIX}PROD-01` } },
    });
    await prisma.product.deleteMany({
      where: { sku: `${PREFIX}PROD-01` },
    });
    await prisma.userLabArea.deleteMany({
      where: { labArea: { code: `${PREFIX}AREA-01` } },
    });
    await prisma.fridge.deleteMany({
      where: { code: `${PREFIX}FRIDGE-01` },
    });
    await prisma.location.deleteMany({
      where: { name: 'Depósito Refrigerado HTTP' },
    });
    await prisma.labArea.deleteMany({
      where: { code: `${PREFIX}AREA-01` },
    });
    await prisma.userRole.deleteMany({
      where: { user: { username: { in: [`${PREFIX.toLowerCase()}bio`, `${PREFIX.toLowerCase()}coord`] } } },
    });
    await prisma.user.deleteMany({
      where: { username: { in: [`${PREFIX.toLowerCase()}bio`, `${PREFIX.toLowerCase()}coord`] } },
    });
  });

  // =========================================================================
  // SECCIÓN 1: MATRIZ DE AUTORIZACIÓN RBAC
  // =========================================================================
  describe('1. Verificación de Matriz RBAC (Bioanalista vs. Coordinador)', () => {
    it('Bioanalista puede consultar el catálogo de neveras (GET /api/lab/fridges -> 200 OK)', async () => {
      const res = await request(app)
        .get('/api/lab/fridges')
        .set('Authorization', `Bearer ${bioToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('SUCCESS');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('Bioanalista puede abrir en mesón un frasco vigente (POST /api/lab/units/:id/open -> 200 OK)', async () => {
      const res = await request(app)
        .post(`/api/lab/units/${validSealedUnit.id}/open`)
        .set('Authorization', `Bearer ${bioToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('SUCCESS');
      expect(res.body.data.status).toBe(LabUnitStatus.EN_USO);
      expect(res.body.data.openedAt).toBeTruthy();
    });

    it('Bioanalista recibe 403 Forbidden al intentar aprobar solicitud interna (POST /api/lab/requests/:id/approve)', async () => {
      const res = await request(app)
        .post(`/api/lab/requests/${testInternalRequest.id}/approve`)
        .set('Authorization', `Bearer ${bioToken}`)
        .send({
          reviewNotes: 'Intento no autorizado de auto-aprobación',
        });

      expect(res.status).toBe(403);
    });

    it('Bioanalista recibe 403 Forbidden al intentar enviar un frasco a cuarentena técnica (POST /api/lab/units/:id/quarantine)', async () => {
      const res = await request(app)
        .post(`/api/lab/units/${unitForQuarantine.id}/quarantine`)
        .set('Authorization', `Bearer ${bioToken}`)
        .send({
          reason: QuarantineReason.COLD_CHAIN_BREAK,
          notes: `${PREFIX}Intento de cuarentena por bioanalista`,
        });

      expect(res.status).toBe(403);
    });

    it('Bioanalista recibe 403 Forbidden al intentar conciliar un arqueo físico (POST /api/lab/fridge-audits/:id/reconcile)', async () => {
      const res = await request(app)
        .post(`/api/lab/fridge-audits/${testAudit.id}/reconcile`)
        .set('Authorization', `Bearer ${bioToken}`);

      expect(res.status).toBe(403);
    });

    it('Coordinador de Laboratorio aprueba exitosamente la solicitud interna (POST /api/lab/requests/:id/approve -> 200 OK)', async () => {
      const res = await request(app)
        .post(`/api/lab/requests/${testInternalRequest.id}/approve`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          reviewNotes: `${PREFIX}Aprobación autorizada por coordinación`,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('SUCCESS');
      expect(res.body.data.status).toBe('APPROVED');
    });

    it('Coordinador de Laboratorio aísla frasco en cuarentena técnica (POST /api/lab/units/:id/quarantine -> 200 OK)', async () => {
      const res = await request(app)
        .post(`/api/lab/units/${unitForQuarantine.id}/quarantine`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          quarantineReason: QuarantineReason.COLD_CHAIN_BREAK,
          description: `${PREFIX}Aislamiento preventivo por alerta de temperatura`,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('SUCCESS');
      expect(res.body.data.unit.status).toBe(LabUnitStatus.INTERNAL_QUARANTINE);
      expect(res.body.data.incident).toBeTruthy();
    });

    it('Coordinador de Laboratorio ejecuta la reconciliación 1-clic del arqueo (POST /api/lab/fridge-audits/:id/reconcile -> 200 OK)', async () => {
      const res = await request(app)
        .post(`/api/lab/fridge-audits/${testAudit.id}/reconcile`)
        .set('Authorization', `Bearer ${coordToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('SUCCESS');

      // Validar que el frasco ajustó su saldo físico en base de datos
      const unitAfter = await prisma.labReagentUnit.findUnique({
        where: { id: inUseUnit.id },
      });
      expect(unitAfter?.remainingUses).toBe(65);
    });
  });

  // =========================================================================
  // SECCIÓN 2: VALIDACIÓN DE REGLAS DE NEGOCIO Y CONTRATOS HTTP
  // =========================================================================
  describe('2. Validación de Reglas de Negocio y Contratos HTTP', () => {
    it('Caso Borde E2: Apertura en mesón de frasco vencido es bloqueada (POST /api/lab/units/:id/open -> 400 Bad Request)', async () => {
      const res = await request(app)
        .post(`/api/lab/units/${expiredUnit.id}/open`)
        .set('Authorization', `Bearer ${bioToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message.toLowerCase()).toContain('vencida');
    });

    it('Consumo Rápido Individual atómico (POST /api/lab/runs/quick-consume -> 201 Created)', async () => {
      const usesBefore = (await prisma.labReagentUnit.findUnique({ where: { id: validSealedUnit.id } }))?.remainingUses || 96;

      const res = await request(app)
        .post('/api/lab/runs/quick-consume')
        .set('Authorization', `Bearer ${bioToken}`)
        .send({
          examId: testExam.id,
          labAreaId: testArea.id,
          unitId: validSealedUnit.id.toString(),
          validPatientsCount: 2,
          notes: `${PREFIX}Prueba rápida individual por bioanalista`,
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('SUCCESS');
      expect(res.body.data.status).toBe(LabWeeklyRunStatus.CLOSED_RECONCILED);
      expect(res.body.data.totalValidPatientExams).toBe(2);

      const unitAfter = await prisma.labReagentUnit.findUnique({ where: { id: validSealedUnit.id } });
      // Se descontaron 2 determinaciones de pacientes
      expect(unitAfter?.remainingUses).toBe(usesBefore - 2);
    });

    it('Caso Borde E5: Corrida fallida por calibración (POST /api/lab/runs/:id/fail-calibration -> 200 OK)', async () => {
      // Creamos una corrida para fallarla
      const runToFail = await prisma.labWeeklyRun.create({
        data: {
          code: `RUN-${PREFIX}FAIL-001`,
          labAreaId: testArea.id,
          labExamId: testExam.id,
          bioanalystId: bioUser.id,
          weekStartDate: new Date(),
          weekEndDate: new Date(),
          status: LabWeeklyRunStatus.OPEN_ACCUMULATING,
          notes: `${PREFIX}Corrida que fallará por curva de calibración`,
        },
      });

      const res = await request(app)
        .post(`/api/lab/runs/${runToFail.id}/fail-calibration`)
        .set('Authorization', `Bearer ${bioToken}`)
        .send({
          unitId: validSealedUnit.id.toString(),
          totalWellsWasted: 6,
          calibratorUses: 4,
          controlUses: 2,
          notes: `${PREFIX}Falla por coeficiente de variación fuera de rango`,
          autoCloneNewRun: true,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('SUCCESS');
      expect(res.body.data.failedRun.status).toBe(LabWeeklyRunStatus.CLOSED_RECONCILED);
      expect(res.body.data.failedRun.totalValidPatientExams).toBe(0);
      expect(res.body.data.clonedRun).toBeTruthy();
      expect(res.body.data.clonedRun.status).toBe(LabWeeklyRunStatus.OPEN_ACCUMULATING);
    });

    it('Cierre de corrida semanal estándar (POST /api/lab/runs/:id/close -> 200 OK)', async () => {
      const res = await request(app)
        .post(`/api/lab/runs/${testWeeklyRun.id}/close`)
        .set('Authorization', `Bearer ${bioToken}`)
        .send({
          totalValidPatientExams: 10,
          notes: `${PREFIX}Cierre regular de corrida semanal`,
          consumptions: [
            {
              labReagentUnitId: validSealedUnit.id.toString(),
              patientUses: 10,
              calibratorUses: 4,
              controlUses: 2,
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('SUCCESS');
      expect(res.body.data.status).toBe(LabWeeklyRunStatus.CLOSED_RECONCILED);
      expect(res.body.data.totalValidPatientExams).toBe(10);
    });
  });
});
