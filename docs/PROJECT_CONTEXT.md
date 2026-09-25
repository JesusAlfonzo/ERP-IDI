# ERP-IDI - Contexto de Arquitectura y Sistema

## 1. Visión General del Negocio & Propósito

### 1.1 Resumen Ejecutivo
**ERP-IDI** es el sistema integral de gestión y control de inventarios diseñado específicamente para el **Instituto de Inmunología "Dr. Nicolás E. Bianco Colmenares" (IDI)** de la Universidad Central de Venezuela (UCV). 

El sistema resuelve la desarticulación operativa entre la procura institucional de reactivos y consumibles biomédicos, la recepción física y control de calidad en almacén, la trazabilidad estricta de la cadena de frío (-20°C, 4°C), el fraccionamiento de reactivos de alta sensibilidad, y el abastecimiento departamental bajo ventanas operativas programadas en una economía multimoneda (USD / VES / EUR).

### 1.2 Usuarios y Perfiles de Acceso (RBAC)
El sistema opera mediante un control de acceso basado en roles con responsabilidades segregadas:
*   **`ADMINISTRADOR`**: Control total institucional. Gestiona usuarios, asigna roles, administra políticas de ventana semanal, gestiona catálogos maestros y audita eventos del sistema.
*   **`COMPRAS`**: Gestiona el directorio de proveedores, emite y cotiza preórdenes de compra (requisiciones), genera órdenes de compra oficiales, supervisa deudas comerciales y registra pagos amortizados con soporte multimoneda.
*   **`ALMACENISTA`**: Custodio del Almacén Central. Recibe físicamente pedidos de proveedores, registra lotes y vencimientos, ejecuta ajustes de inventario y mermas directas, aprueba y despacha solicitudes internas departamentales y genera libros de Kardex.
*   **`ANALISTA_LABORATORIO`**: Personal científico y bioanalistas. Administra inventario en frío (neveras y cavas), registra la apertura de viales sellados, descuenta consumos volumétricos por determinaciones/pruebas y tramita descartes técnicos.
*   **`SOLICITANTE`**: Investigadores y jefes de sección técnica o administrativa. Radican pedidos internos de material exclusivamente durante la ventana de recepción semanal activa.

### 1.3 Flujos de Negocio Principales (Happy Paths)

```mermaid
flowchart TD
    subgraph Aprovisionamiento
        A[Requisición / Preorden] -->|Cotización y Adjudicación| B[Orden de Compra]
        B -->|Gestión Financiera| C[Facturación y Pagos Bimoneda]
    end

    subgraph Almacenamiento
        B -->|Recepción Física| D[Recepción en Almacén]
        D -->|Crea Lotes y Kardex| E[StockBatch DISPONIBLE]
        E -->|Anomalía Técnica| F[Lote EN_CUARENTENA / Incidencia]
    end

    subgraph Distribucion_y_Laboratorio
        E -->|Ventana Semanal Activa| G[Solicitud Interna Departamento]
        G -->|Aprobación y Despacho| H[Kardex: DESPACHO_SOLICITUD]
        H -->|Asignación a Frío| I[Nevera / Cava Clínica]
        I -->|Apertura de Vial| J[LabReagentUnit EN_USO]
        J -->|Consumo Volumétrico| K[LabStockMovement: CONSUMO_PRUEBAS]
    end
```

---

## 2. Stack Tecnológico & Dependencias Críticas

### 2.1 Runtime y Lenguajes
*   **Node.js**: Entorno de ejecución de backend (`v24.20.0` en desarrollo, compatible con engines LTS). Módulos nativos ECMAScript (`"type": "module"` en backend).
*   **TypeScript**:
    *   Backend: `typescript@^7.0.2` (compilación estricta vía `tsc` en `dist/` y ejecución dinámica con `tsx@^4.23.13`).
    *   Frontend: `typescript@^5` con configuración estricta para React y Next.js.
*   **Gestor de Paquetes**: `pnpm@11.25.0` (configurado en `packageManager` y `devEngines`).

### 2.2 Frameworks y Servidores
*   **Backend**: `express@^5.2.1` (Express 5 con manejo nativo de excepciones asíncronas).
*   **Frontend**: `next@16.3.5` (Next.js 16 con App Router, React Server Components y Server/Client boundary), `react@19.2.8` y `react-dom@19.2.8`.
*   **Compilador de Rendimiento UI**: `babel-plugin-react-compiler@1.0.0`.

### 2.3 Base de Datos, Persistencia y Migraciones
*   **Motor**: PostgreSQL (SGBD relacional, almacenamiento nativo de precisión `Decimal(18,4)` y claves `BigInt`).
*   **ORM**: Prisma ORM `@prisma/client@6.4.1` y `prisma@6.4.1`.
*   **Estrategia de Migraciones**: Prisma Migrate (`prisma migrate dev` versionado en `backend/prisma/migrations/`).
*   **Inicialización y Semillero**: `backend/prisma/seed.ts` accionado mediante `tsx`.

### 2.4 UI, Estilizado e Iconografía
*   **Framework CSS**: `tailwindcss@^4` acoplado vía `@tailwindcss/postcss@^4`.
*   **Utilidades de Estilos**: `clsx@^2.1.1` y `tailwind-merge@^3.7.0` (fusión dinámica de clases utilitarias en componentes).
*   **Iconos**: `lucide-react@^1.46.0`.

### 2.5 Bibliotecas Auxiliares y Seguridad
*   **Autenticación**: `jsonwebtoken@^9.0.3` (firmado y verificación de tokens portadores).
*   **Criptografía**: `bcrypt@^6.0.0` (hashing seguro de contraseñas de usuarios).
*   **Validación de Esquemas**: `zod@^4.6.5` (validación de payloads de entrada en controladores Express).
*   **Cliente HTTP**: `axios@^1.20.0` (cliente frontend configurado con interceptores de autorización y control de 401).
*   **CORS**: `cors@^2.8.6`.
*   **Documentación API**: `swagger-ui-express@^5.0.1` (servido interactivo en `/api/docs` y exportable en `/api/docs.json`).
*   **Variables de Entorno**: `dotenv@^17.4.2`.

