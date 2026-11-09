/**
 * Tema Institucional y Configuración Visual Centralizada para Documentos PDF de ERP-IDI.
 * Basado en la identidad corporativa del Instituto de Inmunología "Dr. Nicolás E. Bianco Colmenares" - UCV.
 */

export const PDF_COLORS = {
  // Azules institucionales
  navyDark: "#1e3a8a",       // Azul principal cabeceras y totales
  navyMedium: "#1e40af",     // Azul secundario y acentos
  navyLight: "#eff6ff",      // Fondo suave para badges y banners
  navyBorder: "#93c5fd",     // Bordes de acento azul

  // Escala neutra de lectura técnica
  textPrimary: "#0f172a",    // Texto principal oscuro (slate-900)
  textSecondary: "#334155",  // Texto secundario y párrafos (slate-700)
  textMuted: "#64748b",      // Etiquetas y metadatos (slate-500)
  textFaint: "#94a3b8",      // Notas al pie tenues

  // Bordes y fondos
  borderDark: "#94a3b8",     // Bordes principales
  borderLight: "#cbd5e1",    // Bordes estándar de tablas y tarjetas
  borderFaint: "#e2e8f0",    // Separadores de renglón
  bgWhite: "#ffffff",
  bgSubtle: "#f8fafc",       // Fondo filas alternas y tarjetas (slate-50)
  bgHeader: "#f1f5f9",       // Fondo cabeceras secundarias (slate-100)

  // Semántica / Estados
  emerald: "#15803d",        // Aprobado / Solvente / Entrada
  emeraldBg: "#f0fdf4",
  amber: "#b45309",          // Pendiente / Alerta térmica / Advertencia
  amberBg: "#fef3c7",
  rose: "#be123c",           // Cuarentena / Salida / Rechazado / Deuda
  roseBg: "#ffe4e6",
  indigo: "#4338ca",         // Trazabilidad / Auditoría
  indigoBg: "#eef2ff",
};

export const PDF_FONTS = {
  regular: "Helvetica",
  bold: "Helvetica-Bold",
  oblique: "Helvetica-Oblique",
};

export const PDF_INSTITUTION = {
  name: "INMUNOLOGIA ASOCIACION CIVIL",
  fullName: "Instituto de Inmunología \"Dr. Nicolás E. Bianco Colmenares\"",
  subName: "Facultad de Medicina · Universidad Central de Venezuela (UCV)",
  rif: "J-30710739-1",
  address: "Edif. Instituto de Inmunología, Ciudad Universitaria, Caracas 1050, Venezuela",
  contactEmail: "contacto@idi.org.ve · administracion@idi.org.ve",
  phone: "+58 (212) 605-3500 / 605-3501",
  systemSignature: "ERP-IDI v2.0 · Plataforma Integral de Gestión Biomédica y Analítica",
};
