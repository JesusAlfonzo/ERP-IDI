"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PurchasingClientService } from "@/services/purchasing.service";
import type { PurchaseOrder } from "@/types/purchasing";
import {
  FileText,
  ArrowLeft,
  Building2,
  Package,
  Boxes,
  Truck,
  Receipt,
  Printer,
  Loader2,
  Calculator,
  ExternalLink,
  Coins,
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

  const taxableAmountUsd =
    order.taxableAmountUsd != null
      ? Number(order.taxableAmountUsd)
      : fallbackTaxable;

  const exemptAmountUsd =
    order.exemptAmountUsd != null
      ? Number(order.exemptAmountUsd)
      : fallbackExempt;

  const taxAmountUsd =
    order.taxAmountUsd != null
      ? Number(order.taxAmountUsd)
      : Math.round(taxableAmountUsd * 0.16 * 100) / 100;

  const totalAmountUsd =
    order.totalAmountUsd != null
      ? Number(order.totalAmountUsd)
      : Number(order.totalAmount || order.total || 0);

  const totalAmountBs =
    order.totalAmountBs != null
      ? Number(order.totalAmountBs)
      : rate > 0
        ? Math.round(totalAmountUsd * rate * 100) / 100
        : null;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
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

      {/* Resumen Superior */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

        {/* Importe USD */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Receipt className="w-4 h-4 text-emerald-600" />
            Total Factura (USD)
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            ${totalAmountUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 block font-mono">
            Moneda: {order.currency?.code ?? "USD"}
          </span>
        </div>

        {/* Tasa BCV y Conversión Bs. */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Coins className="w-4 h-4 text-amber-600" />
            Tasa BCV y Total Bs.
          </div>
          <div className="text-base font-bold font-mono text-slate-900">
            {totalAmountBs != null
              ? `Bs. ${totalAmountBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "N/A"}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
            <span>Tasa BCV:</span>
            <span className="font-bold text-slate-700">
              {rate > 0 ? `${rate.toFixed(2)} Bs./$` : "No fijada"}
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

      {/* Renglones */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" />
            Renglones de la Orden de Compra
          </h3>
          <span className="text-xs text-slate-500">
            {order.items?.length ?? 0} ítems registrados
          </span>
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
                <th className="py-3 px-4 text-right">Precio Unit. ($)</th>
                <th className="py-3 px-4 text-center">Régimen Fiscal</th>
                <th className="py-3 px-4 text-right">Total Renglón ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items?.map((item) => {
                const lineTotal =
                  Number(item.quantityOrdered) * Number(item.unitPrice);
                return (
                  <tr key={String(item.id)} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {item.product?.sku ?? "---"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {item.product?.name}
                      </div>
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
                    <td className="py-3 px-4 text-center">
                      {item.isExempt ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Exento
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          Gravable 16%
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      ${lineTotal.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Proforma Fiscal SENIAT */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Liquidación y Fiscalidad SENIAT (Venezuela)
              </h3>
              <p className="text-xs text-slate-500">
                Resumen tributario conforme a la normativa fiscal del IVA (16%) y tasa oficial BCV
              </p>
            </div>
          </div>
          {rate > 0 && (
            <span className="text-xs font-mono font-medium px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
              Tasa Oficial BCV: {rate.toFixed(2)} Bs./$
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Desglose USD */}
          <div className="space-y-2 bg-white p-4 rounded-lg border border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-1.5">
              Valores en Divisa (USD)
            </h4>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600">Base Imponible Gravable (16%):</span>
              <span className="font-mono font-semibold text-slate-800">
                ${taxableAmountUsd.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600">Subtotal Exento de IVA:</span>
              <span className="font-mono font-semibold text-emerald-700">
                ${exemptAmountUsd.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-600">Impuesto al Valor Agregado (IVA 16%):</span>
              <span className="font-mono font-semibold text-slate-800">
                ${taxAmountUsd.toFixed(2)}
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
              <span className="font-bold text-slate-900">Total Factura (USD):</span>
              <span className="font-mono font-bold text-blue-700 text-base">
                ${totalAmountUsd.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Conversión y Liquidación en Bolívares */}
          <div className="space-y-2 bg-white p-4 rounded-lg border border-slate-200">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide border-b border-slate-100 pb-1.5">
              Conversión a Moneda Nacional (Bs.)
            </h4>
            {rate > 0 ? (
              <>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">Tasa de Cambio Aplicada:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    {rate.toFixed(2)} Bs./USD
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">Base Gravable en Bs.:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    Bs. {(taxableAmountUsd * rate).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600">IVA (16%) en Bs.:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    Bs. {(taxAmountUsd * rate).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-900">Total a Liquidar (Bs.):</span>
                  <span className="font-mono font-bold text-emerald-700 text-base">
                    Bs. {totalAmountBs?.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? "0.00"}
                  </span>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center p-4 text-center text-xs text-slate-400 italic">
                No se registró tasa de cambio BCV para esta orden.
              </div>
            )}
          </div>
        </div>

        {order.notes && (
          <div className="mt-4 pt-3 border-t border-slate-200 text-xs">
            <span className="font-bold text-slate-700">Observaciones: </span>
            <span className="text-slate-600">{order.notes}</span>
          </div>
        )}
      </div>
    </div>
  );
}
