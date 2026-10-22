"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  BankAccountService,
  type BankAccountItem,
} from "@/services/bank-account.service";
import { CurrencyService } from "@/services/currency.service";
import { AuthService } from "@/services/auth.service";
import { PurchasingClientService } from "@/services/purchasing.service";
import type { DirectPayment, Supplier } from "@/types/purchasing";
import { SearchableSelect, type SearchableOption } from "@/components/common/SearchableSelect";
import { toast } from "@/utils/toast";
import {
  Wallet,
  Plus,
  Search,
  Trash2,
  Loader2,
  Building2,
  Receipt,
  Coins,
  DollarSign,
  Calendar,
  Eye,
  X,
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
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function DirectPaymentsPage() {
  const [payments, setPayments] = useState<DirectPayment[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  // Roles & Permisos
  const [currentUser] = useState(() => AuthService.getCurrentUser());
  const userRoles = currentUser?.roles || [];
  const isAdmin = userRoles.includes("ADMINISTRADOR");

  // Filtros
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [sourceAccountFilter, setSourceAccountFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Tasas de cambio
  const [bcvRates, setBcvRates] = useState<{
    USD: number;
    EUR: number;
    VED: number;
  }>({
    USD: 75.0,
    EUR: 81.5,
    VED: 1.0,
  });

  // Modal de Nuevo Egreso
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

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

  const loadData = () => {
    startTransition(() => {
      void (async () => {
        try {
          const [paymentsData, accountsData, ratesData, suppliersData] = await Promise.all([
            BankAccountService.getDirectPayments({
              search: search || undefined,
              method: methodFilter || undefined,
              currency: currencyFilter || undefined,
              startDate: startDate || undefined,
              endDate: endDate || undefined,
              sourceAccountId: sourceAccountFilter || undefined,
            }),
            BankAccountService.getBankAccounts(true).catch(() => []),
            CurrencyService.getCurrentRates().catch(() => null),
            PurchasingClientService.getSuppliers().catch(() => []),
          ]);
          setPayments(paymentsData);
          setBankAccounts(accountsData);
          setSuppliers(suppliersData);

          if (ratesData) {
            const usdR = Number(ratesData.USD || ratesData.rates?.USD || 75.0);
            const eurR = Number(ratesData.EUR || ratesData.rates?.EUR || 81.5);
            setBcvRates({ USD: usdR, EUR: eurR, VED: 1.0 });
          }
        } catch (error) {
          console.error("Error al cargar pagos directos:", error);
          toast.error("No se pudo cargar la lista de pagos directos");
        } finally {
          setLoading(false);
        }
      })();
    });
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [methodFilter, currencyFilter, sourceAccountFilter, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleOpenModal = async () => {
    setConcept("");
    setBeneficiary("");
    setMethod("TRANSFERENCIA");
    setSourceAccountId("");
    setDestinationAccount("");
    setReferenceNumber("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setTransactionCurrency("USD");
    setAmountPaid("");
    setExchangeRate("");
    setNotes("");
    setReviewedBy("");
    setAuthorizedBy("");
    setApprovedBy("");

    setShowModal(true);
    setLoadingAccounts(true);
    try {
      const activeAccounts = await BankAccountService.getBankAccounts(true);
      setBankAccounts(activeAccounts);
    } catch {
      toast.error("No se pudieron cargar las cuentas bancarias.");
    } finally {
      setLoadingAccounts(false);
    }
  };

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

  const computeEquivalentUsd = (): number => {
    const amt = parseFloat(amountPaid) || 0;
    if (amt <= 0) return 0;

    if (transactionCurrency === "USD") {
      return amt;
    }

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

    return amt;
  };

  const dynamicEquivalentUsd = computeEquivalentUsd();

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!concept.trim()) {
      toast.error("Debe ingresar el concepto del pago.");
      return;
    }
    if (!beneficiary.trim()) {
      toast.error("Debe especificar el beneficiario.");
      return;
    }
    const parsedAmount = parseFloat(amountPaid);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("El monto debe ser un número válido mayor a 0.");
      return;
    }
    if (!referenceNumber.trim()) {
      toast.error("Debe ingresar el número de referencia.");
      return;
    }
    if (
      (method === "TRANSFERENCIA" || method === "PAGO_MOVIL") &&
      !sourceAccountId
    ) {
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

      toast.success("Pago directo registrado exitosamente");
      setShowModal(false);
      loadData();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al registrar pago directo";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (payment: DirectPayment) => {
    if (!isAdmin) return;
    const confirm = window.confirm(
      `¿Está seguro de eliminar el pago directo "${payment.concept}" por ${payment.transactionCurrency} ${payment.amountPaid}? Esta acción devolverá los fondos a la cuenta institucional si aplica.`
    );
    if (!confirm) return;

    try {
      await BankAccountService.deleteDirectPayment(payment.id);
      toast.success("Pago directo eliminado correctamente");
      loadData();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al eliminar pago directo";
      toast.error(msg);
    }
  };

  const getMethodBadge = (m: string) => {
    switch (m) {
      case "TRANSFERENCIA":
        return <Badge variant="info">Transferencia</Badge>;
      case "PAGO_MOVIL":
        return <Badge variant="purple">Pago Móvil</Badge>;
      case "EFECTIVO":
        return <Badge variant="success">Efectivo</Badge>;
      case "ZELLE":
        return <Badge variant="secondary">Zelle</Badge>;
      default:
        return <Badge variant="outline">{m}</Badge>;
    }
  };

  // Opciones de autocompletado inteligente de proveedores
  const supplierOptions = React.useMemo<SearchableOption<Supplier>[]>(() => {
    return suppliers.map((s) => ({
      value: s.id,
      label: s.name,
      sublabel: [s.rifOrId || s.rif, s.contactName, s.phone].filter(Boolean).join(" · "),
      searchTerms: [s.name, s.rifOrId || s.rif || "", s.contactName || "", s.email || ""],
      badgeText: s.rifOrId || s.rif,
      data: s,
    }));
  }, [suppliers]);

  // Cálculos estadísticos
  const totalCount = payments.length;
  const totalUsdEquivalent = payments.reduce(
    (acc, p) => acc + (Number(p.equivalentAmountUsd) || 0),
    0
  );
  const totalVedPaid = payments
    .filter((p) => p.transactionCurrency === "VED")
    .reduce((acc, p) => acc + (Number(p.amountPaid) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] font-mono">
                Gestión Financiera
              </Badge>
              <span className="text-xs font-mono font-medium text-muted-foreground">
                Sin Orden Previa
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground mt-0.5">
              Registro de Egresos / Pagos Directos
            </h1>
          </div>
        </div>

        <Button onClick={handleOpenModal} className="gap-1.5 self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          Registrar Nuevo Egreso
        </Button>
      </div>

      {/* Tarjetas Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4 space-y-1 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <Receipt className="w-4 h-4 text-primary" />
            Total Egresos Directos
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">
            {totalCount}
          </div>
          <span className="text-[11px] text-muted-foreground block">
            Desembolsos registrados
          </span>
        </Card>

        <Card className="p-4 space-y-1 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            Total Equivalente (USD)
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700">
            ${" "}
            {totalUsdEquivalent.toLocaleString("es-VE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <span className="text-[11px] text-muted-foreground block font-mono">
            Valor consolidado en divisas
          </span>
        </Card>

        <Card className="p-4 space-y-1 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <Coins className="w-4 h-4 text-amber-600" />
            Egresos en Bolívares (VED)
          </div>
          <div className="text-2xl font-bold font-mono text-foreground">
            Bs.{" "}
            {totalVedPaid.toLocaleString("es-VE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <span className="text-[11px] text-muted-foreground block font-mono">
            Pagos en moneda nacional
          </span>
        </Card>

        <Card className="p-4 space-y-1 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <Building2 className="w-4 h-4 text-purple-600" />
            Tasa Oficial BCV
          </div>
          <div className="text-2xl font-bold font-mono text-purple-700">
            {bcvRates.USD.toFixed(2)} Bs./$
          </div>
          <span className="text-[11px] text-muted-foreground block font-mono">
            EUR: {bcvRates.EUR.toFixed(2)} Bs./€
          </span>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <Card className="p-4 space-y-3 shadow-2xs">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por concepto, proveedor/beneficiario o referencia..."
              className="pl-9 pr-8 text-xs"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  startTransition(() => {
                    void (async () => {
                      try {
                        const paymentsData = await BankAccountService.getDirectPayments({
                          search: undefined,
                          method: methodFilter || undefined,
                          currency: currencyFilter || undefined,
                          startDate: startDate || undefined,
                          endDate: endDate || undefined,
                          sourceAccountId: sourceAccountFilter || undefined,
                        });
                        setPayments(paymentsData);
                      } catch {
                        // ignore
                      }
                    })();
                  });
                }}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          <div className="flex flex-wrap items-center gap-2">
            {/* Cuenta Bancaria Origen */}
            <select
              value={sourceAccountFilter}
              onChange={(e) => setSourceAccountFilter(e.target.value)}
              className="h-9 text-xs bg-background border border-input rounded-lg px-2.5 text-foreground font-medium outline-none focus:ring-2 focus:ring-ring cursor-pointer"
              title="Filtrar por Cuenta Bancaria Origen"
            >
              <option value="">Todas las Cuentas Origen</option>
              {bankAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.bankName} - {acc.currency} ({acc.accountNumber ? acc.accountNumber.slice(-4) : "Caja"})
                </option>
              ))}
            </select>

            {/* Método */}
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="h-9 text-xs bg-background border border-input rounded-lg px-2.5 text-foreground font-medium outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            >
              <option value="">Todos los Métodos</option>
              <option value="TRANSFERENCIA">Transferencia</option>
              <option value="PAGO_MOVIL">Pago Móvil</option>
              <option value="EFECTIVO">Efectivo</option>
              <option value="ZELLE">Zelle</option>
            </select>

            {/* Moneda */}
            <select
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value)}
              className="h-9 text-xs bg-background border border-input rounded-lg px-2.5 text-foreground font-medium outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            >
              <option value="">Todas las Monedas</option>
              <option value="USD">USD ($)</option>
              <option value="VED">VED (Bs.)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
        </div>

        {/* Rango de Fechas (Desde / Hasta) */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border text-xs">
          <div className="flex items-center gap-1.5 text-foreground font-semibold">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Rango de Fechas:</span>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-muted-foreground font-medium">Desde:</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-8 text-xs w-36"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-muted-foreground font-medium">Hasta:</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-8 text-xs w-36"
            />
          </div>
          {(startDate || endDate || sourceAccountFilter || methodFilter || currencyFilter || search) && (
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setSourceAccountFilter("");
                setMethodFilter("");
                setCurrencyFilter("");
                setSearch("");
              }}
              className="ml-auto text-xs h-auto p-0 text-primary"
            >
              Limpiar Filtros
            </Button>
          )}
        </div>
      </Card>

      {/* Tabla del Historial */}
      <Card className="overflow-hidden shadow-2xs">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">
              Cargando historial de egresos directos...
            </span>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
              <Wallet className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">
                No se encontraron pagos directos registrados
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Utilice el botón &quot;Registrar Nuevo Egreso&quot; para asentar
                servicios públicos, mantenimiento o compras menores sin orden
                previa.
              </p>
            </div>
            <Button onClick={handleOpenModal} size="sm" className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Registrar Primer Egreso
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="py-3 px-4 text-left">Fecha</TableHead>
                <TableHead className="py-3 px-4 text-left">Concepto</TableHead>
                <TableHead className="py-3 px-4 text-left">Beneficiario</TableHead>
                <TableHead className="py-3 px-4 text-left">Método</TableHead>
                <TableHead className="py-3 px-4 text-left">Cuenta Origen</TableHead>
                <TableHead className="py-3 px-4 text-left">Destino / Ref.</TableHead>
                <TableHead className="py-3 px-4 text-right">Monto Pagado</TableHead>
                <TableHead className="py-3 px-4 text-center">Tasa</TableHead>
                <TableHead className="py-3 px-4 text-right">Equiv. USD</TableHead>
                <TableHead className="py-3 px-4 text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => {
                const pSymbol =
                  p.transactionCurrency === "VED"
                    ? "Bs."
                    : p.transactionCurrency === "EUR"
                      ? "€"
                      : "$";
                const pAmount = Number(p.amountPaid || 0);
                const pEquivUsd = Number(p.equivalentAmountUsd || 0);
                const pRate = Number(p.exchangeRate || 0);

                return (
                  <TableRow key={String(p.id)} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="py-3 px-4 font-mono text-foreground whitespace-nowrap">
                      {p.paymentDate
                        ? new Date(p.paymentDate).toLocaleDateString("es-VE")
                        : "-"}
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <div className="font-semibold text-foreground max-w-[220px]">
                        {p.concept}
                      </div>
                      {p.notes && (
                        <span className="text-[10px] text-muted-foreground block truncate max-w-[220px]">
                          {p.notes}
                        </span>
                      )}
                      {(p.reviewedBy || p.authorizedBy || p.approvedBy) && (
                        <div className="mt-1 text-[10px] text-muted-foreground font-sans space-y-0.5 border-t border-border pt-0.5">
                          {p.reviewedBy && (
                            <div>
                              Rev:{" "}
                              <span className="font-medium text-foreground">
                                {p.reviewedBy}
                              </span>
                            </div>
                          )}
                          {p.authorizedBy && (
                            <div>
                              Aut:{" "}
                              <span className="font-medium text-foreground">
                                {p.authorizedBy}
                              </span>
                            </div>
                          )}
                          {p.approvedBy && (
                            <div>
                              Apr:{" "}
                              <span className="font-medium text-foreground">
                                {p.approvedBy}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <span className="font-medium text-foreground block">
                        {p.beneficiary}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 whitespace-nowrap">
                      {getMethodBadge(p.method)}
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      {p.sourceAccount ? (
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">
                            {p.sourceAccount.bankName}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {p.sourceAccount.type} &bull; ••••
                            {p.sourceAccount.accountNumber
                              ? p.sourceAccount.accountNumber.slice(-4)
                              : "S/N"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">
                          {p.method === "EFECTIVO"
                            ? "Caja / Efectivo"
                            : p.method === "ZELLE"
                              ? "Zelle Directo"
                              : "---"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 px-4 font-mono text-foreground">
                      <div className="font-semibold">
                        {p.referenceNumber || "S/R"}
                      </div>
                      {p.destinationAccount && (
                        <span className="text-[10px] text-muted-foreground block truncate max-w-[140px]">
                          {p.destinationAccount}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right font-mono font-semibold text-foreground whitespace-nowrap">
                      {pSymbol}{" "}
                      {pAmount.toLocaleString("es-VE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                      {p.transactionCurrency === "USD"
                        ? "1.00"
                        : `${pRate.toFixed(2)} Bs.`}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                      ${" "}
                      {pEquivUsd.toLocaleString("es-VE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      USD
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon-sm"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          title="Ver comprobante de egreso"
                        >
                          <Link href={`/admin/financial/payments/${p.id}`}>
                            <Eye className="w-4 h-4" />
                          </Link>
                        </Button>
                        {isAdmin && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDelete(p)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Eliminar registro de pago directo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Modal Registrar Nuevo Egreso con shadcn Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Registrar Nuevo Egreso / Pago Directo
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Desembolso institucional sin Orden de Compra previa
                </p>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmitPayment} className="space-y-4">
            {/* Concepto del Pago */}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase">
                Concepto del Egreso / Pago *
              </Label>
              <Input
                type="text"
                required
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                placeholder="Ej. Pago de Servicio Eléctrico, Mantenimiento de Cavas de Frío..."
                className="text-xs"
              />
            </div>

            {/* Beneficiario / Proveedor con selector inteligente */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase">
                  Beneficiario / Proveedor / RIF *
                </Label>
                {suppliers.length > 0 && (
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Seleccione un proveedor para autocompletar o escriba libremente
                  </span>
                )}
              </div>
              {suppliers.length > 0 && (
                <div className="mb-1">
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
                placeholder="Ej. Comercializadora Médica C.A. (RIF J-12345678-9)..."
                className="text-xs"
              />
            </div>

            {/* Método de Pago */}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase">
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
                className="w-full h-9 bg-background border border-input rounded-lg px-3 py-1 text-xs text-foreground focus:ring-2 focus:ring-ring focus:outline-none cursor-pointer"
              >
                <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                <option value="PAGO_MOVIL">Pago Móvil Interbancario</option>
                <option value="EFECTIVO">Efectivo (Dólares / Bolívares)</option>
                <option value="ZELLE">Zelle (USD)</option>
              </select>
            </div>

            {/* Selector de Cuenta Origen */}
            {(method === "TRANSFERENCIA" || method === "PAGO_MOVIL") && (
              <div className="space-y-1.5">
                <Label htmlFor="directSourceAccountId" className="text-xs uppercase">
                  Cuenta Bancaria Origen *
                </Label>
                <select
                  id="directSourceAccountId"
                  required
                  value={sourceAccountId}
                  onChange={(e) => setSourceAccountId(e.target.value)}
                  className="w-full h-9 bg-background border border-input rounded-lg px-3 py-1 text-xs text-foreground focus:ring-2 focus:ring-ring focus:outline-none cursor-pointer font-mono"
                >
                  <option value="">
                    {loadingAccounts
                      ? "Cargando cuentas bancarias activas..."
                      : "-- Seleccionar Cuenta Bancaria Origen * --"}
                  </option>
                  {bankAccounts
                    .filter((acc) => acc.isActive)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.bankName} - {acc.accountNumber || "S/N"} (
                        {acc.type} - {acc.currency})
                      </option>
                    ))}
                </select>
                {bankAccounts.filter((acc) => acc.isActive).length === 0 &&
                  !loadingAccounts && (
                    <p className="mt-1 text-[11px] text-amber-700">
                      No hay cuentas bancarias activas registradas. Puede
                      crear cuentas en{" "}
                      <Link
                        href="/inventory/settings"
                        className="font-bold underline text-amber-900"
                      >
                        Configuración &gt; Cuentas Institucionales
                      </Link>
                      .
                    </p>
                  )}
              </div>
            )}

            {/* N° Referencia y Fecha de Pago */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase">
                  {method === "EFECTIVO"
                    ? "N° Recibo / Comprobante *"
                    : method === "ZELLE"
                      ? "Referencia Zelle / Titular *"
                      : "N° de Referencia *"}
                </Label>
                <Input
                  type="text"
                  required
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Ej. 10492812"
                  className="text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase">
                  Fecha de Pago *
                </Label>
                <Input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Moneda y Monto Pagado */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase">
                  Moneda del Pago *
                </Label>
                <select
                  value={transactionCurrency}
                  onChange={(e) =>
                    handleCurrencyChange(
                      e.target.value as "USD" | "VED" | "EUR"
                    )
                  }
                  className="w-full h-9 bg-background border border-input rounded-lg px-3 py-1 text-xs text-foreground focus:ring-2 focus:ring-ring focus:outline-none cursor-pointer"
                >
                  <option value="USD">USD ($)</option>
                  <option value="VED">VED (Bs.)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs uppercase">
                  Monto Pagado (
                  {transactionCurrency === "VED"
                    ? "Bs."
                    : transactionCurrency === "EUR"
                      ? "€"
                      : "$"}
                  ) *
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="0.00"
                  className="font-mono font-bold text-xs"
                />
              </div>
            </div>

            {/* Tasa de Cambio */}
            {(transactionCurrency === "VED" ||
              transactionCurrency === "EUR") && (
              <Card className="p-3 bg-muted/30 border-border space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold">
                    Tasa de Cambio a aplicar (Bs./
                    {transactionCurrency === "EUR" ? "€" : "$"})
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    BCV Oficial:{" "}
                    {transactionCurrency === "VED"
                      ? bcvRates.USD.toFixed(2)
                      : bcvRates.EUR.toFixed(2)}{" "}
                    Bs.
                  </span>
                </div>
                <Input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  className="font-mono text-xs"
                />
              </Card>
            )}

            {/* Indicador Reactivo de Equivalente USD */}
            <Card className="p-3.5 bg-emerald-50/60 border-emerald-200 flex justify-between items-center text-xs">
              <span className="font-semibold text-emerald-900">
                Equivalente estimado en USD:
              </span>
              <span className="font-mono text-sm font-bold text-emerald-800">
                $ {dynamicEquivalentUsd.toFixed(2)} USD
              </span>
            </Card>

            {/* Notas / Observaciones */}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase">
                Notas / Observaciones (Opcional)
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detalles sobre la factura recibida, justificación o aprobaciones previas..."
                className="text-xs"
                rows={2}
              />
            </div>

            {/* Firmas de Autorización */}
            <div className="border-t border-border pt-3 space-y-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wide">
                Firmas de Autorización del Egreso
              </CardTitle>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px]">Revisado por</Label>
                  <Input
                    type="text"
                    value={reviewedBy}
                    onChange={(e) => setReviewedBy(e.target.value)}
                    placeholder="Ej. Lic. Ana Pérez"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Autorizado por</Label>
                  <Input
                    type="text"
                    value={authorizedBy}
                    onChange={(e) => setAuthorizedBy(e.target.value)}
                    placeholder="Ej. Dr. Roberto Silva"
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px]">Aprobado por</Label>
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

            {/* Botones de Acción */}
            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={
                  submitting ||
                  !concept.trim() ||
                  !beneficiary.trim() ||
                  !amountPaid ||
                  Number(amountPaid) <= 0 ||
                  !referenceNumber.trim() ||
                  ((method === "TRANSFERENCIA" || method === "PAGO_MOVIL") &&
                    !sourceAccountId)
                }
                className="gap-2"
              >
                {submitting && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                Guardar y Emitir Egreso
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
