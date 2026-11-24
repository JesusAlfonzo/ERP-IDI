"use client";

import React, { useState, useEffect, useMemo, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { PurchasingClientService } from "@/services/purchasing.service";
import { InventoryClientService } from "@/services/inventory.service";
import { CurrencyService } from "@/services/currency.service";
import {
  type CurrencyCode,
  CURRENCY_OPTIONS,
  getCurrencySymbol,
  normalizeCurrencyCode,
} from "@/utils/currency";
import type { Supplier, Currency, PurchaseOrder } from "@/types/purchasing";
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
  ShieldAlert,
  ShieldCheck,
  Calculator,
  DollarSign,
  Boxes,
  Save,
  X,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

export default function EditPurchaseOrderPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const orderId = Array.isArray(rawId) ? rawId[0] : (rawId as string);

  // Estado de carga y orden
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Maestros
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [bcvRates, setBcvRates] = useState<{ USD: number; EUR: number; VED: number }>({
    USD: 75.0,
    EUR: 81.5,
    VED: 1.0,
  });

  // Formulario
  const [supplierId, setSupplierId] = useState("");
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [currencyId, setCurrencyId] = useState<string>("");
  const [exchangeRate, setExchangeRate] = useState<number | "">(75.0);
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
    if (!orderId) return;
    let ignore = false;
    void (async () => {
      try {
        const [orderData, sups, cats, prods, currs, rates] = await Promise.all([
          PurchasingClientService.getOrderById(orderId),
          PurchasingClientService.getSuppliers({ type: "VENTAS" }).catch(() => []),
          InventoryClientService.getCategories().catch(() => []),
          InventoryClientService.getProducts().catch(() => []),
          PurchasingClientService.getCurrencies().catch(() => []),
          CurrencyService.getCurrentRates().catch(() => null),
        ]);

        if (!ignore) {
          setOrder(orderData);
          setSuppliers(sups);
          setCategories(cats);
          setCatalogProducts(prods);
          setCurrencies(currs);

          if (rates) {
            setBcvRates({
              USD: Number(rates.USD || rates.rates?.USD || 75.0),
              EUR: Number(rates.EUR || rates.rates?.EUR || 81.5),
              VED: 1.0,
            });
          }

          const supId = orderData.supplierId || orderData.supplier?.id;
          if (supId) setSupplierId(String(supId));

          const normCurr = normalizeCurrencyCode(orderData.currency) as CurrencyCode;
          setCurrency(normCurr || "USD");

          if (orderData.currencyId) {
            setCurrencyId(String(orderData.currencyId));
          } else {
            const matched = currs.find(
              (c) => c.code.toUpperCase() === (normCurr || "USD").toUpperCase()
            );
            if (matched) setCurrencyId(String(matched.id));
          }

          if (orderData.exchangeRate) {
            setExchangeRate(Number(orderData.exchangeRate));
          }

          if (orderData.notes) {
            setNotes(orderData.notes);
          }

          if (orderData.items && orderData.items.length > 0) {
            setItems(
              orderData.items.map((it) => ({
                productId: Number(it.productId),
                unitId: Number(it.unitId || it.unit?.id || 1),
                quantityOrdered: Number(it.quantityOrdered),
                unitPrice: Number(it.unitPrice),
                isExempt: Boolean(it.isExempt),
              }))
            );
          }
        }
      } catch (err) {
        console.error("Error al cargar orden de compra para edición", err);
        toast.error("Error al cargar datos de la orden.");
      } finally {
        if (!ignore) setLoadingInitial(false);
      }
    })();

    const handleRateUpdated = () => {
      CurrencyService.getCurrentRates()
        .then((rates) => {
          if (rates) {
            setBcvRates({
              USD: Number(rates.USD || rates.rates?.USD || 75.0),
              EUR: Number(rates.EUR || rates.rates?.EUR || 81.5),
              VED: 1.0,
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
  }, [orderId]);

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
        message: "Debe seleccionar un proveedor registrado para la orden de compra.",
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
      const result = await PurchasingClientService.updateOrder(orderId, {
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
        `Orden de compra #${result.orderNumber || orderId} actualizada exitosamente.`
      );
      router.push(`/purchasing/orders/${orderId}`);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al actualizar la orden de compra.";
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
          Cargando orden de compra para edición...
        </span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto py-12">
        <Card className="p-6 text-center space-y-4 border-border shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">
              Orden de compra no encontrada
            </h2>
            <p className="text-xs text-muted-foreground">
              No se encontró la orden solicitada para edición.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/purchasing/orders")}
            className="gap-1.5 text-xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Volver a Órdenes
          </Button>
        </Card>
      </div>
    );
  }

  if (order.status !== "BORRADOR") {
    return (
      <div className="max-w-lg mx-auto py-12">
        <Card className="p-6 text-center space-y-4 border-amber-500/30 shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">
              Orden #{order.orderNumber} bloqueada para edición
            </h2>
            <p className="text-xs text-muted-foreground">
              Solo las órdenes en estado <strong className="text-foreground">Borrador</strong> pueden modificarse. Estado actual:{" "}
              <strong className="text-foreground">{order.status}</strong>.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push(`/purchasing/orders/${orderId}`)}
              className="gap-1.5 cursor-pointer text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Ver Detalle
            </Button>
          </div>
        </Card>
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
            onClick={() => router.push(`/purchasing/orders/${orderId}`)}
            className="h-9 w-9 shrink-0 cursor-pointer"
            title="Volver al detalle"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-primary" />
                Editar Orden #{order.orderNumber || orderId}
              </h1>
              <Badge
                variant="secondary"
                className="text-xs bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
              >
                Borrador
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ajuste proveedor, moneda, insumos y precios antes de enviar la orden
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push(`/purchasing/orders/${orderId}`)}
            className="h-9 text-xs cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            form="order-edit-form"
            type="submit"
            size="sm"
            disabled={submitting}
            className="h-9 text-xs font-bold gap-1.5 cursor-pointer shadow-2xs"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{submitting ? "Guardando..." : "Guardar Cambios"}</span>
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

      <form id="order-edit-form" onSubmit={handleSubmit} className="space-y-6">
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
                id="filter-order-cat-edit"
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

                    <div className="flex-1 min-w-0">
                      <ProductPackagingSelector
                        products={catalogProducts}
                        selectedCategoryId={selectedCategoryFilter}
                        selectedProductId={row.productId}
                        selectedUnitId={row.unitId}
                        onChange={(pId, uId) => handleProductSelect(idx, pId, uId)}
                        disabled={submitting}
                      />
                    </div>

                    <div className="w-full sm:w-28 shrink-0">
                      <Label className="text-[11px] mb-1 block">
                        Cantidad {activeUnit ? `(${activeUnit})` : ""} *
                      </Label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={row.quantityOrdered || ""}
                        onChange={(e) =>
                          handleRowChange(idx, "quantityOrdered", Number(e.target.value))
                        }
                        className="font-mono font-bold text-xs h-9"
                        required
                      />
                    </div>

                    <div className="w-full sm:w-28 shrink-0">
                      <Label className="text-[11px] mb-1 block">
                        Precio Unit. ({currentSymbol}) *
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.0001"
                        value={row.unitPrice || ""}
                        onChange={(e) =>
                          handleRowChange(idx, "unitPrice", Number(e.target.value))
                        }
                        className="font-mono text-xs font-bold h-9"
                        required
                      />
                    </div>

                    <div className="flex items-center gap-1.5 self-center sm:self-end sm:pb-2 shrink-0">
                      <Checkbox
                        id={`exempt-edit-${idx}`}
                        checked={row.isExempt}
                        onCheckedChange={(checked) =>
                          handleRowChange(idx, "isExempt", Boolean(checked))
                        }
                      />
                      <Label
                        htmlFor={`exempt-edit-${idx}`}
                        className="text-xs cursor-pointer font-medium text-muted-foreground whitespace-nowrap"
                      >
                        Exento
                      </Label>
                    </div>

                    <div className="w-full sm:w-24 text-right shrink-0">
                      <Label className="text-[11px] mb-1 block text-muted-foreground">
                        Subtotal
                      </Label>
                      <span className="font-mono font-bold text-xs text-foreground block leading-9">
                        {currentSymbol} {lineTotal.toFixed(2)}
                      </span>
                    </div>

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
            onClick={() => router.push(`/purchasing/orders/${orderId}`)}
            className="cursor-pointer"
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            disabled={submitting}
            className="gap-2 cursor-pointer shadow-xs px-6"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {submitting ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}
