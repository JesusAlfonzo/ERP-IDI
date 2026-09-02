import app from './app.js';
import { ENV } from './config/env.js';

app.listen(ENV.PORT, () => {
    console.log(`🚀 SGCI Backend corriendo en http://localhost:${ENV.PORT}`);
    console.log(`🩺 Health check disponible en http://localhost:${ENV.PORT}/api/health`);
});