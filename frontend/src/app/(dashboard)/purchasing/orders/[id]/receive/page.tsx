"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { PurchasingClientService } from "@/services/purchasing.service";
import { AuthService } from "@/services/auth.service";
import type { PurchaseOrder } from "@/types/purchasing";
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
  productId: number;
  productName: string;
  sku: string;
  unitOfMeasure: string;
  orderedQuantity: number;
  receivedQuantity: number;
  lotNumber: string;
  expirationDate: string;
}

export default function ReceiveOrderPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = Number(params.id);

  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState("");
  const [itemsData, setItemsData] = useState<ReceptionRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    try {
      const data = await PurchasingClientService.getOrderById(orderId);
      setOrder(data);

      const rows: ReceptionRow[] = (data.items || []).map((item) => ({
        productId: item.productId,
        productName: item.product?.name || `Producto #${item.productId}`,
        sku: item.product?.sku || "N/A",
        unitOfMeasure: item.product?.unitOfMeasure || "Unid",
        orderedQuantity: Number(item.quantity),
        receivedQuantity: Number(item.quantity),
        lotNumber: "",
        expirationDate: "",
      }));
      setItemsData(rows);
    } catch {
      // Interceptor global
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    const init = async () => {
      if (!AuthService.isAuthenticated()) {
        router.replace("/login");
        return;
      }
      await loadOrder();
    };
    init();
  }, [router, loadOrder]);

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

  const handleSubmitReception = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const hasMissingLot = itemsData.some(
      (it) => !it.lotNumber.trim() || it.receivedQuantity <= 0,
    );
    if (hasMissingLot) {
      setFeedback({
        status: "error",
        message:
          "Debe ingresar el número de lote del fabricante y una cantidad válida para cada renglón.",
      });
      return;
    }

    setSubmitting(true);
    try {
      await PurchasingClientService.receiveOrder({
        orderId,
        deliveryNoteNumber: deliveryNoteNumber.trim() || undefined,
        items: itemsData.map((row) => ({
          productId: row.productId,
          lotNumber: row.lotNumber.trim().toUpperCase(),
          expirationDate: row.expirationDate || undefined,
          receivedQuantity: Number(row.receivedQuantity),
        })),
      });

      setFeedback({
        status: "success",
        message:
          "Mercancía recibida exitosamente. Los lotes fueron ingresados a Cuarentena.",
      });

      setTimeout(() => {
        router.push("/quality/quarantine");
      }, 1500);
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
          Consultando orden de compra...
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
          href="/purchasing/orders"
          className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 transition-colors shadow-2xs"
          title="Volver a Órdenes"
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
            {order.orderNumber}
          </div>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold">
            Proveedor Comercial
          </span>
          <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-slate-400" />
            {order.supplier?.name}
          </div>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 uppercase font-semibold">
            Monto Acordado
          </span>
          <div className="text-sm font-bold font-mono text-slate-800">
            $
            {Number(order.totalAmountUsd).toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </div>
        </div>
      </div>

      {/* Formulario de Entrada */}
      <form onSubmit={handleSubmitReception} className="space-y-6">
        {/* N° de Guía o Nota de Entrega */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            N° Guía de Despacho / Factura del Proveedor (Opcional)
          </label>
          <input
            type="text"
            value={deliveryNoteNumber}
            onChange={(e) => setDeliveryNoteNumber(e.target.value)}
            placeholder="Ej: GUIA-PROV-9082"
            className="w-full sm:w-96 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>

        {/* Renglones para asignación de lote */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-500" />
              Detalle de Renglones Recibidos
            </span>
            <span className="text-[11px] text-slate-400">
              Todos los lotes se crearán bajo estado preventivo{" "}
              <b>EN_CUARENTENA</b>
            </span>
          </div>

          <div className="divide-y divide-slate-100 p-5 space-y-4">
            {itemsData.map((row, idx) => (
              <div
                key={idx}
                className="pt-4 first:pt-0 grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
              >
                <div className="md:col-span-4">
                  <div className="font-semibold text-xs text-slate-800">
                    {row.productName}
                  </div>
                  <div className="font-mono text-[10px] text-slate-400">
                    SKU: {row.sku}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Pedido original:{" "}
                    <b>
                      {row.orderedQuantity} {row.unitOfMeasure}
                    </b>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                    Cant. Recibida
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="1"
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

                <div className="md:col-span-3">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                    N° Lote Fabricante
                  </label>
                  <input
                    type="text"
                    value={row.lotNumber}
                    onChange={(e) =>
                      handleRowChange(idx, "lotNumber", e.target.value)
                    }
                    placeholder="Lote del empaque"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono"
                    required
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Fecha Expiración
                  </label>
                  <input
                    type="date"
                    value={row.expirationDate}
                    onChange={(e) =>
                      handleRowChange(idx, "expirationDate", e.target.value)
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link
            href="/purchasing/orders"
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
    </div>
  );
}