### 2.6 Infraestructura & Testing
*   **Testing Backend**: `vitest@^5.0.1` con `supertest@^7.2.2` para tests de integración HTTP end-to-end.
*   **Arquitectura de Procesos**: Ejecución desacoplada: Backend API escuchando en puerto `3000` y Frontend Web en puerto `3001` (o configurable). No se cuenta con contenedores Docker propios versionados en el árbol fuente; la ejecución se realiza bare-metal sobre Node.js gestionado con `pnpm`.

---

## 3. Arquitectura del Código & Convención de Carpetas

### 3.1 Estructura del Backend (`backend/`)
Sigue una **Arquitectura en Capas (Layered Architecture)** orientada a controladores y servicios de dominio con transacciones atómicas Prisma:

```text
backend/
├── prisma/
│   ├── migrations/               # Historial de migraciones SQL aplicadas
│   ├── schema.prisma             # Modelo de datos declarativo y enums de dominio
│   └── seed.ts                   # Semilla con monedas, unidades, roles y usuario admin inicial
├── src/
│   ├── config/                   # Configuración del entorno, cliente Prisma y especificación OpenAPI
│   │   ├── env.ts                # Extracción y valores por defecto de variables de entorno
│   │   ├── prisma.ts             # Instancia singleton de PrismaClient con logs de auditoría
│   │   └── swagger.ts            # Definición centralizada del contrato OpenAPI 3.0
│   ├── controllers/              # Adaptadores HTTP: parseo de parámetros, casting de BigInt y respuestas
│   ├── middlewares/              # Filtros transversales
│   │   ├── auth.middleware.ts    # Extracción y verificación del JWT Bearer
│   │   ├── error.middleware.ts   # Manejador centralizado de excepciones y mapeo de códigos Prisma
│   │   ├── role.middleware.ts    # RBAC: validación de pertenencia a lista blanca de roles
│   │   └── validate.middleware.ts# Validación de payloads JSON con esquemas Zod
│   ├── routes/                   # Definición de rutas Express agrupadas por recurso
│   ├── schemas/                  # Definiciones de esquemas Zod (p. ej. stock-adjustment.schema.ts)
│   ├── services/                 # Lógica de dominio, reglas de negocio y transacciones atómicas Prisma
│   ├── types/                    # Extensiones de tipos globales de Express (ej. AuthUserPayload)
│   ├── utils/                    # Utilidades de paginación, serialización de BigInt y formato
│   ├── app.ts                    # Montaje de Express, CORS, middlewares globales, rutas y errorHandler
│   └── server.ts                 # Bootstrap y arranque del listener HTTP
└── tests/                        # Pruebas automatizadas de integración HTTP con Vitest y Supertest
```

### 3.2 Estructura del Frontend (`frontend/`)
Sigue el paradigma del **Next.js App Router** con separación estricta entre componentes de servidor y componentes de interacción con el cliente:

```text
frontend/
├── public/                       # Activos estáticos públicos
├── src/
│   ├── app/                      # Rutas del App Router
│   │   ├── (dashboard)/          # Grupo de rutas protegidas que comparten layout institucional
│   │   │   ├── admin/            # Vistas administrativas de seguridad, políticas y usuarios
│   │   │   ├── inventory/        # Catálogo, lotes, Kardex, ajustes y maestros del almacén
│   │   │   ├── laboratory/       # Consumo de viales, control de neveras y cavas
│   │   │   ├── purchasing/       # Preórdenes, órdenes, proveedores, pagos y deudas
│   │   │   ├── quality/          # Gestión de cuarentena y dictamen técnico
│   │   │   ├── requests/         # Solicitudes departamentales y aprobación/despacho
│   │   │   ├── dashboard/        # Métricas agregadas y notificaciones
│   │   │   └── layout.tsx        # Shell autenticado con Sidebar, Navbar y verificación de sesión
│   │   ├── login/                # Página pública de autenticación
│   │   ├── layout.tsx            # Root layout HTML/CSS
│   │   └── page.tsx              # Redireccionador condicional raíz (/login vs /dashboard)
│   ├── components/               # Componentes UI organizados por dominio
│   │   ├── auth/                 # Guardas de visualización por roles (role-guard.tsx)
│   │   ├── layout/               # Sidebar dinámico filtrado por rol, Navbar y contenedores
│   │   ├── purchasing/           # Selectores de empaque y combos de compra
│   │   └── requests/             # Comboboxes de productos, tarjetas de ventana operativa
│   ├── lib/                      # Clientes de infraestructura
│   │   ├── api-client.ts         # Axios configurado con Bearer Token y redirección en 401
│   │   ├── csv.ts                # Utilidades de descarga e interpretación de archivos CSV
│   │   └── utils.ts              # Helper de clases Tailwind (cn)
│   ├── services/                 # Servicios tipados de llamada a la API REST (uno por dominio)
│   ├── types/                    # Tipos e interfaces TypeScript que replican los contratos del backend
│   └── utils/                    # Formateo de fechas, monedas (USD/VES) y cantidades con unidad
```

### 3.3 Patrones de Diseño Implementados
1.  **Pipeline de Petición Backend**: `HTTP Request -> Route -> AuthMiddleware -> RoleMiddleware -> ValidateMiddleware -> Controller -> Service (Prisma $transaction) -> PostgreSQL`.
2.  **Serialización Segura de BigInt**: Para solventar la limitación nativa de JSON con números enteros de 64 bits de PostgreSQL (`BigInt`), la capa de controladores y utilidades transforma los valores numéricos a strings o enteros serializables antes de emitir la respuesta HTTP.
3.  **Client-Side Token Injection & Auto-Logout**: El interceptor de solicitud de Axios inyecta automáticamente el token de `localStorage`. En caso de respuesta `401 Unauthorized`, el interceptor de respuesta purga la sesión y fuerza la navegación a `/login`.
4.  **RBAC Mixto (Defensivo)**: El backend valida obligatoriamente la autorización en cada endpoint mediante `requireRoles([...])`. En el frontend, el componente `Sidebar` y `role-guard.tsx` ocultan o restringen la UI de manera preventiva según los roles declarados en el token.

