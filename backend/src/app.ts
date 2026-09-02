import express from 'express';
import healthRoutes from './routes/health.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';

const app: express.Application = express();

// Middleware para parsear JSON
app.use(express.json());

// Rutas
app.use('/api/health', healthRoutes);

// Middleware de manejo de errores
app.use(errorHandler);

export default app;
