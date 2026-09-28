"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  Suspense,
  type FormEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { InventoryClientService } from "@/services/inventory.service";
import {
  ProductService,
  type ProductDetail,
  type BatchItem,
} from "@/services/product.service";
import { AuthService } from "@/services/auth.service";
import type { AuthUser } from "@/types/auth";
import type { AdjustmentType } from "@/types/adjustments";
import type { Product, Category, Location } from "@/types/inventory";
import {
  SearchableSelect,
  type SearchableOption,
} from "@/components/common/SearchableSelect";
import {
  SlidersHorizontal,
  PlusCircle,
  MinusCircle,
  AlertOctagon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Package,
  Calendar,
  Layers,
  ArrowRight,
  ShieldAlert,
  Boxes,
  Plus,
  X,
  Sparkles,
  Thermometer,
} from "lucide-react";

const ADJUSTMENT_OPTIONS: {
  type: AdjustmentType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}[] = [
  {
    type: "ENTRADA_AJUSTE",
    label: "Entrada por Ajuste / Donación",
    icon: PlusCircle,
    description:
      "Incrementa el stock físico (sobrantes de conteo, donaciones, inventario inicial)",
  },
  {
    type: "SALIDA_AJUSTE",
    label: "Salida por Corrección",
    icon: MinusCircle,
    description:
      "Disminuye el stock por desajustes físicos de conteo o descuadres",
  },
  {
    type: "MERMA_ROTURA",
    label: "Merma por Deterioro o Rotura",
    icon: AlertOctagon,
    description: "Baja formal por frasco roto, derrame o envase averiado",
  },
  {
    type: "MERMA_VENCIMIENTO",
    label: "Merma por Vencimiento",
    icon: AlertOctagon,
    description:
      "Baja obligatoria de reactivos o insumos que expiraron en almacén",
  },
];

const ORIGIN_OPTIONS = [
  { value: "Ajuste", label: "Ajuste / Sobrante de conteo" },
  { value: "Donación", label: "Donación" },
  { value: "Inventario inicial", label: "Inventario inicial" },
  { value: "Compra directa", label: "Compra directa sin O/C" },
  { value: "Producción interna", label: "Preparación / Producción interna" },
  { value: "Otro", label: "Otro origen" },
];

function AdjustmentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryProductId = searchParams.get("productId");

  const [currentUser] = useState<AuthUser | null>(() =>
    AuthService.getCurrentUser()
  );

  const userRoles = currentUser?.roles || [];
  const isAuthorized =
    userRoles.includes("ADMINISTRADOR") || userRoles.includes("ALMACENISTA");

  // Catálogos maestros
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(() => isAuthorized);

  // Filtro de categoría independiente para el buscador
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  // Estado del Insumo / Producto seleccionado
  const [selectedProductId, setSelectedProductId] = useState<number | "">("");
  const [selectedProductDetail, setSelectedProductDetail] =
    useState<ProductDetail | null>(null);
  const [loadingProductDetail, setLoadingProductDetail] = useState(false);

  // Tipo de Operación
  const [adjustmentType, setAdjustmentType] =
    useState<AdjustmentType>("ENTRADA_AJUSTE");

  // Manejo de Lote en ENTRADA (Existente vs Nuevo)
  const [entryBatchMode, setEntryBatchMode] = useState<"EXISTING" | "NEW">(
    "EXISTING"
  );
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");

  // Campos para Crear Lote Nuevo
  const [newLotNumber, setNewLotNumber] = useState<string>("");
  const [newExpirationDate, setNewExpirationDate] = useState<string>("");
  const [newLocationId, setNewLocationId] = useState<number | "">("");
  const [newCostPrice, setNewCostPrice] = useState<number | "">("");
  const [newOrigin, setNewOrigin] = useState<string>("Ajuste");

  // Cantidad y Justificación
  const [quantity, setQuantity] = useState<number | "">("");
  const [reason, setReason] = useState<string>("");
  const [referenceDoc, setReferenceDoc] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  // Cargar ficha fresca del producto seleccionado desde el servidor
  const loadProductDetail = useCallback(async (productId: number | string) => {
    setLoadingProductDetail(true);
    try {
      const detail = await ProductService.getProductById(productId);
      setSelectedProductDetail(detail);
      setSelectedProductId(Number(detail.id));

      const batches = detail.stockBatches || detail.batches || [];
      if (batches.length === 0) {
        setEntryBatchMode("NEW");
        setSelectedBatchId("");
      } else {
        setEntryBatchMode("EXISTING");
        const availableWithStock = batches.filter(
          (b) => Number(b.currentQuantity) > 0
        );
        if (availableWithStock.length > 0) {
          setSelectedBatchId(String(availableWithStock[0].id));
        } else {
          setSelectedBatchId(String(batches[0].id));
        }
      }
    } catch {
      setFeedback({
        status: "error",
        message:
          "El producto especificado no fue encontrado o no está disponible.",
      });
      setSelectedProductId("");
      setSelectedProductDetail(null);
    } finally {
      setLoadingProductDetail(false);
    }
  }, []);

  // Inicialización y carga de catálogos
  useEffect(() => {
    let isMounted = true;
    if (!AuthService.isAuthenticated()) {
      router.replace("/login");
      return;
    }

    if (!isAuthorized) {
      return;
    }

    void (async () => {
      try {
        const [prodsData, catsData, locsData] = await Promise.all([
          InventoryClientService.getProducts(),
          InventoryClientService.getCategories(),
          InventoryClientService.getLocations(),
        ]);
        if (!isMounted) return;
        setProducts(prodsData);
        setCategories(catsData);
        setLocations(locsData);

        if (locsData.length > 0) {
          setNewLocationId((prev) => (prev === "" ? locsData[0].id : prev));
        }
      } catch {
        // Manejado por interceptor global
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [router, isAuthorized]);

  // Resolver query param de productId si viene en la URL
  useEffect(() => {
    let isMounted = true;
    if (!queryProductId || !isAuthorized) return;

    const numId = Number(queryProductId);
    if (isNaN(numId) || numId <= 0) {
      const timer = setTimeout(() => {
        if (isMounted) {
          setFeedback({
            status: "error",
            message: "El identificador de producto en el enlace no es válido.",
          });
        }
      }, 0);
      return () => clearTimeout(timer);
    }

    void (async () => {
      try {
        setLoadingProductDetail(true);
        const detail = await ProductService.getProductById(numId);
        if (!isMounted) return;
        setSelectedProductDetail(detail);
        setSelectedProductId(Number(detail.id));

        const batches = detail.stockBatches || detail.batches || [];
        if (batches.length === 0) {
          setEntryBatchMode("NEW");
          setSelectedBatchId("");
        } else {
          setEntryBatchMode("EXISTING");
          const availableWithStock = batches.filter(
            (b) => Number(b.currentQuantity) > 0
          );
          if (availableWithStock.length > 0) {
            setSelectedBatchId(String(availableWithStock[0].id));
          } else {
            setSelectedBatchId(String(batches[0].id));
          }
        }
      } catch {
        if (!isMounted) return;
        setFeedback({
          status: "error",
          message:
            "El producto especificado no fue encontrado o no está disponible.",
        });
        setSelectedProductId("");
        setSelectedProductDetail(null);
      } finally {
        if (isMounted) setLoadingProductDetail(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [queryProductId, isAuthorized]);

  // Manejo al seleccionar un insumo desde el combobox
  const handleSelectProduct = (
    val: string | number,
    option?: SearchableOption<Product>
  ) => {
    setFeedback(null);
    if (!val || val === 0 || val === "0") {
      setSelectedProductId("");
      setSelectedProductDetail(null);
      setSelectedBatchId("");
      setQuantity("");
      return;
    }

    const prod =
      option?.data || products.find((p) => String(p.id) === String(val));
    if (prod) {
      void loadProductDetail(prod.id);
    }
  };

  // Opciones de productos para SearchableSelect (estándar aprobado de compras)
  const productOptions = useMemo<SearchableOption<Product>[]>(() => {
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
        data: p,
      };
    });
  }, [products]);

  // Lotes del producto seleccionado
  const productBatches: BatchItem[] = useMemo(() => {
    if (!selectedProductDetail) return [];
    return (
      selectedProductDetail.stockBatches ||
      selectedProductDetail.batches ||
      []
    );
  }, [selectedProductDetail]);

  const activeBatchesWithStock = useMemo(() => {
    return productBatches.filter(
      (b) => b.status === "DISPONIBLE" && Number(b.currentQuantity) > 0
    );
  }, [productBatches]);

  const isIncrement = adjustmentType === "ENTRADA_AJUSTE";

  // Lote activo actualmente seleccionado
  const activeBatch = useMemo(() => {
    if (!selectedBatchId) return null;
    return productBatches.find((b) => String(b.id) === String(selectedBatchId));
  }, [productBatches, selectedBatchId]);

  // Cálculo del stock proyectado posterior a la acción
  const currentLotStock = activeBatch ? Number(activeBatch.currentQuantity) : 0;
  const numQuantity = Number(quantity) || 0;
  const projectedStock = isIncrement
    ? entryBatchMode === "NEW"
      ? numQuantity
      : currentLotStock + numQuantity
    : Math.max(0, currentLotStock - numQuantity);

  // Unidad de medida a mostrar
  const unitLabel =
    selectedProductDetail?.baseUnit?.abbreviation ||
    (selectedProductDetail as unknown as { unitOfMeasure?: string })
      ?.unitOfMeasure ||
    "UND";

  // Validación y envío del formulario
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) return;
    setFeedback(null);

    if (!selectedProductId || !selectedProductDetail) {
      setFeedback({
        status: "error",
        message: "Debe seleccionar un insumo del catálogo para realizar el ajuste.",
      });
      return;
    }

    if (!quantity || Number(quantity) <= 0) {
      setFeedback({
        status: "error",
        message: "La cantidad a ajustar debe ser mayor a cero.",
      });
      return;
    }

    if (!reason.trim()) {
      setFeedback({
        status: "error",
        message: "Debe indicar el motivo o justificación técnica.",
      });
      return;
    }

    const isMerma =
      adjustmentType === "MERMA_ROTURA" ||
      adjustmentType === "MERMA_VENCIMIENTO";

    if (isMerma && reason.trim().length < 5) {
      setFeedback({
        status: "error",
        message:
          "El motivo de la merma debe ser explícito (al menos 5 caracteres).",
      });
      return;
    }

    // Validaciones para ENTRADA
    if (isIncrement) {
      if (entryBatchMode === "EXISTING" && !selectedBatchId) {
        setFeedback({
          status: "error",
          message:
            "Debe seleccionar el lote existente al cual se sumará la existencia.",
        });
        return;
      }
      if (entryBatchMode === "NEW") {
        if (!newLotNumber.trim()) {
          setFeedback({
            status: "error",
            message: "Debe indicar el número de lote para darlo de alta.",
          });
          return;
        }
        if (!newLocationId) {
          setFeedback({
            status: "error",
            message: "Debe seleccionar la ubicación física del nuevo lote.",
          });
          return;
        }
      }
    } else {
      // Validaciones para SALIDA / MERMA
      if (!selectedBatchId || !activeBatch) {
        setFeedback({
          status: "error",
          message:
            "Debe seleccionar el lote del cual se descontará la existencia.",
        });
        return;
      }
      if (Number(quantity) > currentLotStock) {
        setFeedback({
          status: "error",
          message: `La cantidad a descontar (${quantity} ${unitLabel}) supera el saldo disponible del lote #${activeBatch.lotNumber} (${currentLotStock} ${unitLabel}).`,
        });
        return;
      }
    }

    setSubmitting(true);
    try {
      let resMessage = "";
      let newBalanceResult = 0;

      if (isMerma) {
        const res = await InventoryClientService.registerDirectWaste({
          batchId: Number(selectedBatchId),
          quantity: Number(quantity),
          reason: reason.trim(),
        });
        resMessage = res.message;
        newBalanceResult = res.newBalance;
      } else if (isIncrement && entryBatchMode === "NEW") {
        const res = await InventoryClientService.createAdjustment({
          notes: referenceDoc.trim() || undefined,
          items: [
            {
              newBatch: {
                productId: Number(selectedProductId),
                lotNumber: newLotNumber.trim().toUpperCase(),
                expirationDate: newExpirationDate || null,
                locationId: Number(newLocationId),
                costPrice: Number(newCostPrice) || 0,
                origin: newOrigin || "Ajuste",
              },
              action: "INCREMENTO",
              quantity: Number(quantity),
              reason: reason.trim(),
            },
          ],
        });
        resMessage = res.message;
        newBalanceResult = res.newBalance;
      } else {
        const res = await InventoryClientService.createAdjustment({
          notes: referenceDoc.trim() || undefined,
          items: [
            {
              batchId: Number(selectedBatchId),
              action: isIncrement ? "INCREMENTO" : "DECREMENTO",
              quantity: Number(quantity),
              reason: reason.trim(),
            },
          ],
        });
        resMessage = res.message;
        newBalanceResult = res.newBalance;
      }

      setFeedback({
        status: "success",
        message: `${resMessage || "Operación aplicada exitosamente."} Saldo actualizado del lote: ${newBalanceResult} ${unitLabel}`,
      });

      // Limpiar campos transaccionales y recargar detalle del producto
      setQuantity("");
      setReason("");
      setReferenceDoc("");
      setNewLotNumber("");
      setNewExpirationDate("");
      setNewCostPrice("");

      // Recargar catálogo y detalle del producto para refrescar stock en tiempo real
      await Promise.all([
        InventoryClientService.getProducts().then((p) => setProducts(p)),
        loadProductDetail(selectedProductId),
      ]);
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Error al procesar la operación de inventario.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <SlidersHorizontal className="w-6 h-6 text-blue-600" />
          Ajustes de Inventario y Mermas
        </h1>
        <p className="text-xs text-slate-500">
          Modificaciones directas al stock físico con justificación técnica para
          el Kardex
        </p>
      </div>

      {!isAuthorized ? (
        <div className="bg-white border border-amber-200 rounded-xl p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-slate-800">
              Módulo de Modificación Física Restringido
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Los ajustes manuales de stock, ingresos de insumos por donación y
              bajas por descarte o merma son competencia exclusiva del personal
              de <strong>Almacén</strong> o <strong>Administración</strong>.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => router.push("/inventory/kardex")}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors cursor-pointer"
            >
              Consultar Kardex de Movimientos
            </button>
          </div>
        </div>
      ) : (
        <>
          {feedback && (
            <div
              className={`p-4 rounded-xl text-xs flex items-center gap-2.5 border animate-in fade-in duration-200 ${
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
              <span className="font-medium">{feedback.message}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6"
          >
            {/* 1. Selección del Tipo de Operación */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                1. Tipo de Operación *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ADJUSTMENT_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = adjustmentType === opt.type;
                  return (
                    <div
                      key={opt.type}
                      onClick={() => {
                        setAdjustmentType(opt.type);
                        setFeedback(null);
                      }}
                      className={`cursor-pointer border rounded-lg p-3 transition-all flex flex-col justify-between ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/50 text-blue-900 shadow-2xs ring-1 ring-blue-500"
                          : "border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/40"
                      }`}
                    >
                      <div className="flex items-center gap-2 font-semibold text-xs mb-1">
                        <Icon
                          className={`w-4 h-4 ${
                            isSelected ? "text-blue-600" : "text-slate-400"
                          }`}
                        />
                        {opt.label}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {opt.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Selector de Insumo / Producto con Filtro de Categoría Separado */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    2. Insumo o Reactivo a Ajustar *
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Búsqueda sobre todo el catálogo institucional
                  </p>
                </div>

                {/* Filtro por Categoría (Separado, fuera de la fila del buscador) */}
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-[11px] font-semibold text-slate-500 shrink-0">
                    Categoría:
                  </span>
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-white border border-slate-300 hover:border-slate-400 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer"
                  >
                    <option value="">Todas las categorías</option>
                    {categories.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Combobox con búsqueda escrita reutilizable */}
              <SearchableSelect<Product>
                options={productOptions}
                value={selectedProductId || ""}
                onChange={handleSelectProduct}
                categoryFilter={categoryFilter}
                placeholder="Buscar insumo por nombre, SKU, código de barras o descripción..."
                emptyMessage="No se encontraron insumos que coincidan con la búsqueda."
                itemTypeLabel="insumo(s)"
                disabled={loadingInitial}
              />

              {loadingProductDetail && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  Cargando información y lotes del insumo...
                </div>
              )}

              {/* Ficha Visual Ampliada del Producto Seleccionado */}
              {selectedProductDetail && !loadingProductDetail && (
                <div className="p-4 bg-blue-50/40 border border-blue-200 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Package className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="font-bold text-slate-900 text-sm">
                          {selectedProductDetail.name}
                        </span>
                        <span className="font-mono text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold border border-blue-200">
                          SKU: {selectedProductDetail.sku}
                        </span>
                        {selectedProductDetail.isReagent && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                            <Thermometer className="w-3 h-3" /> Reactivo Clínico
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                        <span>
                          Categoría:{" "}
                          <strong className="text-slate-700">
                            {selectedProductDetail.category?.name ||
                              "Sin categoría"}
                          </strong>
                        </span>
                        <span>·</span>
                        <span>
                          Unidad Base:{" "}
                          <strong className="text-slate-700">
                            {unitLabel}
                          </strong>
                        </span>
                        {selectedProductDetail.purchaseUnit && (
                          <>
                            <span>·</span>
                            <span>
                              Presentación de compra:{" "}
                              <strong className="text-slate-700">
                                {selectedProductDetail.purchaseUnit.name} (x
                                {selectedProductDetail.conversionFactor || 1})
                              </strong>
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="bg-white border border-blue-200 px-3 py-1.5 rounded-lg shadow-2xs text-right">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                          Stock Total en Sistema
                        </span>
                        <span className="text-base font-bold font-mono text-blue-900 flex items-center justify-end gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-blue-600" />
                          {selectedProductDetail.totalStock ?? 0} {unitLabel}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProductId("");
                          setSelectedProductDetail(null);
                          setSelectedBatchId("");
                          setQuantity("");
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                        title="Cambiar producto"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Selección o Creación de Lote */}
            {selectedProductDetail && !loadingProductDetail && (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      3. Lote y Ubicación Física *
                    </label>
                    <p className="text-[11px] text-slate-500">
                      {isIncrement
                        ? "Seleccione un lote existente o registre un nuevo lote para este ingreso"
                        : "Indique el lote específico del que se descontará la existencia"}
                    </p>
                  </div>

                  {/* Switch entre Usar Lote Existente vs Crear Nuevo Lote (Solo en Entradas) */}
                  {isIncrement && productBatches.length > 0 && (
                    <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setEntryBatchMode("EXISTING")}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                          entryBatchMode === "EXISTING"
                            ? "bg-white text-blue-700 shadow-2xs font-bold"
                            : "text-slate-600 hover:text-slate-800"
                        }`}
                      >
                        Lote Existente
                      </button>
                      <button
                        type="button"
                        onClick={() => setEntryBatchMode("NEW")}
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                          entryBatchMode === "NEW"
                            ? "bg-blue-600 text-white shadow-2xs font-bold"
                            : "text-slate-600 hover:text-slate-800"
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                        Crear Nuevo Lote
                      </button>
                    </div>
                  )}
                </div>

                {/* Subcaso A: ENTRADA - Producto sin ningún lote previo */}
                {isIncrement && productBatches.length === 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-800">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">
                        Primer ingreso sin lote previo:
                      </span>{" "}
                      Este insumo aún no tiene lotes registrados. Se creará un
                      lote inicial en esta misma operación.
                    </div>
                  </div>
                )}

                {/* Subcaso B: SALIDA/MERMA - Producto sin stock en ningún lote */}
                {!isIncrement && activeBatchesWithStock.length === 0 && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-800">
                    <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <strong className="block text-sm font-bold">
                        Sin existencia disponible para descuento
                      </strong>
                      <p>
                        Este insumo no tiene saldo disponible en ningún lote
                        activo (Stock actual: 0 {unitLabel}). Para registrar
                        salidas o mermas, el insumo debe contar con existencias
                        físicas en almacén.
                      </p>
                    </div>
                  </div>
                )}

                {/* Selector de Lote Existente (Entrada en modo EXISTING o Salida/Merma) */}
                {(!isIncrement || entryBatchMode === "EXISTING") &&
                  (productBatches.length > 0 ? (
                    <div className="space-y-2">
                      <select
                        value={selectedBatchId}
                        onChange={(e) => setSelectedBatchId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                        disabled={
                          !isIncrement && activeBatchesWithStock.length === 0
                        }
                      >
                        <option value="">-- Seleccione un lote --</option>
                        {(!isIncrement
                          ? activeBatchesWithStock
                          : productBatches
                        ).map((b) => (
                          <option key={b.id} value={String(b.id)}>
                            Lote #{b.lotNumber} · Stock: {b.currentQuantity}{" "}
                            {unitLabel} · Ubicación:{" "}
                            {b.location?.name || "Almacén Central"} ·{" "}
                            {b.expirationDate
                              ? `Vence: ${new Date(
                                  b.expirationDate
                                ).toLocaleDateString()}`
                              : "Sin vencimiento"}
                          </option>
                        ))}
                      </select>

                      {/* Tarjeta resumen del lote seleccionado */}
                      {activeBatch && (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Boxes className="w-4 h-4 text-blue-600" />
                            <span className="font-mono font-bold text-slate-900">
                              Lote #{activeBatch.lotNumber}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="text-slate-600">
                              Ubicación:{" "}
                              <strong>
                                {activeBatch.location?.name ||
                                  "Almacén Central"}
                              </strong>
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="text-slate-500 font-mono flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {activeBatch.expirationDate
                                ? new Date(
                                    activeBatch.expirationDate
                                  ).toLocaleDateString()
                                : "No expira"}
                            </span>
                          </div>

                          <div className="font-mono text-xs">
                            <span className="text-slate-500">
                              Saldo del lote:
                            </span>{" "}
                            <strong className="text-blue-900">
                              {activeBatch.currentQuantity} {unitLabel}
                            </strong>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null)}

                {/* Formulario Inline: Crear Lote Nuevo (Solo en Entrada cuando entryBatchMode === 'NEW') */}
                {isIncrement && entryBatchMode === "NEW" && (
                  <div className="p-4 bg-slate-50 border border-blue-200 rounded-xl space-y-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-900 border-b border-slate-200 pb-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      Datos del Nuevo Lote
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {/* Número de Lote */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          N° de Lote *
                        </label>
                        <input
                          type="text"
                          value={newLotNumber}
                          onChange={(e) =>
                            setNewLotNumber(e.target.value.toUpperCase())
                          }
                          placeholder="Ej: LOT-2026-001"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                          required
                        />
                      </div>

                      {/* Fecha de Vencimiento */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          Fecha de Vencimiento
                        </label>
                        <input
                          type="date"
                          value={newExpirationDate}
                          onChange={(e) => setNewExpirationDate(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      {/* Ubicación / Depósito */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          Ubicación Física *
                        </label>
                        <select
                          value={newLocationId}
                          onChange={(e) =>
                            setNewLocationId(Number(e.target.value))
                          }
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                          required
                        >
                          <option value="">-- Seleccionar Ubicación --</option>
                          {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.name} ({loc.type})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Costo Unitario Estimado */}
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          Costo Unitario ($ USD)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={newCostPrice}
                          onChange={(e) =>
                            setNewCostPrice(
                              e.target.value === ""
                                ? ""
                                : Number(e.target.value)
                            )
                          }
                          placeholder="0.00"
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>

                      {/* Origen del Lote */}
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">
                          Origen del Lote / Causa de Ingreso *
                        </label>
                        <select
                          value={newOrigin}
                          onChange={(e) => setNewOrigin(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-semibold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                          required
                        >
                          {ORIGIN_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. Cantidad y Referencia */}
            {selectedProductDetail && !loadingProductDetail && (
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Cantidad a Ajustar */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                        Cantidad a Operar *
                      </label>
                      {numQuantity > 0 &&
                        (isIncrement
                          ? entryBatchMode === "NEW" || activeBatch
                          : activeBatch) && (
                          <span className="text-[11px] font-mono flex items-center gap-1 text-slate-600">
                            <span>Saldo lote:</span>
                            <span className="font-semibold text-slate-800">
                              {isIncrement && entryBatchMode === "NEW"
                                ? 0
                                : currentLotStock}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span
                              className={`font-bold ${
                                isIncrement
                                  ? "text-emerald-600"
                                  : projectedStock === 0
                                    ? "text-red-600"
                                    : "text-blue-600"
                              }`}
                            >
                              {projectedStock} {unitLabel}
                            </span>
                          </span>
                        )}
                    </div>

                    <div className="relative">
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={quantity}
                        onChange={(e) =>
                          setQuantity(
                            e.target.value === ""
                              ? ""
                              : Number(e.target.value)
                          )
                        }
                        placeholder="Ej: 10"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-3 pr-14 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-mono font-bold"
                        required
                        disabled={
                          !isIncrement && activeBatchesWithStock.length === 0
                        }
                      />
                      <span className="absolute inset-y-0 right-3 flex items-center text-[10px] font-semibold text-slate-400 pointer-events-none">
                        {unitLabel}
                      </span>
                    </div>

                    {/* Alerta de exceso de stock en salidas */}
                    {!isIncrement &&
                      activeBatch &&
                      numQuantity > currentLotStock && (
                        <p className="text-[11px] text-red-600 font-medium mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          La cantidad supera el stock del lote ({currentLotStock}{" "}
                          {unitLabel})
                        </p>
                      )}
                  </div>

                  {/* Documento o N° Acta */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Documento o N° Acta (Opcional)
                    </label>
                    <input
                      type="text"
                      value={referenceDoc}
                      onChange={(e) => setReferenceDoc(e.target.value)}
                      placeholder="Ej: ACTA-MERMA-2026-04 o DONACION-OPS-01"
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                    />
                  </div>
                </div>

                {/* Motivo / Justificación */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Motivo / Justificación Técnica *
                  </label>
                  <textarea
                    rows={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={
                      adjustmentType === "MERMA_ROTURA" ||
                      adjustmentType === "MERMA_VENCIMIENTO"
                        ? "Describa detalladamente el motivo del descarte o merma (mínimo 5 caracteres)..."
                        : "Describa la causa del ajuste físico, conteo o procedencia de la donación..."
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                    required
                  />
                </div>

                {/* Botón Guardar */}
                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <button
                    type="submit"
                    disabled={
                      Boolean(
                        submitting ||
                          !selectedProductId ||
                          (!isIncrement &&
                            activeBatchesWithStock.length === 0) ||
                          (!isIncrement &&
                            activeBatch &&
                            numQuantity > currentLotStock)
                      )
                    }
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {submitting
                      ? "Procesando operación..."
                      : isIncrement
                        ? entryBatchMode === "NEW"
                          ? "Dar de Alta Lote e Ingresar Stock"
                          : "Confirmar Ajuste Positivo"
                        : "Confirmar y Aplicar Baja de Stock"}
                  </button>
                </div>
              </div>
            )}
          </form>
        </>
      )}
    </div>
  );
}

export default function AdjustmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[70vh] flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          <span className="text-xs text-slate-500 font-medium">
            Cargando módulo de ajustes y mermas...
          </span>
        </div>
      }
    >
      <AdjustmentsContent />
    </Suspense>
  );
}
