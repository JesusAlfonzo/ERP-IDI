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
  OrderStatus,
  PaymentStatus,
  ReceptionStatus,
  StockMovementType,
  PurchaseRequisitionStatus,
  ResearchProjectType,
  ResearchProjectStatus,
  ResearchTrialStatus,
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

describe('FASE 4: Reportes Financieros, Trazabilidad Punta a Punta y Cotejo Físico de Neveras', () => {
  let coordUser: any;
  let bioUser: any;
  let adminUser: any;

  let coordToken: string;
  let bioToken: string;
  let adminToken: string;

  let areaImmunoId: number;
  let examHivId: number;
  let fridgeId: number;

  let productKitId: bigint;
  let productCalId: bigint;

  let batchKitId: bigint;
  let batchCalId: bigint;

  let unitKit1Id: bigint;
  let unitKit2Id: bigint;
  let unitCal1Id: bigint;

  let orderId: bigint;
  let runId: number;
  let auditId: number;

  beforeAll(async () => {
    // 1. Limpieza de datos previos de pruebas con prefijo P4
    await prisma.fridgePhysicalAuditItem.deleteMany({
      where: {
        OR: [
          { labReagentUnit: { unitCode: { contains: 'UNIT-P4' } } },
          { audit: { performedBy: { username: 'coord_lab_p4' } } },
        ],
      },
    });

    await prisma.fridgePhysicalAudit.deleteMany({
      where: {
        performedBy: { username: 'coord_lab_p4' },
      },
    });

    await prisma.labConsumptionAuditLog.deleteMany({
      where: {
        OR: [
          { labArea: { code: 'AREA-IMMUNO-P4' } },
          { labReagentUnit: { unitCode: { contains: 'UNIT-P4' } } },
        ],
      },
    });

    await prisma.researchTrialConsumption.deleteMany({
      where: {
        OR: [
          { trial: { code: 'TRIAL-P4-001' } },
          { labReagentUnit: { unitCode: { contains: 'UNIT-P4' } } },
          { externalCalibratorUnit: { unitCode: { contains: 'UNIT-P4' } } },
        ],
      },
    });

    await prisma.researchTrial.deleteMany({
      where: {
        OR: [
          { code: 'TRIAL-P4-001' },
          { project: { code: 'PROJ-P4-001' } },
        ],
      },
    });

    await prisma.researchProjectMember.deleteMany({
      where: { project: { code: 'PROJ-P4-001' } },
    });

    await prisma.researchProject.deleteMany({
      where: { code: 'PROJ-P4-001' },
    });

    await prisma.labRunConsumption.deleteMany({
      where: {
        OR: [
          { labReagentUnit: { unitCode: { contains: 'UNIT-P4' } } },
          { externalCalibratorUnit: { unitCode: { contains: 'UNIT-P4' } } },
          { run: { labArea: { code: 'AREA-IMMUNO-P4' } } },
        ],
      },
    });

    await prisma.labWeeklyRun.deleteMany({
      where: {
        labArea: { code: 'AREA-IMMUNO-P4' },
      },
    });

    await prisma.labInternalRequestItem.deleteMany({
      where: {
        OR: [
          { assignedLabUnit: { unitCode: { contains: 'UNIT-P4' } } },
          { request: { labArea: { code: 'AREA-IMMUNO-P4' } } },
        ],
      },
    });

    await prisma.labInternalRequest.deleteMany({
      where: {
        labArea: { code: 'AREA-IMMUNO-P4' },
      },
    });

    await prisma.labStockMovement.deleteMany({
      where: {
        labReagentUnit: { unitCode: { contains: 'UNIT-P4' } },
      },
    });

    await prisma.labReagentUnit.deleteMany({
      where: {
        unitCode: { contains: 'UNIT-P4' },
      },
    });

    await prisma.stockMovementItem.deleteMany({
      where: {
        stockMovement: { referenceNumber: { in: ['MOV-P4-001', 'MOV-P4-002'] } },
      },
    });

    await prisma.stockMovement.deleteMany({
      where: { referenceNumber: { in: ['MOV-P4-001', 'MOV-P4-002'] } },
    });

    await prisma.stockBatch.deleteMany({
      where: {
        lotNumber: { in: ['LOT-P4-ELISA-01', 'LOT-P4-CAL-01'] },
      },
    });

    await prisma.orderPayment.deleteMany({
      where: { order: { orderNumber: 'ORD-P4-001' } },
    });

    await prisma.orderInvoice.deleteMany({
      where: { order: { orderNumber: 'ORD-P4-001' } },
    });

    await prisma.orderItem.deleteMany({
      where: { order: { orderNumber: 'ORD-P4-001' } },
    });

    await prisma.order.deleteMany({
      where: { orderNumber: 'ORD-P4-001' },
    });

    await prisma.purchaseRequisitionItem.deleteMany({
      where: { requisition: { requisitionNumber: 'REQ-PURCHASE-P4-001' } },
    });

    await prisma.purchaseRequisition.deleteMany({
      where: { requisitionNumber: 'REQ-PURCHASE-P4-001' },
    });

    await prisma.labExamProduct.deleteMany({
      where: { labExam: { code: 'EXAM-P4-HIV' } },
    });

    await prisma.labAreaProduct.deleteMany({
      where: { labArea: { code: 'AREA-IMMUNO-P4' } },
    });

    await prisma.labExam.deleteMany({
      where: { code: 'EXAM-P4-HIV' },
    });

    await prisma.userLabArea.deleteMany({
      where: { labArea: { code: 'AREA-IMMUNO-P4' } },
    });

    await prisma.labArea.deleteMany({
      where: { code: 'AREA-IMMUNO-P4' },
    });

    await prisma.fridge.deleteMany({
      where: { code: 'FRIDGE-P4' },
    });

    await prisma.product.deleteMany({
      where: { sku: { in: ['SKU-P4-ELISA-KIT', 'SKU-P4-CAL'] } },
    });

    // 2. Usuarios de prueba
    coordUser = await prisma.user.upsert({
      where: { username: 'coord_lab_p4' },
      update: {},
      create: {
        username: 'coord_lab_p4',
        email: 'coord_p4@idi.ucv.ve',
        passwordHash: 'dummy_hash',
        fullName: 'Dra. Gabriela Torres (Coordinadora P4)',
        department: 'Laboratorio',
        isActive: true,
      },
    });

    bioUser = await prisma.user.upsert({
      where: { username: 'bio_p4' },
      update: {},
      create: {
        username: 'bio_p4',
        email: 'bio_p4@idi.ucv.ve',
        passwordHash: 'dummy_hash',
        fullName: 'Lic. Manuel Rondón (Bioanalista P4)',
        department: 'Laboratorio',
        isActive: true,
      },
    });

    adminUser = await prisma.user.upsert({
      where: { username: 'admin_p4' },
      update: {},
      create: {
        username: 'admin_p4',
        email: 'admin_p4@idi.ucv.ve',
        passwordHash: 'dummy_hash',
        fullName: 'Administrador ERP P4',
        department: 'Administracion',
        isActive: true,
      },
    });

    coordToken = createToken(coordUser.id, coordUser.username, ['COORDINADOR_LABORATORIO']);
    bioToken = createToken(bioUser.id, bioUser.username, ['BIOANALISTA', 'LABORATORIO']);
    adminToken = createToken(adminUser.id, adminUser.username, ['ADMINISTRADOR']);

    // 3. Catálogos base: Moneda, Unidad, Categoría, Marca, Ubicaciones
    const currency = await prisma.currency.upsert({
      where: { code: 'USD' },
      update: {},
      create: {
        code: 'USD',
        name: 'Dólar Estadounidense',
        symbol: '$',
        isDefault: true,
      },
    });

    const unitMeasure = await prisma.unit.upsert({
      where: { abbreviation: 'KIT-P4' },
      update: {},
      create: {
        name: 'Kit de Ensayo P4',
        abbreviation: 'KIT-P4',
      },
    });

    const category = await prisma.category.upsert({
      where: { name: 'Reactivos Inmuno P4' },
      update: {},
      create: {
        name: 'Reactivos Inmuno P4',
        code: 'CAT-IMM-P4',
        description: 'Reactivos para pruebas serológicas e inmunoensayos',
      },
    });

    const brand = await prisma.brand.upsert({
      where: { name: 'BioRad P4' },
      update: {},
      create: {
        name: 'BioRad P4',
        description: 'Diagnóstico Clínico',
      },
    });

    const centralLocation = await prisma.location.upsert({
      where: { id: 9401 },
      update: {},
      create: {
        id: 9401,
        name: 'Almacén Central P4',
        type: LocationType.ALMACEN_GENERAL,
        description: 'Recepción y cuarentena central',
      },
    });

    const labLocation = await prisma.location.upsert({
      where: { id: 9402 },
      update: {},
      create: {
        id: 9402,
        name: 'Laboratorio Central P4',
        type: LocationType.LABORATORIO,
        description: 'Área de procesamiento',
      },
    });

    const fridge = await prisma.fridge.create({
      data: {
        code: 'FRIDGE-P4',
        name: 'Nevera Reactivos P4',
        locationId: labLocation.id,
        targetTempCelsius: 4.0,
      },
    });
    fridgeId = fridge.id;

    // 4. Área de Laboratorio y asignación de usuarios
    const areaImmuno = await prisma.labArea.create({
      data: {
        code: 'AREA-IMMUNO-P4',
        name: 'Inmunología Clínica P4',
        description: 'Área especializada en serología e inmunofluorescencia',
      },
    });
    areaImmunoId = areaImmuno.id;

    await prisma.userLabArea.createMany({
      data: [
        { userId: bioUser.id, labAreaId: areaImmunoId },
        { userId: coordUser.id, labAreaId: areaImmunoId },
      ],
    });

    // 5. Proveedor, Requisición y Orden de Compra (Fase 1 Trazabilidad)
    const supplier = await prisma.supplier.upsert({
      where: { rifOrId: 'J-88888888-4' },
      update: {},
      create: {
        rifOrId: 'J-88888888-4',
        name: 'PROVEEDOR P4 IMMUNO CA',
        email: 'contacto@proveedor-p4.com',
        phone: '+58-212-9999999',
      },
    });

    const department = await prisma.department.upsert({
      where: { code: 'LAB-DEPT-P4' },
      update: {},
      create: {
        code: 'LAB-DEPT-P4',
        name: 'Laboratorio e Inmunología P4',
      },
    });

    const requisition = await prisma.purchaseRequisition.create({
      data: {
        requisitionNumber: 'REQ-PURCHASE-P4-001',
        departmentId: department.id,
        justification: 'Dotación trimestral de kits diagnósticos de serología',
        status: PurchaseRequisitionStatus.ADJUDICADA,
        createdById: coordUser.id,
      },
    });

    const order = await prisma.order.create({
      data: {
        orderNumber: 'ORD-P4-001',
        supplierId: supplier.id,
        currency: 'USD',
        currencyId: currency.id,
        exchangeRate: 1.0,
        status: OrderStatus.COMPLETADA,
        paymentStatus: PaymentStatus.PAGADO,
        receptionStatus: ReceptionStatus.COMPLETO,
        subtotal: 146.0,
        taxTotal: 0.0,
        total: 146.0,
        requisitionId: requisition.id,
        createdById: adminUser.id,
      },
    });
    orderId = order.id;

    await prisma.orderInvoice.create({
      data: {
        orderId: order.id,
        invoiceNumber: 'INV-P4-001',
        invoiceDate: new Date('2026-03-01'),
        taxAmount: 0.0,
        totalAmount: 146.0,
      },
    });

    await prisma.orderPayment.create({
      data: {
        orderId: order.id,
        method: 'TRANSFERENCIA_USD',
        amount: 146.0,
        amountPaid: 146.0,
        paymentDate: new Date('2026-03-02'),
        registeredById: adminUser.id,
      },
    });

    // 6. Productos y Lotes (Fase 2 Trazabilidad)
    const productKit = await prisma.product.create({
      data: {
        sku: 'SKU-P4-ELISA-KIT',
        name: 'Kit ELISA HIV Ag/Ab 4ta Gen P4',
        categoryId: category.id,
        brandId: brand.id,
        baseUnitId: unitMeasure.id,
        isLabReagent: true,
        labItemType: LabItemType.REAGENT_KIT,
        theoreticalYield: 96,
        includesCalibrator: false,
        calibratorsPerRun: 4,
      },
    });
    productKitId = productKit.id;

    const productCal = await prisma.product.create({
      data: {
        sku: 'SKU-P4-CAL',
        name: 'Calibrador Externo HIV 1/2 P4',
        categoryId: category.id,
        brandId: brand.id,
        baseUnitId: unitMeasure.id,
        isLabReagent: true,
        labItemType: LabItemType.STANDALONE_CALIBRATOR,
        theoreticalYield: 50,
      },
    });
    productCalId = productCal.id;

    const batchKit = await prisma.stockBatch.create({
      data: {
        productId: productKit.id,
        locationId: centralLocation.id,
        lotNumber: 'LOT-P4-ELISA-01',
        currentQuantity: 2,
        costPrice: 96.0,
        expirationDate: new Date('2027-01-01'),
        ownershipType: StockOwnership.CLINICAL_ROUTINE,
      },
    });
    batchKitId = batchKit.id;

    const batchCal = await prisma.stockBatch.create({
      data: {
        productId: productCal.id,
        locationId: centralLocation.id,
        lotNumber: 'LOT-P4-CAL-01',
        currentQuantity: 1,
        costPrice: 50.0,
        expirationDate: new Date('2027-01-01'),
        ownershipType: StockOwnership.CLINICAL_ROUTINE,
      },
    });
    batchCalId = batchCal.id;

    // Vincular lote a la orden mediante movimiento de entrada de compra
    const movement = await prisma.stockMovement.create({
      data: {
        referenceNumber: 'MOV-P4-001',
        type: StockMovementType.ENTRADA_COMPRA,
        orderId: order.id,
        destinationLocationId: centralLocation.id,
        createdById: adminUser.id,
      },
    });

    await prisma.stockMovementItem.createMany({
      data: [
        {
          stockMovementId: movement.id,
          batchId: batchKit.id,
          quantity: 2,
          unitCost: 96.0,
        },
        {
          stockMovementId: movement.id,
          batchId: batchCal.id,
          quantity: 1,
          unitCost: 50.0,
        },
      ],
    });

    // 7. Unidades de reactivo en nevera (LabReagentUnit)
    const unitKit1 = await prisma.labReagentUnit.create({
      data: {
        productId: productKit.id,
        batchId: batchKit.id,
        fridgeId: fridge.id,
        assignedLabAreaId: areaImmunoId,
        unitCode: 'UNIT-P4-KIT-01',
        initialVolume: 96,
        currentVolume: 96,
        initialTheoreticalUses: 96,
        remainingUses: 96,
        consumedUses: 0,
        unitCostPerUse: 1.0, // $96 / 96 usos
        status: LabUnitStatus.SELLADO,
        ownershipType: StockOwnership.CLINICAL_ROUTINE,
      },
    });
    unitKit1Id = unitKit1.id;

    const unitKit2 = await prisma.labReagentUnit.create({
      data: {
        productId: productKit.id,
        batchId: batchKit.id,
        fridgeId: fridge.id,
        assignedLabAreaId: areaImmunoId,
        unitCode: 'UNIT-P4-KIT-02',
        initialVolume: 96,
        currentVolume: 10,
        initialTheoreticalUses: 96,
        remainingUses: 10,
        consumedUses: 86,
        unitCostPerUse: 1.0,
        status: LabUnitStatus.EN_USO,
        ownershipType: StockOwnership.CLINICAL_ROUTINE,
      },
    });
    unitKit2Id = unitKit2.id;

    const unitCal1 = await prisma.labReagentUnit.create({
      data: {
        productId: productCal.id,
        batchId: batchCal.id,
        fridgeId: fridge.id,
        assignedLabAreaId: areaImmunoId,
        unitCode: 'UNIT-P4-CAL-01',
        initialVolume: 50,
        currentVolume: 50,
        initialTheoreticalUses: 50,
        remainingUses: 50,
        consumedUses: 0,
        unitCostPerUse: 1.0, // $50 / 50 usos
        status: LabUnitStatus.EN_USO,
        ownershipType: StockOwnership.CLINICAL_ROUTINE,
      },
    });
    unitCal1Id = unitCal1.id;

    // 8. Solicitud Interna a Coordinación (Fase 3 Trazabilidad)
    const internalRequest = await prisma.labInternalRequest.create({
      data: {
        code: 'REQ-LAB-P4-001',
        labAreaId: areaImmunoId,
        requestedById: bioUser.id,
        reviewedById: coordUser.id,
        status: LabInternalRequestStatus.DELIVERED,
        justification: 'Campaña semanal de tamizaje de pacientes serológicos',
        resolvedAt: new Date(),
        items: {
          create: [
            {
              productId: productKit.id,
              requestedUsesOrUnits: 1,
              assignedLabUnitId: unitKit1.id,
            },
          ],
        },
      },
    });

    // 9. Examen y Corrida Semanal con Doble Descuento y Desglose Completo (Fase 4 Trazabilidad)
    const examHiv = await prisma.labExam.create({
      data: {
        code: 'EXAM-P4-HIV',
        name: 'ELISA HIV 4ta Generación P4',
        areaId: areaImmunoId,
      },
    });
    examHivId = examHiv.id;

    await prisma.labExamProduct.create({
      data: {
        labExamId: examHiv.id,
        productId: productKit.id,
      },
    });

    // Crear corrida y cerrarla vía endpoint
    const createRunRes = await request(app)
      .post('/api/lab/runs')
      .set('Authorization', `Bearer ${bioToken}`)
      .send({
        labAreaId: areaImmunoId,
        labExamId: examHiv.id,
        weekStartDate: new Date('2026-03-01'),
        weekEndDate: new Date('2026-03-07'),
        notes: 'Corrida de validación serológica P4',
      });

    runId = createRunRes.body.data.id;

    // Cierre de corrida con:
    // - 30 pacientes válidos
    // - 4 repeticiones (motivo: CRITICAL_VALUE_CONFIRMATION)
    // - 2 controles
    // - 2 mermas
    // => Total primario = 30 + 4 + 2 + 2 = 38 usos a $1.00 = $38.00
    // - 4 calibradores externos a $1.00 = $4.00
    // => Costo total de corrida = $42.00
    // => Costo efectivo real por paciente = $42.00 / 30 = $1.4000
    const closeRunRes = await request(app)
      .post(`/api/lab/runs/${runId}/close`)
      .set('Authorization', `Bearer ${bioToken}`)
      .send({
        totalValidPatientExams: 30,
        notes: 'Cierre con repeticiones por confirmación de valor crítico',
        consumptions: [
          {
            labReagentUnitId: unitKit1.id.toString(),
            externalCalibratorUnitId: unitCal1.id.toString(),
            patientUses: 30,
            repeatUses: 4,
            repeatReason: RepeatReason.CRITICAL_VALUE_CONFIRMATION,
            repeatNotes: 'Confirmación de reactividad limítrofe',
            calibratorUses: 4,
            controlUses: 2,
            wasteUses: 2,
          },
        ],
      });

    expect(closeRunRes.status).toBe(200);

    // 10. Proyecto y Ensayo de Investigación (para verificar separación financiera de Área)
    const researchProject = await prisma.researchProject.create({
      data: {
        code: 'PROJ-P4-001',
        title: 'Proyecto P4 Seroprevalencia Viral',
        type: ResearchProjectType.INSTITUTIONAL,
        status: ResearchProjectStatus.ACTIVE,
        totalInvestedFunds: 1000.0,
        remainingFunds: 1000.0,
      },
    });

    const trial = await prisma.researchTrial.create({
      data: {
        code: 'TRIAL-P4-001',
        projectId: researchProject.id,
        executedById: bioUser.id,
        trialDate: new Date(),
        title: 'Ensayo Piloto P4 de Reactividad Cruzada',
        status: ResearchTrialStatus.COMPLETED,
        totalSamplesTested: 10,
        totalTrialCost: 15.0,
      },
    });

    // Registrar log de auditoría 5D de investigación
    await prisma.labConsumptionAuditLog.create({
      data: {
        userId: bioUser.id,
        labAreaId: areaImmunoId,
        researchTrialId: trial.id,
        labReagentUnitId: unitKit1.id,
        concept: ConsumptionConcept.PATIENT,
        usesCount: 15,
        costImpact: 15.0,
        notes: 'Consumo experimental para ensayo piloto de investigación',
      },
    });
  });

  describe('1. Reporte Financiero por Examen (Cálculo del Sobrecosto Real)', () => {
    it('debe calcular exactamente el costo unitario real por examen agrupando corrida cerrada y desglosando usos', async () => {
      const res = await request(app)
        .get(`/api/reports/financial/by-exam?examId=${examHivId}`)
        .set('Authorization', `Bearer ${coordToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('SUCCESS');

      const data = res.body.data;
      expect(data.reportType).toBe('REAL_COST_BY_EXAM');

      const examData = data.exams.find((e: any) => e.examCode === 'EXAM-P4-HIV');
      expect(examData).toBeDefined();

      // Validación de métricas exactas
      expect(examData.totalRuns).toBe(1);
      expect(examData.totalValidPatientExams).toBe(30);
      expect(examData.totalRunCost).toBe(46);
      expect(examData.effectiveCostPerExam).toBeCloseTo(1.5333, 2); // 46 / 30 = 1.5333

      // Desglose de determinaciones
      expect(examData.usesBreakdown.patientUses).toBe(30);
      expect(examData.usesBreakdown.repeatUses).toBe(4);
      expect(examData.usesBreakdown.calibratorUses).toBe(4);
      expect(examData.usesBreakdown.controlUses).toBe(2);
      expect(examData.usesBreakdown.wasteUses).toBe(2);
      expect(examData.usesBreakdown.totalDeductedUses).toBe(42);

      // Desglose por motivo de repetición
      expect(examData.repeatReasons.CRITICAL_VALUE_CONFIRMATION).toBe(4);
    });
  });

  describe('2. Reporte Consolidado por Área (Clínico vs Investigación)', () => {
    it('debe consolidar el gasto del área separando la rutina clínica del gasto en investigación', async () => {
      const res = await request(app)
        .get(`/api/reports/financial/by-area?labAreaId=${areaImmunoId}`)
        .set('Authorization', `Bearer ${coordToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('SUCCESS');

      const areaData = res.body.data.areas.find((a: any) => a.areaCode === 'AREA-IMMUNO-P4');
      expect(areaData).toBeDefined();

      // Rutina clínica
      expect(areaData.clinical.closedRunsCount).toBe(1);
      expect(areaData.clinical.totalValidPatientExams).toBe(30);
      expect(areaData.clinical.totalCost).toBe(46);
      expect(areaData.clinical.activeFridgeStock.unitsCount).toBeGreaterThanOrEqual(1);

      // Investigación
      expect(areaData.research.consumedMaterialsValueUsd).toBe(15);

      // Costo total operativo = 46 + 15 = 61
      expect(areaData.totalOperatingCost).toBe(61);
    });
  });

  describe('3. Trazabilidad Punta a Punta (4 Fases)', () => {
    it('debe recuperar la cadena completa de custodia desde la compra hasta la corrida y auditoría 5D', async () => {
      const res = await request(app)
        .get(`/api/reports/traceability/item/${batchKitId.toString()}`)
        .set('Authorization', `Bearer ${coordToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('SUCCESS');

      const data = res.body.data;
      expect(data.reportType).toBe('END_TO_END_TRACEABILITY');
      expect(data.product.sku).toBe('SKU-P4-ELISA-KIT');

      // Fase 1: Lo que se pidió (Compras y Pagos)
      const phase1 = data.lifecycle.phase1_procurement;
      expect(phase1.length).toBeGreaterThanOrEqual(1);
      expect(phase1[0].orderNumber).toBe('ORD-P4-001');
      expect(phase1[0].supplierName).toBe('PROVEEDOR P4 IMMUNO CA');
      expect(phase1[0].supplierTaxId).toBe('J-88888888-4');
      expect(phase1[0].requisitionNumber).toBe('REQ-PURCHASE-P4-001');
      expect(phase1[0].invoices[0].invoiceNumber).toBe('INV-P4-001');
      expect(phase1[0].payments[0].method).toBe('TRANSFERENCIA_USD');

      // Fase 2: Lo que se recibió en almacén central
      const phase2 = data.lifecycle.phase2_warehouseReception;
      expect(phase2.lotNumber).toBe('LOT-P4-ELISA-01');
      expect(phase2.receptionLocation).toBe('Almacén Central P4');
      expect(Number(phase2.unitCostPrice)).toBe(96);

      // Fase 3: Solicitudes internas a nevera
      const phase3 = data.lifecycle.phase3_internalRequests;
      expect(phase3.length).toBeGreaterThanOrEqual(1);
      expect(phase3[0].requestCode).toBe('REQ-LAB-P4-001');
      expect(phase3[0].labArea).toBe('Inmunología Clínica P4');
      expect(phase3[0].status).toBe('DELIVERED');

      // Fase 4: Consumo, corridas y bitácora 5D
      const phase4 = data.lifecycle.phase4_consumptionAndExecution;
      expect(phase4.weeklyRuns.length).toBeGreaterThanOrEqual(1);
      expect(phase4.weeklyRuns[0].examName).toBe('ELISA HIV 4ta Generación P4');
      expect(phase4.weeklyRuns[0].totalDeductedUses).toBe(42);

      // Bitácora de auditoría 5D
      expect(phase4.auditHistory.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('4. Cotejo Físico de Nevera (Fridge Physical Audit)', () => {
    it('debe registrar el cotejo físico con varianza positiva y negativa, actualizar stock, agotar kit en 0 y crear logs 5D', async () => {
      // Estado antes del cotejo:
      // - unitKit1: remainingUses = 96 - 42 = 54
      // - unitKit2: remainingUses = 10
      // - unitCal1: remainingUses = 50 - 4 = 46

      // Cotejo Físico:
      // - unitKit1: conteo físico = 50 (merma de -4 usos)
      // - unitKit2: conteo físico = 0 (agotado, varianza = -10 usos)
      // - unitCal1: conteo físico = 48 (sobrante de +2 usos)
      const res = await request(app)
        .post('/api/fridge-audits')
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          notes: 'Auditoría mensual de control de calidad y conteo físico de nevera P4',
          items: [
            {
              labReagentUnitId: unitKit1Id.toString(),
              physicalRemainingUses: 50,
              notes: 'Descarte físico de 4 micropozos dañados durante pipeteo',
            },
            {
              labReagentUnitId: unitKit2Id.toString(),
              physicalRemainingUses: 0,
              notes: 'Kit completamente vacío al momento de la inspección',
            },
            {
              labReagentUnitId: unitCal1Id.toString(),
              physicalRemainingUses: 48,
              notes: 'Sobrante por sobredosificación en calibración anterior',
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('SUCCESS');

      const audit = res.body.data;
      auditId = audit.id;
      expect(audit.code).toMatch(/^AUD-FRIDGE-\d{4}-\d{4}-\d{4}$/);
      expect(audit.performedBy.fullName).toBe('Dra. Gabriela Torres (Coordinadora P4)');
      expect(audit.items).toHaveLength(3);

      // Verificar Item 1 (Merma de 4)
      const item1 = audit.items.find((it: any) => it.labReagentUnitId === unitKit1Id.toString());
      expect(item1).toBeDefined();
      expect(item1.systemRemainingUses).toBe(54);
      expect(item1.physicalRemainingUses).toBe(50);
      expect(item1.variance).toBe(-4);
      expect(item1.adjustmentStatus).toBe(FridgeAuditAdjustmentStatus.ADJUSTED_AND_RECONCILED);

      // Verificar Item 2 (Agotado a 0)
      const item2 = audit.items.find((it: any) => it.labReagentUnitId === unitKit2Id.toString());
      expect(item2).toBeDefined();
      expect(item2.systemRemainingUses).toBe(10);
      expect(item2.physicalRemainingUses).toBe(0);
      expect(item2.variance).toBe(-10);

      // Verificar Item 3 (Sobrante de +2)
      const item3 = audit.items.find((it: any) => it.labReagentUnitId === unitCal1Id.toString());
      expect(item3).toBeDefined();
      expect(item3.systemRemainingUses).toBe(46);
      expect(item3.physicalRemainingUses).toBe(48);
      expect(item3.variance).toBe(2);

      // Validar persistencia real en base de datos
      const dbUnit1 = await prisma.labReagentUnit.findUnique({ where: { id: unitKit1Id } });
      expect(dbUnit1?.remainingUses).toBe(50);
      expect(dbUnit1?.yieldVariance).toBe(-4);

      const dbUnit2 = await prisma.labReagentUnit.findUnique({ where: { id: unitKit2Id } });
      expect(dbUnit2?.remainingUses).toBe(0);
      expect(dbUnit2?.status).toBe(LabUnitStatus.AGOTADO);
      expect(dbUnit2?.yieldVariance).toBe(-10);

      const dbCal1 = await prisma.labReagentUnit.findUnique({ where: { id: unitCal1Id } });
      expect(dbCal1?.remainingUses).toBe(48);
      expect(dbCal1?.yieldVariance).toBe(2);

      // Validar creación de bitácora 5D (PHYSICAL_AUDIT_ADJUSTMENT)
      const auditLogs = await prisma.labConsumptionAuditLog.findMany({
        where: {
          concept: ConsumptionConcept.PHYSICAL_AUDIT_ADJUSTMENT,
          labReagentUnitId: { in: [unitKit1Id, unitKit2Id, unitCal1Id] },
        },
      });

      expect(auditLogs).toHaveLength(3);
    });

    it('debe listar y consultar la auditoría de nevera por ID con su detalle', async () => {
      const listRes = await request(app)
        .get('/api/fridge-audits')
        .set('Authorization', `Bearer ${coordToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.status).toBe('SUCCESS');
      expect(Array.isArray(listRes.body.data)).toBe(true);

      const singleRes = await request(app)
        .get(`/api/fridge-audits/${auditId}`)
        .set('Authorization', `Bearer ${coordToken}`);

      expect(singleRes.status).toBe(200);
      expect(singleRes.body.status).toBe('SUCCESS');
      expect(singleRes.body.data.id).toBe(auditId);
      expect(singleRes.body.data.items).toHaveLength(3);
    });

    it('debe rechazar solicitudes de auditoría con datos inválidos', async () => {
      const emptyItemsRes = await request(app)
        .post('/api/fridge-audits')
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          notes: 'Sin ítems',
          items: [],
        });

      expect(emptyItemsRes.status).toBe(400);

      const negativeUsesRes = await request(app)
        .post('/api/fridge-audits')
        .set('Authorization', `Bearer ${coordToken}`)
        .send({
          items: [
            {
              labReagentUnitId: unitKit1Id.toString(),
              physicalRemainingUses: -5,
            },
          ],
        });

      expect(negativeUsesRes.status).toBeGreaterThanOrEqual(400);
    });
  });
});
