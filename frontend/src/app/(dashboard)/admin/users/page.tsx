"use client";

import React, { useState, useEffect, useTransition, useMemo, useCallback } from "react";
import { UserService, UserItem, UserRole } from "@/services/user.service";
import { AuthService } from "@/services/auth.service";
import { useDebounce } from "@/hooks/use-debounce";
import type { AuthUser } from "@/types/auth";
import { cn } from "@/lib/utils";
import {
  Users,
  UserPlus,
  Key,
  ShieldCheck,
  Loader2,
  Lock,
  UserCheck,
  UserX,
  Search,
  X,
  AlertTriangle,
  RefreshCw,
  Mail,
  Building2,
  Calendar,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, BadgeProps } from "@/components/ui/badge";
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
import { TablePagination } from "@/components/common/TablePagination";

const getRoleBadgeVariant = (role: string): BadgeProps["variant"] => {
  switch (role) {
    case "ADMINISTRADOR":
      return "rose";
    case "COORDINADOR":
    case "ADMINISTRACION":
    case "DIRECTOR":
      return "indigo";
    case "COMPRAS":
      return "info";
    case "ALMACENISTA":
    case "ALMACEN":
      return "warning";
    case "SOLICITANTE":
      return "purple";
    default:
      return "outline";
  }
};

