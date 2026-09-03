import { prisma } from '../config/prisma.js';

export const checkSystemStatus = async () => {
  let dbStatus = 'DISCONNECTED';

  try {
    // Hacemos una consulta cruda mínima para validar la conexión real
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'CONNECTED';
  } catch (error) {
    dbStatus = 'ERROR';
    console.error('Error al conectar con la base de datos:', error);
  }

  return {
    status: dbStatus === 'CONNECTED' ? 'OK' : 'DEGRADED',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    message:
      dbStatus === 'CONNECTED'
        ? 'El sistema SGCI está en línea y conectado a PostgreSQL'
        : 'El sistema SGCI está en línea pero no tiene conexión con la base de datos',
  };
};
