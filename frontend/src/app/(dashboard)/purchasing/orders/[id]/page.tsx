"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { PurchasingClientService } from "@/services/purchasing.service";
import type { PurchaseOrder } from "@/types/purchasing";
import {
  FileText,
  ArrowLeft,
//   Calendar,
  Building2,
  Package,
  Boxes,
  Truck,
  Receipt,
  Printer,
  Loader2,
} from "lucide-react";

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!orderId) return;

    startTransition(() => {
      void (async () => {
        try {
          const data = await PurchasingClientService.getOrderById(orderId);
          setOrder(data);
        } catch (err) {
          console.error("Error cargando orden de compra", err);
        } finally {
          setLoading(false);
        }
      })();
    });
  }, [orderId]);

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
          className="inline-flex items-center gap-2 px-4 py-2 text-xs bg-slate-900 text-white rounded-lg cursor-pointer"
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

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/purchasing/orders")}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Regresar"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                {order.orderNumber || `#${order.id}`}
              </span>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border bg-slate-100 text-slate-800 border-slate-200">
                {order.status}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              Orden de Compra Institucional
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Imprimir
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Building2 className="w-4 h-4 text-blue-600" />
            Proveedor
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

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Receipt className="w-4 h-4 text-emerald-600" />
            Importe
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {order.currency?.symbol ?? "$"}{" "}
            {Number(order.totalAmount || order.total || 0).toLocaleString(
              "en-US",
              {
                minimumFractionDigits: 2,
              },
            )}
          </div>
          <span className="text-[11px] text-slate-400 block font-mono">
            Moneda: {order.currency?.code ?? "USD"}
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Boxes className="w-4 h-4 text-purple-600" />
            Control
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
          </div>
        </div>
      </div>

      {/* Renglones */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 bg-slate-50/70">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" />
            Renglones de la Orden
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="py-3 px-4 text-left">SKU</th>
                <th className="py-3 px-4 text-left">Insumo</th>
                <th className="py-3 px-4 text-center">Unidad</th>
                <th className="py-3 px-4 text-center">Factor</th>
                <th className="py-3 px-4 text-right">Cant. Ordenada</th>
                <th className="py-3 px-4 text-right">Cant. Recibida</th>
                <th className="py-3 px-4 text-right">Precio Unitario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items?.map((item) => (
                <tr key={String(item.id)} className="hover:bg-slate-50/80">
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">
                    {item.product?.sku ?? "---"}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {item.product?.name}
                  </td>
                  <td className="py-3 px-4 text-center text-slate-700">
                    {item.unit?.abbreviation ||
                      item.product?.baseUnit?.abbreviation ||
                      item.product?.unitOfMeasure ||
                      "und"}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-slate-600">
                    {Number(item.multiplier || 1) > 1
                      ? `x${item.multiplier}`
                      : "1:1"}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                    {Number(item.quantityOrdered)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-700 font-semibold">
                    {Number(item.quantityReceived || 0)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700">
                    ${Number(item.unitPrice).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
