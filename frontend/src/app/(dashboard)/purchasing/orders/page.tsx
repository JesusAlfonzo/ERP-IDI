"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PurchasingClientService } from "@/services/purchasing.service";
import { InventoryClientService } from "@/services/inventory.service";
import { AuthService } from "@/services/auth.service";
import type {
  PurchaseOrder,
  Supplier,
  Currency,
  PurchaseOrderStatus,
} from "@/types/purchasing";
import type { Product } from "@/types/inventory";
import {
  ShoppingCart,
  Plus,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  Building2,
  Coins,
  Loader2,
  PackageCheck,
  Eye,
} from "lucide-react";

const STATUS_BADGES: Record<
  PurchaseOrderStatus,
  { label: string; className: string }
> = {
  BORRADOR: {
    label: "Borrador",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  PENDIENTE: {
    label: "Pendiente",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  APROBADA: {
    label: "Aprobada",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  EN_PROCESO: {
    label: "En Tránsito",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  PARCIAL: {
    label: "Parcial",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  COMPLETADA: {
    label: "Completada",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  RECIBIDO: {
    label: "Recibido",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  CANCELADA: {
    label: "Cancelada",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
  CANCELADO: {
    label: "Cancelado",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

interface FormRow {
  productId: number;
  unitId: number;
  quantityOrdered: number;
  unitPrice: number;
}

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Modal de Creación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState<string>("");
  const [currencyId, setCurrencyId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [items, setItems] = useState<FormRow[]>([
    { productId: 0, unitId: 0, quantityOrdered: 1, unitPrice: 0 },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersData, suppliersData, currenciesData, productsData] =
        await Promise.all([
          PurchasingClientService.getOrders(statusFilter || undefined).catch(
            () => [],
          ),
          PurchasingClientService.getSuppliers().catch(() => []),
          PurchasingClientService.getCurrencies().catch(() => []),
          InventoryClientService.getProducts().catch(() => []),
        ]);
      setOrders(ordersData);
      setSuppliers(suppliersData);
      setCurrencies(currenciesData);
      setCatalogProducts(productsData);

      if (currenciesData.length > 0 && !currencyId) {
        setCurrencyId(String(currenciesData[0].id));
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, currencyId]);

  useEffect(() => {
    let isMounted = true;
    if (!AuthService.isAuthenticated()) {
      router.replace("/login");
      return;
    }
    const init = async () => {
      if (isMounted) await loadData();
    };
    void init();
    return () => {
      isMounted = false;
    };
  }, [router, loadData]);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { productId: 0, unitId: 0, quantityOrdered: 1, unitPrice: 0 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index: number, pId: number) => {
    const selectedProd = catalogProducts.find((p) => p.id === pId);
    const unitId =
      selectedProd?.baseUnitId || selectedProd?.purchaseUnitId || 1;

    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], productId: pId, unitId };
      return updated;
    });
  };

  const handleRowChange = (
    index: number,
    field: "quantityOrdered" | "unitPrice",
    val: number,
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const orderTotalEstimated = items.reduce(
    (acc, curr) =>
      acc + (Number(curr.quantityOrdered) || 0) * (Number(curr.unitPrice) || 0),
    0,
  );

  const selectedCurrency = currencies.find((c) => c.id === Number(currencyId));

  const handleSubmitOrder = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!currencyId) {
      setFeedback({
        status: "error",
        message: "Seleccione la moneda de compra.",
      });
      return;
    }

    const hasInvalidItem = items.some(
      (it) => !it.productId || it.quantityOrdered <= 0 || it.unitPrice <= 0,
    );

    if (hasInvalidItem) {
      setFeedback({
        status: "error",
        message:
          "Asegúrese de seleccionar producto, cantidad y costo válido en cada renglón.",
      });
      return;
    }

    setSubmitting(true);
    try {
      await PurchasingClientService.createOrder({
        supplierId: supplierId ? Number(supplierId) : null,
        currencyId: Number(currencyId),
        notes: notes.trim() || null,
        items: items.map((it) => ({
          productId: Number(it.productId),
          unitId: Number(it.unitId),
          quantityOrdered: Number(it.quantityOrdered),
          unitPrice: Number(it.unitPrice),
        })),
      });

      setFeedback({
        status: "success",
        message: "Orden de compra creada exitosamente.",
      });
      await loadData();

      setTimeout(() => {
        setIsModalOpen(false);
        setSupplierId("");
        setNotes("");
        setItems([
          { productId: 0, unitId: 0, quantityOrdered: 1, unitPrice: 0 },
        ]);
        setFeedback(null);
      }, 1000);
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message:
          err instanceof Error ? err.message : "Error al registrar la orden.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-blue-600" />
            Órdenes de Compra y Abastecimiento
          </h1>
          <p className="text-xs text-slate-500">
            Control de adquisiciones comerciales, divisas e ingreso físico a
            cuarentena
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsModalOpen(true);
            setFeedback(null);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nueva Orden de Compra
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Todos los estados</option>
            <option value="BORRADOR">Borradores</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="APROBADA">Aprobadas</option>
            <option value="EN_PROCESO">En Tránsito</option>
            <option value="PARCIAL">Entregas Parciales</option>
            <option value="COMPLETADA">Completadas</option>
            <option value="RECIBIDO">Recibidos</option>
            <option value="CANCELADA">Canceladas</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => loadData()}
          className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors shadow-2xs cursor-pointer"
          title="Actualizar listado"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Tabla de Órdenes */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">N° Orden</th>
                <th className="py-3 px-4">Proveedor</th>
                <th className="py-3 px-4">Fecha Emisión</th>
                <th className="py-3 px-4 text-center">Moneda</th>
                <th className="py-3 px-4 text-center">Renglones</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    Cargando órdenes de compra...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No se encontraron órdenes de compra registradas.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const badge = STATUS_BADGES[order.status] || {
                    label: order.status,
                    className: "bg-slate-50 text-slate-700",
                  };
                  const canReceive =
                    order.status !== "RECIBIDO" &&
                    order.status !== "COMPLETADA" &&
                    order.status !== "CANCELADA" &&
                    order.status !== "CANCELADO";

                  return (
                    <tr
                      key={String(order.id)}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {order.orderNumber || `#${order.id}`}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {order.supplier?.name || "Proveedor General"}
                        </div>
                        {(order.supplier?.rifOrId || order.supplier?.rif) && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {order.supplier.rifOrId || order.supplier.rif}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                        {order.currency?.code || "USD"}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-700">
                        {order.items?.length || 0}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center space-x-1.5">
                        <Link
                          href={`/purchasing/orders/${order.id}`}
                          className="inline-flex items-center gap-1 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors"
                          title="Ver detalle de la orden"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Detalle
                        </Link>
                        {canReceive && (
                          <Link
                            href={`/purchasing/orders/${order.id}/receive`}
                            className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors"
                            title="Recibir mercancía"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            Recibir
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Nueva Orden */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-base">
                  Crear Nueva Orden de Compra
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
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

            <form onSubmit={handleSubmitOrder} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Selector Proveedor */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Proveedor Comercial
                  </label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">
                      -- Proveedor Opcional / Caja Chica --
                    </option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.rifOrId || s.rif || "N/A"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selector Moneda */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Moneda de la Orden *
                  </label>
                  <select
                    value={currencyId}
                    onChange={(e) => setCurrencyId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  >
                    {currencies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code} - {c.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Renglones / Ítems */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Renglones de Material o Reactivos
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar renglón
                  </button>
                </div>

                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2.5 rounded-lg border border-slate-200"
                  >
                    <div className="col-span-6">
                      <select
                        value={item.productId}
                        onChange={(e) =>
                          handleProductSelect(idx, Number(e.target.value))
                        }
                        className="w-full bg-white border border-slate-300 rounded-md px-2 py-1.5 text-xs text-slate-800 outline-none"
                        required
                      >
                        <option value="0">-- Seleccionar insumo --</option>
                        {catalogProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} {p.sku ? `(${p.sku})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="Cant."
                        value={item.quantityOrdered}
                        onChange={(e) =>
                          handleRowChange(
                            idx,
                            "quantityOrdered",
                            Number(e.target.value),
                          )
                        }
                        className="w-full bg-white border border-slate-300 rounded-md px-2 py-1.5 text-xs text-slate-800 outline-none"
                        required
                      />
                    </div>

                    <div className="col-span-3">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-2 flex items-center text-slate-400 text-xs">
                          {selectedCurrency?.symbol || "$"}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="Costo unit."
                          value={item.unitPrice || ""}
                          onChange={(e) =>
                            handleRowChange(
                              idx,
                              "unitPrice",
                              Number(e.target.value),
                            )
                          }
                          className="w-full bg-white border border-slate-300 rounded-md pl-6 pr-2 py-1.5 text-xs text-slate-800 outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length === 1}
                        className="text-slate-400 hover:text-red-500 disabled:opacity-30 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Subtotal estimado */}
                <div className="flex justify-end pt-2 text-xs font-semibold text-slate-700">
                  <span className="mr-2">Monto Total Estimado:</span>
                  <span className="font-mono text-blue-700 flex items-center">
                    <Coins className="w-3.5 h-3.5 mr-1" />
                    {selectedCurrency?.symbol || "$"}{" "}
                    {orderTotalEstimated.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Notas de Compra o Términos de Despacho (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Especificaciones sobre transporte en frío, acuerdos de pago..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Botones */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? "Emitiendo orden..." : "Crear Orden de Compra"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
