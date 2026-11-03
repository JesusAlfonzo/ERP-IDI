"use client";

import React, { useState, useEffect, useMemo, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
  ShieldAlert,
  Save,
} from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
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

export default function EditPurchaseOrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

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
          PurchasingClientService.getSuppliers().catch(() => []),
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
            const ratesObj = {
              USD: Number(rates.USD || rates.rates?.USD || 75.0),
              EUR: Number(rates.EUR || rates.rates?.EUR || 81.5),
              VED: 1.0,
            };
            setBcvRates(ratesObj);
          }

          // Cargar datos de la orden en el formulario
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
          "Asegúrese de seleccionar producto, cantidad y costo unitario válido en cada renglón.",
      });
      toast.error("Complete los renglones con cantidad y precio válidos.");
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
      <div className="p-8 text-center space-y-4 max-w-md mx-auto">
        <Card className="p-6 space-y-4">
          <CardContent className="space-y-4 p-0">
            <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto" />
            <h2 className="text-base font-bold text-foreground">
              Orden de compra no encontrada
            </h2>
            <Button
              type="button"
              size="sm"
              onClick={() => router.push("/purchasing/orders")}
              className="gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Volver al listado
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Si la orden ya no está en BORRADOR, no se permite editar
  if (order.status !== "BORRADOR") {
    return (
      <div className="p-8 text-center space-y-4 max-w-lg mx-auto">
        <Card className="p-6 space-y-4 border-amber-300 bg-amber-50/40 dark:bg-amber-950/20">
          <CardContent className="space-y-3 p-0">
            <ShieldAlert className="w-10 h-10 text-amber-600 mx-auto" />
            <h2 className="text-base font-bold text-foreground">
              Orden #{order.orderNumber} Bloqueada para Edición
            </h2>
            <p className="text-xs text-muted-foreground">
              Esta orden se encuentra en estado <strong>{order.status}</strong>. Solo las órdenes en estado <strong>Borrador</strong> pueden modificarse. Una vez enviada al proveedor o recibida mercancía, los precios y términos quedan formalizados.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push(`/purchasing/orders/${orderId}`)}
                className="gap-2 cursor-pointer text-xs"
              >
                <ArrowLeft className="w-4 h-4" /> Ver Detalle de la Orden
              </Button>
            </div>
          </CardContent>
        </Card>
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
            onClick={() => router.push(`/purchasing/orders/${orderId}`)}
            className="cursor-pointer"
            title="Regresar a Detalle"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="indigo" className="text-xs font-mono font-bold">
                {order.orderNumber || `#${orderId}`}
              </Badge>
              <Badge variant="secondary" className="text-xs font-bold">
                Borrador (Editable)
              </Badge>
              <Badge variant="success" className="text-xs font-mono font-bold">
                Total: {currentSymbol} {fiscalSummary.totalAmount.toFixed(2)}
              </Badge>
              {exchangeRate && (
                <Badge variant="purple" className="text-xs font-mono">
                  Tasa: Bs. {Number(exchangeRate).toFixed(2)}
                </Badge>
              )}
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground mt-1">
              Modificar Orden de Compra (Borrador)
            </h1>
            <p className="text-xs text-muted-foreground">
              Ajuste proveedor, moneda, renglones y precios antes de marcarla como enviada al proveedor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push(`/purchasing/orders/${orderId}`)}
            className="text-xs cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            form="order-edit-form"
            type="submit"
            size="sm"
            disabled={submitting}
            className="text-xs gap-1.5 cursor-pointer shadow-xs bg-primary text-primary-foreground"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {submitting ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </div>

      {feedback && (
        <Alert
          variant={feedback.status === "success" ? "default" : "destructive"}
          className={feedback.status === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-900" : ""}
        >
          {feedback.status === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}

      <form id="order-edit-form" onSubmit={handleSubmit} className="space-y-6">
        {/* SECCIÓN 1: Proveedor, Moneda y Tasa */}
        <Card className="p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Building2 className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold text-foreground">
              1. Proveedor y Condiciones Comerciales
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
                  htmlFor="filter-order-cat-edit"
                  className="text-xs text-muted-foreground whitespace-nowrap"
                >
                  Filtrar categoría:
                </Label>
                <select
                  id="filter-order-cat-edit"
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="bg-background border border-input rounded-md px-2 py-1 text-xs text-foreground focus:ring-2 focus:ring-ring cursor-pointer"
                >
                  <option value="">Todas las categorías</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 border-l border-border pl-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleAllExempt(true)}
                  className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Marcar todos Exentos
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleAllExempt(false)}
                  className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Todos Gravables (16%)
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {items.map((row, idx) => {
              const lineSubtotal =
                Math.round(
                  (Number(row.quantityOrdered) || 0) * (Number(row.unitPrice) || 0) * 100
                ) / 100;
              const lineTax = row.isExempt
                ? 0
                : Math.round(lineSubtotal * 0.16 * 100) / 100;
              const lineTotal = Math.round((lineSubtotal + lineTax) * 100) / 100;

              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-border/80 bg-background/50 hover:bg-muted/10 transition-colors space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-mono font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      Renglón #{idx + 1}
                    </span>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={items.length === 1}
                      className="text-muted-foreground hover:text-rose-600 h-7 w-7 cursor-pointer"
                      title="Eliminar este renglón"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-6 space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Producto / Insumo *
                      </Label>
                      <ProductPackagingSelector
                        products={catalogProducts}
                        selectedProductId={row.productId}
                        selectedUnitId={row.unitId}
                        selectedCategoryId={selectedCategoryFilter ? Number(selectedCategoryFilter) : undefined}
                        onChange={(pId: number, uId: number) => handleProductSelect(idx, pId, uId)}
                        disabled={submitting}
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Cantidad *
                      </Label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={row.quantityOrdered || ""}
                        onChange={(e) =>
                          handleRowChange(idx, "quantityOrdered", Number(e.target.value))
                        }
                        className="text-xs font-mono"
                        required
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Costo Unit. ({currentSymbol}) *
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.0001"
                        value={row.unitPrice || ""}
                        onChange={(e) =>
                          handleRowChange(idx, "unitPrice", Number(e.target.value))
                        }
                        className="text-xs font-mono"
                        required
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1 pb-1">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`exempt-${idx}`}
                          checked={row.isExempt}
                          onCheckedChange={(checked) =>
                            handleRowChange(idx, "isExempt", Boolean(checked))
                          }
                        />
                        <label
                          htmlFor={`exempt-${idx}`}
                          className="text-xs text-muted-foreground cursor-pointer font-medium"
                        >
                          Exento IVA (E)
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-border/40 flex justify-end gap-4 text-xs font-mono text-muted-foreground">
                    <span>
                      Subtotal:{" "}
                      <strong className="text-foreground">
                        {currentSymbol} {lineSubtotal.toFixed(2)}
                      </strong>
                    </span>
                    <span>
                      IVA (16%):{" "}
                      <strong className="text-foreground">
                        {currentSymbol} {lineTax.toFixed(2)}
                      </strong>
                    </span>
                    <span>
                      Total Renglón:{" "}
                      <strong className="text-foreground font-bold">
                        {currentSymbol} {lineTotal.toFixed(2)}
                      </strong>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddItem}
            className="w-full py-4 text-xs border-dashed gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar otro renglón a la orden
          </Button>
        </Card>

        {/* SECCIÓN 3: Desglose Fiscal SENIAT & Observaciones */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="sm:col-span-2 space-y-4">
            <Card className="p-5 shadow-2xs space-y-2">
              <Label className="text-xs uppercase font-semibold">
                Observaciones y Justificación de Compra
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Indique justificación de adquisición, términos de entrega, requerimientos especiales..."
                className="text-xs resize-none h-28"
              />
            </Card>
          </div>

          {/* Liquidación Fiscal SENIAT */}
          <div className="space-y-4">
            <Card className="p-5 shadow-2xs bg-muted/20 border-primary/20 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-border">
                <Receipt className="w-4 h-4 text-primary" />
                <CardTitle className="text-xs uppercase font-bold text-foreground">
                  Liquidación Fiscal SENIAT
                </CardTitle>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between text-muted-foreground">
                  <span>Base Imponible (G 16%):</span>
                  <span>{currentSymbol} {fiscalSummary.taxableAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Monto Exento (E):</span>
                  <span>{currentSymbol} {fiscalSummary.exemptAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Impuesto IVA (16%):</span>
                  <span>{currentSymbol} {fiscalSummary.iva16.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-border flex justify-between text-sm font-bold text-foreground">
                  <span>TOTAL PACTADO:</span>
                  <span>{currentSymbol} {fiscalSummary.totalAmount.toFixed(2)} {currency}</span>
                </div>

                {currency !== "VED" && (
                  <div className="pt-2 border-t border-border/60 flex justify-between text-xs text-muted-foreground">
                    <span>Equivalente en Bolívares:</span>
                    <span className="font-bold text-foreground font-mono">
                      Bs. {fiscalSummary.totalBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {currency !== "USD" && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Equivalente en Dólares:</span>
                    <span className="font-bold text-foreground font-mono">
                      $ {fiscalSummary.totalUsd.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                    </span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
