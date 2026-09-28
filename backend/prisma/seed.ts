import { PrismaClient, LocationType, FridgeStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando la siembra de datos (Seed)...');

  // 1. Monedas base
  await prisma.currency.upsert({
    where: { code: 'USD' },
    update: {},
    create: {
      code: 'USD',
      name: 'Dólar Estadounidense',
      symbol: '$',
      isDefault: true,
    },
  });

  await prisma.currency.upsert({
    where: { code: 'VES' },
    update: {},
    create: {
      code: 'VES',
      name: 'Bolívar Digital',
      symbol: 'Bs.',
      isDefault: false,
    },
  });

  await prisma.currency.upsert({
    where: { code: 'EUR' },
    update: {},
    create: {
      code: 'EUR',
      name: 'Euro',
      symbol: '€',
      isDefault: false,
    },
  });
  console.log('✅ Monedas sembradas (USD, VES, EUR)');

  // 2. Unidades de Medida
  const unitsData = [
    { name: 'Unidad', abbreviation: 'und' },
    { name: 'Frasco', abbreviation: 'fco' },
    { name: 'Caja', abbreviation: 'cja' },
    { name: 'Bulto', abbreviation: 'blt' },
    { name: 'Mililitro', abbreviation: 'ml' },
    { name: 'Gramo', abbreviation: 'g' },
    { name: 'Determinaciones', abbreviation: 'det' },
    { name: 'Kit', abbreviation: 'kit' },
  ];

  for (const unit of unitsData) {
    await prisma.unit.upsert({
      where: { abbreviation: unit.abbreviation },
      update: {},
      create: unit,
    });
  }
  console.log('✅ Unidades de medida sembradas');

  // 3. Marcas comerciales base (Catálogo Maestro)
  const brandsData = [
    {
      name: 'Sigma-Aldrich',
      description: 'Reactivos químicos analíticos y sueros',
    },
    {
      name: 'Bio-Rad',
      description: 'Kits diagnósticos y reactivos de control',
    },
    {
      name: 'Thermo Fisher Scientific',
      description: 'Material e insumos para citometría y biología molecular',
    },
    {
      name: 'BD Biosciences',
      description: 'Soluciones y reactivos de diagnóstico',
    },
    {
      name: 'Genérico / Preparado Interno',
      description: 'Soluciones tamponadas preparadas en el instituto',
    },
  ];

  for (const brand of brandsData) {
    await prisma.brand.upsert({
      where: { name: brand.name },
      update: {},
      create: brand,
    });
  }
  console.log('✅ Marcas comerciales sembradas');

  // 4. Roles y Permisos
  const rolesData = [
    {
      name: 'ADMINISTRADOR',
      description: 'Acceso total al sistema y auditoría',
    },
    {
      name: 'ANALISTA_LABORATORIO',
      description: 'Gestión de reactivos, neveras y solicitudes',
    },
    {
      name: 'ALMACENISTA',
      description: 'Recepción de órdenes, lotes y despachos',
    },
    {
      name: 'COMPRAS',
      description: 'Gestión de proveedores y órdenes de compra',
    },
    {
      name: 'SOLICITANTE',
      description: 'Creación de solicitudes semanales de insumos',
    },
    {
      name: 'ADMINISTRACION',
      description: 'Gestión administrativa, tesorería, pagos y preórdenes',
    },
  ];

  const createdRoles: Record<string, number> = {};
  for (const role of rolesData) {
    const r = await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
    createdRoles[r.name] = r.id;
  }
  console.log('✅ Roles base sembrados');

  // 5. Ubicaciones
  const warehouse = await prisma.location.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Almacén Central',
      type: LocationType.ALMACEN_GENERAL,
      description: 'Depósito principal de mercancía y reactivos en reserva',
    },
  });

  const lab = await prisma.location.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Laboratorio de Inmunología',
      type: LocationType.LABORATORIO,
      description: 'Área analítica de laboratorio clínico',
    },
  });
  console.log('✅ Ubicaciones físicas sembradas');

  // 6. Equipos de Frío
  await prisma.fridge.upsert({
    where: { code: 'NEV-01' },
    update: {},
    create: {
      code: 'NEV-01',
      name: 'Nevera de Laboratorio',
      locationId: lab.id,
      targetTempCelsius: 4.0,
      status: FridgeStatus.OPERATIVO,
      description: 'Nevera operativa para reactivos de uso diario',
    },
  });

  await prisma.fridge.upsert({
    where: { code: 'CAVA-01' },
    update: {},
    create: {
      code: 'CAVA-01',
      name: 'Cava Fría',
      locationId: lab.id,
      targetTempCelsius: 2.0,
      status: FridgeStatus.OPERATIVO,
      description: 'Cava de refrigeración de insumos y controles',
    },
  });
  console.log('✅ Equipos de frío sembrados (NEV-01, CAVA-01)');

  // 7. Categorías Maestras
  const categoriesData = [
    {
      name: 'Reactivos de Inmunología',
      description: 'Kits y sueros de prueba',
    },
    {
      name: 'Calibradores y Controles',
      description: 'Material de referencia y control de calidad',
    },
    {
      name: 'Soluciones y Diluyentes',
      description: 'Líquidos de lavado, dilución y citometría',
    },
    {
      name: 'Material Médico Descartable',
      description: 'Tubos, copas, cubetas y guantes',
    },
  ];

  for (const cat of categoriesData) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }
  console.log('✅ Categorías maestras sembradas');

  // 8. Departamentos Institucionales
  const departmentsData = [
    {
      code: 'INM-GEN',
      name: 'Inmunología General',
      description: 'Área analítica de inmunología clínica',
      isActive: true,
    },
    {
      code: 'INM-CEL',
      name: 'Inmunología Celular',
      description: 'Área analítica de citometría y cultivos celulares',
      isActive: true,
    },
    {
      code: 'INM-PAT',
      name: 'Inmunopatología',
      description: 'Estudios histológicos e inmunohistoquímica',
      isActive: true,
    },
    {
      code: 'ALE-INM',
      name: 'Alergia e Inmunología Clínica',
      description: 'Atención a pacientes y pruebas de hipersensibilidad',
      isActive: true,
    },
    {
      code: 'LAB-GEN',
      name: 'Laboratorio General',
      description: 'Laboratorio clínico de toma y procesamiento de muestras',
      isActive: true,
    },
    {
      code: 'INV-DES',
      name: 'Investigación y Desarrollo (I+D)',
      description: 'Proyectos científicos y ensayos de investigación',
      isActive: true,
    },
    {
      code: 'SIS-INF',
      name: 'Sistemas e Informática',
      description: 'Soporte tecnológico e infraestructura institucional',
      isActive: true,
    },
    {
      code: 'ADM-FIN',
      name: 'Administración y Finanzas',
      description: 'Dirección administrativa, compras y logística',
      isActive: true,
    },
  ];

  for (const dep of departmentsData) {
    await prisma.department.upsert({
      where: { code: dep.code },
      update: {},
      create: dep,
    });
  }
  console.log('✅ Departamentos institucionales sembrados');

  // 8. Usuario Administrador Inicial
  const adminPasswordHash = await bcrypt.hash('Admin1234!', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@idi.ucv.ve' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@idi.ucv.ve',
      fullName: 'Administrador SGCI',
      department: 'Sistemas',
      passwordHash: adminPasswordHash,
      isActive: true,
    },
  });

  const adminRoleId = createdRoles['ADMINISTRADOR']!;

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRoleId,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRoleId,
    },
  });
  console.log('✅ Usuario Superadmin sembrado (admin@idi.ucv.ve / Admin1234!)');

  // 9. Tasas de Cambio BCV Iniciales
  const vesCurrency = await prisma.currency.findUnique({ where: { code: 'VES' } });
  if (vesCurrency) {
    const existingExchange = await prisma.currencyExchange.findFirst({
      where: { currencyId: vesCurrency.id },
    });
    if (!existingExchange) {
      await prisma.currencyExchange.create({
        data: {
          currencyId: vesCurrency.id,
          rate: 75.0,
          effectiveDate: new Date(),
          createdById: adminUser.id,
        },
      });
    }
  }

  const eurCurrency = await prisma.currency.findUnique({ where: { code: 'EUR' } });
  if (eurCurrency) {
    const existingEurExchange = await prisma.currencyExchange.findFirst({
      where: { currencyId: eurCurrency.id },
    });
    if (!existingEurExchange) {
      await prisma.currencyExchange.create({
        data: {
          currencyId: eurCurrency.id,
          rate: 81.5,
          effectiveDate: new Date(),
          createdById: adminUser.id,
        },
      });
    }
  }
  console.log('✅ Tasas de cambio iniciales sembradas (BCV USD: 75.00 Bs., EUR: 81.50 Bs.)');

  console.log('🚀 Siembra de datos completada exitosamente.');
}

main()
  .catch((e) => {
    console.error('❌ Error en el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
