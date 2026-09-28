"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { RequestClientService } from "@/services/request.service";
import { AuthService } from "@/services/auth.service";
import type { InternalRequest, RequestStatus } from "@/types/requests";
import type { AuthUser } from "@/types/auth";
import {
  PrintableDocument,
  DocumentHeader,
  DocumentMetadataGrid,
  DocumentSignatures,
  DocumentFooter,
  PrintActionButton,
} from "@/components/common/PrintableDocument";
import {
  ArrowLeft,
  Loader2,
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

  const formattedDate = new Date(request.createdAt).toLocaleDateString(
    "es-VE",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto print:p-0 print:m-0 print:max-w-none">
      {/* Barra de Acciones Superior (Oculta al imprimir) */}
      <div className="no-print print:hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-200">
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

        <div className="flex items-center gap-2 flex-wrap">
          {/* Acciones de Almacén / Administración */}
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

          <PrintActionButton label="Imprimir / Exportar PDF" />
        </div>
      </div>

      {feedback && (
        <div
          className={`no-print print:hidden p-3 rounded-lg text-xs flex items-center gap-2 border ${
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

      {/* DOCUMENTO IMPRIMIBLE FORMAL INSTITUCIONAL */}
      <PrintableDocument>
        {/* Membrete Superior */}
        <DocumentHeader
          title="COMPROBANTE DE REQUISICIÓN Y DESPACHO INTERNO"
          subtitle="Instituto de Inmunología Clínica · ERP-IDI"
          documentNumber={request.requestNumber}
          badge="COMPROBANTE OFICIAL"
          status={{
            label: statusConfig.label,
            className: statusConfig.className,
          }}
          date={formattedDate}
        />

        {/* Metadatos Formales */}
        <DocumentMetadataGrid
          columns={3}
          items={[
            {
              label: "Departamento / Área Solicitante",
              value: request.departmentSection,
            },
            {
              label: "Solicitante",
              value: request.applicant?.fullName || request.applicant?.username,
            },
            {
              label: "Fecha de Emisión",
              value: formattedDate,
            },
            {
              label: "Prioridad",
              value: (
                <span className="font-bold text-slate-800 print:text-black">
                  {request.priority || "RUTINA"}
                </span>
              ),
            },
            {
              label: "Estado de Solicitud",
              value: (
                <span className="font-semibold">{statusConfig.label}</span>
              ),
            },
            {
              label: "N° Movimiento Salida / Kardex",
              value:
                request.dispatchedMovement?.referenceNumber ||
                (request.status === "COMPLETADA" ||
                request.status === "DESPACHADA_PARCIAL"
                  ? "Despacho Registrado"
                  : "Pendiente por Despachar"),
            },
            {
              label: "Justificación Técnica / Protocolo Clínico",
              value: request.justification,
              colSpan: 3,
            },
          ]}
        />

        {/* Tabla de Renglones Formal */}
        <div className="space-y-2">
          <div className="flex justify-between items-center pb-1">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider print:text-black">
              Renglones de Materiales y Reactivos ({request.items.length})
            </h3>
            <span className="text-[10px] text-slate-500 font-mono print:text-black">
              Control de Entregas y Lotes
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-300 rounded-lg print:border-black print:rounded-none">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-300 print:bg-slate-200 print:text-black print:border-black font-bold text-[11px]">
                <tr>
                  <th className="py-2 px-2.5 w-10 text-center border-r border-slate-300 print:border-black">
                    #
                  </th>
                  <th className="py-2 px-3 border-r border-slate-300 print:border-black">
                    Insumo / Reactivo
                  </th>
                  <th className="py-2 px-2.5 text-center border-r border-slate-300 print:border-black">
                    SKU
                  </th>
                  <th className="py-2 px-2.5 text-center border-r border-slate-300 print:border-black">
                    Unidad
                  </th>
                  <th className="py-2 px-2.5 text-right border-r border-slate-300 print:border-black">
                    Cant. Solicitada
                  </th>
                  <th className="py-2 px-2.5 text-right border-r border-slate-300 print:border-black">
                    Cant. Aprobada
                  </th>
                  <th className="py-2 px-2.5 text-right border-r border-slate-300 print:border-black">
                    Cant. Despachada
                  </th>
                  <th className="py-2 px-3">
                    Lotes Asignados (Vencimiento)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 print:divide-black">
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

                  const unit =
                    item.product?.unitOfMeasure ||
                    item.product?.baseUnit?.abbreviation ||
                    "UND";

                  // Extraer lotes asignados desde item.batch o desde dispatchedMovement.items
                  const assignedBatches: Array<{
                    lotNumber: string;
                    expirationDate?: string | null;
                    quantity?: number;
                  }> = [];

                  if (item.batch?.lotNumber) {
                    assignedBatches.push({
                      lotNumber: item.batch.lotNumber,
                      expirationDate: item.batch.expirationDate,
                      quantity: validDispatched || validApproved,
                    });
                  }

                  if (request.dispatchedMovement?.items?.length) {
                    const matched = request.dispatchedMovement.items.filter(
                      (m) =>
                        m.batch &&
                        (Number(m.batch.productId) === Number(item.productId) ||
                          Number(m.batch.id) === Number(item.batchId))
                    );
                    for (const m of matched) {
                      if (
                        m.batch &&
                        !assignedBatches.some(
                          (b) => b.lotNumber === m.batch!.lotNumber
                        )
                      ) {
                        assignedBatches.push({
                          lotNumber: m.batch.lotNumber,
                          expirationDate: m.batch.expirationDate,
                          quantity: Math.abs(Number(m.quantity || 0)),
                        });
                      }
                    }
                  }

                  return (
                    <tr
                      key={item.id ?? index}
                      className="break-inside-avoid hover:bg-slate-50/70"
                    >
                      <td className="py-2 px-2.5 text-center font-mono text-slate-600 print:text-black border-r border-slate-200 print:border-black font-semibold">
                        {index + 1}
                      </td>
                      <td className="py-2 px-3 border-r border-slate-200 print:border-black">
                        <div className="font-bold text-slate-900 print:text-black">
                          {item.product?.name || "Insumo sin nombre"}
                        </div>
                      </td>
                      <td className="py-2 px-2.5 text-center font-mono text-[11px] text-slate-600 print:text-black border-r border-slate-200 print:border-black">
                        {item.product?.sku || "-"}
                      </td>
                      <td className="py-2 px-2.5 text-center text-slate-700 print:text-black border-r border-slate-200 print:border-black uppercase">
                        {unit}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-semibold text-slate-900 print:text-black border-r border-slate-200 print:border-black">
                        {validRequested}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-semibold text-blue-900 print:text-black border-r border-slate-200 print:border-black">
                        {validApproved}
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900 print:text-black border-r border-slate-200 print:border-black">
                        {validDispatched}
                      </td>
                      <td className="py-2 px-3 text-[11px]">
                        {assignedBatches.length > 0 ? (
                          <div className="space-y-1">
                            {assignedBatches.map((b, bIdx) => (
                              <div
                                key={bIdx}
                                className="font-mono text-[11px] text-slate-800 print:text-black"
                              >
                                <span className="font-bold">
                                  Lote: {b.lotNumber}
                                </span>
                                {b.expirationDate && (
                                  <span className="text-slate-600 print:text-black">
                                    {" "}
                                    (Vence:{" "}
                                    {new Date(
                                      b.expirationDate
                                    ).toLocaleDateString("es-VE")}
                                    )
                                  </span>
                                )}
                                {b.quantity != null && b.quantity > 0 && (
                                  <span className="text-slate-500 print:text-slate-700 ml-1">
                                    [{b.quantity} {unit}]
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : validDispatched > 0 ? (
                          <span className="text-slate-600 font-mono italic print:text-black">
                            Lote registrado en despacho
                          </span>
                        ) : (
                          <span className="text-slate-400 italic print:text-slate-500">
                            Pendiente por asignación de lote
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sección Inferior de 3 Casillas de Firmas */}
        <DocumentSignatures
          signatures={[
            {
              role: "Solicitado por: Nombre y Firma",
              name: request.applicant?.fullName || request.applicant?.username,
              department:
                request.applicant?.department ||
                request.departmentSection ||
                "Unidad Solicitante",
              stampText: "Firma y Sello Solicitante",
              date: formattedDate.split(",")[0],
            },
            {
              role: "Despachado por (Almacén): Nombre y Firma",
              name:
                request.approvedBy?.fullName || "Responsable de Almacén",
              department: "Almacén Central / Despacho de Materiales",
              stampText: "Firma y Sello Almacén",
            },
            {
              role: "Recibido Conforme: Nombre y Firma",
              name: "Recepción de Material",
              department: "Firma, Cédula y Fecha de Recepción",
              stampText: "Firma Conforme y Huella",
            },
          ]}
        />

        {/* Pie Institucional */}
        <DocumentFooter
          notes="Este comprobante certifica la solicitud, aprobación y entrega física de los insumos y reactivos descritos para su uso exclusivo en labores científicas, diagnósticas o administrativas de la institución."
          institutionText="INMUNOLOGIA ASOCIACION CIVIL · RIF: J-30710739-1"
          systemSignature={`ERP-IDI v2.0 · Requisición ${request.requestNumber}`}
        />
      </PrintableDocument>
    </div>
  );
}
