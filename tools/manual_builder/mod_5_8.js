// tools/manual_builder/mod_5_8.js
export const mod5to8Content = `
  <!-- MÓDULO 5: PROVEEDORES Y REQUISICIONES DE COMPRA -->
  <article class="module-card" id="modulo-proveedores-requisiciones">
    <div class="module-header">
      <div class="module-category">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
        Cadena de Procura
      </div>
      <h2 class="module-title">Módulo 5: Gestión de Compras y Directorio de Proveedores</h2>
      <div class="module-route-banner">
        <span>Ruta URL: /purchasing/suppliers &bull; /purchasing/requisitions &bull; /purchasing/requisitions/new</span>
      </div>
    </div>

    <p>
      El aprovisionamiento de reactivos de alta sensibilidad y consumibles biológicos requiere una gestión rigurosa de cotizaciones, proveedores calificados y justificaciones técnicas de necesidad institucional.
    </p>

    <h3 class="section-heading">5.1 Directorio y Ficha de Proveedores</h3>
    <p>
      En <strong>Compras &gt; Directorio de Proveedores</strong> se mantiene el registro fiscal y comercial de las casas distribuidoras. Cada ficha incluye:
    </p>
    <ul>
      <li><strong>RIF / Identificación Fiscal:</strong> Registro tributario único (ej. <code>J-12345678-9</code>).</li>
      <li><strong>Razón Social & Nombre Comercial:</strong> Nombre legal de la empresa suministradora.</li>
      <li><strong>Contactos Comerciales:</strong> Teléfonos, correos corporativos y dirección física para despachos.</li>
      <li><strong>Historial Comercial & Balance de Deuda:</strong> Acceso directo a las órdenes históricas emitidas y el saldo pendiente por amortizar en dólares y bolívares.</li>
    </ul>

    <h3 class="section-heading">5.2 Preórdenes y Requisiciones de Compra (Purchase Requisitions)</h3>
    <p>
      La requisición es el instrumento previo a la orden de compra. Permite consolidar requerimientos de múltiples áreas, recabar cotizaciones de precios en el mercado y someter la procura a la aprobación presupuestaria.
    </p>

    <div class="flowchart">
      <div class="flow-node active-state">
        <strong>BORRADOR</strong>
        <small>Carga inicial de necesidades y justificación</small>
      </div>
      <span class="flow-arrow">&rarr;</span>
      <div class="flow-node">
        <strong>EN_COTIZACION</strong>
        <small>Comparación de ofertas con proveedores</small>
      </div>
      <span class="flow-arrow">&rarr;</span>
      <div class="flow-node">
        <strong>ADJUDICADA</strong>
        <small>Proveedor seleccionado y orden generada</small>
      </div>
    </div>

    <h4 class="subsection-heading">Paso a paso para crear una Requisición de Compra:</h4>
    <ol class="step-flow">
      <li class="step-flow-item">
        <div class="step-number">1</div>
        <div class="step-content">
          <div class="step-title">Iniciar la Requisición</div>
          <p class="step-desc">Ingrese a <strong>Compras &gt; Preórdenes de Compra</strong> y pulse <strong>"+ Nueva Requisición"</strong>.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">2</div>
        <div class="step-content">
          <div class="step-title">Indicar Justificación y Sección Solicitante</div>
          <p class="step-desc">Seleccione el departamento técnico beneficiario e indique una justificación detallada (ej. <em>"Reposición trimestral de sueros control y kits ELISA para despistaje de autoinmunidad"</em>).</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">3</div>
        <div class="step-content">
          <div class="step-title">Agregar renglones de insumos requeridos</div>
          <p class="step-desc">Seleccione los productos del catálogo, especifique la cantidad solicitada en unidades comerciales y un precio estimado de referencia.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">4</div>
        <div class="step-content">
          <div class="step-title">Guardar y pasar a cotización</div>
          <p class="step-desc">Guarde en estado <code>BORRADOR</code>. Cuando el equipo de procura reciba las ofertas comerciales, cambie el estado a <code>EN_COTIZACION</code>.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">5</div>
        <div class="step-content">
          <div class="step-title">Adjudicación y Conversión en Orden Oficial</div>
          <p class="step-desc">Al elegir al proveedor ganador, pulse el botón <strong>"Convertir a Orden de Compra"</strong>. El sistema vinculará al proveedor, heredará los ítems acordados y creará la Orden de Compra oficial de manera automática.</p>
        </div>
      </li>
    </ol>
  </article>

  <!-- MÓDULO 6: ÓRDENES DE COMPRA Y FACTURACIÓN -->
  <article class="module-card" id="modulo-ordenes-compra">
    <div class="module-header">
      <div class="module-category">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>
        Gestión Comercial
      </div>
      <h2 class="module-title">Módulo 6: Órdenes de Compra y Facturación de Proveedores</h2>
      <div class="module-route-banner">
        <span>Ruta URL: /purchasing/orders &bull; /purchasing/orders/new &bull; /purchasing/orders/[id]</span>
      </div>
    </div>

    <p>
      La Orden de Compra representa el compromiso contractual y financiero del IDI frente al proveedor. Admite emisión multimoneda (USD/VES) con cálculo automático de bases imponibles y alícuotas del IVA.
    </p>

    <h3 class="section-heading">6.1 Emisión de una Nueva Orden de Compra</h3>
    <ol class="step-flow">
      <li class="step-flow-item">
        <div class="step-number">1</div>
        <div class="step-content">
          <div class="step-title">Selección del Proveedor y Datos Cambiarios</div>
          <p class="step-desc">Seleccione el proveedor comercial adjudicado, la moneda de cotización (USD o Bolívares) y confirme la tasa de cambio de referencia del BCV.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">2</div>
        <div class="step-content">
          <div class="step-title">Carga de Renglones de Insumos</div>
          <p class="step-desc">Por cada producto, indique la cantidad ordenada, la unidad de compra, el precio unitario pactado y verifique si el ítem está exento de IVA o grava la alícuota general (16%).</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">3</div>
        <div class="step-content">
          <div class="step-title">Cálculo Automático del Resumen Financiero</div>
          <p class="step-desc">El sistema calcula en tiempo real: <code>Subtotal</code>, <code>Base Imponible</code>, <code>Total Exento</code>, <code>IVA 16%</code> y <code>Total de la Orden</code> tanto en USD como en Bolívares.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">4</div>
        <div class="step-content">
          <div class="step-title">Emisión y Envío al Proveedor</div>
          <p class="step-desc">Al guardar, la orden queda en estado <code>ENVIADA</code>, lista para imprimir en PDF oficial o enviar por correo al distribuidor para su despacho.</p>
        </div>
      </li>
    </ol>

    <h3 class="section-heading">6.2 Expediente Digital y Carga de Facturas Comerciales</h3>
    <p>
      Dentro de la ficha de la orden (<code>/purchasing/orders/[id]</code>), la pestaña <strong>Facturación</strong> permite respaldar las facturas fiscales recibidas:
    </p>
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Dato de Factura</th>
            <th>Obligatorio</th>
            <th>Propósito Fiscal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code class="field-name">invoiceNumber</code></td>
            <td><span class="badge badge-danger">Sí</span></td>
            <td>Número impreso de la factura legal del proveedor.</td>
          </tr>
          <tr>
            <td><code class="field-name">controlNumber</code></td>
            <td><span class="badge badge-danger">Sí</span></td>
            <td>Número de control fiscal del SENIAT exigido en Venezuela.</td>
          </tr>
          <tr>
            <td><code class="field-name">invoiceDate</code></td>
            <td><span class="badge badge-danger">Sí</span></td>
            <td>Fecha formal de emisión de la factura comercial.</td>
          </tr>
          <tr>
            <td><code class="field-name">totalAmount</code></td>
            <td><span class="badge badge-danger">Sí</span></td>
            <td>Monto total facturado por el proveedor para conciliar saldos.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </article>

  <!-- MÓDULO 7: RECEPCIÓN FÍSICA EN ALMACÉN -->
  <article class="module-card" id="modulo-recepcion-almacen">
    <div class="module-header">
      <div class="module-category">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M20 8h-3V4H7v4H4c-1.1 0-2 .9-2 2v10h20V10c0-1.1-.9-2-2-2zM9 6h6v2H9V6zm11 12H4v-6h16v6z"/></svg>
        Entrada de Existencias
      </div>
      <h2 class="module-title">Módulo 7: Recepción Física de Mercancía en Almacén Central</h2>
      <div class="module-route-banner">
        <span>Ruta URL: /purchasing/orders/[id]/receive &bull; Roles: ADMINISTRADOR, ALMACENISTA</span>
      </div>
    </div>

    <p>
      La recepción física es el punto crítico de control donde los insumos ingresan legal y físicamente a la custodia del instituto. En este proceso <strong>se generan los lotes de inventario y se auditan las fechas de vencimiento</strong>.
    </p>

    <div class="callout callout-danger">
      <div class="callout-icon">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
      </div>
      <div class="callout-content">
        <div class="callout-title">Obligatoriedad Inviolable de Lote y Vencimiento</div>
        <p>
          Bajo ninguna circunstancia el sistema permite ingresar reactivos o insumos biológicos sin asignar el <strong>Número de Lote físico del fabricante</strong> y su <strong>Fecha de Vencimiento legal</strong>. Esta regla garantiza la trazabilidad clínica y el cumplimiento de las normas de Buenas Prácticas de Laboratorio.
        </p>
      </div>
    </div>

    <h3 class="section-heading">7.1 Procedimiento de Recepción en Muelle de Almacén</h3>
    <ol class="step-flow">
      <li class="step-flow-item">
        <div class="step-number">1</div>
        <div class="step-content">
          <div class="step-title">Acceder al formulario de recepción de la orden</div>
          <p class="step-desc">Desde el listado de órdenes en estado <code>ENVIADA</code> o <code>PARCIAL</code>, haga clic en el botón <strong>"Recibir Pedido"</strong>.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">2</div>
        <div class="step-content">
          <div class="step-title">Inspección física y conteo de bultos</div>
          <p class="step-desc">El almacenista verifica físicamente los empaques, precintos de seguridad de los reactivos y que los geles refrigerantes de la cadena de frío vengan a la temperatura adecuada.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">3</div>
        <div class="step-content">
          <div class="step-title">Registro de cantidades y lotes por renglón</div>
          <p class="step-desc">Por cada ítem ordenado, indique:
            <ul>
              <li><strong>Cantidad Recibida:</strong> Unidades físicas conformes que ingresan al stock disponible.</li>
              <li><strong>Cantidad Rechazada:</strong> Unidades defectuosas, rotas o calientes que se devuelven al proveedor.</li>
              <li><strong>Número de Lote (Lot Number):</strong> Código impreso en la caja por el laboratorio productor.</li>
              <li><strong>Fecha de Vencimiento:</strong> Fecha límite de estabilidad biológica garantizada.</li>
              <li><strong>Ubicación de Destino:</strong> Selección del depósito físico (Almacén Central o Cava de Entrada).</li>
            </ul>
          </p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">4</div>
        <div class="step-content">
          <div class="step-title">Procesamiento de la Transacción Atómica</div>
          <p class="step-desc">Al pulsar <strong>"Confirmar Recepción"</strong>, el backend ejecuta una transacción atómica protegida:
            <ol>
              <li>Crea o actualiza el registro en <code>StockBatch</code> con estado <code>DISPONIBLE</code>.</li>
              <li>Inserta el asiento en el libro diario Kardex como <code>ENTRADA_COMPRA</code>.</li>
              <li>Actualiza las cantidades recibidas/pendientes en la orden.</li>
              <li>Si la orden se completó, actualiza su estado a <code>COMPLETADA</code>; si faltan ítems, a <code>PARCIAL</code>.</li>
            </ol>
          </p>
        </div>
      </li>
    </ol>
  </article>

  <!-- MÓDULO 8: FINANZAS, TESORERÍA Y CUENTAS POR PAGAR -->
  <article class="module-card" id="modulo-finanzas-tesoreria">
    <div class="module-header">
      <div class="module-category">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
        Tesorería Institucional
      </div>
      <h2 class="module-title">Módulo 8: Finanzas, Tesorería y Cuentas por Pagar</h2>
      <div class="module-route-banner">
        <span>Ruta URL: /purchasing/debts &bull; /admin/financial/payments &bull; /purchasing/debts/payment</span>
      </div>
    </div>

    <p>
      El módulo financiero permite supervisar en tiempo real los pasivos comerciales con los proveedores, tramitar amortizaciones parciales de órdenes y registrar egresos operativos directos del instituto.
    </p>

    <h3 class="section-heading">8.1 Monitor de Deudas y Cuentas por Pagar</h3>
    <p>
      En <strong>Finanzas &gt; Cuentas por Pagar & Deudas</strong> se presenta la cartera de compromisos financieros pendientes, clasificada por proveedor y orden de compra. La pantalla muestra:
    </p>
    <ul>
      <li>Monto Total Adjudicado (USD y VES).</li>
      <li>Monto Total Amortizado a la fecha.</li>
      <li>Saldo Deudor Pendiente.</li>
      <li>Estado Financiero de la Orden: <span class="badge badge-warning">PENDIENTE</span>, <span class="badge badge-info">PAGADO_PARCIAL</span>, <span class="badge badge-success">PAGADO</span> o <span class="badge badge-purple">EXONERADO</span>.</li>
    </ul>

    <h3 class="section-heading">8.2 Registro de Pagos Amortizados a Órdenes</h3>
    <ol class="step-flow">
      <li class="step-flow-item">
        <div class="step-number">1</div>
        <div class="step-content">
          <div class="step-title">Seleccionar la orden por amortizar</div>
          <p class="step-desc">Haga clic en el botón <strong>"Registrar Pago"</strong> junto a la orden correspondiente.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">2</div>
        <div class="step-content">
          <div class="step-title">Definir método y monto del desembolso</div>
          <p class="step-desc">Indique el método de pago empleado (Transferencia bancaria nacional/internacional, Pago Móvil, Efectivo USD/VES), el importe transferido y el número de referencia de la entidad bancaria.</p>
        </div>
      </li>
      <li class="step-flow-item">
        <div class="step-number">3</div>
        <div class="step-content">
          <div class="step-title">Adjuntar comprobante y aplicar amortización</div>
          <p class="step-desc">Adjunte el soporte digital del comprobante bancario y pulse <strong>"Guardar Pago"</strong>. El saldo deudor de la orden se reducirá instantáneamente.</p>
        </div>
      </li>
    </ol>

    <h3 class="section-heading">8.3 Egresos y Pagos Directos Institucionales</h3>
    <p>
      En <strong>Finanzas &gt; Egresos & Pagos Directos</strong> (<code>/admin/financial/payments</code>), la administración puede tramitar erogaciones operativas que no nacen de una orden de compra tradicional (ej. calibración técnica externa de equipos, aranceles aduanales de donaciones, suministros de emergencia inmediata). Permite asociar la cuenta bancaria de egreso, la referencia fiscal y la justificación administrativa.
    </p>
  </article>
`;