---

## 4. Modelo de Datos y Estado de la Base de Datos

El esquema Prisma (`backend/prisma/schema.prisma`) cuenta con **30 modelos** y **15 enums**, estructurados en 9 dominios operativos:

```mermaid
erDiagram
    User ||--o{ UserRole : has
    Role ||--o{ UserRole : assigns
    User ||--o{ Request : submits
    User ||--o{ Order : creates
    User ||--o{ StockMovement : authorizes
    Supplier ||--o{ Order : supplies
    Currency ||--o{ Order : defines_rate
    Order ||--|{ OrderItem : details
    Order ||--o{ OrderPayment : amortizes
    Order ||--o{ OrderInvoice : billed_in
    PurchaseRequisition ||--o{ Order : generates
    PurchaseRequisition ||--|{ PurchaseRequisitionItem : contains
    Product ||--|{ OrderItem : ordered_as
    Product ||--|{ StockBatch : instantiated_as
    Location ||--o{ StockBatch : stores
    Location ||--o{ Fridge : contains
    StockBatch ||--o{ StockMovementItem : tracked_in
    StockMovement ||--|{ StockMovementItem : includes
    StockBatch ||--o{ LabReagentUnit : fractioned_into
    Fridge ||--o{ LabReagentUnit : preserves
    LabReagentUnit ||--o{ LabStockMovement : consumes
    Request ||--|{ RequestItem : requests
    Request ||--o| StockMovement : dispatched_by
    StockBatch ||--o{ BatchIncident : reports
```

### 4.1 Enums de Dominio (15)
*   **`LocationType`**: `ALMACEN_GENERAL`, `LABORATORIO`, `OFICINA`, `DEPOSITO`.
*   **`FridgeStatus`**: `OPERATIVO`, `MANTENIMIENTO`, `DEFECTUOSO`, `FUERA_DE_SERVICIO`.
*   **`OrderStatus`**: `BORRADOR`, `ENVIADA`, `PARCIAL`, `COMPLETADA`, `CANCELADA`.
*   **`PurchaseRequisitionStatus`**: `BORRADOR`, `EN_COTIZACION`, `ADJUDICADA`, `CANCELADA`.
*   **`PaymentStatus`**: `PENDIENTE`, `PAGADO_PARCIAL`, `PAGADO`, `EXONERADO`.
*   **`ReceptionStatus`**: `PENDIENTE`, `PARCIAL`, `COMPLETO`.
*   **`PaymentMethod`**: `TRANSFERENCIA_USD`, `TRANSFERENCIA_BS`, `TRANSFERENCIA_NACIONAL`, `PAGO_MOVIL`, `TRANSFERENCIA_INTERNACIONAL`, `EFECTIVO_USD`, `EFECTIVO_BS`.
*   **`BatchStatus`**: `DISPONIBLE`, `EN_CUARENTENA`, `DEFECTUOSO`, `VENCIDO`, `AGOTADO`.
*   **`StockMovementType`**: `ENTRADA_COMPRA`, `TRASLADO_A_LABORATORIO`, `DESPACHO_SOLICITUD`, `AJUSTE_INVENTARIO`, `DESCARTE_MERMA`.
*   **`LabUnitStatus`**: `SELLADO`, `EN_USO`, `AGOTADO`, `DESCARTADO`.
*   **`LabMovementType`**: `CONSUMO_PRUEBAS`, `TRASLADO_NEVERA`, `DESCARTE`.
*   **`RequestStatus`**: `PENDIENTE`, `APROBADA`, `DESPACHADA_PARCIAL`, `COMPLETADA`, `RECHAZADA`.
*   **`RequestPriority`**: `BAJA`, `RUTINA`, `URGENTE`.
*   **`IncidentType`**: `FALLA_CONTROL_CALIDAD`, `CADENA_FRIO_ROTA`, `DANO_FISICO`, `CONTAMINACION_PRECIPITADO`, `VENCIMIENTO_PREMATURO`, `OTRO`.
*   **`IncidentStatus`**: `ABIERTA`, `CONFIRMADA`, `DESCARTADA`.

### 4.2 Catálogo de Entidades y Restricciones
1.  **Seguridad & Sesiones**:
    *   `User`: `id (Int)`, `username (Unique)`, `email (Unique)`, `passwordHash`, `department`, `isActive`.
    *   `Role`: `id (Int)`, `name (Unique)`.
    *   `UserRole`: Clave compuesta `[userId, roleId]`.
    *   `Permission` & `RolePermission`: Modelados en base de datos; la autorización actual se apoya de forma directa en los nombres de roles en código.
    *   `RefreshToken`: `id (UUID)`, `token (Unique)`, `expiresAt`.
2.  **Monedas & Multi-divisa**:
    *   `Currency`: `id (Int)`, `code (Unique: USD, VES, EUR)`, `symbol`, `isDefault`.
    *   `CurrencyExchange`: `rate (Decimal(18,4))`, `effectiveDate (Date)`. Permite registrar el historial de tasas cambiarias.
3.  **Catálogo de Insumos**:
    *   `Category`: `id (Int)`, `code (Unique, Nullable)`, `name (Unique)`.
    *   `Brand`: `id (Int)`, `name (Unique)`.
    *   `Unit`: `id (Int)`, `name`, `abbreviation (Unique)`.
    *   `Supplier`: `id (Int)`, `rifOrId (Unique)`, `name`, `contactName`, `phone`, `email`.
    *   `Product`: `id (BigInt)`, `sku (Unique)`, `barcode (Unique, Nullable)`, `name`, `baseUnitId`, `purchaseUnitId`, `conversionFactor (Decimal(10,2))`, `isTaxExempt`, `minStockAlert`, `isReagent`, `isActive`.
