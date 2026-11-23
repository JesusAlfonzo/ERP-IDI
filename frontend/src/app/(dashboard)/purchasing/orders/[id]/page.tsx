"use client";

import React, { useEffect, useState, useTransition, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PurchasingClientService } from "@/services/purchasing.service";
import { TreasuryService } from "@/services/treasury.service";
import { CurrencyService } from "@/services/currency.service";
import { getCurrencySymbol, normalizeCurrencyCode } from "@/utils/currency";
import { toast } from "@/utils/toast";
import type {
  PurchaseOrder,
  PurchaseOrderStatus,
  SupplierPayment,
} from "@/types/purchasing";
import { DownloadPdfButton } from "@/components/purchasing/DownloadPdfButton";
import { usePagination } from "@/hooks/use-pagination";
import { TablePagination } from "@/components/common/TablePagination";
import { cn } from "@/lib/utils";
import {
  FileText,
  FileCheck2,
  ArrowLeft,
  Building2,
  Boxes,
  Truck,
  Receipt,
  Loader2,
  ExternalLink,
  CreditCard,
  AlertCircle,
  Send,
  Edit3,
  X,
  Mail,
  MessageCircle,
  Search,
  StickyNote,
  ShoppingCart,
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const STATUS_BADGES: Record<
  PurchaseOrderStatus,
  {
    label: string;
    variant: "secondary" | "info" | "warning" | "purple" | "success" | "destructive";
    className: string;
  }
> = {
  BORRADOR: {
    label: "Borrador",
    variant: "secondary",
    className:
      "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  },
  ENVIADA: {
    label: "Enviada",
    variant: "info",
    className:
      "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  },
  PENDIENTE: {
    label: "Pendiente",
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
  EN_PROCESO: {
    label: "En Tránsito",
    variant: "purple",
    className:
      "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  },
  PARCIAL: {
    label: "Parcial",
    variant: "warning",
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  COMPLETADA: {
    label: "Completada",
    variant: "success",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  RECIBIDO: {
    label: "Recibida",
    variant: "success",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  },
  CANCELADA: {
    label: "Cancelada",
    variant: "destructive",
    className:
      "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  },
  CANCELADO: {
    label: "Cancelada",
    variant: "destructive",
    className:
      "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  },
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const orderId = Array.isArray(rawId) ? rawId[0] : (rawId as string);

  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  const [bcvRates, setBcvRates] = useState<{
    USD: number;
    EUR: number;
    VED: number;
  }>({
    USD: 75.0,
    EUR: 81.5,
    VED: 1.0,
  });

  // Buscador de insumos
  const [itemSearch, setItemSearch] = useState("");
  const [sendingOrder, setSendingOrder] = useState(false);
  const [creatingPaymentOrder, setCreatingPaymentOrder] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrderAndRates = () => {
      startTransition(() => {
        void (async () => {
          try {
            const [orderData, ratesData] = await Promise.all([
              PurchasingClientService.getOrderById(orderId),
              CurrencyService.getCurrentRates().catch(() => null),
            ]);
            setOrder(orderData);
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
    };

    fetchOrderAndRates();

    const handleRateUpdated = () => {
      fetchOrderAndRates();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("idi:exchange-rate-updated", handleRateUpdated);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("idi:exchange-rate-updated", handleRateUpdated);
      }
    };
  }, [orderId]);

  // Filtro y paginación de insumos
  const filteredItems = useMemo(() => {
    const list = order?.items || [];
    if (!itemSearch.trim()) return list;
    const q = itemSearch.toLowerCase().trim();
    return list.filter(
      (it) =>
        (it.product?.name || "").toLowerCase().includes(q) ||
        (it.product?.sku || "").toLowerCase().includes(q) ||
        (it.unit?.name || "").toLowerCase().includes(q) ||
        (it.unit?.abbreviation || "").toLowerCase().includes(q)
    );
  }, [order, itemSearch]);

  const itemsPagination = usePagination(filteredItems, { initialPageSize: 10 });
  const { resetPage } = itemsPagination;

  useEffect(() => {
    resetPage();
  }, [itemSearch, resetPage]);

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-medium">
          Cargando orden de compra...
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
              Orden de compra no encontrada
            </h2>
            <p className="text-xs text-muted-foreground">
              No se pudo cargar la orden solicitada o no existe.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/purchasing/orders")}
            className="gap-1.5 text-xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Volver a Órdenes
          </Button>
        </Card>
      </div>
    );
  }

  const isDraft = order.status === "BORRADOR";
  const canReceive =
    !isDraft &&
    order.status !== "RECIBIDO" &&
    order.status !== "COMPLETADA" &&
    order.status !== "CANCELADA" &&
    order.status !== "CANCELADO";

  const statusBadge = STATUS_BADGES[order.status] || {
    label: order.status,
    variant: "secondary" as const,
    className: "",
  };

  const handleSendOrder = async () => {
    if (
      !confirm(
        `¿Desea formalizar y marcar la Orden de Compra #${order.orderNumber || order.id} como ENVIADA al proveedor? Una vez enviada, los insumos y precios quedan bloqueados para habilitar la recepción.`
      )
    ) {
      return;
    }
    setSendingOrder(true);
    try {
      await PurchasingClientService.sendOrder(order.id);
      const refreshed = await PurchasingClientService.getOrderById(order.id);
      setOrder(refreshed);
      toast.success(`Orden #${order.orderNumber || order.id} enviada al proveedor.`);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Error al enviar la orden al proveedor."
      );
    } finally {
      setSendingOrder(false);
    }
  };

  const currCode = normalizeCurrencyCode(order.currency);
  const symbol = getCurrencySymbol(order.currency);
  const rate = Number(order.exchangeRate || 0);

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

  const effectiveBcvRate =
    currCode === "EUR"
      ? rate > 0
        ? rate
        : bcvRates.EUR || 81.5
      : rate > 0
        ? rate
        : bcvRates.USD || 75.0;

  const totalOrderBs =
    order.totalAmountBs != null
      ? Number(order.totalAmountBs)
      : currCode === "VED"
        ? totalAmount
        : Math.round(totalAmount * effectiveBcvRate * 100) / 100;

  const orderTotalUsd = Number(
    order.totalAmountUsd != null && Number(order.totalAmountUsd) > 0
      ? order.totalAmountUsd
      : currCode === "VED"
        ? (Number(order.totalAmountBs) > 0 ? Number(order.totalAmountBs) : totalAmount) /
          (rate > 0 ? rate : bcvRates.USD || 75.0)
        : currCode === "EUR"
          ? (totalAmount * (rate > 0 ? rate : bcvRates.EUR)) / (bcvRates.USD || 75.0)
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
    if (pCurr === "EUR") {
      const pRateEur = pRate > 0 ? pRate : bcvRates.EUR;
      const bcvUsd = bcvRates.USD > 0 ? bcvRates.USD : 75.0;
      return acc + (bcvUsd > 0 ? (pAmount * pRateEur) / bcvUsd : pAmount);
    }
    return acc + pAmount;
  }, 0);

  const remainingDebtUsd = Math.max(
    0,
    Math.round((orderTotalUsd - totalPaidUsd) * 100) / 100
  );

  const paidPercent =
    orderTotalUsd > 0
      ? Math.min(100, Math.round((totalPaidUsd / orderTotalUsd) * 100))
      : 0;

  const isFullyPaid =
    order.paymentStatus === "PAGADO" ||
    (orderTotalUsd > 0 && remainingDebtUsd <= 0.009);

  const canPay =
    !isDraft &&
    order.status !== "CANCELADA" &&
    order.status !== "CANCELADO" &&
    !isFullyPaid;

  const activePaymentOrder =
    order.paymentOrders?.find(
      (po) => po.status !== "ANULADA" && po.status !== "RECHAZADA"
    ) ||
    order.paymentOrders?.[0] ||
    null;

  const handleGeneratePaymentOrder = async () => {
    if (!order) return;
    setCreatingPaymentOrder(true);
    try {
      const created = await TreasuryService.createPaymentOrder({
        sourceType: "PURCHASE_ORDER",
        purchaseOrderId: order.id,
      });
      toast.success(
        `Orden de Pago ${created.paymentOrderNumber} generada en Tesorería.`
      );
      router.push(`/purchasing/debts/${created.id}`);
    } catch (err: unknown) {
      let message = "No se pudo generar la Orden de Pago.";
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
      setCreatingPaymentOrder(false);
    }
  };

  const handleSendEmail = () => {
    const recipient = order.supplier?.email || "";
    const subject = encodeURIComponent(
      `Orden de Compra #${order.orderNumber} - Instituto de Inmunología Clínica`
    );
    const body = encodeURIComponent(
      `Estimado(a) ${order.supplier?.name || "Proveedor"},\n\n` +
        `Le hacemos llegar la Orden de Compra #${order.orderNumber} emitida por el Instituto de Inmunología Clínica (RIF J-30710739-1) por un valor total de ${symbol} ${totalAmount.toFixed(2)} (${currCode}).\n\n` +
        `Cantidad de insumos solicitados: ${order.items?.length || 0}.\n\n` +
        `Agradecemos confirmar recepción y los tiempos estimados de entrega.\n\n` +
        `Atentamente,\nDepartamento de Compras y Suministros\nInstituto de Inmunología Clínica · ERP-IDI`
    );
    window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
  };

  const handleSendWhatsApp = () => {
    const rawPhone = order.supplier?.phone || "";
    let cleanPhone = rawPhone.replace(/\D/g, "");
    if (!cleanPhone) {
      const inputPhone = window.prompt(
        "Ingrese el número telefónico del proveedor para WhatsApp (ej: 584121234567):",
        ""
      );
      if (!inputPhone) return;
      cleanPhone = inputPhone.replace(/\D/g, "");
    }
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "58" + cleanPhone.slice(1);
    } else if (cleanPhone.length === 10 && !cleanPhone.startsWith("58")) {
      cleanPhone = "58" + cleanPhone;
    }

    const message = encodeURIComponent(
      `*INSTITUTO DE INMUNOLOGÍA CLÍNICA* (RIF J-30710739-1)\n` +
        `*ORDEN DE COMPRA:* ${order.orderNumber}\n` +
        `*Proveedor:* ${order.supplier?.name || "Proveedor"}\n` +
        `*Monto Total:* ${symbol} ${totalAmount.toFixed(2)} (${currCode})\n` +
        `*Insumos:* ${order.items?.length || 0}\n\n` +
        `Estimado proveedor, le notificamos la emisión de la orden de compra adjunta. Agradecemos confirmar recepción y disponibilidad para entrega.\n\n` +
        `_Departamento de Compras y Suministros_`
    );

    window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
  };

  const getPaymentMethodLabel = (method?: string, pMethod?: string) => {
    const m = (method || pMethod || "TRANSFERENCIA").toUpperCase();
    if (m.includes("PAGO_MOVIL")) return "Pago Móvil";
    if (m.includes("EFECTIVO")) return "Efectivo";
    if (m.includes("ZELLE")) return "Zelle";
    return "Transferencia";
  };

  const totalItemsCount = order.items?.length || 0;
  const linkedRequisitionId = order.requisition?.id ?? order.requisitionId ?? null;
  const linkedRequisitionNumber =
    order.requisition?.requisitionNumber ||
    (linkedRequisitionId ? `#${linkedRequisitionId}` : null);

  return (
    <div className="space-y-5 pb-12">
      {/* ========================================================
          NIVEL 1: ENCABEZADO SOBRIO Y ACCIONES PRINCIPALES
         ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-start sm:items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => router.push("/purchasing/orders")}
            className="h-9 w-9 shrink-0 cursor-pointer"
            title="Volver a Órdenes de Compra"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <ShoppingCart className="w-6 h-6 text-primary" />
                Orden #{order.orderNumber || order.id}
              </h1>
              {linkedRequisitionId && (
                <Link
                  href={`/purchasing/requisitions/${linkedRequisitionId}`}
                  title="Ver detalle de la preorden de origen"
                  className="inline-flex items-center"
                >
                  <Badge
                    variant="outline"
                    className="text-xs font-mono gap-1 hover:border-primary/50 hover:text-primary transition-colors cursor-pointer"
                  >
                    <FileText className="w-3 h-3" />
                    <span>Preorden {linkedRequisitionNumber}</span>
                    <ExternalLink className="w-3 h-3" />
                  </Badge>
                </Link>
              )}
              {activePaymentOrder && (
                <Link
                  href={`/purchasing/debts/${activePaymentOrder.id}`}
                  title="Ir a la Orden de Pago en Tesorería"
                  className="inline-flex items-center"
                >
                  <Badge
                    variant="outline"
                    className="text-xs font-mono gap-1 hover:border-primary/50 hover:text-primary transition-colors cursor-pointer"
                  >
                    <FileCheck2 className="w-3 h-3" />
                    <span>{activePaymentOrder.paymentOrderNumber}</span>
                    <ExternalLink className="w-3 h-3" />
                  </Badge>
                </Link>
              )}
              <Badge
                variant={statusBadge.variant}
                className={cn("text-xs", statusBadge.className)}
              >
                {statusBadge.label}
              </Badge>
              <Badge
                variant={isFullyPaid ? "success" : "outline"}
                className={cn(
                  "text-xs",
                  isFullyPaid
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                    : "text-muted-foreground"
                )}
              >
                {isFullyPaid
                  ? "Solvente"
                  : paidPercent > 0
                    ? `Pagado ${paidPercent}%`
                    : "Pago Pendiente"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {order.supplier?.name || "Proveedor sin asignar"}
              {(order.supplier?.rifOrId || order.supplier?.rif) &&
                ` · ${order.supplier?.rifOrId || order.supplier?.rif}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSendEmail}
            className="h-9 gap-1.5 text-xs cursor-pointer shadow-2xs"
            title="Enviar orden por Correo Electrónico"
          >
            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Correo</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSendWhatsApp}
            className="h-9 gap-1.5 text-xs cursor-pointer shadow-2xs"
            title="Enviar orden por WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />
            <span>WhatsApp</span>
          </Button>

          <DownloadPdfButton
            order={order}
            effectiveBcvRate={effectiveBcvRate}
            symbol={symbol}
            currCode={currCode}
          />

          {isDraft && (
            <>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-9 gap-1.5 text-xs font-semibold cursor-pointer shadow-2xs"
              >
                <Link href={`/purchasing/orders/${order.id}/edit`}>
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </Link>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSendOrder}
                disabled={sendingOrder}
                className="h-9 gap-1.5 text-xs font-bold cursor-pointer shadow-2xs"
              >
                {sendingOrder ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>{sendingOrder ? "Enviando..." : "Enviar Orden"}</span>
              </Button>
            </>
          )}

          {canReceive && (
            <Button
              type="button"
              size="sm"
              onClick={() => router.push(`/purchasing/orders/${order.id}/receive`)}
              className="h-9 gap-1.5 text-xs font-bold cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Recibir Mercancía</span>
            </Button>
          )}
        </div>
      </div>

      {/* Aviso discreto si es Borrador */}
      {isDraft && (
        <div className="px-4 py-3 rounded-xl border border-border bg-muted/30 text-xs text-muted-foreground flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-primary shrink-0" />
          <span>
            Esta orden está en <strong className="text-foreground">Borrador</strong>. Puede editar proveedor, cantidades o precios antes de hacer clic en <strong className="text-foreground">Enviar Orden</strong> para habilitar la recepción.
          </span>
        </div>
      )}

      {/* ========================================================
          NIVEL 2: RESUMEN DE PRIMER CONOCIMIENTO
         ======================================================== */}
      <Card className="p-5 border-border shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Preorden / Origen (Columna 1 — misma posición que Orden en Recepción) */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-primary" />
              Preorden de Origen
            </span>
            {linkedRequisitionId ? (
              <Link
                href={`/purchasing/requisitions/${linkedRequisitionId}`}
                className="inline-flex items-center gap-1.5 text-sm font-bold font-mono text-primary hover:underline"
                title="Ir al detalle de la preorden de compra"
              >
                <span>{linkedRequisitionNumber}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <p className="text-sm font-bold text-foreground leading-snug">
                Compra directa
              </p>
            )}
            <p className="text-[11px] text-muted-foreground font-mono">
              {order.createdAt
                ? new Date(order.createdAt).toLocaleDateString("es-VE", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })
                : "-"}
            </p>
          </div>

          {/* Proveedor */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              Proveedor
            </span>
            <p className="text-sm font-bold text-foreground leading-snug">
              {order.supplier?.name || "Sin asignar"}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              {order.supplier?.rifOrId || order.supplier?.rif || "RIF N/A"}
            </p>
          </div>

          {/* Total Pactado */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-primary" />
              Total ({currCode})
            </span>
            <p className="text-sm font-bold font-mono text-foreground leading-snug">
              {symbol}{" "}
              {totalAmount.toLocaleString("es-VE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              {currCode !== "VED"
                ? `Bs. ${totalOrderBs.toLocaleString("es-VE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} · Tasa ${effectiveBcvRate.toFixed(2)}`
                : "Moneda Nacional"}
            </p>
          </div>

          {/* Estado de Pago */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-primary" />
              Liquidación
            </span>
            <p
              className={cn(
                "text-sm font-bold font-mono leading-snug",
                isFullyPaid
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-foreground"
              )}
            >
              {isFullyPaid
                ? "Pagada (100%)"
                : `Saldo: $${remainingDebtUsd.toFixed(2)} USD`}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              Pagado: ${totalPaidUsd.toFixed(2)} USD ({paidPercent}%)
            </p>
          </div>
        </div>
      </Card>

      {/* ========================================================
          NIVEL 3: INSUMOS DE LA ORDEN (CON PAGINACIÓN Y TOTALES)
         ======================================================== */}
      <Card className="overflow-hidden border-border shadow-2xs">
        <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold text-foreground">
              Insumos de la Orden ({totalItemsCount})
            </CardTitle>
          </div>

          {totalItemsCount > 5 && (
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                placeholder="Filtrar insumo, SKU o presentación..."
                className="pl-8 pr-8 h-8 text-xs bg-background"
              />
              {itemSearch && (
                <button
                  type="button"
                  onClick={() => setItemSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="py-2.5 px-4 text-xs font-semibold w-12">#</TableHead>
              <TableHead className="py-2.5 px-4 text-xs font-semibold">Insumo / Reactivo</TableHead>
              <TableHead className="py-2.5 px-4 text-xs font-semibold text-center">Presentación</TableHead>
              <TableHead className="py-2.5 px-4 text-xs font-semibold text-right">Cantidad</TableHead>
              <TableHead className="py-2.5 px-4 text-xs font-semibold text-right">Precio Unit. ({symbol})</TableHead>
              <TableHead className="py-2.5 px-4 text-xs font-semibold text-right">Total ({symbol})</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-xs text-muted-foreground">
                  No se encontraron insumos que coincidan con &ldquo;{itemSearch}&rdquo;.
                </TableCell>
              </TableRow>
            ) : (
              itemsPagination.paginatedItems.map((item, idx) => {
                const rowNumber =
                  (itemsPagination.currentPage - 1) * itemsPagination.pageSize + idx + 1;
                const lineTotal =
                  Number(item.quantityOrdered) * Number(item.unitPrice);
                const presentationLabel =
                  item.unit?.name ||
                  item.unit?.abbreviation ||
                  item.product?.baseUnit?.name ||
                  item.product?.baseUnit?.abbreviation ||
                  item.product?.unitOfMeasure ||
                  "Unidad";

                return (
                  <TableRow
                    key={String(item.id)}
                    className="hover:bg-muted/40 transition-colors text-xs"
                  >
                    <TableCell className="py-2.5 px-4 font-mono text-muted-foreground">
                      {rowNumber}
                    </TableCell>
                    <TableCell className="py-2.5 px-4">
                      <div className="font-semibold text-foreground">
                        {item.product?.name || "Insumo"}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {item.product?.sku && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            SKU: {item.product.sku}
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 font-normal"
                        >
                          {item.isExempt ? "Exento IVA" : "IVA 16%"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 px-4 text-center font-medium text-muted-foreground">
                      {presentationLabel}
                    </TableCell>
                    <TableCell className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                      {Number(item.quantityOrdered)}
                    </TableCell>
                    <TableCell className="py-2.5 px-4 text-right font-mono text-muted-foreground">
                      {symbol} {Number(item.unitPrice).toFixed(2)}
                    </TableCell>
                    <TableCell className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                      {symbol} {lineTotal.toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {filteredItems.length > itemsPagination.pageSize && (
          <TablePagination
            currentPage={itemsPagination.currentPage}
            totalPages={itemsPagination.totalPages}
            pageSize={itemsPagination.pageSize}
            totalItems={itemsPagination.totalItems}
            onPageChange={itemsPagination.onPageChange}
            onPageSizeChange={itemsPagination.onPageSizeChange}
            pageSizeOptions={[10, 25, 50]}
            entityName="insumos"
          />
        )}

        {/* Desglose Fiscal SENIAT compacto */}
        <div className="p-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="text-[11px] text-muted-foreground space-y-0.5">
            <p className="font-semibold text-foreground">Liquidación Fiscal SENIAT</p>
            <p>
              {currCode === "VED"
                ? "Operación en Moneda Nacional (Bs.)"
                : `Tasa oficial BCV aplicada: ${effectiveBcvRate.toFixed(2)} Bs./${currCode === "EUR" ? "€" : "$"}`}
            </p>
          </div>

          <div className="w-full sm:w-72 space-y-1 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Base Gravable (16%):</span>
              <span className="font-mono font-medium text-foreground">
                {symbol} {taxableAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal Exento:</span>
              <span className="font-mono font-medium text-foreground">
                {symbol} {exemptAmount.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>IVA (16%):</span>
              <span className="font-mono font-medium text-foreground">
                {symbol} {taxAmount.toFixed(2)}
              </span>
            </div>
            <div className="border-t border-border pt-1.5 flex justify-between font-bold text-sm text-foreground">
              <span>Total ({currCode}):</span>
              <span className="font-mono text-primary">
                {symbol} {totalAmount.toFixed(2)}
              </span>
            </div>
            {currCode !== "VED" && (
              <div className="flex justify-between text-[11px] text-muted-foreground font-mono">
                <span>Equivalente Bs.:</span>
                <span className="font-semibold text-foreground">
                  Bs.{" "}
                  {totalOrderBs.toLocaleString("es-VE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ========================================================
          NIVEL 4: PAGOS REGISTRADOS
         ======================================================== */}
      <Card className="overflow-hidden border-border shadow-2xs">
        <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold text-foreground">
              Pagos Registrados ({payments.length})
            </CardTitle>
          </div>

          {activePaymentOrder ? (
            <Button
              asChild
              size="sm"
              variant={isFullyPaid ? "outline" : "default"}
              className={cn(
                "h-8 gap-1.5 text-xs font-semibold cursor-pointer",
                !isFullyPaid &&
                  "bg-emerald-600 hover:bg-emerald-700 text-white"
              )}
            >
              <Link href={`/purchasing/debts/${activePaymentOrder.id}`}>
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>
                  Ir a Orden de Pago ({activePaymentOrder.paymentOrderNumber})
                </span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </Button>
          ) : (
            canPay && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={creatingPaymentOrder}
                onClick={() => void handleGeneratePaymentOrder()}
                className="h-8 gap-1.5 text-xs font-semibold cursor-pointer"
              >
                {creatingPaymentOrder ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileCheck2 className="w-3.5 h-3.5" />
                )}
                <span>Generar Orden de Pago</span>
              </Button>
            )
          )}
        </div>

        {payments.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            No se han registrado pagos para esta orden.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="py-2.5 px-4 text-xs font-semibold">Fecha</TableHead>
                  <TableHead className="py-2.5 px-4 text-xs font-semibold">Método</TableHead>
                  <TableHead className="py-2.5 px-4 text-xs font-semibold">Cuenta Origen</TableHead>
                  <TableHead className="py-2.5 px-4 text-xs font-semibold">Referencia</TableHead>
                  <TableHead className="py-2.5 px-4 text-xs font-semibold text-right">Monto</TableHead>
                  <TableHead className="py-2.5 px-4 text-xs font-semibold text-center">Tasa</TableHead>
                  <TableHead className="py-2.5 px-4 text-xs font-semibold text-right">Amortizado (USD)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p, idx) => {
                  const pCurr = p.transactionCurrency || p.sourceAccount?.currency || "USD";
                  const pAmount = Number(p.amountPaid ?? p.amount ?? 0);
                  const pSymbol = pCurr === "VED" ? "Bs." : pCurr === "EUR" ? "€" : "$";
                  const pRate = Number(p.exchangeRate || 0);
                  const amortized = Number(p.amortizedAmountUsd || pAmount);

                  return (
                    <TableRow
                      key={`${p.id || "pay"}-${idx}`}
                      className="hover:bg-muted/40 transition-colors text-xs"
                    >
                      <TableCell className="py-2.5 px-4 font-mono text-muted-foreground whitespace-nowrap">
                        {p.paymentDate
                          ? new Date(p.paymentDate).toLocaleDateString("es-VE")
                          : p.createdAt
                            ? new Date(p.createdAt).toLocaleDateString("es-VE")
                            : "-"}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 whitespace-nowrap">
                        <Badge variant="outline" className="text-[11px] font-medium">
                          {getPaymentMethodLabel(p.method, p.paymentMethod)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2.5 px-4">
                        {p.sourceAccount ? (
                          <div>
                            <span className="font-semibold text-foreground block">
                              {p.sourceAccount.bankName}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ••••
                              {p.sourceAccount.accountNumber
                                ? p.sourceAccount.accountNumber.slice(-4)
                                : "S/N"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">
                            {p.bankName || "-"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 font-mono text-foreground">
                        {p.referenceNumber || p.reference || "S/R"}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-right font-mono font-semibold text-foreground whitespace-nowrap">
                        {pSymbol}{" "}
                        {pAmount.toLocaleString("es-VE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-center font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {pCurr === "USD"
                          ? "1.00"
                          : pRate > 0
                            ? `${pRate.toFixed(2)}`
                            : "-"}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        ${" "}
                        {amortized.toLocaleString("es-VE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* ========================================================
          NIVEL 5: DETALLES SECUNDARIOS (OBSERVACIONES Y PROVEEDOR)
         ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4 border-border/80 bg-muted/10 shadow-none space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <StickyNote className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Observaciones y Condiciones
            </span>
          </div>
          {order.notes ? (
            <p className="text-xs text-foreground whitespace-pre-line leading-relaxed">
              {order.notes}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Sin observaciones registradas.
            </p>
          )}
        </Card>

        <Card className="p-4 border-border/80 bg-muted/10 shadow-none space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Contacto del Proveedor
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-[11px] pt-1">
            <div>
              <span className="text-muted-foreground block">Teléfono</span>
              <span className="font-mono text-foreground">
                {order.supplier?.phone || "No registrado"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Correo</span>
              <span className="font-mono text-foreground">
                {order.supplier?.email || "No registrado"}
              </span>
            </div>
            {order.supplier?.address && (
              <div className="sm:col-span-2">
                <span className="text-muted-foreground block">Dirección</span>
                <span className="text-foreground">{order.supplier.address}</span>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
