"use client";

import { useCallback, useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthService } from "@/services/auth.service";
import { PurchasingClientService } from "@/services/purchasing.service";
import {
  BankAccountService,
  type BankAccountItem,
} from "@/services/bank-account.service";
import { CurrencyService } from "@/services/currency.service";
import type { SupplierDebt, SupplierStatement } from "@/types/purchasing";
import { normalizeText } from "@/components/common/SearchableSelect";
import { toast } from "@/utils/toast";
import {
  AlertCircle,
  Banknote,
  Building2,
  CheckCircle2,
  Eye,
  Loader2,
  PlusCircle,
  RefreshCw,
  X,
  Calendar,
  DollarSign,
  Coins,
  Receipt,
  Printer,
  Landmark,
  Search,
  Filter,
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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function SupplierDebtsPage() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [debts, setDebts] = useState<SupplierDebt[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Búsqueda inteligente y filtros rápidos
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "PAID">("ALL");

  // Tasas de cambio oficiales BCV
  const [bcvRates, setBcvRates] = useState<{
    USD: number;
    EUR: number;
    VED: number;
  }>({
    USD: 75.0,
    EUR: 81.5,
    VED: 1.0,
  });

  // Modal: Estado de Cuenta
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierDebt | null>(null);
  const [statement, setStatement] = useState<SupplierStatement | null>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);

  // Modal: Registrar Pago Unificado
  const [paymentSupplier, setPaymentSupplier] = useState<SupplierDebt | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<
    "TRANSFERENCIA" | "PAGO_MOVIL" | "EFECTIVO" | "ZELLE"
  >("TRANSFERENCIA");
  const [sourceAccountId, setSourceAccountId] = useState("");
  const [transactionCurrency, setTransactionCurrency] = useState<
    "USD" | "VED" | "EUR"
  >("USD");
  const [amountPaid, setAmountPaid] = useState("");
  const [exchangeRate, setExchangeRate] = useState("");
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

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [debtsData, accountsData, ratesData] = await Promise.all([
        PurchasingClientService.getSupplierDebts(),
        BankAccountService.getBankAccounts(true).catch(() => []),
        CurrencyService.getCurrentRates().catch(() => null),
      ]);
      setDebts(debtsData || []);
      setBankAccounts(accountsData || []);
      if (ratesData) {
        setBcvRates({
          USD: Number(ratesData.USD || ratesData.rates?.USD || 75.0),
          EUR: Number(ratesData.EUR || ratesData.rates?.EUR || 81.5),
          VED: 1.0,
        });
      }
    } catch (error) {
      console.error("Error al cargar saldos comerciales:", error);
      setFeedback({
        status: "error",
        message: "No se pudieron consultar las cuentas por pagar.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (!AuthService.isAuthenticated()) {
      router.replace("/login");
      return;
    }
    const init = async () => {
      if (isMounted) await loadData();
    };
    void init();
    return () => {
      isMounted = false;
    };
  }, [router, loadData]);

  // Manejar cambio de moneda y sugerencia de tasa
  const handleCurrencyChange = (curr: "USD" | "VED" | "EUR") => {
    setTransactionCurrency(curr);
    if (curr === "VED") {
      setExchangeRate(bcvRates.USD.toString());
    } else if (curr === "EUR") {
      setExchangeRate((bcvRates.EUR / bcvRates.USD).toFixed(4));
    } else {
      setExchangeRate("1.0");
    }
  };

  // Abrir modal de pago inicializando formulario
  const handleOpenPaymentModal = (debt: SupplierDebt) => {
    setPaymentSupplier(debt);
    setPaymentMethod("TRANSFERENCIA");
    setSourceAccountId("");
    setTransactionCurrency("USD");
    setAmountPaid("");
    setExchangeRate("1.0");
    setReferenceNumber("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setReviewedBy("");
    setAuthorizedBy("");
    setApprovedBy("");
    setFeedback(null);
  };

  // Cálculos dinámicos de equivalencia en el modal de pago
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
    dynamicEquivalentUsd = parsedAmount * parsedRate;
    dynamicEquivalentBs = dynamicEquivalentUsd * bcvRates.USD;
  }

  // Registrar Pago Unificado
  const handlePayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!paymentSupplier) return;

    if (parsedAmount <= 0) {
      setFeedback({
        status: "error",
        message: "El monto pagado debe ser mayor a 0.",
      });
      return;
    }

    if (!referenceNumber.trim()) {
      setFeedback({
        status: "error",
        message: "Debe ingresar el número de referencia o recibo.",
      });
      return;
    }

    if (
      (paymentMethod === "TRANSFERENCIA" || paymentMethod === "PAGO_MOVIL") &&
      !sourceAccountId
    ) {
      setFeedback({
        status: "error",
        message: "Debe seleccionar la cuenta bancaria origen del desembolso.",
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      await PurchasingClientService.registerPayment({
        supplierId: paymentSupplier.id,
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

      const successMsg = `Pago de ${transactionCurrency} ${parsedAmount.toFixed(
        2
      )} registrado exitosamente para ${paymentSupplier.name}.`;
      setFeedback({
        status: "success",
        message: successMsg,
      });
      toast.success(successMsg);
      setPaymentSupplier(null);
      await loadData();
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

  // Abrir Estado de Cuenta
  const openStatement = async (supplier: SupplierDebt) => {
    setSelectedSupplier(supplier);
    setLoadingStatement(true);
    try {
      const data = await PurchasingClientService.getSupplierStatement(supplier.id);
      setStatement(data);
    } catch {
      setFeedback({
        status: "error",
        message: "Error al cargar el estado de cuenta del proveedor.",
      });
    } finally {
      setLoadingStatement(false);
    }
  };

  const totalDebt = debts.reduce((acc, d) => acc + d.balanceUsd, 0);
  const totalPaid = debts.reduce((acc, d) => acc + d.totalPaidUsd, 0);
  const pendingSuppliers = debts.filter((d) => d.balanceUsd > 0.009).length;

  // Filtrado inteligente de proveedores
  const filteredDebts = debts.filter((d) => {
    if (statusFilter === "PENDING" && d.balanceUsd <= 0.009) return false;
    if (statusFilter === "PAID" && d.balanceUsd > 0.009) return false;

    if (!searchQuery.trim()) return true;
    const term = normalizeText(searchQuery.trim());
    const nameMatch = normalizeText(d.name || "").includes(term);
    const taxMatch = normalizeText(d.rifOrId || "").includes(term);
    return nameMatch || taxMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-mono">
              Finanzas & Proveedores
            </Badge>
            <span className="text-xs font-mono font-medium text-muted-foreground">
              Control de Deudas
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 mt-1">
            <Banknote className="h-6 w-6 text-emerald-600" />
            Pagos & Cuentas por Pagar
          </h1>
          <p className="text-xs text-muted-foreground">
            Balances comerciales, historial de pagos multimoneda y estado de cuenta de proveedores
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => void loadData()}
          title="Actualizar listado de saldos"
          className="self-end sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {feedback && (
        <Alert variant={feedback.status === "success" ? "success" : "destructive"}>
          {feedback.status === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle>{feedback.status === "success" ? "Operación Exitosa" : "Error"}</AlertTitle>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}

      {/* Tarjetas Estadísticas */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="p-4 space-y-1 shadow-2xs">
          <span className="text-xs font-semibold uppercase text-destructive flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" /> Deuda Acumulada (USD)
          </span>
          <div className="text-2xl font-bold font-mono text-destructive">
            ${" "}
            {totalDebt.toLocaleString("es-VE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <span className="text-[11px] text-muted-foreground font-mono block">
            ≈ Bs. {(totalDebt * bcvRates.USD).toLocaleString("es-VE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </Card>

        <Card className="p-4 space-y-1 shadow-2xs">
          <span className="text-xs font-semibold uppercase text-amber-600 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Proveedores con Saldo
          </span>
          <div className="text-2xl font-bold font-mono text-amber-700">
            {pendingSuppliers}
          </div>
          <span className="text-[11px] text-muted-foreground block">
            De un total de {debts.length} registrados
          </span>
        </Card>

        <Card className="p-4 space-y-1 shadow-2xs">
          <span className="text-xs font-semibold uppercase text-emerald-600 flex items-center gap-1.5">
            <Coins className="w-3.5 h-3.5" /> Total Pagado este Mes
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-700">
            ${" "}
            {totalPaid.toLocaleString("es-VE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <span className="text-[11px] text-muted-foreground block">
            Amortizaciones consolidadas
          </span>
        </Card>

        <Card className="p-4 space-y-1 shadow-2xs">
          <span className="text-xs font-semibold uppercase text-purple-600 flex items-center gap-1.5">
            <Landmark className="w-3.5 h-3.5" /> Tasa Oficial BCV
          </span>
          <div className="text-2xl font-bold font-mono text-purple-700">
            {bcvRates.USD.toFixed(2)} Bs./$
          </div>
          <span className="text-[11px] text-muted-foreground block font-mono">
            EUR: {bcvRates.EUR.toFixed(2)} Bs./€
          </span>
        </Card>
      </div>

      {/* Barra de Búsqueda Inteligente y Filtros Rápidos */}
      <Card className="p-3.5 shadow-2xs space-y-2.5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar proveedor por nombre, RIF/documento, contacto, correo o teléfono..."
              className="pl-9 pr-8 text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Limpiar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Estado:
            </span>
            <Button
              type="button"
              variant={statusFilter === "ALL" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("ALL")}
              className="h-8 text-xs px-2.5"
            >
              Todos ({debts.length})
            </Button>
            <Button
              type="button"
              variant={statusFilter === "PENDING" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("PENDING")}
              className="h-8 text-xs px-2.5"
            >
              Con Saldo ({pendingSuppliers})
            </Button>
            <Button
              type="button"
              variant={statusFilter === "PAID" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("PAID")}
              className="h-8 text-xs px-2.5"
            >
              Solventes ({debts.length - pendingSuppliers})
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabla de Proveedores y Deuda */}
      <Card className="overflow-hidden shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="px-4 py-3">Proveedor</TableHead>
              <TableHead className="px-4 py-3 text-right">Comprado (USD)</TableHead>
              <TableHead className="px-4 py-3 text-right">Pagado (USD)</TableHead>
              <TableHead className="px-4 py-3 text-right">Saldo Deuda</TableHead>
              <TableHead className="px-4 py-3 text-center">Estado</TableHead>
              <TableHead className="px-4 py-3 text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-primary" />
                  Cargando cuentas comerciales y estados financieros...
                </TableCell>
              </TableRow>
            ) : filteredDebts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  {searchQuery || statusFilter !== "ALL"
                    ? "No se encontraron proveedores que coincidan con los criterios de búsqueda."
                    : "No se encontraron proveedores ni deudas comerciales registradas."}
                </TableCell>
              </TableRow>
            ) : (
              filteredDebts.map((debt) => (
                <TableRow key={debt.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{debt.name}</span>
                    </div>
                    <div className="ml-6 font-mono text-[10px] text-muted-foreground">
                      RIF / ID: {debt.rifOrId}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right font-mono font-semibold text-foreground">
                    $ {debt.totalPurchasedUsd.toFixed(2)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right font-mono font-semibold text-emerald-700">
                    $ {debt.totalPaidUsd.toFixed(2)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right font-mono font-bold text-destructive">
                    $ {debt.balanceUsd.toFixed(2)}
                    {debt.balanceUsd > 0.009 && (
                      <span className="block text-[10px] text-muted-foreground font-normal">
                        ≈ Bs. {(debt.balanceUsd * bcvRates.USD).toFixed(2)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center">
                    {debt.status === "SOLVENTE" ? (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Solvente
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        Con saldo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handleOpenPaymentModal(debt)}
                        className="gap-1 h-7 text-xs font-semibold"
                        title="Registrar pago a este proveedor"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        Registrar Pago
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void openStatement(debt)}
                        className="gap-1 h-7 text-xs font-semibold"
                        title="Consultar estado de cuenta y órdenes"
                      >
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        Estado
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modal: Registrar Pago Unificado con shadcn Dialog */}
      <Dialog
        open={!!paymentSupplier}
        onOpenChange={(open) => {
          if (!open) setPaymentSupplier(null);
        }}
      >
        <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                <Banknote className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="font-bold text-foreground text-base">
                  Registrar Pago a Proveedor
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  {paymentSupplier?.name} · RIF: {paymentSupplier?.rifOrId}
                </p>
              </div>
            </div>
          </DialogHeader>

          {paymentSupplier && (
            <form onSubmit={handlePayment} className="space-y-4">
              {/* Saldo actual */}
              <Card className="p-3 bg-muted/30 border-border flex items-center justify-between shadow-2xs">
                <div>
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase block">
                    Deuda Pendiente Actual:
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    ≈ Bs. {(paymentSupplier.balanceUsd * bcvRates.USD).toFixed(2)}
                  </span>
                </div>
                <strong className="text-xl font-bold font-mono text-destructive">
                  $ {paymentSupplier.balanceUsd.toFixed(2)} USD
                </strong>
              </Card>

              {/* Selector de Moneda y Tasa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase">
                    Moneda de Pago *
                  </Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(["USD", "VED", "EUR"] as const).map((curr) => (
                      <Button
                        key={curr}
                        type="button"
                        size="sm"
                        variant={transactionCurrency === curr ? "default" : "outline"}
                        onClick={() => handleCurrencyChange(curr)}
                        className={`text-xs font-bold ${
                          transactionCurrency === curr
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : ""
                        }`}
                      >
                        {curr === "VED" ? "Bs." : curr}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs uppercase">
                    Tasa de Cambio (Bs./Divisa) *
                  </Label>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    required
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    placeholder="Tasa BCV del día..."
                    className="font-mono font-bold text-xs"
                  />
                  <span className="text-[10px] text-muted-foreground block font-mono">
                    Oficial BCV: {bcvRates.USD.toFixed(2)} Bs./$
                  </span>
                </div>
              </div>

              {/* Monto pagado y desglose en tiempo real */}
              <div className="space-y-2">
                <Label className="text-xs uppercase">
                  Monto Pagado ({transactionCurrency === "VED" ? "Bs." : transactionCurrency === "EUR" ? "€" : "$"}) *
                </Label>
                <Input
                  required
                  min="0.01"
                  step="0.01"
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="0.00"
                  className="text-sm font-mono font-bold"
                />

                {parsedAmount > 0 && (
                  <Card className="p-3 bg-emerald-50/60 border-emerald-200 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[11px] font-semibold text-emerald-800 uppercase block">
                        Amortización Deuda (USD):
                      </span>
                      <strong className="text-base font-bold font-mono text-emerald-900">
                        $ {dynamicEquivalentUsd.toFixed(2)} USD
                      </strong>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold text-emerald-800 uppercase block">
                        Contravalor Legal en Bolívares:
                      </span>
                      <strong className="text-base font-bold font-mono text-foreground">
                        Bs. {dynamicEquivalentBs.toFixed(2)}
                      </strong>
                    </div>
                  </Card>
                )}
              </div>

              {/* Método de Pago y Cuenta Origen */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase">
                    Método de Pago *
                  </Label>
                  <select
                    value={paymentMethod}
                    onChange={(e) =>
                      setPaymentMethod(
                        e.target.value as "TRANSFERENCIA" | "PAGO_MOVIL" | "EFECTIVO" | "ZELLE"
                      )
                    }
                    className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                  >
                    <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                    <option value="PAGO_MOVIL">Pago Móvil</option>
                    <option value="EFECTIVO">Efectivo / Caja Chica</option>
                    <option value="ZELLE">Zelle Institucional</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs uppercase">
                    Cuenta Origen Institucional *
                  </Label>
                  {paymentMethod === "EFECTIVO" ? (
                    <div className="h-9 px-3 flex items-center border border-border rounded-lg bg-muted/40 text-xs text-muted-foreground">
                      Caja Chica / Efectivo Físico
                    </div>
                  ) : (
                    <select
                      value={sourceAccountId}
                      onChange={(e) => setSourceAccountId(e.target.value)}
                      required={paymentMethod === "TRANSFERENCIA" || paymentMethod === "PAGO_MOVIL"}
                      className="w-full h-9 rounded-lg border border-input bg-background px-3 py-1 text-xs font-medium text-foreground outline-none focus:ring-2 focus:ring-ring cursor-pointer"
                    >
                      <option value="">-- Seleccionar cuenta origen --</option>
                      {bankAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.bankName} - {acc.currency} (••••
                          {acc.accountNumber ? acc.accountNumber.slice(-4) : "Caja"})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Referencia y Fecha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase">
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
                  <Label className="text-xs uppercase">
                    Fecha de Pago (Permite fecha valor) *
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

              {/* Notas / Observaciones */}
              <div className="space-y-1.5">
                <Label className="text-xs uppercase">
                  Notas / Factura Relacionada
                </Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Observaciones de pago, N° de factura fiscal..."
                  className="text-xs"
                />
              </div>

              {/* Bloque de Firmas Institucionales */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Revisado Por
                  </Label>
                  <Input
                    type="text"
                    value={reviewedBy}
                    onChange={(e) => setReviewedBy(e.target.value)}
                    placeholder="Nombre..."
                    className="h-8 text-[11px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Autorizado Por
                  </Label>
                  <Input
                    type="text"
                    value={authorizedBy}
                    onChange={(e) => setAuthorizedBy(e.target.value)}
                    placeholder="Nombre..."
                    className="h-8 text-[11px]"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase font-bold text-muted-foreground">
                    Aprobado Por
                  </Label>
                  <Input
                    type="text"
                    value={approvedBy}
                    onChange={(e) => setApprovedBy(e.target.value)}
                    placeholder="Nombre..."
                    className="h-8 text-[11px]"
                  />
                </div>
              </div>

              <DialogFooter className="pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPaymentSupplier(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="success"
                  disabled={submitting}
                  className="gap-2"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Registrar Pago
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Estado de Cuenta Detallado con shadcn Dialog */}
      <Dialog
        open={!!selectedSupplier}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSupplier(null);
            setStatement(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div>
                <DialogTitle className="font-bold text-foreground text-lg">
                  Estado de Cuenta Financiero
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  {selectedSupplier?.name} · RIF: {selectedSupplier?.rifOrId}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="gap-1.5 text-xs"
                title="Imprimir estado de cuenta"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir
              </Button>
            </div>
          </DialogHeader>

          {loadingStatement ? (
            <div className="py-16 text-center text-muted-foreground">
              <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-primary" />
              Consultando órdenes y amortizaciones...
            </div>
          ) : statement ? (
            <div className="space-y-4">
              {/* Resumen Comercial */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <Card className="p-3.5 shadow-2xs">
                  <span className="font-semibold text-muted-foreground uppercase tracking-wider block text-[11px]">
                    Total Comprado (USD)
                  </span>
                  <strong className="block text-xl font-bold font-mono text-foreground mt-1">
                    $ {statement.totalPurchasedUsd.toFixed(2)}
                  </strong>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    ≈ Bs. {(statement.totalPurchasedUsd * bcvRates.USD).toFixed(2)}
                  </span>
                </Card>

                <Card className="p-3.5 bg-emerald-50/50 border-emerald-200 shadow-2xs">
                  <span className="font-semibold text-emerald-700 uppercase tracking-wider block text-[11px]">
                    Total Pagado (USD)
                  </span>
                  <strong className="block text-xl font-bold font-mono text-emerald-800 mt-1">
                    $ {statement.totalPaidUsd.toFixed(2)}
                  </strong>
                  <span className="text-[10px] text-emerald-600/80 font-mono">
                    ≈ Bs. {(statement.totalPaidUsd * bcvRates.USD).toFixed(2)}
                  </span>
                </Card>

                <Card className="p-3.5 bg-red-50/50 border-red-200 shadow-2xs">
                  <span className="font-semibold text-destructive uppercase tracking-wider block text-[11px]">
                    Saldo Pendiente
                  </span>
                  <strong className="block text-xl font-bold font-mono text-destructive mt-1">
                    $ {statement.balanceUsd.toFixed(2)}
                  </strong>
                  <span className="text-[10px] text-destructive/80 font-mono">
                    ≈ Bs. {(statement.balanceUsd * bcvRates.USD).toFixed(2)}
                  </span>
                </Card>
              </div>

              {/* Desglose de Órdenes */}
              <div className="space-y-3">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  Órdenes de Compra y Amortizaciones Registradas
                </CardTitle>

                {statement.orders.length === 0 ? (
                  <div className="p-8 text-center bg-muted/40 rounded-xl text-xs text-muted-foreground">
                    No hay órdenes registradas para este proveedor.
                  </div>
                ) : (
                  statement.orders.map((order) => (
                    <Card
                      key={order.id}
                      className="p-4 text-xs shadow-2xs space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 font-semibold text-foreground pb-2 border-b border-border">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-primary font-bold">
                            Orden #{order.orderNumber}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-normal">
                            (
                            {order.createdAt
                              ? new Date(order.createdAt).toLocaleDateString()
                              : "-"}
                            )
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">
                            Total:{" "}
                            <strong className="font-mono text-foreground">
                              $ {order.totalUsd?.toFixed(2) ?? Number(order.total).toFixed(2)}
                            </strong>
                          </span>
                          <span className="text-destructive font-mono font-bold">
                            Pendiente: $ {order.balanceUsd?.toFixed(2) ?? "0.00"}
                          </span>
                        </div>
                      </div>

                      {/* Pagos de la orden */}
                      {order.payments && order.payments.length > 0 ? (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                            Amortizaciones:
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {order.payments.map((p, idx) => (
                              <Card
                                key={p.id || idx}
                                className="p-2 bg-muted/30 border-border text-[11px] flex items-center justify-between shadow-none"
                              >
                                <div>
                                  <span className="font-semibold text-foreground">
                                    {p.paymentMethod}
                                  </span>
                                  <span className="text-muted-foreground block text-[10px]">
                                    {p.paymentDate
                                      ? new Date(p.paymentDate).toLocaleDateString()
                                      : "Sin fecha"}
                                  </span>
                                </div>
                                <div className="text-right font-mono font-bold text-emerald-700">
                                  $ {Number(p.amount || 0).toFixed(2)}
                                </div>
                              </Card>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic block">
                          Sin pagos aplicados aún.
                        </span>
                      )}
                    </Card>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