4.  **Compras & Finanzas**:
    *   `PurchaseRequisition`: `id (BigInt)`, `requisitionNumber (Unique)`, `departmentSection`, `justification`, `status (PurchaseRequisitionStatus)`.
    *   `PurchaseRequisitionItem`: `quantityRequested (Decimal(12,2))`, `estimatedPrice (Decimal(18,4))`.
    *   `Order`: `id (BigInt)`, `orderNumber (Unique)`, `exchangeRate (Decimal(18,4))`, `status (OrderStatus)`, `paymentStatus (PaymentStatus)`, `receptionStatus (ReceptionStatus)`, `subtotal (Decimal(18,2))`, `taxTotal (Decimal(18,2))`, `total (Decimal(18,2))`, `taxableAmountUsd`, `exemptAmountUsd`, `totalAmountBs`.
    *   `OrderItem`: `quantityOrdered (Decimal(12,2))`, `quantityReceived (Decimal(12,2))`, `quantityRejected (Decimal(12,2))`, `multiplier (Decimal(10,2))`, `baseQuantity (Decimal(12,2))`, `unitPrice (Decimal(18,4))`, `taxRate (Decimal(5,2))`, `totalLine (Decimal(18,2))`.
    *   `OrderPayment`: `paymentMethod (PaymentMethod)`, `amount (Decimal(18,2))`, `exchangeRate (Decimal(18,4))`, `referenceNumber`, `receiptImageUrl`.
    *   `OrderInvoice`: `invoiceNumber`, `controlNumber`, `invoiceDate (Date)`, `totalAmount (Decimal(18,2))`, `taxAmount (Decimal(18,2))`.
5.  **Inventario & Kardex**:
    *   `Location`: `id (Int)`, `name`, `type (LocationType)`.
    *   `StockBatch`: `id (BigInt)`, `lotNumber`, `currentQuantity (Decimal(12,2))`, `costPrice (Decimal(18,4))`, `expirationDate (Date)`, `status (BatchStatus)`. Índice compuesto: `@@index([productId, lotNumber, locationId])`.
    *   `StockMovement`: `id (BigInt)`, `referenceNumber (Unique)`, `type (StockMovementType)`, `originLocationId`, `destinationLocationId`, `orderId`.
    *   `StockMovementItem`: `quantity (Decimal(12,2))`, `unitCost (Decimal(18,4))`, `batchId`, `orderItemId`.
6.  **Laboratorio & Cadena de Frío**:
    *   `Fridge`: `id (Int)`, `code (Unique)`, `name`, `targetTempCelsius (Decimal(5,2))`, `status (FridgeStatus)`, `locationId`.
    *   `LabReagentUnit`: `id (BigInt)`, `unitCode (Unique)`, `initialVolume (Decimal(12,2))`, `currentVolume (Decimal(12,2))`, `status (LabUnitStatus)`, `openedAt`, `expirationDate (Date)`, `fridgeId`.
    *   `LabStockMovement`: `amountUsed (Decimal(12,2))`, `movementType (LabMovementType)`, `fromFridgeId`, `toFridgeId`.
7.  **Solicitudes Internas & Ventana Operativa**:
    *   `RequestWindowConfig`: `startDay (1-7)`, `startHour (0-23)`, `startMinute`, `endDay`, `endHour`, `endMinute`, `isSuspended (Boolean)`, `maxWeeklyRequestsPerUser (Int)`, `timezone (Default: America/Caracas)`.
    *   `Request`: `id (BigInt)`, `requestNumber (Unique)`, `userId`, `status (RequestStatus)`, `priority (RequestPriority)`, `weeklyTokenCycle (ej. 2026-W39)`, `dispatchedMovementId`.
    *   `RequestItem`: `quantityRequested (Decimal(12,2))`, `quantityApproved (Decimal(12,2))`, `quantityDispatched (Decimal(12,2))`.
8.  **Calidad & Incidencias**:
    *   `BatchIncident`: `id (BigInt)`, `batchId`, `reportedById`, `incidentType (IncidentType)`, `status (IncidentStatus)`, `affectedQuantity (Decimal(12,2))`, `evidenceUrl`, `resolutionNotes`.

---

## 5. Mapeo de Interfaces, Rutas y Endpoints

### 5.1 Convención de Rutas Públicas vs. Protegidas
*   **Rutas Públicas**:
    *   `GET /api/health`: Estado de conectividad con la base de datos y uptime del servicio.
    *   `GET /api/docs`: Documentación interactiva Swagger UI.
    *   `GET /api/docs.json`: Especificación técnica OpenAPI 3.0 en formato JSON.
    *   `POST /api/auth/login`: Autenticación y generación del token Bearer.
*   **Rutas Protegidas**: Requieren de forma obligatoria la cabecera `Authorization: Bearer <token>`. La autorización específica se gestiona mediante el middleware `requireRoles([...])`.

### 5.2 Matriz de Endpoints de la API Backend

