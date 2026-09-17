# API REST

## URLs locales

| Recurso      | URL                         |
| ------------ | --------------------------- |
| API base     | `http://localhost:3000/api` |
| Health check | `GET /health`               |
| Swagger UI   | `GET /docs`                 |
| OpenAPI JSON | `GET /docs.json`            |

Con el backend ejecutándose, abre `http://localhost:3000/api/docs` para consultar y probar los endpoints desde Swagger UI.

## Autenticación

Obtén un token con:

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@idi.ucv.ve",
  "password": "Admin1234!"
}
```

Envía el token en las operaciones protegidas:

```http
Authorization: Bearer <token>
```

El frontend lo gestiona automáticamente mediante su cliente Axios. Para scripts o Postman, configura el token como variable de colección después del login.

## Prefijos disponibles

| Prefijo       | Áreas                                     |
| ------------- | ----------------------------------------- |
| `/auth`       | Login y perfil actual.                    |
| `/users`      | Administración de usuarios y roles.       |
| `/catalog`    | Catálogos auxiliares.                     |
| `/products`   | Productos.                                |
| `/currencies` | Monedas y tasas.                          |
| `/suppliers`  | Proveedores.                              |
| `/orders`     | Compras y finanzas.                       |
| `/inventory`  | Inventario, lotes, alertas y movimientos. |
| `/requests`   | Solicitudes internas.                     |
| `/lab`        | Operaciones de laboratorio.               |
| `/reports`    | Reportes y dashboard.                     |
| `/exports`    | CSV de inventario y Kardex.               |

## Respuestas y errores

Las respuestas exitosas siguen la forma general documentada por `StandardResponse`. Los errores de validación incluyen `status`, `message` y una lista `errors` con campo y mensaje.

Ejemplo conceptual:

```json
{
  "status": "SUCCESS",
  "data": {}
}
```

Usa los esquemas y ejemplos de Swagger como fuente de verdad para payloads concretos. Los contratos pueden evolucionar durante el desarrollo del proyecto.

## Postman

La colección importable está en [backend/docs/erp-idi.postman_collection.json](../backend/docs/erp-idi.postman_collection.json). Para una sesión manual:

1. Inicia PostgreSQL, backend y seed.
2. Ejecuta login.
3. Copia el JWT en la variable de autorización de la colección.
4. Prueba primero health, catálogo e inventario antes de crear movimientos.

## Exportaciones

La API ofrece endpoints para descargar:

- Valorización de inventario por lote.
- Historial de transacciones de almacén (Kardex).

Ambas operaciones requieren autenticación y devuelven archivos CSV.
