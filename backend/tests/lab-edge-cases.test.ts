import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import {
  LabItemType,
  StockOwnership,
  LabUnitStatus,
  LocationType,
  ConsumptionConcept,
  RepeatReason,
  FridgeAuditAdjustmentStatus,
} from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'jwt_default_secret_key';

function createToken(userId: number, username: string, roles: string[]): string {
  return jwt.sign(
    {
      id: userId,
      username,
      email: `${username}@idi.ucv.ve`,
      department: 'Laboratorio',
      roles,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('FASE 2A: Casos Borde y Smart Defaults del Módulo de Laboratorio Clínico', () => {
  let coordUser: any;
  let bioUser: any;
  let coordToken: string;
  let bioToken: string;

  let testArea: any;
  let testExam: any;
  let testProduct: any;
  let testFridge: any;
  let testLocation: any;
  let testBatch: any;

  beforeAll(async () => {
    // 1. Limpieza de datos previos para la suite
    await prisma.labConsumptionAuditLog.deleteMany({
      where: {
        labReagentUnit: { unitCode: { contains: 'EDGE-UNIT' } },
      },
    });

    await prisma.labRunConsumption.deleteMany({
      where: {
        run: { labArea: { code: 'AREA-EDGE-TEST' } },
      },
    });

    await prisma.labWeeklyRun.deleteMany({
      where: { labArea: { code: 'AREA-EDGE-TEST' } },
    });

    await prisma.labStockMovement.deleteMany({
      where: {
        labReagentUnit: { unitCode: { contains: 'EDGE-UNIT' } },
      },
    });

    await prisma.fridgePhysicalAuditItem.deleteMany({
      where: {
        labReagentUnit: { unitCode: { contains: 'EDGE-UNIT' } },
      },
    });

    await prisma.fridgePhysicalAudit.deleteMany({
      where: {
        notes: { contains: 'discrepancias pendientes' },
      },
    });

    await prisma.labReagentUnit.deleteMany({
      where: { unitCode: { contains: 'EDGE-UNIT' } },
    });

    await prisma.labExamProduct.deleteMany({
      where: { labExam: { code: 'EXAM-EDGE-TEST' } },
    });

    await prisma.labExam.deleteMany({
      where: { code: 'EXAM-EDGE-TEST' },
    });

    await prisma.stockBatch.deleteMany({
      where: { lotNumber: { contains: 'LOT-EDGE' } },
    });

    await prisma.product.deleteMany({
      where: { sku: 'PROD-EDGE-TEST' },
    });

    // 2. Usuarios de prueba
    coordUser = await prisma.user.upsert({
      where: { username: 'coord_edge_test' },
      update: {},
      create: {
        username: 'coord_edge_test',
        fullName: 'Coordinador Edge Test',
        email: 'coord_edge@idi.ucv.ve',
        passwordHash: 'dummyhash',
        department: 'Laboratorio',
        isActive: true,
      },
    });

    bioUser = await prisma.user.upsert({
      where: { username: 'bio_edge_test' },
      update: {},
      create: {
        username: 'bio_edge_test',
        fullName: 'Bioanalista Edge Test',
        email: 'bio_edge@idi.ucv.ve',
        passwordHash: 'dummyhash',
        department: 'Laboratorio',
        isActive: true,
      },
    });

    coordToken = createToken(coordUser.id, coordUser.username, ['COORDINADOR_LABORATORIO']);
    bioToken = createToken(bioUser.id, bioUser.username, ['BIOANALISTA', 'LABORATORIO']);

    // 3. Área de Laboratorio
    testArea = await prisma.labArea.upsert({
      where: { code: 'AREA-EDGE-TEST' },
      update: {},
      create: {
        code: 'AREA-EDGE-TEST',
        name: 'Área de Pruebas Edge',
        description: 'Pruebas unitarias de casos borde',
        isActive: true,
      },
    });

    // Asignar bioanalista al área
    await prisma.userLabArea.deleteMany({
      where: {
        userId: bioUser.id,
        labAreaId: testArea.id,
      },
    });
    await prisma.userLabArea.create({
      data: {
        userId: bioUser.id,
        labAreaId: testArea.id,
      },
    });

    // 4. Ubicación y Nevera
    testLocation = await prisma.location.upsert({
      where: { id: 991 },
      update: {},
      create: {
        id: 991,
        name: 'Almacén Central Edge Tests',
        type: LocationType.ALMACEN_GENERAL,
      },
    });

    testFridge = await prisma.fridge.upsert({
      where: { code: 'FRIDGE-EDGE-01' },
      update: {},
      create: {
        code: 'FRIDGE-EDGE-01',
        name: 'Nevera Edge Cases',
        locationId: testLocation.id,
        targetTempCelsius: 4.0,
      },
    });

    // 5. Categoría y Unidad Base
    const category = await prisma.category.upsert({
      where: { name: 'Reactivos Edge Test' },
      update: {},
      create: {
        name: 'Reactivos Edge Test',
        description: 'Categoría para pruebas edge',
      },
    });

    const unit = await prisma.unit.upsert({
      where: { abbreviation: 'KIT-EDGE' },
      update: {},
      create: {
        name: 'Kit Edge',
        abbreviation: 'KIT-EDGE',
      },
    });

    // 6. Producto
    testProduct = await prisma.product.create({
      data: {
        categoryId: category.id,
        baseUnitId: unit.id,
        sku: 'PROD-EDGE-TEST',
        name: 'Kit Reactivo Edge Test 100T',
        isReagent: true,
        isLabReagent: true,
        labItemType: LabItemType.REAGENT_KIT,
        theoreticalYield: 100,
      },
    });

    // 7. Lote
    testBatch = await prisma.stockBatch.create({
      data: {
        productId: testProduct.id,
        locationId: testLocation.id,
        lotNumber: 'LOT-EDGE-001',
        currentQuantity: 10,
        costPrice: 150.0,
        expirationDate: new Date('2029-12-31'),
        ownershipType: StockOwnership.CLINICAL_ROUTINE,
      },
    });

    // 8. Examen con Smart Defaults (2 calibradores, 1 control por corrida)
    testExam = await prisma.labExam.create({
      data: {
        code: 'EXAM-EDGE-TEST',
        name: 'Examen de Prueba Edge',
        areaId: testArea.id,
        defaultCalibratorUses: 2,
        defaultControlUses: 1,
        compatibleProducts: {
          create: {
            productId: testProduct.id,
          },
        },
      },
    });
  });

  // =========================================================================
  // SMART DEFAULTS EN APERTURA Y CIERRE
  // =========================================================================
  it('Smart Defaults: Debe aplicar calibratorUses y controlUses por defecto cuando se omiten en el cierre', async () => {
    // 1. Crear frasco sellado de 50 usos
    const unit = await prisma.labReagentUnit.create({
      data: {
        unitCode: 'EDGE-UNIT-SMART-1',
        productId: testProduct.id,
        batchId: testBatch.id,
        ownershipType: StockOwnership.CLINICAL_ROUTINE,
        initialVolume: 50,
        currentVolume: 50,
        initialTheoreticalUses: 50,
        remainingUses: 50,
        unitCostPerUse: 1.5,
        status: LabUnitStatus.SELLADO,
        assignedLabAreaId: testArea.id,
        fridgeId: testFridge.id,
        expirationDate: new Date('2029-12-31'),
      },
    });

    // 2. Abrir corrida
    const runRes = await request(app)
      .post('/api/lab/runs')
      .set('Authorization', `Bearer ${bioToken}`)
      .send({
        labAreaId: testArea.id,
        labExamId: testExam.id,
        weekStartDate: '2026-11-09T00:00:00.000Z',
        weekEndDate: '2026-11-15T23:59:59.000Z',
        notes: 'Corrida para probar Smart Defaults',
      });

    expect(runRes.status).toBe(201);
    const runId = runRes.body.data.id;

    // 3. Cerrar corrida enviando SOLO patientUses: 10 (omitiendo calibratorUses y controlUses)
    const closeRes = await request(app)
      .post(`/api/lab/runs/${runId}/close`)
      .set('Authorization', `Bearer ${bioToken}`)
      .send({
        totalValidPatientExams: 10,
        consumptions: [
          {
            labReagentUnitId: unit.id.toString(),
            patientUses: 10,
            // calibratorUses omitido -> debe tomar 2 (defaultCalibratorUses)
            // controlUses omitido -> debe tomar 1 (defaultControlUses)
          },
        ],
      });

    expect(closeRes.status).toBe(200);

    // 4. Verificar saldo: 50 - (10 pacientes + 2 calibradores + 1 control) = 37
    const updatedUnit = await prisma.labReagentUnit.findUnique({
      where: { id: unit.id },
    });
    expect(updatedUnit?.remainingUses).toBe(37);
    expect(updatedUnit?.status).toBe(LabUnitStatus.EN_USO); // Transición automática SELLADO -> EN_USO

    // 5. Verificar registro de corrida y consumos
    const consumption = await prisma.labRunConsumption.findFirst({
      where: { runId, labReagentUnitId: unit.id },
    });
    expect(consumption?.patientUses).toBe(10);
    expect(consumption?.calibratorUses).toBe(2);
    expect(consumption?.controlUses).toBe(1);
    expect(consumption?.totalDeductedUses).toBe(13);
  });

  // =========================================================================
  // CASO BORDE E1: AUTO-ROLLOVER CUANDO EL FRASCO A SE AGOTA A MITAD DE CORRIDA
  // =========================================================================
  it('Caso Borde E1: Debe ejecutar Auto-Rollover fraccionando consumo entre Frasco A (agotado) y Frasco B (nuevo)', async () => {
    // Frasco A: solo le quedan 8 usos (en uso)
    const unitA = await prisma.labReagentUnit.create({
      data: {
        unitCode: 'EDGE-UNIT-ROLL-A',
        productId: testProduct.id,
        batchId: testBatch.id,
        ownershipType: StockOwnership.CLINICAL_ROUTINE,
        initialVolume: 50,
        currentVolume: 8,
        initialTheoreticalUses: 50,
        remainingUses: 8,
        unitCostPerUse: 1.5,
        status: LabUnitStatus.EN_USO,
        assignedLabAreaId: testArea.id,
        fridgeId: testFridge.id,
        expirationDate: new Date('2029-12-31'),
      },
    });

    // Frasco B: sellado con 50 usos
    const unitB = await prisma.labReagentUnit.create({
      data: {
        unitCode: 'EDGE-UNIT-ROLL-B',
        productId: testProduct.id,
        batchId: testBatch.id,
        ownershipType: StockOwnership.CLINICAL_ROUTINE,
        initialVolume: 50,
        currentVolume: 50,
        initialTheoreticalUses: 50,
        remainingUses: 50,
        unitCostPerUse: 1.5,
        status: LabUnitStatus.SELLADO,
        assignedLabAreaId: testArea.id,
        fridgeId: testFridge.id,
        expirationDate: new Date('2029-12-31'),
      },
    });

    // Abrir corrida
    const runRes = await request(app)
      .post('/api/lab/runs')
      .set('Authorization', `Bearer ${bioToken}`)
      .send({
        labAreaId: testArea.id,
        labExamId: testExam.id,
        weekStartDate: '2026-11-09T00:00:00.000Z',
        weekEndDate: '2026-11-15T23:59:59.000Z',
        notes: 'Corrida para probar Rollover',
      });
    const runId = runRes.body.data.id;

    // Cerrar corrida: necesitamos 20 pacientes + 0 calibrador + 0 control = 20 usos totales.
    // Frasco A solo tiene 8. Pasamos rolloverUnitId: unitB.id
    const closeRes = await request(app)
      .post(`/api/lab/runs/${runId}/close`)
      .set('Authorization', `Bearer ${bioToken}`)
      .send({
        totalValidPatientExams: 20,
        consumptions: [
          {
            labReagentUnitId: unitA.id.toString(),
            rolloverUnitId: unitB.id.toString(),
            patientUses: 20,
            calibratorUses: 0,
            controlUses: 0,
          },
        ],
      });

    expect(closeRes.status).toBe(200);

    // Verificar Frasco A: consumió 8, remainingUses = 0, status = AGOTADO
    const updatedA = await prisma.labReagentUnit.findUnique({
      where: { id: unitA.id },
    });
    expect(updatedA?.remainingUses).toBe(0);
    expect(updatedA?.status).toBe(LabUnitStatus.AGOTADO);

    // Verificar Frasco B: consumió 20 - 8 = 12, remainingUses = 50 - 12 = 38, status = EN_USO
    const updatedB = await prisma.labReagentUnit.findUnique({
      where: { id: unitB.id },
    });
    expect(updatedB?.remainingUses).toBe(38);
    expect(updatedB?.status).toBe(LabUnitStatus.EN_USO);
    expect(updatedB?.openedAt).toBeDefined();
    expect(updatedB?.openedById).toBe(bioUser.id);

    // Verificar que se crearon dos registros en LabRunConsumption
    const consumptions = await prisma.labRunConsumption.findMany({
      where: { runId },
      orderBy: { id: 'asc' },
    });
    expect(consumptions.length).toBe(2);
    expect(consumptions[0].labReagentUnitId).toBe(unitA.id);
    expect(consumptions[0].totalDeductedUses).toBe(8);
    expect(consumptions[1].labReagentUnitId).toBe(unitB.id);
    expect(consumptions[1].totalDeductedUses).toBe(12);

    // Verificar logs de auditoría para ambos frascos
    const auditLogs = await prisma.labConsumptionAuditLog.findMany({
      where: { weeklyRunId: runId },
    });
    expect(auditLogs.length).toBeGreaterThanOrEqual(2);
  });

  // =========================================================================
  // CASO BORDE E2: VENCIMIENTO EN TIEMPO REAL Y OVERRIDE DE COORDINADOR
  // =========================================================================
  it('Caso Borde E2: Debe bloquear el uso de frascos vencidos a bioanalistas, pero permitir override a coordinadores', async () => {
    // Frasco vencido ayer
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const expiredUnit = await prisma.labReagentUnit.create({
      data: {
        unitCode: 'EDGE-UNIT-EXPIRED-1',
        productId: testProduct.id,
        batchId: testBatch.id,
        ownershipType: StockOwnership.CLINICAL_ROUTINE,
        initialVolume: 30,
        currentVolume: 30,
        initialTheoreticalUses: 30,
        remainingUses: 30,
        unitCostPerUse: 1.5,
        status: LabUnitStatus.EN_USO,
        assignedLabAreaId: testArea.id,
        fridgeId: testFridge.id,
        expirationDate: yesterday,
      },
    });

    // 1. Intento por bioanalista sin override -> Rechazado con 400
    const runRes1 = await request(app)
      .post('/api/lab/runs')
      .set('Authorization', `Bearer ${bioToken}`)
      .send({
        labAreaId: testArea.id,
        labExamId: testExam.id,
        weekStartDate: '2026-11-09T00:00:00.000Z',
        weekEndDate: '2026-11-15T23:59:59.000Z',
      });
    const runId1 = runRes1.body.data.id;

    const failBioNoOverride = await request(app)
      .post(`/api/lab/runs/${runId1}/close`)
      .set('Authorization', `Bearer ${bioToken}`)
      .send({
        totalValidPatientExams: 5,
        consumptions: [
          {
            labReagentUnitId: expiredUnit.id.toString(),
            patientUses: 5,
            calibratorUses: 0,
            controlUses: 0,
          },
        ],
      });

    expect(failBioNoOverride.status).toBe(400);
    expect(failBioNoOverride.body.message).toContain('se encuentra VENCIDO');

    // 2. Intento por bioanalista con override -> Rechazado con 400 (no tiene rol supervisor)
    const failBioWithOverride = await request(app)
      .post(`/api/lab/runs/${runId1}/close`)
      .set('Authorization', `Bearer ${bioToken}`)
      .send({
        totalValidPatientExams: 5,
        allowExpiredOverride: true,
        consumptions: [
          {
            labReagentUnitId: expiredUnit.id.toString(),
            patientUses: 5,
            calibratorUses: 0,
            controlUses: 0,
          },
        ],
      });

    expect(failBioWithOverride.status).toBe(400);
    expect(failBioWithOverride.body.message).toContain('Solo un usuario con rol de Coordinación o Administración');

    // 3. Intento por coordinador con allowExpiredOverride: true -> Permitido (200)
    const successCoord = await request(app)
      .post(`/api/lab/runs/${runId1}/close`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({
        totalValidPatientExams: 5,
        allowExpiredOverride: true,
        consumptions: [
          {
            labReagentUnitId: expiredUnit.id.toString(),
            patientUses: 5,
            calibratorUses: 0,
            controlUses: 0,
          },
        ],
      });

    expect(successCoord.status).toBe(200);

    const updatedExpiredUnit = await prisma.labReagentUnit.findUnique({
      where: { id: expiredUnit.id },
    });
    expect(updatedExpiredUnit?.remainingUses).toBe(25);
  });

  // =========================================================================
  // CASO BORDE E4: PROTECCIÓN DE REACTIVOS DE INVESTIGACIÓN (I+D)
  // =========================================================================
  it('Caso Borde E4: Debe impedir rotundamente el consumo de reactivos de I+D en corridas clínicas de rutina', async () => {
    // Frasco perteneciente a I+D
    const researchUnit = await prisma.labReagentUnit.create({
      data: {
        unitCode: 'EDGE-UNIT-RESEARCH-1',
        productId: testProduct.id,
        batchId: testBatch.id,
        ownershipType: StockOwnership.RESEARCH_PROJECT,
        initialVolume: 100,
        currentVolume: 100,
        initialTheoreticalUses: 100,
        remainingUses: 100,
        unitCostPerUse: 2.5,
        status: LabUnitStatus.EN_USO,
        assignedLabAreaId: testArea.id,
        fridgeId: testFridge.id,
        expirationDate: new Date('2029-12-31'),
      },
    });

    const runRes = await request(app)
      .post('/api/lab/runs')
      .set('Authorization', `Bearer ${coordToken}`)
      .send({
        labAreaId: testArea.id,
        labExamId: testExam.id,
        weekStartDate: '2026-11-09T00:00:00.000Z',
        weekEndDate: '2026-11-15T23:59:59.000Z',
      });
    const runId = runRes.body.data.id;

    const res = await request(app)
      .post(`/api/lab/runs/${runId}/close`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({
        totalValidPatientExams: 10,
        consumptions: [
          {
            labReagentUnitId: researchUnit.id.toString(),
            patientUses: 10,
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('investigación');
  });

  // =========================================================================
  // MANEJO DE KIT FÍSICAMENTE AGOTADO (DEFICIT)
  // =========================================================================
  it('Kit Físicamente Agotado: Debe marcar frasco en AGOTADO con saldo 0 y registrar YIELD_DEFICIT si se declara agotado antes de tiempo', async () => {
    const unit = await prisma.labReagentUnit.create({
      data: {
        unitCode: 'EDGE-UNIT-DEFICIT-1',
        productId: testProduct.id,
        batchId: testBatch.id,
        ownershipType: StockOwnership.CLINICAL_ROUTINE,
        initialVolume: 50,
        currentVolume: 35,
        initialTheoreticalUses: 50,
        remainingUses: 35,
        unitCostPerUse: 1.5,
        status: LabUnitStatus.EN_USO,
        assignedLabAreaId: testArea.id,
        fridgeId: testFridge.id,
        expirationDate: new Date('2029-12-31'),
      },
    });

    const runRes = await request(app)
      .post('/api/lab/runs')
      .set('Authorization', `Bearer ${bioToken}`)
      .send({
        labAreaId: testArea.id,
        labExamId: testExam.id,
        weekStartDate: '2026-11-09T00:00:00.000Z',
        weekEndDate: '2026-11-15T23:59:59.000Z',
      });
    const runId = runRes.body.data.id;

    // Se descuentan 15 pacientes (35 - 15 = 20 teóricos restantes)
    // Pero el bioanalista reporta isPhysicallyExhausted: true
    const res = await request(app)
      .post(`/api/lab/runs/${runId}/close`)
      .set('Authorization', `Bearer ${bioToken}`)
      .send({
        totalValidPatientExams: 15,
        consumptions: [
          {
            labReagentUnitId: unit.id.toString(),
            patientUses: 15,
            calibratorUses: 0,
            controlUses: 0,
            isPhysicallyExhausted: true,
          },
        ],
      });

    expect(res.status).toBe(200);

    const updatedUnit = await prisma.labReagentUnit.findUnique({
      where: { id: unit.id },
    });
    expect(updatedUnit?.remainingUses).toBe(0);
    expect(updatedUnit?.status).toBe(LabUnitStatus.AGOTADO);

    // Auditoría: debe existir un log con YIELD_DEFICIT por los 20 usos faltantes
    const deficitLog = await prisma.labConsumptionAuditLog.findFirst({
      where: {
        weeklyRunId: runId,
        labReagentUnitId: unit.id,
        concept: ConsumptionConcept.YIELD_DEFICIT,
      },
    });
    expect(deficitLog).toBeDefined();
    expect(deficitLog?.usesCount).toBe(20);
  });

  // =========================================================================
  // FASE 2B: CONSUMO RÁPIDO / PRUEBA INDIVIDUAL (POST /lab/runs/quick-consume)
  // =========================================================================
  it('Fase 2B: Consumo Rápido debe crear y cerrar corrida en 1 clic manteniendo stock y trazabilidad 5D', async () => {
    const unit = await prisma.labReagentUnit.create({
      data: {
        unitCode: 'EDGE-UNIT-QUICK-1',
        productId: testProduct.id,
        batchId: testBatch.id,
        ownershipType: StockOwnership.CLINICAL_ROUTINE,
        initialVolume: 50,
        currentVolume: 50,
        initialTheoreticalUses: 50,
        remainingUses: 50,
        unitCostPerUse: 2.0,
        status: LabUnitStatus.SELLADO,
        assignedLabAreaId: testArea.id,
        fridgeId: testFridge.id,
        expirationDate: new Date('2029-12-31'),
      },
    });

    const res = await request(app)
      .post('/api/lab/runs/quick-consume')
      .set('Authorization', `Bearer ${bioToken}`)
      .send({
        examId: testExam.id,
        labAreaId: testArea.id,
        unitId: unit.id.toString(),
        validPatientsCount: 3,
        notes: 'Prueba rápida de cassette de urgencia',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('CLOSED_RECONCILED');
    expect(res.body.data.totalValidPatientExams).toBe(3);

    const updatedUnit = await prisma.labReagentUnit.findUnique({
      where: { id: unit.id },
    });
    // 50 - 3 pacientes = 47 usos
    expect(updatedUnit?.remainingUses).toBe(47);
    expect(updatedUnit?.status).toBe(LabUnitStatus.EN_USO);

    // Registro en consumptions
    const consumption = await prisma.labRunConsumption.findFirst({
      where: { runId: res.body.data.id, labReagentUnitId: unit.id },
    });
    expect(consumption?.patientUses).toBe(3);
    expect(consumption?.totalDeductedUses).toBe(3);

    // Auditoría 5D (PATIENT)
    const auditLog = await prisma.labConsumptionAuditLog.findFirst({
      where: {
        weeklyRunId: res.body.data.id,
        labReagentUnitId: unit.id,
        concept: ConsumptionConcept.PATIENT,
      },
    });
    expect(auditLog).toBeDefined();
    expect(auditLog?.usesCount).toBe(3);
  });

  // =========================================================================
  // FASE 2B: CASO BORDE E5 — CORRIDA FALLIDA POR CALIBRACIÓN
  // =========================================================================
  it('Fase 2B Caso Borde E5: Corrida fallida por calibración debe registrar 0 pacientes, repeat por CALIBRATION_FAILURE y clonar corrida', async () => {
    const unit = await prisma.labReagentUnit.create({
      data: {
        unitCode: 'EDGE-UNIT-FAIL-CAL-1',
        productId: testProduct.id,
        batchId: testBatch.id,
        ownershipType: StockOwnership.CLINICAL_ROUTINE,
        initialVolume: 60,
        currentVolume: 60,
        initialTheoreticalUses: 60,
        remainingUses: 60,
        unitCostPerUse: 2.0,
        status: LabUnitStatus.EN_USO,
        assignedLabAreaId: testArea.id,
        fridgeId: testFridge.id,
        expirationDate: new Date('2029-12-31'),
      },
    });

    // Abrir corrida
    const runRes = await request(app)
      .post('/api/lab/runs')
      .set('Authorization', `Bearer ${bioToken}`)
      .send({
        labAreaId: testArea.id,
        labExamId: testExam.id,
        weekStartDate: '2026-11-09T00:00:00.000Z',
        weekEndDate: '2026-11-15T23:59:59.000Z',
      });
    const runId = runRes.body.data.id;

    // Reportar falla por calibración: se gastaron 24 pozos en total
    // 2 calibradores (default) + 1 control (default) + 21 determinaciones de muestras perdidas
    const failRes = await request(app)
      .post(`/api/lab/runs/${runId}/fail-calibration`)
      .set('Authorization', `Bearer ${bioToken}`)
      .send({
        unitId: unit.id.toString(),
        totalWellsWasted: 24,
        autoCloneNewRun: true,
        notes: 'Curva R2 = 0.82 fuera de especificación analítica',
      });

    expect(failRes.status).toBe(200);
    expect(failRes.body.data.failedRun.status).toBe('CLOSED_RECONCILED');
    expect(failRes.body.data.failedRun.totalValidPatientExams).toBe(0);
    expect(failRes.body.data.clonedRun).toBeDefined();
    expect(failRes.body.data.clonedRun.status).toBe('OPEN_ACCUMULATING');

    // Descuento en la unidad: 60 - 24 = 36
    const updatedUnit = await prisma.labReagentUnit.findUnique({
      where: { id: unit.id },
    });
    expect(updatedUnit?.remainingUses).toBe(36);

    // Consumo registrado
    const consumption = await prisma.labRunConsumption.findFirst({
      where: { runId, labReagentUnitId: unit.id },
    });
    expect(consumption?.patientUses).toBe(0);
    expect(consumption?.calibratorUses).toBe(2);
    expect(consumption?.controlUses).toBe(1);
    expect(consumption?.repeatUses).toBe(21);
    expect(consumption?.repeatReason).toBe(RepeatReason.CALIBRATION_FAILURE);

    // Auditoría 5D: deben existir logs REPEAT, CALIBRATION y CONTROL
    const repeatLog = await prisma.labConsumptionAuditLog.findFirst({
      where: { weeklyRunId: runId, concept: ConsumptionConcept.REPEAT },
    });
    expect(repeatLog).toBeDefined();
    expect(repeatLog?.usesCount).toBe(21);

    const calLog = await prisma.labConsumptionAuditLog.findFirst({
      where: { weeklyRunId: runId, concept: ConsumptionConcept.CALIBRATION },
    });
    expect(calLog).toBeDefined();
    expect(calLog?.usesCount).toBe(2);
  });

  // =========================================================================
  // FASE 2B: CASO BORDE E6 — RECONCILIACIÓN EN 1 CLIC DE ARQUEO FÍSICO
  // =========================================================================
  it('Fase 2B Caso Borde E6: Reconciliación de arqueo físico debe regularizar unidades pendientes, ajustar estados y registrar variaciones 5D', async () => {
    const unit1 = await prisma.labReagentUnit.create({
      data: {
        unitCode: 'EDGE-UNIT-AUDIT-1',
        productId: testProduct.id,
        batchId: testBatch.id,
        ownershipType: StockOwnership.CLINICAL_ROUTINE,
        initialVolume: 30,
        currentVolume: 20,
        initialTheoreticalUses: 30,
        remainingUses: 20,
        unitCostPerUse: 2.0,
        status: LabUnitStatus.EN_USO,
        assignedLabAreaId: testArea.id,
        fridgeId: testFridge.id,
        expirationDate: new Date('2029-12-31'),
      },
    });

    const unit2 = await prisma.labReagentUnit.create({
      data: {
        unitCode: 'EDGE-UNIT-AUDIT-2',
        productId: testProduct.id,
        batchId: testBatch.id,
        ownershipType: StockOwnership.CLINICAL_ROUTINE,
        initialVolume: 30,
        currentVolume: 5,
        initialTheoreticalUses: 30,
        remainingUses: 5,
        unitCostPerUse: 2.0,
        status: LabUnitStatus.EN_USO,
        assignedLabAreaId: testArea.id,
        fridgeId: testFridge.id,
        expirationDate: new Date('2029-12-31'),
      },
    });

    // 1. Crear arqueo con autoReconcile: false (modo pendiente de aprobación por coordinación)
    const createAuditRes = await request(app)
      .post('/api/fridge-audits')
      .set('Authorization', `Bearer ${coordToken}`)
      .send({
        notes: 'Arqueo físico con discrepancias pendientes de conciliar',
        autoReconcile: false,
        items: [
          {
            labReagentUnitId: unit1.id.toString(),
            physicalRemainingUses: 14, // merma de -6
            notes: 'Pérdida por derrame accidental',
          },
          {
            labReagentUnitId: unit2.id.toString(),
            physicalRemainingUses: 0, // totalmente agotado (-5)
            notes: 'Frasco agotado encontrado en estante',
          },
        ],
      });

    expect(createAuditRes.status).toBe(201);
    const auditId = createAuditRes.body.data.id;
    expect(createAuditRes.body.data.items[0].adjustmentStatus).toBe(
      FridgeAuditAdjustmentStatus.PENDING_ADJUSTMENT
    );

    // Verificar que antes de reconciliar los stocks siguen intactos
    const preUnit1 = await prisma.labReagentUnit.findUnique({ where: { id: unit1.id } });
    expect(preUnit1?.remainingUses).toBe(20);

    // 2. Intentar reconciliar con rol BIOANALISTA -> 403 Forbidden
    const failBioRes = await request(app)
      .post(`/api/lab/fridge-audits/${auditId}/reconcile`)
      .set('Authorization', `Bearer ${bioToken}`);
    expect(failBioRes.status).toBe(403);

    // 3. Reconciliar como COORDINADOR -> 200 OK
    const reconcileRes = await request(app)
      .post(`/api/lab/fridge-audits/${auditId}/reconcile`)
      .set('Authorization', `Bearer ${coordToken}`);

    expect(reconcileRes.status).toBe(200);
    expect(reconcileRes.body.data.items[0].adjustmentStatus).toBe(
      FridgeAuditAdjustmentStatus.ADJUSTED_AND_RECONCILED
    );
    expect(reconcileRes.body.data.items[1].adjustmentStatus).toBe(
      FridgeAuditAdjustmentStatus.ADJUSTED_AND_RECONCILED
    );

    // Verificar stocks regularizados
    const postUnit1 = await prisma.labReagentUnit.findUnique({ where: { id: unit1.id } });
    expect(postUnit1?.remainingUses).toBe(14);
    expect(postUnit1?.yieldVariance).toBe(-6);

    const postUnit2 = await prisma.labReagentUnit.findUnique({ where: { id: unit2.id } });
    expect(postUnit2?.remainingUses).toBe(0);
    expect(postUnit2?.status).toBe(LabUnitStatus.AGOTADO);
    expect(postUnit2?.yieldVariance).toBe(-5);

    // Verificar auditoría 5D de déficits
    const auditLogs = await prisma.labConsumptionAuditLog.findMany({
      where: {
        concept: ConsumptionConcept.YIELD_DEFICIT,
        labReagentUnitId: { in: [unit1.id, unit2.id] },
      },
    });
    expect(auditLogs.length).toBe(2);

    // Verificar movimientos de stock creados
    const movements = await prisma.labStockMovement.findMany({
      where: {
        labReagentUnitId: { in: [unit1.id, unit2.id] },
      },
    });
    expect(movements.length).toBeGreaterThanOrEqual(2);
  });
});
