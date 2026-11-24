export type RifPrefix = "J" | "V" | "E" | "G" | "P" | "C";

export const RIF_PREFIX_OPTIONS: Array<{
  value: RifPrefix;
  label: string;
  shortLabel: string;
  placeholder: string;
  hint: string;
}> = [
  {
    value: "J",
    label: "J - Jurídico (Empresa)",
    shortLabel: "J",
    placeholder: "12345678-9",
    hint: "8 dígitos + dígito verificador (ej. J-12345678-9)",
  },
  {
    value: "V",
    label: "V - Venezolano (Natural)",
    shortLabel: "V",
    placeholder: "12345678 o 12345678-9",
    hint: "6 a 8 dígitos (cédula) o 9 dígitos con RIF personal",
  },
  {
    value: "E",
    label: "E - Extranjero (Natural)",
    shortLabel: "E",
    placeholder: "12345678 o 12345678-9",
    hint: "6 a 8 dígitos (cédula) o 9 dígitos con RIF personal",
  },
  {
    value: "G",
    label: "G - Gubernamental",
    shortLabel: "G",
    placeholder: "20000062-7",
    hint: "8 dígitos + dígito verificador (ej. G-20000062-7)",
  },
  {
    value: "P",
    label: "P - Pasaporte",
    shortLabel: "P",
    placeholder: "12345678",
    hint: "5 a 12 caracteres alfanuméricos",
  },
  {
    value: "C",
    label: "C - Comuna / Consejo",
    shortLabel: "C",
    placeholder: "12345678-9",
    hint: "8 dígitos + dígito verificador",
  },
];

export const VE_PHONE_CODES: Array<{
  value: string;
  label: string;
  group: "MOVIL" | "FIJO" | "OTRO";
}> = [
  { value: "0412", label: "0412 (Digitel)", group: "MOVIL" },
  { value: "0414", label: "0414 (Movistar)", group: "MOVIL" },
  { value: "0424", label: "0424 (Movistar)", group: "MOVIL" },
  { value: "0416", label: "0416 (Movilnet)", group: "MOVIL" },
  { value: "0426", label: "0426 (Movilnet)", group: "MOVIL" },
  { value: "0212", label: "0212 (Caracas)", group: "FIJO" },
  { value: "0241", label: "0241 (Valencia)", group: "FIJO" },
  { value: "0243", label: "0243 (Maracay)", group: "FIJO" },
  { value: "0261", label: "0261 (Maracaibo)", group: "FIJO" },
  { value: "0251", label: "0251 (Barquisimeto)", group: "FIJO" },
  { value: "0281", label: "0281 (Barcelona / PLC)", group: "FIJO" },
  { value: "0295", label: "0295 (Margarita)", group: "FIJO" },
  { value: "OTRO_VE", label: "Otro código (02XX)", group: "OTRO" },
  { value: "INTL", label: "Internacional (+)", group: "OTRO" },
];

const KNOWN_VE_CODES = new Set(
  VE_PHONE_CODES.filter((c) => c.group !== "OTRO").map((c) => c.value)
);

const VE_AREA_CODE_REGEX = /^(0412|0414|0424|0416|0426|02\d{2}|0500|0800|0900)$/;

export function parseRifValue(value: string): {
  prefix: RifPrefix;
  body: string;
} {
  const cleaned = (value || "").trim().toUpperCase();
  if (!cleaned) return { prefix: "J", body: "" };

  const match = cleaned.match(/^([JVEGPC])[\s-]*(.*)$/);
  if (match && match[1]) {
    return {
      prefix: match[1] as RifPrefix,
      body: formatRifBody(match[1] as RifPrefix, match[2] || ""),
    };
  }
  return { prefix: "J", body: formatRifBody("J", cleaned) };
}

export function formatRifBody(prefix: RifPrefix, rawBody: string): string {
  if (prefix === "P") {
    return rawBody.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  }

  const digits = rawBody.replace(/\D/g, "").slice(0, 9);
  if (prefix === "J" || prefix === "G" || prefix === "C") {
    if (digits.length === 9) {
      return `${digits.slice(0, 8)}-${digits.slice(8)}`;
    }
    return digits;
  }

  // V o E: si llega a 9 dígitos, aplicar guion de RIF personal (XXXXXXXX-X)
  if (digits.length === 9) {
    return `${digits.slice(0, 8)}-${digits.slice(8)}`;
  }
  return digits;
}

export function composeRifValue(prefix: RifPrefix, body: string): string {
  const formatted = formatRifBody(prefix, body);
  if (!formatted) return "";
  return `${prefix}-${formatted}`;
}

