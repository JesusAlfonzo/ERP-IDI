/**
 * Formatea una cantidad numérica con su unidad de medida asociada.
 * Garantiza que siempre se muestre un número válido y nunca la unidad sola.
 */
export function formatQuantity(
  quantity: number | string | null | undefined,
  unit?: string | null
): string {
  const num = Number(quantity);
  const validNum = Number.isFinite(num) ? num : 0;
  const unitLabel = unit && unit.trim() !== "" ? ` ${unit.trim()}` : "";
  return `${validNum}${unitLabel}`;
}
