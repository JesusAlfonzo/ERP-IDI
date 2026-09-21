# Levantamiento del sistema ERP-IDI

**Fecha del levantamiento:** 20 de septiembre de 2026  
**Alcance:** repositorio `backend/`, `frontend/`, esquema Prisma, seed, rutas, servicios, pruebas y documentación existente.  
**Método:** revisión estática del código fuente. No se ejecutó una conexión contra PostgreSQL, por lo que este documento describe el modelo y la implementación versionada, no el estado de una base de datos desplegada.

## 1. Resumen ejecutivo

ERP-IDI es una API REST en Express/TypeScript con Prisma sobre PostgreSQL y un frontend Next.js. El sistema cubre el ciclo principal de abastecimiento e inventario de un instituto de inmunología:

- seguridad, autenticación JWT y autorización por roles;
- catálogo de productos, unidades, marcas, ubicaciones y proveedores;
- compras, recepción de lotes, facturas y pagos;
- inventario por lote, movimientos, ajustes, mermas y alertas;
- solicitudes internas y despachos;
- reactivos de laboratorio, neveras, consumo y traslados;
- dashboard y exportaciones CSV.

El modelo Prisma es amplio y coherente con ese alcance: contiene **27 modelos**, **14 enums** y una migración inicial. La mayor brecha no está en la cantidad de entidades, sino en la cobertura desigual entre capas:

1. `Permission` y `RolePermission` existen en la base de datos, pero la autorización efectiva usa nombres de roles y no permisos.
2. `BatchIncident` está modelado, pero no se observa una API para listar, confirmar, descartar o resolver incidencias.
3. La cadena de frío solo tiene el equipo y su temperatura objetivo; no hay lecturas históricas, alarmas ni mantenimiento.
4. Marcas, unidades y ubicaciones tienen superficies duplicadas en `/catalog`, `/products` y `/inventory/masters`.
5. Swagger y la documentación no representan toda la API real; además, Swagger usa valores de enum de incidencias distintos al esquema Prisma.
6. El frontend cubre los flujos principales, pero no todas las operaciones que ya existen en backend.

## 2. Arquitectura actual

```text
Usuario
  -> Next.js / React
  -> Axios + JWT
  -> Express REST (/api)
  -> middlewares de autenticación, roles, validación y errores
  -> controllers
  -> services
  -> Prisma Client
  -> PostgreSQL
```

### Componentes

| Componente        | Tecnología                     | Ubicación                              | Estado                                                  |
| ----------------- | ------------------------------ | -------------------------------------- | ------------------------------------------------------- |
| API               | Express 5, TypeScript          | `backend/src`                          | Implementada                                            |
| Persistencia      | PostgreSQL + Prisma 6          | `backend/prisma`                       | Esquema y migración inicial                             |
| Autenticación     | JWT, bcrypt                    | `backend/src/services/auth.service.ts` | Implementada                                            |
| Validación        | Zod                            | `backend/src/schemas` y middlewares    | Parcial; se identifica un schema explícito para ajustes |
| Documentación API | Swagger UI/OpenAPI             | `backend/src/config/swagger.ts`        | Parcial                                                 |
| Aplicación web    | Next.js 16, React 19, Tailwind | `frontend/src`                         | En desarrollo activo                                    |
| Pruebas           | Vitest + Supertest             | `backend/tests`                        | Cobertura focalizada                                    |

Flujo habitual de una petición:

```text
route -> middleware -> controller -> service -> Prisma -> PostgreSQL
```

## 3. Módulos funcionales

