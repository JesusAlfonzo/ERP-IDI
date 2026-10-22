"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { UserService, UserItem, UserRole } from "@/services/user.service";
import { AuthService } from "@/services/auth.service";
import type { AuthUser } from "@/types/auth";
import {
  Users,
  UserPlus,
  Key,
  ShieldCheck,
  Check,
  Loader2,
  Lock,
  UserCheck,
  UserX,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  AlertTriangle,
} from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/utils/toast";

export default function AdminUsersPage() {
  const [currentUser] = useState<AuthUser | null>(() =>
    AuthService.getCurrentUser()
  );
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  // Filtros y búsqueda
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [userToToggle, setUserToToggle] = useState<UserItem | null>(null);

  // Estados de trabajo
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [newPassword, setNewPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);

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
      toast.error("Error al cargar el listado de usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    startTransition(() => {
      void loadData();
    });
  }, []);

  // Filtrado reactivo de usuarios
  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase().trim();
    return users.filter((u) => {
      const matchesSearch =
        !q ||
        u.username.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.department && u.department.toLowerCase().includes(q)) ||
        u.roles.some((r) => r.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && u.isActive) ||
        (statusFilter === "inactive" && !u.isActive);

      const matchesRole =
        roleFilter === "all" || u.roles.includes(roleFilter);

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, search, statusFilter, roleFilter]);

  // Cálculos de paginación
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startRecord = filteredUsers.length === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endRecord = Math.min(safeCurrentPage * pageSize, filteredUsers.length);
  const paginatedUsers = filteredUsers.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  // Abrir modal para editar roles
  const handleOpenRoleModal = (user: UserItem) => {
    setSelectedUser(user);
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
      toast.success(`Roles de "${selectedUser.username}" actualizados exitosamente`);
      setShowRoleModal(false);
    } catch (err) {
      console.error("Error sincronizando roles", err);
      toast.error("Error al actualizar los roles del usuario");
    } finally {
      setSubmitting(false);
    }
  };

  // Confirmar y alternar estado activo / inactivo
  const handleConfirmToggleActive = async () => {
    if (!userToToggle) return;
    setTogglingActive(true);
    try {
      const nextState = !userToToggle.isActive;
      await UserService.updateUser(userToToggle.id, { isActive: nextState });
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userToToggle.id ? { ...u, isActive: nextState } : u,
        ),
      );
      toast.success(
        `Usuario "${userToToggle.username}" ${nextState ? "reactivado" : "desactivado"} exitosamente`
      );
      setUserToToggle(null);
    } catch (err: unknown) {
      console.error("Error cambiando estado de usuario", err);
      const errMsg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "No se pudo cambiar el estado del usuario";
      toast.error(errMsg);
    } finally {
      setTogglingActive(false);
    }
  };

  // Restablecer contraseña
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || newPassword.length < 8) {
      toast.error("La contraseña debe tener mínimo 8 caracteres");
      return;
    }
    setSubmitting(true);
    try {
      await UserService.resetPassword(selectedUser.id, newPassword);
      toast.success(`Contraseña de "${selectedUser.username}" restablecida exitosamente`);
      setShowPasswordModal(false);
      setNewPassword("");
    } catch (err) {
      console.error("Error restableciendo contraseña", err);
      toast.error("Error al restablecer la contraseña del usuario");
    } finally {
      setSubmitting(false);
    }
  };

  // Crear usuario
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createForm.roleIds.length === 0) {
      toast.error("Debe seleccionar al menos un rol para el usuario");
      return;
    }
    setSubmitting(true);
    try {
      await UserService.createUser(createForm);
      await loadData();
      toast.success(`Usuario "${createForm.username}" registrado exitosamente`);
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
      toast.error("Error al registrar usuario. Verifique si el usuario o email ya existe.");
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "ADMINISTRADOR":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "ADMINISTRACION":
      case "DIRECTOR":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "COMPRAS":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "ALMACEN":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "LABORATORIO":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "FARMACIA":
        return "bg-teal-50 text-teal-700 border-teal-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-blue-600" />
            Usuarios y Control de Acceso (RBAC)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Administración centralizada de cuentas institucionales, asignación de roles, permisos y políticas de acceso.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm px-4 py-2.5 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Buscar por usuario, nombre, correo, área o rol..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder:text-slate-400 text-sm shadow-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCurrentPage(1);
              }}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Filtro por estado */}
          <div className="inline-flex rounded-xl p-1 bg-slate-100 border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === "all"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Todos ({users.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("active");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === "active"
                  ? "bg-white text-emerald-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Activos ({users.filter((u) => u.isActive).length})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("inactive");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                statusFilter === "inactive"
                  ? "bg-white text-rose-700 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Inactivos ({users.filter((u) => !u.isActive).length})
            </button>
          </div>

          {/* Filtro por Rol */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer"
          >
            <option value="all">Todos los Roles ({roles.length})</option>
            {roles.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Contenedor de la Tabla */}
      {loading ? (
        <div className="flex flex-col justify-center items-center p-16 space-y-3 bg-white border border-slate-200 rounded-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-xs text-slate-500">Cargando directorio de usuarios...</p>
        </div>
      ) : (
        <Card className="overflow-hidden border border-slate-200 rounded-2xl shadow-xs">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-3.5 px-6 w-64 text-left">Usuario & Credenciales</TableHead>
                  <TableHead className="py-3.5 px-6 w-60 text-left">Nombre Completo</TableHead>
                  <TableHead className="py-3.5 px-6 w-52 text-left">Departamento / Área</TableHead>
                  <TableHead className="py-3.5 px-6 text-left">Roles Asignados</TableHead>
                  <TableHead className="py-3.5 px-6 text-center w-32">Estado</TableHead>
                  <TableHead className="py-3.5 px-6 text-center w-48">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100 text-slate-800 text-sm">
                {paginatedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-14 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                        <Search className="w-8 h-8 stroke-1 text-slate-300" />
                        <p className="text-sm font-semibold text-slate-700">No se encontraron usuarios</p>
                        <p className="text-xs text-slate-400 max-w-sm">
                          {search || statusFilter !== "all" || roleFilter !== "all"
                            ? "No hay usuarios que coincidan con los filtros aplicados. Prueba limpiando los criterios de búsqueda."
                            : "Aún no hay usuarios registrados en el sistema."}
                        </p>
                        {(search || statusFilter !== "all" || roleFilter !== "all") && (
                          <button
                            type="button"
                            onClick={() => {
                              setSearch("");
                              setStatusFilter("all");
                              setRoleFilter("all");
                              setCurrentPage(1);
                            }}
                            className="mt-2 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                          >
                            Limpiar todos los filtros
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    return (
                      <TableRow
                        key={u.id}
                        className={`transition-colors ${!u.isActive ? "bg-slate-50/60" : "hover:bg-slate-50/70"}`}
                      >
                        <TableCell className="py-3.5 px-6">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-semibold text-slate-900 text-xs">
                              {u.username}
                            </span>
                            {isSelf && (
                              <span className="inline-block text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded-md">
                                Tú
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 font-sans mt-0.5">
                            {u.email}
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5 px-6 font-semibold text-slate-900">
                          {u.fullName}
                        </TableCell>
                        <TableCell className="py-3.5 px-6 text-xs text-slate-600 font-medium">
                          {u.department ?? <span className="italic text-slate-400">Sin asignar</span>}
                        </TableCell>
                        <TableCell className="py-3.5 px-6">
                          <div className="flex flex-wrap gap-1.5">
                            {u.roles.map((r) => (
                              <span
                                key={r}
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getRoleBadgeStyle(
                                  r
                                )}`}
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5 px-6 text-center">
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => setUserToToggle(u)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors ${
                              isSelf
                                ? "cursor-default opacity-85"
                                : "cursor-pointer"
                            } ${
                              u.isActive
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                            }`}
                            title={
                              isSelf
                                ? "No puedes desactivar tu propia cuenta"
                                : u.isActive
                                ? "Clic para desactivar acceso del usuario"
                                : "Clic para reactivar acceso del usuario"
                            }
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                u.isActive ? "bg-emerald-600" : "bg-rose-600"
                              }`}
                            />
                            {u.isActive ? "Activo" : "Inactivo"}
                          </button>
                        </TableCell>
                        <TableCell className="py-3.5 px-6 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenRoleModal(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors cursor-pointer"
                              title="Reasignar roles"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                              Roles
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedUser(u);
                                setShowPasswordModal(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 transition-colors cursor-pointer"
                              title="Restablecer contraseña"
                            >
                              <Key className="w-3.5 h-3.5 text-amber-600" />
                              Clave
                            </button>
                            {/* Botón explícito de desactivar / activar */}
                            {u.isActive ? (
                              <button
                                type="button"
                                disabled={isSelf}
                                onClick={() => setUserToToggle(u)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                                  isSelf
                                    ? "opacity-30 border-slate-200 text-slate-400 cursor-not-allowed"
                                    : "border-slate-200 bg-white text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 cursor-pointer"
                                }`}
                                title={
                                  isSelf
                                    ? "No puedes desactivar tu propia cuenta"
                                    : "Desactivar acceso de este usuario"
                                }
                              >
                                <UserX className="w-3.5 h-3.5 text-rose-600" />
                                Desactivar
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setUserToToggle(u)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 transition-colors cursor-pointer"
                                title="Reactivar acceso de este usuario"
                              >
                                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                Activar
                              </button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Barra de Paginación */}
          {!loading && filteredUsers.length > 0 && (
            <div className="bg-slate-50/70 border-t border-slate-200 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
              <div className="flex items-center gap-4 flex-wrap">
                <span>
                  Mostrando <strong className="font-semibold text-slate-800">{startRecord}</strong> - <strong className="font-semibold text-slate-800">{endRecord}</strong> de{" "}
                  <strong className="font-semibold text-slate-800">{filteredUsers.length}</strong> usuarios
                </span>

                <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
                  <span>Filas por página:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="mr-2">
                  Página <strong className="font-semibold text-slate-800">{safeCurrentPage}</strong> de{" "}
                  <strong className="font-semibold text-slate-800">{totalPages}</strong>
                </span>

                <button
                  type="button"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage(1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Primera página"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Páginas numéricas */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                    .filter((p) => {
                      return (
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - safeCurrentPage) <= 1
                      );
                    })
                    .map((p, idx, arr) => {
                      const prev = arr[idx - 1];
                      const hasGap = prev && p - prev > 1;
                      return (
                        <React.Fragment key={p}>
                          {hasGap && <span className="px-1 text-slate-400">...</span>}
                          <button
                            type="button"
                            onClick={() => setCurrentPage(p)}
                            className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              p === safeCurrentPage
                                ? "bg-blue-600 text-white shadow-xs"
                                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <button
                  type="button"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Página siguiente"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Última página"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Modal de Confirmación para Desactivar / Reactivar Usuario */}
      <Dialog
        open={Boolean(userToToggle)}
        onOpenChange={(open) => {
          if (!open && !togglingActive) setUserToToggle(null);
        }}
      >
        <DialogContent className="sm:max-w-md max-w-md p-6 sm:p-7 rounded-2xl shadow-2xl border border-slate-100 space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  userToToggle?.isActive
                    ? "bg-rose-100 text-rose-600"
                    : "bg-emerald-100 text-emerald-600"
                }`}
              >
                {userToToggle?.isActive ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <UserCheck className="w-5 h-5" />
                )}
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  {userToToggle?.isActive
                    ? "Desactivar Acceso de Usuario"
                    : "Reactivar Acceso de Usuario"}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Confirmación de política de acceso al sistema ERP-IDI
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 pt-2 text-sm text-slate-600">
            {userToToggle?.isActive ? (
              <>
                <p>
                  ¿Está seguro de que desea suspender la cuenta de{" "}
                  <strong className="text-slate-900">{userToToggle.fullName}</strong> (
                  <span className="font-mono text-xs text-slate-700">@{userToToggle.username}</span>)?
                </p>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                  <p className="font-semibold">Efectos inmediatos:</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    <li>El usuario no podrá iniciar sesión en ERP-IDI.</li>
                    <li>Sus credenciales quedarán temporalmente bloqueadas.</li>
                    <li>No se eliminan sus registros históricos ni transacciones previas.</li>
                  </ul>
                </div>
              </>
            ) : (
              <>
                <p>
                  ¿Desea restaurar el acceso al sistema para{" "}
                  <strong className="text-slate-900">{userToToggle?.fullName}</strong> (
                  <span className="font-mono text-xs text-slate-700">@{userToToggle?.username}</span>)?
                </p>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
                  <p className="font-semibold">Efectos de reactivación:</p>
                  <p>
                    El usuario podrá iniciar sesión normalmente con sus credenciales y roles asignados.
                  </p>
                </div>
              </>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              disabled={togglingActive}
              onClick={() => setUserToToggle(null)}
              className="rounded-xl text-slate-600 cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={togglingActive}
              onClick={() => void handleConfirmToggleActive()}
              className={`gap-1.5 rounded-xl text-white cursor-pointer ${
                userToToggle?.isActive
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {togglingActive && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {userToToggle?.isActive ? "Sí, Desactivar Usuario" : "Sí, Reactivar Usuario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Reasignar Roles (Amplio sm:max-w-xl) */}
      <Dialog
        open={Boolean(showRoleModal && selectedUser)}
        onOpenChange={(open) => {
          if (!open) setShowRoleModal(false);
        }}
      >
        <DialogContent className="sm:max-w-xl max-w-xl p-6 sm:p-7 rounded-2xl shadow-2xl border border-slate-100 space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <DialogTitle className="text-lg font-bold text-slate-900">
                Reasignar Roles a {selectedUser?.username}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Seleccione los permisos y roles operativos que este usuario tendrá vigentes en el sistema.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRoles} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {roles.map((r) => {
                const checked = selectedRoleIds.includes(r.id);
                return (
                  <div
                    key={r.id}
                    onClick={() => handleToggleRoleSelection(r.id)}
                    className={`p-3 rounded-xl border cursor-pointer flex flex-col justify-between gap-2 transition-all ${
                      checked
                        ? "border-blue-500 bg-blue-50/60 shadow-xs"
                        : "border-slate-200 hover:bg-slate-50/80 text-slate-600"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${checked ? "text-blue-900" : "text-slate-800"}`}>
                        {r.name}
                      </span>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => handleToggleRoleSelection(r.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      {r.description || "Permisos generales del rol"}
                    </p>
                  </div>
                );
              })}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRoleModal(false)}
                className="rounded-xl text-slate-600 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer"
              >
                {submitting && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Restablecer Clave */}
      <Dialog
        open={Boolean(showPasswordModal && selectedUser)}
        onOpenChange={(open) => {
          if (!open) setShowPasswordModal(false);
        }}
      >
        <DialogContent className="sm:max-w-md max-w-md p-6 sm:p-7 rounded-2xl shadow-2xl border border-slate-100 space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-600" />
              <DialogTitle className="text-lg font-bold text-slate-900">
                Restablecer Contraseña
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Defina una nueva clave de acceso para el usuario <strong className="text-slate-800">{selectedUser?.username}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Nueva Contraseña * (mínimo 8 caracteres)
              </Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <Input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPasswordModal(false)}
                className="rounded-xl text-slate-600 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer"
              >
                {submitting && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                Actualizar Clave
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Nuevo Usuario (Amplio sm:max-w-2xl en 2 Columnas) */}
      <Dialog
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      >
        <DialogContent className="sm:max-w-2xl max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-7 rounded-2xl shadow-2xl border border-slate-100 space-y-5">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <UserPlus className="w-6 h-6 text-blue-600" />
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  Registrar Nuevo Usuario Institucional
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Complete los datos de la cuenta y seleccione los roles con los que operará en el ERP.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Nombre de Usuario *
                </Label>
                <Input
                  type="text"
                  required
                  placeholder="ej. jsanchez, amendoza"
                  value={createForm.username}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, username: e.target.value })
                  }
                  className="bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                />
              </div>

              <div>
                <Label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Correo Electrónico Institucional *
                </Label>
                <Input
                  type="email"
                  required
                  placeholder="correo@idi.ucv.ve"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, email: e.target.value })
                  }
                  className="bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                />
              </div>

              <div className="sm:col-span-2">
                <Label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Nombre Completo del Titular *
                </Label>
                <Input
                  type="text"
                  required
                  placeholder="ej. Dra. Juana Sánchez, Lic. Alejandro Mendoza"
                  value={createForm.fullName}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, fullName: e.target.value })
                  }
                  className="bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                />
              </div>

              <div>
                <Label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Contraseña Inicial *
                </Label>
                <Input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  value={createForm.password}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, password: e.target.value })
                  }
                  className="bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                />
              </div>

              <div>
                <Label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                  Departamento / Área *
                </Label>
                <Input
                  type="text"
                  required
                  placeholder="ej. Laboratorio de Inmunología"
                  value={createForm.department}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      department: e.target.value,
                    })
                  }
                  className="bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5 pt-1">
                <Label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Roles Asignados * (seleccione al menos uno)
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto border border-slate-200 p-2.5 rounded-xl bg-slate-50/50">
                  {roles.map((r) => {
                    const checked = createForm.roleIds.includes(r.id);
                    return (
                      <label
                        key={r.id}
                        className={`flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors border ${
                          checked
                            ? "bg-blue-50/70 border-blue-400 text-slate-900"
                            : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                        }`}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => {
                            setCreateForm((prev) => ({
                              ...prev,
                              roleIds: checked
                                ? prev.roleIds.filter((id) => id !== r.id)
                                : [...prev.roleIds, r.id],
                            }));
                          }}
                          className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-xs text-slate-800">
                            {r.name}
                          </div>
                          <div className="text-[10px] text-slate-500 leading-snug line-clamp-2">
                            {r.description || "Permisos del rol"}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl text-slate-600 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 cursor-pointer"
              >
                {submitting && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Crear Usuario
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
