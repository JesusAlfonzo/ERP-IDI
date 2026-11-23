"use client";

import React, { useEffect, useMemo, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AuthService } from "@/services/auth.service";
import { TreasuryService } from "@/services/treasury.service";
import {
  BankAccountService,
  type BankAccountItem,
} from "@/services/bank-account.service";
import { CurrencyService } from "@/services/currency.service";
import type { AuthUser } from "@/types/auth";
import type {
  DailyExchangeRateLookup,
  PaymentOrder,
  PaymentOrderStatus,
  TreasuryPayment,
  TreasuryPaymentStatus,
} from "@/types/treasury";
import { cn } from "@/lib/utils";
import { toast } from "@/utils/toast";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Ban,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Coins,
  CreditCard,
  ExternalLink,
  FileCheck2,
  Info,
  Landmark,
  Loader2,
  Plus,
  Send,
  ShoppingCart,
  Sparkles,
  StickyNote,
  Trash2,
  Wallet,
  XCircle,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STATUS_BADGES: Record<
  PaymentOrderStatus,
  { label: string; className: string }
> = {
  BORRADOR: {
    label: "Borrador",
    className:
      "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  },
  PENDIENTE_APROBACION: {
    label: "Por Aprobar",
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  APROBADA: {
    label: "Aprobada",
    className:
      "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
  },
  PAGADA_PARCIALMENTE: {
    label: "Pago Parcial",
    className:
      "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
  },
  PAGADA: {
    label: "Pagada",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  RECHAZADA: {
    label: "Rechazada",
    className:
      "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  },
  ANULADA: {
    label: "Anulada",
    className:
      "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  },
};

const PAYMENT_STATUS_BADGES: Record<
  TreasuryPaymentStatus,
  { label: string; className: string }
> = {
  BORRADOR: {
    label: "Borrador",
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  CONFIRMADO: {
    label: "Confirmado",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  ANULADO: {
    label: "Anulado",
    className:
      "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  },
};

interface PaymentLineDraft {
  key: string;
  sourceAccountId: string;
  paymentMethod: string;
  amountPaid: string;
  referenceNumber: string;
  receiptUrl: string;
}

function normCurr(code?: string | null): "USD" | "VED" | "EUR" {
  const c = (code || "USD").trim().toUpperCase();
  if (c === "VES" || c === "VED" || c === "BS") return "VED";
  if (c === "EUR") return "EUR";
  return "USD";
}

function currSymbol(code?: string | null): string {
  const c = normCurr(code);
  if (c === "VED") return "Bs.";
  if (c === "EUR") return "€";
  return "$";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatMoney(val: number, curr?: string | null): string {
  return `${currSymbol(curr)} ${val.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getApiError(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message) return res.data.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

function computeLineConversion(params: {
  amountPaid: number;
  lineCurrency: "USD" | "VED" | "EUR";
  debtCurrency: "USD" | "VED" | "EUR";
  dailyRates: DailyExchangeRateLookup | null;
}): {
  rateDisplay: string;
  equivalentDebt: number;
  missingRateLabel: string | null;
} {
  const { amountPaid, lineCurrency, debtCurrency, dailyRates } = params;
  if (lineCurrency === debtCurrency) {
    return {
      rateDisplay: "1.0000 (Misma moneda)",
      equivalentDebt: round2(amountPaid),
      missingRateLabel: null,
    };
  }

  const usdRate = dailyRates?.hasUsdRate ? dailyRates.usdRate : null;
  const eurRate = dailyRates?.hasEurRate ? dailyRates.eurRate : null;

  if (debtCurrency === "USD" && lineCurrency === "VED") {
    if (!usdRate || usdRate <= 0) {
      return {
        rateDisplay: "Sin tasa USD",
        equivalentDebt: 0,
        missingRateLabel: "USD/Bs.",
      };
    }
    return {
      rateDisplay: `${usdRate.toFixed(4)} Bs./$`,
      equivalentDebt: round2(amountPaid / usdRate),
      missingRateLabel: null,
    };
  }

  if (debtCurrency === "VED" && lineCurrency === "USD") {
    if (!usdRate || usdRate <= 0) {
      return {
        rateDisplay: "Sin tasa USD",
        equivalentDebt: 0,
        missingRateLabel: "USD/Bs.",
      };
    }
    return {
      rateDisplay: `${usdRate.toFixed(4)} Bs./$`,
      equivalentDebt: round2(amountPaid * usdRate),
      missingRateLabel: null,
    };
  }

  if (debtCurrency === "EUR" && lineCurrency === "VED") {
    if (!eurRate || eurRate <= 0) {
      return {
        rateDisplay: "Sin tasa EUR",
        equivalentDebt: 0,
        missingRateLabel: "EUR/Bs.",
      };
    }
    return {
      rateDisplay: `${eurRate.toFixed(4)} Bs./€`,
      equivalentDebt: round2(amountPaid / eurRate),
      missingRateLabel: null,
    };
  }

  if (debtCurrency === "VED" && lineCurrency === "EUR") {
    if (!eurRate || eurRate <= 0) {
      return {
        rateDisplay: "Sin tasa EUR",
        equivalentDebt: 0,
        missingRateLabel: "EUR/Bs.",
      };
    }
    return {
      rateDisplay: `${eurRate.toFixed(4)} Bs./€`,
      equivalentDebt: round2(amountPaid * eurRate),
      missingRateLabel: null,
    };
  }

  if (debtCurrency === "USD" && lineCurrency === "EUR") {
    if (!eurRate || !usdRate || eurRate <= 0 || usdRate <= 0) {
      return {
        rateDisplay: "Sin tasa USD/EUR",
        equivalentDebt: 0,
        missingRateLabel: !usdRate ? "USD/Bs." : "EUR/Bs.",
      };
    }
    const cross = eurRate / usdRate;
    return {
      rateDisplay: `${cross.toFixed(4)} $/€`,
      equivalentDebt: round2((amountPaid * eurRate) / usdRate),
      missingRateLabel: null,
    };
  }

  // EUR debt, USD payment
  if (!eurRate || !usdRate || eurRate <= 0 || usdRate <= 0) {
    return {
      rateDisplay: "Sin tasa USD/EUR",
      equivalentDebt: 0,
      missingRateLabel: !usdRate ? "USD/Bs." : "EUR/Bs.",
    };
  }
  const cross = eurRate / usdRate;
  return {
    rateDisplay: `${cross.toFixed(4)} $/€`,
    equivalentDebt: round2((amountPaid * usdRate) / eurRate),
    missingRateLabel: null,
  };
}

function computeNeededLineAmount(params: {
  remainingInDebtCurrency: number;
  lineCurrency: "USD" | "VED" | "EUR";
  debtCurrency: "USD" | "VED" | "EUR";
  dailyRates: DailyExchangeRateLookup | null;
}): number | null {
  const { remainingInDebtCurrency, lineCurrency, debtCurrency, dailyRates } =
    params;
  if (remainingInDebtCurrency <= 0) return 0;
  if (lineCurrency === debtCurrency) return round2(remainingInDebtCurrency);

  const usdRate = dailyRates?.hasUsdRate ? dailyRates.usdRate : null;
  const eurRate = dailyRates?.hasEurRate ? dailyRates.eurRate : null;

  if (debtCurrency === "USD" && lineCurrency === "VED") {
    return usdRate ? round2(remainingInDebtCurrency * usdRate) : null;
  }
  if (debtCurrency === "VED" && lineCurrency === "USD") {
    return usdRate ? round2(remainingInDebtCurrency / usdRate) : null;
  }
  if (debtCurrency === "EUR" && lineCurrency === "VED") {
    return eurRate ? round2(remainingInDebtCurrency * eurRate) : null;
  }
  if (debtCurrency === "VED" && lineCurrency === "EUR") {
    return eurRate ? round2(remainingInDebtCurrency / eurRate) : null;
  }
  if (debtCurrency === "USD" && lineCurrency === "EUR") {
    return eurRate && usdRate
      ? round2((remainingInDebtCurrency * usdRate) / eurRate)
      : null;
  }
  // EUR debt, USD payment
  return eurRate && usdRate
    ? round2((remainingInDebtCurrency * eurRate) / usdRate)
    : null;
}

function formatReadablePaymentBreakdown(
  payment: TreasuryPayment,
  debtCurrency: string
): string {
  const total = Number(payment.totalEquivalentInDebtCurrency || 0);
  const dateLabel = new Date(
    payment.paymentDate.slice(0, 10) + "T12:00:00"
  ).toLocaleDateString("es-VE");

  const parts = payment.lines.map((line) => {
    const lCurr = normCurr(line.currency);
    const dCurr = normCurr(debtCurrency);
    const accName = line.sourceAccount?.bankName || `Cuenta #${line.sourceAccountId}`;
    const amtStr = formatMoney(Number(line.amountPaid || 0), lCurr);
    const rateVal = Number(line.exchangeRateValue || 1);
    return lCurr !== dCurr
      ? `${amtStr} ${accName} (Tasa ${rateVal.toFixed(2)})`
      : `${amtStr} ${accName}`;
  });

  return `Pagados ${formatMoney(total, debtCurrency)} ${normCurr(debtCurrency)} el ${dateLabel}: ${parts.join(" + ")}`;
}

export default function PaymentOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const poId = Array.isArray(rawId) ? rawId[0] : (rawId as string);

  const [currentUser] = useState<AuthUser | null>(() =>
    AuthService.getCurrentUser()
  );
  const userRoles = currentUser?.roles || [];
  const canApproveRole = userRoles.some((r) =>
    ["ADMINISTRADOR", "ADMINISTRACION", "COORDINADOR"].includes(r)
  );
  const canPayRole = userRoles.some((r) =>
    ["ADMINISTRADOR", "ADMINISTRACION"].includes(r)
  );
  const canEditRateRole = userRoles.some((r) =>
    ["ADMINISTRADOR", "COMPRAS", "ADMINISTRACION"].includes(r)
  );

  const [po, setPo] = useState<PaymentOrder | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modales de aprobación / rechazo / anulación
  const [approveOpen, setApproveOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Modal: Registrar Pago (Simple / Parcial / Mixto Multimoneda)
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [paymentDate, setPaymentDate] = useState<string>(
    () => new Date().toISOString().split("T")[0]
  );
  const [dailyRates, setDailyRates] = useState<DailyExchangeRateLookup | null>(
    null
  );
  const [loadingRates, setLoadingRates] = useState(false);
  const [lines, setLines] = useState<PaymentLineDraft[]>([]);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [submittingPay, setSubmittingPay] = useState(false);

  // Mini-panel inline para registrar tasa faltante del día sin salir del modal
  const [showQuickRateForm, setShowQuickRateForm] = useState(false);
  const [quickUsdRate, setQuickUsdRate] = useState("");
  const [quickEurRate, setQuickEurRate] = useState("");
  const [savingQuickRate, setSavingQuickRate] = useState(false);

  useEffect(() => {
    if (!poId) return;
    let ignore = false;
    void (async () => {
      try {
        const [poData, accountsData] = await Promise.all([
          TreasuryService.getPaymentOrderById(poId),
          BankAccountService.getBankAccounts(true).catch(() => []),
        ]);
        if (!ignore) {
          setPo(poData);
          setBankAccounts(accountsData.filter((a) => a.isActive));
        }
      } catch {
        if (!ignore) setPo(null);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [poId]);

  // Cargar tasas exactas de la fecha seleccionada cuando el modal está abierto
  useEffect(() => {
    if (!payModalOpen || !paymentDate) return;
    let ignore = false;
    void (async () => {
      setLoadingRates(true);
      try {
        const lookup = await CurrencyService.getRatesByDate(paymentDate);
        if (!ignore) {
          setDailyRates(lookup);
          if (lookup.latestFallback.USD && !quickUsdRate) {
            setQuickUsdRate(String(lookup.latestFallback.USD));
          }
          if (lookup.latestFallback.EUR && !quickEurRate) {
            setQuickEurRate(String(lookup.latestFallback.EUR));
          }
        }
      } catch {
        if (!ignore) setDailyRates(null);
      } finally {
        if (!ignore) setLoadingRates(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [payModalOpen, paymentDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const defaultAccountForCurrency = (
    targetCurr: "USD" | "VED" | "EUR"
  ): BankAccountItem | undefined => {
    return (
      bankAccounts.find((a) => normCurr(a.currency) === targetCurr) ||
      bankAccounts[0]
    );
  };

  const makeNewLine = (acc?: BankAccountItem): PaymentLineDraft => {
    const defaultMethod =
      acc?.type === "EFECTIVO" || acc?.type === "CAJA_CHICA"
        ? "EFECTIVO"
        : "TRANSFERENCIA";
    return {
      key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sourceAccountId: acc ? String(acc.id) : "",
      paymentMethod: defaultMethod,
      amountPaid: "",
      referenceNumber: "",
      receiptUrl: "",
    };
  };

  const openPaymentModal = () => {
    if (!po) return;
    const today = new Date().toISOString().split("T")[0];
    setPaymentDate(today);
    setPaymentNotes("");
    setShowQuickRateForm(false);
    const debtCurr = normCurr(po.debtCurrency);
    const defaultAcc = defaultAccountForCurrency(debtCurr);
    setLines([makeNewLine(defaultAcc)]);
    setPayModalOpen(true);
  };

  const updateLine = (key: string, patch: Partial<PaymentLineDraft>) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const next = { ...l, ...patch };
        if (patch.sourceAccountId !== undefined) {
          const acc = bankAccounts.find(
            (a) => String(a.id) === patch.sourceAccountId
          );
          if (acc) {
            next.paymentMethod =
              acc.type === "EFECTIVO" || acc.type === "CAJA_CHICA"
                ? "EFECTIVO"
                : "TRANSFERENCIA";
          }
        }
        return next;
      })
    );
  };

  const addSplitLine = () => {
    // Sugerir una cuenta diferente a las ya elegidas
    const usedIds = new Set(lines.map((l) => l.sourceAccountId));
    const nextAcc =
      bankAccounts.find((a) => !usedIds.has(String(a.id))) || bankAccounts[0];
    setLines((prev) => [...prev, makeNewLine(nextAcc)]);
  };

  const removeLine = (key: string) => {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  };

  const debtCurrency = normCurr(po?.debtCurrency);
  const totalDebt = Number(po?.totalDebtAmount || 0);
  const paidAmount = Number(po?.paidAmount || 0);
  const remainingBalance = Number(po?.remainingBalance || 0);

  // Cálculos en vivo para todas las líneas del modal
  const evaluatedLines = useMemo(() => {
    return lines.map((line) => {
      const acc = bankAccounts.find((a) => String(a.id) === line.sourceAccountId);
      const lineCurrency = normCurr(acc?.currency || debtCurrency);
      const parsedAmt = parseFloat(line.amountPaid) || 0;
      const conv = computeLineConversion({
        amountPaid: parsedAmt,
        lineCurrency,
        debtCurrency,
        dailyRates,
      });
      return {
        line,
        account: acc,
        lineCurrency,
        parsedAmt,
        ...conv,
      };
    });
  }, [lines, bankAccounts, debtCurrency, dailyRates]);

  const totalPaymentEquivalent = useMemo(
    () => round2(evaluatedLines.reduce((acc, el) => acc + el.equivalentDebt, 0)),
    [evaluatedLines]
  );

  const resultingRemaining = round2(remainingBalance - totalPaymentEquivalent);
  const isOverpaying = totalPaymentEquivalent > remainingBalance + 0.0001;
  const missingRates = useMemo(
    () =>
      Array.from(
        new Set(
          evaluatedLines
            .map((e) => e.missingRateLabel)
            .filter((x): x is string => Boolean(x))
        )
      ),
    [evaluatedLines]
  );

  const handleCompleteRemainingForLine = (lineKey: string) => {
    const otherEq = round2(
      evaluatedLines
        .filter((e) => e.line.key !== lineKey)
        .reduce((acc, e) => acc + e.equivalentDebt, 0)
    );
    const neededInDebt = Math.max(0, round2(remainingBalance - otherEq));
    const target = evaluatedLines.find((e) => e.line.key === lineKey);
    if (!target) return;

    const neededInLineCurr = computeNeededLineAmount({
      remainingInDebtCurrency: neededInDebt,
      lineCurrency: target.lineCurrency,
      debtCurrency,
      dailyRates,
    });

    if (neededInLineCurr === null) {
      toast.error(
        `Registre primero la tasa del día ${paymentDate} para calcular el saldo en ${target.lineCurrency}.`
      );
      return;
    }
    updateLine(lineKey, { amountPaid: neededInLineCurr.toFixed(2) });
  };

  const handleSaveQuickDailyRate = async () => {
    const usdVal = parseFloat(quickUsdRate);
    const eurVal = parseFloat(quickEurRate);
    if (
      (Number.isNaN(usdVal) || usdVal <= 0) &&
      (Number.isNaN(eurVal) || eurVal <= 0)
    ) {
      toast.error("Indique al menos una tasa válida mayor a 0.");
      return;
    }

    setSavingQuickRate(true);
    try {
      await CurrencyService.updateExchangeRate({
        usdRate: !Number.isNaN(usdVal) && usdVal > 0 ? usdVal : undefined,
        eurRate: !Number.isNaN(eurVal) && eurVal > 0 ? eurVal : undefined,
        effectiveDate: paymentDate,
      });
      const fresh = await CurrencyService.getRatesByDate(paymentDate);
      setDailyRates(fresh);
      setShowQuickRateForm(false);
      toast.success(`Tasa del día ${paymentDate} registrada correctamente.`);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("idi:exchange-rate-updated"));
      }
    } catch (err) {
      toast.error(getApiError(err, "No se pudo guardar la tasa del día."));
    } finally {
      setSavingQuickRate(false);
    }
  };

  const handleSubmitPayment = async (confirmImmediately: boolean) => {
    if (!po) return;
    if (evaluatedLines.some((e) => !e.line.sourceAccountId)) {
      toast.error("Seleccione la cuenta origen en todas las líneas de pago.");
      return;
    }
    if (evaluatedLines.some((e) => e.parsedAmt <= 0)) {
      toast.error("El monto de cada línea debe ser mayor a 0.");
      return;
    }
    if (missingRates.length > 0) {
      toast.error(
        `Falta registrar la tasa manual (${missingRates.join(", ")}) para la fecha ${paymentDate}.`
      );
      return;
    }
    if (isOverpaying) {
      toast.error(
        `El total del pago (${formatMoney(totalPaymentEquivalent, debtCurrency)}) supera el saldo pendiente (${formatMoney(remainingBalance, debtCurrency)}).`
      );
      return;
    }

    setSubmittingPay(true);
    try {
      const result = await TreasuryService.createTreasuryPayment(po.id, {
        paymentDate,
        notes: paymentNotes.trim() || null,
        confirmImmediately,
        lines: evaluatedLines.map((e) => ({
          sourceAccountId: Number(e.line.sourceAccountId),
          paymentMethod: e.line.paymentMethod,
          amountPaid: e.parsedAmt,
          referenceNumber: e.line.referenceNumber.trim() || null,
          receiptUrl: e.line.receiptUrl.trim() || null,
        })),
      });
      setPo(result.paymentOrder);
      setPayModalOpen(false);
      toast.success(
        confirmImmediately
          ? `Pago ${result.payment.paymentNumber} confirmado y descontado del saldo.`
          : `Borrador ${result.payment.paymentNumber} guardado.`
      );
    } catch (err) {
      toast.error(getApiError(err, "No se pudo procesar el pago."));
    } finally {
      setSubmittingPay(false);
    }
  };

  const handleApprove = async (e: FormEvent) => {
    e.preventDefault();
    if (!po) return;
    setActionLoading(true);
    try {
      const updated = await TreasuryService.approvePaymentOrder(
        po.id,
        approvalNotes.trim() || undefined
      );
      setPo(updated);
      setApproveOpen(false);
      setApprovalNotes("");
      toast.success(`Orden de Pago ${updated.paymentOrderNumber} aprobada.`);
    } catch (err) {
      toast.error(getApiError(err, "Error al aprobar la Orden de Pago."));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e: FormEvent) => {
    e.preventDefault();
    if (!po || rejectionReason.trim().length < 5) {
      toast.error("Indique un motivo de rechazo (mínimo 5 caracteres).");
      return;
    }
    setActionLoading(true);
    try {
      const updated = await TreasuryService.rejectPaymentOrder(
        po.id,
        rejectionReason.trim()
      );
      setPo(updated);
      setRejectOpen(false);
      setRejectionReason("");
      toast.success(`Orden de Pago ${updated.paymentOrderNumber} rechazada.`);
    } catch (err) {
      toast.error(getApiError(err, "Error al rechazar."));
    } finally {
      setActionLoading(false);
    }
  };

  const handleResubmit = async () => {
    if (!po) return;
    setActionLoading(true);
    try {
      const updated = await TreasuryService.resubmitPaymentOrder(po.id);
      setPo(updated);
      toast.success("Orden de Pago reenviada a aprobación.");
    } catch (err) {
      toast.error(getApiError(err, "Error al reenviar."));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (e: FormEvent) => {
    e.preventDefault();
    if (!po) return;
    setActionLoading(true);
    try {
      const updated = await TreasuryService.cancelPaymentOrder(
        po.id,
        cancelReason.trim() || undefined
      );
      setPo(updated);
      setCancelOpen(false);
      setCancelReason("");
      toast.success("Orden de Pago anulada.");
    } catch (err) {
      toast.error(getApiError(err, "Error al anular."));
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDraft = async (payment: TreasuryPayment) => {
    setActionLoading(true);
    try {
      const res = await TreasuryService.confirmTreasuryPayment(payment.id);
      setPo(res.paymentOrder);
      toast.success(
        `Pago ${payment.paymentNumber} confirmado y aplicado al saldo.`
      );
    } catch (err) {
      toast.error(getApiError(err, "No se pudo confirmar el pago."));
    } finally {
      setActionLoading(false);
    }
  };

  const handleVoidDraft = async (payment: TreasuryPayment) => {
    if (!confirm(`¿Anular el borrador de pago ${payment.paymentNumber}?`)) {
      return;
    }
    setActionLoading(true);
    try {
      const updated = await TreasuryService.voidTreasuryPayment(payment.id);
      setPo(updated);
      toast.success(`Borrador ${payment.paymentNumber} anulado.`);
    } catch (err) {
      toast.error(getApiError(err, "No se pudo anular el borrador."));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-medium">
          Cargando Orden de Pago...
        </span>
      </div>
    );
  }

  if (!po) {
    return (
      <div className="max-w-md mx-auto py-12">
        <Card className="p-6 text-center space-y-4 border-border shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">
              Orden de Pago no encontrada
            </h2>
            <p className="text-xs text-muted-foreground">
              El documento solicitado no existe o fue eliminado.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
            <Link href="/purchasing/debts">
              <ArrowLeft className="w-3.5 h-3.5" /> Volver a Tesorería
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  const badge = STATUS_BADGES[po.status] || STATUS_BADGES.PENDIENTE_APROBACION;
  const isPurchase = po.sourceType === "PURCHASE_ORDER";
  const originCode = isPurchase
    ? po.purchaseOrder?.orderNumber || `ORD-${po.purchaseOrderId}`
    : po.serviceOrder?.serviceOrderNumber || `OS-${po.serviceOrderId}`;
  const originHref = isPurchase
    ? `/purchasing/orders/${po.purchaseOrderId}`
    : `/admin/financial/payments/${po.serviceOrderId}`;

  const paidPercent =
    totalDebt > 0 ? Math.min(100, Math.round((paidAmount / totalDebt) * 100)) : 0;

  const canApproveOrReject =
    (po.status === "PENDIENTE_APROBACION" || po.status === "BORRADOR") &&
    canApproveRole;
  const canResubmit = po.status === "RECHAZADA";
  const canRegisterPay =
    (po.status === "APROBADA" || po.status === "PAGADA_PARCIALMENTE") &&
    canPayRole;
  const canCancel =
    po.status !== "PAGADA" &&
    po.status !== "ANULADA" &&
    paidAmount <= 0 &&
    canApproveRole;

  const stepIndex =
    po.status === "PENDIENTE_APROBACION" ||
    po.status === "BORRADOR" ||
    po.status === "RECHAZADA"
      ? 1
      : po.status === "APROBADA" || po.status === "PAGADA_PARCIALMENTE"
        ? 2
        : po.status === "PAGADA"
          ? 3
          : -1;

  const steps = [
    { label: "Orden de Pago", desc: po.paymentOrderNumber },
    {
      label: "Aprobación",
      desc:
        po.status === "RECHAZADA"
          ? "Rechazada"
          : po.approvedAt
            ? new Date(po.approvedAt).toLocaleDateString("es-VE")
            : "Pendiente",
    },
    {
      label: "Liquidación",
      desc:
        po.status === "PAGADA"
          ? "Pagada (100%)"
          : paidPercent > 0
            ? `Parcial (${paidPercent}%)`
            : "Pendiente",
    },
  ];

  const paymentsList = po.payments || [];

  return (
    <div className="space-y-5 pb-12">
      {/* ========================================================
          NIVEL 1: ENCABEZADO Y ACCIONES POR ROL Y ESTADO
         ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-start sm:items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => router.push("/purchasing/debts")}
            className="h-9 w-9 shrink-0 cursor-pointer"
            title="Volver a Pagos y Tesorería"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <FileCheck2 className="w-6 h-6 text-primary" />
                {po.paymentOrderNumber}
              </h1>
              <Link href={originHref} title="Ir al documento de origen">
                <Badge
                  variant="outline"
                  className="text-xs font-mono gap-1 hover:border-primary/50 hover:text-primary transition-colors cursor-pointer"
                >
                  {isPurchase ? (
                    <ShoppingCart className="w-3 h-3" />
                  ) : (
                    <Wallet className="w-3 h-3" />
                  )}
                  <span>
                    {isPurchase ? "Compra" : "Servicio"} {originCode}
                  </span>
                  <ExternalLink className="w-3 h-3" />
                </Badge>
              </Link>
              <Badge variant="outline" className={cn("text-xs", badge.className)}>
                {badge.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {po.beneficiaryName}
              {po.supplier?.rifOrId && ` · ${po.supplier.rifOrId}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {canCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCancelOpen(true)}
              className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Anular</span>
            </Button>
          )}

          {canResubmit && (
            <Button
              type="button"
              size="sm"
              disabled={actionLoading}
              onClick={() => void handleResubmit()}
              className="h-9 gap-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Reenviar a Aprobación</span>
            </Button>
          )}

          {canApproveOrReject && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRejectOpen(true)}
                className="h-9 gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Rechazar</span>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setApproveOpen(true)}
                className="h-9 gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-2xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Aprobar Orden de Pago</span>
              </Button>
            </>
          )}

          {canRegisterPay && (
            <Button
              type="button"
              size="sm"
              onClick={openPaymentModal}
              className="h-9 gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-2xs"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Registrar Pago</span>
            </Button>
          )}
        </div>
      </div>

      {/* ========================================================
          STEPPER VISUAL DE 3 ETAPAS
         ======================================================== */}
      <Card className="p-4 border-border shadow-2xs">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {steps.map((step, i) => {
            const isCompleted = stepIndex > i;
            const isCurrent =
              stepIndex === i &&
              po.status !== "RECHAZADA" &&
              po.status !== "ANULADA";
            const isRejectedHere = i === 1 && po.status === "RECHAZADA";

            return (
              <div
                key={step.label}
                className={cn(
                  "p-3 rounded-xl border flex items-center gap-3",
                  isCompleted
                    ? "bg-emerald-500/5 border-emerald-500/25"
                    : isRejectedHere
                      ? "bg-rose-500/5 border-rose-500/30"
                      : isCurrent
                        ? "bg-primary/5 border-primary/30"
                        : "bg-muted/20 border-border"
                )}
              >
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0",
                    isCompleted
                      ? "bg-emerald-600 text-white"
                      : isRejectedHere
                        ? "bg-rose-600 text-white"
                        : isCurrent
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : isRejectedHere ? (
                    <XCircle className="w-3.5 h-3.5" />
                  ) : (
                    i + 1
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-foreground truncate">
                    {step.label}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono truncate">
                    {step.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Aviso si está bloqueada por aprobación pendiente o rechazada */}
      {po.status === "PENDIENTE_APROBACION" && (
        <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-center gap-3 text-xs text-foreground">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            Esta Orden de Pago está <strong>pendiente de aprobación</strong>. No se pueden registrar ni confirmar pagos hasta que sea aprobada por Administración o Coordinación.
          </span>
        </div>
      )}

      {(po.status === "RECHAZADA" || po.status === "ANULADA") &&
        po.rejectionReason && (
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 flex items-start gap-3 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-rose-700 dark:text-rose-400">
                {po.status === "RECHAZADA"
                  ? "Motivo de Rechazo"
                  : "Motivo de Anulación"}
              </p>
              <p className="text-foreground">{po.rejectionReason}</p>
            </div>
          </div>
        )}

      {/* ========================================================
          TARJETA RESUMEN DE DEUDA: TOTAL · ABONADO · SALDO PENDIENTE
         ======================================================== */}
      <Card className="p-5 border-border shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pb-4 border-b border-border">
          {/* Col 1: Documento de Origen (ubicación estándar ERP-IDI) */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              {isPurchase ? (
                <ShoppingCart className="w-3.5 h-3.5 text-primary" />
              ) : (
                <Wallet className="w-3.5 h-3.5 text-primary" />
              )}
              Documento Origen
            </span>
            <Link
              href={originHref}
              className="inline-flex items-center gap-1.5 text-sm font-bold font-mono text-primary hover:underline"
            >
              <span>{originCode}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <p className="text-[11px] text-muted-foreground">
              {isPurchase ? "Orden de Compra" : "Orden de Servicio"}
            </p>
          </div>

          {/* Col 2: Deuda Total */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Deuda Total ({debtCurrency})
            </span>
            <p className="text-lg font-bold font-mono text-foreground leading-snug">
              {formatMoney(totalDebt, debtCurrency)}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Moneda pactada: {debtCurrency}
            </p>
          </div>

          {/* Col 3: Total Abonado */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Total Abonado
            </span>
            <p className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 leading-snug">
              {formatMoney(paidAmount, debtCurrency)}
            </p>
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-emerald-600 transition-all"
                style={{ width: `${paidPercent}%` }}
              />
            </div>
          </div>

          {/* Col 4: Saldo Pendiente */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Saldo Pendiente
            </span>
            <p
              className={cn(
                "text-lg font-bold font-mono leading-snug",
                remainingBalance > 0.009
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400"
              )}
            >
              {formatMoney(remainingBalance, debtCurrency)}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              {remainingBalance <= 0.009
                ? "Liquidada 100%"
                : `Resta ${100 - paidPercent}% por cancelar`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-1">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              Proveedor / Beneficiario
            </span>
            <p className="font-semibold text-foreground">{po.beneficiaryName}</p>
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Concepto
            </span>
            <p className="text-foreground">{po.concept}</p>
          </div>
        </div>
      </Card>

      {/* ========================================================
          HISTORIAL DE PAGOS Y DESGLOSE POR CUENTA / MONEDA
         ======================================================== */}
      <Card className="overflow-hidden border-border shadow-2xs">
        <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold text-foreground">
              Historial de Pagos ({paymentsList.length})
            </CardTitle>
          </div>

          {canRegisterPay && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={openPaymentModal}
              className="h-8 gap-1.5 text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Abono / Pago</span>
            </Button>
          )}
        </div>

        {paymentsList.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
            <p>Aún no se han registrado pagos contra esta Orden de Pago.</p>
            {canRegisterPay && (
              <Button
                type="button"
                size="sm"
                onClick={openPaymentModal}
                className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Registrar Primer Pago</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {paymentsList.map((payment) => {
              const pBadge =
                PAYMENT_STATUS_BADGES[payment.status] ||
                PAYMENT_STATUS_BADGES.BORRADOR;
              const isDraftPay = payment.status === "BORRADOR";

              return (
                <div key={String(payment.id)} className="p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs text-foreground">
                        {payment.paymentNumber}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn("text-[10px]", pBadge.className)}
                      >
                        {pBadge.label}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground font-mono flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(
                          payment.paymentDate.slice(0, 10) + "T12:00:00"
                        ).toLocaleDateString("es-VE")}
                      </span>
                      {payment.lines.length > 1 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20"
                        >
                          Pago Mixto ({payment.lines.length} cuentas)
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        {formatMoney(
                          Number(payment.totalEquivalentInDebtCurrency || 0),
                          debtCurrency
                        )}
                      </span>

                      {isDraftPay && canPayRole && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => void handleConfirmDraft(payment)}
                            className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Confirmar</span>
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={actionLoading}
                            onClick={() => void handleVoidDraft(payment)}
                            className="h-7 text-xs gap-1 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                          >
                            <Ban className="w-3 h-3" />
                            <span>Anular</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Resumen legible en lenguaje claro */}
                  <div className="text-xs text-foreground bg-muted/30 border border-border rounded-lg px-3 py-2">
                    {formatReadablePaymentBreakdown(payment, debtCurrency)}
                  </div>

                  {/* Desglose tabular por cuenta / moneda */}
                  <div className="border border-border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/20">
                          <TableHead className="py-2 px-3 text-[11px]">
                            Cuenta Origen
                          </TableHead>
                          <TableHead className="py-2 px-3 text-[11px]">
                            Método
                          </TableHead>
                          <TableHead className="py-2 px-3 text-[11px]">
                            Referencia
                          </TableHead>
                          <TableHead className="py-2 px-3 text-[11px] text-right">
                            Monto Pagado
                          </TableHead>
                          <TableHead className="py-2 px-3 text-[11px] text-center">
                            Tasa del Día
                          </TableHead>
                          <TableHead className="py-2 px-3 text-[11px] text-right">
                            Descontado ({debtCurrency})
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payment.lines.map((line) => (
                          <TableRow key={String(line.id)} className="text-xs">
                            <TableCell className="py-2 px-3">
                              <div className="font-medium text-foreground">
                                {line.sourceAccount?.bankName ||
                                  `Cuenta #${line.sourceAccountId}`}
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                {line.sourceAccount?.type || "CUENTA"} ·{" "}
                                {normCurr(line.currency)}
                              </div>
                            </TableCell>
                            <TableCell className="py-2 px-3 text-muted-foreground">
                              {line.paymentMethod}
                            </TableCell>
                            <TableCell className="py-2 px-3 font-mono text-muted-foreground">
                              {line.referenceNumber || "S/R"}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-semibold text-foreground">
                              {formatMoney(
                                Number(line.amountPaid || 0),
                                line.currency
                              )}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-center font-mono text-muted-foreground">
                              {normCurr(line.currency) === debtCurrency
                                ? "1.00"
                                : Number(line.exchangeRateValue || 1).toFixed(4)}
                            </TableCell>
                            <TableCell className="py-2 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {formatMoney(
                                Number(line.equivalentDebtAmount || 0),
                                debtCurrency
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {payment.notes && (
                    <p className="text-[11px] text-muted-foreground">
                      <strong className="text-foreground">Observaciones:</strong>{" "}
                      {payment.notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ========================================================
          DETALLES SECUNDARIOS Y AUDITORÍA
         ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4 border-border/80 bg-muted/10 shadow-none space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <StickyNote className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Notas e Instrucciones
            </span>
          </div>
          {po.notes || po.approvalNotes ? (
            <div className="text-xs text-foreground space-y-1.5 whitespace-pre-line">
              {po.notes && <p>{po.notes}</p>}
              {po.approvalNotes && (
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Aprobación:</strong>{" "}
                  {po.approvalNotes}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Sin notas registradas.
            </p>
          )}
        </Card>

        <Card className="p-4 border-border/80 bg-muted/10 shadow-none space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Info className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Auditoría
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] pt-1">
            <div>
              <span className="text-muted-foreground block">Generada por</span>
              <span className="font-semibold text-foreground">
                {po.createdBy?.fullName || "-"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Aprobada por</span>
              <span className="font-semibold text-foreground">
                {po.approvedBy?.fullName || "-"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Creada el</span>
              <span className="font-mono text-foreground">
                {new Date(po.createdAt).toLocaleString("es-VE")}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Aprobada el</span>
              <span className="font-mono text-foreground">
                {po.approvedAt
                  ? new Date(po.approvedAt).toLocaleString("es-VE")
                  : "-"}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* ========================================================
          MODAL PRINCIPAL: REGISTRAR PAGO (SIMPLE, PARCIAL O MIXTO)
         ======================================================== */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              Registrar Pago · {po.paymentOrderNumber}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {po.beneficiaryName} · Puede realizar un pago completo, abono parcial o dividir el pago entre varias cuentas y monedas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Resumen en vivo del impacto del pago */}
            <div className="grid grid-cols-3 gap-3 p-3 rounded-xl border border-border bg-muted/30">
              <div>
                <div className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Saldo Pendiente
                </div>
                <div className="text-sm font-bold font-mono text-foreground mt-0.5">
                  {formatMoney(remainingBalance, debtCurrency)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Total Este Pago
                </div>
                <div
                  className={cn(
                    "text-sm font-bold font-mono mt-0.5",
                    isOverpaying
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-primary"
                  )}
                >
                  {formatMoney(totalPaymentEquivalent, debtCurrency)}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Saldo Restante
                </div>
                <div
                  className={cn(
                    "text-sm font-bold font-mono mt-0.5",
                    isOverpaying
                      ? "text-rose-600 dark:text-rose-400"
                      : resultingRemaining <= 0.009
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                  )}
                >
                  {isOverpaying
                    ? `Excede por ${formatMoney(totalPaymentEquivalent - remainingBalance, debtCurrency)}`
                    : resultingRemaining <= 0.009
                      ? `${formatMoney(0, debtCurrency)} (Liquida 100%)`
                      : formatMoney(resultingRemaining, debtCurrency)}
                </div>
              </div>
            </div>

            {/* Fecha de pago + Tasas del día precargadas automáticamente */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase">
                  Fecha de Pago *
                </Label>
                <Input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="p-2.5 rounded-lg border border-border bg-muted/20 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Coins className="w-4 h-4 text-primary shrink-0" />
                  {loadingRates ? (
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Consultando tasa del día...
                    </span>
                  ) : dailyRates ? (
                    <div className="truncate font-mono text-[11px]">
                      <span className="text-muted-foreground">
                        Tasa {dailyRates.date}:{" "}
                      </span>
                      <strong
                        className={
                          dailyRates.hasUsdRate
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-amber-600 dark:text-amber-400"
                        }
                      >
                        USD{" "}
                        {dailyRates.hasUsdRate
                          ? dailyRates.usdRate?.toFixed(2)
                          : "Sin reg."}
                      </strong>
                      <span className="text-muted-foreground"> · </span>
                      <strong
                        className={
                          dailyRates.hasEurRate
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-amber-600 dark:text-amber-400"
                        }
                      >
                        EUR{" "}
                        {dailyRates.hasEurRate
                          ? dailyRates.eurRate?.toFixed(2)
                          : "Sin reg."}
                      </strong>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      Sin consulta de tasa
                    </span>
                  )}
                </div>

                {canEditRateRole && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowQuickRateForm((p) => !p)}
                    className="h-7 px-2 text-[11px] text-primary shrink-0 cursor-pointer"
                  >
                    {showQuickRateForm ? "Cerrar" : "Registrar tasa"}
                  </Button>
                )}
              </div>
            </div>

            {/* Aviso de tasa faltante o panel rápido para registrarla sin fricción */}
            {(missingRates.length > 0 || showQuickRateForm) && (
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3 text-xs">
                {missingRates.length > 0 && (
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-800 dark:text-amber-300">
                        Falta registrar la tasa manual ({missingRates.join(", ")}) para el{" "}
                        {paymentDate}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Para pagos en moneda distinta a la deuda, el sistema exige la tasa oficial del día registrada en el maestro.
                      </p>
                    </div>
                  </div>
                )}

                {canEditRateRole && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end pt-1">
                    <div>
                      <Label className="text-[10px] uppercase font-semibold">
                        Tasa USD (Bs./$)
                      </Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={quickUsdRate}
                        onChange={(e) => setQuickUsdRate(e.target.value)}
                        placeholder="Ej: 80.00"
                        className="h-8 text-xs font-mono mt-1 bg-background"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase font-semibold">
                        Tasa EUR (Bs./€)
                      </Label>
                      <Input
                        type="number"
                        step="0.0001"
                        value={quickEurRate}
                        onChange={(e) => setQuickEurRate(e.target.value)}
                        placeholder="Ej: 88.00"
                        className="h-8 text-xs font-mono mt-1 bg-background"
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      disabled={savingQuickRate}
                      onClick={() => void handleSaveQuickDailyRate()}
                      className="h-8 text-xs gap-1.5 cursor-pointer"
                    >
                      {savingQuickRate && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      )}
                      <span>Guardar Tasa ({paymentDate})</span>
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Líneas de Pago (1 por defecto + botón agregar cuenta/moneda) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Cuentas y Montos ({lines.length})
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSplitLine}
                  className="h-7 text-xs gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agregar otra cuenta / moneda</span>
                </Button>
              </div>

              {evaluatedLines.map((ev, idx) => (
                <div
                  key={ev.line.key}
                  className="p-3.5 rounded-xl border border-border bg-card space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        Línea #{idx + 1}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono bg-primary/5 text-primary border-primary/20"
                      >
                        {ev.lineCurrency}
                      </Badge>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        Tasa: {ev.rateDisplay}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        = {formatMoney(ev.equivalentDebt, debtCurrency)}
                      </span>
                      {lines.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(ev.line.key)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
                          title="Quitar línea"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-5 space-y-1">
                      <Label className="text-[11px] font-semibold">
                        Cuenta / Caja Origen *
                      </Label>
                      <select
                        value={ev.line.sourceAccountId}
                        onChange={(e) =>
                          updateLine(ev.line.key, {
                            sourceAccountId: e.target.value,
                          })
                        }
                        className="w-full h-9 bg-background border border-input rounded-lg px-2.5 text-xs"
                      >
                        <option value="">Seleccione cuenta...</option>
                        {bankAccounts.map((acc) => (
                          <option key={acc.id} value={String(acc.id)}>
                            {acc.bankName} ({normCurr(acc.currency)} · {acc.type})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:col-span-3 space-y-1">
                      <Label className="text-[11px] font-semibold">Método</Label>
                      <select
                        value={ev.line.paymentMethod}
                        onChange={(e) =>
                          updateLine(ev.line.key, {
                            paymentMethod: e.target.value,
                          })
                        }
                        className="w-full h-9 bg-background border border-input rounded-lg px-2.5 text-xs"
                      >
                        <option value="TRANSFERENCIA">Transferencia</option>
                        <option value="PAGO_MOVIL">Pago Móvil</option>
                        <option value="EFECTIVO">Efectivo / Caja</option>
                        <option value="ZELLE">Zelle</option>
                      </select>
                    </div>

                    <div className="sm:col-span-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-semibold">
                          Monto ({currSymbol(ev.lineCurrency)}) *
                        </Label>
                        <button
                          type="button"
                          onClick={() =>
                            handleCompleteRemainingForLine(ev.line.key)
                          }
                          className="text-[10px] font-semibold text-primary hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                          title="Completar exactamente el saldo pendiente restante"
                        >
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Completar saldo</span>
                        </button>
                      </div>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={ev.line.amountPaid}
                        onChange={(e) =>
                          updateLine(ev.line.key, { amountPaid: e.target.value })
                        }
                        placeholder="0.00"
                        className="h-9 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold">
                        N° Referencia / Comprobante
                      </Label>
                      <Input
                        type="text"
                        value={ev.line.referenceNumber}
                        onChange={(e) =>
                          updateLine(ev.line.key, {
                            referenceNumber: e.target.value,
                          })
                        }
                        placeholder="Ej: REF-00819273 o Recibo Caja #12"
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold">
                        Enlace Soporte (Opcional)
                      </Label>
                      <Input
                        type="url"
                        value={ev.line.receiptUrl}
                        onChange={(e) =>
                          updateLine(ev.line.key, { receiptUrl: e.target.value })
                        }
                        placeholder="https://..."
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase">
                Observaciones del Pago (Opcional)
              </Label>
              <Textarea
                rows={2}
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Detalle o aclaratoria del desembolso..."
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPayModalOpen(false)}
              disabled={submittingPay}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={
                submittingPay ||
                isOverpaying ||
                missingRates.length > 0 ||
                totalPaymentEquivalent <= 0
              }
              onClick={() => void handleSubmitPayment(false)}
              className="gap-1.5 cursor-pointer"
            >
              {submittingPay && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Guardar Borrador</span>
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={
                submittingPay ||
                isOverpaying ||
                missingRates.length > 0 ||
                totalPaymentEquivalent <= 0
              }
              onClick={() => void handleSubmitPayment(true)}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
            >
              {submittingPay && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Confirmar y Descontar Saldo</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Aprobar */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Aprobar Orden de Pago
            </DialogTitle>
            <DialogDescription className="text-xs">
              {po.paymentOrderNumber} · {formatMoney(totalDebt, debtCurrency)} ({debtCurrency})
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleApprove} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase">
                Comentarios de Aprobación (Opcional)
              </Label>
              <Textarea
                rows={3}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Autorizado para desembolso en tesorería..."
                className="text-xs"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setApproveOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={actionLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirmar Aprobación</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Rechazar */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Rechazar Orden de Pago
            </DialogTitle>
            <DialogDescription className="text-xs">
              Indique el motivo obligatorio del rechazo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReject} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase">
                Motivo de Rechazo *
              </Label>
              <Textarea
                rows={3}
                required
                minLength={5}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explique la razón del rechazo (mínimo 5 caracteres)..."
                className="text-xs"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRejectOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                disabled={actionLoading || rejectionReason.trim().length < 5}
                className="gap-1.5"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Rechazar</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Anular */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Anular Orden de Pago
            </DialogTitle>
            <DialogDescription className="text-xs">
              Solo se pueden anular órdenes sin pagos confirmados.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCancel} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase">
                Motivo (Opcional)
              </Label>
              <Textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Razón de la anulación..."
                className="text-xs"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCancelOpen(false)}
              >
                Cerrar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                disabled={actionLoading}
                className="gap-1.5"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Anular Orden de Pago</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
