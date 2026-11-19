// tools/roadmap_builder/build_roadmap.js
import fs from 'fs';
import path from 'path';

import { roadmapStyles } from './css_roadmap.js';
import { ribbonNav } from './ribbon_nav.js';
import { macroPipeline } from './macro_pipeline.js';
import { phasesContent } from './phases_content.js';
import { matrixAndWalkthrough } from './matrix_interconnection.js';
import { roadmapClientScript } from './roadmap_script.js';

const htmlTemplate = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Roadmap Visual y Flujo Operativo Integral por Módulos - ERP-IDI - Instituto de Inmunología Dr. Nicolás E. Bianco Colmenares (IDI - UCV)">
  <meta name="author" content="Instituto de Inmunología Dr. Nicolás E. Bianco Colmenares (IDI - UCV)">
  <title>Roadmap y Flujo Operativo Integral - ERP-IDI</title>
  <style>
${roadmapStyles}
  </style>
</head>
<body>

  <!-- ENCABEZADO SUPERIOR DEL ROADMAP -->
  <header class="roadmap-header">
    <div class="header-brand">
      <div class="brand-logo">IDI</div>
      <div class="header-titles">
        <h1>ERP-IDI &bull; Roadmap de Procesos</h1>
        <p>Flujo Operativo e Interconexión de Módulos &bull; UCV</p>
      </div>
    </div>

    <div class="header-controls">
      <label for="roleFilterSelect" style="font-size: 0.75rem; font-weight: 700; color: var(--slate-600);">Filtrar por Rol:</label>
      <select id="roleFilterSelect" class="role-filter-select" aria-label="Filtrar flujo por rol">
        <option value="ALL">Todos los Roles (Visión Global)</option>
        <option value="ADMINISTRADOR">Administrador (Gobernanza)</option>
        <option value="COMPRAS">Compras (Procura y Finanzas)</option>
        <option value="ALMACENISTA">Almacenista (Custodia y Kardex)</option>
        <option value="BIOANALISTA">Bioanalista (Frío y Corridas)</option>
        <option value="SOLICITANTE">Solicitante (Pedidos Departamentales)</option>
        <option value="INVESTIGADOR">Investigador (I+D y Subvenciones)</option>
      </select>

      <button type="button" class="btn btn-outline" onclick="window.print()">
        <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
        Imprimir / PDF
      </button>
    </div>
  </header>

  <!-- BARRA HORIZONTAL DE FASES (RIBBON TRACKER) -->
  ${ribbonNav}

  <!-- CONTENEDOR PRINCIPAL DEL ROADMAP -->
  <main class="container">
    ${macroPipeline}
    ${phasesContent}
    ${matrixAndWalkthrough}
  </main>

  <!-- PIE DE PÁGINA -->
  <footer class="roadmap-footer">
    <p>
      <strong>ERP-IDI v2.5 Enterprise</strong> &mdash; Mapa de Procesos y Arquitectura de Datos.<br>
      Instituto de Inmunología "Dr. Nicolás E. Bianco Colmenares" &bull; Facultad de Medicina &bull; Universidad Central de Venezuela.<br>
      Documento autónomo accesible en HTML con CSS puro integrado.
    </p>
  </footer>

  <!-- BOTÓN VOLVER ARRIBA -->
  <button type="button" id="backTopBtn" class="back-top" title="Volver arriba" aria-label="Volver arriba">
    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
  </button>

  <script>
${roadmapClientScript}
  </script>
</body>
</html>
`;

const rootDir = process.cwd();
const docsDir = path.join(rootDir, 'docs');
const targetDocs = path.join(docsDir, 'ROADMAP_FLUJO_SISTEMA_ERP_IDI.html');
const targetRoot = path.join(rootDir, 'ROADMAP_FLUJO_SISTEMA_ERP_IDI.html');

if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

fs.writeFileSync(targetDocs, htmlTemplate, 'utf8');
fs.writeFileSync(targetRoot, htmlTemplate, 'utf8');

console.log('✓ Roadmap HTML generado con éxito en:');
console.log('  1. ' + targetDocs);
console.log('  2. ' + targetRoot);
console.log('Tamaño del archivo:', (fs.statSync(targetDocs).size / 1024).toFixed(2), 'KB');
