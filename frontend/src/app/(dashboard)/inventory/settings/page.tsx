"use client";

import React, { useState, useEffect, useTransition } from "react";
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

  // Estados de datos
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([]);

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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Catálogos de Inventario
          </h1>
          <p className="text-sm text-slate-500">
            Gestión centralizada de categorías, marcas comerciales, unidades de
            medida y ubicaciones físicas.
          </p>
        </div>
        {(isAdmin || (tab === "accounts" && canManageBankAccounts)) && (
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
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
        <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 p-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            startTransition(() => {
              setTab("categories");
              setSearch("");
              setErrorMessage(null);
              setSuccessMessage(null);
            });
          }}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors cursor-pointer shrink-0 ${
            tab === "categories"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700"
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
              setErrorMessage(null);
              setSuccessMessage(null);
            });
          }}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors cursor-pointer shrink-0 ${
            tab === "brands"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700"
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
              setErrorMessage(null);
              setSuccessMessage(null);
            });
          }}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors cursor-pointer shrink-0 ${
            tab === "units"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Scale className="w-4 h-4" />
          Unidades de Medida ({units.length})
        </button>
        <button
          type="button"
          onClick={() => {
            startTransition(() => {
              setTab("locations");
              setSearch("");
              setErrorMessage(null);
              setSuccessMessage(null);
            });
          }}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors cursor-pointer shrink-0 ${
            tab === "locations"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <MapPin className="w-4 h-4" />
          Ubicaciones Físicas ({locations.length})
        </button>
        <button
          type="button"
          onClick={() => {
            startTransition(() => {
              setTab("departments");
              setSearch("");
              setErrorMessage(null);
              setSuccessMessage(null);
            });
          }}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors cursor-pointer shrink-0 ${
            tab === "departments"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700"
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
              setErrorMessage(null);
              setSuccessMessage(null);
            });
          }}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors cursor-pointer shrink-0 ${
            tab === "accounts"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Landmark className="w-4 h-4" />
          Cuentas Institucionales ({bankAccounts.length})
        </button>
      </div>

      {/* Buscador */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setSearch(e.target.value)
          }
          className="pl-9 pr-4 py-2 w-full text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-500"
        />
      </div>

      {/* Tabla de contenido */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center items-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-600">
              {tab === "categories" && (
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">Nombre</th>
                  <th className="px-6 py-3 text-left font-semibold">
                    Código / Abreviación
                  </th>
                  <th className="px-6 py-3 text-left font-semibold">
                    Descripción
                  </th>
                  <th className="px-6 py-3 text-right font-semibold">
                    Productos Vinculados
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-center font-semibold">
                      Acciones
                    </th>
                  )}
                </tr>
              )}
              {tab === "brands" && (
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">
                    Nombre Comercial
                  </th>
                  <th className="px-6 py-3 text-left font-semibold">
                    Descripción / Notas
                  </th>
                  <th className="px-6 py-3 text-right font-semibold">
                    Productos Vinculados
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-center font-semibold">
                      Acciones
                    </th>
                  )}
                </tr>
              )}
              {tab === "units" && (
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">
                    Nombre de la Unidad
                  </th>
                  <th className="px-6 py-3 text-left font-semibold">
                    Abreviatura
                  </th>
                  <th className="px-6 py-3 text-right font-semibold">
                    Insumos Vinculados
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-center font-semibold">
                      Acciones
                    </th>
                  )}
                </tr>
              )}
              {tab === "locations" && (
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">
                    Nombre de Ubicación
                  </th>
                  <th className="px-6 py-3 text-left font-semibold">
                    Tipo / Observaciones
                  </th>
                  <th className="px-6 py-3 text-right font-semibold">
                    Lotes / Neveras
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-center font-semibold">
                      Acciones
                    </th>
                  )}
                </tr>
              )}
              {tab === "departments" && (
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">Código</th>
                  <th className="px-6 py-3 text-left font-semibold">
                    Área / Departamento
                  </th>
                  <th className="px-6 py-3 text-left font-semibold">
                    Descripción / Alcance
                  </th>
                  <th className="px-6 py-3 text-center font-semibold">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right font-semibold">
                    Vinculaciones
                  </th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-center font-semibold">
                      Acciones
                    </th>
                  )}
                </tr>
              )}
              {tab === "accounts" && (
                <tr>
                  <th className="px-6 py-3 text-left font-semibold">Banco / Institución</th>
                  <th className="px-6 py-3 text-left font-semibold">N° de Cuenta</th>
                  <th className="px-6 py-3 text-center font-semibold">Tipo</th>
                  <th className="px-6 py-3 text-center font-semibold">Moneda</th>
                  <th className="px-6 py-3 text-left font-semibold">Titular / RIF</th>
                  <th className="px-6 py-3 text-center font-semibold">Estado</th>
                  {canManageBankAccounts && (
                    <th className="px-6 py-3 text-center font-semibold">Acciones</th>
                  )}
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {tab === "accounts" &&
                bankAccounts
                  .filter(
                    (a) =>
                      a.bankName.toLowerCase().includes(search.toLowerCase()) ||
                      (a.accountNumber && a.accountNumber.toLowerCase().includes(search.toLowerCase())) ||
                      a.holderName.toLowerCase().includes(search.toLowerCase()) ||
                      a.holderId.toLowerCase().includes(search.toLowerCase()) ||
                      a.currency.toLowerCase().includes(search.toLowerCase())
                  )
                  .map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 flex items-center gap-2">
                        <Landmark className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{acc.bankName}</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-600">
                        {acc.accountNumber || "N/A (Caja/Efectivo)"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {acc.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          acc.currency === "USD"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : acc.currency === "EUR"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {acc.currency}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        <div className="font-medium text-slate-800">{acc.holderName}</div>
                        <div className="font-mono text-slate-500">{acc.holderId}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {canManageBankAccounts ? (
                          <button
                            type="button"
                            onClick={() => void handleToggleBankAccountStatus(acc)}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer border transition-colors ${
                              acc.isActive
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                : "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200"
                            }`}
                            title="Clic para cambiar estado"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${acc.isActive ? "bg-emerald-600" : "bg-slate-400"}`} />
                            {acc.isActive ? "Activa" : "Inactiva"}
                          </button>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                            acc.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${acc.isActive ? "bg-emerald-600" : "bg-slate-400"}`} />
                            {acc.isActive ? "Activa" : "Inactiva"}
                          </span>
                        )}
                      </td>
                      {canManageBankAccounts && (
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditBankAccount(acc)}
                              className="p-1.5 text-slate-600 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Editar cuenta"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => void handleDeleteBankAccount(acc)}
                                className="p-1.5 text-slate-600 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                                title="Eliminar / Desactivar cuenta"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
              {tab === "departments" &&
                departments
                  .filter(
                    (d) =>
                      d.name.toLowerCase().includes(search.toLowerCase()) ||
                      d.code.toLowerCase().includes(search.toLowerCase()) ||
                      (d.description &&
                        d.description
                          .toLowerCase()
                          .includes(search.toLowerCase())),
                  )
                  .map((dep) => {
                    const reqCount = dep._count?.requests || 0;
                    const reqPurchCount = dep._count?.purchaseRequisitions || 0;
                    return (
                      <tr key={dep.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <span className="bg-slate-100 font-mono text-xs px-2.5 py-1 rounded text-slate-700 font-semibold border border-slate-200">
                            {dep.code}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {dep.name}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {dep.description || "Sin descripción"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => void handleToggleDepartmentStatus(dep)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
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
                            {dep.isActive ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Activo
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3.5 h-3.5" />
                                Inactivo
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            {reqCount} sol. | {reqPurchCount} preord.
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditDepartment(dep)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
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
                  })}
              {tab === "categories" &&
                categories
                  .filter(
                    (c) =>
                      c.name.toLowerCase().includes(search.toLowerCase()) ||
                      (c.description &&
                        c.description
                          .toLowerCase()
                          .includes(search.toLowerCase())) ||
                      (c.code &&
                        c.code.toLowerCase().includes(search.toLowerCase())),
                  )
                  .map((cat) => {
                    const codeDisplay =
                      cat.code || `CAT-${cat.id.toString().padStart(3, "0")}`;
                    return (
                      <tr key={cat.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {cat.name}
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-slate-100 font-mono text-xs px-2 py-1 rounded text-slate-700 font-semibold border border-slate-200">
                            {codeDisplay}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {cat.description || "Sin descripción"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            {cat._count?.products || 0} productos
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditCategory(cat)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
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
                  })}

              {tab === "brands" &&
                brands
                  .filter(
                    (b) =>
                      b.name.toLowerCase().includes(search.toLowerCase()) ||
                      (b.description &&
                        b.description
                          .toLowerCase()
                          .includes(search.toLowerCase())),
                  )
                  .map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {b.name}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {b.description || "Sin descripción"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                          {b._count?.products || 0} productos
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditBrand(b)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
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
                  ))}

              {tab === "units" &&
                units
                  .filter(
                    (u) =>
                      u.name.toLowerCase().includes(search.toLowerCase()) ||
                      u.abbreviation
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                  )
                  .map((u) => {
                    const totalProducts =
                      (u._count?.baseProducts || 0) +
                      (u._count?.purchProducts || 0);
                    return (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 font-semibold text-slate-900">
                          {u.name}
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-slate-100 font-mono text-xs px-2 py-1 rounded text-slate-700 font-semibold border border-slate-200">
                            {u.abbreviation}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            {totalProducts} insumo(s)
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditUnit(u)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
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
                  })}

              {tab === "locations" &&
                locations
                  .filter(
                    (l) =>
                      l.name.toLowerCase().includes(search.toLowerCase()) ||
                      (l.description &&
                        l.description
                          .toLowerCase()
                          .includes(search.toLowerCase())) ||
                      l.type.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {l.name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-medium">
                          {l.type}
                        </span>
                        {l.description && (
                          <span className="ml-2 text-slate-500 text-xs">
                            {l.description}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {l._count?.stockBatches || 0} lotes |{" "}
                          {l._count?.fridges || 0} neveras
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditLocation(l)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
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
                  ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Estandarizado de Creación y Edición (Exclusivo Administrador) */}
      {showModal && isAdmin && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
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
                (editingBrand ? "Editar Marca" : "Registrar Nueva Marca")}
              {tab === "units" &&
                (editingUnit
                  ? "Editar Unidad de Medida"
                  : "Registrar Nueva Unidad de Medida")}
              {tab === "locations" &&
                (editingLocation
                  ? "Editar Ubicación Física"
                  : "Registrar Nueva Ubicación Física")}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {tab === "accounts" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
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
                      className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      Número de Cuenta (20 dígitos o N/A para Efectivo)
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
                      placeholder="Ej. 0134-0001-00-0001234567"
                      className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-slate-700"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                        Tipo de Cuenta *
                      </label>
                      <select
                        value={bankAccountForm.type}
                        onChange={(e) =>
                          setBankAccountForm({
                            ...bankAccountForm,
                            type: e.target.value,
                          })
                        }
                        className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 bg-white"
                      >
                        <option value="CORRIENTE">Corriente</option>
                        <option value="CUSTODIA">Custodia</option>
                        <option value="EFECTIVO">Efectivo / Caja</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
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
                        className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700 bg-white"
                      >
                        <option value="VED">VED (Bolívares Bs.)</option>
                        <option value="USD">USD (Dólares $)</option>
                        <option value="EUR">EUR (Euros €)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
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
                      className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
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
                      className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-slate-700"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
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
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label
                      htmlFor="account-is-active"
                      className="text-sm font-medium text-slate-700 cursor-pointer"
                    >
                      Cuenta Activa y Disponible para Pagos
                    </label>
                  </div>
                </>
              )}
              {tab === "departments" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
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
                      className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-slate-700 uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
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
                      className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      Descripción / Alcance (Opcional)
                    </label>
                    <textarea
                      value={departmentForm.description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setDepartmentForm({
                          ...departmentForm,
                          description: e.target.value,
                        })
                      }
                      placeholder="Detalles sobre funciones, piso o ubicación..."
                      className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-700"
                      rows={2}
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
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
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    <label
                      htmlFor="department-is-active"
                      className="text-sm font-medium text-slate-700 cursor-pointer"
                    >
                      Área Activa (disponible para nuevas solicitudes y preórdenes)
                    </label>
                  </div>
                </>
              )}
              {tab === "categories" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
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
                      className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
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
                      className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      Descripción / Notas
                    </label>
                    <textarea
                      value={categoryForm.description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setCategoryForm({
                          ...categoryForm,
                          description: e.target.value,
                        })
                      }
                      placeholder="Propósito, clasificación o alcance de la categoría..."
                      className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-500"
                      rows={2}
                    />
                  </div>
                </>
              )}

              {tab === "brands" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      Nombre Comercial *
                    </label>
                    <input
                      type="text"
                      required
                      value={brandForm.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setBrandForm({ ...brandForm, name: e.target.value })
                      }
                      placeholder="Ej. Sigma-Aldrich, Bio-Rad"
                      className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      Descripción / Notas
                    </label>
                    <textarea
                      value={brandForm.description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setBrandForm({
                          ...brandForm,
                          description: e.target.value,
                        })
                      }
                      placeholder="Línea de productos, procedencia o notas..."
                      className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-500"
                      rows={2}
                    />
                  </div>
                </>
              )}

              {tab === "units" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      Nombre de la Unidad *
                    </label>
                    <input
                      type="text"
                      required
                      value={unitForm.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setUnitForm({ ...unitForm, name: e.target.value })
                      }
                      placeholder="Ej. Mililitro, Frasco, Determinación"
                      className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      Abreviatura *
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
                      placeholder="Ej. ml, Frc, Det"
                      className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-mono text-slate-500"
                    />
                  </div>
                </>
              )}

              {tab === "locations" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      Nombre de Ubicación *
                    </label>
                    <input
                      type="text"
                      required
                      value={locForm.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setLocForm({ ...locForm, name: e.target.value })
                      }
                      placeholder="Ej. Almacén Central PB, Laboratorio B"
                      className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
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
                      className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-500"
                    >
                      <option value="ALMACEN_GENERAL">Almacén General</option>
                      <option value="LABORATORIO">Laboratorio</option>
                      <option value="DEPOSITO">Depósito</option>
                      <option value="OFICINA">Oficina</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      Observaciones
                    </label>
                    <textarea
                      value={locForm.description}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setLocForm({ ...locForm, description: e.target.value })
                      }
                      placeholder="Detalles sobre temperatura, piso o estantería..."
                      className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none text-slate-500"
                      rows={2}
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 font-medium cursor-pointer"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingBankAccount ||
                  editingDepartment ||
                  editingCategory ||
                  editingBrand ||
                  editingUnit ||
                  editingLocation
                    ? "Guardar Cambios"
                    : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
