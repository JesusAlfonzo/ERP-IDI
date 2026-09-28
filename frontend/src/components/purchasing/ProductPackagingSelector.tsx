"use client";

import { useMemo } from "react";
import type { Product } from "@/types/inventory";
import {
  SearchableSelect,
  type SearchableOption,
} from "@/components/common/SearchableSelect";

interface ProductPackagingSelectorProps {
  products: Product[];
  selectedProductId: number;
  selectedUnitId: number;
  onChange: (productId: number, unitId: number) => void;
  disabled?: boolean;
  /** Categoría seleccionada en la cabecera del formulario */
  selectedCategoryId?: string | number;
}

export function ProductPackagingSelector({
  products,
  selectedProductId,
  selectedUnitId,
  onChange,
  disabled = false,
  selectedCategoryId,
}: ProductPackagingSelectorProps) {
  // Producto seleccionado resuelto sobre el catálogo completo
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId),
    [products, selectedProductId]
  );

  // Mapeo unificado de productos a opciones de búsqueda estructuradas
  const options = useMemo<SearchableOption<Product>[]>(() => {
    return products.map((p) => {
      const baseUnitAbbr = p.baseUnit?.abbreviation || p.unitOfMeasure || "UND";
      const hasPackage =
        p.purchaseUnit &&
        p.purchaseUnitId &&
        p.purchaseUnitId !== p.baseUnitId;
      const factor = Number(p.conversionFactor) || 1;

      const subParts: string[] = [];
      if (p.sku) subParts.push(p.sku);
      subParts.push(baseUnitAbbr);
      if (hasPackage) {
        subParts.push(
          `${p.purchaseUnit?.name || p.purchaseUnit?.abbreviation} (x${factor})`
        );
      }

      return {
        value: p.id,
        label: p.name,
        sublabel: subParts.join(" · "),
        searchTerms: [
          p.name,
          p.sku || "",
          p.barcode || "",
          p.description || "",
        ],
        category: p.categoryId,
        badgeText: p.isTaxExempt ? "Exento IVA" : undefined,
        badgeColor: "text-emerald-600 font-medium",
        data: p,
      };
    });
  }, [products]);

  const handleSelectOption = (
    val: string | number,
    opt?: SearchableOption<Product>
  ) => {
    if (!val || val === 0 || val === "0") {
      onChange(0, 0);
      return;
    }
    const prod =
      opt?.data || products.find((p) => String(p.id) === String(val));
    if (!prod) {
      onChange(0, 0);
      return;
    }
    const defaultUnitId = prod.baseUnitId || prod.baseUnit?.id || 0;
    onChange(prod.id, defaultUnitId);
  };

  // Unidades disponibles para el producto seleccionado (Unidad Base vs Empaque)
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
        name:
          selectedProduct.baseUnit?.name ||
          selectedProduct.unitOfMeasure ||
          "Unidad Base",
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
    <div className="space-y-1.5 w-full">
      {/* Combobox con búsqueda escrita reutilizable */}
      <SearchableSelect<Product>
        options={options}
        value={selectedProductId || ""}
        onChange={handleSelectOption}
        disabled={disabled}
        categoryFilter={selectedCategoryId}
        placeholder="Buscar insumo por nombre o código..."
        emptyMessage="No se encontraron insumos que coincidan con la búsqueda."
        itemTypeLabel="insumo(s)"
      />

      {/* Selector de Empaque (Unidad Base vs Empaque si aplica) */}
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
