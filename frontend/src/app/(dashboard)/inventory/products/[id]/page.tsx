"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProductService, ProductDetail } from "@/services/product.service";
import { CurrencyService, CurrencyItem } from "@/services/currency.service";
import { InventoryClientService } from "@/services/inventory.service";
import { toast } from "@/utils/toast";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Package,
  ArrowLeft,
  Calendar,
  AlertTriangle,
  Boxes,
  Thermometer,
  Barcode,
  Layers,
  Loader2,
  Pencil,
  AlertCircle,
} from "lucide-react";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [currencies, setCurrencies] = useState<CurrencyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  // Estados para Edición del Insumo
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [brands, setBrands] = useState<Array<{ id: number; name: string }>>([]);
  const [units, setUnits] = useState<Array<{ id: number; name: string; abbreviation: string }>>([]);

  const [editName, setEditName] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editBrandId, setEditBrandId] = useState("");
  const [editBaseUnitId, setEditBaseUnitId] = useState("");
  const [editPurchaseUnitId, setEditPurchaseUnitId] = useState("");
  const [editConversionFactor, setEditConversionFactor] = useState<number | "">(1);
  const [editBarcode, setEditBarcode] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editMinStockAlert, setEditMinStockAlert] = useState<number | "">(5);
  const [editIsReagent, setEditIsReagent] = useState(false);
  const [editIsTaxExempt, setEditIsTaxExempt] = useState(false);

  useEffect(() => {
    if (!productId) return;

    startTransition(() => {
      void (async () => {
        try {
          const [pData, cData] = await Promise.all([
            ProductService.getProductById(productId),
            CurrencyService.getCurrencies(),
          ]);
          setProduct(pData);
          setCurrencies(cData);
        } catch (err) {
          console.error("Error cargando detalle del producto", err);
        } finally {
          setLoading(false);
        }
      })();
    });
  }, [productId]);

  const handleOpenEdit = async () => {
    if (!product) return;

    // Poblar estados del formulario con los datos actuales
    setEditName(product.name);
    setEditCategoryId(String(product.category?.id || product.categoryId || ""));
    setEditBrandId(String(product.brand?.id || product.brandId || ""));
    setEditBaseUnitId(String(product.baseUnit?.id || product.baseUnitId || ""));
    setEditPurchaseUnitId(String(product.purchaseUnit?.id || product.purchaseUnitId || ""));
    setEditConversionFactor(Number(product.conversionFactor) || 1);
    setEditBarcode(product.barcode || "");
    setEditDescription(product.description || "");
    setEditMinStockAlert(product.minStockAlert ?? 5);
    setEditIsReagent(Boolean(product.isReagent));
    setEditIsTaxExempt(Boolean(product.isTaxExempt));

    setIsEditDialogOpen(true);

    // Cargar catálogos auxiliares si no se han cargado
    if (categories.length === 0 || units.length === 0) {
      try {
        const catData = await InventoryClientService.getCatalogs();
        setCategories(catData.categories || []);
        setBrands(catData.brands || []);
        setUnits(catData.units || []);
      } catch (err) {
        console.error("Error cargando catálogos para edición:", err);
      }
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    if (!editName.trim()) {
      toast.error("El nombre del insumo es obligatorio.");
      return;
    }
    if (!editCategoryId) {
      toast.error("Debe seleccionar una categoría.");
      return;
    }
    if (!editBaseUnitId) {
      toast.error("Debe seleccionar la unidad de medida base (consumo).");
      return;
    }

    // Validación de empaque vs unidad base
    if (editPurchaseUnitId && String(editPurchaseUnitId) === String(editBaseUnitId)) {
      toast.error("La unidad de empaque / compra no puede ser idéntica a la unidad base de consumo. Si no utiliza empaque secundario, seleccione '-- Misma que la base --'.");
      return;
    }

    if (editPurchaseUnitId && Number(editConversionFactor || 1) <= 1) {
      toast.error("Para un empaque secundario de compra, el factor de conversión debe ser mayor a 1 (indica cuántas unidades base vienen en cada empaque).");
      return;
    }

    setSavingEdit(true);
    try {
      const updated = await ProductService.updateProduct(product.id, {
        name: editName.trim(),
        categoryId: Number(editCategoryId),
        brandId: editBrandId ? Number(editBrandId) : null,
        baseUnitId: Number(editBaseUnitId),
        purchaseUnitId: editPurchaseUnitId ? Number(editPurchaseUnitId) : null,
        conversionFactor: editPurchaseUnitId ? Number(editConversionFactor) || 1 : 1,
        barcode: editBarcode.trim() || null,
        description: editDescription.trim() || null,
        minStockAlert: editMinStockAlert === "" ? 0 : Number(editMinStockAlert),
        isReagent: editIsReagent,
        isTaxExempt: editIsTaxExempt,
      });

      // Recargar datos actualizados
      setProduct(updated);
      setIsEditDialogOpen(false);
      toast.success("Parámetros y empaque del insumo actualizados con éxito.");
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Error al actualizar insumo";
      toast.error(msg);
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
        <span className="text-xs text-muted-foreground font-medium">
          Cargando ficha técnica del insumo...
        </span>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="p-8 text-center space-y-4 max-w-md mx-auto">
        <Card className="shadow-xs p-6 space-y-4">
          <CardContent className="space-y-4 p-0">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Package className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Producto no encontrado
            </h2>
            <Button
              onClick={() => router.push("/inventory/products")}
              size="sm"
              className="gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Volver al Catálogo
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Cálculos financieros y de empaque
  const vesItem = currencies.find((c) => c.code === "VES");
  const vesRate = vesItem?.latestRate ? Number(vesItem.latestRate) : 0;

  const totalUnits = Number(product.totalStock ?? 0);
  const conversionFactor = Number(product.conversionFactor || 1);
  const hasDistinctPackage = Boolean(
    product.purchaseUnit &&
    product.purchaseUnit.id !== product.baseUnit?.id &&
    conversionFactor > 1
  );

  const totalPurchasePacks =
    hasDistinctPackage ? (totalUnits / conversionFactor).toFixed(2) : null;
  const isBelowMinStock = totalUnits <= product.minStockAlert;
  const batches =
    (product.stockBatches && product.stockBatches.length > 0
      ? product.stockBatches
      : product.batches) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DISPONIBLE":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "EN_CUARENTENA":
      case "CUARENTENA":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "DEFECTUOSO":
      case "RECHAZADO":
      case "VENCIDO":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "AGOTADO":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
    }
  };

  const selectedBaseUnitObj = units.find((u) => String(u.id) === String(editBaseUnitId));
  const selectedPurchaseUnitObj = units.find((u) => String(u.id) === String(editPurchaseUnitId));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Botón Volver y Cabecera */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.push("/inventory/products")}
            className="cursor-pointer"
            title="Regresar"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono text-xs font-bold bg-blue-50 text-blue-700 border-blue-200">
                {product.sku}
              </Badge>
              {product.isReagent && (
                <Badge variant="outline" className="gap-1 text-[11px] font-semibold bg-indigo-50 text-indigo-700 border-indigo-200">
                  <Thermometer className="w-3 h-3" /> Reactivo Clínico
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">
              {product.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenEdit}
            className="cursor-pointer shadow-xs gap-1.5"
          >
            <Pencil className="w-3.5 h-3.5 text-primary" />
            Editar Insumo & Conversión
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(`/inventory/adjustments?productId=${product.id}`)
            }
            className="cursor-pointer shadow-xs"
          >
            Ajustar Inventario
          </Button>
        </div>
      </div>

      {/* Grid Resumen Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-medium">
              Existencia Disponible
            </span>
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {totalUnits}{" "}
              <span className="text-xs font-sans text-muted-foreground font-normal">
                {product.baseUnit?.abbreviation || product.baseUnit?.name || "UND"}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground block">
              {hasDistinctPackage && totalPurchasePacks !== null
                ? `Equivale a ${totalPurchasePacks} ${product.purchaseUnit?.name}s`
                : "Unidades físicas directas en almacén"}
            </span>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-medium">
              Estado de Inventario
            </span>
            <div className="pt-1">
              {isBelowMinStock ? (
                <Badge variant="destructive" className="gap-1 text-xs font-bold">
                  <AlertTriangle className="w-3.5 h-3.5" /> Reponer Existencias
                </Badge>
              ) : (
                <Badge variant="success" className="gap-1 text-xs font-bold">
                  Stock Óptimo
                </Badge>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground block">
              Alerta mínima: {product.minStockAlert} {product.baseUnit?.abbreviation || "UND"}
            </span>
          </CardContent>
        </Card>

        {/* Card Factor de Conversión & Empaque */}
        <Card className="shadow-xs">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">
                Factor de Conversión & Empaque
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleOpenEdit}
                className="h-6 w-6 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Configurar empaque y unidades de conversión"
              >
                <Pencil className="w-3 h-3" />
              </Button>
            </div>
            <div className="text-sm font-semibold text-slate-800 pt-0.5">
              {hasDistinctPackage ? (
                <>
                  1 {product.purchaseUnit?.name} ={" "}
                  <span className="font-mono font-bold text-primary">
                    {conversionFactor}
                  </span>{" "}
                  {product.baseUnit?.name || product.baseUnit?.abbreviation}
                </>
              ) : (
                <span className="text-slate-700">
                  1:1 Directo por {product.baseUnit?.name || product.baseUnit?.abbreviation || "Unidad"}
                </span>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground block leading-tight">
              {hasDistinctPackage
                ? `1 empaque equivale exactamente a ${conversionFactor} unidades de consumo.`
                : "Sin empaque secundario: Compra y consumo directo en la misma unidad."}
            </span>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-xs text-muted-foreground font-medium">
              Lotes Activos Registrados
            </span>
            <div className="text-2xl font-bold text-slate-900 font-mono">
              {batches.length}
            </div>
            <span className="text-[11px] text-muted-foreground block">
              Custodia total en almacenes
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Detalle Técnico y Lotes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Parámetros Maestros */}
        <Card className="shadow-xs space-y-4 p-5 flex flex-col justify-between">
          <CardHeader className="p-0 pb-3 border-b border-border flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Parámetros Técnicos
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenEdit}
              className="h-7 text-xs gap-1 cursor-pointer"
            >
              <Pencil className="w-3 h-3 text-muted-foreground" />
              Editar
            </Button>
          </CardHeader>

          <CardContent className="p-0 space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Categoría:</span>
              <span className="font-semibold text-slate-800">
                {product.category?.name ?? "General"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Marca Comercial:</span>
              <span className="font-semibold text-slate-800">
                {product.brand?.name ?? "Genérico"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Unidad de Consumo (Base):</span>
              <span className="font-semibold text-slate-800 font-mono">
                {product.baseUnit?.name} ({product.baseUnit?.abbreviation})
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Empaque / Unidad de Compra:</span>
              <span className="font-semibold text-slate-800 font-mono">
                {hasDistinctPackage
                  ? `${product.purchaseUnit?.name} (${product.purchaseUnit?.abbreviation})`
                  : "Misma que consumo (Sin empaque)"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Relación de Conversión:</span>
              <span className="font-mono font-bold text-primary">
                {hasDistinctPackage
                  ? `1 ${product.purchaseUnit?.name} = ${conversionFactor} ${product.baseUnit?.name || product.baseUnit?.abbreviation}`
                  : `1 a 1 (${product.baseUnit?.abbreviation || "UND"})`}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border">
              <span className="text-muted-foreground">Código de Barras / Ref:</span>
              <span className="font-mono text-slate-800 flex items-center gap-1">
                <Barcode className="w-3.5 h-3.5 text-muted-foreground" />
                {product.barcode ?? "No asignado"}
              </span>
            </div>
            <div className="pt-2 flex justify-between">
              <span className="text-muted-foreground">Régimen Fiscal:</span>
              <span className="font-semibold text-slate-800">
                {product.isTaxExempt ? "Exento de IVA" : "Gravable con IVA"}
              </span>
            </div>
            <div className="pt-2">
              <span className="text-muted-foreground block mb-1">Descripción:</span>
              <p className="text-slate-700 leading-relaxed bg-muted/40 p-2.5 rounded-lg border border-border">
                {product.description || "Sin notas descriptivas adicionales."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Lotes del Producto */}
        <Card className="lg:col-span-2 shadow-xs overflow-hidden flex flex-col">
          <CardHeader className="p-4 border-b border-border bg-muted/20 flex flex-row justify-between items-center">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Boxes className="w-4 h-4 text-primary" />
                Lotes & Existencias Físicas
              </CardTitle>
              <CardDescription className="text-[11px] mt-0.5">
                Ubicación, costos y caducidad individual
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-0 flex-1 overflow-x-auto">
            {batches.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground space-y-2">
                <Boxes className="w-10 h-10 stroke-[1.5]" />
                <p className="text-xs">
                  No hay lotes ingresados para este insumo.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="py-2.5 px-3 font-semibold">Lote</TableHead>
                    <TableHead className="py-2.5 px-3 font-semibold">Ubicación</TableHead>
                    <TableHead className="py-2.5 px-3 text-right font-semibold">Cant. Actual</TableHead>
                    <TableHead className="py-2.5 px-3 text-right font-semibold">Costo ($ / Bs.)</TableHead>
                    <TableHead className="py-2.5 px-3 font-semibold">Vencimiento</TableHead>
                    <TableHead className="py-2.5 px-3 text-center font-semibold">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((batch, index) => {
                    const costUsd = Number(batch.unitCostUsd);
                    const costVes =
                      vesRate > 0 ? (costUsd * vesRate).toFixed(2) : null;

                    return (
                      <TableRow
                        key={`${batch.id}-${index}`}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <TableCell className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {batch.lotNumber}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-slate-600">
                          {batch.location?.name ?? "Almacén General"}
                          <span className="text-[10px] text-muted-foreground block">
                            {batch.location?.type ?? "DEPOSITO"}
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                          {Number(batch.currentQuantity)}{" "}
                          <span className="text-[10px] text-muted-foreground font-normal">
                            / {Number(batch.initialQuantity)}
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-right font-mono">
                          <span className="font-semibold text-slate-900">
                            ${costUsd.toFixed(2)}
                          </span>
                          {costVes && (
                            <span className="text-[10px] text-muted-foreground block font-normal">
                              {costVes} Bs.
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-2.5 px-3">
                          {batch.expirationDate ? (
                            <span className="flex items-center gap-1 font-mono text-slate-700">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              {new Date(
                                batch.expirationDate,
                              ).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground font-mono">
                              No expira
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-center">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${getStatusBadge(
                              batch.status,
                            )}`}
                          >
                            {batch.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal / Dialog de Edición del Insumo */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <Pencil className="w-5 h-5 text-primary" />
              Editar Insumo & Configuración de Empaque
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs uppercase tracking-wider">
                  Nombre del Insumo o Reactivo *
                </Label>
                <Input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-xs font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider">
                  Categoría *
                </Label>
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  className="w-full h-9 bg-background border border-input rounded-lg px-3 py-1 text-xs text-foreground focus:ring-2 focus:ring-ring focus:outline-none cursor-pointer"
                  required
                >
                  <option value="">-- Seleccione categoría --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider">
                  Marca Comercial
                </Label>
                <select
                  value={editBrandId}
                  onChange={(e) => setEditBrandId(e.target.value)}
                  className="w-full h-9 bg-background border border-input rounded-lg px-3 py-1 text-xs text-foreground focus:ring-2 focus:ring-ring focus:outline-none cursor-pointer"
                >
                  <option value="">-- Genérico / Sin marca --</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* SECCIÓN CRÍTICA: Unidades y Relación de Empaque */}
            <div className="border border-border/80 rounded-xl p-3.5 bg-muted/20 space-y-3">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-primary" />
                Unidades de Medida y Conversión de Empaque
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] uppercase tracking-wider">
                    Unidad Base (Consumo) *
                  </Label>
                  <select
                    value={editBaseUnitId}
                    onChange={(e) => setEditBaseUnitId(e.target.value)}
                    className="w-full h-9 bg-background border border-input rounded-lg px-3 py-1 text-xs text-foreground focus:ring-2 focus:ring-ring focus:outline-none cursor-pointer"
                    required
                  >
                    <option value="">-- Seleccionar unidad base --</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.abbreviation})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-muted-foreground block">
                    Unidad individual que se despacha.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] uppercase tracking-wider">
                    Unidad de Empaque (Compra)
                  </Label>
                  <select
                    value={editPurchaseUnitId}
                    onChange={(e) => setEditPurchaseUnitId(e.target.value)}
                    className="w-full h-9 bg-background border border-input rounded-lg px-3 py-1 text-xs text-foreground focus:ring-2 focus:ring-ring focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Misma que la base --</option>
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.abbreviation})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-muted-foreground block">
                    Caja, Paquete o Bulto de compra.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] uppercase tracking-wider">
                    Unidades por Empaque (Factor)
                  </Label>
                  <Input
                    type="number"
                    step="any"
                    min="1"
                    disabled={!editPurchaseUnitId || editPurchaseUnitId === editBaseUnitId}
                    value={editConversionFactor}
                    onChange={(e) =>
                      setEditConversionFactor(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    placeholder="Ej. 100"
                    className="text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground block">
                    ¿Cuántas unidades base trae la caja?
                  </span>
                </div>
              </div>

              {/* Vista previa explicativa de la conversión */}
              {editBaseUnitId && (
                <div className="p-2.5 rounded-lg bg-background border border-border text-xs">
                  <span className="font-semibold text-foreground block mb-0.5">
                    💡 Relación de Empaque Resultante:
                  </span>
                  {editPurchaseUnitId && editPurchaseUnitId !== editBaseUnitId ? (
                    <p className="text-muted-foreground">
                      1{" "}
                      <strong className="text-foreground">
                        {selectedPurchaseUnitObj?.name || "Empaque"}
                      </strong>{" "}
                      contiene{" "}
                      <strong className="text-primary font-mono text-sm">
                        {editConversionFactor || 1}
                      </strong>{" "}
                      <strong className="text-foreground">
                        {selectedBaseUnitObj?.name || "Unidades"}
                      </strong>
                      . Al recibir 1 {selectedPurchaseUnitObj?.name || "caja"} en compras, el inventario ingresará automáticamente {editConversionFactor || 1} {selectedBaseUnitObj?.name || "unidades"} físicas.
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      Compra y consumo directo en relación 1 a 1 por{" "}
                      <strong className="text-foreground">
                        {selectedBaseUnitObj?.name || "Unidades"}
                      </strong>{" "}
                      (sin empaque secundario).
                    </p>
                  )}
                  {editPurchaseUnitId && editPurchaseUnitId === editBaseUnitId && (
                    <p className="text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Atención: La unidad de empaque no puede ser la misma unidad base.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider">
                  Código de Barras / Referencia
                </Label>
                <Input
                  type="text"
                  value={editBarcode}
                  onChange={(e) => setEditBarcode(e.target.value)}
                  placeholder="Ej. 7591234567890"
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider">
                  Alerta de Stock Mínimo
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={editMinStockAlert}
                  onChange={(e) =>
                    setEditMinStockAlert(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
              <div>
                <span className="text-xs font-semibold block text-foreground">
                  ¿Es un Reactivo de Laboratorio Clínico?
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  Activa trazabilidad analítica por lote y fecha de vencimiento.
                </span>
              </div>
              <Checkbox
                checked={editIsReagent}
                onCheckedChange={(val) => setEditIsReagent(Boolean(val))}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider">
                Descripción / Notas Técnicas
              </Label>
              <Textarea
                rows={2}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Observaciones de empaque, conservación o temperatura..."
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={savingEdit}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={savingEdit}
                className="gap-2"
              >
                {savingEdit && <Loader2 className="w-4 h-4 animate-spin" />}
                {savingEdit ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
