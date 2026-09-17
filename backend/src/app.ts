import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec, swaggerUiOptions } from './config/swagger.js';
import { errorHandler } from './middlewares/error.middleware.js';

import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import productRoutes from './routes/product.routes.js';
import currencyRoutes from './routes/currency.routes.js';
import supplierRoutes from './routes/supplier.routes.js';
import orderRoutes from './routes/order.routes.js';
import purchaseFinanceRoutes from './routes/purchase-finance.routes.js';
import stockAdjustmentRoutes from './routes/stock-adjustment.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import requestRoutes from './routes/request.routes.js';
import labRoutes from './routes/lab.routes.js';
import reportRoutes from './routes/report.routes.js';
import exportRoutes from './routes/export.routes.js';

const app: express.Application = express();

app.use(express.json());

// Swagger Docs
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, swaggerUiOptions)
);
app.get('/api/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Rutas base
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/products', productRoutes);
app.use('/api/currencies', currencyRoutes);
app.use('/api/suppliers', supplierRoutes);

// Compras y Finanzas
app.use('/api/orders', orderRoutes);
app.use('/api/orders', purchaseFinanceRoutes);

// Inventario y Movimientos (Ajustes primero para capturar /movements con paginación)
app.use('/api/inventory', stockAdjustmentRoutes);
app.use('/api/inventory', inventoryRoutes);

// Solicitudes y Laboratorio
app.use('/api/requests', requestRoutes);
app.use('/api/lab', labRoutes);

// Reportes y Exportaciones
app.use('/api/reports', reportRoutes);
app.use('/api/exports', exportRoutes);

// Manejador centralizado de errores
app.use(errorHandler);

export default app;
