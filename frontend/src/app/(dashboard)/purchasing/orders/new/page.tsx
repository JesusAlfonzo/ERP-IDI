"use client";

import React, { useState, useEffect, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import {
  ShoppingCart,
  Plus,
  Trash2,
  Building2,
  Loader2,
  ArrowLeft,
  Coins,
  Receipt,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
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

interface FormRow {
  productId: number;
  unitId: number;
  quantityOrdered: number;
  unitPrice: number;
  isExempt: boolean;
}

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
  const [reviewedBy, setReviewedBy] = useState("");
  const [authorizedBy, setAuthorizedBy] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
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
    const rate = Number(exchangeRate) || (currency === "EUR" ? bcvRates.EUR : bcvRates.USD) || 1.0;
    const totalBs =
      currency === "VED"
        ? totalAmount
        : Math.round(totalAmount * rate * 100) / 100;

    const totalUsd =
      currency === "USD"
        ? totalAmount
        : currency === "VED"
          ? (rate > 0 ? Math.round((totalAmount / rate) * 100) / 100 : totalAmount)
          : (bcvRates.USD > 0 ? Math.round(((totalAmount * rate) / bcvRates.USD) * 100) / 100 : totalAmount);

    return {
      taxableAmount,
      exemptAmount,
      iva16,
      totalAmount,
      totalBs,
      totalUsd,
    };
  }, [items, exchangeRate, currency, bcvRates]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!supplierId || Number(supplierId) <= 0) {
      setFeedback({
        status: "error",
        message: "Debe seleccionar un proveedor registrado para generar la orden de compra.",
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
          "Asegúrese de seleccionar producto, cantidad y costo unitario válido en cada renglón.",
      });
      toast.error("Complete los renglones con cantidad y precio válidos.");
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
        `Orden de compra #${result.orderNumber || result.id} generada exitosamente.`
      );
      router.push("/purchasing/orders");
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
          Cargando datos maestros de proveedores y productos...
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
            onClick={() => router.push("/purchasing/orders")}
            className="cursor-pointer"
            title="Regresar a Órdenes"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="indigo" className="text-xs font-semibold">
                Orden de Compra
              </Badge>
              <Badge variant="outline" className="border-border/60 bg-muted/20 text-xs text-muted-foreground">
                Compromiso Comercial
              </Badge>
              <Badge variant="success" className="text-xs font-mono font-bold">
                Total: {currentSymbol} {fiscalSummary.totalAmount.toFixed(2)}
              </Badge>
              {exchangeRate && (
                <Badge variant="purple" className="text-xs font-mono">
                  Tasa: {Number(exchangeRate).toFixed(2)} Bs./{currency === "EUR" ? "€" : "$"}
                </Badge>
              )}
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground mt-1">
              Nueva Orden de Compra Institucional
            </h1>
            <p className="text-xs text-muted-foreground">
              Emisión de orden de adquisición con soporte fiscal SENIAT y asignación de proveedor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/purchasing/orders")}
            className="text-xs cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            form="order-form"
            type="submit"
            size="sm"
            disabled={submitting}
            className="text-xs gap-1.5 cursor-pointer shadow-xs"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {submitting ? "Generando..." : "Crear Orden de Compra"}
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

      <form id="order-form" onSubmit={handleSubmit} className="space-y-6">
        {/* SECCIÓN 1: Parámetros Comerciales y Moneda */}
        <Card className="p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Building2 className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold text-foreground">
              1. Proveedor y Parámetros Comerciales
            </CardTitle>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold flex items-center gap-1">
                Proveedor Comercial <span className="text-rose-500 font-bold">*</span>
              </Label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-ring font-medium cursor-pointer"
              >
                <option value="">-- Seleccione Proveedor Obligatorio --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.rifOrId ? `(${s.rifOrId})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                Moneda de Transacción *
              </Label>
              <select
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-ring font-medium cursor-pointer"
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
                Tasa de Cambio Oficial ({currency === "EUR" ? "Bs./EUR" : currency === "VED" ? "VED" : "Bs./USD"})
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
                className="font-mono text-xs"
                placeholder="Tasa oficial BCV..."
                required
              />
              <span className="text-[10px] text-muted-foreground block font-mono">
                Oficial BCV: {bcvRates.USD.toFixed(2)} Bs./$ · {bcvRates.EUR.toFixed(2)} Bs./€
              </span>
            </div>
          </div>
        </Card>

        {/* SECCIÓN 2: Insumos, Cantidades y Precios Unitarios */}
        <Card className="p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-bold text-foreground">
                2. Insumos y Costos Unitarios ({items.length})
              </CardTitle>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <Label
                  htmlFor="filter-order-cat"
                  className="text-xs font-medium text-muted-foreground whitespace-nowrap"
                >
                  Filtrar categoría:
                </Label>
                <select
                  id="filter-order-cat"
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="h-8 bg-background border border-input rounded-lg px-2.5 text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring transition-colors cursor-pointer"
                >
                  <option value="">Todas las categorías</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="gap-1.5 text-xs text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar renglón
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {items.map((row, idx) => {
              const selectedProd = catalogProducts.find((p) => p.id === row.productId);
              const activeUnit =
                row.unitId === selectedProd?.purchaseUnitId
                  ? selectedProd?.purchaseUnit?.abbreviation || selectedProd?.purchaseUnit?.name
                  : selectedProd?.baseUnit?.abbreviation || selectedProd?.baseUnit?.name || "";
              const hasConversion =
                selectedProd?.conversionFactor &&
                Number(selectedProd.conversionFactor) > 1 &&
                row.unitId === selectedProd?.purchaseUnitId;
              const baseQty = hasConversion
                ? Math.round(Number(row.quantityOrdered || 0) * Number(selectedProd.conversionFactor) * 100) / 100
                : null;
              const lineTotal =
                Math.round(Number(row.quantityOrdered || 0) * Number(row.unitPrice || 0) * 100) / 100;

              return (
                <Card
                  key={idx}
                  className="p-4 bg-muted/20 border-border hover:border-border/80 transition-colors"
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

                    {/* Cantidad Ordenada */}
                    <div className="w-full sm:w-28 shrink-0">
                      <Label className="text-[11px] mb-1 block">
                        Cant. {activeUnit ? `(${activeUnit})` : ""} *
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
                        className="font-mono font-bold text-xs"
                        required
                      />
                      {hasConversion && baseQty !== null && (
                        <span className="text-[10px] text-primary font-medium block mt-0.5 truncate">
                          ≈ {baseQty} {selectedProd?.baseUnit?.abbreviation || "UND"}
                        </span>
                      )}
                    </div>

                    {/* Costo Unitario */}
                    <div className="w-full sm:w-28 shrink-0">
                      <Label className="text-[11px] mb-1 block">
                        Costo Unit. ({currentSymbol}) *
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
                        className="font-mono text-xs font-bold"
                        required
                      />
                    </div>

                    {/* Exento IVA */}
                    <div className="flex items-center gap-1.5 self-center sm:self-auto pt-2 sm:pt-0 shrink-0">
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
                        Exento IVA
                      </Label>
                    </div>

                    {/* Subtotal de Línea */}
                    <div className="w-full sm:w-24 text-right shrink-0">
                      <Label className="text-[11px] mb-1 block text-muted-foreground">
                        Subtotal
                      </Label>
                      <span className="font-mono font-bold text-xs text-foreground block">
                        {currentSymbol} {lineTotal.toFixed(2)}
                      </span>
                    </div>

                    {/* Eliminar renglón */}
                    <div className="sm:self-end mb-0.5 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length === 1}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        title="Eliminar renglón"
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
              className="text-xs cursor-pointer"
            >
              Marcar todos Exentos
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleToggleAllExempt(false)}
              className="text-xs cursor-pointer"
            >
              Aplicar IVA 16% general
            </Button>
          </div>
        </Card>

        {/* SECCIÓN 3: Liquidación Fiscal SENIAT en Vivo */}
        <Card className="p-5 shadow-2xs space-y-3 bg-muted/10 border-border">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <CardTitle className="text-sm font-bold text-foreground">
              3. Liquidación Fiscal SENIAT y Cómputo Total
            </CardTitle>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 bg-background rounded-lg border border-border">
              <span className="text-[11px] text-muted-foreground block font-medium">
                Base Imponible (Gravable)
              </span>
              <span className="text-base font-bold font-mono text-foreground">
                {currentSymbol} {fiscalSummary.taxableAmount.toFixed(2)}
              </span>
            </div>

            <div className="p-3 bg-background rounded-lg border border-border">
              <span className="text-[11px] text-muted-foreground block font-medium">
                Monto Exento de IVA
              </span>
              <span className="text-base font-bold font-mono text-foreground">
                {currentSymbol} {fiscalSummary.exemptAmount.toFixed(2)}
              </span>
            </div>

            <div className="p-3 bg-background rounded-lg border border-border">
              <span className="text-[11px] text-muted-foreground block font-medium">
                IVA Estimado (16%)
              </span>
              <span className="text-base font-bold font-mono text-foreground">
                {currentSymbol} {fiscalSummary.iva16.toFixed(2)}
              </span>
            </div>

            <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
              <span className="text-[11px] text-emerald-800 dark:text-emerald-300 block font-bold">
                Total Orden ({currency})
              </span>
              <span className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400">
                {currentSymbol} {fiscalSummary.totalAmount.toFixed(2)} {currency}
              </span>
              {currency !== "VED" && (
                <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
                  ≈ Bs. {fiscalSummary.totalBs.toLocaleString("es-VE", { minimumFractionDigits: 2 })}
                </span>
              )}
              {currency !== "USD" && (
                <span className="text-[10px] text-muted-foreground font-mono block">
                  ≈ $ {fiscalSummary.totalUsd.toLocaleString("es-VE", { minimumFractionDigits: 2 })} USD
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* SECCIÓN 4: Condiciones Comerciales y Badges Rápidos */}
        <Card className="p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <FileCheck2 className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold text-foreground">
              4. Términos de Pago y Observaciones
            </CardTitle>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase font-semibold">
                Condiciones Comerciales y Términos de Entrega
              </Label>
              <span className="text-[11px] text-muted-foreground">
                (Haz clic para asociar condiciones rápidas)
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-0.5">
              {[
                { word: "Contado", text: "Condición de pago: Contra entrega de factura fiscal y verificación física", theme: "bg-emerald-50 text-emerald-700 border-emerald-200/90 hover:bg-emerald-100/90" },
                { word: "Crédito", text: "Condición de crédito comercial: Plazo pactado a 15-30 días continuos", theme: "bg-amber-50 text-amber-700 border-amber-200/90 hover:bg-amber-100/90" },
                { word: "Anticipo", text: "Requiere anticipo financiero del 50% para activación del pedido", theme: "bg-indigo-50 text-indigo-700 border-indigo-200/90 hover:bg-indigo-100/90" },
                { word: "Refrigerado", text: "Insumos biológicos o reactivos: Despacho estricto en cadena de frío (2-8°C)", theme: "bg-sky-50 text-sky-700 border-sky-200/90 hover:bg-sky-100/90" },
                { word: "Urgente", text: "Prioridad operativa alta: Entrega inmediata en almacén central", theme: "bg-rose-50 text-rose-700 border-rose-200/90 hover:bg-rose-100/90" },
              ].map((badge) => {
                const isSelected = notes.toLowerCase().includes(badge.text.toLowerCase());
                return (
                  <button
                    key={badge.word}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setNotes((prev) => prev.split("\n").filter((l) => !l.toLowerCase().includes(badge.text.toLowerCase())).join("\n").trim());
                      } else {
                        setNotes((prev) => prev.trim() ? `${prev.trim()}\n• ${badge.text}` : `• ${badge.text}`);
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border cursor-pointer transition-all ${
                      isSelected ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold" : badge.theme
                    }`}
                    title={badge.text}
                  >
                    <span className="font-bold">{badge.word}</span>
                  </button>
                );
              })}
            </div>

            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Especifique términos de entrega, cuenta bancaria para pago o acuerdos comerciales..."
              className="text-xs"
            />
          </div>

          <div className="pt-2 border-t border-border space-y-2">
            <Label className="text-xs uppercase font-semibold">
              Firmas de Autorización de la Orden de Compra
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Revisado por</Label>
                <Input
                  type="text"
                  value={reviewedBy}
                  onChange={(e) => setReviewedBy(e.target.value)}
                  placeholder="Ej. Lic. Ana Pérez"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Autorizado por</Label>
                <Input
                  type="text"
                  value={authorizedBy}
                  onChange={(e) => setAuthorizedBy(e.target.value)}
                  placeholder="Ej. Dr. Roberto Silva"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Aprobado por</Label>
                <Input
                  type="text"
                  value={approvedBy}
                  onChange={(e) => setApprovedBy(e.target.value)}
                  placeholder="Ej. Dra. Carmen Díaz"
                  className="text-xs"
                />
              </div>
            </div>
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
            Regresar al Listado
          </Button>

          <Button
            type="submit"
            disabled={submitting}
            className="gap-2 cursor-pointer shadow-xs px-6"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? "Generando Orden..." : "Generar Orden de Compra"}
          </Button>
        </div>
      </form>
    </div>
  );
}