| Módulo | Método | Endpoint | Roles Permitidos | Propósito / Acción |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/login` | Público | Autenticación con credenciales y emisión de JWT |
| | `GET` | `/api/auth/me` | Autenticado | Obtiene la ficha y roles del usuario en sesión |
| | `PATCH` | `/api/auth/change-password` | Autenticado | Cambio de contraseña del propio usuario |
| **Usuarios** | `GET` | `/api/users/roles` | `ADMINISTRADOR` | Lista todos los roles disponibles en el sistema |
| | `GET` | `/api/users` | `ADMINISTRADOR` | Lista de usuarios con paginación y filtros |
| | `POST` | `/api/users` | `ADMINISTRADOR` | Creación de usuario y asignación de contraseña inicial |
| | `GET` | `/api/users/:id` | `ADMINISTRADOR` | Obtención de detalle de un usuario |
| | `PATCH` | `/api/users/:id` | `ADMINISTRADOR` | Actualización de perfil, departamento y estado activo |
| | `PATCH` | `/api/users/:id/reset-password` | `ADMINISTRADOR` | Blanqueo administrativo de contraseña de un usuario |
| | `PUT` | `/api/users/:id/roles` | `ADMINISTRADOR` | Sincronización completa de roles asignados al usuario |
| **Preórdenes** | `GET` | `/api/purchase-requisitions` | `ADMINISTRADOR`, `COMPRAS`, `ALMACENISTA` | Listado general de requisiciones de compra |
| | `GET` | `/api/purchase-requisitions/:id` | `ADMINISTRADOR`, `COMPRAS`, `ALMACENISTA` | Detalle de requisición e ítems requeridos |
| | `POST` | `/api/purchase-requisitions` | `ADMINISTRADOR`, `COMPRAS` | Creación de requisición en estado `BORRADOR` |
| | `PATCH` | `/api/purchase-requisitions/:id/status`| `ADMINISTRADOR`, `COMPRAS` | Cambio de estado (`EN_COTIZACION`, `CANCELADA`) |
| | `POST` | `/api/purchase-requisitions/:id/convert-to-order` | `ADMINISTRADOR`, `COMPRAS` | Adjudica proveedor y genera orden de compra oficial |
| **Órdenes** | `GET` | `/api/orders` | `ADMINISTRADOR`, `COMPRAS`, `ALMACENISTA` | Listado de órdenes de compra con estado de recepción |
| | `GET` | `/api/orders/:id` | `ADMINISTRADOR`, `COMPRAS`, `ALMACENISTA` | Detalle de orden, ítems, desglose de IVA y pagos |
| | `POST` | `/api/orders` | `ADMINISTRADOR`, `COMPRAS` | Creación directa de orden de compra oficial |
| | `POST` | `/api/orders/:id/receive` | `ADMINISTRADOR`, `ALMACENISTA` | Recepción física en almacén: genera lotes y Kardex |
| **Finanzas** | `GET` | `/api/orders/:orderId/finance` | `ADMINISTRADOR`, `COMPRAS` | Resumen de saldos, facturación y pagos de una orden |
| | `POST` | `/api/orders/:orderId/invoices`| `ADMINISTRADOR`, `COMPRAS` | Carga de factura comercial del proveedor |
| | `POST` | `/api/orders/:orderId/payments`| `ADMINISTRADOR`, `COMPRAS` | Amortización de pago bimoneda (USD/VES) |
| **Proveedores**| `GET` | `/api/suppliers` | `ADMINISTRADOR`, `COMPRAS`, `ALMACENISTA` | Directorio de proveedores comerciales |
| | `GET` | `/api/suppliers/:id` | `ADMINISTRADOR`, `COMPRAS`, `ALMACENISTA` | Ficha técnica de un proveedor |
| | `POST` | `/api/suppliers` | `ADMINISTRADOR`, `COMPRAS` | Registro de nuevo proveedor |
| | `PUT` | `/api/suppliers/:id` | `ADMINISTRADOR`, `COMPRAS` | Actualización de datos del proveedor |
| | `DELETE`| `/api/suppliers/:id` | `ADMINISTRADOR`, `COMPRAS` | Eliminación lógica/física del proveedor |
| | `GET` | `/api/suppliers/debts` | `ADMINISTRADOR`, `COMPRAS` | Reporte consolidado de deudas por proveedor |
| | `GET` | `/api/suppliers/:id/statement` | `ADMINISTRADOR`, `COMPRAS` | Estado de cuenta histórico de un proveedor |
| | `POST` | `/api/suppliers/:id/payments` | `ADMINISTRADOR`, `COMPRAS` | Registro de abono a cuenta corriente de proveedor |
| **Monedas** | `GET` | `/api/currencies` | Autenticado | Lista de monedas y tasas de cambio vigentes |
| | `POST` | `/api/currencies/rate` | `ADMINISTRADOR`, `COMPRAS` | Registro de tasa de cambio diaria (BCV/Paralelo) |
| **Catálogo** | `GET` | `/api/products` | Autenticado | Catálogo de productos con filtros de búsqueda y SKU |
| | `GET` | `/api/products/:id` | Autenticado | Ficha detallada de un producto |
| | `GET` | `/api/products/catalogs`| Autenticado | Opciones agrupadas de categorías, marcas y unidades |
| | `POST` | `/api/products` | `ADMINISTRADOR`, `COMPRAS`, `ANALISTA_LABORATORIO` | Creación de nuevo producto en catálogo |
| | `POST` | `/api/products/categories`| `ADMINISTRADOR`, `COMPRAS` | Alta rápida de categoría |
| | `POST` | `/api/products/brands` | `ADMINISTRADOR`, `COMPRAS` | Alta rápida de marca |
| **Maestros** | `GET` | `/api/catalog/departments` | Autenticado | Lista de departamentos institucionales del IDI |
| | `GET` | `/api/catalog/categories` | Autenticado | Categorías de insumos |
| | `CRUD`| `/api/catalog/categories` | `ADMINISTRADOR` | Mutaciones sobre categorías |
| | `CRUD`| `/api/catalog/brands` | `ADMINISTRADOR` | Mutaciones sobre marcas |
| | `CRUD`| `/api/catalog/units` | `ADMINISTRADOR` | Mutaciones sobre unidades de medida |
| | `CRUD`| `/api/catalog/locations` | `ADMINISTRADOR` | Mutaciones sobre ubicaciones físicas de inventario |
| **Inventario** | `GET` | `/api/inventory` | Autenticado | Resumen consolidado de existencias valorizadas |
| | `GET` | `/api/inventory/batches` | Autenticado | Detalle de existencias agrupadas por lote físico |
| | `GET` | `/api/inventory/alerts` | Autenticado | Alertas de stock mínimo y lotes próximos a vencer |
| | `GET` | `/api/inventory/movements` | `ADMINISTRADOR`, `ALMACENISTA` | Libro diario de movimientos Kardex |
| | `GET` | `/api/inventory/movements/:id` | `ADMINISTRADOR`, `ALMACENISTA` | Detalle específico de un asiento Kardex |
| | `POST` | `/api/inventory/adjustments` | `ADMINISTRADOR`, `ALMACENISTA` | Ajustes manuales positivos/negativos de inventario |
| | `POST` | `/api/inventory/wastes` | `ADMINISTRADOR`, `ALMACENISTA` | Registro directo de merma/deterioro con motivo |
| | `PATCH` | `/api/inventory/batches/:id/status` | `ADMINISTRADOR`, `ALMACENISTA` | Liberación de cuarentena o pase a defectuoso |
| **Solicitudes**| `GET` | `/api/requests/window-status` | Autenticado | Estado de la ventana semanal de solicitudes |
| | `GET` | `/api/requests/window-config` | `ADMINISTRADOR` | Parámetros de la ventana semanal y cuota |
| | `PUT` | `/api/requests/window-config` | `ADMINISTRADOR` | Actualización de horario y límites de la ventana |
| | `GET` | `/api/requests` | Autenticado | Solicitudes del usuario (Admin/Almacén ven globales) |
| | `GET` | `/api/requests/:id` | Autenticado | Detalle e ítems de la solicitud |
| | `POST` | `/api/requests` | Autenticado | Radicación de solicitud (restringida a ventana) |
| | `PATCH` | `/api/requests/:id/approve` | `ADMINISTRADOR`, `ALMACENISTA` | Aprobación de solicitud con ajuste de cantidades |
| | `POST` | `/api/requests/:id/reject` | `ADMINISTRADOR`, `ALMACENISTA` | Rechazo motivado de solicitud |
| | `POST` | `/api/requests/:id/dispatch`| `ADMINISTRADOR`, `ALMACENISTA` | Despacho material: descuenta stock y genera Kardex |
| **Laboratorio**| `GET` | `/api/lab/fridges` | Autenticado | Listado de neveras y cavas de frío |
| | `POST` | `/api/lab/fridges` | `ADMINISTRADOR`, `ANALISTA_LABORATORIO` | Registro de nuevo equipo de refrigeración |
| | `GET` | `/api/lab/fridges/:id/contents` | Autenticado | Inventario de reactivos dentro de una nevera |
| | `POST` | `/api/lab/fridges/:id/assign` | `ADMINISTRADOR`, `ANALISTA_LABORATORIO` | Reasignación de vial a otra nevera |
| | `POST` | `/api/lab/fridges/:id/assign-batch` | `ADMINISTRADOR`, `ANALISTA_LABORATORIO` | Asignación masiva de lote de reactivo a frío |
| | `GET` | `/api/lab/units` | Autenticado | Unidades/frascos de reactivos clínicos |
| | `GET` | `/api/lab/units/:id` | Autenticado | Ficha individual del frasco y volumen restante |
| | `PATCH` | `/api/lab/units/:id/open` | `ADMINISTRADOR`, `ANALISTA_LABORATORIO` | Apertura de frasco sellado (`SELLADO` -> `EN_USO`) |
| | `POST` | `/api/lab/units/:id/consume` | `ADMINISTRADOR`, `ANALISTA_LABORATORIO` | Consumo analítico de volumen (`CONSUMO_PRUEBAS`) |
| | `POST` | `/api/lab/units/:id/transfer`| `ADMINISTRADOR`, `ANALISTA_LABORATORIO` | Traslado térmico entre neveras |
| | `POST` | `/api/lab/units/:id/discard` | `ADMINISTRADOR`, `ANALISTA_LABORATORIO` | Descarte del vial (`DESCARTADO`) por falla/merma |
| | `GET` | `/api/lab/reagents` | `ADMINISTRADOR`, `ANALISTA_LABORATORIO` | Catálogo de reactivos clínicos en frío |
| | `GET` | `/api/lab/consumptions` | `ADMINISTRADOR`, `ANALISTA_LABORATORIO` | Historial de consumos realizados |
| | `POST` | `/api/lab/consumptions` | `ADMINISTRADOR`, `ANALISTA_LABORATORIO` | Registro directo de consumo por lote |
| **Dashboard** | `GET` | `/api/dashboard/metrics` | Autenticado | KPIs operativos para la vista inicial |
| | `GET` | `/api/dashboard/notifications`| Autenticado | Alertas críticas para el usuario |
| **Reportes** | `GET` | `/api/reports/dashboard` | `ADMINISTRADOR`, `ALMACENISTA`, `COMPRAS` | Resumen analítico financiero y de existencias |
| **Exports** | `GET` | `/api/exports/inventory-valuation` | `ADMINISTRADOR`, `ALMACENISTA`, `COMPRAS` | Descarga de CSV de valorización de inventario |
| | `GET` | `/api/exports/kardex` | `ADMINISTRADOR`, `ALMACENISTA` | Descarga de CSV del libro diario de movimientos |

### 5.3 Mapeo de Vistas del Frontend (App Router)

| Ruta de la Vista | Roles de Acceso en UI | Propósito y Contenido |
| :--- | :--- | :--- |
| `/login` | Público | Formulario de autenticación con credenciales |
| `/dashboard` | Todos los roles autenticados | Pantalla principal con métricas clave, alertas y accesos rápidos |
| `/requests` | Todos los roles autenticados | Formulario de pedidos departamentales y estado de la ventana semanal |
| `/requests/[id]` | Todos (filtrado por pertenencia / Almacén) | Detalle, historial de aprobación y panel de despacho |
| `/inventory/products` | `ADMINISTRADOR`, `ALMACENISTA`, `COMPRAS` | Directorio de insumos, SKUs, niveles de stock y lotes vinculados |
| `/inventory/products/[id]`| `ADMINISTRADOR`, `ALMACENISTA`, `COMPRAS` | Ficha técnica completa de insumo o reactivo |
| `/inventory/kardex` | `ADMINISTRADOR`, `ALMACENISTA` | Trazabilidad del libro diario de entradas, traslados y consumos |
| `/inventory/kardex/[id]` | `ADMINISTRADOR`, `ALMACENISTA` | Comprobante digital del movimiento y detalle de lotes |
| `/inventory/adjustments` | `ADMINISTRADOR`, `ALMACENISTA` | Asientos manuales de ajuste por inventario físico y descarte de mermas |
| `/inventory/settings` | `ADMINISTRADOR`, `ALMACENISTA` | Configuración de marcas, categorías, unidades y depósitos |
| `/quality/quarantine` | `ADMINISTRADOR`, `ANALISTA_LABORATORIO` | Panel de control de lotes retenidos y dictamen técnico de calidad |
| `/laboratory/fridges` | `ADMINISTRADOR`, `ANALISTA_LABORATORIO` | Monitor de cavas, neveras clínicas y estado operativo térmico |
| `/laboratory/fridges/[id]`| `ADMINISTRADOR`, `ANALISTA_LABORATORIO` | Mapa de viales almacenados dentro de un equipo de refrigeración |
| `/laboratory/consumption`| `ADMINISTRADOR`, `ANALISTA_LABORATORIO` | Registro de apertura de viales, consumos de mililitros y descartes |
| `/purchasing/requisitions`| `ADMINISTRADOR`, `COMPRAS` | Gestión de preórdenes institucionales y cotizaciones previas |
| `/purchasing/orders` | `ADMINISTRADOR`, `COMPRAS` | Listado y creación de órdenes de compra a proveedores |
| `/purchasing/orders/[id]` | `ADMINISTRADOR`, `COMPRAS` | Expediente de orden con carga de facturas y amortizaciones |
| `/purchasing/orders/[id]/receive` | `ADMINISTRADOR`, `ALMACENISTA` | Recepción física en muelle con asignación de lotes y vencimientos |
| `/purchasing/debts` | `ADMINISTRADOR`, `COMPRAS` | Cuentas por pagar por proveedor y balance de deudas bimoneda |
| `/purchasing/suppliers` | `ADMINISTRADOR`, `COMPRAS` | Directorio de proveedores, RIF y datos de contacto comercial |
| `/admin/users` | `ADMINISTRADOR` | Gestión institucional de cuentas de usuario y sincronización de roles |
| `/admin/security` | `ADMINISTRADOR` | Configuración de la ventana operativa semanal y políticas de acceso |

---

## 6. Variables de Entorno & Configuración Crítica

### 6.1 Backend (`backend/.env.example`)

| Variable | Requerida | Propósito y Formato | Valor por Defecto |
| :--- | :---: | :--- | :--- |
| `DATABASE_URL` | **Sí** | Cadena de conexión JDBC/PostgreSQL para Prisma ORM. Ejemplo: `postgresql://user:pass@localhost:5432/erp_idi?schema=public` | *Sin valor predeterminado* |
| `PORT` | No | Puerto TCP en el que el servidor Express inicia su listener HTTP. | `3000` |
| `JWT_SECRET` | **Sí** | Secreto criptográfico de alta entropía para firma y verificación de tokens JWT HMAC SHA-256. | `'jwt_default_secret_key'` *(Solo desarrollo)* |
| `JWT_EXPIRES_IN`| No | Tiempo de validez del token portador emitido al iniciar sesión. Ejemplo: `8h`, `1d`. | `'8h'` |

