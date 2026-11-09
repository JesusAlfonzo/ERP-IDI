"use client";
import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  BankAccountService,
  type BankAccountItem,
} from "@/services/bank-account.service";
import { CurrencyService } from "@/services/currency.service";
import { AuthService } from "@/services/auth.service";
import type { AuthUser } from "@/types/auth";
import { useDebounce } from "@/hooks/use-debounce";
import { usePagination } from "@/hooks/use-pagination";
import { TablePagination } from "@/components/common/TablePagination";
import { PurchasingClientService } from "@/services/purchasing.service";
import type { DirectPayment, Supplier, SupplierDebt } from "@/types/purchasing";
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
  ShieldAlert,
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
  const [supplierDebts, setSupplierDebts] = useState<SupplierDebt[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();
  // Roles & Permisos
  const [currentUser] = useState<AuthUser | null>(() => AuthService.getCurrentUser());

  const userRoles = currentUser?.roles || [];
  const isAdmin = userRoles.includes("ADMINISTRADOR");

  // Estado para modal de anulación y reverso (exclusivo Administrador)
  const [paymentToDelete, setPaymentToDelete] = useState<DirectPayment | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Filtros
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 350);
  const [methodFilter, setMethodFilter] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [sourceAccountFilter, setSourceAccountFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Paginación
  const pagination = usePagination(payments, { initialPageSize: 10 });
  const { resetPage } = pagination;

  useEffect(() => {
    resetPage();
  }, [debouncedSearch, methodFilter, currencyFilter, sourceAccountFilter, startDate, endDate, resetPage]);
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
  const [beneficiaryRif, setBeneficiaryRif] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
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
          const [paymentsData, accountsData, ratesData, suppliersData, debtsData] = await Promise.all([
            BankAccountService.getDirectPayments({
              search: debouncedSearch || undefined,
              method: methodFilter || undefined,
              currency: currencyFilter || undefined,
              startDate: startDate || undefined,
              endDate: endDate || undefined,
              sourceAccountId: sourceAccountFilter || undefined,
            }),
            BankAccountService.getBankAccounts(true).catch(() => []),
            CurrencyService.getCurrentRates().catch(() => null),
            PurchasingClientService.getSuppliers().catch(() => []),
            PurchasingClientService.getSupplierDebts().catch(() => []),
          ]);
          setPayments(paymentsData);
          setBankAccounts(accountsData);
          setSuppliers(suppliersData);
          setSupplierDebts(debtsData);
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
  }, [debouncedSearch, methodFilter, currencyFilter, sourceAccountFilter, startDate, endDate]);
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };
  const handleOpenModal = async () => {
    setConcept("");
    setBeneficiary("");
    setBeneficiaryRif("");
    setSelectedSupplierId("");
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
      setExchangeRate(bcvRates.EUR.toString());
    } else {
      setExchangeRate("");
    }
  };
  const selectedSupplierDebt = supplierDebts.find(
    (d) => String(d.id) === selectedSupplierId
  );
  const parsedAmt = parseFloat(amountPaid) || 0;
  const parsedRate = parseFloat(exchangeRate) || 0;

  let dynamicEquivalentBs = 0;
  let dynamicEquivalentUsd = 0;
  let dynamicEquivalentEur = 0;

  // En Venezuela la tasa EUR es en Bolívares por Euro (Bs./EUR), idéntico a USD (Bs./USD)
  if (transactionCurrency === "USD") {
    const rateUsd = parsedRate > 0 ? parsedRate : bcvRates.USD;
    dynamicEquivalentUsd = parsedAmt;
    dynamicEquivalentBs = parsedAmt * rateUsd;
    dynamicEquivalentEur = bcvRates.EUR > 0 ? dynamicEquivalentBs / bcvRates.EUR : 0;
  } else if (transactionCurrency === "VED") {
    const rateUsd = parsedRate > 0 ? parsedRate : bcvRates.USD;
    dynamicEquivalentBs = parsedAmt;
    dynamicEquivalentUsd = rateUsd > 0 ? parsedAmt / rateUsd : 0;
    dynamicEquivalentEur = bcvRates.EUR > 0 ? parsedAmt / bcvRates.EUR : 0;
  } else if (transactionCurrency === "EUR") {
    const rateEur = parsedRate > 0 ? parsedRate : bcvRates.EUR;
    dynamicEquivalentEur = parsedAmt;
    dynamicEquivalentBs = parsedAmt * rateEur;
    dynamicEquivalentUsd = bcvRates.USD > 0 ? dynamicEquivalentBs / bcvRates.USD : parsedAmt;
  }
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concept.trim()) {
      toast.error("Debe ingresar el concepto del pago.");
      return;
    }
    if (!beneficiary.trim()) {
      toast.error("Debe especificar la razón social o nombre del beneficiario.");
      return;
    }
    const cleanRif = beneficiaryRif.trim().toUpperCase();
    const rifPattern = /^[JVEGPjvegp]-?\d{6,9}(-?\d)?$/;
    // Verificar si es proveedor registrado o si se debe exigir RIF obligatorio
    const isRegistered = suppliers.some(
      (s) => String(s.id) === selectedSupplierId || s.name.toLowerCase() === beneficiary.trim().toLowerCase()
    );
    if (!isRegistered) {
      if (!cleanRif) {
        toast.error("El RIF o documento de identidad fiscal es obligatorio para proveedores no registrados.");
        return;
      }
      if (!rifPattern.test(cleanRif)) {
        toast.error("El RIF es inválido. Debe comenzar con J, V, E, G o P seguido de números (ej. J-12345678-9, V-12345678).");
        return;
      }
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
        finalRate = parseFloat(exchangeRate) || bcvRates.EUR;
      }
      const formattedBeneficiary = cleanRif && !beneficiary.toUpperCase().includes(cleanRif)
        ? `${beneficiary.trim()} (RIF: ${cleanRif})`
        : beneficiary.trim();
      await BankAccountService.createDirectPayment({
        concept: concept.trim(),
        beneficiary: formattedBeneficiary,
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
  const handleConfirmDelete = async () => {
    if (!isAdmin || !paymentToDelete) return;
    if (!deleteReason.trim()) {
      toast.error("Debe ingresar el motivo o justificación de la anulación para la auditoría contable.");
      return;
    }
    setDeleting(true);
    try {
      await BankAccountService.deleteDirectPayment(paymentToDelete.id, deleteReason.trim());
      toast.success("Pago directo anulado y fondos reintegrados en auditoría contable.");
      setPaymentToDelete(null);
      setDeleteReason("");
      loadData();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al anular pago directo";
      toast.error(msg);
    } finally {
      setDeleting(false);
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
        return <Badge variant="indigo">Zelle</Badge>;
      default:
        return <Badge variant="outline" className="border-border/60 bg-muted/20 text-muted-foreground">{m}</Badge>;
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
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="indigo" className="text-xs">
                Gestión Financiera
              </Badge>
              <Badge variant="outline" className="border-border/60 bg-muted/20 text-xs text-muted-foreground">
                Pagos Directos ({totalCount})
              </Badge>
              <Badge variant="success" className="text-xs font-mono">
                ${totalUsdEquivalent.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Total
              </Badge>
              {bcvRates?.USD && (
                <Badge variant="purple" className="text-xs font-mono">
                  Tasa: Bs. {bcvRates.USD.toFixed(2)}
                </Badge>
              )}
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground mt-0.5">
              Registro de Egresos / Pagos Directos
            </h1>
          </div>
        </div>
        <Button onClick={handleOpenModal} className="gap-1.5 self-start sm:self-auto cursor-pointer">
          <Plus className="w-4 h-4" /> Registrar Nuevo Egreso
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
              variant="ghost"
              size="sm"
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setSourceAccountFilter("");
                setMethodFilter("");
                setCurrencyFilter("");
                setSearch("");
              }}
              className="ml-auto text-xs h-8 text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer"
              title="Restablecer todos los filtros"
            >
              <X className="w-3.5 h-3.5" />
              <span>Limpiar filtros</span>
            </Button>
          )}
        </div>
      </Card>
      {/* Banner de Auditoría Informativo para Operadores No Administradores */}
      {!isAdmin && (
        <div className="flex items-center gap-2.5 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-900 dark:text-amber-300">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            <strong>Control de Auditoría:</strong> La anulación o reversión de egresos asentados está restringida exclusivamente a usuarios con rol <strong>ADMINISTRADOR</strong>. Si requiere anular un pago, el encargado del módulo debe solicitar la intervención de un Administrador o Coordinador para asentar la justificación formal y generar el reporte contable.
          </span>
        </div>
      )}

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
            <Button onClick={handleOpenModal} size="sm" className="gap-1.5 cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Registrar Primer Egreso
            </Button>
          </div>
        ) : (
          <>
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
              {pagination.paginatedItems.map((p) => {
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
                        : `${pRate.toFixed(2)} Bs./${p.transactionCurrency === "EUR" ? "€" : "$"}`}
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
                            onClick={() => {
                              setPaymentToDelete(p);
                              setDeleteReason("");
                            }}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                            title="Anular y revertir pago directo (Solo Administrador)"
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
          <TablePagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
            onPageChange={pagination.onPageChange}
            onPageSizeChange={pagination.onPageSizeChange}
            pageSizeOptions={[10, 25, 50, 100]}
            entityName="egresos registrados"
          />
        </>
        )}
      </Card>
      {/* Modal Registrar Nuevo Egreso con shadcn Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl md:max-w-4xl w-[95vw] max-h-[92vh] overflow-y-auto p-4 sm:p-6">
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
            {/* Beneficiario / Proveedor con selector inteligente y validación obligatoria de RIF */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase">
                  Beneficiario / Proveedor *
                </Label>
                {suppliers.length > 0 && (
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Seleccione un proveedor para autocompletar o ingrese manualmente
                  </span>
                )}
              </div>
              {suppliers.length > 0 && (
                <div className="mb-1">
                  <SearchableSelect<Supplier>
                    options={supplierOptions}
                    value={selectedSupplierId}
                    onChange={(val, opt) => {
                      setSelectedSupplierId(String(val));
                      if (opt?.data) {
                        const s = opt.data;
                        setBeneficiary(s.name);
                        setBeneficiaryRif(s.rifOrId || s.rif || "");
                      }
                    }}
                    placeholder="🔍 Buscar proveedor registrado para autocompletar..."
                    emptyMessage="No se encontró ningún proveedor registrado."
                    itemTypeLabel="proveedor(es)"
                    icon={<Building2 className="w-4 h-4 text-muted-foreground shrink-0" />}
                  />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground uppercase">
                    Razón Social / Beneficiario *
                  </Label>
                  <Input
                    type="text"
                    required
                    value={beneficiary}
                    onChange={(e) => {
                      setBeneficiary(e.target.value);
                      if (selectedSupplierId) setSelectedSupplierId("");
                    }}
                    placeholder="Ej. Servicios de Refrigeración Andina C.A."
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] text-muted-foreground uppercase">
                      RIF / Cédula Fiscal *
                    </Label>
                    {!selectedSupplierId && (
                      <Badge variant="rose" className="text-[9px] py-0 px-1 font-mono">
                        Obligatorio
                      </Badge>
                    )}
                  </div>
                  <Input
                    type="text"
                    required={!selectedSupplierId}
                    value={beneficiaryRif}
                    onChange={(e) => setBeneficiaryRif(e.target.value.toUpperCase())}
                    placeholder="Ej. J-12345678-9, V-12345678"
                    className="text-xs font-mono"
                  />
                </div>
              </div>

              {/* Deuda comercial pendiente si el proveedor tiene órdenes previas */}
              {selectedSupplierDebt && ((selectedSupplierDebt.balanceUsd || 0) > 0.01 || (selectedSupplierDebt.balanceBs || 0) > 0.01 || (selectedSupplierDebt.balanceEur || 0) > 0.01) && (
                <div className="p-3 bg-muted/40 rounded-xl border border-border space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <Building2 className="w-3.5 h-3.5 text-primary" />
                      Deuda Comercial Registrada de este Proveedor
                    </span>
                    <Badge variant="rose" className="text-[10px] font-mono py-0">En Cartera</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-semibold block uppercase">Cuenta Bs.</span>
                      <strong className="text-sm font-mono text-emerald-950 dark:text-emerald-200">
                        Bs. {(selectedSupplierDebt.balanceBs || 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </div>
                    <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <span className="text-[10px] text-blue-800 dark:text-blue-300 font-semibold block uppercase">Cuenta USD</span>
                      <strong className="text-sm font-mono text-blue-950 dark:text-blue-200">
                        $ {(selectedSupplierDebt.balanceUsd || 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </div>
                    <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                      <span className="text-[10px] text-purple-800 dark:text-purple-300 font-semibold block uppercase">Cuenta EUR</span>
                      <strong className="text-sm font-mono text-purple-950 dark:text-purple-200">
                        € {(selectedSupplierDebt.balanceEur || 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Método de Pago y Cuenta Bancaria Origen en 2 columnas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

              {(method === "TRANSFERENCIA" || method === "PAGO_MOVIL") ? (
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
                          {acc.bankName} - {acc.accountNumber || "S/N"} ({acc.type} - {acc.currency})
                        </option>
                      ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase text-muted-foreground">
                    Instrumento de Liquidación
                  </Label>
                  <div className="h-9 px-3 py-2 bg-muted/30 border border-input rounded-lg text-xs text-muted-foreground flex items-center">
                    {method === "EFECTIVO" ? "Desembolso directo por Caja Chica / Efectivo" : "Transferencia externa Zelle"}
                  </div>
                </div>
              )}
            </div>

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

            {/* Moneda del Pago y Tasa de Cambio */}
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

            {/* Monto Pagado */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase font-bold text-foreground">
                  Monto a Pagar ({transactionCurrency === "VED" ? "Bs." : transactionCurrency === "EUR" ? "€" : "$"}) *
                </Label>
                {selectedSupplierDebt && ((selectedSupplierDebt.balanceUsd || 0) > 0.01 || (selectedSupplierDebt.balanceBs || 0) > 0.01) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (transactionCurrency === "VED") {
                        const totalBs = (selectedSupplierDebt.balanceBs || 0) + (selectedSupplierDebt.balanceUsd || 0) * (parseFloat(exchangeRate) || bcvRates.USD);
                        setAmountPaid(totalBs.toFixed(2));
                      } else if (transactionCurrency === "USD") {
                        const totalUsd = (selectedSupplierDebt.balanceUsd || 0) + ((selectedSupplierDebt.balanceBs || 0) / (parseFloat(exchangeRate) || bcvRates.USD));
                        setAmountPaid(totalUsd.toFixed(2));
                      } else {
                        setAmountPaid((selectedSupplierDebt.balanceEur || 0).toFixed(2));
                      }
                    }}
                    className="text-xs text-primary hover:underline font-bold cursor-pointer"
                  >
                    Cargar saldo pendiente del proveedor ({transactionCurrency === "VED" ? `Bs. ${((selectedSupplierDebt.balanceBs || 0) + (selectedSupplierDebt.balanceUsd || 0) * (parseFloat(exchangeRate) || bcvRates.USD)).toFixed(2)}` : `$ ${((selectedSupplierDebt.balanceUsd || 0) + ((selectedSupplierDebt.balanceBs || 0) / (parseFloat(exchangeRate) || bcvRates.USD))).toFixed(2)}`})
                  </button>
                )}
              </div>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="0.00"
                className="text-base font-mono font-bold"
              />
            </div>

            {/* Indicador Reactivo Multi-Moneda */}
            {parsedAmt > 0 && (
              <Card className="p-3.5 bg-muted/40 border-border grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                    Desembolso en Bolívares (Bs.):
                  </span>
                  <strong className="text-sm font-bold font-mono text-emerald-800 dark:text-emerald-400 block mt-0.5">
                    Bs. {dynamicEquivalentBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                    Equivalente en Dólares (USD):
                  </span>
                  <strong className="text-sm font-bold font-mono text-blue-800 dark:text-blue-400 block mt-0.5">
                    $ {dynamicEquivalentUsd.toFixed(2)} USD
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase block">
                    Equivalente en Euros (EUR):
                  </span>
                  <strong className="text-sm font-bold font-mono text-purple-800 dark:text-purple-400 block mt-0.5">
                    € {dynamicEquivalentEur.toFixed(2)} EUR
                  </strong>
                </div>
              </Card>
            )}

            {/* Notas / Observaciones */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase">
                  Concepto Rápido y Observaciones
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  (Haz clic para asociar)
                </span>
              </div>
              {/* Badges de 1 palabra para clasificar egreso */}
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

      {/* Modal de Anulación y Reversión de Pago (Exclusivo Administrador) */}
      <Dialog
        open={Boolean(paymentToDelete && isAdmin)}
        onOpenChange={(open) => {
          if (!open) {
            setPaymentToDelete(null);
            setDeleteReason("");
          }
        }}
      >
        <DialogContent className="max-w-lg w-[95vw] p-5 sm:p-6">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Anular y Revertir Egreso de Tesorería
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Operación autorizada exclusivamente para Administradores
                </p>
              </div>
            </div>
          </DialogHeader>

          {paymentToDelete && (
            <div className="space-y-4 pt-1">
              {/* Resumen del Pago a Anular */}
              <div className="p-3.5 bg-muted/40 border border-border rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Concepto:</span>
                  <span className="font-bold text-foreground text-right">{paymentToDelete.concept}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Beneficiario:</span>
                  <span className="font-semibold text-foreground text-right">{paymentToDelete.beneficiary}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Monto Pagado:</span>
                  <span className="font-mono font-bold text-destructive text-right">
                    {paymentToDelete.transactionCurrency === "VED" ? "Bs." : paymentToDelete.transactionCurrency === "EUR" ? "€" : "$"} {Number(paymentToDelete.amountPaid).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                  <span>Equiv. USD:</span>
                  <span className="font-mono font-semibold">${Number(paymentToDelete.equivalentAmountUsd || 0).toFixed(2)} USD</span>
                </div>
              </div>

              {/* Advertencia de Auditoría */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Protocolo de Control y Auditoría:</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Esta acción revertirá los fondos contables y asentará un registro formal de anulación en el Kardex institucional. Es obligatorio documentar la causa del reverso para el reporte de auditoría de tesorería.
                </p>
              </div>

              {/* Justificación obligatoria */}
              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-bold text-foreground">
                  Motivo o Justificación de la Anulación *
                </Label>
                <Textarea
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Ej. Duplicidad de comprobante bancario, error en monto reportado por el operador, pago devuelto por el banco..."
                  rows={3}
                  className="text-xs"
                  required
                />
                <span className="text-[10px] text-muted-foreground block">
                  Esta justificación quedará registrada junto con su usuario ({currentUser?.fullName || currentUser?.username}) y fecha en el historial contable.
                </span>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPaymentToDelete(null);
                    setDeleteReason("");
                  }}
                  disabled={deleting}
                  className="cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleConfirmDelete}
                  disabled={deleting || !deleteReason.trim()}
                  className="gap-1.5 cursor-pointer"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Anulando...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Confirmar Anulación</span>
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}