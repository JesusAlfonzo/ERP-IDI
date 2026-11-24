"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  VE_PHONE_CODES,
  composePhoneValue,
  formatLocalSevenDigits,
  parsePhoneValue,
  validatePhoneValue,
} from "@/utils/venezuela-formatters";

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  showHint?: boolean;
  className?: string;
  id?: string;
}

export function PhoneInput({
  value,
  onChange,
  required = false,
  disabled = false,
  showHint = false,
  className,
  id,
}: PhoneInputProps) {
  const parsed = useMemo(() => parsePhoneValue(value), [value]);
  const [selectedCode, setSelectedCode] = React.useState<string>(parsed.code);
  const [customArea, setCustomArea] = React.useState<string>(parsed.customArea);

  React.useEffect(() => {
    if (value && value.trim()) {
      const next = parsePhoneValue(value);
      setSelectedCode(next.code);
      setCustomArea(next.customArea);
    }
  }, [value]);

  const validation = useMemo(() => {
    if (!value.trim()) return { valid: true };
    return validatePhoneValue(value);
  }, [value]);

  const handleCodeChange = (nextCode: string) => {
    setSelectedCode(nextCode);
    const currentLocal = value ? parsePhoneValue(value).localNumber : "";
    if (nextCode === "OTRO_VE") {
      const area = customArea || "02";
      setCustomArea(area);
      onChange(composePhoneValue(nextCode, area, currentLocal));
      return;
    }
    if (currentLocal) {
      onChange(composePhoneValue(nextCode, "", currentLocal));
    } else {
      onChange("");
    }
  };

  const handleCustomAreaChange = (rawArea: string) => {
    const cleanArea = rawArea.replace(/\D/g, "").slice(0, 4);
    setCustomArea(cleanArea);
    const currentLocal = value ? parsePhoneValue(value).localNumber : "";
    if (currentLocal) {
      onChange(composePhoneValue("OTRO_VE", cleanArea, currentLocal));
    }
  };

  const handleNumberChange = (rawInput: string) => {
    const trimmed = rawInput.trim();

    // Detección automática al pegar número completo venezolano o internacional
    if (trimmed.startsWith("+")) {
      const p = parsePhoneValue(trimmed);
      setSelectedCode(p.code);
      setCustomArea(p.customArea);
      onChange(composePhoneValue(p.code, p.customArea, p.localNumber));
      return;
    }

    const digits = trimmed.replace(/\D/g, "");
    if (
      selectedCode !== "INTL" &&
      (digits.length === 11 || (digits.length === 10 && /^[24]/.test(digits)))
    ) {
      const p = parsePhoneValue(digits);
      setSelectedCode(p.code);
      setCustomArea(p.customArea);
      onChange(composePhoneValue(p.code, p.customArea, p.localNumber));
      return;
    }

    if (selectedCode === "INTL") {
      onChange(composePhoneValue("INTL", "", rawInput));
      return;
    }

    onChange(composePhoneValue(selectedCode, customArea, digits));
  };

  const localDisplay = useMemo(() => {
    if (!value.trim()) return "";
    const p = parsePhoneValue(value);
    if (selectedCode === "INTL") return p.localNumber;
    return formatLocalSevenDigits(p.localNumber);
  }, [value, selectedCode]);

  const mobileCodes = VE_PHONE_CODES.filter((c) => c.group === "MOVIL");
  const fixedCodes = VE_PHONE_CODES.filter((c) => c.group === "FIJO");
  const otherCodes = VE_PHONE_CODES.filter((c) => c.group === "OTRO");

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
          aria-label="Código de operadora o área telefónica"
          value={selectedCode}
          disabled={disabled}
          onChange={(e) => handleCodeChange(e.target.value)}
          className="h-full bg-muted/50 border-r border-input px-2 text-xs font-mono font-semibold text-foreground focus:outline-none cursor-pointer shrink-0 max-w-[110px]"
        >
          <optgroup label="Móvil VE">
            {mobileCodes.map((c) => (
              <option key={c.value} value={c.value}>
                {c.value}
              </option>
            ))}
          </optgroup>
          <optgroup label="Fijo VE">
            {fixedCodes.map((c) => (
              <option key={c.value} value={c.value}>
                {c.value}
              </option>
            ))}
          </optgroup>
          <optgroup label="Otros">
            {otherCodes.map((c) => (
              <option key={c.value} value={c.value}>
                {c.value === "INTL" ? "+ Intl" : "02XX"}
              </option>
            ))}
          </optgroup>
        </select>

        {selectedCode === "OTRO_VE" && (
          <input
            type="text"
            value={customArea}
            disabled={disabled}
            onChange={(e) => handleCustomAreaChange(e.target.value)}
            placeholder="02XX"
            maxLength={4}
            className="w-14 h-full border-r border-input bg-muted/20 px-2 text-xs font-mono text-center text-foreground focus:outline-none shrink-0"
          />
        )}

        <input
          id={id}
          type="tel"
          value={localDisplay}
          disabled={disabled}
          required={required}
          onChange={(e) => handleNumberChange(e.target.value)}
          placeholder={
            selectedCode === "INTL" ? "1 305-555-1234" : "123-4567"
          }
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
            {selectedCode === "INTL"
              ? "Incluya código de país sin el signo + (ej. 1 305-555-1234)"
              : "7 dígitos locales (ej. 123-4567)"}
          </p>
        )
      )}
    </div>
  );
}