| Módulo                 | API                                | Persistencia principal                                     | Frontend visible                 | Estado                                             |
| ---------------------- | ---------------------------------- | ---------------------------------------------------------- | -------------------------------- | -------------------------------------------------- |
| Salud                  | `/api/health`                      | Ninguna                                                    | No aplica                        | Implementado                                       |
| Autenticación          | `/api/auth`                        | `User`, `RefreshToken`                                     | Login                            | Implementado                                       |
| Usuarios y acceso      | `/api/users`                       | `User`, `Role`, `Permission`, `UserRole`, `RolePermission` | Usuarios/admin                   | Parcial: RBAC por roles; permisos no son efectivos |
| Catálogo               | `/api/catalog`, `/api/products`    | `Category`, `Brand`, `Unit`, `Product`, `Location`         | Productos y configuración        | Implementado, con duplicación de maestros          |
| Monedas                | `/api/currencies`                  | `Currency`, `CurrencyExchange`                             | No se identifica pantalla propia | Backend implementado                               |
| Proveedores            | `/api/suppliers`                   | `Supplier`                                                 | Proveedores                      | Implementado                                       |
| Compras                | `/api/orders`                      | `Order`, `OrderItem`, `OrderInvoice`                       | Órdenes y recepción              | Implementado                                       |
| Finanzas de compras    | `/api/orders/:orderId/finance`     | `OrderPayment`, `OrderInvoice`                             | Deudas                           | Implementado                                       |
| Inventario             | `/api/inventory`                   | `StockBatch`, `StockMovement`, `StockMovementItem`         | Inventario, Kardex               | Implementado                                       |
| Ajustes y mermas       | `/api/inventory`                   | `StockMovement`, `StockMovementItem`, `StockBatch`         | Ajustes                          | Implementado                                       |
| Calidad/cuarentena     | Parcial dentro de `/api/inventory` | `BatchIncident`, `BatchStatus`                             | Cuarentena                       | Parcial: falta gestión completa de incidencias     |
| Maestros de inventario | `/api/inventory/masters`           | `Brand`, `Unit`, `Location`                                | Configuración                    | Implementado, duplicado con catálogo               |
| Solicitudes internas   | `/api/requests`                    | `Request`, `RequestItem`                                   | Solicitudes                      | Implementado                                       |
| Laboratorio            | `/api/lab`                         | `Fridge`, `LabReagentUnit`, `LabStockMovement`             | Neveras y consumo                | Implementado parcialmente                          |
| Reportes               | `/api/reports`                     | Consultas agregadas                                        | Dashboard                        | Implementado                                       |
| Exportaciones          | `/api/exports`                     | Consultas de inventario                                    | Descarga CSV                     | Implementado                                       |

## 4. API disponible

Todas las rutas funcionales requieren JWT, salvo login y health check. La autorización adicional depende del rol indicado en cada ruta.

### Autenticación

- `POST /api/auth/login`
- `GET /api/auth/me`
- `PATCH /api/auth/change-password`

### Usuarios y RBAC

- `GET /api/users/roles`
- `GET /api/users`
- `GET /api/users/:id`
- `POST /api/users`
- `PATCH /api/users/:id`
- `PATCH /api/users/:id/reset-password`
- `POST /api/users/:id/reset-password`
- `PUT /api/users/:id/roles`

Los dos endpoints de reset de contraseña parecen representar la misma operación y deben consolidarse o documentarse como casos diferentes.

### Catálogo y productos

- `GET /api/catalog/categories`
- `GET /api/catalog/brands`
- `GET /api/catalog/units`
- `GET /api/catalog/locations`
- `GET /api/catalog/departments`
- Operaciones de alta, modificación y eliminación de categorías.
- Operaciones de alta y modificación de marcas, unidades y ubicaciones.
- `GET /api/products`
- `GET /api/products/catalogs`
- `POST /api/products`
- `POST /api/products/categories`
- `POST /api/products/brands`

### Monedas, proveedores y compras

- `GET /api/currencies`
- `POST /api/currencies/...` para registrar tasas.
- `GET /api/suppliers`
- `GET /api/suppliers/:id`
- `POST /api/suppliers`
- `PUT /api/suppliers/:id`
- `DELETE /api/suppliers/:id`
- `GET /api/suppliers/debts`
- `GET /api/suppliers/:id/statement`
- `GET /api/orders`
- `GET /api/orders/:id`
- `POST /api/orders`
- `POST /api/orders/:id/receive`
- `GET /api/orders/:orderId/finance`
- `POST /api/orders/:orderId/invoices`
- `POST /api/orders/:orderId/payments`

### Inventario y calidad

- `GET /api/inventory`
- `GET /api/inventory/batches`
- `GET /api/inventory/alerts`
- `GET /api/inventory/movements`
- `POST /api/inventory/adjustments`
- `POST /api/inventory/wastes`
- `PATCH /api/inventory/batches/:id/status`

