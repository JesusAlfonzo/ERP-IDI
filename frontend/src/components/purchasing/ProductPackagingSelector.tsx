"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { Product } from "@/types/inventory";
import { Search, X, Package, ChevronDown, Check } from "lucide-react";

interface ProductPackagingSelectorProps {
  products: Product[];
  selectedProductId: number;
  selectedUnitId: number;
  onChange: (productId: number, unitId: number) => void;
  disabled?: boolean;
}

export function ProductPackagingSelector({
  products,
  selectedProductId,
  selectedUnitId,
  onChange,
  disabled = false,
}: ProductPackagingSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return products.slice(0, 50); // Muestra primeros 50 si no busca
    return products.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(term);
      const skuMatch = p.sku ? p.sku.toLowerCase().includes(term) : false;
      return nameMatch || skuMatch;
    });
  }, [products, searchTerm]);

  const handleSelectProduct = (product: Product) => {
    // Si tiene purchaseUnitId, podemos dejarlo o poner baseUnitId por defecto
    const defaultUnitId = product.baseUnitId || product.baseUnit?.id || 0;
    onChange(product.id, defaultUnitId);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(0, 0);
    setSearchTerm("");
  };

  // Unidades disponibles para el producto seleccionado
  const availableUnits = useMemo(() => {
    if (!selectedProduct) return [];
    const units: Array<{
      id: number;
      name: string;
      abbreviation: string;
      isPackage: boolean;
      factor: number;
    }> = [];

    // Unidad base
    if (selectedProduct.baseUnit || selectedProduct.baseUnitId) {
      units.push({
        id: selectedProduct.baseUnitId || selectedProduct.baseUnit?.id || 0,
        name: selectedProduct.baseUnit?.name || selectedProduct.unitOfMeasure || "Unidad Base",
        abbreviation:
          selectedProduct.baseUnit?.abbreviation ||
          selectedProduct.unitOfMeasure ||
          "UND",
        isPackage: false,
        factor: 1,
      });
    }

    // Unidad de compra / empaque si existe y es distinta
    if (
      selectedProduct.purchaseUnit &&
      selectedProduct.purchaseUnitId &&
      selectedProduct.purchaseUnitId !== selectedProduct.baseUnitId
    ) {
      units.push({
        id: selectedProduct.purchaseUnitId,
        name: selectedProduct.purchaseUnit.name || "Empaque",
        abbreviation: selectedProduct.purchaseUnit.abbreviation,
        isPackage: true,
        factor: Number(selectedProduct.conversionFactor) || 1,
      });
    }

    return units;
  }, [selectedProduct]);

  return (
    <div ref={containerRef} className="space-y-1.5 w-full">
      {/* Selector / Buscador */}
      <div className="relative">
        <div
          onClick={() => !disabled && setIsOpen(true)}
          className={`w-full flex items-center justify-between bg-white border rounded-lg px-3 py-2 text-xs transition-colors cursor-pointer ${
            isOpen
              ? "border-blue-500 ring-2 ring-blue-100"
              : "border-slate-300 hover:border-slate-400"
          } ${disabled ? "opacity-50 cursor-not-allowed bg-slate-50" : ""}`}
        >
          <div className="flex items-center gap-2 min-w-0 mr-2">
            <Package className="w-4 h-4 text-slate-400 shrink-0" />
            {selectedProduct ? (
              <div className="truncate">
                <span className="font-semibold text-slate-900 mr-2">
                  {selectedProduct.name}
                </span>
                {selectedProduct.sku && (
                  <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 mr-1.5">
                    {selectedProduct.sku}
                  </span>
                )}
                {selectedProduct.isTaxExempt && (
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    Exento
                  </span>
                )}
              </div>
            ) : (
              <span className="text-slate-400">
                Buscar insumo por nombre o SKU...
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {selectedProduct && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                title="Limpiar insumo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* Dropdown de Resultados */}
        {isOpen && (
          <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden text-xs max-h-72 flex flex-col">
            <div className="p-2 border-b border-slate-100 bg-slate-50/80">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Escriba para filtrar por nombre o SKU..."
                  className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>

            <div className="overflow-y-auto divide-y divide-slate-100 flex-1 max-h-56">
              {filteredProducts.length === 0 ? (
                <div className="p-4 text-center text-slate-400">
                  No se encontraron insumos o reactivos.
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const isSelected = p.id === selectedProductId;
                  const baseUnitAbbr =
                    p.baseUnit?.abbreviation || p.unitOfMeasure || "UND";
                  const hasPackage =
                    p.purchaseUnit &&
                    p.purchaseUnitId &&
                    p.purchaseUnitId !== p.baseUnitId;
                  const factor = Number(p.conversionFactor) || 1;

                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectProduct(p)}
                      className={`p-2.5 flex items-center justify-between hover:bg-blue-50/60 cursor-pointer transition-colors ${
                        isSelected ? "bg-blue-50 text-blue-900" : "text-slate-800"
                      }`}
                    >
                      <div className="flex-1 min-w-0 mr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 truncate">
                            {p.name}
                          </span>
                          {p.sku && (
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                              {p.sku}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                          <span>Unidad: {baseUnitAbbr}</span>
                          {hasPackage && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 font-medium text-[10px] border border-amber-200">
                              Empaque: {p.purchaseUnit?.name || p.purchaseUnit?.abbreviation} (x{factor})
                            </span>
                          )}
                          {p.isTaxExempt && (
                            <span className="text-emerald-600 font-semibold">
                              • Exento IVA
                            </span>
                          )}
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

      {/* Selector de Empaque (Unidad Base vs Empaque) */}
      {selectedProduct && availableUnits.length > 1 && (
        <div className="flex items-center gap-2 pt-0.5">
          <span className="text-[11px] font-semibold text-slate-500 shrink-0">
            Presentación de Compra:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {availableUnits.map((u) => {
              const isActive = selectedUnitId === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(selectedProductId, u.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                    isActive
                      ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200"
                  }`}
                >
                  <span>{u.name}</span>
                  {u.isPackage && (
                    <span
                      className={`text-[10px] px-1 py-0.2 rounded ${
                        isActive
                          ? "bg-blue-700 text-blue-100"
                          : "bg-white text-slate-600 border border-slate-200"
                      }`}
                    >
                      x{u.factor}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
