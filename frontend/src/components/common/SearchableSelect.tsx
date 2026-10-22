"use client";

import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useId,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Search, X, ChevronDown, Check, Package } from "lucide-react";

export interface SearchableOption<T = unknown> {
  value: string | number;
  label: string; // Línea 1: Nombre en font-medium, hasta 2 líneas
  sublabel?: string; // Línea 2: SKU · Unidad · Empaque en texto pequeño atenuado
  searchTerms?: string[]; // Búsqueda extra (SKU, lote, barcode, etc.)
  category?: string | number; // ID o nombre de categoría
  badgeText?: string; // Texto adicional discreto (ej. "Exento IVA")
  badgeColor?: string; // Color para el texto adicional
  disabled?: boolean;
  data?: T;
}

export interface SearchableSelectProps<T = unknown> {
  options: SearchableOption<T>[];
  value: string | number;
  onChange: (value: string | number, option?: SearchableOption<T>) => void;
  placeholder?: string;
  disabled?: boolean;
  categoryFilter?: string | number;
  emptyMessage?: string;
  className?: string;
  icon?: ReactNode;
  id?: string;
  itemTypeLabel?: string; // ej. "insumo(s)", "reactivo(s)", "opción(es)"
}

/**
 * Normaliza cadenas de texto eliminando tildes/diacríticos y pasando a minúsculas
 */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function SearchableSelect<T = unknown>({
  options,
  value,
  onChange,
  placeholder = "Buscar o seleccionar...",
  disabled = false,
  categoryFilter,
  emptyMessage = "No se encontraron resultados que coincidan con la búsqueda.",
  className = "",
  icon,
  id,
  itemTypeLabel = "insumo(s)",
}: SearchableSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const reactId = useId();
  const listboxId = id ? `${id}-listbox` : `searchable-select-list-${reactId}`;

  // Ajuste de estado al cambiar categoryFilter o isOpen (patrón oficial de React para no usar useEffect)
  const [prevCategoryFilter, setPrevCategoryFilter] = useState(categoryFilter);
  if (prevCategoryFilter !== categoryFilter) {
    setPrevCategoryFilter(categoryFilter);
    setSearchTerm("");
    setHighlightedIndex(-1);
  }

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (prevIsOpen !== isOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setHighlightedIndex(-1);
    }
  }

  // Opción seleccionada resuelta sobre TODO el catálogo (nunca se desvincula por filtros)
  const selectedOption = useMemo(
    () =>
      options.find(
        (opt) => String(opt.value) === String(value) && String(value) !== ""
      ),
    [options, value]
  );

  // Cerrar al hacer clic fuera del componente
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Enfocar input automáticamente al abrir el panel desplegable
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Filtrado de opciones por categoría y texto insensible a mayúsculas y acentos
  const filteredOptions = useMemo(() => {
    let list = options;

    if (categoryFilter !== undefined && categoryFilter !== "" && categoryFilter !== "0") {
      const catStr = String(categoryFilter);
      list = list.filter((opt) => {
        if (opt.category === undefined || opt.category === null) return true;
        return String(opt.category) === catStr;
      });
    }

    const term = normalizeText(searchTerm.trim());
    if (term) {
      list = list.filter((opt) => {
        const labelMatch = normalizeText(opt.label).includes(term);
        const sublabelMatch = opt.sublabel
          ? normalizeText(opt.sublabel).includes(term)
          : false;
        const termsMatch = opt.searchTerms
          ? opt.searchTerms.some((t) => normalizeText(t).includes(term))
          : false;
        return labelMatch || sublabelMatch || termsMatch;
      });
    }

    return list;
  }, [options, categoryFilter, searchTerm]);

  // Scroll automático hacia el elemento resaltado por teclado
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const itemEl = listRef.current.children[highlightedIndex] as HTMLElement;
      if (itemEl && typeof itemEl.scrollIntoView === "function") {
        itemEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  const handleSelectOption = (opt: SearchableOption<T>) => {
    if (opt.disabled) return;
    onChange(opt.value, opt);
    setIsOpen(false);
    setSearchTerm("");
    setHighlightedIndex(-1);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("", undefined);
    setSearchTerm("");
    setHighlightedIndex(-1);
  };

  // Manejador de navegación por teclado (Accesibilidad WAI-ARIA Combobox)
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement | HTMLDivElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelectOption(filteredOptions[highlightedIndex]);
        }
        break;
      case "Escape":
      case "Tab":
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Botón Disparador (Trigger) con ancho completo */}
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-activedescendant={
          highlightedIndex >= 0
            ? `${listboxId}-option-${highlightedIndex}`
            : undefined
        }
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={`w-full min-h-[42px] flex items-center justify-between bg-card text-card-foreground border rounded-lg px-3 py-2 text-xs transition-colors cursor-pointer outline-none ${
          isOpen
            ? "border-primary ring-2 ring-primary/20"
            : "border-input hover:border-ring"
        } ${disabled ? "opacity-50 cursor-not-allowed bg-muted" : ""}`}
      >
        {selectedOption ? (
          <div className="flex items-start gap-2.5 min-w-0 mr-2 py-0.5 flex-1">
            {icon || <Package className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />}
            <div className="min-w-0 flex-1">
              {/* Línea 1: Nombre en font-semibold, hasta 1 línea en trigger */}
              <div className="text-xs font-semibold text-foreground leading-snug line-clamp-1">
                {selectedOption.label}
              </div>
              {/* Línea 2: Datos secundarios atenuados con puntos medios */}
              {(selectedOption.sublabel || selectedOption.badgeText) && (
                <div className="text-[11px] text-muted-foreground font-normal flex items-center gap-1.5 flex-wrap mt-0.5">
                  {selectedOption.sublabel && <span>{selectedOption.sublabel}</span>}
                  {selectedOption.sublabel && selectedOption.badgeText && (
                    <span className="text-muted-foreground/40">·</span>
                  )}
                  {selectedOption.badgeText && (
                    <span className={selectedOption.badgeColor || "text-emerald-600 dark:text-emerald-400 font-medium"}>
                      {selectedOption.badgeText}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 min-w-0 mr-2 py-0.5">
            {icon || <Package className="w-4 h-4 text-muted-foreground shrink-0" />}
            <span className="text-xs text-muted-foreground font-normal">
              {placeholder}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-muted-foreground hover:text-foreground rounded cursor-pointer"
              title="Limpiar selección"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {/* Menú Desplegable con Panel de Búsqueda y Resultados */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-popover text-popover-foreground border border-border rounded-xl shadow-xl overflow-hidden text-xs max-h-72 flex flex-col min-w-full sm:min-w-[26rem] max-w-2xl">
          {/* Cabecera: Campo de búsqueda con espaciado amplio */}
          <div className="p-3 border-b border-border bg-popover shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setHighlightedIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Escriba para filtrar por nombre o código..."
                className="w-full bg-muted/50 border border-input rounded-lg pl-9 pr-8 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background transition-all font-medium"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Lista de Resultados con Scroll Suave */}
          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            className="overflow-y-auto flex-1 divide-y divide-border scroll-smooth"
          >
            {filteredOptions.length === 0 ? (
              <div className="py-8 px-4 text-center text-muted-foreground">
                <p className="font-medium text-xs">{emptyMessage}</p>
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected =
                  String(opt.value) === String(value) && String(value) !== "";
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={String(opt.value)}
                    id={`${listboxId}-option-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectOption(opt)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`py-2.5 px-3 flex items-start justify-between hover:bg-accent cursor-pointer transition-colors ${
                      isHighlighted ? "bg-accent" : ""
                    } ${
                      isSelected
                        ? "bg-primary/10 hover:bg-primary/15 text-primary font-semibold"
                        : "text-foreground"
                    } ${opt.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      {/* Línea 1: Nombre en font-medium, hasta 2 líneas sin corte abrupto */}
                      <div className="text-xs font-medium text-foreground leading-snug line-clamp-2">
                        {opt.label}
                      </div>

                      {/* Línea 2: SKU · Unidad · Empaque · etc. (atenuado con puntos medios) */}
                      {(opt.sublabel || opt.badgeText) && (
                        <div className="text-[11px] text-muted-foreground font-normal flex items-center gap-1.5 flex-wrap mt-1">
                          {opt.sublabel && <span>{opt.sublabel}</span>}
                          {opt.sublabel && opt.badgeText && (
                            <span className="text-muted-foreground/40">·</span>
                          )}
                          {opt.badgeText && (
                            <span className={opt.badgeColor || "text-emerald-600 dark:text-emerald-400 font-medium"}>
                              {opt.badgeText}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Pie Fijo (Sticky) Discreto */}
          <div className="px-3.5 py-2 bg-muted/40 border-t border-border text-[11px] text-muted-foreground flex items-center justify-between shrink-0">
            <span>
              {filteredOptions.length} de {options.length} {itemTypeLabel}
            </span>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="text-primary hover:underline cursor-pointer"
              >
                Limpiar filtro
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
