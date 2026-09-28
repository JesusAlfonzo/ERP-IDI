# ==========================================
# Dockerfile Frontend - ERP-IDI
# ==========================================
FROM node:22-alpine

# Compatibilidad con librerías nativas en Alpine
RUN apk add --no-cache libc6-compat

# Instalar pnpm globalmente acorde a la versión del proyecto
RUN npm install -g pnpm@11.25.0

WORKDIR /app

# Copiar manifiestos y configuración del monorepo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend ./frontend

# Instalar dependencias del frontend usando el workspace
RUN pnpm install --filter frontend... --frozen-lockfile

WORKDIR /app/frontend

# Argumentos de compilación para Next.js (baking de variables públicas)
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Construcción de la aplicación Next.js
RUN pnpm run build

EXPOSE 3000

# Comando de arranque en producción
CMD ["pnpm", "start"]
