"use client";

import React, { useState, useEffect, useTransition, useMemo, useCallback } from "react";
import {
  InventoryMasterService,
  CategoryItem,
  Brand,
  Unit,
  LocationItem,
  LocationAreaType,
  DepartmentItem,
  PaymentMethodItem,
} from "@/services/inventory-master.service";
import {
  BankAccountService,
  BankAccountItem,
} from "@/services/bank-account.service";
import { AuthService } from "@/services/auth.service";
import { useDebounce } from "@/hooks/use-debounce";
import type { AuthUser } from "@/types/auth";
import { cn } from "@/lib/utils";
import {
  FolderTree,
  Tag,
  Scale,
  MapPin,
  Building2,
  Landmark,
  CreditCard,
  Plus,
  Loader2,
  Search,
  Pencil,
  Trash2,
  SlidersHorizontal,
  X,
  RefreshCw,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type TabType =
  | "categories"
  | "brands"
  | "units"
  | "locations"
  | "departments"
  | "accounts"
  | "paymentMethods";

const LOCATION_TYPE_LABELS: Record<LocationAreaType, string> = {
  ALMACEN_GENERAL: "Almacén General",
  LABORATORIO: "Laboratorio",
  DEPOSITO: "Depósito",
  OFICINA: "Oficina",
};

export default function InventorySettingsPage() {
  const [currentUser] = useState<AuthUser | null>(() =>
    AuthService.getCurrentUser(),
  );
  const userRoles = currentUser?.roles || [];
  const isAdmin = userRoles.includes("ADMINISTRADOR");
  const canManageBankAccounts = isAdmin || userRoles.includes("ADMINISTRACION");

  const [tab, setTab] = useState<TabType>("categories");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [, startTransition] = useTransition();

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Datos maestros
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>([]);

  // Modal y estado de edición
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [editingBankAccount, setEditingBankAccount] =
    useState<BankAccountItem | null>(null);
  const [bankAccountForm, setBankAccountForm] = useState({
    bankName: "",
    accountNumber: "",
    type: "CORRIENTE",
    currency: "VED",
    holderName: "INSTITUTO DE INMUNOLOGÍA CLÍNICA IDI C.A.",
    holderId: "J-12345678-0",
    isActive: true,
  });

  const [editingPaymentMethod, setEditingPaymentMethod] =
    useState<PaymentMethodItem | null>(null);
  const [paymentMethodForm, setPaymentMethodForm] = useState({
    code: "",
    name: "",
    description: "",
    isActive: true,
  });

  const [editingDepartment, setEditingDepartment] =
    useState<DepartmentItem | null>(null);
  const [departmentForm, setDepartmentForm] = useState({
    code: "",
    name: "",
    description: "",
    isActive: true,
  });

  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(
    null,
  );
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    code: "",
  });

  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandForm, setBrandForm] = useState({ name: "", description: "" });

  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitForm, setUnitForm] = useState({ name: "", abbreviation: "" });

  const [editingLocation, setEditingLocation] = useState<LocationItem | null>(
    null,
  );
  const [locForm, setLocForm] = useState<{
    name: string;
    type: LocationAreaType;
    description: string;
  }>({
    name: "",
    type: "ALMACEN_GENERAL",
    description: "",
  });

  const loadData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const [c, b, u, l, d, a, pm] = await Promise.all([
        InventoryMasterService.getCategories(),
        InventoryMasterService.getBrands(),
        InventoryMasterService.getUnits(),
        InventoryMasterService.getLocations(),
        InventoryMasterService.getDepartments(),
        BankAccountService.getBankAccounts(),
        InventoryMasterService.getPaymentMethods(),
      ]);
      setCategories(c);
      setBrands(b);
      setUnits(u);
      setLocations(l);
      setDepartments(d);
      setBankAccounts(a);
      setPaymentMethods(pm);
    } catch {
      toast.error("Error al cargar maestros");
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

  // Listas filtradas reactivas
  const q = debouncedSearch.toLowerCase().trim();

  const filteredCategories = useMemo(
    () =>
      categories.filter(
        (c) =>
          !q ||
          c.name.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q)) ||
          (c.code && c.code.toLowerCase().includes(q)),
      ),
    [categories, q],
  );

  const filteredBrands = useMemo(
    () =>
      brands.filter(
        (b) =>
          !q ||
          b.name.toLowerCase().includes(q) ||
          (b.description && b.description.toLowerCase().includes(q)),
      ),
    [brands, q],
  );

  const filteredUnits = useMemo(
    () =>
      units.filter(
        (u) =>
          !q ||
          u.name.toLowerCase().includes(q) ||
          u.abbreviation.toLowerCase().includes(q),
      ),
    [units, q],
  );

  const filteredLocations = useMemo(
    () =>
      locations.filter(
        (l) =>
          !q ||
          l.name.toLowerCase().includes(q) ||
          (l.description && l.description.toLowerCase().includes(q)) ||
          l.type.toLowerCase().includes(q),
      ),
    [locations, q],
  );

  const filteredDepartments = useMemo(
    () =>
      departments.filter(
        (d) =>
          !q ||
          d.name.toLowerCase().includes(q) ||
          d.code.toLowerCase().includes(q) ||
          (d.description && d.description.toLowerCase().includes(q)),
      ),
    [departments, q],
  );

  const filteredAccounts = useMemo(
    () =>
      bankAccounts.filter(
        (a) =>
          !q ||
          a.bankName.toLowerCase().includes(q) ||
          (a.accountNumber && a.accountNumber.toLowerCase().includes(q)) ||
          a.holderName.toLowerCase().includes(q) ||
          a.holderId.toLowerCase().includes(q) ||
          a.currency.toLowerCase().includes(q),
      ),
    [bankAccounts, q],
  );

  const filteredPaymentMethods = useMemo(
    () =>
      paymentMethods.filter(
        (pm) =>
          !q ||
          pm.name.toLowerCase().includes(q) ||
          pm.code.toLowerCase().includes(q) ||
          (pm.description && pm.description.toLowerCase().includes(q)),
      ),
    [paymentMethods, q],
  );

  const currentFilteredCount = useMemo(() => {
    switch (tab) {
      case "categories":
        return filteredCategories.length;
      case "brands":
        return filteredBrands.length;
      case "units":
        return filteredUnits.length;
      case "locations":
        return filteredLocations.length;
      case "departments":
        return filteredDepartments.length;
      case "accounts":
        return filteredAccounts.length;
      case "paymentMethods":
        return filteredPaymentMethods.length;
      default:
        return 0;
    }
  }, [
    tab,
    filteredCategories,
    filteredBrands,
    filteredUnits,
    filteredLocations,
    filteredDepartments,
    filteredAccounts,
    filteredPaymentMethods,
  ]);

  const totalPages = Math.max(1, Math.ceil(currentFilteredCount / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const sliceStart = (safeCurrentPage - 1) * pageSize;
  const sliceEnd = safeCurrentPage * pageSize;

  // --- Apertura de Modales ---
  const handleOpenCreateModal = () => {
    if (tab === "accounts") {
      setEditingBankAccount(null);
      setBankAccountForm({
        bankName: "",
        accountNumber: "",
        type: "CORRIENTE",
        currency: "VED",
        holderName: "INSTITUTO DE INMUNOLOGÍA CLÍNICA IDI C.A.",
        holderId: "J-12345678-0",
        isActive: true,
      });
    } else if (tab === "paymentMethods") {
      setEditingPaymentMethod(null);
      setPaymentMethodForm({
        code: "",
        name: "",
        description: "",
        isActive: true,
      });
    } else if (tab === "departments") {
      setEditingDepartment(null);
      setDepartmentForm({ code: "", name: "", description: "", isActive: true });
    } else if (tab === "categories") {
      setEditingCategory(null);
      setCategoryForm({ name: "", description: "", code: "" });
    } else if (tab === "brands") {
      setEditingBrand(null);
      setBrandForm({ name: "", description: "" });
    } else if (tab === "units") {
      setEditingUnit(null);
      setUnitForm({ name: "", abbreviation: "" });
    } else {
      setEditingLocation(null);
      setLocForm({ name: "", type: "ALMACEN_GENERAL", description: "" });
    }
    setShowModal(true);
  };

  const handleOpenEditPaymentMethod = (pm: PaymentMethodItem) => {
    setEditingPaymentMethod(pm);
    setPaymentMethodForm({
      code: pm.code,
      name: pm.name,
      description: pm.description || "",
      isActive: pm.isActive,
    });
    setShowModal(true);
  };

  const handleOpenEditDepartment = (dep: DepartmentItem) => {
    setEditingDepartment(dep);
    setDepartmentForm({
      code: dep.code,
      name: dep.name,
      description: dep.description || "",
      isActive: dep.isActive,
    });
    setShowModal(true);
  };

  const handleOpenEditCategory = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      description: cat.description || "",
      code: cat.code || "",
    });
    setShowModal(true);
  };

  const handleOpenEditBrand = (brand: Brand) => {
    setEditingBrand(brand);
    setBrandForm({
      name: brand.name,
      description: brand.description || "",
    });
    setShowModal(true);
  };

  const handleOpenEditUnit = (unit: Unit) => {
    setEditingUnit(unit);
    setUnitForm({
      name: unit.name,
      abbreviation: unit.abbreviation,
    });
    setShowModal(true);
  };

  const handleOpenEditLocation = (loc: LocationItem) => {
    setEditingLocation(loc);
    setLocForm({
      name: loc.name,
      type: loc.type,
      description: loc.description || "",
    });
    setShowModal(true);
  };

  const handleOpenEditBankAccount = (acc: BankAccountItem) => {
    setEditingBankAccount(acc);
    setBankAccountForm({
      bankName: acc.bankName,
      accountNumber: acc.accountNumber || "",
      type: acc.type || "CORRIENTE",
      currency: acc.currency || "VED",
      holderName: acc.holderName,
      holderId: acc.holderId,
      isActive: acc.isActive,
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBankAccount(null);
    setEditingPaymentMethod(null);
    setEditingDepartment(null);
    setEditingCategory(null);
    setEditingBrand(null);
    setEditingUnit(null);
    setEditingLocation(null);
  };

  // --- Cambios de estado y eliminaciones ---
  const handleTogglePaymentMethodStatus = async (pm: PaymentMethodItem) => {
    if (!isAdmin) return;
    try {
      const updated = await InventoryMasterService.updatePaymentMethod(pm.id, {
        isActive: !pm.isActive,
      });
      setPaymentMethods((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      toast.success(
        `Método "${pm.name}" ${updated.isActive ? "activado" : "desactivado"}`,
      );
    } catch {
      toast.error("Error al actualizar el método de pago");
    }
  };

  const handleDeletePaymentMethod = async (pm: PaymentMethodItem) => {
    if (!isAdmin) return;
    const confirmed = window.confirm(
      `¿Eliminar el método de pago "${pm.name}"?`,
    );
    if (!confirmed) return;

    try {
      await InventoryMasterService.deletePaymentMethod(pm.id);
      setPaymentMethods((prev) => prev.filter((item) => item.id !== pm.id));
      toast.success(`Método "${pm.name}" eliminado`);
    } catch {
      toast.error("Error al eliminar el método de pago");
    }
  };

  const handleToggleBankAccountStatus = async (acc: BankAccountItem) => {
    if (!canManageBankAccounts) return;
    try {
      const updated = await BankAccountService.updateBankAccount(acc.id, {
        isActive: !acc.isActive,
      });
      setBankAccounts((prev) =>
        prev.map((a) =>
          a.id === updated.id ? { ...a, isActive: updated.isActive } : a,
        ),
      );
      toast.success(
        `Banco "${acc.bankName}" ${updated.isActive ? "activado" : "desactivado"}`,
      );
    } catch {
      toast.error("Error al cambiar el estado del banco");
    }
  };

  const handleDeleteBankAccount = async (acc: BankAccountItem) => {
    if (!isAdmin) return;
    const confirmed = window.confirm(
      `¿Eliminar o desactivar el banco "${acc.bankName}"?`,
    );
    if (!confirmed) return;

    try {
      await BankAccountService.deleteBankAccount(acc.id);
      setBankAccounts((prev) =>
        prev.map((a) => (a.id === acc.id ? { ...a, isActive: false } : a)),
      );
      toast.success(`Banco "${acc.bankName}" desactivado`);
    } catch {
      toast.error("Error al eliminar el banco");
    }
  };

  const handleToggleDepartmentStatus = async (dep: DepartmentItem) => {
    if (!isAdmin) return;
    try {
      const updated = await InventoryMasterService.updateDepartment(dep.id, {
        isActive: !dep.isActive,
      });
      setDepartments((prev) =>
        prev.map((d) =>
          d.id === updated.id ? { ...d, isActive: updated.isActive } : d,
        ),
      );
      toast.success(
        `Departamento "${dep.name}" ${updated.isActive ? "activado" : "desactivado"}`,
      );
    } catch {
      toast.error("Error al cambiar el estado del departamento");
    }
  };

  const handleDeleteDepartment = async (dep: DepartmentItem) => {
    if (!isAdmin) return;
    const reqs = dep._count?.requests || 0;
    const preorders = dep._count?.purchaseRequisitions || 0;
    if (reqs > 0 || preorders > 0) {
      toast.error(
        `No se puede eliminar "${dep.name}": tiene ${reqs} solicitud(es) o preórdenes asociadas.`,
      );
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar el departamento "${dep.name}"?`,
    );
    if (!confirmed) return;

    try {
      await InventoryMasterService.deleteDepartment(dep.id);
      setDepartments((prev) => prev.filter((item) => item.id !== dep.id));
      toast.success(`Departamento "${dep.name}" eliminado`);
    } catch {
      toast.error("Error al eliminar el departamento");
    }
  };

  const handleDeleteCategory = async (cat: CategoryItem) => {
    if (!isAdmin) return;
    const count = cat._count?.products || 0;
    if (count > 0) {
      toast.error(
        `No se puede eliminar "${cat.name}": tiene ${count} insumo(s) asociados.`,
      );
      return;
    }

    const confirmed = window.confirm(`¿Eliminar la categoría "${cat.name}"?`);
    if (!confirmed) return;

    try {
      await InventoryMasterService.deleteCategory(cat.id);
      setCategories((prev) => prev.filter((item) => item.id !== cat.id));
      toast.success(`Categoría "${cat.name}" eliminada`);
    } catch {
      toast.error("Error al eliminar la categoría");
    }
  };

  const handleDeleteBrand = async (brand: Brand) => {
    if (!isAdmin) return;
    const count = brand._count?.products || 0;
    if (count > 0) {
      toast.error(
        `No se puede eliminar "${brand.name}": tiene ${count} insumo(s) asociados.`,
      );
      return;
    }

    const confirmed = window.confirm(`¿Eliminar la marca "${brand.name}"?`);
    if (!confirmed) return;

    try {
      await InventoryMasterService.deleteBrand(brand.id);
      setBrands((prev) => prev.filter((item) => item.id !== brand.id));
      toast.success(`Marca "${brand.name}" eliminada`);
    } catch {
      toast.error("Error al eliminar la marca");
    }
  };

  const handleDeleteUnit = async (unit: Unit) => {
    if (!isAdmin) return;
    const count =
      (unit._count?.baseProducts || 0) + (unit._count?.purchProducts || 0);
    if (count > 0) {
      toast.error(
        `No se puede eliminar "${unit.name}": tiene ${count} insumo(s) asociados.`,
      );
      return;
    }

    const confirmed = window.confirm(
      `¿Eliminar la unidad "${unit.name}" (${unit.abbreviation})?`,
    );
    if (!confirmed) return;

    try {
      await InventoryMasterService.deleteUnit(unit.id);
      setUnits((prev) => prev.filter((item) => item.id !== unit.id));
      toast.success(`Unidad "${unit.name}" eliminada`);
    } catch {
      toast.error("Error al eliminar la unidad");
    }
  };

  const handleDeleteLocation = async (loc: LocationItem) => {
    if (!isAdmin) return;
    const batches = loc._count?.stockBatches || 0;
    const fridges = loc._count?.fridges || 0;
    if (batches > 0 || fridges > 0) {
      toast.error(
        `No se puede eliminar "${loc.name}": tiene ${batches} lote(s) asociados.`,
      );
      return;
    }

    const confirmed = window.confirm(`¿Eliminar la ubicación "${loc.name}"?`);
    if (!confirmed) return;

    try {
      await InventoryMasterService.deleteLocation(loc.id);
      setLocations((prev) => prev.filter((item) => item.id !== loc.id));
      toast.success(`Ubicación "${loc.name}" eliminada`);
    } catch {
      toast.error("Error al eliminar la ubicación");
    }
  };

  // --- Envío del Formulario (Crear / Editar) ---
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAdmin && !(tab === "accounts" && canManageBankAccounts)) return;
    setSubmitting(true);

    try {
      if (tab === "accounts") {
        if (editingBankAccount) {
          const updated = await BankAccountService.updateBankAccount(
            editingBankAccount.id,
            bankAccountForm,
          );
          setBankAccounts((prev) =>
            prev.map((a) => (a.id === updated.id ? updated : a)),
          );
          toast.success("Banco actualizado");
        } else {
          const created =
            await BankAccountService.createBankAccount(bankAccountForm);
          setBankAccounts((prev) => [...prev, created]);
          toast.success("Banco creado");
        }
      } else if (tab === "paymentMethods") {
        if (editingPaymentMethod) {
          const updated = await InventoryMasterService.updatePaymentMethod(
            editingPaymentMethod.id,
            paymentMethodForm,
          );
          setPaymentMethods((prev) =>
            prev.map((pm) => (pm.id === updated.id ? updated : pm)),
          );
          toast.success("Método de pago actualizado");
        } else {
          const created =
            await InventoryMasterService.createPaymentMethod(paymentMethodForm);
          setPaymentMethods((prev) => [...prev, created]);
          toast.success("Método de pago creado");
        }
      } else if (tab === "departments") {
        if (editingDepartment) {
          const updated = await InventoryMasterService.updateDepartment(
            editingDepartment.id,
            departmentForm,
          );
          setDepartments((prev) =>
            prev.map((d) => (d.id === updated.id ? updated : d)),
          );
          toast.success("Departamento actualizado");
        } else {
          const created =
            await InventoryMasterService.createDepartment(departmentForm);
          setDepartments((prev) => [...prev, created]);
          toast.success("Departamento creado");
        }
      } else if (tab === "categories") {
        if (editingCategory) {
          const updated = await InventoryMasterService.updateCategory(
            editingCategory.id,
            categoryForm,
          );
          setCategories((prev) =>
            prev.map((c) => (c.id === updated.id ? updated : c)),
          );
          toast.success("Categoría actualizada");
        } else {
          const created =
            await InventoryMasterService.createCategory(categoryForm);
          setCategories((prev) => [...prev, created]);
          toast.success("Categoría creada");
        }
      } else if (tab === "brands") {
        if (editingBrand) {
          const updated = await InventoryMasterService.updateBrand(
            editingBrand.id,
            brandForm,
          );
          setBrands((prev) =>
            prev.map((b) => (b.id === updated.id ? updated : b)),
          );
          toast.success("Marca actualizada");
        } else {
          const created = await InventoryMasterService.createBrand(brandForm);
          setBrands((prev) => [...prev, created]);
          toast.success("Marca creada");
        }
      } else if (tab === "units") {
        if (editingUnit) {
          const updated = await InventoryMasterService.updateUnit(
            editingUnit.id,
            unitForm,
          );
          setUnits((prev) =>
            prev.map((u) => (u.id === updated.id ? updated : u)),
          );
          toast.success("Unidad actualizada");
        } else {
          const created = await InventoryMasterService.createUnit(unitForm);
          setUnits((prev) => [...prev, created]);
          toast.success("Unidad creada");
        }
      } else {
        if (editingLocation) {
          const updated = await InventoryMasterService.updateLocation(
            editingLocation.id,
            locForm,
          );
          setLocations((prev) =>
            prev.map((l) => (l.id === updated.id ? updated : l)),
          );
          toast.success("Ubicación actualizada");
        } else {
          const created = await InventoryMasterService.createLocation(locForm);
          setLocations((prev) => [...prev, created]);
          toast.success("Ubicación creada");
        }
      }
      handleCloseModal();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const resErr = err as { response?: { data?: { message?: string } } };
        toast.error(
          resErr.response?.data?.message ?? "Error al guardar el registro",
        );
      } else if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Error al guardar el registro");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getCreateButtonLabel = () => {
    switch (tab) {
      case "categories":
        return "Nueva Categoría";
      case "brands":
        return "Nueva Marca";
      case "units":
        return "Nueva Unidad";
      case "locations":
        return "Nueva Ubicación";
      case "departments":
        return "Nuevo Departamento";
      case "accounts":
        return "Nuevo Banco";
      case "paymentMethods":
        return "Nuevo Método";
    }
  };

  const getModalTitle = () => {
    switch (tab) {
      case "categories":
        return editingCategory ? "Editar Categoría" : "Nueva Categoría";
      case "brands":
        return editingBrand ? "Editar Marca" : "Nueva Marca";
      case "units":
        return editingUnit ? "Editar Unidad" : "Nueva Unidad";
      case "locations":
        return editingLocation ? "Editar Ubicación" : "Nueva Ubicación";
      case "departments":
        return editingDepartment ? "Editar Departamento" : "Nuevo Departamento";
      case "accounts":
        return editingBankAccount ? "Editar Banco" : "Nuevo Banco";
      case "paymentMethods":
        return editingPaymentMethod
          ? "Editar Método de Pago"
          : "Nuevo Método de Pago";
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
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Maestros
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Catálogos de almacén, departamentos, bancos y métodos de pago
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
              className={cn(
                "w-3.5 h-3.5",
                refreshing && "animate-spin text-primary",
              )}
            />
            Actualizar
          </Button>

          {(isAdmin || (tab === "accounts" && canManageBankAccounts)) && (
            <Button
              type="button"
              size="sm"
              onClick={handleOpenCreateModal}
              className="h-8 text-xs gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {getCreateButtonLabel()}
            </Button>
          )}
        </div>
      </div>

      {/* ========================================================
          PESTAÑAS + BUSCADOR
         ======================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <Tabs
          value={tab}
          onValueChange={(val) => {
            setTab(val as TabType);
            setSearch("");
            setCurrentPage(1);
          }}
          className="w-full lg:w-auto"
        >
          <TabsList className="bg-muted/70 p-1 rounded-xl h-auto flex flex-wrap gap-1 justify-start border border-border/60">
            <TabsTrigger
              value="categories"
              className="gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs cursor-pointer"
            >
              <FolderTree className="w-3.5 h-3.5" />
              Categorías ({categories.length})
            </TabsTrigger>
            <TabsTrigger
              value="brands"
              className="gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs cursor-pointer"
            >
              <Tag className="w-3.5 h-3.5" />
              Marcas ({brands.length})
            </TabsTrigger>
            <TabsTrigger
              value="units"
              className="gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs cursor-pointer"
            >
              <Scale className="w-3.5 h-3.5" />
              Unidades ({units.length})
            </TabsTrigger>
            <TabsTrigger
              value="locations"
              className="gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5" />
              Ubicaciones ({locations.length})
            </TabsTrigger>
            <TabsTrigger
              value="departments"
              className="gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400 data-[state=active]:shadow-xs cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5" />
              Departamentos ({departments.length})
            </TabsTrigger>
            <TabsTrigger
              value="accounts"
              className="gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-xs cursor-pointer"
            >
              <Landmark className="w-3.5 h-3.5" />
              Bancos ({bankAccounts.length})
            </TabsTrigger>
            <TabsTrigger
              value="paymentMethods"
              className="gap-1.5 py-1.5 px-3 text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 data-[state=active]:shadow-xs cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Métodos de Pago ({paymentMethods.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full lg:w-72 shrink-0">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar..."
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
      </div>

      {/* ========================================================
          TABLA ESTANDARIZADA POR PESTAÑA
         ======================================================== */}
      <Card className="overflow-hidden border-border/80 shadow-2xs">
        {loading ? (
          <div className="h-64 flex flex-col justify-center items-center gap-2">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Cargando maestros...</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20">
                  {tab === "categories" && (
                    <>
                      <TableHead className="py-3 px-4 text-xs font-bold">
                        Categoría
                      </TableHead>
                      <TableHead className="py-3 px-4 text-xs font-bold">
                        Código
                      </TableHead>
                      <TableHead className="py-3 px-4 text-xs font-bold">
                        Descripción
                      </TableHead>
                      <TableHead className="py-3 px-4 text-right text-xs font-bold">
                        Insumos
                      </TableHead>
                      {isAdmin && (
                        <TableHead className="py-3 px-4 text-right text-xs font-bold">
                          Acción
                        </TableHead>
                      )}
                    </>
                  )}

                  {tab === "brands" && (
                    <>
                      <TableHead className="py-3 px-4 text-xs font-bold">
                        Marca
                      </TableHead>
                      <TableHead className="py-3 px-4 text-xs font-bold">
                        Descripción
                      </TableHead>
                      <TableHead className="py-3 px-4 text-right text-xs font-bold">
                        Insumos
                      </TableHead>
                      {isAdmin && (
                        <TableHead className="py-3 px-4 text-right text-xs font-bold">
                          Acción
                        </TableHead>
                      )}
                    </>
                  )}

                  {tab === "units" && (
                    <>
                      <TableHead className="py-3 px-4 text-xs font-bold">
                        Unidad
                      </TableHead>
                      <TableHead className="py-3 px-4 text-xs font-bold">
                        Abreviatura
                      </TableHead>
                      <TableHead className="py-3 px-4 text-right text-xs font-bold">
                        Insumos
                      </TableHead>
                      {isAdmin && (
                        <TableHead className="py-3 px-4 text-right text-xs font-bold">
                          Acción
                        </TableHead>
                      )}
                    </>
                  )}

                  {tab === "locations" && (
                    <>
                      <TableHead className="py-3 px-4 text-xs font-bold">
                        Ubicación
                      </TableHead>
                      <TableHead className="py-3 px-4 text-xs font-bold">
                        Tipo
                      </TableHead>
                      <TableHead className="py-3 px-4 text-xs font-bold">
                        Descripción
                      </TableHead>
                      <TableHead className="py-3 px-4 text-right text-xs font-bold">
                        Lotes
                      </TableHead>
                      {isAdmin && (
                        <TableHead className="py-3 px-4 text-right text-xs font-bold">
                          Acción
                        </TableHead>
                      )}
                    </>
                  )}

                  {tab === "departments" && (
                    <>
                      <TableHead className="py-3 px-4 text-xs font-bold">
                        Código
                      </TableHead>
                      <TableHead className="py-3 px-4 text-xs font-bold">
                        Departamento
                      </TableHead>
                      <TableHead className="py-3 px-4 text-xs font-bold">
                        Descripción
                      </TableHead>
                      <TableHead className="py-3 px-4 text-center text-xs font-bold">
                        Estado
                      </TableHead>
                      <TableHead className="py-3 px-4 text-right text-xs font-bold">
                        Pedidos
                      </TableHead>
                      {isAdmin && (
                        <TableHead className="py-3 px-4 text-right text-xs font-bold">
                          Acción
                        </TableHead>
                      )}
                    </>
                  )}

                  {tab === "accounts" && (
                    <>
                      <TableHead className="py-3 px-4 text-xs font-bold">
                        Banco
                      </TableHead>
                      <TableHead className="py-3 px-4 text-xs font-bold">
                        Cuenta
                      </TableHead>
                      <TableHead className="py-3 px-4 text-center text-xs font-bold">
                        Tipo
                      </TableHead>
                      <TableHead className="py-3 px-4 text-center text-xs font-bold">
                        Moneda
                      </TableHead>
                      <TableHead className="py-3 px-4 text-xs font-bold">
                        Titular
                      </TableHead>
                      <TableHead className="py-3 px-4 text-center text-xs font-bold">
                        Estado
                      </TableHead>
                      {canManageBankAccounts && (
                        <TableHead className="py-3 px-4 text-right text-xs font-bold">
                          Acción
                        </TableHead>
                      )}
                    </>
                  )}

                  {tab === "paymentMethods" && (
                    <>
                      <TableHead className="py-3 px-4 text-xs font-bold">
                        Código
                      </TableHead>
                      <TableHead className="py-3 px-4 text-xs font-bold">
                        Método de Pago
                      </TableHead>
                      <TableHead className="py-3 px-4 text-xs font-bold">
                        Descripción
                      </TableHead>
                      <TableHead className="py-3 px-4 text-center text-xs font-bold">
                        Estado
                      </TableHead>
                      {isAdmin && (
                        <TableHead className="py-3 px-4 text-right text-xs font-bold">
                          Acción
                        </TableHead>
                      )}
                    </>
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {/* 1. CATEGORÍAS */}
                {tab === "categories" &&
                  (filteredCategories.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={isAdmin ? 5 : 4}
                        className="py-12 text-center text-xs text-muted-foreground"
                      >
                        Sin categorías registradas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCategories
                      .slice(sliceStart, sliceEnd)
                      .map((cat) => (
                        <TableRow key={cat.id} className="hover:bg-muted/40">
                          <TableCell className="py-3 px-4 text-xs font-semibold text-foreground">
                            {cat.name}
                          </TableCell>
                          <TableCell className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px]"
                            >
                              {cat.code ||
                                `CAT-${cat.id.toString().padStart(3, "0")}`}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-xs text-muted-foreground">
                            {cat.description || "Sin descripción"}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right">
                            <Badge
                              variant="info"
                              className="font-mono text-[10px]"
                            >
                              {cat._count?.products || 0} insumos
                            </Badge>
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleOpenEditCategory(cat)}
                                  className="h-7 w-7 text-muted-foreground hover:text-primary cursor-pointer"
                                  title="Editar"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => void handleDeleteCategory(cat)}
                                  className="h-7 w-7 text-muted-foreground hover:text-rose-600 cursor-pointer"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                  ))}

                {/* 2. MARCAS */}
                {tab === "brands" &&
                  (filteredBrands.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={isAdmin ? 4 : 3}
                        className="py-12 text-center text-xs text-muted-foreground"
                      >
                        Sin marcas registradas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBrands.slice(sliceStart, sliceEnd).map((b) => (
                      <TableRow key={b.id} className="hover:bg-muted/40">
                        <TableCell className="py-3 px-4 text-xs font-semibold text-foreground">
                          {b.name}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-xs text-muted-foreground">
                          {b.description || "Sin descripción"}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right">
                          <Badge
                            variant="purple"
                            className="font-mono text-[10px]"
                          >
                            {b._count?.products || 0} insumos
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleOpenEditBrand(b)}
                                className="h-7 w-7 text-muted-foreground hover:text-primary cursor-pointer"
                                title="Editar"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => void handleDeleteBrand(b)}
                                className="h-7 w-7 text-muted-foreground hover:text-rose-600 cursor-pointer"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ))}

                {/* 3. UNIDADES */}
                {tab === "units" &&
                  (filteredUnits.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={isAdmin ? 4 : 3}
                        className="py-12 text-center text-xs text-muted-foreground"
                      >
                        Sin unidades registradas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUnits.slice(sliceStart, sliceEnd).map((u) => {
                      const totalProducts =
                        (u._count?.baseProducts || 0) +
                        (u._count?.purchProducts || 0);
                      return (
                        <TableRow key={u.id} className="hover:bg-muted/40">
                          <TableCell className="py-3 px-4 text-xs font-semibold text-foreground">
                            {u.name}
                          </TableCell>
                          <TableCell className="py-3 px-4">
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px]"
                            >
                              {u.abbreviation}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-right">
                            <Badge
                              variant="warning"
                              className="font-mono text-[10px]"
                            >
                              {totalProducts} insumos
                            </Badge>
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleOpenEditUnit(u)}
                                  className="h-7 w-7 text-muted-foreground hover:text-primary cursor-pointer"
                                  title="Editar"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => void handleDeleteUnit(u)}
                                  className="h-7 w-7 text-muted-foreground hover:text-rose-600 cursor-pointer"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  ))}

                {/* 4. UBICACIONES */}
                {tab === "locations" &&
                  (filteredLocations.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={isAdmin ? 5 : 4}
                        className="py-12 text-center text-xs text-muted-foreground"
                      >
                        Sin ubicaciones registradas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLocations.slice(sliceStart, sliceEnd).map((l) => (
                      <TableRow key={l.id} className="hover:bg-muted/40">
                        <TableCell className="py-3 px-4 text-xs font-semibold text-foreground">
                          {l.name}
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <Badge variant="info" className="text-[10px]">
                            {LOCATION_TYPE_LABELS[l.type] || l.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-xs text-muted-foreground">
                          {l.description || "Sin descripción"}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right">
                          <Badge
                            variant="success"
                            className="font-mono text-[10px]"
                          >
                            {l._count?.stockBatches || 0} lotes
                          </Badge>
                        </TableCell>
                        {isAdmin && (
                          <TableCell className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleOpenEditLocation(l)}
                                className="h-7 w-7 text-muted-foreground hover:text-primary cursor-pointer"
                                title="Editar"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => void handleDeleteLocation(l)}
                                className="h-7 w-7 text-muted-foreground hover:text-rose-600 cursor-pointer"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ))}

                {/* 5. DEPARTAMENTOS */}
                {tab === "departments" &&
                  (filteredDepartments.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={isAdmin ? 6 : 5}
                        className="py-12 text-center text-xs text-muted-foreground"
                      >
                        Sin departamentos registrados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDepartments
                      .slice(sliceStart, sliceEnd)
                      .map((dep) => {
                        const reqCount = dep._count?.requests || 0;
                        const reqPurchCount =
                          dep._count?.purchaseRequisitions || 0;
                        return (
                          <TableRow key={dep.id} className="hover:bg-muted/40">
                            <TableCell className="py-3 px-4">
                              <Badge
                                variant="indigo"
                                className="font-mono text-[10px]"
                              >
                                {dep.code}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-xs font-semibold text-foreground">
                              {dep.name}
                            </TableCell>
                            <TableCell className="py-3 px-4 text-xs text-muted-foreground">
                              {dep.description || "Sin descripción"}
                            </TableCell>
                            <TableCell className="py-3 px-4 text-center">
                              <button
                                type="button"
                                disabled={!isAdmin}
                                onClick={() =>
                                  void handleToggleDepartmentStatus(dep)
                                }
                                className={cn(
                                  "cursor-pointer",
                                  !isAdmin && "cursor-default",
                                )}
                                title={
                                  isAdmin
                                    ? "Cambiar estado"
                                    : undefined
                                }
                              >
                                <Badge
                                  variant={
                                    dep.isActive ? "success" : "outline"
                                  }
                                  className="text-[10px]"
                                >
                                  {dep.isActive ? "Activo" : "Inactivo"}
                                </Badge>
                              </button>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-right">
                              <Badge
                                variant="outline"
                                className="font-mono text-[10px]"
                              >
                                {reqCount} sol. &bull; {reqPurchCount} preord.
                              </Badge>
                            </TableCell>
                            {isAdmin && (
                              <TableCell className="py-3 px-4 text-right">
                                <div className="inline-flex items-center gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() =>
                                      handleOpenEditDepartment(dep)
                                    }
                                    className="h-7 w-7 text-muted-foreground hover:text-primary cursor-pointer"
                                    title="Editar"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() =>
                                      void handleDeleteDepartment(dep)
                                    }
                                    className="h-7 w-7 text-muted-foreground hover:text-rose-600 cursor-pointer"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })
                  ))}

                {/* 6. BANCOS */}
                {tab === "accounts" &&
                  (filteredAccounts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={canManageBankAccounts ? 7 : 6}
                        className="py-12 text-center text-xs text-muted-foreground"
                      >
                        Sin cuentas bancarias registradas.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAccounts.slice(sliceStart, sliceEnd).map((acc) => (
                      <TableRow key={acc.id} className="hover:bg-muted/40">
                        <TableCell className="py-3 px-4 text-xs font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <Landmark className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>{acc.bankName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4 font-mono text-xs text-muted-foreground">
                          {acc.accountNumber || "Caja / Efectivo"}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center">
                          <Badge variant="outline" className="text-[10px]">
                            {acc.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center">
                          <Badge
                            variant={
                              acc.currency === "USD"
                                ? "success"
                                : acc.currency === "EUR"
                                  ? "info"
                                  : "warning"
                            }
                            className="font-mono text-[10px]"
                          >
                            {acc.currency}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <div className="text-xs font-semibold text-foreground">
                            {acc.holderName}
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {acc.holderId}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-center">
                          <button
                            type="button"
                            disabled={!canManageBankAccounts}
                            onClick={() =>
                              void handleToggleBankAccountStatus(acc)
                            }
                            className={cn(
                              "cursor-pointer",
                              !canManageBankAccounts && "cursor-default",
                            )}
                            title={
                              canManageBankAccounts
                                ? "Cambiar estado"
                                : undefined
                            }
                          >
                            <Badge
                              variant={acc.isActive ? "success" : "outline"}
                              className="text-[10px]"
                            >
                              {acc.isActive ? "Activa" : "Inactiva"}
                            </Badge>
                          </button>
                        </TableCell>
                        {canManageBankAccounts && (
                          <TableCell className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleOpenEditBankAccount(acc)}
                                className="h-7 w-7 text-muted-foreground hover:text-primary cursor-pointer"
                                title="Editar"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              {isAdmin && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() =>
                                    void handleDeleteBankAccount(acc)
                                  }
                                  className="h-7 w-7 text-muted-foreground hover:text-rose-600 cursor-pointer"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  ))}

                {/* 7. MÉTODOS DE PAGO */}
                {tab === "paymentMethods" &&
                  (filteredPaymentMethods.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={isAdmin ? 5 : 4}
                        className="py-12 text-center text-xs text-muted-foreground"
                      >
                        Sin métodos de pago registrados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPaymentMethods
                      .slice(sliceStart, sliceEnd)
                      .map((pm) => (
                        <TableRow key={pm.id} className="hover:bg-muted/40">
                          <TableCell className="py-3 px-4">
                            <Badge
                              variant="purple"
                              className="font-mono text-[10px]"
                            >
                              {pm.code}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 px-4 text-xs font-semibold text-foreground">
                            {pm.name}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-xs text-muted-foreground">
                            {pm.description || "Sin descripción"}
                          </TableCell>
                          <TableCell className="py-3 px-4 text-center">
                            <button
                              type="button"
                              disabled={!isAdmin}
                              onClick={() =>
                                void handleTogglePaymentMethodStatus(pm)
                              }
                              className={cn(
                                "cursor-pointer",
                                !isAdmin && "cursor-default",
                              )}
                              title={isAdmin ? "Cambiar estado" : undefined}
                            >
                              <Badge
                                variant={pm.isActive ? "success" : "outline"}
                                className="text-[10px]"
                              >
                                {pm.isActive ? "Activo" : "Inactivo"}
                              </Badge>
                            </button>
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="py-3 px-4 text-right">
                              <div className="inline-flex items-center gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() =>
                                    handleOpenEditPaymentMethod(pm)
                                  }
                                  className="h-7 w-7 text-muted-foreground hover:text-primary cursor-pointer"
                                  title="Editar"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() =>
                                    void handleDeletePaymentMethod(pm)
                                  }
                                  className="h-7 w-7 text-muted-foreground hover:text-rose-600 cursor-pointer"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                  ))}
              </TableBody>
            </Table>

            <TablePagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={currentFilteredCount}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              pageSizeOptions={[5, 10, 20, 50]}
              entityName="registros"
            />
          </>
        )}
      </Card>

      {/* ========================================================
          MODAL ESTANDARIZADO DE CREACIÓN Y EDICIÓN
         ======================================================== */}
      <Dialog
        open={
          showModal && (isAdmin || (tab === "accounts" && canManageBankAccounts))
        }
        onOpenChange={(open) => {
          if (!open && !submitting) handleCloseModal();
        }}
      >
        <DialogContent className="sm:max-w-lg max-w-lg p-6 rounded-2xl border-border/80 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground">
              {getModalTitle()}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Completa los datos del registro
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. CATEGORÍAS */}
            {tab === "categories" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="block text-xs font-bold text-foreground">
                    Nombre *
                  </Label>
                  <Input
                    type="text"
                    required
                    value={categoryForm.name}
                    onChange={(e) =>
                      setCategoryForm({
                        ...categoryForm,
                        name: e.target.value,
                      })
                    }
                    placeholder="ej. Reactivos, Descartables"
                    className="h-9 text-xs bg-card border-border/80 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="block text-xs font-bold text-foreground">
                    Código
                  </Label>
                  <Input
                    type="text"
                    value={categoryForm.code}
                    onChange={(e) =>
                      setCategoryForm({
                        ...categoryForm,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="ej. CAT-001"
                    className="h-9 text-xs font-mono bg-card border-border/80 rounded-xl"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="block text-xs font-bold text-foreground">
                    Descripción
                  </Label>
                  <Textarea
                    value={categoryForm.description}
                    onChange={(e) =>
                      setCategoryForm({
                        ...categoryForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Detalle opcional..."
                    className="text-xs bg-card border-border/80 rounded-xl"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* 2. MARCAS */}
            {tab === "brands" && (
              <div className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label className="block text-xs font-bold text-foreground">
                    Nombre *
                  </Label>
                  <Input
                    type="text"
                    required
                    value={brandForm.name}
                    onChange={(e) =>
                      setBrandForm({ ...brandForm, name: e.target.value })
                    }
                    placeholder="ej. Bio-Rad, Roche"
                    className="h-9 text-xs bg-card border-border/80 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="block text-xs font-bold text-foreground">
                    Descripción
                  </Label>
                  <Textarea
                    value={brandForm.description}
                    onChange={(e) =>
                      setBrandForm({
                        ...brandForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Detalle opcional..."
                    className="text-xs bg-card border-border/80 rounded-xl"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* 3. UNIDADES */}
            {tab === "units" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="block text-xs font-bold text-foreground">
                    Nombre *
                  </Label>
                  <Input
                    type="text"
                    required
                    value={unitForm.name}
                    onChange={(e) =>
                      setUnitForm({ ...unitForm, name: e.target.value })
                    }
                    placeholder="ej. Mililitro, Caja, Unidad"
                    className="h-9 text-xs bg-card border-border/80 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="block text-xs font-bold text-foreground">
                    Abreviatura *
                  </Label>
                  <Input
                    type="text"
                    required
                    value={unitForm.abbreviation}
                    onChange={(e) =>
                      setUnitForm({
                        ...unitForm,
                        abbreviation: e.target.value,
                      })
                    }
                    placeholder="ej. ml, cja, und"
                    className="h-9 text-xs font-mono bg-card border-border/80 rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* 4. UBICACIONES */}
            {tab === "locations" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="block text-xs font-bold text-foreground">
                    Nombre *
                  </Label>
                  <Input
                    type="text"
                    required
                    value={locForm.name}
                    onChange={(e) =>
                      setLocForm({ ...locForm, name: e.target.value })
                    }
                    placeholder="ej. Almacén Principal"
                    className="h-9 text-xs bg-card border-border/80 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="block text-xs font-bold text-foreground">
                    Tipo *
                  </Label>
                  <select
                    value={locForm.type}
                    onChange={(e) =>
                      setLocForm({
                        ...locForm,
                        type: e.target.value as LocationAreaType,
                      })
                    }
                    className="w-full h-9 bg-card border border-border/80 rounded-xl px-3 text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring outline-none cursor-pointer"
                  >
                    <option value="ALMACEN_GENERAL">Almacén General</option>
                    <option value="DEPOSITO">Depósito</option>
                    <option value="OFICINA">Oficina</option>
                    <option value="LABORATORIO">Laboratorio</option>
                  </select>
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="block text-xs font-bold text-foreground">
                    Descripción
                  </Label>
                  <Textarea
                    value={locForm.description}
                    onChange={(e) =>
                      setLocForm({ ...locForm, description: e.target.value })
                    }
                    placeholder="Detalle opcional..."
                    className="text-xs bg-card border-border/80 rounded-xl"
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* 5. DEPARTAMENTOS */}
            {tab === "departments" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="block text-xs font-bold text-foreground">
                    Código *
                  </Label>
                  <Input
                    type="text"
                    required
                    value={departmentForm.code}
                    onChange={(e) =>
                      setDepartmentForm({
                        ...departmentForm,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="ej. ADM-FIN"
                    className="h-9 text-xs font-mono uppercase bg-card border-border/80 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="block text-xs font-bold text-foreground">
                    Nombre *
                  </Label>
                  <Input
                    type="text"
                    required
                    value={departmentForm.name}
                    onChange={(e) =>
                      setDepartmentForm({
                        ...departmentForm,
                        name: e.target.value,
                      })
                    }
                    placeholder="ej. Administración"
                    className="h-9 text-xs bg-card border-border/80 rounded-xl"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="block text-xs font-bold text-foreground">
                    Descripción
                  </Label>
                  <Textarea
                    value={departmentForm.description}
                    onChange={(e) =>
                      setDepartmentForm({
                        ...departmentForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Detalle opcional..."
                    className="text-xs bg-card border-border/80 rounded-xl"
                    rows={3}
                  />
                </div>
                <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                  <Checkbox
                    id="department-active"
                    checked={departmentForm.isActive}
                    onCheckedChange={(checked) =>
                      setDepartmentForm({
                        ...departmentForm,
                        isActive: Boolean(checked),
                      })
                    }
                  />
                  <Label
                    htmlFor="department-active"
                    className="text-xs font-medium text-foreground cursor-pointer"
                  >
                    Departamento activo
                  </Label>
                </div>
              </div>
            )}

            {/* 6. BANCOS */}
            {tab === "accounts" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="block text-xs font-bold text-foreground">
                    Banco o Caja *
                  </Label>
                  <Input
                    type="text"
                    required
                    value={bankAccountForm.bankName}
                    onChange={(e) =>
                      setBankAccountForm({
                        ...bankAccountForm,
                        bankName: e.target.value,
                      })
                    }
                    placeholder="ej. Banesco, Mercantil, Caja Chica"
                    className="h-9 text-xs bg-card border-border/80 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="block text-xs font-bold text-foreground">
                    Número de Cuenta
                  </Label>
                  <Input
                    type="text"
                    value={bankAccountForm.accountNumber}
                    onChange={(e) =>
                      setBankAccountForm({
                        ...bankAccountForm,
                        accountNumber: e.target.value,
                      })
                    }
                    placeholder="0134-0000-00-0000000000"
                    className="h-9 text-xs font-mono bg-card border-border/80 rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1.5">
                    <Label className="block text-xs font-bold text-foreground">
                      Tipo *
                    </Label>
                    <select
                      value={bankAccountForm.type}
                      onChange={(e) =>
                        setBankAccountForm({
                          ...bankAccountForm,
                          type: e.target.value,
                        })
                      }
                      className="w-full h-9 bg-card border border-border/80 rounded-xl px-2.5 text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring outline-none cursor-pointer"
                    >
                      <option value="CORRIENTE">Corriente</option>
                      <option value="CUSTODIA">Custodia</option>
                      <option value="EFECTIVO">Efectivo</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="block text-xs font-bold text-foreground">
                      Moneda *
                    </Label>
                    <select
                      value={bankAccountForm.currency}
                      onChange={(e) =>
                        setBankAccountForm({
                          ...bankAccountForm,
                          currency: e.target.value,
                        })
                      }
                      className="w-full h-9 bg-card border border-border/80 rounded-xl px-2.5 text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring outline-none cursor-pointer"
                    >
                      <option value="VED">VED (Bs.)</option>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="block text-xs font-bold text-foreground">
                    Titular *
                  </Label>
                  <Input
                    type="text"
                    required
                    value={bankAccountForm.holderName}
                    onChange={(e) =>
                      setBankAccountForm({
                        ...bankAccountForm,
                        holderName: e.target.value,
                      })
                    }
                    placeholder="Nombre del titular"
                    className="h-9 text-xs bg-card border-border/80 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="block text-xs font-bold text-foreground">
                    RIF o Cédula *
                  </Label>
                  <Input
                    type="text"
                    required
                    value={bankAccountForm.holderId}
                    onChange={(e) =>
                      setBankAccountForm({
                        ...bankAccountForm,
                        holderId: e.target.value,
                      })
                    }
                    placeholder="ej. J-12345678-0"
                    className="h-9 text-xs font-mono bg-card border-border/80 rounded-xl"
                  />
                </div>
                <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                  <Checkbox
                    id="account-active"
                    checked={bankAccountForm.isActive}
                    onCheckedChange={(checked) =>
                      setBankAccountForm({
                        ...bankAccountForm,
                        isActive: Boolean(checked),
                      })
                    }
                  />
                  <Label
                    htmlFor="account-active"
                    className="text-xs font-medium text-foreground cursor-pointer"
                  >
                    Cuenta activa para pagos
                  </Label>
                </div>
              </div>
            )}

            {/* 7. MÉTODOS DE PAGO */}
            {tab === "paymentMethods" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="block text-xs font-bold text-foreground">
                    Código *
                  </Label>
                  <Input
                    type="text"
                    required
                    value={paymentMethodForm.code}
                    onChange={(e) =>
                      setPaymentMethodForm({
                        ...paymentMethodForm,
                        code: e.target.value.toUpperCase().replace(/\s+/g, "_"),
                      })
                    }
                    placeholder="ej. TRANSFERENCIA, ZELLE"
                    className="h-9 text-xs font-mono uppercase bg-card border-border/80 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="block text-xs font-bold text-foreground">
                    Nombre *
                  </Label>
                  <Input
                    type="text"
                    required
                    value={paymentMethodForm.name}
                    onChange={(e) =>
                      setPaymentMethodForm({
                        ...paymentMethodForm,
                        name: e.target.value,
                      })
                    }
                    placeholder="ej. Transferencia Bancaria"
                    className="h-9 text-xs bg-card border-border/80 rounded-xl"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="block text-xs font-bold text-foreground">
                    Descripción
                  </Label>
                  <Textarea
                    value={paymentMethodForm.description}
                    onChange={(e) =>
                      setPaymentMethodForm({
                        ...paymentMethodForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Detalle opcional..."
                    className="text-xs bg-card border-border/80 rounded-xl"
                    rows={3}
                  />
                </div>
                <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                  <Checkbox
                    id="payment-method-active"
                    checked={paymentMethodForm.isActive}
                    onCheckedChange={(checked) =>
                      setPaymentMethodForm({
                        ...paymentMethodForm,
                        isActive: Boolean(checked),
                      })
                    }
                  />
                  <Label
                    htmlFor="payment-method-active"
                    className="text-xs font-medium text-foreground cursor-pointer"
                  >
                    Método activo para pagos
                  </Label>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border/60">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={submitting}
                onClick={handleCloseModal}
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
    </div>
  );
}
