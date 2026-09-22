"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { RequestClientService } from "@/services/request.service";
import { InventoryClientService } from "@/services/inventory.service";
import { AuthService } from "@/services/auth.service";
import type {
  InternalRequest,
  RequestStatus,
  RequestPriority,
} from "@/types/requests";
import type { Product, StockBatch } from "@/types/inventory";
import {
  ClipboardList,
  Plus,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Trash2,
  Loader2,
  Check,
  Ban,
  AlertTriangle,
  XCircle,
  Eye,
  CheckCheck,
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

const PRIORITY_BADGES: Record<
  RequestPriority,
  { label: string; className: string }
> = {
  BAJA: { label: "Baja", className: "bg-slate-100 text-slate-600" },
  RUTINA: { label: "Rutina", className: "bg-blue-50 text-blue-600" },
  URGENTE: {
    label: "Urgente",
    className: "bg-red-50 text-red-600 font-bold border border-red-200",
  },
};

const SECTIONS = [
  "Inmunogenética",
  "Inmunología Celular",
  "Inmunopatología",
  "Alergia e Inmunología Clínica",
  "Laboratorio General",
  "Investigación",
];

interface FormItem {
  productId: number;
  requestedQuantity: number;
}

export default function InternalRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<InternalRequest[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [availableBatches, setAvailableBatches] = useState<
    (StockBatch & {
      productId?: number;
      product: {
        id?: number;
        name: string;
        sku: string;
        unitOfMeasure: string;
      };
    })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Modal Nueva Solicitud
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [priority, setPriority] = useState<RequestPriority>("RUTINA");
  const [departmentSection, setDepartmentSection] = useState(SECTIONS[0]);
  const [justification, setJustification] = useState("");
  const [formItems, setFormItems] = useState<FormItem[]>([
    { productId: 0, requestedQuantity: 1 },
  ]);
  const [submitting, setSubmitting] = useState(false);

  // Modal Despacho (Almacén)
  const [selectedForDispatch, setSelectedForDispatch] =
    useState<InternalRequest | null>(null);
  const [dispatchItemAllocations, setDispatchItemAllocations] = useState<
    Record<number, { batchId: number; quantity: number | "" }>
  >({});
  const [dispatchNotes, setDispatchNotes] = useState("");
  const [dispatching, setDispatching] = useState(false);

  // Modal Rechazo
  const [requestToReject, setRequestToReject] =
    useState<InternalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Acción rápida Aprobar
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const [feedback, setFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [reqs, prods, batches] = await Promise.all([
        RequestClientService.getRequests(statusFilter || undefined).catch(
          () => [],
        ),
        InventoryClientService.getProducts().catch(() => []),
        InventoryClientService.getActiveBatches().catch(() => []),
      ]);
      setRequests(reqs);
      setProducts(prods);
      setAvailableBatches(batches);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    const init = async () => {
      if (!AuthService.isAuthenticated()) {
        router.replace("/login");
        return;
      }
      await loadData();
    };
    init();
  }, [router, loadData]);

  const handleAddItem = () => {
    setFormItems((prev) => [...prev, { productId: 0, requestedQuantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (formItems.length === 1) return;
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof FormItem,
    value: number,
  ) => {
    setFormItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmitRequest = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const hasInvalid = formItems.some(
      (it) => !it.productId || it.requestedQuantity <= 0,
    );
    if (hasInvalid || !justification.trim()) {
      setFeedback({
        status: "error",
        message: "Complete todos los datos y justificación técnica.",
      });
      return;
    }

    setSubmitting(true);
    try {
      await RequestClientService.createRequest({
        priority,
        departmentSection,
        justification: justification.trim(),
        items: formItems,
      });

      setFeedback({
        status: "success",
        message: "Solicitud enviada a almacén exitosamente.",
      });
      setIsNewModalOpen(false);
      setJustification("");
      setFormItems([{ productId: 0, requestedQuantity: 1 }]);
      await loadData();
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Error al registrar la solicitud.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (req: InternalRequest) => {
    setApprovingId(req.id);
    setFeedback(null);
    try {
      const itemsToApprove = req.items.map((it) => {
        // Soporta tanto quantityRequested (nombre de base de datos) como requestedQuantity
        const qty = Number(
          (it as unknown as { quantityRequested?: number }).quantityRequested ??
            it.requestedQuantity ??
            1,
        );

        return {
          itemId: Number(it.id),
          quantityApproved: qty,
        };
      });

      await RequestClientService.approveRequest(req.id, itemsToApprove);
      setFeedback({
        status: "success",
        message: `Solicitud #${req.requestNumber} aprobada con éxito. Lista para despacho.`,
      });
      await loadData();
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message:
          err instanceof Error ? err.message : "Error al aprobar la solicitud.",
      });
    } finally {
      setApprovingId(null);
    }
  };

  const handleOpenDispatch = (req: InternalRequest) => {
    setSelectedForDispatch(req);
    const initialMap: Record<
      number,
      { batchId: number; quantity: number | "" }
    > = {};
    req.items.forEach((it) => {
      if (it.id) {
        const pendingQuantity = Math.max(
          0,
          (it.quantityApproved && it.quantityApproved > 0
            ? it.quantityApproved
            : it.requestedQuantity) - (it.quantityDispatched ?? 0),
        );
        const matchBatch = availableBatches.find(
          (b) => (b.productId ?? b.product?.id) === it.productId,
        );
        initialMap[it.id] = {
          batchId: matchBatch ? matchBatch.id : 0,
          quantity: matchBatch
            ? Math.min(pendingQuantity, matchBatch.currentQuantity)
            : pendingQuantity,
        };
      }
    });
    setDispatchItemAllocations(initialMap);
    setDispatchNotes("");
    setFeedback(null);
  };

  const handleConfirmDispatch = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedForDispatch) return;
    setFeedback(null);

    const allocationsList = Object.entries(dispatchItemAllocations).map(
      ([itemIdStr, alloc]) => ({
        itemId: Number(itemIdStr),
        batchId: alloc.batchId,
        dispatchedQuantity: Number(alloc.quantity),
      }),
    );

    const missingBatch = allocationsList.some(
      (a) =>
        !a.batchId ||
        a.dispatchedQuantity <= 0 ||
        !Number.isFinite(a.dispatchedQuantity),
    );
    if (missingBatch) {
      setFeedback({
        status: "error",
        message: "Seleccione un lote válido con cantidad para cada renglón.",
      });
      return;
    }

    setDispatching(true);
    try {
      await RequestClientService.dispatchRequest({
        requestId: selectedForDispatch.id,
        items: allocationsList,
        dispatchNotes: dispatchNotes.trim() || undefined,
      });

      setFeedback({
        status: "success",
        message: "Insumos despachados y descontados del inventario.",
      });
      setSelectedForDispatch(null);
      await loadData();
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Error al despachar los insumos.",
      });
    } finally {
      setDispatching(false);
    }
  };

  const handleReject = async () => {
    if (!requestToReject || rejectReason.trim().length < 5) {
      setFeedback({
        status: "error",
        message: "El motivo de rechazo debe tener al menos 5 caracteres.",
      });
      return;
    }
    setRejecting(true);
    try {
      await RequestClientService.rejectRequest(
        requestToReject.id,
        rejectReason.trim(),
      );
      setFeedback({
        status: "success",
        message: `Solicitud #${requestToReject.requestNumber} rechazada.`,
      });
      setRequestToReject(null);
      setRejectReason("");
      await loadData();
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message: err instanceof Error ? err.message : "Error al rechazar",
      });
    } finally {
      setRejecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-blue-600" />
            Solicitudes Internas de Material y Reactivos
          </h1>
          <p className="text-xs text-slate-500">
            Requisiciones desde áreas diagnósticas y despacho controlado por
            almacén
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsNewModalOpen(true);
            setFeedback(null);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nueva Solicitud
        </button>
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

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los estados</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="APROBADA">Aprobadas</option>
            <option value="DESPACHADA_PARCIAL">Despacho parcial</option>
            <option value="COMPLETADA">Completadas</option>
            <option value="RECHAZADA">Rechazadas</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors shadow-2xs cursor-pointer"
          title="Actualizar listado"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Tabla de Requisiciones */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">N° Solicitud</th>
                <th className="py-3 px-4">Área / Sección</th>
                <th className="py-3 px-4">Solicitante</th>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4 text-center">Prioridad</th>
                <th className="py-3 px-4 text-center">Renglones</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    Cargando requisiciones internas...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No se encontraron solicitudes registradas.
                  </td>
                </tr>
              ) : (
                requests.map((req) => {
                  const status = STATUS_CONFIG[req.status] || {
                    label: req.status,
                    className: "bg-slate-50 text-slate-700",
                  };
                  const priorityMeta = PRIORITY_BADGES[req.priority] || {
                    label: req.priority,
                    className: "bg-slate-100 text-slate-600",
                  };

                  const canDispatch =
                    req.status === "PENDIENTE" ||
                    req.status === "APROBADA" ||
                    req.status === "DESPACHADA_PARCIAL";

                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {req.requestNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {req.departmentSection}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {req.applicant?.fullName || req.applicant?.username}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] ${priorityMeta.className}`}
                        >
                          {priorityMeta.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">
                        {req.items?.length || 0}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Botón Ver Ficha / Comprobante */}
                          <button
                            type="button"
                            onClick={() => router.push(`/requests/${req.id}`)}
                            className="inline-flex items-center p-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 cursor-pointer"
                            title="Ver detalles del comprobante"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Botón Aprobar si está pendiente */}
                          {req.status === "PENDIENTE" && (
                            <button
                              type="button"
                              onClick={() => void handleApprove(req)}
                              disabled={approvingId === req.id}
                              className="inline-flex items-center gap-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                              title="Aprobar solicitud"
                            >
                              {approvingId === req.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCheck className="w-3.5 h-3.5" />
                              )}
                              Aprobar
                            </button>
                          )}

                          {/* Botón Despachar */}
                          {canDispatch && (
                            <button
                              type="button"
                              onClick={() => handleOpenDispatch(req)}
                              className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer"
                              title="Despachar materiales"
                            >
                              <Check className="w-3.5 h-3.5" /> Despachar
                            </button>
                          )}

                          {/* Botón Rechazar */}
                          {req.status === "PENDIENTE" && (
                            <button
                              type="button"
                              onClick={() => {
                                setRequestToReject(req);
                                setRejectReason("");
                                setFeedback(null);
                              }}
                              className="inline-flex items-center bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 p-1 rounded transition-colors cursor-pointer"
                              title="Rechazar solicitud"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Nueva Solicitud (Laboratorio) */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-base">
                  Crear Requisición Interna
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Área Solicitante
                  </label>
                  <select
                    value={departmentSection}
                    onChange={(e) => setDepartmentSection(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                  >
                    {SECTIONS.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Prioridad
                  </label>
                  <select
                    value={priority}
                    onChange={(e) =>
                      setPriority(e.target.value as RequestPriority)
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value="BAJA">Baja</option>
                    <option value="RUTINA">Rutina (Normal)</option>
                    <option value="URGENTE">Urgente (Sin existencias)</option>
                  </select>
                </div>
              </div>

              {/* Renglones Solicitados */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Materiales Requeridos
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar renglón
                  </button>
                </div>

                {formItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200"
                  >
                    <div className="col-span-8">
                      <select
                        value={item.productId}
                        onChange={(e) =>
                          handleItemChange(
                            idx,
                            "productId",
                            Number(e.target.value),
                          )
                        }
                        className="w-full bg-white border border-slate-300 rounded-md px-2 py-1.5 text-xs text-slate-800"
                        required
                      >
                        <option value="0">
                          -- Seleccionar Insumo/Reactivo --
                        </option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-3">
                      <input
                        type="number"
                        min="1"
                        placeholder="Cant."
                        value={item.requestedQuantity}
                        onChange={(e) =>
                          handleItemChange(
                            idx,
                            "requestedQuantity",
                            Number(e.target.value),
                          )
                        }
                        className="w-full bg-white border border-slate-300 rounded-md px-2 py-1.5 text-xs text-slate-800"
                        required
                      />
                    </div>

                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={formItems.length === 1}
                        className="text-slate-400 hover:text-red-500 disabled:opacity-30 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Justificación de Uso / Protocolo
                </label>
                <textarea
                  rows={2}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Explique el destino analítico o motivo del pedido..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? "Enviando..." : "Enviar Solicitud"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Despacho y Asignación de Lotes (Almacén) */}
      {selectedForDispatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  Despachar Requisición #{selectedForDispatch.requestNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedForDispatch.departmentSection} • Solicitado por:{" "}
                  {selectedForDispatch.applicant?.fullName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedForDispatch(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDispatch} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs">
                <div>
                  <span className="block text-[10px] uppercase text-slate-500">
                    Área solicitante
                  </span>
                  <strong className="text-slate-800">
                    {selectedForDispatch.departmentSection}
                  </strong>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-slate-500">
                    Solicitante
                  </span>
                  <strong className="text-slate-800">
                    {selectedForDispatch.applicant?.fullName ||
                      selectedForDispatch.applicant?.username}
                  </strong>
                </div>
                <div>
                  <span className="block text-[10px] uppercase text-slate-500">
                    Prioridad
                  </span>
                  <span
                    className={`inline-block px-2 py-0.5 rounded font-semibold ${PRIORITY_BADGES[selectedForDispatch.priority]?.className}`}
                  >
                    {PRIORITY_BADGES[selectedForDispatch.priority]?.label ||
                      selectedForDispatch.priority}
                  </span>
                </div>
                <div className="sm:col-span-3 border-t border-blue-100 pt-2">
                  <span className="block text-[10px] uppercase text-slate-500">
                    Justificación
                  </span>
                  <p className="text-slate-700">
                    {selectedForDispatch.justification ||
                      "Sin justificación registrada"}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
                  Asignación de Lotes Físicos a Despachar
                </span>

                {selectedForDispatch.items.map((it) => {
                  const itId = it.id as number;
                  const pendingQuantity = Math.max(
                    0,
                    (it.quantityApproved && it.quantityApproved > 0
                      ? it.quantityApproved
                      : it.requestedQuantity) - (it.quantityDispatched ?? 0),
                  );
                  const candidateBatches = availableBatches.filter(
                    (b) => (b.productId ?? b.product?.id) === it.productId,
                  );
                  const currentAlloc = dispatchItemAllocations[itId] || {
                    batchId: 0,
                    quantity: pendingQuantity,
                  };

                  return (
                    <div
                      key={itId}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800">
                          {it.product?.name} ({it.product?.sku})
                        </span>
                        <span className="text-slate-500">
                          Solicitado:{" "}
                          <b>
                            {it.requestedQuantity} {it.product?.unitOfMeasure}
                          </b>
                        </span>
                        <span className="text-blue-700">
                          Pendiente:{" "}
                          <b>
                            {pendingQuantity} {it.product?.unitOfMeasure}
                          </b>
                        </span>
                      </div>

                      <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-8">
                          <label className="block text-[10px] text-slate-500 font-semibold mb-1">
                            Lote de Origen
                          </label>
                          <select
                            value={currentAlloc.batchId}
                            onChange={(e) =>
                              setDispatchItemAllocations((prev) => ({
                                ...prev,
                                [itId]: {
                                  ...prev[itId],
                                  batchId: Number(e.target.value),
                                  quantity: (() => {
                                    const selected = candidateBatches.find(
                                      (batch) =>
                                        batch.id === Number(e.target.value),
                                    );
                                    return selected
                                      ? Math.min(
                                          pendingQuantity,
                                          selected.currentQuantity,
                                        )
                                      : "";
                                  })(),
                                },
                              }))
                            }
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                            required
                          >
                            <option value="0">
                              -- Seleccione lote disponible --
                            </option>
                            {candidateBatches.map((b) => (
                              <option key={b.id} value={b.id}>
                                #{b.lotNumber} | Stock disp: {b.currentQuantity}{" "}
                                {it.product?.unitOfMeasure}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-4">
                          <label className="block text-[10px] text-slate-500 font-semibold mb-1">
                            Cant. a Entregar
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={currentAlloc.quantity ?? ""}
                            onChange={(e) =>
                              setDispatchItemAllocations((prev) => ({
                                ...prev,
                                [itId]: {
                                  ...prev[itId],
                                  quantity:
                                    e.target.value === ""
                                      ? ""
                                      : Number(e.target.value),
                                },
                              }))
                            }
                            className="w-full bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800 font-mono"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Notas de Despacho (Opcional)
                </label>
                <input
                  type="text"
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="N° acta de entrega o nombre de receptor en sala..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedForDispatch(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={dispatching}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {dispatching && <Loader2 className="w-4 h-4 animate-spin" />}
                  {dispatching ? "Despachando..." : "Confirmar y Despachar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Rechazo */}
      {requestToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h3 className="font-bold text-slate-800">
                  Rechazar requisición #{requestToReject.requestNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRequestToReject(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-xs text-red-800 flex gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>
                Indique el motivo de rechazo técnico o administrativo.
              </span>
            </div>
            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Indique el motivo técnico o administrativo..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-red-500"
              autoFocus
            />
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setRequestToReject(null)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleReject()}
                disabled={rejecting || rejectReason.trim().length < 5}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50 cursor-pointer"
              >
                {rejecting && <Loader2 className="w-4 h-4 animate-spin" />}
                {rejecting ? "Rechazando..." : "Confirmar Rechazo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
