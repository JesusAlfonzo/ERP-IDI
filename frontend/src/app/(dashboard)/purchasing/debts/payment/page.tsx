"use client";

import React, { useState, useEffect, Suspense, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PurchasingClientService } from "@/services/purchasing.service";
import {
  BankAccountService,
  type BankAccountItem,
} from "@/services/bank-account.service";
import { CurrencyService } from "@/services/currency.service";
import type { SupplierDebt } from "@/types/purchasing";
import {
  CreditCard,
  Building2,
  DollarSign,
  Landmark,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Lock,
  PlusCircle,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { toast } from "@/utils/toast";

function SupplierPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramDebtId = searchParams?.get("debtId") || searchParams?.get("supplierId");

  // Estados de datos
  const [debts, setDebts] = useState<SupplierDebt[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([]);
  const [bcvRates, setBcvRates] = useState<{
    USD: number;
    EUR: number;
    VED: number;
  }>({
    USD: 75.0,
    EUR: 81.5,
    VED: 1.0,
  });
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Formulario
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [isLockedSupplier, setIsLockedSupplier] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<
    "TRANSFERENCIA" | "PAGO_MOVIL" | "EFECTIVO" | "ZELLE"
  >("TRANSFERENCIA");
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [transactionCurrency, setTransactionCurrency] = useState<
    "USD" | "VED" | "EUR"
  >("USD");
  const [amountPaid, setAmountPaid] = useState("");
  const [exchangeRate, setExchangeRate] = useState("1.0");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentDate, setPaymentDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
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
        const [debtsData, accountsData, ratesData] = await Promise.all([
          PurchasingClientService.getSupplierDebts().catch(() => []),
          BankAccountService.getBankAccounts(true).catch(() => []),
          CurrencyService.getCurrentRates().catch(() => null),
        ]);

        if (!ignore) {
          setDebts(debtsData);
          setBankAccounts(accountsData);

          if (ratesData) {
            setBcvRates({
              USD: Number(ratesData.USD || ratesData.rates?.USD || 75.0),
              EUR: Number(ratesData.EUR || ratesData.rates?.EUR || 81.5),
              VED: 1.0,
            });
          }

          // Preselección por query param
          if (paramDebtId) {
            const found = debtsData.find(
              (d) => String(d.id) === String(paramDebtId)
            );
            if (found) {
              setSelectedSupplierId(String(found.id));
              setIsLockedSupplier(true);
              if ((found.balanceBs || 0) > 0.01 && (!found.balanceUsd || found.balanceUsd <= 0.01)) {
                setTransactionCurrency("VED");
                setExchangeRate(ratesData ? (ratesData.USD || ratesData.rates?.USD || 75.0).toString() : "75.0");
              }
            }
          }
        }
      } catch (err) {
        console.error("Error cargando cuentas por pagar", err);
        toast.error("Error al cargar proveedores o cuentas bancarias.");
      } finally {
        if (!ignore) setLoadingInitial(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [paramDebtId]);

  // Proveedor seleccionado actualmente
  const currentSupplier = debts.find(
    (d) => String(d.id) === String(selectedSupplierId)
  );

  const handleCurrencyChange = (curr: "USD" | "VED" | "EUR") => {
    setTransactionCurrency(curr);
    if (curr === "VED") {
      setExchangeRate(bcvRates.USD.toString());
    } else if (curr === "EUR") {
      setExchangeRate(bcvRates.EUR.toString());
    } else {
      setExchangeRate("1.0");
    }
  };

  // Cálculos dinámicos de equivalencia en el formulario
  const parsedAmount = parseFloat(amountPaid) || 0;
  const parsedRate = parseFloat(exchangeRate) || 1;

  let dynamicEquivalentUsd = parsedAmount;
  let dynamicEquivalentBs = parsedAmount;

  if (transactionCurrency === "USD") {
    dynamicEquivalentUsd = parsedAmount;
    dynamicEquivalentBs = parsedAmount * (parsedRate > 1 ? parsedRate : bcvRates.USD);
  } else if (transactionCurrency === "VED") {
    dynamicEquivalentUsd = parsedRate > 0 ? parsedAmount / parsedRate : 0;
    dynamicEquivalentBs = parsedAmount;
  } else if (transactionCurrency === "EUR") {
    const rateEur = parsedRate > 0 ? parsedRate : bcvRates.EUR;
    dynamicEquivalentBs = parsedAmount * rateEur;
    dynamicEquivalentUsd = bcvRates.USD > 0 ? dynamicEquivalentBs / bcvRates.USD : parsedAmount;
  }

  const supplierBalanceBs = currentSupplier ? (currentSupplier.balanceBs || 0) : 0;
  const supplierBalanceUsd = currentSupplier ? (currentSupplier.balanceUsd || 0) : 0;
  const supplierBalanceEur = currentSupplier ? (currentSupplier.balanceEur || 0) : 0;

  const effectiveRateForBs =
    transactionCurrency === "VED" && parsedRate > 1
      ? parsedRate
      : bcvRates.USD > 0
        ? bcvRates.USD
        : 75.0;

  const rateUsd = effectiveRateForBs;
  const rateEur =
    (transactionCurrency === "EUR" && parsedRate > 0 ? parsedRate : bcvRates.EUR) ||
    (bcvRates.EUR > 0 ? bcvRates.EUR : 81.5);

  const effectiveDebtBs =
    supplierBalanceBs +
    supplierBalanceUsd * rateUsd +
    supplierBalanceEur * rateEur;

  const effectiveDebtUsd =
    supplierBalanceUsd +
    (rateUsd > 0 ? supplierBalanceBs / rateUsd : 0) +
    (rateUsd > 0 ? (supplierBalanceEur * rateEur) / rateUsd : 0);

  const effectiveDebtEur =
    supplierBalanceEur +
    (rateEur > 0 ? (supplierBalanceBs + supplierBalanceUsd * rateUsd) / rateEur : 0);

  const remainingDebtEstimatedBs = Math.max(0, effectiveDebtBs - dynamicEquivalentBs);
  const remainingDebtEstimatedUsd = Math.max(0, effectiveDebtUsd - dynamicEquivalentUsd);

  const isOverpaying =
    effectiveDebtUsd > 0 && dynamicEquivalentUsd > effectiveDebtUsd + 0.05;

  const handleFillTotalDebt = (overrideCurr?: "USD" | "VED" | "EUR") => {
    if (!currentSupplier) return;
    const targetCurr = overrideCurr || transactionCurrency;
    if (overrideCurr && overrideCurr !== transactionCurrency) {
      handleCurrencyChange(overrideCurr);
    }
    if (targetCurr === "USD") {
      setAmountPaid(effectiveDebtUsd.toFixed(2));
    } else if (targetCurr === "VED") {
      setAmountPaid(effectiveDebtBs.toFixed(2));
    } else if (targetCurr === "EUR") {
      setAmountPaid(effectiveDebtEur.toFixed(2));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!currentSupplier) {
      setFeedback({
        status: "error",
        message: "Debe seleccionar un proveedor con cuenta por pagar.",
      });
      toast.error("Seleccione un proveedor.");
      return;
    }

    if (parsedAmount <= 0) {
      setFeedback({
        status: "error",
        message: "El monto pagado debe ser mayor a 0.",
      });
      toast.error("Ingrese un monto válido.");
      return;
    }

    if (!referenceNumber.trim()) {
      setFeedback({
        status: "error",
        message: "Debe ingresar el número de referencia o comprobante bancario.",
      });
      toast.error("Ingrese el número de comprobante.");
      return;
    }

    if (
      (paymentMethod === "TRANSFERENCIA" || paymentMethod === "PAGO_MOVIL") &&
      !sourceAccountId
    ) {
      setFeedback({
        status: "error",
        message: "Debe seleccionar la cuenta bancaria institucional origen.",
      });
      toast.error("Seleccione la cuenta bancaria origen.");
      return;
    }

    setSubmitting(true);
    try {
      await PurchasingClientService.registerPayment({
        supplierId: currentSupplier.id,
        amount: parsedAmount,
        transactionCurrency,
        exchangeRate: parsedRate,
        paymentMethod,
        sourceAccountId: sourceAccountId ? Number(sourceAccountId) : undefined,
        referenceNumber: referenceNumber.trim(),
        paymentDate: new Date(paymentDate).toISOString(),
        notes: notes.trim() || undefined,
        reviewedBy: reviewedBy.trim() || undefined,
        authorizedBy: authorizedBy.trim() || undefined,
        approvedBy: approvedBy.trim() || undefined,
      });

      toast.success(
        `Pago de ${transactionCurrency} ${parsedAmount.toFixed(2)} registrado para ${currentSupplier.name}.`
      );
      router.push("/purchasing/debts");
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : "Error al registrar el pago al proveedor.";
      setFeedback({
        status: "error",
        message: errorMsg,
      });
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-medium">
          Cargando cuentas por pagar y cuentas bancarias...
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
            onClick={() => router.push("/purchasing/debts")}
            className="cursor-pointer"
            title="Regresar a Cuentas por Pagar"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="indigo" className="text-xs font-semibold">
                Cuentas por Pagar
              </Badge>
              <Badge variant="outline" className="border-border/60 bg-muted/20 text-xs text-muted-foreground">
                Amortización a Proveedor
              </Badge>
              {currentSupplier && (
                <Badge
                  variant={effectiveDebtUsd <= 0.009 ? "success" : "rose"}
                  className="text-xs font-mono font-bold"
                >
                  Deuda: Bs. {effectiveDebtBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (≈ ${effectiveDebtUsd.toFixed(2)} USD)
                </Badge>
              )}
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground mt-1">
              Registro de Pago a Proveedor
            </h1>
            <p className="text-xs text-muted-foreground">
              Desembolso institucional y amortización contable directa a cuentas comerciales
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/purchasing/debts")}
            className="text-xs cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            form="payment-form"
            type="submit"
            size="sm"
            disabled={submitting}
            className="text-xs gap-1.5 cursor-pointer shadow-xs"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {submitting ? "Registrando..." : "Registrar Desembolso"}
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

      <form id="payment-form" onSubmit={handleSubmit} className="space-y-6">
        {/* SECCIÓN 1: Proveedor y Estado de Saldo Pendiente */}
        <Card className="p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-bold text-foreground">
                1. Proveedor y Saldo Comercial
              </CardTitle>
            </div>
            {isLockedSupplier && (
              <Badge variant="outline" className="border-amber-200/90 bg-amber-50 text-amber-800 text-[11px] gap-1">
                <Lock className="w-3 h-3" /> Proveedor Fijado por Selección
              </Badge>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs uppercase font-semibold">
              Proveedor Destinatario *
            </Label>
            {isLockedSupplier ? (
              <div className="p-3 bg-muted/40 rounded-lg border border-border flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-foreground block">
                    {currentSupplier?.name}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    RIF: {currentSupplier?.rifOrId || "Sin RIF"}
                  </span>
                </div>
                <Badge variant="outline" className="border-border/60 bg-muted/30 text-xs">
                  Bloqueado para seguridad de auditoría
                </Badge>
              </div>
            ) : (
              <select
                required
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-ring font-medium cursor-pointer"
              >
                <option value="">-- Seleccione un proveedor comercial --</option>
                {debts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.rifOrId || "Sin RIF"}) — Saldo Pendiente: ${d.balanceUsd.toFixed(2)} USD
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Tarjeta Informativa del Saldo del Proveedor con las 3 Cuentas y Equivalente en Bs. */}
          {currentSupplier && (
            <div className="space-y-3 pt-2">
              {/* Banner Destacado: Deuda Total en Bolívares */}
              <div className="p-4 bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent border border-emerald-500/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                      Deuda Total Equivalente en Bolívares (Bs.)
                    </span>
                  </div>
                  <div className="text-2xl font-black font-mono text-emerald-950 dark:text-emerald-200 mt-1">
                    Bs. {effectiveDebtBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    Calculado a tasa oficial/acordada: {effectiveRateForBs.toFixed(2)} Bs./$
                  </span>
                </div>
                <div className="sm:text-right">
                  <span className="text-[11px] uppercase font-bold text-muted-foreground block">
                    Equivalente Consolidado USD
                  </span>
                  <div className="text-base font-bold font-mono text-foreground">
                    $ {effectiveDebtUsd.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </div>
                  <div className="mt-1">
                    {effectiveDebtUsd <= 0.009 ? (
                      <Badge variant="success">Solvente en todas las cuentas</Badge>
                    ) : (
                      <Badge variant="destructive">Saldo comercial pendiente</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Las 3 Cuentas por Moneda */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Cuenta Bolívares (Bs.)</span>
                    <Badge variant="success" className="text-[10px] font-mono py-0">Bs.</Badge>
                  </div>
                  <span className="text-base font-bold font-mono text-emerald-950 dark:text-emerald-200 block mt-1">
                    Bs. {(currentSupplier.balanceBs || 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
                    Pagado: Bs. {(currentSupplier.totalPaidBs || 0).toFixed(2)}
                  </span>
                </div>

                <div className="p-3 bg-blue-50/40 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-800 dark:text-blue-300">Cuenta Dólares (USD)</span>
                    <Badge variant="indigo" className="text-[10px] font-mono py-0">USD</Badge>
                  </div>
                  <span className="text-base font-bold font-mono text-blue-950 dark:text-blue-200 block mt-1">
                    $ {(currentSupplier.balanceUsd || 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
                    Pagado: $ {(currentSupplier.totalPaidUsd || 0).toFixed(2)}
                  </span>
                </div>

                <div className="p-3 bg-purple-50/40 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-purple-800 dark:text-purple-300">Cuenta Euros (EUR)</span>
                    <Badge variant="purple" className="text-[10px] font-mono py-0">EUR</Badge>
                  </div>
                  <span className="text-base font-bold font-mono text-purple-950 dark:text-purple-200 block mt-1">
                    € {(currentSupplier.balanceEur || 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
                    Pagado: € {(currentSupplier.totalPaidEur || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* SECCIÓN 2: Moneda, Tasa y Monto */}
        <Card className="p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <CardTitle className="text-sm font-bold text-foreground">
              2. Monto, Moneda y Equivalencia de Amortización
            </CardTitle>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                Moneda del Pago *
              </Label>
              <select
                value={transactionCurrency}
                onChange={(e) =>
                  handleCurrencyChange(
                    e.target.value as "USD" | "VED" | "EUR"
                  )
                }
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-ring font-medium cursor-pointer"
              >
                <option value="USD">Dólares Americanos ($ USD)</option>
                <option value="VED">Bolívares (Bs. VED)</option>
                <option value="EUR">Euros (€ EUR)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                Tasa Aplicada (Bs./{transactionCurrency === "EUR" ? "€" : "$"})
              </Label>
              <Input
                type="number"
                step="0.0001"
                min="0.0001"
                required
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                className="font-mono text-xs"
              />
              <span className="text-[10px] text-muted-foreground font-mono block">
                BCV Oficial: {bcvRates.USD.toFixed(2)} Bs./$
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase font-semibold">
                  Monto a Pagar ({transactionCurrency === "VED" ? "Bs." : transactionCurrency === "EUR" ? "€" : "$"}) *
                </Label>
                {effectiveDebtUsd > 0 && (
                  <button
                    type="button"
                    onClick={() => handleFillTotalDebt(transactionCurrency)}
                    className="text-xs text-primary hover:underline font-bold cursor-pointer"
                  >
                    Pagar saldo total ({transactionCurrency === "VED" ? `Bs. ${effectiveDebtBs.toFixed(2)}` : transactionCurrency === "EUR" ? `€ ${effectiveDebtEur.toFixed(2)}` : `$ ${effectiveDebtUsd.toFixed(2)}`})
                  </button>
                )}
              </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="font-mono font-bold text-sm"
                />
              </div>
            </div>

            {/* Tarjeta Reactiva de Amortización */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground block font-medium">
                    Desembolso en Bolívares (Bs.):
                  </span>
                  <span className="text-base font-bold font-mono text-emerald-800 dark:text-emerald-400 block mt-0.5">
                    Bs. {dynamicEquivalentBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div>
                  <span className="text-muted-foreground block font-medium">
                    Equivalente amortizado en USD:
                  </span>
                  <span className="text-base font-bold font-mono text-blue-800 dark:text-blue-400 block mt-0.5">
                    $ {dynamicEquivalentUsd.toFixed(2)} USD
                  </span>
                </div>

                {currentSupplier && (
                  <div>
                    <span className="text-muted-foreground block font-medium">
                      Saldo restante estimado:
                    </span>
                    <span className="text-base font-bold font-mono text-foreground block mt-0.5">
                      {transactionCurrency === "VED"
                        ? `Bs. ${remainingDebtEstimatedBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : `$ ${remainingDebtEstimatedUsd.toFixed(2)} USD`}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono block">
                      (≈ {transactionCurrency === "VED" ? `$${remainingDebtEstimatedUsd.toFixed(2)} USD` : `Bs. ${remainingDebtEstimatedBs.toFixed(2)}`})
                    </span>
                  </div>
                )}
              </div>

              {isOverpaying && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2 text-destructive text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    El monto a amortizar ($ {dynamicEquivalentUsd.toFixed(2)} USD) sobrepasa el saldo pendiente total consolidado del proveedor ($ {effectiveDebtUsd.toFixed(2)} USD).
                  </span>
                </div>
              )}
            </div>
          </Card>

        {/* SECCIÓN 3: Método de Pago e Información Bancaria */}
        <Card className="p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <CreditCard className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold text-foreground">
              3. Método de Pago e Instrumento Bancario
            </CardTitle>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                Método de Pago *
              </Label>
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(
                    e.target.value as
                      | "TRANSFERENCIA"
                      | "PAGO_MOVIL"
                      | "EFECTIVO"
                      | "ZELLE"
                  )
                }
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-ring font-medium cursor-pointer"
              >
                <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                <option value="PAGO_MOVIL">Pago Móvil Interbancario</option>
                <option value="EFECTIVO">Efectivo (USD / VED)</option>
                <option value="ZELLE">Zelle (USD)</option>
              </select>
            </div>

            {(paymentMethod === "TRANSFERENCIA" || paymentMethod === "PAGO_MOVIL") && (
              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-semibold">
                  Cuenta Bancaria Origen *
                </Label>
                <select
                  required
                  value={sourceAccountId}
                  onChange={(e) => setSourceAccountId(e.target.value)}
                  className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-ring font-medium cursor-pointer font-mono"
                >
                  <option value="">-- Seleccione cuenta de salida --</option>
                  {bankAccounts
                    .filter((acc) => acc.currency === transactionCurrency || transactionCurrency === "VED")
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.bankName} - {acc.accountNumber?.slice(-4) || acc.id} ({acc.currency})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                N° Comprobante / Referencia *
              </Label>
              <Input
                required
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Ej: 12345678"
                className="font-mono font-medium text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                Fecha Valor del Pago *
              </Label>
              <Input
                required
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>
        </Card>

        {/* SECCIÓN 4: Concepto Rápido y Observaciones */}
        <Card className="p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Clock className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold text-foreground">
              4. Concepto de Pago y Aprobación
            </CardTitle>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase font-semibold">
                Concepto Rápido de Pago
              </Label>
              <span className="text-[11px] text-muted-foreground">
                (Haz clic para asociar)
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-0.5">
              {[
                { word: "Finiquito", text: "Cancelación total que liquida la deuda pendiente del proveedor", theme: "bg-emerald-50 text-emerald-700 border-emerald-200/90 hover:bg-emerald-100/90" },
                { word: "Abono", text: "Abono parcial para amortizar cuenta comercial", theme: "bg-amber-50 text-amber-700 border-amber-200/90 hover:bg-amber-100/90" },
                { word: "Factura", text: "Pago correspondiente a factura fiscal entregada", theme: "bg-indigo-50 text-indigo-700 border-indigo-200/90 hover:bg-indigo-100/90" },
                { word: "Anticipo", text: "Anticipo comercial para reposición de insumos", theme: "bg-sky-50 text-sky-700 border-sky-200/90 hover:bg-sky-100/90" },
                { word: "Urgente", text: "Pago prioritario para desbloqueo de despachos", theme: "bg-rose-50 text-rose-700 border-rose-200/90 hover:bg-rose-100/90" },
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
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles sobre facturas vinculadas, recibos de entrega o notas comerciales..."
              className="text-xs"
            />
          </div>

          <div className="pt-2 border-t border-border space-y-2">
            <Label className="text-xs uppercase font-semibold">
              Firmas de Autorización del Pago
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
            onClick={() => router.push("/purchasing/debts")}
            className="cursor-pointer"
          >
            Regresar a Cuentas por Pagar
          </Button>

          <Button
            type="submit"
            disabled={submitting}
            className="gap-2 cursor-pointer shadow-xs px-6"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? "Registrando Pago..." : "Registrar Desembolso"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function SupplierPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[60vh] flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground font-medium">
            Cargando formulario de pago a proveedores...
          </span>
        </div>
      }
    >
      <SupplierPaymentContent />
    </Suspense>
  );
}
