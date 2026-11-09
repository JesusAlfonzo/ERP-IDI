import { Font } from "@react-pdf/renderer";

/**
 * Registra un callback de guionado inteligente universal para @react-pdf/renderer.
 * Por defecto, react-pdf utiliza un diccionario de inglés que nunca divide códigos,
 * SKUs, seriales o números largos, causando que desborden el ancho de su columna.
 *
 * Con este callback registrado:
 * 1. Los códigos con delimitadores (-, _, /, ., :, #, |, \) se dividen en sus partes.
 * 2. Las secuencias alfanuméricas continuas densas (> 5 caracteres) se subdividen en fragmentos de 4 caracteres.
 * 3. En caso de códigos extremos (ej. 60+ caracteres como PBS-TEST-1794168318948), react-pdf ajusta
 *    de forma exacta cada fragmento a la línea disponible y salta a la siguiente sin desbordar la celda contigua.
 */
try {
  Font.registerHyphenationCallback((word) => {
    if (!word || word.length <= 4) return [word];

    // Limpiar caracteres no imprimibles o separadores invisibles previos
    const clean = word.replace(/[\u200b\u00ad]/g, "");

    // Si contiene símbolos o delimitadores
    if (/[-_/.:#|\\]/.test(clean)) {
      const parts: string[] = [];
      let current = "";
      for (let i = 0; i < clean.length; i++) {
        if (i > 0 && /[-_/.:#|\\]/.test(clean[i])) {
          if (current) parts.push(current);
          current = clean[i];
        } else {
          current += clean[i];
          if (current.length >= 5) {
            parts.push(current);
            current = "";
          }
        }
      }
      if (current) parts.push(current);
      return parts.filter(Boolean);
    }

    // Si es un código o token largo continuo sin separadores (> 6 caracteres)
    if (clean.length > 6) {
      const parts: string[] = [];
      for (let i = 0; i < clean.length; i += 4) {
        parts.push(clean.slice(i, i + 4));
      }
      return parts;
    }

    return [clean];
  });
} catch {
  // Manejo seguro para SSR o entornos sin Font
}

/**
 * Limpia y normaliza códigos largos o valores en celdas PDF.
 */
export function formatPdfCode(value: unknown): string {
  if (value == null) return "---";
  const str = String(value).trim();
  if (!str) return "---";
  return str;
}

/**
 * Procesa el contenido de una celda de tabla PDF para asegurar que cualquier
 * cadena, número o fragmento de texto con códigos/SKUs largos se normalice limpiamente.
 */
export function processPdfCellContent(children: unknown): unknown {
  if (children == null || children === false) return "";
  if (typeof children === "string" || typeof children === "number") {
    return formatPdfCode(children);
  }
  if (Array.isArray(children)) {
    return children.map((child) =>
      typeof child === "string" || typeof child === "number"
        ? formatPdfCode(child)
        : child
    );
  }
  return children;
}
