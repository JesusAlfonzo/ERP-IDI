import {
  PrismaClient,
  LocationType,
  FridgeStatus,
  LabItemType,
  ResearchProjectType,
  ResearchProjectStatus,
  ResearchMemberRole,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// =========================================================================
// 1. PROVEEDOR REAL DE DEMOSTRACIÓN (1 PROVEEDOR INSTITUCIONAL)
// =========================================================================
const demoSupplier = {
  name: 'ALFA QUANTUM LABORATORIOS 2010 C.A.',
  rif: 'J-29898050-8',
  phone: '(0212) 414-2271',
  email: 'ventas@alfaquantum.com',
  address: 'Av. Intercomunal del Valle, Conj. Residencial Longaray, Caracas',
};

// =========================================================================
// 2. PRODUCTOS DE LABORATORIO (5 PRODUCTOS: 3 REACTIVOS + 2 INSUMOS GENERALES)
// TODOS CON STOCK CERO PARA DEMOSTRACIÓN DE COMPRAS, RECEPCIÓN Y SOLICITUDES
// =========================================================================
const labGeneralSupplies = [
  {
    name: 'GUANTES DE NITRILO TALLA M',
    sku: 'LAB-001',
    unit: 'CAJA',
    minStock: 10,
    description: 'Guantes descartables de nitrilo sin talco para bioseguridad en toma de muestras y procesamiento analítico.',
  },
  {
    name: 'TUBOS DE EXTRACCION TAPA MORADA (EDTA)',
    sku: 'LAB-002',
    unit: 'GRADILLA',
    minStock: 5,
    description: 'Tubos de extracción al vacío con anticoagulante EDTA K3 para hematología e inmunología.',
  },
];

const clinicalReagents = [
  {
    name: 'Kit ELISA Anti-dsDNA (Human)',
    sku: 'KIT-ELISA-DNA',
    theoreticalYield: 96,
    labItemType: LabItemType.REAGENT_KIT,
    unit: 'KIT',
    brand: 'Bio-Rad',
    minStockAlert: 3,
    description: 'Kit de 96 pozos para determinación cuantitativa de anticuerpos anti-dsDNA en suero humano.',
    includesCalibrator: true,
    calibratorsPerRun: 4,
  },
  {
    name: 'Kit Inmunoglobulinas Cuantitativas (IgG, IgA, IgM)',
    sku: 'KIT-INMUNO-CUANT',
    theoreticalYield: 100,
    labItemType: LabItemType.REAGENT_KIT,
    unit: 'KIT',
    brand: 'Roche Diagnostics',
    minStockAlert: 2,
    description: 'Kit turbidimétrico para cuantificación de inmunoglobulinas principales.',
    includesCalibrator: true,
    calibratorsPerRun: 3,
  },
  {
    name: 'Kit Anticuerpos Antinucleares ANA Hep-2 (IFI)',
    sku: 'KIT-ANA-HEP2',
    theoreticalYield: 48,
    labItemType: LabItemType.REAGENT_KIT,
    unit: 'KIT',
    brand: 'Sigma-Aldrich',
    minStockAlert: 2,
    description: 'Láminas y reactivos para ensayo de inmunofluorescencia indirecta Hep-2.',
    includesCalibrator: false,
    calibratorsPerRun: 2,
  },
];

async function main() {
  console.log('========================================================================');
  console.log('    INICIALIZANDO SEEDER PARA EXPOSICIÓN Y DEMOSTRACIÓN ERP-IDI         ');
  console.log('========================================================================\n');

  // -----------------------------------------------------------------------
  // 1. LIMPIEZA COMPLETA DE TABLAS EN ORDEN TOPOLÓGICO
  // -----------------------------------------------------------------------
  console.log('🧹 [Paso 1/11] Vaciando tablas previas de la base de datos...');

  // Investigación
  await prisma.researchStockTransfer.deleteMany();
  await prisma.researchTrialConsumption.deleteMany();
  await prisma.researchFinding.deleteMany();
  await prisma.researchTrial.deleteMany();
  await prisma.researchProjectMember.deleteMany();
  await prisma.researchDonationItem.deleteMany();
  await prisma.researchDonation.deleteMany();
  await prisma.researchInvestment.deleteMany();
  await prisma.researchInvestor.deleteMany();
  await prisma.researchProject.deleteMany();

  // Laboratorio y Cadena de Frío
  await prisma.labInternalRequestItem.deleteMany();
  await prisma.labInternalRequest.deleteMany();
  await prisma.fridgePhysicalAuditItem.deleteMany();
  await prisma.fridgePhysicalAudit.deleteMany();
  await prisma.labConsumptionAuditLog.deleteMany();
  await prisma.labRunConsumption.deleteMany();
  await prisma.labWeeklyRun.deleteMany();
  await prisma.labStockMovement.deleteMany();
  await prisma.batchIncident.deleteMany();
  await prisma.labReagentUnit.deleteMany();

  // Movimientos de Stock y Solicitudes de Almacén
  await prisma.stockMovementItem.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.requestItem.deleteMany();
  await prisma.request.deleteMany();
  await prisma.stockBatch.deleteMany();

  // Compras, Órdenes, Pagos y Preórdenes
  await prisma.orderPayment.deleteMany();
  await prisma.orderInvoice.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.purchaseRequisitionItem.deleteMany();
  await prisma.purchaseRequisition.deleteMany();
  await prisma.directPayment.deleteMany();

  // Relaciones de Exámenes y Áreas
  await prisma.labExamProduct.deleteMany();
  await prisma.labAreaProduct.deleteMany();
  await prisma.labExam.deleteMany();
  await prisma.userLabArea.deleteMany();
  await prisma.labArea.deleteMany();
  await prisma.fridge.deleteMany();

  // Catálogos e Insumos
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.category.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.location.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.justificationConcept.deleteMany();
  await prisma.paymentMethodCatalog.deleteMany();
  await prisma.requestWindowConfig.deleteMany();

  // Seguridad, Usuarios y Roles
  await prisma.refreshToken.deleteMany();
  await prisma.rolePermission.deleteMany().catch(() => {});
  await prisma.permission.deleteMany().catch(() => {});
  await prisma.userRole.deleteMany();
  await prisma.currencyExchange.deleteMany();
  await prisma.currency.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.department.deleteMany();
  await prisma.unit.deleteMany();

  console.log('   ✅ Base de datos vaciada con éxito.\n');

  // -----------------------------------------------------------------------
  // 2. MONEDAS Y TASAS BCV OFICIALES
  // -----------------------------------------------------------------------
  console.log('💵 [Paso 2/11] Sembrando monedas institucionales...');
  const usdCurr = await prisma.currency.create({
    data: { code: 'USD', name: 'Dólar Estadounidense', symbol: '$', isDefault: true },
  });
  const vesCurr = await prisma.currency.create({
    data: { code: 'VES', name: 'Bolívar Digital', symbol: 'Bs.', isDefault: false },
  });
  const eurCurr = await prisma.currency.create({
    data: { code: 'EUR', name: 'Euro', symbol: '€', isDefault: false },
  });

  // -----------------------------------------------------------------------
  // 3. UNIDADES DE MEDIDA
  // -----------------------------------------------------------------------
  console.log('📐 [Paso 3/11] Sembrando unidades de medida...');
  const unitsMap: Record<string, number> = {};
  const standardUnits = [
    { name: 'Unidad', abbreviation: 'UND' },
    { name: 'Caja', abbreviation: 'CAJA' },
    { name: 'Gradilla', abbreviation: 'GRADILLA' },
    { name: 'Kit', abbreviation: 'KIT' },
    { name: 'Frasco', abbreviation: 'FCO' },
    { name: 'Mililitro', abbreviation: 'ML' },
    { name: 'Determinaciones', abbreviation: 'DET' },
    { name: 'Rollo', abbreviation: 'ROLLO' },
    { name: 'Galón', abbreviation: 'GALON' },
    { name: 'Litro', abbreviation: 'LITRO' },
    { name: 'Resma', abbreviation: 'RESMA' },
  ];

  for (const u of standardUnits) {
    const created = await prisma.unit.create({ data: u });
    unitsMap[u.abbreviation] = created.id;
  }

  // -----------------------------------------------------------------------
  // 4. CATEGORÍAS Y MARCAS
  // -----------------------------------------------------------------------
  console.log('🏷️ [Paso 4/11] Sembrando categorías y marcas...');
  const categoriesMap: Record<string, number> = {};
  const categoriesList = [
    { code: 'LAB', name: 'Laboratorio', description: 'Insumos, reactivos y material médico-quirúrgico' },
    { code: 'LIMP', name: 'Limpieza', description: 'Materiales y productos de mantenimiento e higiene' },
    { code: 'OFIC', name: 'Oficina', description: 'Papelería, suministros y consumibles de oficina' },
  ];
  for (const cat of categoriesList) {
    const c = await prisma.category.create({ data: cat });
    categoriesMap[cat.name] = c.id;
  }

  const brandsMap: Record<string, number> = {};
  const brandsList = [
    { name: 'Genérico / Preparado Interno', description: 'Insumos o preparados institucionales' },
    { name: 'Bio-Rad', description: 'Kits y reactivos de diagnóstico clínico de alta sensibilidad' },
    { name: 'Roche Diagnostics', description: 'Sistemas analíticos de inmunoturbidimetría' },
    { name: 'Sigma-Aldrich', description: 'Reactivos químicos puros y sustratos' },
  ];
  for (const b of brandsList) {
    const brand = await prisma.brand.create({ data: b });
    brandsMap[b.name] = brand.id;
  }

  // -----------------------------------------------------------------------
  // 5. UBICACIONES FÍSICAS Y NEVERAS (CADENA DE FRÍO)
  // -----------------------------------------------------------------------
  console.log('❄️ [Paso 5/11] Sembrando almacén y equipos de frío de laboratorio...');
  const warehouseLocation = await prisma.location.create({
    data: {
      name: 'Almacén Central',
      type: LocationType.ALMACEN_GENERAL,
      description: 'Almacén principal de insumos no refrigerados y stock general.',
    },
  });

  const labLocation = await prisma.location.create({
    data: {
      name: 'Laboratorio Central de Inmunología',
      type: LocationType.LABORATORIO,
      description: 'Área analítica principal de procesamiento de muestras clínicas e I+D.',
    },
  });

  await prisma.fridge.create({
    data: {
      code: 'NEV-01',
      name: 'Nevera Principal Inmuno 01 (2-8°C)',
      locationId: labLocation.id,
      targetTempCelsius: 4.0,
      status: FridgeStatus.OPERATIVO,
      description: 'Nevera vertical para kits ELISA y reactivos de rutina asistencial.',
    },
  });

  await prisma.fridge.create({
    data: {
      code: 'NEV-02',
      name: 'Nevera Inmunopatología (2-8°C)',
      locationId: labLocation.id,
      targetTempCelsius: 4.0,
      status: FridgeStatus.OPERATIVO,
      description: 'Equipo de frío para sueros controles, sustratos y láminas Hep-2.',
    },
  });

  await prisma.fridge.create({
    data: {
      code: 'CAVA-01',
      name: 'Congelador de Sueros e I+D (-20°C)',
      locationId: labLocation.id,
      targetTempCelsius: -20.0,
      status: FridgeStatus.OPERATIVO,
      description: 'Congelador horizontal para alícuotas criopreservadas y reactivos de I+D.',
    },
  });

  // -----------------------------------------------------------------------
  // 6. DEPARTAMENTOS INSTITUCIONALES Y ÁREAS OPERATIVAS DE LABORATORIO
  // -----------------------------------------------------------------------
  console.log('🏛️ [Paso 6/11] Sembrando departamentos y áreas operativas de laboratorio...');
  const departmentsList = [
    { code: 'ADM-FIN', name: 'Administración y Finanzas', description: 'Tesorería, compras y adquisiciones' },
    { code: 'LAB-GEN', name: 'Laboratorio General', description: 'Toma de muestras y recepción diagnóstica' },
    { code: 'INM-GEN', name: 'Inmunología General', description: 'Procesamiento de pruebas de rutina clínica' },
    { code: 'INM-PAT', name: 'Inmunopatología', description: 'Diagnóstico de enfermedades autoinmunes y biopsias' },
    { code: 'ALM-GEN', name: 'Almacén General', description: 'Custodia y despacho de suministros institucionales' },
    { code: 'ALE-INM', name: 'Alergia e Inmunología Clínica', description: 'Consulta clínica y pruebas de provocación' },
    { code: 'INV-DES', name: 'Investigación y Desarrollo (I+D)', description: 'Proyectos científicos y ensayos de investigación' },
    { code: 'SIS-INF', name: 'Sistemas e Informática', description: 'Infraestructura tecnológica' },
  ];
  for (const d of departmentsList) {
    await prisma.department.create({ data: d });
  }

  // Áreas Operativas de Laboratorio Clínico
  const areaInmuno = await prisma.labArea.create({
    data: {
      code: 'AREA-INM-GEN',
      name: 'Inmunología General',
      description: 'Mesón analítico principal de pruebas ELISA e inmunoglobulinas',
    },
  });

  const areaPatologia = await prisma.labArea.create({
    data: {
      code: 'AREA-INM-PAT',
      name: 'Inmunopatología',
      description: 'Mesón de microscopía de inmunofluorescencia y autoanticuerpos ANA',
    },
  });

  const areaCitometria = await prisma.labArea.create({
    data: {
      code: 'AREA-CITOM',
      name: 'Citometría de Flujo',
      description: 'Citómetro analítico y marcación de subpoblaciones celulares',
    },
  });

  const areaAlergia = await prisma.labArea.create({
    data: {
      code: 'AREA-ALE-INM',
      name: 'Alergia e Inmunología Clínica',
      description: 'Mesón de pruebas de hipersensibilidad, IgE específica y aeroalérgenos',
    },
  });

  const areaBiomol = await prisma.labArea.create({
    data: {
      code: 'AREA-BIO-MOL',
      name: 'Biología Molecular e Inmunogenética',
      description: 'Termocicladores, PCR en tiempo real y tipificación HLA',
    },
  });

  const allLabAreaIds = [
    areaInmuno.id,
    areaPatologia.id,
    areaCitometria.id,
    areaAlergia.id,
    areaBiomol.id,
  ];

  // -----------------------------------------------------------------------
  // 7. ROLES Y USUARIOS (ADMIN TOTAL + USUARIOS CON NOMBRES DE SU ROL)
  // -----------------------------------------------------------------------
  console.log('👥 [Paso 7/11] Sembrando roles y usuarios del sistema (Admin global y roles sin nombres personales)...');
  const allRolesList = [
    { name: 'ADMINISTRADOR', description: 'Acceso total y configuración global del sistema' },
    { name: 'COORDINADOR_LABORATORIO', description: 'Supervisión técnica, aprobaciones FEFO, auditorías y cuarentena' },
    { name: 'COORDINADOR', description: 'Rol sinónimo de coordinación operativa' },
    { name: 'BIOANALISTA', description: 'Operación en mesón de trabajo, apertura de corridas y registro de pacientes' },
    { name: 'LABORATORIO', description: 'Acceso general al entorno de laboratorio' },
    { name: 'ALMACENISTA', description: 'Custodia física, recepción de compras, Kardex y despachos' },
    { name: 'COMPRAS', description: 'Gestión de proveedores, cotizaciones y órdenes de compra' },
    { name: 'ADMINISTRACION', description: 'Finanzas, cuentas por pagar, tesorería y reportes gerenciales' },
    { name: 'INVESTIGACION', description: 'Gestión de proyectos I+D, ensayos clínicos y donaciones' },
    { name: 'DOCENCIA', description: 'Acceso a protocolos de docencia e investigación' },
    { name: 'SOLICITANTE', description: 'Creación de solicitudes periódicas de insumos para departamentos' },
  ];

  const rolesMap: Record<string, number> = {};
  for (const r of allRolesList) {
    const role = await prisma.role.create({ data: r });
    rolesMap[r.name] = role.id;
  }

  // Contraseña universal de acceso para demostración: Admin1234!
  const passwordHash = await bcrypt.hash('Admin1234!', 10);

  // Lista de usuarios: Todo centralizado en ADMIN (con todos los roles asignados y todas las áreas de laboratorio)
  // y usuarios adicionales cuyos nombres son exactamente el nombre de su rol (sin nombres personales)
  const usersToSeed = [
    {
      username: 'admin',
      email: 'admin@idi.ucv.ve',
      fullName: 'ADMINISTRADOR',
      department: 'Administración y Finanzas',
      roleNames: [
        'ADMINISTRADOR',
        'COORDINADOR_LABORATORIO',
        'COORDINADOR',
        'BIOANALISTA',
        'LABORATORIO',
        'ALMACENISTA',
        'COMPRAS',
        'ADMINISTRACION',
        'INVESTIGACION',
        'DOCENCIA',
        'SOLICITANTE',
      ],
      labAreas: allLabAreaIds,
    },
    {
      username: 'coordinador',
      email: 'coordinador@idi.ucv.ve',
      fullName: 'COORDINADOR',
      department: 'Laboratorio General',
      roleNames: ['COORDINADOR_LABORATORIO', 'COORDINADOR', 'LABORATORIO'],
      labAreas: allLabAreaIds,
    },
    {
      username: 'bioanalista',
      email: 'bioanalista@idi.ucv.ve',
      fullName: 'BIOANALISTA',
      department: 'Inmunología General',
      roleNames: ['BIOANALISTA', 'LABORATORIO'],
      labAreas: allLabAreaIds,
    },
    {
      username: 'almacenista',
      email: 'almacenista@idi.ucv.ve',
      fullName: 'ALMACENISTA',
      department: 'Almacén General',
      roleNames: ['ALMACENISTA'],
      labAreas: [],
    },
    {
      username: 'compras',
      email: 'compras@idi.ucv.ve',
      fullName: 'COMPRAS',
      department: 'Administración y Finanzas',
      roleNames: ['COMPRAS'],
      labAreas: [],
    },
    {
      username: 'administracion',
      email: 'administracion@idi.ucv.ve',
      fullName: 'ADMINISTRACION',
      department: 'Administración y Finanzas',
      roleNames: ['ADMINISTRACION'],
      labAreas: [],
    },
    {
      username: 'investigador',
      email: 'investigador@idi.ucv.ve',
      fullName: 'INVESTIGACION',
      department: 'Investigación y Desarrollo (I+D)',
      roleNames: ['INVESTIGACION', 'DOCENCIA'],
      labAreas: [areaCitometria.id, areaBiomol.id],
    },
    {
      username: 'solicitante',
      email: 'solicitante@idi.ucv.ve',
      fullName: 'SOLICITANTE',
      department: 'Alergia e Inmunología Clínica',
      roleNames: ['SOLICITANTE'],
      labAreas: [],
    },
  ];

  const createdUsersMap: Record<string, number> = {};
  for (const u of usersToSeed) {
    const user = await prisma.user.create({
      data: {
        username: u.username,
        email: u.email,
        fullName: u.fullName,
        department: u.department,
        passwordHash,
        isActive: true,
      },
    });
    createdUsersMap[u.username] = user.id;

    for (const rName of u.roleNames) {
      const rId = rolesMap[rName];
      if (rId) {
        await prisma.userRole.create({
          data: { userId: user.id, roleId: rId },
        });
      }
    }

    for (const aId of u.labAreas) {
      await prisma.userLabArea.create({
        data: { userId: user.id, labAreaId: aId },
      });
    }
  }

  const adminId = createdUsersMap['admin']!;

  // Tasas de cambio oficiales asociadas al admin
  await prisma.currencyExchange.create({
    data: { currencyId: vesCurr.id, rate: 75.0, effectiveDate: new Date(), createdById: adminId },
  });
  await prisma.currencyExchange.create({
    data: { currencyId: eurCurr.id, rate: 81.5, effectiveDate: new Date(), createdById: adminId },
  });

  // -----------------------------------------------------------------------
  // 8. CUENTAS BANCARIAS, CONCEPTOS, MÉTODOS DE PAGO Y VENTANA DE SOLICITUDES
  // -----------------------------------------------------------------------
  console.log('🏦 [Paso 8/11] Sembrando maestros financieros y ventana de solicitudes activa...');
  await prisma.bankAccount.createMany({
    data: [
      {
        bankName: 'Banco de Venezuela',
        accountNumber: '0102-0123-45-0000123456',
        type: 'CORRIENTE',
        currency: 'VED',
        holderName: 'Instituto de Inmunología Dr. Nicolás Bianco',
        holderId: 'J-30710739-1',
        isActive: true,
      },
      {
        bankName: 'Banesco Banco Universal',
        accountNumber: '0134-0987-65-0000987654',
        type: 'CUSTODIA',
        currency: 'USD',
        holderName: 'Instituto de Inmunología Dr. Nicolás Bianco',
        holderId: 'J-30710739-1',
        isActive: true,
      },
      {
        bankName: 'Caja Chica Institucional',
        accountNumber: 'EFECTIVO-CAJA-01',
        type: 'EFECTIVO',
        currency: 'USD',
        holderName: 'Tesorería IDI',
        holderId: 'J-30710739-1',
        isActive: true,
      },
    ],
  });

  await prisma.justificationConcept.createMany({
    data: [
      { code: 'RUTINA_CLINICA', title: 'Rutina Asistencial', description: 'Requisición periódica para atención diagnóstica de pacientes', category: 'SOLICITUD' },
      { code: 'PROYECTO_INVESTIGACION', title: 'Protocolo I+D', description: 'Insumos destinados a proyectos de investigación aprobados', category: 'SOLICITUD' },
      { code: 'STOCK_MINIMO', title: 'Reposición por Stock Mínimo', description: 'Compra de reposición ante alerta de inventario crítico', category: 'COMPRA' },
      { code: 'CONTROL_CALIDAD', title: 'Validación de Calidad', description: 'Reactivos empleados en calibraciones y pruebas de desempeño', category: 'GENERAL' },
    ],
  });

  await prisma.paymentMethodCatalog.createMany({
    data: [
      { code: 'TRANSFERENCIA_NACIONAL', name: 'Transferencia Bancaria Nacional (Bs.)', description: 'Transferencia directa en Bolívares' },
      { code: 'TRANSFERENCIA_USD', name: 'Transferencia Cuenta Custodia (USD)', description: 'Transferencia interbancaria libre convertibilidad' },
      { code: 'PAGO_MOVIL', name: 'Pago Móvil Interbancario', description: 'Liquidación inmediata nacional' },
      { code: 'EFECTIVO_USD', name: 'Efectivo Divisas USD', description: 'Desembolso en efectivo por caja chica' },
    ],
  });

  // Ventana de Solicitudes: abierta 24/7 para permitir demostración continua sin restricciones horarias
  await prisma.requestWindowConfig.create({
    data: {
      startDay: 0, // Domingo
      startHour: 0,
      startMinute: 0,
      endDay: 6, // Sábado
      endHour: 23,
      endMinute: 59,
      isSuspended: false,
      maxWeeklyRequestsPerUser: 99,
      timezone: 'America/Caracas',
    },
  });

  // -----------------------------------------------------------------------
  // 9. PROVEEDOR ÚNICO INSTITUCIONAL (1 PROVEEDOR)
  // -----------------------------------------------------------------------
  console.log('🚚 [Paso 9/11] Sembrando el proveedor oficial institucional...');
  const supplier = await prisma.supplier.create({
    data: {
      name: demoSupplier.name,
      rifOrId: demoSupplier.rif,
      phone: demoSupplier.phone,
      email: demoSupplier.email,
      address: demoSupplier.address,
      isActive: true,
    },
  });

  // -----------------------------------------------------------------------
  // 10. PRODUCTOS DE LABORATORIO (EXACTAMENTE 5 PRODUCTOS, TODOS SIN STOCK)
  //     - 2 Insumos generales de laboratorio
  //     - 3 Reactivos de diagnóstico clínico
  // -----------------------------------------------------------------------
  console.log('📦 [Paso 10/11] Registrando exactamente 5 productos de laboratorio (3 reactivos, 2 insumos) SIN STOCK...');
  const labCatId = categoriesMap['Laboratorio']!;
  const genericBrandId = brandsMap['Genérico / Preparado Interno']!;
  const createdProducts: Record<string, bigint> = {};

  // 10.1 Los 2 Insumos Generales de Laboratorio (Sin Stock)
  for (const s of labGeneralSupplies) {
    const unitId = unitsMap[s.unit] || unitsMap['UND']!;
    const prod = await prisma.product.create({
      data: {
        name: s.name,
        sku: s.sku,
        categoryId: labCatId,
        brandId: genericBrandId,
        baseUnitId: unitId,
        conversionFactor: 1.0,
        minStockAlert: s.minStock,
        isReagent: false,
        isLabReagent: false,
        isActive: true,
        description: s.description,
      },
    });
    createdProducts[s.sku] = prod.id;
  }

  // 10.2 Los 3 Reactivos de Laboratorio (Sin Stock, Sin Frascos)
  for (const r of clinicalReagents) {
    const brandId = brandsMap[r.brand] || genericBrandId;
    const unitId = unitsMap[r.unit] || unitsMap['UND']!;

    const prod = await prisma.product.create({
      data: {
        name: r.name,
        sku: r.sku,
        categoryId: labCatId,
        brandId,
        baseUnitId: unitId,
        conversionFactor: 1.0,
        minStockAlert: r.minStockAlert,
        isReagent: true,
        isLabReagent: true,
        labItemType: r.labItemType,
        theoreticalYield: r.theoreticalYield,
        includesCalibrator: r.includesCalibrator,
        calibratorsPerRun: r.calibratorsPerRun,
        isActive: true,
        description: r.description,
      },
    });
    createdProducts[r.sku] = prod.id;
  }

  // -----------------------------------------------------------------------
  // 11. CATÁLOGO COMPLETO DE EXÁMENES DE LABORATORIO POR ÁREA OPERATIVA
  // -----------------------------------------------------------------------
  console.log('🧪 [Paso 11/11] Configurando catálogo exhaustivo de exámenes de laboratorio por área...');

  const examsToSeed = [
    // ---------------------------------------------------------------------
    // ÁREA 1: INMUNOLOGÍA GENERAL
    // ---------------------------------------------------------------------
    {
      code: 'EX-ANTI-DNA',
      name: 'ELISA Anti-DNA Doble Cadena',
      description: 'Determinación cuantitativa de anticuerpos anti-dsDNA para Lupus y autoinmunidad',
      areaId: areaInmuno.id,
      defaultCalibratorUses: 4,
      defaultControlUses: 2,
      compatibleProductSku: 'KIT-ELISA-DNA',
    },
    {
      code: 'EX-INMUNO-CUANT',
      name: 'Inmunoglobulinas Cuantitativas (IgG, IgA, IgM)',
      description: 'Perfil de inmunocompetencia humoral y cuantificación sérica por turbidimetría',
      areaId: areaInmuno.id,
      defaultCalibratorUses: 3,
      defaultControlUses: 2,
      compatibleProductSku: 'KIT-INMUNO-CUANT',
    },
    {
      code: 'EX-IGE-TOTAL',
      name: 'Cuantificación de Inmunoglobulina E Total (IgE)',
      description: 'Medición de niveles séricos de IgE total para evaluación de atopias y alergias',
      areaId: areaInmuno.id,
      defaultCalibratorUses: 3,
      defaultControlUses: 2,
    },
    {
      code: 'EX-COMP-C3-C4',
      name: 'Complemento Sérico C3 y C4',
      description: 'Cuantificación de factores C3 y C4 para estudio de inmunocomplejos y glomerulopatías',
      areaId: areaInmuno.id,
      defaultCalibratorUses: 2,
      defaultControlUses: 2,
    },
    {
      code: 'EX-PCR-US',
      name: 'Proteína C Reactiva Ultrasensible (PCR-us)',
      description: 'Marcador analítico de fase aguda para inflamación sistémica y monitoreo clínico',
      areaId: areaInmuno.id,
      defaultCalibratorUses: 2,
      defaultControlUses: 1,
    },

    // ---------------------------------------------------------------------
    // ÁREA 2: INMUNOPATOLOGÍA
    // ---------------------------------------------------------------------
    {
      code: 'EX-ANA-HEP2',
      name: 'Anticuerpos Antinucleares ANA Hep-2 (IFI)',
      description: 'Detección por inmunofluorescencia indirecta de patrones nucleares y citoplasmáticos',
      areaId: areaPatologia.id,
      defaultCalibratorUses: 2,
      defaultControlUses: 2,
      compatibleProductSku: 'KIT-ANA-HEP2',
    },
    {
      code: 'EX-ANCA',
      name: 'Anticuerpos Anticitoplasma de Neutrófilos (P-ANCA / C-ANCA)',
      description: 'Ensayo por IFI para diagnóstico y seguimiento de vasculitis necrotizantes',
      areaId: areaPatologia.id,
      defaultCalibratorUses: 2,
      defaultControlUses: 2,
    },
    {
      code: 'EX-ANTI-ENA',
      name: 'Perfil ENA Extendido (Sm, RNP, Ro, La, Scl-70, Jo-1)',
      description: 'Panel de anticuerpos contra antígenos nucleares extractables por immunoblotting',
      areaId: areaPatologia.id,
      defaultCalibratorUses: 3,
      defaultControlUses: 2,
    },
    {
      code: 'EX-ANTI-CARDIOLIPINA',
      name: 'Anticuerpos Anti-Cardiolipina (IgG / IgM)',
      description: 'Determinación cuantitativa de antifosfolípidos para síndrome SAF y trombofilias',
      areaId: areaPatologia.id,
      defaultCalibratorUses: 3,
      defaultControlUses: 2,
    },
    {
      code: 'EX-ANTI-TRANSGLUTAMINASA',
      name: 'Anticuerpos Anti-Transglutaminasa Tisular (tTG-IgA)',
      description: 'Tamizaje serológico de alta especificidad para diagnóstico de Enfermedad Celíaca',
      areaId: areaPatologia.id,
      defaultCalibratorUses: 2,
      defaultControlUses: 2,
    },

    // ---------------------------------------------------------------------
    // ÁREA 3: CITOMETRÍA DE FLUJO
    // ---------------------------------------------------------------------
    {
      code: 'EX-CITOM-CD4',
      name: 'Subpoblaciones Linfocitarias T (CD3+/CD4+/CD8+)',
      description: 'Conteo absoluto y porcentual de linfocitos T colaboradores y citotóxicos',
      areaId: areaCitometria.id,
      defaultCalibratorUses: 0,
      defaultControlUses: 1,
    },
    {
      code: 'EX-CITOM-B-NK',
      name: 'Panel Linfocitos B (CD19+) y Células NK (CD16+/CD56+)',
      description: 'Cuantificación multiparamétrica de células Natural Killer y Linfocitos B',
      areaId: areaCitometria.id,
      defaultCalibratorUses: 0,
      defaultControlUses: 1,
    },
    {
      code: 'EX-CITOM-LEUC',
      name: 'Panel de Inmunofenotipaje para Leucemias / Linfomas',
      description: 'Tipificación celular avanzada mediante panel monoclonal de 6 fluorescencias',
      areaId: areaCitometria.id,
      defaultCalibratorUses: 0,
      defaultControlUses: 2,
    },
    {
      code: 'EX-CITOM-HLA-B27',
      name: 'Detección de Antígeno HLA-B27 por Citometría',
      description: 'Tamizaje fenotípico rápido para espondilitis anquilosante y artritis reactivas',
      areaId: areaCitometria.id,
      defaultCalibratorUses: 0,
      defaultControlUses: 1,
    },

    // ---------------------------------------------------------------------
    // ÁREA 4: ALERGIA E INMUNOLOGÍA CLÍNICA
    // ---------------------------------------------------------------------
    {
      code: 'EX-IGE-AERO',
      name: 'Panel IgE Específica para Aeroalérgenos (Ácaros y Pólenes)',
      description: 'Detección cuantitativa de anticuerpos IgE específicos contra alergenos respiratorios',
      areaId: areaAlergia.id,
      defaultCalibratorUses: 3,
      defaultControlUses: 2,
    },
    {
      code: 'EX-IGE-ALIM',
      name: 'Panel IgE Específica para Alérgenos Alimentarios',
      description: 'Determinación sérica de IgE contra proteínas de leche, huevo, trigo, soya y mariscos',
      areaId: areaAlergia.id,
      defaultCalibratorUses: 3,
      defaultControlUses: 2,
    },

    // ---------------------------------------------------------------------
    // ÁREA 5: BIOLOGÍA MOLECULAR E INMUNOGENÉTICA
    // ---------------------------------------------------------------------
    {
      code: 'EX-HLA-PCR',
      name: 'Tipificación Molecular HLA Clase I y II por PCR-SSO',
      description: 'Genotipificación molecular de histocompatibilidad para trasplantes renales y médula',
      areaId: areaBiomol.id,
      defaultCalibratorUses: 1,
      defaultControlUses: 2,
    },
    {
      code: 'EX-VIRAL-PCR',
      name: 'Cuantificación Viral por PCR en Tiempo Real (CMV / EBV)',
      description: 'Carga viral cuantitativa para seguimiento de pacientes inmunocomprometidos',
      areaId: areaBiomol.id,
      defaultCalibratorUses: 4,
      defaultControlUses: 2,
    },
  ];

  for (const ex of examsToSeed) {
    const createdExam = await prisma.labExam.create({
      data: {
        code: ex.code,
        name: ex.name,
        description: ex.description,
        areaId: ex.areaId,
        defaultCalibratorUses: ex.defaultCalibratorUses,
        defaultControlUses: ex.defaultControlUses,
        isActive: true,
      },
    });

    if (ex.compatibleProductSku && createdProducts[ex.compatibleProductSku]) {
      await prisma.labExamProduct.create({
        data: {
          labExamId: createdExam.id,
          productId: createdProducts[ex.compatibleProductSku]!,
        },
      });
    }
  }

  // Vincular productos generales y reactivos a las áreas operativas
  for (const areaId of allLabAreaIds) {
    for (const prodId of Object.values(createdProducts)) {
      await prisma.labAreaProduct.create({
        data: {
          labAreaId: areaId,
          productId: prodId,
        },
      });
    }
  }

  // Proyecto de Investigación I+D para demostración (Investigador Principal: Admin)
  const researchProj = await prisma.researchProject.create({
    data: {
      code: 'PROJ-LUPUS-2026',
      title: 'Inmunogenética y Caracterización de Subpoblaciones Celulares en LES',
      description: 'Estudio de marcadores de activación y respuesta en pacientes con Lupus Eritematoso Sistémico.',
      researchLine: 'Autoinmunidad e Inmunogenética',
      type: ResearchProjectType.INSTITUTIONAL,
      status: ResearchProjectStatus.ACTIVE,
      startDate: new Date('2026-01-15'),
      endDate: new Date('2027-01-15'),
      totalInvestedFunds: 12500.0,
      spentFunds: 0.0,
      remainingFunds: 12500.0,
    },
  });

  await prisma.researchProjectMember.create({
    data: {
      projectId: researchProj.id,
      userId: adminId,
      role: ResearchMemberRole.PRINCIPAL_INVESTIGATOR,
    },
  });

  // =========================================================================
  // RESUMEN FINAL DEL SEEDER DE DEMOSTRACIÓN
  // =========================================================================
  console.log('\n========================================================================');
  console.log('🎉 SEEDER DE DEMOSTRACIÓN EJECUTADO CON ÉXITO');
  console.log('========================================================================');
  console.log('👤 USUARIO ADMINISTRADOR ÚNICO (Control Total):');
  console.log('   - Usuario:    admin');
  console.log('   - Correo:     admin@idi.ucv.ve');
  console.log('   - Nombre:     ADMINISTRADOR');
  console.log('   - Contraseña: Admin1234!');
  console.log('   - Roles:      Acceso total a todos los módulos y vistas');
  console.log('------------------------------------------------------------------------');
  console.log('👥 USUARIOS DE APOYO POR ROL (Nombres = Rol):');
  console.log('   - coordinador   | COORDINADOR   | coordinador@idi.ucv.ve   | Admin1234!');
  console.log('   - bioanalista   | BIOANALISTA   | bioanalista@idi.ucv.ve   | Admin1234!');
  console.log('   - almacenista   | ALMACENISTA   | almacenista@idi.ucv.ve   | Admin1234!');
  console.log('   - compras       | COMPRAS       | compras@idi.ucv.ve       | Admin1234!');
  console.log('   - administracion| ADMINISTRACION| administracion@idi.ucv.ve| Admin1234!');
  console.log('   - investigador  | INVESTIGACION | investigador@idi.ucv.ve  | Admin1234!');
  console.log('   - solicitante   | SOLICITANTE   | solicitante@idi.ucv.ve   | Admin1234!');
  console.log('------------------------------------------------------------------------');
  console.log('🚚 PROVEEDOR REGISTRADO (1):');
  console.log(`   - ${supplier.name} (RIF: ${supplier.rifOrId})`);
  console.log('------------------------------------------------------------------------');
  console.log('🔬 ÁREAS OPERATIVAS DE LABORATORIO DISPONIBLES (5):');
  console.log('   1. Inmunología General (AREA-INM-GEN)');
  console.log('   2. Inmunopatología (AREA-INM-PAT)');
  console.log('   3. Citometría de Flujo (AREA-CITOM)');
  console.log('   4. Alergia e Inmunología Clínica (AREA-ALE-INM)');
  console.log('   5. Biología Molecular e Inmunogenética (AREA-BIO-MOL)');
  console.log('------------------------------------------------------------------------');
  console.log(`🧪 CATÁLOGO DE EXÁMENES REGISTRADOS (${examsToSeed.length} EXÁMENES CLÍNICOS):`);
  for (const ex of examsToSeed) {
    console.log(`   - [${ex.code}] ${ex.name} (Cal: ${ex.defaultCalibratorUses}, Ctrl: ${ex.defaultControlUses})`);
  }
  console.log('------------------------------------------------------------------------');
  console.log('📦 PRODUCTOS DE LABORATORIO REGISTRADOS (5 EN TOTAL - TODOS CON STOCK 0):');
  console.log('   1. [INSUMO]   GUANTES DE NITRILO TALLA M (LAB-001) - Stock: 0 CAJA');
  console.log('   2. [INSUMO]   TUBOS DE EXTRACCION TAPA MORADA (LAB-002) - Stock: 0 GRADILLA');
  console.log('   3. [REACTIVO] Kit ELISA Anti-dsDNA (Human) (KIT-ELISA-DNA) - Stock: 0 KIT');
  console.log('   4. [REACTIVO] Kit Inmunoglobulinas Cuantitativas (KIT-INMUNO-CUANT) - Stock: 0 KIT');
  console.log('   5. [REACTIVO] Kit Anticuerpos Antinucleares ANA Hep-2 (KIT-ANA-HEP2) - Stock: 0 KIT');
  console.log('------------------------------------------------------------------------');
  console.log('❄️ NEVERAS LISTAS PARA RECIBIR LOTES: NEV-01, NEV-02, CAVA-01 (Sin frascos)');
  console.log('📅 VENTANA DE SOLICITUDES: Abierta 24/7 para pruebas ininterrumpidas');
  console.log('💵 TASAS OFICIALES BCV: USD = 75.00 Bs. | EUR = 81.50 Bs.');
  console.log('========================================================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seeder:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
