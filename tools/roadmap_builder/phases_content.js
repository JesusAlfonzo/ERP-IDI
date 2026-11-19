// tools/roadmap_builder/phases_content.js
export const phasesContent = `
  <section class="phases-stream" id="fases-roadmap">
    <div class="section-header-box">
      <h3>
        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
        Desglose Detallado Fase a Fase: Del Abastecimiento al Diagnóstico
      </h3>
      <p>Análisis exhaustivo de entradas, transformaciones, validaciones críticas y salidas interconectadas.</p>
    </div>

    <!-- FASE 1 -->
    <article class="phase-card" id="fase-1">
      <div class="phase-top">
        <div class="phase-title-group">
          <div class="phase-badge-number">01</div>
          <div class="phase-titles">
            <h3>Gobernanza, Seguridad y Catálogo Maestro</h3>
            <p class="phase-sub">Configuración de la infraestructura institucional y políticas de acceso</p>
          </div>
        </div>
        <div class="phase-meta-tags">
          <span class="badge badge-blue">Módulos: Users / Security / Catalog / Masters</span>
          <span class="badge badge-purple">Rol: ADMINISTRADOR</span>
        </div>
      </div>

      <div class="ipo-grid">
        <div class="ipo-card card-input">
          <div class="ipo-label">
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z"/></svg>
            Entradas (Inputs)
          </div>
          <ul>
            <li>Estructura organizativa de secciones clínicas y de investigación del IDI.</li>
            <li>Nómina de personal y roles de acceso (RBAC).</li>
            <li>Fichas técnicas de insumos de fabricantes comerciales.</li>
            <li>Directorio de depósitos y almacenes físicos.</li>
          </ul>
        </div>

        <div class="ipo-card card-process">
          <div class="ipo-label">
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
            Procesamiento & Reglas de Negocio
          </div>
          <ul>
            <li>Cifrado de claves con bcrypt y generación de firmas criptográficas JWT.</li>
            <li>Configuración de la <strong>Ventana Operativa Semanal</strong> (días de atención y cuota por usuario).</li>
            <li>Definición del factor de conversión entre <code>purchaseUnit</code> (empaque comercial) y <code>baseUnit</code> (unidad consumible).</li>
            <li>Activación de banderas técnicas <code>isReagent</code> y exención tributaria <code>isTaxExempt</code>.</li>
          </ul>
        </div>

        <div class="ipo-card card-output">
          <div class="ipo-label">
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
            Salidas Hacia Otros Módulos
          </div>
          <ul>
            <li>Catálogo activo disponible para cotizaciones y pedidos.</li>
            <li>Usuarios habilitados con token seguro de sesión.</li>
            <li>Parámetros de ventana para validar solicitudes internas.</li>
            <li>Estructura de ubicaciones lista para recepciones.</li>
          </ul>
        </div>
      </div>

      <div class="phase-subflow">
        <div class="subflow-step">
          <strong>1. Crear Usuarios</strong>
          <span>Asignar departamento y roles funcionales</span>
        </div>
        <span class="p-connector">&rarr;</span>
        <div class="subflow-step">
          <strong>2. Programar Ventana</strong>
          <span>Horario de recepción (Lunes-Miércoles)</span>
        </div>
        <span class="p-connector">&rarr;</span>
        <div class="subflow-step">
          <strong>3. Codificar Insumo</strong>
          <span>Asignar SKU, Factor de conversión y Flag Reactivo</span>
        </div>
      </div>

      <div class="case-study-box">
        <div class="case-study-header">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
          Ejemplo Práctico en el Sistema: Registro del Kit ELISA Anti-DNA
        </div>
        <div class="case-study-content">
          El administrador registra el producto <em>"Kit ELISA Anti-DNA Doble Cadena 96 Determinaciones"</em> con SKU <code>REA-ELISA-0042</code>. Configura: <code>purchaseUnit = Caja</code>, <code>baseUnit = Determinación</code>, <code>conversionFactor = 96.00</code>, <code>isReagent = true</code> y <code>minStockAlert = 50</code>. Esto permitirá que cuando compras adquiera 5 cajas, el almacén reciba automáticamente 480 determinaciones para laboratorio.
        </div>
      </div>
    </article>

    <!-- FASE 2 -->
    <article class="phase-card" id="fase-2">
      <div class="phase-top">
        <div class="phase-title-group">
          <div class="phase-badge-number num-teal">02</div>
          <div class="phase-titles">
            <h3>Procura, Cotización y Órdenes Bimoneda</h3>
            <p class="phase-sub">Emisión contractual, cálculo impositivo y control de cuentas comerciales</p>
          </div>
        </div>
        <div class="phase-meta-tags">
          <span class="badge badge-blue">Módulos: Requisitions / Orders / Debts / Suppliers</span>
          <span class="badge badge-purple">Roles: COMPRAS, ADMINISTRADOR</span>
        </div>
      </div>

      <div class="ipo-grid">
        <div class="ipo-card card-input">
          <div class="ipo-label">Entradas (Inputs)</div>
          <ul>
            <li>Requerimientos de reposición por stock mínimo o proyectos de investigación.</li>
            <li>Cotizaciones emitidas por proveedores comerciales.</li>
            <li>Tasa oficial de cambio del Banco Central de Venezuela (BCV).</li>
          </ul>
        </div>

        <div class="ipo-card card-process">
          <div class="ipo-label">Procesamiento & Reglas de Negocio</div>
          <ul>
            <li>Emisión de Preorden en estado <code>BORRADOR</code> y paso a <code>EN_COTIZACION</code>.</li>
            <li>Adjudicación formal al distribuidor y generación de la Orden oficial.</li>
            <li>Cálculo bimoneda simultáneo: Base Imponible, Exento, IVA 16% y Total en USD y Bolívares.</li>
            <li>Registro de cuentas por pagar en <code>SupplierDebt</code>.</li>
          </ul>
        </div>

        <div class="ipo-card card-output">
          <div class="ipo-label">Salidas Hacia Otros Módulos</div>
          <ul>
            <li>Orden oficial en estado <code>ENVIADA</code> lista para muelle de descarga.</li>
            <li>Expediente financiero con facturas fiscales cargadas.</li>
            <li>Amortizaciones de pagos registradas en tesorería.</li>
          </ul>
        </div>
      </div>

      <div class="phase-subflow">
        <div class="subflow-step">
          <strong>1. Requisición</strong>
          <span>Consolida ítems requeridos con justificación</span>
        </div>
        <span class="p-connector">&rarr;</span>
        <div class="subflow-step">
          <strong>2. Cotización & Tasa BCV</strong>
          <span>Compara ofertas y fija tipo de cambio</span>
        </div>
        <span class="p-connector">&rarr;</span>
        <div class="subflow-step">
          <strong>3. Orden Oficial</strong>
          <span>Emisión contractual con desglose de IVA</span>
        </div>
      </div>

      <div class="case-study-box">
        <div class="case-study-header">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
          Ejemplo Práctico en el Sistema: Adjudicación de 5 Kits ELISA
        </div>
        <div class="case-study-content">
          El Departamento de Compras emite la Orden <code>ORD-2026-0042</code> a la distribuidora <em>Bio-Diagnóstica C.A.</em> por 5 cajas de <code>REA-ELISA-0042</code> a un precio unitario de $180.00 USD (Total $900.00 USD). Por tratarse de reactivo diagnóstico, se marca exento de IVA. La orden queda en estado <code>ENVIADA</code> esperando la llegada del camión frigorífico.
        </div>
      </div>
    </article>

    <!-- FASE 3 -->
    <article class="phase-card" id="fase-3">
      <div class="phase-top">
        <div class="phase-title-group">
          <div class="phase-badge-number num-emerald">03</div>
          <div class="phase-titles">
            <h3>Recepción Física, Lotes y Control de Calidad</h3>
            <p class="phase-sub">Inspección de bultos, asignación de vencimiento y registro de entrada</p>
          </div>
        </div>
        <div class="phase-meta-tags">
          <span class="badge badge-blue">Módulos: Reception / Quality / Quarantine / Inventory</span>
          <span class="badge badge-purple">Roles: ALMACENISTA, CALIDAD</span>
        </div>
      </div>

      <div class="ipo-grid">
        <div class="ipo-card card-input">
          <div class="ipo-label">Entradas (Inputs)</div>
          <ul>
            <li>Bultos físicos en muelle y guía de despacho del transportista.</li>
            <li>Orden de Compra previa en estado <code>ENVIADA</code> o <code>PARCIAL</code>.</li>
            <li>Termómetro de infrarrojos / DataLogger de cadena de frío.</li>
          </ul>
        </div>

        <div class="ipo-card card-process">
          <div class="ipo-label">Procesamiento & Reglas de Negocio</div>
          <ul>
            <li>Validación física de integridad de precintos y temperatura admisible (2°C a 8°C).</li>
            <li>Captura obligatoria de <strong>Número de Lote</strong> y <strong>Fecha de Expiración</strong>.</li>
            <li>Transacción atómica: Creación de <code>StockBatch</code> con estado <code>DISPONIBLE</code>.</li>
            <li>Si hubo rotura térmica o daño físico, creación inmediata de <code>BatchIncident</code> y pase a <code>EN_CUARENTENA</code>.</li>
          </ul>
        </div>

        <div class="ipo-card card-output">
          <div class="ipo-label">Salidas Hacia Otros Módulos</div>
          <ul>
            <li>Existencias físicas sumadas al inventario central.</li>
            <li>Asiento Kardex inmutable <code>ENTRADA_COMPRA</code>.</li>
            <li>Orden actualizada a <code>COMPLETADA</code> (o <code>PARCIAL</code>).</li>
          </ul>
        </div>
      </div>

      <div class="phase-subflow">
        <div class="subflow-step">
          <strong>1. Muelle de Recepción</strong>
          <span>Inspección de bultos y temperatura</span>
        </div>
        <span class="p-connector">&rarr;</span>
        <div class="subflow-step">
          <strong>2. Lote & Vencimiento</strong>
          <span>Asignación obligatoria de trazabilidad</span>
        </div>
        <span class="p-connector">&rarr;</span>
        <div class="subflow-step">
          <strong>3. StockBatch & Kardex</strong>
          <span>Creación de existencias y asiento contable</span>
        </div>
      </div>

      <div class="case-study-box">
        <div class="case-study-header">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
          Ejemplo Práctico en el Sistema: Recepción y Creación del Lote LOT-DNA-99
        </div>
        <div class="case-study-content">
          El almacenista recibe las 5 cajas en muelle a 4.5°C. En <code>/purchasing/orders/ORD-2026-0042/receive</code> registra: Cantidad Recibida: 5 cajas (480 determinaciones), Lote: <code>LOT-DNA-99</code>, Vencimiento: <code>2027-11-30</code>. El sistema genera el lote físico en <code>StockBatch</code> y asienta el movimiento Kardex <code>MOV-2026-00105</code> de tipo <code>ENTRADA_COMPRA</code>.
        </div>
      </div>
    </article>

    <!-- FASE 4 -->
    <article class="phase-card" id="fase-4">
      <div class="phase-top">
        <div class="phase-title-group">
          <div class="phase-badge-number num-amber">04</div>
          <div class="phase-titles">
            <h3>Ventana Semanal y Solicitudes Internas</h3>
            <p class="phase-sub">Demanda departamental planificada y control de cuotas institucionales</p>
          </div>
        </div>
        <div class="phase-meta-tags">
          <span class="badge badge-blue">Módulos: Requests / RequestWindow / Department</span>
          <span class="badge badge-purple">Roles: SOLICITANTE, ALMACENISTA</span>
        </div>
      </div>

      <div class="ipo-grid">
        <div class="ipo-card card-input">
          <div class="ipo-label">Entradas (Inputs)</div>
          <ul>
            <li>Catálogo de productos con existencias disponibles en almacén.</li>
            <li>Horario programado de la ventana semanal del servidor (ej. ciclo <code>2026-W46</code>).</li>
            <li>Necesidades de abastecimiento de las secciones técnicas del IDI.</li>
          </ul>
        </div>

        <div class="ipo-card card-process">
          <div class="ipo-label">Procesamiento & Reglas de Negocio</div>
          <ul>
            <li>Verificación de reloj del servidor: Bloqueo si la ventana está cerrada o suspendida.</li>
            <li>Validación de cuota máxima semanal por usuario (ej. máx 2 solicitudes/semana).</li>
            <li>Revisión por Almacén Central: Dictamen de aprobación o ajuste de cantidades.</li>
            <li>Rechazo motivado obligatorio si no procede el pedido.</li>
          </ul>
        </div>

        <div class="ipo-card card-output">
          <div class="ipo-label">Salidas Hacia Otros Módulos</div>
          <ul>
            <li>Solicitud en estado <code>APROBADA</code> transferida al panel de despacho.</li>
            <li>Notificación en tiempo real al solicitante con las cantidades confirmadas.</li>
          </ul>
        </div>
      </div>

      <div class="phase-subflow">
        <div class="subflow-step">
          <strong>1. Validar Ventana</strong>
          <span>Verifica si el ciclo semanal está abierto</span>
        </div>
        <span class="p-connector">&rarr;</span>
        <div class="subflow-step">
          <strong>2. Radicar Solicitud</strong>
          <span>Selecciona insumos e indica justificación</span>
        </div>
        <span class="p-connector">&rarr;</span>
        <div class="subflow-step">
          <strong>3. Aprobación Almacén</strong>
          <span>Ajusta cantidades y autoriza entrega</span>
        </div>
      </div>

      <div class="case-study-box">
        <div class="case-study-header">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
          Ejemplo Práctico en el Sistema: Pedido de Inmunopatología
        </div>
        <div class="case-study-content">
          El martes a las 09:30 AM (ventana activa), la jefa de Inmunopatología radicar la solicitud <code>REQ-2026-0089</code> pidiendo 2 cajas de reactivo <code>REA-ELISA-0042</code> y 100 tubos de ensayo. El almacenista aprueba la solicitud completa y la envía al panel de despacho físico.
        </div>
      </div>
    </article>

    <!-- FASE 5 -->
    <article class="phase-card" id="fase-5">
      <div class="phase-top">
        <div class="phase-title-group">
          <div class="phase-badge-number num-purple">05</div>
          <div class="phase-titles">
            <h3>Despacho Físico de Materiales y Salida Kardex</h3>
            <p class="phase-sub">Deducción de existencias, aplicación estricta de FEFO y asiento contable</p>
          </div>
        </div>
        <div class="phase-meta-tags">
          <span class="badge badge-blue">Módulos: RequestsDispatch / Kardex / Movements</span>
          <span class="badge badge-purple">Roles: ALMACENISTA, ADMINISTRADOR</span>
        </div>
      </div>

      <div class="ipo-grid">
        <div class="ipo-card card-input">
          <div class="ipo-label">Entradas (Inputs)</div>
          <ul>
            <li>Solicitud en estado <code>APROBADA</code>.</li>
            <li>Inventario de lotes físicos disponibles en estantes y cavas del almacén.</li>
          </ul>
        </div>

        <div class="ipo-card card-process">
          <div class="ipo-label">Procesamiento & Reglas de Negocio</div>
          <ul>
            <li>Algoritmo FEFO: Sugerencia del lote más antiguo próximo a caducar.</li>
            <li>Selección física de unidades y confirmación de entrega en mostrador.</li>
            <li>Deducción atómica de <code>currentQuantity</code> en <code>StockBatch</code>.</li>
            <li>Inserción inmutable del movimiento de Kardex <code>DESPACHO_SOLICITUD</code>.</li>
          </ul>
        </div>

        <div class="ipo-card card-output">
          <div class="ipo-label">Salidas Hacia Otros Módulos</div>
          <ul>
            <li>Solicitud actualizada a estado <code>COMPLETADA</code>.</li>
            <li>Comprobante oficial de entrega con firma de recepción.</li>
            <li>Libro de Kardex actualizado con valorización contable de salida.</li>
          </ul>
        </div>
      </div>

      <div class="phase-subflow">
        <div class="subflow-step">
          <strong>1. Seleccionar FEFO</strong>
          <span>Elige el lote con vencimiento más próximo</span>
        </div>
        <span class="p-connector">&rarr;</span>
        <div class="subflow-step">
          <strong>2. Descontar Stock</strong>
          <span>Rebaja atómica de existencias físicas</span>
        </div>
        <span class="p-connector">&rarr;</span>
        <div class="subflow-step">
          <strong>3. Comprobante Kardex</strong>
          <span>Genera asiento DESPACHO_SOLICITUD</span>
        </div>
      </div>

      <div class="case-study-box">
        <div class="case-study-header">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
          Ejemplo Práctico en el Sistema: Despacho del Lote LOT-DNA-99
        </div>
        <div class="case-study-content">
          El almacenista despacha las 2 cajas asignadas del lote <code>LOT-DNA-99</code>. El sistema descuenta 192 determinaciones del almacén central, genera el comprobante Kardex <code>MOV-2026-00140</code> y emite la nota de entrega física que se entrega al asistente de laboratorio.
        </div>
      </div>
    </article>

    <!-- FASE 6 -->
    <article class="phase-card" id="fase-6">
      <div class="phase-top">
        <div class="phase-title-group">
          <div class="phase-badge-number num-indigo">06</div>
          <div class="phase-titles">
            <h3>Cadena de Frío y Fraccionamiento de Reactivos</h3>
            <p class="phase-sub">Custodia térmica en neveras, fraccionamiento en viales y estabilidad</p>
          </div>
        </div>
        <div class="phase-meta-tags">
          <span class="badge badge-blue">Módulos: LabFridges / LabReagentUnits / ColdChain</span>
          <span class="badge badge-purple">Roles: BIOANALISTA, COORDINADOR_LABORATORIO</span>
        </div>
      </div>

      <div class="ipo-grid">
        <div class="ipo-card card-input">
          <div class="ipo-label">Entradas (Inputs)</div>
          <ul>
            <li>Cajas de reactivos recibidas del almacén central.</li>
            <li>Neveras clínicas operativas con temperatura monitoreada (2°C a 8°C).</li>
          </ul>
        </div>

        <div class="ipo-card card-process">
          <div class="ipo-label">Procesamiento & Reglas de Negocio</div>
          <ul>
            <li>Fraccionamiento de la caja en frascos individuales <code>LabReagentUnit</code> con código único.</li>
            <li>Asignación física a la nevera clínica del área analítica.</li>
            <li>Apertura en mesón: Transición de estado <code>SELLADO</code> &rarr; <code>EN_USO</code>.</li>
            <li>Control de estabilidad post-apertura (cuenta regresiva de vida útil efectiva).</li>
          </ul>
        </div>

        <div class="ipo-card card-output">
          <div class="ipo-label">Salidas Hacia Otros Módulos</div>
          <ul>
            <li>Frascos en mesón analítico listos para corridas de pacientes.</li>
            <li>Inventario en frío actualizado por equipo de refrigeración.</li>
          </ul>
        </div>
      </div>

      <div class="phase-subflow">
        <div class="subflow-step">
          <strong>1. Asignar a Frío</strong>
          <span>Ubicar cajas en nevera a 4°C</span>
        </div>
        <span class="p-connector">&rarr;</span>
        <div class="subflow-step">
          <strong>2. Fraccionar Viales</strong>
          <span>Genera código único de frasco (SELLADO)</span>
        </div>
        <span class="p-connector">&rarr;</span>
        <div class="subflow-step">
          <strong>3. Abrir en Mesón</strong>
          <span>Pasa a EN_USO y activa estabilidad</span>
        </div>
      </div>

      <div class="case-study-box">
        <div class="case-study-header">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
          Ejemplo Práctico en el Sistema: Vial LOT-DNA-99-F01 en Nevera 02
        </div>
        <div class="case-study-content">
          El bioanalista ubica la caja en la Nevera <code>FRIDGE-INM-02</code> (4°C). El sistema genera el frasco <code>LOT-DNA-99-F01</code> con 96 determinaciones teóricas en estado <code>SELLADO</code>. Al iniciar la semana, pulsa "Abrir Frasco", el estado cambia a <code>EN_USO</code> y se registra la fecha/hora de inicio de estabilidad.
        </div>
      </div>
    </article>

    <!-- FASE 7 -->
    <article class="phase-card" id="fase-7">
      <div class="phase-top">
        <div class="phase-title-group">
          <div class="phase-badge-number num-rose">07</div>
          <div class="phase-titles">
            <h3>Corridas Analíticas y Auditoría de Consumo 5D</h3>
            <p class="phase-sub">Procesamiento en bloque, conciliación de rendimiento y costo real</p>
          </div>
        </div>
        <div class="phase-meta-tags">
          <span class="badge badge-blue">Módulos: LabRuns / 5DAudit / Costing / Clinical</span>
          <span class="badge badge-purple">Roles: BIOANALISTA, COORDINADOR</span>
        </div>
      </div>

      <div class="ipo-grid">
        <div class="ipo-card card-input">
          <div class="ipo-label">Entradas (Inputs)</div>
          <ul>
            <li>Muestras biológicas de sueros/plasmas acumuladas durante la semana.</li>
            <li>Frasco de reactivo <code>EN_USO</code> asignado al examen analítico.</li>
          </ul>
        </div>

        <div class="ipo-card card-process">
          <div class="ipo-label">Procesamiento & Reglas de Negocio</div>
          <ul>
            <li>Apertura de la corrida analítica para el examen correspondiente.</li>
            <li>Cierre de corrida con <strong>Desglose en 5 Dimensiones</strong>: Pacientes, Calibradores, Controles (+/-), Repeticiones justificadas y Purga.</li>
            <li>Deducción de determinaciones restantes y cálculo de variación de rendimiento (Over/Sub-yield).</li>
            <li>Cálculo matemático del <strong>Costo Efectivo Real por Paciente Diagnóstico</strong>.</li>
          </ul>
        </div>

        <div class="ipo-card card-output">
          <div class="ipo-label">Salidas Hacia Otros Módulos</div>
          <ul>
            <li>Pacientes con informe diagnóstico validado biológicamente.</li>
            <li>Saldo del vial actualizado en frío (o marcado <code>AGOTADO</code>).</li>
            <li>Reportes de costo analítico real para la Dirección y Finanzas.</li>
          </ul>
        </div>
      </div>

      <div class="phase-subflow">
        <div class="subflow-step">
          <strong>1. Corrida Semanal</strong>
          <span>Acumula sueros para el examen</span>
        </div>
        <span class="p-connector">&rarr;</span>
        <div class="subflow-step">
          <strong>2. Desglose 5D</strong>
          <span>Pacientes + Calibración + Controles + Purga</span>
        </div>
        <span class="p-connector">&rarr;</span>
        <div class="subflow-step">
          <strong>3. Costo por Paciente</strong>
          <span>Absorbe mermas y controles en el costo</span>
        </div>
      </div>

      <div class="case-study-box">
        <div class="case-study-header">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
          Ejemplo Práctico en el Sistema: Cierre de la Corrida RUN-2026-0042
        </div>
        <div class="case-study-content">
          El bioanalista procesa la corrida <code>RUN-2026-0042</code> de Anti-DNA: diagnostica 38 pacientes, gasta 4 pozos en calibradores, 2 en controles, 2 en repeticiones y 2 en purga (Total: 48 pozos gastados). Del frasco <code>LOT-DNA-99-F01</code> quedan 48 determinaciones. El sistema calcula que el costo real por paciente fue de $2.27 USD, absorbiendo con exactitud matemática el gasto de controles y calibradores.
        </div>
      </div>
    </article>

    <!-- FASE 8 -->
    <article class="phase-card" id="fase-8">
      <div class="phase-top">
        <div class="phase-title-group">
          <div class="phase-badge-number">08</div>
          <div class="phase-titles">
            <h3>I+D Blindado, Arqueos Físicos y Cierre Contable</h3>
            <p class="phase-sub">Segregación de proyectos, arqueo periódico de neveras y auditoría UCV</p>
          </div>
        </div>
        <div class="phase-meta-tags">
          <span class="badge badge-blue">Módulos: Research / FridgeAudit / Traceability / Reports</span>
          <span class="badge badge-purple">Roles: INVESTIGADOR, COORDINADOR, AUDITOR</span>
        </div>
      </div>

      <div class="ipo-grid">
        <div class="ipo-card card-input">
          <div class="ipo-label">Entradas (Inputs)</div>
          <ul>
            <li>Convenios científicos de investigación (OPS, FONACIT, Tesis de Posgrado).</li>
            <li>Neveras clínicas activas con saldos teóricos en el software.</li>
          </ul>
        </div>

        <div class="ipo-card card-process">
          <div class="ipo-label">Procesamiento & Reglas de Negocio</div>
          <ul>
            <li><strong>Blindaje Anti-Consumo Clínico:</strong> Bloqueo estricto de reactivos con <code>ownershipType: RESEARCH_PROJECT</code> en la rutina de pacientes.</li>
            <li>Arqueo físico de neveras (Fridge Audit) para conciliar saldos reales vs. software.</li>
            <li>Generación de informes de trazabilidad punta a punta para la Contraloría UCV.</li>
          </ul>
        </div>

        <div class="ipo-card card-output">
          <div class="ipo-label">Salidas Hacia Otros Módulos</div>
          <ul>
            <li>Bitácora de ensayos y hallazgos científicos formalmente respaldada.</li>
            <li>Libros de inventario conciliados sin discrepancias físicas.</li>
            <li>Archivos CSV exportados para auditoría externa e informes de gestión.</li>
          </ul>
        </div>
      </div>

      <div class="phase-subflow">
        <div class="subflow-step">
          <strong>1. Donación Blindada</strong>
          <span>Bloqueo para uso clínico asistencial</span>
        </div>
        <span class="p-connector">&rarr;</span>
        <div class="subflow-step">
          <strong>2. Fridge Audit</strong>
          <span>Arqueo físico visual frasco por frasco</span>
        </div>
        <span class="p-connector">&rarr;</span>
        <div class="subflow-step">
          <strong>3. Trazabilidad Total</strong>
          <span>De la Orden de Compra al Paciente</span>
        </div>
      </div>

      <div class="case-study-box">
        <div class="case-study-header">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
          Ejemplo Práctico en el Sistema: Trazabilidad Completa del Lote LOT-DNA-99
        </div>
        <div class="case-study-content">
          La Contraloría solicita la auditoría de un resultado. El auditor introduce <code>LOT-DNA-99</code> en <code>/admin/reports/traceability</code>: el sistema reconstruye instantáneamente la Orden <code>ORD-2026-0042</code>, la factura comercial, la recepción en muelle, el asiento Kardex <code>MOV-2026-00105</code>, el despacho a frío, la apertura del frasco en la Nevera 02, la corrida <code>RUN-2026-0042</code> y el paciente diagnosticado en menos de 2 segundos.
        </div>
      </div>
    </article>
  </section>
`;
