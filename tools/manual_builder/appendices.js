// tools/manual_builder/appendices.js
export const appendicesContent = `
  <!-- APÉNDICE A: GLOSARIO DE TÉRMINOS -->
  <article class="module-card" id="apendice-glosario">
    <div class="module-header">
      <div class="module-category">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9H9V9h10v2zm-4 4H9v-2h6v2zm4-8H9V5h10v2z"/></svg>
        Vocabulario Técnico
      </div>
      <h2 class="module-title">Apéndice A: Glosario de Términos Institucionales</h2>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Término</th>
            <th>Definición Técnica en ERP-IDI</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Cadena de Frío</strong></td>
            <td>Condición de almacenamiento continuo a temperatura controlada (2°C a 8°C, -20°C o -80°C) indispensable para preservar la actividad biológica de enzimas, anticuerpos y antígenos.</td>
          </tr>
          <tr>
            <td><strong>Costo Efectivo por Paciente</strong></td>
            <td>Cálculo financiero resultante de dividir el costo total de los reactivos consumidos en una corrida (incluyendo calibradores, controles y mermas) entre el total de pacientes diagnosticados.</td>
          </tr>
          <tr>
            <td><strong>Determinación (Pozo / Uso)</strong></td>
            <td>Unidad mínima teórica de volumen o pozo en placa para procesar una reacción analítica individual en el laboratorio clínico.</td>
          </tr>
          <tr>
            <td><strong>FEFO (First Expired, First Out)</strong></td>
            <td>Regla de despacho que prioriza la salida y consumo del lote o frasco que tenga la fecha de vencimiento más próxima en el calendario.</td>
          </tr>
          <tr>
            <td><strong>Kardex</strong></td>
            <td>Libro contable oficial donde se registran cronológicamente todas las entradas, salidas, traslados y ajustes de inventario con sus respectivos costos.</td>
          </tr>
          <tr>
            <td><strong>Over-yield / Sub-yield</strong></td>
            <td>Variación entre el rendimiento real obtenido de un kit diagnóstico y las determinaciones teóricas prometidas por el prospecto del fabricante.</td>
          </tr>
          <tr>
            <td><strong>Stock Blindado (I+D)</strong></td>
            <td>Reactivos e insumos adquiridos por donaciones o proyectos de investigación científica que el sistema bloquea para impedir su uso en la rutina asistencial de pacientes.</td>
          </tr>
          <tr>
            <td><strong>Ventana Operativa Semanal</strong></td>
            <td>Intervalo programado en días y horas durante el cual las secciones del IDI pueden ingresar pedidos de materiales al Almacén Central.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </article>

  <!-- APÉNDICE B: MATRIZ DE ERRORES FRECUENTES Y SOLUCIÓN -->
  <article class="module-card" id="apendice-errores">
    <div class="module-header">
      <div class="module-category">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
        Resolución de Problemas
      </div>
      <h2 class="module-title">Apéndice B: Matriz de Errores Frecuentes y Solución</h2>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Mensaje de Error en Pantalla</th>
            <th>Causa Raíz</th>
            <th>Procedimiento de Solución</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code class="field-name">400 Bad Request: "Ventana de solicitudes no activa"</code></td>
            <td>El usuario intentó radicar un pedido fuera de los días y horarios programados de la ventana.</td>
            <td>Consulte el horario en <strong>/requests</strong> o espere la apertura del próximo ciclo semanal. En casos de urgencia médica, notifique al Administrador.</td>
          </tr>
          <tr>
            <td><code class="field-name">400 Bad Request: "Superó el límite semanal de solicitudes"</code></td>
            <td>El usuario ya alcanzó su cuota máxima de pedidos permitidos para la semana corriente.</td>
            <td>Espere al siguiente ciclo semanal o coordine la inclusión de ítems con su jefe de departamento.</td>
          </tr>
          <tr>
            <td><code class="field-name">403 Forbidden: "La unidad X es de investigación y no puede consumirse en rutina"</code></td>
            <td>El bioanalista intentó usar un reactivo donado o de subvención en una corrida clínica asistencial.</td>
            <td>Seleccione un frasco que tenga la etiqueta <code>CLINICAL_ROUTINE</code>. Los reactivos de I+D son para proyectos científicos exclusivamente.</td>
          </tr>
          <tr>
            <td><code class="field-name">401 Unauthorized: "Token inválido o expirado"</code></td>
            <td>La sesión del usuario superó las 8 horas de vigencia o se cerró en otra pestaña.</td>
            <td>Haga clic en <strong>"Iniciar Sesión"</strong> e introduzca nuevamente sus credenciales.</td>
          </tr>
          <tr>
            <td><code class="field-name">400 Bad Request: "Existencia física insuficiente en el lote"</code></td>
            <td>Se intentó despachar o consumir una cantidad mayor al saldo actual del lote.</td>
            <td>Verifique el inventario disponible en <strong>/inventory/products/[id]</strong> o distribuya el consumo entre varios lotes activos.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </article>

  <!-- APÉNDICE C: BUENAS PRÁCTICAS Y BIOSEGURIDAD -->
  <article class="module-card" id="apendice-buenas-practicas">
    <div class="module-header">
      <div class="module-category">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
        Excelencia Operativa
      </div>
      <h2 class="module-title">Apéndice C: Buenas Prácticas y Protocolos de Bioseguridad</h2>
    </div>

    <div class="grid-2">
      <div class="card-feature">
        <h5>1. Registro Inmediato de Apertura de Viales</h5>
        <p>Nunca postergue la acción <strong>"Abrir Frasco"</strong> para el final de la jornada. Registrar la apertura en el instante exacto garantiza que las alertas de caducidad post-apertura protejan a los pacientes.</p>
      </div>
      <div class="card-feature">
        <h5>2. Verificación Visual de Fríos en Recepción</h5>
        <p>Al recibir pedidos en almacén, verifique inmediatamente con termómetro infrarrojo que los bultos no hayan superado la temperatura crítica antes de firmar la guía de entrega al proveedor.</p>
      </div>
      <div class="card-feature">
        <h5>3. Custodia de Soportes Digitales</h5>
        <p>Adjunte siempre fotografías legibles de comprobantes bancarios, facturas fiscales y actas de rotura. Esto agiliza las auditorías de la Contraloría de la UCV.</p>
      </div>
      <div class="card-feature">
        <h5>4. Descarte Técnico Responsable</h5>
        <p>Los viales vencidos o contaminados deben someterse a inactivación por autoclave o disposición en contenedores de riesgo biológico conforme a las normas del IDI.</p>
      </div>
    </div>
  </article>
`;

