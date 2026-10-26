"use client";

import React, { useState, useEffect, useMemo, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
} from "lucide-react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import { toast } from "@/utils/toast";

interface FormItem {
  productId: number;
  unitId: number;
  quantityRequested: number;
  estimatedPrice?: number;
}

export default function NewRequisitionPage() {
  const router = useRouter();

  // Estados de datos maestros
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [justificationConcepts, setJustificationConcepts] = useState<JustificationConceptItem[]>([]);
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
          InventoryMasterService.getJustificationConcepts(undefined, true).catch(() => []),
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

  const handleEstimatedPriceChange = (index: number, price: number) => {
    setFormItems((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], estimatedPrice: price };
      }
      return updated;
    });
  };

  // Cálculo total estimado
  const totalEstimatedUsd = useMemo(() => {
    return formItems.reduce((acc, it) => {
      const price = Number(it.estimatedPrice) || 0;
      const qty = Number(it.quantityRequested) || 0;
      return acc + price * qty;
    }, 0);
  }, [formItems]);

  const handleSubmit = async (e: FormEvent) => {
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
      toast.error("Verifique los renglones y la justificación.");
      return;
    }

    if (!selectedDepartmentId) {
      setFeedback({
        status: "error",
        message: "Debe seleccionar un departamento solicitante.",
      });
      toast.error("Seleccione un departamento solicitante.");
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
        `Preorden de compra #${result.requisitionNumber || result.id} creada en estado Borrador.`
      );
      router.push("/purchasing/requisitions");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al crear la preorden.";
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
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Cabecera y Navegación */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => router.push("/purchasing/requisitions")}
            className="cursor-pointer"
            title="Regresar a Requisiciones"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="indigo" className="text-xs font-semibold">
                Preorden de Compra
              </Badge>
              <Badge variant="outline" className="border-border/60 bg-muted/20 text-xs text-muted-foreground">
                Estado: Borrador
              </Badge>
              {totalEstimatedUsd > 0 && (
                <Badge variant="success" className="text-xs font-mono">
                  Est. ${totalEstimatedUsd.toFixed(2)} USD
                </Badge>
              )}
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground mt-1">
              Nueva Preorden de Compra (Requisición)
            </h1>
            <p className="text-xs text-muted-foreground">
              Solicitud de adquisición formal de insumos o reactivos para reposición y compras
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => router.push("/purchasing/requisitions")}
            className="text-xs cursor-pointer"
          >
            Cancelar
          </Button>
          <Button
            form="requisition-form"
            type="submit"
            size="sm"
            disabled={submitting}
            className="text-xs gap-1.5 cursor-pointer shadow-xs"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {submitting ? "Creando..." : "Crear Preorden"}
          </Button>
        </div>
      </div>

      {feedback && (
        <Alert variant={feedback.status === "success" ? "success" : "destructive"}>
          {feedback.status === "success" ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span className="text-xs font-medium ml-2">{feedback.message}</span>
        </Alert>
      )}

      <form id="requisition-form" onSubmit={handleSubmit} className="space-y-6">
        {/* SECCIÓN 1: Departamento Solicitante */}
        <Card className="p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Building2 className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold text-foreground">
              1. Departamento y Área Solicitante
            </CardTitle>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
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

            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                Sección u Operación Específica (Opcional)
              </Label>
              <Input
                type="text"
                value={departmentSection}
                onChange={(e) => setDepartmentSection(e.target.value)}
                placeholder="Ej: Sala de Muestras / Hematología Especial..."
                className="text-xs"
              />
            </div>
          </div>
        </Card>

        {/* SECCIÓN 2: Insumos y Empaques Solicitados */}
        <Card className="p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-bold text-foreground">
                2. Insumos y Empaques Requeridos ({formItems.length})
              </CardTitle>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <Label
                  htmlFor="filter-cat"
                  className="text-xs font-medium text-muted-foreground whitespace-nowrap"
                >
                  Filtrar categoría:
                </Label>
                <select
                  id="filter-cat"
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

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="gap-1.5 text-xs text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar renglón
              </Button>
            </div>
          </div>

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
                  className="p-4 bg-muted/20 border-border hover:border-border/80 transition-colors"
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
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
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
        </Card>

        {/* SECCIÓN 3: Motivo y Justificación con Badges de Protocolo */}
        <Card className="p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <HelpCircle className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold text-foreground">
              3. Justificación y Protocolos de Compra
            </CardTitle>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase font-semibold">
                Motivo y Justificación de la Compra *
              </Label>
              <span className="text-[11px] text-muted-foreground">
                (Haz clic en un badge para asociar la justificación institucional)
              </span>
            </div>

            {/* ProtocolBadgeSelector con colores vibrantes y badges de 1 palabra */}
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
                        (l) =>
                          !l.toLowerCase().includes(c.title.toLowerCase())
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
              Observaciones / Instrucciones Logísticas Adicionales (Opcional)
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
            Regresar al Listado
          </Button>

          <Button
            type="submit"
            disabled={submitting}
            className="gap-2 cursor-pointer shadow-xs px-6"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? "Creando Preorden..." : "Crear Preorden de Compra"}
          </Button>
        </div>
      </form>
    </div>
  );
}
