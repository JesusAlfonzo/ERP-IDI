"use client";

import { useState, useEffect, useCallback, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PurchasingClientService } from "@/services/purchasing.service";
import { InventoryClientService } from "@/services/inventory.service";
import type {
  PurchaseRequisition,
  PurchaseRequisitionStatus,
  Supplier,
  Currency,
} from "@/types/purchasing";
import type { Product } from "@/types/inventory";
import { ProductPackagingSelector } from "@/components/purchasing/ProductPackagingSelector";
import {
  FileText,
  Plus,
  Filter,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  Loader2,
  Eye,
  ArrowRight,
  Send,
  Calculator,
  ShieldCheck,
} from "lucide-react";

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message) return res.data.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

const SECTIONS = [
  "Inmunogenética",
  "Biología Molecular",
  "Bioquímica Clínica",
  "Microbiología",
  "Hematología y Coagulación",
  "Inmunología y Serología",
  "Toxicología y Farmacología",
  "Almacén Central / Compras",
];

const STATUS_BADGES: Record<
  PurchaseRequisitionStatus,
  { label: string; className: string }
> = {
  BORRADOR: {
    label: "Borrador",
    className: "bg-slate-100 text-slate-700 border-slate-200",
  },
  EN_COTIZACION: {
    label: "En Cotización",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  ADJUDICADA: {
    label: "Adjudicada (Orden Generada)",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  CANCELADA: {
    label: "Cancelada",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

interface PreorderRow {
  productId: number;
  unitId: number;
  quantityRequested: number;
  estimatedPrice?: number;
}

interface ConversionRow {
  itemId?: number;
  productId: number;
  unitId: number;
  quantityOrdered: number;
  unitPrice: number;
  isExempt: boolean;
  productName: string;
  productSku?: string | null;
  unitLabel: string;
}

export default function PurchaseRequisitionsPage() {
  const router = useRouter();
  const [requisitions, setRequisitions] = useState<PurchaseRequisition[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState<string>("");

  // Feedback banner
  const [feedback, setFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  // Modal: Nueva Preorden
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [departmentSection, setDepartmentSection] = useState(SECTIONS[0]);
  const [justification, setJustification] = useState("");
  const [notes, setNotes] = useState("");
  const [formItems, setFormItems] = useState<PreorderRow[]>([
    { productId: 0, unitId: 0, quantityRequested: 1 },
  ]);
  const [submitting, setSubmitting] = useState(false);

  // Modal: Ver Detalle
  const [selectedForView, setSelectedForView] = useState<PurchaseRequisition | null>(null);

  // Modal: Adjudicar y Convertir a Orden
  const [requisitionToConvert, setRequisitionToConvert] = useState<PurchaseRequisition | null>(null);
  const [adjudicateSupplierId, setAdjudicateSupplierId] = useState<string>("");
  const [adjudicateCurrencyId, setAdjudicateCurrencyId] = useState<string>("");
  const [adjudicateExchangeRate, setAdjudicateExchangeRate] = useState<number>(75.0);
  const [adjudicateNotes, setAdjudicateNotes] = useState<string>("");
  const [conversionItems, setConversionItems] = useState<ConversionRow[]>([]);
  const [converting, setConverting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [reqs, supps, currs, prods] = await Promise.all([
        PurchasingClientService.getRequisitions({
          status: statusFilter || undefined,
          search: searchFilter || undefined,
        }),
        PurchasingClientService.getSuppliers().catch(() => []),
        PurchasingClientService.getCurrencies().catch(() => []),
        InventoryClientService.getProducts().catch(() => []),
      ]);
      setRequisitions(reqs);
      setSuppliers(supps);
      setCurrencies(currs);
      setCatalogProducts(prods);

      if (currs.length > 0 && !adjudicateCurrencyId) {
        const defaultCurr = currs.find((c) => c.isDefault) || currs[0];
        setAdjudicateCurrencyId(String(defaultCurr?.id ?? ""));
      }
    } catch (err: unknown) {
      console.error("Error al cargar requisiciones", err);
      setFeedback({
        status: "error",
        message: getErrorMessage(err, "Error al sincronizar datos."),
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchFilter, adjudicateCurrencyId]);

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      if (isMounted) {
        await loadData();
      }
    };
    void init();
    return () => {
      isMounted = false;
    };
  }, [loadData]);

  // Manejo de ítems en el formulario de creación de preorden
  const handleAddItem = () => {
    setFormItems((prev) => [...prev, { productId: 0, unitId: 0, quantityRequested: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index: number, prodId: number, unitId: number) => {
    setFormItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        productId: prodId,
        unitId,
        quantityRequested: updated[index]?.quantityRequested || 1,
        estimatedPrice: updated[index]?.estimatedPrice,
      };
      return updated;
    });
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    setFormItems((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], quantityRequested: quantity };
      }
      return updated;
    });
  };

  const handleEstimatedPriceChange = (index: number, price: number) => {
    setFormItems((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], estimatedPrice: price };
      }
      return updated;
    });
  };

  // Enviar Nueva Preorden
  const handleSubmitPreorder = async (e: FormEvent) => {
    e.preventDefault();
    const hasInvalid = formItems.some((it) => !it.productId || it.quantityRequested <= 0);
    if (hasInvalid) {
      setFeedback({
        status: "error",
        message: "Todos los renglones deben tener un insumo válido y cantidad mayor a 0.",
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      await PurchasingClientService.createRequisition({
        departmentSection,
        justification,
        notes: notes.trim() || undefined,
        items: formItems.map((it) => ({
          productId: it.productId,
          unitId: it.unitId,
          quantityRequested: it.quantityRequested,
          estimatedPrice: it.estimatedPrice || undefined,
        })),
      });

      setFeedback({
        status: "success",
        message: "Preorden de compra creada exitosamente. Lista para cotizaciones.",
      });
      setIsNewModalOpen(false);
      setFormItems([{ productId: 0, unitId: 0, quantityRequested: 1 }]);
      setJustification("");
      setNotes("");
      loadData();
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message: getErrorMessage(err, "Error al crear la preorden de compra."),
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Cambiar estado a EN_COTIZACION
  const handleMoveToQuote = async (req: PurchaseRequisition) => {
    try {
      await PurchasingClientService.updateRequisitionStatus(req.id, "EN_COTIZACION");
      setFeedback({
        status: "success",
        message: `Preorden #${req.requisitionNumber} pasada a estado 'En Cotización'.`,
      });
      loadData();
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message: getErrorMessage(err, "No se pudo actualizar el estado."),
      });
    }
  };

  // Abrir Modal de Adjudicación / Conversión
  const openAdjudicateModal = (req: PurchaseRequisition) => {
    setRequisitionToConvert(req);
    setAdjudicateNotes(`Generada a partir de preorden ${req.requisitionNumber}`);

    const mappedRows: ConversionRow[] = req.items.map((it) => {
      const prod = catalogProducts.find((p) => p.id === it.productId) || it.product;
      const isExempt = prod?.isTaxExempt ?? false;
      const unitLabel =
        it.unit?.abbreviation ||
        prod?.baseUnit?.abbreviation ||
        "UND";

      return {
        itemId: it.id,
        productId: it.productId,
        unitId: it.unitId,
        quantityOrdered: Number(it.quantityRequested),
        unitPrice: Number(it.estimatedPrice) || 0,
        isExempt,
        productName: prod?.name || "Insumo",
        productSku: prod?.sku,
        unitLabel,
      };
    });

    setConversionItems(mappedRows);
    setFeedback(null);
  };

  // Cálculos fiscales en vivo para la Adjudicación
  const fiscalSummary = useMemo(() => {
    let taxableAmount = 0;
    let exemptAmount = 0;

    for (const row of conversionItems) {
      const lineSubtotal = Math.round(row.quantityOrdered * row.unitPrice * 100) / 100;
      if (row.isExempt) {
        exemptAmount += lineSubtotal;
      } else {
        taxableAmount += lineSubtotal;
      }
    }

    taxableAmount = Math.round(taxableAmount * 100) / 100;
    exemptAmount = Math.round(exemptAmount * 100) / 100;
    const iva16 = Math.round(taxableAmount * 0.16 * 100) / 100;
    const totalUsd = Math.round((taxableAmount + exemptAmount + iva16) * 100) / 100;
    const rate = Number(adjudicateExchangeRate) || 1.0;
    const totalBs = Math.round(totalUsd * rate * 100) / 100;

    return {
      taxableAmount,
      exemptAmount,
      iva16,
      totalUsd,
      totalBs,
    };
  }, [conversionItems, adjudicateExchangeRate]);

  // Alternar exento para todos
  const handleToggleAllExempt = (exempt: boolean) => {
    setConversionItems((prev) =>
      prev.map((row) => ({ ...row, isExempt: exempt }))
    );
  };

  // Enviar Adjudicación
  const handleConfirmConversion = async (e: FormEvent) => {
    e.preventDefault();
    if (!requisitionToConvert) return;

    if (!adjudicateSupplierId) {
      setFeedback({
        status: "error",
        message: "Debe seleccionar el proveedor adjudicado.",
      });
      return;
    }

    const hasZeroPrice = conversionItems.some((r) => r.unitPrice <= 0);
    if (hasZeroPrice) {
      setFeedback({
        status: "error",
        message: "Todos los renglones deben tener un precio unitario mayor a 0.",
      });
      return;
    }

    setConverting(true);
    setFeedback(null);
    try {
      const order = await PurchasingClientService.convertToOrder(
        requisitionToConvert.id,
        {
          supplierId: Number(adjudicateSupplierId),
          currencyId: Number(adjudicateCurrencyId),
          exchangeRate: Number(adjudicateExchangeRate),
          notes: adjudicateNotes.trim() || undefined,
          items: conversionItems.map((r) => ({
            itemId: r.itemId,
            productId: r.productId,
            unitId: r.unitId,
            quantityOrdered: r.quantityOrdered,
            unitPrice: r.unitPrice,
            isExempt: r.isExempt,
          })),
        }
      );

      setRequisitionToConvert(null);
      setFeedback({
        status: "success",
        message: `Orden de compra #${order.orderNumber || order.id} generada exitosamente.`,
      });
      loadData();
      router.push(`/purchasing/orders/${order.id}`);
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message: getErrorMessage(err, "Error al adjudicar la compra."),
      });
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Preórdenes de Compra (Solicitud de Cotización)
          </h1>
          <p className="text-xs text-slate-500">
            Requisiciones internas, comparativa de ofertas y adjudicación a órdenes de compra
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsNewModalOpen(true);
            setFeedback(null);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Nueva Preorden
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
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Todos los estados</option>
              <option value="BORRADOR">Borradores</option>
              <option value="EN_COTIZACION">En Cotización</option>
              <option value="ADJUDICADA">Adjudicadas</option>
              <option value="CANCELADA">Canceladas</option>
            </select>
          </div>

          <input
            type="text"
            placeholder="Buscar por correlativo o área..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none flex-1 max-w-sm"
          />
        </div>

        <button
          type="button"
          onClick={() => loadData()}
          className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-600 transition-colors shadow-2xs cursor-pointer self-end sm:self-auto"
          title="Actualizar listado"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Tabla de Preórdenes */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">N° Preorden</th>
                <th className="py-3 px-4">Departamento Solicitante</th>
                <th className="py-3 px-4">Fecha Emisión</th>
                <th className="py-3 px-4 text-center">Renglones</th>
                <th className="py-3 px-4 text-center">Estado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                    Cargando preórdenes de compra...
                  </td>
                </tr>
              ) : requisitions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No se encontraron preórdenes registradas.
                  </td>
                </tr>
              ) : (
                requisitions.map((req) => {
                  const badge = STATUS_BADGES[req.status] || {
                    label: req.status,
                    className: "bg-slate-50 text-slate-700",
                  };
                  const canAdjudicate =
                    req.status === "BORRADOR" || req.status === "EN_COTIZACION";
                  const canMoveToQuote = req.status === "BORRADOR";

                  return (
                    <tr
                      key={String(req.id)}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {req.requisitionNumber}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">
                          {req.departmentSection}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {req.justification}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {req.createdAt
                          ? new Date(req.createdAt).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-700">
                        {req.items?.length || 0}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setSelectedForView(req)}
                            className="inline-flex items-center gap-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
                            title="Ver detalle de renglones"
                          >
                            <Eye className="w-3.5 h-3.5" /> Ver
                          </button>

                          {canMoveToQuote && (
                            <button
                              type="button"
                              onClick={() => handleMoveToQuote(req)}
                              className="inline-flex items-center gap-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
                              title="Pasar a En Cotización"
                            >
                              <Send className="w-3.5 h-3.5" /> Cotizar
                            </button>
                          )}

                          {canAdjudicate && (
                            <button
                              type="button"
                              onClick={() => openAdjudicateModal(req)}
                              className="inline-flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
                              title="Adjudicar y Convertir en Orden de Compra"
                            >
                              <ArrowRight className="w-3.5 h-3.5" /> Adjudicar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Crear Preorden */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[88vh] flex flex-col overflow-hidden">
            {/* Cabecera Fija */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    Nueva Preorden de Compra
                  </h3>
                  <p className="text-xs text-slate-500">
                    Defina los requerimientos institucionales para solicitar cotización a proveedores
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cuerpo Scrolleable */}
            <form onSubmit={handleSubmitPreorder} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 overflow-y-auto pr-3 space-y-5 flex-1 scroll-smooth">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Departamento Solicitante *
                  </label>
                  <select
                    value={departmentSection}
                    onChange={(e) => setDepartmentSection(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 font-medium"
                    required
                  >
                    {SECTIONS.map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Insumos / Reactivos Requeridos ({formItems.length})
                    </span>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/70 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer border border-blue-200"
                    >
                      <Plus className="w-3.5 h-3.5" /> Agregar renglón
                    </button>
                  </div>

                  <div className="space-y-3">
                    {formItems.map((item, idx) => (
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

                        {/* Cantidad solicitada */}
                        <div className="w-full sm:w-28 shrink-0">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Cantidad
                          </label>
                          <input
                            type="number"
                            min="1"
                            placeholder="1"
                            value={item.quantityRequested}
                            onChange={(e) =>
                              handleQuantityChange(
                                idx,
                                Math.max(1, Number(e.target.value))
                              )
                            }
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono font-bold focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>

                        {/* Precio Estimado (Opcional) */}
                        <div className="w-full sm:w-32 shrink-0">
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Precio Est. ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={item.estimatedPrice || ""}
                            onChange={(e) =>
                              handleEstimatedPriceChange(
                                idx,
                                Math.max(0, Number(e.target.value))
                              )
                            }
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        {/* Eliminar renglón */}
                        <div className="sm:self-end mb-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            disabled={formItems.length === 1}
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

                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Justificación de la Compra / Protocolo *
                  </label>
                  <textarea
                    rows={3}
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Explique el requerimiento de insumos o el protocolo científico a ejecutar..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 resize-none font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Notas y Observaciones (Opcional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Especificaciones adicionales o condiciones de entrega requeridas..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Pie Fijo */}
              <div className="flex items-center justify-between p-4 px-6 border-t border-slate-100 bg-slate-50/70 shrink-0">
                <span className="text-xs text-slate-500">
                  {formItems.length}{" "}
                  {formItems.length === 1
                    ? "renglón agregado"
                    : "renglones agregados"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNewModalOpen(false)}
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
                    {submitting ? "Creando..." : "Crear Preorden"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ver Detalle de Preorden */}
      {selectedForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/70 shrink-0">
              <div>
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Preorden #{selectedForView.requisitionNumber}
                </h3>
                <p className="text-xs text-slate-500">
                  Área: <strong className="text-slate-700">{selectedForView.departmentSection}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedForView(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Justificación Técnica
                </span>
                <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {selectedForView.justification}
                </p>
              </div>

              {selectedForView.notes && (
                <div>
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                    Notas y Observaciones
                  </span>
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    {selectedForView.notes}
                  </p>
                </div>
              )}

              <div>
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                  Renglones Solicitados ({selectedForView.items.length})
                </span>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Insumo / Reactivo</th>
                        <th className="py-2.5 px-3 text-center">Unidad</th>
                        <th className="py-2.5 px-3 text-right">Cant. Solicitada</th>
                        <th className="py-2.5 px-3 text-right">Precio Est. ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedForView.items.map((it, idx) => (
                        <tr key={it.id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-mono text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-800 block">
                              {it.product?.name}
                            </span>
                            {it.product?.sku && (
                              <span className="font-mono text-[10px] text-slate-400">
                                SKU: {it.product.sku}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-medium text-slate-600">
                            {it.unit?.abbreviation || it.product?.baseUnit?.abbreviation || "UND"}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                            {Number(it.quantityRequested)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                            {it.estimatedPrice ? `$${Number(it.estimatedPrice).toFixed(2)}` : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 px-6 border-t border-slate-100 bg-slate-50/70 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedForView(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Adjudicar y Convertir en Orden de Compra */}
      {requisitionToConvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Cabecera Fija */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 shrink-0 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    Adjudicar Preorden #{requisitionToConvert.requisitionNumber} a Orden de Compra
                  </h3>
                  <p className="text-xs text-slate-500">
                    Defina el proveedor adjudicado, precios finales acordados y soporte fiscal SENIAT (IVA 16% / Exentos)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRequisitionToConvert(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario y Tabla */}
            <form onSubmit={handleConfirmConversion} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 overflow-y-auto pr-3 space-y-5 flex-1 scroll-smooth">
                {/* Datos Comerciales y Fiscales */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Proveedor Adjudicado *
                    </label>
                    <select
                      value={adjudicateSupplierId}
                      onChange={(e) => setAdjudicateSupplierId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 font-medium"
                      required
                    >
                      <option value="">-- Seleccione proveedor ganador --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.rifOrId || s.rif || "N/A"})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                      Moneda de Facturación *
                    </label>
                    <select
                      value={adjudicateCurrencyId}
                      onChange={(e) => setAdjudicateCurrencyId(e.target.value)}
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
                      Tasa Cambiaria BCV (Bs./USD) *
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={adjudicateExchangeRate}
                        onChange={(e) => setAdjudicateExchangeRate(Number(e.target.value))}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 font-mono font-bold focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">
                        Bs./$
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tabla de Renglones Adjudicados */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Renglones de Material a Adjudicar ({conversionItems.length})
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleAllExempt(true)}
                        className="text-[11px] text-emerald-700 hover:text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded cursor-pointer font-medium"
                      >
                        Marcar todo Exento
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleAllExempt(false)}
                        className="text-[11px] text-slate-700 hover:text-slate-800 bg-slate-100 border border-slate-200 px-2 py-1 rounded cursor-pointer font-medium"
                      >
                        Marcar todo Gravable (16%)
                      </button>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Insumo / Reactivo</th>
                          <th className="py-2.5 px-3 text-center">Unidad</th>
                          <th className="py-2.5 px-3 text-right w-24">Cantidad</th>
                          <th className="py-2.5 px-3 text-right w-32">Precio Unit. ($)</th>
                          <th className="py-2.5 px-3 text-center w-28">¿Exento IVA?</th>
                          <th className="py-2.5 px-3 text-right w-28">Subtotal ($)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {conversionItems.map((row, idx) => {
                          const lineSubtotal = Math.round(row.quantityOrdered * row.unitPrice * 100) / 100;
                          return (
                            <tr key={idx} className="hover:bg-slate-50/60">
                              <td className="py-2.5 px-3">
                                <span className="font-semibold text-slate-900 block">
                                  {row.productName}
                                </span>
                                {row.productSku && (
                                  <span className="font-mono text-[10px] text-slate-400">
                                    SKU: {row.productSku}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center font-medium text-slate-600">
                                {row.unitLabel}
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <input
                                  type="number"
                                  min="1"
                                  value={row.quantityOrdered}
                                  onChange={(e) => {
                                    const qty = Math.max(1, Number(e.target.value));
                                    setConversionItems((prev) => {
                                      const updated = [...prev];
                                      if (updated[idx]) {
                                        updated[idx] = { ...updated[idx], quantityOrdered: qty };
                                      }
                                      return updated;
                                    });
                                  }}
                                  className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-right font-mono font-bold text-xs"
                                  required
                                />
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  placeholder="0.00"
                                  value={row.unitPrice || ""}
                                  onChange={(e) => {
                                    const price = Math.max(0, Number(e.target.value));
                                    setConversionItems((prev) => {
                                      const updated = [...prev];
                                      if (updated[idx]) {
                                        updated[idx] = { ...updated[idx], unitPrice: price };
                                      }
                                      return updated;
                                    });
                                  }}
                                  className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1 text-right font-mono font-bold text-xs text-blue-700"
                                  required
                                />
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={row.isExempt}
                                    onChange={(e) => {
                                      const isEx = e.target.checked;
                                      setConversionItems((prev) => {
                                        const updated = [...prev];
                                        if (updated[idx]) {
                                          updated[idx] = { ...updated[idx], isExempt: isEx };
                                        }
                                        return updated;
                                      });
                                    }}
                                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                                  />
                                  <span
                                    className={`text-[11px] font-semibold ${
                                      row.isExempt ? "text-emerald-700" : "text-slate-400"
                                    }`}
                                  >
                                    {row.isExempt ? "Exento" : "Gravable"}
                                  </span>
                                </label>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                                ${lineSubtotal.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Cuadro Resumen Financiero SENIAT */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-slate-600 text-xs">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>
                      Cálculo fiscal automatizado según providencias SENIAT. La orden guardará snapshot inmutable de la tasa oficial BCV.
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

                {/* Notas de adjudicación */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Términos de Despacho o Notas de la Orden (Opcional)
                  </label>
                  <input
                    type="text"
                    value={adjudicateNotes}
                    onChange={(e) => setAdjudicateNotes(e.target.value)}
                    placeholder="Condiciones de pago a 30 días, flete incluido..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Pie Fijo */}
              <div className="flex items-center justify-between p-4 px-6 border-t border-slate-100 bg-slate-50/70 shrink-0">
                <span className="text-xs text-slate-500">
                  Total a ordenar: <strong className="text-slate-800">${fiscalSummary.totalUsd.toFixed(2)} USD</strong>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRequisitionToConvert(null)}
                    className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-200/60 rounded-lg font-medium cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={converting}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {converting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {converting ? "Generando Orden..." : "Adjudicar y Generar Orden"}
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