const getInitials = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export default function AdminUsersPage() {
  const [currentUser] = useState<AuthUser | null>(() =>
    AuthService.getCurrentUser(),
  );
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [, startTransition] = useTransition();

  // Filtros y búsqueda
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Paginación (12 tarjetas por página = 4 filas de 3 tarjetas)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

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
    department: "Almacén General",
    roleIds: [] as number[],
  });

  // Ocultar roles de módulos deshabilitados (Laboratorio / Investigación) al asignar nuevos roles
  const visibleAvailableRoles = useMemo(() => {
    const disabledRoleNames = new Set([
      "LABORATORIO",
      "COORDINADOR_LABORATORIO",
      "BIOANALISTA",
      "INVESTIGACION",
      "DOCENCIA",
    ]);
    return roles.filter((r) => !disabledRoleNames.has(r.name));
  }, [roles]);

  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const [uData, rData] = await Promise.all([
        UserService.getUsers(),
        UserService.getAvailableRoles(),
      ]);
      setUsers(uData);
      setRoles(rData);
    } catch (err) {
      console.error("Error al cargar datos de usuarios", err);
      toast.error("Error al cargar usuarios");
    } finally {
      setLoading(false);
      if (isManualRefresh) {
        setTimeout(() => setRefreshing(false), 300);
      }
    }
  }, []);

  useEffect(() => {
    startTransition(() => {
      void loadData(false);
    });
  }, [loadData]);

  // Estadísticas rápidas
  const totalUsersCount = users.length;
  const activeUsersCount = useMemo(
    () => users.filter((u) => u.isActive).length,
    [users],
  );
  const inactiveUsersCount = totalUsersCount - activeUsersCount;

  // Filtrado reactivo de usuarios
  const filteredUsers = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
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
  }, [users, debouncedSearch, statusFilter, roleFilter]);

  // Cálculos de paginación
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedUsers = filteredUsers.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize,
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
      await loadData(false);
      toast.success(`Roles de "${selectedUser.username}" actualizados`);
      setShowRoleModal(false);
    } catch (err) {
      console.error("Error sincronizando roles", err);
      toast.error("Error al actualizar los roles");
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
        `Usuario "${userToToggle.username}" ${nextState ? "activado" : "desactivado"}`,
      );
      setUserToToggle(null);
    } catch (err: unknown) {
      console.error("Error cambiando estado de usuario", err);
      const errMsg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "No se pudo cambiar el estado";
      toast.error(errMsg);
    } finally {
      setTogglingActive(false);
    }
  };

  // Restablecer contraseña
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || newPassword.length < 8) {
      toast.error("La clave debe tener mínimo 8 caracteres");
      return;
    }
    setSubmitting(true);
    try {
      await UserService.resetPassword(selectedUser.id, newPassword);
      toast.success(`Clave de "${selectedUser.username}" actualizada`);
      setShowPasswordModal(false);
      setNewPassword("");
    } catch (err) {
      console.error("Error restableciendo contraseña", err);
      toast.error("Error al cambiar la clave");
    } finally {
      setSubmitting(false);
    }
  };

  // Crear usuario
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createForm.roleIds.length === 0) {
      toast.error("Selecciona al menos un rol");
      return;
    }
    setSubmitting(true);
    try {
      await UserService.createUser(createForm);
      await loadData(false);
      toast.success(`Usuario "${createForm.username}" creado`);
      setShowCreateModal(false);
      setCreateForm({
        username: "",
        email: "",
        password: "",
        fullName: "",
        department: "Almacén General",
        roleIds: [],
      });
    } catch (err: unknown) {
      console.error("Error creando usuario", err);
      toast.error("Error al crear usuario. Verifica si el usuario o correo ya existe.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 w-full pb-12">
      {/* ========================================================
          ENCABEZADO ESTANDARIZADO
         ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 shadow-2xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Usuarios
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cuentas y permisos del sistema
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadData(true)}
            disabled={refreshing}
            className="h-8 text-xs gap-1.5 cursor-pointer"
          >
            <RefreshCw
              className={cn("w-3.5 h-3.5", refreshing && "animate-spin text-primary")}
            />
            Actualizar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="h-8 text-xs gap-1.5 cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Nuevo Usuario
          </Button>
        </div>
      </div>

      {/* ========================================================
          BARRA DE BÚSQUEDA Y FILTROS
         ======================================================== */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar usuario, nombre, correo o departamento..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-9 pr-8 h-9 text-xs bg-card border-border/80 rounded-xl shadow-2xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCurrentPage(1);
              }}
              className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Limpiar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro por estado */}
          <div className="inline-flex rounded-xl p-1 bg-muted/70 border border-border/60 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setCurrentPage(1);
              }}
              className={cn(
                "px-3 py-1 rounded-lg transition-all cursor-pointer",
                statusFilter === "all"
                  ? "bg-background text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Todos ({totalUsersCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("active");
                setCurrentPage(1);
              }}
              className={cn(
                "px-3 py-1 rounded-lg transition-all cursor-pointer",
                statusFilter === "active"
                  ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Activos ({activeUsersCount})
            </button>
            <button
              type="button"
              onClick={() => {
                setStatusFilter("inactive");
                setCurrentPage(1);
              }}
              className={cn(
                "px-3 py-1 rounded-lg transition-all cursor-pointer",
                statusFilter === "inactive"
                  ? "bg-background text-rose-600 dark:text-rose-400 shadow-2xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Inactivos ({inactiveUsersCount})
            </button>
          </div>

          {/* Filtro por Rol */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 bg-card border border-border/80 rounded-xl px-3 text-xs text-foreground font-semibold focus:ring-2 focus:ring-ring outline-none cursor-pointer shadow-2xs"
          >
            <option value="all">Todos los roles</option>
            {visibleAvailableRoles.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>

          {(search || statusFilter !== "all" || roleFilter !== "all") && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setRoleFilter("all");
                setCurrentPage(1);
              }}
              className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Limpiar
            </Button>
          )}
        </div>
      </div>

      {/* ========================================================
          TARJETAS POR USUARIO (GRID)
         ======================================================== */}
      {loading ? (
        <div className="h-64 flex flex-col justify-center items-center gap-2 bg-card border border-border/80 rounded-2xl shadow-2xs">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Cargando usuarios...</p>
        </div>
      ) : paginatedUsers.length === 0 ? (
        <Card className="p-12 text-center border-border/80 shadow-2xs">
          <div className="flex flex-col items-center justify-center text-muted-foreground space-y-2">
            <Users className="w-8 h-8 text-muted-foreground/50" />
            <p className="text-xs font-semibold text-foreground">
              Sin usuarios encontrados
            </p>
            <p className="text-[11px] text-muted-foreground max-w-xs">
              {search || statusFilter !== "all" || roleFilter !== "all"
                ? "No hay resultados con los filtros actuales."
                : "No hay usuarios registrados."}
            </p>
            {(search || statusFilter !== "all" || roleFilter !== "all") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setRoleFilter("all");
                  setCurrentPage(1);
                }}
                className="mt-1 h-8 text-xs cursor-pointer"
              >
                Ver todos
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedUsers.map((u) => {
              const isSelf = u.id === currentUser?.id;

              return (
                <Card
                  key={u.id}
                  className={cn(
                    "border-border/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between overflow-hidden",
                    !u.isActive && "opacity-75 bg-muted/20",
                  )}
                >
                  <CardContent className="p-4 space-y-3.5">
                    {/* Cabecera de la tarjeta: Avatar + Nombre + Estado */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border",
                            u.isActive
                              ? "bg-primary/10 border-primary/20 text-primary"
                              : "bg-muted border-border text-muted-foreground",
                          )}
                        >
                          {getInitials(u.fullName)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-sm font-bold text-foreground truncate">
                              {u.fullName}
                            </h3>
                            {isSelf && (
                              <Badge
                                variant="info"
                                className="text-[10px] px-1.5 py-0"
                              >
                                Tú
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs font-mono text-muted-foreground block truncate">
                            @{u.username}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant={u.isActive ? "success" : "destructive"}
                        className="text-[10px] shrink-0"
                      >
                        {u.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>

                    {/* Datos de contacto y departamento */}
                    <div className="space-y-1.5 pt-2 border-t border-border/50 text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                        <Mail className="w-3.5 h-3.5 shrink-0 text-muted-foreground/80" />
                        <span className="truncate">{u.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                        <Building2 className="w-3.5 h-3.5 shrink-0 text-muted-foreground/80" />
                        <span className="truncate font-medium text-foreground/90">
                          {u.department || "Sin departamento"}
                        </span>
                      </div>
                      {u.createdAt && (
                        <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                          <Calendar className="w-3.5 h-3.5 shrink-0 text-muted-foreground/80" />
                          <span className="font-mono">
                            Desde{" "}
                            {new Date(u.createdAt).toLocaleDateString("es-VE")}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Roles asignados */}
                    <div className="space-y-1.5 pt-2 border-t border-border/50">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Roles
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {u.roles.length === 0 ? (
                          <span className="text-[11px] text-muted-foreground italic">
                            Sin roles
                          </span>
                        ) : (
                          u.roles.map((r) => (
                            <Badge
                              key={r}
                              variant={getRoleBadgeVariant(r)}
                              className="text-[10px] font-mono"
                            >
                              {r}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  </CardContent>

                  {/* Pie de tarjeta: Acciones directas */}
                  <div className="px-4 py-2.5 bg-muted/25 border-t border-border/60 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenRoleModal(u)}
                        className="h-7 text-[11px] px-2.5 gap-1 cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                        Roles
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(u);
                          setShowPasswordModal(true);
                        }}
                        className="h-7 text-[11px] px-2.5 gap-1 cursor-pointer"
                      >
                        <Key className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        Clave
                      </Button>
                    </div>

                    {u.isActive ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isSelf}
                        onClick={() => setUserToToggle(u)}
                        className={cn(
                          "h-7 text-[11px] px-2.5 gap-1 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:text-rose-700",
                          isSelf
                            ? "opacity-30 cursor-not-allowed"
                            : "cursor-pointer",
                        )}
                        title={
                          isSelf
                            ? "No puedes desactivar tu cuenta"
                            : "Desactivar usuario"
                        }
                      >
                        <UserX className="w-3.5 h-3.5" />
                        Desactivar
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setUserToToggle(u)}
                        className="h-7 text-[11px] px-2.5 gap-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-700 cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        Activar
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Barra de Paginación Estandarizada */}
          <Card className="overflow-hidden border-border/80 shadow-2xs">
            <TablePagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredUsers.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              pageSizeOptions={[6, 12, 24, 48]}
              entityName="usuarios"
              className="border-t-0"
            />
          </Card>
        </div>
      )}

      {/* ========================================================
          MODAL: ACTIVAR / DESACTIVAR USUARIO
         ======================================================== */}
      <Dialog
        open={Boolean(userToToggle)}
        onOpenChange={(open) => {
          if (!open && !togglingActive) setUserToToggle(null);
        }}
      >
        <DialogContent className="sm:max-w-md max-w-md p-6 rounded-2xl border-border/80 space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                  userToToggle?.isActive
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                )}
              >
                {userToToggle?.isActive ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <UserCheck className="w-5 h-5" />
                )}
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {userToToggle?.isActive
                    ? "Desactivar Usuario"
                    : "Activar Usuario"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  @{userToToggle?.username}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="text-xs text-muted-foreground space-y-2">
            {userToToggle?.isActive ? (
              <p>
                ¿Desactivar la cuenta de{" "}
                <strong className="text-foreground">
                  {userToToggle.fullName}
                </strong>
                ? El usuario no podrá iniciar sesión hasta que se reactive.
              </p>
            ) : (
              <p>
                ¿Activar la cuenta de{" "}
                <strong className="text-foreground">
                  {userToToggle?.fullName}
                </strong>
                ? El usuario podrá volver a iniciar sesión en el sistema.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={togglingActive}
              onClick={() => setUserToToggle(null)}
              className="h-8 text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={togglingActive}
              onClick={() => void handleConfirmToggleActive()}
              className={cn(
                "h-8 text-xs gap-1.5 text-white cursor-pointer",
                userToToggle?.isActive
                  ? "bg-rose-600 hover:bg-rose-700"
                  : "bg-emerald-600 hover:bg-emerald-700",
              )}
            >
              {togglingActive && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              {userToToggle?.isActive ? "Desactivar" : "Activar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          MODAL: ROLES DEL USUARIO
         ======================================================== */}
      <Dialog
        open={Boolean(showRoleModal && selectedUser)}
        onOpenChange={(open) => {
          if (!open) setShowRoleModal(false);
        }}
      >
        <DialogContent className="sm:max-w-lg max-w-lg p-6 rounded-2xl border-border/80 space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Roles de {selectedUser?.fullName}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Selecciona los permisos para @{selectedUser?.username}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveRoles} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {visibleAvailableRoles.map((r) => {
                const checked = selectedRoleIds.includes(r.id);
                return (
                  <div
                    key={r.id}
                    onClick={() => handleToggleRoleSelection(r.id)}
                    className={cn(
                      "p-3 rounded-xl border cursor-pointer flex flex-col justify-between gap-1.5 transition-all",
                      checked
                        ? "border-primary bg-primary/5 shadow-2xs"
                        : "border-border/80 hover:bg-muted/40 text-muted-foreground",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "text-xs font-bold font-mono",
                          checked ? "text-primary" : "text-foreground",
                        )}
                      >
                        {r.name}
                      </span>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => handleToggleRoleSelection(r.id)}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {r.description || "Acceso al módulo"}
                    </p>
                  </div>
                );
              })}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowRoleModal(false)}
                className="h-8 text-xs cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                {submitting && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          MODAL: CAMBIAR CLAVE
         ======================================================== */}
      <Dialog
        open={Boolean(showPasswordModal && selectedUser)}
        onOpenChange={(open) => {
          if (!open) setShowPasswordModal(false);
        }}
      >
        <DialogContent className="sm:max-w-md max-w-md p-6 rounded-2xl border-border/80 space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Cambiar Clave
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Nueva clave para @{selectedUser?.username}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="block text-xs font-bold text-foreground">
                Nueva Clave
              </Label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                  <Lock className="w-4 h-4" />
                </span>
                <Input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="pl-9 h-9 text-xs bg-card border-border/80 rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPasswordModal(false)}
                className="h-8 text-xs cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                {submitting && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================
          MODAL: NUEVO USUARIO
         ======================================================== */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-xl max-w-xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl border-border/80 space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Nuevo Usuario
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Datos de la cuenta y roles asignados
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label className="block text-xs font-bold text-foreground">
                  Usuario *
                </Label>
                <Input
                  type="text"
                  required
                  placeholder="ej. jsanchez"
                  value={createForm.username}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, username: e.target.value })
                  }
                  className="h-9 text-xs bg-card border-border/80 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="block text-xs font-bold text-foreground">
                  Correo *
                </Label>
                <Input
                  type="email"
                  required
                  placeholder="correo@idi.ucv.ve"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, email: e.target.value })
                  }
                  className="h-9 text-xs bg-card border-border/80 rounded-xl"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label className="block text-xs font-bold text-foreground">
                  Nombre Completo *
                </Label>
                <Input
                  type="text"
                  required
                  placeholder="ej. Dra. Juana Sánchez"
                  value={createForm.fullName}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, fullName: e.target.value })
                  }
                  className="h-9 text-xs bg-card border-border/80 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="block text-xs font-bold text-foreground">
                  Clave *
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
                  className="h-9 text-xs bg-card border-border/80 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="block text-xs font-bold text-foreground">
                  Departamento *
                </Label>
                <Input
                  type="text"
                  required
                  placeholder="ej. Almacén General"
                  value={createForm.department}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      department: e.target.value,
                    })
                  }
                  className="h-9 text-xs bg-card border-border/80 rounded-xl"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5 pt-1">
                <Label className="block text-xs font-bold text-foreground">
                  Roles *
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-border/80 p-2.5 rounded-xl bg-muted/20">
                  {visibleAvailableRoles.map((r) => {
                    const checked = createForm.roleIds.includes(r.id);
                    return (
                      <label
                        key={r.id}
                        className={cn(
                          "flex items-start gap-2.5 p-2 rounded-lg cursor-pointer transition-colors border",
                          checked
                            ? "bg-primary/5 border-primary text-foreground"
                            : "bg-card border-border/60 hover:bg-muted/40 text-muted-foreground",
                        )}
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
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold font-mono text-xs text-foreground">
                            {r.name}
                          </div>
                          <div className="text-[10px] text-muted-foreground leading-snug line-clamp-2">
                            {r.description || "Acceso al módulo"}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCreateModal(false)}
                className="h-8 text-xs cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                {submitting && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                Crear
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