El Kardex se registra mediante `stock-adjustment.routes.ts`; en `inventory.routes.ts` existe una declaración comentada de la misma ruta.

### Solicitudes

- `GET /api/requests`
- `GET /api/requests/:id`
- `POST /api/requests`
- `PATCH /api/requests/:id/approve`
- `POST /api/requests/:id/reject`
- `POST /api/requests/:id/dispatch`

### Laboratorio y cadena de frío

- `GET /api/lab/fridges`
- `POST /api/lab/fridges`
- `GET /api/lab/fridges/:id/contents`
- `POST /api/lab/fridges/:id/assign`
- `POST /api/lab/fridges/:id/assign-batch`
- `GET /api/lab/units`
- `GET /api/lab/units/:id`
- `GET /api/lab/reagents`
- `GET /api/lab/consumptions`
- `POST /api/lab/consumptions`
- `POST /api/lab/units/:id/open`
- `POST /api/lab/units/:id/consume`
- `POST /api/lab/units/:id/transfer`
- `POST /api/lab/units/:id/discard`

### Reportes y exportaciones

- `GET /api/reports/dashboard`
- `GET /api/exports/inventory-valuation`
- `GET /api/exports/kardex`

## 5. Modelo de datos Prisma

### 5.1 Seguridad y acceso

| Modelo           | Propósito            | Observación                                         |
| ---------------- | -------------------- | --------------------------------------------------- |
| `User`           | Usuarios del sistema | Departamento como texto libre                       |
| `Role`           | Roles funcionales    | Se usa directamente en middleware                   |
| `Permission`     | Catálogo de permisos | No tiene API ni seed visible                        |
| `RolePermission` | Relación rol-permiso | No participa en la autorización actual              |
| `UserRole`       | Relación usuario-rol | PK compuesta                                        |
| `RefreshToken`   | Tokens de renovación | Existe en modelo; validar flujo completo de refresh |

### 5.2 Monedas

| Modelo             | Campos relevantes                                |
| ------------------ | ------------------------------------------------ |
| `Currency`         | `code`, `name`, `symbol`, `isDefault`            |
| `CurrencyExchange` | moneda, `rate`, `effectiveDate`, usuario creador |

### 5.3 Catálogo y organización

| Modelo     | Campos/relaciones relevantes                                                              |
| ---------- | ----------------------------------------------------------------------------------------- |
| `Category` | nombre y descripción; productos                                                           |
| `Brand`    | nombre y descripción; productos                                                           |
| `Unit`     | nombre, abreviatura, unidad base/compra                                                   |
| `Supplier` | identificación, contacto, dirección, activo                                               |
| `Product`  | categoría, marca, unidades, SKU, barcode, conversión, impuesto, mínimo y flag de reactivo |
| `Location` | nombre, tipo, descripción; lotes y movimientos origen/destino                             |
| `Fridge`   | ubicación, código, temperatura objetivo y estado                                          |

### 5.4 Compras y finanzas

| Modelo         | Propósito                                                                  |
| -------------- | -------------------------------------------------------------------------- |
| `Order`        | Orden, proveedor, moneda, tasa, estados, totales y creador                 |
| `OrderItem`    | Producto, unidad, cantidades ordenada/recibida/rechazada, costo e impuesto |
| `OrderPayment` | Forma de pago, referencia, moneda, tasa, importe y comprobante             |
| `OrderInvoice` | Número, control, fecha, archivo, impuesto y total                          |

### 5.5 Inventario

| Modelo              | Propósito                                                              |
| ------------------- | ---------------------------------------------------------------------- |
| `StockBatch`        | Existencia por producto, lote y ubicación; costo, vencimiento y estado |
| `StockMovement`     | Kardex, tipo, origen/destino, orden, usuario y referencia              |
| `StockMovementItem` | Lote afectado, cantidad, costo y vínculo a ítem de orden               |

### 5.6 Laboratorio

| Modelo             | Propósito                                                           |
| ------------------ | ------------------------------------------------------------------- |
| `LabReagentUnit`   | Unidad/frascos de reactivo, volumen, nevera, apertura y vencimiento |
| `LabStockMovement` | Consumo, traslado o descarte, cantidad, neveras y ejecutor          |

