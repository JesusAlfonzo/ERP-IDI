"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { InventoryClientService } from "@/services/inventory.service";
import { AuthService } from "@/services/auth.service";
import type { Product, Category, Brand, Unit } from "@/types/inventory";
import {
  Package,
  Plus,
  Search,
  RefreshCw,
  FlaskConical,
  Barcode,
  Layers,
  Building,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
} from "lucide-react";

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [reagentFilter, setReagentFilter] = useState<
    "ALL" | "REAGENT" | "NON_REAGENT"
  >("ALL");

  // Modal de Creación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [baseUnitId, setBaseUnitId] = useState("");
  const [purchaseUnitId, setPurchaseUnitId] = useState("");
  const [conversionFactor, setConversionFactor] = useState<number | "">(1);
  const [barcode, setBarcode] = useState("");
  const [description, setDescription] = useState("");
  const [minStockAlert, setMinStockAlert] = useState<number | "">(5);
  const [isReagent, setIsReagent] = useState(false);
  const [isTaxExempt] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [catalogsData, productsData] = await Promise.all([
        InventoryClientService.getCatalogs().catch(() => ({
          categories: [],
          brands: [],
          units: [],
        })),
        InventoryClientService.getProducts({
          search: search || undefined,
          categoryId: categoryFilter ? Number(categoryFilter) : undefined,
          isReagent:
            reagentFilter === "ALL" ? undefined : reagentFilter === "REAGENT",
        }).catch(() => []),
      ]);

      setCategories(catalogsData.categories);
      setBrands(catalogsData.brands);
      setUnits(catalogsData.units);
      setProducts(productsData);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, reagentFilter]);

  useEffect(() => {
    let isMounted = true;
    if (!AuthService.isAuthenticated()) {
      router.replace("/login");
      return;
    }
    const init = async () => {
      if (isMounted) await loadData();
    };
    init();
    return () => {
      isMounted = false;
    };
  }, [router, loadData]);

  const handleCreateProduct = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!name.trim() || !categoryId || !baseUnitId) {
      setFeedback({
        status: "error",
        message: "Nombre, categoría y unidad base son obligatorios.",
      });
      return;
    }

    setSubmitting(true);
    try {
      await InventoryClientService.createProduct({
        name: name.trim(),
        categoryId: Number(categoryId),
        baseUnitId: Number(baseUnitId),
        brandId: brandId ? Number(brandId) : null,
        purchaseUnitId: purchaseUnitId ? Number(purchaseUnitId) : null,
        conversionFactor: conversionFactor ? Number(conversionFactor) : 1,
        barcode: barcode.trim() || null,
        description: description.trim() || null,
        minStockAlert: minStockAlert ? Number(minStockAlert) : 0,
        isReagent,
        isTaxExempt,
      });

      setFeedback({
        status: "success",
        message: "Insumo registrado correctamente en el catálogo.",
      });
      await loadData();

      setTimeout(() => {
        setIsModalOpen(false);
        setName("");
        setCategoryId("");
        setBrandId("");
        setBaseUnitId("");
        setPurchaseUnitId("");
        setConversionFactor(1);
        setBarcode("");
        setDescription("");
        setMinStockAlert(5);
        setIsReagent(false);
        setFeedback(null);
      }, 1000);
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Error al registrar el producto.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            Catálogo Institucional de Insumos y Reactivos
          </h1>
          <p className="text-xs text-slate-500">
            Registro maestro de ítems, reactivos de bioanálisis, factores de
            conversión y umbrales mínimos
          </p>
        </div>

        <button
          onClick={() => {
            setIsModalOpen(true);
            setFeedback(null);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Registrar Insumo
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={reagentFilter}
            onChange={(e) =>
              setReagentFilter(
                e.target.value as "ALL" | "REAGENT" | "NON_REAGENT",
              )
            }
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Todos los tipos</option>
            <option value="REAGENT">Solo Reactivos</option>
            <option value="NON_REAGENT">Insumos Generales</option>
          </select>
        </div>

        <button
          onClick={() => loadData()}
          className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors shadow-2xs"
          title="Actualizar catálogo"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Tabla de Productos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Código / SKU</th>
                <th className="py-3 px-4">Descripción del Insumo</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4">Marca</th>
                <th className="py-3 px-4 text-center">Unidad Base</th>
                <th className="py-3 px-4 text-center">Tipo</th>
                <th className="py-3 px-4 text-right">Stock Disponible</th>
                <th className="py-3 px-4 text-right">Alerta Mínima</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    Cargando catálogo de productos...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No se encontraron insumos registrados en el catálogo.
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {p.sku || `#${p.id}`}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">
                        {p.name}
                      </div>
                      {p.description && (
                        <div className="text-[10px] text-slate-400 truncate max-w-xs">
                          {p.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Layers className="w-3 h-3 text-slate-400" />
                        {p.category?.name || "-"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-400" />
                        {p.brand?.name || "-"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-700">
                      {p.baseUnit?.abbreviation || p.baseUnit?.name || "-"}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {p.isReagent ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          <FlaskConical className="w-3 h-3" /> Reactivo
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Insumo General
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700">
                      {p.totalStock ?? 0} {p.baseUnit?.abbreviation}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">
                      {p.minStockAlert}{" "}
                      <span className="text-[10px] text-slate-400">
                        {p.baseUnit?.abbreviation}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Link
                        href={`/inventory/products/${p.id}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-slate-600 hover:text-blue-700 text-xs font-semibold transition-all shadow-2xs"
                        title="Ver detalle del insumo"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Ficha</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Registrar Producto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-base">
                  Registrar Nuevo Insumo / Reactivo
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                  feedback.status === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                {feedback.status === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre Oficial del Insumo / Reactivo *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Agar MacConkey / Tubos Vacutainer EDTA 4ml"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Categoría *
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">-- Seleccionar categoría --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Marca Comercial (Opcional)
                  </label>
                  <select
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Sin marca / Genérico --</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Unidad Base (Consumo) *
                  </label>
                  <select
                    value={baseUnitId}
                    onChange={(e) => setBaseUnitId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">-- Unidad base --</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.abbreviation})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Unidad de Compra
                  </label>
                  <select
                    value={purchaseUnitId}
                    onChange={(e) => setPurchaseUnitId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Misma que la base --</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.abbreviation})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Factor de Conversión
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    value={conversionFactor}
                    onChange={(e) =>
                      setConversionFactor(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    placeholder="Ej: 1000 (1L = 1000ml)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Código de Barras / Referencia
                  </label>
                  <div className="relative">
                    <Barcode className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="EAN-13 / Referencia fabricante"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Alerta de Stock Mínimo
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={minStockAlert}
                    onChange={(e) =>
                      setMinStockAlert(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <FlaskConical className="w-4 h-4 text-purple-600" />
                    ¿Es un reactivo de laboratorio / bioanálisis?
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Habilita trazabilidad analítica por lote, fecha de caducidad
                    y descargo en sala
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isReagent}
                  onChange={(e) => setIsReagent(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Descripción o Especificación Técnica
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalles sobre presentación, conservación o uso analítico..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? "Guardando..." : "Guardar Insumo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
