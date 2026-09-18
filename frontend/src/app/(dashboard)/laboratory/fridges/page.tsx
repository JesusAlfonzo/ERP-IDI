"use client";

import React, { useState, useEffect } from "react";
import {
  LabFridgeService,
  LabFridge,
  ReagentInFridge,
} from "@/services/lab-fridge.service";
import {
  InventoryMasterService,
  LocationItem,
} from "@/services/inventory-master.service";
import {
  Thermometer,
  Plus,
  Loader2,
  Search,
  Box,
  CheckCircle2,
  Snowflake,
} from "lucide-react";

export default function LaboratoryFridgesPage() {
  const [fridges, setFridges] = useState<LabFridge[]>([]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFridge, setSelectedFridge] = useState<LabFridge | null>(null);
  const [fridgeContents, setFridgeContents] = useState<ReagentInFridge[]>([]);
  const [loadingContents, setLoadingContents] = useState(false);

  // Modal para nueva nevera
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fridgeForm, setFridgeForm] = useState({
    locationId: "",
    code: "",
    name: "",
    targetTempCelsius: "4.0",
    description: "",
  });

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const [fData, locData] = await Promise.all([
          LabFridgeService.getFridges(),
          InventoryMasterService.getLocations(),
        ]);
        if (isMounted) {
          setFridges(fData);
          setLocations(
            locData.filter(
              (l) => l.type === "LABORATORIO" || l.type === "ALMACEN_GENERAL",
            ),
          );
          setLoading(false);
        }
      } catch (err) {
        console.error("Error cargando neveras", err);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectFridge = async (fridge: LabFridge) => {
    setSelectedFridge(fridge);
    setLoadingContents(true);
    try {
      const res = await LabFridgeService.getFridgeContents(fridge.id);
      setFridgeContents(res?.labReagentUnits ?? []);
    } catch (err) {
      console.error("Error cargando contenido", err);
      setFridgeContents([]);
    } finally {
      setLoadingContents(false);
    }
  };

  const handleCreateFridge = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await LabFridgeService.createFridge({
        locationId: Number(fridgeForm.locationId),
        code: fridgeForm.code,
        name: fridgeForm.name,
        targetTempCelsius: fridgeForm.targetTempCelsius
          ? Number(fridgeForm.targetTempCelsius)
          : null,
        description: fridgeForm.description || null,
      });
      setFridges((prev) => [...prev, created]);
      setShowModal(false);
      setFridgeForm({
        locationId: "",
        code: "",
        name: "",
        targetTempCelsius: "4.0",
        description: "",
      });
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const resErr = err as { response?: { data?: { message?: string } } };
        alert(resErr.response?.data?.message ?? "Error al registrar la nevera");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Snowflake className="w-6 h-6 text-blue-600" />
            Cadena de Frío y Equipos de Conservación
          </h1>
          <p className="text-sm text-slate-500">
            Monitoreo y asignación de reactivos en neveras, congeladores y cavas
            clínicas.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nueva Nevera / Cava
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: Tarjetas de Neveras */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar equipo por código o nombre..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearch(e.target.value)
              }
              className="pl-9 pr-4 py-2 w-full text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-3">
              {fridges
                .filter(
                  (f) =>
                    f.name.toLowerCase().includes(search.toLowerCase()) ||
                    f.code.toLowerCase().includes(search.toLowerCase()),
                )
                .map((fridge) => {
                  const isSelected = selectedFridge?.id === fridge.id;
                  return (
                    <div
                      key={fridge.id}
                      onClick={() => void handleSelectFridge(fridge)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "border-blue-600 bg-blue-50/50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {fridge.code}
                          </span>
                          <h3 className="font-semibold text-slate-900 mt-1">
                            {fridge.name}
                          </h3>
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                          <CheckCircle2 className="w-3 h-3" />
                          {fridge.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <Thermometer className="w-3.5 h-3.5 text-blue-500" />
                          {fridge.targetTempCelsius !== null
                            ? `${fridge.targetTempCelsius}°C`
                            : "N/A"}
                        </span>
                        <span>
                          {fridge._count?.labReagentUnits ?? 0} unidades en
                          custodia
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Columna Derecha: Detalle de Reactivos */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-full flex flex-col">
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-slate-900">
                  {selectedFridge
                    ? `Contenido de ${selectedFridge.name} (${selectedFridge.code})`
                    : "Seleccione un equipo"}
                </h2>
                <p className="text-xs text-slate-500">
                  Frascos y reactivos almacenados actualmente
                </p>
              </div>
            </div>

            <div className="p-4 flex-1">
              {!selectedFridge ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                  <Box className="w-12 h-12 stroke-[1.5] mb-2" />
                  <p className="text-sm">
                    Haga clic en un equipo del panel izquierdo para auditar su
                    contenido.
                  </p>
                </div>
              ) : loadingContents ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : fridgeContents.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                  <Thermometer className="w-10 h-10 stroke-[1.5] mb-2 text-slate-300" />
                  <p className="text-sm">
                    No hay unidades activas registradas en esta nevera.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead>
                      <tr className="text-xs font-semibold text-slate-500 text-left">
                        <th className="pb-3">Código Frasco</th>
                        <th className="pb-3">Reactivo / Insumo</th>
                        <th className="pb-3">Lote</th>
                        <th className="pb-3">Volumen Actual</th>
                        <th className="pb-3">Vencimiento</th>
                        <th className="pb-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fridgeContents.map((unit) => (
                        <tr key={unit.id} className="hover:bg-slate-50">
                          <td className="py-3 font-mono text-xs font-semibold text-slate-900">
                            {unit.unitCode}
                          </td>
                          <td className="py-3">
                            <div className="font-medium text-slate-900">
                              {unit.product?.name ?? "Sin nombre"}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              {unit.product?.sku}
                            </div>
                          </td>
                          <td className="py-3 font-mono text-xs">
                            {unit.batch?.lotNumber ?? "-"}
                          </td>
                          <td className="py-3">
                            <span className="font-semibold text-slate-800">
                              {String(unit.currentVolume)}
                            </span>
                            <span className="text-xs text-slate-400 ml-1">
                              / {String(unit.initialVolume)}
                            </span>
                          </td>
                          <td className="py-3 text-xs text-slate-600">
                            {unit.expirationDate
                              ? new Date(
                                  unit.expirationDate,
                                ).toLocaleDateString()
                              : "N/A"}
                          </td>
                          <td className="py-3">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                unit.status === "SELLADO"
                                  ? "bg-blue-50 text-blue-700"
                                  : unit.status === "EN_USO"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {unit.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal para crear nuevo equipo */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Registrar Equipo de Frío
            </h3>

            <form onSubmit={handleCreateFridge} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Ubicación Física
                </label>
                <select
                  required
                  value={fridgeForm.locationId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setFridgeForm({ ...fridgeForm, locationId: e.target.value })
                  }
                  className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Seleccione el área o laboratorio...</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name} ({loc.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Código del Equipo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. NEV-03, CAVA-02, FREEZER-20C"
                  value={fridgeForm.code}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFridgeForm({
                      ...fridgeForm,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full text-sm border rounded-lg p-2.5 font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Nombre Comercial / Etiqueta
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Nevera Reactivos Inmunología"
                  value={fridgeForm.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFridgeForm({ ...fridgeForm, name: e.target.value })
                  }
                  className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Temperatura Objetivo (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={fridgeForm.targetTempCelsius}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFridgeForm({
                      ...fridgeForm,
                      targetTempCelsius: e.target.value,
                    })
                  }
                  className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  Notas / Descripción
                </label>
                <textarea
                  value={fridgeForm.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFridgeForm({
                      ...fridgeForm,
                      description: e.target.value,
                    })
                  }
                  rows={2}
                  className="w-full text-sm border rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

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
                  Guardar Equipo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
