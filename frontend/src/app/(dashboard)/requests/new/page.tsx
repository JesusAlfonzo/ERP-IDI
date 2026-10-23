"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { RequestClientService } from "@/services/request.service";
import { InventoryClientService } from "@/services/inventory.service";
import {
  InventoryMasterService,
  type DepartmentItem,
  type JustificationConceptItem,
} from "@/services/inventory-master.service";
import { AuthService } from "@/services/auth.service";
import { toast } from "@/utils/toast";
import { ProductCombobox } from "@/components/requests/ProductCombobox";
import { ProtocolBadgeSelector } from "@/components/requests/ProtocolBadgeSelector";
import type { RequestWindowStatus } from "@/types/requests";
import type { Product, Category } from "@/types/inventory";
import type { AuthUser } from "@/types/auth";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Copy,
  Layers,
  AlertTriangle,
  AlertCircle,
  Loader2,
  ClipboardList,
  Search,
  FilterX,
  Send,
  Building2,
  Sparkles,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

export default function NewInternalRequestPage() {
  const router = useRouter();

  // Usuario actual y autenticación
  const [currentUser] = useState<AuthUser | null>(() =>
    AuthService.getCurrentUser()
  );

  // Estados de datos maestros
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [justificationConcepts, setJustificationConcepts] = useState<
    JustificationConceptItem[]
  >([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [windowStatus, setWindowStatus] = useState<RequestWindowStatus | null>(
    null
  );
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Estados del formulario
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("");
  const [departmentSection, setDepartmentSection] = useState<string>("");
  const [justification, setJustification] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [rows, setRows] = useState<RequestFormRow[]>([
    { uid: "row-1", productId: 0, requestedQuantity: 1 },
  ]);

  // Estados auxiliares de UX para solicitudes grandes
  const [searchTermInRows, setSearchTermInRows] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);

  // Permisos de rol
  const userRoles = currentUser?.roles || [];
  const isWarehouseStaff =
    userRoles.includes("ADMINISTRADOR") || userRoles.includes("ALMACENISTA");
  const canCreateRole =
    userRoles.includes("SOLICITANTE") ||
    userRoles.includes("ADMINISTRADOR") ||
    userRoles.includes("ALMACENISTA") ||
    userRoles.includes("LABORATORIO") ||
    userRoles.includes("COMPRAS");

  const canCreate =
    canCreateRole && (isWarehouseStaff || (windowStatus?.canCreate ?? false));

  // Carga inicial de datos concurrentemente
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [prods, cats, deps, concepts, winStatus] = await Promise.all([
          InventoryClientService.getProducts().catch(() => []),
          InventoryClientService.getCategories().catch(() => []),
          InventoryMasterService.getDepartments(true).catch(() => []),
          InventoryMasterService.getJustificationConcepts(undefined, true).catch(
            () => []
          ),
          RequestClientService.getWindowStatus().catch(() => null),
        ]);

        if (!isMounted) return;

        setProducts(prods);
        setCategories(cats);
        setDepartments(deps);
        setJustificationConcepts(concepts);
        setWindowStatus(winStatus);

        // Preseleccionar primer departamento si existe
        if (deps.length > 0) {
          setSelectedDepartmentId(String(deps[0].id));
          setDepartmentSection(deps[0].name);
        }
      } catch (error) {
        console.error("Error al cargar datos maestros para requisición:", error);
        toast.error("No se pudieron cargar algunos datos maestros del catálogo.");
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Manejo de departamento
  const handleDepartmentChange = (val: string) => {
    setSelectedDepartmentId(val);
    const dep = departments.find((d) => String(d.id) === val);
    if (dep) {
      setDepartmentSection(dep.name);
    }
  };

  // Manejo de renglones
  const handleProductSelect = useCallback((uid: string, productId: number) => {
    setRows((prev) =>
      prev.map((r) => (r.uid === uid ? { ...r, productId } : r))
    );
  }, []);

  const handleQuantityChange = useCallback(
    (uid: string, quantity: number) => {
      setRows((prev) =>
        prev.map((r) =>
          r.uid === uid ? { ...r, requestedQuantity: Math.max(1, quantity) } : r
        )
      );
    },
    []
  );

  const handleAddRow = useCallback(() => {
    const newUid = `row-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setRows((prev) => [...prev, { uid: newUid, productId: 0, requestedQuantity: 1 }]);
  }, []);

  const handleAddMultipleRows = useCallback((count: number) => {
    setRows((prev) => {
      const added: RequestFormRow[] = Array.from({ length: count }).map((_, i) => ({
        uid: `row-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
        productId: 0,
        requestedQuantity: 1,
      }));
      return [...prev, ...added];
    });
    toast.success(`Se agregaron ${count} renglones a la lista.`);
  }, []);

  const handleDuplicateRow = useCallback((uid: string) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.uid === uid);
      if (idx === -1) return prev;
      const target = prev[idx];
      const newUid = `row-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      const newRow: RequestFormRow = {
        uid: newUid,
        productId: target.productId,
        requestedQuantity: target.requestedQuantity,
      };
      const copy = [...prev];
      copy.splice(idx + 1, 0, newRow);
      return copy;
    });
  }, []);

  const handleRemoveRow = useCallback((uid: string) => {
    setRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((r) => r.uid !== uid);
    });
  }, []);

  const handleClearEmptyRows = useCallback(() => {
    setRows((prev) => {
      const filtered = prev.filter((r) => r.productId > 0);
      if (filtered.length === 0) {
        return [{ uid: `row-${Date.now()}`, productId: 0, requestedQuantity: 1 }];
      }
      return filtered;
    });
    toast.info("Se limpiaron los renglones sin insumo asignado.");
  }, []);

  // Inserción / alternancia inteligente de conceptos protocolares en Justificación
  const isConceptSelected = useCallback(
    (concept: JustificationConceptItem) => {
      return justification.includes(`[${concept.code}]`);
    },
    [justification]
  );

  const handleToggleConcept = useCallback(
    (concept: JustificationConceptItem) => {
      const isPresent = justification.includes(`[${concept.code}]`);
      if (isPresent) {
        // Remover las líneas que correspondan a este protocolo
        const lines = justification.split("\n");
        const filtered = lines.filter(
          (line) => !line.includes(`[${concept.code}]`)
        );
        const cleaned = filtered.join("\n").replace(/\n{3,}/g, "\n\n").trim();
        setJustification(cleaned);
        toast.info(`Protocolo [${concept.code}] removido.`);
      } else {
        const snippet = `• [${concept.code}] ${concept.title}${
          concept.description ? `: ${concept.description}` : ""
        }`;
        setJustification((prev) =>
          prev.trim() ? `${prev.trim()}\n${snippet}` : snippet
        );
        toast.success(`Protocolo [${concept.code}] agregado.`);
      }
    },
    [justification]
  );

  const handleClearAllConcepts = useCallback(() => {
    let text = justification;
    for (const c of justificationConcepts) {
      if (text.includes(`[${c.code}]`)) {
        const lines = text.split("\n");
        text = lines
          .filter((line) => !line.includes(`[${c.code}]`))
          .join("\n");
      }
    }
    setJustification(text.replace(/\n{3,}/g, "\n\n").trim());
    toast.info("Se removieron todos los protocolos de la justificación.");
  }, [justification, justificationConcepts]);

  // Cálculo de estadísticas y validaciones en vivo
  const productMap = useMemo(() => {
    const map = new Map<number, Product>();
    for (const p of products) {
      map.set(p.id, p);
    }
    return map;
  }, [products]);

  const {
    totalUnits,
    validRowsCount,
    duplicateProductIds,
    stockDeficitRows,
  } = useMemo(() => {
    let units = 0;
    let validCount = 0;
    let hasInvalid = false;
    const seen = new Map<number, number>();
    const deficits: { uid: string; name: string; requested: number; stock: number }[] = [];

    for (const r of rows) {
      if (!r.productId || r.requestedQuantity <= 0) {
        hasInvalid = true;
      } else {
        validCount++;
        units += r.requestedQuantity;
        seen.set(r.productId, (seen.get(r.productId) || 0) + 1);

        const prod = productMap.get(r.productId);
        const stock = prod?.totalStock ?? 0;
        if (r.requestedQuantity > stock) {
          deficits.push({
            uid: r.uid,
            name: prod?.name || `ID #${r.productId}`,
            requested: r.requestedQuantity,
            stock,
          });
        }
      }
    }

    const duplicates = new Set<number>();
    seen.forEach((count, pid) => {
      if (count > 1) duplicates.add(pid);
    });

    return {
      totalUnits: units,
      validRowsCount: validCount,
      hasInvalidRows: hasInvalid,
      duplicateProductIds: duplicates,
      stockDeficitRows: deficits,
    };
  }, [rows, productMap]);

  // Filtrado local de filas para búsquedas dentro de requisiciones enormes
  const displayedRows = useMemo(() => {
    if (!searchTermInRows.trim()) return rows;
    const term = searchTermInRows.toLowerCase();

    return rows.filter((r) => {
      if (!r.productId) return true;
      const prod = productMap.get(r.productId);
      if (!prod) return false;
      return (
        prod.name.toLowerCase().includes(term) ||
        (prod.sku && prod.sku.toLowerCase().includes(term)) ||
        (prod.category?.name && prod.category.name.toLowerCase().includes(term))
      );
    });
  }, [rows, searchTermInRows, productMap]);

  // Comprobar si hay cambios sin guardar
  const isDirty = useMemo(() => {
    return (
      rows.some((r) => r.productId > 0) ||
      justification.trim().length > 0 ||
      notes.trim().length > 0
    );
  }, [rows, justification, notes]);

  const handleBackNavigation = () => {
    if (isDirty) {
      setConfirmLeaveOpen(true);
    } else {
      router.push("/requests");
    }
  };

  // Enviar requisición
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedDepartmentId) {
      toast.error("Debe seleccionar un área o departamento solicitante.");
      return;
    }

    if (!justification.trim() || justification.trim().length < 5) {
      toast.error(
        "La justificación técnica es obligatoria y debe tener al menos 5 caracteres."
      );
      return;
    }

    const activeItems = rows.filter((r) => r.productId > 0);
    if (activeItems.length === 0) {
      toast.error("Debe incluir al menos un insumo o reactivo en la solicitud.");
      return;
    }

    const invalidItem = activeItems.find((r) => r.requestedQuantity <= 0);
    if (invalidItem) {
      toast.error("Todos los insumos deben tener una cantidad solicitada mayor a 0.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        departmentId: Number(selectedDepartmentId),
        departmentSection: departmentSection || undefined,
        justification: justification.trim(),
        notes: notes.trim() || undefined,
        items: activeItems.map((r) => ({
          productId: r.productId,
          requestedQuantity: r.requestedQuantity,
        })),
      };

      const newReq = await RequestClientService.createRequest(payload);
      toast.success(
        `Solicitud interna #${newReq.requestNumber || newReq.id} creada exitosamente.`
      );
      router.push(`/requests/${newReq.id}`);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Error al procesar la requisición";
      toast.error(errorMsg);
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Cargando catálogo maestro y configuración de solicitudes...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* Barra de Navegación y Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleBackNavigation}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground -ml-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a Solicitudes
            </Button>
            <span className="text-muted-foreground/40">•</span>
            <span className="text-xs text-muted-foreground font-mono">
              Requisición de Materiales
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ClipboardList className="w-5 h-5" />
            </div>
            Nueva Solicitud Interna
          </h1>
          <p className="text-xs text-muted-foreground">
            Complete los renglones y la justificación técnica requerida por el almacén
            central.
          </p>
        </div>

        {/* Resumen Superior Rápido */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="gap-1.5 py-1 px-3 text-xs bg-muted/40">
            <Layers className="w-3.5 h-3.5 text-primary" />
            <span className="font-semibold">{validRowsCount}</span>
            <span className="text-muted-foreground">
              {validRowsCount === 1 ? "renglón" : "renglones"}
            </span>
          </Badge>
          <Badge variant="outline" className="gap-1.5 py-1 px-3 text-xs bg-muted/40">
            <span className="font-semibold">{totalUnits}</span>
            <span className="text-muted-foreground">unidades totales</span>
          </Badge>
          {windowStatus && (
            <Badge
              variant={windowStatus.isOpen ? "success" : "warning"}
              className="py-1 px-2.5 text-xs"
            >
              {windowStatus.isOpen ? "Ventana Operativa Abierta" : "Ventana Restringida"}
            </Badge>
          )}
        </div>
      </div>

      {/* Alerta de restricción si el usuario no puede crear */}
      {!canCreate && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Creación de Solicitudes No Permitida</AlertTitle>
          <AlertDescription>
            {windowStatus?.message ||
              "La ventana operativa semanal está cerrada o ha agotado el cupo permitido para su usuario."}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECCIÓN 1: DATOS GENERALES DEL SOLICITANTE */}
        <Card className="border-border">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              1. Información General del Área Solicitante
            </CardTitle>
            <CardDescription className="text-xs">
              Especifique el departamento que asumirá el consumo de los materiales.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Departamento */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Área / Departamento Solicitante *
              </Label>
              <Select
                value={selectedDepartmentId}
                onValueChange={handleDepartmentChange}
                disabled={departments.length === 0}
              >
                <SelectTrigger className="h-9 text-xs font-medium">
                  <SelectValue placeholder="Seleccione un departamento..." />
                </SelectTrigger>
                <SelectContent className="w-[var(--radix-select-trigger-width)] max-h-80">
                  {departments.map((dep) => (
                    <SelectItem key={dep.id} value={String(dep.id)} className="text-xs">
                      <span className="font-mono font-bold text-primary mr-1.5">
                        [{dep.code}]
                      </span>
                      {dep.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Solicitante */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Usuario Solicitante
              </Label>
              <div className="h-9 rounded-lg border border-input bg-muted/40 px-3 py-1 flex items-center justify-between text-xs font-medium">
                <span className="truncate">
                  {currentUser?.fullName || currentUser?.username || "Usuario"}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-border">
                  {currentUser?.department || "General"}
                </span>
              </div>
            </div>

            {/* Ciclo / Fecha */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Ciclo Operativo Semanal
              </Label>
              <div className="h-9 rounded-lg border border-input bg-muted/40 px-3 py-1 flex items-center justify-between text-xs font-medium">
                <span className="font-mono text-primary font-bold">
                  {windowStatus?.currentCycle || "Ciclo en curso"}
                </span>
                {windowStatus && (
                  <span className="text-[10px] text-muted-foreground">
                    Cupo: {windowStatus.weeklyQuotaUsed} /{" "}
                    {windowStatus.maxWeeklyRequests}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SECCIÓN 2: INSUMOS Y REACTIVOS (DISEÑADO PARA SOLICITUDES ENORMES) */}
        <Card className="border-border">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  2. Insumos y Reactivos Requeridos
                </CardTitle>
                <CardDescription className="text-xs">
                  {rows.length} {rows.length === 1 ? "renglón listado" : "renglones listados"} • {validRowsCount} válidos
                </CardDescription>
              </div>

              {/* Barra de herramientas para solicitudes grandes */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Buscador dentro de los renglones agregados */}
                {rows.length > 5 && (
                  <div className="relative w-full sm:w-56">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Filtrar en lista..."
                      value={searchTermInRows}
                      onChange={(e) => setSearchTermInRows(e.target.value)}
                      className="h-8 text-xs pl-8 pr-2 bg-background"
                    />
                  </div>
                )}

                {/* Acciones de agregado masivo */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddRow}
                  className="h-8 text-xs gap-1.5 text-primary border-primary/20 bg-primary/5 hover:bg-primary/10"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar renglón
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddMultipleRows(5)}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                  title="Agrega 5 renglones vacíos a la vez para agilizar el llenado"
                >
                  +5 Renglones
                </Button>

                {rows.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearEmptyRows}
                    className="h-8 text-xs text-muted-foreground hover:text-destructive gap-1"
                    title="Elimina renglones donde no se haya seleccionado producto"
                  >
                    <FilterX className="w-3.5 h-3.5" />
                    Limpiar vacíos
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Advertencias de stock o duplicados */}
            {duplicateProductIds.size > 0 && (
              <div className="p-3 bg-amber-500/10 border-b border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  Hay productos repetidos en más de un renglón. Considere unificar las
                  cantidades para evitar confusiones en almacén.
                </span>
              </div>
            )}

            {stockDeficitRows.length > 0 && (
              <div className="p-3 bg-blue-500/10 border-b border-blue-500/20 text-blue-800 dark:text-blue-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-blue-600" />
                <span>
                  Aviso de stock: {stockDeficitRows.length}{" "}
                  {stockDeficitRows.length === 1 ? "insumo solicita" : "insumos solicitan"}{" "}
                  una cantidad mayor al stock actual disponible. Almacén podrá despachar
                  parcialmente o gestionar abastecimiento.
                </span>
              </div>
            )}

            {/* TABLA DE RENGLONES */}
            <div className="overflow-x-auto min-h-[220px]">
              <Table className="min-w-[760px]">
                <TableHeader className="bg-muted/40 text-[11px] uppercase tracking-wider">
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead className="min-w-[320px] sm:min-w-[420px]">
                      Insumo / Reactivo
                    </TableHead>
                    <TableHead className="w-32 text-center">Stock Almacén</TableHead>
                    <TableHead className="w-36 text-center">Cantidad</TableHead>
                    <TableHead className="w-24 text-center">Unidad</TableHead>
                    <TableHead className="w-24 text-right pr-4">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedRows.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-xs text-muted-foreground"
                      >
                        No se encontraron renglones con el filtro especificado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedRows.map((row, index) => {
                      const selectedProd = productMap.get(row.productId);
                      const unit =
                        selectedProd?.unitOfMeasure ||
                        selectedProd?.baseUnit?.abbreviation ||
                        "UND";
                      const stock = selectedProd?.totalStock ?? 0;
                      const isDeficit =
                        row.productId > 0 && row.requestedQuantity > stock;
                      const isDuplicate =
                        row.productId > 0 && duplicateProductIds.has(row.productId);

                      return (
                        <TableRow
                          key={row.uid}
                          className={isDuplicate ? "bg-amber-500/5" : undefined}
                        >
                          {/* Número correlativo */}
                          <TableCell className="text-center font-mono text-xs font-bold text-muted-foreground">
                            {index + 1}
                          </TableCell>

                          {/* Selector de Producto */}
                          <TableCell>
                            <ProductCombobox
                              products={products}
                              categories={categories}
                              selectedProductId={row.productId}
                              onSelect={(prodId) =>
                                handleProductSelect(row.uid, prodId)
                              }
                              placeholder="Buscar insumo por nombre o SKU..."
                            />
                          </TableCell>

                          {/* Stock Almacén */}
                          <TableCell className="text-center">
                            {selectedProd ? (
                              <div className="flex flex-col items-center">
                                <Badge
                                  variant={stock > 0 ? "success" : "destructive"}
                                  className="font-mono text-[10px]"
                                >
                                  {stock} {unit}
                                </Badge>
                                {isDeficit && (
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                                    Insuficiente
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground/60">
                                —
                              </span>
                            )}
                          </TableCell>

                          {/* Cantidad Solicitada */}
                          <TableCell className="text-center">
                            <div className="relative inline-block w-full max-w-[110px]">
                              <Input
                                type="number"
                                min="1"
                                value={row.requestedQuantity}
                                onChange={(e) =>
                                  handleQuantityChange(
                                    row.uid,
                                    Number(e.target.value)
                                  )
                                }
                                className="h-8 text-center font-mono font-bold text-xs"
                                required
                              />
                            </div>
                          </TableCell>

                          {/* Unidad */}
                          <TableCell className="text-center font-mono text-xs text-muted-foreground">
                            {selectedProd ? unit : "—"}
                          </TableCell>

                          {/* Acciones */}
                          <TableCell className="text-right pr-4">
                            <div className="inline-flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleDuplicateRow(row.uid)}
                                className="text-muted-foreground hover:text-foreground"
                                title="Duplicar renglón"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleRemoveRow(row.uid)}
                                disabled={rows.length === 1}
                                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                title="Eliminar renglón"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Footer de la tabla con botón de añadir */}
            <div className="p-3 border-t border-border bg-muted/10 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {validRowsCount} de {rows.length} renglones configurados con insumo.
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRow}
                className="h-8 text-xs gap-1.5 text-primary border-primary/20 bg-primary/5 hover:bg-primary/10"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar otro renglón
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* SECCIÓN 3: JUSTIFICACIÓN TÉCNICA Y PROTOCOLOS */}
        <Card className="border-border">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              3. Justificación de Uso / Protocolo Técnico *
            </CardTitle>
            <CardDescription className="text-xs">
              Indique el lote de producción, protocolo analítico o justificación del
              requerimiento.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Selector de Protocolos Rápidos */}
            <ProtocolBadgeSelector
              concepts={justificationConcepts}
              isConceptSelected={isConceptSelected}
              onToggleConcept={handleToggleConcept}
              onClearAll={handleClearAllConcepts}
            />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Detalle de la Justificación *
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Mínimo 5 caracteres • {justification.trim().length} ingresados
                </span>
              </div>
              <Textarea
                rows={4}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Explique el protocolo analítico, lote de producción o justificación del pedido..."
                className="text-xs font-medium resize-y"
                required
              />
            </div>

            {/* Notas opcionales para almacén */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Notas / Instrucciones Especiales de Entrega (Opcional)
              </Label>
              <Input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. Entregar antes de las 14:00 hrs, requiere cadena de frío, etc."
                className="h-9 text-xs"
              />
            </div>
          </CardContent>
        </Card>

        {/* BARRA FLOTANTE / INFERIOR DE ACCIONES */}
        <div className="sticky bottom-4 z-40 bg-card/95 backdrop-blur-md border border-border shadow-xl rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground">{validRowsCount}</span>
              <span>renglones</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground">{totalUnits}</span>
              <span>piezas/unidades</span>
            </div>
            {stockDeficitRows.length > 0 && (
              <>
                <span>•</span>
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {stockDeficitRows.length} en déficit de stock
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBackNavigation}
              disabled={submitting}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={submitting || !canCreate || validRowsCount === 0}
              className="gap-2 min-w-[160px]"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando Solicitud...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar a Almacén
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* DIÁLOGO DE CONFIRMACIÓN AL SALIR CON CAMBIOS SIN GUARDAR */}
      <Dialog open={confirmLeaveOpen} onOpenChange={setConfirmLeaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              ¿Descartar cambios no guardados?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Ha ingresado renglones o justificaciones en esta solicitud. Si regresa
              a la lista, la información no enviada se perderá.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmLeaveOpen(false)}
            >
              Continuar editando
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => {
                setConfirmLeaveOpen(false);
                router.push("/requests");
              }}
            >
              Descartar y Salir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