### 6.2 Frontend (`frontend/.env.example`)

| Variable | Requerida | Propósito y Formato | Valor por Defecto |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | No | URL pública base absoluta de la API REST del backend consumida por Axios en el cliente, incluyendo el prefijo `/api`. | `http://localhost:3000/api` |

> [!CAUTION]
> En entornos de producción (`staging` y `production`), nunca deben utilizarse valores por defecto para `JWT_SECRET` ni cadenas de conexión con credenciales expuestas en el repositorio. La política de orígenes de CORS en `backend/src/app.ts` debe sustituir los orígenes locales `http://localhost:3000` y `http://localhost:3001` por el FQDN seguro bajo HTTPS.

---

## 7. Flujos de Trabajo Clave (Workflows)

### 7.1 Flujo de Autenticación, Verificación de Sesión y Control RBAC

```mermaid
sequenceDiagram
    autonumber
    actor Usuario
    participant Client as Frontend (Next.js)
    participant API as Backend (Express)
    participant DB as PostgreSQL (Prisma)

    Usuario->>Client: Ingresa username y password
    Client->>API: POST /api/auth/login { username, password }
    API->>DB: Busca usuario por username con sus userRoles
    DB-->>API: Retorna hash bcrypt y roles asignados
    API->>API: Verifica bcrypt.compare(password, passwordHash)
    API->>API: Firma JWT con payload { id, username, email, roles, department }
    API-->>Client: Retorna { token, user }
    Client->>Client: Almacena en localStorage ('erp_token', 'erp_user')
    Client->>Client: Redirige a /dashboard

    Note over Client,API: Petición subsiguiente protegida
    Usuario->>Client: Accede a /purchasing/orders
    Client->>API: GET /api/orders (Header: Bearer <token>)
    API->>API: auth.middleware valida firma y expiración del JWT
    API->>API: role.middleware evalúa si ['ADMINISTRADOR', 'COMPRAS', 'ALMACENISTA'] incluye los roles del usuario
    alt Rol no autorizado
        API-->>Client: 403 Forbidden
    else Token vencido o ausente
        API-->>Client: 401 Unauthorized
        Client->>Client: Interceptor purga localStorage y redirige a /login
    else Autorizado
        API->>DB: Consulta órdenes
        DB-->>API: Datos
        API-->>Client: 200 OK con payload JSON
    end
```

