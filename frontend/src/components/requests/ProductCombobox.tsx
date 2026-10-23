"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { Product, Category } from "@/types/inventory";
import { Search, ChevronDown, Check, X, Tag, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ProductComboboxProps {
  products: Product[];
  categories: Category[];
  selectedProductId: number;
  onSelect: (productId: number) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ProductCombobox({
  products,
  categories,
  selectedProductId,
  onSelect,
  placeholder = "Buscar insumo por nombre o SKU...",
  disabled = false,
}: ProductComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("");

  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );

  const hasUnassignedCategory = useMemo(
    () => products.some((p) => !p.categoryId && !p.category),
    [products]
  );

  // Foco en el input de búsqueda al abrir
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearchTerm("");
    }
  };

  // Filtrado reactivo por texto y categoría
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return products.filter((p) => {
      // Filtro de categoría
      if (selectedCategoryFilter !== "") {
        if (selectedCategoryFilter === "unassigned") {
          if (p.categoryId || p.category) return false;
        } else {
          if (String(p.categoryId) !== selectedCategoryFilter) return false;
        }
      }

      // Filtro de texto por Nombre, SKU o Nombre de Categoría
      if (!term) return true;

      const nameMatch = p.name.toLowerCase().includes(term);
      const skuMatch = p.sku ? p.sku.toLowerCase().includes(term) : false;
      const catMatch = p.category?.name
        ? p.category.name.toLowerCase().includes(term)
        : false;

      return nameMatch || skuMatch || catMatch;
    });
  }, [products, searchTerm, selectedCategoryFilter]);

  const handleSelect = (productId: number) => {
    onSelect(productId);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(0);
    setSearchTerm("");
  };

  const selectedUnit =
    selectedProduct?.unitOfMeasure ||
    selectedProduct?.baseUnit?.abbreviation ||
    "UND";

  const selectedStock = selectedProduct?.totalStock ?? 0;

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "w-full flex items-center justify-between text-left rounded-lg px-3 py-2 text-xs transition-colors shadow-2xs cursor-pointer border bg-background text-foreground",
            isOpen
              ? "border-primary ring-2 ring-primary/20"
              : "border-input hover:border-accent-foreground/30",
            disabled && "opacity-50 cursor-not-allowed bg-muted"
          )}
        >
          <div className="flex items-center gap-2 overflow-hidden mr-2">
            {selectedProduct ? (
              <div className="flex items-center gap-1.5 flex-wrap truncate">
                <span className="font-semibold text-foreground truncate">
                  {selectedProduct.name}
                </span>
                {selectedProduct.sku && (
                  <span className="shrink-0 font-mono text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border">
                    {selectedProduct.sku}
                  </span>
                )}
                {selectedProduct.isReagent && (
                  <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded font-medium border border-purple-500/20">
                    <FlaskConical className="w-2.5 h-2.5" />
                    Reactivo
                  </span>
                )}
                {selectedProduct.category?.name && (
                  <span className="shrink-0 text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-medium">
                    {selectedProduct.category.name}
                  </span>
                )}
                <span
                  className={cn(
                    "shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded font-medium",
                    selectedStock > 0
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-destructive/10 text-destructive"
                  )}
                >
                  Stock: {selectedStock} {selectedUnit}
                </span>
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {selectedProduct && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(0);
                    setSearchTerm("");
                  }
                }}
                className="p-0.5 text-muted-foreground hover:text-foreground rounded cursor-pointer"
                title="Limpiar selección"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronDown
              className={cn(
                "w-4 h-4 text-muted-foreground transition-transform",
                isOpen && "rotate-180 text-primary"
              )}
            />
          </div>
        </button>
      </PopoverTrigger>

      {/* Popover con Portal: se renderiza en body sin ser recortado por overflow del contenedor de la tabla */}
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-[var(--radix-popover-trigger-width,var(--radix-popper-anchor-width,480px))] min-w-[340px] sm:min-w-[480px] max-w-[650px] p-0 z-50 overflow-hidden shadow-2xl border-border bg-popover text-popover-foreground"
      >
        {/* Barra de búsqueda y selector de categorías */}
        <div className="p-2 border-b border-border bg-muted/40">
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            {/* Filtro de categoría */}
            <div className="w-full sm:w-44 shrink-0">
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="w-full bg-background border border-input rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
              >
                <option value="">Todas las categorías</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </option>
                ))}
                {hasUnassignedCategory && (
                  <option value="unassigned">Sin asignar</option>
                )}
              </select>
            </div>

            {/* Input de Búsqueda reactiva */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar insumo por nombre o SKU..."
                className="w-full bg-background border border-input rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Lista de productos encontrados */}
        <div className="overflow-y-auto divide-y divide-border/50 max-h-64">
          {filteredProducts.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              No se encontraron insumos o reactivos disponibles.
            </div>
          ) : (
            filteredProducts.map((p, index) => {
              const isSelected = p.id === selectedProductId;
              const unit =
                p.unitOfMeasure || p.baseUnit?.abbreviation || "UND";
              const stock = p.totalStock ?? 0;
              const hasStock = stock > 0;

              return (
                <div
                  key={`${p.id}-${index}`}
                  onClick={() => handleSelect(p.id)}
                  className={cn(
                    "p-2.5 flex items-center justify-between cursor-pointer transition-colors",
                    isSelected
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted/70 text-foreground"
                  )}
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground truncate">
                        {p.name}
                      </span>
                      {p.sku && (
                        <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded border border-border">
                          {p.sku}
                        </span>
                      )}
                      {p.isReagent && (
                        <span className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.2 rounded font-medium border border-purple-500/20">
                          Reactivo
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                      {p.category?.name && (
                        <span className="flex items-center gap-0.5 text-primary">
                          <Tag className="w-2.5 h-2.5" />
                          {p.category.name}
                        </span>
                      )}
                      <span>• Unidad: {unit}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={cn(
                        "font-mono text-[11px] px-2 py-0.5 rounded-full font-semibold",
                        hasStock
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-destructive/10 text-destructive border border-destructive/20"
                      )}
                    >
                      {hasStock ? `${stock} ${unit}` : "Sin stock"}
                    </span>

                    {isSelected && (
                      <Check className="w-4 h-4 text-primary shrink-0" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
