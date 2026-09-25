"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { RequestClientService } from "@/services/request.service";
import { AuthService } from "@/services/auth.service";
import type { InternalRequest, RequestStatus } from "@/types/requests";
import type { AuthUser } from "@/types/auth";
import {
  ArrowLeft,
  Calendar,
  User,
  Building,
  Printer,
  Loader2,
  Package,
  Check,
  CheckCheck,
  Ban,
  AlertCircle,
  CheckCircle2,
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
    label: "Aprobada (En espera / Standby)",
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

  const [currentUser] = useState<AuthUser | null>(() =>
    AuthService.getCurrentUser()
  );
  const [request, setRequest] = useState<InternalRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);
  const [, startTransition] = useTransition();

  const userRoles = currentUser?.roles || [];
  const isWarehouseStaff =
    userRoles.includes("ADMINISTRADOR") || userRoles.includes("ALMACENISTA");

  const loadDetail = (id: string) => {
    startTransition(() => {
      void (async () => {
        try {
          const data = await RequestClientService.getRequestById(id);
          setRequest(data);
        } catch (err) {
          console.error("Error cargando detalle de solicitud", err);
        } finally {
          setLoading(false);
        }
      })();
    });
  };

  useEffect(() => {
    if (!requestId) return;
    loadDetail(requestId);
  }, [requestId]);

  const handleApprove = async () => {
    if (!request || !isWarehouseStaff) return;
    setActionLoading(true);
    setFeedback(null);
    try {
      const itemsToApprove = request.items.map((it) => ({
        itemId: Number(it.id),
        quantityApproved: Number(
          it.quantityRequested ?? it.requestedQuantity ?? 1
        ),
      }));

      await RequestClientService.approveRequest(request.id, itemsToApprove);
      setFeedback({
        status: "success",
        message: "Solicitud aprobada con éxito. Ya puede ser despachada.",
      });
      loadDetail(String(request.id));
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message:
          err instanceof Error ? err.message : "Error al aprobar la solicitud.",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!request || !isWarehouseStaff) return;
    const reason = window.prompt("Ingrese el motivo de rechazo:");
    if (!reason || reason.trim().length < 5) {
      if (reason !== null) {
        alert("El motivo debe tener al menos 5 caracteres.");
      }
      return;
    }

    setActionLoading(true);
    setFeedback(null);
    try {
      await RequestClientService.rejectRequest(request.id, reason.trim());
      setFeedback({
        status: "success",
        message: "Solicitud rechazada formalmente.",
      });
      loadDetail(String(request.id));
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message:
          err instanceof Error ? err.message : "Error al rechazar solicitud.",
      });
    } finally {
      setActionLoading(false);
    }
  };

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

  const canDispatch =
    request.status === "APROBADA" || request.status === "DESPACHADA_PARCIAL";

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

        <div className="flex items-center gap-2">
          {/* ACCIONES EXCLUSIVAS DE ALMACÉN / ADMINISTRACIÓN */}
          {isWarehouseStaff && (
            <>
              {request.status === "PENDIENTE" && (
                <>
                  <button
                    type="button"
                    onClick={() => void handleApprove()}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors cursor-pointer"
                  >
                    {actionLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCheck className="w-3.5 h-3.5" />
                    )}
                    Aprobar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleReject()}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Rechazar
                  </button>
                </>
              )}

              {canDispatch && (
                <button
                  type="button"
                  onClick={() => router.push(`/requests?dispatch=${request.id}`)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 shadow-xs transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Despachar
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Imprimir Comprobante
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
            feedback.status === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {feedback.status === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

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
                <th className="py-3 px-4 w-16 text-center font-semibold">N° / Ítem</th>
                <th className="py-3 px-4 font-semibold">Insumo / Reactivo</th>
                <th className="py-3 px-4 text-right font-semibold">Cantidad Solicitada</th>
                <th className="py-3 px-4 text-right font-semibold">Cantidad Aprobada</th>
                <th className="py-3 px-4 text-right font-semibold">Cantidad Despachada</th>
                <th className="py-3 px-4 text-right font-semibold">Saldo Pendiente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {request.items.map((item, index) => {
                const numRequested = Number(
                  item.requestedQuantity ?? item.quantityRequested ?? 0
                );
                const validRequested = Number.isFinite(numRequested)
                  ? numRequested
                  : 0;

                const numApproved = Number(item.quantityApproved ?? 0);
                const validApproved = Number.isFinite(numApproved)
                  ? numApproved
                  : 0;

                const numDispatched = Number(
                  item.quantityDispatched ?? item.dispatchedQuantity ?? 0
                );
                const validDispatched = Number.isFinite(numDispatched)
                  ? numDispatched
                  : 0;

                const pendingBalance = Math.max(0, validApproved - validDispatched);
                const unit =
                  item.product?.unitOfMeasure ||
                  item.product?.baseUnit?.abbreviation ||
                  "UND";

                return (
                  <tr
                    key={item.id ?? index}
                    className="hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="py-3 px-4 text-center font-mono text-slate-500 font-medium">
                      #{index + 1}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 text-xs">
                        {item.product?.name || "Insumo sin nombre"}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span>SKU: {item.product?.sku || "-"}</span>
                        {unit && (
                          <span className="text-slate-400">
                            • Unidad: {unit}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono font-bold text-slate-800 text-xs">
                        {validRequested}
                      </span>{" "}
                      <span className="text-slate-500 font-normal text-[11px]">{unit}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <span className="font-mono font-bold text-blue-800">{validApproved}</span>
                        <span className="text-blue-600 font-normal text-[11px]">{unit}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${
                          validDispatched > 0
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-slate-100 text-slate-500 border border-slate-200"
                        }`}
                      >
                        <span className="font-mono font-bold text-slate-800">{validDispatched}</span>
                        <span className="text-slate-500 font-normal text-[11px]">{unit}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold ${
                          pendingBalance > 0
                            ? "bg-amber-50 text-amber-800 border border-amber-300"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        <span className="font-mono font-bold text-slate-800">{pendingBalance}</span>
                        <span className="text-slate-600 font-normal text-[11px]">{unit}</span>
                      </span>
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
