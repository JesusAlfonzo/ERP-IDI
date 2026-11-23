"use client";

import { useState, useEffect, useCallback, useMemo, type FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { PurchasingClientService } from "@/services/purchasing.service";
import { InventoryClientService } from "@/services/inventory.service";
import { AuthService } from "@/services/auth.service";
import type { PurchaseOrder, PurchaseOrderItem } from "@/types/purchasing";
import type { Location } from "@/types/inventory";
import { cn } from "@/lib/utils";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  PackageCheck,
  ArrowLeft,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Boxes,
  FileText,
  ShieldCheck,
  ShieldAlert,
  ExternalLink,
  X,
} from "lucide-react";

interface ReceptionRow {
  orderItemId: number;
  productId: number;
  productName: string;
  sku: string;
  unitOfMeasure: string;
  multiplier: number;
  orderedQuantity: number;
  pendingQuantity: number;
  receivedQuantity: number;
  lotNumber: string;
  expirationDate: string;
  locationId: number;
  isConforming: boolean;
}

export default function ReceiveOrderPage() {
  const router = useRouter();
  const params = useParams();
  const rawId = params?.id;
  const orderId = Number(Array.isArray(rawId) ? rawId[0] : rawId);

  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [itemsData, setItemsData] = useState<ReceptionRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  const loadOrderAndCatalogs = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const [orderData, locs] = await Promise.all([
        PurchasingClientService.getOrderById(orderId),
        InventoryClientService.getLocations().catch(() => []),
      ]);

      setOrder(orderData);
      setLocations(locs);

      const defaultLocId = locs[0]?.id ? Number(locs[0].id) : 1;

      const rows: ReceptionRow[] = (orderData.items || [])
        .map((item: PurchaseOrderItem) => {
          const ordered = Number(item.quantityOrdered) || 0;
          const received = Number(item.quantityReceived) || 0;
          const rejected = Number(item.quantityRejected) || 0;
          const pending = Math.max(0, ordered - received + rejected);
          const mult = Number(item.multiplier) || 1;

          return {
            orderItemId: Number(item.id),
            productId: Number(item.productId),
            productName: item.product?.name || `Producto #${item.productId}`,
            sku: item.product?.sku || "N/A",
            unitOfMeasure:
              item.unit?.abbreviation ||
              item.product?.baseUnit?.abbreviation ||
              item.product?.unitOfMeasure ||
              "UND",
            multiplier: mult,
            orderedQuantity: ordered,
            pendingQuantity: pending,
            receivedQuantity: pending,
            lotNumber: "",
            expirationDate: "",
            locationId: defaultLocId,
            isConforming: true,
          };
        })
        .filter((row: ReceptionRow) => row.pendingQuantity > 0);

      setItemsData(rows);
    } catch (err: unknown) {
      console.error("Error al cargar orden", err);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    let isMounted = true;
    if (!AuthService.isAuthenticated()) {
      router.replace("/login");
      return;
    }
    const init = async () => {
      if (isMounted) await loadOrderAndCatalogs();
    };
    void init();
    return () => {
      isMounted = false;
    };
  }, [router, loadOrderAndCatalogs]);

  const handleRowChange = (
    index: number,
    field: keyof ReceptionRow,
    value: string | number | boolean
  ) => {
    setItemsData((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSetAllConforming = (conforming: boolean) => {
    setItemsData((prev) =>
      prev.map((row) => ({ ...row, isConforming: conforming }))
    );
  };

  const receptionSummary = useMemo(() => {
    const totalPendingRows = itemsData.length;
    const totalUnitsToReceive = itemsData.reduce(
      (acc, r) => acc + (Number(r.receivedQuantity) || 0),
      0
    );
    const conformingCount = itemsData.filter((r) => r.isConforming).length;
    const quarantineCount = totalPendingRows - conformingCount;
    return {
      totalPendingRows,
      totalUnitsToReceive,
      conformingCount,
      quarantineCount,
    };
  }, [itemsData]);

  const handleSubmitReception = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const hasInvalidRow = itemsData.some(
      (it) =>
        !it.lotNumber.trim() ||
        Number(it.receivedQuantity) <= 0 ||
        Number(it.receivedQuantity) > it.pendingQuantity ||
        !it.expirationDate
    );

    if (hasInvalidRow) {
      setFeedback({
        status: "error",
        message:
          "Verifique que todos los lotes tengan número de identificación, fecha de vencimiento y una cantidad válida dentro del saldo pendiente.",
      });
      return;
    }

    setSubmitting(true);
    try {
      await PurchasingClientService.receiveOrder({
        orderId,
        notes: notes.trim() || undefined,
        items: itemsData.map((row) => ({
          orderItemId: row.orderItemId,
          lotNumber: row.lotNumber.trim().toUpperCase(),
          expirationDate: row.expirationDate,
          quantityReceived: Number(row.receivedQuantity),
          locationId: Number(row.locationId),
          requiresQuarantine: !row.isConforming,
        })),
      });

      const quarantineCount = itemsData.filter((it) => !it.isConforming).length;
      setFeedback({
        status: "success",
        message:
          quarantineCount > 0
            ? `Mercancía recibida e inventario actualizado. ${quarantineCount} lote(s) ingresaron a Cuarentena y los restantes a Stock Disponible.`
            : "Mercancía recibida e inventario actualizado. Todos los lotes ingresaron como Disponibles.",
      });

      setTimeout(() => {
        router.push(`/purchasing/orders/${orderId}`);
      }, 1200);
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Error al procesar la entrada de mercancía.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-medium">
          Cargando orden de compra y ubicaciones...
        </span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto py-12">
        <Card className="p-6 text-center space-y-4 border-border shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">
              Orden no encontrada
            </h2>
            <p className="text-xs text-muted-foreground">
              La orden solicitada no existe o no está disponible para recepción.
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs cursor-pointer"
          >
            <Link href="/purchasing/orders">
              <ArrowLeft className="w-3.5 h-3.5" /> Volver a Órdenes
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  const isBlocked =
    order.status === "BORRADOR" ||
    order.status === "CANCELADA" ||
    order.status === "CANCELADO";

  if (isBlocked) {
    return (
      <div className="max-w-lg mx-auto py-12">
        <Card className="p-6 text-center space-y-4 border-amber-500/30 shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-foreground">
              Orden #{order.orderNumber} no habilitada para recepción
            </h2>
            <p className="text-xs text-muted-foreground">
              Estado actual: <strong className="text-foreground">{order.status}</strong>. La orden debe ser enviada al proveedor antes de registrar entradas en almacén.
            </p>
          </div>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs cursor-pointer"
          >
            <Link href={`/purchasing/orders/${orderId}`}>
              <ArrowLeft className="w-3.5 h-3.5" /> Ver Detalle de la Orden
            </Link>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ========================================================
          ENCABEZADO ESTANDARIZADO
         ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-start sm:items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            asChild
            className="h-9 w-9 shrink-0 cursor-pointer"
          >
            <Link
              href={`/purchasing/orders/${orderId}`}
              title="Volver a la orden"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <PackageCheck className="w-6 h-6 text-primary" />
                Recepción de Mercancía
              </h1>
              <Link
                href={`/purchasing/orders/${orderId}`}
                title="Ver detalle de la orden de compra"
                className="inline-flex items-center"
              >
                <Badge
                  variant="outline"
                  className="text-xs font-mono gap-1 hover:border-primary/50 hover:text-primary transition-colors cursor-pointer"
                >
                  <span>Orden #{order.orderNumber || order.id}</span>
                  <ExternalLink className="w-3 h-3" />
                </Badge>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Registro de lotes, fechas de vencimiento y destino de inventario
            </p>
          </div>
        </div>

        {itemsData.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 text-xs cursor-pointer"
            >
              <Link href={`/purchasing/orders/${orderId}`}>Cancelar</Link>
            </Button>
            <Button
              form="receive-form"
              type="submit"
              disabled={submitting}
              size="sm"
              className="h-9 gap-1.5 text-xs font-bold cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
            >
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <PackageCheck className="w-4 h-4" />
              )}
              <span>{submitting ? "Procesando..." : "Confirmar Recepción"}</span>
            </Button>
          </div>
        )}
      </div>

      {feedback && (
        <Alert
          variant={feedback.status === "success" ? "success" : "destructive"}
          className="animate-in fade-in duration-200"
        >
          {feedback.status === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          <AlertTitle>
            {feedback.status === "success" ? "Recepción Registrada" : "Error"}
          </AlertTitle>
          <AlertDescription className="flex items-center justify-between text-xs">
            <span>{feedback.message}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="opacity-70 hover:opacity-100 cursor-pointer ml-3"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </AlertDescription>
        </Alert>
      )}

      {/* ========================================================
          RESUMEN DE PRIMER CONOCIMIENTO
         ======================================================== */}
      <Card className="p-5 border-border shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-primary" />
              Orden de Compra
            </span>
            <Link
              href={`/purchasing/orders/${orderId}`}
              className="inline-flex items-center gap-1.5 text-sm font-bold font-mono text-primary hover:underline"
              title="Ir al detalle de la orden de compra"
            >
              <span>{order.orderNumber || `#${order.id}`}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <p className="text-[11px] text-muted-foreground">
              {order.createdAt
                ? new Date(order.createdAt).toLocaleDateString("es-VE")
                : "-"}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-primary" />
              Proveedor
            </span>
            <p className="text-sm font-bold text-foreground leading-snug">
              {order.supplier?.name || "Proveedor General"}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              {order.supplier?.rifOrId || order.supplier?.rif || "RIF N/A"}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-primary" />
              Pendientes
            </span>
            <p className="text-sm font-bold font-mono text-foreground">
              {receptionSummary.totalPendingRows}{" "}
              <span className="font-sans font-normal text-xs text-muted-foreground">
                {receptionSummary.totalPendingRows === 1 ? "insumo" : "insumos"}
              </span>
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">
              {receptionSummary.totalUnitsToReceive} unidades a recibir
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              Destino de Lotes
            </span>
            <div className="flex items-center gap-2 pt-0.5 flex-wrap">
              <Badge
                variant="success"
                className="text-[11px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-mono"
              >
                {receptionSummary.conformingCount} Disponible
              </Badge>
              {receptionSummary.quarantineCount > 0 && (
                <Badge
                  variant="warning"
                  className="text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 font-mono"
                >
                  {receptionSummary.quarantineCount} Cuarentena
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      {itemsData.length === 0 ? (
        <Card className="p-8 text-center space-y-3 border-border shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">
            Orden Completada
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Todos los insumos de esta orden ya fueron recibidos en su totalidad en el inventario.
          </p>
          <div className="pt-2">
            <Button asChild size="sm" variant="outline" className="cursor-pointer">
              <Link href={`/purchasing/orders/${orderId}`}>
                Volver al Detalle
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <form id="receive-form" onSubmit={handleSubmitReception} className="space-y-6">
          {/* ========================================================
              SECCIÓN 1: GUÍA DE ENTREGA Y OBSERVACIONES
             ======================================================== */}
          <Card className="p-5 border-border shadow-2xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-border">
              <FileText className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-bold text-foreground">
                1. Guía de Entrega y Observaciones
              </CardTitle>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                Referencia de Guía / Factura / Observaciones (Opcional)
              </Label>
              <Input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. Guía de traslado 00492 · Cadena de frío preservada"
                className="text-xs h-9"
              />
            </div>
          </Card>

          {/* ========================================================
              SECCIÓN 2: INSUMOS PENDIENTES POR RECIBIR
             ======================================================== */}
          <Card className="p-5 border-border shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-primary" />
                <CardTitle className="text-sm font-bold text-foreground">
                  2. Insumos Pendientes ({itemsData.length})
                </CardTitle>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetAllConforming(true)}
                  className="text-[11px] h-7 cursor-pointer"
                >
                  Todos Disponibles
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetAllConforming(false)}
                  className="text-[11px] h-7 cursor-pointer"
                >
                  Todos a Cuarentena
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {itemsData.map((row, idx) => {
                const baseEquivalent = row.receivedQuantity * row.multiplier;
                const checkboxId = `conforming-${row.orderItemId || idx}`;

                return (
                  <Card
                    key={row.orderItemId || idx}
                    className="p-4 bg-muted/20 border-border shadow-none space-y-3"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                      <div className="md:col-span-3 space-y-0.5 self-center">
                        <div className="font-semibold text-xs text-foreground">
                          {row.productName}
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          SKU: {row.sku}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Pendiente:{" "}
                          <strong className="font-mono text-primary">
                            {row.pendingQuantity} / {row.orderedQuantity} {row.unitOfMeasure}
                          </strong>
                        </div>
                        {row.multiplier > 1 && (
                          <div className="text-[10px] text-muted-foreground font-mono">
                            Factor x{row.multiplier} (≈ {baseEquivalent} base)
                          </div>
                        )}
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-[11px] font-medium">
                          Cantidad *
                        </Label>
                        <Input
                          type="number"
                          step="any"
                          min="1"
                          max={row.pendingQuantity}
                          value={row.receivedQuantity}
                          onChange={(e) =>
                            handleRowChange(
                              idx,
                              "receivedQuantity",
                              Number(e.target.value)
                            )
                          }
                          className="h-9 text-xs font-mono font-bold"
                          required
                        />
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-[11px] font-medium">
                          Lote *
                        </Label>
                        <Input
                          type="text"
                          value={row.lotNumber}
                          onChange={(e) =>
                            handleRowChange(idx, "lotNumber", e.target.value)
                          }
                          placeholder="LOTE-2026-X"
                          className="h-9 text-xs font-mono uppercase"
                          required
                        />
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <Label className="flex items-center gap-1 text-[11px] font-medium">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          Vencimiento *
                        </Label>
                        <Input
                          type="date"
                          value={row.expirationDate}
                          onChange={(e) =>
                            handleRowChange(idx, "expirationDate", e.target.value)
                          }
                          className="h-9 text-xs"
                          required
                        />
                      </div>

                      <div className="md:col-span-3 space-y-1">
                        <Label className="text-[11px] font-medium">
                          Ubicación *
                        </Label>
                        <select
                          value={row.locationId}
                          onChange={(e) =>
                            handleRowChange(
                              idx,
                              "locationId",
                              Number(e.target.value)
                            )
                          }
                          className="w-full h-9 bg-background border border-input rounded-lg px-2.5 text-xs text-foreground focus:ring-2 focus:ring-ring cursor-pointer"
                        >
                          {locations.map((loc) => (
                            <option key={loc.id} value={loc.id}>
                              {loc.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Control de Conformidad */}
                    <div className="pt-2.5 border-t border-border/70 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={checkboxId}
                          checked={row.isConforming}
                          onCheckedChange={(checked) =>
                            handleRowChange(idx, "isConforming", Boolean(checked))
                          }
                        />
                        <Label
                          htmlFor={checkboxId}
                          className="text-xs font-medium text-foreground cursor-pointer select-none"
                        >
                          Ingreso Conforme (pasa directo a stock disponible)
                        </Label>
                      </div>

                      <Badge
                        variant={row.isConforming ? "success" : "warning"}
                        className={cn(
                          "gap-1.5 text-[11px]",
                          row.isConforming
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                        )}
                      >
                        {row.isConforming ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            Disponible
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            Cuarentena / Revisión Técnica
                          </>
                        )}
                      </Badge>
                    </div>
                  </Card>
                );
              })}
            </div>
          </Card>

          {/* Barra Inferior de Acción */}
          <div className="flex items-center justify-between gap-4 pt-2">
            <Button asChild variant="outline" className="cursor-pointer">
              <Link href={`/purchasing/orders/${orderId}`}>Cancelar</Link>
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="gap-2 cursor-pointer shadow-xs px-6"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <PackageCheck className="w-4 h-4" />
              )}
              {submitting ? "Procesando entrada..." : "Confirmar Recepción"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
