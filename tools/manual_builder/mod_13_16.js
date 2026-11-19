// tools/manual_builder/mod_13_16.js
export const mod13to16Content = `
  <!-- MÓDULO 13: CALIDAD, INCIDENCIAS Y CUARENTENA -->
  <article class="module-card" id="modulo-calidad-cuarentena">
    <div class="module-header">
      <div class="module-category">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
        Seguridad Biológica
      </div>
      <h2 class="module-title">Módulo 13: Control de Calidad, Incidencias y Cuarentena</h2>
      <div class="module-route-banner">
        <span>Ruta URL: /quality/quarantine &bull; /coordinator/quarantine &bull; Roles: CALIDAD, LABORATORIO, ADMINISTRADOR</span>
      </div>
    </div>

    <p>
      El control de calidad hospitalario garantiza que ningún reactivo o lote con sospecha de contaminación, pérdida de cadena de frío o alteración en sus curvas de calibración sea suministrado a los pacientes.
    </p>

    <h3 class="section-heading">13.1 Tipos de Incidencias Técnicas sobre Lotes</h3>
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Tipo de Incidencia</th>
            <th>Código de Sistema</th>
            <th>Causa Raíz Típica</th>
            <th>Acción Inmediata</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="badge badge-danger">Falla Control Calidad</span></td>
            <td><code>FALLA_CONTROL_CALIDAD</code></td>
            <td>Controles positivos/negativos fuera del rango aceptable (&gt; 3 DE).</td>
            <td>Bloqueo automático del lote para diagnósticos.</td>
          </tr>
          <tr>
            <td><span class="badge badge-warning">Cadena de Frío Rota</span></td>
            <td><code>CADENA_FRIO_ROTA</code></td>
            <td>Corte de energía o fallo de compresión en cava/nevera (&gt; 8°C).</td>
            <td>Retención preventiva en cuarentena térmica.</td>
          </tr>
          <tr>
            <td><span class="badge badge-purple">Daño Físico</span></td>
            <td><code>DANO_FISICO</code></td>
            <td>Frasco agrietado, tapa con fuga o precinto violado.</td>
            <td>Inspección de integridad por el supervisor.</td>
          </tr>
          <tr>
            <td><span class="badge badge-danger">Contaminación / Precipitado</span></td>
            <td><code>CONTAMINACION_PRECIPITADO</code></td>
            <td>Turbidez inusual, precipitación proteica o crecimiento fúngico en vial.</td>
            <td>Descarte técnico inmediato y notificación a compras.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3 class="section-heading">13.2 Procedimiento de Dictamen Técnico de Cuarentena</h3>
    <ol class="step-flow">
      <li class="step-flow-item">
        <div class="step-number">1</div>
        <div class="step-content">
          <div class="step-title">Detección y Envío a Cuarentena</div>
          <p class="step-desc">Al detectar una anomalía, el analista o coordinador selecciona el lote y activa la opción <strong>"Poner en Cuarentena"</strong>. El estado del lote pasa de <code>DISPONIBLE</code> a <span class="badge badge-warning">EN_CUARENTENA</span> y queda bloqueado en todas las solicitudes y corridas analíticas.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">2</div>
        <div class="step-content">
          <div class="step-title">Evaluación Técnica y Pruebas Confirmatorias</div>
          <p class="step-desc">El personal de Calidad ejecuta pruebas con sueros de referencia conocidos o verifica el registro del registrador de temperatura (DataLogger).</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">3</div>
        <div class="step-content">
          <div class="step-title">Emisión del Dictamen Definitivo</div>
          <p class="step-desc">Desde <strong>/quality/quarantine</strong>, el supervisor emite la resolución formal:
            <ul>
              <li><strong>Liberar Lote:</strong> Si la prueba confirma que el reactivo está íntegro, se registra el informe de liberación y el lote retorna a <span class="badge badge-success">DISPONIBLE</span>.</li>
              <li><strong>Condenar Lote:</strong> Si se confirma el daño, se califica como <span class="badge badge-danger">DEFECTUOSO</span> o <span class="badge badge-purple">DESCARTADO</span>, procediendo al descarte definitivo y reclamo de garantía ante el proveedor.</li>
            </ul>
          </p>
        </div>
      </li>
    </ol>
  </article>

  <!-- MÓDULO 14: LABORATORIO CLÍNICO Y CADENA DE FRÍO -->
  <article class="module-card" id="modulo-laboratorio-frio">
    <div class="module-header">
      <div class="module-category">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2c1.1 0 2 .9 2 2v6.2c1.2.7 2 2 2 3.5 0 2.2-1.8 4-4 4s-4-1.8-4-4c0-1.5.8-2.8 2-3.5V4c0-1.1.9-2 2-2zm0 2h-1v6.7l-.4.2C9.6 11.4 9 12.6 9 13.7c0 1.7 1.3 3 3 3s3-1.3 3-3c0-1.1-.6-2.3-1.6-2.8l-.4-.2V4h-1v5h2V4h-1z"/></svg>
        Preservación y Frío
      </div>
      <h2 class="module-title">Módulo 14: Laboratorio Clínico y Cadena de Frío</h2>
      <div class="module-route-banner">
        <span>Ruta URL: /lab/fridges &bull; /laboratory/fridges &bull; /laboratory/consumption</span>
      </div>
    </div>

    <p>
      Este módulo gestiona la infraestructura de refrigeración biológica del instituto: neveras clínicas (2°C a 8°C), congeladores (-20°C) y ultracongeladores (-80°C). Cada equipo tiene su código único, su temperatura programada y el inventario fraccionado de frascos y viales alojados en su interior.
    </p>

    <h3 class="section-heading">14.1 Monitor de Neveras y Cavas Térmicas</h3>
    <p>
      En <strong>Laboratorio &gt; Neveras & Cadena de Frío</strong> se supervisa el parque de equipos. Cada tarjeta de nevera refleja:
    </p>
    <ul>
      <li><strong>Código Identificador:</strong> Código visible en la puerta del equipo (ej. <code>FRIDGE-INM-01</code>).</li>
      <li><strong>Temperatura Objetivo:</strong> Temperatura nominal asignada (ej. 4.00°C o -20.00°C).</li>
      <li><strong>Estado Operativo del Equipo:</strong> <span class="badge badge-success">OPERATIVO</span>, <span class="badge badge-warning">MANTENIMIENTO</span>, <span class="badge badge-danger">DEFECTUOSO</span> o <span class="badge badge-neutral">FUERA_DE_SERVICIO</span>.</li>
      <li><strong>Total de Frascos Almacenados:</strong> Contador de unidades biológicas en custodia.</li>
    </ul>

    <h3 class="section-heading">14.2 Ciclo de Vida del Frasco / Vial Individual (LabReagentUnit)</h3>
    <p>
      Cuando un lote de reactivos ingresa a laboratorio, se fracciona en unidades físicas individuales (<code>LabReagentUnit</code>), cada una identificada con un código de barras único:
    </p>

    <div class="flowchart">
      <div class="flow-node active-state">
        <strong>SELLADO</strong>
        <small>Frasco cerrado en nevera original</small>
      </div>
      <span class="flow-arrow">&rarr;</span>
      <div class="flow-node">
        <strong>EN_USO</strong>
        <small>Abierto en mesón analítico</small>
      </div>
      <span class="flow-arrow">&rarr;</span>
      <div class="flow-node">
        <strong>AGOTADO</strong>
        <small>Volumen / Usos restantes = 0</small>
      </div>
      <span class="flow-arrow">o</span>
      <div class="flow-node">
        <strong>DESCARTADO</strong>
        <small>Por vencimiento o contaminación</small>
      </div>
    </div>

    <div class="callout callout-info">
      <div class="callout-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      </div>
      <div class="callout-content">
        <div class="callout-title">Regla de Estabilidad Post-Apertura</div>
        <p>
          Al ejecutar la acción <strong>"Abrir Frasco"</strong> (<code>PATCH /api/lab/units/:id/open</code>), el sistema marca la fecha y hora exacta de apertura y el usuario responsable. A partir de ese momento, la vida útil efectiva se supedita a la estabilidad del reactivo reconstituido (ej. 30 días para conjugados de fluorescencia), alertando al bioanalista si se aproxima su degradación.
        </p>
      </div>
    </div>
  </article>

  <!-- MÓDULO 15: CORRIDAS ANALÍTICAS Y CONSUMO 5D -->
  <article class="module-card" id="modulo-corridas-laboratorio">
    <div class="module-header">
      <div class="module-category">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>
        Diagnóstico & Auditoría 5D
      </div>
      <h2 class="module-title">Módulo 15: Corridas Analíticas y Consumo en Laboratorio</h2>
      <div class="module-route-banner">
        <span>Ruta URL: /lab/runs &bull; /lab/runs/[id]/close &bull; Roles: BIOANALISTA, COORDINADOR_LABORATORIO</span>
      </div>
    </div>

    <p>
      En inmunología clínica diagnóstica, las muestras no se procesan una a una. Se agrupan en <strong>corridas semanales en bloque (batch testing)</strong>. Además, un kit de 96 pruebas nunca rinde para 96 pacientes debido a los pozos gastados en controles, calibradores y repeticiones. El ERP-IDI resuelve esto mediante el <strong>Motor de Auditoría en 5 Dimensiones</strong>.
    </p>

    <h3 class="section-heading">15.1 Las 5 Dimensiones del Consumo de Reactivos</h3>
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Dimensión</th>
            <th>Campo en Sistema</th>
            <th>Propósito Clínico</th>
            <th>Impacto en Costos</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>1. Determinaciones de Pacientes</strong></td>
            <td><code>patientUses</code></td>
            <td>Pruebas efectivas con resultado diagnóstico emitido.</td>
            <td>Unidades de facturación / servicio asistencial.</td>
          </tr>
          <tr>
            <td><strong>2. Calibradores</strong></td>
            <td><code>calibratorUses</code></td>
            <td>Pozos dedicados a la curva estándar de calibración.</td>
            <td>Costo absorbido proporcionalmente por la corrida.</td>
          </tr>
          <tr>
            <td><strong>3. Controles de Calidad</strong></td>
            <td><code>controlUses</code></td>
            <td>Pozos para control positivo, negativo y punto de corte.</td>
            <td>Requisito mandatorio de garantía analítica.</td>
          </tr>
          <tr>
            <td><strong>4. Repeticiones Técnicas</strong></td>
            <td><code>repeatUses</code></td>
            <td>Muestras repetidas por valor crítico o interferencia (lipemia/hemólisis).</td>
            <td>Auditoría de causa de repetición.</td>
          </tr>
          <tr>
            <td><strong>5. Merma Técnica / Purga</strong></td>
            <td><code>wasteUses</code></td>
            <td>Volumen muerto en mangueras de analizadores o purga de pipetas.</td>
            <td>Merma justificada de proceso analítico.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3 class="section-heading">15.2 Procedimiento de Cierre de Corrida y Costo Real por Paciente</h3>
    <ol class="step-flow">
      <li class="step-flow-item">
        <div class="step-number">1</div>
        <div class="step-content">
          <div class="step-title">Abrir la Corrida Semanal</div>
          <p class="step-desc">Al iniciar la semana de trabajo, el bioanalista crea la corrida para el examen respectivo (ej. <em>ELISA Anticuerpos Anti-ADN Doble Cadena</em>) desde <strong>/lab/runs</strong>.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">2</div>
        <div class="step-content">
          <div class="step-title">Acumular Muestras de Pacientes</div>
          <p class="step-desc">Durante la semana se asocian las solicitudes y pacientes atendidos que se procesarán en el lote analítico.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">3</div>
        <div class="step-content">
          <div class="step-title">Cierre de Corrida y Desglose 5D</div>
          <p class="step-desc">Al culminar el procesamiento físico en el lector de placas o citómetro, pulse <strong>"Cerrar Corrida"</strong> e introduzca:
            <ul>
              <li>Total de pacientes válidos diagnosticados (ej. 36 pacientes).</li>
              <li>Pozos de calibración (ej. 4 pozos).</li>
              <li>Pozos de control (ej. 2 pozos).</li>
              <li>Repeticiones técnicas justificadas (ej. 2 muestras dudosas).</li>
              <li>Merma de purga (ej. 2 pozos).</li>
              <li><strong>Total Deducido del Kit:</strong> 46 determinaciones.</li>
            </ul>
          </p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">4</div>
        <div class="step-content">
          <div class="step-title">Conciliación de Rendimiento y Costo Efectivo</div>
          <p class="step-desc">El sistema descuenta las 46 pruebas del saldo del frasco (<code>LabReagentUnit.remainingUses</code>) y calcula el <strong>Costo Efectivo Real por Paciente</strong>:
            <br>
            <code>Costo Real Paciente = (Total Determinaciones Deducidas &times; Costo Unitario) / Pacientes Válidos</code>
          </p>
        </div>
      </li>
    </ol>
  </article>

  <!-- MÓDULO 16: AUDITORÍA FÍSICA DE NEVERAS -->
  <article class="module-card" id="modulo-auditoria-neveras">
    <div class="module-header">
      <div class="module-category">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
        Inspección Física
      </div>
      <h2 class="module-title">Módulo 16: Auditoría Física de Neveras (Fridge Audit)</h2>
      <div class="module-route-banner">
        <span>Ruta URL: /coordinator/fridge-audit &bull; Roles: COORDINADOR_LABORATORIO, ADMINISTRADOR</span>
      </div>
    </div>

    <p>
      Para prevenir desviaciones entre el saldo lógico del software y la existencia física en las cavas, el Coordinador de Laboratorio realiza arqueos periódicos mediante la herramienta <strong>Fridge Audit</strong>.
    </p>

    <h3 class="section-heading">16.1 Flujo de Arqueo Físico y Conciliación</h3>
    <ol class="step-flow">
      <li class="step-flow-item">
        <div class="step-number">1</div>
        <div class="step-content">
          <div class="step-title">Seleccionar el Equipo de Frío</div>
          <p class="step-desc">En <strong>/coordinator/fridge-audit</strong>, seleccione la nevera clínica que se auditará físicamente.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">2</div>
        <div class="step-content">
          <div class="step-title">Cotejo Vial por Vial</div>
          <p class="step-desc">El sistema lista todos los frascos teóricos asignados a esa nevera. El auditor escanea o verifica visualmente cada frasco físico, confirmando su presencia y el volumen restante estimado.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">3</div>
        <div class="step-content">
          <div class="step-title">Registro de Discrepancias</div>
          <p class="step-desc">Si un frasco no aparece o su saldo difiere significativamente, el sistema marca el ítem como <span class="badge badge-warning">PENDING_ADJUSTMENT</span>.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">4</div>
        <div class="step-content">
          <div class="step-title">Cierre y Regularización</div>
          <p class="step-desc">El coordinador justifica la discrepancia (ej. <em>"Vial extraviado o desechado sin registrar"</em>) y emite el cierre del arqueo, actualizando de forma inmutable el libro de auditoría de laboratorio.</p>
        </div>
      </li>
    </ol>
  </article>
`;
