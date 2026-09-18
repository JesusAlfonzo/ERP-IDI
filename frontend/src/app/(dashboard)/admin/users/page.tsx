"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { UserClientService } from "@/services/user.service";
import { AuthService } from "@/services/auth.service";
import type { SystemUser, UserRole } from "@/types/users";
import {
  Users,
  UserPlus,
  Shield,
  Search,
  RefreshCw,
  KeyRound,
  UserCheck,
  UserX,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
} from "lucide-react";

const ROLE_BADGES: Record<UserRole, { label: string; className: string }> = {
  ADMINISTRADOR: {
    label: "Admin Global",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  ALMACENISTA: {
    label: "Almacén Central",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  ANALISTA_LABORATORIO: {
    label: "Bioanálisis / Sala",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  COMPRAS: {
    label: "Adquisiciones",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  SOLICITANTE: {
    label: "Solicitante",
    className: "bg-slate-50 text-slate-700 border-slate-200",
  },
};

const DEPARTMENTS = [
  "Dirección / Administración",
  "Almacén y Suministros",
  "Inmunogenética",
  "Inmunología Celular",
  "Inmunopatología",
  "Alergia e Inmunología Clínica",
  "Laboratorio General",
  "Compras y Finanzas",
  "Aseguramiento de Calidad",
];

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal Crear Usuario
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roles, setRoles] = useState<UserRole[]>(["SOLICITANTE"]);
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [submittingUser, setSubmittingUser] = useState(false);

  // Modal Reseteo de Password
  const [userToReset, setUserToReset] = useState<SystemUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submittingReset, setSubmittingReset] = useState(false);

  // Notificaciones
  const [feedback, setFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await UserClientService.getUsers();
      setUsers(data);
    } catch {
      // Manejado por interceptor global
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const init = async () => {
      const user = AuthService.getCurrentUser();
      if (!AuthService.isAuthenticated()) {
        router.replace("/login");
        return;
      }
      if (!user?.roles?.includes("ADMINISTRADOR")) {
        router.replace("/dashboard");
        return;
      }
      await loadUsers();
    };
    init();
  }, [router, loadUsers]);

  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (
      !fullName.trim() ||
      !username.trim() ||
      !email.trim() ||
      roles.length === 0
    ) {
      setFeedback({
        status: "error",
        message:
          "Complete todos los campos obligatorios y asigne al menos un rol.",
      });
      return;
    }

    setSubmittingUser(true);
    try {
      await UserClientService.createUser({
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password: password.trim() || undefined,
        roles,
        department,
      });

      setFeedback({
        status: "success",
        message: "Usuario institucional registrado exitosamente.",
      });
      await loadUsers();

      setTimeout(() => {
        setIsCreateModalOpen(false);
        setFullName("");
        setUsername("");
        setEmail("");
        setPassword("");
        setFeedback(null);
      }, 1000);
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message:
          err instanceof Error ? err.message : "Error al registrar usuario.",
      });
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleToggleStatus = async (user: SystemUser) => {
    const actionText = user.isActive ? "desactivar" : "reactivar";
    if (
      !confirm(`¿Está seguro de ${actionText} la cuenta de ${user.fullName}?`)
    )
      return;

    try {
      await UserClientService.toggleUserStatus(user.id, !user.isActive);
      await loadUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al modificar estado");
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (
      !userToReset ||
      newPassword.length < 8 ||
      newPassword !== confirmPassword
    ) {
      setFeedback({
        status: "error",
        message:
          "La contraseña debe tener 8 caracteres y coincidir con su confirmación.",
      });
      return;
    }
    setFeedback(null);

    setSubmittingReset(true);
    try {
      await UserClientService.resetPassword(userToReset.id, {
        newPassword: newPassword.trim(),
      });
      setFeedback({
        status: "success",
        message: "Contraseña actualizada exitosamente.",
      });

      setTimeout(() => {
        setUserToReset(null);
        setNewPassword("");
        setConfirmPassword("");
        setFeedback(null);
      }, 1000);
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "Error al restablecer contraseña.",
      });
    } finally {
      setSubmittingReset(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-6 h-6 text-purple-600" />
            Administración de Usuarios y Permisos RBAC
          </h1>
          <p className="text-xs text-slate-500">
            Control de cuentas del personal, roles de acceso y credenciales de
            seguridad
          </p>
        </div>

        <button
          onClick={() => {
            setIsCreateModalOpen(true);
            setFeedback(null);
          }}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          Registrar Usuario
        </button>
      </div>

      {/* Barra de Búsqueda y Actualizar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Buscar por nombre, usuario o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <button
          onClick={() => loadUsers()}
          className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors shadow-2xs"
          title="Actualizar listado"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Usuario</th>
                <th className="py-3 px-4">Nombre Completo</th>
                <th className="py-3 px-4">Departamento</th>
                <th className="py-3 px-4 text-center">Rol Asignado</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-600 mb-2" />
                    Cargando directorio de usuarios...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No se encontraron usuarios coincidentes.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const userRoles = user.roles || [];

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-800">
                          @{user.username}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {user.email}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {user.fullName}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {user.department}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-wrap justify-center gap-1">
                          {userRoles.map((userRole) => {
                            const roleBadge = ROLE_BADGES[userRole];
                            return roleBadge ? (
                              <span
                                key={userRole}
                                className={`inline-block rounded border px-2 py-0.5 text-[10px] font-bold ${roleBadge.className}`}
                              >
                                {roleBadge.label}
                              </span>
                            ) : null;
                          })}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${
                            user.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                        >
                          {user.isActive ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setUserToReset(user);
                              setNewPassword("");
                              setConfirmPassword("");
                              setFeedback(null);
                            }}
                            className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                            title="Restablecer Contraseña"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(user)}
                            className={`p-1 rounded transition-colors ${
                              user.isActive
                                ? "text-slate-400 hover:text-red-600 hover:bg-red-50"
                                : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={
                              user.isActive
                                ? "Desactivar Usuario"
                                : "Activar Usuario"
                            }
                          >
                            {user.isActive ? (
                              <UserX className="w-3.5 h-3.5" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5" />
                            )}
                          </button>
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

      {/* Modal: Crear Nuevo Usuario */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-slate-800 text-base">
                  Registrar Nuevo Personal
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
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

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej: Dra. María González"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Nombre de Usuario
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="mgonzalez"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-purple-500 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="mgonzalez@idi.ucv.ve"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Roles Institucionales
                  </span>
                  <div className="space-y-1 rounded-lg border border-slate-300 bg-slate-50 p-2">
                    {(
                      [
                        ["ADMINISTRADOR", "Administrador Global"],
                        ["ALMACENISTA", "Almacén Central"],
                        ["ANALISTA_LABORATORIO", "Laboratorio / Bioanalista"],
                        ["COMPRAS", "Compras y Proveedores"],
                        ["SOLICITANTE", "Solicitante"],
                      ] as const
                    ).map(([value, label]) => (
                      <label
                        key={value}
                        className="flex items-center gap-2 text-xs text-slate-800"
                      >
                        <input
                          type="checkbox"
                          checked={roles.includes(value)}
                          onChange={(e) =>
                            setRoles((current) =>
                              e.target.checked
                                ? [...new Set([...current, value])]
                                : current.filter(
                                    (roleValue) => roleValue !== value,
                                  ),
                            )
                          }
                          className="h-3.5 w-3.5 accent-purple-600"
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Departamento
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-purple-500"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Contraseña Temporal (Opcional)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-2.5 flex items-center text-slate-400">
                    <Lock className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Dejar en blanco para autogenerar"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50"
                >
                  {submittingUser && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {submittingUser ? "Registrando..." : "Guardar Personal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reseteo de Contraseña */}
      {userToReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-base">
                  Restablecer Contraseña
                </h3>
                <p className="text-xs text-slate-500">
                  @{userToReset.username} ({userToReset.fullName})
                </p>
              </div>
              <button
                onClick={() => setUserToReset(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
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

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Confirmar Contraseña
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita la contraseña"
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUserToReset(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingReset}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50"
                >
                  {submittingReset && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {submittingReset ? "Guardando..." : "Cambiar Contraseña"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
