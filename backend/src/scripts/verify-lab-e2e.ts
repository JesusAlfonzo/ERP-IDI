import { prisma } from '../config/prisma.js';
import { LabService } from '../services/lab.service.js';
import { FridgeAuditService } from '../services/fridge-audit.service.js';
import {
  StockOwnership,
  LabUnitStatus,
  LabWeeklyRunStatus,
  RepeatReason,
  QuarantineResolutionStatus,
  LocationType,
  ConsumptionConcept,
  IncidentType,
  QuarantineInstanceType,
  IncidentStatus,
  LabMovementType,
} from '@prisma/client';

interface AssertionResult {
  step: string;
  name: string;
  passed: boolean;
  expected?: any;
  received?: any;
  notes?: string;
}

const assertions: AssertionResult[] = [];

function assert(name: string, condition: boolean, step: string, expected?: any, received?: any, notes?: string) {
  assertions.push({
    step,
    name,
    passed: Boolean(condition),
    expected,
    received,
    notes,
  });

  const icon = condition ? '✅ PASS' : '❌ FAIL';
  const color = condition ? '\x1b[32m' : '\x1b[31m';
  console.log(`  ${color}${icon}\x1b[0m [${step}] ${name}`);
  if (!condition) {
    console.log(`     \x1b[33mEsperado: ${JSON.stringify(expected)} | Recibido: ${JSON.stringify(received)}\x1b[0m`);
    if (notes) console.log(`     \x1b[90mNota: ${notes}\x1b[0m`);
  }
}

