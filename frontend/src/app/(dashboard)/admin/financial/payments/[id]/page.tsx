"use client";

import React, { useEffect, useState, useMemo, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BankAccountService,
  type BankAccountItem,
} from "@/services/bank-account.service";
import { CurrencyService } from "@/services/currency.service";
import { AuthService } from "@/services/auth.service";
import type { AuthUser } from "@/types/auth";
import type { DirectPayment, ServiceOrderStatus } from "@/types/purchasing";
import {
  UniversalPdfDownloadButton,
  DirectPaymentPdfDocument,
} from "@/components/pdf";
import { cn } from "@/lib/utils";
import { toast } from "@/utils/toast";
import {
  ArrowLeft,
  Building2,
  Loader2,
  Receipt,
  Wallet,
  Send,
  CheckCircle2,
  XCircle,
  FileCheck2,
  CreditCard,
  Calendar,
  User,
  ExternalLink,
  AlertCircle,
  Ban,
  StickyNote,
  Info,
  Landmark,
  Check,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STATUS_BADGES: Record<
  ServiceOrderStatus,
  {
    label: string;
    variant: "secondary" | "warning" | "info" | "purple" | "success" | "destructive";
    className: string;
  }
> = {
  BORRADOR: {
    label: "Borrador",
    variant: "secondary",
    className:
      "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  },
  EN_APROBACION: {
    label: "En Aprobación",
    variant: "warning",
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  APROBADA: {
    label: "Aprobada",
    variant: "info",
    className:
      "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
  },
  ORDEN_PAGO: {
    label: "Orden de Pago",
    variant: "purple",
    className:
      "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20",
  },
  PAGADA: {
    label: "Pagada",
    variant: "success",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  RECHAZADA: {
    label: "Rechazada",
    variant: "destructive",
    className:
      "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  },
  CANCELADA: {
    label: "Cancelada",
    variant: "destructive",
    className:
      "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  },
};

function getApiError(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message) return res.data.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export default function ServiceOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const orderId = Array.isArray(rawId) ? rawId[0] : (rawId as string);

  const [currentUser] = useState<AuthUser | null>(() => AuthService.getCurrentUser());
  const userRoles = currentUser?.roles || [];
  const canSubmitRole = userRoles.some((r) =>
    ["ADMINISTRADOR", "COMPRAS", "ADMINISTRACION", "COORDINADOR"].includes(r)
  );
  const canApproveRole = userRoles.some((r) =>
    ["ADMINISTRADOR", "ADMINISTRACION", "COORDINADOR"].includes(r)
  );
  const canPayRole = userRoles.some((r) =>
    ["ADMINISTRADOR", "ADMINISTRACION"].includes(r)
  );

  const [order, setOrder] = useState<DirectPayment | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([]);
  const [bcvRates, setBcvRates] = useState<{ USD: number; EUR: number; VED: number }>({
    USD: 75.0,
    EUR: 81.5,
    VED: 1.0,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modales
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState("");

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const [paymentOrderModalOpen, setPaymentOrderModalOpen] = useState(false);
  const [paymentOrderNotes, setPaymentOrderNotes] = useState("");

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<
    "TRANSFERENCIA" | "PAGO_MOVIL" | "EFECTIVO" | "ZELLE"
  >("TRANSFERENCIA");
  const [paySourceAccountId, setPaySourceAccountId] = useState("");
  const [payDestinationAccount, setPayDestinationAccount] = useState("");
  const [payReference, setPayReference] = useState("");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [payCurrency, setPayCurrency] = useState<"USD" | "VED" | "EUR">("USD");
  const [payAmount, setPayAmount] = useState("");
  const [payRate, setPayRate] = useState("");
  const [payReceiptUrl, setPayReceiptUrl] = useState("");
  const [payNotes, setPayNotes] = useState("");

  useEffect(() => {
    if (!orderId) return;
    let ignore = false;
    void (async () => {
      try {
        const [data, accounts, rates] = await Promise.all([
          BankAccountService.getDirectPaymentById(orderId),
          BankAccountService.getBankAccounts(true).catch(() => []),
          CurrencyService.getCurrentRates().catch(() => null),
        ]);
        if (!ignore) {
          setOrder(data);
          setBankAccounts(accounts);
          if (rates) {
            setBcvRates({
              USD: Number(rates.USD || rates.rates?.USD || 75.0),
              EUR: Number(rates.EUR || rates.rates?.EUR || 81.5),
              VED: 1.0,
            });
          }
        }
      } catch {
        if (!ignore) setOrder(null);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [orderId]);

  const openPayModal = () => {
    if (!order) return;
    const curr = (
      order.transactionCurrency === "VED"
        ? "VED"
        : order.transactionCurrency === "EUR"
          ? "EUR"
          : "USD"
    ) as "USD" | "VED" | "EUR";
    setPayMethod("TRANSFERENCIA");
    setPayCurrency(curr);
    setPayAmount(String(Number(order.amountPaid || 0)));
    setPayRate(
      curr === "VED"
        ? bcvRates.USD.toFixed(2)
        : curr === "EUR"
          ? bcvRates.EUR.toFixed(2)
          : "1.00"
    );
    setPayDate(new Date().toISOString().split("T")[0]);
    setPayReference("");
    setPayDestinationAccount(order.destinationAccount || "");
    setPayReceiptUrl(order.receiptImageUrl || "");
    setPayNotes("");

    const matchAcc =
      bankAccounts.find((a) => a.currency === curr && a.isActive) ||
      bankAccounts.find((a) => a.isActive);
    setPaySourceAccountId(matchAcc ? String(matchAcc.id) : "");
    setPayModalOpen(true);
  };

  const handlePayCurrencyChange = (curr: "USD" | "VED" | "EUR") => {
    setPayCurrency(curr);
    if (curr === "VED") setPayRate(bcvRates.USD.toFixed(2));
    else if (curr === "EUR") setPayRate(bcvRates.EUR.toFixed(2));
    else setPayRate("1.00");

    const match = bankAccounts.find((a) => a.currency === curr && a.isActive);
    if (match) setPaySourceAccountId(String(match.id));
  };

  const payEquivUsd = useMemo(() => {
    const amt = parseFloat(payAmount);
    if (Number.isNaN(amt) || amt <= 0) return 0;
    if (payCurrency === "USD") return amt;
    if (payCurrency === "VED") {
      const r = parseFloat(payRate) || bcvRates.USD || 1;
      return r > 0 ? amt / r : 0;
    }
    const r = parseFloat(payRate) || bcvRates.EUR || 1;
    return bcvRates.USD > 0 ? (amt * r) / bcvRates.USD : amt;
  }, [payAmount, payCurrency, payRate, bcvRates]);

  // Transiciones
  const handleSubmitForApproval = async () => {
    if (!order) return;
    setActionLoading(true);
    try {
      const updated = await BankAccountService.submitServiceOrder(order.id);
      setOrder(updated);
      toast.success("Orden enviada a aprobación.");
    } catch (err) {
      toast.error(getApiError(err, "Error al enviar a aprobación."));
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (e: FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setActionLoading(true);
    try {
      const updated = await BankAccountService.approveServiceOrder(
        order.id,
        approvalNotes.trim() || undefined
      );
      setOrder(updated);
      setApproveModalOpen(false);
      setApprovalNotes("");
      toast.success("Orden de servicio aprobada.");
    } catch (err) {
      toast.error(getApiError(err, "Error al aprobar."));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e: FormEvent) => {
    e.preventDefault();
    if (!order || rejectionReason.trim().length < 5) {
      toast.error("Indique un motivo de rechazo de al menos 5 caracteres.");
      return;
    }
    setActionLoading(true);
    try {
      const updated = await BankAccountService.rejectServiceOrder(
        order.id,
        rejectionReason.trim()
      );
      setOrder(updated);
      setRejectModalOpen(false);
      setRejectionReason("");
      toast.success("Orden de servicio rechazada.");
    } catch (err) {
      toast.error(getApiError(err, "Error al rechazar."));
    } finally {
      setActionLoading(false);
    }
  };

  const handleGeneratePaymentOrder = async (e: FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setActionLoading(true);
    try {
      const updated = await BankAccountService.generatePaymentOrder(
        order.id,
        paymentOrderNotes.trim() || undefined
      );
      setOrder(updated);
      setPaymentOrderModalOpen(false);
      setPaymentOrderNotes("");
      toast.success(
        `Orden de Pago ${updated.paymentOrderNumber || ""} generada.`
      );
    } catch (err) {
      toast.error(getApiError(err, "Error al generar orden de pago."));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegisterPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!order) return;
    if (!payReference.trim()) {
      toast.error("El número de referencia o comprobante es obligatorio.");
      return;
    }
    const amt = parseFloat(payAmount);
    if (Number.isNaN(amt) || amt <= 0) {
      toast.error("El monto pagado debe ser mayor a 0.");
      return;
    }

    setActionLoading(true);
    try {
      const updated = await BankAccountService.registerServicePayment(order.id, {
        method: payMethod,
        sourceAccountId:
          (payMethod === "TRANSFERENCIA" || payMethod === "PAGO_MOVIL") &&
          paySourceAccountId
            ? Number(paySourceAccountId)
            : null,
        destinationAccount: payDestinationAccount.trim() || null,
        referenceNumber: payReference.trim(),
        paymentDate: payDate,
        amountPaid: amt,
        transactionCurrency: payCurrency,
        exchangeRate: payCurrency === "USD" ? 1.0 : parseFloat(payRate) || bcvRates.USD,
        receiptImageUrl: payReceiptUrl.trim() || null,
        notes: payNotes.trim() || null,
      });
      setOrder(updated);
      setPayModalOpen(false);
      toast.success("Pago registrado y ciclo de servicio completado.");
    } catch (err) {
      toast.error(getApiError(err, "Error al registrar el pago."));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (e: FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setActionLoading(true);
    try {
      const updated = await BankAccountService.cancelServiceOrder(
        order.id,
        cancelReason.trim() || undefined
      );
      setOrder(updated);
      setCancelModalOpen(false);
      setCancelReason("");
      toast.success("Orden de servicio cancelada.");
    } catch (err) {
      toast.error(getApiError(err, "Error al cancelar."));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-medium">
          Cargando orden de servicio...
        </span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto py-12">
        <Card className="p-6 text-center space-y-4 border-border shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">
              Orden de servicio no encontrada
            </h2>
            <p className="text-xs text-muted-foreground">
              El registro solicitado no existe o fue eliminado.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs">
            <Link href="/admin/financial/payments">
              <ArrowLeft className="w-3.5 h-3.5" /> Volver a Órdenes de Servicio
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  const status = order.status || "PAGADA";
  const badge = STATUS_BADGES[status] || STATUS_BADGES.PAGADA;
  const pSymbol =
    order.transactionCurrency === "VED"
      ? "Bs."
      : order.transactionCurrency === "EUR"
        ? "€"
        : "$";
  const amount = Number(order.amountPaid || 0);
  const equivUsd = Number(order.equivalentAmountUsd || 0);
  const code =
    order.serviceOrderNumber || `VOUCHER-${String(order.id).padStart(6, "0")}`;

  // Progreso del Stepper de 4 etapas
  const stepIndex =
    status === "BORRADOR"
      ? 0
      : status === "EN_APROBACION" || status === "RECHAZADA"
        ? 1
        : status === "APROBADA"
          ? 2
          : status === "ORDEN_PAGO"
            ? 3
            : status === "PAGADA"
              ? 4
              : -1;

  const steps = [
    { label: "Solicitud", desc: code },
    {
      label: "Aprobación",
      desc:
        status === "RECHAZADA"
          ? "Rechazada"
          : order.approvedAt
            ? new Date(order.approvedAt).toLocaleDateString("es-VE")
            : "Pendiente",
    },
    {
      label: "Orden de Pago",
      desc: order.paymentOrderNumber || "Pendiente",
    },
    {
      label: "Pago Registrado",
      desc:
        status === "PAGADA"
          ? order.referenceNumber || "Liquidado"
          : "Pendiente",
    },
  ];

  const canSubmit = (status === "BORRADOR" || status === "RECHAZADA") && canSubmitRole;
  const canApproveOrReject = status === "EN_APROBACION" && canApproveRole;
  const canGenerateOp = status === "APROBADA" && canPayRole;
  const canRegisterPay = status === "ORDEN_PAGO" && canPayRole;
  const canCancel =
    status !== "PAGADA" && status !== "CANCELADA" && canApproveRole;

  const linkedPaymentOrder =
    order.paymentOrders?.find(
      (po) => po.status !== "ANULADA" && po.status !== "RECHAZADA"
    ) ||
    order.paymentOrders?.[0] ||
    null;

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
            onClick={() => router.push("/admin/financial/payments")}
            className="h-9 w-9 shrink-0 cursor-pointer"
            title="Volver a Órdenes de Servicio"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Wallet className="w-6 h-6 text-primary" />
                {code}
              </h1>
              <Badge
                variant={badge.variant}
                className={cn("text-xs", badge.className)}
              >
                {badge.label}
              </Badge>
              {linkedPaymentOrder ? (
                <Link
                  href={`/purchasing/debts/${linkedPaymentOrder.id}`}
                  title="Abrir Orden de Pago en Tesorería"
                  className="inline-flex items-center"
                >
                  <Badge
                    variant="outline"
                    className="text-xs font-mono gap-1 hover:border-primary/50 hover:text-primary transition-colors cursor-pointer"
                  >
                    <span>OP: {linkedPaymentOrder.paymentOrderNumber}</span>
                    <ExternalLink className="w-3 h-3" />
                  </Badge>
                </Link>
              ) : (
                order.paymentOrderNumber && (
                  <Badge variant="outline" className="text-xs font-mono">
                    OP: {order.paymentOrderNumber}
                  </Badge>
                )
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {order.supplier?.name || order.beneficiary}
              {order.department?.name && ` · ${order.department.name}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {status === "PAGADA" && (
            <UniversalPdfDownloadButton
              document={<DirectPaymentPdfDocument payment={{ ...order, voucherCode: code }} />}
              fileName={`Orden_Servicio_${String(code).replace(/[^a-zA-Z0-9_-]/g, "_")}`}
              buttonLabel="PDF"
              previewLabel="Vista Previa"
              dialogTitle={`Comprobante: ${code}`}
            />
          )}

          {canCancel && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCancelModalOpen(true)}
              className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-destructive cursor-pointer"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Cancelar</span>
            </Button>
          )}

          {canSubmit && (
            <Button
              type="button"
              size="sm"
              disabled={actionLoading}
              onClick={() => void handleSubmitForApproval()}
              className="h-9 gap-1.5 text-xs font-bold cursor-pointer bg-amber-600 hover:bg-amber-700 text-white shadow-2xs"
            >
              {actionLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>
                {status === "RECHAZADA"
                  ? "Reenviar a Aprobación"
                  : "Enviar a Aprobación"}
              </span>
            </Button>
          )}

          {canApproveOrReject && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRejectModalOpen(true)}
                className="h-9 gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/10 cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Rechazar</span>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setApproveModalOpen(true)}
                className="h-9 gap-1.5 text-xs font-bold cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Aprobar</span>
              </Button>
            </>
          )}

          {canGenerateOp && (
            <Button
              type="button"
              size="sm"
              onClick={() => setPaymentOrderModalOpen(true)}
              className="h-9 gap-1.5 text-xs font-bold cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Generar Orden de Pago</span>
            </Button>
          )}

          {canRegisterPay &&
            (linkedPaymentOrder ? (
              <Button
                asChild
                size="sm"
                className="h-9 gap-1.5 text-xs font-bold cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
              >
                <Link href={`/purchasing/debts/${linkedPaymentOrder.id}`}>
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Ir a Pagar en Tesorería</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={openPayModal}
                className="h-9 gap-1.5 text-xs font-bold cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Registrar Pago</span>
              </Button>
            ))}
        </div>
      </div>

      {/* ========================================================
          STEPPER VISUAL DE LAS 4 ETAPAS
         ======================================================== */}
      <Card className="p-4 border-border shadow-2xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {steps.map((step, i) => {
            const isCompleted = stepIndex > i;
            const isCurrent = stepIndex === i && status !== "RECHAZADA" && status !== "CANCELADA";
            const isRejectedHere = i === 1 && status === "RECHAZADA";

            return (
              <div
                key={step.label}
                className={cn(
                  "p-3 rounded-xl border flex items-center gap-3 transition-colors",
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

      {/* Banner de Rechazo / Cancelación si aplica */}
      {(status === "RECHAZADA" || status === "CANCELADA") && order.rejectionReason && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 flex items-start gap-3 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-rose-700 dark:text-rose-400">
              {status === "RECHAZADA" ? "Motivo de Rechazo" : "Motivo de Cancelación"}
            </p>
            <p className="text-foreground">{order.rejectionReason}</p>
            {order.rejectedByUser && (
              <p className="text-[11px] text-muted-foreground">
                Por {order.rejectedByUser.fullName}
                {order.rejectedAt &&
                  ` · ${new Date(order.rejectedAt).toLocaleString("es-VE")}`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ========================================================
          RESUMEN DE PRIMER CONOCIMIENTO
         ======================================================== */}
      <Card className="p-5 border-border shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pb-4 border-b border-border">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              Proveedor / Beneficiario
            </span>
            <p className="text-sm font-bold text-foreground leading-snug">
              {order.supplier?.name || order.beneficiary}
            </p>
            {order.supplier?.rifOrId && (
              <p className="text-[11px] text-muted-foreground font-mono">
                {order.supplier.rifOrId}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-primary" />
              Monto ({order.transactionCurrency})
            </span>
            <p className="text-sm font-bold font-mono text-foreground leading-snug">
              {pSymbol}{" "}
              {amount.toLocaleString("es-VE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              {order.transactionCurrency !== "USD"
                ? `≈ $${equivUsd.toFixed(2)} USD · Tasa ${Number(order.exchangeRate || 1).toFixed(2)}`
                : "Dólares estadounidenses"}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary" />
              Área y Solicitante
            </span>
            <p className="text-sm font-bold text-foreground leading-snug">
              {order.department
                ? `${order.department.code} - ${order.department.name}`
                : "General"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {order.registeredBy?.fullName || "Usuario del sistema"}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              Fecha Estimada
            </span>
            <p className="text-sm font-bold font-mono text-foreground leading-snug">
              {order.estimatedDate
                ? new Date(order.estimatedDate).toLocaleDateString("es-VE")
                : order.createdAt
                  ? new Date(order.createdAt).toLocaleDateString("es-VE")
                  : "-"}
            </p>
            {order.supportUrl && (
              <a
                href={order.supportUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline font-medium"
              >
                <span>Ver soporte / cotización</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
            Concepto del Servicio
          </span>
          <p className="text-xs text-foreground leading-relaxed bg-muted/30 p-3 rounded-lg border border-border whitespace-pre-line">
            {order.concept}
          </p>
        </div>
      </Card>

      {/* ========================================================
          DETALLE DE ORDEN DE PAGO Y PAGO EFECTIVO (SI EXISTEN)
         ======================================================== */}
      {(order.paymentOrderNumber || status === "PAGADA") && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {order.paymentOrderNumber && (
            <Card className="p-5 border-border shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm font-bold text-foreground">
                    Orden de Pago
                  </CardTitle>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {order.paymentOrderNumber}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Emitida por</span>
                  <span className="font-semibold text-foreground">
                    {order.paymentOrderIssuedBy?.fullName || order.authorizedBy || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Fecha emisión</span>
                  <span className="font-mono text-foreground">
                    {order.paymentOrderIssuedAt
                      ? new Date(order.paymentOrderIssuedAt).toLocaleString("es-VE")
                      : "-"}
                  </span>
                </div>
                {order.paymentOrderNotes && (
                  <div className="col-span-2">
                    <span className="text-[11px] text-muted-foreground block">Notas OP</span>
                    <span className="text-foreground">{order.paymentOrderNotes}</span>
                  </div>
                )}
                {linkedPaymentOrder && (
                  <div className="col-span-2 pt-2 border-t border-border flex items-center justify-between gap-2">
                    <div className="font-mono text-[11px] text-muted-foreground">
                      Abonado:{" "}
                      <strong className="text-emerald-600 dark:text-emerald-400">
                        {pSymbol} {Number(linkedPaymentOrder.paidAmount || 0).toFixed(2)}
                      </strong>{" "}
                      · Saldo:{" "}
                      <strong className="text-foreground">
                        {pSymbol}{" "}
                        {Number(linkedPaymentOrder.remainingBalance || 0).toFixed(2)}
                      </strong>
                    </div>
                    <Link
                      href={`/purchasing/debts/${linkedPaymentOrder.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      <span>Abrir en Tesorería</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            </Card>
          )}

          {status === "PAGADA" && (
            <Card className="p-5 border-emerald-500/30 shadow-2xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <CardTitle className="text-sm font-bold text-foreground">
                    Pago Efectivo Registrado
                  </CardTitle>
                </div>
                <Badge
                  variant="success"
                  className="text-[11px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                >
                  Liquidado
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[11px] text-muted-foreground block">Método</span>
                  <span className="font-semibold text-foreground">{order.method}</span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">N° Referencia</span>
                  <span className="font-mono font-bold text-foreground">
                    {order.referenceNumber || "S/R"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Cuenta Origen</span>
                  <span className="text-foreground">
                    {order.sourceAccount
                      ? `${order.sourceAccount.bankName} (${order.sourceAccount.currency})`
                      : "Caja / Directo"}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">Fecha de Pago</span>
                  <span className="font-mono text-foreground">
                    {order.paymentDate
                      ? new Date(order.paymentDate).toLocaleDateString("es-VE")
                      : "-"}
                  </span>
                </div>
                {order.receiptImageUrl && (
                  <div className="col-span-2">
                    <a
                      href={order.receiptImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                    >
                      <span>Ver comprobante de pago</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ========================================================
          DETALLES SECUNDARIOS Y AUDITORÍA (ABAJO)
         ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4 border-border/80 bg-muted/10 shadow-none space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <StickyNote className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Observaciones y Comentarios
            </span>
          </div>
          {order.notes || order.approvalNotes ? (
            <div className="text-xs text-foreground space-y-1.5 whitespace-pre-line">
              {order.notes && <p>{order.notes}</p>}
              {order.approvalNotes && (
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Aprobación:</strong>{" "}
                  {order.approvalNotes}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Sin observaciones registradas.
            </p>
          )}
        </Card>

        <Card className="p-4 border-border/80 bg-muted/10 shadow-none space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Info className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Registro y Auditoría
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] pt-1">
            <div>
              <span className="text-muted-foreground block">Solicitado por</span>
              <span className="font-semibold text-foreground">
                {order.registeredBy?.fullName || "-"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Aprobado por</span>
              <span className="font-semibold text-foreground">
                {order.approvedByUser?.fullName || order.approvedBy || "-"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Creada el</span>
              <span className="font-mono text-foreground">
                {order.createdAt
                  ? new Date(order.createdAt).toLocaleString("es-VE")
                  : "-"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Aprobada el</span>
              <span className="font-mono text-foreground">
                {order.approvedAt
                  ? new Date(order.approvedAt).toLocaleString("es-VE")
                  : "-"}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* ================= MODALES DE TRANSICIÓN ================= */}

      {/* Modal Aprobar */}
      <Dialog open={approveModalOpen} onOpenChange={setApproveModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Aprobar Orden de Servicio
            </DialogTitle>
            <DialogDescription className="text-xs">
              {code} · {order.supplier?.name || order.beneficiary}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleApprove} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                Comentarios de Aprobación (Opcional)
              </Label>
              <Textarea
                rows={3}
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Observaciones o visto bueno..."
                className="text-xs"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setApproveModalOpen(false)}
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
                Confirmar Aprobación
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Rechazar */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Rechazar Orden de Servicio
            </DialogTitle>
            <DialogDescription className="text-xs">
              Debe indicar un motivo obligatorio para devolver la solicitud.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReject} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
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
                onClick={() => setRejectModalOpen(false)}
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
                Rechazar Orden
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Generar Orden de Pago */}
      <Dialog open={paymentOrderModalOpen} onOpenChange={setPaymentOrderModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Generar Orden de Pago
            </DialogTitle>
            <DialogDescription className="text-xs">
              Se asignará un número correlativo OP-YYYY-XXXX habilitando el registro del pago efectivo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleGeneratePaymentOrder} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                Instrucciones para Tesorería (Opcional)
              </Label>
              <Textarea
                rows={3}
                value={paymentOrderNotes}
                onChange={(e) => setPaymentOrderNotes(e.target.value)}
                placeholder="Ej: Priorizar transferencia desde cuenta Banesco..."
                className="text-xs"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPaymentOrderModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" size="sm" disabled={actionLoading} className="gap-1.5">
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Emitir Orden de Pago
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Registrar Pago Efectivo */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Registrar Pago Efectivo
            </DialogTitle>
            <DialogDescription className="text-xs font-mono">
              {code} · {order.paymentOrderNumber}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRegisterPayment} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-semibold">Método *</Label>
                <select
                  value={payMethod}
                  onChange={(e) =>
                    setPayMethod(
                      e.target.value as
                        | "TRANSFERENCIA"
                        | "PAGO_MOVIL"
                        | "EFECTIVO"
                        | "ZELLE"
                    )
                  }
                  className="w-full h-9 bg-background border border-input rounded-lg px-3 text-xs"
                >
                  <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                  <option value="PAGO_MOVIL">Pago Móvil</option>
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="ZELLE">Zelle</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-semibold">
                  Fecha de Pago *
                </Label>
                <Input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {(payMethod === "TRANSFERENCIA" || payMethod === "PAGO_MOVIL") && (
              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-semibold">
                  Cuenta Bancaria Origen
                </Label>
                <select
                  value={paySourceAccountId}
                  onChange={(e) => setPaySourceAccountId(e.target.value)}
                  className="w-full h-9 bg-background border border-input rounded-lg px-3 text-xs font-mono"
                >
                  <option value="">-- Seleccione cuenta bancaria --</option>
                  {bankAccounts
                    .filter((a) => a.isActive)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.bankName} - {acc.accountNumber || "S/N"} ({acc.currency})
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-semibold">
                  N° Referencia / Comprobante *
                </Label>
                <Input
                  type="text"
                  required
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                  placeholder="Ej: 98765432"
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-semibold">
                  Cuenta Destino (Opcional)
                </Label>
                <Input
                  type="text"
                  value={payDestinationAccount}
                  onChange={(e) => setPayDestinationAccount(e.target.value)}
                  placeholder="Cuenta o teléfono destino"
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-semibold">Moneda *</Label>
                <select
                  value={payCurrency}
                  onChange={(e) =>
                    handlePayCurrencyChange(e.target.value as "USD" | "VED" | "EUR")
                  }
                  className="w-full h-9 bg-background border border-input rounded-lg px-3 text-xs"
                >
                  <option value="USD">USD ($)</option>
                  <option value="VED">VED (Bs.)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-semibold">Monto *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="h-9 text-xs font-mono font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-semibold">Tasa BCV</Label>
                <Input
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  disabled={payCurrency === "USD"}
                  value={payRate}
                  onChange={(e) => setPayRate(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>

            {payEquivUsd > 0 && (
              <div className="p-2.5 rounded-lg bg-muted/30 border border-border text-xs flex justify-between font-mono">
                <span className="text-muted-foreground">Equivalente USD:</span>
                <strong className="text-primary">${payEquivUsd.toFixed(2)} USD</strong>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                URL de Comprobante / Soporte (Opcional)
              </Label>
              <Input
                type="url"
                value={payReceiptUrl}
                onChange={(e) => setPayReceiptUrl(e.target.value)}
                placeholder="https://..."
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                Notas del Pago (Opcional)
              </Label>
              <Input
                type="text"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                placeholder="Observaciones adicionales..."
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="gap-2 pt-2 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPayModalOpen(false)}
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
                Confirmar Pago y Cerrar Orden
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Cancelar */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Cancelar Orden de Servicio
            </DialogTitle>
            <DialogDescription className="text-xs">
              La orden pasará a estado Cancelada y no podrá continuar su flujo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCancel} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                Motivo de Cancelación (Opcional)
              </Label>
              <Textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Indique por qué se cancela..."
                className="text-xs"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCancelModalOpen(false)}
              >
                Volver
              </Button>
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                disabled={actionLoading}
                className="gap-1.5"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirmar Cancelación
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
