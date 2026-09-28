"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import {
  BankAccountService,
  type BankAccountItem,
} from "@/services/bank-account.service";
import { CurrencyService } from "@/services/currency.service";
import { AuthService } from "@/services/auth.service";
import type { DirectPayment } from "@/types/purchasing";
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
  X,
  Calendar,
  Eye,
} from "lucide-react";

export default function DirectPaymentsPage() {
  const [payments, setPayments] = useState<DirectPayment[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([]);
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
          const [paymentsData, accountsData, ratesData] = await Promise.all([
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
          ]);
          setPayments(paymentsData);
          setBankAccounts(accountsData);
          if (ratesData) {
            setBcvRates({
              USD: Number(ratesData.USD || ratesData.rates?.USD || 75.0),
              EUR: Number(ratesData.EUR || ratesData.rates?.EUR || 81.5),
              VED: 1.0,
            });
          }
        } catch (err) {
          console.error("Error cargando pagos directos:", err);
          toast.error("Error al cargar listado de pagos directos");
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

  const handleOpenModal = () => {
    setConcept("");
    setBeneficiary("");
    setMethod("TRANSFERENCIA");
    setDestinationAccount("");
    setReferenceNumber("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setTransactionCurrency("USD");
    setAmountPaid("");
    setExchangeRate(bcvRates.USD.toFixed(2));
    setNotes("");
    setReviewedBy("");
    setAuthorizedBy("");
    setApprovedBy("");

    setShowModal(true);
    setLoadingAccounts(true);
    BankAccountService.getBankAccounts(true)
      .then((accs) => {
        const active = (accs || []).filter((a) => a.isActive);
        setBankAccounts(active);
        if (active.length > 0) {
          const match = active.find((a) => a.currency === "USD") || active[0];
          setSourceAccountId(String(match.id));
        } else {
          setSourceAccountId("");
        }
      })
      .catch((err) => console.error("Error cargando cuentas:", err))
      .finally(() => setLoadingAccounts(false));
  };

  const handleCurrencyChange = (newCurr: "USD" | "VED" | "EUR") => {
    setTransactionCurrency(newCurr);
    if (newCurr === "VED") {
      setExchangeRate(bcvRates.USD.toFixed(2));
    } else if (newCurr === "EUR") {
      setExchangeRate(bcvRates.EUR.toFixed(2));
    } else {
      setExchangeRate("1.00");
    }

    if (bankAccounts.length > 0) {
      const match = bankAccounts.find((a) => a.currency === newCurr);
      if (match) {
        setSourceAccountId(String(match.id));
      }
    }
  };

  // Cálculos dinámicos
  const parsedAmount = parseFloat(amountPaid) || 0;
  const parsedRate =
    parseFloat(exchangeRate) ||
    (transactionCurrency === "VED"
      ? bcvRates.USD
      : transactionCurrency === "EUR"
        ? bcvRates.EUR
        : 1.0);

  let dynamicEquivalentUsd = 0;
  if (transactionCurrency === "VED") {
    dynamicEquivalentUsd = parsedRate > 0 ? parsedAmount / parsedRate : 0;
  } else if (transactionCurrency === "EUR") {
    if (parsedRate > 10 && bcvRates.USD > 0) {
      dynamicEquivalentUsd = (parsedAmount * parsedRate) / bcvRates.USD;
    } else {
      dynamicEquivalentUsd = parsedAmount * parsedRate;
    }
  } else {
    dynamicEquivalentUsd = parsedAmount;
  }
  dynamicEquivalentUsd = Math.round(dynamicEquivalentUsd * 100) / 100;

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!concept.trim()) {
      toast.error("El concepto del gasto o pago es obligatorio.");
      return;
    }
    if (!beneficiary.trim()) {
      toast.error("El nombre o razón social del beneficiario es obligatorio.");
      return;
    }
    if (parsedAmount <= 0) {
      toast.error("El monto debe ser mayor a 0.");
      return;
    }
    if (!referenceNumber.trim()) {
      toast.error("El número de comprobante o referencia es obligatorio.");
      return;
    }
    if (
      (method === "TRANSFERENCIA" || method === "PAGO_MOVIL") &&
      !sourceAccountId
    ) {
      toast.error("Debe seleccionar una cuenta bancaria de origen.");
      return;
    }

    setSubmitting(true);
    try {
      await BankAccountService.createDirectPayment({
        concept: concept.trim(),
        beneficiary: beneficiary.trim(),
        method,
        sourceAccountId:
          (method === "TRANSFERENCIA" || method === "PAGO_MOVIL") &&
          sourceAccountId
            ? Number(sourceAccountId)
            : null,
        destinationAccount:
          (method === "TRANSFERENCIA" || method === "PAGO_MOVIL") &&
          destinationAccount.trim()
            ? destinationAccount.trim()
            : null,
        referenceNumber: referenceNumber.trim(),
        paymentDate: paymentDate
          ? new Date(paymentDate).toISOString()
          : new Date().toISOString(),
        amountPaid: parsedAmount,
        transactionCurrency,
        exchangeRate: transactionCurrency === "USD" ? 1.0 : parsedRate,
        notes: notes.trim() || null,
        reviewedBy: reviewedBy.trim() || null,
        authorizedBy: authorizedBy.trim() || null,
        approvedBy: approvedBy.trim() || null,
      });

      toast.success("Pago directo registrado exitosamente.");
      setShowModal(false);
      loadData();
    } catch (err: unknown) {
      console.error("Error al registrar egreso:", err);
      let msg = "Error al registrar el pago directo";
      if (err && typeof err === "object" && "response" in err) {
        const resErr = err as { response?: { data?: { message?: string } } };
        if (resErr.response?.data?.message) {
          msg = resErr.response.data.message;
        }
      } else if (err instanceof Error) {
        msg = err.message;
      }
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (p: DirectPayment) => {
    if (!isAdmin) return;
    const ok = window.confirm(
      `¿Está seguro de eliminar el pago directo "${p.concept}" a favor de "${p.beneficiary}"? Esta acción no se puede deshacer.`
    );
    if (!ok) return;

    try {
      await BankAccountService.deleteDirectPayment(p.id);
      toast.success("Pago directo eliminado del historial.");
      setPayments((prev) => prev.filter((item) => item.id !== p.id));
    } catch (err: unknown) {
      console.error("Error al eliminar pago directo:", err);
      let msg = "Error al eliminar el pago directo";
      if (err && typeof err === "object" && "response" in err) {
        const resErr = err as { response?: { data?: { message?: string } } };
        if (resErr.response?.data?.message) {
          msg = resErr.response.data.message;
        }
      }
      toast.error(msg);
    }
  };

  // Totales estadísticos
  const totalCount = payments.length;
  const totalUsdEquivalent = payments.reduce(
    (acc, p) => acc + Number(p.equivalentAmountUsd || 0),
    0
  );
  const totalVedPaid = payments
    .filter((p) => p.transactionCurrency === "VED")
    .reduce((acc, p) => acc + Number(p.amountPaid || 0), 0);

  const getMethodBadge = (m: string) => {
    const val = (m || "TRANSFERENCIA").toUpperCase();
    if (val.includes("PAGO_MOVIL")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          Pago Móvil
        </span>
      );
    }
    if (val.includes("EFECTIVO")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Efectivo
        </span>
      );
    }
    if (val.includes("ZELLE")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          Zelle
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
        Transferencia
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                Gestión Financiera
              </span>
              <span className="text-xs font-mono font-medium text-slate-400">
                Sin Orden Previa
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">
              Registro de Egresos / Pagos Directos
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Registrar Nuevo Egreso
        </button>
      </div>

      {/* Tarjetas Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Receipt className="w-4 h-4 text-blue-600" />
            Total Egresos Directos
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {totalCount}
          </div>
          <span className="text-[11px] text-slate-400 block">
            Desembolsos registrados
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
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
          <span className="text-[11px] text-slate-400 block font-mono">
            Valor consolidado en divisas
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Coins className="w-4 h-4 text-amber-600" />
            Egresos en Bolívares (VED)
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            Bs.{" "}
            {totalVedPaid.toLocaleString("es-VE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <span className="text-[11px] text-slate-400 block font-mono">
            Pagos en moneda nacional
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Building2 className="w-4 h-4 text-purple-600" />
            Tasa Oficial BCV
          </div>
          <div className="text-2xl font-bold font-mono text-purple-700">
            {bcvRates.USD.toFixed(2)} Bs./$
          </div>
          <span className="text-[11px] text-slate-400 block font-mono">
            EUR: {bcvRates.EUR.toFixed(2)} Bs./€
          </span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="p-4 bg-white border border-slate-300 rounded-xl shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por concepto, beneficiario o referencia..."
              className="w-full text-xs pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium placeholder:text-slate-400 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </form>

          <div className="flex flex-wrap items-center gap-2">
            {/* Cuenta Bancaria Origen */}
            <select
              value={sourceAccountFilter}
              onChange={(e) => setSourceAccountFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 font-medium bg-white outline-none focus:ring-2 focus:ring-blue-500"
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
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 font-medium bg-white outline-none focus:ring-2 focus:ring-blue-500"
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
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 font-medium bg-white outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas las Monedas</option>
              <option value="USD">USD ($)</option>
              <option value="VED">VED (Bs.)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
        </div>

        {/* Rango de Fechas (Desde / Hasta) */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>Rango de Fechas:</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-600 font-medium">Desde:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 py-1 text-slate-700 font-medium bg-white outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-600 font-medium">Hasta:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-slate-300 rounded-lg px-2.5 py-1 text-slate-700 font-medium bg-white outline-none focus:ring-2 focus:ring-blue-500 text-xs"
            />
          </div>
          {(startDate || endDate || sourceAccountFilter || methodFilter || currencyFilter || search) && (
            <button
              type="button"
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setSourceAccountFilter("");
                setMethodFilter("");
                setCurrencyFilter("");
                setSearch("");
              }}
              className="ml-auto text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline"
            >
              Limpiar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabla del Historial */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs text-slate-500">
              Cargando historial de egresos directos...
            </span>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Wallet className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-800">
                No se encontraron pagos directos registrados
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Utilice el botón &quot;Registrar Nuevo Egreso&quot; para asentar
                servicios públicos, mantenimiento o compras menores sin orden
                previa.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Registrar Primer Egreso
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="py-3 px-4 text-left">Fecha</th>
                  <th className="py-3 px-4 text-left">Concepto</th>
                  <th className="py-3 px-4 text-left">Beneficiario</th>
                  <th className="py-3 px-4 text-left">Método</th>
                  <th className="py-3 px-4 text-left">Cuenta Origen</th>
                  <th className="py-3 px-4 text-left">Destino / Ref.</th>
                  <th className="py-3 px-4 text-right">Monto Pagado</th>
                  <th className="py-3 px-4 text-center">Tasa</th>
                  <th className="py-3 px-4 text-right">Equiv. USD</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
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
                    <tr key={String(p.id)} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                        {p.paymentDate
                          ? new Date(p.paymentDate).toLocaleDateString("es-VE")
                          : "-"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 max-w-[220px]">
                          {p.concept}
                        </div>
                        {p.notes && (
                          <span className="text-[10px] text-slate-400 block truncate max-w-[220px]">
                            {p.notes}
                          </span>
                        )}
                        {(p.reviewedBy || p.authorizedBy || p.approvedBy) && (
                          <div className="mt-1 text-[10px] text-slate-500 font-sans space-y-0.5 border-t border-slate-100 pt-0.5">
                            {p.reviewedBy && (
                              <div>
                                Rev:{" "}
                                <span className="font-medium text-slate-700">
                                  {p.reviewedBy}
                                </span>
                              </div>
                            )}
                            {p.authorizedBy && (
                              <div>
                                Aut:{" "}
                                <span className="font-medium text-slate-700">
                                  {p.authorizedBy}
                                </span>
                              </div>
                            )}
                            {p.approvedBy && (
                              <div>
                                Apr:{" "}
                                <span className="font-medium text-slate-700">
                                  {p.approvedBy}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800 block">
                          {p.beneficiary}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {getMethodBadge(p.method)}
                      </td>
                      <td className="py-3 px-4">
                        {p.sourceAccount ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800">
                              {p.sourceAccount.bankName}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {p.sourceAccount.type} &bull; ••••
                              {p.sourceAccount.accountNumber
                                ? p.sourceAccount.accountNumber.slice(-4)
                                : "S/N"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">
                            {p.method === "EFECTIVO"
                              ? "Caja / Efectivo"
                              : p.method === "ZELLE"
                                ? "Zelle Directo"
                                : "---"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        <div className="font-semibold">
                          {p.referenceNumber || "S/R"}
                        </div>
                        {p.destinationAccount && (
                          <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">
                            {p.destinationAccount}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {pSymbol}{" "}
                        {pAmount.toLocaleString("es-VE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {p.transactionCurrency === "USD"
                          ? "1.00"
                          : `${pRate.toFixed(2)} Bs.`}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                        ${" "}
                        {pEquivUsd.toLocaleString("es-VE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        USD
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link
                            href={`/admin/financial/payments/${p.id}`}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                            title="Ver comprobante de egreso"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDelete(p)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Eliminar registro de pago directo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Registrar Nuevo Egreso */}
      {showModal && (
        <div className="no-print print:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Registrar Nuevo Egreso / Pago Directo
                  </h3>
                  <p className="text-xs text-slate-500">
                    Desembolso institucional sin Orden de Compra previa
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-4">
              {/* Concepto del Pago */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Concepto del Egreso / Pago *
                </label>
                <input
                  type="text"
                  required
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder="Ej. Pago de Servicio Eléctrico, Mantenimiento de Cavas de Frío..."
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                />
              </div>

              {/* Beneficiario */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Beneficiario / Razón Social / RIF *
                </label>
                <input
                  type="text"
                  required
                  value={beneficiary}
                  onChange={(e) => setBeneficiary(e.target.value)}
                  placeholder="Ej. Corpoelec, Refrigeración Andina C.A. (RIF J-12345678-9)..."
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                />
              </div>

              {/* Método de Pago */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Método de Pago *
                </label>
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
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 bg-white"
                >
                  <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                  <option value="PAGO_MOVIL">Pago Móvil Interbancario</option>
                  <option value="EFECTIVO">Efectivo (Dólares / Bolívares)</option>
                  <option value="ZELLE">Zelle (USD)</option>
                </select>
              </div>

              {/* Selector de Cuenta Origen (para Transferencia y Pago Móvil) */}
              {(method === "TRANSFERENCIA" || method === "PAGO_MOVIL") && (
                <>
                  <div>
                    <label
                      htmlFor="directSourceAccountId"
                      className="block text-xs font-semibold text-slate-700 uppercase mb-1"
                    >
                      Cuenta Bancaria Origen *
                    </label>
                    <select
                      id="directSourceAccountId"
                      required
                      value={sourceAccountId}
                      onChange={(e) => setSourceAccountId(e.target.value)}
                      className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 bg-white font-mono"
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

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                      Cuenta Destino / Datos del Beneficiario
                    </label>
                    <input
                      type="text"
                      value={destinationAccount}
                      onChange={(e) => setDestinationAccount(e.target.value)}
                      placeholder="N° de cuenta bancaria o teléfono del beneficiario..."
                      className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-slate-800"
                    />
                  </div>
                </>
              )}

              {/* N° Referencia y Fecha de Pago */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    {method === "EFECTIVO"
                      ? "N° Recibo / Comprobante *"
                      : method === "ZELLE"
                        ? "Referencia Zelle / Titular *"
                        : "N° de Referencia *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Ej. 10492812"
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Fecha de Pago *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                  />
                </div>
              </div>

              {/* Moneda y Monto Pagado */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Moneda del Pago *
                  </label>
                  <select
                    value={transactionCurrency}
                    onChange={(e) =>
                      handleCurrencyChange(
                        e.target.value as "USD" | "VED" | "EUR"
                      )
                    }
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 bg-white"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="VED">VED (Bs.)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Monto Pagado (
                    {transactionCurrency === "VED"
                      ? "Bs."
                      : transactionCurrency === "EUR"
                        ? "€"
                        : "$"}
                    ) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              {/* Tasa de Cambio (Visible si es VED o EUR) */}
              {(transactionCurrency === "VED" ||
                transactionCurrency === "EUR") && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-semibold text-slate-700">
                      Tasa de Cambio a aplicar (Bs./
                      {transactionCurrency === "EUR" ? "€" : "$"})
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      BCV Oficial:{" "}
                      {transactionCurrency === "VED"
                        ? bcvRates.USD.toFixed(2)
                        : bcvRates.EUR.toFixed(2)}{" "}
                      Bs.
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-slate-800 bg-white"
                  />
                </div>
              )}

              {/* Indicador Reactivo de Equivalente USD */}
              <div className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200/80 flex justify-between items-center text-xs">
                <span className="font-semibold text-emerald-900">
                  Equivalente estimado en USD:
                </span>
                <span className="font-mono text-sm font-bold text-emerald-800">
                  $ {dynamicEquivalentUsd.toFixed(2)} USD
                </span>
              </div>

              {/* Notas / Observaciones */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Notas / Observaciones (Opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalles sobre la factura recibida, justificación o aprobaciones previas..."
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                  rows={2}
                />
              </div>

              {/* Firmas de Autorización */}
              <div className="border-t border-slate-200 pt-3 space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Firmas de Autorización del Egreso
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Revisado por
                    </label>
                    <input
                      type="text"
                      value={reviewedBy}
                      onChange={(e) => setReviewedBy(e.target.value)}
                      placeholder="Ej. Lic. Ana Pérez"
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Autorizado por
                    </label>
                    <input
                      type="text"
                      value={authorizedBy}
                      onChange={(e) => setAuthorizedBy(e.target.value)}
                      placeholder="Ej. Dr. Roberto Silva"
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Aprobado por
                    </label>
                    <input
                      type="text"
                      value={approvedBy}
                      onChange={(e) => setApprovedBy(e.target.value)}
                      placeholder="Ej. Dra. Carmen Díaz"
                      className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
                >
                  {submitting && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Guardar y Emitir Egreso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
