"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PurchasingClientService } from "@/services/purchasing.service";
import { AuthService } from "@/services/auth.service";
import type { Supplier } from "@/types/purchasing";
import axios from "axios";
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  User,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
} from "lucide-react";

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAdmin] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      AuthService.getCurrentUser()?.roles?.includes("ADMINISTRADOR") ?? false
    );
  });

  // Modal: Crear Proveedor
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    rifOrId: "",
    name: "",
    contactName: "",
    phone: "",
    email: "",
    address: "",
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createFeedback, setCreateFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  // Modal: Editar Proveedor
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
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

  // Modal: Confirmar Eliminación
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  const loadSuppliers = useCallback(async () => {
    try {
      const data = await PurchasingClientService.getSuppliers();
      setSuppliers(data);
    } catch {
      // Manejado por interceptor global
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (!AuthService.isAuthenticated()) {
      router.replace("/login");
      return;
    }

    PurchasingClientService.getSuppliers()
      .then((data) => {
        if (isMounted) setSuppliers(data);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [router]);

  const filteredSuppliers = suppliers.filter((s) => {
    const term = search.toLowerCase();
    const rifValue = (s.rifOrId ?? s.rif ?? "").toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      rifValue.includes(term) ||
      (s.contactName && s.contactName.toLowerCase().includes(term))
    );
  });

  // Manejo de Creación
  const handleCreateSupplier = async (e: FormEvent) => {
    e.preventDefault();
    setCreateFeedback(null);

    if (!createForm.rifOrId.trim() || !createForm.name.trim()) {
      setCreateFeedback({
        status: "error",
        message: "El RIF/ID y la Razón Social son obligatorios.",
      });
      return;
    }

    setCreateSubmitting(true);
    try {
      await PurchasingClientService.createSupplier({
        rifOrId: createForm.rifOrId.trim(),
        name: createForm.name.trim(),
        contactName: createForm.contactName.trim() || undefined,
        phone: createForm.phone.trim() || undefined,
        email: createForm.email.trim() || undefined,
        address: createForm.address.trim() || undefined,
      });

      setCreateFeedback({
        status: "success",
        message: "Proveedor comercial registrado exitosamente.",
      });
      await loadSuppliers();

      setTimeout(() => {
        setIsCreateModalOpen(false);
        setCreateForm({
          rifOrId: "",
          name: "",
          contactName: "",
          phone: "",
          email: "",
          address: "",
        });
        setCreateFeedback(null);
      }, 1000);
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : err instanceof Error
            ? err.message
            : "Error al registrar el proveedor.";
      setCreateFeedback({ status: "error", message: msg });
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Abrir Modal de Edición
  const handleOpenEditModal = (sup: Supplier) => {
    setEditingSupplier(sup);
    setEditForm({
      rifOrId: sup.rifOrId || sup.rif || "",
      name: sup.name,
      contactName: sup.contactName || "",
      phone: sup.phone || "",
      email: sup.email || "",
      address: sup.address || "",
      isActive: sup.isActive !== false,
    });
    setEditFeedback(null);
  };

  // Manejo de Actualización
  const handleUpdateSupplier = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
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
      await PurchasingClientService.updateSupplier(editingSupplier.id, {
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
        message: "Datos del proveedor actualizados correctamente.",
      });
      await loadSuppliers();

      setTimeout(() => {
        setEditingSupplier(null);
        setEditFeedback(null);
      }, 1000);
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : err instanceof Error
            ? err.message
            : "Error al actualizar los datos del proveedor.";
      setEditFeedback({ status: "error", message: msg });
    } finally {
      setEditSubmitting(false);
    }
  };

  // Abrir Modal de Eliminación
  const handleOpenDeleteModal = (sup: Supplier) => {
    setDeletingSupplier(sup);
    setDeleteFeedback(null);
  };

  // Manejo de Eliminación con Protección Referencial
  const handleDeleteSupplier = async () => {
    if (!deletingSupplier) return;
    setDeleteSubmitting(true);
    setDeleteFeedback(null);

    try {
      await PurchasingClientService.deleteSupplier(deletingSupplier.id);
      setDeleteFeedback({
        status: "success",
        message: "Proveedor comercial eliminado exitosamente del catálogo.",
      });
      await loadSuppliers();

      setTimeout(() => {
        setDeletingSupplier(null);
        setDeleteFeedback(null);
      }, 1200);
    } catch (err: unknown) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : err instanceof Error
            ? err.message
            : "Error al intentar eliminar el proveedor.";
      setDeleteFeedback({
        status: "error",
        message: msg,
      });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            Directorio de Proveedores Comerciales
          </h1>
          <p className="text-xs text-slate-500">
            Registro, actualización y gestión técnica de proveedores y casas comerciales
          </p>
        </div>

        <button
          onClick={() => {
            setIsCreateModalOpen(true);
            setCreateFeedback(null);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Registrar Proveedor
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Buscar por RIF, Razón Social o Contacto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          onClick={() => void loadSuppliers()}
          className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors shadow-2xs cursor-pointer"
          title="Actualizar listado"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Tabla de Proveedores */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-3 px-4">RIF / ID Fiscal</th>
                <th className="py-3 px-4">Razón Social</th>
                <th className="py-3 px-4">Contacto Directo</th>
                <th className="py-3 px-4">Teléfono</th>
                <th className="py-3 px-4">Correo Electrónico</th>
                <th className="py-3 px-4">Dirección</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    Cargando directorio de proveedores...
                  </td>
                </tr>
              ) : filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No se encontraron proveedores registrados.
                  </td>
                </tr>
              ) : (
                filteredSuppliers.map((sup) => (
                  <tr
                    key={sup.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                      {sup.rifOrId || sup.rif || "-"}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      <button
                        onClick={() => router.push(`/purchasing/suppliers/${sup.id}`)}
                        className="text-left hover:text-blue-600 hover:underline cursor-pointer"
                      >
                        {sup.name}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {sup.contactName || "-"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {sup.phone || "-"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {sup.email || "-"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                      <span
                        className="flex items-center gap-1.5"
                        title={sup.address || ""}
                      >
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {sup.address || "-"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {sup.isActive !== false ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => router.push(`/purchasing/suppliers/${sup.id}`)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Ver Ficha Técnica y Órdenes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(sup)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="Editar Proveedor"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleOpenDeleteModal(sup)}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar Proveedor (Admin)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Registrar Proveedor */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-base">
                  Registrar Nuevo Proveedor
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createFeedback && (
              <div
                className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                  createFeedback.status === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                {createFeedback.status === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                )}
                <span>{createFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleCreateSupplier} className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    RIF / ID Fiscal *
                  </label>
                  <input
                    type="text"
                    value={createForm.rifOrId}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, rifOrId: e.target.value })
                    }
                    placeholder="J-12345678-9"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Razón Social *
                  </label>
                  <input
                    type="text"
                    value={createForm.name}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, name: e.target.value })
                    }
                    placeholder="Nombre comercial o empresa"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
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
                    value={createForm.contactName}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        contactName: e.target.value,
                      })
                    }
                    placeholder="Representante de ventas"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, phone: e.target.value })
                    }
                    placeholder="0212-0000000 / 0414-..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, email: e.target.value })
                  }
                  placeholder="ventas@proveedor.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Dirección Fiscal o Almacén
                </label>
                <textarea
                  rows={2}
                  value={createForm.address}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, address: e.target.value })
                  }
                  placeholder="Ubicación física o ciudad..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {createSubmitting && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {createSubmitting ? "Guardando..." : "Guardar Proveedor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Proveedor */}
      {editingSupplier && (
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
                onClick={() => setEditingSupplier(null)}
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

              {/* Toggle de Estado Activo/Inactivo */}
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
                <p className="text-[11px] text-slate-400 pl-6">
                  Si un proveedor tiene órdenes en el historial y no puede eliminarse, puede desactivarlo para que no aparezca en nuevas órdenes.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSupplier(null)}
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
                  {editSubmitting ? "Guardando Cambios..." : "Actualizar Proveedor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmación de Eliminación (Protección Referencial) */}
      {deletingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-2 bg-red-100 text-red-600 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  Eliminar Proveedor
                </h3>
                <p className="text-xs text-slate-500">
                  Confirmación con verificación de integridad referencial
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-600 space-y-2">
              <p>
                ¿Está seguro de que desea eliminar permanentemente al proveedor{" "}
                <span className="font-semibold text-slate-900">
                  {deletingSupplier.name}
                </span>{" "}
                (
                <span className="font-mono font-medium text-slate-800">
                  {deletingSupplier.rifOrId || deletingSupplier.rif}
                </span>
                )?
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] leading-relaxed">
                <strong>Aviso de Seguridad Institucional:</strong> El sistema verificará que este proveedor no posea Órdenes de Compra en el historial. Si existen órdenes registradas, la eliminación será rechazada por seguridad documental.
              </div>
            </div>

            {deleteFeedback && (
              <div
                className={`p-3 rounded-lg text-xs flex items-start gap-2 border ${
                  deleteFeedback.status === "success"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                {deleteFeedback.status === "success" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-semibold">{deleteFeedback.message}</p>
                  {deleteFeedback.status === "error" && (
                    <button
                      type="button"
                      onClick={() => {
                        const sup = deletingSupplier;
                        setDeletingSupplier(null);
                        handleOpenEditModal(sup);
                      }}
                      className="text-[11px] underline hover:text-red-900 cursor-pointer"
                    >
                      Ir a editar para inactivarlo
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingSupplier(null)}
                disabled={deleteSubmitting}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteSupplier}
                disabled={deleteSubmitting}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {deleteSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {deleteSubmitting ? "Verificando..." : "Confirmar Eliminación"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
