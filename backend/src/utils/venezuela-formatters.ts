export const VALID_RIF_PREFIXES = ['J', 'V', 'E', 'G', 'P', 'C'] as const;
export type RifPrefix = (typeof VALID_RIF_PREFIXES)[number];

const VE_AREA_CODE_REGEX = /^(0412|0414|0424|0416|0426|02\d{2}|0500|0800|0900)$/;

/**
 * Normaliza y valida un RIF o documento de identidad fiscal venezolano.
 * - J, G, C: RIF obligatorio de 8 o 9 dígitos -> X-XXXXXXXX-X (ej. J-12345678-9)
 * - V, E: Cédula (6-8 dígitos -> V-12345678) o RIF personal (9 dígitos -> V-12345678-9)
 * - P: Pasaporte (5-12 caracteres alfanuméricos -> P-AB123456)
 */
export function normalizeAndValidateRif(raw: string): string {
  const cleaned = String(raw || '').trim().toUpperCase();
  if (!cleaned) {
    const error: any = new Error('El RIF o documento de identidad es obligatorio');
    error.statusCode = 400;
    throw error;
  }

  const prefixMatch = cleaned.match(/^([JVEGPC])[\s-]*(.+)$/);
  if (!prefixMatch || !prefixMatch[1] || !prefixMatch[2]) {
    const error: any = new Error(
      'El RIF/ID debe comenzar con un prefijo válido (J, V, E, G, P o C), por ejemplo: J-12345678-9 o V-12345678'
    );
    error.statusCode = 400;
    throw error;
  }

  const prefix = prefixMatch[1] as RifPrefix;
  const rawBody = prefixMatch[2].trim();

  if (prefix === 'P') {
    const alnum = rawBody.replace(/[\s.-]/g, '');
    if (!/^[A-Z0-9]{5,12}$/.test(alnum)) {
      const error: any = new Error(
        'El número de pasaporte (P) debe contener entre 5 y 12 caracteres alfanuméricos (ej. P-12345678)'
      );
      error.statusCode = 400;
      throw error;
    }
    return `P-${alnum}`;
  }

  // Para J, G, C, V, E solo se permiten dígitos, guiones, puntos o espacios en el cuerpo
  if (!/^[\d\s.-]+$/.test(rawBody)) {
    const error: any = new Error(
      `El documento con prefijo ${prefix} solo puede contener dígitos numéricos`
    );
    error.statusCode = 400;
    throw error;
  }

  const digits = rawBody.replace(/\D/g, '');

  if (prefix === 'J' || prefix === 'G' || prefix === 'C') {
    if (digits.length < 8 || digits.length > 9) {
      const error: any = new Error(
        `El RIF tipo ${prefix} debe contener 8 dígitos y 1 dígito verificador (ej. ${prefix}-12345678-9)`
      );
      error.statusCode = 400;
      throw error;
    }
    return `${prefix}-${digits.slice(0, -1)}-${digits.slice(-1)}`;
  }

  // V o E: Cédula (6 a 8 dígitos) o RIF personal (9 dígitos)
  if (digits.length >= 6 && digits.length <= 8) {
    return `${prefix}-${digits}`;
  }
  if (digits.length === 9) {
    return `${prefix}-${digits.slice(0, 8)}-${digits.slice(8)}`;
  }

  const error: any = new Error(
    `El documento tipo ${prefix} debe tener entre 6 y 8 dígitos (cédula) o 9 dígitos si incluye dígito verificador de RIF (ej. ${prefix}-12345678 o ${prefix}-12345678-9)`
  );
  error.statusCode = 400;
  throw error;
}

/**
 * Normaliza y valida un número telefónico (Venezuela o Internacional).
 * - Venezuela (móvil 0412/0414/0424/0416/0426 o fijo 02XX, también con +58): normaliza a 0XXX-XXXXXXX
 * - Internacional (+código país): 8 a 15 dígitos en total, conserva prefijo '+'
 */
export function normalizeAndValidatePhone(
  raw?: string | null
): string | null {
  if (raw === undefined || raw === null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  // Caso Venezuela con prefijo +58 o 0058
  if (/^(\+58|0058)/.test(trimmed)) {
    const allDigits = trimmed.replace(/\D/g, '');
    const after58 = allDigits.startsWith('0058')
      ? allDigits.slice(4)
      : allDigits.slice(2);
    const local11 = after58.startsWith('0') ? after58 : `0${after58}`;
    if (local11.length === 11 && VE_AREA_CODE_REGEX.test(local11.slice(0, 4))) {
      return `${local11.slice(0, 4)}-${local11.slice(4)}`;
    }
    const error: any = new Error(
      'Teléfono venezolano inválido. Debe incluir operadora o código de área válido y 7 dígitos (ej. 0414-1234567 o 0212-5551234)'
    );
    error.statusCode = 400;
    throw error;
  }

  // Caso Internacional (+...)
  if (trimmed.startsWith('+')) {
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) {
      const error: any = new Error(
        'El teléfono internacional debe incluir código de país y entre 8 y 15 dígitos en total (ej. +1 305-555-1234)'
      );
      error.statusCode = 400;
      throw error;
    }
    // Preservar formato limpio con '+'
    return `+${trimmed.slice(1).replace(/[^\d\s-]/g, '').replace(/\s+/g, ' ').trim()}`;
  }

  // Caso Nacional Venezuela
  const digits = trimmed.replace(/\D/g, '');
  let normalized = digits;
  if (digits.length === 10 && (digits.startsWith('4') || digits.startsWith('2'))) {
    normalized = `0${digits}`;
  }

  if (
    normalized.length !== 11 ||
    !VE_AREA_CODE_REGEX.test(normalized.slice(0, 4))
  ) {
    const error: any = new Error(
      'Teléfono inválido. Seleccione una operadora (0412, 0414, 0424, 0416, 0426) o código de área (02XX) seguido de 7 dígitos, o use + para números internacionales.'
    );
    error.statusCode = 400;
    throw error;
  }

  return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
}