### 7.2 Flujo de Compras, Recepción Física y Registro en Kardex

El proceso de aprovisionamiento garantiza que ningún insumo ingrese al inventario sin respaldo documental y trazabilidad física:

```mermaid
sequenceDiagram
    autonumber
    actor Compras as Dpto. Compras
    actor Almacen as Almacén Central
    participant API as Backend API
    participant DB as PostgreSQL

    Compras->>API: POST /api/purchase-requisitions (Preorden en BORRADOR)
    Compras->>API: POST /api/purchase-requisitions/:id/convert-to-order (Asigna proveedor, tasa y genera Order)
    API->>DB: Registra Order en estado BORRADOR / ENVIADA
    Note over Almacen,API: Llegada física del pedido
    Almacen->>API: POST /api/orders/:id/receive { items: [{ orderItemId, lotNumber, expirationDate, quantityReceived, quantityRejected }] }
    
    rect rgb(240, 248, 255)
    Note over API,DB: Transacción Atómica prisma.$transaction
    API->>DB: Valida cantidades pendientes del pedido
    API->>DB: Crea o incrementa StockBatch (status: DISPONIBLE)
    API->>DB: Crea StockMovement (type: ENTRADA_COMPRA, orderId)
    API->>DB: Crea StockMovementItem vinculando lote y costo
    API->>DB: Actualiza OrderItem (quantityReceived, quantityRejected)
    API->>DB: Evalúa OrderStatus (pasa a PARCIAL o COMPLETADA)
    API->>DB: Actualiza ReceptionStatus (PARCIAL o COMPLETO)
    end
    API-->>Almacen: 200 OK (Recepción procesada y Kardex actualizado)
```

