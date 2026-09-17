"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { InventoryClientService } from "@/services/inventory.service";
import { AuthService } from "@/services/auth.service";
import type { Product, Category } from "@/types/inventory";
import {
  Search,
  Filter,
  Package,
  AlertTriangle,
  Layers,
  RefreshCw,
  Clock,
} from "lucide-react";

export default function ProductsCatalogPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [productsData, categoriesData] = await Promise.all([
        InventoryClientService.getProducts({
          categoryId: selectedCategory ? Number(selectedCategory) : undefined,
          search: searchTerm || undefined,
        }),
        InventoryClientService.getCategories().catch(() => []),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch {
      // Manejado por el interceptor global
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchTerm]);

  useEffect(() => {
    const initCatalog = async () => {
      if (!AuthService.isAuthenticated()) {
        router.replace("/login");
        return;
      }
      await loadData();
    };

    initCatalog();
  }, [router, loadData]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const getProductStock = (product: Product) => {
    if (!product.batches) return 0;
    return product.batches.reduce(
      (acc, b) => acc + Number(b.currentQuantity),
      0,
    );
  };

  return (
    <div className="space-y-6">
      {/* Encabezado de la sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            Catálogo de Productos y Lotes
          </h1>
          <p className="text-xs text-slate-500">
            Control de existencias físicas y trazabilidad por lote institucional
          </p>
        </div>
      </div>

      {/* Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Buscar por SKU o nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-48 text-slate-700"
            >
              <option value="">Todas las categorías</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => loadData()}
            className="p-2 border border-slate-300 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors shadow-2xs"
            title="Recargar datos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Listado de Productos */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
          Cargando inventario...
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
          <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          No se encontraron productos registrados con los filtros seleccionados.
        </div>
      ) : (
        <div className="space-y-4">
          {products.map((product) => {
            const currentStock = getProductStock(product);
            const isLowStock = currentStock <= product.minStockAlert;

            return (
              <div
                key={product.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all overflow-hidden"
              >
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                        {product.sku}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-medium">
                        {product.category?.name || "Sin Categoría"}
                      </span>
                      {isLowStock && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded font-medium">
                          <AlertTriangle className="w-3 h-3" /> Stock Crítico
                          (Min: {product.minStockAlert})
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-bold text-slate-800">
                      {product.name}
                    </h2>
                    {product.description && (
                      <p className="text-xs text-slate-500">
                        {product.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-6 self-end md:self-auto">
                    <div className="text-right">
                      <div className="text-xs text-slate-400 uppercase font-semibold">
                        Stock Total
                      </div>
                      <div
                        className={`text-xl font-bold ${isLowStock ? "text-amber-600" : "text-slate-800"}`}
                      >
                        {currentStock}{" "}
                        <span className="text-xs font-normal text-slate-500">
                          {product.unitOfMeasure}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lotes asociados */}
                <div className="bg-slate-50/50 p-4">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2">
                    <Layers className="w-3.5 h-3.5" />
                    Lotes asociados ({product.batches?.length || 0})
                  </div>

                  {!product.batches || product.batches.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">
                      No hay lotes activos asignados a este producto.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {product.batches.map((batch) => {
                        const isExpired =
                          batch.expirationDate &&
                          new Date(batch.expirationDate) < new Date();
                        return (
                          <div
                            key={batch.id}
                            className="bg-white p-3 rounded-lg border border-slate-200 text-xs space-y-1.5 shadow-2xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-semibold text-slate-700">
                                #{batch.lotNumber}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  batch.status === "DISPONIBLE"
                                    ? "bg-emerald-50 text-emerald-700"
                                    : batch.status === "EN_CUARENTENA"
                                      ? "bg-amber-50 text-amber-700"
                                      : "bg-red-50 text-red-700"
                                }`}
                              >
                                {batch.status}
                              </span>
                            </div>

                            <div className="flex justify-between text-slate-600">
                              <span>Disponible:</span>
                              <span className="font-semibold text-slate-800">
                                {batch.currentQuantity} {product.unitOfMeasure}
                              </span>
                            </div>

                            <div className="flex justify-between items-center text-slate-500 pt-1 border-t border-slate-100">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />{" "}
                                Vence:
                              </span>
                              <span
                                className={
                                  isExpired ? "text-red-600 font-semibold" : ""
                                }
                              >
                                {batch.expirationDate
                                  ? new Date(
                                      batch.expirationDate,
                                    ).toLocaleDateString()
                                  : "N/A"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
