// tools/manual_builder/mod_9_12.js
export const mod9to12Content = `
  <!-- MÓDULO 9: SOLICITUDES INTERNAS Y VENTANA SEMANAL -->
  <article class="module-card" id="modulo-solicitudes-internas">
    <div class="module-header">
      <div class="module-category">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
        Abastecimiento Departamental
      </div>
      <h2 class="module-title">Módulo 9: Solicitudes Internas y Ventana Operativa Semanal</h2>
      <div class="module-route-banner">
        <span>Ruta URL: /requests &bull; /requests/new &bull; /requests/[id]</span>
      </div>
    </div>

    <p>
      El abastecimiento de insumos a los departamentos clínicos, docentes y de investigación no se ejecuta de forma arbitraria o caótica. El ERP-IDI implementa una <strong>Ventana Operativa Semanal Programada</strong> para coordinar la reposición regular de materiales hacia las secciones técnicas del IDI.
    </p>

    <div class="callout callout-warning">
      <div class="callout-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
      </div>
      <div class="callout-content">
        <div class="callout-title">Reglas de la Ventana Operativa Semanal</div>
        <p>
          Las solicitudes están sujetas a validación de fecha y hora del servidor (Zona Horaria <code>America/Caracas</code>):
          <ul>
            <li><strong>Estado Activo:</strong> Solo se admiten nuevas solicitudes cuando el indicador de ventana muestra <span class="badge badge-success">VENTANA ABIERTA</span>.</li>
            <li><strong>Cuota Semanal:</strong> Cada usuario solicitante cuenta con un límite máximo parametrizado de solicitudes por ciclo semanal (ej. máximo 2 solicitudes en el ciclo <code>2026-W46</code>).</li>
            <li><strong>Ventana Cerrada o Suspendida:</strong> Si la ventana está cerrada o suspendida por inventario general, el botón de radicación quedará bloqueado y la API rechazará cualquier petición con error <code>400 Bad Request</code>.</li>
          </ul>
        </p>
      </div>
    </div>

    <h3 class="section-heading">9.1 Cómo Radicar una Solicitud Departamental</h3>
    <ol class="step-flow">
      <li class="step-flow-item">
        <div class="step-number">1</div>
        <div class="step-content">
          <div class="step-title">Verificar la Ventana Operativa</div>
          <p class="step-desc">Ingrese a <strong>Solicitudes Internas &gt; Pedidos a Almacén General</strong> y verifique en la tarjeta informativa que la ventana esté activa y cuál es su cuota semanal restante.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">2</div>
        <div class="step-content">
          <div class="step-title">Iniciar la Solicitud</div>
          <p class="step-desc">Haga clic en <strong>"+ Nueva Solicitud"</strong>. Se abrirá el formulario de requisición departamental.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">3</div>
        <div class="step-content">
          <div class="step-title">Indicar Prioridad y Justificación de Uso</div>
          <p class="step-desc">Seleccione el nivel de prioridad (<span class="badge badge-info">BAJA</span>, <span class="badge badge-neutral">RUTINA</span> o <span class="badge badge-danger">URGENTE</span>) y redacte una justificación clara de necesidad para su servicio técnico o laboratorio.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">4</div>
        <div class="step-content">
          <div class="step-title">Seleccionar los Insumos requeridos</div>
          <p class="step-desc">Busque los productos en el catálogo, verifique la existencia física actual disponible en almacén e indique la cantidad exacta solicitada en unidades base.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">5</div>
        <div class="step-content">
          <div class="step-title">Enviar la Solicitud</div>
          <p class="step-desc">Pulse <strong>"Enviar Solicitud"</strong>. El pedido quedará en estado <span class="badge badge-warning">PENDIENTE</span> en la bandeja del Almacén Central.</p>
        </div>
      </li>
    </ol>

    <h3 class="section-heading">9.2 Aprobación y Dictamen del Almacén Central</h3>
    <p>
      El personal del Almacén Central (o el Administrador) revisa las solicitudes radicadas desde la bandeja general:
    </p>
    <ul>
      <li><strong>Aprobar con ajuste de cantidad:</strong> El almacenista puede evaluar el stock total disponible y modificar la cantidad aprobada hacia abajo si la existencia institucional es limitada para compartir insumos con otras secciones. Al confirmar, el estado pasa a <span class="badge badge-info">APROBADA</span>.</li>
      <li><strong>Rechazar solicitud:</strong> Si no hay existencia o la justificación no procede, el almacenista debe registrar de manera obligatoria el <strong>Motivo de Rechazo</strong>. El estado pasa a <span class="badge badge-danger">RECHAZADA</span> y el solicitante recibe la notificación del motivo.</li>
    </ul>
  </article>

  <!-- MÓDULO 10: DESPACHO FÍSICO DE MATERIALES -->
  <article class="module-card" id="modulo-despacho-materiales">
    <div class="module-header">
      <div class="module-category">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z"/></svg>
        Salida y Custodia
      </div>
      <h2 class="module-title">Módulo 10: Despacho Físico de Materiales</h2>
      <div class="module-route-banner">
        <span>Ruta URL: /requests/dispatch &bull; /requests/[id]/dispatch &bull; Roles: ALMACENISTA, ADMINISTRADOR</span>
      </div>
    </div>

    <p>
      El despacho es el acto material en el que los bienes abandonan el Almacén Central y son entregados al solicitante. Este proceso formal <strong>rebaja el saldo físico de los lotes seleccionados y genera un asiento legal en el Kardex</strong>.
    </p>

    <h3 class="section-heading">10.1 Procedimiento de Despacho Paso a Paso</h3>
    <ol class="step-flow">
      <li class="step-flow-item">
        <div class="step-number">1</div>
        <div class="step-content">
          <div class="step-title">Ingresar a la Solicitud Aprobada</div>
          <p class="step-desc">Desde <strong>Solicitudes &gt; Despacho de Materiales</strong>, abra la solicitud que se encuentra en estado <span class="badge badge-info">APROBADA</span>.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">2</div>
        <div class="step-content">
          <div class="step-title">Selección de Lotes Físicos (FEFO Obligatorio)</div>
          <p class="step-desc">Por cada ítem aprobado, el sistema desplegará los lotes disponibles en almacén. El almacenista debe seleccionar preferentemente el lote más próximo a caducar (criterio FEFO) e indicar la cantidad a despachar de cada uno.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">3</div>
        <div class="step-content">
          <div class="step-title">Ejecutar el Despacho Físico</div>
          <p class="step-desc">Haga clic en el botón <strong>"Confirmar Despacho"</strong>. El backend ejecuta la deducción atómica de <code>currentQuantity</code> en los lotes involucrados.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">4</div>
        <div class="step-content">
          <div class="step-title">Comprobante y Asiento Kardex</div>
          <p class="step-desc">El sistema genera el asiento Kardex <code>DESPACHO_SOLICITUD</code> con número de referencia único y actualiza el estado de la solicitud a <span class="badge badge-success">COMPLETADA</span> (o <span class="badge badge-warning">DESPACHADA_PARCIAL</span> si quedaron renglones pendientes).</p>
        </div>
      </li>
    </ol>
  </article>

  <!-- MÓDULO 11: KARDEX Y MOVIMIENTOS DE INVENTARIO -->
  <article class="module-card" id="modulo-kardex">
    <div class="module-header">
      <div class="module-category">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
        Trazabilidad Contable
      </div>
      <h2 class="module-title">Módulo 11: Libro Diario de Kardex y Movimientos</h2>
      <div class="module-route-banner">
        <span>Ruta URL: /inventory/kardex &bull; /inventory/kardex/[id] &bull; Acceso: ALMACENISTA, ADMINISTRADOR</span>
      </div>
    </div>

    <p>
      El Kardex es el registro contable inmutable de todas las entradas, traslados, salidas y deducciones del inventario. Cumple con los estándares de auditoría fiscal, patrimonial e institucional de la Universidad Central de Venezuela.
    </p>

    <h3 class="section-heading">11.1 Tipos de Movimiento de Kardex (StockMovementType)</h3>
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Tipo de Movimiento</th>
            <th>Naturaleza</th>
            <th>Origen / Destino Típico</th>
            <th>Documento Respaldante</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="badge badge-success">ENTRADA_COMPRA</span></td>
            <td>Ingreso positivo (+)</td>
            <td>Proveedor &rarr; Almacén Central</td>
            <td>Orden de Compra y Recepción en Muelle</td>
          </tr>
          <tr>
            <td><span class="badge badge-info">TRASLADO_A_LABORATORIO</span></td>
            <td>Transferencia (&harr;)</td>
            <td>Almacén Central &rarr; Laboratorio / Cava</td>
            <td>Requisición FEFO de reactivos a frío</td>
          </tr>
          <tr>
            <td><span class="badge badge-warning">DESPACHO_SOLICITUD</span></td>
            <td>Egreso definitivo (-)</td>
            <td>Almacén Central &rarr; Departamento Solicitante</td>
            <td>Solicitud Interna Semanal Aprobada</td>
          </tr>
          <tr>
            <td><span class="badge badge-purple">AJUSTE_INVENTARIO</span></td>
            <td>Positivo / Negativo (&plusmn;)</td>
            <td>Ajuste directo sobre anaquel</td>
            <td>Acta de Conteo Físico de Inventario</td>
          </tr>
          <tr>
            <td><span class="badge badge-danger">DESCARTE_MERMA</span></td>
            <td>Egreso definitivo (-)</td>
            <td>Almacén Central &rarr; Desecho Técnico</td>
            <td>Informe de Merma / Rotura / Deterioro</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3 class="section-heading">11.2 Comprobante Digital del Asiento de Kardex</h3>
    <p>
      Al hacer clic en cualquier movimiento de la tabla, se abre la vista de detalle (<code>/inventory/kardex/[id]</code>) que contiene:
    </p>
    <ul>
      <li>Número de Comprobante Único (ej. <code>MOV-2026-00084</code>).</li>
      <li>Fecha, hora exacta y nombre completo del custodio que ejecutó la transacción.</li>
      <li>Tabla detallada de lotes afectados: número de lote, fecha de vencimiento, cantidad movida, costo unitario en divisas y costo total de la línea.</li>
      <li>Botón de descarga de comprobante en formato listo para impresión y archivo físico.</li>
    </ul>
  </article>

  <!-- MÓDULO 12: AJUSTES Y MERMAS DIRECTAS -->
  <article class="module-card" id="modulo-ajustes-mermas">
    <div class="module-header">
      <div class="module-category">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        Regularización de Existencias
      </div>
      <h2 class="module-title">Módulo 12: Ajustes de Inventario y Mermas Directas</h2>
      <div class="module-route-banner">
        <span>Ruta URL: /inventory/adjustments &bull; Roles: ALMACENISTA, ADMINISTRADOR</span>
      </div>
    </div>

    <p>
      En la operativa diaria pueden existir discrepancias entre el saldo del sistema y el conteo físico en anaquel (ej. rotura accidental de un frasco de vidrio en almacén, hallazgo de unidades sobrantes en un estante durante un arqueo). Este módulo permite regularizar el inventario formalmente.
    </p>

    <h3 class="section-heading">12.1 Procedimiento para Ajuste por Conteo Físico</h3>
    <ol class="step-flow">
      <li class="step-flow-item">
        <div class="step-number">1</div>
        <div class="step-content">
          <div class="step-title">Acceder al panel de ajustes</div>
          <p class="step-desc">En <strong>Inventario & Stock</strong>, seleccione <strong>Ajustes & Mermas</strong> y pulse la pestaña <strong>"Nuevo Ajuste de Inventario"</strong>.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">2</div>
        <div class="step-content">
          <div class="step-title">Seleccionar Lote y Tipo de Ajuste</div>
          <p class="step-desc">Seleccione el producto y el lote físico específico. Elija el sentido del ajuste:
            <ul>
              <li><strong>Ajuste Positivo (+):</strong> Se incrementa el saldo (ej. sobrante detectado en conteo cíclico).</li>
              <li><strong>Ajuste Negativo (-):</strong> Se deduce el saldo (ej. faltante injustificado en conteo).</li>
            </ul>
          </p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">3</div>
        <div class="step-content">
          <div class="step-title">Justificación Técnica Obligatoria</div>
          <p class="step-desc">El sistema exige redactar una justificación obligatoria detallada (mínimo 10 caracteres) para respaldar la auditoría patrimonial antes de aplicar la modificación.</p>
        </div>
      </li>
    </ol>

    <h3 class="section-heading">12.2 Registro de Mermas Directas y Deterioro</h3>
    <p>
      Cuando un insumo sufre daño físico (frasco roto por caída, contaminación evidente o fallo de almacenamiento no imputable a calidad analítica), se utiliza la opción <strong>"Registrar Merma"</strong>. Esta operación da de baja definitiva la cantidad afectada del lote, genera el movimiento de Kardex <code>DESCARTE_MERMA</code> y deja constancia documental del siniestro.
    </p>
  </article>
`;
