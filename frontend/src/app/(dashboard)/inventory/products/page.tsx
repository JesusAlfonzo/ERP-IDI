"use client";

import {
  useState,
  useEffect,
  useCallback,
  useTransition,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { InventoryClientService } from "@/services/inventory.service";
import { AuthService } from "@/services/auth.service";
import type { Product, Category, Brand, Unit, StockBatch } from "@/types/inventory";
import {
  Package,
  Plus,
  Search,
  RefreshCw,
  FlaskConical,
  Barcode,
  Layers,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Boxes,
  Calendar,
  MapPin,
  ExternalLink,
} from "lucide-react";

export default function ProductsPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

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

  // Nivel 2: Ficha Detallada / Lotes (Drawer / Modal)
  const [selectedProductForDetail, setSelectedProductForDetail] =
    useState<Product | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

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
        InventoryClientService.getCatalog({
          search: search || undefined,
          categoryId: categoryFilter ? Number(categoryFilter) : undefined,
          isReagent:
            reagentFilter === "ALL" ? undefined : reagentFilter === "REAGENT",
        }).catch(() => []),
      ]);

      startTransition(() => {
        setCategories(catalogsData.categories);
        setBrands(catalogsData.brands);
        setUnits(catalogsData.units);
        setProducts(productsData);
        setLoading(false);
      });
    } catch {
      startTransition(() => {
        setLoading(false);
      });
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
    void init();
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

  const getStockBadge = (totalStock: number = 0, minStockAlert: number = 0) => {
    if (totalStock <= 0) {
      return {
        label: "Agotado",
        className: "bg-rose-50 text-rose-700 border-rose-200",
        dotColor: "bg-rose-500",
      };
    }
    if (totalStock <= minStockAlert) {
      return {
        label: "Bajo Stock",
        className: "bg-amber-50 text-amber-700 border-amber-200",
        dotColor: "bg-amber-500",
      };
    }
    return {
      label: "Disponible",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dotColor: "bg-emerald-500",
    };
  };

  const getBatchStatusBadge = (status: string) => {
    switch (status) {
      case "DISPONIBLE":
        return {
          label: "DISPONIBLE",
          className: "bg-emerald-50 text-emerald-700 border-emerald-200",
        };
      case "EN_CUARENTENA":
      case "CUARENTENA":
        return {
          label: "CUARENTENA",
          className: "bg-amber-50 text-amber-700 border-amber-200",
        };
      case "DEFECTUOSO":
      case "RECHAZADO":
        return {
          label: "RECHAZADO",
          className: "bg-rose-50 text-rose-700 border-rose-200",
        };
      case "VENCIDO":
        return {
          label: "VENCIDO",
          className: "bg-red-50 text-red-700 border-red-200",
        };
      case "AGOTADO":
        return {
          label: "AGOTADO",
          className: "bg-slate-100 text-slate-600 border-slate-200",
        };
      default:
        return {
          label: status,
          className: "bg-slate-50 text-slate-600 border-slate-200",
        };
    }
  };

  const formatExpirationDate = (dateStr: string | null) => {
    if (!dateStr) return "Sin caducidad asignada";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("es-VE", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const handleOpenDetail = (product: Product) => {
    startTransition(() => {
      setSelectedProductForDetail(product);
      setIsDetailOpen(true);
    });
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            Catálogo Institucional de Insumos y Reactivos
          </h1>
          <p className="text-xs text-slate-500">
            Registro maestro de productos agrupados, stock físico total disponible y trazabilidad de lotes
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsModalOpen(true);
            setFeedback(null);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
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
              placeholder="Buscar por SKU o descripción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="ALL">Todos los tipos</option>
            <option value="REAGENT">Solo Reactivos</option>
            <option value="NON_REAGENT">Insumos Generales</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => loadData()}
          disabled={loading || isPending}
          className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors shadow-2xs cursor-pointer"
          title="Actualizar catálogo"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading || isPending ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* NIVEL 1: Tabla Principal (Una fila por producto único) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">SKU</th>
                <th className="py-3 px-4 font-semibold">Nombre / Descripción</th>
                <th className="py-3 px-4 font-semibold">Categoría</th>
                <th className="py-3 px-4 text-center font-semibold">Unidad Base</th>
                <th className="py-3 px-4 text-right font-semibold">Stock Físico Total</th>
                <th className="py-3 px-4 text-center font-semibold">Estado</th>
                <th className="py-3 px-4 text-center font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    Cargando catálogo maestro de insumos...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No se encontraron insumos registrados en el catálogo.
                  </td>
                </tr>
              ) : (
                products.map((p, index) => {
                  const totalStock = Number(p.totalStock ?? 0);
                  const minAlert = Number(p.minStockAlert ?? 0);
                  const badge = getStockBadge(totalStock, minAlert);
                  const unitAbbr = p.baseUnit?.abbreviation || p.baseUnit?.name || "UND";
                  const batchesCount = p.batches?.length ?? 0;

                  return (
                    <tr
                      key={`${p.id}-${index}`}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* SKU */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {p.sku || `#${p.id}`}
                      </td>

                      {/* Nombre y Detalles */}
                      <td className="py-3 px-4 max-w-xs sm:max-w-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">
                            {p.name}
                          </span>
                          {p.isReagent && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                              <FlaskConical className="w-2.5 h-2.5" />
                              Reactivo
                            </span>
                          )}
                        </div>
                        {p.description && (
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {p.description}
                          </div>
                        )}
                      </td>

                      {/* Categoría */}
                      <td className="py-3 px-4 text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <Layers className="w-3 h-3 text-slate-400 shrink-0" />
                          {p.category?.name || "Sin categoría"}
                        </span>
                      </td>

                      {/* Unidad Base */}
                      <td className="py-3 px-4 text-center font-semibold text-slate-700">
                        {unitAbbr}
                      </td>

                      {/* Stock Físico Total */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {totalStock}{" "}
                        <span className="text-[10px] font-normal text-slate-500 font-sans">
                          {unitAbbr}
                        </span>
                      </td>

                      {/* Badge de Estado: Agotado, Bajo Stock, Disponible */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.className}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${badge.dotColor}`}
                          />
                          {badge.label}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(p)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                            title="Ver Ficha y Lotes del Insumo"
                          >
                            <Boxes className="w-3.5 h-3.5" />
                            <span>Ver Ficha ({batchesCount})</span>
                          </button>

                          <Link
                            href={`/inventory/products/${p.id}`}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                            title="Ir a página técnica del insumo"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NIVEL 2: Ficha Detallada / Lotes (Drawer Slide-over) */}
      {isDetailOpen && selectedProductForDetail && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col overflow-y-auto animate-in slide-in-from-right duration-200">
            {/* Header del Drawer */}
            <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-start justify-between gap-4 sticky top-0 z-10 backdrop-blur-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {selectedProductForDetail.sku || `#${selectedProductForDetail.id}`}
                  </span>
                  {selectedProductForDetail.isReagent ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      <FlaskConical className="w-3 h-3" /> Reactivo Clínico
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      Insumo General
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-slate-900 leading-tight">
                  {selectedProductForDetail.name}
                </h2>
                <p className="text-xs text-slate-500">
                  Ficha maestra del insumo y auditoría de existencias físicas por lote
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/inventory/products/${selectedProductForDetail.id}`}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold px-2.5 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Página Completa</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setIsDetailOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Cerrar ficha"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contenido del Drawer */}
            <div className="p-6 space-y-6 flex-1">
              {/* Tarjetas de Métricas Rápidas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium block">
                    Stock Físico Total
                  </span>
                  <span className="text-xl font-bold font-mono text-slate-900">
                    {Number(selectedProductForDetail.totalStock ?? 0)}{" "}
                    <span className="text-xs font-sans text-slate-500 font-normal">
                      {selectedProductForDetail.baseUnit?.abbreviation}
                    </span>
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium block">
                    Estado Actual
                  </span>
                  <div className="mt-1">
                    {(() => {
                      const total = Number(selectedProductForDetail.totalStock ?? 0);
                      const minAlert = Number(selectedProductForDetail.minStockAlert ?? 0);
                      const b = getStockBadge(total, minAlert);
                      return (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${b.className}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${b.dotColor}`} />
                          {b.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium block">
                    Alerta Stock Mínimo
                  </span>
                  <span className="text-xl font-bold font-mono text-slate-900">
                    {selectedProductForDetail.minStockAlert}{" "}
                    <span className="text-xs font-sans text-slate-500 font-normal">
                      {selectedProductForDetail.baseUnit?.abbreviation}
                    </span>
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium block">
                    Lotes Físicos
                  </span>
                  <span className="text-xl font-bold font-mono text-blue-600">
                    {selectedProductForDetail.batches?.length ?? 0}
                  </span>
                </div>
              </div>

              {/* Ficha Maestra: Parámetros Técnicos */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  Parámetros Maestros del Insumo
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Categoría:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedProductForDetail.category?.name || "Sin categoría"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Marca Comercial:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedProductForDetail.brand?.name || "Genérico"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Unidad de Consumo (Base):</span>
                    <span className="font-semibold text-slate-800">
                      {selectedProductForDetail.baseUnit?.name} (
                      {selectedProductForDetail.baseUnit?.abbreviation})
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Unidad de Compra:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedProductForDetail.purchaseUnit?.name ||
                        selectedProductForDetail.baseUnit?.name ||
                        "Misma que base"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Factor de Conversión:</span>
                    <span className="font-mono font-semibold text-blue-600">
                      1 = {Number(selectedProductForDetail.conversionFactor || 1)}{" "}
                      {selectedProductForDetail.baseUnit?.abbreviation}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500">Código de Barras / Ref:</span>
                    <span className="font-mono text-slate-800">
                      {selectedProductForDetail.barcode || "No asignado"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-slate-100 sm:col-span-2">
                    <span className="text-slate-500">Régimen Fiscal:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedProductForDetail.isTaxExempt
                        ? "Exento de IVA"
                        : "Gravable con IVA"}
                    </span>
                  </div>

                  {selectedProductForDetail.description && (
                    <div className="sm:col-span-2 pt-2">
                      <span className="text-slate-500 block mb-1">Descripción:</span>
                      <p className="p-2.5 bg-slate-50 rounded-lg text-slate-700 leading-relaxed border border-slate-100">
                        {selectedProductForDetail.description}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sub-tabla: Lotes Físicos */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs space-y-0">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-blue-600" />
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Lotes Físicos en Existencia
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {selectedProductForDetail.batches?.length ?? 0} lote(s)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  {!selectedProductForDetail.batches ||
                  selectedProductForDetail.batches.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 space-y-2">
                      <Boxes className="w-8 h-8 mx-auto stroke-[1.5] text-slate-300" />
                      <p className="text-xs font-medium">
                        No hay lotes físicos registrados para este insumo.
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Los lotes se crean automáticamente al recibir órdenes de compra o registrar ingresos.
                      </p>
                    </div>
                  ) : (
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50/70 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3 font-semibold">N° de Lote</th>
                          <th className="py-2.5 px-3 font-semibold">Vencimiento</th>
                          <th className="py-2.5 px-3 font-semibold">Ubicación Física</th>
                          <th className="py-2.5 px-3 text-center font-semibold">Estado</th>
                          <th className="py-2.5 px-3 text-right font-semibold">Cantidad</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedProductForDetail.batches.map((batch: StockBatch, index: number) => {
                          const statusBadge = getBatchStatusBadge(batch.status);
                          return (
                            <tr
                              key={`${batch.id ?? 'batch'}-${index}`}
                              className="hover:bg-slate-50/60 transition-colors"
                            >
                              {/* N° Lote */}
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                {batch.lotNumber}
                              </td>

                              {/* Vencimiento */}
                              <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  {formatExpirationDate(batch.expirationDate)}
                                </span>
                              </td>

                              {/* Ubicación Física */}
                              <td className="py-2.5 px-3 text-slate-700">
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{batch.location?.name || "Sin asignar"}</span>
                                  {batch.location?.type && (
                                    <span className="text-[10px] text-slate-400">
                                      ({batch.location.type})
                                    </span>
                                  )}
                                </span>
                              </td>

                              {/* Estado */}
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${statusBadge.className}`}
                                >
                                  {statusBadge.label}
                                </span>
                              </td>

                              {/* Cantidad */}
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                {Number(batch.currentQuantity)}{" "}
                                <span className="text-[10px] font-normal text-slate-500 font-sans">
                                  {selectedProductForDetail.baseUnit?.abbreviation}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* Footer del Drawer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition-colors cursor-pointer"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

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
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
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
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
                  className="w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500 cursor-pointer"
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
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
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
