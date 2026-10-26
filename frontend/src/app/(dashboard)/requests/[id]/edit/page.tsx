"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  type FormEvent,
} from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { RequestClientService } from "@/services/request.service";
import { InventoryClientService } from "@/services/inventory.service";
import {
  InventoryMasterService,
  type DepartmentItem,
  type JustificationConceptItem,
} from "@/services/inventory-master.service";
import { AuthService } from "@/services/auth.service";
import { toast } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { ProductCombobox } from "@/components/requests/ProductCombobox";
import {
  ProtocolBadgeSelector,
  getConceptSummaryWord,
} from "@/components/requests/ProtocolBadgeSelector";
import type { InternalRequest, RequestPriority } from "@/types/requests";
import type { Product, Category } from "@/types/inventory";
import type { AuthUser } from "@/types/auth";
import {
  ArrowLeft,
  Plus,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  ClipboardList,
  Search,
  Building2,
  CheckCircle2,
  Save,
  Lock,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RequestFormRow {
  uid: string;
  productId: number;
  requestedQuantity: number;
}

export default function EditInternalRequestPage() {
  const router = useRouter();
  const params = useParams();
  const requestId = params?.id as string;

  const [currentUser] = useState<AuthUser | null>(() =>
    AuthService.getCurrentUser()
  );

  // Estados de datos
  const [existingRequest, setExistingRequest] = useState<InternalRequest | null>(null);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [justificationConcepts, setJustificationConcepts] = useState<
    JustificationConceptItem[]
  >([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Formulario
  const [departmentId, setDepartmentId] = useState<number | null>(null);
  const [departmentSection, setDepartmentSection] = useState("");
  const [priority, setPriority] = useState<RequestPriority>("RUTINA");
  const [justification, setJustification] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<RequestFormRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  // Búsqueda en catálogo de stock
  const [stockSearch, setStockSearch] = useState("");
  const [selectedStockCategory, setSelectedStockCategory] = useState<string>("");

  useEffect(() => {
    let ignore = false;
    void (async () => {
      try {
        if (!requestId) return;

        const [reqData, deps, concepts, prods, cats] = await Promise.all([
          RequestClientService.getRequestById(requestId),
          InventoryMasterService.getDepartments(true).catch(() => []),
          InventoryMasterService.getJustificationConcepts(undefined, true).catch(() => []),
          InventoryClientService.getProducts().catch(() => []),
          InventoryClientService.getCategories().catch(() => []),
        ]);

        if (!ignore) {
          setExistingRequest(reqData);
          setDepartments(deps);
          setJustificationConcepts(concepts);
          setCategories(cats);

          // Asegurar que todos los productos asociados a la solicitud existen en la lista de insumos
          const allProds = [...prods];
          if (reqData.items && reqData.items.length > 0) {
            reqData.items.forEach((it) => {
              const pId = it.productId ?? (it as any).product_id ?? it.product?.id;
              if (
                pId &&
                !allProds.some((p) => String(p.id) === String(pId))
              ) {
                if (it.product) {
                  allProds.push({
                    id: Number(pId),
                    name: it.product.name,
                    sku: it.product.sku,
                    unitOfMeasure: it.product.unitOfMeasure,
                    baseUnit: it.product.baseUnit,
                    categoryId: (it.product as any).categoryId || 0,
                    isActive: true,
                  } as any);
                }
              }
            });
          }
          setProducts(allProds);

          // Inicializar formulario con datos de la solicitud existente
          setDepartmentId(reqData.departmentId || null);
          setDepartmentSection(reqData.departmentSection || "");
          setPriority((reqData.priority as RequestPriority) || "RUTINA");
          setJustification(reqData.justification || "");
          setNotes(reqData.notes || "");

          if (reqData.items && reqData.items.length > 0) {
            setRows(
              reqData.items.map((it, idx) => {
                const prodId = Number(
                  it.productId ?? (it as any).product_id ?? it.product?.id ?? 0
                );
                const rawQty =
                  it.quantityRequested ??
                  it.requestedQuantity ??
                  (it as any).quantity_requested;
                const parsedQty = Number(rawQty);
                const requestedQuantity =
                  !isNaN(parsedQty) && parsedQty > 0 ? parsedQty : 1;

                return {
                  uid: `item-${it.id || idx}-${Date.now()}-${idx}`,
                  productId: isNaN(prodId) ? 0 : prodId,
                  requestedQuantity,
                };
              })
            );
          } else {
            setRows([
              { uid: `init-${Date.now()}`, productId: 0, requestedQuantity: 1 },
            ]);
          }
        }
      } catch (err) {
        console.error("Error al cargar solicitud para edición", err);
        toast.error("No se pudo cargar la información de la solicitud.");
      } finally {
        if (!ignore) setLoadingInitial(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [requestId]);

  // Manejo de renglones
  const handleAddRow = useCallback((productId = 0, initialQuantity = 1) => {
    setRows((prev) => [
      ...prev,
      {
        uid: `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        productId,
        requestedQuantity: initialQuantity,
      },
    ]);
  }, []);

  const handleRemoveRow = useCallback((uid: string) => {
    setRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((r) => r.uid !== uid);
    });
  }, []);

  const handleUpdateRow = useCallback(
    (uid: string, field: "productId" | "requestedQuantity", val: number) => {
      setRows((prev) =>
        prev.map((r) => {
          if (r.uid !== uid) return r;
          if (field === "requestedQuantity") {
            return {
              ...r,
              requestedQuantity: isNaN(val) ? 0 : val,
            };
          }
          return { ...r, [field]: val };
        })
      );
    },
    []
  );

  // Filtrado de insumos para consulta rápida de stock
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat =
        !selectedStockCategory ||
        String(p.categoryId) === selectedStockCategory;
      const term = stockSearch.toLowerCase().trim();
      const matchSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        (p.sku && p.sku.toLowerCase().includes(term));
      return matchCat && matchSearch;
    });
  }, [products, selectedStockCategory, stockSearch]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorFeedback(null);

    if (!existingRequest) return;

    if (existingRequest.status !== "PENDIENTE") {
      const msg = "Solo se pueden modificar solicitudes en estado PENDIENTE antes de ser aprobadas.";
      setErrorFeedback(msg);
      toast.error(msg);
      return;
    }

    if (!departmentId) {
      const msg = "Debe seleccionar un departamento solicitante.";
      setErrorFeedback(msg);
      toast.error(msg);
      return;
    }

    if (!justification.trim()) {
      const msg = "La justificación del pedido es obligatoria.";
      setErrorFeedback(msg);
      toast.error(msg);
      return;
    }

    const invalidRow = rows.some((r) => !r.productId || r.requestedQuantity <= 0);
    if (invalidRow) {
      const msg = "Asegúrese de seleccionar un insumo y cantidad válida en cada renglón.";
      setErrorFeedback(msg);
      toast.error(msg);
      return;
    }

    setSaving(true);
    try {
      await RequestClientService.updateRequest(existingRequest.id, {
        departmentId: Number(departmentId),
        departmentSection: departmentSection.trim() || undefined,
        priority,
        justification: justification.trim(),
        notes: notes.trim() || undefined,
        items: rows.map((r) => ({
          productId: r.productId,
          requestedQuantity: r.requestedQuantity,
        })),
      });

      toast.success(
        `Solicitud #${existingRequest.requestNumber} actualizada exitosamente.`
      );
      router.push("/requests");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al actualizar la solicitud.";
      setErrorFeedback(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-medium">
          Cargando datos de la solicitud...
        </span>
      </div>
    );
  }

  if (!existingRequest) {
    return (
      <div className="max-w-xl mx-auto py-12 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-foreground">Solicitud no encontrada</h2>
        <p className="text-xs text-muted-foreground">
          La solicitud solicitada no existe o fue eliminada del sistema.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/requests">Regresar a Solicitudes</Link>
        </Button>
      </div>
    );
  }

  // Si la solicitud NO está PENDIENTE, mostrar pantalla de bloqueo explicativa
  if (existingRequest.status !== "PENDIENTE") {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-6">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <Button asChild variant="outline" size="icon">
            <Link href="/requests">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Solicitud #{existingRequest.requestNumber}
            </h1>
            <p className="text-xs text-muted-foreground">
              Estado actual: <strong className="text-foreground">{existingRequest.status}</strong>
            </p>
          </div>
        </div>

        <Card className="p-6 text-center space-y-4 bg-muted/20 border-border">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-foreground">
              Edición no permitida en estado {existingRequest.status}
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
              Por políticas de trazabilidad y control de inventario institucional, únicamente se pueden modificar las solicitudes mientras permanecen en estado <strong>PENDIENTE</strong>, antes de su aprobación o despacho.
            </p>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/requests">Regresar al Listado</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/requests/${existingRequest.id}`}>Ver Comprobante Completo</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Cabecera y Navegación */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon" className="cursor-pointer">
            <Link href="/requests" title="Regresar al listado">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="indigo" className="font-mono text-xs font-bold">
                {existingRequest.requestNumber}
              </Badge>
              <Badge variant="warning" className="text-xs font-semibold">
                Estado: Pendiente de Aprobación
              </Badge>
              <Badge variant="outline" className="border-border/60 bg-muted/20 text-xs text-muted-foreground">
                Ciclo: {existingRequest.weeklyTokenCycle || "N/A"}
              </Badge>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground mt-1">
              Editar Solicitud Interna
            </h1>
            <p className="text-xs text-muted-foreground">
              Ajuste de insumos solicitados, área destino o justificación antes de la aprobación de almacén
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button asChild variant="outline" size="sm" className="text-xs">
            <Link href="/requests">Cancelar</Link>
          </Button>
          <Button
            form="edit-request-form"
            type="submit"
            size="sm"
            disabled={saving}
            className="text-xs gap-1.5 cursor-pointer shadow-xs"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saving ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </div>

      {errorFeedback && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>No se pudo actualizar</AlertTitle>
          <AlertDescription>{errorFeedback}</AlertDescription>
        </Alert>
      )}

      <form id="edit-request-form" onSubmit={handleSubmit} className="space-y-6">
        {/* SECCIÓN 1: Departamento y Prioridad */}
        <Card className="p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Building2 className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold text-foreground">
              1. Departamento y Sección Operativa
            </CardTitle>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                Departamento Solicitante *
              </Label>
              <select
                required
                value={departmentId || ""}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setDepartmentId(val);
                  const dep = departments.find((d) => d.id === val);
                  if (dep && !departmentSection) {
                    setDepartmentSection(dep.name);
                  }
                }}
                className="w-full bg-background border border-input rounded-lg px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-ring font-medium cursor-pointer"
              >
                <option value="">-- Seleccionar departamento --</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase font-semibold">
                Área / Sección Específica
              </Label>
              <Input
                type="text"
                value={departmentSection}
                onChange={(e) => setDepartmentSection(e.target.value)}
                placeholder="Ej. Inmunología Especial, Sala de Muestras..."
                className="text-xs font-medium"
              />
            </div>
          </div>
        </Card>

        {/* SECCIÓN 2: Insumos Solicitados */}
        <Card className="p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              <CardTitle className="text-sm font-bold text-foreground">
                2. Insumos Solicitados ({rows.length} renglón{rows.length === 1 ? "" : "es"})
              </CardTitle>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddRow(0, 1)}
              className="gap-1.5 text-xs text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Agregar renglón
            </Button>
          </div>

          <div className="space-y-3">
            {rows.map((row, idx) => {
              const selectedProd = products.find(
                (p) => String(p.id) === String(row.productId)
              );
              const unitLabel =
                selectedProd?.baseUnit?.abbreviation ||
                selectedProd?.baseUnit?.name ||
                selectedProd?.unitOfMeasure ||
                "UND";

              return (
                <Card
                  key={row.uid}
                  className="p-4 bg-muted/20 border-border hover:border-border/80 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-background border border-border text-xs font-mono font-bold text-muted-foreground shrink-0">
                      {idx + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <Label className="text-[11px] mb-1 block">Insumo Requerido *</Label>
                      <ProductCombobox
                        products={products}
                        categories={categories}
                        selectedProductId={row.productId}
                        onSelect={(pId: number) => handleUpdateRow(row.uid, "productId", pId)}
                        disabled={false}
                      />
                    </div>

                    <div className="w-full sm:w-36 shrink-0">
                      <Label className="text-[11px] mb-1 block">
                        Cantidad {unitLabel ? `(${unitLabel})` : ""} *
                      </Label>
                      <Input
                        type="number"
                        min="1"
                        required
                        value={row.requestedQuantity === 0 ? "" : row.requestedQuantity}
                        onChange={(e) =>
                          handleUpdateRow(
                            row.uid,
                            "requestedQuantity",
                            Number(e.target.value)
                          )
                        }
                        className="font-mono font-bold text-xs"
                      />
                    </div>

                    <div className="sm:self-end mb-0.5 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleRemoveRow(row.uid)}
                        disabled={rows.length === 1}
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

        {/* SECCIÓN 3: Justificación y Badges Rápidos */}
        <Card className="p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <ClipboardList className="w-4 h-4 text-primary" />
            <CardTitle className="text-sm font-bold text-foreground">
              3. Motivo y Justificación de la Solicitud
            </CardTitle>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase font-semibold">
                Justificación del Pedido *
              </Label>
              <span className="text-[11px] text-muted-foreground">
                (Haz clic para asociar protocolo)
              </span>
            </div>

            {/* ProtocolBadgeSelector con badges de 1 sola palabra y colores vivos */}
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
              placeholder="Explique el motivo, urgencia o procedimiento médico asociado..."
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
              placeholder="Notas de entrega o indicaciones especiales para almacén..."
              className="text-xs"
            />
          </div>
        </Card>

        {/* Barra Inferior de Acción */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <Button asChild type="button" variant="outline" className="cursor-pointer">
            <Link href="/requests">Regresar al Listado</Link>
          </Button>

          <Button
            type="submit"
            disabled={saving}
            className="gap-2 cursor-pointer shadow-xs px-6"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Guardando Cambios..." : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}
