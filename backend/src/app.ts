import express from 'express';
import healthRoutes from './routes/health.routes.js';
import { errorHandler } from './middlewares/error.middleware.js';
import authRoutes from './routes/auth.routes.js';
import productRoutes from './routes/product.routes.js';
import currencyRoutes from './routes/currency.routes.js';
import supplierRoutes from './routes/supplier.routes.js';
import orderRoutes from './routes/order.routes.js';

const app: express.Application = express();

// Middleware para parsear JSON
app.use(express.json());

// Rutas
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/currencies', currencyRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/orders', orderRoutes);

// Middleware de manejo de errores
app.use(errorHandler);

export default app;
