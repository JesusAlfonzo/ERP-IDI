import { type SwaggerUiOptions } from 'swagger-ui-express';

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'ERP-IDI Backend API',
    version: '1.0.0',
    description:
      'API REST del Sistema de Gestión y Control de Inventarios para el Instituto de Inmunología Dr. Nicolás E. Bianco Colmenares (UCV).',
    contact: {
      name: 'Equipo de Desarrollo ERP-IDI',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000/api',
      description: 'Servidor Local de Desarrollo',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Introduce el token JWT obtenido en el login sin el prefijo "Bearer".',
      },
    },
    schemas: {
      StandardResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'SUCCESS' },
          data: { type: 'object' },
        },
      },
      ValidationErrorResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'VALIDATION_ERROR' },
          message: {
            type: 'string',
            example: 'Los datos enviados no son válidos',
          },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'items.0.quantity' },
                message: {
                  type: 'string',
                  example: 'La cantidad debe ser mayor a 0',
                },
              },
            },
          },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['identifier', 'password'],
        properties: {
          identifier: { type: 'string', example: 'admin' },
          password: { type: 'string', example: 'Admin1234!' },
        },
      },
      CreateBrandInput: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', example: 'Sigma-Aldrich' },
          description: {
            type: 'string',
            example: 'Reactivos químicos analíticos',
          },
        },
      },
      CreateUnitInput: {
        type: 'object',
        required: ['name', 'abbreviation'],
        properties: {
          name: { type: 'string', example: 'Mililitro' },
          abbreviation: { type: 'string', example: 'ml' },
        },
      },
      CreateLocationInput: {
        type: 'object',
        required: ['name', 'type'],
        properties: {
          name: { type: 'string', example: 'Laboratorio de Inmunología' },
          type: {
            type: 'string',
            enum: ['ALMACEN_GENERAL', 'LABORATORIO', 'OFICINA', 'DEPOSITO'],
            example: 'LABORATORIO',
          },
          description: {
            type: 'string',
            example: 'Área analítica de muestras',
          },
        },
      },
      CreateFridgeInput: {
        type: 'object',
        required: ['locationId', 'code', 'name'],
        properties: {
          locationId: { type: 'integer', example: 2 },
          code: { type: 'string', example: 'NEV-02' },
          name: { type: 'string', example: 'Nevera Reactivos Control' },
          targetTempCelsius: { type: 'number', example: 4.0 },
          description: {
            type: 'string',
            example: 'Custodia de reactivos de uso diario',
          },
        },
      },
      StockAdjustmentInput: {
        type: 'object',
        required: ['items'],
        properties: {
          notes: { type: 'string', example: 'Cuadre tras auditoría física' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['batchId', 'action', 'quantity'],
              properties: {
                batchId: { type: 'integer', example: 1 },
                action: {
                  type: 'string',
                  enum: ['INCREMENTO', 'DECREMENTO'],
                  example: 'INCREMENTO',
                },
                quantity: { type: 'number', example: 5 },
                reason: {
                  type: 'string',
                  example: 'Sobrante en conteo físico',
                },
              },
            },
          },
        },
      },
      DirectWasteInput: {
        type: 'object',
        required: ['wastes'],
        properties: {
          wastes: {
            type: 'array',
            items: {
              type: 'object',
              required: ['batchId', 'quantity', 'reason'],
              properties: {
                batchId: { type: 'integer', example: 1 },
                quantity: { type: 'number', example: 1 },
                reason: {
                  type: 'string',
                  example: 'Frasco fracturado durante transporte interno',
                },
              },
            },
          },
        },
      },
      BatchStatusUpdateInput: {
        type: 'object',
        required: ['status'],
        properties: {
          status: {
            type: 'string',
            enum: [
              'DISPONIBLE',
              'EN_CUARENTENA',
              'DEFECTUOSO',
              'AGOTADO',
              'VENCIDO',
            ],
            example: 'EN_CUARENTENA',
          },
          incidentType: {
            type: 'string',
            enum: [
              'FALLA_CADENA_FRIO',
              'CONTAMINACION_SOSPECHOSA',
              'FALLA_CONTROL_CALIDAD',
              'ROTURA_O_DANIO_FISICO',
              'OTRO',
            ],
            example: 'FALLA_CADENA_FRIO',
          },
          reason: {
            type: 'string',
            example: 'Alarma de temperatura en Cava Principal',
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/login': {
      post: {
        tags: ['Autenticación'],
        summary: 'Inicio de sesión departamental y entrega de token JWT',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginInput' },
            },
          },
        },
        responses: {
          200: { description: 'Autenticación satisfactoria' },
          401: { description: 'Credenciales inválidas' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Autenticación'],
        summary: 'Obtiene el perfil y roles del usuario autenticado',
        responses: {
          200: { description: 'Datos del usuario activo' },
          401: { description: 'No autorizado' },
        },
      },
    },
    '/inventory/masters/brands': {
      get: {
        tags: ['Maestros de Inventario'],
        summary: 'Lista todas las marcas comerciales registradas',
        responses: { 200: { description: 'Lista de marcas' } },
      },
      post: {
        tags: ['Maestros de Inventario'],
        summary: 'Registra una nueva marca comercial',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateBrandInput' },
            },
          },
        },
        responses: {
          201: { description: 'Marca creada' },
          400: { description: 'Nombre inválido o duplicado' },
        },
      },
    },
    '/inventory/masters/units': {
      get: {
        tags: ['Maestros de Inventario'],
        summary: 'Lista todas las unidades de medida',
        responses: { 200: { description: 'Lista de unidades' } },
      },
      post: {
        tags: ['Maestros de Inventario'],
        summary: 'Registra una nueva unidad de medida',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateUnitInput' },
            },
          },
        },
        responses: {
          201: { description: 'Unidad creada' },
          400: { description: 'Datos inválidos o abreviatura duplicada' },
        },
      },
    },
    '/inventory/masters/locations': {
      get: {
        tags: ['Maestros de Inventario'],
        summary: 'Lista las ubicaciones físicas y áreas departamentales',
        responses: { 200: { description: 'Lista de ubicaciones' } },
      },
      post: {
        tags: ['Maestros de Inventario'],
        summary: 'Registra una nueva ubicación física',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateLocationInput' },
            },
          },
        },
        responses: {
          201: { description: 'Ubicación creada' },
          400: { description: 'Tipo de área o nombre inválido' },
        },
      },
    },
    '/lab/fridges': {
      get: {
        tags: ['Laboratorio y Cadena de Frío'],
        summary: 'Lista todos los equipos de refrigeración (neveras/cavas)',
        parameters: [
          { name: 'locationId', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { 200: { description: 'Lista de equipos de frío' } },
      },
      post: {
        tags: ['Laboratorio y Cadena de Frío'],
        summary: 'Registra una nueva nevera, cava o congelador clínico',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateFridgeInput' },
            },
          },
        },
        responses: {
          201: { description: 'Nevera creada' },
          400: { description: 'Código duplicado o parámetros faltantes' },
        },
      },
    },
    '/lab/fridges/{id}/contents': {
      get: {
        tags: ['Laboratorio y Cadena de Frío'],
        summary:
          'Consulta los frascos y reactivos almacenados dentro de una nevera',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        responses: { 200: { description: 'Detalle de unidades en custodia' } },
      },
    },
    '/reports/dashboard': {
      get: {
        tags: ['Reportería y Dashboard'],
        summary: 'Obtiene métricas analíticas consolidadas para el dashboard',
        responses: {
          200: {
            description:
              'Métricas de inventario, vencimientos, laboratorio y compras',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StandardResponse' },
              },
            },
          },
        },
      },
    },
    '/exports/inventory-valuation': {
      get: {
        tags: ['Exportaciones'],
        summary:
          'Descarga CSV con la valorización detallada de existencias por lote',
        responses: {
          200: {
            description:
              'Archivo CSV descargable con codificación BOM para Excel',
            content: { 'text/csv': {} },
          },
        },
      },
    },
    '/exports/kardex': {
      get: {
        tags: ['Exportaciones'],
        summary:
          'Descarga CSV del historial completo de transacciones de almacén (Kardex)',
        responses: {
          200: {
            description: 'Archivo CSV descargable',
            content: { 'text/csv': {} },
          },
        },
      },
    },
    '/inventory/movements': {
      get: {
        tags: ['Inventario y Calidad'],
        summary: 'Consulta paginada del historial de movimientos de inventario',
        parameters: [
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 10 },
          },
          { name: 'batchId', in: 'query', schema: { type: 'integer' } },
          { name: 'type', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Lista paginada de movimientos' },
        },
      },
    },
    '/inventory/adjustments': {
      post: {
        tags: ['Inventario y Calidad'],
        summary: 'Ajuste manual de stock por conteo físico o corrección',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/StockAdjustmentInput' },
            },
          },
        },
        responses: {
          201: { description: 'Ajuste procesado' },
          400: {
            description: 'Error de validación',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ValidationErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/inventory/wastes': {
      post: {
        tags: ['Inventario y Calidad'],
        summary: 'Registro directo de mermas y descartes de almacén',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DirectWasteInput' },
            },
          },
        },
        responses: {
          201: { description: 'Merma procesada' },
        },
      },
    },
    '/inventory/batches/{id}/status': {
      patch: {
        tags: ['Inventario y Calidad'],
        summary:
          'Actualiza el estado de un lote y registra incidencia si entra en bloqueo',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BatchStatusUpdateInput' },
            },
          },
        },
        responses: {
          200: { description: 'Estado actualizado' },
        },
      },
    },
    '/suppliers': {
      get: {
        tags: ['Proveedores'],
        summary: 'Lista proveedores con filtro opcional de búsqueda',
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Lista de proveedores' } },
      },
    },
  },
};

export const swaggerUiOptions: SwaggerUiOptions = {
  customSiteTitle: 'Documentación API | ERP-IDI UCV',
};
