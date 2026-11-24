"use client";

import { useState, useEffect, useCallback, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PurchasingClientService } from "@/services/purchasing.service";
import { AuthService } from "@/services/auth.service";
import { usePagination } from "@/hooks/use-pagination";
import { TablePagination } from "@/components/common/TablePagination";
import type { Supplier, SupplierType } from "@/types/purchasing";
import { cn } from "@/lib/utils";
import { toast } from "@/utils/toast";
import { RifInput } from "@/components/common/RifInput";
import { PhoneInput } from "@/components/common/PhoneInput";
import {
  validatePhoneValue,
  validateRifValue,
} from "@/utils/venezuela-formatters";
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
  X,
  Ban,
  Save,
  Wrench,
  ShoppingBag,
  Layers,
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

type ActiveTab = "todos" | "activos" | "inactivos";
type TypeFilter = "TODOS" | SupplierType;

const SUPPLIER_TYPE_META: Record<
  SupplierType,
  { label: string; shortLabel: string; className: string }
> = {
  VENTAS: {
    label: "Ventas / Insumos",
    shortLabel: "Ventas",
    className:
      "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  },
  SERVICIOS: {
    label: "Servicios",
    shortLabel: "Servicios",
    className:
      "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  },
  AMBOS: {
    label: "Mixto (Ventas y Servicios)",
    shortLabel: "Mixto",
    className:
      "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-500/20",
  },
};

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("todos");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("TODOS");
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
    supplierType: "VENTAS" as SupplierType,
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
    supplierType: "VENTAS" as SupplierType,
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
    setLoading(true);
    try {
      const data = await PurchasingClientService.getSuppliers({
        includeInactive: true,
      });
      setSuppliers(data);
    } catch {
      // Manejado por interceptor global
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!AuthService.isAuthenticated()) {
      router.replace("/login");
      return;
    }
    void loadSuppliers();
  }, [router, loadSuppliers]);

  // Métricas KPI y contadores
  const metrics = useMemo(() => {
    let activeCount = 0;
    let inactiveCount = 0;
    let ventasCount = 0;
    let serviciosCount = 0;
    let ambosCount = 0;
    suppliers.forEach((s) => {
      if (s.isActive !== false) activeCount++;
      else inactiveCount++;
      const t = s.supplierType || "VENTAS";
      if (t === "SERVICIOS") serviciosCount++;
      else if (t === "AMBOS") ambosCount++;
      else ventasCount++;
    });
    return {
      total: suppliers.length,
      activeCount,
      inactiveCount,
      ventasCount,
      serviciosCount,
      ambosCount,
    };
  }, [suppliers]);

  // Filtrado reactivo en memoria
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const isSupActive = s.isActive !== false;
      if (activeTab === "activos" && !isSupActive) return false;
      if (activeTab === "inactivos" && isSupActive) return false;

      const sType: SupplierType = s.supplierType || "VENTAS";
      if (typeFilter !== "TODOS" && sType !== typeFilter) return false;

      if (search.trim()) {
        const term = search.toLowerCase().trim();
        const rif = (s.rifOrId || s.rif || "").toLowerCase();
        const name = s.name.toLowerCase();
        const contact = (s.contactName || "").toLowerCase();
        const phone = (s.phone || "").toLowerCase();
        const email = (s.email || "").toLowerCase();
        if (
          !rif.includes(term) &&
          !name.includes(term) &&
          !contact.includes(term) &&
          !phone.includes(term) &&
          !email.includes(term)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [suppliers, activeTab, typeFilter, search]);

  // Paginación
  const pagination = usePagination(filteredSuppliers, { initialPageSize: 10 });
  const { resetPage } = pagination;

  useEffect(() => {
    resetPage();
  }, [activeTab, typeFilter, search, resetPage]);

  const handleCreateSupplier = async (e: FormEvent) => {
    e.preventDefault();
    setCreateFeedback(null);

    const rifCheck = validateRifValue(createForm.rifOrId);
    if (!rifCheck.valid) {
      setCreateFeedback({
        status: "error",
        message: rifCheck.error || "Formato de RIF/Cédula inválido.",
      });
      return;
    }

    const phoneCheck = validatePhoneValue(createForm.phone);
    if (!phoneCheck.valid) {
      setCreateFeedback({
        status: "error",
        message: phoneCheck.error || "Formato de teléfono inválido.",
      });
      return;
    }

    setCreateSubmitting(true);

    try {
      await PurchasingClientService.createSupplier({
        rifOrId: createForm.rifOrId.trim(),
        name: createForm.name.trim(),
        supplierType: createForm.supplierType,
        contactName: createForm.contactName.trim() || undefined,
        phone: createForm.phone.trim() || undefined,
        email: createForm.email.trim() || undefined,
        address: createForm.address.trim() || undefined,
      });

      toast.success(`Proveedor "${createForm.name.trim()}" registrado correctamente.`);
      setCreateForm({
        rifOrId: "",
        name: "",
        supplierType: "VENTAS",
        contactName: "",
        phone: "",
        email: "",
        address: "",
      });
      setIsCreateModalOpen(false);
      setCreateFeedback(null);
      await loadSuppliers();
    } catch (err: unknown) {
      let msg =
        "Error al registrar el proveedor. Verifique que el RIF no esté duplicado.";
      if (err && typeof err === "object" && "response" in err) {
        const resErr = err as { response?: { data?: { message?: string } } };
        if (resErr.response?.data?.message) msg = resErr.response.data.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setCreateFeedback({ status: "error", message: msg });
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleOpenEditModal = (sup: Supplier) => {
    setEditingSupplier(sup);
    setEditForm({
      rifOrId: sup.rifOrId || sup.rif || "",
      name: sup.name,
      supplierType: sup.supplierType || "VENTAS",
      contactName: sup.contactName || "",
      phone: sup.phone || "",
      email: sup.email || "",
      address: sup.address || "",
      isActive: sup.isActive !== false,
    });
    setEditFeedback(null);
  };

  const handleUpdateSupplier = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    setEditFeedback(null);

    const rifCheck = validateRifValue(editForm.rifOrId);
    if (!rifCheck.valid) {
      setEditFeedback({
        status: "error",
        message: rifCheck.error || "Formato de RIF/Cédula inválido.",
      });
      return;
    }

    const phoneCheck = validatePhoneValue(editForm.phone);
    if (!phoneCheck.valid) {
      setEditFeedback({
        status: "error",
        message: phoneCheck.error || "Formato de teléfono inválido.",
      });
      return;
    }

    setEditSubmitting(true);

    try {
      await PurchasingClientService.updateSupplier(editingSupplier.id, {
        rifOrId: editForm.rifOrId.trim(),
        name: editForm.name.trim(),
        supplierType: editForm.supplierType,
        contactName: editForm.contactName.trim() || null,
        phone: editForm.phone.trim() || null,
        email: editForm.email.trim() || null,
        address: editForm.address.trim() || null,
        isActive: editForm.isActive,
      });

      toast.success(`Proveedor "${editForm.name.trim()}" actualizado correctamente.`);
      setEditingSupplier(null);
      setEditFeedback(null);
      await loadSuppliers();
    } catch (err: unknown) {
      let msg = "Error al actualizar los datos del proveedor.";
      if (err && typeof err === "object" && "response" in err) {
        const resErr = err as { response?: { data?: { message?: string } } };
        if (resErr.response?.data?.message) msg = resErr.response.data.message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      setEditFeedback({ status: "error", message: msg });
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleOpenDeleteModal = (sup: Supplier) => {
    setDeletingSupplier(sup);
    setDeleteFeedback(null);
  };

  const handleDeleteSupplier = async () => {
    if (!deletingSupplier) return;
    setDeleteFeedback(null);
    setDeleteSubmitting(true);

    try {
      await PurchasingClientService.deleteSupplier(deletingSupplier.id);
      setDeleteFeedback({
        status: "success",
        message: "Proveedor eliminado permanentemente del sistema.",
      });

      await loadSuppliers();

      setTimeout(() => {
        setDeletingSupplier(null);
        setDeleteFeedback(null);
      }, 1000);
    } catch (err: unknown) {
      setDeleteFeedback({
        status: "error",
        message:
          err instanceof Error
            ? err.message
            : "No se puede eliminar el proveedor porque tiene órdenes de compra asociadas. Se recomienda inactivarlo.",
      });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ========================================================
          ENCABEZADO ESTANDARIZADO
         ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            Proveedores
          </h1>
          <p className="text-xs text-muted-foreground">
            Gestión del catálogo de proveedores y casas comerciales
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadSuppliers()}
            disabled={loading}
            className="h-9 gap-1.5 text-xs cursor-pointer shadow-2xs"
            title="Actualizar listado de proveedores"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
            <span>Actualizar</span>
          </Button>

          <Button
            type="button"
            onClick={() => {
              setIsCreateModalOpen(true);
              setCreateFeedback(null);
            }}
            className="h-9 gap-1.5 text-xs font-bold shadow-2xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Proveedor</span>
          </Button>
        </div>
      </div>

      {/* ========================================================
          3 TARJETAS KPI ESTANDARIZADAS
         ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-border shadow-2xs hover:border-primary/40 transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Total Proveedores
            </span>
            <div className="text-2xl font-bold font-mono text-foreground">
              {metrics.total}
            </div>
            <span className="text-[11px] text-muted-foreground block">
              {metrics.ventasCount} ventas · {metrics.serviciosCount} servicios
              {metrics.ambosCount > 0 ? ` · ${metrics.ambosCount} mixto` : ""}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 border-border shadow-2xs hover:border-emerald-500/40 transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Activos
            </span>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {metrics.activeCount}
            </div>
            <span className="text-[11px] text-muted-foreground block">
              Habilitados para compras
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 border-border shadow-2xs hover:border-slate-500/40 transition-all flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Inactivos
            </span>
            <div className="text-2xl font-bold font-mono text-slate-600 dark:text-slate-300">
              {metrics.inactiveCount}
            </div>
            <span className="text-[11px] text-muted-foreground block">
              Desactivados temporalmente
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-slate-500/10 border border-slate-500/20 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
            <Ban className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* ========================================================
          PESTAÑAS Y BUSCADOR
         ======================================================== */}
      <Card className="p-4 border-border shadow-2xs space-y-3.5">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("todos")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0",
              activeTab === "todos"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <span>Todos</span>
            <Badge
              variant={activeTab === "todos" ? "secondary" : "outline"}
              className="text-[10px] px-1.5 py-0 font-mono"
            >
              {metrics.total}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("activos")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0",
              activeTab === "activos"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <span>Activos</span>
            <Badge
              variant={activeTab === "activos" ? "secondary" : "outline"}
              className="text-[10px] px-1.5 py-0 font-mono"
            >
              {metrics.activeCount}
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("inactivos")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg font-semibold transition-all cursor-pointer flex items-center gap-2 shrink-0",
              activeTab === "inactivos"
                ? "bg-slate-600 text-white shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <span>Inactivos</span>
            <Badge
              variant={activeTab === "inactivos" ? "secondary" : "outline"}
              className="text-[10px] px-1.5 py-0 font-mono"
            >
              {metrics.inactiveCount}
            </Badge>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por RIF, razón social, contacto, teléfono o correo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-8 text-xs h-9 bg-background"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                title="Borrar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              aria-label="Filtrar por tipo de proveedor"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="h-9 bg-background border border-input rounded-md px-2.5 text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring cursor-pointer"
            >
              <option value="TODOS">Todos los tipos ({metrics.total})</option>
              <option value="VENTAS">
                Ventas / Insumos ({metrics.ventasCount})
              </option>
              <option value="SERVICIOS">
                Servicios ({metrics.serviciosCount})
              </option>
              <option value="AMBOS">
                Mixto - Ambos ({metrics.ambosCount})
              </option>
            </select>

            {(search || typeFilter !== "TODOS") && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setTypeFilter("TODOS");
                }}
                className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-9 cursor-pointer"
                title="Limpiar filtros"
              >
                <X className="w-3.5 h-3.5" />
                <span>Limpiar</span>
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* ========================================================
          TABLA DE PROVEEDORES
         ======================================================== */}
      <Card className="overflow-hidden border-border shadow-2xs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="py-3 px-4 font-semibold text-xs">RIF / ID</TableHead>
                <TableHead className="py-3 px-4 font-semibold text-xs">Razón Social</TableHead>
                <TableHead className="py-3 px-4 text-center font-semibold text-xs">Tipo</TableHead>
                <TableHead className="py-3 px-4 font-semibold text-xs">Contacto</TableHead>
                <TableHead className="py-3 px-4 font-semibold text-xs">Teléfono</TableHead>
                <TableHead className="py-3 px-4 font-semibold text-xs">Correo</TableHead>
                <TableHead className="py-3 px-4 text-center font-semibold text-xs">Estado</TableHead>
                <TableHead className="py-3 px-4 text-center font-semibold text-xs">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground text-xs">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-primary mb-2" />
                    Cargando proveedores...
                  </TableCell>
                </TableRow>
              ) : filteredSuppliers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-muted-foreground text-xs">
                    No se encontraron proveedores registrados.
                  </TableCell>
                </TableRow>
              ) : (
                pagination.paginatedItems.map((sup) => {
                  const isSupActive = sup.isActive !== false;
                  const sType: SupplierType = sup.supplierType || "VENTAS";
                  const typeMeta = SUPPLIER_TYPE_META[sType];
                  return (
                    <TableRow
                      key={sup.id}
                      className="hover:bg-muted/40 transition-colors text-xs"
                    >
                      <TableCell className="py-3 px-4 font-mono font-bold text-foreground whitespace-nowrap">
                        {sup.rifOrId || sup.rif || "-"}
                      </TableCell>
                      <TableCell className="py-3 px-4">
                        <Link
                          href={`/purchasing/suppliers/${sup.id}`}
                          className="font-semibold text-foreground hover:text-primary hover:underline block"
                        >
                          {sup.name}
                        </Link>
                        {sup.address && (
                          <div
                            className="text-[11px] text-muted-foreground truncate max-w-xs"
                            title={sup.address}
                          >
                            {sup.address}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={cn("text-[10px] gap-1 font-semibold", typeMeta.className)}
                        >
                          {sType === "SERVICIOS" ? (
                            <Wrench className="w-2.5 h-2.5" />
                          ) : sType === "AMBOS" ? (
                            <Layers className="w-2.5 h-2.5" />
                          ) : (
                            <ShoppingBag className="w-2.5 h-2.5" />
                          )}
                          {typeMeta.shortLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          {sup.contactName || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-muted-foreground font-mono whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          {sup.phone || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          {sup.email || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center whitespace-nowrap">
                        <Badge
                          variant={isSupActive ? "success" : "secondary"}
                          className={cn(
                            "text-[11px]",
                            isSupActive
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                              : "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
                          )}
                        >
                          {isSupActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs font-semibold gap-1 cursor-pointer"
                            title="Ver ficha técnica y órdenes"
                          >
                            <Link href={`/purchasing/suppliers/${sup.id}`}>
                              <Eye className="w-3.5 h-3.5" />
                              Ver
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditModal(sup)}
                            className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Editar proveedor"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenDeleteModal(sup)}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                              title="Eliminar proveedor"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
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
        <TablePagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
          pageSizeOptions={[10, 25, 50, 100]}
          entityName="proveedores"
        />
      </Card>

      {/* Modal: Registrar Proveedor */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0">
          <DialogHeader className="p-5 border-b border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Registrar Proveedor
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Agregue un nuevo proveedor al catálogo de compras
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreateSupplier}>
            <div className="p-5 space-y-4">
              {createFeedback && (
                <Alert variant={createFeedback.status === "success" ? "success" : "destructive"}>
                  {createFeedback.status === "success" ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <AlertDescription className="text-xs">{createFeedback.message}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Tipo de Proveedor *
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      {
                        value: "VENTAS",
                        label: "Ventas / Insumos",
                        icon: ShoppingBag,
                      },
                      { value: "SERVICIOS", label: "Servicios", icon: Wrench },
                      { value: "AMBOS", label: "Ambos (Mixto)", icon: Layers },
                    ] as const
                  ).map((opt) => {
                    const Icon = opt.icon;
                    const active = createForm.supplierType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setCreateForm({
                            ...createForm,
                            supplierType: opt.value,
                          })
                        }
                        className={cn(
                          "px-2.5 py-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                          active
                            ? "border-primary bg-primary/10 text-primary shadow-2xs"
                            : "border-input bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    RIF / Cédula *
                  </Label>
                  <RifInput
                    value={createForm.rifOrId}
                    onChange={(val) =>
                      setCreateForm({ ...createForm, rifOrId: val })
                    }
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Razón Social / Nombre *
                  </Label>
                  <Input
                    type="text"
                    value={createForm.name}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, name: e.target.value })
                    }
                    placeholder="Nombre comercial, empresa o persona"
                    className="text-xs h-9"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Contacto
                  </Label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      value={createForm.contactName}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          contactName: e.target.value,
                        })
                      }
                      placeholder="Representante o contacto"
                      className="pl-8 text-xs h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Teléfono
                  </Label>
                  <PhoneInput
                    value={createForm.phone}
                    onChange={(val) =>
                      setCreateForm({ ...createForm, phone: val })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Correo Electrónico
                </Label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    value={createForm.email}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, email: e.target.value })
                    }
                    placeholder="ventas@proveedor.com"
                    className="pl-8 text-xs h-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" />
                  Dirección Fiscal o Almacén
                </Label>
                <Textarea
                  rows={2}
                  value={createForm.address}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, address: e.target.value })
                  }
                  placeholder="Ubicación física o ciudad..."
                  className="resize-none text-xs"
                />
              </div>
            </div>

            <DialogFooter className="px-5 py-3.5 border-t border-border bg-muted/20 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCreateModalOpen(false)}
                className="h-9 text-xs cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createSubmitting}
                className="h-9 text-xs font-semibold gap-1.5 cursor-pointer"
              >
                {createSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                {createSubmitting ? "Guardando..." : "Guardar Proveedor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Editar Proveedor */}
      <Dialog
        open={Boolean(editingSupplier)}
        onOpenChange={(open) => {
          if (!open) setEditingSupplier(null);
        }}
      >
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0">
          <DialogHeader className="p-5 border-b border-border bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                <Pencil className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-foreground truncate">
                  Editar Proveedor
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground font-mono truncate">
                  {editingSupplier?.name}
                  {(editingSupplier?.rifOrId || editingSupplier?.rif) &&
                    ` · ${editingSupplier?.rifOrId || editingSupplier?.rif}`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleUpdateSupplier}>
            <div className="p-5 space-y-4">
              {editFeedback && (
                <Alert variant={editFeedback.status === "success" ? "success" : "destructive"}>
                  {editFeedback.status === "success" ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <AlertDescription className="text-xs">{editFeedback.message}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Tipo de Proveedor *
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      {
                        value: "VENTAS",
                        label: "Ventas / Insumos",
                        icon: ShoppingBag,
                      },
                      { value: "SERVICIOS", label: "Servicios", icon: Wrench },
                      { value: "AMBOS", label: "Ambos (Mixto)", icon: Layers },
                    ] as const
                  ).map((opt) => {
                    const Icon = opt.icon;
                    const active = editForm.supplierType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setEditForm({
                            ...editForm,
                            supplierType: opt.value,
                          })
                        }
                        className={cn(
                          "px-2.5 py-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer",
                          active
                            ? "border-primary bg-primary/10 text-primary shadow-2xs"
                            : "border-input bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    RIF / Cédula *
                  </Label>
                  <RifInput
                    value={editForm.rifOrId}
                    onChange={(val) =>
                      setEditForm({ ...editForm, rifOrId: val })
                    }
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Razón Social / Nombre *
                  </Label>
                  <Input
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    placeholder="Nombre comercial o empresa"
                    className="text-xs h-9"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Contacto
                  </Label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      value={editForm.contactName}
                      onChange={(e) =>
                        setEditForm({ ...editForm, contactName: e.target.value })
                      }
                      placeholder="Representante"
                      className="pl-8 text-xs h-9"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Teléfono
                  </Label>
                  <PhoneInput
                    value={editForm.phone}
                    onChange={(val) =>
                      setEditForm({ ...editForm, phone: val })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Correo Electrónico
                </Label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                    placeholder="contacto@proveedor.com"
                    className="pl-8 text-xs h-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" />
                  Dirección Fiscal o Almacén
                </Label>
                <Textarea
                  rows={2}
                  value={editForm.address}
                  onChange={(e) =>
                    setEditForm({ ...editForm, address: e.target.value })
                  }
                  placeholder="Ubicación..."
                  className="resize-none text-xs"
                />
              </div>

              {/* Tarjeta interactiva de Estado Activo / Inactivo */}
              <div
                className={cn(
                  "rounded-xl border p-3.5 flex items-center justify-between gap-3 transition-colors",
                  editForm.isActive
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : "bg-muted/30 border-border"
                )}
              >
                <div className="flex items-start gap-2.5">
                  <Checkbox
                    id="edit-supplier-active"
                    checked={editForm.isActive}
                    onCheckedChange={(checked) =>
                      setEditForm({ ...editForm, isActive: checked === true })
                    }
                    className="mt-0.5"
                  />
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="edit-supplier-active"
                      className="text-xs font-semibold text-foreground cursor-pointer block"
                    >
                      Proveedor habilitado para compras
                    </Label>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      Desactívelo para ocultarlo en nuevas órdenes sin perder su historial.
                    </p>
                  </div>
                </div>
                <Badge
                  variant={editForm.isActive ? "success" : "secondary"}
                  className={cn(
                    "text-[11px] shrink-0",
                    editForm.isActive
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
                  )}
                >
                  {editForm.isActive ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </div>

            <DialogFooter className="px-5 py-3.5 border-t border-border bg-muted/20 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingSupplier(null)}
                className="h-9 text-xs cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={editSubmitting}
                className="h-9 text-xs font-semibold gap-1.5 cursor-pointer"
              >
                {editSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {editSubmitting ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmación de Eliminación */}
      <Dialog
        open={Boolean(deletingSupplier)}
        onOpenChange={(open) => {
          if (!open) setDeletingSupplier(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 text-destructive rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Eliminar Proveedor
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Verificación de integridad referencial
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="text-xs text-muted-foreground space-y-3">
            <p>
              ¿Está seguro de eliminar permanentemente al proveedor{" "}
              <strong className="text-foreground">
                {deletingSupplier?.name}
              </strong>{" "}
              (
              <span className="font-mono font-medium text-foreground">
                {deletingSupplier?.rifOrId || deletingSupplier?.rif}
              </span>
              )?
            </p>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
              <strong>Aviso:</strong> Si el proveedor tiene Órdenes de Compra u Órdenes de Servicio registradas, la eliminación será rechazada y deberá inactivarlo.
            </div>
          </div>

          {deleteFeedback && (
            <Alert variant={deleteFeedback.status === "success" ? "success" : "destructive"}>
              {deleteFeedback.status === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <div className="space-y-1">
                <AlertDescription className="text-xs font-semibold">
                  {deleteFeedback.message}
                </AlertDescription>
                {deleteFeedback.status === "error" && (
                  <button
                    type="button"
                    onClick={() => {
                      const sup = deletingSupplier;
                      setDeletingSupplier(null);
                      if (sup) handleOpenEditModal(sup);
                    }}
                    className="text-[11px] underline hover:text-destructive cursor-pointer"
                  >
                    Ir a editar para inactivarlo
                  </button>
                )}
              </div>
            </Alert>
          )}

          <DialogFooter className="gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingSupplier(null)}
              disabled={deleteSubmitting}
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDeleteSupplier}
              disabled={deleteSubmitting}
              className="gap-2 cursor-pointer"
            >
              {deleteSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {deleteSubmitting ? "Verificando..." : "Confirmar Eliminación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
