# Instalación y configuración

Esta guía prepara una instalación local completa de ERP-IDI. El proyecto mantiene las dependencias del backend y frontend en carpetas independientes, por lo que los comandos deben ejecutarse desde la carpeta correspondiente.

## Dependencias

- Node.js compatible con Next.js 16.
- pnpm 11.25.0.
- PostgreSQL 14 o superior recomendado.
- Git.

Comprueba las herramientas:

```bash
node --version
pnpm --version
psql --version
```

## Base de datos

Crea una base de datos PostgreSQL vacía, por ejemplo:

```sql
CREATE USER erp_idi WITH PASSWORD 'cambia-esta-contraseña';
CREATE DATABASE erp_idi OWNER erp_idi;
```

En `backend/.env` configura la URL:

```env
DATABASE_URL="postgresql://erp_idi:cambia-esta-contraseña@localhost:5432/erp_idi?schema=public"
PORT=3000
JWT_SECRET="usa-un-secreto-largo-y-aleatorio"
JWT_EXPIRES_IN="8h"
```

Inicializa Prisma:

```bash
cd backend
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

`db:migrate` utiliza las migraciones versionadas de `backend/prisma/migrations/`. No edites una migración ya aplicada; crea una nueva para cada cambio de esquema.

## Backend

```bash
cd backend
pnpm dev
```

Comprobaciones rápidas:

```bash
curl http://localhost:3000/api/health
```

La API debería responder en `http://localhost:3000`. La especificación se puede consultar en `/api/docs.json`.

## Frontend

El cliente apunta por defecto a `http://localhost:3000/api`. Si la API utiliza otra dirección, crea `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

Instala y ejecuta:

```bash
cd frontend
pnpm install
pnpm dev -p 3001
```

Visita `http://localhost:3001` e inicia sesión con el usuario creado por el seed.

## Producción

Compila cada aplicación por separado:

```bash
cd backend
pnpm build
pnpm start
```

```bash
cd frontend
pnpm build
pnpm start
```

Antes de desplegar, revisa el secreto JWT, CORS, la conexión PostgreSQL, las credenciales iniciales y la exposición pública de Swagger.

## Problemas frecuentes

### El frontend devuelve errores de red

Verifica que el backend esté ejecutándose y que `NEXT_PUBLIC_API_URL` termine en `/api`.

### Prisma no puede conectarse

Comprueba que PostgreSQL esté iniciado, que la base exista y que `DATABASE_URL` tenga usuario, contraseña, host, puerto y nombre correctos.

### El puerto 3000 está ocupado

Ejecuta el backend en otro puerto con `PORT=3002` y apunta el frontend a `http://localhost:3002/api`.

### El seed no debe ejecutarse de nuevo

El seed usa `upsert` para los datos principales, pero no lo ejecutes automáticamente en producción sin revisar sus credenciales y datos maestros.