export function validateRifValue(value: string): {
  valid: boolean;
  error?: string;
} {
  const cleaned = (value || "").trim().toUpperCase();
  if (!cleaned) {
    return { valid: false, error: "El RIF o documento de identidad es obligatorio." };
  }

  const match = cleaned.match(/^([JVEGPC])-(.+)$/);
  if (!match || !match[1] || !match[2]) {
    return {
      valid: false,
      error: "Formato de documento inválido. Use prefijo válido (J, V, E, G, P o C).",
    };
  }

  const prefix = match[1] as RifPrefix;
  const body = match[2];

  if (prefix === "P") {
    if (!/^[A-Z0-9]{5,12}$/.test(body)) {
      return {
        valid: false,
        error: "El pasaporte debe tener entre 5 y 12 caracteres alfanuméricos.",
      };
    }
    return { valid: true };
  }

  const digits = body.replace(/\D/g, "");
  if (prefix === "J" || prefix === "G" || prefix === "C") {
    if (digits.length < 8 || digits.length > 9) {
      return {
        valid: false,
        error: `El RIF ${prefix} requiere 8 dígitos + 1 dígito verificador (ej. ${prefix}-12345678-9).`,
      };
    }
    return { valid: true };
  }

  if (digits.length < 6 || digits.length > 9) {
    return {
      valid: false,
      error: `El documento ${prefix} debe tener entre 6 y 8 dígitos (cédula) o 9 dígitos si es RIF personal.`,
    };
  }

  return { valid: true };
}

export function parsePhoneValue(value: string): {
  code: string;
  customArea: string;
  localNumber: string;
} {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return { code: "0414", customArea: "", localNumber: "" };
  }

  // +58 -> normalizar a prefijo venezolano
  if (/^(\+58|0058)/.test(trimmed)) {
    const allDigits = trimmed.replace(/\D/g, "");
    const after58 = allDigits.startsWith("0058")
      ? allDigits.slice(4)
      : allDigits.slice(2);
    const local11 = after58.startsWith("0") ? after58 : `0${after58}`;
    const prefix4 = local11.slice(0, 4);
    const rest = local11.slice(4, 11);
    if (KNOWN_VE_CODES.has(prefix4)) {
      return { code: prefix4, customArea: "", localNumber: rest };
    }
    if (VE_AREA_CODE_REGEX.test(prefix4)) {
      return { code: "OTRO_VE", customArea: prefix4, localNumber: rest };
    }
  }

  // Internacional
  if (trimmed.startsWith("+")) {
    return { code: "INTL", customArea: "", localNumber: trimmed.slice(1).trim() };
  }

  const digits = trimmed.replace(/\D/g, "");
  const normalized =
    digits.length === 10 && (digits.startsWith("4") || digits.startsWith("2"))
      ? `0${digits}`
      : digits;

  if (normalized.length >= 4) {
    const prefix4 = normalized.slice(0, 4);
    const rest = normalized.slice(4, 11);
    if (KNOWN_VE_CODES.has(prefix4)) {
      return { code: prefix4, customArea: "", localNumber: rest };
    }
    if (VE_AREA_CODE_REGEX.test(prefix4)) {
      return { code: "OTRO_VE", customArea: prefix4, localNumber: rest };
    }
  }

  return { code: "0414", customArea: "", localNumber: digits.slice(0, 7) };
}

export function formatLocalSevenDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 7);
  if (digits.length > 3) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return digits;
}

export function composePhoneValue(
  code: string,
  customArea: string,
  localNumber: string
): string {
  if (code === "INTL") {
    const cleaned = localNumber.replace(/[^\d\s-]/g, "").trim();
    return cleaned ? `+${cleaned}` : "";
  }

  const digits = localNumber.replace(/\D/g, "").slice(0, 7);
  if (!digits) return "";

  if (code === "OTRO_VE") {
    const areaDigits = customArea.replace(/\D/g, "").slice(0, 4);
    if (!areaDigits) return "";
    return `${areaDigits}-${digits}`;
  }

  return `${code}-${digits}`;
}

export function validatePhoneValue(value?: string | null): {
  valid: boolean;
  error?: string;
} {
  const trimmed = (value || "").trim();
  if (!trimmed) return { valid: true }; // Opcional

  if (trimmed.startsWith("+")) {
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) {
      return {
        valid: false,
        error: "Teléfono internacional inválido (8 a 15 dígitos con código de país).",
      };
    }
    return { valid: true };
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length !== 11 || !VE_AREA_CODE_REGEX.test(digits.slice(0, 4))) {
    return {
      valid: false,
      error: "Complete los 7 dígitos del teléfono con un código de operadora o área válido.",
    };
  }

  return { valid: true };
}
