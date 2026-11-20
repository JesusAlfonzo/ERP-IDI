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
import { cn } from "@/lib/utils";

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
  ArrowLeft,
  FileText,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ADJUSTMENT_OPTIONS: {
  type: AdjustmentType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "emerald" | "amber" | "rose" | "purple";
  description: string;
}[] = [
  {
    type: "ENTRADA_AJUSTE",
    label: "Entrada por Ajuste / Donación",
    icon: PlusCircle,
    color: "emerald",
    description:
      "Incrementa el stock físico por sobrantes de conteo, donaciones o inventario inicial",
  },
  {
    type: "SALIDA_AJUSTE",
    label: "Salida por Corrección",
    icon: MinusCircle,
    color: "amber",
    description:
      "Disminuye el stock por desajustes físicos de conteo o descuadres de inventario",
  },
  {
    type: "MERMA_ROTURA",
    label: "Merma por Deterioro o Rotura",
    icon: AlertOctagon,
    color: "rose",
    description:
      "Baja formal por frasco roto, derrame, daño físico o envase averiado en almacén",
  },
  {
    type: "MERMA_VENCIMIENTO",
    label: "Merma por Vencimiento",
    icon: AlertOctagon,
    color: "purple",
    description:
      "Baja formal de reactivos o insumos que alcanzaron su fecha de expiración",
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

function NewAdjustmentContent() {
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
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Estados del Formulario
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<number | "">("");
  const [selectedProductDetail, setSelectedProductDetail] =
    useState<ProductDetail | null>(null);
  const [loadingProductDetail, setLoadingProductDetail] = useState(false);

  const [adjustmentType, setAdjustmentType] =
    useState<AdjustmentType>("ENTRADA_AJUSTE");
  const [entryBatchMode, setEntryBatchMode] = useState<"EXISTING" | "NEW">(
    "EXISTING"
  );
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");

  const [newLotNumber, setNewLotNumber] = useState<string>("");
  const [newExpirationDate, setNewExpirationDate] = useState<string>("");
  const [newLocationId, setNewLocationId] = useState<number | "">("");
  const [newCostPrice, setNewCostPrice] = useState<number | "">("");
  const [newOrigin, setNewOrigin] = useState<string>("Ajuste");

  const [quantity, setQuantity] = useState<number | "">("");
  const [reason, setReason] = useState<string>("");
  const [referenceDoc, setReferenceDoc] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  // Cargar ficha fresca del producto seleccionado
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

  // Inicialización de catálogos
  useEffect(() => {
    let isMounted = true;
    if (!AuthService.isAuthenticated()) {
      router.replace("/login");
      return;
    }

    if (!isAuthorized) {
      setLoadingInitial(false);
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

  // Si viene con productId en la URL, seleccionarlo automáticamente
  useEffect(() => {
    if (!queryProductId || !isAuthorized) return;
    const numId = Number(queryProductId);
    if (!isNaN(numId) && numId > 0) {
      void loadProductDetail(numId);
    }
  }, [queryProductId, isAuthorized, loadProductDetail]);

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

  // Opciones de productos para SearchableSelect
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

  const activeBatch = useMemo(() => {
    if (!selectedBatchId) return null;
    return productBatches.find((b) => String(b.id) === String(selectedBatchId));
  }, [productBatches, selectedBatchId]);

  const currentLotStock = activeBatch ? Number(activeBatch.currentQuantity) : 0;
  const numQuantity = Number(quantity) || 0;
  const projectedStock = isIncrement
    ? entryBatchMode === "NEW"
      ? numQuantity
      : currentLotStock + numQuantity
    : Math.max(0, currentLotStock - numQuantity);

  const unitLabel =
    selectedProductDetail?.baseUnit?.abbreviation || "UND";

  // Manejador de Registro de Ajuste
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!selectedProductId) {
      setFeedback({
        status: "error",
        message: "Debe seleccionar un insumo o reactivo del catálogo institucional.",
      });
      return;
    }

    if (!quantity || Number(quantity) <= 0) {
      setFeedback({
        status: "error",
        message: "La cantidad a ajustar debe ser mayor a 0.",
      });
      return;
    }

    if (!reason.trim() || reason.trim().length < 5) {
      setFeedback({
        status: "error",
        message:
          "La justificación técnica es obligatoria y debe contener al menos 5 caracteres.",
      });
      return;
    }

    if (isIncrement && entryBatchMode === "NEW") {
      if (!newLotNumber.trim()) {
        setFeedback({
          status: "error",
          message: "Debe ingresar el código o número para el nuevo lote.",
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
    } else {
      if (!selectedBatchId) {
        setFeedback({
          status: "error",
          message: "Debe seleccionar el lote específico a operar.",
        });
        return;
      }

      if (!isIncrement && activeBatch) {
        if (Number(quantity) > currentLotStock) {
          setFeedback({
            status: "error",
            message: `La cantidad solicitada (${quantity} ${unitLabel}) supera el saldo disponible del lote (${currentLotStock} ${unitLabel}).`,
          });
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      let resMessage = "";
      let newBalanceResult = 0;

      if (
        adjustmentType === "MERMA_ROTURA" ||
        adjustmentType === "MERMA_VENCIMIENTO"
      ) {
        const fullReason = referenceDoc.trim()
          ? `[${referenceDoc.trim()}] ${reason.trim()}`
          : reason.trim();

        const res = await InventoryClientService.registerDirectWaste({
          batchId: Number(selectedBatchId),
          quantity: Number(quantity),
          reason: fullReason,
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
                costPrice:
                  newCostPrice === "" ? undefined : Number(newCostPrice),
                origin: newOrigin,
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

      // Redirigir a la vista de ajustes con parámetro de éxito
      const successText = encodeURIComponent(
        `${resMessage || "Operación aplicada exitosamente."} Saldo actualizado del lote: ${newBalanceResult} ${unitLabel}`
      );
      router.push(`/inventory/adjustments?successMessage=${successText}`);
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Error al procesar la operación de inventario.",
      });
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* ========================================================
          ENCABEZADO DE LA PÁGINA
         ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => router.push("/inventory/adjustments")}
            className="h-9 w-9 cursor-pointer shrink-0"
            title="Volver al historial de ajustes"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 shadow-2xs">
            <SlidersHorizontal className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Registrar Ajuste o Merma
              </h1>
              <Badge variant="outline" className="text-[11px] font-mono bg-muted/20">
                Nuevo Registro
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Modificación física de stock con justificación técnica para el Kardex
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.push("/inventory/adjustments")}
          className="gap-1.5 text-xs cursor-pointer self-start sm:self-auto"
        >
          <X className="w-3.5 h-3.5" />
          <span>Cancelar</span>
        </Button>
      </div>

      {!isAuthorized ? (
        <Card className="border-amber-200 dark:border-amber-900/50 p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-600">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">
              Acceso Restringido
            </h2>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              El registro de ajustes de inventario y mermas es exclusivo para
              usuarios con rol de Almacenista o Administrador.
            </p>
          </div>
          <div className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/inventory/adjustments")}
            >
              Volver al Listado
            </Button>
          </div>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {feedback && (
            <Alert
              variant={
                feedback.status === "success" ? "default" : "destructive"
              }
              className={cn(
                "animate-in fade-in duration-200",
                feedback.status === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100"
                  : ""
              )}
            >
              {feedback.status === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <AlertDescription className="font-medium text-xs flex items-center justify-between">
                <span>{feedback.message}</span>
                <button
                  type="button"
                  onClick={() => setFeedback(null)}
                  className="opacity-70 hover:opacity-100 cursor-pointer ml-3"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </AlertDescription>
            </Alert>
          )}

          {/* ========================================================
              BLOQUE 1: TIPO DE OPERACIÓN
             ======================================================== */}
          <Card className="border-border shadow-2xs p-5 space-y-3">
            <div className="border-b border-border pb-2.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                <span>1. Tipo de Operación *</span>
              </Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Seleccione el propósito del movimiento en el inventario físico
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {ADJUSTMENT_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = adjustmentType === opt.type;

                return (
                  <button
                    type="button"
                    key={opt.type}
                    onClick={() => {
                      setAdjustmentType(opt.type);
                      setFeedback(null);
                    }}
                    className={cn(
                      "text-left p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-1.5",
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-2xs text-foreground"
                        : "border-border hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <Icon
                        className={cn(
                          "w-4 h-4 shrink-0",
                          isSelected ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                      <span>{opt.label}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {opt.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* ========================================================
              BLOQUE 2: SELECCIÓN DE INSUMO O REACTIVO
             ======================================================== */}
          <Card className="border-border shadow-2xs p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-2.5">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  <span>2. Insumo o Reactivo *</span>
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Búsqueda sobre todo el catálogo institucional
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-[11px] font-semibold text-muted-foreground shrink-0">
                  Categoría:
                </span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-background border border-input rounded-md px-2.5 py-1 text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring cursor-pointer"
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

            <SearchableSelect<Product>
              options={productOptions}
              value={selectedProductId || ""}
              onChange={handleSelectProduct}
              categoryFilter={categoryFilter}
              placeholder="Buscar insumo por nombre, SKU o descripción..."
              emptyMessage="No se encontraron insumos que coincidan."
              itemTypeLabel="insumo(s)"
              disabled={loadingInitial || submitting}
            />

            {loadingProductDetail && (
              <div className="p-3 bg-muted/40 border border-border rounded-lg flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                Cargando información y lotes del insumo...
              </div>
            )}

            {/* Ficha Visual Ampliada del Producto Seleccionado */}
            {selectedProductDetail && !loadingProductDetail && (
              <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-3 text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Package className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-bold text-foreground text-sm truncate">
                        {selectedProductDetail.name}
                      </span>
                      {selectedProductDetail.sku && (
                        <span className="font-mono text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold border border-primary/20">
                          SKU: {selectedProductDetail.sku}
                        </span>
                      )}
                      {selectedProductDetail.isReagent && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
                          <Thermometer className="w-3 h-3" /> Reactivo Clínico
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                      <span>
                        Categoría:{" "}
                        <strong className="text-foreground">
                          {selectedProductDetail.category?.name || "Sin categoría"}
                        </strong>
                      </span>
                      <span>·</span>
                      <span>
                        Unidad Base:{" "}
                        <strong className="text-foreground">{unitLabel}</strong>
                      </span>
                      {selectedProductDetail.purchaseUnit && (
                        <>
                          <span>·</span>
                          <span>
                            Presentación de compra:{" "}
                            <strong className="text-foreground">
                              {selectedProductDetail.purchaseUnit.name} (x
                              {selectedProductDetail.conversionFactor || 1})
                            </strong>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="bg-background border border-border px-3.5 py-2 rounded-xl shadow-2xs text-right">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                        Stock Total en Sistema
                      </span>
                      <span className="text-base font-bold font-mono text-primary flex items-center justify-end gap-1.5">
                        <Layers className="w-4 h-4 text-primary" />
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
                      className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted border border-transparent hover:border-border transition-colors cursor-pointer"
                      title="Cambiar insumo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* ========================================================
              BLOQUE 3: SELECCIÓN O CREACIÓN DE LOTE
             ======================================================== */}
          {selectedProductDetail && !loadingProductDetail && (
            <Card className="border-border shadow-2xs p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-2.5">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-primary" />
                    <span>3. Lote y Ubicación Física *</span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {isIncrement
                      ? "Seleccione un lote existente o registre un nuevo lote para este ingreso"
                      : "Indique el lote específico del que se descontará la existencia"}
                  </p>
                </div>

                {isIncrement && productBatches.length > 0 && (
                  <div className="flex items-center bg-muted p-0.5 rounded-lg border border-border self-start sm:self-auto text-xs">
                    <button
                      type="button"
                      onClick={() => setEntryBatchMode("EXISTING")}
                      className={cn(
                        "px-3 py-1 rounded-md transition-all cursor-pointer font-semibold",
                        entryBatchMode === "EXISTING"
                          ? "bg-background text-foreground shadow-2xs font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Lote Existente
                    </button>
                    <button
                      type="button"
                      onClick={() => setEntryBatchMode("NEW")}
                      className={cn(
                        "px-3 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer font-semibold",
                        entryBatchMode === "NEW"
                          ? "bg-primary text-primary-foreground shadow-2xs font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Plus className="w-3 h-3" />
                      Crear Nuevo Lote
                    </button>
                  </div>
                )}
              </div>

              {/* Subcaso: ENTRADA - Producto sin ningún lote previo */}
              {isIncrement && productBatches.length === 0 && (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2.5 text-xs text-amber-700 dark:text-amber-300">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">
                      Primer ingreso sin lote previo:
                    </span>{" "}
                    Este insumo aún no tiene lotes registrados. Se creará un lote
                    inicial en esta misma operación.
                  </div>
                </div>
              )}

              {/* Subcaso: SALIDA/MERMA - Producto sin stock en ningún lote */}
              {!isIncrement && activeBatchesWithStock.length === 0 && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3 text-xs text-destructive">
                  <AlertOctagon className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <strong className="block text-sm font-bold">
                      Sin existencia disponible para descuento
                    </strong>
                    <p>
                      Este insumo no tiene saldo disponible en ningún lote activo
                      (Stock actual: 0 {unitLabel}). Para registrar salidas o
                      mermas, el insumo debe contar con existencias físicas en
                      almacén.
                    </p>
                  </div>
                </div>
              )}

              {/* Selector de Lote Existente */}
              {(!isIncrement || entryBatchMode === "EXISTING") &&
                productBatches.length > 0 && (
                  <div className="space-y-2.5">
                    <select
                      value={selectedBatchId}
                      onChange={(e) => setSelectedBatchId(e.target.value)}
                      className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground font-mono focus:ring-2 focus:ring-ring outline-none cursor-pointer"
                      disabled={
                        !isIncrement && activeBatchesWithStock.length === 0
                      }
                    >
                      <option value="">-- Seleccionar Lote --</option>
                      {(!isIncrement
                        ? activeBatchesWithStock
                        : productBatches
                      ).map((b) => (
                        <option key={b.id} value={String(b.id)}>
                          Lote #{b.lotNumber} · Saldo: {b.currentQuantity}{" "}
                          {unitLabel} · Ubicación:{" "}
                          {b.location?.name || "Almacén Central"} ·{" "}
                          {b.expirationDate
                            ? `Vence: ${new Date(
                                b.expirationDate
                              ).toLocaleDateString("es-VE")}`
                            : "Sin vencimiento"}
                        </option>
                      ))}
                    </select>

                    {activeBatch && (
                      <div className="p-3.5 bg-muted/40 border border-border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Boxes className="w-4 h-4 text-primary" />
                          <span className="font-mono font-bold text-foreground">
                            Lote #{activeBatch.lotNumber}
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">
                            Ubicación:{" "}
                            <strong className="text-foreground">
                              {activeBatch.location?.name || "Almacén Central"}
                            </strong>
                          </span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground font-mono flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {activeBatch.expirationDate
                              ? new Date(
                                  activeBatch.expirationDate
                                ).toLocaleDateString("es-VE")
                              : "No expira"}
                          </span>
                        </div>

                        <div className="font-mono text-xs">
                          <span className="text-muted-foreground">
                            Saldo del lote:
                          </span>{" "}
                          <strong className="text-primary font-bold">
                            {activeBatch.currentQuantity} {unitLabel}
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {/* Formulario: Crear Lote Nuevo */}
              {isIncrement && entryBatchMode === "NEW" && (
                <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-3.5 text-xs">
                  <div className="flex items-center gap-2 font-bold text-foreground border-b border-border pb-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>Datos del Nuevo Lote</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    <div>
                      <Label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        N° de Lote *
                      </Label>
                      <Input
                        type="text"
                        value={newLotNumber}
                        onChange={(e) =>
                          setNewLotNumber(e.target.value.toUpperCase())
                        }
                        placeholder="Ej: LOT-2026-001"
                        className="h-9 text-xs font-mono font-bold bg-background"
                        required
                      />
                    </div>

                    <div>
                      <Label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Fecha de Vencimiento
                      </Label>
                      <Input
                        type="date"
                        value={newExpirationDate}
                        onChange={(e) => setNewExpirationDate(e.target.value)}
                        className="h-9 text-xs font-mono bg-background"
                      />
                    </div>

                    <div>
                      <Label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Ubicación Física *
                      </Label>
                      <select
                        value={newLocationId}
                        onChange={(e) =>
                          setNewLocationId(Number(e.target.value))
                        }
                        className="w-full h-9 bg-background border border-input rounded-md px-2.5 text-xs text-foreground focus:ring-2 focus:ring-ring outline-none cursor-pointer"
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

                    <div>
                      <Label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Costo Unitario ($ USD)
                      </Label>
                      <Input
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
                        className="h-9 text-xs font-mono bg-background"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                        Causa de Ingreso / Origen del Lote *
                      </Label>
                      <select
                        value={newOrigin}
                        onChange={(e) => setNewOrigin(e.target.value)}
                        className="w-full h-9 bg-background border border-input rounded-md px-2.5 text-xs text-foreground font-semibold focus:ring-2 focus:ring-ring outline-none cursor-pointer"
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
            </Card>
          )}

          {/* ========================================================
              BLOQUE 4: CANTIDAD Y JUSTIFICACIÓN TÉCNICA
             ======================================================== */}
          {selectedProductDetail && !loadingProductDetail && (
            <Card className="border-border shadow-2xs p-5 space-y-4">
              <div className="border-b border-border pb-2.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>4. Cantidad y Justificación Técnica *</span>
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Ingrese la cantidad a afectar y el sustento formal para la
                  auditoría
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Cantidad a Ajustar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Cantidad a Operar *
                    </Label>
                    {numQuantity > 0 &&
                      (isIncrement
                        ? entryBatchMode === "NEW" || activeBatch
                        : activeBatch) && (
                        <span className="text-[11px] font-mono flex items-center gap-1 text-muted-foreground">
                          <span>Saldo:</span>
                          <span className="font-semibold text-foreground">
                            {isIncrement && entryBatchMode === "NEW"
                              ? 0
                              : currentLotStock}
                          </span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                          <span
                            className={cn(
                              "font-bold",
                              isIncrement
                                ? "text-emerald-600 dark:text-emerald-400"
                                : projectedStock === 0
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-primary"
                            )}
                          >
                            {projectedStock} {unitLabel}
                          </span>
                        </span>
                      )}
                  </div>

                  <div className="relative">
                    <Input
                      type="number"
                      min="0.01"
                      step="any"
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(
                          e.target.value === "" ? "" : Number(e.target.value)
                        )
                      }
                      placeholder="Ej: 10"
                      className="pr-14 text-xs font-mono font-bold bg-background h-10"
                      required
                      disabled={
                        !isIncrement && activeBatchesWithStock.length === 0
                      }
                    />
                    <span className="absolute inset-y-0 right-3 flex items-center text-[10px] font-semibold text-muted-foreground pointer-events-none">
                      {unitLabel}
                    </span>
                  </div>

                  {!isIncrement &&
                    activeBatch &&
                    numQuantity > currentLotStock && (
                      <p className="text-[11px] text-destructive font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        La cantidad supera el stock del lote ({currentLotStock}{" "}
                        {unitLabel})
                      </p>
                    )}
                </div>

                {/* Documento o N° Acta */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Documento / N° Acta (Opcional)
                  </Label>
                  <Input
                    type="text"
                    value={referenceDoc}
                    onChange={(e) => setReferenceDoc(e.target.value)}
                    placeholder="Ej: ACTA-MERMA-2026-04 o DONACION-OPS-01"
                    className="text-xs bg-background h-10"
                  />
                </div>
              </div>

              {/* Justificación Técnica */}
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  Motivo / Justificación Técnica *
                </Label>
                <Textarea
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    adjustmentType === "MERMA_ROTURA" ||
                    adjustmentType === "MERMA_VENCIMIENTO"
                      ? "Describa detalladamente el motivo de la merma o descarte (frasco roto, derrame, reactivo vencido, protocolo de disposición)..."
                      : "Describa la causa del ajuste físico, conteo o procedencia de la donación/sobrante..."
                  }
                  className="text-xs bg-background resize-none leading-relaxed"
                  required
                />
              </div>
            </Card>
          )}

          {/* ========================================================
              BOTONES DE ACCIÓN INFERIORES
             ======================================================== */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/inventory/adjustments")}
              disabled={submitting}
              className="cursor-pointer"
            >
              Cancelar y Volver
            </Button>

            <Button
              type="submit"
              disabled={
                Boolean(
                  submitting ||
                    !selectedProductId ||
                    (!isIncrement && activeBatchesWithStock.length === 0) ||
                    (!isIncrement &&
                      activeBatch &&
                      numQuantity > currentLotStock)
                )
              }
              className="gap-2 cursor-pointer font-bold shadow-2xs h-10 px-6"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting
                ? "Procesando operación..."
                : isIncrement
                  ? entryBatchMode === "NEW"
                    ? "Dar de Alta Lote e Ingresar Stock"
                    : "Confirmar Entrada por Ajuste"
                  : "Confirmar y Aplicar Baja de Stock"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function NewAdjustmentPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[70vh] flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
          <span className="text-xs text-muted-foreground font-medium">
            Cargando formulario de registro...
          </span>
        </div>
      }
    >
      <NewAdjustmentContent />
    </Suspense>
  );
}