### 5.7 Solicitudes e incidencias

| Modelo          | Propósito                                                                      |
| --------------- | ------------------------------------------------------------------------------ |
| `Request`       | Solicitud, prioridad, ciclo semanal, aprobación y despacho                     |
| `RequestItem`   | Producto y cantidades solicitada/aprobada/despachada                           |
| `BatchIncident` | Incidencia sobre lote, evidencia, cantidad afectada, resolución y responsables |

### 5.8 Enums

`LocationType`, `FridgeStatus`, `OrderStatus`, `PaymentStatus`, `ReceptionStatus`, `PaymentMethod`, `BatchStatus`, `StockMovementType`, `LabUnitStatus`, `LabMovementType`, `RequestStatus`, `RequestPriority`, `IncidentType`, `IncidentStatus`.

## 6. Datos iniciales del seed

El seed crea o actualiza:

- monedas `USD`, `VES` y `EUR`;
- unidades `und`, `fco`, `cja`, `blt`, `ml`, `g`, `det` y `kit`;
- cinco marcas comerciales;
- cinco roles: `ADMINISTRADOR`, `ANALISTA_LABORATORIO`, `ALMACENISTA`, `COMPRAS`, `SOLICITANTE`;
- `Almacén Central` y `Laboratorio de Inmunología`;
- `NEV-01` y `CAVA-01`;
- cuatro categorías de productos;
- usuario administrador `admin@idi.ucv.ve` con rol `ADMINISTRADOR`.

El seed **no crea permisos ni relaciones `RolePermission`**, productos, proveedores, órdenes, lotes, solicitudes, incidencias ni datos de prueba transaccionales.

## 7. Cobertura del frontend

Pantallas identificadas:

- login y layout autenticado;
- dashboard;
- usuarios administrativos;
- productos, ajustes, Kardex y configuración de inventario;
- cuarentena;
- solicitudes;
- neveras y consumo de laboratorio;
- órdenes de compra, recepción, proveedores y deudas.

No se identifica una pantalla propia para monedas/tasas, facturas/pagos detallados, gestión completa de incidencias, departamentos, permisos, exportaciones o administración completa de todos los catálogos.

## 8. Pruebas actuales

Solo se identifican dos suites de integración:

- `backend/tests/catalog.test.ts`: autenticación, categorías, ubicaciones, maestros de inventario y neveras sembradas.
- `backend/tests/inventory-adjustment.test.ts`: validación de ajustes/mermas, paginación del Kardex y autenticación.

No hay pruebas visibles para usuarios/RBAC, productos, proveedores, monedas, órdenes, recepción, facturas, pagos, solicitudes, laboratorio operativo, reportes, exportaciones, incidencias o cambio de contraseña.

## 9. Faltantes y riesgos detectados

Estas observaciones distinguen faltantes confirmados de hipótesis de negocio que deben validarse.

### Prioridad alta

| Hallazgo                                   | Evidencia                                                                          | Impacto                                                                         | Acción recomendada                                                                    |
| ------------------------------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Permisos declarados pero no efectivos      | `Permission`/`RolePermission` existen; `role.middleware.ts` compara nombres de rol | El RBAC no es granular y el modelo puede inducir una falsa sensación de control | Decidir entre eliminar el modelo o implementar permisos, seed, middleware y endpoints |
| Incidencias sin ciclo de gestión           | `BatchIncident` tiene resolución, pero no hay rutas/controladores visibles         | No se puede operar formalmente la calidad desde API                             | Crear consulta, confirmación, descarte, resolución y auditoría de incidencias         |
| Ruta de maestros después de `errorHandler` | `app.ts` monta `/api/inventory/masters` después del manejador de errores           | Errores de ese módulo pueden no llegar al handler central                       | Registrar todas las rutas antes de `errorHandler`                                     |
| Contrato Swagger incompatible con Prisma   | Valores de `IncidentType` de Swagger no coinciden con el enum Prisma               | Clientes pueden enviar valores que la aplicación rechaza                        | Generar o validar OpenAPI desde una fuente única                                      |

### Prioridad media

