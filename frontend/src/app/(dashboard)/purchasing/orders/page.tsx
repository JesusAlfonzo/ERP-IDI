"use client";

import { useState, useEffect, useCallback, useMemo, type FormEvent } from "react";
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
import { ProductPackagingSelector } from "@/components/purchasing/ProductPackagingSelector";
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
  Loader2,
  PackageCheck,
  Eye,
  ShieldCheck,
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
  isExempt: boolean;
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
  const [exchangeRate, setExchangeRate] = useState<number>(75.0);
  const [notes, setNotes] = useState<string>("");
  const [items, setItems] = useState<FormRow[]>([
    { productId: 0, unitId: 0, quantityOrdered: 1, unitPrice: 0, isExempt: false },
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
            () => []
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
        const def = currenciesData.find((c) => c.isDefault) || currenciesData[0];
        setCurrencyId(String(def?.id || ""));
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
      { productId: 0, unitId: 0, quantityOrdered: 1, unitPrice: 0, isExempt: false },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index: number, pId: number, unitId: number) => {
    const selectedProd = catalogProducts.find((p) => p.id === pId);
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        productId: pId,
        unitId,
        isExempt: selectedProd?.isTaxExempt ?? false,
      };
      return updated;
    });
  };

  const handleRowChange = <K extends keyof FormRow>(
    index: number,
    field: K,
    val: FormRow[K]
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: val };
      }
      return updated;
    });
  };

  const handleToggleAllExempt = (exempt: boolean) => {
    setItems((prev) => prev.map((row) => ({ ...row, isExempt: exempt })));
  };

  // Resumen fiscal SENIAT en vivo
  const fiscalSummary = useMemo(() => {
    let taxableAmount = 0;
    let exemptAmount = 0;

    for (const item of items) {
      const lineSubtotal =
        Math.round((Number(item.quantityOrdered) || 0) * (Number(item.unitPrice) || 0) * 100) / 100;
      if (item.isExempt) {
        exemptAmount += lineSubtotal;
      } else {
        taxableAmount += lineSubtotal;
      }
    }

    taxableAmount = Math.round(taxableAmount * 100) / 100;
    exemptAmount = Math.round(exemptAmount * 100) / 100;
    const iva16 = Math.round(taxableAmount * 0.16 * 100) / 100;
    const totalUsd = Math.round((taxableAmount + exemptAmount + iva16) * 100) / 100;
    const rate = Number(exchangeRate) || 1.0;
    const totalBs = Math.round(totalUsd * rate * 100) / 100;

    return {
      taxableAmount,
      exemptAmount,
      iva16,
      totalUsd,
      totalBs,
    };
  }, [items, exchangeRate]);

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
      (it) => !it.productId || it.quantityOrdered <= 0 || it.unitPrice <= 0
    );

    if (hasInvalidItem) {
      setFeedback({
        status: "error",
        message:
          "Asegúrese de seleccionar producto, cantidad y costo unitario válido en cada renglón.",
      });
      return;
    }

    setSubmitting(true);
    try {
      await PurchasingClientService.createOrder({
        supplierId: supplierId ? Number(supplierId) : null,
        currencyId: Number(currencyId),
        exchangeRate: Number(exchangeRate),
        notes: notes.trim() || null,
        items: items.map((it) => ({
          productId: Number(it.productId),
          unitId: Number(it.unitId),
          quantityOrdered: Number(it.quantityOrdered),
          unitPrice: Number(it.unitPrice),
          isExempt: Boolean(it.isExempt),
        })),
      });

      setFeedback({
        status: "success",
        message: "Orden de compra creada exitosamente con soporte fiscal SENIAT.",
      });
      await loadData();

      setTimeout(() => {
        setIsModalOpen(false);
        setSupplierId("");
        setNotes("");
        setItems([
          { productId: 0, unitId: 0, quantityOrdered: 1, unitPrice: 0, isExempt: false },
        ]);
        setFeedback(null);
      }, 1000);
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message:
          err instanceof Error ? err.message : "Error al registrar la orden de compra.",
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
            Control de adquisiciones comerciales, soporte fiscal SENIAT (IVA 16%), tasa cambiaria BCV y recepción en cuarentena
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

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 border shadow-2xs ${
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
                <th className="py-3 px-4 text-center">Moneda / Tasa</th>
                <th className="py-3 px-4 text-right">Total USD</th>
                <th className="py-3 px-4 text-center">Renglones</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    Cargando órdenes de compra...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
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

                  const totalUsd =
                    Number(order.totalAmountUsd || order.totalAmount || order.total || 0);

                  return (
                    <tr
                      key={String(order.id)}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        <div>{order.orderNumber || `#${order.id}`}</div>
                        {order.requisition && (
                          <div className="text-[10px] text-blue-600 font-mono">
                            Preorden: {order.requisition.requisitionNumber}
                          </div>
                        )}
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
                      <td className="py-3 px-4 text-center font-mono text-slate-700">
                        <span className="font-bold">{order.currency?.code || "USD"}</span>
                        {Number(order.exchangeRate || 1) > 1 && (
                          <div className="text-[10px] text-slate-400">
                            {Number(order.exchangeRate).toFixed(2)} Bs/$
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">
                        ${totalUsd.toFixed(2)}
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

      {/* Modal: Nueva Orden con Soporte Fiscal SENIAT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[88vh] flex flex-col overflow-hidden">
            {/* Cabecera Fija */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    Crear Nueva Orden de Compra
                  </h3>
                  <p className="text-xs text-slate-500">
                    Emisión con soporte fiscal SENIAT (IVA 16% / Exentos), tasa cambiaria BCV y empaques
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitOrder} className="flex flex-col flex-1 min-h-0">
              {/* Cuerpo Scrolleable */}
              <div className="p-6 overflow-y-auto pr-3 space-y-5 flex-1 scroll-smooth">
                {/* Datos Comerciales */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Proveedor Comercial
                    </label>
                    <select
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 font-medium"
                    >
                      <option value="">-- Proveedor Opcional / Caja Chica --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.rifOrId || s.rif || "N/A"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Moneda de Compra *
                    </label>
                    <select
                      value={currencyId}
                      onChange={(e) => setCurrencyId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 font-medium"
                      required
                    >
                      {currencies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code} - {c.symbol})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Tasa BCV del Día (Bs./USD)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={exchangeRate}
                        onChange={(e) => setExchangeRate(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono font-bold focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">
                        Bs./$
                      </span>
                    </div>
                  </div>
                </div>

                {/* Renglones / Ítems */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Renglones de Material o Reactivos ({items.length})
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleAllExempt(true)}
                        className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded cursor-pointer font-medium hover:bg-emerald-100"
                      >
                        Marcar todo Exento
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleAllExempt(false)}
                        className="text-[11px] text-slate-700 bg-slate-100 border border-slate-200 px-2 py-1 rounded cursor-pointer font-medium hover:bg-slate-200"
                      >
                        Marcar todo Gravable (16%)
                      </button>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/70 px-3 py-1 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-blue-200"
                      >
                        <Plus className="w-3.5 h-3.5" /> Agregar renglón
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-2xs"
                      >
                        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-white border border-slate-200 text-xs font-mono font-bold text-slate-600 shrink-0">
                          {idx + 1}
                        </div>

                        {/* Selector de Producto y Empaque */}
                        <div className="flex-1 min-w-0">
                          <ProductPackagingSelector
                            products={catalogProducts}
                            selectedProductId={item.productId}
                            selectedUnitId={item.unitId}
                            onChange={(pId, uId) => handleProductSelect(idx, pId, uId)}
                          />
                        </div>

                        {/* Cantidad ordenada */}
                        <div className="w-full sm:w-28 shrink-0">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Cantidad
                          </label>
                          <input
                            type="number"
                            min="1"
                            placeholder="1"
                            value={item.quantityOrdered}
                            onChange={(e) =>
                              handleRowChange(
                                idx,
                                "quantityOrdered",
                                Math.max(1, Number(e.target.value))
                              )
                            }
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono font-bold focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>

                        {/* Precio Unitario */}
                        <div className="w-full sm:w-32 shrink-0">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Costo Unit. ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            placeholder="0.00"
                            value={item.unitPrice || ""}
                            onChange={(e) =>
                              handleRowChange(
                                idx,
                                "unitPrice",
                                Math.max(0, Number(e.target.value))
                              )
                            }
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono font-bold text-blue-700 focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>

                        {/* Switch Exento */}
                        <div className="sm:self-center shrink-0 pt-3 sm:pt-0">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.isExempt}
                              onChange={(e) =>
                                handleRowChange(idx, "isExempt", e.target.checked)
                              }
                              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                            />
                            <span
                              className={`text-[11px] font-semibold ${
                                item.isExempt ? "text-emerald-700" : "text-slate-400"
                              }`}
                            >
                              {item.isExempt ? "Exento" : "Gravable"}
                            </span>
                          </label>
                        </div>

                        {/* Botón eliminar */}
                        <div className="sm:self-end mb-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            disabled={items.length === 1}
                            className="text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-30 cursor-pointer p-2 rounded-lg border border-transparent hover:border-red-200 transition-colors"
                            title="Eliminar renglón"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Desglose Fiscal SENIAT */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-slate-600 text-xs">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>
                      Cálculo de Base Imponible, Exentos e IVA 16% según normativa tributaria. La tasa BCV queda guardada en el comprobante.
                    </span>
                  </div>

                  <div className="w-full sm:w-80 bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal Gravable (Base 16%):</span>
                      <span className="font-mono font-semibold">
                        ${fiscalSummary.taxableAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal Exento:</span>
                      <span className="font-mono font-semibold text-emerald-700">
                        ${fiscalSummary.exemptAmount.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>IVA (16%):</span>
                      <span className="font-mono font-semibold">
                        ${fiscalSummary.iva16.toFixed(2)}
                      </span>
                    </div>
                    <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-slate-900 text-sm">
                      <span>Total General (USD):</span>
                      <span className="font-mono text-blue-700">
                        ${fiscalSummary.totalUsd.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500 font-mono text-[11px] pt-0.5">
                      <span>Total en Bolívares (Bs.):</span>
                      <span className="font-bold text-slate-800">
                        {fiscalSummary.totalBs.toLocaleString("es-VE", {
                          minimumFractionDigits: 2,
                        })}{" "}
                        Bs.
                      </span>
                    </div>
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
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none font-medium resize-none"
                  />
                </div>
              </div>

              {/* Pie Fijo */}
              <div className="flex items-center justify-between p-4 px-6 border-t border-slate-100 bg-slate-50/70 shrink-0">
                <span className="text-xs text-slate-500">
                  Total orden: <strong className="text-slate-800">${fiscalSummary.totalUsd.toFixed(2)} USD</strong>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-200/60 rounded-lg font-medium cursor-pointer transition-colors"
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
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
