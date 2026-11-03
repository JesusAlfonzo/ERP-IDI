import { useState, useEffect } from "react";

/**
 * Hook para retrasar la actualización de un valor (debounce).
 * Útil para evitar saturar peticiones al servidor o filtros pesados mientras el usuario escribe.
 *
 * @param value Valor a retrasar (ej. término de búsqueda)
 * @param delay Tiempo de espera en milisegundos (por defecto 350ms)
 * @returns El valor retrasado una vez transcurrido el tiempo de inactividad
 */
export function useDebounce<T>(value: T, delay: number = 350): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Si el valor se limpia inmediatamente a vacío, podemos reflejarlo más rápido
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