| Hallazgo                              | Evidencia                                                                                       | Acción recomendada                                                                               |
| ------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Maestros duplicados                   | `/catalog`, `/products` e `/inventory/masters` operan sobre marcas, unidades o ubicaciones      | Elegir un dueño por entidad y retirar rutas duplicadas gradualmente                              |
| Cadena de frío sin histórico          | `Fridge` solo guarda temperatura objetivo y estado                                              | Agregar lecturas, alarmas, calibración, mantenimiento y responsable si son requisitos operativos |
| Departamentos como texto libre        | `User.department`, `Request.departmentSection` y endpoint derivado desde usuarios               | Crear `Department` si se requieren integridad, reportes y administración                         |
| Recepción sin documento propio        | `OrderItem` acumula recibida/rechazada, sin recepción, evidencia o responsable por evento       | Crear `GoodsReceipt`/`GoodsReceiptItem` si se requiere auditoría de recepción                    |
| Restricciones de unicidad por validar | No hay unicidad compuesta visible para moneda/fecha ni unicidad de `OrderInvoice.invoiceNumber` | Confirmar reglas de negocio y añadir índices únicos si aplican                                   |

### Prioridad baja o documental

- `docs/API.md` no incluye `/api/inventory/masters` ni describe todos los recursos.
- Las URLs iniciales de `docs/API.md` omiten `/api`, aunque el resto del documento usa el prefijo correcto.
- `ARCHITECTURE.md` afirma que hay esquemas de entrada en `schemas/`, pero actualmente la cobertura identificable es parcial.
- README declara permisos administrables e incidencias de calidad como capacidades completas, aunque ambas están incompletas en backend.
- Hay una ruta comentada de movimientos en `inventory.routes.ts` que puede confundir el mantenimiento.

## 10. Qué puede estar faltando en la base de datos

No es posible afirmar que falte una tabla en la base desplegada sin ejecutar introspección de PostgreSQL. A nivel de diseño, las entidades candidatas son:

1. **`Department`**: catálogo de departamentos y secciones.
2. **`FridgeTemperatureLog`**: lectura, fecha, temperatura, fuente, usuario y alarma.
3. **`FridgeMaintenance` o `FridgeCalibration`**: mantenimiento, calibración, vencimiento y proveedor técnico.
4. **`BatchIncidentAction` o auditoría de incidencia**: historial de cambios de estado y resolución.
5. **`GoodsReceipt` y `GoodsReceiptItem`**: recepción por evento, responsable, fecha, evidencia y rechazo.
6. **`AuditLog`**: cambios sensibles sobre usuarios, roles, precios, inventario, pagos e incidencias.
7. **`ProductLocation` o una entidad de saldos**: solo si se necesita separar explícitamente el saldo por ubicación de los lotes.

Estas entidades no deben agregarse automáticamente: primero hay que confirmar los flujos y obligaciones de trazabilidad del instituto.

## 11. Recomendación de orden de trabajo

1. Corregir el orden de registro de rutas y consolidar el contrato Swagger.
2. Definir la estrategia de autorización: RBAC simple por roles o permisos granulares.
3. Elegir una sola API de maestros y retirar duplicados con compatibilidad temporal.
4. Completar el ciclo de incidencias y decidir el nivel requerido de cadena de frío.
5. Confirmar reglas de negocio de recepción, unicidad de facturas y tasas de cambio.
6. Añadir pruebas de integración para compras, pagos, solicitudes, laboratorio, calidad y autorización.
7. Actualizar `README.md`, `docs/API.md` y `docs/ARCHITECTURE.md` a partir del contrato real.
8. Ejecutar `prisma migrate diff` contra el entorno PostgreSQL objetivo para verificar si la base desplegada coincide con `schema.prisma`.

## 12. Fuentes revisadas

- `backend/prisma/schema.prisma`
- `backend/prisma/seed.ts`
- `backend/prisma/migrations/`
- `backend/src/app.ts`
- `backend/src/routes/`
- `backend/src/controllers/`
- `backend/src/services/`
- `backend/src/middlewares/`
- `backend/src/config/swagger.ts`
- `backend/tests/`
- `frontend/src/app/`
- `frontend/src/services/`
- `README.md`
- `docs/API.md`
- `docs/ARCHITECTURE.md`
