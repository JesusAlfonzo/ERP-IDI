"use client";

import React, { useState, useEffect, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PurchasingClientService } from "@/services/purchasing.service";
import { InventoryClientService } from "@/services/inventory.service";
import { CurrencyService } from "@/services/currency.service";
import {
  type CurrencyCode,
  CURRENCY_OPTIONS,
  getCurrencySymbol,
} from "@/utils/currency";
import type { Supplier, Currency } from "@/types/purchasing";
import type { Product, Category } from "@/types/inventory";
import { ProductPackagingSelector } from "@/components/purchasing/ProductPackagingSelector";
import { cn } from "@/lib/utils";
import {
  ShoppingCart,
  Plus,
  Trash2,
  Building2,
  Loader2,
  ArrowLeft,
  Receipt,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Calculator,
  DollarSign,
  Boxes,
  X,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/utils/toast";

interface FormRow {
  productId: number;
  unitId: number;
  quantityOrdered: number;
  unitPrice: number;
  isExempt: boolean;
}

const QUICK_CONDITIONS = [
  {
    word: "Contado",
    text: "Condición de pago: Contra entrega de factura fiscal y verificación física",
  },
  {
    word: "Crédito",
    text: "Condición de crédito comercial: Plazo pactado a 15-30 días continuos",
  },
  {
    word: "Anticipo",
    text: "Requiere anticipo financiero del 50% para activación del pedido",
  },
  {
    word: "Refrigerado",
    text: "Insumos biológicos o reactivos: Despacho estricto en cadena de frío (2-8°C)",
  },
  {
    word: "Urgente",
    text: "Prioridad operativa alta: Entrega inmediata en almacén central",
  },
];

export default function NewPurchaseOrderPage() {
  const router = useRouter();

  // Maestros
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Formulario
  const [supplierId, setSupplierId] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [currencyId, setCurrencyId] = useState<string>("");
  const [exchangeRate, setExchangeRate] = useState<number | "">(75.0);
  const [bcvRates, setBcvRates] = useState<{ USD: number; EUR: number; VED: number }>({
    USD: 75.0,
    EUR: 81.5,
    VED: 1.0,
  });
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("");
  const [items, setItems] = useState<FormRow[]>([
    { productId: 0, unitId: 0, quantityOrdered: 1, unitPrice: 0, isExempt: false },
  ]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    let ignore = false;
    void (async () => {
      try {
        const [sups, cats, prods, currs, rates] = await Promise.all([
          PurchasingClientService.getSuppliers().catch(() => []),
          InventoryClientService.getCategories().catch(() => []),
          InventoryClientService.getProducts().catch(() => []),
          PurchasingClientService.getCurrencies().catch(() => []),
          CurrencyService.getCurrentRates().catch(() => null),
        ]);

        if (!ignore) {
          setSuppliers(sups);
          setCategories(cats);
          setCatalogProducts(prods);
          setCurrencies(currs);

          const defaultCurr = currs.find((c) => c.code.toUpperCase() === "USD");
          if (defaultCurr) setCurrencyId(String(defaultCurr.id));

          if (rates) {
            const ratesObj = {
              USD: Number(rates.USD || rates.rates?.USD || 75.0),
              EUR: Number(rates.EUR || rates.rates?.EUR || 81.5),
              VED: 1.0,
            };
            setBcvRates(ratesObj);
            setExchangeRate(ratesObj.USD);
          }
        }
      } catch (err) {
        console.error("Error al cargar maestros para orden de compra", err);
        toast.error("Error al cargar datos maestros.");
      } finally {
        if (!ignore) setLoadingInitial(false);
      }
    })();

    const handleRateUpdated = () => {
      CurrencyService.getCurrentRates()
        .then((r) => {
          if (r) {
            const ratesObj = {
              USD: Number(r.USD || r.rates?.USD || 75.0),
              EUR: Number(r.EUR || r.rates?.EUR || 81.5),
              VED: 1.0,
            };
            setBcvRates(ratesObj);
            setExchangeRate((prev) => {
              if (currency === "USD") return ratesObj.USD;
              if (currency === "EUR") return ratesObj.EUR;
              if (currency === "VED") return 1.0;
              return prev || ratesObj.USD;
            });
          }
        })
        .catch(console.error);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("idi:exchange-rate-updated", handleRateUpdated);
    }

    return () => {
      ignore = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("idi:exchange-rate-updated", handleRateUpdated);
      }
    };
  }, [currency]);

  const handleCurrencyChange = (c: CurrencyCode) => {
    setCurrency(c);
    const matchedCurr = currencies.find(
      (cur) => cur.code.toUpperCase() === c.toUpperCase()
    );
    setCurrencyId(matchedCurr ? String(matchedCurr.id) : "");

    if (c === "USD") {
      setExchangeRate(bcvRates.USD);
    } else if (c === "EUR") {
      setExchangeRate(bcvRates.EUR);
    } else if (c === "VED") {
      setExchangeRate(1.0);
    }
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { productId: 0, unitId: 0, quantityOrdered: 1, unitPrice: 0, isExempt: false },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index: number, pId: number, unitId: number) => {
    const selectedProd = catalogProducts.find((p) => p.id === pId);
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        productId: pId,
        unitId,
        isExempt: selectedProd?.isTaxExempt ?? false,
      };
      return updated;
    });
  };

  const handleRowChange = <K extends keyof FormRow>(
    index: number,
    field: K,
    val: FormRow[K]
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: val };
      }
      return updated;
    });
  };

  const handleToggleAllExempt = (exempt: boolean) => {
    setItems((prev) => prev.map((row) => ({ ...row, isExempt: exempt })));
  };

  // Resumen fiscal SENIAT en vivo
  const fiscalSummary = useMemo(() => {
    let taxableAmount = 0;
    let exemptAmount = 0;

    for (const item of items) {
      const lineSubtotal =
        Math.round((Number(item.quantityOrdered) || 0) * (Number(item.unitPrice) || 0) * 100) / 100;
      if (item.isExempt) {
        exemptAmount += lineSubtotal;
      } else {
        taxableAmount += lineSubtotal;
      }
    }

    taxableAmount = Math.round(taxableAmount * 100) / 100;
    exemptAmount = Math.round(exemptAmount * 100) / 100;
    const iva16 = Math.round(taxableAmount * 0.16 * 100) / 100;
    const totalAmount = Math.round((taxableAmount + exemptAmount + iva16) * 100) / 100;
    const rate =
      Number(exchangeRate) || (currency === "EUR" ? bcvRates.EUR : bcvRates.USD) || 1.0;
    const totalBs =
      currency === "VED"
        ? totalAmount
        : Math.round(totalAmount * rate * 100) / 100;

    return {
      taxableAmount,
      exemptAmount,
      iva16,
      totalAmount,
      totalBs,
    };
  }, [items, exchangeRate, currency, bcvRates]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!supplierId || Number(supplierId) <= 0) {
      setFeedback({
        status: "error",
        message: "Debe seleccionar un proveedor registrado para generar la orden.",
      });
      toast.error("Debe seleccionar un proveedor obligatorio.");
      return;
    }

    const hasInvalidItem = items.some(
      (it) => !it.productId || it.quantityOrdered <= 0 || it.unitPrice <= 0
    );

    if (hasInvalidItem) {
      setFeedback({
        status: "error",
        message:
          "Complete insumo, cantidad y precio unitario mayor a 0 en cada línea.",
      });
      toast.error("Complete los insumos con cantidad y precio válidos.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await PurchasingClientService.createOrder({
        supplierId: Number(supplierId),
        currency,
        currencyId: currencyId ? Number(currencyId) : undefined,
        exchangeRate: Number(exchangeRate),
        notes: notes.trim() || null,
        items: items.map((it) => ({
          productId: Number(it.productId),
          unitId: Number(it.unitId),
          quantityOrdered: Number(it.quantityOrdered),
          unitPrice: Number(it.unitPrice),
          isExempt: Boolean(it.isExempt),
        })),
      });

      toast.success(
        `Orden de compra #${result.orderNumber || result.id} creada exitosamente.`
      );
      router.push(`/purchasing/orders/${result.id}`);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al registrar la orden de compra.";
      setFeedback({
        status: "error",
        message: msg,
      });
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const currentSymbol = getCurrencySymbol(currency);

  if (loadingInitial) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-medium">
          Cargando catálogos de proveedores e insumos...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ========================================================
          ENCABEZADO ESTANDARIZADO
         ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-start sm:items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => router.push("/purchasing/orders")}
            className="h-9 w-9 shrink-0 cursor-pointer"
            title="Volver a Órdenes de Compra"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-primary" />
              Nueva Orden de Compra
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Emisión de orden con cálculo fiscal SENIAT y asignación de proveedor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/purchasing/orders")}
            className="h-9 text-xs cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            form="order-form"
            type="submit"
            size="sm"
            disabled={submitting}
            className="h-9 text-xs font-bold gap-1.5 cursor-pointer shadow-2xs"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileCheck2 className="w-4 h-4" />
            )}
            <span>{submitting ? "Creando..." : "Crear Orden"}</span>
          </Button>
        </div>
      </div>

      {feedback && (
        <Alert
          variant={feedback.status === "success" ? "success" : "destructive"}
          className="animate-in fade-in duration-200"
        >
          {feedback.status === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <AlertTitle>
            {feedback.status === "success" ? "Operación Exitosa" : "Error"}
          </AlertTitle>
          <AlertDescription className="flex items-center justify-between text-xs">
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
          4 TARJETAS KPI DE CÁLCULO FISCAL EN TIEMPO REAL
         ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-border shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Base Gravable
            </span>
            <div className="text-2xl font-bold font-mono text-foreground">
              {currentSymbol} {fiscalSummary.taxableAmount.toFixed(2)}
            </div>
            <span className="text-[11px] text-muted-foreground block">
              Sujeto a IVA 16%
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 border-border shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Subtotal Exento
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {currentSymbol} {fiscalSummary.exemptAmount.toFixed(2)}
            </div>
            <span className="text-[11px] text-muted-foreground block">
              Exonerado de impuesto
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 border-border shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              IVA (16%)
            </span>
            <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {currentSymbol} {fiscalSummary.iva16.toFixed(2)}
            </div>
            <span className="text-[11px] text-muted-foreground block">
              Impuesto calculado
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 border-primary/30 bg-primary/5 shadow-2xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-primary uppercase tracking-wider block">
              Total ({currency})
            </span>
            <div className="text-2xl font-bold font-mono text-primary">
              {currentSymbol} {fiscalSummary.totalAmount.toFixed(2)}
            </div>
            <span className="text-[11px] text-muted-foreground font-mono block">
              {currency !== "VED"
                ? `Bs. ${fiscalSummary.totalBs.toLocaleString("es-VE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                : "Moneda nacional"}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </Card>
      </div>

      <form id="order-form" onSubmit={handleSubmit} className="space-y-6">
        {/* ========================================================
            SECCIÓN 1: PROVEEDOR Y FACTURACIÓN
           ======================================================== */}
        <Card className="p-5 border-border shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Building2 className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold text-foreground">
              1. Proveedor y Facturación
            </CardTitle>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                Proveedor *
              </Label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
                className="w-full h-9 bg-background border border-input rounded-lg px-3 py-1 text-xs text-foreground focus:ring-2 focus:ring-ring font-medium cursor-pointer"
              >
                <option value="">-- Seleccione un proveedor --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.rifOrId ? `(${s.rifOrId})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                Moneda *
              </Label>
              <select
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
                className="w-full h-9 bg-background border border-input rounded-lg px-3 py-1 text-xs text-foreground focus:ring-2 focus:ring-ring font-medium cursor-pointer"
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.symbol} {c.label} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                {currency === "VED"
                  ? "Tasa de Cambio (VED)"
                  : `Tasa BCV (${currency === "EUR" ? "Bs./EUR" : "Bs./USD"})`}
              </Label>
              <Input
                type="number"
                step="0.0001"
                min="0.0001"
                value={exchangeRate}
                disabled={currency === "VED"}
                onChange={(e) =>
                  setExchangeRate(e.target.value ? Number(e.target.value) : "")
                }
                className="font-mono font-bold text-xs h-9"
                placeholder="Tasa oficial BCV..."
                required
              />
              <span className="text-[10px] text-muted-foreground block font-mono">
                Oficial BCV: {bcvRates.USD.toFixed(2)} Bs./$ · {bcvRates.EUR.toFixed(2)} Bs./€
              </span>
            </div>
          </div>
        </Card>

        {/* ========================================================
            SECCIÓN 2: INSUMOS Y COSTOS
           ======================================================== */}
        <Card className="p-5 border-border shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-bold text-foreground">
                2. Insumos y Costos ({items.length})
              </CardTitle>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                id="filter-order-cat"
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="h-8 bg-background border border-input rounded-lg px-2.5 text-xs font-medium text-foreground focus:ring-2 focus:ring-ring cursor-pointer"
                title="Filtrar insumos por categoría"
              >
                <option value="">Todas las categorías</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="h-8 gap-1.5 text-xs text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar insumo</span>
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {items.map((row, idx) => {
              const selectedProd = catalogProducts.find((p) => p.id === row.productId);
              const activeUnit =
                row.unitId === selectedProd?.purchaseUnitId
                  ? selectedProd?.purchaseUnit?.abbreviation ||
                    selectedProd?.purchaseUnit?.name
                  : selectedProd?.baseUnit?.abbreviation ||
                    selectedProd?.baseUnit?.name ||
                    "";
              const lineTotal =
                Math.round(
                  Number(row.quantityOrdered || 0) * Number(row.unitPrice || 0) * 100
                ) / 100;

              return (
                <Card
                  key={idx}
                  className="p-4 bg-muted/20 border-border hover:border-border/80 transition-colors shadow-none"
                >
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-background border border-border text-xs font-mono font-bold text-muted-foreground shrink-0">
                      {idx + 1}
                    </div>

                    {/* Selector de Insumo y Empaque */}
                    <div className="flex-1 min-w-0">
                      <ProductPackagingSelector
                        products={catalogProducts}
                        selectedCategoryId={selectedCategoryFilter}
                        selectedProductId={row.productId}
                        selectedUnitId={row.unitId}
                        onChange={(pId, uId) => handleProductSelect(idx, pId, uId)}
                      />
                    </div>

                    {/* Cantidad */}
                    <div className="w-full sm:w-28 shrink-0">
                      <Label className="text-[11px] mb-1 block">
                        Cantidad {activeUnit ? `(${activeUnit})` : ""} *
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={row.quantityOrdered}
                        onChange={(e) =>
                          handleRowChange(
                            idx,
                            "quantityOrdered",
                            Math.max(1, Number(e.target.value))
                          )
                        }
                        className="font-mono font-bold text-xs h-9"
                        required
                      />
                    </div>

                    {/* Precio Unitario */}
                    <div className="w-full sm:w-28 shrink-0">
                      <Label className="text-[11px] mb-1 block">
                        Precio Unit. ({currentSymbol}) *
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={row.unitPrice || ""}
                        onChange={(e) =>
                          handleRowChange(
                            idx,
                            "unitPrice",
                            Math.max(0, Number(e.target.value))
                          )
                        }
                        className="font-mono text-xs font-bold h-9"
                        required
                      />
                    </div>

                    {/* Exento IVA */}
                    <div className="flex items-center gap-1.5 self-center sm:self-end sm:pb-2 shrink-0">
                      <Checkbox
                        id={`exempt-${idx}`}
                        checked={row.isExempt}
                        onCheckedChange={(checked) =>
                          handleRowChange(idx, "isExempt", Boolean(checked))
                        }
                      />
                      <Label
                        htmlFor={`exempt-${idx}`}
                        className="text-xs cursor-pointer font-medium text-muted-foreground whitespace-nowrap"
                      >
                        Exento
                      </Label>
                    </div>

                    {/* Subtotal */}
                    <div className="w-full sm:w-24 text-right shrink-0">
                      <Label className="text-[11px] mb-1 block text-muted-foreground">
                        Subtotal
                      </Label>
                      <span className="font-mono font-bold text-xs text-foreground block leading-9">
                        {currentSymbol} {lineTotal.toFixed(2)}
                      </span>
                    </div>

                    {/* Eliminar */}
                    <div className="sm:self-end sm:pb-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length === 1}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        title="Eliminar insumo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleToggleAllExempt(true)}
              className="text-[11px] h-7 cursor-pointer"
            >
              Marcar todo Exento
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleToggleAllExempt(false)}
              className="text-[11px] h-7 cursor-pointer"
            >
              Marcar todo Gravable (16%)
            </Button>
          </div>
        </Card>

        {/* ========================================================
            SECCIÓN 3: CONDICIONES Y OBSERVACIONES
           ======================================================== */}
        <Card className="p-5 border-border shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <FileCheck2 className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold text-foreground">
              3. Condiciones y Observaciones
            </CardTitle>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Label className="text-xs uppercase font-semibold">
                Condiciones Comerciales y Términos de Entrega (Opcional)
              </Label>
              <span className="text-[11px] text-muted-foreground">
                Selecciona etiquetas para agregar condiciones rápidas
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {QUICK_CONDITIONS.map((badge) => {
                const isSelected = notes
                  .toLowerCase()
                  .includes(badge.text.toLowerCase());
                return (
                  <button
                    key={badge.word}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setNotes((prev) =>
                          prev
                            .split("\n")
                            .filter(
                              (l) => !l.toLowerCase().includes(badge.text.toLowerCase())
                            )
                            .join("\n")
                            .trim()
                        );
                      } else {
                        setNotes((prev) =>
                          prev.trim()
                            ? `${prev.trim()}\n• ${badge.text}`
                            : `• ${badge.text}`
                        );
                      }
                    }}
                    className={cn(
                      "inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium border cursor-pointer transition-all",
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs font-semibold"
                        : "bg-muted/30 text-foreground border-border hover:bg-muted"
                    )}
                    title={badge.text}
                  >
                    {badge.word}
                  </button>
                );
              })}
            </div>

            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Especifique términos de entrega, condiciones de pago o instrucciones de despacho..."
              className="text-xs"
            />
          </div>
        </Card>

        {/* Barra Inferior de Acción */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/purchasing/orders")}
            className="cursor-pointer"
          >
            Volver al Listado
          </Button>

          <Button
            type="submit"
            disabled={submitting}
            className="gap-2 cursor-pointer shadow-xs px-6"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileCheck2 className="w-4 h-4" />
            )}
            {submitting ? "Creando Orden..." : "Crear Orden de Compra"}
          </Button>
        </div>
      </form>
    </div>
  );
}
