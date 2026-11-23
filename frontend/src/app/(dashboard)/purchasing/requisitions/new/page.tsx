"use client";

import React, { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PurchasingClientService } from "@/services/purchasing.service";
import { InventoryClientService } from "@/services/inventory.service";
import {
  InventoryMasterService,
  type DepartmentItem,
  type JustificationConceptItem,
} from "@/services/inventory-master.service";
import type { Product, Category } from "@/types/inventory";
import { ProductPackagingSelector } from "@/components/purchasing/ProductPackagingSelector";
import { ProtocolBadgeSelector } from "@/components/requests/ProtocolBadgeSelector";
import {
  FileText,
  Plus,
  Trash2,
  Loader2,
  ArrowLeft,
  Building2,
  Boxes,
  HelpCircle,
  AlertCircle,
  CheckCircle2,
  FileCheck2,
  X,
} from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/utils/toast";

interface FormItem {
  productId: number;
  unitId: number;
  quantityRequested: number;
}

export default function NewRequisitionPage() {
  const router = useRouter();

  // Estados de datos maestros
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [justificationConcepts, setJustificationConcepts] = useState<
    JustificationConceptItem[]
  >([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Estados del formulario
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | "">("");
  const [departmentSection, setDepartmentSection] = useState<string>("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("");
  const [formItems, setFormItems] = useState<FormItem[]>([
    { productId: 0, unitId: 0, quantityRequested: 1 },
  ]);
  const [justification, setJustification] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    let ignore = false;
    void (async () => {
      try {
        const [deps, cats, prods, concepts] = await Promise.all([
          InventoryMasterService.getDepartments(true).catch(() => []),
          InventoryClientService.getCategories().catch(() => []),
          InventoryClientService.getProducts().catch(() => []),
          InventoryMasterService.getJustificationConcepts(undefined, true).catch(
            () => []
          ),
        ]);
        if (!ignore) {
          setDepartments(deps);
          setCategories(cats);
          setCatalogProducts(prods);
          setJustificationConcepts(concepts);
        }
      } catch (err) {
        console.error("Error al cargar maestros para preorden", err);
        toast.error("Error cargando catálogos de departamentos e insumos.");
      } finally {
        if (!ignore) setLoadingInitial(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

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

  const handleProductSelect = (index: number, pId: number, unitId: number) => {
    setFormItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        productId: pId,
        unitId,
      };
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!selectedDepartmentId) {
      setFeedback({
        status: "error",
        message: "Debe seleccionar un departamento solicitante.",
      });
      toast.error("Seleccione un departamento solicitante.");
      return;
    }

    const hasInvalid = formItems.some(
      (it) => !it.productId || !it.unitId || it.quantityRequested <= 0
    );
    if (hasInvalid || !justification.trim()) {
      setFeedback({
        status: "error",
        message:
          "Complete todos los insumos, presentaciones, cantidades y la justificación requerida.",
      });
      toast.error("Verifique los insumos y la justificación.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await PurchasingClientService.createRequisition({
        departmentId: Number(selectedDepartmentId),
        departmentSection: departmentSection.trim() || undefined,
        justification: justification.trim(),
        notes: notes.trim() || undefined,
        items: formItems,
      });

      toast.success(
        `Preorden #${result.requisitionNumber || result.id} creada en estado Borrador.`
      );
      router.push(`/purchasing/requisitions/${result.id}`);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al crear la preorden.";
      setFeedback({
        status: "error",
        message: msg,
      });
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-medium">
          Cargando catálogos de departamentos e insumos...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ========================================================
          ENCABEZADO ESTANDARIZADO
         ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-start sm:items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => router.push("/purchasing/requisitions")}
            className="h-9 w-9 shrink-0 cursor-pointer"
            title="Volver a Preórdenes"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" />
                Nueva Preorden
              </h1>
              <Badge
                variant="secondary"
                className="text-xs bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20"
              >
                Borrador
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Solicitud de insumos o reactivos para cotización y reposición
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/purchasing/requisitions")}
            className="h-9 text-xs cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            form="requisition-form"
            type="submit"
            size="sm"
            disabled={submitting}
            className="h-9 text-xs font-bold gap-1.5 cursor-pointer shadow-2xs"
          >
            {submitting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileCheck2 className="w-4 h-4" />
            )}
            <span>{submitting ? "Creando..." : "Crear Preorden"}</span>
          </Button>
        </div>
      </div>

      {feedback && (
        <Alert
          variant={feedback.status === "success" ? "success" : "destructive"}
          className="animate-in fade-in duration-200"
        >
          {feedback.status === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <AlertTitle>
            {feedback.status === "success" ? "Operación Exitosa" : "Error"}
          </AlertTitle>
          <AlertDescription className="flex items-center justify-between text-xs">
            <span>{feedback.message}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="opacity-70 hover:opacity-100 cursor-pointer ml-3"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </AlertDescription>
        </Alert>
      )}

      <form id="requisition-form" onSubmit={handleSubmit} className="space-y-6">
        {/* ========================================================
            SECCIÓN 1: DEPARTAMENTO SOLICITANTE
           ======================================================== */}
        <Card className="p-5 border-border shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Building2 className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold text-foreground">
              1. Departamento Solicitante
            </CardTitle>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                Departamento *
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

            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                Sección o Área Específica (Opcional)
              </Label>
              <Input
                type="text"
                value={departmentSection}
                onChange={(e) => setDepartmentSection(e.target.value)}
                placeholder="Ej: Sala de Muestras / Hematología Especial..."
                className="text-xs h-9"
              />
            </div>
          </div>
        </Card>

        {/* ========================================================
            SECCIÓN 2: INSUMOS SOLICITADOS
           ======================================================== */}
        <Card className="p-5 border-border shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-bold text-foreground">
                2. Insumos Solicitados ({formItems.length})
              </CardTitle>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                id="filter-cat"
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="h-8 bg-background border border-input rounded-lg px-2.5 text-xs font-medium text-foreground focus:ring-2 focus:ring-ring cursor-pointer"
                title="Filtrar insumos por categoría"
              >
                <option value="">Todas las categorías</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="h-8 gap-1.5 text-xs text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar insumo</span>
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {formItems.map((item, idx) => {
              const selectedProd = catalogProducts.find(
                (p) => p.id === item.productId
              );
              const activeUnit =
                item.unitId === selectedProd?.purchaseUnitId
                  ? selectedProd?.purchaseUnit?.abbreviation ||
                    selectedProd?.purchaseUnit?.name
                  : selectedProd?.baseUnit?.abbreviation ||
                    selectedProd?.baseUnit?.name ||
                    "";

              return (
                <Card
                  key={idx}
                  className="p-4 bg-muted/20 border-border hover:border-border/80 transition-colors shadow-none"
                >
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-background border border-border text-xs font-mono font-bold text-muted-foreground shrink-0">
                      {idx + 1}
                    </div>

                    {/* Selector de Insumo y Presentación */}
                    <div className="flex-1 min-w-0">
                      <ProductPackagingSelector
                        products={catalogProducts}
                        selectedCategoryId={selectedCategoryFilter}
                        selectedProductId={item.productId}
                        selectedUnitId={item.unitId}
                        onChange={(pId, uId) =>
                          handleProductSelect(idx, pId, uId)
                        }
                      />
                    </div>

                    {/* Cantidad solicitada */}
                    <div className="w-full sm:w-36 shrink-0">
                      <Label className="text-[11px] mb-1 block">
                        Cantidad {activeUnit ? `(${activeUnit})` : ""} *
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
                        className="font-mono font-bold text-xs h-9"
                        required
                      />
                    </div>

                    {/* Eliminar */}
                    <div className="sm:self-end sm:pb-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={formItems.length === 1}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                        title="Eliminar insumo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </Card>

        {/* ========================================================
            SECCIÓN 3: JUSTIFICACIÓN Y OBSERVACIONES
           ======================================================== */}
        <Card className="p-5 border-border shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <HelpCircle className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold text-foreground">
              3. Justificación y Observaciones
            </CardTitle>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Label className="text-xs uppercase font-semibold">
                Motivo y Justificación *
              </Label>
              {justificationConcepts.length > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  Selecciona un concepto para asociar la justificación
                </span>
              )}
            </div>

            {justificationConcepts.length > 0 && (
              <ProtocolBadgeSelector
                concepts={justificationConcepts}
                isConceptSelected={(c) =>
                  justification.toLowerCase().includes(c.title.toLowerCase())
                }
                onToggleConcept={(c) => {
                  const isPresent = justification
                    .toLowerCase()
                    .includes(c.title.toLowerCase());
                  if (isPresent) {
                    const filtered = justification
                      .split("\n")
                      .filter(
                        (l) => !l.toLowerCase().includes(c.title.toLowerCase())
                      )
                      .join("\n")
                      .trim();
                    setJustification(filtered);
                  } else {
                    const addition = `• ${c.title}${c.description ? `: ${c.description}` : ""}`;
                    setJustification((prev) =>
                      prev.trim() ? `${prev.trim()}\n${addition}` : addition
                    );
                  }
                }}
              />
            )}

            <Textarea
              required
              rows={3}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Explique el motivo del pedido, reposición de inventario o urgencia operativa..."
              className="text-xs"
            />
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border">
            <Label className="text-xs uppercase font-semibold">
              Observaciones Adicionales (Opcional)
            </Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Indicar si se requiere entrega en almacén refrigerado o fecha máxima estimada..."
              className="text-xs"
            />
          </div>
        </Card>

        {/* Barra Inferior de Acción */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/purchasing/requisitions")}
            className="cursor-pointer"
          >
            Volver al Listado
          </Button>

          <Button
            type="submit"
            disabled={submitting}
            className="gap-2 cursor-pointer shadow-xs px-6"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileCheck2 className="w-4 h-4" />
            )}
            {submitting ? "Creando Preorden..." : "Crear Preorden"}
          </Button>
        </div>
      </form>
    </div>
  );
}
