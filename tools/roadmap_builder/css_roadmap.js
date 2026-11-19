// tools/roadmap_builder/css_roadmap.js
export const roadmapStyles = `
  /* Reset y Variables Globales */
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :root {
    --primary: #1e3a8a;
    --primary-light: #2563eb;
    --primary-dark: #0f172a;
    --primary-soft: #eff6ff;
    --accent: #0284c7;
    --accent-soft: #f0f9ff;
    --teal: #0d9488;
    --teal-soft: #ccfbf1;
    --success: #059669;
    --success-soft: #ecfdf5;
    --warning: #d97706;
    --warning-soft: #fffbeb;
    --danger: #dc2626;
    --danger-soft: #fef2f2;
    --purple: #7c3aed;
    --purple-soft: #f5f3ff;
    --indigo: #4338ca;
    
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

    --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  }

  html {
    scroll-behavior: smooth;
    font-size: 16px;
  }

  body {
    font-family: var(--font-sans);
    color: var(--slate-800);
    background-color: #f8fafc;
    line-height: 1.6;
    padding-bottom: 5rem;
  }

  /* Header Superior Fijo */
  .roadmap-header {
    position: sticky;
    top: 0;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--slate-200);
    z-index: 1000;
    padding: 0.75rem 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  .header-brand {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .brand-logo {
    width: 44px;
    height: 44px;
    background: linear-gradient(135deg, var(--primary), var(--accent));
    color: white;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 1.15rem;
    box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25);
  }

  .header-titles h1 {
    font-size: 1.15rem;
    font-weight: 800;
    color: var(--slate-900);
    line-height: 1.2;
  }

  .header-titles p {
    font-size: 0.75rem;
    color: var(--slate-500);
  }

  .header-controls {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .role-filter-select {
    padding: 0.45rem 0.85rem;
    border-radius: 8px;
    border: 1px solid var(--slate-300);
    background: #ffffff;
    font-size: 0.825rem;
    color: var(--slate-700);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .role-filter-select:focus {
    outline: none;
    border-color: var(--primary-light);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 0.9rem;
    font-size: 0.825rem;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.2s ease;
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

  /* Ribbon de Fases / Barra de Progreso del Roadmap */
  .roadmap-nav-ribbon {
    background: #ffffff;
    border-bottom: 1px solid var(--slate-200);
    padding: 0.75rem 2rem;
    overflow-x: auto;
    white-space: nowrap;
    position: sticky;
    top: 61px;
    z-index: 900;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  }

  .ribbon-track {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 100%;
    justify-content: space-between;
  }

  .ribbon-step {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.75rem;
    border-radius: 9999px;
    background: var(--slate-100);
    color: var(--slate-600);
    font-size: 0.8rem;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.2s ease;
    border: 1px solid transparent;
  }

  .ribbon-step:hover {
    background: var(--primary-soft);
    color: var(--primary);
    border-color: var(--primary-light);
  }

  .ribbon-step.active {
    background: var(--primary);
    color: white;
  }

  .ribbon-step-num {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.1);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    font-weight: 700;
  }

  .ribbon-step.active .ribbon-step-num {
    background: white;
    color: var(--primary);
  }

  .ribbon-arrow {
    color: var(--slate-300);
    font-size: 0.9rem;
    font-weight: bold;
  }

  /* Contenedor Principal */
  .container {
    max-width: 1280px;
    margin: 2rem auto;
    padding: 0 1.5rem;
  }

  /* Hero del Roadmap */
  .roadmap-hero {
    background: linear-gradient(135deg, var(--slate-900) 0%, #172554 100%);
    color: white;
    border-radius: 16px;
    padding: 3rem 2.5rem;
    margin-bottom: 2.5rem;
    box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.3);
    position: relative;
    overflow: hidden;
  }

  .roadmap-hero::after {
    content: "";
    position: absolute;
    top: -60px;
    right: -60px;
    width: 320px;
    height: 320px;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, rgba(255, 255, 255, 0) 70%);
    border-radius: 50%;
    pointer-events: none;
  }

  .hero-pill {
    display: inline-block;
    padding: 0.3rem 0.85rem;
    background: rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(8px);
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 1rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .roadmap-hero h2 {
    font-size: 2.25rem;
    font-weight: 800;
    margin-bottom: 0.75rem;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }

  .roadmap-hero p.lead {
    font-size: 1.05rem;
    color: var(--slate-300);
    max-width: 860px;
    line-height: 1.6;
    margin-bottom: 1.75rem;
  }

  .hero-stats-row {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    padding-top: 1.5rem;
  }

  .hero-stat-card {
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(6px);
    border-radius: 10px;
    padding: 0.75rem 1.25rem;
    border: 1px solid rgba(255, 255, 255, 0.12);
  }

  .hero-stat-card .stat-number {
    font-size: 1.35rem;
    font-weight: 800;
    color: #60a5fa;
  }

  .hero-stat-card .stat-label {
    font-size: 0.75rem;
    color: var(--slate-300);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  /* Sección de Arquitectura Visual Macro (Swimlanes / Carriles) */
  .macro-architecture-section {
    background: #ffffff;
    border: 1px solid var(--slate-200);
    border-radius: 16px;
    padding: 2.25rem;
    margin-bottom: 3rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.04);
  }

  .section-header-box {
    margin-bottom: 1.75rem;
    border-bottom: 2px solid var(--slate-100);
    padding-bottom: 1rem;
  }

  .section-header-box h3 {
    font-size: 1.5rem;
    font-weight: 800;
    color: var(--slate-900);
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  .section-header-box p {
    font-size: 0.875rem;
    color: var(--slate-500);
    margin-top: 0.25rem;
  }

  /* Canvas de Carriles / Swimlanes */
  .swimlanes-container {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .swimlane {
    display: flex;
    border: 1px solid var(--slate-200);
    border-radius: 12px;
    overflow: hidden;
    background: var(--slate-50);
  }

  .swimlane-header {
    width: 220px;
    background: var(--slate-800);
    color: white;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    flex-shrink: 0;
    border-right: 1px solid var(--slate-700);
  }

  .swimlane-header.lane-gov { background: linear-gradient(135deg, #1e293b, #334155); }
  .swimlane-header.lane-proc { background: linear-gradient(135deg, #1e3a8a, #2563eb); }
  .swimlane-header.lane-wh { background: linear-gradient(135deg, #065f46, #059669); }
  .swimlane-header.lane-dept { background: linear-gradient(135deg, #92400e, #d97706); }
  .swimlane-header.lane-lab { background: linear-gradient(135deg, #0369a1, #0284c7); }
  .swimlane-header.lane-sci { background: linear-gradient(135deg, #5b21b6, #7c3aed); }

  .swimlane-header h4 {
    font-size: 0.95rem;
    font-weight: 700;
    margin-bottom: 0.25rem;
  }

  .swimlane-header span.lane-role {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.8);
    font-family: var(--font-mono);
  }

  .swimlane-body {
    padding: 1.25rem;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.85rem;
    flex: 1;
    background: #ffffff;
  }

  /* Nodos de Proceso */
  .p-node {
    background: #ffffff;
    border: 1px solid var(--slate-300);
    border-radius: 8px;
    padding: 0.65rem 0.9rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.03);
    min-width: 170px;
    transition: all 0.2s ease;
    cursor: default;
    position: relative;
  }

  .p-node:hover {
    border-color: var(--primary-light);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(37, 99, 235, 0.12);
  }

  .p-node-title {
    font-size: 0.825rem;
    font-weight: 700;
    color: var(--slate-900);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .p-node-route {
    font-family: var(--font-mono);
    font-size: 0.675rem;
    color: var(--slate-500);
    margin-top: 0.25rem;
    display: block;
  }

  .p-node-status {
    margin-top: 0.35rem;
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
  }

  .p-connector {
    color: var(--slate-400);
    font-size: 1.15rem;
    font-weight: 900;
  }

  /* Tarjetas Detalladas de Fase (Roadmap Steps) */
  .phases-stream {
    display: flex;
    flex-direction: column;
    gap: 2.5rem;
  }

  .phase-card {
    background: #ffffff;
    border: 1px solid var(--slate-200);
    border-radius: 16px;
    padding: 2.25rem;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.03);
    position: relative;
    scroll-margin-top: 140px;
    transition: border-color 0.2s ease;
  }

  .phase-card.active-target {
    border-color: var(--primary-light);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
  }

  .phase-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    border-bottom: 2px solid var(--slate-100);
    padding-bottom: 1.25rem;
    margin-bottom: 1.75rem;
  }

  .phase-title-group {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .phase-badge-number {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: var(--primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 1.3rem;
    box-shadow: 0 4px 8px rgba(30, 58, 138, 0.25);
    flex-shrink: 0;
  }

  .phase-badge-number.num-teal { background: var(--teal); }
  .phase-badge-number.num-amber { background: var(--warning); }
  .phase-badge-number.num-emerald { background: var(--success); }
  .phase-badge-number.num-purple { background: var(--purple); }
  .phase-badge-number.num-indigo { background: var(--indigo); }
  .phase-badge-number.num-rose { background: var(--danger); }

  .phase-titles h3 {
    font-size: 1.45rem;
    font-weight: 800;
    color: var(--slate-900);
    line-height: 1.2;
  }

  .phase-titles p.phase-sub {
    font-size: 0.85rem;
    color: var(--slate-500);
    margin-top: 0.2rem;
  }

  .phase-meta-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
  }

  /* Grid de Entrada - Proceso - Salida (I-P-O Pipeline) */
  .ipo-grid {
    display: grid;
    grid-template-columns: 1fr 1.6fr 1fr;
    gap: 1.25rem;
    margin-bottom: 1.75rem;
  }

  .ipo-card {
    border-radius: 10px;
    padding: 1.25rem;
    font-size: 0.85rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .ipo-card.card-input {
    background: var(--slate-50);
    border: 1px solid var(--slate-200);
    border-left: 4px solid var(--slate-400);
  }

  .ipo-card.card-process {
    background: var(--primary-soft);
    border: 1px solid rgba(59, 130, 246, 0.25);
    border-left: 4px solid var(--primary-light);
  }

  .ipo-card.card-output {
    background: var(--success-soft);
    border: 1px solid rgba(16, 185, 129, 0.25);
    border-left: 4px solid var(--success);
  }

  .ipo-label {
    font-size: 0.725rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .ipo-card.card-input .ipo-label { color: var(--slate-600); }
  .ipo-card.card-process .ipo-label { color: var(--primary); }
  .ipo-card.card-output .ipo-label { color: var(--success); }

  .ipo-card ul {
    margin: 0;
    padding-left: 1.2rem;
    color: var(--slate-700);
  }

  .ipo-card li {
    margin-bottom: 0.35rem;
    line-height: 1.45;
  }

  /* Diagrama de Flujo Interno en CSS */
  .phase-subflow {
    background: var(--slate-50);
    border: 1px dashed var(--slate-300);
    border-radius: 12px;
    padding: 1.25rem;
    margin: 1.5rem 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.85rem;
  }

  .subflow-step {
    background: #ffffff;
    border: 1px solid var(--slate-300);
    border-radius: 8px;
    padding: 0.75rem 1rem;
    font-size: 0.825rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    flex: 1;
    min-width: 180px;
  }

  .subflow-step strong {
    display: block;
    color: var(--slate-900);
    margin-bottom: 0.25rem;
  }

  .subflow-step span {
    font-size: 0.75rem;
    color: var(--slate-500);
    line-height: 1.3;
    display: block;
  }

  /* Caso Real / Trazabilidad Concreta */
  .case-study-box {
    background: #ffffff;
    border: 1px solid #e0e7ff;
    border-radius: 10px;
    padding: 1.25rem;
    margin-top: 1.5rem;
    box-shadow: 0 1px 4px rgba(99, 102, 241, 0.06);
  }

  .case-study-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--indigo);
    margin-bottom: 0.65rem;
  }

  .case-study-content {
    font-size: 0.85rem;
    color: var(--slate-700);
    line-height: 1.5;
  }

  /* Badges */
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.2rem 0.55rem;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    border: 1px solid transparent;
  }

  .badge-blue { background: #dbeafe; color: #1e40af; border-color: #bfdbfe; }
  .badge-green { background: #dcfce7; color: #15803d; border-color: #bbf7d0; }
  .badge-amber { background: #fef3c7; color: #b45309; border-color: #fde68a; }
  .badge-red { background: #fee2e2; color: #b91c1c; border-color: #fecaca; }
  .badge-purple { background: #ede9fe; color: #6d28d9; border-color: #ddd6fe; }
  .badge-gray { background: var(--slate-100); color: var(--slate-700); border-color: var(--slate-300); }

  /* Matriz de Dependencias Cruzadas */
  .matrix-section {
    background: #ffffff;
    border: 1px solid var(--slate-200);
    border-radius: 16px;
    padding: 2.25rem;
    margin-top: 3rem;
  }

  .matrix-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
    margin-top: 1.25rem;
  }

  .matrix-table th {
    background: var(--slate-100);
    color: var(--slate-700);
    font-weight: 700;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--slate-200);
    text-align: left;
  }

  .matrix-table td {
    padding: 0.85rem 1rem;
    border-bottom: 1px solid var(--slate-100);
    color: var(--slate-700);
    vertical-align: middle;
  }

  .matrix-table tr:hover td {
    background-color: var(--slate-50);
  }

  /* Footer */
  .roadmap-footer {
    text-align: center;
    padding: 3rem 1.5rem 1rem;
    color: var(--slate-500);
    font-size: 0.825rem;
  }

  /* Botón Volver Arriba */
  .back-top {
    position: fixed;
    bottom: 25px;
    right: 25px;
    background: var(--slate-900);
    color: white;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    border: none;
    opacity: 0;
    pointer-events: none;
    transition: all 0.2s ease;
    z-index: 1000;
  }

  .back-top.visible {
    opacity: 1;
    pointer-events: auto;
  }

  .back-top:hover {
    background: var(--primary);
    transform: translateY(-2px);
  }

  /* Impresión Limpia */
  @media print {
    .roadmap-header, .roadmap-nav-ribbon, .back-top, .header-controls {
      display: none !important;
    }
    body {
      background: white !important;
      color: black !important;
      font-size: 9pt;
      padding: 0;
    }
    .container {
      max-width: 100% !important;
      padding: 0 !important;
    }
    .phase-card, .macro-architecture-section, .matrix-section {
      box-shadow: none !important;
      border: 1px solid #cbd5e1 !important;
      page-break-inside: avoid;
      margin-bottom: 2cm;
    }
    .roadmap-hero {
      background: #f1f5f9 !important;
      color: black !important;
      border: 1px solid #cbd5e1 !important;
      page-break-after: always;
    }
    .roadmap-hero h2, .roadmap-hero p.lead, .hero-stat-card .stat-number, .hero-stat-card .stat-label {
      color: black !important;
    }
  }

  /* Responsive */
  @media (max-width: 900px) {
    .ipo-grid {
      grid-template-columns: 1fr;
    }
    .swimlane {
      flex-direction: column;
    }
    .swimlane-header {
      width: 100%;
    }
  }
`;
