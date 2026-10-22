"use client";

import { useState, useEffect, useCallback, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PurchasingClientService } from "@/services/purchasing.service";
import { InventoryClientService } from "@/services/inventory.service";
import { CurrencyService } from "@/services/currency.service";
import {
  type CurrencyCode,
  CURRENCY_OPTIONS,
  getCurrencySymbol,
} from "@/utils/currency";
import {
  InventoryMasterService,
  type DepartmentItem,
  type JustificationConceptItem,
} from "@/services/inventory-master.service";
import type {
  PurchaseRequisition,
  PurchaseRequisitionStatus,
  Supplier,
  Currency,
} from "@/types/purchasing";
import type { Product, Category } from "@/types/inventory";
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
  Mail,
  MessageCircle,
  Printer,
} from "lucide-react";

import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

function getErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "response" in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response;
    if (res?.data?.message) return res.data.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

const STATUS_BADGES: Record<
  PurchaseRequisitionStatus,
  { label: string; variant: "secondary" | "warning" | "success" | "destructive" }
> = {
  BORRADOR: {
    label: "Borrador",
    variant: "secondary",
  },
  EN_COTIZACION: {
    label: "En Cotización",
    variant: "warning",
  },
  ADJUDICADA: {
    label: "Adjudicada (Orden Generada)",
    variant: "success",
  },
  CANCELADA: {
    label: "Cancelada",
    variant: "destructive",
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [justificationConcepts, setJustificationConcepts] = useState<JustificationConceptItem[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | "">("");
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState<string>("");

  // Modal Crear Preorden
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("");
  const [departmentSection, setDepartmentSection] = useState("");
  const [justification, setJustification] = useState("");
  const [notes, setNotes] = useState("");
  const [formItems, setFormItems] = useState<PreorderRow[]>([
    { productId: 0, unitId: 0, quantityRequested: 1 },
  ]);
  const [submitting, setSubmitting] = useState(false);

  // Modal Ver Detalle
  const [selectedForView, setSelectedForView] = useState<PurchaseRequisition | null>(null);

  // Modal Adjudicación (Conversión a Orden)
  const [requisitionToConvert, setRequisitionToConvert] = useState<PurchaseRequisition | null>(null);
  const [adjudicateSupplierId, setAdjudicateSupplierId] = useState<string>("");
  const [adjudicateCurrency, setAdjudicateCurrency] = useState<CurrencyCode>("USD");
  const [adjudicateCurrencyId, setAdjudicateCurrencyId] = useState<string>("");
  const [adjudicateExchangeRate, setAdjudicateExchangeRate] = useState<number>(75.0);
  const [bcvRates, setBcvRates] = useState<{ USD: number; EUR: number; VED: number }>({
    USD: 75.0,
    EUR: 81.5,
    VED: 1.0,
  });
  const [adjudicateNotes, setAdjudicateNotes] = useState("");
  const [conversionItems, setConversionItems] = useState<ConversionRow[]>([]);
  const [converting, setConverting] = useState(false);

  // Feedback
  const [feedback, setFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [reqs, sups, currs, prods, cats, rates, deps, concepts] = await Promise.all([
        PurchasingClientService.getRequisitions({
          status: statusFilter || undefined,
          search: searchFilter || undefined,
        }).catch(() => []),
        PurchasingClientService.getSuppliers().catch(() => []),
        PurchasingClientService.getCurrencies().catch(() => []),
        InventoryClientService.getProducts().catch(() => []),
        InventoryClientService.getCategories().catch(() => []),
        CurrencyService.getCurrentRates().catch(() => null),
        InventoryMasterService.getDepartments(true).catch(() => []),
        InventoryMasterService.getJustificationConcepts(undefined, true).catch(() => []),
      ]);

      setRequisitions(reqs);
      setSuppliers(sups);
      setCurrencies(currs);
      setCatalogProducts(prods);
      setCategories(cats);
      setDepartments(deps);
      setJustificationConcepts(concepts);
      if (deps.length > 0) {
        setSelectedDepartmentId((prev) => (prev !== "" ? prev : deps[0].id));
        setDepartmentSection((prev) => (prev ? prev : deps[0].name));
      }

      if (rates) {
        const ratesObj = {
          USD: Number(rates.USD || rates.rates?.USD || 75.0),
          EUR: Number(rates.EUR || rates.rates?.EUR || 81.5),
          VED: 1.0,
        };
        setBcvRates(ratesObj);
        setAdjudicateExchangeRate((prev) =>
          prev === 75.0 ? ratesObj.USD : prev
        );
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Manejadores del Formulario Crear Preorden
  const handleAddItem = () => {
    setFormItems((prev) => [
      ...prev,
      { productId: 0, unitId: 0, quantityRequested: 1 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (formItems.length === 1) return;
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductSelect = (index: number, productId: number, unitId: number) => {
    setFormItems((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], productId, unitId };
      }
      return updated;
    });
  };

  const handleQuantityChange = (index: number, qty: number) => {
    setFormItems((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], quantityRequested: qty };
      }
      return updated;
    });
  };

  const handleEstimatedPriceChange = (index: number, price: number) => {
    setFormItems((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = {
          ...updated[index],
          estimatedPrice: price > 0 ? price : undefined,
        };
      }
      return updated;
    });
  };

  const handleSubmitPreorder = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const hasInvalid = formItems.some(
      (it) => !it.productId || !it.unitId || it.quantityRequested <= 0
    );
    if (hasInvalid || !justification.trim()) {
      setFeedback({
        status: "error",
        message: "Complete todos los renglones, unidades y la justificación requerida.",
      });
      return;
    }

    if (!selectedDepartmentId) {
      setFeedback({
        status: "error",
        message: "Debe seleccionar un departamento solicitante.",
      });
      return;
    }

    setSubmitting(true);
    try {
      await PurchasingClientService.createRequisition({
        departmentId: Number(selectedDepartmentId),
        departmentSection: departmentSection || undefined,
        justification: justification.trim(),
        notes: notes.trim() || undefined,
        items: formItems,
      });

      setFeedback({
        status: "success",
        message: "Preorden de compra creada correctamente en estado Borrador.",
      });
      setIsNewModalOpen(false);
      setJustification("");
      setNotes("");
      setFormItems([{ productId: 0, unitId: 0, quantityRequested: 1 }]);
      loadData();
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message: getErrorMessage(err, "Error al crear la preorden."),
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Pasar a Cotización
  const handleMoveToQuote = async (req: PurchaseRequisition) => {
    try {
      await PurchasingClientService.updateRequisitionStatus(req.id, "EN_COTIZACION");
      setFeedback({
        status: "success",
        message: `Preorden #${req.requisitionNumber} actualizada a En Cotización.`,
      });
      loadData();
    } catch (err: unknown) {
      setFeedback({
        status: "error",
        message: getErrorMessage(err, "Error al actualizar estado."),
      });
    }
  };

  // Iniciar Modal de Adjudicación
  const openAdjudicateModal = (req: PurchaseRequisition) => {
    setRequisitionToConvert(req);
    setAdjudicateSupplierId("");
    setAdjudicateCurrency("USD");
    setAdjudicateExchangeRate(bcvRates.USD);
    setAdjudicateNotes("");

    // Inicializar renglones mapeando insumo, empaque y precio estimado si existía
    const rows: ConversionRow[] = req.items.map((it) => {
      const prod = it.product;
      const unitLabel =
        it.unit?.abbreviation || it.unit?.name || prod?.baseUnit?.abbreviation || "UND";

      return {
        itemId: it.id,
        productId: it.productId,
        unitId: it.unitId || it.unit?.id || prod?.purchaseUnitId || prod?.baseUnitId || 1,
        quantityOrdered: Number(it.quantityRequested),
        unitPrice: Number(it.estimatedPrice || 0),
        isExempt: Boolean(prod?.isTaxExempt ?? true),
        productName: prod?.name || "Insumo",
        productSku: prod?.sku,
        unitLabel,
      };
    });

    setConversionItems(rows);
  };

  const handleAdjudicateCurrencyChange = (c: CurrencyCode) => {
    setAdjudicateCurrency(c);
    const matchedCurr = currencies.find(
      (cur) => cur.code.toUpperCase() === c.toUpperCase()
    );
    setAdjudicateCurrencyId(matchedCurr ? String(matchedCurr.id) : "");

    if (c === "VED") {
      setAdjudicateExchangeRate(1.0);
    } else if (c === "EUR") {
      setAdjudicateExchangeRate(bcvRates.EUR);
    } else {
      setAdjudicateExchangeRate(bcvRates.USD);
    }
  };

  const handleToggleAllExempt = (exempt: boolean) => {
    setConversionItems((prev) =>
      prev.map((r) => ({ ...r, isExempt: exempt }))
    );
  };

  // Cálculos Fiscales SENIAT
  const fiscalSummary = useMemo(() => {
    let taxableAmount = 0;
    let exemptAmount = 0;

    conversionItems.forEach((r) => {
      const lineSubtotal = Math.round(r.quantityOrdered * r.unitPrice * 100) / 100;
      if (r.isExempt) {
        exemptAmount += lineSubtotal;
      } else {
        taxableAmount += lineSubtotal;
      }
    });

    taxableAmount = Math.round(taxableAmount * 100) / 100;
    exemptAmount = Math.round(exemptAmount * 100) / 100;

    const iva16 = Math.round(taxableAmount * 0.16 * 100) / 100;
    const totalAmount = Math.round((taxableAmount + exemptAmount + iva16) * 100) / 100;

    const rate = Number(adjudicateExchangeRate) || 1;
    const totalBs =
      adjudicateCurrency === "VED"
        ? totalAmount
        : Math.round(totalAmount * rate * 100) / 100;

    return {
      taxableAmount,
      exemptAmount,
      iva16,
      totalAmount,
      totalBs,
    };
  }, [conversionItems, adjudicateExchangeRate, adjudicateCurrency]);

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
          currency: adjudicateCurrency,
          currencyId: adjudicateCurrencyId ? Number(adjudicateCurrencyId) : undefined,
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

  const adjudicateSymbol = getCurrencySymbol(adjudicateCurrency);

  // Manejadores de Exportación y Compartición de Preorden
  const handleSendRequisitionEmail = () => {
    if (!selectedForView) return;
    const itemsList = selectedForView.items
      .map(
        (it, idx) =>
          `${idx + 1}. ${it.product?.name || "Insumo"} - Cantidad: ${it.quantityRequested} ${it.unit?.abbreviation || it.product?.baseUnit?.abbreviation || "UND"}`
      )
      .join("\n");

    const subject = encodeURIComponent(
      `Solicitud de Cotización / Preorden #${selectedForView.requisitionNumber} - Instituto de Inmunología Clínica IDI`
    );
    const body = encodeURIComponent(
      `Estimado proveedor,\n\nLe contactamos del Instituto de Inmunología Clínica IDI C.A. para solicitar formalmente cotización para los siguientes renglones:\n\n${itemsList}\n\nJustificación: ${selectedForView.justification || "Requerimiento operativo"}\n\nAgradecemos enviarnos su oferta con precios unitarios, disponibilidad y condición de pago.\n\nAtentamente,\nDepartamento de Compras y Suministros\nInstituto de Inmunología Clínica IDI`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  const handleSendRequisitionWhatsApp = () => {
    if (!selectedForView) return;
    const itemsList = selectedForView.items
      .map(
        (it, idx) =>
          `*${idx + 1}.* ${it.product?.name || "Insumo"} -> *${it.quantityRequested}* ${it.unit?.abbreviation || it.product?.baseUnit?.abbreviation || "UND"}`
      )
      .join("\n");

    const message = encodeURIComponent(
      `*Instituto de Inmunología Clínica IDI*\n*Preorden / Solicitud de Cotización #${selectedForView.requisitionNumber}*\n\nHola, un saludo cordial. Solicitamos cotización para los siguientes renglones:\n\n${itemsList}\n\nPor favor hacernos llegar su cotización a la brevedad posible. ¡Muchas gracias!`
    );
    window.open(`https://api.whatsapp.com/send?text=${message}`, "_blank");
  };

  const handlePrintRequisition = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Preórdenes de Compra (Solicitud de Cotización)
          </h1>
          <p className="text-xs text-muted-foreground">
            Requisiciones internas, comparativa de ofertas y adjudicación a órdenes de compra
          </p>
        </div>

        <Button
          onClick={() => {
            setIsNewModalOpen(true);
            setFeedback(null);
          }}
          className="gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nueva Preorden
        </Button>
      </div>

      {feedback && (
        <Alert variant={feedback.status === "success" ? "success" : "destructive"}>
          {feedback.status === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <AlertTitle>{feedback.status === "success" ? "Operación Exitosa" : "Error"}</AlertTitle>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}

      {/* Barra de Filtros */}
      <Card className="p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 bg-background border border-input rounded-lg px-3 py-1 text-xs text-foreground focus:ring-2 focus:ring-ring outline-none cursor-pointer"
              >
                <option value="">Todos los estados</option>
                <option value="BORRADOR">Borradores</option>
                <option value="EN_COTIZACION">En Cotización</option>
                <option value="ADJUDICADA">Adjudicadas</option>
                <option value="CANCELADA">Canceladas</option>
              </select>
            </div>

            <Input
              type="text"
              placeholder="Buscar por correlativo o área..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="text-xs flex-1 max-w-sm"
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => loadData()}
            title="Actualizar listado"
            className="self-end sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </Card>

      {/* Tabla de Preórdenes */}
      <Card className="overflow-hidden shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="py-3 px-4 font-semibold">N° Preorden</TableHead>
              <TableHead className="py-3 px-4 font-semibold">Departamento Solicitante</TableHead>
              <TableHead className="py-3 px-4 font-semibold">Fecha Emisión</TableHead>
              <TableHead className="py-3 px-4 text-center font-semibold">Renglones</TableHead>
              <TableHead className="py-3 px-4 text-center font-semibold">Estado</TableHead>
              <TableHead className="py-3 px-4 text-center font-semibold">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                  Cargando preórdenes de compra...
                </TableCell>
              </TableRow>
            ) : requisitions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                  No se encontraron preórdenes registradas.
                </TableCell>
              </TableRow>
            ) : (
              requisitions.map((req) => {
                const badge = STATUS_BADGES[req.status] || {
                  label: req.status,
                  variant: "secondary" as const,
                };
                const canAdjudicate =
                  req.status === "BORRADOR" || req.status === "EN_COTIZACION";
                const canMoveToQuote = req.status === "BORRADOR";

                return (
                  <TableRow
                    key={String(req.id)}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    <TableCell className="py-3 px-4 font-mono font-bold text-foreground">
                      {req.requisitionNumber}
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <div className="font-semibold text-foreground">
                        {req.departmentSection}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                        {req.justification}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      {req.createdAt
                        ? new Date(req.createdAt).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center font-semibold text-foreground">
                      {req.items?.length || 0}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center">
                      <Badge variant={badge.variant}>
                        {badge.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedForView(req)}
                          className="gap-1 h-7 text-xs font-semibold"
                          title="Ver detalle de renglones"
                        >
                          <Eye className="w-3.5 h-3.5" /> Ver
                        </Button>

                        {canMoveToQuote && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleMoveToQuote(req)}
                            className="gap-1 h-7 text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200"
                            title="Pasar a En Cotización"
                          >
                            <Send className="w-3.5 h-3.5" /> Cotizar
                          </Button>
                        )}

                        {canAdjudicate && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => openAdjudicateModal(req)}
                            className="gap-1 h-7 text-xs font-semibold"
                            title="Adjudicar y Convertir en Orden de Compra"
                          >
                            <ArrowRight className="w-3.5 h-3.5" /> Adjudicar
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
      </Card>

      {/* Modal: Crear Preorden con shadcn Dialog */}
      <Dialog open={isNewModalOpen} onOpenChange={setIsNewModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[88vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-5 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="font-bold text-foreground text-base">
                  Nueva Preorden de Compra
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Defina los requerimientos institucionales para solicitar cotización a proveedores
                </p>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmitPreorder} className="flex flex-col flex-1 min-h-0">
            <div className="p-6 overflow-y-auto space-y-5 flex-1 scroll-smooth">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider">
                  Departamento Solicitante *
                </Label>
                <select
                  value={selectedDepartmentId}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSelectedDepartmentId(val);
                    const dep = departments.find((d) => d.id === val);
                    if (dep) setDepartmentSection(dep.name);
                  }}
                  className="w-full h-9 bg-background border border-input rounded-lg px-3 py-1 text-xs text-foreground focus:ring-2 focus:ring-ring font-medium cursor-pointer"
                  required
                >
                  <option value="">-- Seleccione un departamento activo --</option>
                  {departments.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.code} - {sec.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-3 pt-2 border-t border-border">
                <Card className="p-3 bg-muted/20 border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-none">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Renglones ({formItems.length})
                    </span>
                    <span className="text-muted-foreground hidden sm:inline">|</span>
                    <div className="flex items-center gap-1.5">
                      <Label
                        htmlFor="req-category-filter"
                        className="text-xs font-medium text-muted-foreground whitespace-nowrap"
                      >
                        Filtrar productos por categoría:
                      </Label>
                      <select
                        id="req-category-filter"
                        value={selectedCategoryFilter}
                        onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                        className="h-8 bg-background border border-input rounded-lg px-2.5 text-xs font-semibold text-foreground focus:ring-2 focus:ring-ring transition-colors cursor-pointer"
                      >
                        <option value="">Todas las categorías</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddItem}
                    className="gap-1.5 text-xs text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> Agregar renglón
                  </Button>
                </Card>

                <div className="space-y-3">
                  {formItems.map((item, idx) => {
                    const selectedProd = catalogProducts.find((p) => p.id === item.productId);
                    const activeUnit =
                      item.unitId === selectedProd?.purchaseUnitId
                        ? selectedProd?.purchaseUnit?.abbreviation || selectedProd?.purchaseUnit?.name
                        : selectedProd?.baseUnit?.abbreviation || selectedProd?.baseUnit?.name || "";
                    const hasConversion =
                      selectedProd?.conversionFactor &&
                      Number(selectedProd.conversionFactor) > 1 &&
                      item.unitId === selectedProd?.purchaseUnitId;
                    const baseQty = hasConversion
                      ? Math.round(Number(item.quantityRequested || 0) * Number(selectedProd.conversionFactor) * 100) / 100
                      : null;

                    return (
                      <Card
                        key={idx}
                        className="p-4 bg-muted/20 border-border"
                      >
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-background border border-border text-xs font-mono font-bold text-muted-foreground shrink-0">
                            {idx + 1}
                          </div>

                          {/* Selector de Producto y Empaque */}
                          <div className="flex-1 min-w-0">
                            <ProductPackagingSelector
                              products={catalogProducts}
                              selectedCategoryId={selectedCategoryFilter}
                              selectedProductId={item.productId}
                              selectedUnitId={item.unitId}
                              onChange={(pId, uId) => handleProductSelect(idx, pId, uId)}
                            />
                          </div>

                          {/* Cantidad solicitada */}
                          <div className="w-full sm:w-32 shrink-0">
                            <Label className="text-[11px] mb-1 block">
                              Cantidad {activeUnit ? `(${activeUnit})` : ""}
                            </Label>
                            <Input
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
                              className="font-mono font-bold text-xs"
                              required
                            />
                            {hasConversion && baseQty !== null && (
                              <span className="text-[10px] text-primary font-medium block mt-0.5 truncate">
                                ≈ {baseQty} {selectedProd?.baseUnit?.abbreviation || "UND"}
                              </span>
                            )}
                          </div>

                          {/* Precio Estimado (Opcional) */}
                          <div className="w-full sm:w-32 shrink-0">
                            <Label className="text-[11px] mb-1 block">
                              Precio Est. ($)
                            </Label>
                            <Input
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
                              className="font-mono text-xs"
                            />
                          </div>

                          {/* Eliminar renglón */}
                          <div className="sm:self-end mb-0.5 shrink-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleRemoveItem(idx)}
                              disabled={formItems.length === 1}
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              title="Eliminar renglón"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-border space-y-1.5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <Label className="text-xs uppercase tracking-wider">
                    Justificación de la Compra / Protocolo *
                  </Label>
                  {justificationConcepts.length > 0 && (
                    <select
                      value=""
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        const found = justificationConcepts.find((c) => String(c.id) === val);
                        if (found) {
                          const snippet = `${found.title}${found.description ? `: ${found.description}` : ""}`;
                          setJustification((prev) => (prev ? `${prev}\n• ${snippet}` : snippet));
                        }
                      }}
                      className="text-[11px] bg-primary/5 border border-primary/20 text-primary rounded-md px-2 py-1 focus:ring-1 focus:ring-ring font-medium cursor-pointer"
                    >
                      <option value="">+ Seleccionar concepto / protocolo predefinido...</option>
                      {justificationConcepts.map((jc) => (
                        <option key={jc.id} value={jc.id}>
                          [{jc.code}] {jc.title}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <Textarea
                  rows={3}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Explique el requerimiento de insumos o el protocolo científico a ejecutar..."
                  className="text-xs resize-none font-medium"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider">
                  Notas y Observaciones (Opcional)
                </Label>
                <Input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Especificaciones adicionales o condiciones de entrega requeridas..."
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter className="p-4 px-6 border-t border-border bg-muted/20 flex sm:justify-between items-center">
              <span className="text-xs text-muted-foreground">
                {formItems.length}{" "}
                {formItems.length === 1
                  ? "renglón agregado"
                  : "renglones agregados"}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNewModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? "Creando..." : "Crear Preorden"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Ver Detalle de Preorden con shadcn Dialog */}
      <Dialog
        open={!!selectedForView}
        onOpenChange={(open) => {
          if (!open) setSelectedForView(null);
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-5 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <div>
                <DialogTitle className="font-bold text-foreground text-base">
                  Preorden #{selectedForView?.requisitionNumber}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Área: <strong className="text-foreground">{selectedForView?.departmentSection}</strong>
                </p>
              </div>
            </div>
          </DialogHeader>

          {selectedForView && (
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div>
                <span className="text-xs font-bold text-foreground uppercase tracking-wider block mb-1">
                  Justificación Técnica
                </span>
                <p className="text-xs text-foreground bg-muted/30 p-3 rounded-lg border border-border">
                  {selectedForView.justification}
                </p>
              </div>

              {selectedForView.notes && (
                <div>
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider block mb-1">
                    Notas y Observaciones
                  </span>
                  <p className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border">
                    {selectedForView.notes}
                  </p>
                </div>
              )}

              <div>
                <span className="text-xs font-bold text-foreground uppercase tracking-wider block mb-2">
                  Renglones Solicitados ({selectedForView.items.length})
                </span>
                <Card className="overflow-hidden shadow-none">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="py-2.5 px-3">#</TableHead>
                        <TableHead className="py-2.5 px-3">Insumo / Reactivo</TableHead>
                        <TableHead className="py-2.5 px-3 text-right">Cant. Solicitada</TableHead>
                        <TableHead className="py-2.5 px-3 text-center">Conversión Base</TableHead>
                        <TableHead className="py-2.5 px-3 text-right">Precio Est. ($)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedForView.items.map((it, idx) => {
                        const unitName = it.unit?.abbreviation || it.product?.baseUnit?.abbreviation || "UND";
                        const baseUnitName = it.product?.baseUnit?.abbreviation || "UND";
                        const hasConversion =
                          Boolean(it.product?.conversionFactor &&
                          Number(it.product.conversionFactor) > 1 &&
                          it.unit?.id !== it.product.baseUnitId);
                        const baseQty = hasConversion
                          ? Math.round(Number(it.quantityRequested) * Number(it.product!.conversionFactor!) * 100) / 100
                          : null;

                        return (
                          <TableRow key={it.id} className="hover:bg-muted/40">
                            <TableCell className="py-2.5 px-3 font-mono text-muted-foreground">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="py-2.5 px-3">
                              <span className="font-semibold text-foreground block">
                                {it.product?.name}
                              </span>
                              {it.product?.sku && (
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  SKU: {it.product.sku}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                              {Number(it.quantityRequested)} {unitName}
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-center">
                              {hasConversion && baseQty !== null ? (
                                <div className="text-[11px] text-primary font-medium font-mono">
                                  ≈ {baseQty} {baseUnitName}
                                  <span className="text-muted-foreground text-[10px] block font-sans">
                                    (1 {unitName} = {Number(it.product!.conversionFactor)} {baseUnitName})
                                  </span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground font-mono text-[11px]">-</span>
                              )}
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-right font-mono text-muted-foreground">
                              {it.estimatedPrice ? `$${Number(it.estimatedPrice).toFixed(2)}` : "-"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            </div>
          )}

          <DialogFooter className="p-4 px-6 border-t border-border bg-muted/20 flex flex-wrap items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSendRequisitionEmail}
                className="gap-1.5 text-xs"
                title="Enviar preorden por Correo Electrónico"
              >
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                <span>Correo</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSendRequisitionWhatsApp}
                className="gap-1.5 text-xs"
                title="Enviar preorden por WhatsApp"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrintRequisition}
                className="gap-1.5 text-xs"
                title="Descargar o Imprimir Documento"
              >
                <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Imprimir / PDF</span>
              </Button>
            </div>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setSelectedForView(null)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Adjudicar y Convertir en Orden de Compra con shadcn Dialog */}
      <Dialog
        open={!!requisitionToConvert}
        onOpenChange={(open) => {
          if (!open) setRequisitionToConvert(null);
        }}
      >
        <DialogContent className="sm:max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-5 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="font-bold text-foreground text-base">
                  Adjudicar Preorden #{requisitionToConvert?.requisitionNumber} a Orden de Compra
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Defina el proveedor adjudicado, precios finales acordados y soporte fiscal SENIAT (IVA 16% / Exentos)
                </p>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleConfirmConversion} className="flex flex-col flex-1 min-h-0">
            <div className="p-6 overflow-y-auto space-y-5 flex-1 scroll-smooth">
              {/* Datos Comerciales y Fiscales */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/20 p-4 rounded-xl border border-border">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider">
                    Proveedor Adjudicado *
                  </Label>
                  <select
                    value={adjudicateSupplierId}
                    onChange={(e) => setAdjudicateSupplierId(e.target.value)}
                    className="w-full h-9 bg-background border border-input rounded-lg px-3 py-1 text-xs text-foreground focus:ring-2 focus:ring-ring font-medium cursor-pointer"
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

                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider">
                    Moneda de Facturación *
                  </Label>
                  <select
                    value={adjudicateCurrency}
                    onChange={(e) => handleAdjudicateCurrencyChange(e.target.value as CurrencyCode)}
                    className="w-full h-9 bg-background border border-input rounded-lg px-3 py-1 text-xs text-foreground focus:ring-2 focus:ring-ring font-medium cursor-pointer"
                    required
                  >
                    {CURRENCY_OPTIONS.map((opt) => (
                      <option key={opt.code} value={opt.code}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs uppercase tracking-wider">
                    {adjudicateCurrency === "VED"
                      ? "Tasa de Cambio (VED)"
                      : `Tasa BCV del Día (${adjudicateCurrency === "EUR" ? "Bs./EUR" : "Bs./USD"})`}
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={adjudicateExchangeRate}
                      disabled={adjudicateCurrency === "VED"}
                      onChange={(e) => setAdjudicateExchangeRate(Number(e.target.value))}
                      className="font-mono font-bold text-xs pr-12"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono">
                      {adjudicateCurrency === "VED" ? "1.00" : adjudicateCurrency === "EUR" ? "Bs./€" : "Bs./$"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabla de Renglones Adjudicados */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Renglones de Material a Adjudicar ({conversionItems.length})
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleAllExempt(true)}
                      className="text-[11px] h-7 text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                    >
                      Marcar todo Exento
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleAllExempt(false)}
                      className="text-[11px] h-7"
                    >
                      Marcar todo Gravable (16%)
                    </Button>
                  </div>
                </div>

                <Card className="overflow-hidden shadow-none">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="py-2.5 px-3">Insumo / Reactivo</TableHead>
                        <TableHead className="py-2.5 px-3 text-center">Unidad</TableHead>
                        <TableHead className="py-2.5 px-3 text-right w-24">Cantidad</TableHead>
                        <TableHead className="py-2.5 px-3 text-right w-32">Precio Unit. ({adjudicateSymbol})</TableHead>
                        <TableHead className="py-2.5 px-3 text-center w-28">¿Exento IVA?</TableHead>
                        <TableHead className="py-2.5 px-3 text-right w-28">Subtotal ({adjudicateSymbol})</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {conversionItems.map((row, idx) => {
                        const lineSubtotal = Math.round(row.quantityOrdered * row.unitPrice * 100) / 100;
                        return (
                          <TableRow key={idx} className="hover:bg-muted/40">
                            <TableCell className="py-2.5 px-3">
                              <span className="font-semibold text-foreground block">
                                {row.productName}
                              </span>
                              {row.productSku && (
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  SKU: {row.productSku}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-center font-medium text-muted-foreground">
                              {row.unitLabel}
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-right">
                              <Input
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
                                className="h-7 text-right font-mono font-bold text-xs"
                                required
                              />
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-right">
                              <Input
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
                                className="h-7 text-right font-mono font-bold text-xs text-primary"
                                required
                              />
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <Checkbox
                                  checked={row.isExempt}
                                  onCheckedChange={(checked) => {
                                    const isEx = !!checked;
                                    setConversionItems((prev) => {
                                      const updated = [...prev];
                                      if (updated[idx]) {
                                        updated[idx] = { ...updated[idx], isExempt: isEx };
                                      }
                                      return updated;
                                    });
                                  }}
                                />
                                <span
                                  className={`text-[11px] font-semibold ${
                                    row.isExempt ? "text-emerald-700" : "text-muted-foreground"
                                  }`}
                                >
                                  {row.isExempt ? "Exento" : "Gravable"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-right font-mono font-bold text-foreground">
                              {adjudicateSymbol} {lineSubtotal.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Card>
              </div>

              {/* Cuadro Resumen Financiero SENIAT */}
              <div className="bg-muted/20 p-4 rounded-xl border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>
                    Cálculo fiscal automatizado según providencias SENIAT. La orden guardará snapshot inmutable de la tasa oficial BCV.
                  </span>
                </div>

                <Card className="w-full sm:w-80 p-3 shadow-2xs space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal Gravable (Base 16%):</span>
                    <span className="font-mono font-semibold text-foreground">
                      {adjudicateSymbol} {fiscalSummary.taxableAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal Exento:</span>
                    <span className="font-mono font-semibold text-emerald-700">
                      {adjudicateSymbol} {fiscalSummary.exemptAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>IVA (16%):</span>
                    <span className="font-mono font-semibold text-foreground">
                      {adjudicateSymbol} {fiscalSummary.iva16.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t border-border pt-1.5 flex justify-between font-bold text-foreground text-sm">
                    <span>Total General ({adjudicateCurrency}):</span>
                    <span className="font-mono text-primary">
                      {adjudicateSymbol} {fiscalSummary.totalAmount.toFixed(2)}
                    </span>
                  </div>
                  {adjudicateCurrency !== "VED" && (
                    <div className="border-t border-dashed border-border pt-1.5 space-y-0.5">
                      <div className="flex justify-between text-muted-foreground font-mono text-[11px]">
                        <span className="font-semibold text-foreground">Monto Total en Bs.:</span>
                        <span className="font-bold text-foreground">
                          Bs. {fiscalSummary.totalBs.toLocaleString("es-VE", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground italic">
                        Calculado a la tasa oficial BCV de {adjudicateExchangeRate.toFixed(2)} Bs./{adjudicateCurrency === "EUR" ? "€" : "$"}
                      </p>
                    </div>
                  )}
                </Card>
              </div>

              {/* Notas de adjudicación */}
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider">
                  Términos de Despacho o Notas de la Orden (Opcional)
                </Label>
                <Input
                  type="text"
                  value={adjudicateNotes}
                  onChange={(e) => setAdjudicateNotes(e.target.value)}
                  placeholder="Condiciones de pago a 30 días, flete incluido..."
                  className="text-xs"
                />
              </div>
            </div>

            {/* Pie Fijo */}
            <DialogFooter className="p-4 px-6 border-t border-border bg-muted/20 flex sm:justify-between items-center">
              <span className="text-xs text-muted-foreground">
                Total a ordenar:{" "}
                <strong className="text-foreground">
                  {adjudicateSymbol} {fiscalSummary.totalAmount.toFixed(2)} {adjudicateCurrency}
                </strong>
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRequisitionToConvert(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  variant="success"
                  disabled={converting}
                  className="gap-2"
                >
                  {converting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {converting ? "Generando Orden..." : "Adjudicar y Generar Orden"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
