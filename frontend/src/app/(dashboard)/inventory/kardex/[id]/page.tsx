"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { InventoryClientService } from "@/services/inventory.service";
import {
  FileText,
  ArrowLeft,
  Calendar,
  User,
  Building,
  Boxes,
  Loader2,
  Printer,
} from "lucide-react";

interface MovementProduct {
  id: string | number;
  name: string;
  sku: string;
  category?: { name: string } | null;
  baseUnit?: { abbreviation: string } | null;
}

interface MovementBatch {
  id: string | number;
  lotNumber: string;
  expirationDate: string | null;
  product?: MovementProduct | null;
}

interface MovementItemDetail {
  id: string | number;
  quantity: string | number;
  unitCost: string | number | null;
  batch?: MovementBatch | null;
}

interface MovementDetail {
  id: string | number;
  referenceNumber: string | null;
  type: string;
  notes: string | null;
  createdAt: string;
  createdBy?: {
    fullName: string | null;
    username: string;
    department: string | null;
  } | null;
  originLocation?: { name: string } | null;
  destinationLocation?: { name: string } | null;
  order?: {
    id: number;
    orderNumber: string;
    supplier?: { name: string } | null;
  } | null;
  items?: MovementItemDetail[];
}

export default function KardexDetailPage() {
  const params = useParams();
  const router = useRouter();
  const movementId = params?.id as string;

  const [movement, setMovement] = useState<MovementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!movementId) return;

    startTransition(() => {
      void (async () => {
        try {
          const data = await InventoryClientService.getMovementById(movementId);
          setMovement(data as MovementDetail);
        } catch (err) {
          console.error("Error cargando comprobante de movimiento", err);
        } finally {
          setLoading(false);
        }
      })();
    });
  }, [movementId]);

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <span className="text-xs text-slate-500 font-medium">
          Cargando comprobante de auditoría...
        </span>
      </div>
    );
  }

  if (!movement) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <FileText className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          Comprobante no encontrado
        </h2>
        <button
          type="button"
          onClick={() => router.push("/inventory/kardex")}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs bg-slate-900 text-white rounded-lg"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Kardex
        </button>
      </div>
    );
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "ENTRADA_COMPRA":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "DESPACHO_SOLICITUD":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "AJUSTE_INVENTARIO":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "DESCARTE_MERMA":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Barra superior */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/inventory/kardex")}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
            title="Regresar al Kardex"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                {movement.referenceNumber || `#${movement.id}`}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${getTypeBadge(
                  movement.type,
                )}`}
              >
                {movement.type.replace("_", " ")}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              Comprobante de Movimiento de Almacén
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition-colors"
        >
          <Printer className="w-3.5 h-3.5" /> Imprimir Comprobante
        </button>
      </div>

      {/* Tarjeta de Metadatos del Movimiento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Fecha y Hora de Registro
          </div>
          <p className="text-sm font-bold text-slate-900 font-mono">
            {new Date(movement.createdAt).toLocaleString()}
          </p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <User className="w-3.5 h-3.5 text-slate-400" />
            Responsable / Ejecutor
          </div>
          <p className="text-sm font-bold text-slate-900">
            {movement.createdBy?.fullName ||
              movement.createdBy?.username ||
              "Sistema"}
          </p>
          <span className="text-[11px] text-slate-400 block">
            {movement.createdBy?.department ?? "Almacén Central"}
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            Origen / Destino
          </div>
          <p className="text-sm font-bold text-slate-900">
            {movement.destinationLocation?.name ??
              movement.originLocation?.name ??
              "Almacén Central"}
          </p>
          {movement.order && (
            <span className="text-[11px] text-blue-600 font-medium block">
              Orden: #{movement.order.orderNumber} (
              {movement.order.supplier?.name})
            </span>
          )}
        </div>
      </div>

      {/* Notas y Justificación */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Justificación / Notas del Asiento
        </span>
        <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono">
          {movement.notes || "Sin observaciones registradas."}
        </p>
      </div>

      {/* Renglones Afectados */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 bg-slate-50/70">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="w-4 h-4 text-blue-600" />
            Renglones e Insumos Afectados
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="py-3 px-4 text-left">SKU</th>
                <th className="py-3 px-4 text-left">Insumo / Reactivo</th>
                <th className="py-3 px-4 text-left">Lote</th>
                <th className="py-3 px-4 text-left">Vencimiento</th>
                <th className="py-3 px-4 text-right">Cantidad Afectada</th>
                <th className="py-3 px-4 text-right">Costo Registrado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movement.items?.map((item) => {
                const isPositive = Number(item.quantity) > 0;
                return (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {item.batch?.product?.sku || "---"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {item.batch?.product?.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.batch?.product?.category?.name}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {item.batch?.lotNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {item.batch?.expirationDate
                        ? new Date(
                            item.batch.expirationDate,
                          ).toLocaleDateString()
                        : "N/A"}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono font-bold ${
                        isPositive ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {isPositive ? `+${item.quantity}` : item.quantity}{" "}
                      <span className="text-[10px] font-normal text-slate-500">
                        {item.batch?.product?.baseUnit?.abbreviation}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700">
                      ${Number(item.unitCost ?? 0).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
