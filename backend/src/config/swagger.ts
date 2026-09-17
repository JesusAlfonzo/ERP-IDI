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
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
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
    '/catalog/categories': {
      get: {
        tags: ['Catálogo Organizacional'],
        summary: 'Lista todas las categorías de insumos y reactivos',
        responses: { 200: { description: 'Lista de categorías' } },
      },
    },
    '/catalog/locations': {
      get: {
        tags: ['Catálogo Organizacional'],
        summary:
          'Lista las ubicaciones físicas y sus equipos asociados (neveras/cavas)',
        responses: { 200: { description: 'Lista de ubicaciones' } },
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
