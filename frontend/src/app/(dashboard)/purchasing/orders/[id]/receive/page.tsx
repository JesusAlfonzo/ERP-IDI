"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { PurchasingClientService } from "@/services/purchasing.service";
import { InventoryClientService } from "@/services/inventory.service";
import { AuthService } from "@/services/auth.service";
import type { PurchaseOrder, PurchaseOrderItem } from "@/types/purchasing";
import type { Location } from "@/types/inventory";
import {
  PackageCheck,
  ArrowLeft,
  Building2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Package,
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
}

export default function ReceiveOrderPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = Number(params?.id);

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
              "und",
            multiplier: mult,
            orderedQuantity: ordered,
            pendingQuantity: pending,
            receivedQuantity: pending,
            lotNumber: "",
            expirationDate: "",
            locationId: defaultLocId,
          };
        })
        .filter((row: ReceptionRow) => row.pendingQuantity > 0);

      setItemsData(rows);
    } catch (err: unknown) {
      console.error("Error al cargar orden", err);
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
    init();
    return () => {
      isMounted = false;
    };
  }, [router, loadOrderAndCatalogs]);

  const handleRowChange = (
    index: number,
    field: keyof ReceptionRow,
    value: string | number,
  ) => {
    setItemsData((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const calculatedTotal = (order?.items || []).reduce(
    (acc, curr) =>
      acc + (Number(curr.quantityOrdered) || 0) * (Number(curr.unitPrice) || 0),
    0,
  );
  const displayTotal = Number(order?.totalAmount) || calculatedTotal;

  const handleSubmitReception = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const hasInvalidRow = itemsData.some(
      (it) =>
        !it.lotNumber.trim() ||
        Number(it.receivedQuantity) <= 0 ||
        Number(it.receivedQuantity) > it.pendingQuantity ||
        !it.expirationDate,
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
        })),
      });

      setFeedback({
        status: "success",
        message:
          "Mercancía recibida e inventario actualizado. Los lotes ingresaron a Cuarentena bajo control de calidad.",
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
      <div className="h-96 flex items-center justify-center text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2 text-blue-600" />
        <span className="text-sm font-medium">
          Consultando orden de compra y almacenes...
        </span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8 text-center text-slate-500">
        Orden no encontrada o no disponible para recepción.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Encabezado */}
      <div className="flex items-center gap-3">
        <Link
          href={`/purchasing/orders/${orderId}`}
          className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition-colors shadow-2xs"
          title="Volver al detalle de la orden"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <PackageCheck className="w-6 h-6 text-emerald-600" />
            Recepción de Mercancía
          </h1>
          <p className="text-xs text-slate-500">
            Ingreso de lotes físicos y asignación preventiva a Cuarentena
          </p>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 border ${
            feedback.status === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {feedback.status === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Tarjeta Informativa de la Orden */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold">
            Orden de Compra
          </span>
          <div className="text-lg font-bold font-mono text-slate-800">
            {order.orderNumber || `#${order.id}`}
          </div>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold">
            Proveedor Comercial
          </span>
          <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-slate-400" />
            {order.supplier?.name || "Proveedor General"}
          </div>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold">
            Monto Acordado
          </span>
          <div className="text-sm font-bold font-mono text-slate-800">
            {order.currency?.symbol || "$"}{" "}
            {displayTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {itemsData.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3 shadow-xs">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">
            Orden Completada
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Todos los renglones de esta orden ya han sido recibidos en su
            totalidad en el inventario.
          </p>
          <div className="pt-2">
            <Link
              href={`/purchasing/orders/${orderId}`}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-semibold"
            >
              Regresar al Detalle
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmitReception} className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              N° Guía de Despacho / Factura / Observaciones (Opcional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Guía de traslado 00492 / Cadena de frío preservada"
              className="w-full sm:w-96 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-slate-500" />
                Renglones Pendientes por Recibir
              </span>
              <span className="text-[11px] text-slate-500">
                Estado asignado: <b className="text-amber-700">EN_CUARENTENA</b>
              </span>
            </div>

            <div className="divide-y divide-slate-100 p-5 space-y-4">
              {itemsData.map((row, idx) => {
                const baseEquivalent = row.receivedQuantity * row.multiplier;
                return (
                  <div
                    key={row.orderItemId || idx}
                    className="pt-4 first:pt-0 grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
                  >
                    <div className="md:col-span-3">
                      <div className="font-semibold text-xs text-slate-800">
                        {row.productName}
                      </div>
                      <div className="font-mono text-[10px] text-slate-400">
                        SKU: {row.sku}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Pendiente:{" "}
                        <b className="text-blue-700">
                          {row.pendingQuantity} / {row.orderedQuantity}{" "}
                          {row.unitOfMeasure}
                        </b>
                      </div>
                      {row.multiplier > 1 && (
                        <div className="text-[10px] text-blue-600 font-medium">
                          Factor: x{row.multiplier} (= {baseEquivalent} base)
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                        Cant. a Recibir
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="1"
                        max={row.pendingQuantity}
                        value={row.receivedQuantity}
                        onChange={(e) =>
                          handleRowChange(
                            idx,
                            "receivedQuantity",
                            Number(e.target.value),
                          )
                        }
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                        Lote Fabricante *
                      </label>
                      <input
                        type="text"
                        value={row.lotNumber}
                        onChange={(e) =>
                          handleRowChange(idx, "lotNumber", e.target.value)
                        }
                        placeholder="LOTE-2026-X"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono uppercase"
                        required
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-center gap-1 text-[10px] font-semibold text-slate-500 uppercase mb-1">
                        <Calendar className="w-3 h-3" /> Vencimiento *
                      </label>
                      <input
                        type="date"
                        value={row.expirationDate}
                        onChange={(e) =>
                          handleRowChange(idx, "expirationDate", e.target.value)
                        }
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                        required
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                        Ubicación Física
                      </label>
                      <select
                        value={row.locationId}
                        onChange={(e) =>
                          handleRowChange(
                            idx,
                            "locationId",
                            Number(e.target.value),
                          )
                        }
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                      >
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Link
              href={`/purchasing/orders/${orderId}`}
              className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting
                ? "Procesando entrada..."
                : "Confirmar Recepción de Mercancía"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
