"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { Product, Category } from "@/types/inventory";
import { Search, ChevronDown, Check, X, Tag } from "lucide-react";

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
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );

  // Cerrar al hacer clic fuera del componente
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Foco en el input de búsqueda al abrir
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Filtrado reactivo por texto y categoría
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    return products.filter((p) => {
      // Filtro de categoría
      if (
        selectedCategoryFilter !== null &&
        p.categoryId !== selectedCategoryFilter
      ) {
        return false;
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

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Botón trigger principal */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between text-left bg-white border rounded-lg px-3 py-2 text-xs transition-colors shadow-2xs cursor-pointer ${
          isOpen
            ? "border-blue-500 ring-2 ring-blue-100"
            : "border-slate-300 hover:border-slate-400"
        } ${disabled ? "opacity-50 cursor-not-allowed bg-slate-50" : ""}`}
      >
        <div className="flex items-center gap-2 overflow-hidden mr-2">
          {selectedProduct ? (
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold text-slate-800 truncate">
                {selectedProduct.name}
              </span>
              {selectedProduct.sku && (
                <span className="shrink-0 font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                  {selectedProduct.sku}
                </span>
              )}
              {selectedProduct.category?.name && (
                <span className="shrink-0 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                  {selectedProduct.category.name}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
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
              className="p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
              title="Limpiar selección"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${
              isOpen ? "rotate-180 text-blue-600" : ""
            }`}
          />
        </div>
      </button>

      {/* Popover / Menú desplegable */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden text-xs max-h-80 flex flex-col">
          {/* Barra de búsqueda reactiva */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por nombre, código SKU o categoría..."
                className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filtros rápidos por Categoría */}
            {categories.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto pt-2 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter(null)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategoryFilter === null
                      ? "bg-blue-600 text-white"
                      : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  }`}
                >
                  Todas las categorías
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() =>
                      setSelectedCategoryFilter((prev) =>
                        prev === cat.id ? null : cat.id
                      )
                    }
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      selectedCategoryFilter === cat.id
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lista de productos encontrados */}
          <div className="overflow-y-auto divide-y divide-slate-100 flex-1 max-h-56">
            {filteredProducts.length === 0 ? (
              <div className="p-4 text-center text-slate-400">
                No se encontraron insumos o reactivos disponibles.
              </div>
            ) : (
              filteredProducts.map((p) => {
                const isSelected = p.id === selectedProductId;
                const unit =
                  p.unitOfMeasure || p.baseUnit?.abbreviation || "UND";

                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelect(p.id)}
                    className={`p-2.5 flex items-center justify-between hover:bg-blue-50/60 cursor-pointer transition-colors ${
                      isSelected ? "bg-blue-50 text-blue-900" : "text-slate-800"
                    }`}
                  >
                    <div className="flex-1 min-w-0 mr-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 truncate">
                          {p.name}
                        </span>
                        {p.sku && (
                          <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                            {p.sku}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                        {p.category?.name && (
                          <span className="flex items-center gap-0.5 text-blue-600">
                            <Tag className="w-2.5 h-2.5" />
                            {p.category.name}
                          </span>
                        )}
                        <span>• Unidad: {unit}</span>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-blue-600 shrink-0" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