### 7.3 Flujo de Solicitudes Internas con Validación de Ventana Operativa Semanal

Para optimizar la labor del Almacén Central, las solicitudes departamentales se restringen mediante políticas semanales automáticas:

```mermaid
sequenceDiagram
    autonumber
    actor Solicitante as Departamento Solicitante
    actor Almacen as Almacén Central
    participant API as Backend API
    participant DB as PostgreSQL

    Solicitante->>API: GET /api/requests/window-status
    API->>DB: Consulta RequestWindowConfig
    API-->>Solicitante: { isOpen, windowDetails, currentCycle: "2026-W39" }

    alt Ventana Cerrada o Suspendida
        Solicitante->>API: POST /api/requests
        API-->>Solicitante: 400 Bad Request ("Ventana de solicitudes no activa")
    else Ventana Activa
        Solicitante->>API: POST /api/requests { departmentSection, justification, items }
        API->>DB: Verifica si el usuario superó maxWeeklyRequestsPerUser en el ciclo actual
        API->>DB: Registra Request en estado PENDIENTE
        API-->>Solicitante: 201 Created

        Almacen->>API: PATCH /api/requests/:id/approve { items: [{ id, quantityApproved }] }
        API->>DB: Actualiza estado a APROBADA

        Almacen->>API: POST /api/requests/:id/dispatch { items: [{ id, batchId, quantityDispatched }] }
        rect rgb(240, 248, 255)
        Note over API,DB: Transacción Atómica de Despacho
        API->>DB: Descuenta currentQuantity en StockBatch correspondiente
        API->>DB: Registra StockMovement (type: DESPACHO_SOLICITUD)
        API->>DB: Actualiza Request a COMPLETADA con dispatchedMovementId
        end
        API-->>Almacen: 200 OK (Stock descontado y despacho finalizado)
    end
```

### 7.4 Flujo de Cadena de Frío y Ciclo de Vida de Reactivos de Laboratorio

Los reactivos inmunológicos fraccionables disponen de una doble trazabilidad: el lote central de almacén y el ciclo de vida del vial físico:

```mermaid
stateDiagram-v2
    [*] --> SELLADO: Ingreso a Laboratorio (Asignación a Nevera/Cava)
    SELLADO --> EN_USO: Apertura del vial (PATCH /api/lab/units/:id/open)
    EN_USO --> EN_USO: Consumo volumétrico (POST /api/lab/units/:id/consume)
    EN_USO --> EN_USO: Traslado térmico entre equipos (POST /api/lab/units/:id/transfer)
    EN_USO --> AGOTADO: currentVolume alcanza 0.00
    EN_USO --> DESCARTADO: Falla de frío / Contaminación (POST /api/lab/units/:id/discard)
    SELLADO --> DESCARTADO: Vencimiento previo a apertura
    AGOTADO --> [*]
    DESCARTADO --> [*]
```

---

## 8. Consideraciones de Auditoría & Estado Actual del Repositorio

1.  **Montaje de Rutas y Manejador de Errores**:
    *   Todas las rutas de la API se encuentran montadas en `backend/src/app.ts` estrictamente **antes** del middleware `errorHandler`, asegurando que cualquier excepción en controladores o servicios sea interceptada y serializada con formato JSON homogéneo.
2.  **Duplicidad de Rutas de Maestros de Inventario**:
    *   Coexisten dos conjuntos de endpoints para maestros de inventario: `/api/catalog/*` y `/api/inventory/masters/*`. Ambos exigen rol `ADMINISTRADOR` para mutaciones. Para desarrollos futuros de clientes o extensiones de API, se recomienda homogeneizar el consumo hacia un único punto de entrada unificado.
3.  **Precedencia de Rutas en `/api/inventory`**:
    *   En `backend/src/app.ts`, `stockAdjustmentRoutes` está montado previamente a `inventoryRoutes`. Rutas coincidentes como `/movements` son absorbidas por el primer router montado. El diseño actual mantiene la integridad de validaciones Zod para ajustes y mermas directas.
4.  **Modelo de Permisos Granulares vs. Roles Efectivos**:
    *   Las tablas `permissions` y `role_permissions` existen en la base de datos PostgreSQL mediante el esquema Prisma; no obstante, el middleware activo de autorización (`role.middleware.ts`) evalúa directamente la pertenencia del usuario a los roles institucionales (`ADMINISTRADOR`, `COMPRAS`, `ALMACENISTA`, `ANALISTA_LABORATORIO`, `SOLICITANTE`).
