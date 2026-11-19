// tools/manual_builder/css.js
export const styles = `
  /* Reset y Variables Globales */
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :root {
    --primary: #1e3a8a;
    --primary-light: #3b82f6;
    --primary-dark: #172554;
    --primary-soft: #eff6ff;
    --accent: #0284c7;
    --accent-soft: #f0f9ff;
    --success: #059669;
    --success-soft: #ecfdf5;
    --warning: #d97706;
    --warning-soft: #fffbeb;
    --danger: #dc2626;
    --danger-soft: #fef2f2;
    --purple: #7c3aed;
    --purple-soft: #f5f3ff;
    --slate-50: #f8fafc;
    --slate-100: #f1f5f9;
    --slate-200: #e2e8f0;
    --slate-300: #cbd5e1;
    --slate-400: #94a3b8;
    --slate-500: #64748b;
    --slate-600: #475569;
    --slate-700: #334155;
    --slate-800: #1e293b;
    --slate-900: #0f172a;
    
    --sidebar-width: 320px;
    --header-height: 70px;
    --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
    --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  }

  html {
    scroll-behavior: smooth;
    font-size: 16px;
  }

  body {
    font-family: var(--font-sans);
    color: var(--slate-800);
    background-color: var(--slate-50);
    line-height: 1.6;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  /* Header Superior Institucional */
  .top-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: var(--header-height);
    background: #ffffff;
    border-bottom: 1px solid var(--slate-200);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1.5rem;
    z-index: 100;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
  }

  .brand-area {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .brand-logo-badge {
    background: linear-gradient(135deg, var(--primary), var(--accent));
    color: white;
    width: 44px;
    height: 44px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 1.15rem;
    letter-spacing: -0.5px;
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
  }

  .brand-text h1 {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--slate-900);
    line-height: 1.2;
  }

  .brand-text p {
    font-size: 0.75rem;
    color: var(--slate-500);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .search-container {
    position: relative;
    width: 320px;
  }

  .search-input {
    width: 100%;
    padding: 0.5rem 0.75rem 0.5rem 2.25rem;
    border: 1px solid var(--slate-300);
    border-radius: 8px;
    font-size: 0.85rem;
    background: var(--slate-100);
    color: var(--slate-800);
    transition: all 0.2s ease;
  }

  .search-input:focus {
    outline: none;
    border-color: var(--primary-light);
    background: #ffffff;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  }

  .search-icon {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--slate-400);
    pointer-events: none;
    width: 16px;
    height: 16px;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 0.9rem;
    font-size: 0.825rem;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.15s ease;
    text-decoration: none;
  }

  .btn-outline {
    background: #ffffff;
    border-color: var(--slate-300);
    color: var(--slate-700);
  }

  .btn-outline:hover {
    background: var(--slate-100);
    border-color: var(--slate-400);
    color: var(--slate-900);
  }

  .btn-primary {
    background: var(--primary);
    color: #ffffff;
  }

  .btn-primary:hover {
    background: var(--primary-dark);
  }

  /* Contenedor Principal con Sidebar */
  .layout-container {
    display: flex;
    margin-top: var(--header-height);
    min-height: calc(100vh - var(--header-height));
  }

  /* Barra Lateral de Navegación */
  .sidebar {
    width: var(--sidebar-width);
    position: fixed;
    top: var(--header-height);
    bottom: 0;
    left: 0;
    background: #ffffff;
    border-right: 1px solid var(--slate-200);
    overflow-y: auto;
    padding: 1.25rem 0.75rem 2rem;
    z-index: 50;
  }

  .sidebar-section-title {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--slate-400);
    padding: 0.75rem 0.75rem 0.35rem;
    margin-top: 0.5rem;
  }

  .nav-list {
    list-style: none;
  }

  .nav-item {
    margin-bottom: 2px;
  }

  .nav-link {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.45rem 0.75rem;
    border-radius: 6px;
    color: var(--slate-600);
    text-decoration: none;
    font-size: 0.825rem;
    font-weight: 500;
    transition: all 0.15s ease;
  }

  .nav-link:hover {
    background: var(--slate-100);
    color: var(--slate-900);
  }

  .nav-link.active {
    background: var(--primary-soft);
    color: var(--primary);
    font-weight: 600;
  }

  .nav-badge {
    font-size: 0.65rem;
    padding: 0.15rem 0.45rem;
    border-radius: 9999px;
    background: var(--slate-200);
    color: var(--slate-700);
    font-weight: 600;
  }

  .nav-link.active .nav-badge {
    background: var(--primary-light);
    color: #ffffff;
  }

  /* Área Principal de Contenido */
  .main-content {
    margin-left: var(--sidebar-width);
    flex: 1;
    padding: 2.5rem 3.5rem;
    max-width: 1180px;
  }

  /* Portada del Manual */
  .manual-hero {
    background: linear-gradient(135deg, var(--slate-900) 0%, var(--primary-dark) 100%);
    color: #ffffff;
    border-radius: 16px;
    padding: 3rem 2.5rem;
    margin-bottom: 3rem;
    box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.3);
    position: relative;
    overflow: hidden;
  }

  .manual-hero::after {
    content: "";
    position: absolute;
    top: -50px;
    right: -50px;
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.25) 0%, rgba(255, 255, 255, 0) 70%);
    border-radius: 50%;
  }

  .hero-tag {
    display: inline-block;
    padding: 0.3rem 0.8rem;
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(8px);
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-bottom: 1.25rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .manual-hero h1 {
    font-size: 2.3rem;
    font-weight: 800;
    line-height: 1.15;
    margin-bottom: 0.75rem;
    letter-spacing: -0.02em;
  }

  .manual-hero p.subtitle {
    font-size: 1.05rem;
    color: var(--slate-300);
    max-width: 800px;
    margin-bottom: 1.75rem;
    line-height: 1.5;
  }

  .hero-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    padding-top: 1.25rem;
    font-size: 0.8rem;
    color: var(--slate-300);
  }

  .hero-meta-item strong {
    color: #ffffff;
  }

  /* Secciones y Módulos */
  .module-card {
    background: #ffffff;
    border: 1px solid var(--slate-200);
    border-radius: 14px;
    padding: 2.25rem;
    margin-bottom: 2.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
    scroll-margin-top: calc(var(--header-height) + 1.5rem);
  }

  .module-header {
    border-bottom: 2px solid var(--slate-100);
    padding-bottom: 1.25rem;
    margin-bottom: 1.75rem;
  }

  .module-category {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--accent);
    margin-bottom: 0.35rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .module-title {
    font-size: 1.65rem;
    font-weight: 700;
    color: var(--slate-900);
    letter-spacing: -0.015em;
    line-height: 1.25;
  }

  .module-route-banner {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: var(--slate-100);
    border: 1px solid var(--slate-200);
    border-radius: 6px;
    padding: 0.35rem 0.75rem;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--slate-700);
    margin-top: 0.75rem;
  }

  .module-route-banner svg {
    color: var(--slate-500);
  }

  /* Subsecciones h3 y h4 */
  h3.section-heading {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--slate-800);
    margin: 1.75rem 0 0.85rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    border-left: 4px solid var(--primary);
    padding-left: 0.65rem;
  }

  h4.subsection-heading {
    font-size: 1rem;
    font-weight: 600;
    color: var(--slate-700);
    margin: 1.25rem 0 0.5rem;
  }

  p {
    margin-bottom: 1rem;
    color: var(--slate-700);
    font-size: 0.925rem;
  }

  ul, ol {
    margin-bottom: 1.25rem;
    padding-left: 1.5rem;
    color: var(--slate-700);
    font-size: 0.925rem;
  }

  li {
    margin-bottom: 0.35rem;
  }

  /* Cajas de Aviso / Callouts */
  .callout {
    border-radius: 8px;
    padding: 1rem 1.25rem;
    margin: 1.25rem 0;
    display: flex;
    gap: 0.85rem;
    border-left: 4px solid;
    font-size: 0.875rem;
  }

  .callout-icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    margin-top: 2px;
  }

  .callout-content {
    flex: 1;
  }

  .callout-title {
    font-weight: 700;
    margin-bottom: 0.25rem;
  }

  .callout-info {
    background: var(--accent-soft);
    border-left-color: var(--accent);
    color: #0369a1;
  }
  .callout-info .callout-title { color: #0284c7; }

  .callout-note {
    background: var(--primary-soft);
    border-left-color: var(--primary-light);
    color: #1e40af;
  }
  .callout-note .callout-title { color: var(--primary); }

  .callout-tip {
    background: var(--success-soft);
    border-left-color: var(--success);
    color: #065f46;
  }
  .callout-tip .callout-title { color: #059669; }

  .callout-warning {
    background: var(--warning-soft);
    border-left-color: var(--warning);
    color: #92400e;
  }
  .callout-warning .callout-title { color: #d97706; }

  .callout-danger {
    background: var(--danger-soft);
    border-left-color: var(--danger);
    color: #991b1b;
  }
  .callout-danger .callout-title { color: #dc2626; }

  /* Badges de Estados e Insignias */
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.2rem 0.55rem;
    border-radius: 6px;
    font-size: 0.725rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    white-space: nowrap;
    border: 1px solid transparent;
  }

  .badge-success {
    background: #dcfce7;
    color: #15803d;
    border-color: #bbf7d0;
  }

  .badge-warning {
    background: #fef3c7;
    color: #b45309;
    border-color: #fde68a;
  }

  .badge-danger {
    background: #fee2e2;
    color: #b91c1c;
    border-color: #fecaca;
  }

  .badge-info {
    background: #e0f2fe;
    color: #0369a1;
    border-color: #bae6fd;
  }

  .badge-purple {
    background: #ede9fe;
    color: #6d28d9;
    border-color: #ddd6fe;
  }

  .badge-neutral {
    background: var(--slate-100);
    color: var(--slate-700);
    border-color: var(--slate-300);
  }

  /* Tablas de Datos */
  .table-container {
    overflow-x: auto;
    margin: 1.25rem 0 1.5rem;
    border: 1px solid var(--slate-200);
    border-radius: 8px;
    background: #ffffff;
  }

  table.data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
    text-align: left;
  }

  table.data-table th {
    background: var(--slate-100);
    color: var(--slate-700);
    font-weight: 600;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--slate-200);
  }

  table.data-table td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--slate-100);
    color: var(--slate-700);
    vertical-align: top;
  }

  table.data-table tr:last-child td {
    border-bottom: none;
  }

  table.data-table tr:hover td {
    background-color: var(--slate-50);
  }

  code.field-name {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    background: var(--slate-100);
    padding: 0.15rem 0.35rem;
    border-radius: 4px;
    color: var(--primary);
    font-weight: 600;
  }

  /* Secuencias de Pasos Paso a Paso */
  .step-flow {
    list-style: none;
    padding: 0;
    margin: 1.25rem 0;
    position: relative;
  }

  .step-flow-item {
    display: flex;
    gap: 1.25rem;
    margin-bottom: 1.5rem;
    position: relative;
  }

  .step-flow-item:not(:last-child)::before {
    content: "";
    position: absolute;
    left: 17px;
    top: 36px;
    bottom: -16px;
    width: 2px;
    background: var(--slate-200);
  }

  .step-number {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.9rem;
    box-shadow: 0 2px 4px rgba(30, 58, 138, 0.2);
  }

  .step-content {
    flex: 1;
    background: var(--slate-50);
    border: 1px solid var(--slate-200);
    border-radius: 8px;
    padding: 1rem 1.25rem;
  }

  .step-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--slate-900);
    margin-bottom: 0.35rem;
  }

  .step-desc {
    font-size: 0.875rem;
    color: var(--slate-600);
    margin-bottom: 0;
  }

  /* Diagramas de Flujo en CSS Puro */
  .flowchart {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    background: var(--slate-100);
    padding: 1.25rem;
    border-radius: 10px;
    border: 1px dashed var(--slate-300);
    margin: 1.25rem 0;
  }

  .flow-node {
    background: #ffffff;
    border: 1px solid var(--slate-300);
    padding: 0.6rem 1rem;
    border-radius: 8px;
    font-size: 0.825rem;
    font-weight: 600;
    color: var(--slate-800);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .flow-node.active-state {
    border-color: var(--primary-light);
    background: var(--primary-soft);
    color: var(--primary);
  }

  .flow-node small {
    font-size: 0.7rem;
    color: var(--slate-500);
    font-weight: 400;
    margin-top: 2px;
  }

  .flow-arrow {
    color: var(--slate-400);
    font-weight: 700;
    font-size: 1.1rem;
  }

  /* Grid de Tarjetas de Características */
  .grid-2 {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
    margin: 1.25rem 0;
  }

  .card-feature {
    background: var(--slate-50);
    border: 1px solid var(--slate-200);
    border-radius: 8px;
    padding: 1.25rem;
  }

  .card-feature h5 {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--slate-900);
    margin-bottom: 0.35rem;
  }

  .card-feature p {
    font-size: 0.825rem;
    color: var(--slate-600);
    margin-bottom: 0;
  }

  /* Footer */
  .manual-footer {
    background: #ffffff;
    border-top: 1px solid var(--slate-200);
    padding: 2.5rem 2rem;
    text-align: center;
    color: var(--slate-500);
    font-size: 0.85rem;
    margin-top: auto;
  }

  /* Botón Volver Arriba */
  .back-to-top {
    position: fixed;
    bottom: 25px;
    right: 25px;
    background: var(--slate-900);
    color: white;
    width: 42px;
    height: 42px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: all 0.2s ease;
    border: none;
    opacity: 0;
    pointer-events: none;
    z-index: 90;
  }

  .back-to-top.visible {
    opacity: 1;
    pointer-events: auto;
  }

  .back-to-top:hover {
    background: var(--primary);
    transform: translateY(-2px);
  }

  /* Estilos de Impresión */
  @media print {
    .top-header,
    .sidebar,
    .back-to-top,
    .btn-print {
      display: none !important;
    }

    body {
      background: white !important;
      color: black !important;
      font-size: 10pt;
    }

    .layout-container {
      margin-top: 0 !important;
    }

    .main-content {
      margin-left: 0 !important;
      padding: 0 !important;
      max-width: 100% !important;
    }

    .manual-hero {
      background: #f1f5f9 !important;
      color: black !important;
      box-shadow: none !important;
      border: 1px solid #cbd5e1 !important;
      page-break-after: always;
    }

    .manual-hero h1,
    .manual-hero p.subtitle,
    .hero-meta,
    .hero-meta-item strong {
      color: black !important;
    }

    .module-card {
      box-shadow: none !important;
      border: 1px solid #e2e8f0 !important;
      page-break-inside: avoid;
      page-break-before: auto;
      margin-bottom: 2cm;
    }

    table.data-table {
      page-break-inside: avoid;
    }
  }

  /* Responsive Design */
  @media (max-width: 1024px) {
    .sidebar {
      display: none;
    }
    .main-content {
      margin-left: 0;
      padding: 1.5rem;
    }
    .search-container {
      width: 200px;
    }
  }
`;
