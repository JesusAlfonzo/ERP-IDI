"use client";

import React, { useState, useEffect, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { InventoryClientService } from "@/services/inventory.service";
import type { Category, Brand, Unit } from "@/types/inventory";
import {
  Package,
  Layers,
  FlaskConical,
  Scale,
  Barcode,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Thermometer,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert } from "@/components/ui/alert";
import { toast } from "@/utils/toast";

export default function NewProductPage() {
  const router = useRouter();

  // Maestros
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Formulario
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
  const [isTaxExempt, setIsTaxExempt] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    let ignore = false;
    void (async () => {
      try {
        const catalogs = await InventoryClientService.getCatalogs();
        if (!ignore) {
          setCategories(catalogs.categories || []);
          setBrands(catalogs.brands || []);
          setUnits(catalogs.units || []);
        }
      } catch (err) {
        console.error("Error al cargar maestros del catálogo", err);
        toast.error("Error al cargar categorías y unidades de medida.");
      } finally {
        if (!ignore) setLoadingInitial(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  const selectedBaseUnit = units.find((u) => String(u.id) === String(baseUnitId));
  const selectedPurchaseUnit = units.find((u) => String(u.id) === String(purchaseUnitId));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!name.trim() || !categoryId || !baseUnitId) {
      setFeedback({
        status: "error",
        message: "Nombre del insumo, categoría y unidad base de consumo son obligatorios.",
      });
      toast.error("Complete los campos requeridos.");
      return;
    }

    if (purchaseUnitId && String(purchaseUnitId) === String(baseUnitId)) {
      setFeedback({
        status: "error",
        message:
          "La unidad de empaque de compra debe ser diferente a la unidad base de consumo (o seleccionar '-- Misma que la base --').",
      });
      toast.error("Unidades de empaque y base deben ser distintas si se especifica conversión.");
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

      toast.success(`Insumo "${name.trim()}" registrado correctamente en el catálogo.`);
      router.push("/inventory/products");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al registrar el producto.";
      setFeedback({
        status: "error",
        message: msg,
      });
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-medium">
          Cargando categorías, marcas y unidades de medida...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Cabecera y Navegación */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => router.push("/inventory/products")}
            className="cursor-pointer"
            title="Regresar al Catálogo"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="indigo" className="text-xs font-semibold">
                Catálogo Institucional
              </Badge>
              <Badge variant="outline" className="border-border/60 bg-muted/20 text-xs text-muted-foreground">
                Nuevo Insumo Maestro
              </Badge>
              {isReagent && (
                <Badge variant="purple" className="text-xs gap-1">
                  <FlaskConical className="w-3 h-3" /> Reactivo Clínico
                </Badge>
              )}
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground mt-1">
              Registro de Insumo / Reactivo Clínico
            </h1>
            <p className="text-xs text-muted-foreground">
              Definición de ficha técnica maestra, factores de conversión y políticas de inventario
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/inventory/products")}
            className="text-xs cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            form="product-form"
            type="submit"
            size="sm"
            disabled={submitting}
            className="text-xs gap-1.5 cursor-pointer shadow-xs"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {submitting ? "Guardando..." : "Guardar Insumo"}
          </Button>
        </div>
      </div>

      {feedback && (
        <Alert variant={feedback.status === "success" ? "success" : "destructive"}>
          {feedback.status === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span className="text-xs font-medium ml-2">{feedback.message}</span>
        </Alert>
      )}

      <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
        {/* SECCIÓN 1: Identificación y Clasificación */}
        <Card className="p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Package className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold text-foreground">
              1. Identificación y Clasificación del Insumo
            </CardTitle>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs uppercase font-semibold">
                Nombre Completo del Insumo / Reactivo *
              </Label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Tubos al Vacío Tapa Roja 5ml con Activador de Coágulo..."
                className="text-xs font-medium"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                Categoría en Catálogo *
              </Label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-ring font-medium cursor-pointer"
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
              <Label className="text-xs uppercase font-semibold">
                Marca / Fabricante (Opcional)
              </Label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-ring font-medium cursor-pointer"
              >
                <option value="">-- Sin marca específica / Genérico --</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                Código de Barras / Referencia Fabricante
              </Label>
              <Input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Ej. 7701234567890..."
                className="font-mono text-xs"
              />
            </div>

            {/* Opciones Especiales: Reactivo y Exento */}
            <div className="space-y-3 pt-2 sm:pt-4">
              <div className="flex items-center gap-2 p-2.5 rounded-lg border border-purple-200/90 bg-purple-50/50">
                <Checkbox
                  id="isReagent-check"
                  checked={isReagent}
                  onCheckedChange={(checked) => setIsReagent(Boolean(checked))}
                />
                <div className="space-y-0.5">
                  <Label
                    htmlFor="isReagent-check"
                    className="text-xs font-bold text-purple-900 cursor-pointer flex items-center gap-1.5"
                  >
                    <FlaskConical className="w-3.5 h-3.5 text-purple-700" />
                    Es Reactivo Clínico / Laboratorio
                  </Label>
                  <span className="text-[10px] text-purple-700 block">
                    Activa auditoría estricta de fecha de caducidad y cadena de frío por lote
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/20">
                <Checkbox
                  id="isTaxExempt-check"
                  checked={isTaxExempt}
                  onCheckedChange={(checked) => setIsTaxExempt(Boolean(checked))}
                />
                <div className="space-y-0.5">
                  <Label
                    htmlFor="isTaxExempt-check"
                    className="text-xs font-bold text-foreground cursor-pointer flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Exento de IVA (SENIAT Medicina/Salud)
                  </Label>
                  <span className="text-[10px] text-muted-foreground block">
                    Aplica tasa 0% de IVA en presupuestos y órdenes de compra
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* SECCIÓN 2: Unidades de Medida y Factor de Empaque */}
        <Card className="p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Scale className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold text-foreground">
              2. Unidades de Medida y Empaques de Conversión
            </CardTitle>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                Unidad Base de Consumo *
              </Label>
              <select
                required
                value={baseUnitId}
                onChange={(e) => setBaseUnitId(e.target.value)}
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-ring font-medium cursor-pointer"
              >
                <option value="">-- Seleccionar unidad base --</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.abbreviation})
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-muted-foreground block">
                Unidad mínima de laboratorio o despacho físico
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                Empaque de Compra (Mayorista)
              </Label>
              <select
                value={purchaseUnitId}
                onChange={(e) => setPurchaseUnitId(e.target.value)}
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-ring font-medium cursor-pointer"
              >
                <option value="">-- Misma que la unidad base (1:1) --</option>
                {units
                  .filter((u) => String(u.id) !== String(baseUnitId))
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.abbreviation})
                    </option>
                  ))}
              </select>
              <span className="text-[10px] text-muted-foreground block">
                Empaque comercial provisto por proveedores
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                Factor de Conversión
              </Label>
              <Input
                type="number"
                min="1"
                disabled={!purchaseUnitId}
                value={conversionFactor}
                onChange={(e) =>
                  setConversionFactor(e.target.value ? Number(e.target.value) : "")
                }
                className="font-mono text-xs"
              />
              <span className="text-[10px] text-muted-foreground block">
                Unidades base contenidas en cada empaque
              </span>
            </div>
          </div>

          {/* Tarjeta de Resumen de Conversión */}
          {selectedPurchaseUnit && selectedBaseUnit && Number(conversionFactor || 1) > 1 && (
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/90 rounded-xl flex items-center justify-between text-xs">
              <span className="font-semibold text-indigo-900">
                Regla de Conversión Automática:
              </span>
              <span className="font-mono font-bold text-indigo-800 text-sm">
                1 {selectedPurchaseUnit.name} = {Number(conversionFactor)}{" "}
                {selectedBaseUnit.name} ({selectedBaseUnit.abbreviation})
              </span>
            </div>
          )}
        </Card>

        {/* SECCIÓN 3: Políticas de Stock y Descripción */}
        <Card className="p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <CardTitle className="text-sm font-bold text-foreground">
              3. Parámetros de Seguridad y Stock Mínimo
            </CardTitle>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                Alerta de Stock Mínimo Crítico (Unidades Base) *
              </Label>
              <Input
                type="number"
                min="0"
                required
                value={minStockAlert}
                onChange={(e) =>
                  setMinStockAlert(e.target.value ? Number(e.target.value) : "")
                }
                className="font-mono text-xs font-bold"
              />
              <span className="text-[10px] text-muted-foreground block">
                Cuando las existencias totales sean menores o iguales a este número, se emitirá alerta de reposición
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                Descripción Técnica / Conservación
              </Label>
              <Textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Instrucciones de almacenamiento, temperatura requerida (ej. 2°C a 8°C), reactividad..."
                className="text-xs"
              />
            </div>
          </div>
        </Card>

        {/* Barra Inferior de Acción */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/inventory/products")}
            className="cursor-pointer"
          >
            Regresar al Catálogo
          </Button>

          <Button
            type="submit"
            disabled={submitting}
            className="gap-2 cursor-pointer shadow-xs px-6"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? "Guardando Insumo..." : "Registrar Insumo en Catálogo"}
          </Button>
        </div>
      </form>
    </div>
  );
}
