// tools/manual_builder/mod_1_4.js
export const mod1to4Content = `
  <!-- MÓDULO 1: ACCESO, AUTENTICACIÓN Y PERFIL -->
  <article class="module-card" id="modulo-auth">
    <div class="module-header">
      <div class="module-category">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
        Seguridad Institucional
      </div>
      <h2 class="module-title">Módulo 1: Control de Acceso, Autenticación y Perfil</h2>
      <div class="module-route-banner">
        <span>Ruta URL: /login &bull; /settings/users &bull; Perfil en barra superior</span>
      </div>
    </div>

    <p>
      El módulo de autenticación gestiona la identidad digital de todos los miembros del instituto mediante tokens criptográficos portadores (JWT) firmados en HMAC SHA-256. El sistema garantiza que cada petición verifique la identidad del usuario y sus roles asignados antes de ejecutar cualquier transacción.
    </p>

    <h3 class="section-heading">1.1 Inicio de Sesión y Verificación de Identidad</h3>
    <ol class="step-flow">
      <li class="step-flow-item">
        <div class="step-number">1</div>
        <div class="step-content">
          <div class="step-title">Ingreso a la pantalla de acceso</div>
          <p class="step-desc">Abra su navegador web e ingrese a la dirección del sistema. Si no cuenta con una sesión activa, el sistema lo redirigirá inmediatamente a <code>/login</code>.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">2</div>
        <div class="step-content">
          <div class="step-title">Captura de credenciales</div>
          <p class="step-desc">Ingrese su nombre de usuario (<code>username</code>) o correo electrónico institucional y su contraseña. Haga clic en el botón <strong>"Iniciar Sesión"</strong>.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">3</div>
        <div class="step-content">
          <div class="step-title">Generación de sesión y redirección</div>
          <p class="step-desc">El servidor valida la contraseña mediante encriptación segura bcrypt. Si es correcta, emite el token de acceso, configura los datos de sesión en el almacenamiento local seguro y carga el <strong>Dashboard Principal</strong>.</p>
        </div>
      </li>
    </ol>

    <div class="callout callout-danger">
      <div class="callout-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
      </div>
      <div class="callout-content">
        <div class="callout-title">Expiración de Sesión y Auto-Logout Defensivo</div>
        <p>
          Por estrictas políticas de bioseguridad y confidencialidad clínica, el token tiene una vigencia estándar de <strong>8 horas</strong>. Al vencer o si el servidor detecta un código <code>401 Unauthorized</code>, el sistema purgará la sesión y redirigirá al formulario de acceso para evitar operaciones no autorizadas en estaciones de trabajo compartidas.
        </p>
      </div>
    </div>

    <h3 class="section-heading">1.2 Procedimiento de Cambio de Contraseña</h3>
    <p>
      Cualquier usuario autenticado puede actualizar su clave de acceso en cualquier momento desde el menú desplegable de su avatar en la esquina superior derecha:
    </p>
    <ol class="step-flow">
      <li class="step-flow-item">
        <div class="step-number">1</div>
        <div class="step-content">
          <div class="step-title">Abrir el modal de perfil</div>
          <p class="step-desc">Haga clic sobre su nombre o avatar en la barra superior y seleccione la opción <strong>"Cambiar Contraseña"</strong>.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">2</div>
        <div class="step-content">
          <div class="step-title">Validación de contraseña actual y nueva</div>
          <p class="step-desc">Debe ingresar su contraseña actual por seguridad, seguida de la nueva contraseña (mínimo 8 caracteres, alfanumérica recomendada) y su confirmación idéntica.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">3</div>
        <div class="step-content">
          <div class="step-title">Confirmación del cambio</div>
          <p class="step-desc">Haga clic en <strong>"Guardar Nueva Contraseña"</strong>. El sistema actualizará el hash criptográfico en la base de datos y mostrará un mensaje de éxito.</p>
        </div>
      </li>
    </ol>
  </article>

  <!-- MÓDULO 2: DASHBOARD EJECUTIVO -->
  <article class="module-card" id="modulo-dashboard">
    <div class="module-header">
      <div class="module-category">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>
        Centro de Operaciones
      </div>
      <h2 class="module-title">Módulo 2: Panel de Control Principal (Dashboard)</h2>
      <div class="module-route-banner">
        <span>Ruta URL: /dashboard &bull; Acceso: Todos los usuarios autenticados</span>
      </div>
    </div>

    <p>
      El Dashboard es la consola central del ERP-IDI. Consolida métricas operativas en tiempo real, alertas preventivas de caducidad y accesos directos para agilizar las rutinas de trabajo diarias.
    </p>

    <h3 class="section-heading">2.1 Indicadores Clave de Rendimiento (KPIs)</h3>
    <div class="grid-2">
      <div class="card-feature">
        <h5>Total Insumos en Catálogo</h5>
        <p>Número total de productos activos codificados en el catálogo institucional del IDI, distinguiendo entre consumibles y reactivos.</p>
      </div>
      <div class="card-feature">
        <h5>Valorización de Inventario</h5>
        <p>Monto financiero global del stock almacenado, calculado a costo promedio ponderado de compra expresado en USD y Bolívares.</p>
      </div>
      <div class="card-feature">
        <h5>Alertas de Stock Mínimo</h5>
        <p>Contador de reactivos cuya existencia total en almacén se encuentra por debajo de su punto de reorden configurado.</p>
      </div>
      <div class="card-feature">
        <h5>Lotes Críticos por Vencer</h5>
        <p>Lotes con fecha de caducidad en los próximos 30, 60 o 90 días, alertando al personal para priorizar su uso o tramitar descartes.</p>
      </div>
    </div>

    <h3 class="section-heading">2.2 Panel de Alertas Preventivas y Vencimientos</h3>
    <p>
      La tabla de alertas del dashboard aplica un sistema de <strong>semaforización automática</strong>:
    </p>
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nivel de Alerta</th>
            <th>Criterio Técnico</th>
            <th>Impacto Operativo</th>
            <th>Acción Recomendada</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="badge badge-danger">CRÍTICO (&lt; 30 días)</span></td>
            <td>El lote vence en menos de 30 días continuos.</td>
            <td>Riesgo inminente de merma financiera y descarte.</td>
            <td>Consumo inmediato en corridas analíticas prioritarias.</td>
          </tr>
          <tr>
            <td><span class="badge badge-warning">PREVENTIVO (30 - 60 días)</span></td>
            <td>El lote vence en el rango de 1 a 2 meses.</td>
            <td>Tiempo hábil para asignación y rotación FEFO.</td>
            <td>Verificar programación de solicitudes departamentales.</td>
          </tr>
          <tr>
            <td><span class="badge badge-info">STOCK BAJO</span></td>
            <td>Existencia física &le; Nivel Mínimo definido.</td>
            <td>Riesgo de rotura de stock y desabastecimiento.</td>
            <td>Generar Requisición de Compra al departamento de procura.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </article>

  <!-- MÓDULO 3: CATÁLOGO GENERAL DE INSUMOS Y REACTIVOS -->
  <article class="module-card" id="modulo-productos">
    <div class="module-header">
      <div class="module-category">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8 2h7v5h-7V4zm-7 0h5v8H5V4zm0 10h5v6H5v-6zm7 6v-9h7v9h-7z"/></svg>
        Inventario Base
      </div>
      <h2 class="module-title">Módulo 3: Catálogo General de Insumos y Reactivos</h2>
      <div class="module-route-banner">
        <span>Ruta URL: /inventory/products &bull; /inventory/products/new &bull; /inventory/products/[id]</span>
      </div>
    </div>

    <p>
      El catálogo centraliza la definición técnica de todos los bienes consumibles, reactivos analíticos, medios de cultivo, material médico-quirúrgico y papelería institucional. Constituye la columna vertebral para las compras, el inventario y los despachos.
    </p>

    <h3 class="section-heading">3.1 Alta de un Nuevo Producto en el Catálogo</h3>
    <ol class="step-flow">
      <li class="step-flow-item">
        <div class="step-number">1</div>
        <div class="step-content">
          <div class="step-title">Ingresar a la vista de creación</div>
          <p class="step-desc">En el menú lateral, diríjase a <strong>Inventario & Stock &gt; Catálogo & Lotes</strong> y haga clic en el botón superior derecho <strong>"+ Nuevo Insumo"</strong>.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">2</div>
        <div class="step-content">
          <div class="step-title">Diligenciar la información técnica del insumo</div>
          <p class="step-desc">Complete los campos requeridos conforme a la especificación técnica del fabricante o distribuidor médico.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">3</div>
        <div class="step-content">
          <div class="step-title">Guardar y codificar</div>
          <p class="step-desc">Haga clic en <strong>"Crear Producto"</strong>. El sistema verificará que el código SKU y el código de barras no existan previamente y registrará la ficha técnica.</p>
        </div>
      </li>
    </ol>

    <h3 class="section-heading">3.2 Diccionario de Campos de la Ficha de Producto</h3>
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Campo</th>
            <th>Tipo</th>
            <th>Obligatorio</th>
            <th>Regla de Negocio / Validación</th>
            <th>Descripción Operativa</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code class="field-name">name</code></td>
            <td>Texto</td>
            <td><span class="badge badge-danger">Sí</span></td>
            <td>Mínimo 3 caracteres, descriptivo único.</td>
            <td>Nombre comercial o denominación técnica (ej. <em>Kit ELISA Anti-TPO 96 Determinaciones</em>).</td>
          </tr>
          <tr>
            <td><code class="field-name">sku</code></td>
            <td>Texto</td>
            <td><span class="badge badge-danger">Sí</span></td>
            <td>Único en el sistema, alfanumérico en mayúsculas.</td>
            <td>Código institucional de inventario (ej. <code>REA-ELISA-0042</code>).</td>
          </tr>
          <tr>
            <td><code class="field-name">barcode</code></td>
            <td>Texto</td>
            <td>No</td>
            <td>Único si se suministra, formato EAN-13/Code-128.</td>
            <td>Código de barras impreso por el fabricante para lectura óptica por pistola láser.</td>
          </tr>
          <tr>
            <td><code class="field-name">categoryId</code></td>
            <td>Selector</td>
            <td><span class="badge badge-danger">Sí</span></td>
            <td>Debe existir en la tabla de Categorías.</td>
            <td>Clasificación funcional (ej. Inmunodiagnóstico, Biología Molecular, Consumibles de Vidrio).</td>
          </tr>
          <tr>
            <td><code class="field-name">brandId</code></td>
            <td>Selector</td>
            <td><span class="badge badge-danger">Sí</span></td>
            <td>Debe existir en la tabla de Marcas.</td>
            <td>Fabricante o casa comercial (ej. Bio-Rad, Roche, Sigma-Aldrich).</td>
          </tr>
          <tr>
            <td><code class="field-name">baseUnitId</code></td>
            <td>Selector</td>
            <td><span class="badge badge-danger">Sí</span></td>
            <td>Unidad mínima de consumo.</td>
            <td>Unidad de medida en la que se consume o despacha internamente (ej. Vial, Determinación, Mililitro).</td>
          </tr>
          <tr>
            <td><code class="field-name">purchaseUnitId</code></td>
            <td>Selector</td>
            <td><span class="badge badge-danger">Sí</span></td>
            <td>Unidad de presentación del proveedor.</td>
            <td>Presentación comercial de compra (ej. Caja x 96 determinaciones, Frasco x 500 ml, Bulto).</td>
          </tr>
          <tr>
            <td><code class="field-name">conversionFactor</code></td>
            <td>Decimal</td>
            <td><span class="badge badge-danger">Sí</span></td>
            <td>Mayor que 0 (ej. 96.00).</td>
            <td>Factor multiplicador para convertir 1 unidad de compra a unidades base en almacén.</td>
          </tr>
          <tr>
            <td><code class="field-name">isReagent</code></td>
            <td>Booleano</td>
            <td><span class="badge badge-danger">Sí</span></td>
            <td>Por defecto falso.</td>
            <td>Si se activa en <strong>VERDADERO</strong>, habilita la cadena de frío, trazabilidad de viales y corridas de laboratorio.</td>
          </tr>
          <tr>
            <td><code class="field-name">isTaxExempt</code></td>
            <td>Booleano</td>
            <td><span class="badge badge-danger">Sí</span></td>
            <td>Ley Orgánica de Salud / IVA.</td>
            <td>Exime de la alícuota del 16% de IVA en la emisión de órdenes de compra para reactivos médicos.</td>
          </tr>
          <tr>
            <td><code class="field-name">minStockAlert</code></td>
            <td>Numérico</td>
            <td><span class="badge badge-danger">Sí</span></td>
            <td>Entero &ge; 0.</td>
            <td>Nivel umbral que dispara las notificaciones preventivas de reposición en el Dashboard.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </article>

  <!-- MÓDULO 4: MAESTROS DEL SISTEMA -->
  <article class="module-card" id="modulo-maestros">
    <div class="module-header">
      <div class="module-category">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
        Configuración Base
      </div>
      <h2 class="module-title">Módulo 4: Maestros del Sistema y Configuración de Almacén</h2>
      <div class="module-route-banner">
        <span>Ruta URL: /inventory/settings &bull; /inventory/catalog &bull; Acceso: ADMINISTRADOR</span>
      </div>
    </div>

    <p>
      Este módulo permite estructurar las tablas maestras de datos de las cuales dependen las operaciones diarias. Proporciona la infraestructura clasificatoria y espacial para la trazabilidad.
    </p>

    <div class="grid-2">
      <div class="card-feature">
        <h5>Categorías de Insumos</h5>
        <p>Agrupaciones de nivel superior para organizar el catálogo institucional y generar balances valorizados por rubro (ej. Medios de Cultivo, Reactivos Serológicos, Descartables).</p>
      </div>
      <div class="card-feature">
        <h5>Marcas y Fabricantes</h5>
        <p>Directorio de casas comerciales fabricantes, necesario para evaluar el rendimiento técnico por proveedor en las auditorías analíticas de laboratorio.</p>
      </div>
      <div class="card-feature">
        <h5>Unidades de Medida</h5>
        <p>Definición de magnitudes físicas, abreviaturas normalizadas (ej. <code>ml</code>, <code>vial</code>, <code>caja</code>, <code>kit</code>) y factores de equivalencia volumétrica.</p>
      </div>
      <div class="card-feature">
        <h5>Ubicaciones Físicas (Location)</h5>
        <p>Estructuración espacial de las áreas de custodia física: Almacén Central, Estantes de Depósito, Mesones Analíticos y Cavas Térmicas.</p>
      </div>
    </div>

    <h3 class="section-heading">4.1 Tipos de Ubicación en el Sistema (LocationType)</h3>
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Tipo de Ubicación</th>
            <th>Código de Sistema</th>
            <th>Propósito Operativo</th>
            <th>Reglas de Custodia</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Almacén General</strong></td>
            <td><code>ALMACEN_GENERAL</code></td>
            <td>Área de recepción inicial, muelle de carga y custodia central de bultos cerrados.</td>
            <td>Custodia directa exclusiva del Almacenista.</td>
          </tr>
          <tr>
            <td><strong>Laboratorio</strong></td>
            <td><code>LABORATORIO</code></td>
            <td>Mesones de trabajo, bancos analíticos y cuartos de preparación de muestras.</td>
            <td>Área de consumo activo y fraccionamiento por analistas.</td>
          </tr>
          <tr>
            <td><strong>Depósito Seco</strong></td>
            <td><code>DEPOSITO</code></td>
            <td>Almacenamiento secundario para material no perecedero o papelería.</td>
            <td>Control periódico de stock por inventarios cíclicos.</td>
          </tr>
          <tr>
            <td><strong>Oficina Administrativa</strong></td>
            <td><code>OFICINA</code></td>
            <td>Destinos finales de consumibles de administración y suministros de oficina.</td>
            <td>No admite almacenamiento de reactivos clínicos.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </article>
`;
