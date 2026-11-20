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
import { cn } from "@/lib/utils";
import { ProductCombobox } from "@/components/requests/ProductCombobox";
import {
  ProtocolBadgeSelector,
  getConceptSummaryWord,
} from "@/components/requests/ProtocolBadgeSelector";
import type { RequestWindowStatus, RequestPriority, CreateInternalRequestPayload } from "@/types/requests";
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
  Clock,
  LayoutGrid,
  LayoutList,
  Flame,
  CheckCircle2,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [priority, setPriority] = useState<RequestPriority>("RUTINA");
  const [justification, setJustification] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [rows, setRows] = useState<RequestFormRow[]>([
    { uid: "row-1", productId: 0, requestedQuantity: 1 },
  ]);

  // Modos de visualización para solicitudes grandes (Tabla compacta vs Tarjetas)
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [searchTermInRows, setSearchTermInRows] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);

  // Permisos de rol
  const userRoles = currentUser?.roles || [];
  const isWarehouseStaff =
    userRoles.includes("ADMINISTRADOR") || userRoles.includes("ALMACENISTA");
  const isAdmin = userRoles.includes("ADMINISTRADOR");
  const isCoordinator =
    userRoles.includes("COORDINADOR") ||
    userRoles.includes("COORDINADOR_LABORATORIO");
  const isHighRole =
    userRoles.includes("DIRECTOR") ||
    userRoles.includes("GERENTE") ||
    userRoles.includes("SUPERVISOR");

  // Solo administradores, coordinadores y roles de alta jerarquía pueden elegir la prioridad
  const canSelectPriority = isAdmin || isCoordinator || isHighRole;

  // Visibilidad de stock confidencial: únicamente Almacenista, Administrador y Coordinadores
  const canViewStock =
    isAdmin ||
    isCoordinator ||
    userRoles.includes("ALMACENISTA");

  // Solo administradores pueden cambiar el departamento si requieren gestionar solicitudes ajenas
  const canChangeDepartment = isAdmin;

  const canCreateRole =
    userRoles.includes("SOLICITANTE") ||
    userRoles.includes("ADMINISTRADOR") ||
    userRoles.includes("ALMACENISTA") ||
    userRoles.includes("LABORATORIO") ||
    userRoles.includes("COMPRAS");

  const canCreate = canCreateRole;

  // Carga inicial concurrente de datos maestros
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

        // Preseleccionar y vincular al departamento perteneciente al solicitante
        const userDeptStr = currentUser?.department?.trim().toLowerCase() || "";
        const matchedDept = deps.find(
          (d) =>
            userDeptStr &&
            (d.name.toLowerCase() === userDeptStr ||
              d.code.toLowerCase() === userDeptStr ||
              d.name.toLowerCase().includes(userDeptStr) ||
              userDeptStr.includes(d.name.toLowerCase()))
        );

        if (matchedDept) {
          setSelectedDepartmentId(String(matchedDept.id));
          setDepartmentSection(matchedDept.name);
        } else if (deps.length > 0) {
          setSelectedDepartmentId(String(deps[0].id));
          setDepartmentSection(currentUser?.department || deps[0].name);
        } else if (currentUser?.department) {
          setDepartmentSection(currentUser.department);
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

  const handleQuickQuantity = useCallback(
    (uid: string, delta: number) => {
      setRows((prev) =>
        prev.map((r) => {
          if (r.uid !== uid) return r;
          const next = Math.max(1, r.requestedQuantity + delta);
          return { ...r, requestedQuantity: next };
        })
      );
    },
    []
  );

  const handleSetMaxStock = useCallback(
    (uid: string, maxStock: number) => {
      if (maxStock <= 0) return;
      setRows((prev) =>
        prev.map((r) =>
          r.uid === uid ? { ...r, requestedQuantity: maxStock } : r
        )
      );
      toast.info(`Cantidad ajustada al stock actual (${maxStock}).`);
    },
    []
  );

  const handleAddRow = useCallback(() => {
    const newUid = `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setRows((prev) => [...prev, { uid: newUid, productId: 0, requestedQuantity: 1 }]);
  }, []);

  const handleAddMultipleRows = useCallback((count: number) => {
    setRows((prev) => {
      const added: RequestFormRow[] = Array.from({ length: count }).map((_, i) => ({
        uid: `row-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
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
      const newUid = `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
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

  // Justificaciones rápidas de un clic
  const isConceptSelected = useCallback(
    (concept: JustificationConceptItem) => {
      return justification.toLowerCase().includes(concept.title.toLowerCase());
    },
    [justification]
  );

  const handleToggleConcept = useCallback(
    (concept: JustificationConceptItem) => {
      const isPresent = justification
        .toLowerCase()
        .includes(concept.title.toLowerCase());
      const summaryWord = getConceptSummaryWord(concept);

      if (isPresent) {
        const lines = justification.split("\n");
        const filtered = lines.filter(
          (line) =>
            !line.toLowerCase().includes(concept.title.toLowerCase())
        );
        const cleaned = filtered.join("\n").replace(/\n{3,}/g, "\n\n").trim();
        setJustification(cleaned);
        toast.info(`Concepto "${summaryWord}" removido.`);
      } else {
        const snippet = `• ${concept.title}${
          concept.description ? `: ${concept.description}` : ""
        }`;
        setJustification((prev) =>
          prev.trim() ? `${prev.trim()}\n${snippet}` : snippet
        );
        toast.success(`Concepto "${summaryWord}" agregado.`);
      }
    },
    [justification]
  );

  const handleClearAllConcepts = useCallback(() => {
    let text = justification;
    for (const c of justificationConcepts) {
      if (text.toLowerCase().includes(c.title.toLowerCase())) {
        const lines = text.split("\n");
        text = lines
          .filter(
            (line) => !line.toLowerCase().includes(c.title.toLowerCase())
          )
          .join("\n");
      }
    }
    setJustification(text.replace(/\n{3,}/g, "\n\n").trim());
    toast.info("Se removieron los conceptos rápidos.");
  }, [justification, justificationConcepts]);

  // Departamento vinculado al solicitante
  const selectedDept = useMemo(() => {
    return departments.find((d) => String(d.id) === String(selectedDepartmentId));
  }, [departments, selectedDepartmentId]);

  // Mapa de productos para búsqueda O(1)
  const productMap = useMemo(() => {
    const map = new Map<number, Product>();
    for (const p of products) {
      map.set(p.id, p);
    }
    return map;
  }, [products]);

  // Métricas y validaciones en vivo
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

  // Filtrado local para búsquedas en pedidos extensos
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
      toast.error("Debe seleccionar un departamento solicitante.");
      return;
    }

    if (!justification.trim() || justification.trim().length < 5) {
      toast.error(
        "La justificación es obligatoria y debe tener al menos 5 caracteres."
      );
      return;
    }

    const activeItems = rows.filter((r) => r.productId > 0);
    if (activeItems.length === 0) {
      toast.error("Debe incluir al menos un insumo en la solicitud.");
      return;
    }

    const invalidItem = activeItems.find((r) => r.requestedQuantity <= 0);
    if (invalidItem) {
      toast.error("Todos los insumos deben tener una cantidad mayor a 0.");
      return;
    }

    setSubmitting(true);
    try {
      const deptIdNum = Number(selectedDepartmentId);
      const payload: CreateInternalRequestPayload = {
        departmentId: deptIdNum > 0 ? deptIdNum : undefined,
        departmentSection: departmentSection || currentUser?.department || undefined,
        priority: canSelectPriority ? priority : "RUTINA",
        justification: justification.trim(),
        notes: notes.trim() || undefined,
        items: activeItems.map((r) => ({
          productId: r.productId,
          requestedQuantity: r.requestedQuantity,
        })),
      };

      const newReq = await RequestClientService.createRequest(payload);
      toast.success(
        `Solicitud #${newReq.requestNumber || newReq.id} creada exitosamente.`
      );
      router.push(`/requests/${newReq.id}`);
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Error al procesar la solicitud";
      toast.error(errorMsg);
      setSubmitting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Cargando catálogo e información de solicitudes...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 max-w-7xl mx-auto">
      {/* ========================================================
          ENCABEZADO PRINCIPAL ESTANDARIZADO
         ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleBackNavigation}
            className="h-9 w-9 cursor-pointer"
            title="Volver a Solicitudes"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 shadow-2xs">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Nueva Solicitud
              </h1>
              <Badge variant="outline" className="text-[11px] font-mono bg-muted/20">
                Borrador
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Registre los insumos necesarios y el motivo del pedido
            </p>
          </div>
        </div>

        {/* Resumen Superior Rápido con badges estilizados */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="indigo" className="gap-1.5 py-1 px-3 text-xs shadow-2xs font-medium">
            <Layers className="w-3.5 h-3.5" />
            <span className="font-bold">{validRowsCount}</span>
            <span>{validRowsCount === 1 ? "insumo" : "insumos"}</span>
          </Badge>
          <Badge variant="purple" className="gap-1.5 py-1 px-3 text-xs shadow-2xs font-medium">
            <span className="font-bold">{totalUnits}</span>
            <span>unidades</span>
          </Badge>
        </div>
      </div>

      {/* Control de rol de solicitante */}
      {!canCreate && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertTitle>Acceso Restringido</AlertTitle>
          <AlertDescription>
            No posee permisos de solicitante para registrar nuevos pedidos internos.
          </AlertDescription>
        </Alert>
      )}

      {/* Banner de Horario de Ventana de Recepción */}
      {windowStatus && !windowStatus.isOpen && (
        <div className="p-3.5 rounded-xl border border-amber-300/70 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/30 text-xs flex items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Horario de pedidos:</strong> {windowStatus.message || "La recepción de pedidos se encuentra temporalmente inactiva."}
            </span>
          </div>
          <Badge variant="outline" className="text-[10px] bg-background/80 shrink-0">
            Cerrado
          </Badge>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ========================================================
            SECCIÓN 1: DATOS GENERALES
           ======================================================== */}
        <Card className="border-border shadow-2xs">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Datos Generales
            </CardTitle>
            <CardDescription className="text-xs">
              Información del solicitante y departamento de adscripción
            </CardDescription>
          </CardHeader>
          <CardContent
            className={cn(
              "pt-4 grid gap-4",
              canSelectPriority
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                : "grid-cols-1 sm:grid-cols-3"
            )}
          >
            {/* Solicitante: solo el nombre */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Solicitante
              </Label>
              <div className="h-9 rounded-lg border border-input bg-muted/40 px-3 py-1 flex items-center text-xs font-semibold text-foreground">
                <span className="truncate">
                  {currentUser?.fullName || currentUser?.username || "Usuario"}
                </span>
              </div>
            </div>

            {/* Departamento: bloqueado al perteneciente del solicitante */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Departamento
              </Label>
              {canChangeDepartment ? (
                <Select
                  value={selectedDepartmentId}
                  onValueChange={handleDepartmentChange}
                  disabled={departments.length === 0}
                >
                  <SelectTrigger className="h-9 text-xs font-medium cursor-pointer">
                    <SelectValue placeholder="Seleccione departamento..." />
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
              ) : (
                <div className="h-9 rounded-lg border border-input bg-muted/40 px-3 py-1 flex items-center justify-between text-xs font-medium">
                  <span className="truncate font-semibold text-foreground">
                    {selectedDept ? (
                      <>
                        <span className="font-mono font-bold text-primary mr-1.5">
                          [{selectedDept.code}]
                        </span>
                        {selectedDept.name}
                      </>
                    ) : (
                      currentUser?.department || "General"
                    )}
                  </span>
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-mono shrink-0 ml-2">
                    <Lock className="w-3 h-3 text-muted-foreground/60" />
                    Asignado
                  </span>
                </div>
              )}
            </div>

            {/* Prioridad: visible únicamente para Administradores, Coordinadores y roles de alta jerarquía */}
            {canSelectPriority && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Prioridad
                </Label>
                <Select
                  value={priority}
                  onValueChange={(val) => setPriority(val as RequestPriority)}
                >
                  <SelectTrigger className="h-9 text-xs font-medium cursor-pointer">
                    <SelectValue placeholder="Prioridad" />
                  </SelectTrigger>
                  <SelectContent className="text-xs">
                    <SelectItem value="BAJA">
                      <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        Baja
                      </span>
                    </SelectItem>
                    <SelectItem value="RUTINA">
                      <span className="inline-flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-medium">
                        <span className="w-2 h-2 rounded-full bg-sky-500" />
                        Normal / Rutina
                      </span>
                    </SelectItem>
                    <SelectItem value="URGENTE">
                      <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
                        <Flame className="w-3.5 h-3.5 text-rose-500" />
                        Urgente
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Fecha */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Fecha
              </Label>
              <div className="h-9 rounded-lg border border-input bg-muted/40 px-3 py-1 flex items-center justify-between text-xs font-medium">
                <span className="font-mono text-foreground font-semibold">
                  {new Date().toLocaleDateString("es-VE", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {windowStatus?.currentCycle || "En curso"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ========================================================
            SECCIÓN 2: INSUMOS SOLICITADOS (DISEÑADO PARA PEDIDOS GRANDES)
           ======================================================== */}
        <Card className="border-border shadow-2xs">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  Insumos Solicitados
                </CardTitle>
                <CardDescription className="text-xs">
                  {rows.length} {rows.length === 1 ? "renglón listado" : "renglones listados"} • {validRowsCount} válidos
                </CardDescription>
              </div>

              {/* Barra de herramientas ergonómica */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Conmutador de modo de vista: Tabla (compacta) vs Tarjetas (espaciada) */}
                <Tabs
                  value={viewMode}
                  onValueChange={(v) => setViewMode(v as "table" | "cards")}
                  className="w-auto"
                >
                  <TabsList className="h-8 p-0.5 bg-muted/60">
                    <TabsTrigger
                      value="table"
                      className="text-xs px-2.5 h-7 gap-1 data-[state=active]:bg-background"
                      title="Vista compacta de alta densidad"
                    >
                      <LayoutList className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Tabla</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="cards"
                      className="text-xs px-2.5 h-7 gap-1 data-[state=active]:bg-background"
                      title="Vista espaciada por tarjetas"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Tarjetas</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Buscador dentro de los renglones agregados */}
                {rows.length > 3 && (
                  <div className="relative w-full sm:w-52">
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

                {/* Acciones de agregado rápido */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddRow}
                  className="h-8 text-xs gap-1.5 text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Renglón</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddMultipleRows(5)}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Agrega 5 renglones vacíos a la vez"
                >
                  +5 Filas
                </Button>

                {rows.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearEmptyRows}
                    className="h-8 text-xs text-muted-foreground hover:text-destructive gap-1 cursor-pointer"
                    title="Elimina renglones vacíos"
                  >
                    <FilterX className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Limpiar vacíos</span>
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
                  Hay insumos repetidos en más de un renglón. Considere unificarlos para facilitar la gestión en almacén.
                </span>
              </div>
            )}

            {canViewStock && stockDeficitRows.length > 0 && (
              <div className="p-3 bg-blue-500/10 border-b border-blue-500/20 text-blue-800 dark:text-blue-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-blue-600" />
                <span>
                  Aviso de stock: {stockDeficitRows.length}{" "}
                  {stockDeficitRows.length === 1 ? "insumo solicita" : "insumos solicitan"}{" "}
                  una cantidad superior al stock actual disponible. Almacén podrá despachar parcialmente.
                </span>
              </div>
            )}

            {viewMode === "table" ? (
              /* ========================================================
                  MODO TABLA (ALTA DENSIDAD)
                 ======================================================== */
              <div className="overflow-x-auto min-h-[200px]">
                <Table className="min-w-[760px]">
                  <TableHeader className="bg-muted/40 text-[11px] uppercase tracking-wider">
                    <TableRow>
                      <TableHead className="w-12 text-center font-semibold">#</TableHead>
                      <TableHead className="min-w-[320px] font-semibold">Insumo</TableHead>
                      {canViewStock && (
                        <TableHead className="w-28 text-center font-semibold">Stock</TableHead>
                      )}
                      <TableHead className="w-40 text-center font-semibold">Cantidad</TableHead>
                      <TableHead className="w-20 text-center font-semibold">Unidad</TableHead>
                      <TableHead className="w-20 text-right pr-4 font-semibold">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedRows.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={canViewStock ? 6 : 5}
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
                            className={cn(
                              "transition-colors",
                              isDuplicate && "bg-amber-500/5",
                              !row.productId && "bg-muted/5"
                            )}
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
                                placeholder="Buscar por nombre, SKU o categoría..."
                                showStock={canViewStock}
                              />
                            </TableCell>

                            {/* Stock Almacén (Solo para roles con permiso) */}
                            {canViewStock && (
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
                                  <span className="text-xs text-muted-foreground/60">—</span>
                                )}
                              </TableCell>
                            )}

                            {/* Cantidad Solicitada con botones de ajuste rápido */}
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1 max-w-[150px] mx-auto">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleQuickQuantity(row.uid, -1)}
                                  disabled={row.requestedQuantity <= 1}
                                  className="h-8 w-7 text-xs shrink-0 cursor-pointer"
                                  title="Disminuir 1"
                                >
                                  -
                                </Button>
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
                                  className="h-8 text-center font-mono font-bold text-xs px-1 w-16"
                                  required
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleQuickQuantity(row.uid, 1)}
                                  className="h-8 w-7 text-xs shrink-0 cursor-pointer"
                                  title="Aumentar 1"
                                >
                                  +
                                </Button>
                                {canViewStock && selectedProd && stock > 0 && stock !== row.requestedQuantity && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleSetMaxStock(row.uid, stock)}
                                    className="h-8 px-1.5 text-[10px] text-primary hover:bg-primary/10 font-bold shrink-0 cursor-pointer"
                                    title="Ajustar al stock disponible"
                                  >
                                    Máx
                                  </Button>
                                )}
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
                                  className="text-muted-foreground hover:text-foreground cursor-pointer"
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
                                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
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
            ) : (
              /* ========================================================
                  MODO TARJETAS (VISTA DETALLADA Y ESPACIADA)
                 ======================================================== */
              <div className="p-4 space-y-3">
                {displayedRows.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No se encontraron renglones con el filtro especificado.
                  </div>
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
                      <div
                        key={row.uid}
                        className={cn(
                          "p-3.5 rounded-xl border border-border bg-card shadow-2xs space-y-3 transition-colors",
                          isDuplicate && "border-amber-300 dark:border-amber-800 bg-amber-500/5"
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center font-mono text-xs font-bold text-muted-foreground">
                              {index + 1}
                            </span>
                            <span className="text-xs font-semibold text-foreground">
                              {selectedProd?.name || "Seleccione un insumo..."}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDuplicateRow(row.uid)}
                              className="text-muted-foreground hover:text-foreground cursor-pointer"
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
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                              title="Eliminar renglón"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                          <div className={canViewStock ? "md:col-span-7" : "md:col-span-8"}>
                            <ProductCombobox
                              products={products}
                              categories={categories}
                              selectedProductId={row.productId}
                              onSelect={(prodId) =>
                                handleProductSelect(row.uid, prodId)
                              }
                              placeholder="Buscar por nombre, SKU o categoría..."
                              showStock={canViewStock}
                            />
                          </div>

                          {canViewStock && (
                            <div className="md:col-span-2 flex items-center justify-center gap-2">
                              <span className="text-[11px] text-muted-foreground font-medium">Stock:</span>
                              {selectedProd ? (
                                <Badge
                                  variant={stock > 0 ? "success" : "destructive"}
                                  className="font-mono text-[10px]"
                                >
                                  {stock} {unit}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground/60">—</span>
                              )}
                            </div>
                          )}

                          <div className={cn("flex items-center justify-end gap-1.5", canViewStock ? "md:col-span-3" : "md:col-span-4")}>
                            <Label className="text-[11px] text-muted-foreground font-medium mr-1">
                              Cantidad:
                            </Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => handleQuickQuantity(row.uid, -1)}
                              disabled={row.requestedQuantity <= 1}
                              className="h-8 w-7 text-xs shrink-0 cursor-pointer"
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              min="1"
                              value={row.requestedQuantity}
                              onChange={(e) =>
                                handleQuantityChange(row.uid, Number(e.target.value))
                              }
                              className="h-8 text-center font-mono font-bold text-xs w-16"
                              required
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => handleQuickQuantity(row.uid, 1)}
                              className="h-8 w-7 text-xs shrink-0 cursor-pointer"
                            >
                              +
                            </Button>
                            {canViewStock && selectedProd && stock > 0 && stock !== row.requestedQuantity && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetMaxStock(row.uid, stock)}
                                className="h-8 px-1.5 text-[10px] text-primary hover:bg-primary/10 font-bold shrink-0 cursor-pointer"
                                title="Ajustar al stock disponible"
                              >
                                Máx
                              </Button>
                            )}
                          </div>
                        </div>

                        {canViewStock && isDeficit && (
                          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5 pt-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>La cantidad solicitada ({row.requestedQuantity}) supera el stock disponible en almacén ({stock}).</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Pie de tabla con botón para añadir renglón */}
            <div className="p-3 border-t border-border bg-muted/10 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {validRowsCount} de {rows.length} renglones configurados con insumo.
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRow}
                className="h-8 text-xs gap-1.5 text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar otro renglón</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ========================================================
            SECCIÓN 3: JUSTIFICACIÓN
           ======================================================== */}
        <Card className="border-border shadow-2xs">
          <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Justificación
            </CardTitle>
            <CardDescription className="text-xs">
              Conceptos rápidos y detalle del requerimiento
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Selector de Conceptos Rápidos */}
            <ProtocolBadgeSelector
              concepts={justificationConcepts}
              isConceptSelected={isConceptSelected}
              onToggleConcept={handleToggleConcept}
              onClearAll={handleClearAllConcepts}
            />

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Motivo del Pedido *
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
                Notas Adicionales (Opcional)
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

        {/* ========================================================
            BARRA FLOTANTE INFERIOR DE ACCIÓN
           ======================================================== */}
        <div className="sticky bottom-4 z-40 bg-card/95 backdrop-blur-md border border-border shadow-xl rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground">{validRowsCount}</span>
              <span>insumos</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-foreground">{totalUnits}</span>
              <span>unidades</span>
            </div>
            {canViewStock && stockDeficitRows.length > 0 && (
              <>
                <span>•</span>
                <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
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
              className="cursor-pointer"
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              size="sm"
              disabled={submitting || !canCreate || validRowsCount === 0}
              className="gap-2 min-w-[160px] cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando Pedido...
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

      {/* ========================================================
          DIÁLOGO DE CONFIRMACIÓN AL DESCARTAR CAMBIOS
         ======================================================== */}
      <Dialog open={confirmLeaveOpen} onOpenChange={setConfirmLeaveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              ¿Descartar cambios no guardados?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Ha ingresado renglones o justificaciones en este pedido. Si regresa a la lista, la información no enviada se perderá.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmLeaveOpen(false)}
              className="cursor-pointer"
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
              className="cursor-pointer"
            >
              Descartar y Salir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
