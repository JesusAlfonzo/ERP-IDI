import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import {
  LabItemType,
  StockOwnership,
  LabUnitStatus,
  LabInternalRequestStatus,
  LabWeeklyRunStatus,
  RepeatReason,
  ConsumptionConcept,
  LocationType,
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

describe('FASE 2: Flujo Operativo del Laboratorio Clínico', () => {
  let coordUser: any;
  let bioInmunoUser: any;
  let bioHematoUser: any;
  let coordToken: string;
  let bioInmunoToken: string;
  let bioHematoToken: string;

  let areaInmunoId: number;
  let areaHematoId: number;
  let examElisaId: number;
  let testFridgeId: number;

  let productKitId: bigint;
  let productCalibratorId: bigint;

  let kitUnit1Id: bigint;
  let kitUnit2Id: bigint;
  let researchKitUnitId: bigint;
  let calibratorUnitId: bigint;

  let createdRequestId: number;
  let createdRunId: number;

  beforeAll(async () => {
    // 1. Limpieza de datos previos de pruebas
    await prisma.labConsumptionAuditLog.deleteMany({
      where: {
        OR: [
          { labArea: { code: { in: ['AREA-INMUNO-P2', 'AREA-HEMATO-P2'] } } },
          { labReagentUnit: { unitCode: { contains: 'UNIT-P2' } } },
        ],
      },
    });

    await prisma.labRunConsumption.deleteMany({
      where: {
        run: {
          labArea: { code: { in: ['AREA-INMUNO-P2', 'AREA-HEMATO-P2'] } },
        },
      },
    });

    await prisma.labWeeklyRun.deleteMany({
      where: {
        labArea: { code: { in: ['AREA-INMUNO-P2', 'AREA-HEMATO-P2'] } },
      },
    });

    await prisma.labInternalRequestItem.deleteMany({
      where: {
        request: {
          labArea: { code: { in: ['AREA-INMUNO-P2', 'AREA-HEMATO-P2'] } },
        },
      },
    });

    await prisma.labInternalRequest.deleteMany({
      where: {
        labArea: { code: { in: ['AREA-INMUNO-P2', 'AREA-HEMATO-P2'] } },
      },
    });

    await prisma.labStockMovement.deleteMany({
      where: {
        labReagentUnit: { unitCode: { contains: 'UNIT-P2' } },
      },
    });

    await prisma.labReagentUnit.deleteMany({
      where: {
        unitCode: { contains: 'UNIT-P2' },
      },
    });

    await prisma.stockBatch.deleteMany({
      where: {
        lotNumber: { in: ['LOT-KIT-P2-A', 'LOT-KIT-P2-B', 'LOT-CAL-P2', 'LOT-RESEARCH-P2'] },
      },
    });

    await prisma.labExamProduct.deleteMany({
      where: {
        labExam: { code: 'EXAM-ELISA-P2' },
      },
    });

    await prisma.labAreaProduct.deleteMany({
      where: {
        labArea: { code: { in: ['AREA-INMUNO-P2', 'AREA-HEMATO-P2'] } },
      },
    });

    await prisma.labExam.deleteMany({
      where: { code: 'EXAM-ELISA-P2' },
    });

    await prisma.userLabArea.deleteMany({
      where: {
        labArea: { code: { in: ['AREA-INMUNO-P2', 'AREA-HEMATO-P2'] } },
      },
    });

    await prisma.labArea.deleteMany({
      where: { code: { in: ['AREA-INMUNO-P2', 'AREA-HEMATO-P2'] } },
    });

    await prisma.product.deleteMany({
      where: { sku: { in: ['SKU-KIT-ELISA-P2', 'SKU-CAL-P2'] } },
    });

    // 2. Usuarios de prueba
    coordUser = await prisma.user.upsert({
      where: { username: 'coord_lab_p2' },
      update: {},
      create: {
        username: 'coord_lab_p2',
        email: 'coord_p2@idi.ucv.ve',
        passwordHash: 'dummy_hash',
        fullName: 'Dra. Elena Ramos (Coordinadora)',
        department: 'Laboratorio',
        isActive: true,
      },
    });

    bioInmunoUser = await prisma.user.upsert({
      where: { username: 'bio_inmuno_p2' },
      update: {},
      create: {
        username: 'bio_inmuno_p2',
        email: 'bio_inmuno_p2@idi.ucv.ve',
        passwordHash: 'dummy_hash',
        fullName: 'Lic. Carlos Silva (Inmunología)',
        department: 'Laboratorio',
        isActive: true,
      },
    });

    bioHematoUser = await prisma.user.upsert({
      where: { username: 'bio_hemato_p2' },
      update: {},
      create: {
        username: 'bio_hemato_p2',
        email: 'bio_hemato_p2@idi.ucv.ve',
        passwordHash: 'dummy_hash',
        fullName: 'Lic. Diana Gómez (Hematología)',
        department: 'Laboratorio',
        isActive: true,
      },
    });

    coordToken = createToken(coordUser.id, coordUser.username, ['COORDINADOR_LABORATORIO']);
    bioInmunoToken = createToken(bioInmunoUser.id, bioInmunoUser.username, ['BIOANALISTA', 'LABORATORIO']);
    bioHematoToken = createToken(bioHematoUser.id, bioHematoUser.username, ['BIOANALISTA', 'LABORATORIO']);

    // 3. Crear Áreas de Laboratorio
    const areaInmuno = await prisma.labArea.create({
      data: {
        code: 'AREA-INMUNO-P2',
        name: 'Inmunología Clínica P2',
        description: 'Área de ensayos inmunoenzimáticos',
      },
    });
    areaInmunoId = areaInmuno.id;

    const areaHemato = await prisma.labArea.create({
      data: {
        code: 'AREA-HEMATO-P2',
        name: 'Hematología Especial P2',
        description: 'Área de citometría y frotis',
      },
    });
    areaHematoId = areaHemato.id;

    // 4. Asignación a UserLabArea (Aislamiento)
    await prisma.userLabArea.create({
      data: { userId: bioInmunoUser.id, labAreaId: areaInmunoId },
    });
    await prisma.userLabArea.create({
      data: { userId: bioHematoUser.id, labAreaId: areaHematoId },
    });

    // Proyecto de Investigación mock para soporte FK
    await prisma.researchProject.upsert({
      where: { id: 101 },
      update: {},
      create: {
        id: 101,
        code: 'PRJ-TEST-P2',
        title: 'Proyecto Mock Fase 2',
        type: 'INSTITUTIONAL',
      },
    });

    // 5. Categoría, Unidad, Ubicación y Nevera
    const category = await prisma.category.upsert({
      where: { name: 'Reactivos Fase 2' },
      update: {},
      create: { name: 'Reactivos Fase 2', description: 'Catálogo Fase 2' },
    });

    const unit = await prisma.unit.upsert({
      where: { abbreviation: 'KIT-P2' },
      update: {},
      create: { name: 'Kit P2', abbreviation: 'KIT-P2' },
    });

    const location = await prisma.location.upsert({
      where: { id: 890 },
      update: {},
      create: { id: 890, name: 'Cava Central P2', type: LocationType.ALMACEN_GENERAL },
    });

    const fridge = await prisma.fridge.upsert({
      where: { code: 'FRIDGE-P2-01' },
      update: {},
      create: {
        locationId: location.id,
        code: 'FRIDGE-P2-01',
        name: 'Nevera Reactivos Inmuno P2',
        targetTempCelsius: 4.0,
      },
    });
    testFridgeId = fridge.id;

    // 6. Productos: Kit ELISA y Calibrador Externo
    const prodKit = await prisma.product.create({
      data: {
        categoryId: category.id,
        baseUnitId: unit.id,
        name: 'Kit ELISA HIV-1/2 P2',
        sku: 'SKU-KIT-ELISA-P2',
        isReagent: true,
        isLabReagent: true,
        labItemType: LabItemType.REAGENT_KIT,
        theoreticalYield: 96,
        includesCalibrator: false,
        calibratorsPerRun: 2,
        allowedLabAreas: {
          create: [{ labAreaId: areaInmunoId }],
        },
      },
    });
    productKitId = prodKit.id;

    const prodCal = await prisma.product.create({
      data: {
        categoryId: category.id,
        baseUnitId: unit.id,
        name: 'Calibrador Standalone P2',
        sku: 'SKU-CAL-P2',
        isReagent: true,
        isLabReagent: true,
        labItemType: LabItemType.STANDALONE_CALIBRATOR,
        theoreticalYield: 50,
        allowedLabAreas: {
          create: [{ labAreaId: areaInmunoId }],
        },
      },
    });
    productCalibratorId = prodCal.id;

    // 7. Catálogo de Exámenes
    const exam = await prisma.labExam.create({
      data: {
        code: 'EXAM-ELISA-P2',
        name: 'Detección Anticuerpos HIV ELISA',
        areaId: areaInmunoId,
        compatibleProducts: {
          create: [{ productId: productKitId }],
        },
      },
    });
    examElisaId = exam.id;

    // 8. Lotes en StockBatch
    const batchKitA = await prisma.stockBatch.create({
      data: {
        productId: productKitId,
        locationId: location.id,
        lotNumber: 'LOT-KIT-P2-A',
        currentQuantity: 5,
        costPrice: 48.0, // 48 / 96 = 0.50 por uso
        expirationDate: new Date('2026-12-31'),
        ownershipType: StockOwnership.CLINICAL_ROUTINE,
      },
    });

    const batchKitB = await prisma.stockBatch.create({
      data: {
        productId: productKitId,
        locationId: location.id,
        lotNumber: 'LOT-KIT-P2-B',
        currentQuantity: 1,
        costPrice: 48.0,
        expirationDate: new Date('2026-11-30'),
        ownershipType: StockOwnership.CLINICAL_ROUTINE,
      },
    });

    const batchCal = await prisma.stockBatch.create({
      data: {
        productId: productCalibratorId,
        locationId: location.id,
        lotNumber: 'LOT-CAL-P2',
        currentQuantity: 2,
        costPrice: 50.0, // 50 / 50 = 1.00 por uso
        expirationDate: new Date('2027-01-01'),
        ownershipType: StockOwnership.CLINICAL_ROUTINE,
      },
    });

    const batchResearch = await prisma.stockBatch.create({
      data: {
        productId: productKitId,
        locationId: location.id,
        lotNumber: 'LOT-RESEARCH-P2',
        currentQuantity: 1,
        costPrice: 48.0,
        expirationDate: new Date('2026-12-31'),
        ownershipType: StockOwnership.RESEARCH_PROJECT,
        researchProjectId: 101,
      },
    });

    // 9. Unidades en Nevera (LabReagentUnit)
    // Kit 1: SELLADO, 96 usos
    const unit1 = await prisma.labReagentUnit.create({
      data: {
        productId: productKitId,
        batchId: batchKitA.id,
        fridgeId: testFridgeId,
        unitCode: 'UNIT-P2-KIT-SELLADO',
        initialVolume: 96,
        currentVolume: 96,
        initialTheoreticalUses: 96,
        remainingUses: 96,
        consumedUses: 0,
        yieldVariance: 0,
        unitCostPerUse: 0.50,
        status: LabUnitStatus.SELLADO,
        expirationDate: new Date('2026-12-31'),
        ownershipType: StockOwnership.CLINICAL_ROUTINE,
      },
    });
    kitUnit1Id = unit1.id;

    // Kit 2: EN_USO para Inmuno, saldo 20 usos
    const unit2 = await prisma.labReagentUnit.create({
      data: {
        productId: productKitId,
        batchId: batchKitB.id,
        fridgeId: testFridgeId,
        unitCode: 'UNIT-P2-KIT-EN-USO',
        initialVolume: 96,
        currentVolume: 20,
        initialTheoreticalUses: 96,
        remainingUses: 20,
        consumedUses: 76,
        yieldVariance: 0,
        unitCostPerUse: 0.50,
        status: LabUnitStatus.EN_USO,
        assignedLabAreaId: areaInmunoId,
        expirationDate: new Date('2026-11-30'),
        ownershipType: StockOwnership.CLINICAL_ROUTINE,
      },
    });
    kitUnit2Id = unit2.id;

    // Calibrador Externo: EN_USO para Inmuno, saldo 50 usos
    const calUnit = await prisma.labReagentUnit.create({
      data: {
        productId: productCalibratorId,
        batchId: batchCal.id,
        fridgeId: testFridgeId,
        unitCode: 'UNIT-P2-CAL-EN-USO',
        initialVolume: 50,
        currentVolume: 50,
        initialTheoreticalUses: 50,
        remainingUses: 50,
        consumedUses: 0,
        yieldVariance: 0,
        unitCostPerUse: 1.00,
        status: LabUnitStatus.EN_USO,
        assignedLabAreaId: areaInmunoId,
        expirationDate: new Date('2027-01-01'),
        ownershipType: StockOwnership.CLINICAL_ROUTINE,
      },
    });
    calibratorUnitId = calUnit.id;

    // Unidad Blindada de Investigación: RESEARCH_PROJECT
    const resUnit = await prisma.labReagentUnit.create({
      data: {
        productId: productKitId,
        batchId: batchResearch.id,
        fridgeId: testFridgeId,
        unitCode: 'UNIT-P2-RESEARCH-LOCK',
        initialVolume: 96,
        currentVolume: 96,
        initialTheoreticalUses: 96,
        remainingUses: 96,
        consumedUses: 0,
        yieldVariance: 0,
        unitCostPerUse: 0.50,
        status: LabUnitStatus.SELLADO,
        expirationDate: new Date('2026-12-31'),
        ownershipType: StockOwnership.RESEARCH_PROJECT,
        researchProjectId: 101,
      },
    });
    researchKitUnitId = resUnit.id;
  });

  describe('1. Aislamiento Estricto por Área y Bloqueo de Stock Clínico vs. Investigación', () => {
    it('Bioanalista de Inmunología solo debe ver unidades de su área y nunca las de Investigación', async () => {
      const res = await request(app)
        .get('/api/lab/units')
        .set('Authorization', `Bearer ${bioInmunoToken}`);

      expect(res.status).toBe(200);
      const units = res.body.data;

      // Debe ver sus kits de inmunología
      const unitCodes = units.map((u: any) => u.unitCode);
      expect(unitCodes).toContain('UNIT-P2-KIT-EN-USO');
      expect(unitCodes).toContain('UNIT-P2-CAL-EN-USO');

      // NUNCA debe ver la unidad de Investigación (bloqueo cruzado de propiedad)
      expect(unitCodes).not.toContain('UNIT-P2-RESEARCH-LOCK');
    });

    it('Bioanalista de Hematología no debe ver unidades ni reactivos de Inmunología', async () => {
      const res = await request(app)
        .get('/api/lab/units')
        .set('Authorization', `Bearer ${bioHematoToken}`);

      expect(res.status).toBe(200);
      const units = res.body.data;
      const unitCodes = units.map((u: any) => u.unitCode);

      expect(unitCodes).not.toContain('UNIT-P2-KIT-EN-USO');
      expect(unitCodes).not.toContain('UNIT-P2-CAL-EN-USO');
      expect(unitCodes).not.toContain('UNIT-P2-KIT-SELLADO');
    });

    it('Si Bioanalista intenta filtrar por un área a la que no pertenece, recibe lista vacía', async () => {
      const res = await request(app)
        .get(`/api/lab/units?labAreaId=${areaHematoId}`)
        .set('Authorization', `Bearer ${bioInmunoToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('Coordinador tiene visibilidad global de todas las áreas y unidades', async () => {
      const res = await request(app)
        .get('/api/lab/units')
        .set('Authorization', `Bearer ${coordToken}`);

      expect(res.status).toBe(200);
      const unitCodes = res.body.data.map((u: any) => u.unitCode);
      expect(unitCodes).toContain('UNIT-P2-KIT-EN-USO');
      expect(unitCodes).toContain('UNIT-P2-CAL-EN-USO');
    });
  });

  describe('2. Solicitudes Internas a Coordinación y Sugerencia FEFO', () => {
    it('Bioanalista crea solicitud interna para su área asignada (PENDING)', async () => {
      const res = await request(app)
        .post('/api/lab/requests')
        .set('Authorization', `Bearer ${bioInmunoToken}`)
        .send({
          labAreaId: areaInmunoId,
          justification: 'Proyección de 150 pruebas ELISA para la semana epidemiológica 45',
          items: [
            {
              productId: productKitId.toString(),
              requestedUsesOrUnits: 96,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('PENDING');
      expect(res.body.data.code).toMatch(/^REQ-LAB-\d{4}-\d+/);
      expect(res.body.data.items).toHaveLength(1);
      createdRequestId = res.body.data.id;
    });

    it('Bioanalista no puede solicitar material para un área que no le corresponde (403)', async () => {
      const res = await request(app)
        .post('/api/lab/requests')
        .set('Authorization', `Bearer ${bioInmunoToken}`)
        .send({
          labAreaId: areaHematoId,
          justification: 'Solicitud no autorizada para hematología',
          items: [{ productId: productKitId.toString(), requestedUsesOrUnits: 10 }],
        });

      expect(res.status).toBe(403);
    });

    it('Sugerencia FEFO prioriza lote SELLADO ordenado por vencimiento si EN_USO no cubre cantidad (Micro-ajuste 3)', async () => {
      const res = await request(app)
        .get(`/api/lab/requests/${createdRequestId}/suggest-fefo`)
        .set('Authorization', `Bearer ${coordToken}`);

      expect(res.status).toBe(200);
      const suggestions = res.body.data.suggestions;
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].suggestedUnit).not.toBeNull();
      // Sugerencia FEFO: como requirió 96 usos, lote SELLADO (UNIT-P2-KIT-SELLADO) rinde 96
      expect(suggestions[0].suggestedUnit.unitCode).toBe('UNIT-P2-KIT-SELLADO');
    });

    it('Coordinador aprueba la solicitud interna y asigna el lote a la LabArea', async () => {
      const res = await request(app)
        .post(`/api/lab/requests/${createdRequestId}/approve`)
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          reviewNotes: 'Aprobado kit completo para semana 45',
          itemAssignments: [
            {
              itemId: (await prisma.labInternalRequestItem.findFirst({ where: { requestId: createdRequestId } }))!.id,
              assignedLabUnitId: kitUnit1Id.toString(),
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(LabInternalRequestStatus.APPROVED);

      // La unidad SELLADO pasa automáticamente a EN_USO y se vincula a Inmuno
      const updatedUnit = await prisma.labReagentUnit.findUnique({
        where: { id: kitUnit1Id },
      });
      expect(updatedUnit?.status).toBe(LabUnitStatus.EN_USO);
      expect(updatedUnit?.assignedLabAreaId).toBe(areaInmunoId);
    });
  });

  describe('3. Motor de Corridas Semanales con Doble Descuento de Calibradores', () => {
    it('Bioanalista crea cabecera de corrida semanal (OPEN_ACCUMULATING)', async () => {
      const res = await request(app)
        .post('/api/lab/runs')
        .set('Authorization', `Bearer ${bioInmunoToken}`)
        .send({
          labAreaId: areaInmunoId,
          labExamId: examElisaId,
          weekStartDate: '2026-11-01',
          weekEndDate: '2026-11-07',
          notes: 'Corrida semanal de rutina ELISA Inmunología',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe(LabWeeklyRunStatus.OPEN_ACCUMULATING);
      expect(res.body.data.code).toMatch(/^RUN-\d{4}-\d+/);
      createdRunId = res.body.data.id;
    });

    it('Cierre de corrida semanal con doble descuento: kit principal + calibrador externo', async () => {
      // Usaremos kitUnit2Id (tenía 20 usos, cost 0.50/uso) y calibratorUnitId (tenía 50 usos, cost 1.00/uso)
      const res = await request(app)
        .post(`/api/lab/runs/${createdRunId}/close`)
        .set('Authorization', `Bearer ${bioInmunoToken}`)
        .send({
          totalValidPatientExams: 10,
          notes: 'Cierre de corrida semana 45 sin incidentes mayores',
          consumptions: [
            {
              labReagentUnitId: kitUnit2Id.toString(),
              externalCalibratorUnitId: calibratorUnitId.toString(),
              patientUses: 10,
              repeatUses: 2,
              repeatReason: RepeatReason.OPERATOR_ERROR,
              repeatNotes: 'Burbuja en micropipeta de canal 3',
              calibratorUses: 2, // Descuenta 2 pozos del kit Y 2 usos del vial externo
              calibratorNotes: '2 calibradores según protocolo HIV',
              controlUses: 2, // Control positivo y negativo
              wasteUses: 1, // Purga inicial
            },
          ],
        });

      expect(res.status).toBe(200);
      const run = res.body.data;
      expect(run.status).toBe(LabWeeklyRunStatus.CLOSED_RECONCILED);
      expect(run.totalValidPatientExams).toBe(10);

      // Verificación del Doble Descuento:
      // Usos totales kit principal: 10 (pacientes) + 2 (repeticiones) + 2 (calibradores) + 2 (controles) + 1 (desperdicio) = 17 pozos
      // Costo kit principal: 17 * 0.50 = 8.50
      // Costo calibrador externo: 2 * 1.00 = 2.00
      // Costo total corrida: 8.50 + 2.00 = 10.50
      expect(Number(run.totalRunCost)).toBeCloseTo(10.50, 2);

      // Costo efectivo por examen válido reportado: 10.50 / 10 = 1.05
      expect(Number(run.effectiveCostPerExam)).toBeCloseTo(1.05, 2);

      // Verificar saldos restantes en BD:
      const updatedKit = await prisma.labReagentUnit.findUnique({
        where: { id: kitUnit2Id },
      });
      expect(updatedKit?.remainingUses).toBe(3); // 20 - 17 = 3
      expect(updatedKit?.consumedUses).toBe(93); // 76 + 17 = 93

      const updatedCal = await prisma.labReagentUnit.findUnique({
        where: { id: calibratorUnitId },
      });
      expect(updatedCal?.remainingUses).toBe(48); // 50 - 2 = 48
      expect(updatedCal?.consumedUses).toBe(2);
    });
  });

  describe('4. Conciliación Física al Vuelo y Variación Físico vs. Sistema (yieldVariance)', () => {
    it('Caso A: Rendimiento superior al teórico (Over-yield) no bloquea y absorbe excedente en yieldVariance positivo', async () => {
      // Creamos una nueva corrida
      const runRes = await request(app)
        .post('/api/lab/runs')
        .set('Authorization', `Bearer ${bioInmunoToken}`)
        .send({
          labAreaId: areaInmunoId,
          labExamId: examElisaId,
          weekStartDate: '2026-11-08',
          weekEndDate: '2026-11-14',
        });
      const runId = runRes.body.data.id;

      // El kitUnit2 tiene 3 usos restantes. Vamos a descontar 5 usos (2 de más que el saldo teórico)
      const closeRes = await request(app)
        .post(`/api/lab/runs/${runId}/close`)
        .set('Authorization', `Bearer ${bioInmunoToken}`)
        .send({
          totalValidPatientExams: 5,
          consumptions: [
            {
              labReagentUnitId: kitUnit2Id.toString(),
              patientUses: 5, // 5 > 3 restantes
            },
          ],
        });

      expect(closeRes.status).toBe(200);

      const reconciledUnit = await prisma.labReagentUnit.findUnique({
        where: { id: kitUnit2Id },
      });
      // El saldo llega a 0, queda AGOTADO y el yieldVariance acumula los +2 usos extra
      expect(reconciledUnit?.remainingUses).toBe(0);
      expect(reconciledUnit?.status).toBe(LabUnitStatus.AGOTADO);
      expect(reconciledUnit?.yieldVariance).toBe(2); // +2 usos extra
    });

    it('Caso B: Agotamiento físico prematuro en kit principal registra yieldVariance negativo y AGOTADO', async () => {
      // Creamos un nuevo frasco con 15 usos
      const testUnit = await prisma.labReagentUnit.create({
        data: {
          productId: productKitId,
          batchId: (await prisma.stockBatch.findFirst({ where: { lotNumber: 'LOT-KIT-P2-A' } }))!.id,
          fridgeId: testFridgeId,
          unitCode: 'UNIT-P2-DEFICIT-TEST',
          initialVolume: 96,
          currentVolume: 15,
          initialTheoreticalUses: 15,
          remainingUses: 15,
          consumedUses: 0,
          yieldVariance: 0,
          unitCostPerUse: 0.50,
          status: LabUnitStatus.EN_USO,
          assignedLabAreaId: areaInmunoId,
          expirationDate: new Date('2026-12-31'),
        },
      });

      const runRes = await request(app)
        .post('/api/lab/runs')
        .set('Authorization', `Bearer ${bioInmunoToken}`)
        .send({
          labAreaId: areaInmunoId,
          labExamId: examElisaId,
          weekStartDate: '2026-11-15',
          weekEndDate: '2026-11-21',
        });

      // Bioanalista consume 5 usos, pero marca que el frasco se agotó físicamente antes (isPrimaryKitDepleted: true)
      const closeRes = await request(app)
        .post(`/api/lab/runs/${runRes.body.data.id}/close`)
        .set('Authorization', `Bearer ${bioInmunoToken}`)
        .send({
          totalValidPatientExams: 5,
          consumptions: [
            {
              labReagentUnitId: testUnit.id.toString(),
              patientUses: 5,
              isPrimaryKitDepleted: true, // Frasco vacío antes de tiempo (quedaban 10 usos teóricos)
            },
          ],
        });

      expect(closeRes.status).toBe(200);

      const depletedUnit = await prisma.labReagentUnit.findUnique({
        where: { id: testUnit.id },
      });
      expect(depletedUnit?.remainingUses).toBe(0);
      expect(depletedUnit?.status).toBe(LabUnitStatus.AGOTADO);
      expect(depletedUnit?.yieldVariance).toBe(-10); // Déficit de 10 usos
    });

    it('Caso C: Conciliación física para el Calibrador Externo con agotamiento prematuro (Micro-ajuste 2)', async () => {
      // El calibratorUnitId tiene 48 usos restantes
      const runRes = await request(app)
        .post('/api/lab/runs')
        .set('Authorization', `Bearer ${bioInmunoToken}`)
        .send({
          labAreaId: areaInmunoId,
          labExamId: examElisaId,
          weekStartDate: '2026-11-22',
          weekEndDate: '2026-11-28',
        });

      // Bioanalista consume 2 calibradores y marca isExternalCalibratorDepleted = true
      const closeRes = await request(app)
        .post(`/api/lab/runs/${runRes.body.data.id}/close`)
        .set('Authorization', `Bearer ${bioInmunoToken}`)
        .send({
          totalValidPatientExams: 2,
          consumptions: [
            {
              labReagentUnitId: kitUnit1Id.toString(),
              externalCalibratorUnitId: calibratorUnitId.toString(),
              patientUses: 2,
              calibratorUses: 2,
              isExternalCalibratorDepleted: true, // Vial de calibrador se vació físicamente
            },
          ],
        });

      expect(closeRes.status).toBe(200);

      const depletedCalibrator = await prisma.labReagentUnit.findUnique({
        where: { id: calibratorUnitId },
      });
      // 48 - 2 = 46 usos restantes que se perdieron
      expect(depletedCalibrator?.remainingUses).toBe(0);
      expect(depletedCalibrator?.status).toBe(LabUnitStatus.AGOTADO);
      expect(depletedCalibrator?.yieldVariance).toBe(-46);
    });
  });

  describe('5. Auditoría Inmutable de 5 Dimensiones (LabConsumptionAuditLog)', () => {
    it('Verifica el registro completo de las 5 dimensiones y conceptos auditables', async () => {
      const res = await request(app)
        .get(`/api/lab/audit-logs?labAreaId=${areaInmunoId}`)
        .set('Authorization', `Bearer ${bioInmunoToken}`);

      expect(res.status).toBe(200);
      const logs = res.body.data;
      expect(logs.length).toBeGreaterThan(0);

      // Verificamos conceptos auditados
      const concepts = logs.map((l: any) => l.concept);
      expect(concepts).toContain(ConsumptionConcept.PATIENT);
      expect(concepts).toContain(ConsumptionConcept.REPEAT);
      expect(concepts).toContain(ConsumptionConcept.CALIBRATION);
      expect(concepts).toContain(ConsumptionConcept.CONTROL);
      expect(concepts).toContain(ConsumptionConcept.WASTE);
      expect(concepts).toContain(ConsumptionConcept.YIELD_SURPLUS);
      expect(concepts).toContain(ConsumptionConcept.YIELD_DEFICIT);

      // Verificamos dimensiones requeridas en una entrada
      const sampleLog = logs[0];
      expect(sampleLog.userId).toBeDefined();
      expect(sampleLog.labAreaId).toBe(areaInmunoId);
      expect(sampleLog.researchTrialId).toBeNull(); // Preparado para Fase 3
      expect(sampleLog.labExamId).toBeDefined();
      expect(sampleLog.weeklyRunId).toBeDefined();
      expect(sampleLog.labReagentUnitId).toBeDefined();
      expect(sampleLog.usesCount).toBeDefined();
      expect(sampleLog.costImpact).toBeDefined();
      expect(sampleLog.createdAt).toBeDefined();
    });
  });
});
