import {
  PrismaClient,
  LocationType,
  FridgeStatus,
  BatchStatus,
  LabUnitStatus,
  LabItemType,
  StockOwnership,
  PaymentMethod,
  ResearchProjectType,
  ResearchProjectStatus,
  ResearchMemberRole,
  LabWeeklyRunStatus,
  LabInternalRequestStatus,
  QuarantineResolutionStatus,
  QuarantineReason,
  IncidentType,
  FridgeAuditAdjustmentStatus,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// =========================================================================
// CATÁLOGO DE PRODUCTOS E INSUMOS OFICIALES DE ERP-IDI
// =========================================================================
const initialGeneralProducts = [
  // 1. LABORATORIO Y TOMA DE MUESTRA
  { name: 'GUANTES DE NITRILO TALLA M', category: 'Laboratorio', quantity: 40, unit: 'CAJA', minStock: 10 },
  { name: 'GUANTES DE NITRILO TALLA L', category: 'Laboratorio', quantity: 35, unit: 'CAJA', minStock: 10 },
  { name: 'GUANTES DE NITRILO TALLA S', category: 'Laboratorio', quantity: 20, unit: 'CAJA', minStock: 5 },
  { name: 'TUBOS DE EXTRACCION TAPA ROJA (SECO)', category: 'Laboratorio', quantity: 25, unit: 'GRADILLA', minStock: 5 },
  { name: 'TUBOS DE EXTRACCION TAPA MORADA (EDTA)', category: 'Laboratorio', quantity: 30, unit: 'GRADILLA', minStock: 5 },
  { name: 'TUBOS FALCON DE 50 ML', category: 'Laboratorio', quantity: 20, unit: 'GRADILLA', minStock: 4 },
  { name: 'TUBOS FALCON DE 15 ML', category: 'Laboratorio', quantity: 20, unit: 'GRADILLA', minStock: 4 },
  { name: 'TUBOS DE MICROCENTRIFUGA 1.5 ML (EPPENDORF)', category: 'Laboratorio', quantity: 15, unit: 'CAJA', minStock: 3 },
  { name: 'PUNTAS P1000 C/F (AZULES)', category: 'Laboratorio', quantity: 15, unit: 'GRADILLA', minStock: 3 },
  { name: 'PUNTAS P200 C/F (AMARILLAS)', category: 'Laboratorio', quantity: 20, unit: 'GRADILLA', minStock: 4 },
  { name: 'PUNTAS P20 CON FILTRO', category: 'Laboratorio', quantity: 10, unit: 'GRADILLA', minStock: 2 },
  { name: 'AGUJAS DESCARTABLES 21G * 1', category: 'Laboratorio', quantity: 15, unit: 'CAJA', minStock: 4 },
  { name: 'SCALP DE INFUSION 23G', category: 'Laboratorio', quantity: 10, unit: 'CAJA', minStock: 2 },
  { name: 'JERINGA DE 5 ML C/AGUJA', category: 'Laboratorio', quantity: 12, unit: 'CAJA', minStock: 3 },
  { name: 'JERINGA DE 10 ML C/AGUJA', category: 'Laboratorio', quantity: 10, unit: 'CAJA', minStock: 3 },
  { name: 'ALCOHOL ISOPROPILICO 70%', category: 'Laboratorio', quantity: 10, unit: 'GALON', minStock: 2 },
  { name: 'SOLUCION FISIOLOGICA 0.9%', category: 'Laboratorio', quantity: 12, unit: 'UND', minStock: 4 },
  { name: 'BOLSAS DE DESECHOS BIOLOGICOS 30 LTS (ROJAS)', category: 'Laboratorio', quantity: 150, unit: 'UND', minStock: 30 },
  { name: 'BOLSAS DE DESECHOS BIOLOGICOS 60 LTS (ROJAS)', category: 'Laboratorio', quantity: 100, unit: 'UND', minStock: 20 },
  { name: 'DESCARTADOR RIGIDO DE PUNZOPENETRANTES', category: 'Laboratorio', quantity: 25, unit: 'UND', minStock: 5 },
  { name: 'BATAS CLINICAS DESECHABLES', category: 'Laboratorio', quantity: 200, unit: 'UND', minStock: 40 },
  { name: 'LAMINAS PORTAOBJETOS 76X26 MM', category: 'Laboratorio', quantity: 10, unit: 'CAJA', minStock: 2 },

  // 2. MANTENIMIENTO Y LIMPIEZA
  { name: 'CLORO CONCENTRADO 5%', category: 'Limpieza', quantity: 15, unit: 'GALON', minStock: 3 },
  { name: 'DESINFECTANTE MULTIUSOS HOSPITALARIO', category: 'Limpieza', quantity: 12, unit: 'GALON', minStock: 3 },
  { name: 'JABON LIQUIDO NEUTRO PARA CRISTALERIA', category: 'Limpieza', quantity: 8, unit: 'GALON', minStock: 2 },
  { name: 'PAPEL TOALLA INSTITUCIONAL EN ROLLO', category: 'Limpieza', quantity: 60, unit: 'ROLLO', minStock: 15 },
  { name: 'PAPEL HIGIENICO INSTITUCIONAL 9"', category: 'Limpieza', quantity: 40, unit: 'ROLLO', minStock: 10 },
  { name: 'BOLSAS NEGRAS PARA RESIDUOS 40 KG', category: 'Limpieza', quantity: 300, unit: 'UND', minStock: 50 },
  { name: 'GUANTES DE GOMA PARA FAENA TALLA M', category: 'Limpieza', quantity: 15, unit: 'UND', minStock: 4 },

  // 3. OFICINA Y ADMINISTRACIÓN
  { name: 'RESMA PAPEL BOND BASE 20 TAMAÑO CARTA', category: 'Oficina', quantity: 40, unit: 'RESMA', minStock: 8 },
  { name: 'RESMA PAPEL BOND BASE 20 TAMAÑO OFICIO', category: 'Oficina', quantity: 25, unit: 'RESMA', minStock: 5 },
  { name: 'BOLIGRAFO TINTA SECA AZUL (CAJA X 12)', category: 'Oficina', quantity: 15, unit: 'CAJA', minStock: 3 },
  { name: 'BOLIGRAFO TINTA SECA NEGRO (CAJA X 12)', category: 'Oficina', quantity: 15, unit: 'CAJA', minStock: 3 },
  { name: 'MARCADOR DERMOGRAFICO / LABORATORIO PUNTA FINA', category: 'Oficina', quantity: 30, unit: 'UND', minStock: 6 },
  { name: 'CARPETAS MANILA TAMAÑO CARTA', category: 'Oficina', quantity: 100, unit: 'UND', minStock: 20 },
  { name: 'GRAPADORA METALICA ESTANDAR', category: 'Oficina', quantity: 6, unit: 'UND', minStock: 2 },
  { name: 'CAJA DE GRAPAS ESTANDAR 26/6', category: 'Oficina', quantity: 20, unit: 'CAJA', minStock: 5 },
  { name: 'ROLLO DE ETIQUETAS TERMICAS ADHESIVAS', category: 'Oficina', quantity: 15, unit: 'ROLLO', minStock: 3 },
];

// =========================================================================
// REACTIVOS Y KITS DE DIAGNÓSTICO CLÍNICO E I+D
// =========================================================================
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
  {
    name: 'Anticuerpo Monoclonal CD3/CD4/CD8 Tri-Color',
    sku: 'KIT-CITOM-CD4',
    theoreticalYield: 50,
    labItemType: LabItemType.REAGENT_KIT,
    unit: 'FCO',
    brand: 'BD Biosciences',
    minStockAlert: 2,
    description: 'Cocktail de anticuerpos fluorocromados para citometría de flujo de subpoblaciones linfocitarias.',
    includesCalibrator: false,
    calibratorsPerRun: 0,
  },
  {
    name: 'Calibrador Estándar Standalone Anti-DNA',
    sku: 'CALIB-ANTI-DNA',
    theoreticalYield: 20,
    labItemType: LabItemType.STANDALONE_CALIBRATOR,
    unit: 'FCO',
    brand: 'Bio-Rad',
    minStockAlert: 1,
    description: 'Vial independiente de calibrador liofilizado de alta pureza para curvas de referencia.',
    includesCalibrator: false,
    calibratorsPerRun: 0,
  },
];

