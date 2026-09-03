import { PrismaClient, LocationType, FridgeStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando la siembra de datos (Seed)...');

  // 1. Monedas base
  const usd = await prisma.currency.upsert({
    where: { code: 'USD' },
    update: {},
    create: {
      code: 'USD',
      name: 'Dólar Estadounidense',
      symbol: '$',
      isDefault: true,
    },
  });

  const ves = await prisma.currency.upsert({
    where: { code: 'VES' },
    update: {},
    create: {
      code: 'VES',
      name: 'Bolívar Digital',
      symbol: 'Bs.',
      isDefault: false,
    },
  });

  const eur = await prisma.currency.upsert({
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

  // 3. Roles y Permisos
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

  // 4. Ubicaciones
  const warehouse = await prisma.location.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Almacén Central',
      type: LocationType.ALMACEN_GENERAL,
      description: 'Depósito principal de mercancía y reactivos en reserva',
    },
  });

  const lab = await prisma.location.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      name: 'Laboratorio de Inmunología',
      type: LocationType.LABORATORIO,
      description: 'Área analítica de laboratorio clínico',
    },
  });
  console.log('✅ Ubicaciones físicas sembradas');

  // 5. Equipos de Frío (Nevera y Cava de tu Excel)
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

  // 6. Categorías Maestras
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

  // 7. Usuario Administrador Inicial
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

  // Obtenemos el ID del rol asegurando a TypeScript que existe
  const adminRoleId = createdRoles['ADMINISTRADOR']!;

  // Asignar rol ADMINISTRADOR al usuario admin
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
