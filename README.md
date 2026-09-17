# ERP-IDI

Sistema de gestión y control de inventarios para el Instituto de Inmunología Dr. Nicolás E. Bianco Colmenares de la Universidad Central de Venezuela (UCV).

ERP-IDI centraliza el catálogo de insumos, las compras, el inventario por lotes, la trazabilidad de movimientos, las solicitudes internas y la gestión de reactivos de laboratorio. El repositorio contiene una API REST y una aplicación web separadas, pero coordinadas mediante una interfaz HTTP autenticada con JWT.

![Estado](https://img.shields.io/badge/estado-desarrollo%20activo-orange)
![Backend](https://img.shields.io/badge/backend-Express%205%20%7C%20TypeScript-blue)
![Frontend](https://img.shields.io/badge/frontend-Next.js%2016-black)
![Base de datos](https://img.shields.io/badge/base%20de%20datos-PostgreSQL-336791)

## Índice

- [Qué incluye](#qué-incluye)
- [Arquitectura](#arquitectura)
- [Requisitos](#requisitos)
- [Inicio rápido](#inicio-rápido)
- [Variables de entorno](#variables-de-entorno)
- [Acceso local](#acceso-local)
- [Comandos](#comandos)
- [Documentación](#documentación)
- [Seguridad](#seguridad)
- [Contribuir](#contribuir)
- [Licencia](#licencia)

## Qué incluye

- Autenticación con JWT y control de acceso basado en roles (RBAC).
- Usuarios, roles y permisos administrables desde la API.
- Catálogo de productos, categorías, marcas, unidades y ubicaciones.
- Proveedores, órdenes de compra, recepción de lotes y pagos.
- Inventario por lote con alertas, vencimientos y movimientos tipo Kardex.
- Ajustes manuales, descartes, cuarentena e incidencias de calidad.
- Solicitudes internas de insumos y despachos.
- Gestión de reactivos, unidades abiertas, consumo y cadena de frío.
- Dashboard de reportes y exportaciones CSV de inventario y Kardex.
- Frontend web con Next.js para login, dashboard, solicitudes e inventario.
- Swagger UI y colección de Postman para explorar y probar la API.

## Arquitectura

```text
ERP-IDI/
├── backend/    API REST, reglas de negocio, Prisma, migraciones y tests
├── frontend/   Aplicación web Next.js
├── docs/       Guías de configuración, arquitectura y API
└── README.md   Punto de entrada del proyecto
```

El backend escucha por defecto en `http://localhost:3000` y publica sus rutas bajo `/api`. El frontend usa `http://localhost:3000/api` como URL de API por defecto, por lo que en desarrollo conviene ejecutar el backend en `3000` y Next.js en su puerto alternativo (`3001`) o definir explícitamente `NEXT_PUBLIC_API_URL`.

Para conocer las decisiones de diseño y los límites entre módulos, consulta [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Requisitos

- Node.js compatible con las versiones actuales de Next.js 16 y TypeScript del proyecto.
- `pnpm` 11.25.0.
- PostgreSQL accesible desde el entorno local.
- Git.

## Inicio rápido

### 1. Clonar e instalar

```bash
git clone <URL_DEL_REPOSITORIO>
cd ERP-IDI

cd backend
pnpm install

cd ../frontend
pnpm install
```

### 2. Configurar la base de datos

Desde `backend/`, crea un archivo `.env`:

```env
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/erp_idi?schema=public"
PORT=3000
JWT_SECRET="cambia-esta-clave-en-desarrollo"
```

Aplica las migraciones, genera el cliente Prisma y carga los datos base:

```bash
cd backend
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

La guía completa está en [docs/SETUP.md](docs/SETUP.md).

### 3. Levantar los servicios

En una terminal:

```bash
cd backend
pnpm dev
```

En otra terminal:

```bash
cd frontend
pnpm dev -p 3001
```

Abre [http://localhost:3001](http://localhost:3001). El health check está disponible en [http://localhost:3000/api/health](http://localhost:3000/api/health) y Swagger UI en [http://localhost:3000/api/docs](http://localhost:3000/api/docs).

## Variables de entorno

### Backend

| Variable         | Obligatoria           | Descripción                                  | Valor por defecto           |
| ---------------- | --------------------- | -------------------------------------------- | --------------------------- |
| `DATABASE_URL`   | Sí                    | URL de conexión PostgreSQL usada por Prisma. | Sin valor                   |
| `PORT`           | No                    | Puerto HTTP de la API.                       | `3000`                      |
| `JWT_SECRET`     | Sí en entornos reales | Secreto para firmar y validar tokens JWT.    | Clave interna de desarrollo |
| `JWT_EXPIRES_IN` | No                    | Tiempo de expiración del token JWT.          | `8h`                        |

### Frontend

| Variable              | Obligatoria | Descripción                            | Valor por defecto           |
| --------------------- | ----------- | -------------------------------------- | --------------------------- |
| `NEXT_PUBLIC_API_URL` | No          | URL base de la API, incluyendo `/api`. | `http://localhost:3000/api` |

No subas archivos `.env` ni secretos al repositorio. Usa valores distintos para desarrollo, staging y producción.

## Acceso local

El seed crea datos maestros, roles y un usuario administrador para desarrollo:

| Usuario | Correo             | Contraseña   | Rol             |
| ------- | ------------------ | ------------ | --------------- |
| `admin` | `admin@idi.ucv.ve` | `Admin1234!` | `ADMINISTRADOR` |

Estas credenciales son exclusivamente de desarrollo. Cámbialas o elimina el usuario antes de desplegar el sistema en un entorno compartido.

## Comandos

### Backend

| Comando            | Uso                                     |
| ------------------ | --------------------------------------- |
| `pnpm dev`         | Ejecuta la API con recarga automática.  |
| `pnpm build`       | Compila TypeScript en `dist/`.          |
| `pnpm start`       | Ejecuta la compilación generada.        |
| `pnpm test`        | Ejecuta los tests con Vitest.           |
| `pnpm test:watch`  | Ejecuta Vitest en modo watch.           |
| `pnpm db:generate` | Genera el cliente Prisma.               |
| `pnpm db:migrate`  | Crea/aplica migraciones en desarrollo.  |
| `pnpm db:seed`     | Carga datos maestros y usuario inicial. |

### Frontend

| Comando      | Uso                                  |
| ------------ | ------------------------------------ |
| `pnpm dev`   | Ejecuta Next.js en desarrollo.       |
| `pnpm build` | Genera la compilación de producción. |
| `pnpm start` | Sirve la compilación de producción.  |
| `pnpm lint`  | Ejecuta ESLint.                      |

## Documentación

- [Guía de instalación y configuración](docs/SETUP.md)
- [Arquitectura y módulos](docs/ARCHITECTURE.md)
- [API REST y operación local](docs/API.md)
- [Colección de Postman](backend/docs/erp-idi.postman_collection.json)
- Swagger UI: `http://localhost:3000/api/docs`
- Especificación OpenAPI JSON: `http://localhost:3000/api/docs.json`

## Seguridad

- Todas las rutas funcionales, salvo health check y login, requieren autenticación JWT.
- Los permisos se aplican mediante roles como `ADMINISTRADOR`, `COMPRAS`, `ALMACENISTA`, `ANALISTA_LABORATORIO` y `SOLICITANTE`.
- En producción se debe usar HTTPS, un `JWT_SECRET` fuerte, credenciales fuera del repositorio y una política de CORS restringida al dominio real.
- La contraseña del seed es conocida y no debe mantenerse en una instalación real.

## Contribuir

1. Crea una rama descriptiva desde la rama principal.
2. Mantén los cambios limitados al módulo correspondiente.
3. Ejecuta `pnpm test` y `pnpm build` en `backend/` cuando cambies la API.
4. Ejecuta `pnpm lint` y `pnpm build` en `frontend/` cuando cambies la aplicación web.
5. Actualiza Swagger, Postman o esta documentación si modificas contratos públicos.
6. Abre un pull request con contexto, pruebas ejecutadas y notas de migración si aplica.

## Licencia

No se ha definido todavía una licencia de código abierto en este repositorio. Antes de publicar el proyecto, acuerda la licencia y añádela como `LICENSE`.
