// tools/manual_builder/intro.js
export const introContent = `
  <!-- HERO INSTITUCIONAL -->
  <section class="manual-hero" id="seccion-introduccion">
    <span class="hero-tag">Documentación Oficial del Sistema</span>
    <h1>Manual de Usuario por Módulos ERP-IDI</h1>
    <p class="subtitle">
      Guía integral de operación, procedimientos paso a paso, reglas de negocio y catálogo de módulos del Sistema ERP del <strong>Instituto de Inmunología "Dr. Nicolás E. Bianco Colmenares" (IDI - UCV)</strong>.
    </p>
    <div class="hero-meta">
      <div class="hero-meta-item"><strong>Institución:</strong> IDI - Universidad Central de Venezuela</div>
      <div class="hero-meta-item"><strong>Versión del Sistema:</strong> ERP-IDI v2.5 Enterprise</div>
      <div class="hero-meta-item"><strong>Enfoque:</strong> Operativo por Módulo Funcional</div>
      <div class="hero-meta-item"><strong>Formato:</strong> HTML5 / CSS Puro Autónomo</div>
    </div>
  </section>

  <!-- PRINCIPIOS Y ARQUITECTURA TRANSVERSAL -->
  <article class="module-card" id="modulo-principios">
    <div class="module-header">
      <div class="module-category">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        Arquitectura & Marco Operativo
      </div>
      <h2 class="module-title">Principios Transversales del Sistema</h2>
      <div class="module-route-banner">
        <span>Alcance Institucional Hospitalario, Académico y Científico</span>
      </div>
    </div>

    <p>
      El <strong>ERP-IDI</strong> ha sido concebido para resolver las demandas altamente especializadas de un centro de referencia nacional que combina la <strong>atención asistencial y diagnóstico inmunológico a pacientes</strong> con la <strong>investigación biomédica de posgrado y docencia universitaria</strong>. A diferencia de un sistema comercial convencional, el ERP-IDI opera bajo cinco principios rectores obligatorios:
    </p>

    <div class="grid-2">
      <div class="card-feature">
        <h5>1. Cadena de Frío Estricta (-80°C, -20°C, 2°C a 8°C)</h5>
        <p>
          Los reactivos (anticuerpos monoclonales, sustratos enzimáticos, cebadores y conjugados) sufren inactivación biológica irreversible ante variaciones térmicas. Cada vial cuenta con asignación física obligatoria a una cava o nevera clínica con monitoreo de estatus operativo.
        </p>
      </div>
      <div class="card-feature">
        <h5>2. Despacho FEFO (First Expired, First Out)</h5>
        <p>
          Tanto en el Almacén General como en las cavas de laboratorio, las solicitudes y los consumos priorizan automáticamente los lotes o viales cuya fecha de vencimiento esté más próxima a expirar, evitando mermas por caducidad en anaquel.
        </p>
      </div>
      <div class="card-feature">
        <h5>3. Segregación Clínico-Asistencial vs. Investigación (I+D)</h5>
        <p>
          Los insumos adquiridos mediante proyectos de investigación (FONACIT, OPS, subvenciones) o donaciones institucionales cuentan con <strong>blindaje a nivel de base de datos</strong>: el sistema prohíbe terminantemente su consumo en la rutina de diagnóstico clínico para evitar desvíos presupuestarios.
        </p>
      </div>
      <div class="card-feature">
        <h5>4. Operación Bimoneda Integrada (USD / VES / EUR)</h5>
        <p>
          Las órdenes de compra, deudas con proveedores, facturaciones y pagos amortizados permiten registro simultáneo en divisas (USD/EUR) y moneda nacional (Bolívares), aplicando de forma auditable la tasa oficial del Banco Central de Venezuela (BCV) correspondiente a la fecha de cada transacción.
        </p>
      </div>
    </div>

    <div class="callout callout-warning">
      <div class="callout-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
      </div>
      <div class="callout-content">
        <div class="callout-title">Regla de la Ventana Operativa Semanal</div>
        <p>
          Para mantener la disciplina logística del Almacén Central y garantizar la preparación técnica de los materiales, las solicitudes departamentales de insumos <strong>solo pueden radicarse dentro del horario programado por la Dirección</strong> (ej. lunes a miércoles de 08:00 a 16:00). Fuera de dicha ventana, el sistema bloquea los nuevos pedidos.
        </p>
      </div>
    </div>

    <h3 class="section-heading">Estructura Global de Navegación de la Interfaz</h3>
    <p>
      La aplicación web del ERP-IDI se organiza mediante una barra de navegación superior fija y un menú lateral categorizado que se adapta de manera dinámica a los privilegios del usuario:
    </p>

    <div class="flowchart">
      <div class="flow-node">
        <strong>Barra Superior</strong>
        <small>Identidad UCV / IDI, Notificaciones y Menú de Usuario</small>
      </div>
      <span class="flow-arrow">&rarr;</span>
      <div class="flow-node">
        <strong>Menú Lateral (Sidebar)</strong>
        <small>Agrupaciones temáticas por proceso de negocio</small>
      </div>
      <span class="flow-arrow">&rarr;</span>
      <div class="flow-node active-state">
        <strong>Espacio de Trabajo</strong>
        <small>Formularios, Tablas dinámicas, Modales y Reportes</small>
      </div>
    </div>
  </article>
`;
