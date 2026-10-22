"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import {
  InventoryMasterService,
  CategoryItem,
  Brand,
  Unit,
  LocationItem,
  LocationAreaType,
  DepartmentItem,
} from "@/services/inventory-master.service";
import {
  BankAccountService,
  BankAccountItem,
} from "@/services/bank-account.service";
import { AuthService } from "@/services/auth.service";
import type { AuthUser } from "@/types/auth";
import {
  FolderTree,
  Tag,
  Scale,
  MapPin,
  Building2,
  Landmark,
  Plus,
  Loader2,
  Search,
  AlertCircle,
  Pencil,
  Trash2,
  CheckCircle2,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

type TabType =
  | "categories"
  | "brands"
  | "units"
  | "locations"
  | "departments"
  | "accounts";

export default function InventorySettingsPage() {
  const [currentUser] = useState<AuthUser | null>(() =>
    AuthService.getCurrentUser(),
  );
  const userRoles = currentUser?.roles || [];
  const isAdmin = userRoles.includes("ADMINISTRADOR");
  const canManageBankAccounts = isAdmin || userRoles.includes("ADMINISTRACION");

  const [tab, setTab] = useState<TabType>("categories");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);


  // Estados de datos
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([]);


  // Cálculo de conteo filtrado para la pestaña activa
  const currentFilteredCount = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (tab === "categories") {
      return categories.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.description && c.description.toLowerCase().includes(q)) ||
          (c.code && c.code.toLowerCase().includes(q)),
      ).length;
    }
    if (tab === "brands") {
      return brands.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          (b.description && b.description.toLowerCase().includes(q)),
      ).length;
    }
    if (tab === "units") {
      return units.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.abbreviation.toLowerCase().includes(q),
      ).length;
    }
    if (tab === "locations") {
      return locations.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.description && l.description.toLowerCase().includes(q)) ||
          l.type.toLowerCase().includes(q),
      ).length;
    }
    if (tab === "departments") {
      return departments.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.code.toLowerCase().includes(q) ||
          (d.description && d.description.toLowerCase().includes(q)),
      ).length;
    }
    if (tab === "accounts") {
      return bankAccounts.filter(
        (a) =>
          a.bankName.toLowerCase().includes(q) ||
          (a.accountNumber && a.accountNumber.toLowerCase().includes(q)) ||
          a.holderName.toLowerCase().includes(q) ||
          a.holderId.toLowerCase().includes(q) ||
          a.currency.toLowerCase().includes(q),
      ).length;
    }
    return 0;
  }, [tab, search, categories, brands, units, locations, departments, bankAccounts]);

  const totalPages = Math.max(1, Math.ceil(currentFilteredCount / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startRecord = currentFilteredCount === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endRecord = Math.min(safeCurrentPage * pageSize, currentFilteredCount);

  // Estados de modales y edición
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

  const [editingDepartment, setEditingDepartment] =
    useState<DepartmentItem | null>(null);
  const [departmentForm, setDepartmentForm] = useState({
    code: "",
    name: "",
    description: "",
    isActive: true,
  });

  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
    code: "",
  });

  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandForm, setBrandForm] = useState({ name: "", description: "" });

  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [unitForm, setUnitForm] = useState({ name: "", abbreviation: "" });

  const [editingLocation, setEditingLocation] = useState<LocationItem | null>(null);
  const [locForm, setLocForm] = useState<{
    name: string;
    type: LocationAreaType;
    description: string;
  }>({
    name: "",
    type: "ALMACEN_GENERAL",
    description: "",
  });

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const [c, b, u, l, d, a] = await Promise.all([
          InventoryMasterService.getCategories(),
          InventoryMasterService.getBrands(),
          InventoryMasterService.getUnits(),
          InventoryMasterService.getLocations(),
          InventoryMasterService.getDepartments(),
          BankAccountService.getBankAccounts(),
        ]);
        if (isMounted) {
          setCategories(c);
          setBrands(b);
          setUnits(u);
          setLocations(l);
          setDepartments(d);
          setBankAccounts(a);
          setLoading(false);
        }
      } catch {
        if (isMounted) {
          setErrorMessage("No se pudieron cargar los catálogos del servidor");
          setLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  // --- Apertura de Modales ---
  const handleOpenCreateModal = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
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

  const handleOpenEditDepartment = (dep: DepartmentItem) => {
    setErrorMessage(null);
    setSuccessMessage(null);
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
    setErrorMessage(null);
    setSuccessMessage(null);
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      description: cat.description || "",
      code: cat.code || "",
    });
    setShowModal(true);
  };

  const handleOpenEditBrand = (brand: Brand) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setEditingBrand(brand);
    setBrandForm({
      name: brand.name,
      description: brand.description || "",
    });
    setShowModal(true);
  };

  const handleOpenEditUnit = (unit: Unit) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setEditingUnit(unit);
    setUnitForm({
      name: unit.name,
      abbreviation: unit.abbreviation,
    });
    setShowModal(true);
  };

  const handleOpenEditLocation = (loc: LocationItem) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setEditingLocation(loc);
    setLocForm({
      name: loc.name,
      type: loc.type,
      description: loc.description || "",
    });
    setShowModal(true);
  };

  const handleOpenEditBankAccount = (acc: BankAccountItem) => {
    setErrorMessage(null);
    setSuccessMessage(null);
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
    setEditingDepartment(null);
    setEditingCategory(null);
    setEditingBrand(null);
    setEditingUnit(null);
    setEditingLocation(null);
  };

  const handleToggleBankAccountStatus = async (acc: BankAccountItem) => {
    if (!canManageBankAccounts) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const updated = await BankAccountService.updateBankAccount(acc.id, {
        isActive: !acc.isActive,
      });
      startTransition(() => {
        setBankAccounts((prev) =>
          prev.map((a) =>
            a.id === updated.id ? { ...a, isActive: updated.isActive } : a,
          ),
        );
        setSuccessMessage(
          `Cuenta institucional "${acc.bankName}" ${updated.isActive ? "activada" : "desactivada"} exitosamente.`,
        );
      });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const resErr = err as { response?: { data?: { message?: string } } };
        setErrorMessage(
          resErr.response?.data?.message ??
            "Error al cambiar el estado de la cuenta",
        );
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Error al cambiar el estado de la cuenta");
      }
    }
  };

  const handleDeleteBankAccount = async (acc: BankAccountItem) => {
    if (!isAdmin) return;
    const confirmed = window.confirm(
      `¿Está seguro de eliminar o desactivar la cuenta institucional "${acc.bankName}"?`,
    );
    if (!confirmed) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await BankAccountService.deleteBankAccount(acc.id);
      startTransition(() => {
        setBankAccounts((prev) =>
          prev.map((a) => (a.id === acc.id ? { ...a, isActive: false } : a)),
        );
        setSuccessMessage(
          `Cuenta bancaria institucional "${acc.bankName}" procesada exitosamente.`,
        );
      });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const resErr = err as { response?: { data?: { message?: string } } };
        setErrorMessage(
          resErr.response?.data?.message ??
            "Error al procesar la cuenta bancaria",
        );
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Error al procesar la cuenta bancaria");
      }
    }
  };

  // --- Eliminaciones y Toggles ---
  const handleToggleDepartmentStatus = async (dep: DepartmentItem) => {
    if (!isAdmin) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const updated = await InventoryMasterService.updateDepartment(dep.id, {
        isActive: !dep.isActive,
      });
      startTransition(() => {
        setDepartments((prev) =>
          prev.map((d) =>
            d.id === updated.id ? { ...d, isActive: updated.isActive } : d,
          ),
        );
        setSuccessMessage(
          `Área/Departamento "${dep.name}" ${updated.isActive ? "activada" : "desactivada"} exitosamente.`,
        );
      });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const resErr = err as { response?: { data?: { message?: string } } };
        setErrorMessage(
          resErr.response?.data?.message ??
            "Error al cambiar estado del departamento",
        );
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Error al cambiar estado del departamento");
      }
    }
  };

  const handleDeleteDepartment = async (dep: DepartmentItem) => {
    if (!isAdmin) return;
    const reqs = dep._count?.requests || 0;
    const preorders = dep._count?.purchaseRequisitions || 0;
    if (reqs > 0 || preorders > 0) {
      setErrorMessage(
        `No se puede eliminar el área "${dep.name}": tiene ${reqs} solicitud(es) y ${preorders} preorden(es) asociadas. Puede desactivarla en su lugar.`,
      );
      setSuccessMessage(null);
      return;
    }

    const confirmed = window.confirm(
      `¿Está seguro de eliminar el área/departamento "${dep.name}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await InventoryMasterService.deleteDepartment(dep.id);
      startTransition(() => {
        setDepartments((prev) => prev.filter((item) => item.id !== dep.id));
        setSuccessMessage(
          `Área/Departamento "${dep.name}" eliminada exitosamente.`,
        );
      });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const resErr = err as { response?: { data?: { message?: string } } };
        setErrorMessage(
          resErr.response?.data?.message ??
            "Error al eliminar el área/departamento",
        );
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Error al eliminar el área/departamento");
      }
    }
  };

  // --- Eliminaciones ---
  const handleDeleteCategory = async (cat: CategoryItem) => {
    if (!isAdmin) return;
    const count = cat._count?.products || 0;
    if (count > 0) {
      setErrorMessage(
        `No se puede eliminar la categoría "${cat.name}": tiene ${count} producto(s) vinculado(s).`,
      );
      setSuccessMessage(null);
      return;
    }

    const confirmed = window.confirm(
      `¿Está seguro de eliminar la categoría "${cat.name}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await InventoryMasterService.deleteCategory(cat.id);
      startTransition(() => {
        setCategories((prev) => prev.filter((item) => item.id !== cat.id));
        setSuccessMessage(`Categoría "${cat.name}" eliminada exitosamente.`);
      });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const resErr = err as { response?: { data?: { message?: string } } };
        setErrorMessage(
          resErr.response?.data?.message ?? "Error al eliminar la categoría",
        );
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Error al eliminar la categoría");
      }
    }
  };

  const handleDeleteBrand = async (brand: Brand) => {
    if (!isAdmin) return;
    const count = brand._count?.products || 0;
    if (count > 0) {
      setErrorMessage(
        `No se puede eliminar la marca "${brand.name}": tiene ${count} producto(s) vinculado(s).`,
      );
      setSuccessMessage(null);
      return;
    }

    const confirmed = window.confirm(
      `¿Está seguro de eliminar la marca "${brand.name}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await InventoryMasterService.deleteBrand(brand.id);
      startTransition(() => {
        setBrands((prev) => prev.filter((item) => item.id !== brand.id));
        setSuccessMessage(`Marca "${brand.name}" eliminada exitosamente.`);
      });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const resErr = err as { response?: { data?: { message?: string } } };
        setErrorMessage(
          resErr.response?.data?.message ?? "Error al eliminar la marca",
        );
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Error al eliminar la marca");
      }
    }
  };

  const handleDeleteUnit = async (unit: Unit) => {
    if (!isAdmin) return;
    const count =
      (unit._count?.baseProducts || 0) + (unit._count?.purchProducts || 0);
    if (count > 0) {
      setErrorMessage(
        `No se puede eliminar la unidad "${unit.name}": tiene ${count} insumo(s) vinculado(s).`,
      );
      setSuccessMessage(null);
      return;
    }

    const confirmed = window.confirm(
      `¿Está seguro de eliminar la unidad de medida "${unit.name}" (${unit.abbreviation})? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await InventoryMasterService.deleteUnit(unit.id);
      startTransition(() => {
        setUnits((prev) => prev.filter((item) => item.id !== unit.id));
        setSuccessMessage(
          `Unidad de medida "${unit.name}" eliminada exitosamente.`,
        );
      });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const resErr = err as { response?: { data?: { message?: string } } };
        setErrorMessage(
          resErr.response?.data?.message ??
            "Error al eliminar la unidad de medida",
        );
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Error al eliminar la unidad de medida");
      }
    }
  };

  const handleDeleteLocation = async (loc: LocationItem) => {
    if (!isAdmin) return;
    const batches = loc._count?.stockBatches || 0;
    const fridges = loc._count?.fridges || 0;
    if (batches > 0 || fridges > 0) {
      setErrorMessage(
        `No se puede eliminar la ubicación "${loc.name}": tiene ${batches} lote(s) de stock y ${fridges} equipo(s) de frío asociados.`,
      );
      setSuccessMessage(null);
      return;
    }

    const confirmed = window.confirm(
      `¿Está seguro de eliminar la ubicación "${loc.name}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;

    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await InventoryMasterService.deleteLocation(loc.id);
      startTransition(() => {
        setLocations((prev) => prev.filter((item) => item.id !== loc.id));
        setSuccessMessage(
          `Ubicación física "${loc.name}" eliminada exitosamente.`,
        );
      });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const resErr = err as { response?: { data?: { message?: string } } };
        setErrorMessage(
          resErr.response?.data?.message ??
            "Error al eliminar la ubicación física",
        );
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Error al eliminar la ubicación física");
      }
    }
  };

  // --- Envío del Formulario (Creación / Edición) ---
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isAdmin && !(tab === "accounts" && canManageBankAccounts)) return;
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (tab === "accounts") {
        if (editingBankAccount) {
          const updated = await BankAccountService.updateBankAccount(
            editingBankAccount.id,
            bankAccountForm,
          );
          startTransition(() => {
            setBankAccounts((prev) =>
              prev.map((a) => (a.id === updated.id ? updated : a)),
            );
            setSuccessMessage(
              "Cuenta bancaria institucional actualizada exitosamente.",
            );
          });
        } else {
          const created =
            await BankAccountService.createBankAccount(bankAccountForm);
          startTransition(() => {
            setBankAccounts((prev) => [...prev, created]);
            setSuccessMessage(
              "Cuenta bancaria institucional registrada exitosamente.",
            );
          });
        }
        setBankAccountForm({
          bankName: "",
          accountNumber: "",
          type: "CORRIENTE",
          currency: "VED",
          holderName: "INSTITUTO DE INMUNOLOGÍA CLÍNICA IDI C.A.",
          holderId: "J-12345678-0",
          isActive: true,
        });
        setEditingBankAccount(null);
      } else if (tab === "departments") {
        if (editingDepartment) {
          const updated = await InventoryMasterService.updateDepartment(
            editingDepartment.id,
            departmentForm,
          );
          startTransition(() => {
            setDepartments((prev) =>
              prev.map((d) => (d.id === updated.id ? updated : d)),
            );
            setSuccessMessage("Área/Departamento actualizada exitosamente.");
          });
        } else {
          const created =
            await InventoryMasterService.createDepartment(departmentForm);
          startTransition(() => {
            setDepartments((prev) => [...prev, created]);
            setSuccessMessage("Área/Departamento registrada exitosamente.");
          });
        }
        setDepartmentForm({
          code: "",
          name: "",
          description: "",
          isActive: true,
        });
        setEditingDepartment(null);
      } else if (tab === "categories") {
        if (editingCategory) {
          const updated = await InventoryMasterService.updateCategory(
            editingCategory.id,
            categoryForm,
          );
          startTransition(() => {
            setCategories((prev) =>
              prev.map((c) => (c.id === updated.id ? updated : c)),
            );
            setSuccessMessage("Categoría actualizada exitosamente.");
          });
        } else {
          const created =
            await InventoryMasterService.createCategory(categoryForm);
          startTransition(() => {
            setCategories((prev) => [...prev, created]);
            setSuccessMessage("Categoría registrada exitosamente.");
          });
        }
        setCategoryForm({ name: "", description: "", code: "" });
        setEditingCategory(null);
      } else if (tab === "brands") {
        if (editingBrand) {
          const updated = await InventoryMasterService.updateBrand(
            editingBrand.id,
            brandForm,
          );
          startTransition(() => {
            setBrands((prev) =>
              prev.map((b) => (b.id === updated.id ? updated : b)),
            );
            setSuccessMessage("Marca actualizada exitosamente.");
          });
        } else {
          const created = await InventoryMasterService.createBrand(brandForm);
          startTransition(() => {
            setBrands((prev) => [...prev, created]);
            setSuccessMessage("Marca registrada exitosamente.");
          });
        }
        setBrandForm({ name: "", description: "" });
        setEditingBrand(null);
      } else if (tab === "units") {
        if (editingUnit) {
          const updated = await InventoryMasterService.updateUnit(
            editingUnit.id,
            unitForm,
          );
          startTransition(() => {
            setUnits((prev) =>
              prev.map((u) => (u.id === updated.id ? updated : u)),
            );
            setSuccessMessage("Unidad de medida actualizada exitosamente.");
          });
        } else {
          const created = await InventoryMasterService.createUnit(unitForm);
          startTransition(() => {
            setUnits((prev) => [...prev, created]);
            setSuccessMessage("Unidad de medida registrada exitosamente.");
          });
        }
        setUnitForm({ name: "", abbreviation: "" });
        setEditingUnit(null);
      } else {
        if (editingLocation) {
          const updated = await InventoryMasterService.updateLocation(
            editingLocation.id,
            locForm,
          );
          startTransition(() => {
            setLocations((prev) =>
              prev.map((l) => (l.id === updated.id ? updated : l)),
            );
            setSuccessMessage("Ubicación física actualizada exitosamente.");
          });
        } else {
          const created = await InventoryMasterService.createLocation(locForm);
          startTransition(() => {
            setLocations((prev) => [...prev, created]);
            setSuccessMessage("Ubicación física registrada exitosamente.");
          });
        }
        setLocForm({ name: "", type: "ALMACEN_GENERAL", description: "" });
        setEditingLocation(null);
      }
      setShowModal(false);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const resErr = err as { response?: { data?: { message?: string } } };
        setErrorMessage(
          resErr.response?.data?.message ?? "Error al procesar la solicitud",
        );
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Ocurrió un error inesperado al procesar la solicitud");
      }
    } finally {
      setSubmitting(false);
    }
  };

    return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <SlidersHorizontal className="w-6 h-6 text-blue-600" />
            Maestros del Sistema
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestión centralizada de catálogos y parámetros del sistema: categorías, marcas, unidades de medida, ubicaciones físicas, departamentos y cuentas bancarias.
          </p>
        </div>
        {(isAdmin || (tab === "accounts" && canManageBankAccounts)) && (
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm hover:shadow cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            {tab === "accounts" && "Nueva Cuenta Institucional"}
            {tab === "departments" && "Nueva Área / Departamento"}
            {tab === "categories" && "Nueva Categoría"}
            {tab === "brands" && "Nueva Marca"}
            {tab === "units" && "Nueva Unidad"}
            {tab === "locations" && "Nueva Ubicación"}
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 p-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
        <button
          type="button"
          onClick={() => {
            startTransition(() => {
              setTab("categories");
              setSearch("");
              setCurrentPage(1);
              setErrorMessage(null);
              setSuccessMessage(null);
            });
          }}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors cursor-pointer shrink-0 ${
            tab === "categories"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FolderTree className="w-4 h-4" />
          Categorías ({categories.length})
        </button>
        <button
          type="button"
          onClick={() => {
            startTransition(() => {
              setTab("brands");
              setSearch("");
              setCurrentPage(1);
              setErrorMessage(null);
              setSuccessMessage(null);
            });
          }}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors cursor-pointer shrink-0 ${
            tab === "brands"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Tag className="w-4 h-4" />
          Marcas ({brands.length})
        </button>
        <button
          type="button"
          onClick={() => {
            startTransition(() => {
              setTab("units");
              setSearch("");
              setCurrentPage(1);
              setErrorMessage(null);
              setSuccessMessage(null);
            });
          }}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors cursor-pointer shrink-0 ${
            tab === "units"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Scale className="w-4 h-4" />
          Unidades ({units.length})
        </button>
        <button
          type="button"
          onClick={() => {
            startTransition(() => {
              setTab("locations");
              setSearch("");
              setCurrentPage(1);
              setErrorMessage(null);
              setSuccessMessage(null);
            });
          }}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors cursor-pointer shrink-0 ${
            tab === "locations"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <MapPin className="w-4 h-4" />
          Ubicaciones ({locations.length})
        </button>
        <button
          type="button"
          onClick={() => {
            startTransition(() => {
              setTab("departments");
              setSearch("");
              setCurrentPage(1);
              setErrorMessage(null);
              setSuccessMessage(null);
            });
          }}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors cursor-pointer shrink-0 ${
            tab === "departments"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Building2 className="w-4 h-4" />
          Áreas / Departamentos ({departments.length})
        </button>
        <button
          type="button"
          onClick={() => {
            startTransition(() => {
              setTab("accounts");
              setSearch("");
              setCurrentPage(1);
              setErrorMessage(null);
              setSuccessMessage(null);
            });
          }}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors cursor-pointer shrink-0 ${
            tab === "accounts"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Landmark className="w-4 h-4" />
          Cuentas Institucionales ({bankAccounts.length})
        </button>
      </div>

      {/* Buscador y Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={`Buscar en ${
              tab === "categories"
                ? "categorías"
                : tab === "brands"
                ? "marcas comerciales"
                : tab === "units"
                ? "unidades de medida"
                : tab === "locations"
                ? "ubicaciones físicas"
                : tab === "departments"
                ? "áreas o departamentos"
                : "cuentas bancarias"
            }...`}
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearch(e.target.value)
            }
            className="pl-10 pr-9 py-2.5 w-full text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 placeholder:text-slate-400 shadow-xs transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCurrentPage(1);
              }}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              title="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Contenedor de Tabla Reajustada */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex flex-col justify-center items-center p-16 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-xs text-slate-500">Cargando datos maestros...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {tab === "categories" && (
                  <tr>
                    <th className="px-6 py-3.5 text-left w-64">Nombre de la Categoría</th>
                    <th className="px-6 py-3.5 text-left w-48">Código / Abreviación</th>
                    <th className="px-6 py-3.5 text-left">Descripción / Notas</th>
                    <th className="px-6 py-3.5 text-right w-44">Insumos Vinculados</th>
                    {isAdmin && (
                      <th className="px-6 py-3.5 text-center w-28">Acciones</th>
                    )}
                  </tr>
                )}
                {tab === "brands" && (
                  <tr>
                    <th className="px-6 py-3.5 text-left w-64">Nombre Comercial</th>
                    <th className="px-6 py-3.5 text-left">Descripción / Notas de Procedencia</th>
                    <th className="px-6 py-3.5 text-right w-44">Insumos Vinculados</th>
                    {isAdmin && (
                      <th className="px-6 py-3.5 text-center w-28">Acciones</th>
                    )}
                  </tr>
                )}
                {tab === "units" && (
                  <tr>
                    <th className="px-6 py-3.5 text-left w-64">Nombre de la Unidad</th>
                    <th className="px-6 py-3.5 text-left w-44">Abreviatura</th>
                    <th className="px-6 py-3.5 text-right w-44">Insumos Vinculados</th>
                    {isAdmin && (
                      <th className="px-6 py-3.5 text-center w-28">Acciones</th>
                    )}
                  </tr>
                )}
                {tab === "locations" && (
                  <tr>
                    <th className="px-6 py-3.5 text-left w-64">Nombre de Ubicación</th>
                    <th className="px-6 py-3.5 text-left w-48">Tipo de Área</th>
                    <th className="px-6 py-3.5 text-left">Observaciones</th>
                    <th className="px-6 py-3.5 text-right w-52">Lotes / Neveras</th>
                    {isAdmin && (
                      <th className="px-6 py-3.5 text-center w-28">Acciones</th>
                    )}
                  </tr>
                )}
                {tab === "departments" && (
                  <tr>
                    <th className="px-6 py-3.5 text-left w-36">Código</th>
                    <th className="px-6 py-3.5 text-left w-60">Área / Departamento</th>
                    <th className="px-6 py-3.5 text-left">Descripción / Alcance</th>
                    <th className="px-6 py-3.5 text-center w-32">Estado</th>
                    <th className="px-6 py-3.5 text-right w-48">Vinculaciones</th>
                    {isAdmin && (
                      <th className="px-6 py-3.5 text-center w-28">Acciones</th>
                    )}
                  </tr>
                )}
                {tab === "accounts" && (
                  <tr>
                    <th className="px-6 py-3.5 text-left w-64">Banco / Institución</th>
                    <th className="px-6 py-3.5 text-left w-52">N° de Cuenta</th>
                    <th className="px-6 py-3.5 text-center w-32">Tipo</th>
                    <th className="px-6 py-3.5 text-center w-28">Moneda</th>
                    <th className="px-6 py-3.5 text-left w-60">Titular / RIF</th>
                    <th className="px-6 py-3.5 text-center w-32">Estado</th>
                    {canManageBankAccounts && (
                      <th className="px-6 py-3.5 text-center w-28">Acciones</th>
                    )}
                  </tr>
                )}
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-800">
                {/* Categorías */}
                {tab === "categories" &&
                  (() => {
                    const filtered = categories.filter(
                      (c) =>
                        c.name.toLowerCase().includes(search.toLowerCase()) ||
                        (c.description &&
                          c.description.toLowerCase().includes(search.toLowerCase())) ||
                        (c.code && c.code.toLowerCase().includes(search.toLowerCase()))
                    );
                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={isAdmin ? 5 : 4} className="py-12 text-center">
                            <div className="flex flex-col items-center justify-center text-slate-400 space-y-1.5">
                              <Search className="w-7 h-7 stroke-1 text-slate-300" />
                              <p className="text-sm font-medium text-slate-600">No se encontraron categorías</p>
                              <p className="text-xs text-slate-400">
                                {search ? `Sin coincidencias para "${search}"` : "Aún no hay categorías registradas."}
                              </p>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    const paginated = filtered.slice(
                      (safeCurrentPage - 1) * pageSize,
                      safeCurrentPage * pageSize
                    );
                    return paginated.map((cat) => {
                      const codeDisplay = cat.code || `CAT-${cat.id.toString().padStart(3, "0")}`;
                      return (
                        <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-3.5 font-semibold text-slate-900">
                            {cat.name}
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="bg-slate-100 font-mono text-xs px-2.5 py-1 rounded-md text-slate-700 font-semibold border border-slate-200">
                              {codeDisplay}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-slate-500 text-xs">
                            {cat.description || <span className="italic text-slate-400">Sin descripción</span>}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              {cat._count?.products || 0} productos
                            </span>
                          </td>
                          {isAdmin && (
                            <td className="px-6 py-3.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditCategory(cat)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  title="Editar categoría"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteCategory(cat)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Eliminar categoría"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    });
                  })()}

                {/* Marcas */}
                {tab === "brands" &&
                  (() => {
                    const filtered = brands.filter(
                      (b) =>
                        b.name.toLowerCase().includes(search.toLowerCase()) ||
                        (b.description &&
                          b.description.toLowerCase().includes(search.toLowerCase()))
                    );
                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={isAdmin ? 4 : 3} className="py-12 text-center">
                            <div className="flex flex-col items-center justify-center text-slate-400 space-y-1.5">
                              <Search className="w-7 h-7 stroke-1 text-slate-300" />
                              <p className="text-sm font-medium text-slate-600">No se encontraron marcas comerciales</p>
                              <p className="text-xs text-slate-400">
                                {search ? `Sin coincidencias para "${search}"` : "Aún no hay marcas registradas."}
                              </p>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    const paginated = filtered.slice(
                      (safeCurrentPage - 1) * pageSize,
                      safeCurrentPage * pageSize
                    );
                    return paginated.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-3.5 font-semibold text-slate-900">
                          {b.name}
                        </td>
                        <td className="px-6 py-3.5 text-slate-500 text-xs">
                          {b.description || <span className="italic text-slate-400">Sin descripción</span>}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                            {b._count?.products || 0} productos
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditBrand(b)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Editar marca"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteBrand(b)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Eliminar marca"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ));
                  })()}

                {/* Unidades */}
                {tab === "units" &&
                  (() => {
                    const filtered = units.filter(
                      (u) =>
                        u.name.toLowerCase().includes(search.toLowerCase()) ||
                        u.abbreviation.toLowerCase().includes(search.toLowerCase())
                    );
                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={isAdmin ? 4 : 3} className="py-12 text-center">
                            <div className="flex flex-col items-center justify-center text-slate-400 space-y-1.5">
                              <Search className="w-7 h-7 stroke-1 text-slate-300" />
                              <p className="text-sm font-medium text-slate-600">No se encontraron unidades de medida</p>
                              <p className="text-xs text-slate-400">
                                {search ? `Sin coincidencias para "${search}"` : "Aún no hay unidades registradas."}
                              </p>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    const paginated = filtered.slice(
                      (safeCurrentPage - 1) * pageSize,
                      safeCurrentPage * pageSize
                    );
                    return paginated.map((u) => {
                      const totalProducts =
                        (u._count?.baseProducts || 0) + (u._count?.purchProducts || 0);
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-3.5 font-semibold text-slate-900">
                            {u.name}
                          </td>
                          <td className="px-6 py-3.5">
                            <span className="bg-slate-100 font-mono text-xs px-2.5 py-1 rounded-md text-slate-700 font-semibold border border-slate-200">
                              {u.abbreviation}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              {totalProducts} insumo(s)
                            </span>
                          </td>
                          {isAdmin && (
                            <td className="px-6 py-3.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditUnit(u)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  title="Editar unidad"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteUnit(u)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Eliminar unidad"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    });
                  })()}

                {/* Ubicaciones */}
                {tab === "locations" &&
                  (() => {
                    const filtered = locations.filter(
                      (l) =>
                        l.name.toLowerCase().includes(search.toLowerCase()) ||
                        (l.description &&
                          l.description.toLowerCase().includes(search.toLowerCase())) ||
                        l.type.toLowerCase().includes(search.toLowerCase())
                    );
                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={isAdmin ? 5 : 4} className="py-12 text-center">
                            <div className="flex flex-col items-center justify-center text-slate-400 space-y-1.5">
                              <Search className="w-7 h-7 stroke-1 text-slate-300" />
                              <p className="text-sm font-medium text-slate-600">No se encontraron ubicaciones físicas</p>
                              <p className="text-xs text-slate-400">
                                {search ? `Sin coincidencias para "${search}"` : "Aún no hay ubicaciones registradas."}
                              </p>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    const paginated = filtered.slice(
                      (safeCurrentPage - 1) * pageSize,
                      safeCurrentPage * pageSize
                    );
                    return paginated.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-3.5 font-semibold text-slate-900">
                          {l.name}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="inline-block bg-blue-50 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-semibold border border-blue-200">
                            {l.type}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-slate-500 text-xs">
                          {l.description || <span className="italic text-slate-400">Sin descripción</span>}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {l._count?.stockBatches || 0} lotes | {l._count?.fridges || 0} neveras
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditLocation(l)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Editar ubicación"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteLocation(l)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Eliminar ubicación"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ));
                  })()}

                {/* Departamentos */}
                {tab === "departments" &&
                  (() => {
                    const filtered = departments.filter(
                      (d) =>
                        d.name.toLowerCase().includes(search.toLowerCase()) ||
                        d.code.toLowerCase().includes(search.toLowerCase()) ||
                        (d.description &&
                          d.description.toLowerCase().includes(search.toLowerCase()))
                    );
                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={isAdmin ? 6 : 5} className="py-12 text-center">
                            <div className="flex flex-col items-center justify-center text-slate-400 space-y-1.5">
                              <Search className="w-7 h-7 stroke-1 text-slate-300" />
                              <p className="text-sm font-medium text-slate-600">No se encontraron departamentos</p>
                              <p className="text-xs text-slate-400">
                                {search ? `Sin coincidencias para "${search}"` : "Aún no hay departamentos registrados."}
                              </p>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    const paginated = filtered.slice(
                      (safeCurrentPage - 1) * pageSize,
                      safeCurrentPage * pageSize
                    );
                    return paginated.map((dep) => {
                      const reqCount = dep._count?.requests || 0;
                      const reqPurchCount = dep._count?.purchaseRequisitions || 0;
                      return (
                        <tr key={dep.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-3.5">
                            <span className="bg-slate-100 font-mono text-xs px-2.5 py-1 rounded-md text-slate-700 font-semibold border border-slate-200">
                              {dep.code}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 font-semibold text-slate-900">
                            {dep.name}
                          </td>
                          <td className="px-6 py-3.5 text-slate-500 text-xs">
                            {dep.description || <span className="italic text-slate-400">Sin descripción</span>}
                          </td>
                          <td className="px-6 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => void handleToggleDepartmentStatus(dep)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                                dep.isActive
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                                  : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                              }`}
                              title={
                                isAdmin
                                  ? `Clic para ${dep.isActive ? "desactivar" : "activar"}`
                                  : undefined
                              }
                              disabled={!isAdmin}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${dep.isActive ? "bg-emerald-600" : "bg-slate-400"}`} />
                              {dep.isActive ? "Activo" : "Inactivo"}
                            </button>
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              {reqCount} sol. | {reqPurchCount} preord.
                            </span>
                          </td>
                          {isAdmin && (
                            <td className="px-6 py-3.5 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditDepartment(dep)}
                                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  title="Editar área / departamento"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteDepartment(dep)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Eliminar área / departamento"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    });
                  })()}

                {/* Cuentas Institucionales */}
                {tab === "accounts" &&
                  (() => {
                    const filtered = bankAccounts.filter(
                      (a) =>
                        a.bankName.toLowerCase().includes(search.toLowerCase()) ||
                        (a.accountNumber &&
                          a.accountNumber.toLowerCase().includes(search.toLowerCase())) ||
                        a.holderName.toLowerCase().includes(search.toLowerCase()) ||
                        a.holderId.toLowerCase().includes(search.toLowerCase()) ||
                        a.currency.toLowerCase().includes(search.toLowerCase())
                    );
                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={canManageBankAccounts ? 7 : 6} className="py-12 text-center">
                            <div className="flex flex-col items-center justify-center text-slate-400 space-y-1.5">
                              <Search className="w-7 h-7 stroke-1 text-slate-300" />
                              <p className="text-sm font-medium text-slate-600">No se encontraron cuentas bancarias</p>
                              <p className="text-xs text-slate-400">
                                {search ? `Sin coincidencias para "${search}"` : "Aún no hay cuentas bancarias registradas."}
                              </p>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                    const paginated = filtered.slice(
                      (safeCurrentPage - 1) * pageSize,
                      safeCurrentPage * pageSize
                    );
                    return paginated.map((acc) => (
                      <tr key={acc.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-3.5 font-semibold text-slate-900 flex items-center gap-2">
                          <Landmark className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{acc.bankName}</span>
                        </td>
                        <td className="px-6 py-3.5 font-mono text-xs text-slate-600">
                          {acc.accountNumber || <span className="italic text-slate-400">N/A (Caja/Efectivo)</span>}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            {acc.type}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                              acc.currency === "USD"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : acc.currency === "EUR"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {acc.currency}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-xs text-slate-600">
                          <div className="font-semibold text-slate-800">{acc.holderName}</div>
                          <div className="font-mono text-slate-400 mt-0.5">{acc.holderId}</div>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          {canManageBankAccounts ? (
                            <button
                              type="button"
                              onClick={() => void handleToggleBankAccountStatus(acc)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer border transition-colors ${
                                acc.isActive
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                  : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                              }`}
                              title="Clic para alternar estado activo/inactivo"
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  acc.isActive ? "bg-emerald-600" : "bg-slate-400"
                                }`}
                              />
                              {acc.isActive ? "Activa" : "Inactiva"}
                            </button>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                                acc.isActive
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-100 text-slate-500 border-slate-200"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  acc.isActive ? "bg-emerald-600" : "bg-slate-400"
                                }`}
                              />
                              {acc.isActive ? "Activa" : "Inactiva"}
                            </span>
                          )}
                        </td>
                        {canManageBankAccounts && (
                          <td className="px-6 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditBankAccount(acc)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Editar cuenta"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              {isAdmin && (
                                <button
                                  type="button"
                                  onClick={() => void handleDeleteBankAccount(acc)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Eliminar cuenta"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ));
                  })()}
              </tbody>
            </table>
          </div>
        )}

        {/* Barra de Paginación */}
        {!loading && currentFilteredCount > 0 && (
          <div className="bg-slate-50/70 border-t border-slate-200 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-4 flex-wrap">
              <span>
                Mostrando <strong className="font-semibold text-slate-800">{startRecord}</strong> - <strong className="font-semibold text-slate-800">{endRecord}</strong> de{" "}
                <strong className="font-semibold text-slate-800">{currentFilteredCount}</strong> registros
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

              {/* Selector numérico de páginas */}
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
      </div>


      {/* Modal Estandarizado de Creación y Edición (Amplio sm:max-w-2xl en 2 Columnas) */}
      {showModal && (isAdmin || (tab === "accounts" && canManageBankAccounts)) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {tab === "accounts" &&
                    (editingBankAccount
                      ? "Editar Cuenta Institucional"
                      : "Registrar Nueva Cuenta Institucional")}
                  {tab === "departments" &&
                    (editingDepartment
                      ? "Editar Área / Departamento"
                      : "Registrar Nueva Área / Departamento")}
                  {tab === "categories" &&
                    (editingCategory
                      ? "Editar Categoría"
                      : "Registrar Nueva Categoría")}
                  {tab === "brands" &&
                    (editingBrand ? "Editar Marca Comercial" : "Registrar Nueva Marca Comercial")}
                  {tab === "units" &&
                    (editingUnit
                      ? "Editar Unidad de Medida"
                      : "Registrar Nueva Unidad de Medida")}
                  {tab === "locations" &&
                    (editingLocation
                      ? "Editar Ubicación Física"
                      : "Registrar Nueva Ubicación Física")}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete los campos requeridos para{" "}
                  {editingBankAccount ||
                  editingDepartment ||
                  editingCategory ||
                  editingBrand ||
                  editingUnit ||
                  editingLocation
                    ? "actualizar la información del"
                    : "dar de alta un nuevo"}{" "}
                  registro maestro.
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                title="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Cuentas Institucionales */}
              {tab === "accounts" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      Nombre del Banco o Entidad *
                    </label>
                    <input
                      type="text"
                      required
                      value={bankAccountForm.bankName}
                      onChange={(e) =>
                        setBankAccountForm({
                          ...bankAccountForm,
                          bankName: e.target.value,
                        })
                      }
                      placeholder="Ej. Banesco Banco Universal, Mercantil, Caja Chica"
                      className="w-full text-sm border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      Número de Cuenta
                    </label>
                    <input
                      type="text"
                      value={bankAccountForm.accountNumber}
                      onChange={(e) =>
                        setBankAccountForm({
                          ...bankAccountForm,
                          accountNumber: e.target.value,
                        })
                      }
                      placeholder="Ej. 0134-0001-00-0001234567 (o N/A)"
                      className="w-full text-sm border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-mono text-slate-800"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                        Tipo *
                      </label>
                      <select
                        value={bankAccountForm.type}
                        onChange={(e) =>
                          setBankAccountForm({
                            ...bankAccountForm,
                            type: e.target.value,
                          })
                        }
                        className="w-full text-sm border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-800 bg-white"
                      >
                        <option value="CORRIENTE">Corriente</option>
                        <option value="CUSTODIA">Custodia</option>
                        <option value="EFECTIVO">Efectivo / Caja</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                        Moneda *
                      </label>
                      <select
                        value={bankAccountForm.currency}
                        onChange={(e) =>
                          setBankAccountForm({
                            ...bankAccountForm,
                            currency: e.target.value,
                          })
                        }
                        className="w-full text-sm border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-800 bg-white"
                      >
                        <option value="VED">VED (Bolívares Bs.)</option>
                        <option value="USD">USD (Dólares $)</option>
                        <option value="EUR">EUR (Euros €)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      Nombre del Titular *
                    </label>
                    <input
                      type="text"
                      required
                      value={bankAccountForm.holderName}
                      onChange={(e) =>
                        setBankAccountForm({
                          ...bankAccountForm,
                          holderName: e.target.value,
                        })
                      }
                      placeholder="Ej. INSTITUTO DE INMUNOLOGÍA CLÍNICA IDI C.A."
                      className="w-full text-sm border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      RIF o Cédula del Titular *
                    </label>
                    <input
                      type="text"
                      required
                      value={bankAccountForm.holderId}
                      onChange={(e) =>
                        setBankAccountForm({
                          ...bankAccountForm,
                          holderId: e.target.value,
                        })
                      }
                      placeholder="Ej. J-12345678-0"
                      className="w-full text-sm border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-mono text-slate-800"
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="account-is-active"
                      checked={bankAccountForm.isActive}
                      onChange={(e) =>
                        setBankAccountForm({
                          ...bankAccountForm,
                          isActive: e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label
                      htmlFor="account-is-active"
                      className="text-sm font-medium text-slate-700 cursor-pointer"
                    >
                      Cuenta Activa y Disponible para Pagos Institucionales
                    </label>
                  </div>
                </div>
              )}

              {/* Departamentos */}
              {tab === "departments" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      Código del Área / Departamento *
                    </label>
                    <input
                      type="text"
                      required
                      value={departmentForm.code}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setDepartmentForm({
                          ...departmentForm,
                          code: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="Ej. INM-GEN, LAB-CLIN, SIS-INF"
                      className="w-full text-sm border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-mono text-slate-800 uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      Nombre del Área / Departamento *
                    </label>
                    <input
                      type="text"
                      required
                      value={departmentForm.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setDepartmentForm({
                          ...departmentForm,
                          name: e.target.value,
                        })
                      }
                      placeholder="Ej. Inmunología General, Laboratorio Clínico"
                      className="w-full text-sm border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-800"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      Descripción / Alcance Operativo (Opcional)
                    </label>
                    <textarea
                      value={departmentForm.description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setDepartmentForm({
                          ...departmentForm,
                          description: e.target.value,
                        })
                      }
                      placeholder="Detalles sobre funciones operativas, piso o ubicación..."
                      className="w-full text-sm border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-800"
                      rows={3}
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="department-is-active"
                      checked={departmentForm.isActive}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setDepartmentForm({
                          ...departmentForm,
                          isActive: e.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label
                      htmlFor="department-is-active"
                      className="text-sm font-medium text-slate-700 cursor-pointer"
                    >
                      Área Activa (disponible para nuevas solicitudes y preórdenes de compra)
                    </label>
                  </div>
                </div>
              )}

              {/* Categorías */}
              {tab === "categories" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      Nombre de la Categoría *
                    </label>
                    <input
                      type="text"
                      required
                      value={categoryForm.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCategoryForm({
                          ...categoryForm,
                          name: e.target.value,
                        })
                      }
                      placeholder="Ej. Reactivos Inmunológicos, Descartables"
                      className="w-full text-sm border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      Código / Abreviación (Opcional)
                    </label>
                    <input
                      type="text"
                      value={categoryForm.code}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCategoryForm({
                          ...categoryForm,
                          code: e.target.value,
                        })
                      }
                      placeholder="Ej. CAT-001, REACT-INM"
                      className="w-full text-sm border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-mono text-slate-800"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      Descripción / Notas de Clasificación
                    </label>
                    <textarea
                      value={categoryForm.description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setCategoryForm({
                          ...categoryForm,
                          description: e.target.value,
                        })
                      }
                      placeholder="Propósito, clasificación o alcance de los insumos de esta categoría..."
                      className="w-full text-sm border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-800"
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* Marcas */}
              {tab === "brands" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      Nombre Comercial de la Marca *
                    </label>
                    <input
                      type="text"
                      required
                      value={brandForm.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setBrandForm({ ...brandForm, name: e.target.value })
                      }
                      placeholder="Ej. Sigma-Aldrich, Bio-Rad, Thermo Fisher"
                      className="w-full text-sm border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-800"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      Descripción / Notas de Procedencia
                    </label>
                    <textarea
                      value={brandForm.description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setBrandForm({
                          ...brandForm,
                          description: e.target.value,
                        })
                      }
                      placeholder="Línea de insumos, país de procedencia, notas sobre el distribuidor..."
                      className="w-full text-sm border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-800"
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* Unidades */}
              {tab === "units" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      Nombre de la Unidad de Medida *
                    </label>
                    <input
                      type="text"
                      required
                      value={unitForm.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setUnitForm({ ...unitForm, name: e.target.value })
                      }
                      placeholder="Ej. Mililitro, Frasco, Determinación, Caja"
                      className="w-full text-sm border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      Abreviatura Oficial *
                    </label>
                    <input
                      type="text"
                      required
                      value={unitForm.abbreviation}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setUnitForm({
                          ...unitForm,
                          abbreviation: e.target.value,
                        })
                      }
                      placeholder="Ej. ml, Frc, Det, Cja"
                      className="w-full text-sm border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none font-mono text-slate-800"
                    />
                  </div>
                </div>
              )}

              {/* Ubicaciones */}
              {tab === "locations" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      Nombre de Ubicación *
                    </label>
                    <input
                      type="text"
                      required
                      value={locForm.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setLocForm({ ...locForm, name: e.target.value })
                      }
                      placeholder="Ej. Almacén Central PB, Laboratorio B, Depósito 3"
                      className="w-full text-sm border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      Tipo de Área *
                    </label>
                    <select
                      value={locForm.type}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setLocForm({
                          ...locForm,
                          type: e.target.value as LocationAreaType,
                        })
                      }
                      className="w-full text-sm border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-800 bg-white"
                    >
                      <option value="ALMACEN_GENERAL">Almacén General</option>
                      <option value="LABORATORIO">Laboratorio</option>
                      <option value="DEPOSITO">Depósito</option>
                      <option value="OFICINA">Oficina</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                      Observaciones / Condiciones Físicas
                    </label>
                    <textarea
                      value={locForm.description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setLocForm({ ...locForm, description: e.target.value })
                      }
                      placeholder="Detalles sobre temperatura ambiente, refrigeración, piso, estanterías..."
                      className="w-full text-sm border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-800"
                      rows={3}
                    />
                  </div>
                </div>
              )}

              {/* Botones de acción del Modal */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingBankAccount ||
                  editingDepartment ||
                  editingCategory ||
                  editingBrand ||
                  editingUnit ||
                  editingLocation
                    ? "Guardar Cambios"
                    : "Registrar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
