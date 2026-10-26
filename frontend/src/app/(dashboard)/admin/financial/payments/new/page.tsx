"use client";

import React, { useState, useEffect, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BankAccountService,
  type BankAccountItem,
} from "@/services/bank-account.service";
import { PurchasingClientService } from "@/services/purchasing.service";
import { CurrencyService } from "@/services/currency.service";
import type { Supplier } from "@/types/purchasing";
import {
  SearchableSelect,
  type SearchableOption,
} from "@/components/common/SearchableSelect";
import {
  Wallet,
  Building2,
  DollarSign,
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Receipt,
  FileCheck2,
} from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { toast } from "@/utils/toast";

export default function NewDirectPaymentPage() {
  const router = useRouter();

  // Maestros
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
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
  const [concept, setConcept] = useState("");
  const [beneficiary, setBeneficiary] = useState("");
  const [method, setMethod] = useState<
    "TRANSFERENCIA" | "PAGO_MOVIL" | "EFECTIVO" | "ZELLE"
  >("TRANSFERENCIA");
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [destinationAccount, setDestinationAccount] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentDate, setPaymentDate] = useState(() =>
    new Date().toISOString().split("T")[0]
  );
  const [transactionCurrency, setTransactionCurrency] = useState<
    "USD" | "VED" | "EUR"
  >("USD");
  const [amountPaid, setAmountPaid] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
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
        const [accountsData, ratesData, suppliersData] = await Promise.all([
          BankAccountService.getBankAccounts(true).catch(() => []),
          CurrencyService.getCurrentRates().catch(() => null),
          PurchasingClientService.getSuppliers().catch(() => []),
        ]);

        if (!ignore) {
          setBankAccounts(accountsData);
          setSuppliers(suppliersData);

          if (ratesData) {
            const usdR = Number(ratesData.USD || ratesData.rates?.USD || 75.0);
            const eurR = Number(ratesData.EUR || ratesData.rates?.EUR || 81.5);
            setBcvRates({ USD: usdR, EUR: eurR, VED: 1.0 });
          }
        }
      } catch (err) {
        console.error("Error cargando datos para nuevo egreso", err);
        toast.error("Error al cargar cuentas bancarias o proveedores.");
      } finally {
        if (!ignore) setLoadingInitial(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  const handleCurrencyChange = (curr: "USD" | "VED" | "EUR") => {
    setTransactionCurrency(curr);
    if (curr === "VED") {
      setExchangeRate(bcvRates.USD.toString());
    } else if (curr === "EUR") {
      setExchangeRate((bcvRates.EUR / bcvRates.USD).toFixed(4));
    } else {
      setExchangeRate("");
    }
  };

  // Autocompletado inteligente de proveedores
  const supplierOptions = useMemo<SearchableOption<Supplier>[]>(() => {
    return suppliers.map((s) => ({
      value: s.id,
      label: s.name,
      sublabel: [s.rifOrId || s.rif, s.contactName, s.phone].filter(Boolean).join(" · "),
      searchTerms: [s.name, s.rifOrId || s.rif || "", s.contactName || "", s.email || ""],
      badgeText: s.rifOrId || s.rif,
      data: s,
    }));
  }, [suppliers]);

  // Cálculo reactivo equivalente en USD
  const dynamicEquivalentUsd = useMemo(() => {
    const amt = parseFloat(amountPaid);
    if (isNaN(amt) || amt <= 0) return 0;
    if (transactionCurrency === "USD") return amt;
    if (transactionCurrency === "VED") {
      const rate = parseFloat(exchangeRate) || bcvRates.USD || 1;
      return rate > 0 ? amt / rate : 0;
    }
    if (transactionCurrency === "EUR") {
      const eurRate = bcvRates.EUR || 1;
      const usdRate = bcvRates.USD || 1;
      const parsedRate = parseFloat(exchangeRate);
      if (!isNaN(parsedRate) && parsedRate > 0) {
        return amt * parsedRate;
      }
      return amt * (eurRate / usdRate);
    }
    return 0;
  }, [amountPaid, transactionCurrency, exchangeRate, bcvRates]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!concept.trim()) {
      setFeedback({
        status: "error",
        message: "Debe ingresar el concepto del egreso.",
      });
      toast.error("Debe ingresar el concepto del egreso.");
      return;
    }

    if (!beneficiary.trim()) {
      setFeedback({
        status: "error",
        message: "Debe especificar el beneficiario o proveedor.",
      });
      toast.error("Debe especificar el beneficiario.");
      return;
    }

    const parsedAmount = parseFloat(amountPaid);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFeedback({
        status: "error",
        message: "El monto debe ser un número válido mayor a 0.",
      });
      toast.error("El monto debe ser mayor a 0.");
      return;
    }

    if (!referenceNumber.trim()) {
      setFeedback({
        status: "error",
        message: "Debe ingresar el número de referencia o comprobante.",
      });
      toast.error("Debe ingresar el número de referencia.");
      return;
    }

    if (
      (method === "TRANSFERENCIA" || method === "PAGO_MOVIL") &&
      !sourceAccountId
    ) {
      setFeedback({
        status: "error",
        message: "Debe seleccionar la cuenta bancaria de origen.",
      });
      toast.error("Debe seleccionar la cuenta bancaria de origen.");
      return;
    }

    setSubmitting(true);
    try {
      let finalRate: number | undefined;
      if (transactionCurrency === "VED") {
        finalRate = parseFloat(exchangeRate) || bcvRates.USD;
      } else if (transactionCurrency === "EUR") {
        finalRate = parseFloat(exchangeRate) || bcvRates.EUR / bcvRates.USD;
      }

      await BankAccountService.createDirectPayment({
        concept: concept.trim(),
        beneficiary: beneficiary.trim(),
        method,
        sourceAccountId:
          method === "TRANSFERENCIA" || method === "PAGO_MOVIL"
            ? Number(sourceAccountId)
            : undefined,
        destinationAccount: destinationAccount.trim() || undefined,
        referenceNumber: referenceNumber.trim(),
        paymentDate: new Date(paymentDate).toISOString(),
        transactionCurrency,
        amountPaid: parsedAmount,
        exchangeRate: finalRate,
        notes: notes.trim() || undefined,
        reviewedBy: reviewedBy.trim() || undefined,
        authorizedBy: authorizedBy.trim() || undefined,
        approvedBy: approvedBy.trim() || undefined,
      });

      toast.success("Pago directo asentado exitosamente.");
      router.push("/admin/financial/payments");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al registrar pago directo.";
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
          Cargando cuentas bancarias y proveedores...
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
            onClick={() => router.push("/admin/financial/payments")}
            className="cursor-pointer"
            title="Regresar a Egresos"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="indigo" className="text-xs font-semibold">
                Gestión Financiera
              </Badge>
              <Badge variant="outline" className="border-border/60 bg-muted/20 text-xs text-muted-foreground">
                Egreso Directo Sin Orden
              </Badge>
              {dynamicEquivalentUsd > 0 && (
                <Badge variant="success" className="text-xs font-mono font-bold">
                  Equiv. ${dynamicEquivalentUsd.toFixed(2)} USD
                </Badge>
              )}
              {bcvRates?.USD && (
                <Badge variant="purple" className="text-xs font-mono">
                  Tasa: Bs. {bcvRates.USD.toFixed(2)}
                </Badge>
              )}
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground mt-1">
              Registro de Egreso / Pago Directo
            </h1>
            <p className="text-xs text-muted-foreground">
              Desembolso inmediato para servicios, nómina, reparaciones o compras menores directas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/admin/financial/payments")}
            className="text-xs cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            form="direct-payment-form"
            type="submit"
            size="sm"
            disabled={submitting}
            className="text-xs gap-1.5 cursor-pointer shadow-xs"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {submitting ? "Asentando..." : "Asentar Egreso Directo"}
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

      <form id="direct-payment-form" onSubmit={handleSubmit} className="space-y-6">
        {/* SECCIÓN 1: Beneficiario y Concepto */}
        <Card className="p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Building2 className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold text-foreground">
              1. Beneficiario y Concepto del Desembolso
            </CardTitle>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase font-semibold">
                  Beneficiario / Proveedor / RIF *
                </Label>
                {suppliers.length > 0 && (
                  <span className="text-[11px] text-muted-foreground font-normal">
                    Seleccione un proveedor para autocompletar o ingrese libremente
                  </span>
                )}
              </div>

              {suppliers.length > 0 && (
                <div className="mb-2">
                  <SearchableSelect<Supplier>
                    options={supplierOptions}
                    value=""
                    onChange={(_val, opt) => {
                      if (opt?.data) {
                        const s = opt.data;
                        const label = (s.rifOrId || s.rif) ? `${s.name} (${s.rifOrId || s.rif})` : s.name;
                        setBeneficiary(label);
                      }
                    }}
                    placeholder="🔍 Buscar proveedor registrado para autocompletar datos..."
                    emptyMessage="No se encontró ningún proveedor registrado."
                    itemTypeLabel="proveedor(es)"
                    icon={<Building2 className="w-4 h-4 text-muted-foreground shrink-0" />}
                  />
                </div>
              )}

              <Input
                type="text"
                required
                value={beneficiary}
                onChange={(e) => setBeneficiary(e.target.value)}
                placeholder="Ej. Comercializadora Médica C.A. (RIF J-12345678-9) o Lic. Pedro Morales..."
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                Concepto Principal del Desembolso *
              </Label>
              <Input
                type="text"
                required
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                placeholder="Ej. Pago de Electricidad CORPOELEC Sede Principal Mes Octubre..."
                className="text-xs font-medium"
              />
            </div>
          </div>
        </Card>

        {/* SECCIÓN 2: Moneda, Tasa y Monto */}
        <Card className="p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <CardTitle className="text-sm font-bold text-foreground">
              2. Moneda, Tasa de Cambio y Monto del Pago
            </CardTitle>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                Moneda de Transacción *
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
                Tasa de Cambio ({transactionCurrency === "EUR" ? "Bs./€" : "Bs./$"})
              </Label>
              <Input
                type="number"
                step="0.0001"
                min="0.0001"
                placeholder={
                  transactionCurrency === "EUR"
                    ? (bcvRates.EUR / bcvRates.USD).toFixed(4)
                    : bcvRates.USD.toFixed(2)
                }
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                disabled={transactionCurrency === "USD"}
                className="font-mono text-xs"
              />
              <span className="text-[10px] text-muted-foreground font-mono block">
                BCV: {transactionCurrency === "EUR" ? bcvRates.EUR.toFixed(2) : bcvRates.USD.toFixed(2)} Bs.
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                Monto Pagado ({transactionCurrency === "VED" ? "Bs." : transactionCurrency === "EUR" ? "€" : "$"}) *
              </Label>
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

          {/* Tarjeta Informativa de Equivalente USD */}
          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/90 flex justify-between items-center text-xs">
            <div>
              <span className="font-semibold text-emerald-900 block">
                Equivalente estimado en Divisas (USD):
              </span>
              <span className="text-[11px] text-emerald-700">
                Calculado a la tasa oficial aplicada
              </span>
            </div>
            <span className="font-mono text-xl font-bold text-emerald-800">
              $ {dynamicEquivalentUsd.toFixed(2)} USD
            </span>
          </div>
        </Card>

        {/* SECCIÓN 3: Método de Pago e Instrumento Bancario */}
        <Card className="p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <CreditCard className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold text-foreground">
              3. Método de Pago y Cuenta Bancaria
            </CardTitle>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                Método de Pago *
              </Label>
              <select
                value={method}
                onChange={(e) =>
                  setMethod(
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
                <option value="EFECTIVO">Efectivo (USD / Bolívares)</option>
                <option value="ZELLE">Zelle (USD)</option>
              </select>
            </div>

            {(method === "TRANSFERENCIA" || method === "PAGO_MOVIL") && (
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
                  <option value="">-- Seleccione cuenta institucional --</option>
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
                Cuenta o Teléfono de Destino (Opcional)
              </Label>
              <Input
                type="text"
                value={destinationAccount}
                onChange={(e) => setDestinationAccount(e.target.value)}
                placeholder="Ej. 0102... o 0414... / correo Zelle"
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                N° Comprobante / Referencia *
              </Label>
              <Input
                type="text"
                required
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Ej. 98765432"
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs uppercase font-semibold">
                Fecha de Emisión del Pago *
              </Label>
              <Input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="text-xs w-full sm:w-64"
              />
            </div>
          </div>
        </Card>

        {/* SECCIÓN 4: Conceptos Rápidos y Firmas */}
        <Card className="p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <FileCheck2 className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold text-foreground">
              4. Clasificación del Gasto y Autorizaciones
            </CardTitle>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase font-semibold">
                Clasificación Rápida y Observaciones
              </Label>
              <span className="text-[11px] text-muted-foreground">
                (Haz clic para asociar categoría del egreso)
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-0.5">
              {[
                { word: "Servicios", text: "Pago de servicios básicos y telecomunicaciones", theme: "bg-sky-50 text-sky-700 border-sky-200/90 hover:bg-sky-100/90" },
                { word: "Nómina", text: "Honorarios profesionales o desembolso directo de nómina", theme: "bg-emerald-50 text-emerald-700 border-emerald-200/90 hover:bg-emerald-100/90" },
                { word: "Mantenimiento", text: "Servicio técnico preventivo/correctivo e infraestructura", theme: "bg-amber-50 text-amber-700 border-amber-200/90 hover:bg-amber-100/90" },
                { word: "Alquiler", text: "Canon de arrendamiento de instalaciones operativas", theme: "bg-purple-50 text-purple-700 border-purple-200/90 hover:bg-purple-100/90" },
                { word: "Suministros", text: "Insumos menores y gastos operativos de oficina", theme: "bg-indigo-50 text-indigo-700 border-indigo-200/90 hover:bg-indigo-100/90" },
                { word: "Urgencia", text: "Egreso de contingencia para continuidad de operaciones", theme: "bg-rose-50 text-rose-700 border-rose-200/90 hover:bg-rose-100/90" },
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
              placeholder="Detalles sobre facturas recibidas, recibos o justificación del desembolso..."
              className="text-xs"
            />
          </div>

          <div className="pt-2 border-t border-border space-y-2">
            <Label className="text-xs uppercase font-semibold">
              Firmas de Autorización del Egreso
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
            onClick={() => router.push("/admin/financial/payments")}
            className="cursor-pointer"
          >
            Regresar al Historial
          </Button>

          <Button
            type="submit"
            disabled={submitting}
            className="gap-2 cursor-pointer shadow-xs px-6"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? "Asentando Egreso..." : "Asentar Egreso Directo"}
          </Button>
        </div>
      </form>
    </div>
  );
}
