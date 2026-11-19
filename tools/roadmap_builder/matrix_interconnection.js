// tools/roadmap_builder/matrix_interconnection.js
export const matrixAndWalkthrough = `
  <!-- MATRIZ DE INTERCONEXIÓN Y DEPENDENCIAS CRUZADAS -->
  <section class="matrix-section" id="matriz-conexiones">
    <div class="section-header-box">
      <h3>
        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
        Matriz de Conexión entre Módulos: Eventos y Transferencia de Datos
      </h3>
      <p>Cómo se comunican los módulos del backend y qué contratos de datos viajan entre ellos.</p>
    </div>

    <div class="table-container" style="overflow-x: auto;">
      <table class="matrix-table">
        <thead>
          <tr>
            <th>Módulo Emisor</th>
            <th>Acción / Evento Disparador</th>
            <th>Datos Transferidos (Payload)</th>
            <th>Módulo Receptor</th>
            <th>Efecto Inmediato en el Sistema</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Preórdenes (Requisiciones)</strong></td>
            <td><code>POST .../convert-to-order</code></td>
            <td><code>supplierId, exchangeRate, items[]</code></td>
            <td><strong>Órdenes de Compra</strong></td>
            <td>Crea Orden oficial en estado <code>BORRADOR</code> / <code>ENVIADA</code> y transfiere las líneas de cotización.</td>
          </tr>
          <tr>
            <td><strong>Órdenes de Compra</strong></td>
            <td><code>POST .../receive</code></td>
            <td><code>lotNumber, expirationDate, qtyReceived</code></td>
            <td><strong>Almacén & Kardex</strong></td>
            <td>Crea o incrementa <code>StockBatch</code> y registra el movimiento de Kardex <code>ENTRADA_COMPRA</code>.</td>
          </tr>
          <tr>
            <td><strong>Recepción en Muelle</strong></td>
            <td>Detección de rotura o fallo térmico</td>
            <td><code>batchId, incidentType, evidenceUrl</code></td>
            <td><strong>Calidad & Cuarentena</strong></td>
            <td>Pasa el lote a <span class="badge badge-amber">EN_CUARENTENA</span> y bloquea su uso en despachos y corridas.</td>
          </tr>
          <tr>
            <td><strong>Facturación de Orden</strong></td>
            <td><code>POST .../invoices</code></td>
            <td><code>invoiceNumber, controlNumber, totalAmount</code></td>
            <td><strong>Finanzas & Deudas</strong></td>
            <td>Registra la deuda en <code>SupplierDebt</code> y habilita la amortización bimoneda.</td>
          </tr>
          <tr>
            <td><strong>Ventana Operativa</strong></td>
            <td>Validación horaria en servidor</td>
            <td><code>weeklyTokenCycle (ej. 2026-W46)</code></td>
            <td><strong>Solicitudes Internas</strong></td>
            <td>Permite o rechaza la creación de solicitudes según el horario y cuota del usuario.</td>
          </tr>
          <tr>
            <td><strong>Solicitudes Internas</strong></td>
            <td><code>POST .../dispatch</code></td>
            <td><code>requestId, items[{ batchId, qty }]</code></td>
            <td><strong>Kardex & Almacén</strong></td>
            <td>Descuenta <code>currentQuantity</code> del lote y asienta el movimiento <code>DESPACHO_SOLICITUD</code>.</td>
          </tr>
          <tr>
            <td><strong>Despacho a Frío</strong></td>
            <td><code>POST .../assign-batch</code></td>
            <td><code>batchId, fridgeId, totalUses</code></td>
            <td><strong>Laboratorio & Neveras</strong></td>
            <td>Fracciona las cajas en frascos individuales <code>LabReagentUnit</code> en estado <span class="badge badge-blue">SELLADO</span>.</td>
          </tr>
          <tr>
            <td><strong>Apertura de Vial</strong></td>
            <td><code>PATCH .../units/:id/open</code></td>
            <td><code>openedById, openedAt, expirationDate</code></td>
            <td><strong>Control de Estabilidad</strong></td>
            <td>Cambia el estado a <span class="badge badge-green">EN_USO</span> y activa la cuenta regresiva de vida útil post-apertura.</td>
          </tr>
          <tr>
            <td><strong>Cierre de Corrida</strong></td>
            <td><code>POST .../runs/:id/close</code></td>
            <td><code>consumptions[patient, cal, ctrl, rep, waste]</code></td>
            <td><strong>Costeo Real & Finanzas</strong></td>
            <td>Deduce saldo del vial, concilia variación de rendimiento y calcula costo efectivo por paciente.</td>
          </tr>
          <tr>
            <td><strong>Donaciones (I+D)</strong></td>
            <td><code>POST .../donations</code></td>
            <td><code>ownershipType: RESEARCH_PROJECT</code></td>
            <td><strong>Blindaje de Base de Datos</strong></td>
            <td>Bloquea a nivel de servicio cualquier intento de consumir el vial en la rutina asistencial de pacientes.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- RECORRIDO INTERACTIVO PASO A PASO (WALKTHROUGH) -->
  <section class="matrix-section" id="simulador-trazabilidad" style="margin-top: 2.5rem;">
    <div class="section-header-box">
      <h3>
        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        Línea de Vida de un Insumo: El Viaje Completo de Principio a Fin
      </h3>
      <p>Visualice cronológicamente cómo se transforma una necesidad clínica en un diagnóstico efectivo de paciente.</p>
    </div>

    <div class="phases-stream" style="gap: 1.5rem; margin-top: 1rem;">
      <div class="p-node" style="padding: 1.25rem; border-left: 5px solid var(--primary);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <strong style="color: var(--primary); font-size: 0.95rem;">Hito 1: Detección de Necesidad & Requisición</strong>
          <span class="badge badge-amber">Preorden</span>
        </div>
        <p style="font-size: 0.85rem; color: var(--slate-600); margin: 0;">
          El stock del reactivo de autoinmunidad cae bajo el punto de reorden (50 pruebas). Compras emite la preorden <code>REQ-2026-0012</code> y solicita cotizaciones a 3 distribuidores calificados.
        </p>
      </div>

      <div class="p-node" style="padding: 1.25rem; border-left: 5px solid var(--teal);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <strong style="color: var(--teal); font-size: 0.95rem;">Hito 2: Adjudicación de Orden Bimoneda</strong>
          <span class="badge badge-blue">Orden Oficial</span>
        </div>
        <p style="font-size: 0.85rem; color: var(--slate-600); margin: 0;">
          Se adjudica a <em>Bio-Diagnóstica C.A.</em> por $900.00 USD (5 cajas de 96 determinaciones) a la tasa BCV oficial del día. Se emite la Orden <code>ORD-2026-0042</code>.
        </p>
      </div>

      <div class="p-node" style="padding: 1.25rem; border-left: 5px solid var(--success);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <strong style="color: var(--success); font-size: 0.95rem;">Hito 3: Recepción Física, Lote y Entrada a Kardex</strong>
          <span class="badge badge-green">StockBatch</span>
        </div>
        <p style="font-size: 0.85rem; color: var(--slate-600); margin: 0;">
          Llega el camión frigorífico a 4°C. El almacenista inspecciona los viales, asigna el lote <code>LOT-DNA-99</code> con vencimiento <code>2027-11-30</code> y el sistema genera el asiento Kardex <code>ENTRADA_COMPRA</code> sumando 480 pruebas al almacén.
        </p>
      </div>

      <div class="p-node" style="padding: 1.25rem; border-left: 5px solid var(--warning);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <strong style="color: var(--warning); font-size: 0.95rem;">Hito 4: Pedido Departamental en Ventana Semanal</strong>
          <span class="badge badge-amber">Ventana Activa</span>
        </div>
        <p style="font-size: 0.85rem; color: var(--slate-600); margin: 0;">
          Durante la ventana de atención semanal, Inmunopatología solicita 2 cajas. El almacén aprueba y despacha por criterio FEFO, generando el comprobante Kardex <code>DESPACHO_SOLICITUD</code>.
        </p>
      </div>

      <div class="p-node" style="padding: 1.25rem; border-left: 5px solid var(--purple);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <strong style="color: var(--purple); font-size: 0.95rem;">Hito 5: Fraccionamiento en Nevera & Apertura en Mesón</strong>
          <span class="badge badge-purple">LabReagentUnit</span>
        </div>
        <p style="font-size: 0.85rem; color: var(--slate-600); margin: 0;">
          Las 2 cajas se ingresan a la Nevera <code>FRIDGE-INM-02</code> fraccionándose en viales individuales. El bioanalista ejecuta "Abrir Frasco" para el vial <code>LOT-DNA-99-F01</code>, pasando de <code>SELLADO</code> a <code>EN_USO</code>.
        </p>
      </div>

      <div class="p-node" style="padding: 1.25rem; border-left: 5px solid var(--danger);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <strong style="color: var(--danger); font-size: 0.95rem;">Hito 6: Corrida Semanal, Diagnóstico y Costo Efectivo</strong>
          <span class="badge badge-red">Corrida 5D</span>
        </div>
        <p style="font-size: 0.85rem; color: var(--slate-600); margin: 0;">
          Se procesan 38 pacientes, 4 calibradores, 2 controles, 2 repeticiones y 2 purgas (48 pozos). Se descuentan del vial, se emiten los diagnósticos clínicos y se calcula el costo real exacto por paciente ($2.27 USD).
        </p>
      </div>
    </div>
  </section>
`;
