// tools/manual_builder/sidebar_nav.js
export const sidebarNav = `
  <aside class="sidebar">
    <div class="sidebar-section-title">Marco General</div>
    <ul class="nav-list">
      <li class="nav-item">
        <a href="#seccion-introduccion" class="nav-link">
          <span>Introducción Institucional</span>
          <span class="nav-badge">IDI</span>
        </a>
      </li>
      <li class="nav-item">
        <a href="#modulo-principios" class="nav-link">
          <span>Principios Transversales</span>
          <span class="nav-badge">Normas</span>
        </a>
      </li>
    </ul>

    <div class="sidebar-section-title">Seguridad y Acceso</div>
    <ul class="nav-list">
      <li class="nav-item">
        <a href="#modulo-auth" class="nav-link">
          <span>Módulo 1: Acceso y Perfil</span>
          <span class="nav-badge">JWT</span>
        </a>
      </li>
      <li class="nav-item">
        <a href="#modulo-dashboard" class="nav-link">
          <span>Módulo 2: Panel de Control</span>
          <span class="nav-badge">KPI</span>
        </a>
      </li>
    </ul>

    <div class="sidebar-section-title">Catálogo e Inventario</div>
    <ul class="nav-list">
      <li class="nav-item">
        <a href="#modulo-productos" class="nav-link">
          <span>Módulo 3: Catálogo General</span>
          <span class="nav-badge">SKU</span>
        </a>
      </li>
      <li class="nav-item">
        <a href="#modulo-maestros" class="nav-link">
          <span>Módulo 4: Maestros de Almacén</span>
          <span class="nav-badge">Base</span>
        </a>
      </li>
    </ul>

    <div class="sidebar-section-title">Procura y Finanzas</div>
    <ul class="nav-list">
      <li class="nav-item">
        <a href="#modulo-proveedores-requisiciones" class="nav-link">
          <span>Módulo 5: Proveedores y Requisiciones</span>
          <span class="nav-badge">Procura</span>
        </a>
      </li>
      <li class="nav-item">
        <a href="#modulo-ordenes-compra" class="nav-link">
          <span>Módulo 6: Órdenes de Compra</span>
          <span class="nav-badge">Bimoneda</span>
        </a>
      </li>
      <li class="nav-item">
        <a href="#modulo-recepcion-almacen" class="nav-link">
          <span>Módulo 7: Recepción en Muelle</span>
          <span class="nav-badge">Lotes</span>
        </a>
      </li>
      <li class="nav-item">
        <a href="#modulo-finanzas-tesoreria" class="nav-link">
          <span>Módulo 8: Finanzas y Cuentas por Pagar</span>
          <span class="nav-badge">Pagos</span>
        </a>
      </li>
    </ul>

    <div class="sidebar-section-title">Operaciones de Almacén</div>
    <ul class="nav-list">
      <li class="nav-item">
        <a href="#modulo-solicitudes-internas" class="nav-link">
          <span>Módulo 9: Solicitudes Internas</span>
          <span class="nav-badge">Ventana</span>
        </a>
      </li>
      <li class="nav-item">
        <a href="#modulo-despacho-materiales" class="nav-link">
          <span>Módulo 10: Despacho de Materiales</span>
          <span class="nav-badge">FEFO</span>
        </a>
      </li>
      <li class="nav-item">
        <a href="#modulo-kardex" class="nav-link">
          <span>Módulo 11: Libro de Kardex</span>
          <span class="nav-badge">Asientos</span>
        </a>
      </li>
      <li class="nav-item">
        <a href="#modulo-ajustes-mermas" class="nav-link">
          <span>Módulo 12: Ajustes y Mermas</span>
          <span class="nav-badge">Conteo</span>
        </a>
      </li>
    </ul>

    <div class="sidebar-section-title">Laboratorio y Calidad</div>
    <ul class="nav-list">
      <li class="nav-item">
        <a href="#modulo-calidad-cuarentena" class="nav-link">
          <span>Módulo 13: Calidad y Cuarentena</span>
          <span class="nav-badge">Control</span>
        </a>
      </li>
      <li class="nav-item">
        <a href="#modulo-laboratorio-frio" class="nav-link">
          <span>Módulo 14: Neveras y Cadena de Frío</span>
          <span class="nav-badge">2-8°C</span>
        </a>
      </li>
      <li class="nav-item">
        <a href="#modulo-corridas-laboratorio" class="nav-link">
          <span>Módulo 15: Corridas y Consumo 5D</span>
          <span class="nav-badge">Costos</span>
        </a>
      </li>
      <li class="nav-item">
        <a href="#modulo-auditoria-neveras" class="nav-link">
          <span>Módulo 16: Auditoría de Neveras</span>
          <span class="nav-badge">Arqueo</span>
        </a>
      </li>
    </ul>

    <div class="sidebar-section-title">I+D, Analítica y Gobernanza</div>
    <ul class="nav-list">
      <li class="nav-item">
        <a href="#modulo-investigacion-docencia" class="nav-link">
          <span>Módulo 17: Investigación y Docencia</span>
          <span class="nav-badge">Blindado</span>
        </a>
      </li>
      <li class="nav-item">
        <a href="#modulo-reportes-trazabilidad" class="nav-link">
          <span>Módulo 18: Reportes y Trazabilidad</span>
          <span class="nav-badge">Auditoría</span>
        </a>
      </li>
      <li class="nav-item">
        <a href="#modulo-administracion-usuarios" class="nav-link">
          <span>Módulo 19: Administración y Políticas</span>
          <span class="nav-badge">RBAC</span>
        </a>
      </li>
    </ul>

    <div class="sidebar-section-title">Apéndices y Ayuda</div>
    <ul class="nav-list">
      <li class="nav-item">
        <a href="#apendice-glosario" class="nav-link">
          <span>Apéndice A: Glosario</span>
          <span class="nav-badge">Términos</span>
        </a>
      </li>
      <li class="nav-item">
        <a href="#apendice-errores" class="nav-link">
          <span>Apéndice B: Errores y Solución</span>
          <span class="nav-badge">FAQ</span>
        </a>
      </li>
      <li class="nav-item">
        <a href="#apendice-buenas-practicas" class="nav-link">
          <span>Apéndice C: Buenas Prácticas</span>
          <span class="nav-badge">Bioética</span>
        </a>
      </li>
    </ul>
  </aside>
`;
