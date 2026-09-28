"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { PurchasingClientService } from "@/services/purchasing.service";
import { AuthService } from "@/services/auth.service";
import type { SupplierDetail } from "@/types/purchasing";
import axios from "axios";
import {
  Building2,
  ArrowLeft,
  Pencil,
  Phone,
  Mail,
  MapPin,
  User,
  Calendar,
  FileText,
  DollarSign,
  Package,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supplierId = params?.id as string;

  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Editar
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    rifOrId: "",
    name: "",
    contactName: "",
    phone: "",
    email: "",
    address: "",
    isActive: true,
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editFeedback, setEditFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  const loadSupplier = useCallback(async () => {
    if (!supplierId) return;
    try {
      const data = await PurchasingClientService.getSupplierById(supplierId);
      setSupplier(data);
      setEditForm({
        rifOrId: data.rifOrId || data.rif || "",
        name: data.name,
        contactName: data.contactName || "",
        phone: data.phone || "",
        email: data.email || "",
        address: data.address || "",
        isActive: data.isActive !== false,
      });
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : err instanceof Error
            ? err.message
            : "No se pudo cargar la información del proveedor.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    let isMounted = true;

    if (!AuthService.isAuthenticated()) {
      router.replace("/login");
      return;
    }

    if (!supplierId) return;

    PurchasingClientService.getSupplierById(supplierId)
      .then((data) => {
        if (!isMounted) return;
        setSupplier(data);
        setEditForm({
          rifOrId: data.rifOrId || data.rif || "",
          name: data.name,
          contactName: data.contactName || "",
          phone: data.phone || "",
          email: data.email || "",
          address: data.address || "",
          isActive: data.isActive !== false,
        });
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const msg =
          axios.isAxiosError(err) && err.response?.data?.message
            ? err.response.data.message
            : err instanceof Error
              ? err.message
              : "No se pudo cargar la información del proveedor.";
        setError(msg);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [supplierId, router]);

  const handleUpdateSupplier = async (e: FormEvent) => {
    e.preventDefault();
    if (!supplier) return;
    setEditFeedback(null);

    if (!editForm.rifOrId.trim() || !editForm.name.trim()) {
      setEditFeedback({
        status: "error",
        message: "El RIF/ID y la Razón Social son obligatorios.",
      });
      return;
    }

    setEditSubmitting(true);
    try {
      await PurchasingClientService.updateSupplier(supplier.id, {
        rifOrId: editForm.rifOrId.trim(),
        name: editForm.name.trim(),
        contactName: editForm.contactName.trim() || null,
        phone: editForm.phone.trim() || null,
        email: editForm.email.trim() || null,
        address: editForm.address.trim() || null,
        isActive: editForm.isActive,
      });

      setEditFeedback({
        status: "success",
        message: "Ficha del proveedor actualizada correctamente.",
      });
      await loadSupplier();

      setTimeout(() => {
        setIsEditModalOpen(false);
        setEditFeedback(null);
      }, 1000);
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : err instanceof Error
            ? err.message
            : "Error al actualizar el proveedor.";
      setEditFeedback({ status: "error", message: msg });
    } finally {
      setEditSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600">
          Cargando ficha técnica del proveedor...
        </p>
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => router.push("/purchasing/suppliers")}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Directorio de Proveedores
        </button>

        <div className="bg-white rounded-xl border border-red-200 p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Proveedor No Encontrado
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {error || "El registro solicitado no existe en la base de datos."}
            </p>
          </div>
          <button
            onClick={() => router.push("/purchasing/suppliers")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Regresar al Listado
          </button>
        </div>
      </div>
    );
  }

  const orders = supplier.orders ?? [];
  const totalOrders = supplier._count?.orders ?? orders.length;
  const totalPurchasedUsd = orders.reduce((sum, ord) => {
    const val = Number(ord.totalAmountUsd ?? ord.total ?? 0);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Botón Volver y Barra Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/purchasing/suppliers")}
            className="p-2 border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors shadow-2xs cursor-pointer"
            title="Volver al Directorio"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900">
                {supplier.name}
              </h1>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                {supplier.rifOrId || supplier.rif || "SIN RIF"}
              </span>
              {supplier.isActive !== false ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Activo
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Inactivo
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Ficha Técnica Institucional y Resumen Histórico de Órdenes de Compra
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Pencil className="w-4 h-4" />
            Editar Proveedor
          </button>
        </div>
      </div>

      {/* Resumen en Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Órdenes Emitidas
            </p>
            <p className="text-xl font-bold text-slate-800">{totalOrders}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Volumen Compras (USD)
            </p>
            <p className="text-xl font-bold text-slate-800 font-mono">
              ${totalPurchasedUsd.toLocaleString("es-VE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Estado Operativo
            </p>
            <p className="text-sm font-bold text-slate-800">
              {supplier.isActive !== false ? "Habilitado para Compras" : "Inhabilitado (Solo Historial)"}
            </p>
          </div>
        </div>
      </div>

      {/* Ficha Técnica del Proveedor */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
          <Building2 className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-slate-800 text-sm">
            Ficha de Contacto y Datos Fiscales
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Razón Social / Comercial
            </span>
            <p className="font-semibold text-slate-800 text-sm">
              {supplier.name}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              RIF / Identificación Fiscal
            </span>
            <p className="font-mono font-bold text-slate-800 text-sm">
              {supplier.rifOrId || supplier.rif || "No registrado"}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Representante / Persona de Contacto
            </span>
            <p className="flex items-center gap-1.5 text-slate-700">
              <User className="w-3.5 h-3.5 text-slate-400" />
              {supplier.contactName || "No especificado"}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Teléfono de Contacto
            </span>
            <p className="flex items-center gap-1.5 text-slate-700">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              {supplier.phone ? (
                <a
                  href={`tel:${supplier.phone}`}
                  className="hover:text-blue-600 hover:underline"
                >
                  {supplier.phone}
                </a>
              ) : (
                "No registrado"
              )}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Correo Electrónico
            </span>
            <p className="flex items-center gap-1.5 text-slate-700">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              {supplier.email ? (
                <a
                  href={`mailto:${supplier.email}`}
                  className="hover:text-blue-600 hover:underline"
                >
                  {supplier.email}
                </a>
              ) : (
                "No registrado"
              )}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Fecha de Registro en ERP
            </span>
            <p className="flex items-center gap-1.5 text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {supplier.createdAt
                ? new Date(supplier.createdAt).toLocaleDateString("es-VE", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                : "Fecha no disponible"}
            </p>
          </div>

          <div className="md:col-span-3 space-y-1 border-t border-slate-100 pt-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Dirección Fiscal / Despacho
            </span>
            <p className="flex items-start gap-1.5 text-slate-700">
              <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
              <span>{supplier.address || "Dirección no registrada"}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Sub-tabla: Órdenes de Compra Asociadas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-slate-800 text-sm">
              Órdenes de Compra Institucionales (Historial Reciente)
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {orders.length} {orders.length === 1 ? "orden" : "órdenes"} en historial
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-4">N° de Orden</th>
                <th className="py-3 px-4">Fecha de Emisión</th>
                <th className="py-3 px-4 text-center">Estado de Orden</th>
                <th className="py-3 px-4 text-center">Recepción Almacén</th>
                <th className="py-3 px-4 text-center">Estado de Pago</th>
                <th className="py-3 px-4 text-right">Monto Total</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No se han registrado órdenes de compra para este proveedor.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr
                    key={ord.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {ord.orderNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {ord.createdAt
                        ? new Date(ord.createdAt).toLocaleDateString("es-VE", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })
                        : "-"}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          ord.status === "COMPLETADA"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : ord.status === "CANCELADA"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : ord.status === "APROBADA"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          ord.receptionStatus === "COMPLETO"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : ord.receptionStatus === "PARCIAL"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-slate-50 text-slate-600 border-slate-200"
                        }`}
                      >
                        {ord.receptionStatus || "PENDIENTE"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                          ord.paymentStatus === "PAGADO"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : ord.paymentStatus === "PARCIAL" ||
                                ord.paymentStatus === "PAGADO_PARCIAL"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-red-50 text-red-700 border-red-200"
                        }`}
                      >
                        {ord.paymentStatus || "PENDIENTE"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                      ${Number(ord.totalAmountUsd ?? ord.total ?? 0).toLocaleString("es-VE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => router.push(`/purchasing/orders/${ord.id}`)}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium hover:underline cursor-pointer"
                        title="Ver detalle de orden"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Ver Orden
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Editar Proveedor */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-800 text-base">
                  Editar Proveedor Comercial
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editFeedback && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                  editFeedback.status === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                {editFeedback.status === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                )}
                <span>{editFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleUpdateSupplier} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    RIF / ID Fiscal *
                  </label>
                  <input
                    type="text"
                    value={editForm.rifOrId}
                    onChange={(e) =>
                      setEditForm({ ...editForm, rifOrId: e.target.value })
                    }
                    placeholder="J-12345678-9"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-amber-500 font-mono"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Razón Social *
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    placeholder="Nombre comercial o empresa"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Persona de Contacto
                  </label>
                  <input
                    type="text"
                    value={editForm.contactName}
                    onChange={(e) =>
                      setEditForm({ ...editForm, contactName: e.target.value })
                    }
                    placeholder="Representante"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm({ ...editForm, phone: e.target.value })
                    }
                    placeholder="0212-... / 0414-..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  placeholder="contacto@proveedor.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Dirección Fiscal o Almacén
                </label>
                <textarea
                  rows={2}
                  value={editForm.address}
                  onChange={(e) =>
                    setEditForm({ ...editForm, address: e.target.value })
                  }
                  placeholder="Ubicación..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) =>
                      setEditForm({ ...editForm, isActive: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-slate-700">
                    Proveedor Activo en el Catálogo de Compras
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {editSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editSubmitting ? "Guardando..." : "Actualizar Proveedor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
