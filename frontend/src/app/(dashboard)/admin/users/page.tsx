"use client";

import React, { useState, useEffect, useTransition } from "react";
import { UserService, UserItem, UserRole } from "@/services/user.service";
import {
  Shield,
  UserPlus,
  Key,
  ShieldCheck,
  Check,
  Loader2,
  Lock,
  UserCheck,
  UserX,
} from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Estados de trabajo
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Formulario nuevo usuario
  const [createForm, setCreateForm] = useState({
    username: "",
    email: "",
    password: "",
    fullName: "",
    department: "Laboratorio de Inmunología",
    roleIds: [] as number[],
  });

  const loadData = async () => {
    try {
      const [uData, rData] = await Promise.all([
        UserService.getUsers(),
        UserService.getAvailableRoles(),
      ]);
      setUsers(uData);
      setRoles(rData);
    } catch (err) {
      console.error("Error al cargar datos de usuarios", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startTransition(() => {
      void loadData();
    });
  }, []);

  // Abrir modal para editar roles
  const handleOpenRoleModal = (user: UserItem) => {
    setSelectedUser(user);
    // Identificar IDs de los roles actuales
    const currentRoleIds = roles
      .filter((r) => user.roles.includes(r.name))
      .map((r) => r.id);
    setSelectedRoleIds(currentRoleIds);
    setShowRoleModal(true);
  };

  const handleToggleRoleSelection = (roleId: number) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId],
    );
  };

  const handleSaveRoles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await UserService.syncUserRoles(selectedUser.id, selectedRoleIds);
      await loadData();
      setShowRoleModal(false);
    } catch (err) {
      console.error("Error sincronizando roles", err);
      alert("Error al actualizar los roles del usuario");
    } finally {
      setSubmitting(false);
    }
  };

  // Alternar estado activo / inactivo
  const handleToggleActive = async (user: UserItem) => {
    try {
      await UserService.updateUser(user.id, { isActive: !user.isActive });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, isActive: !u.isActive } : u,
        ),
      );
    } catch (err) {
      console.error("Error cambiando estado", err);
      alert("No se pudo cambiar el estado del usuario");
    }
  };

  // Restablecer contraseña
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || newPassword.length < 8) {
      alert("La contraseña debe tener mínimo 8 caracteres");
      return;
    }
    setSubmitting(true);
    try {
      await UserService.resetPassword(selectedUser.id, newPassword);
      alert("Contraseña restablecida exitosamente");
      setShowPasswordModal(false);
      setNewPassword("");
    } catch (err) {
      console.error("Error restableciendo contraseña", err);
      alert("Error al restablecer la contraseña");
    } finally {
      setSubmitting(false);
    }
  };

  // Crear usuario
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createForm.roleIds.length === 0) {
      alert("Debe seleccionar al menos un rol para el usuario");
      return;
    }
    setSubmitting(true);
    try {
      await UserService.createUser(createForm);
      await loadData();
      setShowCreateModal(false);
      setCreateForm({
        username: "",
        email: "",
        password: "",
        fullName: "",
        department: "Laboratorio de Inmunología",
        roleIds: [],
      });
    } catch (err: unknown) {
      console.error("Error creando usuario", err);
      alert(
        "Error al registrar usuario. Verifique si el usuario o email ya existe.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            Usuarios y Control de Acceso (RBAC)
          </h1>
          <p className="text-sm text-slate-500">
            Administración de cuentas departamentales, asignación de permisos y
            estados de acceso.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all shadow-xs"
        >
          <UserPlus className="w-4 h-4" />
          Nuevo Usuario
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 text-left">
                <tr>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">Nombre Completo</th>
                  <th className="py-3 px-4">Departamento</th>
                  <th className="py-3 px-4">Roles Asignados</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {u.username}
                      <div className="text-xs text-slate-400 font-sans font-normal">
                        {u.email}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {u.fullName}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {u.department ?? "N/A"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <span
                            key={r}
                            className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border cursor-pointer ${
                          u.isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                        title="Click para alternar estado"
                      >
                        {u.isActive ? (
                          <>
                            <UserCheck className="w-3 h-3" /> Activo
                          </>
                        ) : (
                          <>
                            <UserX className="w-3 h-3" /> Inactivo
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenRoleModal(u)}
                        className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 transition-colors"
                        title="Reasignar roles"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Roles
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setShowPasswordModal(true);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-700 transition-colors"
                        title="Restablecer clave"
                      >
                        <Key className="w-3.5 h-3.5" />
                        Clave
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Reasignar Roles */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              Reasignar Roles a {selectedUser.username}
            </h3>
            <p className="text-xs text-slate-500">
              Seleccione los permisos operativos que este usuario tendrá
              vigentes en el sistema.
            </p>

            <form onSubmit={handleSaveRoles} className="space-y-3 pt-2">
              <div className="space-y-2">
                {roles.map((r) => {
                  const checked = selectedRoleIds.includes(r.id);
                  return (
                    <div
                      key={r.id}
                      onClick={() => handleToggleRoleSelection(r.id)}
                      className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between transition-colors ${
                        checked
                          ? "border-blue-500 bg-blue-50/50 text-blue-900"
                          : "border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold">{r.name}</div>
                        <div className="text-[11px] text-slate-500">
                          {r.description}
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center ${
                          checked
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-slate-300"
                        }`}
                      >
                        {checked && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-1.5"
                >
                  {submitting && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Restablecer Clave */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-600" />
              Restablecer Contraseña
            </h3>
            <p className="text-xs text-slate-500">
              Usuario:{" "}
              <span className="font-semibold text-slate-800">
                {selectedUser.username}
              </span>
            </p>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nueva Contraseña (mínimo 8 caracteres)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg flex items-center gap-1.5"
                >
                  {submitting && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Actualizar Clave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nuevo Usuario */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              Crear Nuevo Usuario Institucional
            </h3>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Usuario
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. jsanchez"
                    value={createForm.username}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, username: e.target.value })
                    }
                    className="w-full text-sm border rounded-lg p-2 focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Correo UCV / IDI
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="correo@idi.ucv.ve"
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, email: e.target.value })
                    }
                    className="w-full text-sm border rounded-lg p-2 focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Dra. Juana Sánchez"
                  value={createForm.fullName}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, fullName: e.target.value })
                  }
                  className="w-full text-sm border rounded-lg p-2 focus:ring-2 focus:ring-blue-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contraseña Inicial
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    placeholder="••••••••"
                    value={createForm.password}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, password: e.target.value })
                    }
                    className="w-full text-sm border rounded-lg p-2 focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Departamento
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.department}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        department: e.target.value,
                      })
                    }
                    className="w-full text-sm border rounded-lg p-2 focus:ring-2 focus:ring-blue-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Roles Asignados (Marque al menos uno)
                </label>
                <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto border p-2 rounded-lg bg-slate-50">
                  {roles.map((r) => {
                    const checked = createForm.roleIds.includes(r.id);
                    return (
                      <label
                        key={r.id}
                        className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-1 rounded hover:bg-slate-100"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setCreateForm((prev) => ({
                              ...prev,
                              roleIds: checked
                                ? prev.roleIds.filter((id) => id !== r.id)
                                : [...prev.roleIds, r.id],
                            }));
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-semibold">{r.name}</span>
                        <span className="text-[10px] text-slate-400 truncate">
                          ({r.description})
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-1.5"
                >
                  {submitting && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