// =========================================================================
// CATÁLOGO DE PROVEEDORES
// =========================================================================
const suppliersList = [
  { name: 'ALFA QUANTUM LABORATORIOS 2010 C.A.', rif: 'J-29898050-8', phone: '(0212) 414-2271', email: 'ventas@alfaquantum.com', address: 'Av. Intercomunal del Valle, Conj. Residencial Longaray, Caracas' },
  { name: 'BIO-KERN C.A.', rif: 'J-40495367-1', phone: '(0212) 316-6437', email: 'contacto@biokern.com', address: 'San Antonio de los Altos, Edo. Miranda' },
  { name: 'SUPLIDORES BIOTEC C.A.', rif: 'J-00353790-0', phone: '(0212) 234-4789', email: 'biotec@suplidoresbiotec.com', address: 'Calle Santa Ana, Centro Empresarial Boleíta, Caracas' },
  { name: 'LABOMED C.A.', rif: 'J-00115702-6', phone: '(0212) 690-1422', email: 'atencion@labomed.com.ve', address: 'Calle Los Malabares, Galpón 29, Los Rosales, Caracas' },
  { name: 'CORPORACION MEDICA DDF0105 C.A.', rif: 'J-40587017-6', phone: '(0412) 906-5642', email: 'corp.ddf@medica.com', address: 'Urb. Los Rosales, Caracas' },
  { name: 'BYOIMMUN 2000 C.A.', rif: 'J-50417095-0', phone: '(0212) 515-4391', email: 'byoimmun@gmail.com', address: 'Av. Francisco de Miranda, Edif. Cavendes, Altamira, Caracas' },
  { name: 'LABORATORIO GEMINIS C.A.', rif: 'J-00124405-0', phone: '(0212) 261-3393', email: 'info@geminis.com.ve', address: 'Edificio Cosmos, Chacao, Caracas' },
  { name: 'SUMINISTROS ALERE C.A.', rif: 'J-41143471-0', phone: '(0414) 298-2825', email: 'alere.suministros@gmail.com', address: 'Av. Soroicayma, Edif. Centro Salud, San Bernardino, Caracas' },
  { name: 'FERRETERIA Y SUMINISTROS EL PASEO S.R.L.', rif: 'J-00129350-7', phone: '(0212) 690-0945', email: 'elpaseo@cantv.net', address: 'Paseo Los Ilustres, Las Acacias, Caracas' },
  { name: 'GRAFICAS ONIX S.R.L.', rif: 'J-00326937-9', phone: '(0212) 552-7532', email: 'graficasonix@gmail.com', address: 'Av. Cajigal, Quinta Dalia, San Bernardino, Caracas' },
];

