import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { prisma } from '../src/config/prisma.js';
import {
  ResearchProjectType,
  ResearchProjectStatus,
  ResearchMemberRole,
  ResearchInvestorType,
  ResearchTransferDirection,
  ResearchTrialStatus,
  ResearchFindingType,
  StockOwnership,
  LabUnitStatus,
  LocationType,
  RepeatReason,
  ConsumptionConcept,
} from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'jwt_default_secret_key';

function createToken(userId: number, username: string, roles: string[]): string {
  return jwt.sign(
    {
      id: userId,
      username,
      email: `${username}@idi.ucv.ve`,
      department: 'Investigación',
      roles,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

describe('FASE 3: Módulo de Investigación y Docencia', () => {
  let investigatorUser: any;
  let studentUser: any;
  let clinicalBioanalystUser: any;
  let investigatorToken: string;
  let studentToken: string;
  let clinicalBioanalystToken: string;

  let testProjectId: number;
  let testInvestorId: number;
  let testProductId: bigint;
  let testCalibratorProductId: bigint;
  let testLocationId: number;
  let testFridgeId: number;

  let donatedKitUnitId: bigint;
  let donatedCalibratorUnitId: bigint;
  let clinicalRoutineUnitId: bigint;
  let testTrialId: number;

  beforeAll(async () => {
    // 1. Limpieza de datos previos de pruebas de Fase 3
    await prisma.researchFinding.deleteMany({
      where: { project: { code: { in: ['PRJ-CHAGAS-P3', 'PRJ-TRANSFER-P3'] } } },
    });

    await prisma.labConsumptionAuditLog.deleteMany({
      where: {
        OR: [
          { researchTrial: { project: { code: { in: ['PRJ-CHAGAS-P3', 'PRJ-TRANSFER-P3'] } } } },
          { labReagentUnit: { unitCode: { contains: 'P3-CHAGAS' } } },
        ],
      },
    });

    await prisma.researchTrialConsumption.deleteMany({
      where: {
        trial: { project: { code: { in: ['PRJ-CHAGAS-P3', 'PRJ-TRANSFER-P3'] } } },
      },
    });

    await prisma.researchTrial.deleteMany({
      where: { project: { code: { in: ['PRJ-CHAGAS-P3', 'PRJ-TRANSFER-P3'] } } },
    });

    await prisma.researchStockTransfer.deleteMany({
      where: { project: { code: { in: ['PRJ-CHAGAS-P3', 'PRJ-TRANSFER-P3'] } } },
    });

    await prisma.researchDonationItem.deleteMany({
      where: { donation: { project: { code: { in: ['PRJ-CHAGAS-P3', 'PRJ-TRANSFER-P3'] } } } },
    });

    await prisma.researchDonation.deleteMany({
      where: { project: { code: { in: ['PRJ-CHAGAS-P3', 'PRJ-TRANSFER-P3'] } } },
    });

    await prisma.researchInvestment.deleteMany({
      where: { project: { code: { in: ['PRJ-CHAGAS-P3', 'PRJ-TRANSFER-P3'] } } },
    });

    await prisma.researchProjectMember.deleteMany({
      where: { project: { code: { in: ['PRJ-CHAGAS-P3', 'PRJ-TRANSFER-P3'] } } },
    });

    await prisma.labStockMovement.deleteMany({
      where: {
        OR: [
          { labReagentUnit: { unitCode: { contains: 'P3' } } },
          { labReagentUnit: { batch: { lotNumber: { in: ['LOT-CHAGAS-DON-P3', 'LOT-CHAGAS-CAL-P3', 'LOT-CLINIC-P3'] } } } },
        ],
      },
    });

    await prisma.labReagentUnit.deleteMany({
      where: {
        OR: [
          { unitCode: { contains: 'P3' } },
          { batch: { lotNumber: { in: ['LOT-CHAGAS-DON-P3', 'LOT-CHAGAS-CAL-P3', 'LOT-CLINIC-P3'] } } },
        ],
      },
    });

    await prisma.stockBatch.deleteMany({
      where: { lotNumber: { in: ['LOT-CHAGAS-DON-P3', 'LOT-CHAGAS-CAL-P3', 'LOT-CLINIC-P3'] } },
    });

    await prisma.researchProject.deleteMany({
      where: { code: { in: ['PRJ-CHAGAS-P3', 'PRJ-TRANSFER-P3'] } },
    });

    await prisma.researchInvestor.deleteMany({
      where: { name: { in: ['FONACIT Venezuela P3', 'Fundación Polar P3'] } },
    });

    await prisma.product.deleteMany({
      where: { sku: { in: ['SKU-KIT-CHAGAS-P3', 'SKU-CAL-CHAGAS-P3'] } },
    });

    // 2. Usuarios de prueba
    investigatorUser = await prisma.user.upsert({
      where: { username: 'investigador_p3' },
      update: {},
      create: {
        username: 'investigador_p3',
        email: 'investigador_p3@idi.ucv.ve',
        passwordHash: 'dummy_hash',
        fullName: 'Dr. Alejandro Rondón (PI)',
        department: 'Investigación',
        isActive: true,
      },
    });

    studentUser = await prisma.user.upsert({
      where: { username: 'tesista_p3' },
      update: {},
      create: {
        username: 'tesista_p3',
        email: 'tesista_p3@idi.ucv.ve',
        passwordHash: 'dummy_hash',
        fullName: 'Br. Sofía Castillo (Tesista)',
        department: 'Investigación',
        isActive: true,
      },
    });

    clinicalBioanalystUser = await prisma.user.upsert({
      where: { username: 'bioanalista_clinica_p3' },
      update: {},
      create: {
        username: 'bioanalista_clinica_p3',
        email: 'bio_clinica_p3@idi.ucv.ve',
        passwordHash: 'dummy_hash',
        fullName: 'Lic. Andrés Silva (Rutina)',
        department: 'Laboratorio',
        isActive: true,
      },
    });

    investigatorToken = createToken(investigatorUser.id, investigatorUser.username, ['INVESTIGACION', 'ADMINISTRADOR']);
    studentToken = createToken(studentUser.id, studentUser.username, ['INVESTIGACION']);
    clinicalBioanalystToken = createToken(clinicalBioanalystUser.id, clinicalBioanalystUser.username, ['BIOANALISTA', 'LABORATORIO']);

    // 3. Ubicación, Nevera, Categoría y Unidad
    const category = await prisma.category.upsert({
      where: { name: 'Reactivos Fase 3' },
      update: {},
      create: { name: 'Reactivos Fase 3', description: 'Catálogo Fase 3 Investigación' },
    });

    const unit = await prisma.unit.upsert({
      where: { abbreviation: 'KIT-P3' },
      update: {},
      create: { name: 'Kit P3', abbreviation: 'KIT-P3' },
    });

    const location = await prisma.location.upsert({
      where: { id: 895 },
      update: {},
      create: { id: 895, name: 'Cava Investigación P3', type: LocationType.LABORATORIO },
    });
    testLocationId = location.id;

    const fridge = await prisma.fridge.upsert({
      where: { code: 'FRIDGE-P3-01' },
      update: {},
      create: {
        locationId: location.id,
        code: 'FRIDGE-P3-01',
        name: 'Nevera Ensayos P3',
        targetTempCelsius: 4.0,
      },
    });
    testFridgeId = fridge.id;

    // 4. Productos de Ensayo
    const prodKit = await prisma.product.create({
      data: {
        categoryId: category.id,
        baseUnitId: unit.id,
        name: 'Kit ELISA Chagas Recombinante P3',
        sku: 'SKU-KIT-CHAGAS-P3',
        isReagent: true,
        isLabReagent: true,
        theoreticalYield: 96,
      },
    });
    testProductId = prodKit.id;

    const prodCal = await prisma.product.create({
      data: {
        categoryId: category.id,
        baseUnitId: unit.id,
        name: 'Calibrador Externo Chagas P3',
        sku: 'SKU-CAL-CHAGAS-P3',
        isReagent: true,
        isLabReagent: true,
        theoreticalYield: 30,
      },
    });
    testCalibratorProductId = prodCal.id;
  });

  describe('1. Proyectos de Investigación, Miembros e Inversiones Monetarias', () => {
    it('Debe crear un Proyecto de Investigación con correlativo PRJ-YYYY-XXXX (FORMULATION)', async () => {
      const res = await request(app)
        .post('/api/research/projects')
        .set('Authorization', `Bearer ${investigatorToken}`)
        .send({
          code: 'PRJ-CHAGAS-P3',
          title: 'Seroprevalencia de Chagas en Zonas Rurales',
          description: 'Estudio epidemiológico e inmunológico en comunidades endémicas',
          researchLine: 'Inmunoparasitología y Salud Pública',
          type: ResearchProjectType.INSTITUTIONAL,
          status: ResearchProjectStatus.ACTIVE,
          startDate: '2026-11-01',
          endDate: '2027-10-31',
        });

      expect(res.status).toBe(201);
      const project = res.body.data;
      expect(project.code).toBe('PRJ-CHAGAS-P3');
      expect(project.status).toBe('ACTIVE');
      expect(Number(project.totalInvestedFunds)).toBe(0);
      expect(Number(project.remainingFunds)).toBe(0);
      expect(Number(project.consumedMaterialsValue)).toBe(0);
      testProjectId = project.id;
    });

    it('Debe asignar miembros con roles y permisos específicos al proyecto', async () => {
      const res = await request(app)
        .post(`/api/research/projects/${testProjectId}/members`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .send({
          userId: studentUser.id,
          role: ResearchMemberRole.THESIS_STUDENT,
          canRequestMaterials: true,
          canRecordTrials: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.role).toBe(ResearchMemberRole.THESIS_STUDENT);
      expect(res.body.data.canRecordTrials).toBe(true);
    });

    it('Debe registrar un Inversor / Ente Donante', async () => {
      const res = await request(app)
        .post('/api/research/investors')
        .set('Authorization', `Bearer ${investigatorToken}`)
        .send({
          name: 'FONACIT Venezuela P3',
          taxIdOrCode: 'G-20000001-P3',
          investorType: ResearchInvestorType.PUBLIC_GRANT,
          contactName: 'Lic. Roberto Mendoza',
          contactEmail: 'subvenciones@fonacit.gob.ve',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.investorType).toBe('PUBLIC_GRANT');
      testInvestorId = res.body.data.id;
    });

    it('Debe registrar un Aporte Financiero e incrementar automáticamente los fondos del proyecto', async () => {
      const res = await request(app)
        .post('/api/research/investments')
        .set('Authorization', `Bearer ${investigatorToken}`)
        .send({
          projectId: testProjectId,
          investorId: testInvestorId,
          amount: 5000.0,
          currency: 'USD',
          purposeNotes: 'Fase I: Adquisición de reactivos de tamizaje y equipos de campo',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.code).toMatch(/^INV-\d{4}-\d+/);
      expect(Number(res.body.data.amount)).toBe(5000.0);

      // Verificar actualización presupuestaria en el proyecto
      const updatedProject = await prisma.researchProject.findUnique({
        where: { id: testProjectId },
      });
      expect(Number(updatedProject?.totalInvestedFunds)).toBe(5000.0);
      expect(Number(updatedProject?.remainingFunds)).toBe(5000.0);
    });
  });

  describe('2. Donaciones en Especie y Blindaje Clínico vs. Investigación', () => {
    it('Debe ingresar donación en especie creando StockBatch y LabReagentUnit con costPrice=0 y referencia poblada', async () => {
      const res = await request(app)
        .post('/api/research/donations')
        .set('Authorization', `Bearer ${investigatorToken}`)
        .send({
          projectId: testProjectId,
          investorId: testInvestorId,
          donationDate: '2026-11-02',
          locationId: testLocationId,
          fridgeId: testFridgeId,
          notes: 'Donación internacional de kits y calibradores para Chagas',
          items: [
            {
              productId: testProductId.toString(),
              quantity: 2, // 2 kits x 96 = 192 usos
              lotNumber: 'LOT-CHAGAS-DON-P3',
              expirationDate: '2027-12-31',
              estimatedUnitValue: 120.0, // 120 / 96 = 1.25 reference cost per use
              unitCode: 'UNIT-P3-CHAGAS-KIT-DONADO',
            },
            {
              productId: testCalibratorProductId.toString(),
              quantity: 1, // 1 vial x 30 = 30 usos
              lotNumber: 'LOT-CHAGAS-CAL-P3',
              expirationDate: '2027-06-30',
              estimatedUnitValue: 60.0, // 60 / 30 = 2.00 reference cost per use
              unitCode: 'UNIT-P3-CHAGAS-CAL-DONADO',
            },
          ],
        });

      expect(res.status).toBe(201);
      const donation = res.body.data;
      expect(donation.code).toMatch(/^DON-\d{4}-\d+/);
      expect(donation.items).toHaveLength(2);

      // Verificación en base de datos del Kit donado
      const unitKit = await prisma.labReagentUnit.findUnique({
        where: { unitCode: 'UNIT-P3-CHAGAS-KIT-DONADO' },
      });
      expect(unitKit).toBeDefined();
      expect(unitKit?.ownershipType).toBe(StockOwnership.RESEARCH_PROJECT);
      expect(unitKit?.researchProjectId).toBe(testProjectId);
      expect(unitKit?.remainingUses).toBe(192); // 2 cajas * 96 pozos
      expect(Number(unitKit?.unitCostPerUse)).toBe(0); // Financiero 0 (donación)
      expect(Number(unitKit?.referenceCostPerUse)).toBeCloseTo(1.25, 2); // 120 / 96 = 1.25
      donatedKitUnitId = unitKit!.id;

      // Verificación del Calibrador donado
      const unitCal = await prisma.labReagentUnit.findUnique({
        where: { unitCode: 'UNIT-P3-CHAGAS-CAL-DONADO' },
      });
      expect(unitCal?.ownershipType).toBe(StockOwnership.RESEARCH_PROJECT);
      expect(unitCal?.remainingUses).toBe(30);
      expect(Number(unitCal?.unitCostPerUse)).toBe(0);
      expect(Number(unitCal?.referenceCostPerUse)).toBeCloseTo(2.0, 2);
      donatedCalibratorUnitId = unitCal!.id;
    });

    it('Blindaje: La rutina clínica no debe listar los reactivos de investigación donados', async () => {
      const res = await request(app)
        .get('/api/lab/units')
        .set('Authorization', `Bearer ${clinicalBioanalystToken}`);

      expect(res.status).toBe(200);
      const units = res.body.data;
      const unitCodes = units.map((u: any) => u.unitCode);

      // El bioanalista clínico NUNCA ve las unidades marcadas con RESEARCH_PROJECT
      expect(unitCodes).not.toContain('UNIT-P3-CHAGAS-KIT-DONADO');
      expect(unitCodes).not.toContain('UNIT-P3-CHAGAS-CAL-DONADO');
    });
  });

  describe('3. Ensayos Experimentales (ResearchTrial) y Auditoría 5D', () => {
    it('Debe crear un Ensayo Experimental (OPEN) vinculado al proyecto', async () => {
      const res = await request(app)
        .post('/api/research/trials')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          projectId: testProjectId,
          trialDate: '2026-11-03',
          title: 'Tamizaje Piloto Comunidad Rural 01',
          objective: 'Evaluar sensibilidad y especificidad con 20 sueros de campo',
          notes: 'Corrida experimental controlada con duplicados',
        });

      expect(res.status).toBe(201);
      const trial = res.body.data;
      expect(trial.code).toMatch(/^TRL-\d{4}-\d+/);
      expect(trial.status).toBe(ResearchTrialStatus.OPEN);
      testTrialId = trial.id;
    });

    it('Debe ejecutar el ensayo descontando usos del kit y del calibrador, calculando valor referencial y auditoría 5D', async () => {
      // 20 muestras + 2 repeticiones + 2 calibradores + 2 controles + 1 purga = 27 usos kit
      // 2 calibradores vial externo = 2 usos calibrador
      const res = await request(app)
        .post(`/api/research/trials/${testTrialId}/execute`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          totalSamplesTested: 20,
          notes: 'Ensayo completado satisfactoriamente sin fallas de placa',
          consumptions: [
            {
              labReagentUnitId: donatedKitUnitId.toString(),
              externalCalibratorUnitId: donatedCalibratorUnitId.toString(),
              sampleUses: 20,
              repeatUses: 2,
              repeatReason: RepeatReason.COMPLEX_SAMPLE,
              calibratorUses: 2,
              calibratorNotes: '2 puntos de corte de calibración',
              controlUses: 2,
              wasteUses: 1,
            },
          ],
        });

      expect(res.status).toBe(200);
      const completedTrial = res.body.data;
      expect(completedTrial.status).toBe(ResearchTrialStatus.COMPLETED);
      expect(completedTrial.totalSamplesTested).toBe(20);

      // Costo financiero: 0 (ambos donados con unitCostPerUse = 0)
      expect(Number(completedTrial.totalTrialCost)).toBe(0);

      // Valor referencial científico consumido:
      // Kit: 27 usos * 1.25 = 33.75
      // Calibrador: 2 usos * 2.00 = 4.00
      // Total valor referencial: 33.75 + 4.00 = 37.75
      expect(Number(completedTrial.totalReferenceValue)).toBeCloseTo(37.75, 2);

      // Verificación de saldos restantes en BD
      const updatedKit = await prisma.labReagentUnit.findUnique({
        where: { id: donatedKitUnitId },
      });
      expect(updatedKit?.remainingUses).toBe(165); // 192 - 27 = 165

      const updatedCal = await prisma.labReagentUnit.findUnique({
        where: { id: donatedCalibratorUnitId },
      });
      expect(updatedCal?.remainingUses).toBe(28); // 30 - 2 = 28

      // Verificación de incremento en consumedMaterialsValue del proyecto
      const updatedProject = await prisma.researchProject.findUnique({
        where: { id: testProjectId },
      });
      expect(Number(updatedProject?.consumedMaterialsValue)).toBeCloseTo(37.75, 2);

      // Verificación de la Auditoría 5D (LabConsumptionAuditLog con researchTrialId poblado)
      const auditLogs = await prisma.labConsumptionAuditLog.findMany({
        where: { researchTrialId: testTrialId },
      });
      expect(auditLogs.length).toBeGreaterThan(0);
      const concepts = auditLogs.map((l) => l.concept);
      expect(concepts).toContain(ConsumptionConcept.PATIENT); // sampleUses
      expect(concepts).toContain(ConsumptionConcept.REPEAT);
      expect(concepts).toContain(ConsumptionConcept.CALIBRATION);
      expect(concepts).toContain(ConsumptionConcept.CONTROL);
      expect(concepts).toContain(ConsumptionConcept.WASTE);

      // Dimensiones verificadas
      const sampleLog = auditLogs[0];
      expect(sampleLog.labAreaId).toBeNull(); // Ensayo no ligado a área clínica
      expect(sampleLog.researchTrialId).toBe(testTrialId);
    });

    it('Blindaje: Ensayo rechaza consumir reactivos que no pertenezcan al proyecto de investigación', async () => {
      // Creamos un lote clínico ajeno
      const clinicalBatch = await prisma.stockBatch.create({
        data: {
          productId: testProductId,
          locationId: testLocationId,
          lotNumber: 'LOT-CLINIC-P3',
          currentQuantity: 1,
          costPrice: 50.0,
          origin: 'ORDEN_COMPRA',
          ownershipType: StockOwnership.CLINICAL_ROUTINE,
        },
      });

      const clinicalUnit = await prisma.labReagentUnit.create({
        data: {
          productId: testProductId,
          batchId: clinicalBatch.id,
          unitCode: 'UNIT-P3-CLINICAL-ROUTINE',
          initialVolume: 96,
          currentVolume: 96,
          remainingUses: 96,
          unitCostPerUse: 0.50,
          status: LabUnitStatus.SELLADO,
          ownershipType: StockOwnership.CLINICAL_ROUTINE,
        },
      });
      clinicalRoutineUnitId = clinicalUnit.id;

      // Crear ensayo 2
      const trial2Res = await request(app)
        .post('/api/research/trials')
        .set('Authorization', `Bearer ${investigatorToken}`)
        .send({
          projectId: testProjectId,
          title: 'Ensayo con intento de intrusión clínica',
        });

      // Intento de consumir lote clínico en ensayo de investigación -> Debe fallar
      const failRes = await request(app)
        .post(`/api/research/trials/${trial2Res.body.data.id}/execute`)
        .set('Authorization', `Bearer ${investigatorToken}`)
        .send({
          totalSamplesTested: 5,
          consumptions: [
            {
              labReagentUnitId: clinicalRoutineUnitId.toString(),
              sampleUses: 5,
            },
          ],
        });

      expect(failRes.status).toBe(400); // Excepción de blindaje de stock manejada como BAD_REQUEST
      expect(failRes.body.message).toContain('Blindaje de stock violado');
    });
  });

  describe('4. Resultados Obtenidos e Hitos (ResearchFinding)', () => {
    it('Debe registrar un resultado científico experimental vinculado al ensayo y al proyecto', async () => {
      const res = await request(app)
        .post('/api/research/findings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          projectId: testProjectId,
          trialId: testTrialId,
          title: 'Detección de 3 Casos Reactivos en Comunidad 01',
          findingType: ResearchFindingType.EXPERIMENTAL_RESULT,
          summary: 'De las 20 muestras analizadas, 3 resultaron fuertemente reactivas con ratio S/CO > 4.5',
          conclusion: 'Se confirma transmisión activa vectorial en el sector.',
          isPublished: true,
        });

      expect(res.status).toBe(201);
      const finding = res.body.data;
      expect(finding.findingType).toBe('EXPERIMENTAL_RESULT');
      expect(finding.isPublished).toBe(true);
      expect(finding.trialId).toBe(testTrialId);
    });

    it('Debe listar los resultados del proyecto', async () => {
      const res = await request(app)
        .get(`/api/research/findings?projectId=${testProjectId}`)
        .set('Authorization', `Bearer ${investigatorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].title).toContain('Detección de 3 Casos');
    });
  });

  describe('5. Cesiones y Traspasos de Stock (ResearchStockTransfer)', () => {
    it('Debe permitir traspaso de stock clínico a investigación (CLINICAL_TO_RESEARCH)', async () => {
      // Traspasamos 20 usos de la unidad clínica al proyecto
      const res = await request(app)
        .post('/api/research/transfers')
        .set('Authorization', `Bearer ${investigatorToken}`)
        .send({
          sourceUnitId: clinicalRoutineUnitId.toString(),
          projectId: testProjectId,
          transferredUses: 20,
          direction: ResearchTransferDirection.CLINICAL_TO_RESEARCH,
          reason: 'Cesión autorizada por coordinación para completar serie experimental',
        });

      expect(res.status).toBe(201);
      const transfer = res.body.data;
      expect(transfer.direction).toBe('CLINICAL_TO_RESEARCH');
      expect(transfer.transferredUses).toBe(20);

      // La unidad origen clínica se decrementa: 96 - 20 = 76
      const sourceAfter = await prisma.labReagentUnit.findUnique({
        where: { id: clinicalRoutineUnitId },
      });
      expect(sourceAfter?.remainingUses).toBe(76);

      // La unidad destino queda blindada para investigación
      const targetUnit = await prisma.labReagentUnit.findUnique({
        where: { id: BigInt(transfer.targetUnitId) },
      });
      expect(targetUnit?.ownershipType).toBe(StockOwnership.RESEARCH_PROJECT);
      expect(targetUnit?.researchProjectId).toBe(testProjectId);
      expect(targetUnit?.remainingUses).toBe(20);
    });
  });
});
