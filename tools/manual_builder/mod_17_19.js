// tools/manual_builder/mod_17_19.js
export const mod17to19Content = `
  <!-- MÓDULO 17: INVESTIGACIÓN Y DOCENCIA (I+D) -->
  <article class="module-card" id="modulo-investigacion-docencia">
    <div class="module-header">
      <div class="module-category">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M4.5 10.5C3.67 10.5 3 11.17 3 12s.67 1.5 1.5 1.5h15c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5h-15z"/></svg>
        Ciencia y Posgrado
      </div>
      <h2 class="module-title">Módulo 17: Investigación Científica, Docencia y Donaciones (I+D)</h2>
      <div class="module-route-banner">
        <span>Ruta URL: /research/projects &bull; /research/donations &bull; /research/trials</span>
      </div>
    </div>

    <p>
      El IDI desarrolla proyectos de investigación biomédica financiados por subvenciones científicas (OPS, FONACIT, convenios universitarios). Este módulo garantiza la <strong>segregación estricta del financiamiento, blindaje de reactivos donados y bitácora formal de ensayos de laboratorio</strong>.
    </p>

    <h3 class="section-heading">17.1 Proyectos de Investigación y Presupuestos</h3>
    <p>
      En <strong>Investigación &gt; Proyectos & Presupuesto</strong> (<code>/research/projects</code>), los directores de línea registran las líneas de indagación. Cada proyecto define:
    </p>
    <ul>
      <li><strong>Tipo de Proyecto:</strong>
        <span class="badge badge-info">EXPERIMENTAL_DEVELOPMENT</span>, 
        <span class="badge badge-purple">CLINICAL_VALIDATION</span>, 
        <span class="badge badge-success">ACADEMIC_THESIS</span> (Tesis de Maestría/Doctorado), 
        <span class="badge badge-warning">PILOT_STUDY</span> o 
        <span class="badge badge-neutral">QUALITY_ASSURANCE</span>.
      </li>
      <li><strong>Presupuesto Estimado y Fechas:</strong> Monto total adjudicado en divisas, fecha de inicio y fecha prevista de culminación.</li>
      <li><strong>Investigador Principal:</strong> Custodio académico responsable de la ejecución técnica.</li>
    </ul>

    <h3 class="section-heading">17.2 Donaciones y Stock Blindado</h3>
    <div class="callout callout-danger">
      <div class="callout-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
      </div>
      <div class="callout-content">
        <div class="callout-title">Blindaje Anti-Consumo Asistencial</div>
        <p>
          Los insumos registrados en el módulo de donaciones (<code>/research/donations</code>) quedan etiquetados en la base de datos con el flag <code>ownershipType: RESEARCH_PROJECT</code>. Si un bioanalista intenta incluir un frasco de donación en una corrida clínica asistencial ordinaria, el servidor rechazará la transacción con error bloqueante: <em>"La unidad seleccionada pertenece a un proyecto de investigación y no puede consumirse en rutina clínica de pacientes"</em>.
        </p>
      </div>
    </div>

    <h3 class="section-heading">17.3 Bitácora de Ensayos Experimentales y Hallazgos</h3>
    <p>
      En <strong>/research/trials</strong>, el equipo científico documenta sus experimentos:
    </p>
    <ol class="step-flow">
      <li class="step-flow-item">
        <div class="step-number">1</div>
        <div class="step-content">
          <div class="step-title">Creación del Ensayo</div>
          <p class="step-desc">Se vincula el ensayo al proyecto de investigación, indicando título experimental, objetivo técnico y fecha de ejecución.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">2</div>
        <div class="step-content">
          <div class="step-title">Ejecución y Deducción de Reactivos</div>
          <p class="step-desc">Se registran las muestras analizadas y se descuenta el volumen consumido de los frascos asignados exclusivamente a la subvención.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">3</div>
        <div class="step-content">
          <div class="step-title">Registro de Hallazgos y Cierre</div>
          <p class="step-desc">Se redactan los hallazgos biológicos, interpretaciones estadísticas y conclusiones para respaldo de las publicaciones científicas.</p>
        </div>
      </li>
    </ol>
  </article>

  <!-- MÓDULO 18: REPORTES Y TRAZABILIDAD -->
  <article class="module-card" id="modulo-reportes-trazabilidad">
    <div class="module-header">
      <div class="module-category">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
        Auditoría y Analítica
      </div>
      <h2 class="module-title">Módulo 18: Generador de Reportes, Trazabilidad y Exportaciones</h2>
      <div class="module-route-banner">
        <span>Ruta URL: /inventory/reports &bull; /admin/reports/traceability &bull; /lab/reports</span>
      </div>
    </div>

    <p>
      El sistema cuenta con un generador de analítica multicriterio y herramientas de trazabilidad que satisfacen los requerimientos de la Contraloría Interna de la UCV y los comités bioéticos.
    </p>

    <h3 class="section-heading">18.1 Constructor de Reportes Personalizados de Inventario</h3>
    <p>
      En <strong>Inventario &gt; Generador de Reportes</strong> (<code>/inventory/reports</code>), el usuario puede combinar filtros para construir consultas específicas:
    </p>
    <ul>
      <li>Filtro por Tipo de Movimiento (entradas, compras, traslados, ajustes, mermas).</li>
      <li>Filtro por Rango de Fechas (desde / hasta con selector de calendario).</li>
      <li>Filtro por Almacén o Ubicación Física de custodia.</li>
      <li>Filtro por Categoría de Insumo y Producto Específico.</li>
    </ul>

    <h3 class="section-heading">18.2 Trazabilidad Punta a Punta (End-to-End Traceability)</h3>
    <p>
      En <strong>/admin/reports/traceability</strong>, la dirección puede introducir el código de cualquier frasco o número de lote y reconstruir su árbol genealógico completo en un solo clic:
    </p>
    <div class="flowchart">
      <div class="flow-node">
        <strong>Orden de Compra</strong>
        <small>Proveedor, Cotización, Tasa BCV</small>
      </div>
      <span class="flow-arrow">&rarr;</span>
      <div class="flow-node">
        <strong>Factura Comercial</strong>
        <small>N° Control SENIAT, Comprobante</small>
      </div>
      <span class="flow-arrow">&rarr;</span>
      <div class="flow-node">
        <strong>Recepción Muelle</strong>
        <small>Lote físico, Vencimiento, Almacén</small>
      </div>
      <span class="flow-arrow">&rarr;</span>
      <div class="flow-node">
        <strong>Despacho a Frío</strong>
        <small>Asignación a Nevera Clínica</small>
      </div>
      <span class="flow-arrow">&rarr;</span>
      <div class="flow-node active-state">
        <strong>Corrida Analítica</strong>
        <small>Bioanalista, Pacientes, Costo Real</small>
      </div>
    </div>

    <h3 class="section-heading">18.3 Exportaciones Oficiales a Formato CSV</h3>
    <p>
      Todas las tablas maestras de datos, el libro diario de Kardex y los balances consolidados disponen de botones de <strong>"Exportar CSV"</strong>. Los archivos generados son compatibles con Microsoft Excel, LibreOffice Calc y software de análisis estadístico R/SPSS.
    </p>
  </article>

  <!-- MÓDULO 19: ADMINISTRACIÓN Y SEGURIDAD -->
  <article class="module-card" id="modulo-administracion-usuarios">
    <div class="module-header">
      <div class="module-category">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
        Gobernanza del Sistema
      </div>
      <h2 class="module-title">Módulo 19: Administración, Seguridad y Usuarios</h2>
      <div class="module-route-banner">
        <span>Ruta URL: /admin/users &bull; /admin/security &bull; Acceso: ADMINISTRADOR</span>
      </div>
    </div>

    <p>
      Este módulo es de uso reservado exclusivo para la Dirección y los Administradores de Tecnología del IDI. Permite gestionar el ciclo de vida de los usuarios institucionales y gobernar las políticas de la ventana semanal de solicitudes.
    </p>

    <h3 class="section-heading">19.1 Gestión Integral de Cuentas de Usuario</h3>
    <ol class="step-flow">
      <li class="step-flow-item">
        <div class="step-number">1</div>
        <div class="step-content">
          <div class="step-title">Creación de Nuevo Usuario</div>
          <p class="step-desc">Desde <strong>Configuración del Sistema &gt; Usuarios y Accesos</strong>, pulse <strong>"+ Nuevo Usuario"</strong>. Ingrese nombre completo, correo institucional, departamento de adscripción y contraseña inicial temporal.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">2</div>
        <div class="step-content">
          <div class="step-title">Asignación de Roles del Sistema (RBAC)</div>
          <p class="step-desc">Un usuario puede tener uno o múltiples roles concurrentes conforme a su perfil laboral:
            <ul>
              <li><code>ADMINISTRADOR</code>: Control total institucional.</li>
              <li><code>COMPRAS</code>: Procura, cotizaciones, órdenes de compra y deudas.</li>
              <li><code>ALMACENISTA</code>: Custodia del almacén, recepciones, aprobaciones y despachos Kardex.</li>
              <li><code>ANALISTA_LABORATORIO</code> / <code>BIOANALISTA</code>: Gestión de viales en frío, consumos y corridas.</li>
              <li><code>COORDINADOR_LABORATORIO</code>: Aprobación FEFO, auditorías de neveras y cuarentenas.</li>
              <li><code>INVESTIGACION</code> / <code>DOCENCIA</code>: Proyectos científicos, ensayos y donaciones.</li>
              <li><code>SOLICITANTE</code>: Radicación de pedidos departamentales en ventana activa.</li>
            </ul>
          </p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">3</div>
        <div class="step-content">
          <div class="step-title">Blanqueo de Contraseña y Desactivación</div>
          <p class="step-desc">El administrador puede blanquear la contraseña de un usuario que la haya extraviado o suspender temporalmente el acceso con el conmutador de estado <code>isActive</code> sin borrar su historial transaccional de auditoría.</p>
        </div>
      </li>
    </ol>

    <h3 class="section-heading">19.2 Configuración de la Ventana Operativa Semanal</h3>
    <p>
      En <strong>Configuración del Sistema &gt; Seguridad y Auditoría Técnica</strong> (<code>/admin/security</code>), el Administrador programa el horario de servicio del almacén:
    </p>
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Parámetro</th>
            <th>Tipo</th>
            <th>Ejemplo de Configuración</th>
            <th>Impacto en los Solicitantes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Día y Hora de Inicio</strong></td>
            <td>Día (1-7) y Hora/Min</td>
            <td>Lunes a las 08:00 AM</td>
            <td>Apertura automática de la recepción de solicitudes.</td>
          </tr>
          <tr>
            <td><strong>Día y Hora de Cierre</strong></td>
            <td>Día (1-7) y Hora/Min</td>
            <td>Miércoles a las 16:00 PM</td>
            <td>Cierre automático de la recepción; el sistema no admite más envíos.</td>
          </tr>
          <tr>
            <td><strong>Límite Semanal por Usuario</strong></td>
            <td>Entero &ge; 1</td>
            <td>2 solicitudes por ciclo semanal</td>
            <td>Evita saturación de pedidos fragmentados por una misma sección.</td>
          </tr>
          <tr>
            <td><strong>Suspensión de Emergencia</strong></td>
            <td>Conmutador Booleano</td>
            <td>Activo / Inactivo</td>
            <td>Permite congelar la ventana de forma extraordinaria por toma física de inventario general.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </article>
`;