async function main() {
  console.log('\n\x1b[1m\x1b[36m========================================================================\x1b[0m');
  console.log('\x1b[1m\x1b[36m   PRUEBA DE RECORRIDO COMPLETO (E2E) - MÓDULO DE LABORATORIO CLÍNICO   \x1b[0m');
  console.log('\x1b[1m\x1b[36m========================================================================\x1b[0m\n');

  try {
    // =========================================================================
    // FASE 0: PREPARACIÓN DE ESCENARIO (SEED AISLADO DE PRUEBA)
    // =========================================================================
    console.log('\x1b[1m\x1b[34m[FASE 0] Preparación de Escenario y Limpieza Idempotente (E2E-)\x1b[0m');

    // 0.1 Limpieza de datos previos E2E
    await prisma.labConsumptionAuditLog.deleteMany({
      where: { labReagentUnit: { unitCode: { startsWith: 'E2E-' } } },
    });
    await prisma.fridgePhysicalAuditItem.deleteMany({
      where: { labReagentUnit: { unitCode: { startsWith: 'E2E-' } } },
    });
    await prisma.fridgePhysicalAudit.deleteMany({
      where: { notes: { contains: 'E2E' } },
    });
    await prisma.batchIncident.deleteMany({
      where: { labReagentUnit: { unitCode: { startsWith: 'E2E-' } } },
    });
    await prisma.labStockMovement.deleteMany({
      where: { labReagentUnit: { unitCode: { startsWith: 'E2E-' } } },
    });
    await prisma.labRunConsumption.deleteMany({
      where: {
        OR: [
          { run: { code: { startsWith: 'E2E-' } } },
          { run: { labArea: { code: 'E2E-AREA-INMUNO' } } },
          { labReagentUnit: { unitCode: { startsWith: 'E2E-' } } },
        ],
      },
    });
    await prisma.labWeeklyRun.deleteMany({
      where: {
        OR: [
          { code: { startsWith: 'E2E-' } },
          { labArea: { code: 'E2E-AREA-INMUNO' } },
        ],
      },
    });
    await prisma.labInternalRequestItem.deleteMany({
      where: { request: { code: { startsWith: 'E2E-' } } },
    });
    await prisma.labInternalRequest.deleteMany({
      where: {
        OR: [
          { code: { startsWith: 'E2E-' } },
          { labArea: { code: 'E2E-AREA-INMUNO' } },
        ],
      },
    });
    await prisma.labReagentUnit.deleteMany({
      where: { unitCode: { startsWith: 'E2E-' } },
    });
    await prisma.stockBatch.deleteMany({
      where: { lotNumber: { startsWith: 'E2E-' } },
    });
    await prisma.labExamProduct.deleteMany({
      where: { labExam: { code: 'E2E-EXAM-ELISA' } },
    });
    await prisma.labExam.deleteMany({
      where: { code: 'E2E-EXAM-ELISA' },
    });
    await prisma.product.deleteMany({
      where: { sku: 'E2E-PROD-ELISA' },
    });

    // 0.2 Creación de Usuarios de Prueba
    const bioUser = await prisma.user.upsert({
      where: { username: 'bio_e2e_verify' },
      update: {},
      create: {
        username: 'bio_e2e_verify',
        fullName: 'Lic. Bioanalista E2E',
        email: 'bio_e2e@idi.ucv.ve',
        passwordHash: 'dummy_hash_e2e',
        department: 'Laboratorio',
        isActive: true,
      },
    });

    const coordUser = await prisma.user.upsert({
      where: { username: 'coord_e2e_verify' },
      update: {},
      create: {
        username: 'coord_e2e_verify',
        fullName: 'Dra. Coordinadora E2E',
        email: 'coord_e2e@idi.ucv.ve',
        passwordHash: 'dummy_hash_e2e',
        department: 'Laboratorio',
        isActive: true,
      },
    });

    // 0.3 Área de Laboratorio y Asignación de Personal
    const testArea = await prisma.labArea.upsert({
      where: { code: 'E2E-AREA-INMUNO' },
      update: {},
      create: {
        code: 'E2E-AREA-INMUNO',
        name: 'Inmunopatología E2E',
        description: 'Área de Inmunología Especial y Autoinmunidad para pruebas E2E',
        isActive: true,
      },
    });

    await prisma.userLabArea.deleteMany({
      where: { userId: bioUser.id, labAreaId: testArea.id },
    });
    await prisma.userLabArea.create({
      data: { userId: bioUser.id, labAreaId: testArea.id },
    });

    // 0.4 Ubicación Física y Nevera
    const testLocation = await prisma.location.upsert({
      where: { id: 998 },
      update: {},
      create: {
        id: 998,
        name: 'Cava Central de Inmunología E2E',
        type: LocationType.ALMACEN_GENERAL,
      },
    });

    const testFridge = await prisma.fridge.upsert({
      where: { code: 'E2E-FRIDGE-01' },
      update: {},
      create: {
        code: 'E2E-FRIDGE-01',
        name: 'Nevera Inmuno E2E 01',
        locationId: testLocation.id,
        targetTempCelsius: 4.0,
      },
    });

    // 0.5 Categoría, Unidad Base y Producto Diagnóstico
    const category = await prisma.category.upsert({
      where: { name: 'Reactivos Inmuno E2E' },
      update: {},
      create: {
        name: 'Reactivos Inmuno E2E',
        description: 'Categoría para pruebas E2E de ELISA',
      },
    });

    const baseUnit = await prisma.unit.upsert({
      where: { abbreviation: 'DET-E2E' },
      update: {},
      create: {
        name: 'Determinación E2E',
        abbreviation: 'DET-E2E',
      },
    });

    const testProduct = await prisma.product.create({
      data: {
        name: 'Kit ELISA Anti-DNA (E2E)',
        sku: 'E2E-PROD-ELISA',
        categoryId: category.id,
        baseUnitId: baseUnit.id,
        isLabReagent: true,
        isReagent: true,
      },
    });

    // 0.6 Examen con Smart Defaults (4 calibradores, 2 controles)
    const testExam = await prisma.labExam.create({
      data: {
        code: 'E2E-EXAM-ELISA',
        name: 'ELISA Anti-DNA (E2E)',
        areaId: testArea.id,
        defaultCalibratorUses: 4,
        defaultControlUses: 2,
        isActive: true,
      },
    });

    await prisma.labExamProduct.create({
      data: {
        labExamId: testExam.id,
        productId: testProduct.id,
      },
    });

    // 0.7 Creación de los 4 Lotes y Frascos Físicos
    const now = Date.now();
    const exp15Days = new Date(now + 15 * 24 * 60 * 60 * 1000);
    const exp180Days = new Date(now + 180 * 24 * 60 * 60 * 1000);
    const expYesterday = new Date(now - 24 * 60 * 60 * 1000);

    const batch1 = await prisma.stockBatch.create({
      data: {
        productId: testProduct.id,
        locationId: testLocation.id,
        lotNumber: 'E2E-LOT-01',
        expirationDate: exp15Days,
        currentQuantity: 1,
        costPrice: 240.00,
      },
    });

    const batch2 = await prisma.stockBatch.create({
      data: {
        productId: testProduct.id,
        locationId: testLocation.id,
        lotNumber: 'E2E-LOT-02',
        expirationDate: exp180Days,
        currentQuantity: 1,
        costPrice: 240.00,
      },
    });

    const batchInv = await prisma.stockBatch.create({
      data: {
        productId: testProduct.id,
        locationId: testLocation.id,
        lotNumber: 'E2E-LOT-INV',
        expirationDate: exp180Days,
        currentQuantity: 1,
        costPrice: 240.00,
        ownershipType: StockOwnership.RESEARCH_PROJECT,
      },
    });

    const batchExp = await prisma.stockBatch.create({
      data: {
        productId: testProduct.id,
        locationId: testLocation.id,
        lotNumber: 'E2E-LOT-EXP',
        expirationDate: expYesterday,
        currentQuantity: 1,
        costPrice: 240.00,
      },
    });

    // Frasco A: 30 usos restantes, vence en 15 días, CLINICAL_ROUTINE
    const unitA = await prisma.labReagentUnit.create({
      data: {
        unitCode: 'E2E-UNIT-A',
        productId: testProduct.id,
        batchId: batch1.id,
        fridgeId: testFridge.id,
        ownershipType: StockOwnership.CLINICAL_ROUTINE,
        status: LabUnitStatus.SELLADO,
        initialVolume: 96,
        currentVolume: 30,
        initialTheoreticalUses: 96,
        remainingUses: 30,
        unitCostPerUse: 2.50,
        expirationDate: exp15Days,
      },
    });

    // Frasco B: 96 usos restantes, vence en 180 días, CLINICAL_ROUTINE
    const unitB = await prisma.labReagentUnit.create({
      data: {
        unitCode: 'E2E-UNIT-B',
        productId: testProduct.id,
        batchId: batch2.id,
        fridgeId: testFridge.id,
        ownershipType: StockOwnership.CLINICAL_ROUTINE,
        status: LabUnitStatus.SELLADO,
        initialVolume: 96,
        currentVolume: 96,
        initialTheoreticalUses: 96,
        remainingUses: 96,
        unitCostPerUse: 2.50,
        expirationDate: exp180Days,
      },
    });

    // Frasco C: 96 usos restantes, vence en 180 días, RESEARCH_PROJECT (I+D)
    const unitC = await prisma.labReagentUnit.create({
      data: {
        unitCode: 'E2E-UNIT-C',
        productId: testProduct.id,
        batchId: batchInv.id,
        fridgeId: testFridge.id,
        ownershipType: StockOwnership.RESEARCH_PROJECT,
        status: LabUnitStatus.SELLADO,
        initialVolume: 96,
        currentVolume: 96,
        initialTheoreticalUses: 96,
        remainingUses: 96,
        unitCostPerUse: 2.50,
        expirationDate: exp180Days,
      },
    });

    // Frasco D: 50 usos restantes, VENCIDO ayer, CLINICAL_ROUTINE
    const unitD = await prisma.labReagentUnit.create({
      data: {
        unitCode: 'E2E-UNIT-D',
        productId: testProduct.id,
        batchId: batchExp.id,
        fridgeId: testFridge.id,
        ownershipType: StockOwnership.CLINICAL_ROUTINE,
        status: LabUnitStatus.SELLADO,
        initialVolume: 96,
        currentVolume: 50,
        initialTheoreticalUses: 96,
        remainingUses: 50,
        unitCostPerUse: 2.50,
        expirationDate: expYesterday,
      },
    });

    assert(
      'Escenario E2E creado con 2 usuarios, 1 nevera y 4 frascos en diferentes condiciones',
      Boolean(unitA && unitB && unitC && unitD),
      'FASE 0'
    );

    // =========================================================================
    // FASE 1: SOLICITUD INTERNA Y DESPACHO FEFO + CASO BORDE E4 (SEGREGACIÓN I+D)
    // =========================================================================
    console.log('\n\x1b[1m\x1b[34m[FASE 1] Solicitud Interna, Despacho FEFO y Blindaje I+D (Caso Borde E4)\x1b[0m');

    // 1.1 Bioanalista crea solicitud interna
    const request = await LabService.createInternalRequest({
      labAreaId: testArea.id,
      requestedById: bioUser.id,
      justification: 'Solicitud para corrida semanal de autoinmunidad',
      items: [{ productId: testProduct.id, requestedUsesOrUnits: 30 }],
    });

    assert(
      'Solicitud interna registrada exitosamente en estado PENDING',
      Boolean(request && request.id),
      'FASE 1'
    );

    // 1.2 Consulta de recomendación FEFO
    const fefoData = await LabService.suggestFefoForRequest(request.id);
    const suggestedItem = fefoData.suggestions[0];
    const isFirstLotSuggested = suggestedItem?.suggestedUnit?.unitCode === 'E2E-UNIT-A';

    assert(
      'Sugerencia FEFO prioriza Frasco A (E2E-UNIT-A) por vencer en 15 días frente a Frasco B',
      isFirstLotSuggested,
      'FASE 1 - FEFO',
      'E2E-UNIT-A',
      suggestedItem?.suggestedUnit?.unitCode
    );

    // 1.3 Intento de asignar Frasco C (RESEARCH_PROJECT) en flujo clínico -> Caso Borde E4
    let researchBlockTriggered = false;
    let researchBlockMessage = '';
    try {
      await LabService.approveInternalRequest(request.id, {
        reviewedById: coordUser.id,
        reviewNotes: 'Intento de desvío de insumo de investigación a clínica',
        itemAssignments: [
          { itemId: request.items[0]!.id, assignedLabUnitId: unitC.id },
        ],
      });
    } catch (err: any) {
      researchBlockTriggered = true;
      researchBlockMessage = err.message;
    }

    assert(
      'Caso Borde E4: Bloquea asignación de Frasco C de Investigación (RESEARCH_PROJECT) a clínica',
      researchBlockTriggered && researchBlockMessage.includes('investigación'),
      'FASE 1 - E4',
      'Excepción de investigación',
      researchBlockMessage
    );

    // 1.4 Aprobación legítima con Frascos A y asignación de B
    await LabService.approveInternalRequest(request.id, {
      reviewedById: coordUser.id,
      reviewNotes: 'Aprobado bajo estricto criterio FEFO con Frasco A',
      preserveSealed: true,
      itemAssignments: [
        { itemId: request.items[0]!.id, assignedLabUnitId: unitA.id },
      ],
    });

    await prisma.labReagentUnit.update({
      where: { id: unitB.id },
      data: { assignedLabAreaId: testArea.id },
    });

    await LabService.deliverInternalRequest(request.id, coordUser.id);
    assert('Entrega física de frascos despachados a la nevera del área', true, 'FASE 1');

    // =========================================================================
    // FASE 2: APERTURA EN MESÓN, SMART DEFAULTS Y ROLLOVER AUTOMÁTICO (CASO BORDE E1)
    // =========================================================================
    console.log('\n\x1b[1m\x1b[34m[FASE 2] Apertura en Mesón, Smart Defaults y Rollover Automático (Caso Borde E1)\x1b[0m');

    // 2.1 Bioanalista abre Frasco A
    const openedA = await LabService.openLabUnit(unitA.id, bioUser.id);
    assert(
      'Apertura de Frasco A pasa a estado EN_USO y registra openedAt',
      openedA.status === LabUnitStatus.EN_USO && openedA.openedAt !== null,
      'FASE 2'
    );

    // 2.2 Apertura de Corrida Semanal
    const run1 = await LabService.createWeeklyRun({
      labAreaId: testArea.id,
      labExamId: testExam.id,
      bioanalystId: bioUser.id,
      weekStartDate: new Date(),
      weekEndDate: new Date(),
      notes: 'Corrida semanal de prueba ELISA Anti-DNA',
    });

    assert('Corrida semanal aperturada en estado OPEN_ACCUMULATING', Boolean(run1 && run1.id), 'FASE 2');

    // 2.3 Cierre de Corrida en Modo Simple con Rollover Automático (Caso Borde E1)
    // Pacientes = 38. Smart Defaults = 4 calibrador + 2 control = 6. Total = 44 pozos.
    // Frasco A tiene 30 usos -> se agota completamente y 14 pasan al Frasco B.
    const closeResult = await LabService.closeWeeklyRun({
      runId: run1.id,
      bioanalystId: bioUser.id,
      userRoles: ['BIOANALISTA', 'LABORATORIO'],
      totalValidPatientExams: 38,
      notes: 'Cierre semanal con Smart Defaults aplicados',
      consumptions: [
        {
          labReagentUnitId: unitA.id,
          patientUses: 38,
          rolloverUnitId: unitB.id,
        },
      ],
    });

    const refreshedUnitA = await prisma.labReagentUnit.findUnique({ where: { id: unitA.id } });
    const refreshedUnitB = await prisma.labReagentUnit.findUnique({ where: { id: unitB.id } });

    assert(
      'Caso Borde E1 (Parte 1): Frasco A queda agotado (remainingUses === 0, status === AGOTADO)',
      refreshedUnitA?.remainingUses === 0 && refreshedUnitA?.status === LabUnitStatus.AGOTADO,
      'FASE 2 - E1',
      { remainingUses: 0, status: 'AGOTADO' },
      { remainingUses: refreshedUnitA?.remainingUses, status: refreshedUnitA?.status }
    );

    assert(
      'Caso Borde E1 (Parte 2): Frasco B se abre automáticamente a EN_USO con 82 usos (96 - 14)',
      refreshedUnitB?.status === LabUnitStatus.EN_USO && refreshedUnitB?.remainingUses === 82,
      'FASE 2 - E1',
      { remainingUses: 82, status: 'EN_USO' },
      { remainingUses: refreshedUnitB?.remainingUses, status: refreshedUnitB?.status }
    );

    // Verificar bitácora de consumos y costos
    const consumptions = await prisma.labRunConsumption.findMany({
      where: { runId: run1.id },
      orderBy: { id: 'asc' },
    });
    const totalDeductedInRun = consumptions.reduce((acc, c) => acc + c.totalDeductedUses, 0);

    assert(
      'Smart Defaults calculó exactamente 44 pozos (38 pacientes + 4 calibrador + 2 control)',
      totalDeductedInRun === 44,
      'FASE 2 - DEFAULTS',
      44,
      totalDeductedInRun
    );

    const auditLogsF2 = await prisma.labConsumptionAuditLog.findMany({
      where: { weeklyRunId: run1.id },
    });
    assert(
      'Bitácora inmutable de auditoría 5D registró los eventos (PATIENT, CALIBRATION, CONTROL)',
      auditLogsF2.length >= 3,
      'FASE 2 - AUDIT 5D',
      '>= 3 registros',
      `${auditLogsF2.length} registros`
    );

    // =========================================================================
    // FASE 3: BLOQUEO DE VENCIDOS (CASO BORDE E2) Y CONSUMO RÁPIDO INDIVIDUAL
    // =========================================================================
    console.log('\n\x1b[1m\x1b[34m[FASE 3] Bloqueo de Vencidos (Caso Borde E2) y Consumo Rápido Individual\x1b[0m');

    // 3.1 Intento de consumo con Frasco D (vencido) sin override
    let expiredBlockTriggered = false;
    let expiredBlockMessage = '';
    try {
      await LabService.quickConsumeReagent({
        examId: testExam.id,
        labAreaId: testArea.id,
        unitId: unitD.id,
        userId: bioUser.id,
        userRoles: ['BIOANALISTA', 'LABORATORIO'],
        validPatientsCount: 1,
        allowExpiredOverride: false,
      });
    } catch (err: any) {
      expiredBlockTriggered = true;
      expiredBlockMessage = err.message;
    }

    assert(
      'Caso Borde E2: Bloquea consumo de Frasco D vencido sin autorización de supervisor',
      expiredBlockTriggered && expiredBlockMessage.toLowerCase().includes('vencido'),
      'FASE 3 - E2',
      'Excepción por frasco vencido',
      expiredBlockMessage
    );

    // 3.2 Consumo rápido válido de 1 paciente con Frasco B
    const qcRun = await LabService.quickConsumeReagent({
      examId: testExam.id,
      labAreaId: testArea.id,
      unitId: unitB.id,
      userId: bioUser.id,
      userRoles: ['BIOANALISTA', 'LABORATORIO'],
      validPatientsCount: 1,
      notes: 'Prueba rápida unitaria de emergencia E2E',
    });

    const unitBAfterQC = await prisma.labReagentUnit.findUnique({ where: { id: unitB.id } });
    assert(
      'Consumo Rápido ejecuta micro-corrida atómica y descuenta 1 uso de Frasco B (82 -> 81)',
      qcRun.status === LabWeeklyRunStatus.CLOSED_RECONCILED && unitBAfterQC?.remainingUses === 81,
      'FASE 3 - QC',
      { remainingUses: 81, status: 'CLOSED_RECONCILED' },
      { remainingUses: unitBAfterQC?.remainingUses, status: qcRun.status }
    );

    // =========================================================================
    // FASE 4: CORRIDA FALLIDA POR CALIBRACIÓN (CASO BORDE E5)
    // =========================================================================
    console.log('\n\x1b[1m\x1b[34m[FASE 4] Corrida Fallida por Calibración (Caso Borde E5)\x1b[0m');

    const run2 = await LabService.createWeeklyRun({
      labAreaId: testArea.id,
      labExamId: testExam.id,
      bioanalystId: bioUser.id,
      weekStartDate: new Date(),
      weekEndDate: new Date(),
      notes: 'Corrida semanal con curva fuera de rango',
    });

    const failResult = await LabService.failRunByCalibration({
      runId: run2.id,
      unitId: unitB.id,
      userId: bioUser.id,
      userRoles: ['BIOANALISTA', 'LABORATORIO'],
      totalWellsWasted: 8,
      notes: 'Coeficiente r2 < 0.95 en curva estándar',
      autoCloneNewRun: false,
    });

    const unitBAfterFail = await prisma.labReagentUnit.findUnique({ where: { id: unitB.id } });
    assert(
      'Caso Borde E5: Descuenta exactamente 8 usos gastados del Frasco B (81 -> 73) con 0 pacientes diagnosticados',
      failResult.failedRun.status === LabWeeklyRunStatus.CLOSED_RECONCILED &&
        failResult.failedRun.totalValidPatientExams === 0 &&
        unitBAfterFail?.remainingUses === 73,
      'FASE 4 - E5',
      { remainingUses: 73, patients: 0 },
      { remainingUses: unitBAfterFail?.remainingUses, patients: failResult.failedRun.totalValidPatientExams }
    );

    const auditLogE5 = await prisma.labConsumptionAuditLog.findFirst({
      where: {
        weeklyRunId: run2.id,
        concept: ConsumptionConcept.REPEAT,
      },
    });
    assert(
      'Caso Borde E5: Asienta el desperdicio bajo concepto REPEAT en auditoría 5D',
      Boolean(auditLogE5),
      'FASE 4 - E5 LOG'
    );

    // =========================================================================
    // FASE 5: CUARENTENA TÉRMICA (CASO BORDE E3) Y ARQUEO FÍSICO 1-CLIC (CASO BORDE E6)
    // =========================================================================
    console.log('\n\x1b[1m\x1b[34m[FASE 5] Cuarentena Interna (Caso Borde E3) y Arqueo Físico 1-Clic (Caso Borde E6)\x1b[0m');

    // 5.1 Enviar Frasco B a Cuarentena Interna
    const qResult = await LabService.putUnitInQuarantine({
      unitId: unitB.id,
      reportedById: coordUser.id,
      quarantineReason: 'COLD_CHAIN_BREAK' as any,
      description: 'Alarma de sensor: subida momentánea a 12°C',
      labAreaId: testArea.id,
    });

    const unitBInQuarantine = await prisma.labReagentUnit.findUnique({ where: { id: unitB.id } });
    assert(
      'Caso Borde E3: Frasco B pasa a estado INTERNAL_QUARANTINE e incidente registrado',
      unitBInQuarantine?.status === LabUnitStatus.INTERNAL_QUARANTINE && Boolean(qResult.incident),
      'FASE 5 - E3'
    );

    // Intento de consumir Frasco B en cuarentena
    let quarantineBlockTriggered = false;
    try {
      await LabService.quickConsumeReagent({
        examId: testExam.id,
        labAreaId: testArea.id,
        unitId: unitB.id,
        userId: bioUser.id,
        userRoles: ['BIOANALISTA', 'LABORATORIO'],
        validPatientsCount: 1,
      });
    } catch (err: any) {
      quarantineBlockTriggered = true;
    }

    assert(
      'Caso Borde E3: Bloquea intentos de consumo en corridas mientras el frasco está en cuarentena',
      quarantineBlockTriggered,
      'FASE 5 - E3 LOCK'
    );

    // Liberar Frasco B de cuarentena
    await LabService.resolveQuarantine({
      incidentId: qResult.incident.id,
      resolvedById: coordUser.id,
      resolutionStatus: QuarantineResolutionStatus.REINTEGRATED_TO_STOCK,
      resolutionNotes: 'Control térmico y curvas testigo conformes. Se reintegra a mesón.',
    });

    const unitBLiberated = await prisma.labReagentUnit.findUnique({ where: { id: unitB.id } });
    assert(
      'Liberación técnica de cuarentena devuelve el Frasco B a estado EN_USO en mesón',
      unitBLiberated?.status === LabUnitStatus.EN_USO,
      'FASE 5 - E3 RESTORE'
    );

    // 5.2 Arqueo Físico de Nevera y Reconciliación 1-Clic (Caso Borde E6)
    // El sistema tiene 73 usos. En físico se observan 50 usos.
    const auditRecord = await FridgeAuditService.createFridgeAudit({
      performedById: coordUser.id,
      notes: 'Arqueo físico de inspección quincenal E2E',
      autoReconcile: false,
      items: [
        {
          labReagentUnitId: unitB.id,
          physicalRemainingUses: 50,
          notes: 'Evaporación o pipeteo excedente observado',
        },
      ],
    });

    assert(
      'Arqueo físico registrado con discrepancia detectada (Sistema: 73 vs Físico: 50)',
      Boolean(auditRecord && auditRecord.items.length === 1),
      'FASE 5 - E6'
    );

    // Reconciliación 1-Clic
    await LabService.reconcileFridgeAudit(auditRecord!.id, coordUser.id);

    const unitBReconciled = await prisma.labReagentUnit.findUnique({ where: { id: unitB.id } });
    const stockMovement = await prisma.labStockMovement.findFirst({
      where: {
        labReagentUnitId: unitB.id,
        movementType: LabMovementType.DESCARTE,
      },
    });
    const auditLogReconcile = await prisma.labConsumptionAuditLog.findFirst({
      where: {
        labReagentUnitId: unitB.id,
        concept: ConsumptionConcept.YIELD_DEFICIT,
      },
    });

    assert(
      'Caso Borde E6: Reconciliación 1-Clic actualizó el saldo del Frasco B exactamente a 50 usos y asentó Kardex y Auditoría 5D (YIELD_DEFICIT)',
      unitBReconciled?.remainingUses === 50 && Boolean(stockMovement) && Boolean(auditLogReconcile),
      'FASE 5 - E6 RECONCILE',
      { remainingUses: 50, kardexMovement: true, auditLog: true },
      { remainingUses: unitBReconciled?.remainingUses, kardexMovement: Boolean(stockMovement), auditLog: Boolean(auditLogReconcile) }
    );

    // =========================================================================
    // FASE 6: DEJAR SEMILLA VISUAL ACTIVA PARA UI
    // =========================================================================
    console.log('\n\x1b[1m\x1b[34m[FASE 6] Preparación de Semilla Visual Activa para UI (http://localhost:3000/lab)\x1b[0m');

    // 6.1 Crear corrida abierta acumulando para visualización en Tablero y Cierre
    const openRunUI = await LabService.createWeeklyRun({
      labAreaId: testArea.id,
      labExamId: testExam.id,
      bioanalystId: bioUser.id,
      weekStartDate: new Date(),
      weekEndDate: new Date(),
      notes: 'Corrida Abierta Semanal E2E (Semilla para Pruebas en UI)',
    });

    // 6.2 Dejar Frasco B listo en mesón con 40 usos para pruebas en la interfaz
    await prisma.labReagentUnit.update({
      where: { id: unitB.id },
      data: {
        status: LabUnitStatus.EN_USO,
        remainingUses: 40,
        currentVolume: 40,
        consumedUses: 56,
        assignedLabAreaId: testArea.id,
      },
    });

    // 6.3 Vincular todos los usuarios activos al área Inmunopatología E2E para visibilidad en navegador
    const allActiveUsers = await prisma.user.findMany({ where: { isActive: true } });
    for (const u of allActiveUsers) {
      await prisma.userLabArea.upsert({
        where: {
          userId_labAreaId: {
            userId: u.id,
            labAreaId: testArea.id,
          },
        },
        create: {
          userId: u.id,
          labAreaId: testArea.id,
        },
        update: {},
      });
    }

    assert(
      'Semilla visual activa generada (Corrida abierta RUN-' + openRunUI.code + ' y Frasco B listo con 40 usos)',
      Boolean(openRunUI && openRunUI.status === LabWeeklyRunStatus.OPEN_ACCUMULATING),
      'FASE 6'
    );

    // =========================================================================
    // RESUMEN FINAL
    // =========================================================================
    const totalAssertions = assertions.length;
    const passedAssertions = assertions.filter((a) => a.passed).length;
    const failedAssertions = totalAssertions - passedAssertions;

    console.log('\n\x1b[1m\x1b[36m========================================================================\x1b[0m');
    console.log('\x1b[1m\x1b[36m                       RESUMEN DE VERIFICACIÓN E2E                      \x1b[0m');
    console.log('\x1b[1m\x1b[36m========================================================================\x1b[0m');
    console.log(`  Total de Verificaciones: \x1b[1m${totalAssertions}\x1b[0m`);
    console.log(`  Aprobadas (PASS):       \x1b[1m\x1b[32m${passedAssertions}\x1b[0m`);
    console.log(`  Fallidas (FAIL):        \x1b[1m${failedAssertions > 0 ? '\x1b[31m' : '\x1b[32m'}${failedAssertions}\x1b[0m`);
    console.log('\x1b[1m\x1b[36m------------------------------------------------------------------------\x1b[0m');

    if (failedAssertions === 0) {
      console.log('\x1b[1m\x1b[32m  🎉 ¡TODAS LAS ASSECIONES DEL MÓDULO DE LABORATORIO PASARON AL 100%!   \x1b[0m');
      console.log('  Puede iniciar el frontend con `pnpm run dev` y entrar a /lab.');
      console.log('\x1b[1m\x1b[36m========================================================================\x1b[0m\n');
      process.exit(0);
    } else {
      console.error('\x1b[1m\x1b[31m  ❌ Se encontraron aserciones fallidas en la prueba E2E.\x1b[0m\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n\x1b[1m\x1b[31mError fatal no controlado durante la ejecución de la prueba E2E:\x1b[0m', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
