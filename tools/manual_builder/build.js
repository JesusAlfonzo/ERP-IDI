// tools/manual_builder/build.js
import fs from 'fs';
import path from 'path';

import { styles } from './css.js';
import { sidebarNav } from './sidebar_nav.js';
import { introContent } from './intro.js';
import { mod1to4Content } from './mod_1_4.js';
import { mod5to8Content } from './mod_5_8.js';
import { mod9to12Content } from './mod_9_12.js';
import { mod13to16Content } from './mod_13_16.js';
import { mod17to19Content } from './mod_17_19.js';
import { appendicesContent, clientScript } from './appendices.js';

const htmlTemplate = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Manual de Usuario Integral por Módulos para ERP-IDI - Instituto de Inmunología Dr. Nicolás E. Bianco Colmenares (IDI - UCV)">
  <meta name="author" content="Instituto de Inmunología Dr. Nicolás E. Bianco Colmenares (IDI - UCV)">
  <title>Manual de Usuario por Módulos - ERP-IDI</title>
  <style>
${styles}
  </style>
</head>
<body>

  <!-- BARRA DE ENCABEZADO SUPERIOR -->
  <header class="top-header">
    <div class="brand-area">
      <div class="brand-logo-badge">IDI</div>
      <div class="brand-text">
        <h1>ERP-IDI &bull; Manual de Usuario</h1>
        <p>Inst. Inmunología "Dr. Nicolás E. Bianco Colmenares" &bull; UCV</p>
      </div>
    </div>

    <div class="header-actions">
      <div class="search-container">
        <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input type="text" id="manualSearchInput" class="search-input" placeholder="Buscar módulo, campo o procedimiento..." aria-label="Buscar en el manual">
      </div>
      <button type="button" class="btn btn-outline btn-print" onclick="window.print()">
        <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
        Imprimir / Guardar PDF
      </button>
    </div>
  </header>

  <!-- CONTENEDOR PRINCIPAL CON MENÚ LATERAL Y CONTENIDO -->
  <div class="layout-container">
    ${sidebarNav}

    <main class="main-content">
      ${introContent}
      ${mod1to4Content}
      ${mod5to8Content}
      ${mod9to12Content}
      ${mod13to16Content}
      ${mod17to19Content}
      ${appendicesContent}
    </main>
  </div>

  <!-- PIE DE PÁGINA -->
  <footer class="manual-footer">
    <p>
      <strong>ERP-IDI v2.5 Enterprise</strong> &mdash; Sistema de Gestión Integral de Inventarios, Procura, Cadena de Frío e Investigación.<br>
      Instituto de Inmunología "Dr. Nicolás E. Bianco Colmenares" &bull; Facultad de Medicina &bull; Universidad Central de Venezuela (UCV).<br>
      Documento técnico generado para acceso directo fuera de rutas sin dependencias externas.
    </p>
  </footer>

  <!-- BOTÓN VOLVER ARRIBA -->
  <button type="button" id="backToTopBtn" class="back-to-top" title="Volver arriba" aria-label="Volver arriba">
    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"/></svg>
  </button>

  <script>
${clientScript}
  </script>
</body>
</html>
`;

const rootDir = process.cwd();
const docsDir = path.join(rootDir, 'docs');
const targetFileDocs = path.join(docsDir, 'MANUAL_DE_USUARIO_ERP_IDI.html');
const targetFileRoot = path.join(rootDir, 'MANUAL_DE_USUARIO_ERP_IDI.html');

if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

fs.writeFileSync(targetFileDocs, htmlTemplate, 'utf8');
fs.writeFileSync(targetFileRoot, htmlTemplate, 'utf8');

console.log('✓ Manual HTML generado exitosamente en:');
console.log('  1. ' + targetFileDocs);
console.log('  2. ' + targetFileRoot);
console.log('Tamaño del archivo:', (fs.statSync(targetFileDocs).size / 1024).toFixed(2), 'KB');