async function main() {
  console.log('========================================================================');
  console.log('    INICIALIZANDO SIEMBRA LIMPIA (SEEDER) ERP-IDI - SISTEMA LISTO      ');
  console.log('========================================================================\n');

  // -----------------------------------------------------------------------
  // 1. LIMPIEZA COMPLETA DE TABLAS (ORDEN TOPOLÓGICO DE CLAVES FORÁNEAS)
  // -----------------------------------------------------------------------
  console.log('🧹 [Paso 1/12] Vaciando tablas previas de la base de datos...');

  // Dependientes operacionales de Investigación
  await prisma.researchStockTransfer.deleteMany();
  await prisma.researchTrialConsumption.deleteMany();
  await prisma.researchFinding.deleteMany();
  await prisma.researchTrial.deleteMany();
  await prisma.researchProjectMember.deleteMany();
  await prisma.researchDonationItem.deleteMany();
  await prisma.researchDonation.deleteMany();
  await prisma.researchProject.deleteMany();

  // Dependientes de Laboratorio y Cadena de Frío
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

  // Movimientos de Stock y Requisiciones de Almacén
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
  console.log('💵 [Paso 2/12] Sembrando monedas institucionales y tasas oficiales...');
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
  console.log('📐 [Paso 3/12] Sembrando unidades de medida...');
  const unitsMap: Record<string, number> = {};
  const standardUnits = [
    { name: 'Unidad', abbreviation: 'UND' },
    { name: 'Caja', abbreviation: 'CAJA' },
    { name: 'Rollo', abbreviation: 'ROLLO' },
    { name: 'Gradilla', abbreviation: 'GRADILLA' },
    { name: 'Galón', abbreviation: 'GALON' },
    { name: 'Litro', abbreviation: 'LITRO' },
    { name: 'Paquete', abbreviation: 'PAQUETE' },
    { name: 'Bolsa', abbreviation: 'BOLSA' },
    { name: 'Sobre', abbreviation: 'SOBRE' },
    { name: 'Resma', abbreviation: 'RESMA' },
    { name: 'Frasco', abbreviation: 'FCO' },
    { name: 'Bulto', abbreviation: 'BLT' },
    { name: 'Mililitro', abbreviation: 'ML' },
    { name: 'Gramo', abbreviation: 'G' },
    { name: 'Determinaciones', abbreviation: 'DET' },
    { name: 'Kit', abbreviation: 'KIT' },
  ];

  for (const u of standardUnits) {
    const created = await prisma.unit.create({ data: u });
    unitsMap[u.abbreviation] = created.id;
  }

  // -----------------------------------------------------------------------
  // 4. CATEGORÍAS Y MARCAS
  // -----------------------------------------------------------------------
  console.log('🏷️ [Paso 4/12] Sembrando categorías y marcas...');
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
    { name: 'BD Biosciences', description: 'Citometría de flujo y reactivos celulares' },
    { name: 'Thermo Fisher Scientific', description: 'Plásticos de biología molecular e instrumentación' },
  ];
  for (const b of brandsList) {
    const brand = await prisma.brand.create({ data: b });
    brandsMap[b.name] = brand.id;
  }

  // -----------------------------------------------------------------------
  // 5. UBICACIONES FÍSICAS Y NEVERAS (CADENA DE FRÍO)
  // -----------------------------------------------------------------------
  console.log('❄️ [Paso 5/12] Sembrando almacén y equipos de frío de laboratorio...');
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

  const fridge1 = await prisma.fridge.create({
    data: {
      code: 'NEV-01',
      name: 'Nevera Principal Inmuno 01 (2-8°C)',
      locationId: labLocation.id,
      targetTempCelsius: 4.0,
      status: FridgeStatus.OPERATIVO,
      description: 'Nevera vertical para kits ELISA y reactivos en uso de rutina clínica.',
    },
  });

  const fridge2 = await prisma.fridge.create({
    data: {
      code: 'NEV-02',
      name: 'Nevera Inmunopatología (2-8°C)',
      locationId: labLocation.id,
      targetTempCelsius: 4.0,
      status: FridgeStatus.OPERATIVO,
      description: 'Equipo de frío para sueros controles, sustratos y láminas Hep-2.',
    },
  });

  const freezer1 = await prisma.fridge.create({
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
  console.log('🏛️ [Paso 6/12] Sembrando departamentos y áreas operativas de laboratorio...');
  const departmentsList = [
    { code: 'INM-GEN', name: 'Inmunología General', description: 'Procesamiento de pruebas de rutina clínica' },
    { code: 'INM-PAT', name: 'Inmunopatología', description: 'Diagnóstico de enfermedades autoinmunes y biopsias' },
    { code: 'INM-CEL', name: 'Inmunología Celular y Citometría', description: 'Cultivos y análisis de fenotipaje celular' },
    { code: 'ALE-INM', name: 'Alergia e Inmunología Clínica', description: 'Consulta clínica y pruebas de provocación' },
    { code: 'LAB-GEN', name: 'Laboratorio General', description: 'Toma de muestras y recepción diagnóstica' },
    { code: 'INV-DES', name: 'Investigación y Desarrollo (I+D)', description: 'Proyectos científicos y ensayos de investigación' },
    { code: 'ALM-GEN', name: 'Almacén General', description: 'Custodia y despacho de suministros institucionales' },
    { code: 'ADM-FIN', name: 'Administración y Finanzas', description: 'Tesorería, compras y adquisiciones' },
    { code: 'SIS-INF', name: 'Sistemas e Informática', description: 'Infraestructura tecnológica' },
  ];
  const departmentsMap: Record<string, number> = {};
  for (const d of departmentsList) {
    const dep = await prisma.department.create({ data: d });
    departmentsMap[d.code] = dep.id;
  }

  // Áreas Operativas de Laboratorio
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
      description: 'Mesón de microscopía de inmunofluorescencia y ANA',
    },
  });

  const areaCitometria = await prisma.labArea.create({
    data: {
      code: 'AREA-CITOM',
      name: 'Citometría de Flujo',
      description: 'Citómetro analítico y marcación con anticuerpos fluorocromados',
    },
  });

  // -----------------------------------------------------------------------
  // 7. ROLES Y USUARIOS DE PRUEBA (UNO POR CADA ROL)
  // -----------------------------------------------------------------------
  console.log('👥 [Paso 7/12] Creando los 8 roles y 1 usuario por rol para testing manual...');
  const rolesList = [
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
  for (const r of rolesList) {
    const role = await prisma.role.create({ data: r });
    rolesMap[r.name] = role.id;
  }

  // Contraseña universal para testing: Password123!
  const commonPasswordHash = await bcrypt.hash('Password123!', 10);

  // Definición de usuarios de prueba (1 por cada rol funcional)
  const usersToSeed = [
    {
      username: 'admin',
      email: 'admin@idi.ucv.ve',
      fullName: 'Administrador General',
      department: 'Sistemas e Informática',
      roleNames: ['ADMINISTRADOR'],
      labAreas: [areaInmuno.id, areaPatologia.id, areaCitometria.id],
    },
    {
      username: 'coordinador',
      email: 'coordinador@idi.ucv.ve',
      fullName: 'Dra. Elena Ramos (Coordinadora Lab)',
      department: 'Laboratorio General',
      roleNames: ['COORDINADOR_LABORATORIO', 'COORDINADOR', 'LABORATORIO'],
      labAreas: [areaInmuno.id, areaPatologia.id, areaCitometria.id],
    },
    {
      username: 'bioanalista',
      email: 'bioanalista@idi.ucv.ve',
      fullName: 'Lic. Andrés Silva (Bioanalista)',
      department: 'Inmunología General',
      roleNames: ['BIOANALISTA', 'LABORATORIO'],
      labAreas: [areaInmuno.id, areaPatologia.id],
    },
    {
      username: 'almacenista',
      email: 'almacenista@idi.ucv.ve',
      fullName: 'Sr. Marcos Peña (Almacén Central)',
      department: 'Almacén General',
      roleNames: ['ALMACENISTA'],
      labAreas: [],
    },
    {
      username: 'compras',
      email: 'compras@idi.ucv.ve',
      fullName: 'Lic. Claudia Morales (Compras)',
      department: 'Administración y Finanzas',
      roleNames: ['COMPRAS'],
      labAreas: [],
    },
    {
      username: 'administracion',
      email: 'administracion@idi.ucv.ve',
      fullName: 'Lic. Roberto Mendoza (Finanzas)',
      department: 'Administración y Finanzas',
      roleNames: ['ADMINISTRACION'],
      labAreas: [],
    },
    {
      username: 'investigador',
      email: 'investigador@idi.ucv.ve',
      fullName: 'Dr. Víctor Colmenares (Investigador I+D)',
      department: 'Investigación y Desarrollo (I+D)',
      roleNames: ['INVESTIGACION', 'DOCENCIA'],
      labAreas: [areaCitometria.id],
    },
    {
      username: 'solicitante',
      email: 'solicitante@idi.ucv.ve',
      fullName: 'Dra. Patricia Gómez (Consulta Alergia)',
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
        passwordHash: commonPasswordHash,
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

  // Tasa de cambio oficial vinculada al Administrador
  const adminId = createdUsersMap['admin']!;
  await prisma.currencyExchange.create({
    data: { currencyId: vesCurr.id, rate: 75.0, effectiveDate: new Date(), createdById: adminId },
  });
  await prisma.currencyExchange.create({
    data: { currencyId: eurCurr.id, rate: 81.5, effectiveDate: new Date(), createdById: adminId },
  });

  // -----------------------------------------------------------------------
  // 8. CUENTAS BANCARIAS Y MAESTROS ADMINISTRATIVOS
  // -----------------------------------------------------------------------
  console.log('🏦 [Paso 8/12] Sembrando cuentas bancarias y conceptos de justificación...');
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

  // Ventana de Solicitudes (Abierta de Lunes 05:00 AM a Miércoles 04:00 PM)
  await prisma.requestWindowConfig.create({
    data: {
      startDay: 1, // Lunes
      startHour: 5,
      startMinute: 0,
      endDay: 3, // Miércoles
      endHour: 16,
      endMinute: 0,
      isSuspended: false,
      maxWeeklyRequestsPerUser: 3,
      timezone: 'America/Caracas',
    },
  });

  // -----------------------------------------------------------------------
  // 9. PROVEEDORES
  // -----------------------------------------------------------------------
  console.log('🚚 [Paso 9/12] Sembrando catálogo de proveedores institucionales...');
  for (const s of suppliersList) {
    await prisma.supplier.create({
      data: {
        name: s.name,
        rifOrId: s.rif,
        phone: s.phone,
        email: s.email,
        address: s.address,
        isActive: true,
      },
    });
  }

  // -----------------------------------------------------------------------
  // 10. CATÁLOGO DE PRODUCTOS E INSUMOS CON STOCK INICIAL EN ALMACÉN
  // -----------------------------------------------------------------------
  console.log('📦 [Paso 10/12] Registrando insumos generales con stock en Almacén Central...');
  const genericBrandId = brandsMap['Genérico / Preparado Interno']!;
  let productCounter = 1;

  for (const p of initialGeneralProducts) {
    const catId = categoriesMap[p.category]!;
    const unitId = unitsMap[p.unit] || unitsMap['UND']!;
    const sku = `${p.category.substring(0, 3).toUpperCase()}-${String(productCounter).padStart(3, '0')}`;
    productCounter++;

    const createdProd = await prisma.product.create({
      data: {
        name: p.name,
        sku,
        categoryId: catId,
        brandId: genericBrandId,
        baseUnitId: unitId,
        conversionFactor: 1.0,
        minStockAlert: p.minStock,
        isReagent: p.category === 'Laboratorio',
        isLabReagent: false,
        isActive: true,
        description: `Insumo estándar de ${p.category} para abastecimiento institucional.`,
      },
    });

    if (p.quantity > 0) {
      await prisma.stockBatch.create({
        data: {
          productId: createdProd.id,
          locationId: warehouseLocation.id,
          lotNumber: `LOTE-${sku}-2026`,
          currentQuantity: p.quantity,
          costPrice: 0.0,
          status: BatchStatus.DISPONIBLE,
          expirationDate: p.category === 'Laboratorio' ? new Date('2028-06-30') : null,
        },
      });
    }
  }

  // -----------------------------------------------------------------------
  // 11. REACTIVOS DE DIAGNÓSTICO, EXÁMENES SMART DEFAULTS Y FRASCOS EN NEVERAS
  // -----------------------------------------------------------------------
  console.log('🧪 [Paso 11/12] Configurando reactivos clínicos, exámenes y frascos listos en neveras...');
  const labCatId = categoriesMap['Laboratorio']!;
  const createdReagentProducts: Record<string, bigint> = {};

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

    createdReagentProducts[r.sku] = prod.id;

    // Crear lote madre en almacén
    await prisma.stockBatch.create({
      data: {
        productId: prod.id,
        locationId: warehouseLocation.id,
        lotNumber: `LOT-${r.sku}-2026A`,
        currentQuantity: 10,
        costPrice: 45.0,
        status: BatchStatus.DISPONIBLE,
        expirationDate: new Date('2027-12-31'),
      },
    });
  }

  // Creación de Exámenes de Laboratorio con Smart Defaults y asignación a Áreas
  const examDna = await prisma.labExam.create({
    data: {
      code: 'EX-ANTI-DNA',
      name: 'ELISA Anti-DNA Doble Cadena',
      description: 'Determinación cuantitativa de anticuerpos anti-dsDNA para Lupus y autoinmunidad',
      areaId: areaInmuno.id,
      defaultCalibratorUses: 4,
      defaultControlUses: 2,
      isActive: true,
    },
  });

  const examInmuno = await prisma.labExam.create({
    data: {
      code: 'EX-INMUNO-CUANT',
      name: 'Inmunoglobulinas Cuantitativas (IgG/IgA/IgM)',
      description: 'Perfil de inmunocompetencia humoral y cuantificación sérica',
      areaId: areaInmuno.id,
      defaultCalibratorUses: 3,
      defaultControlUses: 2,
      isActive: true,
    },
  });

  const examAna = await prisma.labExam.create({
    data: {
      code: 'EX-ANA-HEP2',
      name: 'Anticuerpos Antinucleares ANA Hep-2',
      description: 'Detección por inmunofluorescencia de patrones nucleares y citoplasmáticos',
      areaId: areaPatologia.id,
      defaultCalibratorUses: 2,
      defaultControlUses: 2,
      isActive: true,
    },
  });

  const examCitom = await prisma.labExam.create({
    data: {
      code: 'EX-CITOM-CD4',
      name: 'Subpoblaciones Linfocitarias CD3/CD4/CD8',
      description: 'Conteo absoluto y porcentual de linfocitos T colaboradores y citotóxicos',
      areaId: areaCitometria.id,
      defaultCalibratorUses: 0,
      defaultControlUses: 1,
      isActive: true,
    },
  });

  // Vincular productos compatibles con exámenes
  await prisma.labExamProduct.create({
    data: { labExamId: examDna.id, productId: createdReagentProducts['KIT-ELISA-DNA']! },
  });
  await prisma.labExamProduct.create({
    data: { labExamId: examDna.id, productId: createdReagentProducts['CALIB-ANTI-DNA']! },
  });
  await prisma.labExamProduct.create({
    data: { labExamId: examInmuno.id, productId: createdReagentProducts['KIT-INMUNO-CUANT']! },
  });
  await prisma.labExamProduct.create({
    data: { labExamId: examAna.id, productId: createdReagentProducts['KIT-ANA-HEP2']! },
  });
  await prisma.labExamProduct.create({
    data: { labExamId: examCitom.id, productId: createdReagentProducts['KIT-CITOM-CD4']! },
  });

  // Vincular productos a áreas de laboratorio
  await prisma.labAreaProduct.createMany({
    data: [
      { labAreaId: areaInmuno.id, productId: createdReagentProducts['KIT-ELISA-DNA']! },
      { labAreaId: areaInmuno.id, productId: createdReagentProducts['KIT-INMUNO-CUANT']! },
      { labAreaId: areaInmuno.id, productId: createdReagentProducts['CALIB-ANTI-DNA']! },
      { labAreaId: areaPatologia.id, productId: createdReagentProducts['KIT-ANA-HEP2']! },
      { labAreaId: areaPatologia.id, productId: createdReagentProducts['KIT-ELISA-DNA']! },
      { labAreaId: areaCitometria.id, productId: createdReagentProducts['KIT-CITOM-CD4']! },
    ],
  });

  // -----------------------------------------------------------------------
  // PROYECTO DE INVESTIGACIÓN (PARA TESTEAR /research)
  // -----------------------------------------------------------------------
  const researchInvestigatorId = createdUsersMap['investigador']!;
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
      spentFunds: 1200.0,
      remainingFunds: 11300.0,
    },
  });

  await prisma.researchProjectMember.create({
    data: {
      projectId: researchProj.id,
      userId: researchInvestigatorId,
      role: ResearchMemberRole.PRINCIPAL_INVESTIGATOR,
    },
  });

  // -----------------------------------------------------------------------
  // SEMBRAR FRASCOS FÍSICOS LISTOS EN NEVERAS PARA PROBAR /lab
  // -----------------------------------------------------------------------
  // Lotes origen para los frascos
  const batchDna = await prisma.stockBatch.findFirstOrThrow({
    where: { productId: createdReagentProducts['KIT-ELISA-DNA']! },
  });
  const batchInmuno = await prisma.stockBatch.findFirstOrThrow({
    where: { productId: createdReagentProducts['KIT-INMUNO-CUANT']! },
  });
  const batchAna = await prisma.stockBatch.findFirstOrThrow({
    where: { productId: createdReagentProducts['KIT-ANA-HEP2']! },
  });

  const bioanalistaId = createdUsersMap['bioanalista']!;
  const coordinadorId = createdUsersMap['coordinador']!;

  // Frasco 1: ELISA Anti-DNA en Nevera Principal (SELLADO, 96 usos, Rutina Clínica)
  const unitDna1 = await prisma.labReagentUnit.create({
    data: {
      unitCode: 'UNIT-DNA-NEV1-01',
      productId: createdReagentProducts['KIT-ELISA-DNA']!,
      batchId: batchDna.id,
      fridgeId: fridge1.id,
      assignedLabAreaId: areaInmuno.id,
      status: LabUnitStatus.SELLADO,
      ownershipType: StockOwnership.CLINICAL_ROUTINE,
      initialVolume: 96,
      currentVolume: 96,
      initialTheoreticalUses: 96,
      consumedUses: 0,
      remainingUses: 96,
      unitCostPerUse: 0.4687,
      expirationDate: new Date('2027-10-31'),
    },
  });

  // Frasco 2: Inmunoglobulinas en Nevera Principal (SELLADO, 100 usos, Rutina Clínica)
  const unitIg1 = await prisma.labReagentUnit.create({
    data: {
      unitCode: 'UNIT-IG-NEV1-01',
      productId: createdReagentProducts['KIT-INMUNO-CUANT']!,
      batchId: batchInmuno.id,
      fridgeId: fridge1.id,
      assignedLabAreaId: areaInmuno.id,
      status: LabUnitStatus.SELLADO,
      ownershipType: StockOwnership.CLINICAL_ROUTINE,
      initialVolume: 100,
      currentVolume: 100,
      initialTheoreticalUses: 100,
      consumedUses: 0,
      remainingUses: 100,
      unitCostPerUse: 0.4500,
      expirationDate: new Date('2027-11-30'),
    },
  });

  // Frasco 3: ANA Hep-2 en Nevera Inmunopatología (EN USO con 36 usos restantes)
  const unitAna1 = await prisma.labReagentUnit.create({
    data: {
      unitCode: 'UNIT-ANA-NEV2-01',
      productId: createdReagentProducts['KIT-ANA-HEP2']!,
      batchId: batchAna.id,
      fridgeId: fridge2.id,
      assignedLabAreaId: areaPatologia.id,
      status: LabUnitStatus.EN_USO,
      ownershipType: StockOwnership.CLINICAL_ROUTINE,
      initialVolume: 48,
      currentVolume: 36,
      initialTheoreticalUses: 48,
      consumedUses: 12,
      remainingUses: 36,
      unitCostPerUse: 0.9375,
      openedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Abierto hace 3 días
      openedById: bioanalistaId,
      expirationDate: new Date('2027-09-15'),
    },
  });

  // Frasco 4: ELISA Anti-DNA en Nevera Inmunopatología (EN USO con 76 usos restantes)
  const unitDna2 = await prisma.labReagentUnit.create({
    data: {
      unitCode: 'UNIT-DNA-NEV2-02',
      productId: createdReagentProducts['KIT-ELISA-DNA']!,
      batchId: batchDna.id,
      fridgeId: fridge2.id,
      assignedLabAreaId: areaPatologia.id,
      status: LabUnitStatus.EN_USO,
      ownershipType: StockOwnership.CLINICAL_ROUTINE,
      initialVolume: 96,
      currentVolume: 76,
      initialTheoreticalUses: 96,
      consumedUses: 20,
      remainingUses: 76,
      unitCostPerUse: 0.4687,
      openedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Abierto hace 5 días
      openedById: bioanalistaId,
      expirationDate: new Date('2027-10-31'),
    },
  });

  // Frasco 5: ELISA Anti-DNA en Cava-01 (Blindado para Investigación I+D)
  const unitDnaFreezer = await prisma.labReagentUnit.create({
    data: {
      unitCode: 'UNIT-DNA-ID-CAVA-01',
      productId: createdReagentProducts['KIT-ELISA-DNA']!,
      batchId: batchDna.id,
      fridgeId: freezer1.id,
      assignedLabAreaId: areaCitometria.id,
      status: LabUnitStatus.SELLADO,
      ownershipType: StockOwnership.RESEARCH_PROJECT,
      researchProjectId: researchProj.id,
      initialVolume: 96,
      currentVolume: 96,
      initialTheoreticalUses: 96,
      consumedUses: 0,
      remainingUses: 96,
      unitCostPerUse: 0.4687,
      expirationDate: new Date('2027-12-31'),
    },
  });

  console.log('   ✅ Frascos físicos y kits asignados a neveras para pruebas inmediatas.');

  // =========================================================================
  // 12. DATOS DE OPERACIÓN REAL DE LABORATORIO (CORRIDAS, ARQUEOS, SOLICITUDES, CUARENTENA)
  // =========================================================================
  console.log('🔬 [Paso 12/12] Registrando corridas semanales, arqueos de nevera, solicitudes FEFO e incidencias...');

  // 12.1 Corridas Analíticas Semanales (1 Liquidada con PDF disponible, 1 Abierta)
  const closedRun = await prisma.labWeeklyRun.create({
    data: {
      code: 'RUN-2026-W44-01',
      labAreaId: areaInmuno.id,
      labExamId: examDna.id,
      bioanalystId: bioanalistaId,
      weekStartDate: new Date('2026-10-26T08:00:00Z'),
      weekEndDate: new Date('2026-10-30T17:00:00Z'),
      status: LabWeeklyRunStatus.CLOSED_RECONCILED,
      totalValidPatientExams: 36,
      totalRunCost: 19.68,
      effectiveCostPerExam: 0.5467,
      notes: 'Corrida semanal cerrada y conciliada. Rendimiento analítico conforme con 36 pacientes válidos y calibración óptima.',
      closedAt: new Date('2026-10-30T17:00:00Z'),
      consumptions: {
        create: [
          {
            labReagentUnitId: unitDna2.id,
            patientUses: 36,
            calibratorUses: 2,
            controlUses: 2,
            repeatUses: 1,
            wasteUses: 1,
            totalDeductedUses: 42,
            calculatedCost: 19.68,
          },
        ],
      },
    },
  });

  await prisma.labWeeklyRun.create({
    data: {
      code: 'RUN-2026-W45-01',
      labAreaId: areaInmuno.id,
      labExamId: examInmuno.id,
      bioanalystId: bioanalistaId,
      weekStartDate: new Date('2026-11-02T08:00:00Z'),
      weekEndDate: new Date('2026-11-06T17:00:00Z'),
      status: LabWeeklyRunStatus.OPEN_ACCUMULATING,
      totalValidPatientExams: 0,
      notes: 'Corrida semanal en acumulación activa para cierre y conciliación de determinaciones.',
    },
  });

  // 12.2 Solicitudes Internas FEFO (1 Entregada/Despachada con PDF de Entrega, 1 Pendiente)
  await prisma.labInternalRequest.create({
    data: {
      code: 'REQ-LAB-2026-001',
      labAreaId: areaInmuno.id,
      requestedById: bioanalistaId,
      reviewedById: coordinadorId,
      status: LabInternalRequestStatus.DELIVERED,
      justification: 'Abastecimiento de Kit ELISA Anti-dsDNA para protocolo de investigación y rutina asistencial.',
      reviewNotes: 'Asignación algorítmica FEFO confirmada. Frasco UNIT-DNA-NEV1-01 despachado a Nevera NEV-01.',
      resolvedAt: new Date('2026-11-02T10:30:00Z'),
      items: {
        create: [
          {
            productId: createdReagentProducts['KIT-ELISA-DNA']!,
            requestedUsesOrUnits: 1,
            assignedLabUnitId: unitDna1.id,
          },
        ],
      },
    },
  });

  await prisma.labInternalRequest.create({
    data: {
      code: 'REQ-LAB-2026-002',
      labAreaId: areaPatologia.id,
      requestedById: bioanalistaId,
      status: LabInternalRequestStatus.PENDING,
      justification: 'Solicitud preventiva de Láminas ANA Hep-2 para corrida complementaria de inmunofluorescencia.',
      items: {
        create: [
          {
            productId: createdReagentProducts['KIT-ANA-HEP2']!,
            requestedUsesOrUnits: 1,
          },
        ],
      },
    },
  });

  // 12.3 Arqueo Físico de Nevera (Con conciliación 1-clic y Acta PDF)
  await prisma.fridgePhysicalAudit.create({
    data: {
      code: 'ARQ-NEV1-2026-11',
      performedById: coordinadorId,
      auditDate: new Date('2026-11-05T09:30:00Z'),
      notes: 'Arqueo físico regular de Nevera NEV-01. Verificación de sellos de seguridad y control térmico nominal a 4°C.',
      items: {
        create: [
          {
            labReagentUnitId: unitDna1.id,
            systemRemainingUses: 96,
            physicalRemainingUses: 96,
            variance: 0,
            adjustmentStatus: FridgeAuditAdjustmentStatus.RECONCILED_MATCH,
            notes: 'Saldo físico coincide exactamente con el sistema.',
          },
          {
            labReagentUnitId: unitIg1.id,
            systemRemainingUses: 100,
            physicalRemainingUses: 100,
            variance: 0,
            adjustmentStatus: FridgeAuditAdjustmentStatus.RECONCILED_MATCH,
            notes: 'Frasco sellado íntegro sin pérdidas térmicas.',
          },
        ],
      },
    },
  });

  // 12.4 Incidencias de Calidad y Cuarentena (1 Reintegrada con Acta PDF, 1 Pendiente)
  await prisma.batchIncident.create({
    data: {
      incidentType: IncidentType.CADENA_FRIO_ROTA,
      quarantineReason: QuarantineReason.COLD_CHAIN_BREAK,
      labReagentUnitId: unitDna2.id,
      labAreaId: areaPatologia.id,
      reportedById: bioanalistaId,
      resolvedById: coordinadorId,
      description: 'Alarma de temperatura en Nevera NEV-02 por apertura prolongada durante mantenimiento (subió a 9.5°C por 15 minutos).',
      resolutionStatus: QuarantineResolutionStatus.REINTEGRATED_TO_STOCK,
      resolutionNotes: 'Evaluación de estabilidad técnica conforme: curva de control dentro de rangos aceptables (+/- 2 SD). Reintegrado a uso.',
      resolvedAt: new Date('2026-11-04T14:00:00Z'),
    },
  });

  await prisma.batchIncident.create({
    data: {
      incidentType: IncidentType.FALLA_CONTROL_CALIDAD,
      quarantineReason: QuarantineReason.CALIBRATION_FAILURE,
      labReagentUnitId: unitAna1.id,
      labAreaId: areaPatologia.id,
      reportedById: bioanalistaId,
      description: 'Discrepancia en control positivo durante corrida preliminar. Retenido preventivamente en cuarentena técnica para evaluación.',
      resolutionStatus: QuarantineResolutionStatus.PENDING,
    },
  });

  console.log('   ✅ Corridas, arqueos de nevera, requisiciones FEFO e incidencias creadas.');

  // -----------------------------------------------------------------------
  // 12. RESUMEN FINAL
  // -----------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('🎉 ¡BASE DE DATOS LIMPIA Y REGENERADA CON ÉXITO PARA TESTING!');
  console.log('========================================================================');
  console.log('🔐 CREDENCIALES DE ACCESO POR ROL (Contraseña: Password123!)');
  console.log('------------------------------------------------------------------------');
  console.log('  1. ADMINISTRADOR           -> admin@idi.ucv.ve        | user: admin');
  console.log('  2. COORDINADOR LABORATORIO -> coordinador@idi.ucv.ve  | user: coordinador');
  console.log('  3. BIOANALISTA (MESÓN)     -> bioanalista@idi.ucv.ve  | user: bioanalista');
  console.log('  4. ALMACENISTA (KARDEX)    -> almacenista@idi.ucv.ve  | user: almacenista');
  console.log('  5. COMPRAS & PROVEEDORES   -> compras@idi.ucv.ve      | user: compras');
  console.log('  6. ADMINISTRACION & PAGOS  -> administracion@idi.ucv.ve | user: administracion');
  console.log('  7. INVESTIGADOR (I+D)      -> investigador@idi.ucv.ve | user: investigador');
  console.log('  8. SOLICITANTE DE ÁREA     -> solicitante@idi.ucv.ve  | user: solicitante');
  console.log('------------------------------------------------------------------------');
  console.log('❄️ EQUIPOS DE FRÍO: NEV-01 (4°C), NEV-02 (4°C), CAVA-01 (-20°C)');
  console.log('🧪 REACTIVOS LISTOS EN NEVERAS: ELISA Anti-DNA, Inmunoglobulinas, ANA Hep-2');
  console.log('💵 TASA BCV OFICIAL: USD = 75.00 Bs. | EUR = 81.50 Bs.');
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
