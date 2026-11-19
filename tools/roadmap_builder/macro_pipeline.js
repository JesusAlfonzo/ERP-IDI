// tools/roadmap_builder/macro_pipeline.js
export const macroPipeline = `
  <!-- HERO INTRODUCTORIO -->
  <section class="roadmap-hero">
    <span class="hero-pill">Arquitectura & Flujo Funcional de Procesos</span>
    <h2>Roadmap y Flujo Operativo Integral ERP-IDI</h2>
    <p class="lead">
      Representación visual interactiva del ciclo de vida de los datos, insumos médicos y reactivos analíticos a través de todos los módulos del sistema en el <strong>Instituto de Inmunología "Dr. Nicolás E. Bianco Colmenares" (IDI - UCV)</strong>. Conozca cómo cada módulo alimenta al siguiente en una cadena ininterrumpida de trazabilidad.
    </p>

    <div class="hero-stats-row">
      <div class="hero-stat-card">
        <div class="stat-number">8</div>
        <div class="stat-label">Fases de Negocio</div>
      </div>
      <div class="hero-stat-card">
        <div class="stat-number">19</div>
        <div class="stat-label">Módulos Interconectados</div>
      </div>
      <div class="hero-stat-card">
        <div class="stat-number">100%</div>
        <div class="stat-label">Trazabilidad FEFO & 5D</div>
      </div>
      <div class="hero-stat-card">
        <div class="stat-number">Bimoneda</div>
        <div class="stat-label">USD / VES Oficial BCV</div>
      </div>
    </div>
  </section>

  <!-- MAPA MACRO DE CARRILES FUNCIONALES (SWIMLANES) -->
  <section class="macro-architecture-section" id="macro-mapa">
    <div class="section-header-box">
      <h3>
        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/></svg>
        Mapa Visual Macro: Interconexión por Carriles Operativos
      </h3>
      <p>Vista panorámica de cómo interactúan los 6 ámbitos del sistema y cómo viaja la información entre ellos.</p>
    </div>

    <div class="swimlanes-container">
      <!-- Carril 1: Gobernanza -->
      <div class="swimlane">
        <div class="swimlane-header lane-gov">
          <h4>1. Gobernanza & Maestros</h4>
          <span class="lane-role">ADMINISTRADOR</span>
        </div>
        <div class="swimlane-body">
          <div class="p-node">
            <div class="p-node-title">Usuarios & RBAC <span class="badge badge-gray">Users</span></div>
            <span class="p-node-route">/admin/users</span>
            <div class="p-node-status"><span class="badge badge-green">Activo</span></div>
          </div>
          <span class="p-connector">&rarr;</span>
          <div class="p-node">
            <div class="p-node-title">Ventana Semanal <span class="badge badge-amber">Política</span></div>
            <span class="p-node-route">/admin/security</span>
            <div class="p-node-status"><span class="badge badge-blue">Horario Wxx</span></div>
          </div>
          <span class="p-connector">&rarr;</span>
          <div class="p-node">
            <div class="p-node-title">Catálogo & Maestros <span class="badge badge-purple">Insumos</span></div>
            <span class="p-node-route">/inventory/products</span>
            <div class="p-node-status"><span class="badge badge-green">SKU / Factor</span></div>
          </div>
        </div>
      </div>

      <!-- Carril 2: Procura & Finanzas -->
      <div class="swimlane">
        <div class="swimlane-header lane-proc">
          <h4>2. Procura & Finanzas</h4>
          <span class="lane-role">COMPRAS / ADMIN</span>
        </div>
        <div class="swimlane-body">
          <div class="p-node">
            <div class="p-node-title">Requisición <span class="badge badge-amber">Preorden</span></div>
            <span class="p-node-route">/purchasing/requisitions</span>
            <div class="p-node-status"><span class="badge badge-blue">EN_COTIZACION</span></div>
          </div>
          <span class="p-connector">&rarr;</span>
          <div class="p-node">
            <div class="p-node-title">Orden de Compra <span class="badge badge-blue">Oficial</span></div>
            <span class="p-node-route">/purchasing/orders</span>
            <div class="p-node-status"><span class="badge badge-green">ENVIADA USD/Bs</span></div>
          </div>
          <span class="p-connector">&rarr;</span>
          <div class="p-node">
            <div class="p-node-title">Cuentas por Pagar <span class="badge badge-purple">Deudas</span></div>
            <span class="p-node-route">/purchasing/debts</span>
            <div class="p-node-status"><span class="badge badge-amber">Amortización</span></div>
          </div>
        </div>
      </div>

      <!-- Carril 3: Almacén Central & Kardex -->
      <div class="swimlane">
        <div class="swimlane-header lane-wh">
          <h4>3. Almacén & Kardex</h4>
          <span class="lane-role">ALMACENISTA</span>
        </div>
        <div class="swimlane-body">
          <div class="p-node">
            <div class="p-node-title">Recepción Muelle <span class="badge badge-green">Física</span></div>
            <span class="p-node-route">/purchasing/orders/:id/receive</span>
            <div class="p-node-status"><span class="badge badge-blue">Lote & Vencimiento</span></div>
          </div>
          <span class="p-connector">&rarr;</span>
          <div class="p-node">
            <div class="p-node-title">Lotes en Stock <span class="badge badge-blue">StockBatch</span></div>
            <span class="p-node-route">/inventory/products/[id]</span>
            <div class="p-node-status"><span class="badge badge-green">DISPONIBLE</span></div>
          </div>
          <span class="p-connector">&rarr;</span>
          <div class="p-node">
            <div class="p-node-title">Kardex Central <span class="badge badge-gray">Asientos</span></div>
            <span class="p-node-route">/inventory/kardex</span>
            <div class="p-node-status"><span class="badge badge-purple">ENTRADA_COMPRA</span></div>
          </div>
        </div>
      </div>

      <!-- Carril 4: Departamentos Solicitantes -->
      <div class="swimlane">
        <div class="swimlane-header lane-dept">
          <h4>4. Solicitantes & Servicios</h4>
          <span class="lane-role">SOLICITANTE / JEFES</span>
        </div>
        <div class="swimlane-body">
          <div class="p-node">
            <div class="p-node-title">Ventana Semanal <span class="badge badge-green">Validación</span></div>
            <span class="p-node-route">/requests</span>
            <div class="p-node-status"><span class="badge badge-blue">Cuota de Usuario</span></div>
          </div>
          <span class="p-connector">&rarr;</span>
          <div class="p-node">
            <div class="p-node-title">Solicitud Interna <span class="badge badge-amber">Pedido</span></div>
            <span class="p-node-route">/requests/new</span>
            <div class="p-node-status"><span class="badge badge-amber">PENDIENTE</span></div>
          </div>
          <span class="p-connector">&rarr;</span>
          <div class="p-node">
            <div class="p-node-title">Despacho Físico <span class="badge badge-green">Salida</span></div>
            <span class="p-node-route">/requests/dispatch</span>
            <div class="p-node-status"><span class="badge badge-green">DESPACHO_SOLICITUD</span></div>
          </div>
        </div>
      </div>

      <!-- Carril 5: Laboratorio Clínico & Cadena de Frío -->
      <div class="swimlane">
        <div class="swimlane-header lane-lab">
          <h4>5. Laboratorio & Frío</h4>
          <span class="lane-role">BIOANALISTA / COORD</span>
        </div>
        <div class="swimlane-body">
          <div class="p-node">
            <div class="p-node-title">Neveras Clínicas <span class="badge badge-blue">Cavas</span></div>
            <span class="p-node-route">/lab/fridges</span>
            <div class="p-node-status"><span class="badge badge-green">2°C a 8°C / -20°C</span></div>
          </div>
          <span class="p-connector">&rarr;</span>
          <div class="p-node">
            <div class="p-node-title">Frascos / Viales <span class="badge badge-purple">LabReagentUnit</span></div>
            <span class="p-node-route">/lab/requests</span>
            <div class="p-node-status"><span class="badge badge-blue">SELLADO &rarr; EN_USO</span></div>
          </div>
          <span class="p-connector">&rarr;</span>
          <div class="p-node">
            <div class="p-node-title">Corridas Semanales <span class="badge badge-green">Ensayos</span></div>
            <span class="p-node-route">/lab/runs</span>
            <div class="p-node-status"><span class="badge badge-green">Auditoría 5D</span></div>
          </div>
        </div>
      </div>

      <!-- Carril 6: Investigación & Docencia -->
      <div class="swimlane">
        <div class="swimlane-header lane-sci">
          <h4>6. Investigación (I+D)</h4>
          <span class="lane-role">INVESTIGADOR / DOCENTE</span>
        </div>
        <div class="swimlane-body">
          <div class="p-node">
            <div class="p-node-title">Proyectos Subvencionados <span class="badge badge-purple">Tesis</span></div>
            <span class="p-node-route">/research/projects</span>
            <div class="p-node-status"><span class="badge badge-blue">FONACIT / OPS</span></div>
          </div>
          <span class="p-connector">&rarr;</span>
          <div class="p-node">
            <div class="p-node-title">Donaciones Blindadas <span class="badge badge-red">Blindaje</span></div>
            <span class="p-node-route">/research/donations</span>
            <div class="p-node-status"><span class="badge badge-red">Anti-Uso Clínico</span></div>
          </div>
          <span class="p-connector">&rarr;</span>
          <div class="p-node">
            <div class="p-node-title">Bitácora de Ensayos <span class="badge badge-green">Hallazgos</span></div>
            <span class="p-node-route">/research/trials</span>
            <div class="p-node-status"><span class="badge badge-green">Reporte Científico</span></div>
          </div>
        </div>
      </div>
    </div>
  </section>
`;
