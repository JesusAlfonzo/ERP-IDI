"use client";

import { useState, useEffect, useCallback, useMemo, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PurchasingClientService } from "@/services/purchasing.service";
import { CurrencyService } from "@/services/currency.service";
import {
  type CurrencyCode,
  CURRENCY_OPTIONS,
  getCurrencySymbol,
} from "@/utils/currency";
import type {
  PurchaseRequisition,
  Supplier,
  Currency,
} from "@/types/purchasing";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Calculator,
  Building2,
  Boxes,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  DollarSign,
  Receipt,
  FileCheck2,
  AlertTriangle,
} from "lucide-react";

import { Card, CardTitle } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface ConversionRow {
  itemId?: number;
  productId: number;
  unitId: number;
  quantityOrdered: number;
  unitPrice: number;
  isExempt: boolean;
  productName: string;
  productSku?: string | null;
  unitLabel: string;
}

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message) return res.data.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export default function AdjudicateRequisitionPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const requisitionId = Array.isArray(rawId) ? rawId[0] : (rawId as string);

  const [requisition, setRequisition] = useState<PurchaseRequisition | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados del formulario de adjudicación
  const [supplierId, setSupplierId] = useState<string>("");
  const [currency, setCurrency] = useState<CurrencyCode>("USD");
  const [currencyId, setCurrencyId] = useState<string>("");
  const [exchangeRate, setExchangeRate] = useState<number>(75.0);
  const [bcvRates, setBcvRates] = useState<{ USD: number; EUR: number; VED: number }>({
    USD: 75.0,
    EUR: 81.5,
    VED: 1.0,
  });
  const [notes, setNotes] = useState("");
  const [conversionItems, setConversionItems] = useState<ConversionRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [feedback, setFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    if (!requisitionId) return;
    setLoading(true);
    try {
      const [req, sups, currs, rates] = await Promise.all([
        PurchasingClientService.getRequisitionById(requisitionId).catch(() => null),
        PurchasingClientService.getSuppliers({ type: "VENTAS" }).catch(() => []),
        PurchasingClientService.getCurrencies().catch(() => []),
        CurrencyService.getCurrentRates().catch(() => null),
      ]);

      setRequisition(req);
      setSuppliers(sups);
      setCurrencies(currs);

      const matchedUsd = currs.find((c) => c.code.toUpperCase() === "USD");
      if (matchedUsd) {
        setCurrencyId((prev) => prev || String(matchedUsd.id));
      }

      if (rates) {
        const ratesObj = {
          USD: Number(rates.USD || rates.rates?.USD || 75.0),
          EUR: Number(rates.EUR || rates.rates?.EUR || 81.5),
          VED: 1.0,
        };
        setBcvRates(ratesObj);
        setExchangeRate((prev) => (prev === 75.0 ? ratesObj.USD : prev));
      }

      if (req) {
        const rows: ConversionRow[] = (req.items || []).map((it) => {
          const prod = it.product;
          const unitLabel =
            it.unit?.abbreviation ||
            it.unit?.name ||
            prod?.baseUnit?.abbreviation ||
            "UND";

          return {
            itemId: it.id,
            productId: it.productId,
            unitId:
              it.unitId || it.unit?.id || prod?.purchaseUnitId || prod?.baseUnitId || 1,
            quantityOrdered: Number(it.quantityRequested),
            unitPrice: Number(it.estimatedPrice || 0),
            isExempt: Boolean(prod?.isTaxExempt ?? true),
            productName: prod?.name || "Insumo",
            productSku: prod?.sku,
            unitLabel,
          };
        });
        setConversionItems(rows);
      }
    } finally {
      setLoading(false);
    }
  }, [requisitionId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCurrencyChange = (c: CurrencyCode) => {
    setCurrency(c);
    const matchedCurr = currencies.find(
      (cur) => cur.code.toUpperCase() === c.toUpperCase()
    );
    setCurrencyId(matchedCurr ? String(matchedCurr.id) : "");

    if (c === "VED") {
      setExchangeRate(1.0);
    } else if (c === "EUR") {
      setExchangeRate(bcvRates.EUR);
    } else {
      setExchangeRate(bcvRates.USD);
    }
  };

  const handleToggleAllExempt = (exempt: boolean) => {
    setConversionItems((prev) => prev.map((r) => ({ ...r, isExempt: exempt })));
  };

  // Cálculos Fiscales SENIAT
  const fiscalSummary = useMemo(() => {
    let taxableAmount = 0;
    let exemptAmount = 0;

    conversionItems.forEach((r) => {
      const lineSubtotal = Math.round(r.quantityOrdered * r.unitPrice * 100) / 100;
      if (r.isExempt) {
        exemptAmount += lineSubtotal;
      } else {
        taxableAmount += lineSubtotal;
      }
    });

    taxableAmount = Math.round(taxableAmount * 100) / 100;
    exemptAmount = Math.round(exemptAmount * 100) / 100;

    const iva16 = Math.round(taxableAmount * 0.16 * 100) / 100;
    const totalAmount = Math.round((taxableAmount + exemptAmount + iva16) * 100) / 100;

    const rate =
      Number(exchangeRate) ||
      (currency === "EUR" ? bcvRates.EUR : bcvRates.USD) ||
      1;
    const totalBs =
      currency === "VED"
        ? totalAmount
        : Math.round(totalAmount * rate * 100) / 100;

    const totalUsd =
      currency === "USD"
        ? totalAmount
        : currency === "VED"
          ? rate > 0
            ? Math.round((totalAmount / rate) * 100) / 100
            : totalAmount
          : bcvRates.USD > 0
            ? Math.round(((totalAmount * rate) / bcvRates.USD) * 100) / 100
            : totalAmount;

    return {
      taxableAmount,
      exemptAmount,
      iva16,
      totalAmount,
      totalBs,
      totalUsd,
    };
  }, [conversionItems, exchangeRate, currency, bcvRates]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!requisition) return;

    if (!supplierId) {
      setFeedback({
        status: "error",
        message: "Debe seleccionar el proveedor adjudicado.",
      });
      return;
    }

    const hasZeroPrice = conversionItems.some((r) => r.unitPrice <= 0);
    if (hasZeroPrice) {
      setFeedback({
        status: "error",
        message: "Todos los renglones deben tener un precio unitario mayor a 0.",
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const order = await PurchasingClientService.convertToOrder(requisition.id, {
        supplierId: Number(supplierId),
        currency,
        currencyId: currencyId ? Number(currencyId) : undefined,
        exchangeRate: Number(exchangeRate),
        notes: notes.trim() || undefined,
        items: conversionItems.map((r) => ({
          itemId: r.itemId,
          productId: r.productId,
          unitId: r.unitId,
          quantityOrdered: r.quantityOrdered,
          unitPrice: r.unitPrice,
          isExempt: r.isExempt,
        })),
      });

      router.push(`/purchasing/orders/${order.id}`);
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message: getErrorMessage(err, "Error al adjudicar la preorden."),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const currencySymbol = getCurrencySymbol(currency);

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-medium">
          Cargando datos para adjudicación...
        </span>
      </div>
    );
  }

  if (!requisition) {
    return (
      <div className="max-w-md mx-auto py-12">
        <Card className="p-6 text-center space-y-4 border-border shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">
              Preorden no encontrada
            </h2>
            <p className="text-xs text-muted-foreground">
              No se encontró la preorden solicitada para adjudicación.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/purchasing/requisitions")}
            className="gap-1.5 text-xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver a Preórdenes
          </Button>
        </Card>
      </div>
    );
  }

  if (requisition.status !== "EN_COTIZACION") {
    return (
      <div className="max-w-lg mx-auto py-12">
        <Card className="p-6 text-center space-y-4 border-amber-500/30 shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">
              Preorden #{requisition.requisitionNumber} no disponible para adjudicar
            </h2>
            <p className="text-xs text-muted-foreground">
              Solo se pueden adjudicar preórdenes que se encuentren en estado{" "}
              <strong className="text-foreground">En Cotización</strong>. Estado actual:{" "}
              <strong className="text-foreground">{requisition.status}</strong>.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push(`/purchasing/requisitions/${requisition.id}`)}
              className="text-xs cursor-pointer"
            >
              Ver Detalle
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => router.push("/purchasing/requisitions")}
              className="text-xs cursor-pointer"
            >
              Volver a Preórdenes
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
            onClick={() => router.push("/purchasing/requisitions")}
            className="h-9 w-9 shrink-0 cursor-pointer"
            title="Volver a Preórdenes"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Calculator className="w-6 h-6 text-primary" />
                Adjudicar Preorden #{requisition.requisitionNumber}
              </h1>
              <Badge
                variant="warning"
                className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
              >
                En Cotización
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Selección de proveedor ganador, precios finales y cálculo fiscal SENIAT
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-9 text-xs cursor-pointer"
          >
            <Link href={`/purchasing/requisitions/${requisition.id}`}>
              Cancelar
            </Link>
          </Button>
          <Button
            form="adjudicate-form"
            type="submit"
            size="sm"
            variant="success"
            disabled={submitting}
            className="h-9 gap-1.5 text-xs font-bold cursor-pointer shadow-2xs"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileCheck2 className="w-4 h-4" />
            )}
            <span>{submitting ? "Generando Orden..." : "Adjudicar y Generar Orden"}</span>
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
              {currencySymbol} {fiscalSummary.taxableAmount.toFixed(2)}
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
              {currencySymbol} {fiscalSummary.exemptAmount.toFixed(2)}
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
              {currencySymbol} {fiscalSummary.iva16.toFixed(2)}
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
              {currencySymbol} {fiscalSummary.totalAmount.toFixed(2)}
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

      <form id="adjudicate-form" onSubmit={handleSubmit} className="space-y-6">
        {/* ========================================================
            SECCIÓN 1: DATOS COMERCIALES Y FISCALES
           ======================================================== */}
        <Card className="p-5 border-border shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Building2 className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold text-foreground">
              1. Proveedor y Condiciones de Facturación
            </CardTitle>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                Proveedor Adjudicado *
              </Label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full h-9 bg-background border border-input rounded-lg px-3 py-1 text-xs text-foreground focus:ring-2 focus:ring-ring font-medium cursor-pointer"
                required
              >
                <option value="">-- Seleccione proveedor ganador --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.rifOrId || s.rif || "N/A"})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                Moneda de Facturación *
              </Label>
              <select
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value as CurrencyCode)}
                className="w-full h-9 bg-background border border-input rounded-lg px-3 py-1 text-xs text-foreground focus:ring-2 focus:ring-ring font-medium cursor-pointer"
                required
              >
                {CURRENCY_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
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
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={exchangeRate}
                  disabled={currency === "VED"}
                  onChange={(e) => setExchangeRate(Number(e.target.value))}
                  className="font-mono font-bold text-xs pr-12 h-9"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono">
                  {currency === "VED" ? "1.00" : currency === "EUR" ? "Bs./€" : "Bs./$"}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground block font-mono">
                Oficial BCV: {bcvRates.USD.toFixed(2)} Bs./$ · {bcvRates.EUR.toFixed(2)} Bs./€
              </span>
            </div>
          </div>
        </Card>

        {/* ========================================================
            SECCIÓN 2: RENGLONES A ADJUDICAR
           ======================================================== */}
        <Card className="overflow-hidden border-border shadow-2xs">
          <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-bold text-foreground">
                2. Renglones a Adjudicar ({conversionItems.length})
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleToggleAllExempt(true)}
                className="text-[11px] h-7 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer"
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
          </div>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="py-3 px-4 text-xs font-semibold">Insumo / Reactivo</TableHead>
                <TableHead className="py-3 px-4 text-xs font-semibold text-center">Unidad</TableHead>
                <TableHead className="py-3 px-4 text-xs font-semibold text-right w-28">Cantidad</TableHead>
                <TableHead className="py-3 px-4 text-xs font-semibold text-right w-36">Precio Unit. ({currencySymbol})</TableHead>
                <TableHead className="py-3 px-4 text-xs font-semibold text-center w-32">¿Exento IVA?</TableHead>
                <TableHead className="py-3 px-4 text-xs font-semibold text-right w-32">Subtotal ({currencySymbol})</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {conversionItems.map((row, idx) => {
                const lineSubtotal = Math.round(row.quantityOrdered * row.unitPrice * 100) / 100;
                return (
                  <TableRow key={idx} className="hover:bg-muted/40 transition-colors text-xs">
                    <TableCell className="py-3 px-4">
                      <span className="font-semibold text-foreground block">
                        {row.productName}
                      </span>
                      {row.productSku && (
                        <span className="font-mono text-[10px] text-muted-foreground">
                          SKU: {row.productSku}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center font-medium text-muted-foreground">
                      {row.unitLabel}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right">
                      <Input
                        type="number"
                        min="1"
                        value={row.quantityOrdered}
                        onChange={(e) => {
                          const qty = Math.max(1, Number(e.target.value));
                          setConversionItems((prev) => {
                            const updated = [...prev];
                            if (updated[idx]) {
                              updated[idx] = { ...updated[idx], quantityOrdered: qty };
                            }
                            return updated;
                          });
                        }}
                        className="h-8 text-right font-mono font-bold text-xs"
                        required
                      />
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right">
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={row.unitPrice || ""}
                        onChange={(e) => {
                          const price = Math.max(0, Number(e.target.value));
                          setConversionItems((prev) => {
                            const updated = [...prev];
                            if (updated[idx]) {
                              updated[idx] = { ...updated[idx], unitPrice: price };
                            }
                            return updated;
                          });
                        }}
                        className="h-8 text-right font-mono font-bold text-xs text-primary"
                        required
                      />
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Checkbox
                          checked={row.isExempt}
                          onCheckedChange={(checked) => {
                            const isEx = !!checked;
                            setConversionItems((prev) => {
                              const updated = [...prev];
                              if (updated[idx]) {
                                updated[idx] = { ...updated[idx], isExempt: isEx };
                              }
                              return updated;
                            });
                          }}
                        />
                        <span
                          className={cn(
                            "text-[11px] font-semibold",
                            row.isExempt
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-muted-foreground"
                          )}
                        >
                          {row.isExempt ? "Exento" : "Gravable"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right font-mono font-bold text-foreground">
                      {currencySymbol} {lineSubtotal.toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>

        {/* ========================================================
            SECCIÓN 3: RESUMEN FISCAL Y OBSERVACIONES
           ======================================================== */}
        <Card className="p-5 border-border shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <CardTitle className="text-sm font-bold text-foreground">
              3. Resumen Fiscal y Términos de la Orden
            </CardTitle>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-semibold">
                  Términos de Despacho o Notas de la Orden (Opcional)
                </Label>
                <Input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Condiciones de pago a 30 días, flete incluido, entrega en almacén central..."
                  className="text-xs h-9"
                />
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/30 border border-border text-xs text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Cálculo fiscal automatizado según providencias SENIAT. Al confirmar, la preorden pasará a estado{" "}
                  <strong className="text-foreground">Adjudicada</strong> y se generará la Orden de Compra con snapshot inmutable de la tasa BCV.
                </span>
              </div>
            </div>

            <Card className="p-4 bg-muted/20 border-border shadow-none space-y-2 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal Gravable (16%):</span>
                <span className="font-mono font-semibold text-foreground">
                  {currencySymbol} {fiscalSummary.taxableAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal Exento:</span>
                <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">
                  {currencySymbol} {fiscalSummary.exemptAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>IVA (16%):</span>
                <span className="font-mono font-semibold text-foreground">
                  {currencySymbol} {fiscalSummary.iva16.toFixed(2)}
                </span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-bold text-foreground text-sm">
                <span>Total ({currency}):</span>
                <span className="font-mono text-primary">
                  {currencySymbol} {fiscalSummary.totalAmount.toFixed(2)}
                </span>
              </div>
              {currency !== "VED" && (
                <div className="border-t border-dashed border-border pt-2 space-y-1">
                  <div className="flex justify-between font-mono text-[11px]">
                    <span className="font-semibold text-foreground">Total en Bs.:</span>
                    <span className="font-bold text-foreground">
                      Bs.{" "}
                      {fiscalSummary.totalBs.toLocaleString("es-VE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  {currency === "EUR" && (
                    <div className="flex justify-between font-mono text-[11px]">
                      <span className="font-semibold text-foreground">Contravalor USD:</span>
                      <span className="font-bold text-foreground">
                        ${" "}
                        {fiscalSummary.totalUsd.toLocaleString("es-VE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        USD
                      </span>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground italic">
                    Tasa BCV: {exchangeRate.toFixed(2)} Bs./{currency === "EUR" ? "€" : "$"}
                  </p>
                </div>
              )}
            </Card>
          </div>
        </Card>

        {/* Barra Inferior de Acción */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/purchasing/requisitions")}
            className="cursor-pointer"
          >
            Volver al Listado
          </Button>

          <Button
            type="submit"
            variant="success"
            disabled={submitting}
            className="gap-2 cursor-pointer shadow-xs px-6"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileCheck2 className="w-4 h-4" />
            )}
            {submitting ? "Generando Orden..." : "Adjudicar y Generar Orden"}
          </Button>
        </div>
      </form>
    </div>
  );
}
