import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { getAdminAuthToken, getAuthTokenForRoles } from './setup.js';
import { prisma } from '../src/config/prisma.js';
import {
  LabItemType,
  StockOwnership,
  LabUnitStatus,
  QuarantineReason,
  QuarantineResolutionStatus,
  QuarantineInstanceType,
} from '@prisma/client';

describe('FASE 1: Esquema Base, Conversión a Usos y Cuarentena Doble', () => {
  let adminToken: string;
  let labToken: string;
  let testUserId: number;
  let testCategoryId: number;
  let testUnitId: number;
  let testLocationId: number;
  let testFridgeId: number;
  let createdAreaId: number;
  let createdExamId: number;
  let testProductId: string;

  beforeAll(async () => {
    adminToken = getAdminAuthToken();
    labToken = getAuthTokenForRoles(['LABORATORIO']);

    // Limpieza de datos previos de pruebas
    await prisma.batchIncident.deleteMany({
      where: {
        OR: [
          { labArea: { code: 'AREA-INMUNO' } },
          { labReagentUnit: { unitCode: { contains: 'LOT-HIV' } } },
        ],
      },
    });
    await prisma.labStockMovement.deleteMany({
      where: { labReagentUnit: { unitCode: { contains: 'LOT-HIV' } } },
    });
    await prisma.labReagentUnit.deleteMany({
      where: { unitCode: { contains: 'LOT-HIV' } },
    });
    await prisma.stockBatch.deleteMany({
      where: { lotNumber: { in: ['LOT-HIV-2026-A', 'LOT-HIV-DONACION'] } },
    });
    await prisma.labExamProduct.deleteMany({
      where: { product: { name: 'Kit ELISA HIV 96 Determinaciones' } },
    });
    await prisma.labAreaProduct.deleteMany({
      where: { product: { name: 'Kit ELISA HIV 96 Determinaciones' } },
    });
    await prisma.product.deleteMany({
      where: { name: 'Kit ELISA HIV 96 Determinaciones' },
    });
    await prisma.labExam.deleteMany({
      where: { code: 'EXAM-HIV-ELISA' },
    });
    await prisma.userLabArea.deleteMany({
      where: { labArea: { code: 'AREA-INMUNO' } },
    });
    await prisma.labArea.deleteMany({
      where: { code: 'AREA-INMUNO' },
    });

    // Asegurar usuario para tests
    const user = await prisma.user.upsert({
      where: { username: 'bioanalista_test' },
      update: {},
      create: {
        username: 'bioanalista_test',
        email: 'bioanalista@idi.ucv.ve',
        passwordHash: 'dummy_hash',
        fullName: 'Lic. María Pérez',
        department: 'Inmunología',
        isActive: true,
      },
    });
    testUserId = user.id;

    // Categoría y Unidad base
    const category = await prisma.category.upsert({
      where: { name: 'Reactivos Fase 1' },
      update: {},
      create: { name: 'Reactivos Fase 1', description: 'Categoría para tests de Fase 1' },
    });
    testCategoryId = category.id;

    const unit = await prisma.unit.upsert({
      where: { abbreviation: 'KIT-P1' },
      update: {},
      create: { name: 'Kit Diagnóstico', abbreviation: 'KIT-P1' },
    });
    testUnitId = unit.id;

    // Proyecto de Investigación mock para soporte FK
    await prisma.researchProject.upsert({
      where: { id: 55 },
      update: {},
      create: {
        id: 55,
        code: 'PRJ-TEST-P1',
        title: 'Proyecto Mock Fase 1',
        type: 'INSTITUTIONAL',
      },
    });

    // Ubicación de almacén
    const location = await prisma.location.upsert({
      where: { id: 888 },
      update: {},
      create: {
        id: 888,
        name: 'Laboratorio de Inmunoquímica',
        type: 'LABORATORIO',
        description: 'Ubicación física para tests de laboratorio',
      },
    });
    testLocationId = location.id;

    // Nevera
    const fridge = await prisma.fridge.upsert({
      where: { code: 'NEV-INMUNO-01' },
      update: {},
      create: {
        locationId: testLocationId,
        code: 'NEV-INMUNO-01',
        name: 'Nevera Reactivos ELISA',
        targetTempCelsius: 4.0,
        description: 'Nevera de 2 a 8 grados',
      },
    });
    testFridgeId = fridge.id;
  });

  // =========================================================================
  // 1. Áreas de Laboratorio y Catálogo de Exámenes (LabArea y LabExam)
  // =========================================================================
  describe('1. Áreas de Laboratorio y Catálogo de Exámenes', () => {
    it('Debe crear un Área de Laboratorio (LabArea)', async () => {
      const res = await request(app)
        .post('/api/lab/areas')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'AREA-INMUNO',
          name: 'Área de Inmunología Clínica',
          description: 'Diagnósticos serológicos y pruebas ELISA',
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.code).toBe('AREA-INMUNO');
      createdAreaId = res.body.data.id;
    });

    it('Debe vincular a un bioanalista (User) con el área de laboratorio (M:N)', async () => {
      const res = await request(app)
        .post(`/api/lab/areas/${createdAreaId}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          userIds: [testUserId],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.users).toHaveLength(1);
      expect(res.body.data.users[0].userId).toBe(testUserId);

      // Verificar endpoint de áreas del usuario
      const userAreasRes = await request(app)
        .get(`/api/lab/users/${testUserId}/areas`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(userAreasRes.status).toBe(200);
      expect(userAreasRes.body.data.some((a: any) => a.labAreaId === createdAreaId)).toBe(true);
    });

    it('Debe registrar un examen (LabExam) vinculado al área de laboratorio', async () => {
      const res = await request(app)
        .post('/api/lab/exams')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'EXAM-HIV-ELISA',
          name: 'Detección de Anticuerpos HIV 1/2 ELISA',
          description: 'Prueba serológica de 4ta generación',
          areaId: createdAreaId,
        });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.code).toBe('EXAM-HIV-ELISA');
      expect(res.body.data.areaId).toBe(createdAreaId);
      createdExamId = res.body.data.id;
    });

    it('Debe listar los exámenes filtrando por área de laboratorio', async () => {
      const res = await request(app)
        .get(`/api/lab/exams?areaId=${createdAreaId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((e: any) => e.id === createdExamId)).toBe(true);
    });
  });

  // =========================================================================
  // 2. Extensión del Catálogo de Productos / Reactivos (Conversión Compra -> Consumo)
  // =========================================================================
  describe('2. Catálogo de Productos / Reactivos y compatibilidades', () => {
    it('Debe registrar un reactivo con configuración de rendimiento, calibrador y relaciones M:N', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Kit ELISA HIV 96 Determinaciones',
          categoryId: testCategoryId,
          baseUnitId: testUnitId,
          isLabReagent: true,
          labItemType: LabItemType.REAGENT_KIT,
          theoreticalYield: 96,
          includesCalibrator: true,
          calibratorsPerRun: 2,
          allowedLabAreaIds: [createdAreaId],
          compatibleExamIds: [createdExamId],
        });

      expect(res.status).toBe(201);
      const prod = res.body.data;
      expect(prod.isLabReagent).toBe(true);
      // Sincronización limpia con isReagent y conversionFactor
      expect(prod.isReagent).toBe(true);
      expect(prod.theoreticalYield).toBe(96);
      expect(Number(prod.conversionFactor)).toBe(96);
      expect(prod.includesCalibrator).toBe(true);
      expect(prod.calibratorsPerRun).toBe(2);
      expect(prod.allowedLabAreas).toHaveLength(1);
      expect(prod.compatibleExams).toHaveLength(1);
      testProductId = prod.id;
    });

    it('Debe listar reactivos filtrando por área de laboratorio autorizada', async () => {
      const res = await request(app)
        .get(`/api/products?labAreaId=${createdAreaId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.some((p: any) => String(p.id) === String(testProductId))).toBe(true);
    });
  });

  // =========================================================================
  // 3. Extensión de Lotes en Nevera (Contadores de Rendimiento y Propiedad)
  // =========================================================================
  describe('3. Ingreso de Lotes a Nevera y Cálculo de Rendimiento', () => {
    let testProductId: bigint;
    let standardBatchId: bigint;
    let donationBatchId: bigint;

    beforeAll(async () => {
      const prod = await prisma.product.findFirst({
        where: { name: 'Kit ELISA HIV 96 Determinaciones' },
      });
      testProductId = prod!.id;

      // Crear lote estándar con costo
      const batch1 = await prisma.stockBatch.create({
        data: {
          productId: testProductId,
          locationId: testLocationId,
          lotNumber: 'LOT-HIV-2026-A',
          currentQuantity: 2, // 2 cajas
          costPrice: 150.0, // $150 por caja
          expirationDate: new Date('2027-12-31'),
          ownershipType: StockOwnership.CLINICAL_ROUTINE,
        },
      });
      standardBatchId = batch1.id;

      // Crear lote de donación
      const batch2 = await prisma.stockBatch.create({
        data: {
          productId: testProductId,
          locationId: testLocationId,
          lotNumber: 'LOT-HIV-DONACION',
          currentQuantity: 1, // 1 caja
          costPrice: 120.0, // valor contable referencial
          expirationDate: new Date('2027-12-31'),
          origin: 'DONACION',
          ownershipType: StockOwnership.RESEARCH_PROJECT,
          researchProjectId: 55, // Proyecto de Investigación ID 55
        },
      });
      donationBatchId = batch2.id;
    });

    it('Debe ingresar lote estándar a nevera calculando initialTheoreticalUses y unitCostPerUse exacto', async () => {
      // 2 cajas x 96 determinaciones = 192 usos
      // Costo total = 150 * 2 = 300
      // Costo por uso = 300 / 192 = 1.5625
      const res = await request(app)
        .post(`/api/lab/fridges/${testFridgeId}/assign-batch`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          batchId: standardBatchId.toString(),
          quantityBoxes: 2,
          ownershipType: StockOwnership.CLINICAL_ROUTINE,
          notes: 'Ingreso rutinario de 2 kits a nevera ELISA',
        });

      expect(res.status).toBe(200);
      const unit = res.body.data.unit;
      expect(unit).toBeDefined();
      expect(unit.initialTheoreticalUses).toBe(192);
      expect(unit.remainingUses).toBe(192);
      expect(unit.consumedUses).toBe(0);
      expect(unit.yieldVariance).toBe(0);
      expect(Number(unit.unitCostPerUse)).toBeCloseTo(1.5625, 4);
      expect(unit.referenceCostPerUse).toBeNull();
      expect(unit.status).toBe(LabUnitStatus.SELLADO);
      expect(unit.ownershipType).toBe(StockOwnership.CLINICAL_ROUTINE);
    });

    it('Debe ingresar lote de donación con unitCostPerUse = 0 y referenceCostPerUse poblado', async () => {
      // 1 caja x 96 = 96 usos.
      // Donación -> unitCostPerUse = 0, referenceCostPerUse = 120 / 96 = 1.25
      const res = await request(app)
        .post(`/api/lab/fridges/${testFridgeId}/assign-batch`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          batchId: donationBatchId.toString(),
          quantityBoxes: 1,
          isDonation: true,
          ownershipType: StockOwnership.RESEARCH_PROJECT,
          researchProjectId: 55,
          notes: 'Ingreso de kit para Proyecto de Investigación #55',
        });

      expect(res.status).toBe(200);
      const unit = res.body.data.unit;
      expect(unit.initialTheoreticalUses).toBe(96);
      expect(unit.remainingUses).toBe(96);
      expect(Number(unit.unitCostPerUse)).toBe(0);
      expect(Number(unit.referenceCostPerUse)).toBeCloseTo(1.25, 2);
      expect(unit.ownershipType).toBe(StockOwnership.RESEARCH_PROJECT);
      expect(unit.researchProjectId).toBe(55);
    });
  });

  // =========================================================================
  // 4. Cuarentena de Doble Instancia (Compras vs. Laboratorio)
  // =========================================================================
  describe('4. Cuarentena Interna de Laboratorio y Bloqueo de Consumo', () => {
    let unitInFridgeId: string;
    let incidentId: string;

    beforeAll(async () => {
      const unit = await prisma.labReagentUnit.findFirst({
        where: {
          batch: { lotNumber: 'LOT-HIV-2026-A' },
          status: LabUnitStatus.SELLADO,
        },
      });
      unitInFridgeId = unit!.id.toString();
    });

    it('Debe activar la Cuarentena Interna sobre el reactivo en nevera', async () => {
      const res = await request(app)
        .post(`/api/lab/units/${unitInFridgeId}/quarantine`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          quarantineReason: QuarantineReason.COLD_CHAIN_BREAK,
          description: 'Falla temporal del compresor de la nevera por 4 horas',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.unit.status).toBe(LabUnitStatus.INTERNAL_QUARANTINE);

      // Sigue figurando en la nevera física
      expect(res.body.data.unit.fridgeId).toBe(testFridgeId);

      const incident = res.body.data.incident;
      expect(incident.instanceType).toBe(QuarantineInstanceType.INTERNAL_LAB);
      expect(incident.quarantineReason).toBe(QuarantineReason.COLD_CHAIN_BREAK);
      expect(incident.resolutionStatus).toBe(QuarantineResolutionStatus.PENDING);
      expect(incident.affectedUses).toBe(192);

      incidentId = incident.id.toString();
    });

    it('Debe BLOQUEAR el consumo de un reactivo que se encuentra en INTERNAL_QUARANTINE', async () => {
      const res = await request(app)
        .post(`/api/lab/units/${unitInFridgeId}/consume`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amountUsed: 10,
          reason: 'Intento de corrida clínica',
        });

      // Debe ser rechazado (Bad Request / Error controlado)
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.message).toContain('CUARENTENA INTERNA');
    });

    it('Debe consultar el contenido de la nevera e incluir la unidad en cuarentena con su estado visible', async () => {
      const res = await request(app)
        .get(`/api/lab/fridges/${testFridgeId}/contents`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const unitsInFridge = res.body.data.labReagentUnits;
      const qUnit = unitsInFridge.find((u: any) => String(u.id) === String(unitInFridgeId));
      expect(qUnit).toBeDefined();
      expect(qUnit.status).toBe(LabUnitStatus.INTERNAL_QUARANTINE);
    });

    it('Debe resolver la cuarentena con REINTEGRATED_TO_STOCK devolviendo la unidad a SELLADO/EN_USO', async () => {
      const res = await request(app)
        .post(`/api/lab/quarantine/${incidentId}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resolutionStatus: QuarantineResolutionStatus.REINTEGRATED_TO_STOCK,
          resolutionNotes: 'Control de calidad positivo, lote validado por bioanalista senior',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.incident.resolutionStatus).toBe(QuarantineResolutionStatus.REINTEGRATED_TO_STOCK);
      expect(res.body.data.unit.status).toBe(LabUnitStatus.SELLADO);
    });

    it('Debe permitir consumir usos una vez reintegrado el stock de la cuarentena', async () => {
      const res = await request(app)
        .post(`/api/lab/units/${unitInFridgeId}/consume`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amountUsed: 12,
          reason: 'Corrida ELISA 10 muestras + 2 calibradores',
        });

      expect(res.status).toBe(200);
      const updatedUnit = res.body.data;
      expect(updatedUnit.status).toBe(LabUnitStatus.EN_USO);
      expect(updatedUnit.consumedUses).toBe(12);
      expect(updatedUnit.remainingUses).toBe(180); // 192 - 12
    });

    it('Debe resolver una segunda cuarentena con WRITTEN_OFF_AS_LOSS pasando la unidad a DISCARDED', async () => {
      // Poner en cuarentena nuevamente por contaminación
      const qRes = await request(app)
        .post(`/api/lab/units/${unitInFridgeId}/quarantine`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          quarantineReason: QuarantineReason.CONTAMINATION,
          description: 'Presencia de turbidez y precipitado en el reactivo',
        });

      expect(qRes.status).toBe(200);
      const secondIncidentId = qRes.body.data.incident.id;

      // Resolver como pérdida definitiva
      const resolveRes = await request(app)
        .post(`/api/lab/quarantine/${secondIncidentId}/resolve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          resolutionStatus: QuarantineResolutionStatus.WRITTEN_OFF_AS_LOSS,
          resolutionNotes: 'Descarte total aprobado por merma de contaminación biológica',
        });

      expect(resolveRes.status).toBe(200);
      expect(resolveRes.body.data.unit.status).toBe(LabUnitStatus.DISCARDED);
      expect(resolveRes.body.data.unit.remainingUses).toBe(0);
      expect(resolveRes.body.data.unit.yieldVariance).toBe(-180); // Merma de los 180 usos no aprovechados
    });
  });
});
