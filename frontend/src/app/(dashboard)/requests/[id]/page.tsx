"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { RequestClientService } from "@/services/request.service";
import type { InternalRequest, RequestStatus } from "@/types/requests";
import {
  ArrowLeft,
  Calendar,
  User,
  Building,
  Printer,
  Loader2,
  Package,
} from "lucide-react";

const STATUS_CONFIG: Record<
  RequestStatus,
  { label: string; className: string }
> = {
  PENDIENTE: {
    label: "Pendiente",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  APROBADA: {
    label: "Aprobada",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  DESPACHADA_PARCIAL: {
    label: "Despacho parcial",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  COMPLETADA: {
    label: "Completada",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  RECHAZADA: {
    label: "Rechazada",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const requestId = Array.isArray(rawId) ? rawId[0] : (rawId as string);

  const [request, setRequest] = useState<InternalRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!requestId) return;

    startTransition(() => {
      void (async () => {
        try {
          const data = await RequestClientService.getRequestById(requestId);
          setRequest(data);
        } catch (err) {
          console.error("Error cargando detalle de solicitud", err);
        } finally {
          setLoading(false);
        }
      })();
    });
  }, [requestId]);

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <span className="text-xs text-slate-500 font-medium">
          Cargando comprobante de requisición...
        </span>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-lg font-bold text-slate-900">
          Solicitud no encontrada
        </h2>
        <button
          type="button"
          onClick={() => router.push("/requests")}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs bg-slate-900 text-white rounded-lg cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a solicitudes
        </button>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[request.status] || {
    label: request.status,
    className: "bg-slate-50 text-slate-700",
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/requests")}
            className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Volver"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                {request.requestNumber}
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusConfig.className}`}
              >
                {statusConfig.label}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              Requisición Interna de Materiales
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5" /> Imprimir Comprobante
        </button>
      </div>

      {/* Datos Generales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            Departamento / Sección
          </div>
          <p className="text-sm font-bold text-slate-900">
            {request.departmentSection}
          </p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <User className="w-3.5 h-3.5 text-slate-400" />
            Solicitante
          </div>
          <p className="text-sm font-bold text-slate-900">
            {request.applicant?.fullName || request.applicant?.username}
          </p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Fecha de Solicitud
          </div>
          <p className="text-sm font-bold text-slate-900 font-mono">
            {new Date(request.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Justificación */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Justificación Técnica / Protocolo
        </span>
        <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
          {request.justification}
        </p>
      </div>

      {/* Renglones Solicitados */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-100 bg-slate-50/70">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" />
            Renglones de Materiales Solicitados ({request.items.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Insumo / Reactivo</th>
                <th className="py-3 px-4 text-right">Cant. Solicitada</th>
                <th className="py-3 px-4 text-right">Cant. Aprobada</th>
                <th className="py-3 px-4 text-right">Cant. Despachada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {request.items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">
                    {item.product?.sku}
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {item.product?.name}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                    {item.requestedQuantity} {item.product?.unitOfMeasure}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-blue-700 font-semibold">
                    {item.quantityApproved ?? "-"} {item.product?.unitOfMeasure}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-700 font-bold">
                    {item.quantityDispatched ?? 0} {item.product?.unitOfMeasure}
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
