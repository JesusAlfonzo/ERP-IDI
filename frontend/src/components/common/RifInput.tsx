"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  RIF_PREFIX_OPTIONS,
  composeRifValue,
  formatRifBody,
  parseRifValue,
  validateRifValue,
  type RifPrefix,
} from "@/utils/venezuela-formatters";

interface RifInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  showHint?: boolean;
  className?: string;
  id?: string;
}

export function RifInput({
  value,
  onChange,
  required = false,
  disabled = false,
  showHint = true,
  className,
  id,
}: RifInputProps) {
  const parsed = useMemo(() => parseRifValue(value), [value]);
  const [selectedPrefix, setSelectedPrefix] = React.useState<RifPrefix>(
    parsed.prefix
  );

  // Sincronizar prefijo cuando el valor externo cambia (ej. abrir modal editar)
  React.useEffect(() => {
    if (value && value.trim()) {
      setSelectedPrefix(parseRifValue(value).prefix);
    }
  }, [value]);

  const currentOption =
    RIF_PREFIX_OPTIONS.find((opt) => opt.value === selectedPrefix) ??
    RIF_PREFIX_OPTIONS[0];

  const validation = useMemo(() => {
    if (!value.trim()) return { valid: true };
    return validateRifValue(value);
  }, [value]);

  const handlePrefixChange = (nextPrefix: RifPrefix) => {
    setSelectedPrefix(nextPrefix);
    const currentBody = value ? parseRifValue(value).body : "";
    if (currentBody) {
      onChange(composeRifValue(nextPrefix, currentBody));
    }
  };

  const handleBodyChange = (rawInput: string) => {
    const trimmedUpper = rawInput.trim().toUpperCase();
    // Detección inteligente al pegar o escribir un RIF completo con letra inicial
    const fullMatch = trimmedUpper.match(/^([JVEGPC])[\s-]*(.*)$/);
    if (fullMatch && fullMatch[1] && fullMatch[2] !== undefined) {
      const detectedPrefix = fullMatch[1] as RifPrefix;
      setSelectedPrefix(detectedPrefix);
      onChange(composeRifValue(detectedPrefix, fullMatch[2]));
      return;
    }

    const formattedBody = formatRifBody(selectedPrefix, rawInput);
    if (!formattedBody) {
      onChange("");
      return;
    }
    onChange(`${selectedPrefix}-${formattedBody}`);
  };

  const bodyDisplay = value ? parseRifValue(value).body : "";

  return (
    <div className={cn("space-y-1", className)}>
      <div
        className={cn(
          "flex items-center rounded-lg border bg-background transition-all focus-within:ring-2 focus-within:ring-ring overflow-hidden h-9",
          !validation.valid
            ? "border-destructive focus-within:ring-destructive/40"
            : "border-input"
        )}
      >
        <select
          aria-label="Tipo de documento fiscal"
          value={selectedPrefix}
          disabled={disabled}
          onChange={(e) => handlePrefixChange(e.target.value as RifPrefix)}
          className="h-full bg-muted/50 border-r border-input px-2 text-xs font-mono font-bold text-foreground focus:outline-none cursor-pointer shrink-0"
          title={currentOption.label}
        >
          {RIF_PREFIX_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.shortLabel} -
            </option>
          ))}
        </select>

        <input
          id={id}
          type="text"
          value={bodyDisplay}
          disabled={disabled}
          required={required}
          onChange={(e) => handleBodyChange(e.target.value)}
          placeholder={currentOption.placeholder}
          autoComplete="off"
          className="flex-1 h-full min-w-0 bg-transparent px-2.5 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      {!validation.valid && validation.error ? (
        <p className="text-[11px] text-destructive leading-tight">
          {validation.error}
        </p>
      ) : (
        showHint && (
          <p className="text-[10px] text-muted-foreground leading-tight">
            {currentOption.label} · {currentOption.hint}
          </p>
        )
      )}
    </div>
  );
}
