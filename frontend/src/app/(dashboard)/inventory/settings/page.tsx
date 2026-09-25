"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  InventoryMasterService,
  CategoryItem,
  Brand,
  Unit,
  LocationItem,
  LocationAreaType,
} from "@/services/inventory-master.service";
import { AuthService } from "@/services/auth.service";
import type { AuthUser } from "@/types/auth";
import {
  FolderTree,
  Tag,
  Scale,
  MapPin,
  Plus,
  Loader2,
  Search,
  AlertCircle,
  Pencil,
  Trash2,
  CheckCircle2,
} from "lucide-react";

type TabType = "categories" | "brands" | "units" | "locations";

export default function InventorySettingsPage() {
  const [currentUser] = useState<AuthUser | null>(() =>
    AuthService.getCurrentUser(),
  );
  const userRoles = currentUser?.roles || [];
  const isAdmin = userRoles.includes("ADMINISTRADOR");

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

  // Estados de modales y edición
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
        const [c, b, u, l] = await Promise.all([
          InventoryMasterService.getCategories(),
          InventoryMasterService.getBrands(),
          InventoryMasterService.getUnits(),
          InventoryMasterService.getLocations(),
        ]);
        if (isMounted) {
          setCategories(c);
          setBrands(b);
          setUnits(u);
          setLocations(l);
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
    if (tab === "categories") {
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

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setEditingBrand(null);
    setEditingUnit(null);
    setEditingLocation(null);
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
    if (!isAdmin) return;
    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (tab === "categories") {
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
        {isAdmin && (
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
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
      <div className="flex border-b border-slate-200">
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
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
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
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
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
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
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
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
            tab === "locations"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <MapPin className="w-4 h-4" />
          Ubicaciones Físicas ({locations.length})
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
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
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
                  {editingCategory || editingBrand || editingUnit || editingLocation
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