export const clientScript = `
  // Script Interactivo Autónomo para el Manual de Usuario ERP-IDI
  document.addEventListener('DOMContentLoaded', () => {
    // 1. Botón Volver Arriba
    const backToTopBtn = document.getElementById('backToTopBtn');
    window.addEventListener('scroll', () => {
      if (window.scrollY > 400) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    });

    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // 2. Buscador en Tiempo Real de Módulos y Secciones
    const searchInput = document.getElementById('manualSearchInput');
    const moduleCards = document.querySelectorAll('.module-card');
    const navLinks = document.querySelectorAll('.nav-link');

    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();

      moduleCards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(term)) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });

      navLinks.forEach(link => {
        const linkText = link.textContent.toLowerCase();
        const targetId = link.getAttribute('href').replace('#', '');
        const targetCard = document.getElementById(targetId);

        if (linkText.includes(term) || (targetCard && targetCard.style.display !== 'none')) {
          link.parentElement.style.display = 'block';
        } else if (term.length > 0) {
          link.parentElement.style.display = 'none';
        } else {
          link.parentElement.style.display = 'block';
        }
      });
    });

    // 3. Seguimiento de Navegación Activa en el Menú Lateral
    const observerOptions = {
      root: null,
      rootMargin: '-80px 0px -70% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute('id');
          navLinks.forEach(link => {
            if (link.getAttribute('href') === '#' + id) {
              link.classList.add('active');
            } else {
              link.classList.remove('active');
            }
          });
        }
      });
    }, observerOptions);

    moduleCards.forEach(card => observer.observe(card));
  });
`;
