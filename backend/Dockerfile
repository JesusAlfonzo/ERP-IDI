# ==========================================
# Dockerfile Backend - ERP-IDI (SGCI)
# ==========================================
FROM node:22-alpine

# Dependencias requeridas para Prisma y binarios nativos en Alpine Linux
RUN apk add --no-cache openssl libc6-compat

# Instalar pnpm globalmente acorde a la versión del proyecto
RUN npm install -g pnpm@11.25.0

WORKDIR /app

# Copiar manifiestos y configuración del monorepo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend ./backend

# Instalar dependencias del backend usando el workspace
RUN pnpm install --filter backend... --frozen-lockfile

WORKDIR /app/backend

# Generar cliente de Prisma para la arquitectura del contenedor
RUN pnpm exec prisma generate

# Compilar TypeScript a JavaScript (dist/)
RUN pnpm run build

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Sincronización automática de esquema con la BD y arranque del servidor
CMD ["sh", "-c", "pnpm exec prisma db push && pnpm start"]
