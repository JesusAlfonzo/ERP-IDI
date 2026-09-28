/**
 * Utilidades para manejo Multi-Moneda y Tasa Oficial BCV.
 */

export type CurrencyCode = "USD" | "EUR" | "VED" | "VES";

export interface CurrencyOption {
  code: CurrencyCode;
  symbol: string;
  label: string;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: "USD", symbol: "$", label: "USD ($)" },
  { code: "EUR", symbol: "€", label: "EUR (€)" },
  { code: "VED", symbol: "Bs.", label: "VED (Bs.)" },
];

/**
 * Obtiene el símbolo correspondiente a una moneda ("$", "€" o "Bs.").
 */
export function getCurrencySymbol(
  currency?: string | { code?: string; symbol?: string } | null,
): string {
  if (!currency) return "$";

  let raw = "";
  if (typeof currency === "string") {
    raw = currency.trim().toUpperCase();
  } else if (typeof currency === "object") {
    raw = (currency.code || currency.symbol || "USD").trim().toUpperCase();
  }

  if (raw === "EUR" || raw === "€") return "€";
  if (
    raw === "VED" ||
    raw === "VES" ||
    raw === "BS" ||
    raw === "BS." ||
    raw === "BOLIVAR" ||
    raw === "BOLÍVAR"
  ) {
    return "Bs.";
  }
  return "$";
}

/**
 * Normaliza el código de la moneda a USD, EUR o VED.
 */
export function normalizeCurrencyCode(
  currency?: string | { code?: string } | null,
): CurrencyCode {
  if (!currency) return "USD";
  const raw = (
    typeof currency === "string" ? currency : currency.code || "USD"
  )
    .trim()
    .toUpperCase();

  if (raw === "EUR") return "EUR";
  if (raw === "VED" || raw === "VES" || raw === "BS" || raw === "BS.") return "VED";
  return "USD";
}

/**
 * Formatea una cifra numérica en la moneda indicada con su símbolo institucional.
 */
export function formatCurrencyAmount(
  amount: number | string | null | undefined,
  currency?: string | { code?: string; symbol?: string } | null,
): string {
  const num = Number(amount);
  const valid = Number.isFinite(num) ? num : 0;
  const symbol = getCurrencySymbol(currency);

  const formattedNum = valid.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${symbol} ${formattedNum}`;
}
