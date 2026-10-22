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

import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

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

    if (purchaseUnitId && String(purchaseUnitId) === String(baseUnitId)) {
      setFeedback({
        status: "error",
        message: "La unidad de empaque de compra debe ser diferente a la unidad base de consumo (o seleccionar '-- Misma que la base --').",
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
        variant: "destructive" as const,
      };
    }
    if (totalStock <= minStockAlert) {
      return {
        label: "Bajo Stock",
        variant: "warning" as const,
      };
    }
    return {
      label: "Disponible",
      variant: "success" as const,
    };
  };

  const getBatchStatusVariant = (status: string): "success" | "warning" | "destructive" | "secondary" | "default" => {
    switch (status) {
      case "DISPONIBLE":
        return "success";
      case "EN_CUARENTENA":
      case "CUARENTENA":
        return "warning";
      case "DEFECTUOSO":
      case "RECHAZADO":
      case "VENCIDO":
        return "destructive";
      case "AGOTADO":
        return "secondary";
      default:
        return "default";
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            Catálogo Institucional de Insumos y Reactivos
          </h1>
          <p className="text-xs text-muted-foreground">
            Registro maestro de productos agrupados, stock físico total disponible y trazabilidad de lotes
          </p>
        </div>

        <Button
          onClick={() => {
            setIsModalOpen(true);
            setFeedback(null);
          }}
          className="gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Registrar Insumo
        </Button>
      </div>

      {/* Barra de Filtros */}
      <Card className="p-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por SKU o descripción..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 bg-background border border-input rounded-lg px-3 py-1 text-xs text-foreground focus:ring-2 focus:ring-ring focus:outline-none cursor-pointer"
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
              className="h-9 bg-background border border-input rounded-lg px-3 py-1 text-xs text-foreground focus:ring-2 focus:ring-ring focus:outline-none cursor-pointer"
            >
              <option value="ALL">Todos los tipos</option>
              <option value="REAGENT">Solo Reactivos</option>
              <option value="NON_REAGENT">Insumos Generales</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => loadData()}
            disabled={loading || isPending}
            title="Actualizar catálogo"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading || isPending ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </Card>

      {/* NIVEL 1: Tabla Principal (Una fila por producto único) */}
      <Card className="overflow-hidden shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="py-3 px-4 font-semibold">SKU</TableHead>
              <TableHead className="py-3 px-4 font-semibold">Nombre / Descripción</TableHead>
              <TableHead className="py-3 px-4 font-semibold">Categoría</TableHead>
              <TableHead className="py-3 px-4 text-center font-semibold">Unidad Base</TableHead>
              <TableHead className="py-3 px-4 text-right font-semibold">Stock Físico Total</TableHead>
              <TableHead className="py-3 px-4 text-center font-semibold">Estado</TableHead>
              <TableHead className="py-3 px-4 text-center font-semibold">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                  Cargando catálogo maestro de insumos...
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                  No se encontraron insumos registrados en el catálogo.
                </TableCell>
              </TableRow>
            ) : (
              products.map((p, index) => {
                const totalStock = Number(p.totalStock ?? 0);
                const minAlert = Number(p.minStockAlert ?? 0);
                const badge = getStockBadge(totalStock, minAlert);
                const unitAbbr = p.baseUnit?.abbreviation || p.baseUnit?.name || "UND";
                const batchesCount = p.batches?.length ?? 0;

                return (
                  <TableRow
                    key={`${p.id}-${index}`}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    {/* SKU */}
                    <TableCell className="py-3 px-4 font-mono font-bold text-foreground whitespace-nowrap">
                      {p.sku || `#${p.id}`}
                    </TableCell>

                    {/* Nombre y Detalles */}
                    <TableCell className="py-3 px-4 max-w-xs sm:max-w-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          {p.name}
                        </span>
                        {p.isReagent && (
                          <Badge variant="purple" className="gap-1 shrink-0">
                            <FlaskConical className="w-2.5 h-2.5" />
                            Reactivo
                          </Badge>
                        )}
                      </div>
                      {p.description && (
                        <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {p.description}
                        </div>
                      )}
                    </TableCell>

                    {/* Categoría */}
                    <TableCell className="py-3 px-4 text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Layers className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                        {p.category?.name || "Sin categoría"}
                      </span>
                    </TableCell>

                    {/* Unidad Base */}
                    <TableCell className="py-3 px-4 text-center font-semibold text-foreground">
                      {unitAbbr}
                    </TableCell>

                    {/* Stock Físico Total */}
                    <TableCell className="py-3 px-4 text-right font-mono font-bold text-foreground">
                      {totalStock}{" "}
                      <span className="text-[10px] font-normal text-muted-foreground font-sans">
                        {unitAbbr}
                      </span>
                    </TableCell>

                    {/* Badge de Estado: Agotado, Bajo Stock, Disponible */}
                    <TableCell className="py-3 px-4 text-center">
                      <Badge variant={badge.variant}>
                        {badge.label}
                      </Badge>
                    </TableCell>

                    {/* Acciones */}
                    <TableCell className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDetail(p)}
                          className="h-7 text-xs font-semibold gap-1.5 bg-blue-50/60 hover:bg-blue-100 text-blue-700 border-blue-200"
                          title="Ver Ficha y Lotes del Insumo"
                        >
                          <Boxes className="w-3.5 h-3.5" />
                          <span>Ver Ficha ({batchesCount})</span>
                        </Button>

                        <Button
                          asChild
                          variant="ghost"
                          size="icon-sm"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Ir a página técnica del insumo"
                        >
                          <Link href={`/inventory/products/${p.id}`}>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* NIVEL 2: Ficha Detallada / Lotes (Drawer Slide-over) */}
      {isDetailOpen && selectedProductForDetail && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-3xl bg-background border-l border-border h-full shadow-2xl flex flex-col overflow-y-auto animate-in slide-in-from-right duration-200">
            {/* Header del Drawer */}
            <div className="p-5 border-b border-border bg-muted/30 flex items-start justify-between gap-4 sticky top-0 z-10 backdrop-blur-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    {selectedProductForDetail.sku || `#${selectedProductForDetail.id}`}
                  </span>
                  {selectedProductForDetail.isReagent ? (
                    <Badge variant="purple" className="gap-1">
                      <FlaskConical className="w-3 h-3" /> Reactivo Clínico
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      Insumo General
                    </Badge>
                  )}
                </div>
                <h2 className="text-lg font-bold text-foreground leading-tight">
                  {selectedProductForDetail.name}
                </h2>
                <p className="text-xs text-muted-foreground">
                  Ficha maestra del insumo y auditoría de existencias físicas por lote
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                >
                  <Link href={`/inventory/products/${selectedProductForDetail.id}`}>
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Página Completa</span>
                  </Link>
                </Button>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setIsDetailOpen(false)}
                  title="Cerrar ficha"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Contenido del Drawer */}
            <div className="p-6 space-y-6 flex-1">
              {/* Tarjetas de Métricas Rápidas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="p-3 shadow-2xs">
                  <span className="text-[11px] text-muted-foreground font-medium block">
                    Stock Físico Total
                  </span>
                  <span className="text-xl font-bold font-mono text-foreground">
                    {Number(selectedProductForDetail.totalStock ?? 0)}{" "}
                    <span className="text-xs font-sans text-muted-foreground font-normal">
                      {selectedProductForDetail.baseUnit?.abbreviation}
                    </span>
                  </span>
                </Card>

                <Card className="p-3 shadow-2xs">
                  <span className="text-[11px] text-muted-foreground font-medium block">
                    Estado Actual
                  </span>
                  <div className="mt-1">
                    {(() => {
                      const total = Number(selectedProductForDetail.totalStock ?? 0);
                      const minAlert = Number(selectedProductForDetail.minStockAlert ?? 0);
                      const b = getStockBadge(total, minAlert);
                      return (
                        <Badge variant={b.variant}>
                          {b.label}
                        </Badge>
                      );
                    })()}
                  </div>
                </Card>

                <Card className="p-3 shadow-2xs">
                  <span className="text-[11px] text-muted-foreground font-medium block">
                    Alerta Stock Mínimo
                  </span>
                  <span className="text-xl font-bold font-mono text-foreground">
                    {selectedProductForDetail.minStockAlert}{" "}
                    <span className="text-xs font-sans text-muted-foreground font-normal">
                      {selectedProductForDetail.baseUnit?.abbreviation}
                    </span>
                  </span>
                </Card>

                <Card className="p-3 shadow-2xs">
                  <span className="text-[11px] text-muted-foreground font-medium block">
                    Lotes Físicos
                  </span>
                  <span className="text-xl font-bold font-mono text-primary">
                    {selectedProductForDetail.batches?.length ?? 0}
                  </span>
                </Card>
              </div>

              {/* Ficha Maestra: Parámetros Técnicos */}
              <Card className="p-4 space-y-3 shadow-2xs">
                <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  Parámetros Maestros del Insumo
                </CardTitle>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">Categoría:</span>
                    <span className="font-semibold text-foreground">
                      {selectedProductForDetail.category?.name || "Sin categoría"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">Marca Comercial:</span>
                    <span className="font-semibold text-foreground">
                      {selectedProductForDetail.brand?.name || "Genérico"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">Unidad de medida (consumo):</span>
                    <span className="font-semibold text-foreground">
                      {selectedProductForDetail.baseUnit?.name} (
                      {selectedProductForDetail.baseUnit?.abbreviation})
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">Empaque / Unidad de Compra:</span>
                    <span className="font-semibold text-foreground">
                      {selectedProductForDetail.purchaseUnit &&
                      (selectedProductForDetail.purchaseUnitId || selectedProductForDetail.purchaseUnit?.id) !== (selectedProductForDetail.baseUnitId || selectedProductForDetail.baseUnit?.id)
                        ? `${selectedProductForDetail.purchaseUnit.name} (${selectedProductForDetail.purchaseUnit.abbreviation})`
                        : "Sin empaque (Misma que consumo)"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">Relación de Conversión:</span>
                    <span className="font-mono font-semibold text-primary">
                      {selectedProductForDetail.purchaseUnit &&
                      (selectedProductForDetail.purchaseUnitId || selectedProductForDetail.purchaseUnit?.id) !== (selectedProductForDetail.baseUnitId || selectedProductForDetail.baseUnit?.id) &&
                      Number(selectedProductForDetail.conversionFactor || 1) > 1
                        ? `1 ${selectedProductForDetail.purchaseUnit.name} = ${Number(selectedProductForDetail.conversionFactor)} ${selectedProductForDetail.baseUnit?.name || selectedProductForDetail.baseUnit?.abbreviation}`
                        : `1:1 (Directo por ${selectedProductForDetail.baseUnit?.name || selectedProductForDetail.baseUnit?.abbreviation || "UND"})`}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-border">
                    <span className="text-muted-foreground">Código de Barras / Ref:</span>
                    <span className="font-mono text-foreground">
                      {selectedProductForDetail.barcode || "No asignado"}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-border sm:col-span-2">
                    <span className="text-muted-foreground">Régimen Fiscal:</span>
                    <span className="font-semibold text-foreground">
                      {selectedProductForDetail.isTaxExempt
                        ? "Exento de IVA"
                        : "Gravable con IVA"}
                    </span>
                  </div>

                  {selectedProductForDetail.description && (
                    <div className="sm:col-span-2 pt-2">
                      <span className="text-muted-foreground block mb-1">Descripción:</span>
                      <p className="p-2.5 bg-muted/40 rounded-lg text-foreground leading-relaxed border border-border">
                        {selectedProductForDetail.description}
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Sub-tabla: Lotes Físicos */}
              <Card className="overflow-hidden shadow-2xs">
                <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-primary" />
                    <CardTitle className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Lotes Físicos en Existencia
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="font-mono text-[11px]">
                    {selectedProductForDetail.batches?.length ?? 0} lote(s)
                  </Badge>
                </div>

                {!selectedProductForDetail.batches ||
                selectedProductForDetail.batches.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground space-y-2">
                    <Boxes className="w-8 h-8 mx-auto stroke-[1.5] text-muted-foreground/60" />
                    <p className="text-xs font-medium">
                      No hay lotes físicos registrados para este insumo.
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Los lotes se crean automáticamente al recibir órdenes de compra o registrar ingresos.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="py-2.5 px-3 font-semibold">N° de Lote</TableHead>
                        <TableHead className="py-2.5 px-3 font-semibold">Vencimiento</TableHead>
                        <TableHead className="py-2.5 px-3 font-semibold">Ubicación Física</TableHead>
                        <TableHead className="py-2.5 px-3 text-center font-semibold">Estado</TableHead>
                        <TableHead className="py-2.5 px-3 text-right font-semibold">Cantidad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedProductForDetail.batches.map((batch: StockBatch, index: number) => {
                        const variant = getBatchStatusVariant(batch.status);
                        return (
                          <TableRow
                            key={`${batch.id ?? 'batch'}-${index}`}
                            className="hover:bg-muted/40 transition-colors"
                          >
                            {/* N° Lote */}
                            <TableCell className="py-2.5 px-3 font-mono font-bold text-foreground">
                              {batch.lotNumber}
                            </TableCell>

                            {/* Vencimiento */}
                            <TableCell className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-muted-foreground/70" />
                                {formatExpirationDate(batch.expirationDate)}
                              </span>
                            </TableCell>

                            {/* Ubicación Física */}
                            <TableCell className="py-2.5 px-3 text-foreground">
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-muted-foreground/70 shrink-0" />
                                <span>{batch.location?.name || "Sin asignar"}</span>
                                {batch.location?.type && (
                                  <span className="text-[10px] text-muted-foreground">
                                    ({batch.location.type})
                                  </span>
                                )}
                              </span>
                            </TableCell>

                            {/* Estado */}
                            <TableCell className="py-2.5 px-3 text-center whitespace-nowrap">
                              <Badge variant={variant}>
                                {batch.status}
                              </Badge>
                            </TableCell>

                            {/* Cantidad */}
                            <TableCell className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                              {Number(batch.currentQuantity)}{" "}
                              <span className="text-[10px] font-normal text-muted-foreground font-sans">
                                {selectedProductForDetail.baseUnit?.abbreviation}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </div>

            {/* Footer del Drawer */}
            <div className="p-4 border-t border-border bg-muted/20 flex justify-end">
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsDetailOpen(false)}
              >
                Cerrar Ficha
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar Producto con shadcn Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Registrar Nuevo Insumo / Reactivo
            </DialogTitle>
          </DialogHeader>

          {feedback && (
            <Alert variant={feedback.status === "success" ? "success" : "destructive"}>
              {feedback.status === "success" ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <AlertTitle>{feedback.status === "success" ? "Operación Exitosa" : "Error"}</AlertTitle>
              <AlertDescription>{feedback.message}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleCreateProduct} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider">
                Nombre del producto / reactivo *
              </Label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Agar MacConkey / Tubos Vacutainer EDTA 4ml"
                className="text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider">
                  Categoría *
                </Label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-9 bg-background border border-input rounded-lg px-3 py-1 text-xs text-foreground focus:ring-2 focus:ring-ring focus:outline-none cursor-pointer"
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

              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider">
                  Marca Comercial (Opcional)
                </Label>
                <select
                  value={brandId}
                  onChange={(e) => setBrandId(e.target.value)}
                  className="w-full h-9 bg-background border border-input rounded-lg px-3 py-1 text-xs text-foreground focus:ring-2 focus:ring-ring focus:outline-none cursor-pointer"
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
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider">
                  Unidad de medida (consumo) *
                </Label>
                <select
                  value={baseUnitId}
                  onChange={(e) => setBaseUnitId(e.target.value)}
                  className="w-full h-9 bg-background border border-input rounded-lg px-3 py-1 text-xs text-foreground focus:ring-2 focus:ring-ring focus:outline-none cursor-pointer"
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

              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider">
                  Unidad orden de compra
                </Label>
                <select
                  value={purchaseUnitId}
                  onChange={(e) => setPurchaseUnitId(e.target.value)}
                  className="w-full h-9 bg-background border border-input rounded-lg px-3 py-1 text-xs text-foreground focus:ring-2 focus:ring-ring focus:outline-none cursor-pointer"
                >
                  <option value="">-- Misma que la base --</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.abbreviation})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider">
                  Cantidad de conversión de compra
                </Label>
                <Input
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
                  className="text-xs"
                />
              </div>
            </div>

            {/* Vista previa explicativa de la conversión */}
            {baseUnitId && (
              <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-xs">
                <span className="font-semibold text-foreground block mb-0.5">
                  💡 Factor de Empaque y Conversión:
                </span>
                {purchaseUnitId && purchaseUnitId !== baseUnitId && Number(conversionFactor || 1) > 1 ? (
                  <p className="text-muted-foreground">
                    1{" "}
                    <strong className="text-foreground">
                      {units.find((u) => String(u.id) === String(purchaseUnitId))?.name || "Empaque"}
                    </strong>{" "}
                    contiene{" "}
                    <strong className="text-primary font-mono text-sm">
                      {conversionFactor}
                    </strong>{" "}
                    <strong className="text-foreground">
                      {units.find((u) => String(u.id) === String(baseUnitId))?.name || "Unidades"}
                    </strong>
                    . Al recibir órdenes de compra, el inventario registrará automáticamente esa cantidad en unidades base.
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    Se compra y se dispensa directamente en{" "}
                    <strong className="text-foreground">
                      {units.find((u) => String(u.id) === String(baseUnitId))?.name || "Unidades"}
                    </strong>{" "}
                    (relación 1 a 1 sin empaque secundario).
                  </p>
                )}
                {purchaseUnitId && purchaseUnitId === baseUnitId && (
                  <p className="text-destructive font-semibold mt-1">
                    ⚠️ La unidad de empaque no puede ser la misma unidad base. Si no usa empaque secundario, elija &quot;-- Misma que la base --&quot;.
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider">
                  Código de Barras / Referencia
                </Label>
                <div className="relative">
                  <Barcode className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="EAN-13 / Referencia fabricante"
                    className="pl-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider">
                  Alerta de Stock Mínimo
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={minStockAlert}
                  onChange={(e) =>
                    setMinStockAlert(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  className="text-xs"
                />
              </div>
            </div>

            <Card className="p-3 bg-muted/30 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <FlaskConical className="w-4 h-4 text-purple-600" />
                  ¿Es un reactivo de laboratorio / bioanálisis?
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Habilita trazabilidad analítica por lote, fecha de caducidad
                  y descargo en sala
                </div>
              </div>
              <Checkbox
                checked={isReagent}
                onCheckedChange={(checked) => setIsReagent(!!checked)}
              />
            </Card>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider">
                Descripción o Especificación Técnica
              </Label>
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalles sobre presentación, conservación o uso analítico..."
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? "Guardando..." : "Guardar Insumo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
