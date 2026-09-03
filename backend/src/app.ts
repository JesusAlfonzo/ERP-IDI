import express from 'express';
import healthRoutes from './routes/health.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';
import authRoutes from './routes/auth.routes.js';

const app: express.Application = express();

// Middleware para parsear JSON
app.use(express.json());

// Rutas
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);

// Middleware de manejo de errores
app.use(errorHandler);

export default app;
