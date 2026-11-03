"use client";

import { useCallback, useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthService } from "@/services/auth.service";
import { useDebounce } from "@/hooks/use-debounce";
import { usePagination } from "@/hooks/use-pagination";
import { TablePagination } from "@/components/common/TablePagination";
import { PurchasingClientService } from "@/services/purchasing.service";
import {
  BankAccountService,
  type BankAccountItem,
} from "@/services/bank-account.service";
import { CurrencyService } from "@/services/currency.service";
import type { SupplierDebt, SupplierStatement } from "@/types/purchasing";
import {
  AlertCircle,
  Banknote,
  Building2,
  CheckCircle2,
  Coins,
  DollarSign,
  Eye,
  Landmark,
  Loader2,
  PlusCircle,
  Printer,
  Receipt,
  RefreshCw,
  Search,
  Wallet,
  X,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/utils/toast";

const PAYMENT_METHODS = [
  ["TRANSFERENCIA", "Transferencia Bancaria"],
  ["PAGO_MOVIL", "Pago Móvil"],
  ["EFECTIVO", "Efectivo"],
  ["ZELLE", "Zelle (USD)"],
] as const;

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export default function SupplierDebtsPage() {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Estados principales
  const [debts, setDebts] = useState<SupplierDebt[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Búsqueda inteligente y filtros rápidos
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 350);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "PAID">("ALL");

  // Tasas de cambio oficiales BCV
  const [bcvRates, setBcvRates] = useState<{ USD: number; EUR: number }>({
    USD: 75.0,
    EUR: 81.5,
  });

  // Modal: Estado de Cuenta
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierDebt | null>(null);
  const [statement, setStatement] = useState<SupplierStatement | null>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);

  // Modal: Registrar Pago Unificado
  const [paymentSupplier, setPaymentSupplier] = useState<SupplierDebt | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("TRANSFERENCIA");
  const [sourceAccountId, setSourceAccountId] = useState<string>("");
  const [transactionCurrency, setTransactionCurrency] = useState<"USD" | "VED" | "EUR">("USD");
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [exchangeRate, setExchangeRate] = useState<string>("1.0");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [paymentDate, setPaymentDate] = useState(
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

  // Carga inicial y recarga
  const loadData = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const [debtsData, accountsData, ratesData] = await Promise.all([
        PurchasingClientService.getSupplierDebts(),
        BankAccountService.getBankAccounts(true),
        CurrencyService.getCurrentRates().catch(() => null),
      ]);

      setDebts(debtsData);
      setBankAccounts(accountsData);

      if (ratesData) {
        setBcvRates({
          USD: Number(ratesData.USD || ratesData.rates?.USD || 75.0),
          EUR: Number(ratesData.EUR || ratesData.rates?.EUR || 81.5),
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
      setExchangeRate(bcvRates.EUR.toString());
    } else {
      setExchangeRate("1.0");
    }
  };

  // Abrir modal de pago inicializando formulario
  const handleOpenPaymentModal = (debt: SupplierDebt) => {
    setPaymentSupplier(debt);
    setPaymentMethod("TRANSFERENCIA");
    setSourceAccountId("");
    const defaultCurr: "VED" | "USD" = ((debt.balanceBs || 0) > 0.01 && (!debt.balanceUsd || debt.balanceUsd <= 0.01)) ? "VED" : "USD";
    setTransactionCurrency(defaultCurr);
    setAmountPaid("");
    setExchangeRate(defaultCurr === "VED" ? bcvRates.USD.toString() : "1.0");
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
    const rateEur = parsedRate > 0 ? parsedRate : bcvRates.EUR;
    dynamicEquivalentBs = parsedAmount * rateEur;
    dynamicEquivalentUsd = bcvRates.USD > 0 ? dynamicEquivalentBs / bcvRates.USD : parsedAmount;
  }

  // Deuda total efectiva consolidada del proveedor seleccionado en el modal
  const modalBalanceBs = paymentSupplier?.balanceBs || 0;
  const modalBalanceUsd = paymentSupplier?.balanceUsd || 0;
  const modalBalanceEur = paymentSupplier?.balanceEur || 0;

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
    modalBalanceBs +
    modalBalanceUsd * rateUsd +
    modalBalanceEur * rateEur;

  const effectiveDebtUsd =
    modalBalanceUsd +
    (rateUsd > 0 ? modalBalanceBs / rateUsd : 0) +
    (rateUsd > 0 ? (modalBalanceEur * rateEur) / rateUsd : 0);

  const effectiveDebtEur =
    modalBalanceEur +
    (rateEur > 0 ? (modalBalanceBs + modalBalanceUsd * rateUsd) / rateEur : 0);

  const remainingBalanceAfterPayBs = Math.max(0, effectiveDebtBs - dynamicEquivalentBs);
  const remainingBalanceAfterPayUsd = Math.max(0, effectiveDebtUsd - dynamicEquivalentUsd);

  const handleFillRemainingDebt = (curr?: "VED" | "USD" | "EUR") => {
    const targetCurr = curr || transactionCurrency;
    if (targetCurr === "VED") {
      setAmountPaid(effectiveDebtBs.toFixed(2));
    } else if (targetCurr === "USD") {
      setAmountPaid(effectiveDebtUsd.toFixed(2));
    } else if (targetCurr === "EUR") {
      setAmountPaid(effectiveDebtEur.toFixed(2));
    }
  };

  // Registrar Pago Unificado
  const handlePayment = async (event: FormEvent) => {
    event.preventDefault();
    if (!paymentSupplier || parsedAmount <= 0) return;

    if (
      (paymentMethod === "TRANSFERENCIA" || paymentMethod === "PAGO_MOVIL") &&
      !sourceAccountId
    ) {
      toast.error("Debe seleccionar la cuenta bancaria origen del desembolso.");
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

  // Totales de las 3 Cuentas por Proveedor
  const totalDebtUsd = debts.reduce((acc, d) => acc + (d.balanceUsd || 0), 0);
  const totalDebtBs = debts.reduce((acc, d) => acc + (d.balanceBs || 0), 0);
  const totalDebtEur = debts.reduce((acc, d) => acc + (d.balanceEur || 0), 0);

  const totalPaidUsd = debts.reduce((acc, d) => acc + (d.totalPaidUsd || 0), 0);
  const totalPaidBs = debts.reduce((acc, d) => acc + (d.totalPaidBs || 0), 0);
  const totalPaidEur = debts.reduce((acc, d) => acc + (d.totalPaidEur || 0), 0);

  const hasPendingDebt = (d: SupplierDebt) =>
    (d.balanceUsd || 0) > 0.009 || (d.balanceBs || 0) > 0.009 || (d.balanceEur || 0) > 0.009;

  const pendingSuppliers = debts.filter(hasPendingDebt).length;

  // Filtrado inteligente de proveedores
  const filteredDebts = debts.filter((d) => {
    if (statusFilter === "PENDING" && !hasPendingDebt(d)) return false;
    if (statusFilter === "PAID" && hasPendingDebt(d)) return false;

    if (!debouncedSearchQuery.trim()) return true;
    const term = normalizeText(debouncedSearchQuery.trim());
    const nameMatch = normalizeText(d.name || "").includes(term);
    const taxMatch = normalizeText(d.rifOrId || "").includes(term);
    return nameMatch || taxMatch;
  });

  // Paginación
  const pagination = usePagination(filteredDebts, { initialPageSize: 10 });
  const { resetPage } = pagination;

  useEffect(() => {
    resetPage();
  }, [debouncedSearchQuery, statusFilter, resetPage]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="indigo" className="text-[10px] font-mono shadow-2xs font-medium">
              Finanzas & Tesorería
            </Badge>
            <span className="text-xs font-mono font-medium text-muted-foreground">
              Cuentas por Pagar Multi-Moneda
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 mt-1">
            <Banknote className="h-6 w-6 text-emerald-600" />
            Cuentas por Pagar a Proveedores
          </h1>
          <p className="text-xs text-muted-foreground">
            Balances comerciales en las 3 cuentas (Bs., USD, EUR), historial de amortizaciones y auditoría de pagos
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          <Badge variant="rose" className="gap-1.5 py-1 px-3 text-xs shadow-2xs font-medium">
            <span className="font-bold">{pendingSuppliers}</span>
            <span>con saldo</span>
          </Badge>
          <Badge variant="success" className="gap-1.5 py-1 px-3 text-xs shadow-2xs font-medium">
            <span className="font-bold">{debts.length - pendingSuppliers}</span>
            <span>solventes</span>
          </Badge>
          <Badge variant="purple" className="gap-1.5 py-1 px-3 text-xs shadow-2xs font-medium font-mono">
            <span>BCV: {bcvRates.USD.toFixed(2)} Bs./$ · {bcvRates.EUR.toFixed(2)} Bs./€</span>
          </Badge>

          <Button
            variant="outline"
            size="icon"
            onClick={() => void loadData()}
            title="Actualizar listado de saldos"
            className="ml-1 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>

          <Button
            asChild
            size="sm"
            className="gap-1.5 ml-1 text-xs cursor-pointer shadow-xs"
          >
            <Link href="/admin/financial/payments">
              <Wallet className="w-3.5 h-3.5" />
              Egresos / Pagos Directos
            </Link>
          </Button>
        </div>
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

      {/* Tarjetas Estadísticas: Las 3 Cuentas por Proveedor */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cuenta USD */}
        <Card className="p-4 space-y-1.5 shadow-2xs border-blue-200/70 bg-blue-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-blue-800 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Cuenta Dólares (USD)
            </span>
            <Badge variant="indigo" className="text-[10px] font-mono py-0 px-1.5">USD</Badge>
          </div>
          <div className="text-2xl font-bold font-mono text-blue-950">
            $ {totalDebtUsd.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-muted-foreground font-mono flex items-center justify-between pt-1 border-t border-blue-100">
            <span>Pagado: ${totalPaidUsd.toFixed(2)}</span>
            <span className="text-blue-700 font-semibold">Saldo Activo</span>
          </div>
        </Card>

        {/* Cuenta Bolívares */}
        <Card className="p-4 space-y-1.5 shadow-2xs border-emerald-200/70 bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-emerald-800 flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5" /> Cuenta Bolívares (Bs.)
            </span>
            <Badge variant="success" className="text-[10px] font-mono py-0 px-1.5">Bs.</Badge>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-950">
            Bs. {totalDebtBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-muted-foreground font-mono flex items-center justify-between pt-1 border-t border-emerald-100">
            <span>≈ ${bcvRates.USD > 0 ? (totalDebtBs / bcvRates.USD).toFixed(2) : "0.00"} USD</span>
            <span>Pagado: Bs. {totalPaidBs.toFixed(2)}</span>
          </div>
        </Card>

        {/* Cuenta Euros */}
        <Card className="p-4 space-y-1.5 shadow-2xs border-purple-200/70 bg-purple-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-purple-800 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5" /> Cuenta Euros (EUR)
            </span>
            <Badge variant="purple" className="text-[10px] font-mono py-0 px-1.5">EUR</Badge>
          </div>
          <div className="text-2xl font-bold font-mono text-purple-950">
            € {totalDebtEur.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-muted-foreground font-mono flex items-center justify-between pt-1 border-t border-purple-100">
            <span>Pagado: € {totalPaidEur.toFixed(2)}</span>
            <span className="text-purple-700 font-semibold">{bcvRates.EUR.toFixed(2)} Bs./€</span>
          </div>
        </Card>

        {/* Proveedores con Saldo */}
        <Card className="p-4 space-y-1.5 shadow-2xs border-amber-200/70 bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-amber-800 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Proveedores con Deuda
            </span>
            <Badge variant="rose" className="text-[10px] font-mono py-0 px-1.5">{pendingSuppliers} pendientes</Badge>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-950">
            {pendingSuppliers} <span className="text-xs font-normal text-muted-foreground">de {debts.length} registrados</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-medium pt-1 border-t border-amber-100">
            {debts.length - pendingSuppliers} solventes en todas las cuentas
          </div>
        </Card>
      </div>

      {/* Barra de Búsqueda Inteligente y Filtros Rápidos */}
      <Card className="p-3.5 shadow-2xs space-y-2.5">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por razón social, nombre comercial o RIF / Cédula..."
              className="pl-9 text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <Button
              type="button"
              variant={statusFilter === "ALL" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("ALL")}
              className="h-8 text-xs px-2.5 cursor-pointer"
            >
              Todos ({debts.length})
            </Button>
            <Button
              type="button"
              variant={statusFilter === "PENDING" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("PENDING")}
              className="h-8 text-xs px-2.5 cursor-pointer text-amber-600 dark:text-amber-400"
            >
              Con Deuda ({pendingSuppliers})
            </Button>
            <Button
              type="button"
              variant={statusFilter === "PAID" ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter("PAID")}
              className="h-8 text-xs px-2.5 cursor-pointer text-emerald-600 dark:text-emerald-400"
            >
              Solventes ({debts.length - pendingSuppliers})
            </Button>

            {(searchQuery || statusFilter !== "ALL") && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                }}
                className="h-8 text-xs px-2.5 text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
                title="Limpiar filtros"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpiar filtros</span>
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Tabla de Proveedores y Deuda con las 3 Cuentas (Bs., USD, EUR) */}
      <Card className="overflow-hidden shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="px-4 py-3">Proveedor / RIF</TableHead>
              <TableHead className="px-4 py-3 text-right">
                <div className="font-semibold text-emerald-800 dark:text-emerald-400">Cuenta Bolívares (Bs.)</div>
                <div className="text-[10px] font-normal text-muted-foreground font-mono">Comprado · Pagado · Saldo</div>
              </TableHead>
              <TableHead className="px-4 py-3 text-right">
                <div className="font-semibold text-blue-800 dark:text-blue-400">Cuenta Dólares (USD)</div>
                <div className="text-[10px] font-normal text-muted-foreground font-mono">Comprado · Pagado · Saldo</div>
              </TableHead>
              <TableHead className="px-4 py-3 text-right">
                <div className="font-semibold text-purple-800 dark:text-purple-400">Cuenta Euros (EUR)</div>
                <div className="text-[10px] font-normal text-muted-foreground font-mono">Comprado · Pagado · Saldo</div>
              </TableHead>
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
              pagination.paginatedItems.map((debt) => (
                <TableRow key={debt.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{debt.name}</span>
                    </div>
                    <div className="ml-6 font-mono text-[10px] text-muted-foreground">
                      RIF / Cédula: {debt.rifOrId}
                    </div>
                  </TableCell>

                  {/* Cuenta Bolívares */}
                  <TableCell className="px-4 py-3 text-right font-mono">
                    {(debt.balanceBs || 0) > 0.009 ? (
                      <div className="font-bold text-destructive text-xs">
                        Bs. {(debt.balanceBs || 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-xs">Bs. 0.00</div>
                    )}
                    <div className="text-[10px] text-muted-foreground">
                      C: {(debt.totalPurchasedBs || 0).toFixed(2)} | P: {(debt.totalPaidBs || 0).toFixed(2)}
                    </div>
                  </TableCell>

                  {/* Cuenta Dólares */}
                  <TableCell className="px-4 py-3 text-right font-mono">
                    {(debt.balanceUsd || 0) > 0.009 ? (
                      <div className="font-bold text-destructive text-xs">
                        $ {(debt.balanceUsd || 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-xs">$ 0.00</div>
                    )}
                    <div className="text-[10px] text-muted-foreground">
                      C: {(debt.totalPurchasedUsd || 0).toFixed(2)} | P: {(debt.totalPaidUsd || 0).toFixed(2)}
                    </div>
                  </TableCell>

                  {/* Cuenta Euros */}
                  <TableCell className="px-4 py-3 text-right font-mono">
                    {(debt.balanceEur || 0) > 0.009 ? (
                      <div className="font-bold text-destructive text-xs">
                        € {(debt.balanceEur || 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-xs">€ 0.00</div>
                    )}
                    <div className="text-[10px] text-muted-foreground">
                      C: {(debt.totalPurchasedEur || 0).toFixed(2)} | P: {(debt.totalPaidEur || 0).toFixed(2)}
                    </div>
                  </TableCell>

                  {/* Estado Consolidado */}
                  <TableCell className="px-4 py-3 text-center">
                    {!hasPendingDebt(debt) ? (
                      <Badge variant="success" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Solvente
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        Con deuda
                      </Badge>
                    )}
                  </TableCell>

                  {/* Acciones */}
                  <TableCell className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <Button
                        size="sm"
                        variant="success"
                        onClick={() => handleOpenPaymentModal(debt)}
                        className="gap-1 h-7 text-xs font-semibold cursor-pointer"
                        title="Registrar pago a este proveedor"
                      >
                        <PlusCircle className="h-3.5 w-3.5" />
                        Pagar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void openStatement(debt)}
                        className="gap-1 h-7 text-xs font-semibold cursor-pointer"
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
        <TablePagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
          pageSizeOptions={[10, 25, 50, 100]}
          entityName="cuentas por pagar"
        />
      </Card>

      {/* Modal: Registrar Pago Unificado con shadcn Dialog */}
      <Dialog
        open={!!paymentSupplier}
        onOpenChange={(open) => {
          if (!open) setPaymentSupplier(null);
        }}
      >
        <DialogContent className="max-w-3xl md:max-w-4xl w-[95vw] max-h-[92vh] overflow-y-auto p-4 sm:p-6">
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
              {/* Información de Saldos Pendientes del Proveedor */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-muted/40 rounded-xl border border-border">
                {/* Deuda en Bolívares */}
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">
                      Deuda en Bolívares
                    </span>
                    <Badge variant="success" className="text-[10px] font-mono py-0">Bs.</Badge>
                  </div>
                  <div className="text-xl font-black font-mono text-emerald-950 dark:text-emerald-200 mt-1">
                    Bs. {effectiveDebtBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
                    {modalBalanceBs > 0.01 ? `Facturado directo: Bs. ${modalBalanceBs.toFixed(2)}` : `Tasa ref: ${effectiveRateForBs.toFixed(2)} Bs./$`}
                  </span>
                </div>

                {/* Deuda en Dólares */}
                <div className="p-3 bg-blue-500/10 border border-blue-500/25 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase">
                      Deuda en Dólares
                    </span>
                    <Badge variant="indigo" className="text-[10px] font-mono py-0">USD</Badge>
                  </div>
                  <div className="text-xl font-black font-mono text-blue-950 dark:text-blue-200 mt-1">
                    $ {effectiveDebtUsd.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
                    {modalBalanceUsd > 0.01 ? `Facturado directo: $ ${modalBalanceUsd.toFixed(2)}` : "Consolidado total"}
                  </span>
                </div>

                {/* Deuda en Euros */}
                <div className="p-3 bg-purple-500/10 border border-purple-500/25 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-purple-800 dark:text-purple-300 uppercase">
                      Deuda en Euros
                    </span>
                    <Badge variant="purple" className="text-[10px] font-mono py-0">EUR</Badge>
                  </div>
                  <div className="text-xl font-black font-mono text-purple-950 dark:text-purple-200 mt-1">
                    € {effectiveDebtEur.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
                    BCV: {bcvRates.EUR.toFixed(2)} Bs./€
                  </span>
                </div>
              </div>

              {/* Selector de Moneda y Tasa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase">
                    Moneda del Pago *
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
                    Oficial BCV: {bcvRates.USD.toFixed(2)} Bs./$ · {bcvRates.EUR.toFixed(2)} Bs./€
                  </span>
                </div>
              </div>

              {/* Monto pagado y desglose en tiempo real */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase font-bold text-foreground">
                    Monto a Pagar ({transactionCurrency === "VED" ? "Bs." : transactionCurrency === "EUR" ? "€" : "$"}) *
                  </Label>
                  {effectiveDebtUsd > 0 && (
                    <button
                      type="button"
                      onClick={() => handleFillRemainingDebt(transactionCurrency)}
                      className="text-xs text-primary hover:underline font-bold cursor-pointer"
                    >
                      Pagar saldo total ({transactionCurrency === "VED" ? `Bs. ${effectiveDebtBs.toFixed(2)}` : transactionCurrency === "EUR" ? `€ ${effectiveDebtEur.toFixed(2)}` : `$ ${effectiveDebtUsd.toFixed(2)}`})
                    </button>
                  )}
                </div>

                <Input
                  required
                  min="0.01"
                  step="0.01"
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  placeholder="0.00"
                  className="text-base font-mono font-bold"
                />

                {parsedAmount > 0 && (
                  <Card className="p-3 bg-muted/40 border-border grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                        Monto en Bolívares (Bs.):
                      </span>
                      <strong className="text-sm font-bold font-mono text-emerald-800 dark:text-emerald-400 block">
                        Bs. {dynamicEquivalentBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                        Amortización en USD:
                      </span>
                      <strong className="text-sm font-bold font-mono text-blue-800 dark:text-blue-400 block">
                        $ {dynamicEquivalentUsd.toFixed(2)} USD
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                        Saldo Restante Estimado:
                      </span>
                      <strong className="text-sm font-bold font-mono text-foreground block">
                        {transactionCurrency === "VED"
                          ? `Bs. ${remainingBalanceAfterPayBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : `$ ${remainingBalanceAfterPayUsd.toFixed(2)} USD`}
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
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-9 bg-background border border-input rounded-lg px-3 py-1 text-xs text-foreground focus:ring-2 focus:ring-ring focus:outline-none cursor-pointer"
                  >
                    {PAYMENT_METHODS.map(([val, label]) => (
                      <option key={val} value={val}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs uppercase">
                    Cuenta Origen Institucional *
                  </Label>
                  <select
                    value={sourceAccountId}
                    onChange={(e) => setSourceAccountId(e.target.value)}
                    className="w-full h-9 bg-background border border-input rounded-lg px-3 py-1 text-xs text-foreground focus:ring-2 focus:ring-ring focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Seleccionar cuenta origen --</option>
                    {bankAccounts
                      .filter((acc) => acc.isActive)
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.bankName} - {acc.currency} ({acc.type}) · {acc.accountNumber?.slice(-4) ?? "Caja"}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Referencia y Fecha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase">
                    Nº de Referencia / Comprobante
                  </Label>
                  <Input
                    type="text"
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Ej. REF-98765432..."
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs uppercase">
                    Fecha de Ejecución *
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

              {/* Firmas de Control Interno y Auditoría */}
              <div className="space-y-2 pt-2 border-t border-border">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Control y Autorización de Tesorería
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground">
                      Revisado por
                    </Label>
                    <Input
                      type="text"
                      value={reviewedBy}
                      onChange={(e) => setReviewedBy(e.target.value)}
                      placeholder="Analista Contable"
                      className="text-xs h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground">
                      Autorizado por
                    </Label>
                    <Input
                      type="text"
                      value={authorizedBy}
                      onChange={(e) => setAuthorizedBy(e.target.value)}
                      placeholder="Jefe de Compras"
                      className="text-xs h-8"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground">
                      Aprobado por
                    </Label>
                    <Input
                      type="text"
                      value={approvedBy}
                      onChange={(e) => setApprovedBy(e.target.value)}
                      placeholder="Dirección / Finanzas"
                      className="text-xs h-8"
                    />
                  </div>
                </div>
              </div>

              {/* Notas del Pago */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase">
                    Notas y Observaciones
                  </Label>
                  <div className="flex items-center gap-1">
                    {[
                      { word: "Cancelación total", text: "Cancelación total de saldo comercial", theme: "bg-emerald-50 text-emerald-700 border-emerald-200/90 hover:bg-emerald-100/90" },
                      { word: "Abono", text: "Abono parcial para amortizar cuenta comercial", theme: "bg-amber-50 text-amber-700 border-amber-200/90 hover:bg-amber-100/90" },
                      { word: "Transferencia BCV", text: "Pago procesado según tasa oficial BCV del día", theme: "bg-blue-50 text-blue-700 border-blue-200/90 hover:bg-blue-100/90" },
                    ].map((badge) => (
                      <button
                        key={badge.word}
                        type="button"
                        onClick={() => {
                          setNotes((prev) => {
                            const trimmed = prev.trim();
                            if (!trimmed) return badge.text;
                            if (trimmed.includes(badge.text)) return trimmed;
                            return `${trimmed} · ${badge.text}`;
                          });
                        }}
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors cursor-pointer ${badge.theme}`}
                      >
                        + {badge.word}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Detalles adicionales sobre el desembolso o factura asociada..."
                  className="w-full text-xs bg-background border border-input rounded-lg p-2.5 text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
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
                  disabled={submitting || parsedAmount <= 0}
                  className="gap-1.5 shadow-xs"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirmar y Registrar Pago
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Estado de Cuenta Detallado con las 3 Cuentas */}
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
              {/* Resumen Comercial de las 3 Cuentas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Cuenta Bolívares */}
                <Card className="p-3.5 bg-emerald-50/40 border-emerald-200 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-800 uppercase tracking-wider text-[11px]">
                      Cuenta Bolívares (Bs.)
                    </span>
                    <Badge variant="success" className="text-[9px] py-0 px-1">Bs.</Badge>
                  </div>
                  <strong className="block text-lg font-bold font-mono text-emerald-950 mt-1">
                    Saldo: Bs. {(statement.balanceBs ?? 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    Comprado: Bs. {(statement.totalPurchasedBs ?? 0).toFixed(2)} · Pagado: Bs. {(statement.totalPaidBs ?? 0).toFixed(2)}
                  </div>
                </Card>

                {/* Cuenta Dólares */}
                <Card className="p-3.5 bg-blue-50/40 border-blue-200 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-800 uppercase tracking-wider text-[11px]">
                      Cuenta Dólares (USD)
                    </span>
                    <Badge variant="indigo" className="text-[9px] py-0 px-1">USD</Badge>
                  </div>
                  <strong className="block text-lg font-bold font-mono text-blue-950 mt-1">
                    Saldo: $ {(statement.balanceUsd ?? 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    Comprado: $ {(statement.totalPurchasedUsd ?? 0).toFixed(2)} · Pagado: $ {(statement.totalPaidUsd ?? 0).toFixed(2)}
                  </div>
                </Card>

                {/* Cuenta Euros */}
                <Card className="p-3.5 bg-purple-50/40 border-purple-200 shadow-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-800 uppercase tracking-wider text-[11px]">
                      Cuenta Euros (EUR)
                    </span>
                    <Badge variant="purple" className="text-[9px] py-0 px-1">EUR</Badge>
                  </div>
                  <strong className="block text-lg font-bold font-mono text-purple-950 mt-1">
                    Saldo: € {(statement.balanceEur ?? 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    Comprado: € {(statement.totalPurchasedEur ?? 0).toFixed(2)} · Pagado: € {(statement.totalPaidEur ?? 0).toFixed(2)}
                  </div>
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
                  statement.orders.map((order) => {
                    const curr = String(order.orderCurrency || (typeof order.currency === "string" ? order.currency : order.currency?.code) || "USD");
                    const totalAmt = order.totalAgreed ?? order.totalUsd;
                    const paidAmt = order.paidAgreed ?? order.paidUsd;
                    const balanceAmt = order.balanceAgreed ?? order.balanceUsd;

                    return (
                      <Card
                        key={order.id}
                        className="p-4 text-xs shadow-2xs space-y-2.5"
                      >
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 font-semibold text-foreground pb-2 border-b border-border">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-primary font-bold">
                              Orden #{order.orderNumber}
                            </span>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {curr}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground font-normal">
                              (
                              {order.createdAt
                                ? new Date(order.createdAt).toLocaleDateString()
                                : "-"}
                              )
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground font-mono">
                              Total: {curr} {Number(totalAmt).toFixed(2)}
                            </span>
                            <span className="text-emerald-700 font-mono">
                              Abonado: {curr} {Number(paidAmt).toFixed(2)}
                            </span>
                            <span
                              className={`font-mono font-bold ${
                                Number(balanceAmt) > 0.009
                                  ? "text-destructive"
                                  : "text-emerald-600"
                              }`}
                            >
                              Saldo: {curr} {Number(balanceAmt).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Pagos / Abonos vinculados */}
                        {order.payments && order.payments.length > 0 ? (
                          <div className="space-y-1.5 pl-2 border-l-2 border-emerald-500/30">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase block">
                              Amortizaciones Aplicadas:
                            </span>
                            {order.payments.map((p) => (
                              <div
                                key={p.id}
                                className="flex items-center justify-between text-[11px] text-muted-foreground font-mono bg-muted/20 px-2 py-1 rounded"
                              >
                                <span>
                                  {p.paymentDate
                                    ? new Date(p.paymentDate).toLocaleDateString()
                                    : "Fecha N/A"}{" "}
                                  · {p.paymentMethod || "PAGO"}{" "}
                                  {p.referenceNumber && `· Ref: ${p.referenceNumber}`}
                                </span>
                                <strong className="text-foreground">
                                  {p.transactionCurrency || "USD"}{" "}
                                  {Number(p.amountPaid ?? p.amount ?? 0).toFixed(2)}
                                  {p.amortizedAmountUsd && (
                                    <span className="text-emerald-700 ml-1.5 font-normal">
                                      (Amortiza ${Number(p.amortizedAmountUsd).toFixed(2)} USD)
                                    </span>
                                  )}
                                </strong>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted-foreground italic">
                            Sin abonos registrados para esta orden.
                          </div>
                        )}
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
