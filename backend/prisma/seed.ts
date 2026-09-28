import { PrismaClient, LocationType, FridgeStatus, BatchStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const initialProducts = [
  // LABORATORIO
  { name: 'GUANTES DE NITRILO TALLA M', category: 'Laboratorio', quantity: 38, unit: 'CAJA' },
  { name: 'GUANTES DE NITRILO TALLA L', category: 'Laboratorio', quantity: 44, unit: 'CAJA' },
  { name: 'GUANTES DE NITRILO TALLA S', category: 'Laboratorio', quantity: 10, unit: 'CAJA' },
  { name: 'PAPEL CAMILLLA', category: 'Laboratorio', quantity: 28, unit: 'ROLLO' },
  { name: 'ROLLOS DE ALGODON', category: 'Laboratorio', quantity: 8, unit: 'UND' },
  { name: 'CURAS REDONDAS', category: 'Laboratorio', quantity: 8, unit: 'UND' },
  { name: 'PISETAS DE 500 ML', category: 'Laboratorio', quantity: 6, unit: 'UND' },
  { name: 'TUBOS DE EXTRACCION TAPA ROJA', category: 'Laboratorio', quantity: 27, unit: 'GRADILLA' },
  { name: 'TUBOS DE EXTRACCION TAPA MORADA', category: 'Laboratorio', quantity: 44, unit: 'GRADILLA' },
  { name: 'AGUJAS 21 G *1', category: 'Laboratorio', quantity: 9, unit: 'CAJA' },
  { name: 'TUBOS FALCON DE 50 ML', category: 'Laboratorio', quantity: 23, unit: 'GRADILLA' },
  { name: 'PIPETAS RAMA CORTA', category: 'Laboratorio', quantity: 4, unit: 'CAJA' },
  { name: 'ALCOHOL', category: 'Laboratorio', quantity: 13, unit: 'GALON' },
  { name: 'BOLSAS DE DESECHOS BIOLOGICOS 15 LTS', category: 'Laboratorio', quantity: 396, unit: 'UND' },
  { name: 'BOLSAS DE DESECHOS BIOLOGICOS 30 LTS', category: 'Laboratorio', quantity: 136, unit: 'UND' },
  { name: 'BOLSAS DE DESECHOS BIOLOGICOS 60 LTS', category: 'Laboratorio', quantity: 200, unit: 'UND' },
  { name: 'PUNTAS P1000 C/F', category: 'Laboratorio', quantity: 20, unit: 'GRADILLA' },
  { name: 'PUNTAS P200 C/F', category: 'Laboratorio', quantity: 10, unit: 'GRADILLA' },
  { name: 'DESCARTADOR DE AGUJAS', category: 'Laboratorio', quantity: 52, unit: 'UND' },
  { name: 'SCALP 23 G', category: 'Laboratorio', quantity: 6, unit: 'UND' },
  { name: 'SCALP 26 G', category: 'Laboratorio', quantity: 9, unit: 'UND' },
  { name: 'EZ CLEANING', category: 'Laboratorio', quantity: 2, unit: 'UND' },
  { name: 'LAMINA PORTA OBJETO 3X1 76.2 X 25.4MM', category: 'Laboratorio', quantity: 3, unit: 'UND' },
  { name: 'M-30 CFLYSE', category: 'Laboratorio', quantity: 2, unit: 'UND' },
  { name: 'CALCIO CHLORIDE', category: 'Laboratorio', quantity: 2, unit: 'UND' },
  { name: 'YELCO 20 G', category: 'Laboratorio', quantity: 7, unit: 'CAJA' },
  { name: 'SOLUCION FISIOLOGICA 0.9%', category: 'Laboratorio', quantity: 3, unit: 'UND' },
  { name: 'AGUA INYECTABLE', category: 'Laboratorio', quantity: 1, unit: 'UND' },
  { name: 'ALCOHOL ACETONA', category: 'Laboratorio', quantity: 4, unit: 'LITRO' },
  { name: 'INYECTADORA 1 ML', category: 'Laboratorio', quantity: 2, unit: 'CAJA' },
  { name: 'JERINGA 5 ML', category: 'Laboratorio', quantity: 8, unit: 'CAJA' },
  { name: 'JERINGA 10 ML', category: 'Laboratorio', quantity: 7, unit: 'CAJA' },
  { name: 'JERINGA 3 ML', category: 'Laboratorio', quantity: 8, unit: 'CAJA' },
  { name: 'JERINGA DE 20 ML', category: 'Laboratorio', quantity: 10, unit: 'CAJA' },
  { name: 'TUBOS CRIOVIALES DE 5 ML', category: 'Laboratorio', quantity: 55, unit: 'PAQUETE' },
  { name: 'APLICADORES SIN ALGODON', category: 'Laboratorio', quantity: 6, unit: 'PAQUETE' },
  { name: 'APLICADORES CON ALGODON', category: 'Laboratorio', quantity: 23, unit: 'PAQUETE' },
  { name: 'BAJA LENGUA', category: 'Laboratorio', quantity: 2, unit: 'CAJA' },
  { name: 'JERINGA DE 60 ML', category: 'Laboratorio', quantity: 2, unit: 'CAJA' },
  { name: 'METANOL ALCOHOL', category: 'Laboratorio', quantity: 3, unit: 'GALON' },
  { name: 'TUBO TAPA AZUL', category: 'Laboratorio', quantity: 1, unit: 'GRADILLA' },
  { name: 'PIPETA SEROLOGICA 10 ML', category: 'Laboratorio', quantity: 9, unit: 'PAQUETE' },
  { name: 'PIPETA SEROLOGICA 5 ML', category: 'Laboratorio', quantity: 8, unit: 'PAQUETE' },
  { name: 'PUNTAS P20 CON FILTRO', category: 'Laboratorio', quantity: 4, unit: 'GRADILLA' },
  { name: 'PUNTAS P100 CON FILTRO', category: 'Laboratorio', quantity: 23, unit: 'GRADILLA' },
  { name: 'PUNTAS P10 SIN FILTRO', category: 'Laboratorio', quantity: 8, unit: 'BOLSA' },
  { name: 'PUNTAS P10 CON FILTRO', category: 'Laboratorio', quantity: 13, unit: 'GRADILLA' },
  { name: 'PUNTAS P200 SIN FILTRO', category: 'Laboratorio', quantity: 61, unit: 'BOLSA' },
  { name: 'PUNTAS P1000 SIN FILTRO', category: 'Laboratorio', quantity: 6, unit: 'BOLSA' },
  { name: 'VIALES DE CONGELACION 1.8 ML', category: 'Laboratorio', quantity: 13, unit: 'BOLSA' },
  { name: 'TUBOS FALCON 15 ML', category: 'Laboratorio', quantity: 19, unit: 'GRADILLA' },
  { name: 'SISTEMA DE FILTRACION 0.22ML', category: 'Laboratorio', quantity: 27, unit: 'UND' },
  { name: 'M-53D DILUENTE', category: 'Laboratorio', quantity: 4, unit: 'CAJA' },
  { name: 'TUBOS DE MICROCENTRIFUGA 1.5 ML', category: 'Laboratorio', quantity: 19, unit: 'CAJA' },
  { name: 'TUBOS PCR TIRAS 0.2 ML', category: 'Laboratorio', quantity: 1, unit: 'CAJA' },
  { name: 'TUBOS PCR 0.2 ML', category: 'Laboratorio', quantity: 2, unit: 'CAJA' },
  { name: 'VSG', category: 'Laboratorio', quantity: 4, unit: 'UND' },
  { name: 'TAPABOCAS AZULES', category: 'Laboratorio', quantity: 12, unit: 'CAJA' },
  { name: 'BATAS CLINICAS', category: 'Laboratorio', quantity: 3000, unit: 'UND' },
  { name: 'VIALES DE CONGELACION LIBRE RNASE/DNASE 2 ML', category: 'Laboratorio', quantity: 20, unit: 'BOLSA' },
  { name: 'TUBOS DE CENTRIFUGA 1.8 ML', category: 'Laboratorio', quantity: 13, unit: 'BOLSA' },

  // LIMPIEZA
  { name: 'PAPEL HIGIÉNICO INSTITUCIONAL 9”', category: 'Limpieza', quantity: 32, unit: 'ROLLO' },
  { name: 'CLORO 5%', category: 'Limpieza', quantity: 6, unit: 'GALON' },
  { name: 'CERA EMULSIONADA', category: 'Limpieza', quantity: 8, unit: 'GALON' },
  { name: 'DESENGRASANTE', category: 'Limpieza', quantity: 10, unit: 'GALON' }, 
  { name: 'AJAX EN POLVO', category: 'Limpieza', quantity: 3, unit: 'UND' },
  { name: 'LIMPIADOR MULTIUSOS (PRIDE)', category: 'Limpieza', quantity: 4, unit: 'UND' },
  { name: 'SUTIL', category: 'Limpieza', quantity: 6, unit: 'UND' },
  { name: 'TOALLIN', category: 'Limpieza', quantity: 83, unit: 'UND' },
  { name: 'BOLSAS BLANCAS DE 60 LTS', category: 'Limpieza', quantity: 110, unit: 'UND' },
  { name: 'BOLSAS BLANCAS DE 30 LTS', category: 'Limpieza', quantity: 310, unit: 'UND' },
  { name: 'JABON MULTIUSOS', category: 'Limpieza', quantity: 4, unit: 'GALON' },
  { name: 'DESIFECTANTE', category: 'Limpieza', quantity: 3, unit: 'GALON' },
  { name: 'ESCOBAS CERDAS SUAVES', category: 'Limpieza', quantity: 3, unit: 'UND' },
  { name: 'PALAS', category: 'Limpieza', quantity: 7, unit: 'UND' },
  { name: 'CEPILLOS DE JARDIN', category: 'Limpieza', quantity: 3, unit: 'UND' },
  { name: 'ESPONJAS DOBLE USO', category: 'Limpieza', quantity: 6, unit: 'UND' },
  { name: 'BOLSAS NEGRAS 40 KILOS', category: 'Limpieza', quantity: 800, unit: 'UND' },
  { name: 'GUANTES DE GOMA TALLA M', category: 'Limpieza', quantity: 2, unit: 'UND' },
  { name: 'GUANTES DE GOMA TALLA L', category: 'Limpieza', quantity: 1, unit: 'UND' },
  { name: 'PAÑOS AMARILLOS', category: 'Limpieza', quantity: 3, unit: 'UND' },
  { name: 'LIMPIADOR DE POCETAS MAS', category: 'Limpieza', quantity: 3, unit: 'LITRO' },
  { name: 'COLETO', category: 'Limpieza', quantity: 6, unit: 'UND' },
  { name: 'MOPA', category: 'Limpieza', quantity: 7, unit: 'UND' },
  { name: 'ARAGAN', category: 'Limpieza', quantity: 2, unit: 'UND' },
  { name: 'CEPILLO PARA POCETA', category: 'Limpieza', quantity: 4, unit: 'UND' },
  { name: 'RASTRILLO METÁLICO', category: 'Limpieza', quantity: 3, unit: 'UND' },
  { name: 'ALAGAN PARA LIMPIAR VIDRIOS', category: 'Limpieza', quantity: 1, unit: 'UND' },
  { name: 'VASOS DE 7 OZ', category: 'Limpieza', quantity: 4, unit: 'PAQUETE' },
  { name: 'VASOS DE 5 OZ', category: 'Limpieza', quantity: 1, unit: 'PAQUETE' },
  { name: 'SERVILLETAS', category: 'Limpieza', quantity: 3, unit: 'UND' },
  { name: 'TOBOS', category: 'Limpieza', quantity: 3, unit: 'UND' },
  { name: 'PAÑIELOS FACIALES', category: 'Limpieza', quantity: 8, unit: 'UND' },

  // OFICINA
  { name: 'SOBRES BLANCOS N 11', category: 'Oficina', quantity: 1300, unit: 'SOBRE' },
  { name: 'RESMA T / CARTA', category: 'Oficina', quantity: 22, unit: 'RESMA' },
  { name: 'RESMA T / OFICIO', category: 'Oficina', quantity: 16, unit: 'RESMA' },
  { name: 'BARRA ADHESIVA', category: 'Oficina', quantity: 6, unit: 'UND' },
  { name: 'RESALTADORES', category: 'Oficina', quantity: 17, unit: 'UND' },
  { name: 'GRAPAS LISA', category: 'Oficina', quantity: 4, unit: 'CAJA' }, 
  { name: 'MARCADOR SHARPIE PUNTA EXTRA FINA', category: 'Oficina', quantity: 13, unit: 'UND' },
  { name: 'MARCADOR SHARPIE PUNTA FINA', category: 'Oficina', quantity: 23, unit: 'UND' },
  { name: 'LAPIZ CORRECTOR', category: 'Oficina', quantity: 14, unit: 'UND' },
  { name: 'CINTA CELOVEN', category: 'Oficina', quantity: 6, unit: 'UND' },
  { name: 'TIRRAP', category: 'Oficina', quantity: 91, unit: 'UND' },
  { name: 'TONER 1105A', category: 'Oficina', quantity: 3, unit: 'UND' },
  { name: 'CARPETA ARCHIVADORA T/CARTA', category: 'Oficina', quantity: 10, unit: 'UND' },
  { name: 'LAPIZ DE GRAFITO', category: 'Oficina', quantity: 5, unit: 'UND' },
  { name: 'TONERGPP22', category: 'Oficina', quantity: 2, unit: 'UND' },
  { name: 'TONER 78A', category: 'Oficina', quantity: 6, unit: 'UND' },
  { name: 'TONER 85A', category: 'Oficina', quantity: 5, unit: 'UND' },
  { name: 'TONER 1500A', category: 'Oficina', quantity: 2, unit: 'UND' },
  { name: 'TONER 1510A', category: 'Oficina', quantity: 3, unit: 'UND' },
  { name: 'TONER 49A', category: 'Oficina', quantity: 3, unit: 'UND' },
  { name: 'TONER 7115A', category: 'Oficina', quantity: 1, unit: 'UND' },
  { name: 'TONER 051', category: 'Oficina', quantity: 1, unit: 'UND' },
  { name: 'TIRRO DE 1”', category: 'Oficina', quantity: 3, unit: 'UND' },
  { name: 'BOLIGRAFO NEGRO', category: 'Oficina', quantity: 32, unit: 'UND' },
  { name: 'BOLIGRAFO AZUL', category: 'Oficina', quantity: 48, unit: 'UND' },
  { name: 'BOLIGRAFO ROJO', category: 'Oficina', quantity: 9, unit: 'UND' },
  { name: 'GRAPA CORRUGADA', category: 'Oficina', quantity: 3, unit: 'CAJA' },
  { name: 'CINTA EPSON 7753', category: 'Oficina', quantity: 1, unit: 'UND' },
  { name: 'CINTA EPSON 2*300', category: 'Oficina', quantity: 1, unit: 'UND' },
  { name: 'LAPIZ MONGOL', category: 'Oficina', quantity: 3, unit: 'UND' },
  { name: 'CUADERNOS', category: 'Oficina', quantity: 3, unit: 'UND' },
  { name: 'SHARPIE PUNTA GRUESA 680', category: 'Oficina', quantity: 5, unit: 'UND' },
  { name: 'SHARPIE PUNTA GRUESA 690', category: 'Oficina', quantity: 8, unit: 'UND' },
  { name: 'MARCADOR DE PIZARRA', category: 'Oficina', quantity: 20, unit: 'UND' },
  { name: 'TACOS DE ANOTAR', category: 'Oficina', quantity: 2, unit: 'UND' },
  { name: 'CERA PARA CONTAR', category: 'Oficina', quantity: 5, unit: 'UND' },
  { name: 'CLIP MARIPOSA (N2)', category: 'Oficina', quantity: 7, unit: 'CAJA' },
  { name: 'CLIP MARIPOSA (N1)', category: 'Oficina', quantity: 1, unit: 'CAJA' },
  { name: 'CLIP STANDAR', category: 'Oficina', quantity: 6, unit: 'CAJA' },
  { name: 'BINDE CLIPS', category: 'Oficina', quantity: 1, unit: 'CAJA' },
  { name: 'TINTA PARA ALMOHADILLA', category: 'Oficina', quantity: 6, unit: 'UND' },
  { name: 'GRAPAS 26/6', category: 'Oficina', quantity: 16, unit: 'CAJA' },
  { name: 'CUADERNO DE ACTA', category: 'Oficina', quantity: 2, unit: 'UND' },
  { name: 'ROLLO DE PAPEL TERMICO', category: 'Oficina', quantity: 18, unit: 'PAQUETE' }
];

const missingProducts = [
  // LIMPIEZA
  { name: 'AJAX LIQUIDO', category: 'Limpieza', unit: 'GALON' },
  { name: 'AMBIENTADOR EN SPRAY', category: 'Limpieza', unit: 'UND' },
  { name: 'CEPILLO PARA BARRER', category: 'Limpieza', unit: 'UND' },
  { name: 'CEPILLO PARA PULIDORA', category: 'Limpieza', unit: 'UND' },
  { name: 'CEPILLO PARA TELARAÑAS', category: 'Limpieza', unit: 'UND' },
  { name: 'CERA PARA PISOS BLANCA', category: 'Limpieza', unit: 'GALON' },
  { name: 'CERA PARA PISO ROJA', category: 'Limpieza', unit: 'GALON' },
  { name: 'CLORO CON PH (NEVEX)', category: 'Limpieza', unit: 'GALON' },
  { name: 'DESIFECTANTE DE POCETAS', category: 'Limpieza', unit: 'LITRO' },
  { name: 'DESIFECTANTE FRAGANCIAS VARIAS', category: 'Limpieza', unit: 'GALON' },
  { name: 'DESTAPADOR DE CAÑERIAS', category: 'Limpieza', unit: 'UND' },
  { name: 'ESPONJA DE FIBRA VERDE', category: 'Limpieza', unit: 'UND' },
  { name: 'ESPONJA JABONOSA', category: 'Limpieza', unit: 'UND' },
  { name: 'JABON EN POLVO', category: 'Limpieza', unit: 'UND' },
  { name: 'JABON LIQUIDO PARA MANOS', category: 'Limpieza', unit: 'GALON' },
  { name: 'LIMPIA VIDRIOS', category: 'Limpieza', unit: 'UND' },
  { name: 'LIMPIADOR DE USO MULTIPLE LIQUIDO/SPRAY', category: 'Limpieza', unit: 'UND' },
  { name: 'VENSOL', category: 'Limpieza', unit: 'LITRO' },

  // LABORATORIO Y TOMA DE MUESTRA
  { name: 'AGUJAS HIPODERMICAS DESECHABLE 26G * 1/2', category: 'Laboratorio', unit: 'CAJA' },
  { name: 'AGUJAS SCALP 23G* 3/4', category: 'Laboratorio', unit: 'CAJA' },
  { name: 'CAMISA PARA TUBO DE EXTRACCION', category: 'Laboratorio', unit: 'UND' },
  { name: 'CATETER INTRAVENOSO DE 22G', category: 'Laboratorio', unit: 'UND' },
  { name: 'CURITAS', category: 'Laboratorio', unit: 'CAJA' },
  { name: 'JABON LIQUIDO PARA CRISTALERIA', category: 'Laboratorio', unit: 'GALON' },
  { name: 'PABILO', category: 'Laboratorio', unit: 'ROLLO' },
  { name: 'PAPEL ALUMINIO', category: 'Laboratorio', unit: 'ROLLO' },
  { name: 'TORNIQUETE', category: 'Laboratorio', unit: 'UND' },
  { name: 'TUBOS 12*75', category: 'Laboratorio', unit: 'GRADILLA' },
  { name: 'SPECIMEN COLLECTION', category: 'Laboratorio', unit: 'UND' },
  { name: 'PAPEL KRAFT', category: 'Laboratorio', unit: 'ROLLO' },
  { name: 'EPPENDORFF 1,5 ML', category: 'Laboratorio', unit: 'CAJA' },
  { name: 'TUBOS CONICOS 14 ML', category: 'Laboratorio', unit: 'GRADILLA' },
  { name: 'PLACAS DE CULTIVO 12 POZOS', category: 'Laboratorio', unit: 'UND' },
  { name: 'PLACAS DE CULTIVO 24 POZOS', category: 'Laboratorio', unit: 'UND' },
  { name: 'FLASK', category: 'Laboratorio', unit: 'UND' },

  // OFICINA
  { name: 'ABREHUECO', category: 'Oficina', unit: 'UND' },
  { name: 'CARPETAS ARCHIVADORES T/ OFICIO', category: 'Oficina', unit: 'UND' },
  { name: 'CARPETAS MANILA T /OFICIO', category: 'Oficina', unit: 'UND' },
  { name: 'CARPETAS MANILA T/CARTA', category: 'Oficina', unit: 'UND' },
  { name: 'CARPETAS MARRON T/ CARTA', category: 'Oficina', unit: 'UND' },
  { name: 'CARPETAS MARRON T/ OFICIO', category: 'Oficina', unit: 'UND' },
  { name: 'CINTA ADHESIVA INVISEL', category: 'Oficina', unit: 'UND' },
  { name: 'CINTA DE EMBALAJE', category: 'Oficina', unit: 'UND' },
  { name: 'CLIPS 50MM', category: 'Oficina', unit: 'CAJA' },
  { name: 'CUADERNO 1 LINEA', category: 'Oficina', unit: 'UND' },
  { name: 'CUADERNO CUADRICULADO', category: 'Oficina', unit: 'UND' },
  { name: 'ENGRAPADORA', category: 'Oficina', unit: 'UND' },
  { name: 'HOJAS BLANCAS T/ OFICIO', category: 'Oficina', unit: 'RESMA' },
  { name: 'HOJAS BLANCAS T/CARTA', category: 'Oficina', unit: 'RESMA' },
  { name: 'LIGAS', category: 'Oficina', unit: 'CAJA' },
  { name: 'PEGA EN BARRA', category: 'Oficina', unit: 'UND' },
  { name: 'ROLLO DE ETIQUETAS', category: 'Oficina', unit: 'ROLLO' },
  { name: 'ROLLO DE NÚMEROS', category: 'Oficina', unit: 'ROLLO' },
  { name: 'ROLLO DE PUNTO DE VENTA', category: 'Oficina', unit: 'ROLLO' },
  { name: 'ROLLO IMPRESORA FISCAL', category: 'Oficina', unit: 'ROLLO' },
  { name: 'SACA GRAPAS', category: 'Oficina', unit: 'UND' },
  { name: 'SACAPUNTAS ELECTRICO', category: 'Oficina', unit: 'UND' },
  { name: 'SOBRES DE MANILA T/ CARTA', category: 'Oficina', unit: 'UND' },
  { name: 'SOBRES DE MANILA T/OFICIO', category: 'Oficina', unit: 'UND' },
  { name: 'TIJERAS PUNTA REDONDA', category: 'Oficina', unit: 'UND' },
  { name: 'TIPEX', category: 'Oficina', unit: 'UND' },
  { name: 'TONER 53A', category: 'Oficina', unit: 'UND' },
  { name: 'TONER 78A/128A', category: 'Oficina', unit: 'UND' }
];

async function main() {
  console.log('🌱 Iniciando la siembra de datos oficial (Seed) para Instituto de Inmunología...');

  // ========================================================
  // 1. LIMPIEZA DE DATOS (PREVENIR DUPLICADOS Y RESPETAR FKS)
  // ========================================================
  console.log('🧹 Limpiando registros previos para garantizar consistencia y prevenir duplicados...');

  // Tablas dependientes operacionales (hijas)
  await prisma.labStockMovement.deleteMany();
  await prisma.labReagentUnit.deleteMany();
  await prisma.batchIncident.deleteMany();
  await prisma.stockMovementItem.deleteMany();
  await prisma.requestItem.deleteMany();
  await prisma.request.deleteMany();
  await prisma.stockBatch.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.orderPayment.deleteMany();
  await prisma.orderInvoice.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.purchaseRequisitionItem.deleteMany();
  await prisma.purchaseRequisition.deleteMany();
  await prisma.fridge.deleteMany();

  // Limpieza de tablas maestras en orden estricto de claves foráneas
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.category.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.location.deleteMany();

  console.log('✅ Tablas maestras limpiadas exitosamente.');

  // ========================================================
  // 2. MONEDAS BASE
  // ========================================================
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

  // ========================================================
  // 3. UNIDADES DE MEDIDA (NORMALIZADAS)
  // ========================================================
  const unitsData = [
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
    // Variantes en minúsculas para compatibilidad hacia atrás
    { name: 'Unidad (und)', abbreviation: 'und' },
    { name: 'Frasco (fco)', abbreviation: 'fco' },
    { name: 'Caja (cja)', abbreviation: 'cja' },
    { name: 'Bulto (blt)', abbreviation: 'blt' },
    { name: 'Mililitro (ml)', abbreviation: 'ml' },
    { name: 'Gramo (g)', abbreviation: 'g' },
    { name: 'Determinaciones (det)', abbreviation: 'det' },
    { name: 'Kit (kit)', abbreviation: 'kit' },
  ];

  const unitLookup: Record<string, number> = {};
  for (const unit of unitsData) {
    const u = await prisma.unit.upsert({
      where: { abbreviation: unit.abbreviation },
      update: { name: unit.name },
      create: unit,
    });
    unitLookup[unit.abbreviation.toUpperCase()] = u.id;
  }
  console.log('✅ Unidades de medida sembradas y normalizadas');

  // ========================================================
  // 4. SEEDER DE CATEGORÍAS (DOCUMENTO OFICIAL)
  // ========================================================
  const categoriesData = [
    {
      code: 'LAB',
      name: 'Laboratorio',
      description: 'Insumos, reactivos y material médico-quirúrgico',
    },
    {
      code: 'LIMP',
      name: 'Limpieza',
      description: 'Materiales y productos de mantenimiento e higiene',
    },
    {
      code: 'OFIC',
      name: 'Oficina',
      description: 'Papelería y artículos de escritorio',
    },
  ];

  const categoryLookup: Record<string, number> = {};
  for (const cat of categoriesData) {
    const c = await prisma.category.upsert({
      where: { name: cat.name },
      update: {
        description: cat.description,
        code: cat.code,
      },
      create: cat,
    });
    categoryLookup[cat.name] = c.id;
  }
  console.log('✅ Categorías oficiales sembradas (Laboratorio, Limpieza, Oficina)');

  // ========================================================
  // 5. MARCAS COMERCIALES BASE
  // ========================================================
  const brandsData = [
    {
      name: 'Genérico / Preparado Interno',
      description: 'Insumos y soluciones institucionales',
    },
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
  ];

  let genericBrandId: number | null = null;
  for (const brand of brandsData) {
    const b = await prisma.brand.upsert({
      where: { name: brand.name },
      update: { description: brand.description },
      create: brand,
    });
    if (brand.name === 'Genérico / Preparado Interno') {
      genericBrandId = b.id;
    }
  }
  console.log('✅ Marcas comerciales sembradas');

  // ========================================================
  // 6. SEEDER DE LOCACIONES / NEVERAS
  // ========================================================
  const locationsData = [
    {
      name: 'Almacén Central',
      type: LocationType.ALMACEN_GENERAL,
      description: 'Tipo: ESTANTE | Temperatura: Ambiente',
    },
    {
      name: 'Nevera Principal (2-8°C)',
      type: LocationType.LABORATORIO,
      description: 'Tipo: NEVERA | Temperatura: Refrigerada (2-8°C)',
    },
    {
      name: 'Congelador (-20°C)',
      type: LocationType.LABORATORIO,
      description: 'Tipo: CONGELADOR | Temperatura: Congelada (-20°C)',
    },
  ];

  const createdLocations: Record<string, number> = {};
  for (const loc of locationsData) {
    const l = await prisma.location.create({
      data: loc,
    });
    createdLocations[l.name] = l.id;
  }
  console.log('✅ Ubicaciones físicas estándar sembradas (Almacén Central, Nevera Principal, Congelador)');

  // Equipos de Frío institucionales (vinculados a las ubicaciones analíticas)
  await prisma.fridge.upsert({
    where: { code: 'NEV-01' },
    update: {
      name: 'Nevera Principal (2-8°C)',
      locationId: createdLocations['Nevera Principal (2-8°C)']!,
      targetTempCelsius: 4.0,
      status: FridgeStatus.OPERATIVO,
      description: 'Nevera principal para reactivos de uso diario (2-8°C)',
    },
    create: {
      code: 'NEV-01',
      name: 'Nevera Principal (2-8°C)',
      locationId: createdLocations['Nevera Principal (2-8°C)']!,
      targetTempCelsius: 4.0,
      status: FridgeStatus.OPERATIVO,
      description: 'Nevera principal para reactivos de uso diario (2-8°C)',
    },
  });

  await prisma.fridge.upsert({
    where: { code: 'CAVA-01' },
    update: {
      name: 'Congelador (-20°C)',
      locationId: createdLocations['Congelador (-20°C)']!,
      targetTempCelsius: -20.0,
      status: FridgeStatus.OPERATIVO,
      description: 'Congelador para reactivos y sueros congelados (-20°C)',
    },
    create: {
      code: 'CAVA-01',
      name: 'Congelador (-20°C)',
      locationId: createdLocations['Congelador (-20°C)']!,
      targetTempCelsius: -20.0,
      status: FridgeStatus.OPERATIVO,
      description: 'Congelador para reactivos y sueros congelados (-20°C)',
    },
  });
  console.log('✅ Equipos de frío sembrados (NEV-01: 4°C, CAVA-01: -20°C)');

  // ========================================================
  // 7. SEEDER DE PROVEEDORES (DATOS COMPLETOS: RIF, TELF, DIR)
  // ========================================================
  const providers = [
    { name: 'ALFA QUANTUM LABORATORIOS 2010.C.A', rif: 'J-29898050-8', phone: '(212)414-22-71', address: 'AV. INTERCOMUNAL DEL VALLE, CONJ. RESINDENCIAL LONGARAY, URB. LONGARAY. CARACAS, DISTRITO CAPITAL' },
    { name: 'BIO-KERN.C.A', rif: 'J-40495367-1', phone: '(212)3166437', address: 'Miranda, San Antonio de los Altos' },
    { name: 'CARLOS ALFREDO ALFONZO DUARTE', rif: 'V-06519315-5', phone: '', address: 'URB VALLE GRANDE, SECTOR LAS PLANADAS, GUATIRE' },
    { name: 'CORPORACION MEDICA DDF0105 C.A', rif: 'J-40587017-6', phone: '(0412) 9065642', address: 'URB. LOS ROSALES, CARACAS, DISTRITO CAPITAL' },
    { name: 'FARMATODO', rif: 'J-00020200-1', phone: '', address: '' },
    { name: 'FERRETERIA EL PASEO S.R.L', rif: 'J-00129350-7', phone: '(212)6900945', address: 'PASEO LOS ILUSTRES, ESQ. EL PARQUE, EDIF. TIBET, LAS ACACIAS, CARACAS.' },
    { name: 'FLORISTERIA PROVI', rif: 'J-40623298-0', phone: '(0212)6615982', address: 'AV. LAS CIENCIAS, EDF MARCO, URB. LOS CHAGUARAMOS, CARACAS' },
    { name: 'YOHANA ALVARADO', rif: 'V-06320108-8', phone: '(212) 5645110', address: 'CALLE SUCRE, QUINTA YOLA, URB. LOS MOLINOS. CARACAS-DTTO. CAPITAL' },
    { name: 'INVERSIONES DJ MULTIPARTS 2013.C.A.', rif: 'J-40279245-0', phone: '(212)6615762', address: 'AV. UNIVERSITARIA, EDIF. ODEON. URB. LOS CHAGUARAMOS' },
    { name: 'JEXI BOLIVAR', rif: 'V-12096623-1', phone: '(414) 1836759', address: '' },
    { name: 'Jose Angel Vargas Galviz', rif: 'V-11930221-4', phone: '(414)3357878', address: 'Qta. Maiveri, Urb. Piedra Azul, Caracas, Miranda' },
    { name: 'JHONNY WILLIAN VIVAS ROSAS', rif: 'V-10633020-0', phone: '(424)1395966', address: 'AV. INTERCOMUNAL DEL VALLE, URB. ZAMORA, CARACAS, DISTRITO CAPITAL' },
    { name: 'LASEROFYS.C.A', rif: 'J-30966618-5', phone: '(212)6145788', address: 'AV. LIBERTADOR CON CALLE ELICE, EDIF. ARIZA, URB. CHACAO-CARACAS' },
    { name: 'LABORATORIO GEMINIS, C.A', rif: 'J-00124405-0', phone: '(212)2613393', address: 'EDIFICIO COSMOS, CHACAO, CARACAS' },
    { name: 'LUIS RAMON GARCIA GARCIA', rif: 'V-06139292-7', phone: '(414)2993492', address: 'AV. PRINCIPAL ALGODONAL, CALLE SIFON, BARRIO ALGODONAL, CARACAS-DTTO. CAPITAL' },
    { name: 'MIRNA DINHORA PRIETO ORTEGA', rif: 'V-12057067-2', phone: '(414)140918', address: 'URB. EL MANICOMIO, CARACAS, DISTRITO CAPITAL' },
    { name: 'MULTISERVICIOS LF 2050.C.A', rif: 'J-30778025-8', phone: '(212)4438155', address: 'AV. INTERCOMUNAL DE ANTIMANO, BARRIO EL SIFON, CARACAS-DTTO.CAPITAL' },
    { name: 'OXICAR TUY', rif: 'J-30396978-0', phone: '(239)2481762', address: 'Urb. Industrial Carabobo, Transversal 9, Calle 87 Valencia Edo. Carabobo' },
    { name: 'SUMINISTROS ALERE.C.A', rif: 'J-41143471-0', phone: '(414)2982825', address: 'AV. SOROCAIMA CON AV. FRANCISCO FAJARDO, EDIF. CENTRO SALUD. URB. SAN BERNARDINO, CARACAS DTTO. CAPITAL' },
    { name: 'SUMINISTROS Y SERVICIOS CARMMY', rif: 'V-13577353-7', phone: '(414)9710678', address: 'LA MONTAÑITA EJIDO, EDO. MERIDA, VENEZUELA' },
    { name: 'BYOIMMUN 2000 C.A', rif: 'J-50417095-0', phone: '(0212) 515-43-91', address: 'AV. FCO DE MIRANDA, EDF. CAVENDES. URB. ALTAMIRA' },
    { name: 'GRAFICAS ONIX S.R.L', rif: 'J-00326937-9', phone: '(0212) 5527532', address: 'AVENIDA CAJIGAL, QUINTA DALIA, SAN BERNARDINO' },
    { name: 'SUPLIDORES BIOTEC', rif: 'J-00353790-0', phone: '(0212) 2344789', address: 'CALLE SANTA ANA, EDIF. CENTRO EMPRESARIAL BOLEITA, URB. BOLEITA. CARACAS' },
    { name: 'LABOMED', rif: 'J-00115702-6', phone: '(0212) 6901422', address: 'CALLE LOS MALABARES, GALPON N° 29, URB. LOS ROSALES. CARACAS' },
    { name: 'SIMONCAS 3130 C.A', rif: 'J-41045539-0', phone: '(0424) 142-43-65', address: 'BARRIO SUCRE, CARACAS D.C' }
  ];

  for (const p of providers) {
    const rif = p.rif.trim();
    await prisma.supplier.upsert({
      where: { rifOrId: rif },
      update: {
        name: p.name.trim(),
        phone: p.phone?.trim() || null,
        address: p.address?.trim() || null,
        isActive: true,
      },
      create: {
        name: p.name.trim(),
        rifOrId: rif,
        phone: p.phone?.trim() || null,
        address: p.address?.trim() || null,
        isActive: true,
      },
    });
  }
  console.log(`✅ Catálogo de proveedores enriquecido y sembrado (${providers.length} proveedores verificados)`);

  // ========================================================
  // 8. CARGA DE CATÁLOGO COMPLETO DE PRODUCTOS Y STOCK INICIAL
  // ========================================================
  console.log('📦 Registrando catálogo completo de insumos y stock inicial en Almacén Central...');

  const centralWarehouseId = createdLocations['Almacén Central']!;
  const prefixMap: Record<string, string> = {
    Laboratorio: 'LAB',
    Limpieza: 'LIM',
    Oficina: 'OFI',
  };

  const counters: Record<string, number> = {
    Laboratorio: 0,
    Limpieza: 0,
    Oficina: 0,
  };

  let totalProductsCreated = 0;
  let totalBatchesCreated = 0;
  let totalMissingAdded = 0;
  const registeredProductNames = new Set<string>();

  // 1. Carga de Insumos Iniciales con Stock
  for (const item of initialProducts) {
    const trimmedName = item.name.trim();
    registeredProductNames.add(trimmedName.toUpperCase());

    const catId = categoryLookup[item.category];
    if (!catId) {
      console.warn(`⚠️ Categoría no encontrada para el ítem: ${item.name}`);
      continue;
    }

    const normUnit = item.unit.trim().toUpperCase();
    const unitId = unitLookup[normUnit] || unitLookup['UND']!;

    counters[item.category] = (counters[item.category] || 0) + 1;
    const prefix = prefixMap[item.category] || 'INS';
    const sku = `${prefix}-${String(counters[item.category]).padStart(3, '0')}`;

    // Creación atómica del Producto
    const product = await prisma.product.create({
      data: {
        name: trimmedName,
        sku,
        categoryId: catId,
        brandId: genericBrandId,
        baseUnitId: unitId,
        conversionFactor: 1.0,
        minStockAlert: 5,
        isReagent: item.category === 'Laboratorio',
        isTaxExempt: true,
        isActive: true,
        description: `Insumo maestro oficial de ${item.category}`,
      },
    });
    totalProductsCreated++;

    // Stock Inicial: Creación de StockBatch asociado en Almacén Central
    if (item.quantity > 0) {
      await prisma.stockBatch.create({
        data: {
          productId: product.id,
          locationId: centralWarehouseId,
          lotNumber: `LOT-INI-${sku}`,
          currentQuantity: item.quantity,
          costPrice: 0.0,
          status: BatchStatus.DISPONIBLE,
          expirationDate: item.category === 'Laboratorio' ? new Date('2027-12-31') : null,
        },
      });
      totalBatchesCreated++;
    }
  }

  // 2. Carga de Insumos Faltantes (Extendidos) sin duplicados
  for (const item of missingProducts) {
    const trimmedName = item.name.trim();
    if (registeredProductNames.has(trimmedName.toUpperCase())) {
      console.log(`ℹ️ Omitiendo duplicado existente: ${trimmedName}`);
      continue;
    }
    registeredProductNames.add(trimmedName.toUpperCase());

    const catId = categoryLookup[item.category];
    if (!catId) {
      console.warn(`⚠️ Categoría no encontrada para el ítem faltante: ${item.name}`);
      continue;
    }

    const normUnit = item.unit.trim().toUpperCase();
    const unitId = unitLookup[normUnit] || unitLookup['UND']!;

    counters[item.category] = (counters[item.category] || 0) + 1;
    const prefix = prefixMap[item.category] || 'INS';
    const sku = `${prefix}-${String(counters[item.category]).padStart(3, '0')}`;

    await prisma.product.create({
      data: {
        name: trimmedName,
        sku,
        categoryId: catId,
        brandId: genericBrandId,
        baseUnitId: unitId,
        conversionFactor: 1.0,
        minStockAlert: 5,
        isReagent: item.category === 'Laboratorio',
        isTaxExempt: true,
        isActive: true,
        description: `Insumo maestro oficial de ${item.category}`,
      },
    });
    totalProductsCreated++;
    totalMissingAdded++;
  }

  console.log(`✅ Catálogo de productos sembrado: ${totalProductsCreated} productos registrados en total (+${totalMissingAdded} del listado extendido sin duplicar).`);
  console.log(`✅ Stock inicial sembrado: ${totalBatchesCreated} lotes físicos disponibles en Almacén Central.`);

  // ========================================================
  // 9. ROLES Y PERMISOS DEL SISTEMA
  // ========================================================
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

  // ========================================================
  // 10. DEPARTAMENTOS INSTITUCIONALES
  // ========================================================
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

  // ========================================================
  // 11. USUARIO ADMINISTRADOR SUPERADMIN
  // ========================================================
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

  // ========================================================
  // 12. TASAS DE CAMBIO BCV INICIALES
  // ========================================================
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
