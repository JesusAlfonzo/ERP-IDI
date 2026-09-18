"use client";

import React, { useState, useEffect } from "react";
import {
  InventoryMasterService,
  Brand,
  Unit,
  LocationItem,
} from "@/services/inventory-master.service";
import {
  Tag,
  Scale,
  MapPin,
  Plus,
  Loader2,
  Search,
  AlertCircle,
} from "lucide-react";

type LocationAreaType =
  | "ALMACEN_GENERAL"
  | "LABORATORIO"
  | "OFICINA"
  | "DEPOSITO";

export default function InventorySettingsPage() {
  const [tab, setTab] = useState<"brands" | "units" | "locations">("brands");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estados de datos
  const [brands, setBrands] = useState<Brand[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);

  // Estados de modales
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Formularios
  const [brandForm, setBrandForm] = useState({ name: "", description: "" });
  const [unitForm, setUnitForm] = useState({ name: "", abbreviation: "" });
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
        const [b, u, l] = await Promise.all([
          InventoryMasterService.getBrands(),
          InventoryMasterService.getUnits(),
          InventoryMasterService.getLocations(),
        ]);
        if (isMounted) {
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

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      if (tab === "brands") {
        const created = await InventoryMasterService.createBrand(brandForm);
        setBrands((prev) => [...prev, created]);
        setBrandForm({ name: "", description: "" });
      } else if (tab === "units") {
        const created = await InventoryMasterService.createUnit(unitForm);
        setUnits((prev) => [...prev, created]);
        setUnitForm({ name: "", abbreviation: "" });
      } else {
        const created = await InventoryMasterService.createLocation(locForm);
        setLocations((prev) => [...prev, created]);
        setLocForm({ name: "", type: "ALMACEN_GENERAL", description: "" });
      }
      setShowModal(false);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const resErr = err as { response?: { data?: { message?: string } } };
        setErrorMessage(
          resErr.response?.data?.message ?? "Error al guardar el registro",
        );
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
            Gestión de marcas comerciales, unidades de medida y ubicaciones
            físicas.
          </p>
        </div>
        <button
          onClick={() => {
            setErrorMessage(null);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {tab === "brands" && "Nueva Marca"}
          {tab === "units" && "Nueva Unidad"}
          {tab === "locations" && "Nueva Ubicación"}
        </button>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => {
            setTab("brands");
            setSearch("");
          }}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors ${
            tab === "brands"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Tag className="w-4 h-4" />
          Marcas ({brands.length})
        </button>
        <button
          onClick={() => {
            setTab("units");
            setSearch("");
          }}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors ${
            tab === "units"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Scale className="w-4 h-4" />
          Unidades de Medida ({units.length})
        </button>
        <button
          onClick={() => {
            setTab("locations");
            setSearch("");
          }}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-colors ${
            tab === "locations"
              ? "border-blue-600 text-blue-600"
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
          className="pl-9 pr-4 py-2 w-full text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <tr>
                <th className="px-6 py-3 text-left font-semibold">
                  Nombre / Código
                </th>
                <th className="px-6 py-3 text-left font-semibold">
                  Detalle / Abreviatura
                </th>
                <th className="px-6 py-3 text-right font-semibold">
                  Registros Vinculados
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {tab === "brands" &&
                brands
                  .filter((b) =>
                    b.name.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {b.name}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {b.description || "Sin descripción"}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-500">
                        {b._count?.products || 0} productos
                      </td>
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
                  .map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {u.name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 font-mono text-xs px-2 py-1 rounded text-slate-700">
                          {u.abbreviation}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-500">
                        {u._count?.baseProducts || 0} insumos
                      </td>
                    </tr>
                  ))}

              {tab === "locations" &&
                locations
                  .filter((l) =>
                    l.name.toLowerCase().includes(search.toLowerCase()),
                  )
                  .map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {l.name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-medium">
                          {l.type}
                        </span>
                        {l.description && (
                          <span className="ml-2 text-slate-400 text-xs">
                            {l.description}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-500">
                        {l._count?.stockBatches || 0} lotes |{" "}
                        {l._count?.fridges || 0} neveras
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Genérico */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              {tab === "brands" && "Registrar Nueva Marca"}
              {tab === "units" && "Registrar Nueva Unidad"}
              {tab === "locations" && "Registrar Nueva Ubicación"}
            </h3>

            <form onSubmit={handleCreate} className="space-y-4">
              {tab === "brands" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      Nombre Comercial
                    </label>
                    <input
                      type="text"
                      required
                      value={brandForm.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setBrandForm({ ...brandForm, name: e.target.value })
                      }
                      placeholder="Ej. Sigma-Aldrich, Bio-Rad"
                      className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
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
                      className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                      rows={2}
                    />
                  </div>
                </>
              )}

              {tab === "units" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      Nombre de la Unidad
                    </label>
                    <input
                      type="text"
                      required
                      value={unitForm.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setUnitForm({ ...unitForm, name: e.target.value })
                      }
                      placeholder="Ej. Mililitro, Frasco, Determinación"
                      className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      Abreviatura
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
                      className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    />
                  </div>
                </>
              )}

              {tab === "locations" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      Nombre de Ubicación
                    </label>
                    <input
                      type="text"
                      required
                      value={locForm.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setLocForm({ ...locForm, name: e.target.value })
                      }
                      placeholder="Ej. Almacén Central PB, Laboratorio B"
                      className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                      Tipo de Área
                    </label>
                    <select
                      value={locForm.type}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setLocForm({
                          ...locForm,
                          type: e.target.value as LocationAreaType,
                        })
                      }
                      className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
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
                      className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                      rows={2}
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 font-medium"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
