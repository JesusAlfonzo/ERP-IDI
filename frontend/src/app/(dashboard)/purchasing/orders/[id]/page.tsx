"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PurchasingClientService } from "@/services/purchasing.service";
import {
  BankAccountService,
  type BankAccountItem,
} from "@/services/bank-account.service";
import { CurrencyService } from "@/services/currency.service";
import { getCurrencySymbol, normalizeCurrencyCode } from "@/utils/currency";
import { toast } from "@/utils/toast";
import type { PurchaseOrder, SupplierPayment } from "@/types/purchasing";
import {
  PrintableDocument,
  DocumentHeader,
  DocumentMetadataGrid,
  DocumentSignatures,
  DocumentFooter,
  PrintActionButton,
} from "@/components/common/PrintableDocument";
import {
  FileText,
  ArrowLeft,
  Building2,
  Boxes,
  Truck,
  Receipt,
  Loader2,
  ExternalLink,
  Coins,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Landmark,
  Clock,
  X,
  Plus,
} from "lucide-react";

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

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

  // Modal de Pago
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Formulario de Pago
  const [paymentMethod, setPaymentMethod] = useState<
    "TRANSFERENCIA" | "PAGO_MOVIL" | "EFECTIVO" | "ZELLE"
  >("TRANSFERENCIA");
  const [sourceAccountId, setSourceAccountId] = useState<string>("");
  const [destinationAccount, setDestinationAccount] = useState<string>("");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(() =>
    new Date().toISOString().split("T")[0]
  );
  const [transactionCurrency, setTransactionCurrency] = useState<
    "USD" | "VED" | "EUR"
  >("USD");
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [paymentExchangeRate, setPaymentExchangeRate] = useState<string>("");
  const [loadingAccounts, setLoadingAccounts] = useState<boolean>(false);
  const [reviewedBy, setReviewedBy] = useState<string>("");
  const [authorizedBy, setAuthorizedBy] = useState<string>("");
  const [approvedBy, setApprovedBy] = useState<string>("");

  useEffect(() => {
    if (!orderId) return;

    startTransition(() => {
      void (async () => {
        try {
          const [orderData, accountsData, ratesData] = await Promise.all([
            PurchasingClientService.getOrderById(orderId),
            BankAccountService.getBankAccounts(true).catch(() => []),
            CurrencyService.getCurrentRates().catch(() => null),
          ]);
          setOrder(orderData);
          setBankAccounts(accountsData);
          if (ratesData) {
            setBcvRates({
              USD: Number(ratesData.USD || ratesData.rates?.USD || 75.0),
              EUR: Number(ratesData.EUR || ratesData.rates?.EUR || 81.5),
              VED: 1.0,
            });
          }
        } catch (err) {
          console.error("Error cargando orden de compra", err);
        } finally {
          setLoading(false);
        }
      })();
    });
  }, [orderId]);

  // Carga asíncrona de cuentas bancarias activas al abrir el modal de pago
  useEffect(() => {
    if (!showPaymentModal) return;
    let ignore = false;
    void (async () => {
      try {
        const data = await BankAccountService.getBankAccounts(true);
        if (!ignore) {
          const activeAccounts = (data || []).filter((acc) => acc.isActive);
          setBankAccounts(activeAccounts);
          if (activeAccounts.length > 0 && !sourceAccountId) {
            const match =
              activeAccounts.find((a) => a.currency === transactionCurrency) ||
              activeAccounts[0];
            setSourceAccountId(String(match.id));
          }
        }
      } catch (err) {
        console.error("Error cargando cuentas bancarias:", err);
      } finally {
        if (!ignore) {
          setLoadingAccounts(false);
        }
      }
    })();
    return () => {
      ignore = true;
    };
  }, [showPaymentModal, transactionCurrency, sourceAccountId]);

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <span className="text-xs text-slate-500 font-medium">
          Cargando orden de compra...
        </span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <FileText className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          Orden de compra no encontrada
        </h2>
        <button
          type="button"
          onClick={() => router.push("/purchasing/orders")}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs bg-slate-900 text-white rounded-lg cursor-pointer hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al listado
        </button>
      </div>
    );
  }

  const canReceive =
    order.status !== "RECIBIDO" &&
    order.status !== "COMPLETADA" &&
    order.status !== "CANCELADA" &&
    order.status !== "CANCELADO";

  const currCode = normalizeCurrencyCode(order.currency);
  const symbol = getCurrencySymbol(order.currency);
  const rate = Number(order.exchangeRate || 0);

  // Subtotales calculados o persistidos
  const fallbackTaxable =
    order.items?.reduce((acc, it) => {
      return !it.isExempt
        ? acc + Number(it.quantityOrdered) * Number(it.unitPrice)
        : acc;
    }, 0) ?? 0;

  const fallbackExempt =
    order.items?.reduce((acc, it) => {
      return it.isExempt
        ? acc + Number(it.quantityOrdered) * Number(it.unitPrice)
        : acc;
    }, 0) ?? 0;

  const taxableAmount =
    order.taxableAmount != null
      ? Number(order.taxableAmount)
      : order.taxableAmountUsd != null
        ? Number(order.taxableAmountUsd)
        : fallbackTaxable;

  const exemptAmount =
    order.exemptAmount != null
      ? Number(order.exemptAmount)
      : order.exemptAmountUsd != null
        ? Number(order.exemptAmountUsd)
        : fallbackExempt;

  const taxAmount =
    order.taxAmount != null
      ? Number(order.taxAmount)
      : order.taxAmountUsd != null
        ? Number(order.taxAmountUsd)
        : Math.round(taxableAmount * 0.16 * 100) / 100;

  const totalAmount =
    order.totalAmount != null
      ? Number(order.totalAmount)
      : order.totalAmountUsd != null
        ? Number(order.totalAmountUsd)
        : Number(order.total || 0);

  const totalAmountBs =
    order.totalAmountBs != null
      ? Number(order.totalAmountBs)
      : currCode === "VED"
        ? totalAmount
        : rate > 0
          ? Math.round(totalAmount * rate * 100) / 100
          : null;

  // Cálculos financieros de la orden y amortización de deuda
  const orderTotalUsd = Number(
    order.totalAmountUsd != null && Number(order.totalAmountUsd) > 0
      ? order.totalAmountUsd
      : order.total || totalAmount
  );

  const payments = (order.payments ?? []) as SupplierPayment[];

  const totalPaidUsd = payments.reduce((acc, p) => {
    const pAmortized = Number(p.amortizedAmountUsd || 0);
    if (pAmortized > 0) return acc + pAmortized;
    const pAmount = Number(p.amountPaid ?? p.amount ?? 0);
    const pRate = Number(p.exchangeRate || 1.0);
    const pCurr = p.transactionCurrency || "USD";
    if (pCurr === "VED" && pRate > 0) return acc + pAmount / pRate;
    return acc + pAmount;
  }, 0);

  const remainingDebtUsd = Math.max(
    0,
    Math.round((orderTotalUsd - totalPaidUsd) * 100) / 100
  );

  const isFullyPaid =
    order.paymentStatus === "PAGADO" ||
    (orderTotalUsd > 0 && remainingDebtUsd <= 0.009);

  const canPay =
    order.status !== "CANCELADA" &&
    order.status !== "CANCELADO" &&
    !isFullyPaid;

  const effectiveBcvRate = rate > 0 ? rate : bcvRates.USD || 75.0;
  const totalOrderBs =
    totalAmountBs != null
      ? totalAmountBs
      : currCode === "VED"
        ? totalAmount
        : orderTotalUsd * effectiveBcvRate;
  const totalPaidBs = totalPaidUsd * effectiveBcvRate;
  const remainingDebtBs = remainingDebtUsd * effectiveBcvRate;

  // Cálculos del Modal de Pago
  const parsedAmountPaid = parseFloat(amountPaid) || 0;
  const parsedAppliedRate =
    parseFloat(paymentExchangeRate) ||
    (transactionCurrency === "VED"
      ? rate > 0
        ? rate
        : bcvRates.USD
      : transactionCurrency === "EUR"
        ? bcvRates.EUR
        : 1.0);

  let dynamicAmortizedUsd = 0;
  if (transactionCurrency === "VED") {
    dynamicAmortizedUsd =
      parsedAppliedRate > 0 ? parsedAmountPaid / parsedAppliedRate : 0;
  } else if (transactionCurrency === "EUR") {
    if (parsedAppliedRate > 10 && bcvRates.USD > 0) {
      dynamicAmortizedUsd =
        (parsedAmountPaid * parsedAppliedRate) / bcvRates.USD;
    } else {
      dynamicAmortizedUsd = parsedAmountPaid * parsedAppliedRate;
    }
  } else {
    dynamicAmortizedUsd = parsedAmountPaid;
  }
  dynamicAmortizedUsd = Math.round(dynamicAmortizedUsd * 100) / 100;

  const isOverpaying = dynamicAmortizedUsd > remainingDebtUsd + 0.05;
  const overpayAmount = Math.max(
    0,
    Math.round((dynamicAmortizedUsd - remainingDebtUsd) * 100) / 100
  );

  const handleOpenPaymentModal = () => {
    const defaultCurr: "USD" | "VED" | "EUR" =
      currCode === "VED" ? "VED" : currCode === "EUR" ? "EUR" : "USD";
    setPaymentMethod("TRANSFERENCIA");
    setTransactionCurrency(defaultCurr);
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setReferenceNumber("");
    setDestinationAccount("");
    setAmountPaid("");
    setReviewedBy("");
    setAuthorizedBy("");
    setApprovedBy("");

    const initialRate =
      defaultCurr === "VED"
        ? rate > 0
          ? rate
          : bcvRates.USD
        : defaultCurr === "EUR"
          ? bcvRates.EUR
          : 1.0;
    setPaymentExchangeRate(initialRate > 0 ? initialRate.toFixed(2) : "75.00");

    if (bankAccounts.length > 0) {
      const match =
        bankAccounts.find((a) => a.currency === defaultCurr) || bankAccounts[0];
      setSourceAccountId(match ? String(match.id) : "");
    } else {
      setSourceAccountId("");
    }

    setLoadingAccounts(true);
    setShowPaymentModal(true);
  };

  const handleCurrencyChange = (newCurrency: "USD" | "VED" | "EUR") => {
    setTransactionCurrency(newCurrency);
    if (newCurrency === "VED") {
      const effectiveR = rate > 0 ? rate : bcvRates.USD;
      setPaymentExchangeRate(effectiveR.toFixed(2));
    } else if (newCurrency === "EUR") {
      setPaymentExchangeRate(bcvRates.EUR.toFixed(2));
    } else {
      setPaymentExchangeRate("1.00");
    }

    if (bankAccounts.length > 0) {
      const matchingAccount = bankAccounts.find(
        (a) => a.currency === newCurrency
      );
      if (matchingAccount) {
        setSourceAccountId(String(matchingAccount.id));
      }
    }
  };

  const handleFillRemainingDebt = () => {
    if (remainingDebtUsd <= 0) return;
    if (transactionCurrency === "USD") {
      setAmountPaid(remainingDebtUsd.toFixed(2));
    } else if (transactionCurrency === "VED") {
      const neededBs =
        Math.round(remainingDebtUsd * parsedAppliedRate * 100) / 100;
      setAmountPaid(neededBs.toFixed(2));
    } else if (transactionCurrency === "EUR") {
      const bcvUsd = bcvRates.USD > 0 ? bcvRates.USD : 75.0;
      const neededEur =
        parsedAppliedRate > 10
          ? Math.round(
              ((remainingDebtUsd * bcvUsd) / parsedAppliedRate) * 100
            ) / 100
          : Math.round((remainingDebtUsd / parsedAppliedRate) * 100) / 100;
      setAmountPaid(neededEur.toFixed(2));
    }
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    if (parsedAmountPaid <= 0) {
      toast.error("El monto del pago debe ser mayor a 0.");
      return;
    }

    if (!referenceNumber.trim()) {
      toast.error("El número de comprobante o referencia es obligatorio.");
      return;
    }

    if (
      (paymentMethod === "TRANSFERENCIA" || paymentMethod === "PAGO_MOVIL") &&
      !sourceAccountId
    ) {
      toast.error("Debe seleccionar una cuenta bancaria institucional de origen.");
      return;
    }

    if (isOverpaying) {
      toast.error(
        `El monto amortizado ($${dynamicAmortizedUsd.toFixed(2)} USD) supera el saldo pendiente ($${remainingDebtUsd.toFixed(2)} USD).`
      );
      return;
    }

    setSubmittingPayment(true);
    try {
      const payload = {
        method: paymentMethod,
        sourceAccountId:
          (paymentMethod === "TRANSFERENCIA" ||
            paymentMethod === "PAGO_MOVIL") &&
          sourceAccountId
            ? Number(sourceAccountId)
            : null,
        destinationAccount:
          (paymentMethod === "TRANSFERENCIA" ||
            paymentMethod === "PAGO_MOVIL") &&
          destinationAccount.trim()
            ? destinationAccount.trim()
            : null,
        referenceNumber: referenceNumber.trim(),
        amountPaid: parsedAmountPaid,
        transactionCurrency,
        exchangeRate: transactionCurrency === "USD" ? 1.0 : parsedAppliedRate,
        paymentDate: paymentDate
          ? new Date(paymentDate).toISOString()
          : new Date().toISOString(),
        reviewedBy: reviewedBy.trim() || null,
        authorizedBy: authorizedBy.trim() || null,
        approvedBy: approvedBy.trim() || null,
      };

      await BankAccountService.registerOrderPayment(order.id, payload);
      toast.success("Pago asentado y amortizado exitosamente.");

      // Refrescar orden y datos financieros
      const refreshedOrder = await PurchasingClientService.getOrderById(
        order.id
      );
      setOrder(refreshedOrder);

      setShowPaymentModal(false);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("idi:exchange-rate-updated"));
      }
    } catch (err: unknown) {
      console.error("Error al registrar pago", err);
      let message = "Error al procesar el pago de la orden";
      if (err && typeof err === "object" && "response" in err) {
        const resErr = err as { response?: { data?: { message?: string } } };
        if (resErr.response?.data?.message) {
          message = resErr.response.data.message;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }
      toast.error(message);
    } finally {
      setSubmittingPayment(false);
    }
  };

  const getPaymentStatusBadge = (status?: string) => {
    switch (status) {
      case "PAGADO":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            PAGADO (Solvente)
          </span>
        );
      case "PAGADO_PARCIAL":
      case "PARCIAL":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            PAGO PARCIAL (Con Saldo)
          </span>
        );
      case "PENDIENTE":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            PENDIENTE DE PAGO
          </span>
        );
    }
  };

  const getPaymentMethodBadge = (method?: string, pMethod?: string) => {
    const m = (method || pMethod || "TRANSFERENCIA").toUpperCase();
    if (m.includes("PAGO_MOVIL")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          Pago Móvil
        </span>
      );
    }
    if (m.includes("EFECTIVO")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Efectivo
        </span>
      );
    }
    if (m.includes("ZELLE")) {
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

  const renderSourceAccount = (p: SupplierPayment) => {
    if (p.sourceAccount) {
      return (
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
      );
    }
    if (p.bankName) {
      return <span className="text-slate-700 font-medium">{p.bankName}</span>;
    }
    const m = (p.method || p.paymentMethod || "").toUpperCase();
    if (m.includes("EFECTIVO")) {
      return <span className="text-slate-500 italic">Caja / Efectivo</span>;
    }
    if (m.includes("ZELLE")) {
      return <span className="text-slate-500 italic">Zelle Directo</span>;
    }
    return <span className="text-slate-400">---</span>;
  };

  const renderDestinationAccount = (p: SupplierPayment) => {
    if (p.destinationAccount) {
      return (
        <span className="font-mono text-slate-700">{p.destinationAccount}</span>
      );
    }
    return <span className="text-slate-400 italic">No especificada</span>;
  };

  const renderOriginalAmount = (p: SupplierPayment) => {
    const pCurr = p.transactionCurrency || (p.sourceAccount?.currency ?? "USD");
    const pAmount = Number(p.amountPaid ?? p.amount ?? 0);
    const pSymbol = pCurr === "VED" ? "Bs." : pCurr === "EUR" ? "€" : "$";
    return (
      <span className="font-mono font-semibold text-slate-900">
        {pSymbol}{" "}
        {pAmount.toLocaleString("es-VE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </span>
    );
  };

  const renderExchangeRate = (p: SupplierPayment) => {
    const pCurr = p.transactionCurrency || "USD";
    if (pCurr === "USD") {
      return (
        <span className="text-slate-400 font-mono text-[11px]">1.00 (Base)</span>
      );
    }
    const pRate = Number(p.exchangeRate || 0);
    if (pRate > 0) {
      return (
        <span className="font-mono text-[11px] text-slate-700 font-semibold">
          {pRate.toFixed(2)} Bs./{pCurr === "EUR" ? "€" : "$"}
        </span>
      );
    }
    return <span className="text-slate-400 font-mono text-[11px]">---</span>;
  };

  const renderAmortizedUsd = (p: SupplierPayment) => {
    const amortized = Number(p.amortizedAmountUsd || 0);
    if (amortized > 0) {
      return (
        <span className="font-mono font-bold text-emerald-700">
          ${" "}
          {amortized.toLocaleString("es-VE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{" "}
          USD
        </span>
      );
    }
    const pAmount = Number(p.amountPaid ?? p.amount ?? 0);
    return (
      <span className="font-mono font-bold text-slate-700">
        ${" "}
        {pAmount.toLocaleString("es-VE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}{" "}
        USD
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto print:p-0 print:m-0 print:max-w-none">
      {/* Encabezado de Acciones (Oculto en Impresión) */}
      <div className="no-print print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/purchasing/orders")}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Regresar al listado"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                {order.orderNumber || `#${order.id}`}
              </span>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-slate-100 text-slate-800 border-slate-200">
                {order.status}
              </span>
              {order.requisition && (
                <Link
                  href="/purchasing/requisitions"
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                  title="Ver preorden de compra"
                >
                  <FileText className="w-3 h-3" />
                  Preorden: {order.requisition.requisitionNumber}
                  <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                </Link>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              Orden de Compra Institucional
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canPay && (
            <button
              type="button"
              onClick={handleOpenPaymentModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Registrar Pago
            </button>
          )}
          {canReceive && (
            <button
              type="button"
              onClick={() =>
                router.push(`/purchasing/orders/${order.id}/receive`)
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5" />
              Recibir Mercancía
            </button>
          )}
          <PrintActionButton label="Imprimir / Exportar Orden PDF" />
        </div>
      </div>

      {/* Resumen Superior en Pantalla */}
      <div className="no-print print:hidden grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Proveedor */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Building2 className="w-4 h-4 text-blue-600" />
            Proveedor Adjudicado
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              {order.supplier?.name ?? "Sin proveedor"}
            </h3>
            <span className="font-mono text-xs text-slate-500 block">
              RIF: {order.supplier?.rifOrId || order.supplier?.rif || "N/A"}
            </span>
          </div>
        </div>

        {/* Importe en Moneda de la Orden */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Receipt className="w-4 h-4 text-emerald-600" />
            Total Factura ({currCode})
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {symbol}{" "}
            {totalAmount.toLocaleString("es-VE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <span className="text-[11px] text-slate-400 block font-mono">
            Moneda: {currCode} ({symbol})
          </span>
        </div>

        {/* Tasa BCV y Conversión Bs. */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Coins className="w-4 h-4 text-amber-600" />
            {currCode === "VED"
              ? "Total Moneda Nacional"
              : "Tasa BCV y Total Bs."}
          </div>
          <div className="text-base font-bold font-mono text-slate-900">
            {totalAmountBs != null
              ? `Bs. ${totalAmountBs.toLocaleString("es-VE", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : "N/A"}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
            <span>Tasa BCV:</span>
            <span className="font-bold text-slate-700">
              {currCode === "VED"
                ? "1.00 (Moneda Base)"
                : rate > 0
                  ? `${rate.toFixed(2)} Bs./${currCode === "EUR" ? "€" : "$"}`
                  : "No fijada"}
            </span>
          </div>
        </div>

        {/* Control */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Boxes className="w-4 h-4 text-purple-600" />
            Información y Control
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Fecha:</span>
              <span className="font-mono text-slate-700">
                {order.createdAt
                  ? new Date(order.createdAt).toLocaleDateString()
                  : "-"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Renglones:</span>
              <span className="font-semibold text-slate-800">
                {order.items?.length ?? 0}
              </span>
            </div>
            {order.requisition?.departmentSection && (
              <div className="flex justify-between">
                <span className="text-slate-500">Dpto.:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[120px]">
                  {order.requisition.departmentSection}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panel de Resumen Financiero y Estado de Pagos en Pantalla */}
      <div className="no-print print:hidden bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Resumen Financiero y Estado de Liquidación
              </h2>
              <p className="text-xs text-slate-500">
                Monitoreo multi-moneda de pagos realizados, amortización de deuda y saldo pendiente
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getPaymentStatusBadge(order.paymentStatus)}
            {canPay && (
              <button
                type="button"
                onClick={handleOpenPaymentModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                Registrar Pago
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          {/* Total Orden */}
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
              Total Orden
            </span>
            <div className="text-xl font-bold font-mono text-slate-900">
              $ {orderTotalUsd.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </div>
            <span className="text-xs font-mono text-slate-500 block">
              Equiv. Bs. {totalOrderBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Total Amortizado / Pagado */}
          <div className="p-3.5 rounded-lg bg-emerald-50/60 border border-emerald-200/80 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
              <span>Total Pagado / Amortizado</span>
              <span className="font-mono text-[10px] bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-800 font-bold">
                {orderTotalUsd > 0
                  ? Math.min(
                      100,
                      Math.round((totalPaidUsd / orderTotalUsd) * 100)
                    )
                  : 0}
                %
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-emerald-700">
              $ {totalPaidUsd.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </div>
            <span className="text-xs font-mono text-emerald-600 block">
              Equiv. Bs. {totalPaidBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Saldo Pendiente */}
          <div
            className={`p-3.5 rounded-lg border space-y-1 ${
              remainingDebtUsd > 0
                ? "bg-amber-50/60 border-amber-200/80"
                : "bg-slate-50 border-slate-200/80"
            }`}
          >
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider block ${
                remainingDebtUsd > 0 ? "text-amber-700" : "text-slate-500"
              }`}
            >
              Saldo Pendiente por Pagar
            </span>
            <div
              className={`text-xl font-bold font-mono ${
                remainingDebtUsd > 0 ? "text-amber-700" : "text-slate-700"
              }`}
            >
              $ {remainingDebtUsd.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
            </div>
            <span
              className={`text-xs font-mono block ${
                remainingDebtUsd > 0 ? "text-amber-600" : "text-slate-400"
              }`}
            >
              Equiv. Bs. {remainingDebtBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* COMPROBANTE OFICIAL DE ORDEN DE COMPRA SENIAT (IMPRIMIBLE) */}
      <PrintableDocument>
        <DocumentHeader
          title="ORDEN DE COMPRA INSTITUCIONAL"
          subtitle="Proforma Fiscal SENIAT · Instituto de Inmunología Clínica IDI"
          documentNumber={order.orderNumber || `#${order.id}`}
          badge="PROFORMA SENIAT"
          status={{
            label: order.status,
            className: "bg-slate-100 text-slate-800 border-slate-300",
          }}
          date={
            order.createdAt
              ? new Date(order.createdAt).toLocaleDateString("es-VE")
              : undefined
          }
        />

        {/* Datos de Emisión vs Datos del Proveedor Adjudicado */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 break-inside-avoid">
          {/* Emisor (Comprador Institucional) */}
          <div className="p-3.5 rounded-lg border border-slate-300 print:border-black bg-slate-50/50 print:bg-white space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 print:text-black block border-b border-slate-200 print:border-black pb-1">
              Datos de Emisión (Comprador Institucional)
            </span>
            <div className="text-xs font-bold text-slate-900 print:text-black">
              INMUNOLOGIA ASOCIACION CIVIL
            </div>
            <div className="font-mono text-xs font-bold text-slate-700 print:text-black">
              RIF: J-30710739-1
            </div>
            <div className="text-[11px] text-slate-600 print:text-slate-700">
              Dirección: Instituto de Inmunología Clínica, Caracas, Venezuela
            </div>
            <div className="text-[11px] text-slate-600 print:text-slate-700">
              Contacto: compras@idi.org.ve · administracion@idi.org.ve
            </div>
            {order.requisition?.departmentSection && (
              <div className="text-[11px] text-slate-600 print:text-slate-700">
                Área Solicitante:{" "}
                <span className="font-semibold">
                  {order.requisition.departmentSection}
                </span>
              </div>
            )}
          </div>

          {/* Proveedor Adjudicado */}
          <div className="p-3.5 rounded-lg border border-slate-300 print:border-black bg-slate-50/50 print:bg-white space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 print:text-black block border-b border-slate-200 print:border-black pb-1">
              Datos del Proveedor Adjudicado
            </span>
            <div className="text-xs font-bold text-slate-900 print:text-black">
              {order.supplier?.name ?? "Proveedor no asignado"}
            </div>
            <div className="font-mono text-xs font-bold text-slate-700 print:text-black">
              RIF: {order.supplier?.rifOrId || order.supplier?.rif || "N/A"}
            </div>
            <div className="text-[11px] text-slate-600 print:text-slate-700">
              Teléfono: {order.supplier?.phone || "No registrado"}
            </div>
            <div className="text-[11px] text-slate-600 print:text-slate-700">
              Contacto / Email:{" "}
              {order.supplier?.contactName ||
                order.supplier?.email ||
                "No registrado"}
            </div>
            {order.supplier?.address && (
              <div className="text-[11px] text-slate-600 print:text-slate-700">
                Dirección: {order.supplier.address}
              </div>
            )}
          </div>
        </div>

        {/* Metadatos de la Orden */}
        <DocumentMetadataGrid
          columns={4}
          items={[
            {
              label: "N° Orden de Compra",
              value: (
                <span className="font-mono font-bold">
                  {order.orderNumber || `#${order.id}`}
                </span>
              ),
            },
            {
              label: "Fecha de Emisión",
              value: order.createdAt
                ? new Date(order.createdAt).toLocaleDateString("es-VE")
                : "-",
            },
            {
              label: "Referencia Preorden",
              value: order.requisition?.requisitionNumber || "N/A",
            },
            {
              label: "Moneda / Condición",
              value: `${currCode} (${symbol}) • ${order.paymentStatus || "PENDIENTE"}`,
            },
          ]}
        />

        {/* Tabla de Renglones de la Orden */}
        <div className="space-y-2">
          <div className="flex justify-between items-center pb-1">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider print:text-black">
              Renglones de la Orden de Compra ({order.items?.length ?? 0})
            </h3>
            <span className="text-[10px] text-slate-500 font-mono print:text-black">
              Valores en moneda {currCode} ({symbol})
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-300 rounded-lg print:border-black print:rounded-none">
            <table className="min-w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-300 print:bg-slate-200 print:text-black print:border-black font-bold text-[11px]">
                <tr>
                  <th className="py-2 px-2.5 text-center border-r border-slate-300 print:border-black w-24">
                    SKU
                  </th>
                  <th className="py-2 px-3 border-r border-slate-300 print:border-black">
                    Descripción / Insumo
                  </th>
                  <th className="py-2 px-2.5 text-center border-r border-slate-300 print:border-black">
                    Unidad / Empaque
                  </th>
                  <th className="py-2 px-2 text-center border-r border-slate-300 print:border-black">
                    Factor
                  </th>
                  <th className="py-2 px-2.5 text-right border-r border-slate-300 print:border-black">
                    Cantidad
                  </th>
                  <th className="py-2 px-2.5 text-right border-r border-slate-300 print:border-black">
                    Precio Unit. ({symbol})
                  </th>
                  <th className="py-2 px-2.5 text-center border-r border-slate-300 print:border-black">
                    Exento
                  </th>
                  <th className="py-2 px-3 text-right">
                    Total Renglón ({symbol})
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 print:divide-black">
                {order.items?.map((item) => {
                  const lineTotal =
                    Number(item.quantityOrdered) * Number(item.unitPrice);
                  const unitText =
                    item.unit?.abbreviation ||
                    item.product?.baseUnit?.abbreviation ||
                    item.product?.unitOfMeasure ||
                    "UND";
                  const factorText =
                    Number(item.multiplier || 1) > 1
                      ? `x${item.multiplier}`
                      : "1:1";

                  return (
                    <tr
                      key={String(item.id)}
                      className="break-inside-avoid hover:bg-slate-50/70"
                    >
                      <td className="py-2 px-2.5 text-center font-mono font-bold text-slate-800 print:text-black border-r border-slate-200 print:border-black">
                        {item.product?.sku ?? "---"}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 print:border-black">
                        <div className="font-bold text-slate-900 print:text-black">
                          {item.product?.name}
                        </div>
                      </td>
                      <td className="py-2 px-2.5 text-center text-slate-700 print:text-black border-r border-slate-200 print:border-black uppercase">
                        {unitText}
                      </td>
                      <td className="py-2 px-2 text-center font-mono text-[11px] text-slate-600 print:text-black border-r border-slate-200 print:border-black">
                        {factorText}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900 print:text-black border-r border-slate-200 print:border-black">
                        {Number(item.quantityOrdered)}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-medium text-slate-800 print:text-black border-r border-slate-200 print:border-black">
                        {symbol} {Number(item.unitPrice).toFixed(2)}
                      </td>
                      <td className="py-2 px-2.5 text-center border-r border-slate-200 print:border-black">
                        {item.isExempt ? (
                          <span className="font-bold text-emerald-700 print:text-black text-[11px]">
                            Sí
                          </span>
                        ) : (
                          <span className="text-slate-600 print:text-black text-[11px]">
                            No (16%)
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 print:text-black">
                        {symbol} {lineTotal.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cuadro de Liquidación Fiscal SENIAT */}
        <div className="border border-slate-300 print:border-black rounded-lg p-4 bg-slate-50/50 print:bg-white break-inside-avoid space-y-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 border-b border-slate-200 print:border-black gap-2">
            <div>
              <h4 className="text-xs font-bold text-slate-900 print:text-black uppercase tracking-wider">
                Liquidación y Fiscalidad SENIAT (Venezuela)
              </h4>
              <p className="text-[10px] text-slate-500 print:text-black">
                Cálculo conforme a la Ley del Impuesto al Valor Agregado (IVA 16%) y Providencias Administrativas SENIAT
              </p>
            </div>
            <div className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-800 border border-slate-300 print:border-black print:bg-white print:text-black">
              {currCode === "VED"
                ? "Tasa oficial BCV: 1.00 (Moneda Base Nacional)"
                : `Tasa oficial BCV: ${effectiveBcvRate.toFixed(2)} Bs./${currCode === "EUR" ? "€" : "$"}`}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Moneda de la Orden */}
            <div className="space-y-1.5 text-xs bg-white print:bg-transparent p-3 rounded border border-slate-200 print:border-black">
              <span className="block font-bold text-slate-700 print:text-black border-b border-slate-100 print:border-black pb-1 uppercase text-[10px]">
                Totales en Moneda de la Orden ({currCode})
              </span>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 print:text-black">Base Imponible Gravable (16%):</span>
                <span className="font-mono font-semibold text-slate-900 print:text-black">
                  {symbol} {taxableAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 print:text-black">Subtotal Exento de IVA:</span>
                <span className="font-mono font-semibold text-slate-900 print:text-black">
                  {symbol} {exemptAmount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 print:text-black">Impuesto al Valor Agregado (IVA 16%):</span>
                <span className="font-mono font-semibold text-slate-900 print:text-black">
                  {symbol} {taxAmount.toFixed(2)}
                </span>
              </div>
              <div className="pt-1.5 border-t border-slate-200 print:border-black flex justify-between items-center text-sm font-bold">
                <span className="text-slate-900 print:text-black">Total en Divisa ({symbol}):</span>
                <span className="font-mono text-blue-900 print:text-black">
                  {symbol} {totalAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Equivalente en Bolívares */}
            <div className="space-y-1.5 text-xs bg-white print:bg-transparent p-3 rounded border border-slate-200 print:border-black">
              <span className="block font-bold text-slate-700 print:text-black border-b border-slate-100 print:border-black pb-1 uppercase text-[10px]">
                Liquidación Oficial en Bolívares (Bs.)
              </span>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 print:text-black">Base Gravable en Bs.:</span>
                <span className="font-mono font-semibold text-slate-900 print:text-black">
                  Bs. {(taxableAmount * (currCode === "VED" ? 1 : effectiveBcvRate)).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 print:text-black">Subtotal Exento en Bs.:</span>
                <span className="font-mono font-semibold text-slate-900 print:text-black">
                  Bs. {(exemptAmount * (currCode === "VED" ? 1 : effectiveBcvRate)).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-600 print:text-black">IVA 16% en Bs.:</span>
                <span className="font-mono font-semibold text-slate-900 print:text-black">
                  Bs. {(taxAmount * (currCode === "VED" ? 1 : effectiveBcvRate)).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="pt-1.5 border-t border-slate-200 print:border-black flex justify-between items-center text-sm font-bold">
                <span className="text-slate-900 print:text-black">Total en Bolívares (Bs.):</span>
                <span className="font-mono text-emerald-800 print:text-black">
                  Bs. {totalOrderBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 print:text-slate-600 italic text-right pt-0.5">
                Tasa oficial BCV: {effectiveBcvRate.toFixed(2)} Bs./divisa
              </div>
            </div>
          </div>
        </div>

        {/* Sección de 3 Firmas */}
        <DocumentSignatures
          signatures={[
            {
              role: "Elaborado por (Compras)",
              name: "Coordinación de Compras",
              department: "Unidad de Procura y Gestión de Proveedores",
              stampText: "Firma y Sello Compras",
            },
            {
              role: "Revisado por (Administración)",
              name: "Administración y Finanzas",
              department: "Control Presupuestario y Fiscal",
              stampText: "Firma y Sello Administración",
            },
            {
              role: "Aprobado por (Dirección)",
              name: "Dirección General IDI",
              department: "Instituto de Inmunología Clínica",
              stampText: "Firma y Sello Dirección",
            },
          ]}
        />

        {/* Pie del Documento */}
        <DocumentFooter
          notes={order.notes || "Esta Orden de Compra constituye un compromiso formal de adquisición y entrega sujeta a inspección física, control de calidad y liquidación de factura legal SENIAT."}
          institutionText="INMUNOLOGIA ASOCIACION CIVIL · RIF: J-30710739-1"
          systemSignature={`ERP-IDI v2.0 · Orden ${order.orderNumber || `#${order.id}`}`}
        />
      </PrintableDocument>

      {/* Historial de Pagos y Amortizaciones */}
      <div className="no-print print:hidden bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Historial de Pagos y Amortizaciones
              </h3>
              <p className="text-xs text-slate-500">
                Transacciones registradas, cuentas asociadas y deducción del saldo deudor
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
              {payments.length}{" "}
              {payments.length === 1 ? "pago registrado" : "pagos registrados"}
            </span>
            {canPay && (
              <button
                type="button"
                onClick={handleOpenPaymentModal}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Registrar Pago
              </button>
            )}
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <CreditCard className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800">
                No se han registrado pagos para esta orden
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Utilice el botón &quot;Registrar Pago&quot; para asentar
                transferencias, pagos móviles, Zelle o desembolsos en efectivo.
              </p>
            </div>
            {canPay && (
              <button
                type="button"
                onClick={handleOpenPaymentModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Registrar Primer Pago
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="py-3 px-4 text-left">Fecha</th>
                  <th className="py-3 px-4 text-left">Método</th>
                  <th className="py-3 px-4 text-left">Cuenta de Origen</th>
                  <th className="py-3 px-4 text-left">
                    Cuenta Destino / Proveedor
                  </th>
                  <th className="py-3 px-4 text-left">N° Referencia</th>
                  <th className="py-3 px-4 text-right">Monto Pagado</th>
                  <th className="py-3 px-4 text-center">Tasa Aplicada</th>
                  <th className="py-3 px-4 text-right">Amortizado (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p, idx) => (
                  <tr
                    key={`${p.id || "pay"}-${idx}`}
                    className="hover:bg-slate-50/80"
                  >
                    <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                      {p.paymentDate
                        ? new Date(p.paymentDate).toLocaleDateString("es-VE")
                        : p.createdAt
                          ? new Date(p.createdAt).toLocaleDateString("es-VE")
                          : "-"}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getPaymentMethodBadge(p.method, p.paymentMethod)}
                    </td>
                    <td className="py-3 px-4">{renderSourceAccount(p)}</td>
                    <td className="py-3 px-4">
                      {renderDestinationAccount(p)}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">
                      <div>{p.referenceNumber || p.reference || "S/R"}</div>
                      {(p.reviewedBy || p.authorizedBy || p.approvedBy) && (
                        <div className="text-[10px] text-slate-500 font-sans mt-0.5 space-y-0.5">
                          {p.reviewedBy && (
                            <div>
                              Rev:{" "}
                              <span className="font-semibold text-slate-700">
                                {p.reviewedBy}
                              </span>
                            </div>
                          )}
                          {p.authorizedBy && (
                            <div>
                              Aut:{" "}
                              <span className="font-semibold text-slate-700">
                                {p.authorizedBy}
                              </span>
                            </div>
                          )}
                          {p.approvedBy && (
                            <div>
                              Apr:{" "}
                              <span className="font-semibold text-slate-700">
                                {p.approvedBy}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {renderOriginalAmount(p)}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {renderExchangeRate(p)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {renderAmortizedUsd(p)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Dinámico de Registro de Pago */}
      {showPaymentModal && (
        <div className="no-print print:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Registrar Pago de Orden
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Orden {order.orderNumber || `#${order.id}`} &bull; Saldo: ${" "}
                    {remainingDebtUsd.toFixed(2)} USD
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterPayment} className="space-y-4">
              {/* Método de Pago */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Método de Pago *
                </label>
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
                  className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 bg-white"
                >
                  <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                  <option value="PAGO_MOVIL">Pago Móvil Interbancario</option>
                  <option value="EFECTIVO">Efectivo (Dólares / Bolívares)</option>
                  <option value="ZELLE">Zelle (USD)</option>
                </select>
              </div>

              {/* Campos condicionales para TRANSFERENCIA y PAGO_MOVIL */}
              {(paymentMethod === "TRANSFERENCIA" ||
                paymentMethod === "PAGO_MOVIL") && (
                <>
                  <div>
                    <label
                      htmlFor="sourceAccountId"
                      className="block text-xs font-semibold text-slate-700 uppercase mb-1"
                    >
                      Cuenta Bancaria Origen *
                    </label>
                    <select
                      id="sourceAccountId"
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
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      Cuenta Destino / Proveedor
                    </label>
                    <input
                      type="text"
                      value={destinationAccount}
                      onChange={(e) => setDestinationAccount(e.target.value)}
                      placeholder="N° de cuenta o datos de pago móvil del proveedor..."
                      className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-slate-800"
                    />
                  </div>
                </>
              )}

              {/* N° Referencia y Fecha de Pago */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                    {paymentMethod === "EFECTIVO"
                      ? "N° Recibo / Comprobante *"
                      : paymentMethod === "ZELLE"
                        ? "Referencia Zelle / Titular *"
                        : "N° de Referencia *"}
                  </label>
                  <input
                    type="text"
                    required
                    value={referenceNumber}
                    onChange={(e) => setReferenceNumber(e.target.value)}
                    placeholder="Ej. 98765432, ZL-88219"
                    className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
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
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
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
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-slate-600 uppercase">
                      Monto Pagado (
                      {transactionCurrency === "VED"
                        ? "Bs."
                        : transactionCurrency === "EUR"
                          ? "€"
                          : "$"}
                      ) *
                    </label>
                    {remainingDebtUsd > 0 && (
                      <button
                        type="button"
                        onClick={handleFillRemainingDebt}
                        className="text-[10px] text-blue-600 hover:text-blue-700 font-semibold underline cursor-pointer"
                      >
                        Pagar saldo total
                      </button>
                    )}
                  </div>
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
                    value={paymentExchangeRate}
                    onChange={(e) => setPaymentExchangeRate(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-slate-800 bg-white"
                  />
                  <p className="text-[11px] text-slate-500">
                    Precargada con la tasa BCV del día, editable si se acuerda
                    una tasa contractual específica.
                  </p>
                </div>
              )}

              {/* Indicador Reactivo de Amortización */}
              <div className="p-3.5 rounded-lg bg-blue-50/70 border border-blue-200/80 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-blue-900">
                    Equivale a amortizar de la deuda:
                  </span>
                  <span className="font-mono text-sm font-bold text-blue-800">
                    $ {dynamicAmortizedUsd.toFixed(2)} USD
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px] text-blue-700 font-mono">
                  <span>Deuda restante actual:</span>
                  <span>$ {remainingDebtUsd.toFixed(2)} USD</span>
                </div>
              </div>

              {/* Alerta de Sobrepago */}
              {isOverpaying && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2 text-rose-800 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div>
                    <span className="font-bold block">
                      El monto amortizado excede la deuda restante
                    </span>
                    <span>
                      Está intentando amortizar $ {dynamicAmortizedUsd.toFixed(2)}{" "}
                      USD, lo cual sobrepasa la deuda en ${" "}
                      {overpayAmount.toFixed(2)} USD. Ajuste el monto o haga clic
                      en &quot;Pagar saldo total&quot;.
                    </span>
                  </div>
                </div>
              )}

              {/* Firmas de Autorización */}
              <div className="border-t border-slate-200 pt-3 space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Firmas de Autorización del Pago
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
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    submittingPayment ||
                    isOverpaying ||
                    !amountPaid ||
                    Number(amountPaid) <= 0 ||
                    !referenceNumber.trim() ||
                    ((paymentMethod === "TRANSFERENCIA" ||
                      paymentMethod === "PAGO_MOVIL") &&
                      !sourceAccountId)
                  }
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs transition-colors"
                >
                  {submittingPayment && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Confirmar y Asentar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
